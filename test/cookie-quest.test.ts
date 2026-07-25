import { beforeEach, describe, expect, it } from "vitest";
import {
  CONSENT_COOKIE,
  GAME_SAVE_COOKIE,
  readCookieChoice,
  saveCookieChoice,
} from "@/lib/cookie-quest";

describe("cookie quest storage", () => {
  beforeEach(() => {
    document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
    document.cookie = `${GAME_SAVE_COOKIE}=; Max-Age=0; Path=/`;
  });

  it("reads only valid consent choices", () => {
    expect(readCookieChoice("foo=bar; crumb-cookie-choice=accepted")).toBe("accepted");
    expect(readCookieChoice("crumb-cookie-choice=maybe")).toBeNull();
  });

  it("creates a tiny game save when cookies are allowed", () => {
    saveCookieChoice("accepted");

    expect(document.cookie).toContain(`${CONSENT_COOKIE}=accepted`);
    expect(document.cookie).toContain(`${GAME_SAVE_COOKIE}=`);
  });

  it("removes the game save when cookies are declined", () => {
    saveCookieChoice("accepted");
    saveCookieChoice("declined");

    expect(document.cookie).toContain(`${CONSENT_COOKIE}=declined`);
    expect(document.cookie).not.toContain(`${GAME_SAVE_COOKIE}=`);
  });
});
