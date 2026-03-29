"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        fontFamily: "'Red Hat Display', sans-serif",
        background: "#000",
        color: "#fff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "1rem" }}>
        [ error ]
      </p>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", marginBottom: "2rem" }}>
        something broke. it happens.
      </p>
      <button
        onClick={reset}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "rgba(255,255,255,0.5)",
          padding: "0.5rem 1.5rem",
          fontFamily: "inherit",
          fontSize: "0.75rem",
          cursor: "pointer",
        }}
      >
        try again
      </button>
    </div>
  );
}
