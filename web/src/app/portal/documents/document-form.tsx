"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/misc";
import { FormSection, LanguageFields, PermissionsFieldset, toPayload, useCommonState } from "@/components/contribute/common-fields";
import { useSubmitContribution } from "@/components/contribute/use-submit";
import { COPYRIGHT_OPTIONS, DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { FormContext } from "@/lib/portal-data";
import { removeUpload, sha256Hex, uploadWithProgress } from "@/lib/upload";
import { formatBytes } from "@/lib/utils";

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  epub: "application/epub+zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

const GENRES = [
  ["book", "Book"], ["poetry", "Poetry / poems"], ["article", "Article"], ["story", "Story"], ["dictionary", "Dictionary / word list"],
  ["educational", "Educational"], ["religious", "Religious text"], ["government", "Government / civic"], ["other", "Other"],
] as const;

const EMPTY = { doc_title: "", author: "", publication_year: "", publisher: "", doc_source: "", isbn: "", genre: "book", copyright_status: "unknown" };

export function DocumentForm({ ctx }: { ctx: FormContext }) {
  const common = useCommonState(ctx, { source_type: "published", is_original: false });
  const { submit, pending, errors, formError, setFormError } = useSubmitContribution();
  const [file, setFile] = useState<{ file: File; mime: string; fileType: string } | null>(null);
  const [m, setM] = useState(EMPTY);
  const [flags, setFlags] = useState({ is_scanned: false, is_poetry: false, permission_to_digitise: false, permission_ai_training: false });
  const [progress, setProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setM((s) => ({ ...s, [k]: e.target.value }));
  const copyrighted = m.copyright_status.startsWith("copyrighted") || m.copyright_status === "unknown";

  function onFile(f?: File) {
    if (!f) return;
    setFormError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = DOCUMENT_TYPES[f.type] ? f.type : EXT_MIME[ext];
    if (!mime || !DOCUMENT_TYPES[mime]) return setFormError("Unsupported file type. Upload PDF, DOCX, TXT, EPUB or a scanned image (PNG, JPEG, TIFF, WebP).");
    if (f.size > MAX_UPLOAD_BYTES) return setFormError(`This file is ${formatBytes(f.size)}. The limit is 50 MB — split large books into parts.`);
    const fileType = DOCUMENT_TYPES[mime].fileType;
    setFile({ file: f, mime, fileType });
    setFlags((s) => ({ ...s, is_scanned: fileType === "image" ? true : s.is_scanned }));
    if (!m.doc_title) setM((s) => ({ ...s, doc_title: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setFormError("Please choose a document to upload.");
    let path: string | null = null;
    try {
      setProgress(0);
      const checksum = await sha256Hex(file.file);
      ({ path } = await uploadWithProgress("documents", file.file, file.file.name, file.mime, setProgress));
      const ok = await submit(
        {
          type: "document",
          ...toPayload(common.state),
          ...m,
          ...flags,
          is_poetry: flags.is_poetry || m.genre === "poetry",
          publication_year: m.publication_year && !Number.isNaN(Number(m.publication_year)) ? Number(m.publication_year) : undefined,
          storage_path: path,
          original_filename: file.file.name,
          mime_type: file.mime,
          file_type: file.fileType,
          file_size_bytes: file.file.size,
          checksum_sha256: checksum,
        },
        {
          successMessage: "Document uploaded. Text extraction has been queued — you'll see progress under My Contributions.",
          onSuccess: () => { setFile(null); setM(EMPTY); },
        },
      );
      if (!ok && path) await removeUpload("documents", path);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed.");
      if (path) await removeUpload("documents", path);
    } finally {
      setProgress(null);
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {formError && <Alert tone="danger">{formError}</Alert>}
      <FormSection title="File">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
          className="rounded-2xl border-2 border-dashed border-navy-200 bg-ivory/50 p-6 text-center"
        >
          {file ? (
            <div className="flex items-center justify-between gap-3 text-left">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-forest-700 shadow-sm"><FileText className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy-900">{file.file.name}</span>
                  <span className="text-xs text-slate-500">{DOCUMENT_TYPES[file.mime].label} · {formatBytes(file.file.size)}</span>
                </span>
              </span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file"><X /></Button>
            </div>
          ) : (
            <>
              <Upload className="mx-auto size-8 text-forest-700" />
              <p className="mt-2 text-sm font-semibold text-navy-900">Drag a document here, or</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>Choose file</Button>
              <p className="mt-2 text-xs text-slate-500">PDF, DOCX, TXT, EPUB, or scanned PNG/JPEG/TIFF · up to 50 MB</p>
            </>
          )}
          <input ref={inputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.epub,.png,.jpg,.jpeg,.tif,.tiff,.webp" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Document file" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox id="is_scanned" checked={flags.is_scanned} onChange={(e) => setFlags((s) => ({ ...s, is_scanned: e.target.checked }))} label="This is a scanned document" description="Applies OCR (optical character recognition)." />
          <Checkbox id="is_poetry" checked={flags.is_poetry} onChange={(e) => setFlags((s) => ({ ...s, is_poetry: e.target.checked }))} label="Contains poetry" description="Preserves line and stanza structure." />
        </div>
      </FormSection>

      <FormSection title="Language">
        <LanguageFields ctx={ctx} state={common.state} set={common.set} errors={errors} label="Document language" />
      </FormSection>

      <FormSection title="Document details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Title" htmlFor="doc_title" required error={errors.doc_title}><Input id="doc_title" value={m.doc_title} onChange={set("doc_title")} maxLength={400} /></Field>
          <Field label="Author" htmlFor="author"><Input id="author" value={m.author} onChange={set("author")} /></Field>
          <Field label="Publication year" htmlFor="publication_year" error={errors.publication_year}><Input id="publication_year" type="number" inputMode="numeric" min={1500} max={2100} value={m.publication_year} onChange={set("publication_year")} /></Field>
          <Field label="Genre" htmlFor="genre"><Select id="genre" value={m.genre} onChange={set("genre")}>{GENRES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Publisher" htmlFor="publisher"><Input id="publisher" value={m.publisher} onChange={set("publisher")} /></Field>
          <Field label="Source" htmlFor="doc_source" hint="Library, archive, URL or collection"><Input id="doc_source" value={m.doc_source} onChange={set("doc_source")} /></Field>
          <Field label="ISBN" htmlFor="isbn" hint="Optional"><Input id="isbn" value={m.isbn} onChange={set("isbn")} maxLength={20} /></Field>
        </div>
      </FormSection>

      <FormSection title="Rights and permissions" description="Copyrighted material is never added to public or training datasets until a linguist or administrator verifies the rights.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Copyright status" htmlFor="copyright_status" required>
            <Select id="copyright_status" value={m.copyright_status} onChange={set("copyright_status")}>{COPYRIGHT_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
          </Field>
          <Field label="Licence" htmlFor="license_id">
            <Select id="license_id" value={common.state.license_id} onChange={(e) => common.set("license_id", e.target.value)}>
              <option value="">Unknown / none</option>
              {ctx.licences.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox id="permission_to_digitise" checked={flags.permission_to_digitise} onChange={(e) => setFlags((s) => ({ ...s, permission_to_digitise: e.target.checked }))} label="Permission to digitise" description="I own the rights, the work is public domain/openly licensed, or I have the rights holder's permission." />
          <Checkbox id="permission_ai_training" checked={flags.permission_ai_training} onChange={(e) => setFlags((s) => ({ ...s, permission_ai_training: e.target.checked }))} label="Permission to use for AI training" description="The rights allow the text to be used to train AI models." />
        </div>
        {copyrighted && <Alert tone="warning">This document will be held for rights verification. Its extracted text can be reviewed but will not enter any dataset until rights are verified.</Alert>}
      </FormSection>

      <PermissionsFieldset value={common.state.permissions} onChange={(p) => common.set("permissions", p)} showRightsHolder />

      {progress !== null && (
        <div className="space-y-1.5" aria-live="polite">
          <p className="text-sm font-medium text-navy-900">Uploading… {progress}%</p>
          <Progress value={progress} label="Upload progress" />
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending || progress !== null || !file}>{pending || progress !== null ? "Uploading…" : "Upload and extract"}</Button>
      </div>
    </form>
  );
}
