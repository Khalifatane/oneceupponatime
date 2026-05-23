/**
 * Storefront Sanity Service
 *
 * Wraps the shared @siggistore/sanity client to provide
 * the storefront-specific API surface.
 */
import { getSanityClient } from '@siggistore/sanity';
import type { SanityProduct, SanityCategory, SanityPage, PaginatedResponse } from '@siggistore/shared-types';

const PRODUCT_FRAGMENT = `
  _id,
  _type,
  title,
  slug,
  description,
  price,
  originalPrice,
  currency,
  image {
    asset -> {
      _id,
      url
    }
  },
  images[] {
    asset -> {
      _id,
      url
    }
  },
  category-> {
    _id,
    title,
    slug
  },
  sku,
  stock,
  status,
  isAvailable,
  variants,
  channels,
  _createdAt,
  _updatedAt
`;

const inFlightRequests = new Map<string, Promise<unknown>>();
let sanityBrowserReadsDisabled = false;
let hasLoggedSanityBrowserFailure = false;

function isCorsLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('cors') ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('fetch') ||
    message.includes('xmlhttprequest')
  );
}

function disableSanityBrowserReads(error: unknown) {
  sanityBrowserReadsDisabled = true;
  if (!hasLoggedSanityBrowserFailure) {
    hasLoggedSanityBrowserFailure = true;
    console.warn(
      'Sanity browser requests are disabled for this session. The app will use fallback content until Sanity CORS is configured.',
      error,
    );
  }
}

async function safeSanityFetch<T>(key: string, query: string, fallback: T): Promise<T> {
  if (sanityBrowserReadsDisabled) {
    return fallback;
  }

  const existingRequest = inFlightRequests.get(key);
  if (existingRequest) {
    return (await existingRequest) as T;
  }

  const client = getSanityClient();
  const request = client
    .fetch(query)
    .then((result) => result as T)
    .catch((error) => {
      if (isCorsLikeError(error)) {
        disableSanityBrowserReads(error);
        return fallback;
      }
      throw error;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return (await request) as T;
}

export const sanityService = {
  async getProducts(limit = 20, offset = 0): Promise<SanityProduct[]> {
    const query = `*[_type == "product"] | order(_createdAt desc)[${offset}...${offset + limit}] {
      ${PRODUCT_FRAGMENT}
    }`;
    return await safeSanityFetch(`products:${limit}:${offset}`, query, []);
  },

  async getProductById(id: string): Promise<SanityProduct | null> {
    const query = `*[_type == "product" && _id == "${id}"][0] {
      ${PRODUCT_FRAGMENT}
    }`;
    return await safeSanityFetch(`product:id:${id}`, query, null);
  },

  async getProductBySlug(slug: string): Promise<SanityProduct | null> {
    const query = `*[_type == "product" && slug.current == "${slug}"][0] {
      ${PRODUCT_FRAGMENT}
    }`;
    return await safeSanityFetch(`product:slug:${slug}`, query, null);
  },

  async searchProducts(searchTerm: string, limit = 20): Promise<SanityProduct[]> {
    const query = `*[_type == "product" && (
      title match "${searchTerm}*" ||
      description match "${searchTerm}*"
    )] | order(_createdAt desc)[0...${limit}] {
      ${PRODUCT_FRAGMENT}
    }`;
    return await safeSanityFetch(`products:search:${searchTerm}:${limit}`, query, []);
  },

  async getProductsByCategory(
    categorySlug: string,
    limit = 20,
    offset = 0,
  ): Promise<PaginatedResponse<SanityProduct>> {
    const countQuery = `count(*[_type == "product" && category->slug.current == "${categorySlug}"])`;
    const productsQuery = `*[_type == "product" && category->slug.current == "${categorySlug}"] | order(_createdAt desc)[${offset}...${offset + limit}] {
      ${PRODUCT_FRAGMENT}
    }`;

    const [total, products] = await Promise.all([
      safeSanityFetch(`products:category-count:${categorySlug}`, countQuery, 0),
      safeSanityFetch(`products:category:${categorySlug}:${limit}:${offset}`, productsQuery, []),
    ]);

    return {
      data: products,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + limit < total,
    };
  },

  async getCategories(): Promise<SanityCategory[]> {
    const query = `*[_type == "category"] | order(title asc) {
      _id,
      _type,
      title,
      slug,
      description,
      image {
        asset -> {
          _id,
          url
        }
      }
    }`;
    return await safeSanityFetch('categories:all', query, []);
  },

  async getCategoryBySlug(slug: string): Promise<SanityCategory | null> {
    const query = `*[_type == "category" && slug.current == "${slug}"][0] {
      _id,
      _type,
      title,
      slug,
      description,
      image {
        asset -> {
          _id,
          url
        }
      }
    }`;
    return await safeSanityFetch(`category:slug:${slug}`, query, null);
  },

  async getPageBySlug(slug: string): Promise<SanityPage | null> {
    const query = `*[_type == "page" && slug.current == "${slug}"][0] {
      _id,
      _type,
      title,
      slug,
      content,
      blocks
    }`;
    return await safeSanityFetch(`page:slug:${slug}`, query, null);
  },

  async search(searchTerm: string, limit = 10) {
    const query = `[
      *[_type == "product" && (
        title match "${searchTerm}*" ||
        description match "${searchTerm}*"
      )][0...${limit}] {
        _id,
        _type,
        title,
        "slug": slug.current,
        "image": image.asset->url
      },
      *[_type == "category" && title match "${searchTerm}*"][0...${limit}] {
        _id,
        _type,
        title,
        "slug": slug.current
      }
    ]`;
    const results = await safeSanityFetch(`search:${searchTerm}:${limit}`, query, [[], []]);
    return results.flat();
  },

  listen(query: string, callback: (update: any) => void) {
    const client = getSanityClient();
    const subscription = client.listen(query).subscribe(callback);
    return subscription;
  },
};

export default sanityService;
