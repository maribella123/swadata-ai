"use client";

import { useRef, useState } from "react";
import { FileAudio, Mic, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/misc";
import { AudioRecorder, type Recording } from "@/components/contribute/audio-recorder";
import { FormSection, LanguageFields, PermissionsFieldset, toPayload, useCommonState } from "@/components/contribute/common-fields";
import { useSubmitContribution } from "@/components/contribute/use-submit";
import { AUDIO_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { FormContext } from "@/lib/portal-data";
import { removeUpload, sha256Hex, uploadWithProgress } from "@/lib/upload";
import { cn, formatBytes, formatDuration } from "@/lib/utils";

const EXT_MIME: Record<string, string> = { wav: "audio/wav", mp3: "audio/mpeg", webm: "audio/webm", m4a: "audio/mp4", ogg: "audio/ogg", aac: "audio/aac" };

function readDuration(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration)) return resolve(a.duration);
      // WebM from some recorders reports Infinity until seeked
      a.currentTime = 1e7;
      a.ontimeupdate = () => { a.ontimeupdate = null; resolve(Number.isFinite(a.duration) ? a.duration : undefined); };
    };
    a.onerror = () => resolve(undefined);
    a.src = url;
  });
}

export function AudioForm({ ctx, transcriptionEnabled }: { ctx: FormContext; transcriptionEnabled: boolean }) {
  const common = useCommonState(ctx, { category_id: ctx.categories.find((c) => c.key === "spontaneous_speech")?.id ?? "" });
  const { submit, pending, errors, formError, setFormError } = useSubmitContribution();
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [file, setFile] = useState<{ file: File; url: string; mime: string; duration?: number } | null>(null);
  const [meta, setMeta] = useState({ speaker_pseudonym: "", speaker_age_band: "undisclosed", speaker_gender: "undisclosed", recording_environment: "", prompt_text: "", transcript: "" });
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentAI, setConsentAI] = useState(ctx.defaultPermissions.allow_ai_training);
  const [progress, setProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const setM = (k: keyof typeof meta) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setMeta((m) => ({ ...m, [k]: e.target.value }));

  async function onFile(f: File | undefined) {
    if (!f) return;
    setFormError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = AUDIO_MIME_TYPES.includes(f.type) ? f.type : EXT_MIME[ext];
    if (!mime) return setFormError("Unsupported audio format. Please upload WAV, MP3, WebM, M4A or OGG.");
    if (f.size > MAX_UPLOAD_BYTES) return setFormError("This file is larger than the 50 MB limit.");
    if (file) URL.revokeObjectURL(file.url);
    const url = URL.createObjectURL(f);
    setFile({ file: f, url, mime, duration: await readDuration(url) });
  }

  const blob = mode === "record" ? recording?.blob : file?.file;
  const busy = pending || progress !== null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!blob) return setFormError(mode === "record" ? "Please make a recording first." : "Please choose an audio file.");
    if (!consentRecording) return setFormError("Please confirm the recording consent.");
    const mime = mode === "record" ? recording!.mimeType : file!.mime;
    const name = mode === "record" ? `recording.${mime.includes("mp4") ? "m4a" : mime.split("/")[1]}` : file!.file.name;
    const duration = mode === "record" ? recording!.duration : file!.duration;
    let path: string | null = null;
    try {
      setProgress(0);
      const checksum = await sha256Hex(blob);
      ({ path } = await uploadWithProgress("audio", blob, name, mime, setProgress));
      const uploaded = path;
      const ok = await submit(
        {
          type: "audio",
          ...toPayload(common.state),
          ...meta,
          storage_path: uploaded,
          original_filename: name,
          mime_type: mime,
          file_size_bytes: blob.size,
          checksum_sha256: checksum,
          duration_seconds: duration ? Math.round(duration * 1000) / 1000 : undefined,
          recording_method: mode === "record" ? "browser" : "upload",
          consent_recording: true,
          consent_ai_training: consentAI,
        },
        {
          successMessage: "Recording submitted for review. Thank you!",
          onSuccess: () => {
            setRecording(null);
            setFile(null);
            setMeta((m) => ({ ...m, prompt_text: "", transcript: "" }));
          },
        },
      );
      if (!ok) await removeUpload("audio", uploaded);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed.");
      if (path) await removeUpload("audio", path);
    } finally {
      setProgress(null);
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {formError && <Alert tone="danger">{formError}</Alert>}
      <FormSection title="Language">
        <LanguageFields ctx={ctx} state={common.state} set={common.set} errors={errors} />
      </FormSection>

      <FormSection title="Audio">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-mist p-1" role="tablist">
          {(["record", "upload"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn("flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold", mode === m ? "bg-white text-navy-900 shadow-sm" : "text-slate-500")}>
              {m === "record" ? <><Mic className="size-4" /> Record in browser</> : <><Upload className="size-4" /> Upload a file</>}
            </button>
          ))}
        </div>
        <Field label="Prompt or topic" htmlFor="prompt_text" hint="If you are reading a text aloud, paste it here.">
          <Textarea id="prompt_text" value={meta.prompt_text} onChange={setM("prompt_text")} rows={2} spellCheck={false} />
        </Field>
        {mode === "record" ? (
          <AudioRecorder value={recording} onChange={setRecording} />
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
            className="rounded-2xl border-2 border-dashed border-navy-200 bg-ivory/50 p-6 text-center"
          >
            {file ? (
              <div className="space-y-3 text-left">
                <p className="flex items-center gap-2 text-sm font-semibold text-navy-900"><FileAudio className="size-4" /> {file.file.name} · {formatBytes(file.file.size)}{file.duration ? ` · ${formatDuration(file.duration)}` : ""}</p>
                <audio controls src={file.url} className="w-full" />
                <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => { URL.revokeObjectURL(file.url); setFile(null); }}>Remove file</Button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto size-8 text-forest-700" />
                <p className="mt-2 text-sm font-semibold text-navy-900">Drag an audio file here, or</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>Choose file</Button>
                <p className="mt-2 text-xs text-slate-500">WAV, MP3, WebM, M4A or OGG · up to 50 MB</p>
              </>
            )}
            <input ref={inputRef} type="file" accept="audio/*,.wav,.mp3,.webm,.m4a,.ogg" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Audio file" />
          </div>
        )}
        <Field label="Transcript" htmlFor="transcript" hint={transcriptionEnabled ? "Optional. If left empty, an automatic draft may be generated for reviewers to correct — accuracy varies by language." : "Optional but very valuable: write exactly what is said."}>
          <Textarea id="transcript" value={meta.transcript} onChange={setM("transcript")} rows={3} spellCheck={false} />
        </Field>
      </FormSection>

      <FormSection title="Speaker (pseudonymised)" description="Do not use real names. Age band and gender are optional and help researchers measure fairness.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Speaker pseudonym" htmlFor="speaker_pseudonym" required error={errors.speaker_pseudonym} hint="e.g. Speaker-Lilanga">
            <Input id="speaker_pseudonym" value={meta.speaker_pseudonym} onChange={setM("speaker_pseudonym")} maxLength={60} required />
          </Field>
          <Field label="Age band" htmlFor="speaker_age_band">
            <Select id="speaker_age_band" value={meta.speaker_age_band} onChange={setM("speaker_age_band")}>
              {["undisclosed", "18-24", "25-34", "35-49", "50-64", "65+"].map((a) => <option key={a} value={a}>{a === "undisclosed" ? "Prefer not to say" : a}</option>)}
            </Select>
          </Field>
          <Field label="Gender" htmlFor="speaker_gender">
            <Select id="speaker_gender" value={meta.speaker_gender} onChange={setM("speaker_gender")}>
              <option value="undisclosed">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option><option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Recording environment" htmlFor="recording_environment" hint="e.g. quiet room, outdoors">
            <Input id="recording_environment" value={meta.recording_environment} onChange={setM("recording_environment")} maxLength={200} />
          </Field>
        </div>
        <div className="rounded-xl border border-gold-400/40 bg-gold-100/60 p-3">
          <Checkbox id="consent_recording" checked={consentRecording} onChange={(e) => setConsentRecording(e.target.checked)} required label="I am the speaker (or have the speaker's explicit consent) and agree to this recording being stored and reviewed." description="Everyone audible in the recording has agreed to be recorded." />
          <Checkbox id="consent_ai" checked={consentAI} onChange={(e) => { setConsentAI(e.target.checked); common.set("permissions", { ...common.state.permissions, allow_ai_training: e.target.checked }); }} label="I agree that this recording may be used to train speech and language AI models." />
        </div>
      </FormSection>

      <PermissionsFieldset value={common.state.permissions} onChange={(p) => { common.set("permissions", p); setConsentAI(p.allow_ai_training); }} />

      {progress !== null && (
        <div className="space-y-1.5" aria-live="polite">
          <p className="text-sm font-medium text-navy-900">Uploading… {progress}%</p>
          <Progress value={progress} label="Upload progress" />
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={busy || !blob}>{busy ? "Uploading…" : "Submit recording"}</Button>
      </div>
    </form>
  );
}
