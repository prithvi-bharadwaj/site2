/**
 * Text scramble decode effect: Binary → ASCII → Real text
 *
 * Each character transitions through phases:
 *   Phase 0: Binary (0/1)
 *   Phase 1: ASCII symbols
 *   Phase 2: Revealed (real character)
 *
 * Only a random subset of characters scramble — others reveal instantly.
 */

const BINARY_CHARS = "01";
const ASCII_CHARS = "!@#$%^&*()-=[]{}|;:<>?/~";

function randomChar(charset: string): string {
  return charset[Math.floor(Math.random() * charset.length)];
}

export interface ScrambleChar {
  phase: number; // 0=binary, 1=ascii, 2=revealed
  delay: number; // ms remaining before starting
  elapsed: number; // ms in current phase
  frozen: string; // current displayed char (to avoid flicker between ticks)
}

export interface ScrambleState {
  target: string;
  chars: ScrambleChar[];
  done: boolean;
}

export interface ScrambleConfig {
  scrambleProbability: number;
  binaryDuration: number;
  asciiDuration: number;
  maxDelay: number;
}

export const DEFAULT_SCRAMBLE_CONFIG: ScrambleConfig = {
  scrambleProbability: 0.6,
  binaryDuration: 250,
  asciiDuration: 350,
  maxDelay: 800,
};

/** Initialize scramble state for a word */
export function createScrambleState(
  text: string,
  wordIndex: number,
  totalWords: number,
  config: ScrambleConfig = DEFAULT_SCRAMBLE_CONFIG
): ScrambleState {
  const baseDelay = (wordIndex / Math.max(totalWords, 1)) * config.maxDelay;

  const chars: ScrambleChar[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " " || Math.random() > config.scrambleProbability) {
      chars.push({ phase: 2, delay: 0, elapsed: 0, frozen: ch });
    } else {
      const frozenBinary = randomChar(BINARY_CHARS);
      chars.push({
        phase: 0,
        delay: baseDelay + Math.random() * 200,
        elapsed: 0,
        frozen: frozenBinary,
      });
    }
  }

  return {
    target: text,
    chars,
    done: chars.every((c) => c.phase === 2),
  };
}

/** Get current displayed text */
export function getScrambleText(state: ScrambleState): string {
  return state.chars.map((c, i) =>
    c.phase === 2 ? state.target[i] : c.frozen
  ).join("");
}

/** Advance all chars by deltaMs. Mutates in place for performance. */
export function tickScramble(
  state: ScrambleState,
  deltaMs: number,
  config: ScrambleConfig = DEFAULT_SCRAMBLE_CONFIG
): boolean {
  if (state.done) return false;

  let anyActive = false;

  for (const c of state.chars) {
    if (c.phase === 2) continue;

    if (c.delay > 0) {
      c.delay -= deltaMs;
      anyActive = true;
      continue;
    }

    c.elapsed += deltaMs;

    if (c.phase === 0) {
      if (c.elapsed >= config.binaryDuration) {
        c.phase = 1;
        c.elapsed = 0;
        c.frozen = randomChar(ASCII_CHARS);
      } else {
        // Occasionally swap the binary char for visual noise
        if (Math.random() < 0.3) {
          c.frozen = randomChar(BINARY_CHARS);
        }
      }
      anyActive = true;
    } else if (c.phase === 1) {
      if (c.elapsed >= config.asciiDuration) {
        c.phase = 2;
      } else {
        // Swap ASCII char occasionally
        if (Math.random() < 0.3) {
          c.frozen = randomChar(ASCII_CHARS);
        }
        anyActive = true;
      }
    }
  }

  state.done = !anyActive;
  return anyActive;
}
