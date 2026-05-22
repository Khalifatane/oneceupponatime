import { createDiscount, fetchDiscounts } from "@siggistore/services/admin";
import { subscribeToDiscounts } from "@siggistore/services/admin/realtime.js";
import { createTableUrlState } from "@siggistore/services/admin/table-state.js";

const PAGE_SIZE = 10;
const STOREFRONT_PROMOTION_STORAGE_KEY = "siggistore-storefront-promo-discount";
const tableState = createTableUrlState({
  defaultPage: 1,
  defaultPageSize: PAGE_SIZE,
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDiscountStatusMeta(rawStatus) {
  const status = String(rawStatus ?? "draft").toLowerCase();

  if (status === "active") {
    return {
      label: "Active",
      className:
        "k85d4 o8oua inline-flex items-center i220p m859b at2zb qn8tw k73c1 nj29a dark:bg-green-500/10 dark:text-green-500",
      icon: '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path>',
    };
  }

  if (status === "expired") {
    return {
      label: "Expired",
      className:
        "k85d4 o8oua inline-flex items-center i220p m859b at2zb olwac oz3g9 nj29a dark:bg-red-500/10 dark:text-red-500",
      icon: '<circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path>',
    };
  }

  return {
    label: "Draft",
    className:
      "k85d4 o8oua inline-flex items-center i220p m859b at2zb nck10 h3ns9 nj29a",
    icon: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path>',
  };
}

function formatDiscountValue(discount) {
  const rawValue = discount.value ?? discount.amount ?? 0;
  const value = Number(rawValue);
  const safeValue = Number.isFinite(value) ? value : 0;
  const type = String(discount.type ?? "").toLowerCase();

  if (type.includes("percent")) return `${safeValue}%`;
  if (safeValue === 0 && discount.value == null && discount.amount == null) return "N/A";
  return `$${safeValue}`;
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateStorageValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateDiscountCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

function normalizeDateValue(rawValue) {
  if (!rawValue) return null;
  const date = new Date(`${rawValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function setFeedback(feedbackNode, message, type = "error") {
  if (!feedbackNode) return;

  if (!message) {
    feedbackNode.textContent = "";
    feedbackNode.className = "hidden cti9j m859b edpyz";
    return;
  }

  const toneClass =
    type === "success"
      ? "cti9j m859b edpyz at2zb qn8tw dark:text-green-500"
      : "cti9j m859b edpyz at2zb olwac dark:text-red-500";

  feedbackNode.textContent = message;
  feedbackNode.className = toneClass;
}

function setButtonBusy(button, isBusy, idleText, busyText) {
  if (!button) return;
  button.disabled = isBusy;
  button.textContent = isBusy ? busyText : idleText;
}

function safeWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Unable to write storage key.", key, error);
  }
}

function safeRemoveStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Unable to remove storage key.", key, error);
  }
}

function isDiscountWithinSchedule(discount, now = new Date()) {
  const start = discount?.starts_at ? new Date(discount.starts_at) : null;
  const end = discount?.ends_at ? new Date(discount.ends_at) : null;

  if (start && !Number.isNaN(start.getTime()) && start > now) return false;
  if (end && !Number.isNaN(end.getTime()) && end < now) return false;
  return true;
}

function isGlobalDiscount(discount) {
  const scope = String(discount?.scope ?? discount?.applies_to ?? "").toLowerCase().trim();
  if (!scope) return true;
  return ["global", "all", "all products", "sitewide", "storewide"].includes(scope);
}

function syncStorefrontPromotionSnapshot(discount) {
  if (!discount) {
    safeRemoveStorageItem(STOREFRONT_PROMOTION_STORAGE_KEY);
    return;
  }

  safeWriteJson(STOREFRONT_PROMOTION_STORAGE_KEY, {
    savedAt: new Date().toISOString(),
    discount,
  });
}

function syncLatestPublishedDiscount(discounts) {
  const now = new Date();
  const activeGlobalDiscount = (discounts || []).find(
    (discount) =>
      String(discount?.status ?? "").toLowerCase() === "active" &&
      isGlobalDiscount(discount) &&
      isDiscountWithinSchedule(discount, now),
  );

  syncStorefrontPromotionSnapshot(activeGlobalDiscount || null);
}

function updateDateButtonLabel(button, label) {
  if (!button) return;

  const iconMarkup = button.querySelector("svg")?.outerHTML || "";
  button.innerHTML = `${label} ${iconMarkup}`;
}

function wireDateDropdown(triggerButton) {
  if (!triggerButton) return;

  const defaultLabel = triggerButton.textContent.trim().replace(/\s+/g, " ");
  triggerButton.dataset.defaultLabel = defaultLabel;

  const dropdown = triggerButton.closest(".hs-dropdown");
  if (!dropdown) return;

  const selects = dropdown.querySelectorAll('select[data-hs-select]');
  const monthSelect = selects[0];
  const yearSelect = selects[1];
  const dayButtons = dropdown.querySelectorAll(
    ".hs-dropdown-menu button.c3o5j.oh9ou:not([disabled])",
  );

  dayButtons.forEach((button) => {
    if (button.getAttribute("aria-label") === "Previous") return;
    if (button.getAttribute("aria-label") === "Next") return;

    button.addEventListener("click", () => {
      const monthIndex = Number(monthSelect?.value ?? 0);
      const year = Number(yearSelect?.value ?? new Date().getFullYear());
      const day = Number(button.textContent.trim());
      const nextDate = new Date(year, monthIndex, day);

      if (Number.isNaN(nextDate.getTime())) return;

      triggerButton.dataset.selectedValue = formatDateStorageValue(nextDate);
      updateDateButtonLabel(triggerButton, formatDateLabel(nextDate));
    });
  });
}

function setupDiscountForm(render) {
  const overlay = document.querySelector("#hs-pro-edmad");
  const nameInput = document.querySelector("#hs-pro-eadmnm");
  const codeInput = document.querySelector("#hs-pro-eadmcd");
  const amountInput = document.querySelector("#hs-pro-eadmam");
  const typeSelect = document.querySelector("#hs-pro-eadmty");
  const startButton = document.querySelector("#hs-pro-eadmsd");
  const endButton = document.querySelector("#hs-pro-eadmed");
  const usageLimitInput = document.querySelector("#hs-pro-eadmln");
  const generateButton = document.querySelector("#hs-pro-eadmcd-generate");
  const saveDraftButton = document.querySelector("#hs-pro-edmad-save-draft");
  const publishButton = document.querySelector("#hs-pro-edmad-publish");
  const feedbackNode = document.querySelector("#hs-pro-edmad-feedback");
  const closeButton = overlay?.querySelector('[aria-label="Close"]');

  if (
    !overlay ||
    !nameInput ||
    !codeInput ||
    !amountInput ||
    !typeSelect ||
    !startButton ||
    !endButton ||
    !usageLimitInput ||
    !saveDraftButton ||
    !publishButton
  ) {
    return;
  }

  wireDateDropdown(startButton);
  wireDateDropdown(endButton);

  function resetForm() {
    nameInput.value = "";
    codeInput.value = generateDiscountCode();
    amountInput.value = "10";
    typeSelect.value = "%";
    usageLimitInput.value = "";

    delete startButton.dataset.selectedValue;
    delete endButton.dataset.selectedValue;
    updateDateButtonLabel(startButton, startButton.dataset.defaultLabel || "Select start date");
    updateDateButtonLabel(endButton, endButton.dataset.defaultLabel || "Select end date");

    setFeedback(feedbackNode, "");
    window.HSStaticMethods?.autoInit?.();
  }

  function getDiscountType() {
    return typeSelect.value === "$" ? "fixed" : "percent";
  }

  function readFormPayload(status) {
    const name = nameInput.value.trim();
    const code = codeInput.value.trim().toUpperCase();
    const amount = Number.parseFloat(amountInput.value.trim());
    const usageLimit = usageLimitInput.value.trim();
    const startsAt = normalizeDateValue(startButton.dataset.selectedValue);
    const endsAt = normalizeDateValue(endButton.dataset.selectedValue);

    if (!name) throw new Error("Discount name is required.");
    if (!code) throw new Error("Discount code is required.");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Discount amount must be greater than 0.");
    }
    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      throw new Error("End date must be on or after the start date.");
    }
    if (usageLimit) {
      const parsedLimit = Number.parseInt(usageLimit, 10);
      if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
        throw new Error("Usage limit must be a positive whole number.");
      }
    }

    return {
      name,
      code,
      status,
      type: getDiscountType(),
      value: amount,
      scope: "global",
      starts_at: startsAt,
      ends_at: endsAt,
      usage_limit: usageLimit ? Number.parseInt(usageLimit, 10) : null,
    };
  }

  async function submitDiscount(status) {
    try {
      setFeedback(feedbackNode, "");
      saveDraftButton.disabled = true;
      publishButton.disabled = true;
      setButtonBusy(saveDraftButton, status === "draft", "Save as draft", "Saving...");
      setButtonBusy(publishButton, status === "active", "Publish discount", "Publishing...");

      const payload = readFormPayload(status);
      const createdDiscount = await createDiscount(payload);

      if (status === "active") {
        syncStorefrontPromotionSnapshot(createdDiscount || payload);
      }

      setFeedback(
        feedbackNode,
        status === "active"
          ? "Discount published successfully."
          : "Discount saved as draft.",
        "success",
      );

      await render();
      resetForm();
      closeButton?.click();
    } catch (error) {
      console.error("Failed to create discount", error);
      setFeedback(
        feedbackNode,
        error?.message || "Unable to create the discount right now.",
      );
    } finally {
      saveDraftButton.disabled = false;
      publishButton.disabled = false;
      setButtonBusy(saveDraftButton, false, "Save as draft", "Saving...");
      setButtonBusy(publishButton, false, "Publish discount", "Publishing...");
    }
  }

  generateButton?.addEventListener("click", () => {
    codeInput.value = generateDiscountCode();
  });

  codeInput.addEventListener("blur", () => {
    codeInput.value = codeInput.value.trim().toUpperCase();
  });

  saveDraftButton.addEventListener("click", () => {
    submitDiscount("draft");
  });

  publishButton.addEventListener("click", () => {
    submitDiscount("active");
  });

  resetForm();
}

function buildEmptyRow(message, colspan = 8) {
  return `
    <tr>
      <td colspan="${colspan}" class="cti9j edpyz yymkp f1ztf c4t4j">
        ${escapeHtml(message)}
      </td>
    </tr>
  `;
}

function buildDiscountRow(discount) {
  const status = getDiscountStatusMeta(discount.status);
  const codeId = `discount-code-${String(discount.id ?? discount.code ?? Math.random()).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const scope = discount.scope || discount.applies_to || "All products";
  const usageCount = discount.usage_count ?? discount.uses ?? 0;

  return `
    <tr>
      <td class="gmilb offh6 aimp4 xxt8a">
        <input type="checkbox" class="y6rh0 x215h robkw fsj2t ftf66 cirj5 s7mjk jw8en qgcqn checked:bg-primary-checked checked:border-primary-checked disabled:opacity-50 disabled:pointer-events-none">
      </td>
      <td class="gmilb offh6 cti9j dg39k">
        <span class="yymkp at2zb c4t4j">${escapeHtml(discount.name || discount.title || "Untitled discount")}</span>
      </td>
      <td class="gmilb offh6 cti9j dg39k">
        <span class="js-clipboard [--is-toggle-tooltip:false] hs-tooltip ltybu nck10 h3ns9 m859b y9dku cursor-pointer" data-clipboard-target="#${codeId}" data-clipboard-action="copy" data-clipboard-success-text="Copied">
          <span id="${codeId}" class="knnc2">${escapeHtml(discount.code || "no-code")}</span>
          <span class="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 xsbp2 hidden l2ewm nnhrf dg39k o8oua n7c39 mak94 sgbfs m859b at2zb hq333 edpyz cirj5" role="tooltip">
            <span class="js-clipboard-success-text">Copy</span>
          </span>
        </span>
      </td>
      <td class="gmilb offh6 cti9j dg39k">
        <span class="${status.className}">
          <svg class="y6rh0 xqxx6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${status.icon}
          </svg>
          ${escapeHtml(status.label)}
        </span>
      </td>
      <td class="gmilb offh6 cti9j dg39k">
        <span class="yymkp mnod2">${escapeHtml(scope)}</span>
      </td>
      <td class="gmilb offh6 cti9j dg39k">
        <span class="yymkp mnod2">${escapeHtml(formatDiscountValue(discount))}</span>
      </td>
      <td class="gmilb offh6 cti9j dg39k qk13w">
        <span class="yymkp mnod2">${escapeHtml(String(usageCount))}</span>
      </td>
      <td class="stpxn witespace-nowrap cti9j dg39k qk13w">
        <div class="hs-dropdown [--auto-close:inside] [--placement:bottom-right] relative inline-flex">
          <button type="button" class="mxukx inline-flex lp3ls items-center my9gz edpyz s6i1l mak94 x3ljb k0ser cirj5 dduyg disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden usqtq" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
            <svg class="y6rh0 xqxx6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <div class="hs-dropdown-menu hs-dropdown-open:opacity-100 mvv53 transition-[opacity,margin] duration opacity-0 hidden nnhrf khfq6 mak94 ocfsa ictpa p6d5j" role="menu" aria-orientation="vertical" tabindex="-1">
            <div class="i0yn8">
              <button type="button" class="w-full flex items-center h7z6o k85d4 o8oua edpyz text-[13px] j6b7h ibg9k disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden mhymu">
                Edit
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

async function initDiscountsPage() {
  const tableBody = document.querySelector("tbody.divide-y.divide-table-line");
  const searchInput = document.querySelector('input[placeholder="Search discounts"]');
  const pagination = document.querySelector('nav[aria-label="Pagination"]');
  const footer = pagination?.closest("div.flex.flex-wrap.g86xu.items-center.osjzw");
  const count = footer?.querySelector("p .at2zb");
  const previousButton = pagination?.querySelector('button[aria-label="Previous"]');
  const nextButton = pagination?.querySelector('button[aria-label="Next"]');
  const pageIndicators = pagination?.querySelectorAll("span");

  if (!tableBody || !searchInput || !count || !pagination || !previousButton || !nextButton || !pageIndicators?.length) {
    return;
  }

  let isRendering = false;
  let queuedRender = false;

  async function render() {
    if (isRendering) {
      queuedRender = true;
      return;
    }

    isRendering = true;

    try {
      const state = tableState.getState();
      const query = state.query || state.filter || "";
      const pageSize = Number(state.pageSize || PAGE_SIZE);
      const page = Number(state.page || 1);
      searchInput.value = query;

      const discounts = await fetchDiscounts({
        limit: 100,
        query,
      });

      if (!query) {
        syncLatestPublishedDiscount(discounts);
      }

      const totalResults = discounts.length;
      const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
      const safePage = Math.min(Math.max(page, 1), totalPages);

      if (safePage !== page) {
        tableState.setPage(safePage);
        return;
      }

      const start = (safePage - 1) * pageSize;
      const pageDiscounts = discounts.slice(start, start + pageSize);

      count.textContent = String(totalResults);
      pageIndicators[0].textContent = String(safePage);
      pageIndicators[2].textContent = String(totalPages);
      previousButton.disabled = safePage <= 1;
      nextButton.disabled = safePage >= totalPages;

      if (!pageDiscounts.length) {
        tableBody.innerHTML = buildEmptyRow(
          query
            ? "No discounts match your current search."
            : "No discounts found yet.",
        );
      } else {
        tableBody.innerHTML = pageDiscounts.map(buildDiscountRow).join("");
      }

      window.HSStaticMethods?.autoInit?.();
    } catch (error) {
      console.error("Failed to render discounts page", error);
      tableBody.innerHTML = buildEmptyRow(
        error?.message || "Unable to load discounts right now.",
      );
      count.textContent = "0";
    } finally {
      isRendering = false;
      if (queuedRender) {
        queuedRender = false;
        render();
      }
    }
  }

  searchInput.addEventListener("input", (event) => {
    tableState.setQuery(event.currentTarget.value.trim());
    tableState.setPage(1);
    render();
  });

  previousButton.addEventListener("click", () => {
    const state = tableState.getState();
    if ((state.page || 1) <= 1) return;
    tableState.setPage((state.page || 1) - 1);
    render();
  });

  nextButton.addEventListener("click", () => {
    const state = tableState.getState();
    tableState.setPage((state.page || 1) + 1);
    render();
  });

  const unsubscribe = subscribeToDiscounts(() => {
    render();
  });

  window.addEventListener("beforeunload", () => {
    unsubscribe?.();
  });

  setupDiscountForm(render);
  await render();
}

initDiscountsPage();
