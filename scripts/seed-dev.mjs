#!/usr/bin/env node
/**
 * DEVELOPMENT / STAGING ONLY — creates role accounts and SYNTHETIC test data.
 *
 * All contribution text is placeholder content explicitly marked [SYNTHETIC TEST DATA].
 * It is NOT real African-language data and must never be released in a dataset.
 * Refuses to run against a non-local Supabase URL unless ALLOW_REMOTE_SEED=1.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... node scripts/seed-dev.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(new URL("../web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_ANON_KEY;
const password = process.env.SEED_PASSWORD ?? "Secret123pass";
if (!service || !anon) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY");
if (!/127\.0\.0\.1|localhost/.test(url) && process.env.ALLOW_REMOTE_SEED !== "1") {
  throw new Error("Refusing to seed a remote project. Set ALLOW_REMOTE_SEED=1 for a staging project.");
}

const admin = createClient(url, service, { auth: { persistSession: false } });

const ACCOUNTS = [
  { email: "superadmin@swadata.test", name: "Dev Super Admin", roles: ["super_admin", "admin"] },
  { email: "admin@swadata.test", name: "Dev Admin", roles: ["admin"] },
  { email: "linguist@swadata.test", name: "Dev Linguist", roles: ["linguist", "reviewer"] },
  { email: "reviewer@swadata.test", name: "Dev Reviewer", roles: ["reviewer"] },
  { email: "researcher@swadata.test", name: "Dev Researcher", roles: ["researcher"] },
  { email: "contributor@swadata.test", name: "Dev Contributor", roles: [] },
  { email: "contributor2@swadata.test", name: "Dev Contributor Two", roles: [] },
];

async function ensureUser(a) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === a.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email, password, email_confirm: true,
      user_metadata: { display_name: a.name, accepted_terms: true, policy_version: "2026-11" },
    });
    if (error) throw error;
    user = data.user;
  }
  const { data: roles } = await admin.from("roles").select("id, key");
  for (const r of a.roles) {
    const role = roles.find((x) => x.key === r);
    await admin.from("user_roles").upsert({ user_id: user.id, role_id: role.id }, { onConflict: "user_id,role_id" });
  }
  return user;
}

async function session(email) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

const perms = { allow_collection: true, allow_research: true, allow_ai_training: true, allow_public_release: false, allow_commercial: false };

async function waitForApi() {
  // After `supabase db reset` the API restarts; wait until reference data is readable.
  for (let i = 0; i < 60; i++) {
    const { data } = await admin.from("roles").select("id").limit(1);
    if (data?.length) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Supabase API not ready (roles table unreadable)");
}

async function main() {
  await waitForApi();
  for (const a of ACCOUNTS) await ensureUser(a);
  console.log(`✓ ${ACCOUNTS.length} accounts ready (password: ${password === "Secret123pass" ? "Secret123pass (dev default)" : "from SEED_PASSWORD"})`);

  const { count } = await admin.from("contributions").select("id", { count: "exact", head: true }).contains("metadata", { synthetic: true });
  if (count) return console.log(`✓ synthetic contributions already present (${count}); skipping`);

  const { data: langs } = await admin.from("languages").select("id, code");
  const L = Object.fromEntries(langs.map((l) => [l.code, l.id]));
  const meta = { synthetic: true };
  const c1 = await session("contributor@swadata.test");
  const c2 = await session("contributor2@swadata.test");
  const ids = [];
  const sub = async (client, p) => {
    const { data, error } = await client.rpc("submit_contribution", { p: { metadata: meta, permissions: perms, ...p } });
    if (error) throw new Error(`${p.type}: ${error.message}`);
    ids.push(data);
    return data;
  };

  for (let i = 1; i <= 6; i++) await sub(i % 2 ? c1 : c2, { type: "text", language_id: L.ss, body: `[SYNTHETIC TEST DATA] Placeholder sentence ${i} for workflow testing.`, context: "Synthetic" });
  await sub(c1, { type: "text", language_id: L.zu, body: "[SYNTHETIC TEST DATA] Placeholder isiZulu-tagged sentence." });
  const { data: src } = await admin.from("translation_sources").select("id, text").limit(2);
  await sub(c1, { type: "translation", language_id: L.ss, source_language_id: L.en, source_id: src[0].id, source_text: src[0].text, target_text: "[SYNTHETIC TEST DATA] placeholder translation A" });
  await sub(c2, { type: "translation", language_id: L.ss, source_language_id: L.en, source_id: src[0].id, source_text: src[0].text, target_text: "[SYNTHETIC TEST DATA] placeholder translation B" });
  await sub(c2, { type: "conversation", language_id: L.ss, title: "Synthetic Q&A", metadata: { ...meta, conversation_type: "qa" }, messages: [
    { speaker_role: "user", text: "[SYNTHETIC TEST DATA] Placeholder question?" },
    { speaker_role: "assistant", text: "[SYNTHETIC TEST DATA] Placeholder answer." },
  ] });
  await sub(c1, { type: "cultural", language_id: L.ss, kind: "proverb", original_expression: "[SYNTHETIC TEST DATA] Placeholder proverb", meaning: "Placeholder meaning", sensitivity: "public" });
  await sub(c2, { type: "cultural", language_id: L.ss, kind: "oral_history", original_expression: "[SYNTHETIC TEST DATA] Restricted placeholder", sensitivity: "restricted" });
  console.log(`✓ ${ids.length} synthetic contributions submitted`);

  const rv = await session("reviewer@swadata.test");
  const decisions = ["approve", "approve", "approve", "approve", "request_changes", "reject", "approve", "approve", "approve", "approve"];
  for (let i = 0; i < decisions.length; i++) {
    const { error } = await rv.rpc("submit_review", { p_contribution_id: ids[i], p_decision: decisions[i], p_comment: decisions[i] === "approve" ? "" : "Synthetic review comment", p_scores: { overall: 4 } });
    if (error) console.warn("review", i, error.message);
  }
  console.log("✓ synthetic reviews recorded");
}

main().catch((e) => { console.error(e); process.exit(1); });
