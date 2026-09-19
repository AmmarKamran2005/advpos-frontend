"use client";

import * as React from "react";
import { ScanLine, CameraOff, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

/* ───────────────────────────────────────────────────────────────────────────
   SCAN A BARCODE WITH THE DEVICE'S CAMERA

   Opens a small window with the camera in it, watches for a barcode, and hands
   back the first one it reads. Three ways it ends:

     · a barcode is read           -> onDetected(code), window closes
     · three minutes pass          -> "Barcode was not found", window closes
     · the device has no camera    -> "Camera was not found on this device",
                                      and the window never opens a stream

   TWO DECODERS, the fast one first. Chrome, Edge and Android ship a native
   BarcodeDetector that reads straight off the video frame; Safari, iOS and
   Firefox do not. Where it is missing, @zxing/browser does the same job in
   JavaScript. That library is loaded with a dynamic import() only when this
   window actually opens and the native one is absent — it is a few hundred
   kilobytes that most sessions never need, which is exactly what AGENTS.md
   rule 4 is about. Do not "tidy" it into a normal import.

   The camera needs a SECURE page (https, or localhost). On plain http the
   browser does not even offer getUserMedia, and the person is told that
   rather than told they have no camera.
   ─────────────────────────────────────────────────────────────────────────── */

const TIMEOUT_MS = 3 * 60 * 1000;

/* Linear barcodes are what is printed on retail boxes; QR is included because
   a SKU printed by this company may well be a QR code. */
const NATIVE_FORMATS = [
  "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "itf", "codabar", "qr_code",
];

type Stop = () => void;

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
type BarcodeDetectorCtor = {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const stops = React.useRef<Stop[]>([]);
  const done = React.useRef(false);

  const [phase, setPhase] = React.useState<"starting" | "scanning">("starting");
  const [remaining, setRemaining] = React.useState(TIMEOUT_MS / 1000);

  const stopAll = React.useCallback(() => {
    for (const s of stops.current.splice(0)) {
      try { s(); } catch { /* already stopped */ }
    }
  }, []);

  const finish = React.useCallback((code: string | null, error?: { title: string; description?: string }) => {
    if (done.current) return;
    done.current = true;
    stopAll();
    if (code) {
      try { navigator.vibrate?.(80); } catch { /* not every device vibrates */ }
      onDetected(code.trim());
    }
    if (error) toast.error(error.title, error.description ? { description: error.description } : undefined);
    onOpenChange(false);
  }, [onDetected, onOpenChange, stopAll]);

  React.useEffect(() => {
    if (!open) return;

    /* Phase and countdown start fresh because the window is MOUNTED fresh
       each time -- BarcodeFields only renders it while scanning. */
    done.current = false;
    let cancelled = false;

    async function start() {
      /* 1. Is there a camera at all? */
      if (typeof window !== "undefined" && !window.isSecureContext) {
        finish(null, {
          title: "Camera is blocked on this connection",
          description: "The browser only allows the camera on a secure (https) page.",
        });
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        finish(null, { title: "Camera was not found on this device" });
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!devices.some((d) => d.kind === "videoinput")) {
          finish(null, { title: "Camera was not found on this device" });
          return;
        }
      } catch {
        /* enumerateDevices can itself be refused; getUserMedia below will say why. */
      }

      /* 2. Open it — the back camera where there is one, because that is
            the one pointed at a box. */
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        const name = (e as { name?: string })?.name ?? "";
        if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
          finish(null, { title: "Camera was not found on this device" });
        } else if (name === "NotAllowedError" || name === "SecurityError") {
          finish(null, {
            title: "Camera permission was refused",
            description: "Allow the camera for this site in the browser's settings, then scan again.",
          });
        } else if (name === "NotReadableError" || name === "AbortError") {
          finish(null, {
            title: "The camera is busy",
            description: "Another app is using it. Close that app and scan again.",
          });
        } else {
          finish(null, { title: "Camera was not found on this device" });
        }
        return;
      }

      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      stops.current.push(() => stream.getTracks().forEach((t) => t.stop()));

      const video = videoRef.current;
      if (!video) { finish(null); return; }
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;
      try { await video.play(); } catch { /* autoplay can refuse; frames still arrive */ }
      if (cancelled) return;
      setPhase("scanning");

      /* 3. The three-minute limit, and a visible countdown. */
      const started = Date.now();
      const tick = window.setInterval(() => {
        const left = Math.max(0, Math.ceil((TIMEOUT_MS - (Date.now() - started)) / 1000));
        setRemaining(left);
      }, 1000);
      const limit = window.setTimeout(() => {
        finish(null, {
          title: "Barcode was not found",
          description: "The camera looked for three minutes and could not read one. Type it in, or try again in better light.",
        });
      }, TIMEOUT_MS);
      stops.current.push(() => { window.clearInterval(tick); window.clearTimeout(limit); });

      /* 4. Read. Native first. */
      const Native = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (Native) {
        try {
          const supported = (await Native.getSupportedFormats?.()) ?? NATIVE_FORMATS;
          const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
          const detector = new Native(formats.length ? { formats } : undefined);
          let alive = true;
          stops.current.push(() => { alive = false; });

          const loop = async () => {
            if (!alive || done.current) return;
            try {
              if (video.readyState >= 2) {
                const found = await detector.detect(video);
                const code = found.find((f) => f.rawValue?.trim())?.rawValue;
                if (code) { finish(code); return; }
              }
            } catch { /* a frame that cannot be read is not an error */ }
            window.setTimeout(loop, 180);
          };
          void loop();
          return;
        } catch {
          /* Detector exists but will not construct — fall through to zxing. */
        }
      }

      try {
        const [{ BrowserMultiFormatReader }, lib] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (cancelled || done.current) return;

        const hints = new Map();
        hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, [
          lib.BarcodeFormat.EAN_13, lib.BarcodeFormat.EAN_8, lib.BarcodeFormat.UPC_A, lib.BarcodeFormat.UPC_E,
          lib.BarcodeFormat.CODE_128, lib.BarcodeFormat.CODE_39, lib.BarcodeFormat.CODE_93,
          lib.BarcodeFormat.ITF, lib.BarcodeFormat.CODABAR, lib.BarcodeFormat.QR_CODE,
        ]);
        hints.set(lib.DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        const controls = await reader.decodeFromStream(stream, video, (result) => {
          const code = result?.getText();
          if (code) finish(code);
        });
        stops.current.push(() => controls.stop());
      } catch {
        finish(null, {
          title: "The barcode reader could not start",
          description: "Type the barcode in instead.",
        });
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [open, finish, stopAll]);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { done.current = true; stopAll(); } onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-brand-yellow" /> Scan barcode
          </DialogTitle>
          <DialogDescription>
            Hold the barcode inside the frame, about a hand&rsquo;s length from the camera.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-navy-900">
            <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline />

            {/* The frame the person aims at, and a line sweeping through it. */}
            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-24 -translate-y-1/2 rounded-md border-2 border-brand-yellow/80 shadow-[0_0_0_9999px_rgba(3,24,51,0.45)]">
              {phase === "scanning" && (
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-danger/90 animate-pulse" />
              )}
            </div>

            {phase === "starting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs">Starting the camera…</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{phase === "scanning" ? "Looking for a barcode…" : "Asking for the camera…"}</span>
            <span className="tabular" aria-live="polite">Stops in {mm}:{ss}</span>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" className="gap-1.5" onClick={() => { done.current = true; stopAll(); onOpenChange(false); }}>
            <CameraOff className="size-4" /> Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
