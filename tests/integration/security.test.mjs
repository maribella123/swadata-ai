/**
 * Security & RLS integration tests against a running Supabase (local or staging).
 * Requires the dev seed accounts (node scripts/seed-dev.mjs).
 *
 *   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=... node --test tests/integration/
 *
 * Every test acts through a real user session, so it exercises Row Level
 * Security, storage policies, guard triggers and RPC authorization exactly as
 * the application does.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(new URL("../../web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");
const URL_ = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY;
const PW = process.env.SEED_PASSWORD ?? "Secret123pass";
assert.ok(ANON, "SUPABASE_ANON_KEY is required");

const s = {};
async function as(email) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw error;
  c.uid = data.user.id;
  return c;
}
const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
let ss, ownId;

before(async () => {
  for (const r of ["contributor", "contributor2", "reviewer", "linguist", "admin", "superadmin", "researcher"]) s[r] = await as(`${r}@swadata.test`);
  ss = (await anon.from("languages").select("id").eq("code", "ss").single()).data.id;
  const { data, error } = await s.contributor.rpc("submit_contribution", {
    p: { type: "text", language_id: ss, body: `[SYNTHETIC TEST DATA] security test ${Date.now()}`, permissions: { allow_collection: true }, metadata: { synthetic: true } },
  });
  if (error) throw error;
  ownId = data;
});

test("anonymous users can read public reference data and stats only", async () => {
  assert.ok((await anon.from("languages").select("id")).data.length > 10);
  const stats = await anon.rpc("platform_stats");
  assert.equal(stats.error, null);
  assert.deepEqual((await anon.from("contributions").select("id")).data, []);
  assert.deepEqual((await anon.from("users").select("id")).data, []);
  assert.deepEqual((await anon.from("audit_logs").select("id")).data, []);
});

test("contributors only see their own contributions", async () => {
  const theirs = (await s.contributor2.from("contributions").select("id, contributor_id")).data;
  assert.ok(theirs.every((r) => r.contributor_id === s.contributor2.uid));
  assert.ok(!theirs.some((r) => r.id === ownId));
});

test("contributor cannot grant themselves a role", async () => {
  const role = (await s.contributor.from("roles").select("id").eq("key", "admin").single()).data;
  const r = await s.contributor.from("user_roles").insert({ user_id: s.contributor.uid, role_id: role.id });
  assert.ok(r.error, "insert should be rejected");
  const rpc = await s.contributor.rpc("set_user_role", { p_user_id: s.contributor.uid, p_role: "admin", p_grant: true });
  assert.match(rpc.error.message, /Administrator role required/);
});

test("contributor cannot approve, change layer, or reactivate themselves", async () => {
  const st = await s.contributor.from("contributions").update({ status: "approved" }).eq("id", ownId);
  assert.match(st.error.message, /not permitted/);
  const layer = await s.contributor.from("contributions").update({ data_layer: "model_ready" }).eq("id", ownId);
  assert.match(layer.error.message, /protected/);
  const active = await s.contributor.from("users").update({ is_active: false }).eq("id", s.contributor.uid);
  assert.match(active.error.message, /protected/);
});

test("original text versions are immutable", async () => {
  const r = await s.contributor.from("text_content").update({ body: "tampered" }, { count: "exact" }).eq("contribution_id", ownId);
  assert.ok(r.error || r.count === 0, "no rows may be updated");
  const after = (await s.contributor.from("text_content").select("body").eq("contribution_id", ownId).eq("version", 1).single()).data;
  assert.notEqual(after.body, "tampered");
});

test("contributors cannot read audit logs or other users' consents", async () => {
  assert.deepEqual((await s.contributor.from("audit_logs").select("id")).data, []);
  const c = (await s.contributor.from("consents").select("user_id")).data;
  assert.ok(c.every((x) => x.user_id === s.contributor.uid));
});

test("reviewer cannot review their own work; can review others'", async () => {
  const mine = await s.reviewer.rpc("submit_contribution", { p: { type: "text", language_id: ss, body: `[SYNTHETIC TEST DATA] reviewer own ${Date.now()}`, permissions: { allow_collection: true } } });
  const self = await s.reviewer.rpc("submit_review", { p_contribution_id: mine.data, p_decision: "approve" });
  assert.match(self.error.message, /own contribution/);
  const ok = await s.reviewer.rpc("submit_review", { p_contribution_id: ownId, p_decision: "request_changes", p_comment: "Please add context." });
  assert.equal(ok.error, null);
});

test("reject / request changes require a comment; scores are validated", async () => {
  const r = await s.linguist.rpc("submit_review", { p_contribution_id: ownId, p_decision: "reject", p_comment: "" });
  assert.match(r.error.message, /explain/);
  const sc = await s.linguist.rpc("submit_review", { p_contribution_id: ownId, p_decision: "comment", p_comment: "x", p_scores: { accuracy: 9 } });
  assert.match(sc.error.message, /Invalid score/);
});

test("reviewer correction creates a new version and preserves the original", async () => {
  await s.contributor.rpc("resubmit_contribution", { p_contribution_id: ownId, p_body: "[SYNTHETIC TEST DATA] revised by contributor", p_note: "added context" });
  const r = await s.linguist.rpc("submit_review", { p_contribution_id: ownId, p_decision: "approve", p_corrected_text: "[SYNTHETIC TEST DATA] corrected by linguist" });
  assert.equal(r.error, null);
  const versions = (await s.contributor.from("text_content").select("version, is_original, body").eq("contribution_id", ownId).order("version")).data;
  assert.equal(versions.length, 3);
  assert.equal(versions[0].is_original, true);
  assert.match(versions[0].body, /security test/);
  const c = (await s.contributor.from("contributions").select("status, data_layer").eq("id", ownId).single()).data;
  assert.deepEqual(c, { status: "approved", data_layer: "validated" });
});

test("restricted cultural items are hidden from plain reviewers but visible to linguists", async () => {
  const { data: id } = await s.contributor.rpc("submit_contribution", { p: { type: "cultural", language_id: ss, kind: "oral_history", original_expression: "[SYNTHETIC TEST DATA] sacred", sensitivity: "restricted", permissions: { allow_collection: true } } });
  assert.equal((await s.reviewer.from("contributions").select("id").eq("id", id)).data.length, 0);
  assert.equal((await s.linguist.from("contributions").select("id").eq("id", id)).data.length, 1);
});

test("storage: users cannot upload into another user's folder or read others' files", async () => {
  const blob = new Blob(["RIFF...."], { type: "audio/wav" });
  const evil = await s.contributor2.storage.from("audio").upload(`${s.contributor.uid}/x/evil.wav`, blob, { contentType: "audio/wav" });
  assert.ok(evil.error, "cross-folder upload must fail");
  const own = await s.contributor2.storage.from("audio").upload(`${s.contributor2.uid}/t-${Date.now()}/ok.wav`, blob, { contentType: "audio/wav" });
  assert.equal(own.error, null);
  const read = await s.contributor.storage.from("audio").download(own.data.path);
  assert.ok(read.error, "other users must not read the file");
  const del = await s.contributor2.storage.from("audio").remove([own.data.path]);
  assert.equal(del.error, null);
  const bad = await s.contributor2.storage.from("documents").upload(`${s.contributor2.uid}/t/x.exe`, new Blob(["MZ"]), { contentType: "application/x-msdownload" });
  assert.ok(bad.error, "disallowed MIME type must be rejected");
});

test("submit_contribution rejects storage paths outside the user's folder", async () => {
  const r = await s.contributor2.rpc("submit_contribution", { p: { type: "audio", language_id: ss, storage_path: `${s.contributor.uid}/a/b.wav`, mime_type: "audio/wav", file_size_bytes: 10, speaker_pseudonym: "x", consent_recording: true, permissions: { allow_collection: true } } });
  assert.match(r.error.message, /Invalid audio storage path/);
});

test("only super admins can grant administrator roles", async () => {
  const r = await s.admin.rpc("set_user_role", { p_user_id: s.contributor2.uid, p_role: "admin", p_grant: true });
  assert.match(r.error.message, /super administrator/);
  const ok = await s.admin.rpc("set_user_role", { p_user_id: s.contributor2.uid, p_role: "translator", p_grant: true });
  assert.equal(ok.error, null);
  await s.admin.rpc("set_user_role", { p_user_id: s.contributor2.uid, p_role: "translator", p_grant: false });
});

test("access requests are limited to researchers; restricted datasets stay closed until approved", async () => {
  const speech = (await anon.from("datasets").select("id").eq("slug", "afrilang-cultural").single()).data.id;
  const notResearcher = await s.contributor.from("dataset_access_requests").insert({ dataset_id: speech, requester_id: s.contributor.uid, institution: "X Uni", purpose: "Twenty characters of purpose text." });
  assert.ok(notResearcher.error);
  assert.equal((await s.researcher.rpc("can_access_dataset", { p_dataset_id: speech })).data, false);
});

test("admins cannot publish a release they created (four-eyes)", async () => {
  const ds = (await s.admin.from("datasets").select("id").eq("slug", "afrilang-cultural").single()).data;
  const rel = await s.admin.from("dataset_releases").insert({ dataset_id: ds.id, version: `9.${Date.now() % 1000}.0`, language_codes: ["ss"], created_by: s.admin.uid }).select("id").single();
  assert.equal(rel.error, null);
  const r = await s.admin.rpc("approve_release", { p_release_id: rel.data.id });
  assert.ok(r.error);
});
