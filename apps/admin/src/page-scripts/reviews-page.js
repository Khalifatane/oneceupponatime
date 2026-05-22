import { getSupabase } from "@siggistore/supabase";
import { sendMessage } from "@siggistore/services/admin";

const PRODUCT_REVIEWS_KEY = "appProductReviews";
const DEFAULT_AVATAR =
  "public/images.unsplash.com/photo-1541101767792-f9b2b1c4f127--q2118f8306b.bin";
const supabase = getSupabase();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readStoredReviews() {
  try {
    const value = localStorage.getItem(PRODUCT_REVIEWS_KEY);
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("Unable to read stored product reviews.", error);
    return {};
  }
}

function writeStoredReviews(value) {
  try {
    localStorage.setItem(PRODUCT_REVIEWS_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn("Unable to write stored product reviews.", error);
  }
}

function buildReviewStorageId(review) {
  return [
    review?.slug || "",
    review?.title || "",
    review?.email || "",
    review?.headline || "",
    review?.createdAt || "",
  ].join("::");
}

function hashString(seed, salt) {
  let hash = 2166136261 ^ salt;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildReviewConversationId(reviewId) {
  const seed = String(reviewId || "review-reply");
  const hex = [
    hashString(seed, 0),
    hashString(seed, 1),
    hashString(seed, 2),
    hashString(seed, 3),
  ].join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

async function ensureReviewConversation(reviewId) {
  const conversationId = buildReviewConversationId(reviewId);
  const { error } = await supabase.from("conversations").upsert(
    {
      id: conversationId,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
      ignoreDuplicates: false,
    },
  );

  if (error) throw error;
  return conversationId;
}

function flattenReviews(reviewsByProduct) {
  return Object.values(reviewsByProduct)
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter(Boolean)
    .map((review) => ({
      ...review,
      __reviewId: buildReviewStorageId(review),
    }))
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt || 0).getTime();
      const rightTime = new Date(right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
}

function formatReviewDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
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

function buildReviewRow(review, index) {
  const productImage = escapeHtml(review.image || "");
  const productTitle = escapeHtml(review.title || "Product");
  const nickname = escapeHtml(review.nickname || "Guest");
  const email = escapeHtml(review.email || "");
  const headline = escapeHtml(review.headline || "Customer review");
  const body = escapeHtml(review.body || "");
  const dateLabel = escapeHtml(formatReviewDate(review.createdAt));
  const detailHref = review.slug
    ? `/Product%20Detail.html?slug=${encodeURIComponent(review.slug)}`
    : "/Product%20Detail.html";
  const dropdownId = `hs-pro-ertmd-${index + 1}`;
  const reviewId = escapeHtml(review.__reviewId || buildReviewStorageId(review));
  const replyMarkup = review.reply
    ? `
        <div class="ljp3z flex my9gz">
          <svg class="y6rh0 x215h c4t4j" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 10 20 15 15 20"></polyline>
            <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
          </svg>
          <div class="t6ue9">
            <p class="at2zb yymkp c4t4j">You replied with</p>
            <blockquote class="aimp4 z65oy fsj2t yymkp f1ztf">
              ${escapeHtml(review.reply)}
            </blockquote>
          </div>
        </div>
      `
    : "";

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
        ${replyMarkup}
      </td>
      <td class="gmilb offh6 uilco i4hc0">
        <span class="yymkp mnod2">${dateLabel}</span>
      </td>
      <td class="gmilb offh6 uilco i4hc0">
        <span class="dg39k u5noc qzae2 inline-flex items-center i220p m859b at2zb asrt2 pzbk0 nj29a dark:bg-teal-500/10 dark:text-teal-500">
          <svg class="y6rh0 xqxx6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Published
        </span>
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
                <button type="button" class="w-full flex items-center h7z6o k85d4 o8oua edpyz text-[13px] j6b7h ibg9k disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden mhymu">Publish</button>
                <button type="button" class="w-full flex items-center h7z6o k85d4 o8oua edpyz text-[13px] j6b7h ibg9k disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden mhymu">Unpublish</button>
                <div class="hs7gg r4caq qpe8j"></div>
                <button type="button" class="w-full flex items-center h7z6o k85d4 o8oua edpyz text-[13px] j6b7h ibg9k disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden mhymu">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function updateStoredReview(reviewId, updater) {
  if (!reviewId || typeof updater !== "function") return;

  const reviewsByProduct = readStoredReviews();
  let didUpdate = false;

  Object.keys(reviewsByProduct).forEach((key) => {
    const reviews = Array.isArray(reviewsByProduct[key]) ? reviewsByProduct[key] : [];
    reviewsByProduct[key] = reviews.map((review) => {
      if (buildReviewStorageId(review) !== reviewId) {
        return review;
      }

      didUpdate = true;
      return updater(review);
    });
  });

  if (!didUpdate) return;

  writeStoredReviews(reviewsByProduct);
}

function buildReplyMarkup(reply) {
  return `
    <div class="ljp3z flex my9gz" data-review-reply-block>
      <svg class="y6rh0 x215h c4t4j" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 10 20 15 15 20"></polyline>
        <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
      </svg>
      <div class="t6ue9">
        <p class="at2zb yymkp c4t4j">You replied with</p>
        <blockquote class="aimp4 z65oy fsj2t yymkp f1ztf">
          ${escapeHtml(reply)}
        </blockquote>
      </div>
    </div>
  `;
}

function upsertReplyBlock(row, reply) {
  if (!row || !reply) return;

  const detailCell = row.children[3];
  if (!detailCell) return;

  const existingReplyBlock = detailCell.querySelector("[data-review-reply-block]");
  if (existingReplyBlock) {
    existingReplyBlock.outerHTML = buildReplyMarkup(reply);
    return;
  }

  detailCell.insertAdjacentHTML("beforeend", buildReplyMarkup(reply));
}

function bindReviewTableActions() {
  const tbody = document.querySelector("tbody.divide-y.divide-table-line");
  if (!tbody || tbody.dataset.reviewActionsBound === "true") return;

  tbody.dataset.reviewActionsBound = "true";
  tbody.addEventListener("click", async function (event) {
    const replyButton = event.target.closest("button");
    if (!replyButton) return;

    const isReplyAction =
      replyButton.matches("[data-review-action='reply']") ||
      replyButton.textContent.trim().toLowerCase() === "reply";
    if (!isReplyAction) return;

    const reviewId = replyButton.getAttribute("data-review-id") || "";
    const row = replyButton.closest("tr");
    const existingReplyNode = row ? row.querySelector("blockquote") : null;
    const existingReply = existingReplyNode ? existingReplyNode.textContent.trim() : "";
    const nextReply = window.prompt("Write your reply to this review:", existingReply);

    if (nextReply === null) return;

    const trimmedReply = nextReply.trim();
    if (!trimmedReply) return;

    if (!reviewId) {
      upsertReplyBlock(row, trimmedReply);
      return;
    }

    const originalLabel = replyButton.textContent;
    replyButton.disabled = true;
    replyButton.textContent = "Saving...";

    try {
      const conversationId = await ensureReviewConversation(reviewId);
      const message = await sendMessage({
        conversationId,
        senderRole: "admin",
        content: trimmedReply,
      });

      updateStoredReview(reviewId, function (review) {
        return {
          ...review,
          reply: trimmedReply,
          repliedAt: message?.created_at || new Date().toISOString(),
          reply_conversation_id: conversationId,
        };
      });

      renderLatestReviewsTable();
    } catch (error) {
      console.error("Failed to save review reply to Supabase.", error);
      window.alert(error?.message || "Unable to save the reply right now.");
    } finally {
      replyButton.disabled = false;
      replyButton.textContent = originalLabel;
    }
  });
}

function renderLatestReviewsTable() {
  const tbody = document.querySelector("tbody.divide-y.divide-table-line");
  if (!tbody) return;

  bindReviewTableActions();

  const reviews = flattenReviews(readStoredReviews());
  if (!reviews.length) return;

  tbody.innerHTML = reviews.map(buildReviewRow).join("");

  if (window.HSStaticMethods && typeof window.HSStaticMethods.autoInit === "function") {
    window.HSStaticMethods.autoInit();
  }

  bindReviewTableActions();
}

renderLatestReviewsTable();
