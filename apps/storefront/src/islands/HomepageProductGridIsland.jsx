import { useEffect, useRef, useState } from "react";
import { sanityService } from "@siggistore/services/storefront";
import {
  bindFavoriteToggles,
  hydrateProductDataAttributes,
} from "../lib/store.js";

const promoCards = [
  {
    key: "promo-top",
    href: "./Product Listing.html#",
    image: "/images/photo-1603218190297-df1c6af07965.jpg",
    priceLabel: "",
    title: "",
    cta: "Voir tout les produits",
  },
  {
    key: "promo-bottom",
    href: "./Product Listing.html#",
    image: "/images/photo-1708443683295-5b9b4a125687.jpg",
    priceLabel: "",
    title: "",
    cta: "voir tout les produits",
  },
];

const PRODUCT_LIMIT = 10;

function formatPrice(price, currency = "USD") {
  if (typeof price !== "number" || Number.isNaN(price)) return null;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `$${price}`;
  }
}

function mapProductToCard(product, index) {
  return {
    id: product?._id || `product-${index + 1}`,
    image:
      product?.image?.asset?.url ||
      product?.images?.[0]?.asset?.url ||
      "",
    title: product?.title || `Product ${index + 1}`,
    category: product?.category?.title || "Product",
    originalPrice:
      typeof product?.originalPrice === "number"
        ? formatPrice(product.originalPrice, product.currency)
        : null,
    price:
      typeof product?.price === "number"
        ? formatPrice(product.price, product.currency)
        : "$0",
    reviewCount: 0,
    badge: null,
    href: product?.slug?.current
      ? `./Product Detail.html?slug=${encodeURIComponent(product.slug.current)}`
      : "./Product Detail.html",
  };
}

function ReviewStars({ reviewCount }) {
  const filledCount = reviewCount > 0 ? 4 : 0;

  return (
    <div className="ljp3z flex items-center azl7k">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          className="y6rh0 qpvtc c4t4j"
          fill="currentColor"
          height="16"
          viewBox="0 0 16 16"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          {index < filledCount ? (
            <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
          ) : (
            <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.56.56 0 0 0-.163-.505L1.71 6.745l4.052-.576a.53.53 0 0 0 .393-.288L8 2.223l1.847 3.658a.53.53 0 0 0 .393.288l4.052.575-2.906 2.77a.56.56 0 0 0-.163.506l.694 3.957-3.686-1.894a.5.5 0 0 0-.461 0z" />
          )}
        </svg>
      ))}
      <span className="duiq5 m859b c4t4j">({reviewCount})</span>
    </div>
  );
}

function PromoCard({ card }) {
  return (
    <a className="block relative nm4j1 ictpa focus:outline-hidden" href={card.href}>
      <img alt="Promo Image" className="e9n2b fy2yn ictpa" src={card.image} />
      <div className="absolute o6jzh mhm76 lulbn o8oua bnzaf rm4xc">
        <span className="block at2zb z7an8 no74a">{card.priceLabel}</span>
        <span className="block ctc9x dxw73 nhzx2 no74a">{card.title}</span>
        <p className="liwkv yymkp no74a carpj a8v2i">{card.cta}</p>
      </div>
    </a>
  );
}

function ProductCard({ product }) {
  return (
    <div
      className="group relative"
      data-product-id={product.id}
      data-product-title={product.title}
      data-product-href={product.href}
      data-product-image={product.image}
      data-product-price={product.price}
      data-product-category={product.category}
    >
      <div className="relative">
        <a className="block ictpa focus:outline-hidden" href={product.href}>
          {product.image ? (
            <img alt="Product Image" className="ictpa" src={product.image} />
          ) : (
            <div className="ictpa aspect-[3/4] bg-surface-2" aria-hidden="true" />
          )}
        </a>
        <div className="absolute bq7k1 m8htk nnhrf qqy1w wjvr4 z-10">
          <button
            aria-label="Add to favorites"
            className="ckw1y flex lp3ls items-center jdzig nj29a m859b s6i1l k0ser disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden"
            data-favorite-toggle="true"
            type="button"
          >
            <svg className="y6rh0 xqxx6" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <span className="rfrdb">Add to favorites</span>
          </button>
        </div>
        {product.badge ? (
          <div className="absolute bq7k1 i1rbz qqy1w b3k2r rlfos">
            <div className="flex flex-col tuxfz">
              <p>
                <span className="dg39k u5noc wjvr4 s6i1l at2zb m859b k0ser nj29a cirj5">
                  {product.badge}
                </span>
              </p>
            </div>
          </div>
        ) : null}
      </div>
      <a className="after:z-1 after:absolute after:inset-0" href={product.href}></a>
      <div className="z3wmw">
        <span className="block yymkp k80uv c4t4j">{product.title}</span>
        <p className="vbvcb yymkp f1ztf">{product.category}</p>
        {product.originalPrice ? (
          <p className="liwkv yymkp">
            <span className="yymkp f1ztf">
              <s>{product.originalPrice}</s>
            </span>
            <span className="yymkp gwcbr">{product.price}</span>
          </p>
        ) : (
          <p className="liwkv at2zb yymkp c4t4j">{product.price}</p>
        )}
        <ReviewStars reviewCount={product.reviewCount} />
      </div>
    </div>
  );
}

export default function HomepageProductGridIsland() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const gridRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const sanityProducts = await sanityService.getProducts(PRODUCT_LIMIT, 0);
        if (!isMounted) {
          return;
        }

        if (Array.isArray(sanityProducts) && sanityProducts.length > 0) {
          setProducts(
            sanityProducts
              .slice(0, PRODUCT_LIMIT)
              .map((product, index) => mapProductToCard(product, index)),
          );
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.warn("Unable to load homepage products from Sanity.", error);
        if (isMounted) {
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!gridRef.current) return;

    hydrateProductDataAttributes(gridRef.current);
    bindFavoriteToggles(gridRef.current);
  }, [products]);

  return (
    <>
      {products.length > 0 ? (
        <div className="tex4h hfud4 z27bc fgi2s rn6hf h7z6o w0vti" ref={gridRef}>
          <PromoCard card={promoCards[0]} />
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          <PromoCard card={promoCards[1]} />
        </div>
      ) : null}
      <p className="ga3ss yymkp f1ztf">
        {isLoading ? (
          <span className="inline-flex items-center my9gz yymkp f1ztf">
            <svg className="ezhux y6rh0 x215h" fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path className="l74pw" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM3.13375 12C3.13375 16.8967 7.10331 20.8662 12 20.8662C16.8967 20.8662 20.8662 16.8967 20.8662 12C20.8662 7.10331 16.8967 3.13375 12 3.13375C7.10331 3.13375 3.13375 7.10331 3.13375 12Z" fill="currentColor" />
              <path className="o53xq" d="M12 0C9.62662 -2.83022e-08 7.30655 0.703788 5.33316 2.02236C3.35977 3.34094 1.8217 5.21509 0.913446 7.4078C0.00519403 9.60051 -0.232446 12.0133 0.230577 14.3411C0.693599 16.6689 1.83649 18.8071 3.51472 20.4853L5.73062 18.2694C4.49065 17.0294 3.64622 15.4496 3.30412 13.7297C2.96201 12.0098 3.13759 10.2271 3.80866 8.60703C4.47972 6.98694 5.61613 5.60222 7.07418 4.62798C8.53222 3.65375 10.2464 3.13375 12 3.13375L12 0Z" fill="currentColor" />
            </svg>
            Loading ...
          </span>
        ) : products.length === 0 ? (
          <span>No live products available right now.</span>
        ) : null}
      </p>
    </>
  );
}
