"use client";

import * as React from "react";
import axios from "axios";
import { Camera, ImageUp, Loader2, RefreshCw, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   ONE PHOTOGRAPH OF ONE DOCUMENT

   TWO WAYS IN, because the two are not the same thing on the two devices this
   runs on:

     Camera  opens the camera inside the page (getUserMedia) and takes the
             picture here. On a phone this is the back camera; on a laptop it
             is the webcam, which is how somebody at a desk photographs a card
             lying in front of them.
     Upload  a plain file input. On a phone this is the one that offers the
             gallery as well as the camera, which is what the owner asked for
             -- the picture is often already on the phone.

   THE FILE GOES UP THE MOMENT IT IS TAKEN, to the images Cloudinary account
   through /api/upload/image, and only the URL is held here. Six photographs
   held in a form as base64 is six megabytes of React state and a save that
   fails on a bad line with everything lost.

   HTTPS ONLY, for the camera. A browser will not open one on a plain http
   page, which is exactly what a phone pointed at a laptop on the office
   network is -- so that case is named rather than reported as "no camera".
   The Upload button still works there.
   ─────────────────────────────────────────────────────────────────────────── */

export type CaptureValue = { url: string; publicId: string } | null;

export function DocumentCapture({
  label,
  hint,
  value,
  onChange,
  problem,
  folder = "advpos/images/customer-documents",
}: {
  label: string;
  hint?: string;
  value: CaptureValue;
  onChange: (v: CaptureValue) => void;
  /** What the reader said about this picture, when it could not read it. */
  problem?: string | null;
  folder?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const upload = React.useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That picture is larger than 5 MB", {
        description: "Take it again -- the camera button makes a smaller one.",
      });
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name || "document.jpg");
      const res = await axios.post<{ url: string; publicId: string }>(
        `${API_BASE_URL}/upload/image`, form,
        { headers: { ...authHeader() }, params: { folder: folder.replace(/^advpos\/images\/?/, "") } });
      onChange({ url: res.data.url, publicId: res.data.publicId });
    } catch (e) {
      const message = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string })?.message ?? "Please try again."
        : "Please try again.";
      toast.error("That picture did not upload", { description: message });
    } finally {
      setBusy(false);
    }
  }, [folder, onChange]);

  return (
    <div className={cn(
      "rounded-xl border-2 p-3 transition-colors",
      problem ? "border-danger/50 bg-danger/5"
        : value ? "border-success/40 bg-success/5"
        : "border-dashed border-slate-200 dark:border-navy-700"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-navy-900 dark:text-white flex items-center gap-1.5">
            {value && <Check className="size-4 text-success shrink-0" />}
            {label}
          </div>
          {hint && <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
        </div>
        {value && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${label}`}
            onClick={() => onChange(null)}>
            <Trash2 className="size-4 text-danger" />
          </Button>
        )}
      </div>

      {value ? (
        <div className="mt-2 rounded-lg overflow-hidden bg-slate-100 dark:bg-navy-800">
          {/* eslint-disable-next-line @next/next/no-img-element --
              Cloudinary URLs; next/image would need the domain whitelisted. */}
          <img src={value.url} alt={label} className="w-full h-36 sm:h-44 object-contain" />
        </div>
      ) : (
        <div className="mt-2 h-36 sm:h-44 rounded-lg bg-slate-50 dark:bg-navy-800 flex items-center justify-center">
          {busy
            ? <Loader2 className="size-6 animate-spin text-slate-400" />
            : <Camera className="size-7 text-slate-300 dark:text-slate-600" />}
        </div>
      )}

      {problem && (
        <p className="text-2xs text-danger mt-2">{problem}</p>
      )}

      <div className="flex items-center gap-2 mt-2">
        <Button type="button" variant="secondary" size="sm" className="flex-1 gap-1.5"
          disabled={busy} onClick={() => setCameraOpen(true)}>
          {value ? <RefreshCw className="size-4" /> : <Camera className="size-4" />}
          {value ? "Retake" : "Camera"}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="flex-1 gap-1.5"
          disabled={busy} onClick={() => fileRef.current?.click()}>
          <ImageUp className="size-4" />Upload
        </Button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";          // so the same file can be picked twice
            if (f) void upload(f);
          }} />
      </div>

      <CameraDialog
        open={cameraOpen}
        label={label}
        onOpenChange={setCameraOpen}
        onShot={(file) => { setCameraOpen(false); void upload(file); }}
      />
    </div>
  );
}

/* ─────────────────────────── the camera itself ─────────────────────────── */

function CameraDialog({
  open, label, onOpenChange, onShot,
}: {
  open: boolean;
  label: string;
  onOpenChange: (open: boolean) => void;
  onShot: (file: File) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    /* The dialog has just been opened: clear whatever the last attempt said
       before this one starts. */
    async function start() {
      setError(null);
      setReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(window.isSecureContext
          ? "This browser will not open a camera. Use Upload instead."
          : "A camera only works on a secure (https) page. Use Upload instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          /* The back camera on a phone, and whatever there is on a laptop.
             `ideal` rather than `exact` so a device with one camera still
             answers instead of throwing OverconstrainedError. */
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch (e) {
        const name = (e as { name?: string })?.name ?? "";
        setError(
          name === "NotAllowedError"
            ? "The camera was refused. Allow it in the browser, or use Upload."
            : name === "NotFoundError"
              ? "No camera was found on this device. Use Upload instead."
              : name === "NotReadableError"
                ? "Another app is using the camera. Close it and try again."
                : "The camera could not be opened. Use Upload instead.");
      }
    }
    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  function shoot() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    /* JPEG at 0.9: a CNIC has small print on it and a document photograph is
       read by a machine, so this is not the place to save a hundred kilobytes.
       The API refuses anything over 5 MB and this lands well under it. */
    canvas.toBlob((blob) => {
      if (!blob) { toast.error("The picture could not be taken. Try Upload."); return; }
      onShot(new File([blob], `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Fill the frame with the document, hold still, and keep the light off the surface.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5">
          <div className="relative rounded-lg overflow-hidden bg-navy-900 aspect-[4/3]">
            <video ref={videoRef} playsInline muted className="size-full object-cover" />
            {/* A frame to line the card up with -- people hold a CNIC at an
                angle otherwise, and a skewed photograph reads badly. */}
            {ready && !error && (
              <div className="absolute inset-6 border-2 border-white/70 rounded-lg pointer-events-none" />
            )}
            {!ready && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-7 animate-spin text-white/80" />
              </div>
            )}
          </div>
          {error && <p className="text-sm text-danger mt-3">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={!ready || Boolean(error)} onClick={shoot}>
            <Camera className="size-4" />Take the picture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
