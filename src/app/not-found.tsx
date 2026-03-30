import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono), monospace",
        background: "#1a1a1a",
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
        [ 404 ]
      </p>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", marginBottom: "2rem" }}>
        nothing here.
      </p>
      <Link
        href="/"
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: "0.75rem",
          textDecoration: "none",
        }}
      >
        ← back home
      </Link>
    </div>
  );
}
