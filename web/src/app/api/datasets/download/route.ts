import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Permission-checked dataset download.
 * 1. The export row is read with the caller's session (RLS).
 * 2. can_access_dataset() is checked in the database.
 * 3. The signed URL is created with the caller's session, so the storage
 *    policy ("dataset exports: read permitted") is enforced a third time.
 * The download is written to the audit log.
 */
export async function GET(request: NextRequest) {
  const id = z.string().uuid().safeParse(request.nextUrl.searchParams.get("export"));
  if (!id.success) return NextResponse.json({ error: "Invalid export id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: exp } = await supabase
    .from("dataset_exports")
    .select("id, format, storage_bucket, storage_path, status, release_id, dataset_releases(version, status, dataset_id, datasets(slug))")
    .eq("id", id.data)
    .maybeSingle();
  if (!exp || exp.status !== "completed" || !exp.storage_path) return NextResponse.json({ error: "Export not available" }, { status: 404 });

  const { data: allowed } = await supabase.rpc("can_access_dataset", { p_dataset_id: exp.dataset_releases!.dataset_id });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!allowed && !isAdmin) {
    const target = user ? `/researcher/datasets/${exp.dataset_releases?.datasets?.slug}` : `/login?next=/datasets/${exp.dataset_releases?.datasets?.slug}`;
    return NextResponse.redirect(new URL(target, request.url));
  }
  if (exp.dataset_releases?.status !== "published" && !isAdmin) return NextResponse.json({ error: "Release not published" }, { status: 403 });

  const filename = `${exp.dataset_releases?.datasets?.slug}-v${exp.dataset_releases?.version}.${exp.format === "wav" ? "zip" : exp.format}`;
  const { data: signed, error } = await supabase.storage.from(exp.storage_bucket).createSignedUrl(exp.storage_path, 300, { download: filename });
  if (error || !signed) return NextResponse.json({ error: "Not permitted to download this file" }, { status: 403 });

  try {
    await createAdminClient().from("audit_logs").insert({ actor_id: user?.id ?? null, action: "download", entity_type: "dataset_exports", entity_id: exp.id, details: { format: exp.format, release_id: exp.release_id } });
  } catch {
    // auditing must not block the download
  }
  return NextResponse.redirect(signed.signedUrl);
}
