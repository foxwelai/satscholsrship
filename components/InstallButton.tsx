"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Detect the browser so we can show the right manual-install hint.
function getBrowserHint(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua))
    return 'Tap the Share button (□↑) in Safari, then "Add to Home Screen".';
  if (/Android/.test(ua))
    return 'Tap the browser menu (⋮) and choose "Add to Home Screen" or "Install app".';
  // Desktop
  if (/Chrome|Chromium/.test(ua) && !/Edg/.test(ua))
    return 'Click the install icon (⊕) in the address bar, or open Chrome menu → "Install SAT Scholarship".';
  if (/Edg/.test(ua))
    return 'Click the install icon (…+) in the address bar, or open Edge menu → "Apps" → "Install this site as an app".';
  return 'Open your browser menu and look for "Install" or "Add to Home Screen".';
}

export default function InstallButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // null = checking, true = already standalone, false = in browser
  const [isStandalone, setIsStandalone] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Already running as installed PWA — hide button entirely
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
      return;
    }
    setIsStandalone(false);

    function onPrompt(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setIsStandalone(true);
      setShowHint(false);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Close hint when clicking outside
  useEffect(() => {
    if (!showHint) return;
    function onClickOutside(e: MouseEvent) {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowHint(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showHint]);

  // Still detecting, or already installed as standalone — show nothing
  if (isStandalone !== false) return null;

  async function handleClick() {
    if (prompt) {
      // Chrome/Edge desktop/Android: show native install dialog
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setIsStandalone(true);
      setPrompt(null);
    } else {
      // Safari / Firefox / first visit before Chrome fires the event
      setShowHint((v) => !v);
    }
  }

  return (
    <div className="relative" ref={hintRef}>
      <button
        type="button"
        onClick={handleClick}
        title="Install this app on your device"
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gold-400/50 bg-white/10 px-3 py-1.5 text-xs font-semibold text-gold-300 transition-colors hover:bg-white/20 hover:text-gold-200"
      >
        {/* Download / install icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        >
          <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
        </svg>
        Install App
      </button>

      {/* Manual-install hint for Safari / Firefox / pre-prompt Chrome */}
      {showHint && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-cream-300 bg-white p-4 shadow-xl">
          <p className="text-[13px] font-semibold text-maroon-800">Install this app</p>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
            {getBrowserHint()}
          </p>
          <button
            type="button"
            onClick={() => setShowHint(false)}
            className="mt-3 text-xs font-semibold text-stone-400 hover:text-stone-600"
          >
            Got it ✕
          </button>
        </div>
      )}
    </div>
  );
}
