import "server-only";

import { createClient } from "@/lib/supabase/server";

const DETAIL_SELECT = `
  *,
  languages(name, code),
  language_varieties(name),
  content_categories(name),
  data_licenses(code, name),
  contributor:users!contributions_contributor_id_fkey(id, display_name, public_handle),
  contribution_permissions(*),
  text_content(id, version, body, context, is_original, change_note, created_by, char_count, word_count, created_at),
  translations(*, source_language:languages!translations_source_language_id_fkey(name, code), target_language:languages!translations_target_language_id_fkey(name, code)),
  audio_assets(*),
  documents(*),
  conversation_messages(id, seq, speaker_role, speaker_label, text, gloss_en),
  cultural_metadata(*),
  reviews(id, decision, comment, scores, text_version, previous_status, new_status, created_at, reviewer:users!reviews_reviewer_id_fkey(display_name)),
  quality_checks(id, check_type, passed, score, details, created_at),
  review_assignments(id, reviewer_id, status, created_at, reviewer:users!review_assignments_reviewer_id_fkey(display_name))
`;

export async function getContributionDetail(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contributions").select(DETAIL_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;

  const versions = [...(data.text_content ?? [])].sort((a, b) => a.version - b.version);
  const messages = [...(data.conversation_messages ?? [])].sort((a, b) => a.seq - b.seq);
  const reviews = [...(data.reviews ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const audio = data.audio_assets ?? null;
  const document = data.documents ?? null;

  let audioUrl: string | null = null;
  let documentUrl: string | null = null;
  if (audio) {
    const { data: signed } = await supabase.storage.from("audio").createSignedUrl(audio.storage_path, 3600);
    audioUrl = signed?.signedUrl ?? null;
  }
  let extraction: { segments: Array<{ id: string; seq: number; page_number: number | null; kind: string; text: string; status: string; is_duplicate: boolean; ocr_confidence: number | null }>; counts: Record<string, number> } | null = null;
  if (document) {
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 3600, { download: document.original_filename });
    documentUrl = signed?.signedUrl ?? null;
    const [{ data: segs }, { data: all }] = await Promise.all([
      supabase.from("document_extractions").select("id, seq, page_number, kind, text, status, is_duplicate, ocr_confidence").eq("document_id", document.id).order("seq").limit(60),
      supabase.from("document_extractions").select("status").eq("document_id", document.id),
    ]);
    const counts: Record<string, number> = { total: all?.length ?? 0, pending: 0, approved: 0, rejected: 0 };
    (all ?? []).forEach((r) => (counts[r.status] = (counts[r.status] ?? 0) + 1));
    extraction = { segments: segs ?? [], counts };
  }

  return { ...data, versions, messages, reviews, audio, document, audioUrl, documentUrl, extraction };
}

export type ContributionDetail = NonNullable<Awaited<ReturnType<typeof getContributionDetail>>>;
