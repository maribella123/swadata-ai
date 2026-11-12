import { z } from "zod";

const uuid = z.string().uuid();
const optUuid = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(uuid.optional());
const text = (max: number) => z.string().trim().max(max).optional().default("");

export const permissionsSchema = z.object({
  allow_collection: z.literal(true, { message: "Permission for data collection is required to submit" }),
  allow_research: z.boolean().default(false),
  allow_public_release: z.boolean().default(false),
  allow_ai_training: z.boolean().default(false),
  allow_commercial: z.boolean().default(false),
  rights_holder: text(300),
  declaration_text: text(2000),
});

const base = z.object({
  language_id: uuid.describe("Language"),
  variety_id: optUuid,
  category_id: optUuid,
  title: text(300),
  source_type: z.enum(["original", "oral", "published", "archive", "educational", "community", "other"]).default("original"),
  is_original: z.boolean().default(true),
  source_reference: text(1000),
  license_id: optUuid,
  sensitivity: z.enum(["public", "community", "restricted"]).default("public"),
  draft: z.boolean().default(false),
  metadata: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
  permissions: permissionsSchema,
});

export const textSchema = base.extend({
  type: z.literal("text"),
  body: z.string().trim().min(2, "Please enter some text").max(200000, "Text is too long (max 200,000 characters)"),
  context: text(4000),
});

export const translationSchema = base
  .extend({
    type: z.literal("translation"),
    source_id: optUuid,
    source_language_id: uuid,
    source_text: z.string().trim().min(1, "Enter the source text").max(5000),
    target_text: z.string().trim().min(1, "Enter your translation").max(5000),
    domain: text(60),
    notes: text(2000),
  })
  .refine((v) => v.source_language_id !== v.language_id, {
    path: ["language_id"],
    message: "Source and target languages must be different",
  });

export const conversationSchema = base.extend({
  type: z.literal("conversation"),
  messages: z
    .array(
      z.object({
        speaker_role: z.string().regex(/^[a-z_]{1,30}$/, "Invalid speaker role"),
        speaker_label: text(60),
        text: z.string().trim().min(1, "Message cannot be empty").max(5000),
        gloss_en: text(5000),
      }),
    )
    .min(2, "A conversation needs at least two messages")
    .max(100, "Conversations are limited to 100 messages"),
});

export const culturalSchema = base.extend({
  type: z.literal("cultural"),
  kind: z.enum(["proverb", "idiom", "folklore", "traditional_story", "greeting", "historical_expression", "indigenous_term", "oral_history"]),
  original_expression: z.string().trim().min(1, "Enter the expression").max(20000),
  meaning: text(4000),
  literal_translation: text(4000),
  usage_context: text(4000),
  region_origin: text(200),
  community_origin: text(200),
  access_notes: text(1000),
});

const storagePath = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[\w.-]{1,100}$/, "Invalid file reference");

export const audioSchema = base.extend({
  type: z.literal("audio"),
  storage_path: storagePath,
  original_filename: text(255),
  mime_type: z.string().max(100),
  file_size_bytes: z.number().int().positive().max(50 * 1024 * 1024),
  checksum_sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  duration_seconds: z.number().nonnegative().max(60 * 60 * 3).optional(),
  recording_method: z.enum(["browser", "upload"]),
  speaker_pseudonym: z.string().trim().min(1, "Enter a speaker pseudonym").max(60),
  speaker_age_band: z.enum(["undisclosed", "18-24", "25-34", "35-49", "50-64", "65+"]).default("undisclosed"),
  speaker_gender: z.enum(["undisclosed", "female", "male", "non_binary", "other"]).default("undisclosed"),
  recording_environment: text(200),
  prompt_text: text(2000),
  transcript: text(20000),
  consent_recording: z.literal(true, { message: "Recording consent is required" }),
  consent_ai_training: z.boolean().default(false),
});

export const documentSchema = base.extend({
  type: z.literal("document"),
  storage_path: storagePath,
  original_filename: z.string().max(255),
  mime_type: z.string().max(120),
  file_type: z.enum(["pdf", "docx", "txt", "epub", "image"]),
  file_size_bytes: z.number().int().positive().max(50 * 1024 * 1024),
  checksum_sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  // document title is required and stored in documents.title
  doc_title: z.string().trim().min(1, "Enter the document title").max(400),
  author: text(300),
  publication_year: z.number().int().min(1500, "Year must be 1500 or later").max(2100, "Year looks wrong").optional(),
  publisher: text(300),
  doc_source: text(500),
  isbn: text(20),
  genre: z.enum(["book", "poetry", "article", "story", "dictionary", "educational", "religious", "government", "other"]),
  copyright_status: z.enum(["own_work", "public_domain", "open_licence", "copyrighted_with_permission", "copyrighted_no_permission", "unknown"]),
  permission_to_digitise: z.boolean(),
  permission_ai_training: z.boolean(),
  is_scanned: z.boolean().default(false),
  is_poetry: z.boolean().default(false),
});

export const contributionSchema = z.discriminatedUnion("type", [
  textSchema,
  translationSchema,
  conversationSchema,
  culturalSchema,
  audioSchema,
  documentSchema,
]);

export type ContributionInput = z.input<typeof contributionSchema>;

export function flattenErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
