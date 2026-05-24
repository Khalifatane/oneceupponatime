import {
  createProductReviewReply,
  deleteProductReview,
  fetchProductReviews,
  updateProductReviewStatus,
} from "@siggistore/services/admin";
import { sanityService } from "@siggistore/services/admin/sanity-service-client.ts";

const DEFAULT_AVATAR =
  "public/images.unsplash.com/photo-1541101767792-f9b2b1c4f127--q2118f8306b.bin";
const productCache = new Map();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatReviewDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildStars(rating) {
  const total = 5;
  const filled = Math.max(0, Math.min(total, Number(rating || 0)));

  return Array.from({ length: total }, function (_, index) {
    return `
      <svg class="y6rh0 qpvtc c4t4j" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        ${
          index < filled
            ? '<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"></path>'
            : '<path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.56.56 0 0 0-.163-.505L1.71 6.745l4.052-.576a.53.53 0 0 0 .393-.288L8 2.223l1.847 3.658a.53.53 0 0 0 .393.288l4.052.575-2.906 2.77a.56.56 0 0 0-.163.506l.694 3.957-3.686-1.894a.5.5 0 0 0-.461 0z"></path>'
        }
      </svg>
    `;
  }).join("");
}

function getStatusBadgeMarkup(status) {
  const normalizedStatus = String(status || "pending").trim().toLowerCase();

  if (normalizedStatus === "published") {
    return `
      <span class="dg39k u5noc qzae2 inline-flex items-center i220p m859b at2zb asrt2 pzbk0 nj29a dark:bg-teal-500/10 dark:text-teal-500">
        <svg class="y6rh0 xqxx6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Published
      </span>
    `;
  }

  if (normalizedStatus === "hidden") {
    return `
      <span class="dg39k u5noc qzae2 inline-flex items-center i220p m859b at2zb asrt2 pzbk0 nj29a bg-slate-100 text-slate-600">
        Hidden
      </span>
    `;
  }

  return `
    <span class="dg39k u5noc qzae2 inline-flex items-center i220p m859b at2zb asrt2 pzbk0 nj29a bg-amber-100 text-amber-700">
      Pending
    </span>
  `;
}

async function resolveReviewProduct(review) {
  const slug = String(review?.product_slug || "").trim();
  const title = String(review?.product_title_snapshot || "").trim();
  const cacheKey = slug || title;

  if (!cacheKey) return null;
  if (productCache.has(cacheKey)) return productCache.get(cacheKey);

  try {
    let product = null;

    if (slug) {
      product = await sanityService.fetchSanityProductById(slug);
    }

    if (!product && title) {
      const matches = await sanityService.fetchSanityProducts({
        query: title,
        limit: 8,
      });
      const normalizedTitle = title.toLowerCase().trim();
      product =
        matches.find(
          (item) => String(item?.name || "").toLowerCase().trim() === normalizedTitle,
        ) || matches[0] || null;
    }

    productCache.set(cacheKey, product);
    return product;
  } catch (error) {
    console.warn("Unable to resolve review product from Sanity.", error);
    productCache.set(cacheKey, null);
    return null;
  }
}

async function enrichReviewsWithSanityProducts(reviews) {
  return Promise.all(
    reviews.map(async function (review) {
      const product = await resolveReviewProduct(review);
      if (!product) return review;

      return {
        ...review,
        product_slug: review.product_slug || product.slug || "",
        product_title_snapshot:
          product.name || review.product_title_snapshot || "Product",
        product_image_snapshot:
          product.imageUrl || review.product_image_snapshot || "",
      };
    }),
  );
}

function buildReplyMarkup(reply) {
  if (!reply || !reply.body) return "";

  return `
    <div class="ljp3z flex my9gz" data-review-reply-block>
      <svg class="y6rh0 x215h c4t4j" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 10 20 15 15 20"></polyline>
        <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
      </svg>
      <div class="t6ue9">
        <p class="at2zb yymkp c4t4j">You replied with</p>
        <blockquote class="aimp4 z65oy fsj2t yymkp f1ztf">
          ${escapeHtml(reply.body)}
        </blockquote>
      </div>
    </div>
  `;
}

function buildReplyComposerMarkup(existingReply = "") {
  return `
    <div class="ljp3z flex my9gz" data-review-reply-composer>
      <svg class="y6rh0 x215h c4t4j" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 10 20 15 15 20"></polyline>
        <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
      </svg>
      <div class="t6ue9">
        <p class="at2zb yymkp c4t4j">Write your reply</p>
        <textarea data-review-reply-input class="w-full min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500" placeholder="Type your reply here...">${escapeHtml(existingReply)}</textarea>
        <div class="flex items-center g26qa my9gz">
          <button type="button" data-review-action="reply-save" class="abuy9 zqj33 inline-flex items-center i220p m859b at2zb lkbtk vomh5 s6i1l mak94 x3ljb k0ser cirj5 dduyg disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden usqtq">
            Save reply
          </button>
          <button type="button" data-review-action="reply-cancel" class="uev8b inline-flex lp3ls items-center my9gz pkdac k0ser disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden cwz0p">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
}

function closeReplyComposer(scope = document) {
  const composer = scope.querySelector("[data-review-reply-composer]");
  if (composer) composer.remove();
}

function openReplyComposer(row) {
  if (!row) return;

  const tbody = row.closest("tbody");
  if (tbody) {
    Array.from(tbody.querySelectorAll("[data-review-reply-composer]")).forEach((node) => {
      if (!row.contains(node)) node.remove();
    });
  }

  const contentCell = row.cells?.[3];
  if (!contentCell) return;

  const existingComposer = contentCell.querySelector("[data-review-reply-composer]");
  const existingReplyNode = contentCell.querySelector("blockquote");
  const existingReply = existingReplyNode ? existingReplyNode.textContent.trim() : "";

  if (!existingComposer) {
    contentCell.insertAdjacentHTML("beforeend", buildReplyComposerMarkup(existingReply));
  }

  const replyInput = contentCell.querySelector("[data-review-reply-input]");
  if (replyInput) {
    replyInput.focus();
    replyInput.setSelectionRange(replyInput.value.length, replyInput.value.length);
  }
}

function buildReviewRow(review, index) {
  const productImage = escapeHtml(review.product_image_snapshot || "");
  const productTitle = escapeHtml(review.product_title_snapshot || "Product");
  const nickname = escapeHtml(review.customer_name || "Guest");
  const email = escapeHtml(review.customer_email || "");
  const headline = escapeHtml(review.headline || "Customer review");
  const body = escapeHtml(review.body || "");
  const dateLabel = escapeHtml(formatReviewDate(review.created_at));
  const detailHref = review.product_slug
    ? `/Product%20Detail.html?slug=${encodeURIComponent(review.product_slug)}`
    : "/Product%20Detail.html";
  const dropdownId = `hs-pro-ertmd-${index + 1}`;
  const reviewId = escapeHtml(review.id || "");

  return `
    <tr data-review-id="${reviewId}">
      <td class="gmilb offh6 aimp4 xt03d gfxdj i4hc0">
        <input type="checkbox" class="y6rh0 x215h robkw fsj2t ftf66 cirj5 s7mjk jw8en qgcqn checked:bg-primary-checked checked:border-primary-checked disabled:opacity-50 disabled:pointer-events-none">
      </td>
      <td class="gmilb offh6 uilco i4hc0">
        <div class="w-full flex items-center h7z6o">
          <img class="y6rh0 oh9ou y9dku" src="${productImage}" alt="Product Image">
          <div class="t6ue9">
            <a class="yymkp at2zb c4t4j bz0ic qiza1 lpc02 focus:outline-hidden jnkmc ti70c" href="${escapeHtml(detailHref)}">
              ${productTitle}
            </a>
          </div>
        </div>
      </td>
      <td class="gmilb offh6 uilco i4hc0">
        <div class="w-full flex h7z6o">
          <img class="y6rh0 jxr7s nj29a" src="${DEFAULT_AVATAR}" alt="Avatar">
          <div class="t6ue9">
            <span class="block yymkp at2zb c4t4j">${nickname}</span>
            <span class="block yymkp f1ztf">${email}</span>
            <p class="vbvcb inline-flex items-center jdzig m859b f1ztf">
              <svg class="y6rh0 xqxx6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
              Verified customer
            </p>
          </div>
        </div>
      </td>
      <td class="gmilb uilco i4hc0">
        <div class="flex g26qa wgwtz">
          <img class="y6rh0 jxr7s y9dku" src="${productImage}" alt="Product Image">
        </div>
        <div class="flex azl7k mpw84">
          ${buildStars(review.rating)}
        </div>
        <span class="block yymkp ctc9x c4t4j">${headline}</span>
        <span class="block yymkp f1ztf">${body}</span>
        ${buildReplyMarkup(review.latest_reply)}
      </td>
      <td class="gmilb offh6 uilco i4hc0">
        <span class="yymkp mnod2">${dateLabel}</span>
      </td>
      <td class="gmilb offh6 uilco i4hc0">
        ${getStatusBadgeMarkup(review.status)}
      </td>
      <td class="gmilb offh6 cti9j p0vwr d6bui i4hc0">
        <div class="flex r49qf items-center -space-x-px">
          <button type="button" data-review-action="reply" data-review-id="${reviewId}" class="abuy9 zqj33 inline-flex items-center i220p m859b at2zb lkbtk vomh5 s6i1l mak94 x3ljb k0ser cirj5 dduyg disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden usqtq">
            Reply
          </button>
          <div class="hs-dropdown relative inline-flex [--auto-close:inside] [--placement:top-right] lkbtk vomh5 s6i1l mak94 x3ljb cirj5 dduyg">
            <button id="${dropdownId}" type="button" class="uev8b inline-flex lp3ls items-center my9gz pkdac k0ser disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden cwz0p" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
              <svg class="y6rh0 xqxx6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
            <div class="hs-dropdown-menu hs-dropdown-open:opacity-100 mvv53 transition-[opacity,margin] duration opacity-0 hidden nnhrf khfq6 mak94 ocfsa ictpa p6d5j" role="menu" aria-orientation="vertical" aria-labelledby="${dropdownId}">
              <div class="i0yn8">
                <button type="button" data-review-action="publish" data-review-id="${reviewId}" class="w-full flex items-center h7z6o k85d4 o8oua edpyz text-[13px] j6b7h ibg9k disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden mhymu">Publish</button>
                <button type="button" data-review-action="unpublish" data-review-id="${reviewId}" class="w-full flex items-center h7z6o k85d4 o8oua edpyz text-[13px] j6b7h ibg9k disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden mhymu">Unpublish</button>
                <div class="hs7gg r4caq qpe8j"></div>
                <button type="button" data-review-action="delete" data-review-id="${reviewId}" class="w-full flex items-center h7z6o k85d4 o8oua edpyz text-[13px] j6b7h ibg9k disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden mhymu">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

async function renderLatestReviewsTable() {
  const tbody = document.querySelector("tbody.divide-y.divide-table-line");
  if (!tbody) return;

  try {
    const reviews = await fetchProductReviews({
      includeReplies: true,
      status: "all",
      limit: 100,
    });

    if (!reviews.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="cti9j edpyz yymkp f1ztf c4t4j">
            No review submissions yet.
          </td>
        </tr>
      `;
      return;
    }

    const enrichedReviews = await enrichReviewsWithSanityProducts(reviews);
    tbody.innerHTML = enrichedReviews.map(buildReviewRow).join("");

    if (window.HSStaticMethods && typeof window.HSStaticMethods.autoInit === "function") {
      window.HSStaticMethods.autoInit();
    }
  } catch (error) {
    console.error("Unable to load product reviews.", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="cti9j edpyz yymkp f1ztf c4t4j">
          ${escapeHtml(error?.message || "Unable to load product reviews right now.")}
        </td>
      </tr>
    `;
  }
}

function bindReviewTableActions() {
  const tbody = document.querySelector("tbody.divide-y.divide-table-line");
  if (!tbody || tbody.dataset.reviewActionsBound === "true") return;

  tbody.dataset.reviewActionsBound = "true";
  tbody.addEventListener("click", async function (event) {
    const actionButton = event.target.closest("button[data-review-action]");
    if (!actionButton) return;

    const action = String(actionButton.getAttribute("data-review-action") || "");
    const parentRow = actionButton.closest("tr");
    const reviewId = String(
      actionButton.getAttribute("data-review-id") || parentRow?.getAttribute("data-review-id") || "",
    );
    if (!action || !reviewId) return;

    const originalLabel = actionButton.textContent;
    actionButton.disabled = true;

    try {
      if (action === "reply") {
        const row = actionButton.closest("tr");
        openReplyComposer(row);
      } else if (action === "reply-cancel") {
        const row = actionButton.closest("tr");
        closeReplyComposer(row || document);
      } else if (action === "reply-save") {
        const row = actionButton.closest("tr");
        const replyInput = row ? row.querySelector("[data-review-reply-input]") : null;
        const trimmedReply = String(replyInput?.value || "").trim();
        if (!trimmedReply) {
          window.alert("Please write a reply before saving.");
          return;
        }

        actionButton.textContent = "Saving...";
        await createProductReviewReply({
          reviewId,
          body: trimmedReply,
        });
      } else if (action === "publish") {
        actionButton.textContent = "Publishing...";
        await updateProductReviewStatus(reviewId, "published");
      } else if (action === "unpublish") {
        actionButton.textContent = "Updating...";
        await updateProductReviewStatus(reviewId, "hidden");
      } else if (action === "delete") {
        const confirmed = window.confirm("Delete this review?");
        if (!confirmed) return;

        actionButton.textContent = "Deleting...";
        await deleteProductReview(reviewId);
      }

      await renderLatestReviewsTable();
    } catch (error) {
      console.error("Unable to update product review.", error);
      window.alert(error?.message || "Unable to update this review right now.");
    } finally {
      actionButton.disabled = false;
      actionButton.textContent = originalLabel;
    }
  });
}

bindReviewTableActions();
renderLatestReviewsTable();
