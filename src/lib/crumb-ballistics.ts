// Ballistic flight for a DOM node onto the pet's head: an upward kick, then
// gravity carries it in an arc. Direct style writes, no React.

const GRAVITY = 2600;
const FLIGHT_S = 0.72;

export interface FlightHandlers {
  /** Fired a beat before contact, while the object bears down. */
  onStartle: () => void;
  /** Fired at contact with the impact point in scene coordinates. */
  onImpact: (x: number, y: number) => void;
}

/**
 * Launch `node` so it lands on `pet`'s head. Waits two frames so any
 * phase-change styling lands before measuring. Returns a cancel function.
 */
export function launchOntoPet(
  node: HTMLElement,
  pet: HTMLElement,
  scene: HTMLElement,
  handlers: FlightHandlers,
): () => void {
  let raf = 0;

  raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(() => {
      const nodeRect = node.getBoundingClientRect();
      const petRect = pet.getBoundingClientRect();
      const sceneRect = scene.getBoundingClientRect();
      // The squashed pose's visual top sits ~26px below the pet box top
      // (bottom-aligned sprite), so land deep enough to rest right on him.
      const drop = petRect.top + 42 - nodeRect.bottom;
      const drift = petRect.left + petRect.width / 2 - (nodeRect.left + nodeRect.width / 2);

      const vx = drift / FLIGHT_S;
      let vy = drop / FLIGHT_S - (GRAVITY * FLIGHT_S) / 2;
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
        vy += GRAVITY * dt;
        x += vx * dt;
        y += vy * dt;
        rotation += spin * dt;

        if (!startled && vy > 0 && drop - y < 130) {
          startled = true;
          handlers.onStartle();
        }

        if (y >= drop && vy > 0) {
          node.style.transform = `translate(${x}px, ${drop}px) rotate(${rotation}deg)`;
          handlers.onImpact(
            petRect.left - sceneRect.left + petRect.width / 2,
            petRect.top - sceneRect.top + 26,
          );
          node.animate(
            [
              { transform: `translate(${x}px, ${drop}px) rotate(${rotation}deg)` },
              { transform: `translate(${x}px, ${drop - 12}px) rotate(${rotation + 3}deg)`, offset: 0.45 },
              { transform: `translate(${x}px, ${drop - 2}px) rotate(${rotation + 2}deg)` },
            ],
            { duration: 300, easing: "ease-out", fill: "forwards" },
          );
          return;
        }

        node.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
        raf = requestAnimationFrame(fly);
      };
      raf = requestAnimationFrame(fly);
    });
  });

  return () => cancelAnimationFrame(raf);
}
