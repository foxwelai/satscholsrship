"use client";

import { useState, useRef } from "react";
import { uploadToCloudinary, type PhotoType } from "@/lib/cloudinary";

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
  studentId,
  onUploadComplete,
  currentUrl,
  required = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setError("");
    setUploading(true);

    try {
      // Show preview while uploading
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Cloudinary
      const url = await uploadToCloudinary(file, photoType, studentId);
      onUploadComplete(url);
    } catch (err) {
      setError("Failed to upload image. Please try again.");
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
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-cream-200 bg-gray-100">
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-xs font-bold text-white">Uploading…</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col justify-between">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-block rounded-lg border-2 border-dashed border-cream-300 px-4 py-3 text-sm font-semibold text-maroon-700 transition hover:border-maroon-400 hover:bg-maroon-50 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : preview ? "Change Photo" : "Upload Photo"}
          </button>

          <p className="text-xs text-stone-500">
            JPG or PNG, max 5MB
          </p>

          {error && (
            <p className="text-xs font-semibold text-red-600">{error}</p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
        aria-label={label}
      />
    </div>
  );
}
