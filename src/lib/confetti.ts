/**
 * Lazy-loads canvas-confetti and fires it.
 * Keeps the ~8 KB library out of the initial bundle.
 */
export async function fireConfetti(opts: Parameters<import("canvas-confetti").CreateTypes>[0]) {
  const { default: confetti } = await import("canvas-confetti");
  confetti(opts);
}
