"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { layoutHero, type PositionedWord } from "@/lib/pretext-layout";
import {
  createCookieParticles,
  stepCookiePhysics,
  type CookieParticle,
} from "@/lib/cookie-physics";
import { saveCookieChoice } from "@/lib/cookie-quest";

type Phase = "idle" | "opening" | "falling" | "complete" | "declined" | "closing";
type PetMood =
  | "sad"
  | "tracking"
  | "open"
  | "chew"
  | "happy"
  | "bonked"
  | "blush"
  | "alert"
  | "drool"
  | "startle"
  | "squash"
  | "lick";

const LABEL = "allow cookies";
const BUTTON_WIDTH = 132;
const FONT = '500 10px "SFMono-Regular", Consolas, monospace';

function layoutLabel(): PositionedWord[] {
  return layoutHero({
    containerWidth: BUTTON_WIDTH,
    sections: [{
      blocks: [{ text: LABEL, type: "label", charLevel: true, baseOpacity: 1 }],
      font: FONT,
      fontSize: 10,
      lineHeight: 16,
      marginBottom: 0,
    }],
  }).words;
}

// Sprite renderer over public/images/crumb-sprites.png (3 × 2 grid, one pose
// per mood). The outline sheet is a currentColor mask layered on a --bg
// silhouette mask so cookies never show through the body in either theme.
const SpritePet = forwardRef<HTMLDivElement, { mood: PetMood; onTap: () => void }>(
  function SpritePet({ mood, onTap }, ref) {
    return (
      <div ref={ref} className="crumb-pet" data-mood={mood} onClick={onTap} aria-hidden="true">
        <div className="crumb-pet-sprite" />
      </div>
    );
  },
);

function playClick() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1250;
    gain.gain.setValueAtTime(0.055, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio is a garnish; stay silent if the context is unavailable.
  }
}

function CookieParticleView({
  particle,
  register,
}: {
  particle: CookieParticle;
  register: (id: number, node: HTMLDivElement | null) => void;
}) {
  const dotCount = 3 + (particle.id % 3);
  return (
    <div ref={(node) => register(particle.id, node)} className="crumb-particle" aria-hidden="true">
      <span className="crumb-particle-letter">{particle.char}</span>
      <span className="crumb-particle-cookie">
        {Array.from({ length: dotCount }, (_, dot) => (
          <i key={dot} style={{ "--dot": dot } as CSSProperties} />
        ))}
      </span>
    </div>
  );
}

export function CookieQuest() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [petMood, setPetMood] = useState<PetMood>("sad");
  const [letters, setLetters] = useState<PositionedWord[]>([]);
  const [particles, setParticles] = useState<CookieParticle[]>([]);
  const [impact, setImpact] = useState<{ x: number; y: number } | null>(null);
  const letterRefs = useRef(new Map<number, HTMLSpanElement>());
  const particleRefs = useRef(new Map<number, HTMLDivElement>());
  const petRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const allowRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef(0);
  const dropRafRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const completedRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(dropRafRef.current);
  }, []);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setLetters(layoutLabel());
      setReady(true);
    });
    return clearTimers;
  }, [clearTimers]);

  const openDialog = useCallback(() => {
    clearTimers();
    particleRefs.current.clear();
    completedRef.current = false;
    setParticles([]);
    setImpact(null);
    setPetMood("sad");
    setPhase("idle");
    setVisible(true);
  }, [clearTimers]);

  const closeDialog = useCallback(() => {
    clearTimers();
    particleRefs.current.clear();
    completedRef.current = false;
    setParticles([]);
    setImpact(null);
    setPetMood("sad");
    setPhase("idle");
    setVisible(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [clearTimers]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Blur the page directly (backdrop-filter is defeated by ancestor effects)
    // and mark it inert so keyboard focus stays trapped in the dialog.
    const page = document.querySelector<HTMLElement>("main");
    page?.classList.add("crumb-page-blurred");
    if (page) page.inert = true;
    const focusFrame = requestAnimationFrame(() => dialogRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      page?.classList.remove("crumb-page-blurred");
      if (page) page.inert = false;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDialog, visible]);

  const registerParticle = useCallback((id: number, node: HTMLDivElement | null) => {
    if (node) particleRefs.current.set(id, node);
    else particleRefs.current.delete(id);
  }, []);

  const beginPhysics = useCallback(() => {
    const sceneRect = sceneRef.current?.getBoundingClientRect();
    const sources = letters.map((letter, index) => {
      const rect = letterRefs.current.get(index)?.getBoundingClientRect();
      return {
        char: letter.text,
        x: rect && sceneRect ? rect.left - sceneRect.left + rect.width / 2 : (sceneRect?.width ?? 560) / 2,
        y: rect && sceneRect ? rect.top - sceneRect.top + rect.height / 2 : (sceneRect?.height ?? 600) * 0.3,
      };
    });
    const nextParticles = createCookieParticles(sources);
    setParticles(nextParticles);
    setPhase("falling");
    setPetMood("drool");

    requestAnimationFrame(() => {
      const startedAt = performance.now();
      let previous = startedAt;
      let openedMouth = false;
      let tookStep = false;
      let totalEaten = 0;
      let lastChewAt = -Infinity;

      const frame = (now: number) => {
        const elapsed = now - startedAt;
        const petRect = petRef.current?.getBoundingClientRect();
        const currentSceneRect = sceneRef.current?.getBoundingClientRect();
        const mouthX = petRect && currentSceneRect
          ? petRect.left - currentSceneRect.left + petRect.width / 2
          : (currentSceneRect?.width ?? 560) / 2;
        const mouthY = petRect && currentSceneRect
          ? petRect.top - currentSceneRect.top + petRect.height * 0.72
          : (currentSceneRect?.height ?? 600) - 80;
        const floorY = petRect && currentSceneRect
          ? petRect.bottom - currentSceneRect.top - 13
          : (currentSceneRect?.height ?? 600) - 46;
        const result = stepCookiePhysics(nextParticles, now - previous, elapsed, { mouthX, mouthY, floorY });
        previous = now;

        let nearest: CookieParticle | undefined;
        for (const particle of nextParticles) {
          const node = particleRefs.current.get(particle.id);
          if (!node) continue;
          node.style.opacity = particle.active && !particle.eaten ? "1" : node.style.opacity;
          node.style.transform = `translate3d(${particle.x - 14}px, ${particle.y - 14}px, 0) rotate(${particle.rotation}deg)`;
          const letter = node.querySelector<HTMLElement>(".crumb-particle-letter");
          const cookie = node.querySelector<HTMLElement>(".crumb-particle-cookie");
          if (letter) {
            letter.style.opacity = String(1 - particle.morph);
            letter.style.transform = `scale(${1 - particle.morph * 0.16})`;
          }
          if (cookie) {
            cookie.style.opacity = String(particle.morph);
            cookie.style.transform = `scale(${0.84 + particle.morph * 0.16})`;
          }
          if (!particle.eaten && (!nearest || particle.y > nearest.y)) nearest = particle;
        }

        if (nearest && petRef.current) {
          const look = Math.max(-1, Math.min(1, (nearest.x - mouthX) / 180));
          petRef.current.style.setProperty("--pet-look-x", `${look * 5}px`);
        }

        if (!openedMouth && elapsed > 560) {
          openedMouth = true;
          setPetMood("open");
        }

        // One big step toward the landed pile instead of gliding after it.
        if (!tookStep && elapsed > 700) {
          const landed = nextParticles.filter(
            (particle) => !particle.eaten && particle.bounces > 0,
          );
          if (landed.length >= 3) {
            const pileX = landed.reduce((sum, particle) => sum + particle.x, 0) / landed.length;
            const dx = pileX - mouthX;
            if (Math.abs(dx) > 36) {
              tookStep = true;
              const step = Math.max(-120, Math.min(120, dx));
              petRef.current?.style.setProperty("--pet-step-x", `${step}px`);
              setPetMood("tracking");
              timersRef.current.push(window.setTimeout(() => {
                if (!completedRef.current) setPetMood("open");
              }, 320));
            }
          }
        }
        if (result.eatenNow > 0) {
          totalEaten += result.eatenNow;
          for (const particle of nextParticles) {
            if (!particle.eaten) continue;
            const node = particleRefs.current.get(particle.id);
            if (!node || node.dataset.eaten === "true") continue;
            node.dataset.eaten = "true";
            node.animate(
              [
                { opacity: 1, transform: `${node.style.transform} scale(1)` },
                { opacity: 0, transform: `${node.style.transform} scale(0.62)` },
              ],
              { duration: 170, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" },
            );
          }
          // Throttle sprite swaps so rapid eats don't strobe the pet.
          if (now - lastChewAt > 380) {
            lastChewAt = now;
            setPetMood("chew");
            const chewTimer = window.setTimeout(() => {
              if (!completedRef.current) setPetMood("open");
            }, 200);
            timersRef.current.push(chewTimer);
          }
        }

        if (result.remaining > 0) {
          rafRef.current = requestAnimationFrame(frame);
          return;
        }

        if (totalEaten >= nextParticles.length) {
          completedRef.current = true;
          setPetMood("lick");
          const happyTimer = window.setTimeout(() => {
            setPetMood("happy");
            setPhase("complete");
          }, 480);
          timersRef.current.push(happyTimer);
        }
        const closeTimer = window.setTimeout(closeDialog, 2100);
        timersRef.current.push(closeTimer);
      };

      rafRef.current = requestAnimationFrame(frame);
    });
  }, [closeDialog, letters]);

  function allowCookies() {
    if (phase !== "idle") return;
    saveCookieChoice("accepted");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPetMood("happy");
      setPhase("complete");
      const reducedTimer = window.setTimeout(closeDialog, 900);
      timersRef.current.push(reducedTimer);
      return;
    }
    setPhase("opening");
    setPetMood("alert");
    const timer = window.setTimeout(beginPhysics, 360);
    timersRef.current.push(timer);
  }

  const dropOnPet = useCallback((node: HTMLElement | null, closeDelay: number) => {
    const pet = petRef.current;
    const scene = sceneRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!node || !pet || !scene || reducedMotion || typeof node.animate !== "function") {
      // No flight to watch: brief bonk beat, then get out of the way.
      setPetMood("bonked");
      timersRef.current.push(window.setTimeout(closeDialog, 350));
      return;
    }

    // Wait a frame so any phase-change styling lands before measuring.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const nodeRect = node.getBoundingClientRect();
      const petRect = pet.getBoundingClientRect();
      const sceneRect = scene.getBoundingClientRect();
      const drop = petRect.top + 10 - nodeRect.bottom;
      const drift = petRect.left + petRect.width / 2 - (nodeRect.left + nodeRect.width / 2);

      // Ballistic launch: an upward kick, then gravity carries it onto the head.
      const gravity = 2600;
      const flight = 0.72;
      const vx = drift / flight;
      let vy = drop / flight - (gravity * flight) / 2;
      let x = 0;
      let y = 0;
      let rotation = 0;
      let startled = false;
      const spin = drift < 0 ? -11 : 11;
      let previous = performance.now();
      node.style.willChange = "transform";

      const fly = (now: number) => {
        const dt = Math.min(now - previous, 32) / 1000;
        previous = now;
        vy += gravity * dt;
        x += vx * dt;
        y += vy * dt;
        rotation += spin * dt;

        // A beat before contact the pup notices what's coming.
        if (!startled && vy > 0 && drop - y < 130) {
          startled = true;
          setPetMood("startle");
        }

        if (y >= drop && vy > 0) {
          node.style.transform = `translate(${x}px, ${drop}px) rotate(${rotation}deg)`;
          setPetMood("squash");
          timersRef.current.push(window.setTimeout(() => setPetMood("bonked"), 340));
          setImpact({
            x: petRect.left - sceneRect.left + petRect.width / 2,
            y: petRect.top - sceneRect.top + 8,
          });
          node.animate(
            [
              { transform: `translate(${x}px, ${drop}px) rotate(${rotation}deg)` },
              { transform: `translate(${x}px, ${drop - 12}px) rotate(${rotation + 3}deg)`, offset: 0.45 },
              { transform: `translate(${x}px, ${drop - 2}px) rotate(${rotation + 2}deg)` },
            ],
            { duration: 300, easing: "ease-out", fill: "forwards" },
          );
          timersRef.current.push(window.setTimeout(closeDialog, closeDelay));
          return;
        }

        node.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
        dropRafRef.current = requestAnimationFrame(fly);
      };
      dropRafRef.current = requestAnimationFrame(fly);
    }));
  }, [closeDialog]);

  function declineCookies() {
    if (phase !== "idle") return;
    saveCookieChoice("declined");
    playClick();
    setPhase("declined");
    dropOnPet(declineRef.current, 1600);
  }

  function dismissOnHead() {
    if (phase === "closing") return;
    if (phase !== "idle") {
      closeDialog();
      return;
    }
    setPhase("closing");
    dropOnPet(closeRef.current, 1200);
  }

  function blushPet() {
    if (petMood === "blush" || petMood === "bonked" || petMood === "startle" || petMood === "squash") return;
    const previous = petMood;
    setPetMood("blush");
    timersRef.current.push(window.setTimeout(() => {
      setPetMood((mood) => (mood === "blush" ? previous : mood));
    }, 700));
  }

  const labelWidth = letters.reduce((max, letter) => Math.max(max, letter.x + letter.width), 0);
  const labelOffset = (BUTTON_WIDTH - labelWidth) / 2;

  if (!ready) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="crumb-trigger"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={visible}
      >
        cookies
      </button>

      {visible && createPortal(
        <div
          className="crumb-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            ref={dialogRef}
            className="crumb-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-dialog-title"
            tabIndex={-1}
          >
            <button
              ref={closeRef}
              type="button"
              className="crumb-close"
              onClick={dismissOnHead}
              aria-label="Close cookie window"
            >
              ×
            </button>

            <div ref={sceneRef} className="crumb-scene" data-phase={phase} aria-live="polite">
              <div className="crumb-prompt">
                <h2 id="cookie-dialog-title">this site uses cookies to save your progress.</h2>
                <div className="crumb-actions">
                  <div className="crumb-trap">
                    <button
                      ref={allowRef}
                      type="button"
                      className="crumb-brick"
                      onClick={allowCookies}
                      disabled={phase !== "idle"}
                      aria-label="Allow cookies and save game progress"
                    >
                      {letters.map((letter, index) => (
                        <span
                          key={letter.key}
                          ref={(node) => {
                            if (node) letterRefs.current.set(index, node);
                            else letterRefs.current.delete(index);
                          }}
                          className="crumb-brick-letter"
                          style={{ left: labelOffset + letter.x, width: letter.width }}
                          aria-hidden="true"
                        >
                          {letter.text}
                        </span>
                      ))}
                    </button>
                    <span className="crumb-trap-door crumb-trap-door-left" aria-hidden="true" />
                    <span className="crumb-trap-door crumb-trap-door-right" aria-hidden="true" />
                  </div>
                  <button
                    ref={declineRef}
                    type="button"
                    className="crumb-decline"
                    onClick={declineCookies}
                    disabled={phase !== "idle"}
                  >
                    {"don't allow"}
                  </button>
                </div>
                <span className="crumb-save-note">cookies store game progress</span>
              </div>

              {particles.map((particle) => (
                <CookieParticleView key={particle.id} particle={particle} register={registerParticle} />
              ))}

              {impact && (
                <div className="crumb-impact" style={{ left: impact.x, top: impact.y }} aria-hidden="true">
                  {Array.from({ length: 7 }, (_, shard) => (
                    <i key={shard} style={{ "--shard": shard } as CSSProperties} />
                  ))}
                </div>
              )}

              <span className="crumb-floor" aria-hidden="true" />
              <SpritePet ref={petRef} mood={petMood} onTap={blushPet} />
              <span className="sr-only">
                {phase === "complete" ? "Cookies saved. Crumb ate every cookie." : ""}
              </span>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
