/**
 * Supabase Admin Operations
 *
 * Admin-specific database operations that require elevated privileges.
 * These use the shared supabase client but perform admin-level queries.
 */
import { getSupabase, supabase } from './client';
import type { SupabaseOrder, SupabaseProfile } from '@siggistore/shared-types';

export const ORDER_STATUSES = [
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'failed', 'canceled', 'cancelled', 'refunded',
] as const;

export const PRODUCT_RUNTIME_TABLE =
  import.meta.env?.VITE_SUPABASE_PRODUCTS_TABLE || 'products_runtime';

function applyRange(query: any, limit?: number, offset = 0) {
  if (typeof limit !== 'number') return query;
  const from = Math.max(0, offset);
  const to = from + Math.max(0, limit) - 1;
  return query.range(from, to);
}

function normalizeOrder(row: any): SupabaseOrder {
  if (!row) return row;
  return {
    ...row,
    user_id: row.user_id ?? row.customer_id ?? null,
    total_amount: Number(row.total_amount ?? row.total ?? 0),
    status: row.status ?? 'pending',
    currency: row.currency ?? 'USD',
    items: row.items ?? row.order_items ?? [],
  };
}

function normalizeCustomer(row: any) {
  if (!row) return row;
  return {
    ...row,
    user_id: row.user_id ?? row.id ?? null,
    name:
      row.name ||
      [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
      row.email ||
      'Unknown customer',
  };
}

function normalizeProductRuntime(row: any) {
  if (!row) return row;
  return {
    ...row,
    sanity_product_id:
      row.sanity_product_id ?? row.product_id ?? row.sanity_id ?? row.slug ?? null,
    price: row.price == null ? null : Number(row.price),
    compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
    stock: row.stock == null ? Number(row.inventory ?? 0) || 0 : Number(row.stock) || 0,
    sales_count: Number(row.sales_count ?? 0) || 0,
    status: row.status || 'publish',
    is_available:
      row.is_available === undefined || row.is_available === null
        ? true
        : Boolean(row.is_available),
    channels: Array.isArray(row.channels) ? row.channels : [],
  };
}

async function safeProductRuntimeQuery<T>(executor: () => Promise<T>): Promise<T> {
  try {
    return await executor();
  } catch (error: any) {
    if (
      error?.code === '42P01' ||
      error?.message?.includes('relation') ||
      error?.message?.includes('does not exist')
    ) {
      return [] as unknown as T;
    }
    throw error;
  }
}

// ===== ORDERS =====

export async function fetchOrders(options: any = {}) {
  const { limit, offset, status, from, to, query: search } = options;
  let request = supabase.from('orders').select('*').order('created_at', { ascending: false });

  if (status && status !== 'all') {
    request = request.eq('status', status);
  }
  if (from) request = request.gte('created_at', from);
  if (to) request = request.lte('created_at', to);
  if (search) {
    request = request.or(
      `id.ilike.%${search}%,user_id.ilike.%${search}%,customer_id.ilike.%${search}%`,
    );
  }
  request = applyRange(request, limit, offset);

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []).map(normalizeOrder);
}

export async function fetchOrderById(orderId: string) {
  const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (error) throw error;
  return normalizeOrder(data);
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeOrder(data);
}

// ===== CUSTOMERS =====

export async function fetchCustomers(options: any = {}) {
  const { limit, offset, from, to, query: search } = options;
  let request = supabase.from('customers').select('*').order('created_at', { ascending: false });

  if (from) request = request.gte('created_at', from);
  if (to) request = request.lte('created_at', to);
  if (search) {
    request = request.or(
      `email.ilike.%${search}%,name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
    );
  }
  request = applyRange(request, limit, offset);

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []).map(normalizeCustomer);
}

export async function fetchProfilesByIds(ids: string[] = []) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrdersSince(sinceIso: string) {
  return fetchOrders({ from: sinceIso });
}

export async function fetchOrdersBetween(startIso: string, endIso: string) {
  return fetchOrders({ from: startIso, to: endIso });
}

export async function fetchCustomersBetween(startIso: string, endIso: string) {
  return fetchCustomers({ from: startIso, to: endIso });
}

export async function fetchCustomersByIds(ids: string[] = []) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('customers').select('*').in('id', ids);
  if (error) throw error;
  return (data ?? []).map(normalizeCustomer);
}

export async function fetchOrderItemsByOrderIds(orderIds: string[] = []) {
  if (!orderIds.length) return [];
  const { data, error } = await supabase.from('order_items').select('*').in('order_id', orderIds);
  if (error) throw error;
  return data ?? [];
}

// ===== PRODUCTS =====

export async function fetchProductRuntime(options: any = {}) {
  const { limit, offset, ids = [], status, query: search, table = PRODUCT_RUNTIME_TABLE } = options;

  return safeProductRuntimeQuery(async () => {
    const normalizedIds = [...new Set(ids.filter(Boolean).map(String))];
    let request = supabase
      .from(table)
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false });

    if (status && status !== 'all') {
      request = request.eq('status', status);
    }
    if (search) {
      request = request.or(
        `sanity_product_id.ilike.%${search}%,product_id.ilike.%${search}%,slug.ilike.%${search}%,sku.ilike.%${search}%`,
      );
    }
    request = applyRange(request, limit, offset);

    const { data, error } = await request;
    if (error) throw error;

    const normalizedRows = (data ?? []).map(normalizeProductRuntime);
    if (!normalizedIds.length) return normalizedRows;

    return normalizedRows.filter((row: any) =>
      [row.sanity_product_id, row.product_id, row.slug, row.sku]
        .filter(Boolean)
        .some((value: string) => normalizedIds.includes(String(value))),
    );
  });
}

export async function fetchProductRuntimeByIds(ids = [], options = {}) {
  if (!ids.length) return [];
  return fetchProductRuntime({
    ...options,
    ids,
  });
}

export async function updateProductRuntimeAvailability(product: any, isAvailable: boolean, options: any = {}) {
  const table = options.table || PRODUCT_RUNTIME_TABLE;
  const nextAvailability = Boolean(isAvailable);
  const identifiers = {
    sanity_product_id: product?.runtime?.sanity_product_id || product?.id || null,
    product_id: product?.runtime?.product_id || null,
    slug: product?.slug || null,
    sku: product?.sku || null,
  };

  const payload = {
    ...identifiers,
    stock: Math.max(0, Number(product?.stock ?? 0) || 0),
    status: nextAvailability ? 'publish' : 'unpublish',
    is_available: nextAvailability,
    updated_at: new Date().toISOString(),
  };

  if (product?.runtime?.id) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', product.runtime.id)
      .select('*')
      .single();
    if (error) throw error;
    return normalizeProductRuntime(data);
  }

  const { data, error } = await supabase.from(table).insert(payload).select('*').single();
  if (error) throw error;
  return normalizeProductRuntime(data);
}

export function mergeProductWithRuntime(product: any, runtime: any) {
  if (!runtime) return product;
  return {
    ...product,
    runtime,
    sku: runtime.sku || product.sku,
    price: runtime.price == null || Number.isNaN(runtime.price) ? product.price : runtime.price,
    compareAtPrice:
      runtime.compare_at_price == null || Number.isNaN(runtime.compare_at_price)
        ? product.compareAtPrice
        : runtime.compare_at_price,
    stock: runtime.stock == null || Number.isNaN(runtime.stock) ? product.stock : runtime.stock,
    status: runtime.status || product.status,
    isAvailable:
      runtime.is_available === undefined || runtime.is_available === null
        ? product.isAvailable
        : Boolean(runtime.is_available),
    channels:
      Array.isArray(runtime.channels) && runtime.channels.length
        ? runtime.channels
        : product.channels,
    salesCount: Number(runtime.sales_count ?? product.salesCount ?? 0) || 0,
    featured: runtime.featured === undefined ? Boolean(product.featured) : Boolean(runtime.featured),
  };
}

export function getProductStockState(product: any, options: any = {}) {
  const lowStockThreshold = Number(options.lowStockThreshold ?? 5);
  const stock = Math.max(0, Number(product?.stock ?? 0) || 0);
  const isAvailable = Boolean(product?.isAvailable);

  if (!isAvailable || stock <= 0) {
    return { key: 'out_of_stock', label: 'Out of stock', stock };
  }
  if (stock <= lowStockThreshold) {
    return { key: 'low_stock', label: 'Low in stock', stock };
  }
  return { key: 'in_stock', label: 'In stock', stock };
}

// ===== DISCOUNTS =====

export async function fetchDiscounts(options: any = {}) {
  const { limit, offset, status, query: search } = options;
  let request = supabase.from('discounts').select('*').order('created_at', { ascending: false });

  if (status && status !== 'all') {
    request = request.eq('status', status);
  }
  if (search) {
    request = request.or(`code.ilike.%${search}%,type.ilike.%${search}%`);
  }
  request = applyRange(request, limit, offset);

  const { data, error } = await request;
  if (error) {
    if (isMissingDiscountsTableError(error)) {
      console.warn('[supabase-admin] public.discounts is missing; returning an empty discount list.');
      return [];
    }
    throw error;
  }
  return data ?? [];
}

function isMissingDiscountsTableError(error: any) {
  const details = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .map(String)
    .join(' ');

  return (
    error?.code === '42P01' ||
    /Could not find the table ['"]?public\.discounts['"]? in the schema cache/i.test(details) ||
    /relation ['"]?public\.discounts['"]? does not exist/i.test(details) ||
    /relation ['"]?discounts['"]? does not exist/i.test(details)
  );
}

function parseMissingColumn(error: any) {
  const details = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .map(String)
    .join(' ');

  const patterns = [
    /column ["']?([a-zA-Z0-9_]+)["']? does not exist/i,
    /Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i,
    /schema cache.*column ['"]([a-zA-Z0-9_]+)['"]/i,
  ];

  for (const pattern of patterns) {
    const match = details.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export async function createDiscount(input: any = {}) {
  const now = new Date().toISOString();
  const value = Number(input.value ?? input.amount ?? 0);

  if (!input.name || !String(input.name).trim()) {
    throw new Error('Discount name is required.');
  }
  if (!input.code || !String(input.code).trim()) {
    throw new Error('Discount code is required.');
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Discount amount must be greater than 0.');
  }

  const payload: Record<string, any> = {
    name: String(input.name).trim(),
    title: String(input.name).trim(),
    code: String(input.code).trim().toUpperCase(),
    status: String(input.status ?? 'draft').toLowerCase(),
    type: String(input.type ?? 'percent').toLowerCase(),
    value,
    amount: value,
    scope: String(input.scope ?? 'global'),
    applies_to: String(input.scope ?? 'global'),
    usage_count: Number(input.usage_count ?? 0) || 0,
    updated_at: now,
    created_at: input.created_at ?? now,
  };

  if (input.starts_at) payload.starts_at = input.starts_at;
  if (input.ends_at) payload.ends_at = input.ends_at;

  const usageLimit = Number(input.usage_limit);
  if (Number.isFinite(usageLimit) && usageLimit > 0) {
    payload.usage_limit = usageLimit;
  }

  const triedMissingColumns = new Set<string>();

  while (true) {
    const { data, error } = await supabase
      .from('discounts')
      .insert(payload)
      .select('*')
      .single();

    if (!error) return data;

    if (isMissingDiscountsTableError(error)) {
      throw new Error(
        'The Supabase table public.discounts does not exist yet. Create it before using discount creation.',
      );
    }

    const missingColumn = parseMissingColumn(error);
    if (!missingColumn || !(missingColumn in payload) || triedMissingColumns.has(missingColumn)) {
      throw error;
    }

    triedMissingColumns.add(missingColumn);
    delete payload[missingColumn];
  }
}

// ===== CONVERSATIONS =====

export async function fetchConversations(options: any = {}) {
  const { limit, offset, query: search } = options;
  let request = supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (search) {
    request = request.or(
      `id.ilike.%${search}%,customer_id.ilike.%${search}%,last_message.ilike.%${search}%`,
    );
  }
  request = applyRange(request, limit, offset);

  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(payload: {
  conversationId: string;
  senderId?: string | null;
  senderRole: string;
  content: string;
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: payload.conversationId,
      sender_id: payload.senderId,
      sender_role: payload.senderRole,
      content: payload.content,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ===== METRICS =====

export async function getOverviewMetrics(options: any = {}) {
  const { recentLimit = 10, rangeDays = 30 } = options;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - rangeDays);

  const [orders, customers] = await Promise.all([
    fetchOrders({ from: sinceDate.toISOString(), limit: 500 }),
    fetchCustomers({ from: sinceDate.toISOString(), limit: 500 }),
  ]);

  const revenue = orders.reduce((sum: number, order: SupabaseOrder) => sum + Number(order.total_amount ?? 0), 0);
  const pendingOrders = orders.filter((o: SupabaseOrder) => o.status === 'pending');
  const failedOrders = orders.filter((o: SupabaseOrder) => o.status === 'failed');
  const refundedOrders = orders.filter((o: SupabaseOrder) => o.status === 'refunded');

  return {
    metrics: {
      revenue,
      orders: orders.length,
      customers: customers.length,
      averageOrderValue: orders.length ? revenue / orders.length : 0,
      pendingOrders: pendingOrders.length,
      failedOrders: failedOrders.length,
      refundedOrders: refundedOrders.length,
    },
    recentOrders: orders.slice(0, recentLimit),
    recentCustomers: customers.slice(0, recentLimit),
  };
}

export function getOrderTotal(order: any) {
  return Number(order?.total_amount ?? order?.total ?? 0);
}

export function getOrderItemUnitPrice(item: any) {
  return Number(item?.price_snapshot ?? item?.price ?? 0);
}
