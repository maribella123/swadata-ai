import { expect, test } from "@playwright/test";

const PAGES = ["/", "/about", "/languages", "/languages/ss", "/how-it-works", "/contribute", "/research", "/datasets", "/contact", "/privacy", "/terms", "/governance"];

for (const path of PAGES) {
  test(`public page ${path} renders without horizontal scroll`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });
}

test("homepage statistics come from the database", async ({ page, request }) => {
  await page.goto("/");
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  test.skip(!anon, "set NEXT_PUBLIC_SUPABASE_ANON_KEY to compare with the database");
  const stats = await (await request.post(`${supabase}/rest/v1/rpc/platform_stats`, { headers: { apikey: anon!, "Content-Type": "application/json" }, data: {} })).json();
  const impact = page.locator('section[aria-labelledby="impact"]');
  await expect(impact.getByText(String(stats.languages_supported), { exact: true }).first()).toBeVisible();
});

test("language registry expands", async ({ page }) => {
  await page.goto("/languages");
  await page.getByRole("button", { name: /African language registry/ }).click();
  await expect(page.locator("#language-registry")).toContainText("Kiswahili");
});

test("contact form validates and submits", async ({ page }) => {
  await page.goto("/contact");
  await page.click('button:has-text("Send message")');
  await expect(page.getByText("Please correct the highlighted fields.")).toBeVisible();
  await page.fill("#name", "E2E Tester");
  await page.fill("#email", "e2e@example.test");
  await page.fill("#message", "This is an automated end-to-end test message.");
  await page.click('button:has-text("Send message")');
  await expect(page.getByText("your message has been received")).toBeVisible();
});

test("protected areas redirect anonymous users to sign in", async ({ page }) => {
  for (const path of ["/portal", "/review", "/admin", "/researcher"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/%2F/g, "(%2F|/)")}`));
  }
});
