/**
 * Tiny, dependency-free maths helpers used by the scroll renderer.
 * Keeping them pure (and free of any layout/GSAP dependency) makes the
 * animation logic easy to reason about — and testable in isolation.
 */

export const clamp = (value: number, min = 0, max = 1): number =>
  value < min ? min : value > max ? max : value;

export const clamp01 = (value: number): number => clamp(value, 0, 1);

/**
 * Normalised progress of `value` inside the [from, to] window, clamped to 0..1:
 * 0 before the window opens, 1 after it closes. This is the building block for
 * every staged reveal in the scene — e.g. `range(p, 0.2, 0.4)`.
 */
export const range = (value: number, from: number, to: number): number =>
  from === to ? (value >= to ? 1 : 0) : clamp01((value - from) / (to - from));

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * The "came and went" curve used for every road sign: 0 → 1 → 0, flat at both
 * ends so nothing ever pops.
 *
 *   ramp — share of the window spent fading in   (0..1)
 *   hold — point in the window where the fade out begins (0..1)
 *
 * Example: `emerge(t, 0.3, 0.45, 0.3, 0.6)` fades in over the first 30% of the
 * window, holds until 60%, then leaves.
 */
export const emerge = (
  value: number,
  from: number,
  to: number,
  ramp = 0.3,
  hold = 0.6,
): number => {
  const t = range(value, from, to);
  const up = ramp > 0 ? t / ramp : 1;
  const down = hold < 1 ? (t - hold) / (1 - hold) : t;
  return Math.min(easeOutCubic(up), 1 - easeOutCubic(down));
};
