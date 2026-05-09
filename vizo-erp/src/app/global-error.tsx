"use client";

import { AlertOctagon } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0f1a", color: "#fff", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(239,68,68,0.1)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <AlertOctagon size={32} color="#EF4444" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Critical error</h1>
            <p style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>
              The application encountered a fatal error. Please refresh the page or contact support.
            </p>
            {error.digest && (
              <div style={{ marginTop: 16, padding: "4px 10px", background: "#142E54", display: "inline-block", borderRadius: 4, fontFamily: "monospace", fontSize: 11, color: "#94A3B8" }}>
                {error.digest}
              </div>
            )}
            <div style={{ marginTop: 24 }}>
              <button
                onClick={reset}
                style={{ padding: "10px 20px", background: "#EDC705", color: "#031833", border: 0, borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
