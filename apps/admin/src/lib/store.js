export const CART_KEY = "appCartItems";
export const FAVORITES_KEY = "appFavorites";
export const CART_UPDATE_EVENT = "cart:update";
export const FAVORITES_UPDATE_EVENT = "favorites:update";

function safeReadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("Unable to read storage key.", key, error);
    return fallback;
  }
}

function safeWriteJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function dispatchStoreEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function getLabelText(element) {
  return (element.textContent || "").trim();
}

export function parsePrice(value) {
  if (typeof value === "number") return value;
  const numeric = String(value || "").replace(/[^0-9.-]+/g, "");
  return numeric ? Number(numeric) : 0;
}

export function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

export function normalizeCartItem(item, index = 0) {
  return {
    id: item.id || "cart-item-" + index + "-" + Date.now(),
    product_id: item.product_id || item.id || "product-" + index,
    title: item.title || "Cart item",
    price: Number(item.price || 0),
    originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
    image: item.image || "",
    color: item.color || "Default",
    size: item.size || "One size",
    quantity: Math.max(1, Number(item.quantity || 1)),
    href: item.href || "./Product Detail.html",
  };
}

export function normalizeFavoriteItem(item, index = 0) {
  return {
    id: item.id || item.product_id || "favorite-item-" + index,
    title: item.title || "Favorite item",
    href: item.href || "./Product Detail.html",
    image: item.image || "",
    price: Number(item.price || 0),
    category: item.category || "",
  };
}

export function getCart() {
  return safeReadJson(CART_KEY, []).map((item, index) => normalizeCartItem(item, index));
}

export function getFavorites() {
  return safeReadJson(FAVORITES_KEY, []).map((item, index) => normalizeFavoriteItem(item, index));
}

export function getCartCount(cart = getCart()) {
  return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function getCartSubtotal(cart = getCart()) {
  return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
}

export function setCart(cart) {
  const normalized = cart.map((item, index) => normalizeCartItem(item, index));
  safeWriteJson(CART_KEY, normalized);
  dispatchStoreEvent(CART_UPDATE_EVENT, { cart: normalized, count: getCartCount(normalized) });
  dispatchStoreEvent("storefront:cart-updated", { cart: normalized, count: getCartCount(normalized) });
  return normalized;
}

export function setFavorites(favorites) {
  const normalized = favorites.map((item, index) => normalizeFavoriteItem(item, index));
  safeWriteJson(FAVORITES_KEY, normalized);
  dispatchStoreEvent(FAVORITES_UPDATE_EVENT, { favorites: normalized, count: normalized.length });
  dispatchStoreEvent("storefront:favorites-updated", { favorites: normalized, count: normalized.length });
  return normalized;
}

export function addToCart(item) {
  const normalizedItem = normalizeCartItem(item, 0);
  const currentCart = getCart();
  const existing = currentCart.find(
    (entry) =>
      entry.product_id === normalizedItem.product_id &&
      entry.color === normalizedItem.color &&
      entry.size === normalizedItem.size,
  );

  const nextCart = existing
    ? currentCart.map((entry) =>
        entry === existing
          ? normalizeCartItem(
              { ...entry, quantity: Number(entry.quantity || 0) + Number(normalizedItem.quantity || 1) },
              0,
            )
          : entry,
      )
    : currentCart.concat([normalizedItem]);

  return setCart(nextCart);
}

export function removeFromCart(id) {
  return setCart(getCart().filter((item) => item.id !== id));
}

export function clearCart() {
  return setCart([]);
}

export function toggleFavorite(item) {
  const normalizedItem = normalizeFavoriteItem(item, 0);
  const currentFavorites = getFavorites();
  const exists = currentFavorites.some((entry) => entry.id === normalizedItem.id);
  const nextFavorites = exists
    ? currentFavorites.filter((entry) => entry.id !== normalizedItem.id)
    : currentFavorites.concat([normalizedItem]);

  return {
    favorites: setFavorites(nextFavorites),
    saved: !exists,
  };
}

export function isFavorite(id) {
  return getFavorites().some((item) => item.id === id);
}

function readDatasetProduct(trigger) {
  if (!trigger || !trigger.dataset) return null;

  const productId = trigger.dataset.productId;
  const title = trigger.dataset.productTitle;
  const href = trigger.dataset.productHref;
  const image = trigger.dataset.productImage;
  const price = trigger.dataset.productPrice;
  const color = trigger.dataset.productColor;
  const size = trigger.dataset.productSize || trigger.dataset.productCategory;
  const quantity = trigger.dataset.productQuantity;

  if (!productId && !title && !href) return null;

  return normalizeCartItem(
    {
      id: productId || href || title,
      product_id: productId || href || title,
      title: title || "Product",
      href: href || "./Product Detail.html",
      image: image || "",
      color: color || "Default",
      size: size || "One size",
      quantity: Number(quantity || 1),
      price: parsePrice(price || 0),
    },
    0,
  );
}

export function extractProductContext(trigger) {
  const container = trigger.closest("[data-product-id]");
  if (!container) return null;
  return readDatasetProduct(container);
}

export function hydrateProductDataAttributes(root = document) {
  const scope = root || document;
  const actionElements = Array.from(scope.querySelectorAll("button, a, [data-favorite-toggle]"));

  actionElements.forEach((element) => {
    const text = getLabelText(element);
    const favoriteLabel = element.querySelector(".rfrdb");
    const favoriteText = favoriteLabel ? getLabelText(favoriteLabel) : "";
    const isAddToCart = text === "Add to cart";
    const isFavoriteTrigger =
      element.matches("[data-favorite-toggle]") ||
      favoriteText === "Add to favorites" ||
      favoriteText === "Saved to favorites" ||
      favoriteText === "Favorite" ||
      favoriteText === "Saved to favorite";

    if (!isAddToCart && !isFavoriteTrigger) return;

    const product = extractProductContext(element);
    if (!product) return;

    element.dataset.productId = product.product_id;
    element.dataset.productTitle = product.title;
    element.dataset.productHref = product.href;
    element.dataset.productImage = product.image || "";
    element.dataset.productPrice = String(product.price || 0);
    element.dataset.productColor = product.color || "Default";
    element.dataset.productSize = product.size || "One size";
    element.dataset.productQuantity = String(product.quantity || 1);

    if (isAddToCart) {
      element.dataset.commerceAction = "add-to-cart";
    }
  });
}

export function updateFavoritesSummaryUI(root = document) {
  const scope = root || document;
  const count = getFavorites().length;

  scope.querySelectorAll("[data-storefront-view-favorites]").forEach((element) => {
    element.textContent = count > 0 ? "View favorites (" + count + ")" : "View favorites";
    if (element.tagName === "A") {
      element.setAttribute("href", "./favorite.html");
    }
  });

  scope.querySelectorAll("a, button, span").forEach((element) => {
    if (element.hasAttribute("data-storefront-view-favorites")) return;
    const text = getLabelText(element);
    if (text === "View favorites" || /^View favorites \\(\\d+\\)$/.test(text)) {
      element.textContent = count > 0 ? "View favorites (" + count + ")" : "View favorites";
      if (element.tagName === "A") {
        element.setAttribute("href", "./favorite.html");
      }
    }
  });

  const favoritesButton = scope.getElementById ? scope.getElementById("hs-pro-dnnd") : document.getElementById("hs-pro-dnnd");
  const badge = favoritesButton ? favoritesButton.querySelector(".preze") : null;
  if (badge) {
    badge.childNodes[0].nodeValue = String(count);
    badge.removeAttribute("data-storefront-hidden");
  }
}

export function renderFavoritesDropdown(root = document) {
  const scope = root || document;
  const container = scope.querySelector('[aria-labelledby="hs-pro-dnnd"] .pf6kx.afsci .space-y-5');
  if (!container) return;

  const favorites = getFavorites();
  if (!favorites.length) {
    container.innerHTML = '<p class="m859b f1ztf">No favorites saved yet.</p>';
    return;
  }

  container.innerHTML = favorites
    .map((item, index) => {
      const price = Number(item.price || 0);
      const priceMarkup = price ? '<span class="j9itz yymkp c4t4j">' + formatPrice(price) + "</span>" : "";

      return [
        '<div class="hs-removing:opacity-0 d5ksw flex haw2c" data-favorite-dropdown-row="' +
          item.id +
          '" id="hs-pro-shfdi-live-' +
          index +
          '">',
        '<div class="relative">',
        '<img alt="' + (item.title || "Favorite item") + '" class="y6rh0 cr96u aruvj fy2yn edpyz" src="' + (item.image || "data:,") + '">',
        "</div>",
        '<div class="t6ue9 flex flex-col">',
        '<h4 class="yymkp c4t4j">' + (item.title || "Favorite item") + "</h4>",
        priceMarkup,
        '<div class=""><button class="inline-flex items-center i220p text-[13px] c4t4j carpj a8v2i bz0ic focus:outline-hidden ti70c" data-favorite-remove="' +
          item.id +
          '" type="button">Remove</button></div>',
        "</div>",
        "</div>",
      ].join("");
    })
    .join("");

  container.querySelectorAll("[data-favorite-remove]").forEach((button) => {
    if (button.dataset.favoriteRemoveBound === "true") return;
    button.dataset.favoriteRemoveBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = button.getAttribute("data-favorite-remove");
      if (!id) return;
      setFavorites(getFavorites().filter((item) => item.id !== id));
    });
  });
}

export function updateCartSummaryUI(root = document) {
  const scope = root || document;
  const items = getCart();
  const itemCount = getCartCount(items);
  const subtotal = getCartSubtotal(items);
  const formattedSubtotal = formatPrice(subtotal);

  scope.querySelectorAll('a[href="./Cart.html"], a[href="./Cart.html#"]').forEach((link) => {
    if (/View cart/.test(link.textContent || "")) {
      link.textContent = "View cart (" + itemCount + ")";
    }
  });

  const cartHeading = scope.getElementById ? scope.getElementById("hs-pro-shco-label") : document.getElementById("hs-pro-shco-label");
  if (cartHeading) {
    cartHeading.textContent = "Cart (" + itemCount + " item" + (itemCount === 1 ? "" : "s") + ")";
  }

  const cartButton = scope.querySelector('[data-hs-overlay="#hs-pro-shco"]');
  const cartBadge = cartButton ? cartButton.querySelector(".preze") : null;
  if (cartBadge) {
    cartBadge.childNodes[0].nodeValue = String(itemCount);
    const srText = cartBadge.querySelector(".rfrdb");
    if (srText) srText.textContent = "Cart items";
    cartBadge.removeAttribute("data-storefront-hidden");
  }

  scope.querySelectorAll(".tex4h.hfud4.osjzw, .p3x4c.tex4h.hfud4.osjzw").forEach((row) => {
    const label = row.firstElementChild;
    if (!label) return;

    const labelText = (label.textContent || "").trim();
    const valueNode =
      row.querySelector("[data-order-summary-value]") ||
      row.querySelector(".qk13w > .ctc9x, .qk13w > span:last-child, .r49qf > .ctc9x, .r49qf > span:last-child");
    if (!valueNode) return;

    if (/Subtotal/i.test(labelText) || /^Total$/i.test(labelText)) {
      valueNode.textContent = formattedSubtotal;
      return;
    }

    if (/Shipping/i.test(labelText) || /Estimated Tax/i.test(labelText) || /^Tax$/i.test(labelText) || /Promo code/i.test(labelText) || /^Promo$/i.test(labelText) || /Sale/i.test(labelText) || /Discount/i.test(labelText)) {
      valueNode.textContent = "0 FCFA";
    }
  });

  scope.querySelectorAll(".d8kj8, .a3olr.d8kj8").forEach((node) => {
    if (/Shipping, taxes and discounts are calculated at checkout\\./.test(node.textContent || "")) {
      node.textContent = "Shipping, taxes and discounts are calculated at checkout.";
    }
  });
}

export function bindAddToCartButtons(root = document, options = {}) {
  const scope = root || document;
  hydrateProductDataAttributes(scope);

  scope.querySelectorAll('button, a, [data-commerce-action="add-to-cart"]').forEach((element) => {
    if (element.dataset.cartBound === "true") return;
    const text = getLabelText(element);
    if (text !== "Add to cart" && element.dataset.commerceAction !== "add-to-cart") return;

    element.dataset.cartBound = "true";
    element.addEventListener("click", (event) => {
      event.preventDefault();
      const item = extractProductContext(element);
      if (!item) return;

      const nextCart = addToCart(item);
      element.dataset.cartAdded = "true";
      const originalText = text || "Add to cart";
      element.textContent = "Added to cart";

      if (typeof options.onAfterAdd === "function") {
        options.onAfterAdd(item, nextCart, element);
      }

      window.setTimeout(() => {
        element.textContent = originalText;
        element.dataset.cartAdded = "false";
      }, 1500);
    });
  });
}

export function bindFavoriteToggles(root = document, options = {}) {
  const scope = root || document;
  hydrateProductDataAttributes(scope);

  scope.querySelectorAll("[data-favorite-toggle], button, a").forEach((element) => {
    if (element.dataset.favoriteBound === "true") return;

    const label = element.querySelector(".rfrdb");
    if (!label) return;

    const text = getLabelText(label);
    if (
      text !== "Add to favorites" &&
      text !== "Saved to favorites" &&
      text !== "Favorite" &&
      text !== "Saved to favorite"
    ) {
      return;
    }

    const product = extractProductContext(element);
    if (!product) return;

    const baseLabel = text === "Favorite" ? "Favorite" : "Add to favorites";
    const renderState = () => {
      const saved = isFavorite(product.product_id);
      label.textContent = saved ? "Saved to favorites" : baseLabel;
      element.setAttribute("aria-pressed", String(saved));
      if (typeof options.onRenderState === "function") {
        options.onRenderState(product, saved, element);
      }
    };

    element.dataset.favoriteBound = "true";
    element.style.cursor = "pointer";
    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const result = toggleFavorite({
        id: product.product_id,
        title: product.title,
        href: product.href,
        image: product.image,
        price: product.price,
        category: product.size && product.color ? product.color + " / " + product.size : "",
      });
      renderState();
      if (typeof options.onAfterToggle === "function") {
        options.onAfterToggle(product, result, element);
      }
    });

    renderState();
  });
}
