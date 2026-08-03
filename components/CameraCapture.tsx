"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

// Webcam / external camera capture with a crop step.
// Flow: pick camera → live preview → capture frame → crop → use photo.
export default function CameraCapture({
  aspect,
  onCaptured,
  onClose,
}: {
  aspect?: number; // e.g. 3/4 for portrait ID photos; undefined = free-ish (4/3)
  onCaptured: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null); // dataURL of captured frame
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(
    async (id?: string) => {
      stopStream();
      setError("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: id ? { deviceId: { exact: id } } : { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        // Device labels only populate after permission is granted.
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter((d) => d.kind === "videoinput");
        setDevices(cams);
        const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId;
        if (activeId) setDeviceId(activeId);
      } catch (e) {
        setError(
          e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")
            ? "Camera permission was denied. Allow camera access in the browser and try again."
            : "Could not start the camera. Check that a webcam or external camera is connected."
        );
      }
    },
    [stopStream]
  );

  useEffect(() => {
    startStream();
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.95));
    stopStream();
  }

  async function confirmCrop() {
    if (!snapshot || !croppedArea) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = snapshot;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(croppedArea.width);
      canvas.height = Math.round(croppedArea.height);
      canvas
        .getContext("2d")!
        .drawImage(
          img,
          croppedArea.x,
          croppedArea.y,
          croppedArea.width,
          croppedArea.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/jpeg", 0.92)
      );
      onCaptured(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch {
      setError("Failed to crop the photo — try capturing again.");
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    setSnapshot(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    startStream(deviceId || undefined);
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="card w-full max-w-2xl overflow-hidden">
        <div className="card-header justify-between">
          <div className="flex items-center gap-2.5">
            <span className="accent-bar" />
            <h2 className="card-title">{snapshot ? "Crop Photo" : "Capture Photo"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-xl font-bold text-stone-400 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error && <div className="alert-error">{error}</div>}

          {!snapshot ? (
            <>
              {devices.length > 1 && (
                <label className="block">
                  <span className="label">Camera (webcam / external device)</span>
                  <select
                    value={deviceId}
                    onChange={(e) => {
                      setDeviceId(e.target.value);
                      startStream(e.target.value);
                    }}
                    className="input"
                  >
                    {devices.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="overflow-hidden rounded-xl bg-black">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={videoRef} playsInline muted className="mx-auto max-h-[55vh] w-full object-contain" />
              </div>
              <div className="flex justify-center gap-3">
                <button type="button" onClick={captureFrame} disabled={!!error} className="btn-primary px-8">
                  📸 Capture
                </button>
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="relative h-[50vh] overflow-hidden rounded-xl bg-black">
                <Cropper
                  image={snapshot}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect ?? 4 / 3}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, areaPixels) => setCroppedArea(areaPixels)}
                />
              </div>
              <label className="block">
                <span className="label">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-maroon-700"
                />
              </label>
              <div className="flex justify-center gap-3">
                <button type="button" onClick={confirmCrop} disabled={busy} className="btn-success px-8">
                  {busy ? "Processing…" : "✓ Use Photo"}
                </button>
                <button type="button" onClick={retake} className="btn-secondary">
                  ↺ Retake
                </button>
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
