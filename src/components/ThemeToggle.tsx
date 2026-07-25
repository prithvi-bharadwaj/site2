"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "prithvi-theme";

/**
 * Dark mode toggle - fixed top right. A tiny sun/moon dot in the site's
 * minimal language. The pre-hydration script in layout.tsx applies the
 * stored theme class before paint; this component just flips it.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "light mode" : "dark mode"}
      className="theme-toggle fixed top-2 right-2 z-[70] h-11 w-11 rounded-full cursor-pointer flex items-center justify-center text-(--ink)/40 hover:text-(--ink)/80 transition-colors"
    >
      {dark ? (
        // Sun - minimal dot with rays
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
        </svg>
      ) : (
        // Moon - minimal crescent
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.4 14.4A8.5 8.5 0 0 1 9.6 3.6a8.5 8.5 0 1 0 10.8 10.8z" />
        </svg>
      )}
    </button>
  );
}
