import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { latestEmailLink, login, PASSWORD } from "./helpers";

test.describe.configure({ mode: "serial" });

const email = `e2e.${Date.now()}@example.test`;
const marker = `[SYNTHETIC TEST DATA] e2e ${Date.now()}`;

test("register, verify email and complete profile", async ({ page }) => {
  await page.goto("/register");
  await page.fill("#display_name", "E2E Contributor");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.fill("#confirm", PASSWORD);
  await page.check("#accept_terms");
  await page.check("#adult");
  await page.click('button:has-text("Create account")');
  await expect(page.getByText("Confirm your email")).toBeVisible();
  // Unverified users cannot sign in
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('form button:has-text("Sign in")');
  await expect(page.getByText(/verify your email/)).toBeVisible();
  await page.goto(await latestEmailLink(email));
  await expect(page).toHaveURL(/\/portal\?welcome=1/);
  await page.goto("/portal/profile");
  await page.click('button:has-text("Add")');
  await expect(page.getByText("Language saved")).toBeVisible();
});

test("contributor submits text, translation, conversation and cultural knowledge", async ({ page }) => {
  await login(page, email);
  await page.goto("/portal/text");
  await page.fill("#body", marker);
  await page.check("#perm_research");
  await page.check("#perm_ai");
  await page.click('button:has-text("Submit for review")');
  await expect(page.getByText("Text submitted for review")).toBeVisible();

  await page.goto("/portal/translations");
  await page.click('button:has-text("Give me a sentence to translate")');
  await page.fill("#target_text", `${marker} translation`);
  await page.click('button:has-text("Submit translation")');
  await expect(page.getByText("Translation submitted")).toBeVisible();

  await page.goto("/portal/conversations");
  const boxes = page.locator('textarea[id^="text-"]');
  await boxes.nth(0).fill(`${marker} question?`);
  await boxes.nth(1).fill(`${marker} answer.`);
  await page.click('button:has-text("Submit conversation")');
  await expect(page.getByText("Conversation submitted")).toBeVisible();

  await page.goto("/portal/cultural");
  await page.fill("#original_expression", `${marker} proverb`);
  await page.fill("#meaning", "Synthetic meaning");
  await page.click('button:has-text("Submit for review")');
  await expect(page.getByText("Cultural knowledge submitted")).toBeVisible();

  await page.goto("/portal/contributions");
  await expect(page.getByRole("link", { name: marker, exact: true })).toBeVisible();
});

test("contributor uploads a document and it is extracted", async ({ page }) => {
  const file = path.join(os.tmpdir(), `e2e-${Date.now()}.txt`);
  fs.writeFileSync(file, `${marker}. First sentence here. Second sentence here.\n\nAnother paragraph follows.`);
  await login(page, email);
  await page.goto("/portal/documents");
  await page.setInputFiles('input[type="file"]', file);
  await page.selectOption("#copyright_status", "own_work");
  await page.check("#permission_to_digitise");
  await page.click('button:has-text("Upload and extract")');
  await expect(page.getByText("Text extraction has been queued")).toBeVisible({ timeout: 30_000 });
  await expect(async () => {
    await page.reload();
    await expect(page.getByText("Extraction: completed").first()).toBeVisible();
  }).toPass({ timeout: 45_000 });
});

test("reviewer approves the text with a correction; contributor sees versions", async ({ page }) => {
  await login(page, "reviewer@swadata.test");
  await page.goto("/review?sort=newest");
  const row = page.getByRole("row").filter({ hasText: marker }).filter({ has: page.getByRole("cell", { name: "Text", exact: true }) }).first();
  await row.getByRole("button", { name: "Claim" }).click();
  await expect(page).toHaveURL(/\/review\/[0-9a-f-]{36}/);
  await page.getByRole("radio", { name: "5" }).first().click();
  await page.fill("#corrected", `${marker} (corrected)`);
  await page.fill("#comment", "Lovely, thank you!");
  await page.click('button:has-text("Record decision")');
  await expect(page).toHaveURL(/\/review$/);

  await page.context().clearCookies();
  await login(page, email);
  await page.goto("/portal/contributions?status=approved");
  await page.getByRole("link", { name: marker, exact: true }).click();
  await expect(page.getByText("Original · v1")).toBeVisible();
  await expect(page.getByText(/v2 · current/)).toBeVisible();
});

test("admin grants and removes the reviewer role", async ({ page }) => {
  await login(page, "admin@swadata.test");
  await page.goto(`/admin/users?q=${encodeURIComponent(email)}`);
  await page.getByRole("button", { name: "Edit roles" }).click();
  await page.getByLabel("Reviewer").check();
  await expect(page.getByText("Reviewer granted")).toBeVisible();
  await page.getByLabel("Reviewer").uncheck();
  await expect(page.getByText("Reviewer removed")).toBeVisible();
});

test("role-based access: contributor is denied staff areas", async ({ page }) => {
  await login(page, email);
  for (const p of ["/review", "/admin", "/researcher"]) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/portal\?error=forbidden/);
  }
});
