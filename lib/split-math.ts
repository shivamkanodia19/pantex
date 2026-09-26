/**
 * Pure helpers for SplitPane bounds — kept separate for hard tests.
 */
export const SPLIT_MIN_ASIDE = 280;
export const SPLIT_MIN_MAIN = 360;
export const SPLIT_DEFAULT_ASIDE = 380;

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function asideBounds(shellWidth: number) {
  const min = SPLIT_MIN_ASIDE;
  const leaveMain = Math.max(min, shellWidth - SPLIT_MIN_MAIN);
  const pctCap = Math.floor(shellWidth * 0.55);
  let max = Math.min(leaveMain, pctCap);
  if (max < min) max = min; // narrow shells: lock at min aside
  return { min, max };
}

export function nextAsidePx(
  shellWidth: number,
  startAside: number,
  startX: number,
  clientX: number,
) {
  const { min, max } = asideBounds(shellWidth);
  const delta = startX - clientX;
  return clamp(startAside + delta, min, max);
}
