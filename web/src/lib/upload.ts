"use client";

import { createClient } from "@/lib/supabase/client";
import { safeFileName } from "@/lib/utils";

export async function sha256Hex(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Uploads a file to a private Supabase Storage bucket with real progress events
 * (XHR against the Storage REST API using the user's own access token, so
 * storage RLS policies apply). Path: {userId}/{uuid}/{safe-name}.
 */
export async function uploadWithProgress(
  bucket: "audio" | "documents",
  file: Blob,
  fileName: string,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<{ path: string }> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Please sign in again.");
  const path = `${session.user.id}/${crypto.randomUUID()}/${safeFileName(fileName)}`;
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
    xhr.setRequestHeader("cache-control", "3600");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = "Upload failed.";
      try {
        const body = JSON.parse(xhr.responseText);
        msg = body.message || body.error || msg;
      } catch {}
      if (xhr.status === 413 || /size/i.test(msg)) msg = "This file is larger than the 50 MB limit.";
      if (/mime/i.test(msg)) msg = "This file type is not accepted.";
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Please check your connection and try again."));
    xhr.send(file);
  });
  onProgress(100);
  return { path };
}

export async function removeUpload(bucket: "audio" | "documents", path: string) {
  const supabase = createClient();
  await supabase.storage.from(bucket).remove([path]);
}
