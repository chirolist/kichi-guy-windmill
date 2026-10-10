import { CONFIG } from "./constants";
import { clamp } from "./math";
import type { Obstacle } from "./types";

export function obstacleBound(obstacle: Obstacle): number {
  return obstacle.kind === "rock"
    ? obstacle.radius
    : Math.hypot(obstacle.hw, obstacle.hh);
}

export function circleHitsObstacle(
  x: number,
  y: number,
  radius: number,
  obstacle: Obstacle,
): boolean {
  if (obstacle.kind === "rock") {
    const dx = x - obstacle.x;
    const dy = y - obstacle.y;
    const reach = radius + obstacle.radius;
    return dx * dx + dy * dy < reach * reach;
  }

  const left = obstacle.x - obstacle.hw;
  const right = obstacle.x + obstacle.hw;
  const top = obstacle.y - obstacle.hh;
  const bottom = obstacle.y + obstacle.hh;
  const closestX = clamp(x, left, right);
  const closestY = clamp(y, top, bottom);
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function circleBlocked(
  x: number,
  y: number,
  radius: number,
  obstacles: readonly Obstacle[],
): boolean {
  if (
    x - radius < 0 ||
    y - radius < 0 ||
    x + radius > CONFIG.worldWidth ||
    y + radius > CONFIG.worldHeight
  ) {
    return true;
  }
  for (const obstacle of obstacles) {
    if (circleHitsObstacle(x, y, radius, obstacle)) return true;
  }
  return false;
}

function pushOutOfObstacle(
  x: number,
  y: number,
  radius: number,
  obstacle: Obstacle,
): { x: number; y: number } {
  if (obstacle.kind === "rock") {
    let dx = x - obstacle.x;
    let dy = y - obstacle.y;
    const reach = radius + obstacle.radius;
    const distance = Math.hypot(dx, dy);
    if (distance >= reach) return { x, y };
    if (distance < 1e-6) {
      dx = 1;
      dy = 0;
    } else {
      dx /= distance;
      dy /= distance;
    }
    const push = reach - distance + 0.05;
    return { x: x + dx * push, y: y + dy * push };
  }

  const left = obstacle.x - obstacle.hw;
  const right = obstacle.x + obstacle.hw;
  const top = obstacle.y - obstacle.hh;
  const bottom = obstacle.y + obstacle.hh;
  const closestX = clamp(x, left, right);
  const closestY = clamp(y, top, bottom);
  const dx = x - closestX;
  const dy = y - closestY;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq >= radius * radius) return { x, y };

  if (distanceSq > 1e-8) {
    const distance = Math.sqrt(distanceSq);
    const push = radius - distance + 0.05;
    return { x: x + (dx / distance) * push, y: y + (dy / distance) * push };
  }

  const penLeft = x - left;
  const penRight = right - x;
  const penTop = y - top;
  const penBottom = bottom - y;
  const minPen = Math.min(penLeft, penRight, penTop, penBottom);
  if (minPen === penLeft) return { x: left - radius - 0.05, y };
  if (minPen === penRight) return { x: right + radius + 0.05, y };
  if (minPen === penTop) return { x, y: top - radius - 0.05 };
  return { x, y: bottom + radius + 0.05 };
}

export function resolveCircle(
  x: number,
  y: number,
  radius: number,
  obstacles: readonly Obstacle[],
): { x: number; y: number } {
  let cx = x;
  let cy = y;
  for (let pass = 0; pass < 3; pass += 1) {
    for (const obstacle of obstacles) {
      if (!circleHitsObstacle(cx, cy, radius, obstacle)) continue;
      const pushed = pushOutOfObstacle(cx, cy, radius, obstacle);
      cx = pushed.x;
      cy = pushed.y;
    }
    cx = clamp(cx, radius, CONFIG.worldWidth - radius);
    cy = clamp(cy, radius, CONFIG.worldHeight - radius);
  }
  return { x: cx, y: cy };
}

function contactNormal(
  x: number,
  y: number,
  radius: number,
  obstacles: readonly Obstacle[],
): { x: number; y: number } | null {
  let bestGap = 8;
  let nx = 0;
  let ny = 0;
  let found = false;

  const consider = (gap: number, normalX: number, normalY: number) => {
    if (gap >= bestGap) return;
    const length = Math.hypot(normalX, normalY);
    if (length < 1e-6) return;
    bestGap = gap;
    nx = normalX / length;
    ny = normalY / length;
    found = true;
  };

  consider(x - radius, 1, 0);
  consider(y - radius, 0, 1);
  consider(CONFIG.worldWidth - radius - x, -1, 0);
  consider(CONFIG.worldHeight - radius - y, 0, -1);

  for (const obstacle of obstacles) {
    if (obstacle.kind === "rock") {
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      const distance = Math.hypot(dx, dy);
      consider(distance - (radius + obstacle.radius), dx, dy);
      continue;
    }
    const left = obstacle.x - obstacle.hw;
    const right = obstacle.x + obstacle.hw;
    const top = obstacle.y - obstacle.hh;
    const bottom = obstacle.y + obstacle.hh;
    const closestX = clamp(x, left, right);
    const closestY = clamp(y, top, bottom);
    const dx = x - closestX;
    const dy = y - closestY;
    const distance = Math.hypot(dx, dy);
    if (distance > 1e-6) {
      consider(distance - radius, dx, dy);
      continue;
    }
    const penLeft = x - left;
    const penRight = right - x;
    const penTop = y - top;
    const penBottom = bottom - y;
    const minPen = Math.min(penLeft, penRight, penTop, penBottom);
    if (minPen === penLeft) consider(-minPen, -1, 0);
    else if (minPen === penRight) consider(-minPen, 1, 0);
    else if (minPen === penTop) consider(-minPen, 0, -1);
    else consider(-minPen, 0, 1);
  }

  return found ? { x: nx, y: ny } : null;
}

function axisStep(
  x: number,
  y: number,
  radius: number,
  dx: number,
  dy: number,
  obstacles: readonly Obstacle[],
): { x: number; y: number } {
  let cx = x;
  let cy = y;
  if (!circleBlocked(x + dx, cy, radius, obstacles)) cx = x + dx;
  if (!circleBlocked(cx, cy + dy, radius, obstacles)) cy = cy + dy;
  return { x: cx, y: cy };
}

function slideStep(
  x: number,
  y: number,
  radius: number,
  dx: number,
  dy: number,
  obstacles: readonly Obstacle[],
): { x: number; y: number } | null {
  const normal = contactNormal(x, y, radius, obstacles);
  if (!normal) return null;
  const intended = Math.hypot(dx, dy);
  const tangents = [
    { x: -normal.y, y: normal.x },
    { x: normal.y, y: -normal.x },
  ];
  const ranked = tangents
    .map((tangent) => ({ tangent, dot: tangent.x * dx + tangent.y * dy }))
    .sort((a, b) => Math.abs(b.dot) - Math.abs(a.dot));

  for (const entry of ranked) {
    const direction = entry.dot >= 0 ? 1 : -1;
    const sx = entry.tangent.x * intended * direction;
    const sy = entry.tangent.y * intended * direction;
    const next = axisStep(x, y, radius, sx, sy, obstacles);
    if (Math.hypot(next.x - x, next.y - y) > intended * 0.45) return next;
  }
  return null;
}

/**
 * 軸を分けて移動し、角に当たったときは壁に沿って滑らせる。
 * 1フレームの移動が大きいときは分割して、障害物を飛び越えないようにする。
 */
export function moveWithCollision(
  x: number,
  y: number,
  radius: number,
  dx: number,
  dy: number,
  obstacles: readonly Obstacle[],
): { x: number; y: number } {
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.min(6, Math.ceil(distance / Math.max(4, radius * 0.45))));
  let cx = x;
  let cy = y;
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 0; i < steps; i += 1) {
    const direct = axisStep(cx, cy, radius, stepX, stepY, obstacles);
    const moved = Math.hypot(direct.x - cx, direct.y - cy);
    const stepLength = Math.hypot(stepX, stepY);
    if (moved >= stepLength * 0.55) {
      cx = direct.x;
      cy = direct.y;
      continue;
    }
    const slid = slideStep(cx, cy, radius, stepX, stepY, obstacles);
    if (slid) {
      cx = slid.x;
      cy = slid.y;
    } else {
      cx = direct.x;
      cy = direct.y;
    }
  }

  return resolveCircle(cx, cy, radius, obstacles);
}
