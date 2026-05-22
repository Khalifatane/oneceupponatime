/**
 * Admin service exports
 *
 * Re-exports from @siggistore/supabase/admin for database operations,
 * plus admin-specific services (realtime, table-state, sanity-service).
 */

// From @siggistore/supabase/admin
export {
  fetchOrders,
  fetchOrderById,
  fetchOrdersSince,
  fetchOrdersBetween,
  fetchCustomers,
  fetchCustomersBetween,
  fetchCustomersByIds,
  fetchProfilesByIds,
  fetchOrderItemsByOrderIds,
  updateOrderStatus,
  fetchDiscounts,
  createDiscount,
  fetchProductRuntime,
  fetchProductRuntimeByIds,
  mergeProductWithRuntime,
  getProductStockState,
  updateProductRuntimeAvailability,
  getOverviewMetrics,
  getOrderTotal,
  getOrderItemUnitPrice,
  ORDER_STATUSES,
  PRODUCT_RUNTIME_TABLE,
} from "@siggistore/supabase/admin";

// Admin-specific services
export * from "./realtime.js";
export * from "./table-state.js";
export * from "./admin-service.js";
export * from "./sanity-service.js";
export * from "./sanity-service-client.ts";

export type { OverviewMetrics, SanityProductRecord } from "@siggistore/shared-types";
