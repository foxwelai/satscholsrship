"use client";

import { useEffect } from "react";

// Full-screen image viewer. Closes on backdrop click, the × button, or Escape.
export default function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-5 cursor-pointer text-3xl font-bold text-white/80 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? "Enlarged photo"}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}
