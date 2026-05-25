import {
  fetchOrders,
  fetchOrderItemsByOrderIds,
  fetchProductRuntimeByIds,
  getProductStockState,
  mergeProductWithRuntime,
  PRODUCT_RUNTIME_TABLE,
} from "@siggistore/services/admin";
import { fetchSanityProducts } from "@siggistore/services/admin/sanity-service.js";

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

async function fetchDashboardSalesStats() {
  try {
    const orders = await fetchOrders({ limit: 500 });
    const orderIds = orders.map((order) => order?.id).filter(Boolean);
    const items = await fetchOrderItemsByOrderIds(orderIds);
    const stats = new Map();

    items.forEach((item) => {
      const quantity = Math.max(0, Number(item?.quantity ?? 0) || 0);
      const unitPrice = Math.max(
        0,
        Number(item?.price_snapshot ?? item?.price ?? 0) || 0,
      );
      const itemValue = quantity * unitPrice;

      buildOrderItemLookupKeys(item).forEach((key) => {
        const current = stats.get(key) || { sold: 0, value: 0 };
        current.sold += quantity;
        current.value += itemValue;
        stats.set(key, current);
      });
    });

    return stats;
  } catch (error) {
    console.warn("Dashboard order sales stats unavailable", error);
    return new Map();
  }
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
      ? "m5geq"
      : stockState.key === "low_stock"
        ? "text-amber-600"
        : "pnjtm";

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

async function loadDashboardTopProducts() {
  const table = getTopProductsTable();
  const tbody = table?.querySelector("tbody");
  if (!table || !tbody) return;

  const originalMarkup = tbody.innerHTML;
  const card = table.closest(".zorzx.flex.flex-col");
  const allProductsLink = card?.querySelector('a[href="#"]');
  const select = card?.querySelector("select");

  if (allProductsLink) {
    allProductsLink.setAttribute("href", "./products.html");
  }

  async function render() {
    try {
      const products = await fetchSanityProducts({ limit: 100 });
      const runtimeIds = [...new Set(products.flatMap((product) => buildRuntimeLookupKey(product)))];
      let runtimeRows = [];

      try {
        runtimeRows = await fetchProductRuntimeByIds(runtimeIds, {
          table: PRODUCT_RUNTIME_TABLE,
        });
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
      const salesStatsMap = await fetchDashboardSalesStats();

      const topProducts = mergedProducts
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    loadDashboardTopProducts();
  });
} else {
  loadDashboardTopProducts();
}
