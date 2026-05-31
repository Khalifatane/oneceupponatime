/**
 * @siggistore/services
 *
 * Shared services for both storefront and admin.
 */
// Storefront services
export * from './storefront';

// Admin services
export * from './admin';

// Service registry (storefront)
import {
  createCMSPageService,
  createSearchService,
  createCollectionService,
  createStoreService,
  createCMSMenuService,
  type CMSPageService,
  type SearchService,
  type CollectionService,
  type StoreService,
  type CMSMenuService,
} from './storefront';

export interface ServiceRegistry {
  cmsPage: CMSPageService;
  search: SearchService;
  collection: CollectionService;
  store: StoreService;
  cmsMenu: CMSMenuService;
}

export const createServiceRegistry = (): ServiceRegistry => {
  const currency = 'XOF';

  return {
    cmsPage: createCMSPageService(),
    search: createSearchService({ currency }),
    collection: createCollectionService({ currency }),
    store: createStoreService({ currency }),
    cmsMenu: createCMSMenuService(),
  };
};

export const services = createServiceRegistry();
