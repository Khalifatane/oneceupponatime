import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:3000";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const sampleCart = [
  {
    id: "qa-live-item-1",
    product_id: "qa-live-item-1",
    title: "Live QA Product",
    price: 39,
    originalPrice: 49,
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=560&h=780&auto=format&fit=crop&ixlib=rb-4.0.3",
    color: "Blue",
    size: "M",
    quantity: 1,
    href: "./Product Detail.html",
  },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: EDGE_PATH,
});

const context = await browser.newContext();
const page = await context.newPage();

async function text(selector) {
  const value = await page.locator(selector).first().textContent();
  return (value || "").trim();
}

try {
  await page.goto(`${BASE_URL}/Checkout.html`, { waitUntil: "networkidle" });

  await page.evaluate((cart) => {
    localStorage.clear();
    localStorage.setItem("appCartItems", JSON.stringify(cart));
  }, sampleCart);

  await page.reload({ waitUntil: "networkidle" });

  await page.fill("#hs-pro-shchfem", "khlalifadiop25@gmail.com");
  await page.fill("#hs-pro-shchfn", "Khalifadiop");
  await page.fill("#hs-pro-shchfct", "Saint-Louis");
  await page.fill("#hs-pro-shchfph", "77 875 63 16");
  await page.check("#hs-pro-esdo2");

  const checkoutDraftBeforeContinue = await page.evaluate(() => JSON.parse(localStorage.getItem("appCheckoutDraft") || "null"));

  await page.locator('a[href="./review-pay.html"]').click();
  await page.waitForURL(/review-pay\.html$/);
  await page.waitForLoadState("networkidle");

  const reviewData = {
    email: await text("[data-review-email='true']"),
    fullName: await text("[data-review-full-name='true']"),
    addressLine: await text("[data-review-address-line='true']"),
    shippingMethod: await text("[data-review-shipping-method='true']"),
  };

  const storageOnReview = await page.evaluate(() => ({
    checkoutDraft: JSON.parse(localStorage.getItem("appCheckoutDraft") || "null"),
    lastCheckoutDetails: JSON.parse(localStorage.getItem("appLastCheckoutDetails") || "null"),
    reviewSnapshot: JSON.parse(localStorage.getItem("appReviewOrderSnapshot") || "null"),
    hrefs: Array.from(document.querySelectorAll("a")).map((node) => ({
      text: (node.textContent || "").trim(),
      href: node.getAttribute("href"),
    })),
  }));

  await page.getByRole("link", { name: /continue/i }).last().click();
  await page.waitForURL(/order-confirmation\.html$/);
  await page.waitForLoadState("networkidle");

  const storageAfterOrder = await page.evaluate(() => ({
    latestOrder: JSON.parse(localStorage.getItem("appLatestOrder") || "null"),
    reviewSnapshot: JSON.parse(localStorage.getItem("appReviewOrderSnapshot") || "null"),
    checkoutDraft: JSON.parse(localStorage.getItem("appCheckoutDraft") || "null"),
  }));

  await page.goto(`${BASE_URL}/My%20Orders.html`, { waitUntil: "networkidle" });

  const myOrdersData = {
    delivery: await text("[data-latest-order-delivery='true']"),
    address: await text("[data-latest-order-address='true']"),
    orderLink: await page.locator('a[href*="Order Details.html"]').first().getAttribute("href"),
  };

  console.log(JSON.stringify({
    checkoutDraftBeforeContinue,
    reviewData,
    storageOnReview,
    storageAfterOrder,
    myOrdersData,
  }, null, 2));
} finally {
  await browser.close();
}
