import {
  fetchProductRuntimeByIds,
  mergeProductWithRuntime,
  PRODUCT_RUNTIME_TABLE,
  updateProductRuntimeDisplay,
} from "@siggistore/services/admin";
import { fetchSanityProducts } from "@siggistore/services/admin/sanity-service.js";

function buildRuntimeLookupKey(product) {
  return [product.id, product.slug, product.sku]
    .filter(Boolean)
    .map(String);
}

function findProductIndex(products, lookupValue) {
  if (!lookupValue) return -1;

  return products.findIndex((product) => {
    return (
      String(product.slug) === lookupValue ||
      String(product.id) === lookupValue ||
      String(product.sku) === lookupValue
    );
  });
}

function updateSelectValue(select, value) {
  if (!select || !value) return;

  const normalizedValue = String(value);
  const options = Array.from(select.options);
  const existing = options.find((option) => option.value === normalizedValue || option.text === normalizedValue);

  if (!existing) {
    const option = document.createElement("option");
    option.value = normalizedValue;
    option.text = normalizedValue;
    select.appendChild(option);
    select.value = normalizedValue;
  } else {
    select.value = existing.value || normalizedValue;
  }
}

function getProductRuntimeErrorMessage(error, fallback) {
  const message = String(error?.message || "");
  if (/products_runtime|schema cache|relation .* does not exist/i.test(message)) {
    return "La table products_runtime est manquante. Executez scripts/create-products-runtime-table.sql dans Supabase, puis reessayez.";
  }
  return message ? `${fallback}: ${message}` : `${fallback}.`;
}

function getStoredDisplayEdit(product) {
  if (!product) return null;

  return {
    category: product.displayCategory || product.category,
    isAvailable: product.isAvailable,
    tags: Array.isArray(product.channels) ? product.channels : [],
    variants: Array.isArray(product.displayVariants) ? product.displayVariants : [],
    stock: product.stock,
  };
}

function getVariantStock(variants) {
  return (Array.isArray(variants) ? variants : []).reduce((sum, variant) => {
    return sum + Math.max(0, Number(variant.quantity || 0) || 0);
  }, 0);
}

function syncAvailabilityFromVariants() {
  const availabilityInput = document.getElementById("hs-pro-epdas");
  if (!availabilityInput) return;

  availabilityInput.checked = getVariantStock(collectProductVariants()) > 0;
}

function collectProductVariants() {
  const wrapper = document.getElementById("hs-wrapper-for-copy");
  if (!wrapper) return [];

  return Array.from(wrapper.children)
    .filter((row) => !row.classList.contains("hidden") && !row.classList.contains("[--ignore-for-count]"))
    .map((row) => {
      const sizeInput = row.querySelector('input[id^="hs-pro-epdvts"]');
      const colorInput = row.querySelector('input[id^="hs-pro-epdvtc"]');
      const quantityInput = row.querySelector('input[id^="hs-pro-epdvtq"]');
      const size = sizeInput?.value?.trim() || "";
      const color = colorInput?.value?.trim() || "";
      const quantity = Math.max(0, Number(quantityInput?.value || 0) || 0);

      return {
        size,
        color,
        quantity,
      };
    })
    .filter((variant) => variant.size && variant.color);
}

function applyStoredDisplayEdit(product, edit) {
  if (!edit) return;

  const availabilityInput = document.getElementById("hs-pro-epdas");
  const categorySelect = document.getElementById("product-details-category");
  const tagsInput = document.getElementById("hs-pro-dauftg");

  if (availabilityInput && typeof edit.isAvailable === "boolean") {
    availabilityInput.checked = edit.isAvailable;
  }

  updateSelectValue(categorySelect, edit.category || product.category || "Sans categorie");

  if (tagsInput && Array.isArray(edit.tags)) {
    tagsInput.value = edit.tags.join(", ");
  }

  if (Array.isArray(edit.variants) && edit.variants.length) {
    const wrapper = document.getElementById("hs-wrapper-for-copy");
    const template = document.getElementById("hs-content-for-copy");
    if (wrapper) {
      let rows = Array.from(wrapper.children).filter(
        (row) => !row.classList.contains("hidden") && !row.classList.contains("[--ignore-for-count]"),
      );

      while (rows.length < edit.variants.length) {
        const source = rows[0] || template;
        if (!source) break;
        const clone = source.cloneNode(true);
        clone.classList.remove("hidden", "[--ignore-for-count]");
        wrapper.appendChild(clone);
        rows = Array.from(wrapper.children).filter(
          (row) => !row.classList.contains("hidden") && !row.classList.contains("[--ignore-for-count]"),
        );
      }

      rows.forEach((row, index) => {
        const variant = edit.variants[index];
        if (!variant) {
          row.classList.add("hidden");
          return;
        }

        row.classList.remove("hidden");
        const sizeInput = row.querySelector('input[id^="hs-pro-epdvts"]');
        const colorInput = row.querySelector('input[id^="hs-pro-epdvtc"]');
        const quantityInput = row.querySelector('input[id^="hs-pro-epdvtq"]');
        if (sizeInput) sizeInput.value = variant.size || "Taille unique";
        if (colorInput) colorInput.value = variant.color || "Par defaut";
        if (quantityInput) quantityInput.value = String(Math.max(0, Number(variant.quantity || 0) || 0));
      });
    }
  }

  syncAvailabilityFromVariants();
}

function bindDisplayEditSave(product) {
  const saveLink = Array.from(document.querySelectorAll("a")).find(
    (link) => ["save changes", "enregistrer les modifications"].includes(link.textContent.trim().toLowerCase()),
  );
  if (!saveLink || saveLink.dataset.productDisplaySaveBound === "true") return;

  saveLink.dataset.productDisplaySaveBound = "true";
  saveLink.addEventListener("click", async (event) => {
    event.preventDefault();

    const availabilityInput = document.getElementById("hs-pro-epdas");
    const categorySelect = document.getElementById("product-details-category");
    const tagsInput = document.getElementById("hs-pro-dauftg");
    const variants = collectProductVariants();
    const stock = getVariantStock(variants);
    const isAvailable = stock > 0;
    const tags = String(tagsInput?.value || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (availabilityInput) {
      availabilityInput.checked = isAvailable;
    }

    const display = {
      category: categorySelect?.value || product.category || "Sans categorie",
      isAvailable,
      tags,
      variants,
      stock,
    };

    const originalText = saveLink.textContent;
    saveLink.textContent = "Enregistrement...";
    saveLink.style.pointerEvents = "none";

    try {
      const runtime = await updateProductRuntimeDisplay(product, display, {
        table: PRODUCT_RUNTIME_TABLE,
      });
      Object.assign(product, mergeProductWithRuntime(product, runtime));
      saveLink.textContent = "Enregistre";
    } catch (error) {
      console.error("Failed to save product display controls", error);
      saveLink.textContent = "Configuration requise";
      saveLink.title = getProductRuntimeErrorMessage(error, "Echec de l'enregistrement");
    } finally {
      window.setTimeout(() => {
        saveLink.textContent = originalText || "Enregistrer les modifications";
        saveLink.removeAttribute("title");
        saveLink.style.pointerEvents = "";
      }, 1200);
    }
  });
}

function bindVariantAvailabilitySync() {
  const wrapper = document.getElementById("hs-wrapper-for-copy");
  if (!wrapper || wrapper.dataset.variantAvailabilitySyncBound === "true") return;

  wrapper.dataset.variantAvailabilitySyncBound = "true";
  wrapper.addEventListener("input", syncAvailabilityFromVariants);
  wrapper.addEventListener("click", () => {
    window.setTimeout(syncAvailabilityFromVariants, 0);
  });
}

function wireNavigation(button, product) {
  if (!button) return;

  if (!product) {
    button.disabled = true;
    return;
  }

  button.disabled = false;
  button.addEventListener("click", () => {
    const target = `./product-details.html?product=${encodeURIComponent(product.slug || product.id)}`;
    window.location.href = target;
  });
}

async function initProductDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const productKey = params.get("product");

  const titleNode = document.getElementById("product-details-title");
  const breadcrumbLink = document.getElementById("product-details-breadcrumb-link");
  const prevButton = document.getElementById("product-details-prev");
  const nextButton = document.getElementById("product-details-next");
  const availabilityInput = document.getElementById("hs-pro-epdas");
  const categorySelect = document.getElementById("product-details-category");
  const tagsInput = document.getElementById("hs-pro-dauftg");

  if (!titleNode || !breadcrumbLink || !prevButton || !nextButton) return;

  try {
    const products = await fetchSanityProducts({ limit: 100 });
    const runtimeIds = [...new Set(products.flatMap((product) => buildRuntimeLookupKey(product)))];

    let runtimeRows = [];
    try {
      runtimeRows = await fetchProductRuntimeByIds(runtimeIds, {
        table: PRODUCT_RUNTIME_TABLE,
      });
    } catch (runtimeError) {
      console.warn("Supabase runtime unavailable for product details page", runtimeError);
    }

    const runtimeMap = new Map();
    runtimeRows.forEach((runtime) => {
      [runtime.sanity_product_id, runtime.product_id, runtime.slug, runtime.sku]
        .filter(Boolean)
        .forEach((key) => {
          runtimeMap.set(String(key), runtime);
        });
    });

    const mergedProducts = products.map((product) => {
      const runtime = buildRuntimeLookupKey(product)
        .map((key) => runtimeMap.get(String(key)))
        .find(Boolean);
      return mergeProductWithRuntime(product, runtime);
    });

    const matchedIndex = findProductIndex(mergedProducts, productKey);
    const currentIndex = matchedIndex >= 0 ? matchedIndex : 0;
    const currentProduct = mergedProducts[currentIndex];

    if (!currentProduct) return;

    const storedDisplayEdit = getStoredDisplayEdit(currentProduct);

    titleNode.textContent = currentProduct.name;
    breadcrumbLink.textContent = currentProduct.name;
    breadcrumbLink.href = `./product-details.html?product=${encodeURIComponent(
      currentProduct.slug || currentProduct.id,
    )}`;
    document.title = `${currentProduct.name} | Product Details`;

    if (availabilityInput) {
      availabilityInput.checked =
        typeof storedDisplayEdit?.isAvailable === "boolean"
          ? storedDisplayEdit.isAvailable
          : Boolean(currentProduct.isAvailable);
    }

    updateSelectValue(categorySelect, storedDisplayEdit?.category || currentProduct.category || "Sans categorie");

    if (tagsInput) {
      const channels = Array.isArray(storedDisplayEdit?.tags)
        ? storedDisplayEdit.tags
        : Array.isArray(currentProduct.channels)
          ? currentProduct.channels
          : [];
      tagsInput.value = channels.join(", ");
    }

    const colorInputs = Array.from(document.querySelectorAll('input[id^="hs-pro-epdvtc"]'));
    colorInputs.forEach((input) => {
      if (!input.value) input.value = currentProduct.category || "Par defaut";
    });

    applyStoredDisplayEdit(currentProduct, storedDisplayEdit);
    syncAvailabilityFromVariants();
    bindVariantAvailabilitySync();
    bindDisplayEditSave(currentProduct);

    wireNavigation(prevButton, mergedProducts[currentIndex - 1] || null);
    wireNavigation(nextButton, mergedProducts[currentIndex + 1] || null);

    window.HSStaticMethods?.autoInit?.();
  } catch (error) {
    console.error("Failed to load product details", error);
  }
}

initProductDetailsPage();
