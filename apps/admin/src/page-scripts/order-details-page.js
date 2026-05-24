import {
  deleteOrder,
  fetchCustomersByIds,
  fetchOrderById,
  fetchOrderItemsByOrderIds,
  fetchOrders,
  fetchProfilesByIds,
  getOrderItemUnitPrice,
  getOrderTotal,
  fetchSanityProductsByIds,
} from "@siggistore/services/admin";

const STOREFRONT_LATEST_ORDER_KEY = "appLatestOrder";

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

function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDateTimeLabel(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getPaymentMethodDisplayLabel(method) {
  const normalized = String(method ?? "").trim().toLowerCase();
  if (normalized === "paypal") return "A la livraison";
  if (normalized === "klarna") return "A la boutique";
  if (normalized === "card") return "Par Chario";
  return method ? titleCase(method) : "Par Chario";
}

function paymentBadgeMeta(order) {
  const raw =
    order?.payment_status ||
    order?.paymentStatus ||
    order?.payment?.status ||
    order?.status ||
    "pending";
  const label = titleCase(raw);
  const normalized = String(raw).toLowerCase();

  if (["paid", "processing", "shipped", "delivered", "completed"].includes(normalized)) {
    return {
      label: normalized === "processing" ? "Paid" : label,
      className:
        "dg39k o8oua inline-flex items-center i220p m859b at2zb qn8tw k73c1 nj29a dark:bg-green-500/10 dark:text-green-500",
    };
  }

  if (["failed", "canceled", "cancelled", "refunded"].includes(normalized)) {
    return {
      label: normalized === "canceled" ? "Cancelled" : label,
      className:
        "dg39k o8oua inline-flex items-center i220p m859b at2zb olwac oz3g9 nj29a dark:bg-red-500/10 dark:text-red-500",
    };
  }

  return {
    label,
    className:
      "dg39k o8oua inline-flex items-center i220p m859b at2zb axv3m ssl0y nj29a dark:bg-yellow-500/10 dark:text-yellow-500",
  };
}

function fulfillmentBadgeMeta(order) {
  const normalized = String(order?.status ?? "").toLowerCase();

  if (["shipped", "delivered", "completed"].includes(normalized)) {
    return {
      label: normalized === "shipped" ? "Shipped" : "Fulfilled",
      className:
        "dg39k o8oua inline-flex items-center i220p m859b at2zb qn8tw k73c1 nj29a dark:bg-green-500/10 dark:text-green-500",
    };
  }

  if (["failed", "canceled", "cancelled", "refunded"].includes(normalized)) {
    return {
      label: titleCase(normalized),
      className:
        "dg39k o8oua inline-flex items-center i220p m859b at2zb olwac oz3g9 nj29a dark:bg-red-500/10 dark:text-red-500",
    };
  }

  if (normalized === "processing") {
    return {
      label: "Processing",
      className:
        "dg39k o8oua inline-flex items-center i220p m859b at2zb nck10 h3ns9 nj29a",
    };
  }

  return {
    label: "Unfulfilled",
    className:
      "dg39k o8oua inline-flex items-center i220p m859b at2zb axv3m ssl0y nj29a dark:bg-yellow-500/10 dark:text-yellow-500",
  };
}

function getCustomerLookupKeys(order) {
  return [order?.customer_id, order?.user_id].filter(Boolean);
}

function formatAddressHtml(address) {
  if (!address) return "Not provided";

  const seen = new Set();
  const lines = [
    [address.first_name, address.last_name].filter(Boolean).join(" ").trim(),
    address.address_line_1,
    address.address_line_2,
    [address.city, address.state].filter(Boolean).join(", "),
    [address.postal_code, address.country].filter(Boolean).join(", "),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const normalized = value.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

  return lines.length ? lines.map(escapeHtml).join("<br>") : "Not provided";
}

function inferPaymentMethod(order) {
  const paymentMethod =
    order?.payment_method ||
    order?.paymentMethod ||
    order?.payment?.method;

  if (paymentMethod && typeof paymentMethod === "object") {
    const type = getPaymentMethodDisplayLabel(paymentMethod.type || paymentMethod.brand || "Card");
    const last4 =
      paymentMethod.last4 ||
      paymentMethod.last_4 ||
      paymentMethod.lastDigits;
    return {
      label: type,
      cardLabel: last4 ? `Card Number: ************ ${last4}` : type,
    };
  }

  if (typeof paymentMethod === "string" && paymentMethod.trim()) {
    const label = getPaymentMethodDisplayLabel(paymentMethod);
    return {
      label,
      cardLabel: label,
    };
  }

  return {
    label: "Par Chario",
    cardLabel: "Card Number: Not provided",
  };
}

function getOrderDisplayNumber(order, fallbackId = "") {
  const raw =
    order?.displayOrderNumber ||
    order?.number ||
    order?.order_number ||
    order?.id ||
    fallbackId;

  if (!raw) return "#UNKNOWN";
  const normalized = String(raw).trim();
  return normalized.startsWith("#") ? normalized : `#${normalized.toUpperCase()}`;
}

function getSanityLookupKeys(item) {
  return [
    item?.sanity_product_id,
    item?.product_id,
    item?.slug,
    item?.sku,
  ]
    .filter(Boolean)
    .map((value) => String(value));
}

function inferItemLabel(item) {
  return (
    item?.title ||
    item?.name ||
    item?.product_title ||
    item?.product_name ||
    item?.sku ||
    "Order item"
  );
}

function inferItemColor(item) {
  return item?.color || item?.variant_color || item?.options?.color || "-";
}

function inferItemSize(item) {
  return item?.size || item?.variant_size || item?.options?.size || "-";
}

function buildItemMarkup(item, order, productMap) {
  const matchedProduct = getSanityLookupKeys(item)
    .map((key) => productMap.get(key))
    .find(Boolean);
  const image =
    matchedProduct?.imageUrl ||
    item?.image ||
    item?.image_url ||
    item?.product_image ||
    "public/images.unsplash.com/photo-1613852348851-df1739db8201--qa8d247d7c6.bin";
  const quantity = Math.max(1, Number(item?.quantity ?? 1) || 1);
  const createdAt = order?.created_at ? new Date(order.created_at) : new Date();
  const deliveryDate = new Date(createdAt);
  deliveryDate.setDate(deliveryDate.getDate() + 4);

  return `
    <div class="p0vwr fkl1d r4caq mjfwa azhag phna0 a70al">
      <div class="tex4h da7vf klqcc icmx0 items-center q3gap">
        <div class="uj5nx gxdrn">
          <img class="y6rh0 wwp4t sm:w-auto sm:h-auto d1bs9 y9dku" src="${escapeHtml(image)}" alt="${escapeHtml(inferItemLabel(item))}">
        </div>

        <div class="uj5nx rogrs">
          <div class="tex4h hfud4 f82od q3gap">
            <div>
              <h4 class="p3x4c m859b f1ztf">Item</h4>
              <p class="yymkp c4t4j">${escapeHtml(matchedProduct?.name || inferItemLabel(item))}</p>
            </div>

            <div>
              <h4 class="p3x4c m859b f1ztf">Color</h4>
              <p class="yymkp c4t4j">${escapeHtml(inferItemColor(item))}</p>
            </div>
          </div>
        </div>

        <div class="uj5nx rogrs">
          <div class="tex4h hfud4 f82od q3gap">
            <div>
              <h4 class="p3x4c m859b f1ztf">Size</h4>
              <p class="yymkp c4t4j">${escapeHtml(inferItemSize(item))}</p>
            </div>

            <div>
              <h4 class="p3x4c m859b f1ztf">Price</h4>
              <p class="yymkp c4t4j">${escapeHtml(formatMoney(getOrderItemUnitPrice(item)))}</p>
            </div>
          </div>
        </div>

        <div class="uj5nx rogrs">
          <div class="tex4h hfud4 f82od q3gap">
            <div>
              <h4 class="p3x4c m859b f1ztf">Quantity</h4>
              <p class="yymkp c4t4j">${escapeHtml(String(quantity))}</p>
            </div>

            <div>
              <h4 class="p3x4c m859b f1ztf">Expected delivery date</h4>
              <p class="yymkp c4t4j">${escapeHtml(formatDateTime(deliveryDate.toISOString()))}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildTimelineMarkup(order, orderLabel) {
  const placedAt = formatDateTimeLabel(order?.created_at);
  const updatedAt = formatDateTimeLabel(order?.updated_at || order?.created_at);
  const paymentLabel = titleCase(
    order?.payment_status ||
      order?.paymentStatus ||
      order?.payment?.status ||
      "pending",
  );
  const fulfillmentLabel = titleCase(order?.status || "pending");

  const events = [
    { title: `${orderLabel} was placed`, time: placedAt },
    { title: `Payment status: ${paymentLabel}`, time: updatedAt },
    { title: `Fulfillment status: ${fulfillmentLabel}`, time: updatedAt },
  ];

  return events
    .map(
      (event) => `
        <div class="flex h7z6o">
          <div class="relative last:after:hidden after:absolute after:top-7 after:bottom-0 after:start-3.5 after:-translate-x-[0.5px] after:border-s after:border-line-2">
            <div class="relative nnhrf mxukx flex lp3ls items-center">
              <div class="n6fqq nj29a brhli"></div>
            </div>
          </div>
          <div class="t6ue9 bdjkg lulbn">
            <h3 class="at2zb yymkp c4t4j">${escapeHtml(event.title)}</h3>
            <p class="liwkv yymkp f1ztf">${escapeHtml(event.time)}</p>
          </div>
        </div>
      `,
    )
    .join("");
}

function setBadge(node, meta) {
  if (!node || !meta) return;
  node.className = meta.className;
  node.textContent = meta.label;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function setHtml(id, value) {
  const node = document.getElementById(id);
  if (node) node.innerHTML = value;
}

function readStorefrontLatestOrder(orderId) {
  try {
    const raw = window.localStorage.getItem(STOREFRONT_LATEST_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;
    return parsed.id === orderId ? parsed : null;
  } catch (error) {
    console.warn("Unable to read latest storefront order bridge.", error);
    return null;
  }
}

function renderNotFound(message) {
  setText("admin-order-details-title", "Order not found");
  setText("admin-order-details-meta", message);
  setText("admin-order-details-position", "No matching order");
  setHtml(
    "admin-order-details-items",
    `<div class="p0vwr fkl1d r4caq mjfwa azhag phna0 a70al"><p class="yymkp c4t4j">${escapeHtml(message)}</p></div>`,
  );
}

async function initOrderDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order");

  if (!orderId) {
    renderNotFound("No order id was provided.");
    return;
  }

  try {
    let order;
    try {
      order = await fetchOrderById(orderId);
    } catch (fetchError) {
      order = readStorefrontLatestOrder(orderId);
      if (!order) throw fetchError;
    }
    const customerKeys = getCustomerLookupKeys(order);
    const [customersResult, profilesResult, itemsResult, allOrdersResult] = await Promise.allSettled([
      customerKeys.length ? fetchCustomersByIds(customerKeys) : Promise.resolve([]),
      order?.user_id ? fetchProfilesByIds([order.user_id]) : Promise.resolve([]),
      fetchOrderItemsByOrderIds([orderId]),
      fetchOrders({ limit: 100 }),
    ]);

    const customers = customersResult.status === "fulfilled" ? customersResult.value : [];
    const profiles = profilesResult.status === "fulfilled" ? profilesResult.value : [];
    const fetchedItems = itemsResult.status === "fulfilled" ? itemsResult.value : [];
    const allOrders = allOrdersResult.status === "fulfilled" ? allOrdersResult.value : [];

    const customer =
      customers.find((entry) => customerKeys.includes(entry.id)) ||
      customers.find((entry) => entry.user_id && customerKeys.includes(entry.user_id)) ||
      profiles[0] ||
      null;

    const items = fetchedItems.length ? fetchedItems : Array.isArray(order.items) ? order.items : [];
    const sanityIds = [...new Set(items.flatMap((item) => getSanityLookupKeys(item)))];
    const sanityProducts = sanityIds.length ? await fetchSanityProductsByIds(sanityIds) : [];
    const productMap = new Map();
    sanityProducts.forEach((product) => {
      [product.id, product.slug, product.sku]
        .filter(Boolean)
        .forEach((key) => productMap.set(String(key), product));
    });
    const shippingAddress = order.shipping_address || order.shippingAddress || {};
    const billingAddress = order.billing_address || order.billingAddress || shippingAddress;
    const paymentMethod = inferPaymentMethod(order);
    const paymentMeta = paymentBadgeMeta(order);
    const fulfillmentMeta = fulfillmentBadgeMeta(order);
    const orderLabel = getOrderDisplayNumber(order, orderId);
    const customerName =
      customer?.name ||
      customer?.full_name ||
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ").trim() ||
      shippingAddress.first_name ||
      order.customerName ||
      "Guest customer";
    const customerEmail =
      customer?.email || shippingAddress.email || order.email || "Not provided";
    const customerPhone =
      customer?.phone || shippingAddress.phone || "Not provided";
    const matchingOrders = allOrders.filter((entry) => {
      if (order.user_id && entry.user_id === order.user_id) return true;
      if (order.customer_id && entry.customer_id === order.customer_id) return true;
      return false;
    });
    const orderPosition = allOrders.findIndex((entry) => entry.id === order.id);
    const deleteButton = document.getElementById("admin-order-details-delete");

    setText("admin-order-details-title", `Order ${orderLabel}`);
    setText("admin-order-details-meta", `Order placed: ${formatDateTimeLabel(order.created_at)}`);
    setBadge(document.getElementById("admin-order-details-payment-badge"), paymentMeta);
    setBadge(document.getElementById("admin-order-details-fulfillment-badge"), fulfillmentMeta);
    setHtml(
      "admin-order-details-items",
      items.length
        ? items.map((item) => buildItemMarkup(item, order, productMap)).join("")
        : `<div class="p0vwr fkl1d r4caq mjfwa azhag phna0 a70al"><p class="yymkp c4t4j">No order items were found for this order.</p></div>`,
    );
    setText("admin-order-details-promo-code", order.promo_code || "No promo code");
    setText("admin-order-details-subtotal", formatMoney(order.subtotal ?? getOrderTotal(order)));
    setText("admin-order-details-shipping", formatMoney(order.shipping_amount ?? 0));
    setText("admin-order-details-tax", formatMoney(order.tax_amount ?? 0));
    setText("admin-order-details-total", formatMoney(getOrderTotal(order)));
    setText(
      "admin-order-details-position",
      orderPosition >= 0
        ? `Order ${orderPosition + 1} of ${allOrders.length}`
        : "Order details",
    );
    setText("admin-order-details-customer-name", customerName);
    setText(
      "admin-order-details-customer-orders-count",
      `${matchingOrders.length || 1} orders`,
    );
    setText("admin-order-details-customer-email", customerEmail);
    setText("admin-order-details-customer-phone", customerPhone);
    setHtml("admin-order-details-shipping-address", formatAddressHtml(shippingAddress));
    setHtml("admin-order-details-billing-address", formatAddressHtml(billingAddress));
    setText("admin-order-details-payment-method", paymentMethod.label);
    setText("admin-order-details-payment-card", paymentMethod.cardLabel);
    setHtml("admin-order-details-timeline", buildTimelineMarkup(order, orderLabel));
    document.title = `${orderLabel} | Order Details`;

    if (deleteButton) {
      deleteButton.onclick = async () => {
        const shouldDelete = window.confirm(`Delete order ${orderLabel}?`);
        if (!shouldDelete) return;

        const originalText = deleteButton.textContent;
        deleteButton.textContent = "Deleting...";
        deleteButton.disabled = true;

        try {
          await deleteOrder(order.id);
          window.location.href = "./orders.html";
        } catch (deleteError) {
          console.error("Failed to delete order", deleteError);
          window.alert("Unable to delete this order right now.");
          deleteButton.textContent = originalText;
          deleteButton.disabled = false;
        }
      };
    }
  } catch (error) {
    console.error("Failed to load order details", error);
    renderNotFound("Unable to load this order right now.");
  }
}

initOrderDetailsPage();
