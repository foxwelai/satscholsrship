"use client";

import { useRef, useState } from "react";
import type { PhotoType } from "@/lib/cloudinary";
import ImageLightbox from "./ImageLightbox";
import CameraCapture from "./CameraCapture";

interface PhotoUploadProps {
  label: string;
  photoType: PhotoType;
  studentId: string;
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  required?: boolean;
}

export default function PhotoUpload({
  label,
  photoType,
  onUploadComplete,
  currentUrl,
  required = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setError("");
    setUploading(true);
    try {
      // Show a local preview while uploading
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", photoType);

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }
      const data = await response.json();
      setPreview(data.path);
      onUploadComplete(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="block">
      <label className="label">
        {label}
        {required && <span className="text-maroon-700">*</span>}
      </label>

      <div className="flex gap-4">
        {preview && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            title="Click to enlarge"
            className="group relative h-32 w-32 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-cream-200 bg-gray-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            {uploading ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs font-bold text-white">
                Uploading…
              </span>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xl opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                🔍
              </span>
            )}
          </button>
        )}

        <div className="flex flex-1 flex-col justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border-2 border-dashed border-cream-300 px-4 py-2.5 text-sm font-semibold text-maroon-700 transition hover:border-maroon-400 hover:bg-maroon-50 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : preview ? "Change Photo" : "📷 Upload Photo"}
            </button>
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              disabled={uploading}
              className="rounded-lg border-2 border-dashed border-navy-100 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:border-navy-600 hover:bg-navy-100/40 disabled:opacity-50"
              title="Capture from webcam or a connected camera, then crop"
            >
              📸 Capture
            </button>
          </div>

          <p className="text-xs text-stone-500">
            JPG, PNG or WebP, max 10MB. Click the photo to enlarge. Capture uses your webcam or an
            external camera and lets you crop before saving.
          </p>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f);
          e.target.value = "";
        }}
        disabled={uploading}
        className="hidden"
        aria-label={label}
      />

      {lightboxOpen && preview && (
        <ImageLightbox src={preview} alt={label} onClose={() => setLightboxOpen(false)} />
      )}

      {cameraOpen && (
        <CameraCapture
          aspect={photoType === "profile" ? 3 / 4 : undefined}
          onCaptured={(file) => {
            setCameraOpen(false);
            uploadFile(file);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
