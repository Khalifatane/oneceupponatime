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
  updateOrderStatus,
} from "@siggistore/services/admin";

const STOREFRONT_LATEST_ORDER_KEY = "appLatestOrder";
const STOREFRONT_ORDERS_KEY = "appOrders";
const STOREFRONT_LOOKUP_ORDER_KEY = "appLookupOrder";
const TRACKER_STATUSES = ["pending", "shipped", "delivered"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  return new Intl.NumberFormat("fr-SN", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateTime(value) {
  if (!value) return "Inconnu";
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
  if (!value) return "Inconnu";
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

function translateStatusLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const labels = {
    paid: "Paye",
    processing: "En traitement",
    shipped: "Expedie",
    delivered: "Livre",
    completed: "Termine",
    failed: "Echoue",
    canceled: "Annule",
    cancelled: "Annule",
    refunded: "Rembourse",
    pending: "En attente",
  };
  return labels[normalized] || titleCase(value);
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
    "pending";
  const label = translateStatusLabel(raw);
  const normalized = String(raw).toLowerCase();

  if (["paid", "processing", "shipped", "delivered", "completed"].includes(normalized)) {
    return {
      label: normalized === "processing" ? "Paye" : label,
      className:
        "dg39k o8oua inline-flex items-center i220p m859b at2zb qn8tw k73c1 nj29a dark:bg-green-500/10 dark:text-green-500",
    };
  }

  if (["failed", "canceled", "cancelled", "refunded"].includes(normalized)) {
    return {
      label: normalized === "canceled" ? "Annule" : label,
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
      label: normalized === "shipped" ? "Expedie" : "Traite",
      className:
        "dg39k o8oua inline-flex items-center i220p m859b at2zb qn8tw k73c1 nj29a dark:bg-green-500/10 dark:text-green-500",
    };
  }

  if (["failed", "canceled", "cancelled", "refunded"].includes(normalized)) {
    return {
      label: translateStatusLabel(normalized),
      className:
        "dg39k o8oua inline-flex items-center i220p m859b at2zb olwac oz3g9 nj29a dark:bg-red-500/10 dark:text-red-500",
    };
  }

  if (normalized === "processing") {
    return {
      label: "En traitement",
      className:
        "dg39k o8oua inline-flex items-center i220p m859b at2zb nck10 h3ns9 nj29a",
    };
  }

  return {
    label: "Non traite",
    className:
      "dg39k o8oua inline-flex items-center i220p m859b at2zb axv3m ssl0y nj29a dark:bg-yellow-500/10 dark:text-yellow-500",
  };
}

function getCustomerLookupKeys(order) {
  return [order?.customer_id, order?.user_id].filter(Boolean);
}

function formatAddressHtml(address) {
  if (!address) return "Non renseigne";

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

  return lines.length ? lines.map(escapeHtml).join("<br>") : "Non renseigne";
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
      cardLabel: last4 ? `Numero de carte: ************ ${last4}` : type,
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
    cardLabel: "Numero de carte: non renseigne",
  };
}

function getOrderDisplayNumber(order, fallbackId = "") {
  const raw =
    order?.displayOrderNumber ||
    order?.number ||
    order?.order_number ||
    order?.id ||
    fallbackId;

  if (!raw) return "#INCONNU";
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
    "Article commande"
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
              <h4 class="p3x4c m859b f1ztf">Article</h4>
              <p class="yymkp c4t4j">${escapeHtml(matchedProduct?.name || inferItemLabel(item))}</p>
            </div>

            <div>
              <h4 class="p3x4c m859b f1ztf">Couleur</h4>
              <p class="yymkp c4t4j">${escapeHtml(inferItemColor(item))}</p>
            </div>
          </div>
        </div>

        <div class="uj5nx rogrs">
          <div class="tex4h hfud4 f82od q3gap">
            <div>
              <h4 class="p3x4c m859b f1ztf">Taille</h4>
              <p class="yymkp c4t4j">${escapeHtml(inferItemSize(item))}</p>
            </div>

            <div>
              <h4 class="p3x4c m859b f1ztf">Prix</h4>
              <p class="yymkp c4t4j">${escapeHtml(formatMoney(getOrderItemUnitPrice(item)))}</p>
            </div>
          </div>
        </div>

        <div class="uj5nx rogrs">
          <div class="tex4h hfud4 f82od q3gap">
            <div>
              <h4 class="p3x4c m859b f1ztf">Quantite</h4>
              <p class="yymkp c4t4j">${escapeHtml(String(quantity))}</p>
            </div>

            <div>
              <h4 class="p3x4c m859b f1ztf">Date de livraison prevue</h4>
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
  const paymentLabel = translateStatusLabel(
    order?.payment_status ||
      order?.paymentStatus ||
      order?.payment?.status ||
      "pending",
  );
  const fulfillmentLabel = translateStatusLabel(order?.status || "pending");

  const events = [
    { title: `${orderLabel} a ete passee`, time: placedAt },
    { title: `Statut du paiement: ${paymentLabel}`, time: updatedAt },
    { title: `Statut de traitement: ${fulfillmentLabel}`, time: updatedAt },
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

function normalizeTrackerStatus(status) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "delivered" || normalized === "completed") return "delivered";
  if (normalized === "shipped") return "shipped";
  return "pending";
}

function isSupabaseOrderId(orderId) {
  return UUID_PATTERN.test(String(orderId ?? "").trim());
}

function setStatusFeedback(message, tone = "muted") {
  const node = document.getElementById("admin-order-details-status-feedback");
  if (!node) return;

  node.textContent = message;
  node.className = "m859b f1ztf";

  if (tone === "success") {
    node.classList.add("k73c1");
    return;
  }

  if (tone === "error") {
    node.classList.add("oz3g9");
    return;
  }

  node.classList.add("c4t4j");
}

function syncStorefrontLatestOrder(order) {
  try {
    const raw = window.localStorage.getItem(STOREFRONT_LATEST_ORDER_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.id !== order.id) return;

    window.localStorage.setItem(
      STOREFRONT_LATEST_ORDER_KEY,
      JSON.stringify({
        ...parsed,
        ...order,
      }),
    );
  } catch (error) {
    console.warn("Unable to sync latest storefront order bridge.", error);
  }
}

function readSharedOrders() {
  try {
    const raw = window.localStorage.getItem(STOREFRONT_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Unable to read shared order history.", error);
    return [];
  }
}

function sortOrdersByNewest(orders) {
  return [...orders].sort((left, right) => {
    const leftTime = new Date(left?.created_at || 0).getTime() || 0;
    const rightTime = new Date(right?.created_at || 0).getTime() || 0;
    return rightTime - leftTime;
  });
}

function syncSharedOrderHistory(order) {
  try {
    const orders = readSharedOrders();
    const nextOrders = sortOrdersByNewest([
      order,
      ...orders.filter((entry) => entry?.id !== order.id),
    ]);
    window.localStorage.setItem(STOREFRONT_ORDERS_KEY, JSON.stringify(nextOrders));

    const lookupRaw = window.localStorage.getItem(STOREFRONT_LOOKUP_ORDER_KEY);
    if (lookupRaw) {
      const lookupOrder = JSON.parse(lookupRaw);
      if (lookupOrder?.id === order.id) {
        window.localStorage.setItem(
          STOREFRONT_LOOKUP_ORDER_KEY,
          JSON.stringify({
            ...lookupOrder,
            ...order,
          }),
        );
      }
    }
  } catch (error) {
    console.warn("Unable to sync shared order history.", error);
  }
}

function bindStatusControls(order) {
  const select = document.getElementById("admin-order-details-status-select");
  const saveButton = document.getElementById("admin-order-details-status-save");

  if (!select || !saveButton) return;

  const syncSelect = () => {
    select.value = normalizeTrackerStatus(order.status);
  };

  syncSelect();
  if (!isSupabaseOrderId(order?.id)) {
    select.disabled = false;
    saveButton.disabled = false;
    setStatusFeedback("Cette commande sera enregistree dans l'historique partage pour la boutique.");
  } else {
    select.disabled = false;
    saveButton.disabled = false;
    setStatusFeedback("Synchronisez l'avancement de la commande avec le suivi boutique via Supabase.");
  }
  saveButton.onclick = async () => {
    const nextStatus = normalizeTrackerStatus(select.value);
    const currentStatus = normalizeTrackerStatus(order.status);

    if (!TRACKER_STATUSES.includes(nextStatus)) {
      setStatusFeedback("Choisissez un statut valide avant d'enregistrer.", "error");
      syncSelect();
      return;
    }

    if (nextStatus === currentStatus) {
      setStatusFeedback("Cette commande utilise deja ce statut boutique.", "muted");
      return;
    }

    const originalLabel = saveButton.textContent;
    saveButton.disabled = true;
    select.disabled = true;
    saveButton.textContent = "Enregistrement...";
    setStatusFeedback("Enregistrement de l'avancement dans Supabase...");

    try {
      let updatedOrder;
      if (isSupabaseOrderId(order.id)) {
        updatedOrder = await updateOrderStatus(order.id, nextStatus);
      } else {
        updatedOrder = {
          ...order,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        };
      }
      Object.assign(order, updatedOrder);
      syncSelect();
      syncStorefrontLatestOrder(order);
      syncSharedOrderHistory(order);
      setStatusFeedback(
        isSupabaseOrderId(order.id)
          ? "Avancement enregistre. Le suivi boutique le lira depuis l'historique partage et Supabase."
          : "Avancement enregistre dans l'historique partage pour la boutique.",
        "success",
      );
    } catch (error) {
      console.error("Failed to update order status", error);
      syncSelect();
      setStatusFeedback(
        error?.message || "Impossible d'enregistrer l'avancement pour le moment.",
        "error",
      );
    } finally {
      saveButton.disabled = false;
      select.disabled = false;
      saveButton.textContent = originalLabel;
    }
  };
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
  setText("admin-order-details-title", "Commande introuvable");
  setText("admin-order-details-meta", message);
  setText("admin-order-details-position", "Aucune commande correspondante");
  setHtml(
    "admin-order-details-items",
    `<div class="p0vwr fkl1d r4caq mjfwa azhag phna0 a70al"><p class="yymkp c4t4j">${escapeHtml(message)}</p></div>`,
  );
}

async function initOrderDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order");

  if (!orderId) {
    renderNotFound("Aucun identifiant de commande n'a ete fourni.");
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
    const orderLabel = getOrderDisplayNumber(order, orderId);
    const customerName =
      customer?.name ||
      customer?.full_name ||
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ").trim() ||
      shippingAddress.first_name ||
      order.customerName ||
      "Client invite";
    const customerEmail =
      customer?.email || shippingAddress.email || order.email || "Non renseigne";
    const customerPhone =
      customer?.phone || shippingAddress.phone || "Non renseigne";
    const matchingOrders = allOrders.filter((entry) => {
      if (order.user_id && entry.user_id === order.user_id) return true;
      if (order.customer_id && entry.customer_id === order.customer_id) return true;
      return false;
    });
    const orderPosition = allOrders.findIndex((entry) => entry.id === order.id);
    const deleteButton = document.getElementById("admin-order-details-delete");

    setText("admin-order-details-title", `Commande ${orderLabel}`);
    setText("admin-order-details-meta", `Commande passee: ${formatDateTimeLabel(order.created_at)}`);
    bindStatusControls(order);
    setHtml(
      "admin-order-details-items",
      items.length
        ? items.map((item) => buildItemMarkup(item, order, productMap)).join("")
        : `<div class="p0vwr fkl1d r4caq mjfwa azhag phna0 a70al"><p class="yymkp c4t4j">Aucun article trouve pour cette commande.</p></div>`,
    );
    setText("admin-order-details-promo-code", order.promo_code || "Aucun code promo");
    setText("admin-order-details-subtotal", formatMoney(order.subtotal ?? getOrderTotal(order)));
    setText("admin-order-details-shipping", formatMoney(order.shipping_amount ?? 0));
    setText("admin-order-details-tax", formatMoney(order.tax_amount ?? 0));
    setText("admin-order-details-total", formatMoney(getOrderTotal(order)));
    setText(
      "admin-order-details-position",
      orderPosition >= 0
        ? `Commande ${orderPosition + 1} sur ${allOrders.length}`
        : "Details de la commande",
    );
    setText("admin-order-details-customer-name", customerName);
    setText(
      "admin-order-details-customer-orders-count",
      `${matchingOrders.length || 1} commande(s)`,
    );
    setText("admin-order-details-customer-email", customerEmail);
    setText("admin-order-details-customer-phone", customerPhone);
    setHtml("admin-order-details-shipping-address", formatAddressHtml(shippingAddress));
    setHtml("admin-order-details-timeline", buildTimelineMarkup(order, orderLabel));
    document.title = `${orderLabel} | Order Details`;

    if (deleteButton) {
      deleteButton.onclick = async () => {
        const shouldDelete = window.confirm(`Supprimer la commande ${orderLabel} ?`);
        if (!shouldDelete) return;

        const originalText = deleteButton.textContent;
        deleteButton.textContent = "Suppression...";
        deleteButton.disabled = true;

        try {
          await deleteOrder(order.id);
          window.location.href = "./orders.html";
        } catch (deleteError) {
          console.error("Failed to delete order", deleteError);
          window.alert("Impossible de supprimer cette commande pour le moment.");
          deleteButton.textContent = originalText;
          deleteButton.disabled = false;
        }
      };
    }
  } catch (error) {
    console.error("Failed to load order details", error);
    renderNotFound("Impossible de charger cette commande pour le moment.");
  }
}

initOrderDetailsPage();
