"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { resizeImage } from "@/lib/admin/resize-image";
import { createClient } from "@/lib/supabase/browser";

const BUCKET = "recipe-previews";
const UPLOAD_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Upload timed out")), UPLOAD_TIMEOUT_MS)),
  ]);
}

type PhotoFieldProps = {
  initialUrl: string;
  error?: string;
  onChange: () => void;
};

/**
 * Pick a photo, shrink it in the browser, upload it to the public recipe
 * photo bucket and keep its address in a hidden "imageUrl" form field.
 */
export default function PhotoField({ initialUrl, error, onChange }: PhotoFieldProps) {
  const id = useId();
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<"idle" | "working" | "failed">("idle");

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setStatus("working");
    try {
      const photo = await resizeImage(file);
      const extension = photo.type === "image/webp" ? "webp" : "jpg";
      const path = `admin/${crypto.randomUUID()}.${extension}`;
      const storage = createClient().storage.from(BUCKET);
      const { error: uploadError } = await withTimeout(
        storage.upload(path, photo, {
          contentType: photo.type,
          cacheControl: "31536000",
          upsert: false,
        })
      );
      if (uploadError) throw uploadError;
      setUrl(storage.getPublicUrl(path).data.publicUrl);
      setStatus("idle");
      onChange();
    } catch {
      setStatus("failed");
    } finally {
      input.value = "";
    }
  }

  const message =
    status === "failed"
      ? "That photo didn't upload. Try a JPG or PNG, or check your connection."
      : error;

  return (
    <div className="grid gap-2">
      <span id={`${id}-label`} className="font-semibold">
        Photo
      </span>
      <input type="hidden" name="imageUrl" value={url} />
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr] sm:items-center">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-surface-muted">
          {url ? (
            <Image src={url} alt="Recipe photo" fill sizes="(min-width: 640px) 12rem, 100vw" unoptimized className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-text-muted">No photo yet</span>
          )}
        </div>
        <div className="grid gap-2">
          <label
            htmlFor={`${id}-file`}
            className="inline-flex min-h-12 w-fit cursor-pointer items-center justify-center rounded-xl border border-border-control bg-surface px-5 font-semibold text-foreground hover:bg-surface-muted has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
          >
            {status === "working" ? "Uploading…" : url ? "Change photo" : "Choose photo"}
            <input
              id={`${id}-file`}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              aria-describedby={`${id}-hint${message ? ` ${id}-error` : ""}`}
              disabled={status === "working"}
              onChange={handleFile}
              className="sr-only"
            />
          </label>
          <p id={`${id}-hint`} className="text-sm text-text-muted">
            The photo is resized for the web before it uploads.
          </p>
          {url ? (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                onChange();
              }}
              className="w-fit text-sm font-semibold text-action underline underline-offset-4"
            >
              Remove photo
            </button>
          ) : null}
          {message ? (
            <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-danger">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
