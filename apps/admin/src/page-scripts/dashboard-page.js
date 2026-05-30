import {
  fetchDiscounts,
  fetchOrders,
  fetchOrderItemsByOrderIds,
  fetchProductReviews,
  fetchProductRuntimeByIds,
  getProductStockState,
  mergeProductWithRuntime,
  PRODUCT_RUNTIME_TABLE,
} from "@siggistore/services/admin";
import { fetchSanityProducts } from "@siggistore/services/admin/sanity-service.js";

const DASHBOARD_PERIOD_DAYS = 30;
const POSITIVE_TREND_CLASS = "m5geq";
const NEGATIVE_TREND_CLASS = "pnjtm";
const NEUTRAL_TREND_CLASS = "nck10";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatNumber(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDecimal(value, maximumFractionDigits = 1) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function buildRuntimeLookupKey(product) {
  return [product?.id, product?.slug, product?.sku].filter(Boolean).map(String);
}

function normalizeLookupValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildProductLookupKeys(product) {
  return [product?.id, product?.slug, product?.sku, product?.name]
    .filter(Boolean)
    .map(normalizeLookupValue);
}

function buildOrderItemLookupKeys(item) {
  return [
    item?.sanity_product_id,
    item?.product_id,
    item?.slug,
    item?.sku,
    item?.title,
    item?.name,
    item?.product_title,
    item?.product_name,
  ]
    .filter(Boolean)
    .map(normalizeLookupValue);
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function getDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRange(days = DASHBOARD_PERIOD_DAYS) {
  const today = startOfDay(new Date());
  const currentStart = addDays(today, -(days - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(days - 1));

  return {
    today,
    currentStart,
    previousStart,
    previousEnd,
    days,
  };
}

function isDateWithinRange(value, start, end) {
  if (!value) return false;
  const date = startOfDay(value);
  return date >= start && date <= end;
}

function getTrend(current, previous) {
  const safeCurrent = Number(current ?? 0) || 0;
  const safePrevious = Number(previous ?? 0) || 0;

  if (safePrevious === 0) {
    if (safeCurrent === 0) return { delta: 0, direction: "neutral" };
    return { delta: 100, direction: "up" };
  }

  const rawDelta = ((safeCurrent - safePrevious) / Math.abs(safePrevious)) * 100;

  if (Math.abs(rawDelta) < 0.05) {
    return { delta: 0, direction: "neutral" };
  }

  return {
    delta: Math.abs(rawDelta),
    direction: rawDelta > 0 ? "up" : "down",
  };
}

function getTrendMarkup(trend) {
  const direction = trend?.direction || "neutral";
  const delta = Math.abs(Number(trend?.delta ?? 0) || 0);

  if (direction === "neutral") {
    return `
      <span class="inline-flex items-center jdzig yymkp ${NEUTRAL_TREND_CLASS}">
        ${formatDecimal(delta)}%
      </span>
    `;
  }

  const trendClass = direction === "up" ? POSITIVE_TREND_CLASS : NEGATIVE_TREND_CLASS;
  const icon =
    direction === "up"
      ? `
        <svg class="y6rh0 x215h" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
          <polyline points="16 7 22 7 22 13"></polyline>
        </svg>
      `
      : `
        <svg class="y6rh0 x215h" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
          <polyline points="16 17 22 17 22 11"></polyline>
        </svg>
      `;

  return `
    <span class="inline-flex items-center jdzig yymkp ${trendClass}">
      ${icon}
      ${formatDecimal(delta)}%
    </span>
  `;
}

function createDayBuckets(range) {
  return Array.from({ length: range.days }, (_, index) => {
    const date = addDays(range.currentStart, index);
    return {
      label: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
      }).format(date),
      key: getDateKey(date),
      date,
    };
  });
}

function buildSeriesFromCollection(items, range, valueResolver) {
  const currentMap = new Map();
  const previousMap = new Map();

  items.forEach((item) => {
    const rawDate =
      item?.created_at ||
      item?.updated_at ||
      item?.date ||
      item?.starts_at ||
      item?.published_at;

    if (!rawDate) return;
    const date = startOfDay(rawDate);
    if (Number.isNaN(date.getTime())) return;

    const value = Number(valueResolver(item) ?? 0) || 0;
    const key = getDateKey(date);

    if (isDateWithinRange(date, range.currentStart, range.today)) {
      currentMap.set(key, (currentMap.get(key) || 0) + value);
      return;
    }

    if (isDateWithinRange(date, range.previousStart, range.previousEnd)) {
      previousMap.set(key, (previousMap.get(key) || 0) + value);
    }
  });

  const buckets = createDayBuckets(range);
  const currentSeries = buckets.map((bucket) => currentMap.get(bucket.key) || 0);
  const previousSeries = buckets.map((bucket, index) => {
    const previousKey = getDateKey(addDays(range.previousStart, index));
    return previousMap.get(previousKey) || 0;
  });

  return {
    categories: buckets.map((bucket) => bucket.label),
    currentSeries,
    previousSeries,
  };
}

function isDiscountActive(discount, date = new Date()) {
  const status = String(discount?.status ?? "").toLowerCase();
  if (status !== "active") return false;

  const start = discount?.starts_at ? new Date(discount.starts_at) : null;
  const end = discount?.ends_at ? new Date(discount.ends_at) : null;
  const safeDate = new Date(date);

  if (start && !Number.isNaN(start.getTime()) && start > safeDate) return false;
  if (end && !Number.isNaN(end.getTime()) && end < safeDate) return false;
  return true;
}

function buildActiveDiscountSeries(discounts, range) {
  const buckets = createDayBuckets(range);
  const currentSeries = buckets.map((bucket) =>
    discounts.filter((discount) => isDiscountActive(discount, bucket.date)).length,
  );
  const previousSeries = buckets.map((_, index) => {
    const previousDate = addDays(range.previousStart, index);
    return discounts.filter((discount) => isDiscountActive(discount, previousDate)).length;
  });

  return {
    categories: buckets.map((bucket) => bucket.label),
    currentSeries,
    previousSeries,
  };
}

function getTopProductsTable() {
  return Array.from(document.querySelectorAll("table")).find((table) => {
    const text = table.textContent || "";
    return (
      text.includes("Item") &&
      text.includes("Change") &&
      text.includes("Price") &&
      text.includes("Sold") &&
      text.includes("Value")
    );
  });
}

function getRequestedRowCount(table) {
  const card = table.closest(".zorzx.flex.flex-col");
  const select = card?.querySelector("select");
  const selectedValue = Number(select?.value || select?.selectedOptions?.[0]?.textContent || 5);
  return Number.isFinite(selectedValue) && selectedValue > 0 ? selectedValue : 5;
}

function getChangeMarkup(product) {
  const stockState = getProductStockState(product);
  const sold = Math.max(0, Number(product?.salesCount ?? 0) || 0);
  const stock = Math.max(0, Number(product?.stock ?? 0) || 0);
  const totalUnits = sold + stock;
  const sellThrough = totalUnits > 0 ? Math.round((sold / totalUnits) * 100) : 0;

  const trendClass =
    stockState.key === "in_stock"
      ? POSITIVE_TREND_CLASS
      : stockState.key === "low_stock"
        ? "text-amber-600"
        : NEGATIVE_TREND_CLASS;

  const trendIcon =
    stockState.key === "in_stock"
      ? `
        <svg class="inline-block wh1lz x215h ${trendClass}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
          <polyline points="16 7 22 7 22 13"></polyline>
        </svg>
      `
      : `
        <svg class="inline-block wh1lz x215h ${trendClass}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
          <polyline points="16 17 22 17 22 11"></polyline>
        </svg>
      `;

  return `
    <span class="yymkp mnod2">
      ${sellThrough}%
      <span class="inline-block ${trendClass}">
        ${escapeHtml(stockState.label)}
        ${trendIcon}
      </span>
    </span>
  `;
}

function hydrateDashboardRow(row, product) {
  const sold = Math.max(0, Number(product?.salesCount ?? 0) || 0);
  const value = sold * Math.max(0, Number(product?.price ?? 0) || 0);
  const productName = String(product?.name || "Untitled product").trim();
  const detailsHref = `./product-details.html?product=${encodeURIComponent(
    product?.slug || product?.id || "",
  )}`;
  const image = row.querySelector("img");
  const itemLink = row.querySelector('td:nth-child(2) a');
  const itemName = row.querySelector('td:nth-child(2) .yymkp');
  const changeCell = row.querySelector('td:nth-child(3) .yymkp');
  const priceCell = row.querySelector('td:nth-child(4) .yymkp');
  const soldCell = row.querySelector('td:nth-child(5) .yymkp');
  const valueCell = row.querySelector('td:nth-child(6) .ctc9x');

  if (image) {
    if (product?.imageUrl) {
      image.src = product.imageUrl;
      image.alt = "Product Image";
    } else {
      image.removeAttribute("src");
      image.alt = "Product Image";
    }
  }

  if (itemLink) {
    itemLink.setAttribute("href", detailsHref);
  }

  if (itemName) {
    itemName.textContent = productName;
  }

  if (changeCell) {
    changeCell.outerHTML = getChangeMarkup(product);
  }

  if (priceCell) {
    priceCell.textContent = formatMoney(product?.price);
  }

  if (soldCell) {
    soldCell.textContent = sold.toLocaleString("en-US");
  }

  if (valueCell) {
    valueCell.textContent = formatMoney(value);
  }
}

function ensureEnoughRows(tbody, count) {
  const rows = Array.from(tbody.querySelectorAll("tr"));
  if (!rows.length) return [];

  const template = rows[0].cloneNode(true);
  while (tbody.querySelectorAll("tr").length < count) {
    tbody.appendChild(template.cloneNode(true));
  }

  return Array.from(tbody.querySelectorAll("tr"));
}

function safeArray(result) {
  if (result.status === "fulfilled" && Array.isArray(result.value)) {
    return result.value;
  }

  if (result.status === "rejected") {
    console.warn("Dashboard data source unavailable", result.reason);
  }

  return [];
}

async function loadDashboardData() {
  const range = getDateRange(DASHBOARD_PERIOD_DAYS);
  const ordersWindowStart = range.previousStart.toISOString();

  const [productsResult, ordersResult, reviewsResult, discountsResult] = await Promise.allSettled([
    fetchSanityProducts({ limit: 200 }),
    fetchOrders({ from: ordersWindowStart, limit: 1000 }),
    fetchProductReviews({ limit: 500, includeReplies: false }),
    fetchDiscounts({ limit: 500 }),
  ]);

  const products = safeArray(productsResult);
  const orders = safeArray(ordersResult);
  const reviews = safeArray(reviewsResult);
  const discounts = safeArray(discountsResult);

  const runtimeIds = [...new Set(products.flatMap((product) => buildRuntimeLookupKey(product)))];
  let runtimeRows = [];

  try {
    runtimeRows = runtimeIds.length
      ? await fetchProductRuntimeByIds(runtimeIds, {
          table: PRODUCT_RUNTIME_TABLE,
        })
      : [];
  } catch (error) {
    console.warn("Dashboard runtime products unavailable", error);
  }

  const runtimeMap = new Map();
  runtimeRows.forEach((runtime) => {
    [runtime.sanity_product_id, runtime.product_id, runtime.slug, runtime.sku]
      .filter(Boolean)
      .forEach((key) => runtimeMap.set(String(key), runtime));
  });

  const mergedProducts = products.map((product) => {
    const runtime = buildRuntimeLookupKey(product)
      .map((key) => runtimeMap.get(String(key)))
      .find(Boolean);
    return mergeProductWithRuntime(product, runtime);
  });

  const orderIds = orders.map((order) => order?.id).filter(Boolean);
  let orderItems = [];

  try {
    orderItems = orderIds.length ? await fetchOrderItemsByOrderIds(orderIds) : [];
  } catch (error) {
    console.warn("Dashboard order items unavailable", error);
  }

  return {
    range,
    products: mergedProducts,
    orders,
    reviews,
    discounts,
    orderItems,
  };
}

function buildSalesStatsMap(orderItems) {
  const stats = new Map();

  orderItems.forEach((item) => {
    const quantity = Math.max(0, Number(item?.quantity ?? 0) || 0);
    const unitPrice = Math.max(0, Number(item?.price_snapshot ?? item?.price ?? 0) || 0);
    const itemValue = quantity * unitPrice;

    buildOrderItemLookupKeys(item).forEach((key) => {
      const current = stats.get(key) || { sold: 0, value: 0 };
      current.sold += quantity;
      current.value += itemValue;
      stats.set(key, current);
    });
  });

  return stats;
}

async function loadDashboardTopProducts(data) {
  const table = getTopProductsTable();
  const tbody = table?.querySelector("tbody");
  if (!table || !tbody) return;

  const originalMarkup = tbody.innerHTML;
  const card = table.closest(".zorzx.flex.flex-col");
  const allProductsLink = card?.querySelector('a[href="#"]');
  const select = card?.querySelector("select");
  const salesStatsMap = buildSalesStatsMap(data.orderItems);

  if (allProductsLink) {
    allProductsLink.setAttribute("href", "./products.html");
  }

  async function render() {
    try {
      const topProducts = data.products
        .map((product) => ({
          ...product,
          salesCount:
            buildProductLookupKeys(product)
              .map((key) => salesStatsMap.get(key)?.sold)
              .find((value) => typeof value === "number" && value > 0) ??
            Math.max(0, Number(product?.salesCount ?? 0) || 0),
          computedValue:
            buildProductLookupKeys(product)
              .map((key) => salesStatsMap.get(key)?.value)
              .find((value) => typeof value === "number" && value > 0) ??
            (Math.max(0, Number(product?.salesCount ?? 0) || 0) *
              Math.max(0, Number(product?.price ?? 0) || 0)),
        }))
        .sort((a, b) => {
          if (b.computedValue !== a.computedValue) return b.computedValue - a.computedValue;
          if (b.salesCount !== a.salesCount) return b.salesCount - a.salesCount;
          if (Number(b.price || 0) !== Number(a.price || 0)) {
            return Number(b.price || 0) - Number(a.price || 0);
          }
          if (Number(b.stock || 0) !== Number(a.stock || 0)) {
            return Number(b.stock || 0) - Number(a.stock || 0);
          }
          return String(a.name || "").trim().localeCompare(String(b.name || "").trim());
        });

      const productsToRender = topProducts.slice(0, getRequestedRowCount(table));

      if (!productsToRender.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="cti9j edpyz yymkp f1ztf c4t4j">
              No live products are available for this dashboard yet.
            </td>
          </tr>
        `;
        return;
      }

      if (!tbody.querySelector("tr")) {
        tbody.innerHTML = originalMarkup;
      }

      const rows = ensureEnoughRows(tbody, productsToRender.length);
      rows.forEach((row, index) => {
        const product = productsToRender[index];
        if (!product) {
          row.classList.add("hidden");
          return;
        }
        row.classList.remove("hidden");
        hydrateDashboardRow(row, product);
      });
    } catch (error) {
      console.error("Unable to load dashboard top products", error);
      tbody.innerHTML = originalMarkup;
    }
  }

  select?.addEventListener("change", render);
  await render();
}

function updateTopMetricCard(card, { title, value, subtext, trend }) {
  if (!card) return;

  const titleNode = card.querySelector("h2");
  const valueNode = card.querySelector("p.dxw73");
  const metaNodes = card.querySelectorAll(".liwkv span");

  if (titleNode) titleNode.textContent = title;
  if (valueNode) valueNode.textContent = value;
  if (metaNodes[0]) metaNodes[0].textContent = subtext;
  if (metaNodes[1]) metaNodes[1].outerHTML = getTrendMarkup(trend);
}

function getTopMetricCards() {
  return Array.from(
    document.querySelectorAll(".tex4h.hfud4.fgi2s.osjzw.i7n2f.ifa2p > .en2kw.q638q.fepth"),
  );
}

function updateChartCardHeader(containerId, { title, value, subtext, trend }) {
  const container = document.querySelector(containerId);
  const card = container?.closest(".zorzx.flex.flex-col");
  if (!card) return null;

  const titleNode = card.querySelector("h2");
  const valueNode = card.querySelector("h4.dxw73");
  const subtextNode = card.querySelector(".et6ms p");

  if (titleNode) titleNode.textContent = title;
  if (valueNode) {
    valueNode.innerHTML = `${escapeHtml(value)} ${getTrendMarkup(trend)}`;
  }
  if (subtextNode) subtextNode.textContent = subtext;

  return card;
}

function renderLineChart(containerId, title, categories, currentSeries, previousSeries, valueType = "number") {
  const container = document.querySelector(containerId);
  const ApexChartsCtor = globalThis.ApexCharts;
  if (!container || typeof ApexChartsCtor !== "function") return;

  container.innerHTML = "";

  const formatter =
    valueType === "currency"
      ? (value) => formatMoney(value)
      : (value) => formatNumber(value);

  const chart = new ApexChartsCtor(container, {
    chart: {
      type: "line",
      height: container.classList.contains("min-h-[265px]") ? 265 : 240,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true },
    },
    series: [
      { name: "This month", data: currentSeries },
      { name: "Last month", data: previousSeries },
    ],
    colors: ["#0f766e", "#94a3b8"],
    stroke: {
      width: 3,
      curve: "smooth",
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
    },
    legend: {
      show: false,
    },
    xaxis: {
      categories,
      labels: {
        style: {
          colors: "#64748b",
          fontSize: "11px",
        },
        hideOverlappingLabels: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter,
        style: {
          colors: "#64748b",
          fontSize: "11px",
        },
      },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter,
      },
    },
    markers: {
      size: 0,
      hover: {
        size: 5,
      },
    },
    title: {
      text: title,
      style: {
        fontSize: "0px",
      },
    },
  });

  chart.render();
}

function sumOrderRevenue(orders) {
  return orders.reduce((sum, order) => sum + (Number(order?.total_amount ?? order?.total ?? 0) || 0), 0);
}

function calculateOverviewMetrics(data) {
  const { range, products, orders, reviews, discounts } = data;
  const currentOrders = orders.filter((order) =>
    isDateWithinRange(order?.created_at || order?.date, range.currentStart, range.today),
  );
  const previousOrders = orders.filter((order) =>
    isDateWithinRange(order?.created_at || order?.date, range.previousStart, range.previousEnd),
  );
  const currentReviews = reviews.filter((review) =>
    isDateWithinRange(review?.created_at, range.currentStart, range.today),
  );
  const previousReviews = reviews.filter((review) =>
    isDateWithinRange(review?.created_at, range.previousStart, range.previousEnd),
  );
  const currentDiscounts = discounts.filter((discount) =>
    isDateWithinRange(discount?.created_at, range.currentStart, range.today),
  );
  const previousDiscounts = discounts.filter((discount) =>
    isDateWithinRange(discount?.created_at, range.previousStart, range.previousEnd),
  );

  const inStockProducts = products.filter(
    (product) => getProductStockState(product).key === "in_stock",
  ).length;
  const publishedReviews = reviews.filter(
    (review) => String(review?.status ?? "").toLowerCase() === "published",
  ).length;
  const activeDiscounts = discounts.filter((discount) => isDiscountActive(discount)).length;
  const refundedOrders = currentOrders.filter(
    (order) => String(order?.status ?? "").toLowerCase() === "refunded",
  ).length;
  const pendingOrders = currentOrders.filter(
    (order) => String(order?.status ?? "").toLowerCase() === "pending",
  ).length;
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + (Number(review?.rating ?? 0) || 0), 0) / reviews.length
      : 0;

  return {
    products: {
      total: products.length,
      inStock: inStockProducts,
    },
    orders: {
      total: currentOrders.length,
      previousTotal: previousOrders.length,
      revenue: sumOrderRevenue(currentOrders),
      previousRevenue: sumOrderRevenue(previousOrders),
      refunded: refundedOrders,
      pending: pendingOrders,
    },
    reviews: {
      total: reviews.length,
      currentTotal: currentReviews.length,
      previousTotal: previousReviews.length,
      averageRating,
      published: publishedReviews,
    },
    discounts: {
      total: discounts.length,
      currentTotal: currentDiscounts.length,
      previousTotal: previousDiscounts.length,
      active: activeDiscounts,
    },
  };
}

function hydrateDashboardSummary(data) {
  const metrics = calculateOverviewMetrics(data);
  const topCards = getTopMetricCards();

  updateTopMetricCard(topCards[0], {
    title: "Produits",
    value: formatNumber(metrics.products.total),
    subtext: `${formatNumber(metrics.products.inStock)} en stock`,
    trend: getTrend(metrics.products.inStock, Math.max(metrics.products.total - metrics.products.inStock, 0)),
  });

  updateTopMetricCard(topCards[1], {
    title: "Remises",
    value: formatNumber(metrics.discounts.total),
    subtext: `${formatNumber(metrics.discounts.active)} actives`,
    trend: getTrend(metrics.discounts.currentTotal, metrics.discounts.previousTotal),
  });

  const salesSeries = buildSeriesFromCollection(data.orders, data.range, (order) =>
    Number(order?.total_amount ?? order?.total ?? 0) || 0,
  );
  updateChartCardHeader("#hs-total-sales-line-chart", {
    title: "Chiffre d'affaires",
    value: formatMoney(metrics.orders.revenue),
    subtext: `${formatNumber(metrics.orders.total)} commandes sur ${DASHBOARD_PERIOD_DAYS} jours`,
    trend: getTrend(metrics.orders.revenue, metrics.orders.previousRevenue),
  });
  renderLineChart(
    "#hs-total-sales-line-chart",
    "Sales",
    salesSeries.categories,
    salesSeries.currentSeries,
    salesSeries.previousSeries,
    "currency",
  );

  const reviewSeries = buildSeriesFromCollection(data.reviews, data.range, () => 1);
  updateChartCardHeader("#hs-total-visitors-line-chart", {
    title: "Avis clients",
    value: formatNumber(metrics.reviews.total),
    subtext: `Note moyenne ${formatDecimal(metrics.reviews.averageRating, 1)}/5`,
    trend: getTrend(metrics.reviews.currentTotal, metrics.reviews.previousTotal),
  });
  renderLineChart(
    "#hs-total-visitors-line-chart",
    "Reviews",
    reviewSeries.categories,
    reviewSeries.currentSeries,
    reviewSeries.previousSeries,
  );

  const orderSeries = buildSeriesFromCollection(data.orders, data.range, () => 1);
  updateChartCardHeader("#hs-total-orders-line-chart", {
    title: "Commandes",
    value: formatNumber(metrics.orders.total),
    subtext: `${formatNumber(metrics.orders.pending)} en attente`,
    trend: getTrend(metrics.orders.total, metrics.orders.previousTotal),
  });
  renderLineChart(
    "#hs-total-orders-line-chart",
    "Orders",
    orderSeries.categories,
    orderSeries.currentSeries,
    orderSeries.previousSeries,
  );

  const discountSeries = buildActiveDiscountSeries(data.discounts, data.range);
  updateChartCardHeader("#hs-total-refunded-line-chart", {
    title: "Promotions actives",
    value: formatNumber(metrics.discounts.active),
    subtext: `${formatNumber(metrics.discounts.total)} codes enregistrés`,
    trend: getTrend(metrics.discounts.currentTotal, metrics.discounts.previousTotal),
  });
  renderLineChart(
    "#hs-total-refunded-line-chart",
    "Discounts",
    discountSeries.categories,
    discountSeries.currentSeries,
    discountSeries.previousSeries,
  );

  const heading = document.querySelector("h1.dxw73");
  const subheading = document.querySelector("h1.dxw73 + p");
  if (heading) heading.textContent = "Vue d'ensemble de votre boutique";
  if (subheading) {
    subheading.textContent =
      `${formatNumber(metrics.products.total)} produits, ${formatNumber(metrics.orders.total)} commandes, ` +
      `${formatNumber(metrics.reviews.total)} avis et ${formatNumber(metrics.discounts.active)} remises actives.`;
  }

  const ordersNavBadge = Array.from(document.querySelectorAll('a[href="orders.html"] span')).find((node) =>
    node.className.includes("inline-flex"),
  );
  if (ordersNavBadge) {
    ordersNavBadge.textContent = `+${formatNumber(metrics.orders.pending)}`;
  }

  const reviewsLink = Array.from(document.querySelectorAll('a[href="reviews.html"]')).find(Boolean);
  if (reviewsLink) {
    reviewsLink.setAttribute("title", `${formatNumber(metrics.reviews.published)} published reviews`);
  }

  const discountsLink = Array.from(document.querySelectorAll('a[href="discounts.html"]')).find(Boolean);
  if (discountsLink) {
    discountsLink.setAttribute("title", `${formatNumber(metrics.discounts.active)} active discounts`);
  }

  const ordersSectionTitle = Array.from(document.querySelectorAll("h2")).find(
    (node) => node.textContent?.trim() === "Orders",
  );
  if (ordersSectionTitle) {
    ordersSectionTitle.textContent = "Synthese d'activite";
  }
}

async function loadDashboard() {
  const data = await loadDashboardData();
  hydrateDashboardSummary(data);
  await loadDashboardTopProducts(data);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
  });
} else {
  loadDashboard();
}
