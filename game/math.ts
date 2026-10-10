export type Vec = { x: number; y: number };

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function normalize(x: number, y: number): Vec | null {
  const length = Math.hypot(x, y);
  if (length < 1e-6) return null;
  return { x: x / length, y: y / length };
}

export function lerpAngle(a: number, b: number, t: number): number {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}

export function randRange(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function pointSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  const t =
    ab2 < 1e-8 ? 0 : clamp(((px - ax) * abx + (py - ay) * aby) / ab2, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

/** 2つの円が、それぞれの移動線分のあいだで重なるか。高速移動のすり抜け防止。 */
export function circlesSweptHit(
  a0x: number,
  a0y: number,
  a1x: number,
  a1y: number,
  ar: number,
  b0x: number,
  b0y: number,
  b1x: number,
  b1y: number,
  br: number,
): boolean {
  const r0x = a0x - b0x;
  const r0y = a0y - b0y;
  const r1x = a1x - b1x;
  const r1y = a1y - b1y;
  return pointSegmentDistance(0, 0, r0x, r0y, r1x, r1y) <= ar + br;
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}
