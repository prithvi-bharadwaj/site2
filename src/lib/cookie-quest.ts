export type CookieChoice = "accepted" | "declined";

export const CONSENT_COOKIE = "crumb-cookie-choice";
export const GAME_SAVE_COOKIE = "crumb-game-save";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readCookieChoice(cookieString = document.cookie): CookieChoice | null {
  const value = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);

  return value === "accepted" || value === "declined" ? value : null;
}

export function saveCookieChoice(choice: CookieChoice) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;

  if (choice === "accepted") {
    const save = encodeURIComponent(JSON.stringify({ pet: "Crumb", treats: 12, level: 1 }));
    document.cookie = `${GAME_SAVE_COOKIE}=${save}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${GAME_SAVE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}
