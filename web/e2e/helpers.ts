import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.SEED_PASSWORD ?? "Secret123pass";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('form button:has-text("Sign in")');
  await expect(page).toHaveURL(/\/portal/);
}

export async function latestEmailLink(to: string, pattern = /href="([^"]*auth\/confirm[^"]*)"/): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)).json();
    if (list.messages?.length) {
      const msg = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${list.messages[0].ID}`)).json();
      const m = msg.HTML.match(pattern);
      if (m) return m[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email for ${to}`);
}
