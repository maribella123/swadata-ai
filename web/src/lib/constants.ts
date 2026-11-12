import type { Database } from "@/lib/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type ContributionType = Database["public"]["Enums"]["contribution_type"];
export type ContributionStatus = Database["public"]["Enums"]["contribution_status"];

export const ROLE_LABELS: Record<AppRole, string> = {
  contributor: "Contributor",
  translator: "Translator",
  reviewer: "Reviewer",
  linguist: "Linguist",
  researcher: "Researcher",
  admin: "Administrator",
  super_admin: "Super Administrator",
};

export const ALL_ROLES: AppRole[] = ["contributor", "translator", "reviewer", "linguist", "researcher", "admin", "super_admin"];
export const REVIEWER_ROLES: AppRole[] = ["reviewer", "linguist", "admin", "super_admin"];
export const ADMIN_ROLES: AppRole[] = ["admin", "super_admin"];
export const RESEARCHER_ROLES: AppRole[] = ["researcher", "linguist", "admin", "super_admin"];
export const RESTRICTED_ROLES: AppRole[] = ["linguist", "admin", "super_admin"];

export const TYPE_LABELS: Record<ContributionType, string> = {
  text: "Text",
  document: "Document",
  audio: "Audio",
  translation: "Translation",
  conversation: "Conversation",
  cultural: "Cultural knowledge",
};

export const STATUS_LABELS: Record<ContributionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const STATUS_TONE: Record<ContributionStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  draft: "neutral",
  submitted: "info",
  in_review: "info",
  changes_requested: "warning",
  approved: "success",
  rejected: "danger",
  withdrawn: "neutral",
};

export const SOURCE_TYPES = [
  { value: "original", label: "My own original words" },
  { value: "oral", label: "Oral tradition / spoken source" },
  { value: "community", label: "Community knowledge" },
  { value: "educational", label: "Educational material" },
  { value: "published", label: "Previously published material" },
  { value: "archive", label: "Archive or historical record" },
  { value: "other", label: "Other" },
] as const;

export const CULTURAL_KINDS = [
  { value: "proverb", label: "Proverb" },
  { value: "idiom", label: "Idiom" },
  { value: "folklore", label: "Folklore" },
  { value: "traditional_story", label: "Traditional story" },
  { value: "greeting", label: "Greeting" },
  { value: "historical_expression", label: "Historical expression" },
  { value: "indigenous_term", label: "Indigenous terminology" },
  { value: "oral_history", label: "Oral history" },
] as const;

export const SENSITIVITY_OPTIONS = [
  { value: "public", label: "Public — can be shared openly" },
  { value: "community", label: "Community — share with care and context" },
  { value: "restricted", label: "Restricted — sacred or sensitive; senior linguists only" },
] as const;

export const COPYRIGHT_OPTIONS = [
  { value: "own_work", label: "My own work" },
  { value: "public_domain", label: "Public domain" },
  { value: "open_licence", label: "Openly licensed (e.g. Creative Commons)" },
  { value: "copyrighted_with_permission", label: "Copyrighted — I have written permission" },
  { value: "copyrighted_no_permission", label: "Copyrighted — no permission yet" },
  { value: "unknown", label: "Unknown" },
] as const;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const AUDIO_MIME_TYPES = [
  "audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/webm",
  "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac",
];

export const DOCUMENT_TYPES: Record<string, { fileType: "pdf" | "docx" | "txt" | "epub" | "image"; label: string }> = {
  "application/pdf": { fileType: "pdf", label: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { fileType: "docx", label: "Word (DOCX)" },
  "text/plain": { fileType: "txt", label: "Plain text" },
  "application/epub+zip": { fileType: "epub", label: "EPUB" },
  "image/png": { fileType: "image", label: "Scanned image (PNG)" },
  "image/jpeg": { fileType: "image", label: "Scanned image (JPEG)" },
  "image/tiff": { fileType: "image", label: "Scanned image (TIFF)" },
  "image/webp": { fileType: "image", label: "Scanned image (WebP)" },
};
