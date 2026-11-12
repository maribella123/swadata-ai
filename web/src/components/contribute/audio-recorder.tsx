"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

export type Recording = { blob: Blob; url: string; mimeType: string; duration: number };

function pickMime() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

/** Browser microphone recorder with live level meter, pause/resume, playback and discard. */
export function AudioRecorder({ value, onChange, maxSeconds = 600 }: { value: Recording | null; onChange: (r: Recording | null) => void; maxSeconds?: number }) {
  const [state, setState] = useState<"idle" | "recording" | "paused">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => () => cleanup(), []);

  function cleanup() {
    if (timer.current) window.clearInterval(timer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support microphone recording. Please upload a file instead.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
      stream.current = s;
      const mimeType = pickMime();
      const r = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        const type = (r.mimeType || mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunks.current, { type });
        if (value) URL.revokeObjectURL(value.url);
        onChange({ blob, url: URL.createObjectURL(blob), mimeType: type, duration: elapsedRef.current });
        cleanup();
      };
      r.start(1000);
      rec.current = r;
      elapsedRef.current = 0;
      setElapsed(0);
      setState("recording");
      timer.current = window.setInterval(() => {
        if (rec.current?.state === "recording") {
          elapsedRef.current += 0.25;
          setElapsed(elapsedRef.current);
          if (elapsedRef.current >= maxSeconds) stop();
        }
      }, 250);
      // level meter
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const data = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(peak / 128);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? "Microphone access was blocked. Allow microphone access in your browser settings and try again." : "Could not start recording. Check that a microphone is connected.");
      cleanup();
    }
  }

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    setState("idle");
  }

  function togglePause() {
    if (!rec.current) return;
    if (rec.current.state === "recording") {
      rec.current.pause();
      setState("paused");
    } else {
      rec.current.resume();
      setState("recording");
    }
  }

  function discard() {
    if (value) URL.revokeObjectURL(value.url);
    onChange(null);
    setElapsed(0);
  }

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-white to-ivory p-5">
      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-danger" role="alert">{error}</p>}
      {value && state === "idle" ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-navy-900">Your recording · {formatDuration(value.duration)}</p>
          <audio controls src={value.url} className="w-full" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { discard(); start(); }}><RotateCcw /> Record again</Button>
            <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={discard}><Trash2 /> Delete recording</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 transition-transform" style={{ transform: `scale(${1 + level * 1.2})` }} aria-hidden />
            <button
              type="button"
              onClick={state === "idle" ? start : stop}
              className={`relative grid size-20 place-items-center rounded-full text-white shadow-lg transition-colors ${state === "idle" ? "bg-forest-700 hover:bg-forest-800" : "bg-danger hover:bg-red-800"}`}
              aria-label={state === "idle" ? "Start recording" : "Stop recording"}
            >
              {state === "idle" ? <Mic className="size-8" /> : <Square className="size-7" />}
            </button>
          </div>
          <p className="font-display text-3xl tabular-nums text-navy-900" aria-live="polite">{formatDuration(elapsed)}</p>
          <p className="text-sm text-slate-500">
            {state === "idle" ? "Tap to start recording (max 10 minutes)" : state === "paused" ? "Paused" : "Recording… tap the square to stop"}
          </p>
          {state !== "idle" && (
            <Button type="button" variant="outline" size="sm" onClick={togglePause}>
              {state === "paused" ? <><Play /> Resume</> : <><Pause /> Pause</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
