import { CONFIG } from "./constants";
import { moveWithCollision, circleBlocked } from "./collision";
import { clamp, dist, normalize, randRange } from "./math";
import type { Enemy, Obstacle, Rng } from "./types";

const STEER_OFFSETS = [0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 2.1, -2.1, Math.PI];

export function createEnemy(x: number, y: number, rng: Rng): Enemy {
  const target = pickOpenPoint(x, y, rng, []);
  const armScales = Array.from({ length: 6 }, () => 0.82 + rng() * 0.28);
  return {
    x,
    y,
    state: "WANDER",
    armAngle: rng() * Math.PI * 2,
    faceAngle: rng() * Math.PI * 2,
    wanderTargetX: target.x,
    wanderTargetY: target.y,
    retargetIn: randRange(rng, CONFIG.enemyWanderRetargetMin, CONFIG.enemyWanderRetargetMax),
    lastSeenX: x,
    lastSeenY: y,
    searchTime: 0,
    approachTime: 0,
    stuckTime: 0,
    commitX: 0,
    commitY: 0,
    commitTime: 0,
    armScales,
  };
}

function pickOpenPoint(
  fromX: number,
  fromY: number,
  rng: Rng,
  obstacles: readonly Obstacle[],
  originX = fromX,
  originY = fromY,
  spread = 0,
): { x: number; y: number } {
  for (let i = 0; i < 12; i += 1) {
    let x: number;
    let y: number;
    if (spread > 0) {
      const angle = rng() * Math.PI * 2;
      const reach = 30 + rng() * spread;
      x = clamp(originX + Math.cos(angle) * reach, 70, CONFIG.worldWidth - 70);
      y = clamp(originY + Math.sin(angle) * reach, 70, CONFIG.worldHeight - 70);
    } else {
      x = randRange(rng, 80, CONFIG.worldWidth - 80);
      y = randRange(rng, 80, CONFIG.worldHeight - 80);
    }
    if (!circleBlocked(x, y, CONFIG.enemyRadius, obstacles)) return { x, y };
  }
  return {
    x: clamp(fromX, 70, CONFIG.worldWidth - 70),
    y: clamp(fromY, 70, CONFIG.worldHeight - 70),
  };
}

function chooseDirection(
  x: number,
  y: number,
  desiredX: number,
  desiredY: number,
  obstacles: readonly Obstacle[],
): { x: number; y: number } {
  const look = CONFIG.enemyLookAhead;
  if (!circleBlocked(x + desiredX * look, y + desiredY * look, CONFIG.enemyRadius, obstacles)) {
    return { x: desiredX, y: desiredY };
  }

  const base = Math.atan2(desiredY, desiredX);
  let bestX = -desiredX;
  let bestY = -desiredY;
  let bestDot = -Infinity;
  for (const offset of STEER_OFFSETS) {
    const dirX = Math.cos(base + offset);
    const dirY = Math.sin(base + offset);
    const ahead = 26 + Math.abs(offset) * 6;
    if (circleBlocked(x + dirX * ahead, y + dirY * ahead, CONFIG.enemyRadius, obstacles)) continue;
    const dot = dirX * desiredX + dirY * desiredY;
    if (dot > bestDot) {
      bestDot = dot;
      bestX = dirX;
      bestY = dirY;
    }
  }
  return { x: bestX, y: bestY };
}

export function updateEnemy(
  enemy: Enemy,
  playerX: number,
  playerY: number,
  obstacles: readonly Obstacle[],
  dt: number,
  canDetect: boolean,
  rng: Rng,
): { spotted: boolean } {
  const distance = dist(enemy.x, enemy.y, playerX, playerY);
  let spotted = false;

  const closeness = clamp(1 - distance / CONFIG.enemyDetectionRadius, 0, 1);
  let spin = CONFIG.enemySpinWander;
  if (enemy.state === "CHASE") spin = CONFIG.enemySpinChase + closeness * 3.2;
  else if (enemy.state === "SEARCH") spin = CONFIG.enemySpinWander * 1.7;
  enemy.armAngle += spin * dt;
  enemy.faceAngle -= CONFIG.enemyFaceSpin * dt;

  if (canDetect && distance <= CONFIG.enemyDetectionRadius) {
    if (enemy.state !== "CHASE") spotted = true;
    enemy.state = "CHASE";
    enemy.lastSeenX = playerX;
    enemy.lastSeenY = playerY;
    enemy.searchTime = CONFIG.enemySearchDuration;
  } else if (enemy.state === "CHASE") {
    enemy.lastSeenX = playerX;
    enemy.lastSeenY = playerY;
    if (distance > CONFIG.enemyLoseRadius) {
      enemy.state = "SEARCH";
      enemy.searchTime = CONFIG.enemySearchDuration;
      enemy.approachTime = 0;
      enemy.wanderTargetX = playerX;
      enemy.wanderTargetY = playerY;
      enemy.commitTime = 0;
    }
  } else if (enemy.state === "SEARCH") {
    const toLast = dist(enemy.x, enemy.y, enemy.lastSeenX, enemy.lastSeenY);
    const approaching = enemy.approachTime >= 0 && toLast > 36;
    if (approaching) {
      enemy.approachTime += dt;
      enemy.wanderTargetX = enemy.lastSeenX;
      enemy.wanderTargetY = enemy.lastSeenY;
      if (enemy.approachTime > 6.5) {
        enemy.state = "WANDER";
        const next = pickOpenPoint(enemy.x, enemy.y, rng, obstacles);
        enemy.wanderTargetX = next.x;
        enemy.wanderTargetY = next.y;
        enemy.retargetIn = randRange(
          rng,
          CONFIG.enemyWanderRetargetMin,
          CONFIG.enemyWanderRetargetMax,
        );
        enemy.commitTime = 0;
      }
    } else {
      enemy.approachTime = -1;
      enemy.searchTime -= dt;
      if (enemy.searchTime <= 0) {
        enemy.state = "WANDER";
        const next = pickOpenPoint(enemy.x, enemy.y, rng, obstacles);
        enemy.wanderTargetX = next.x;
        enemy.wanderTargetY = next.y;
        enemy.retargetIn = randRange(
          rng,
          CONFIG.enemyWanderRetargetMin,
          CONFIG.enemyWanderRetargetMax,
        );
        enemy.commitTime = 0;
      }
    }
  }

  let targetX = enemy.wanderTargetX;
  let targetY = enemy.wanderTargetY;
  let speed: number = CONFIG.enemyWanderSpeed;

  if (enemy.state === "CHASE") {
    targetX = playerX;
    targetY = playerY;
    speed = CONFIG.enemyChaseSpeed;
  } else if (enemy.state === "SEARCH") {
    speed = CONFIG.enemySearchSpeed;
    if (dist(enemy.x, enemy.y, enemy.wanderTargetX, enemy.wanderTargetY) < 22) {
      const next = pickOpenPoint(
        enemy.x,
        enemy.y,
        rng,
        obstacles,
        enemy.lastSeenX,
        enemy.lastSeenY,
        150,
      );
      enemy.wanderTargetX = next.x;
      enemy.wanderTargetY = next.y;
      targetX = next.x;
      targetY = next.y;
    }
  } else {
    enemy.retargetIn -= dt;
    const reached = dist(enemy.x, enemy.y, enemy.wanderTargetX, enemy.wanderTargetY) < 24;
    if (enemy.retargetIn <= 0 || reached) {
      const next = pickOpenPoint(enemy.x, enemy.y, rng, obstacles);
      enemy.wanderTargetX = next.x;
      enemy.wanderTargetY = next.y;
      targetX = next.x;
      targetY = next.y;
      enemy.retargetIn = randRange(
        rng,
        CONFIG.enemyWanderRetargetMin,
        CONFIG.enemyWanderRetargetMax,
      );
    }
  }

  let dirX = 0;
  let dirY = 0;
  if (enemy.commitTime > 0) {
    dirX = enemy.commitX;
    dirY = enemy.commitY;
    enemy.commitTime -= dt;
  } else {
    const desired = normalize(targetX - enemy.x, targetY - enemy.y);
    if (desired) {
      const chosen = chooseDirection(enemy.x, enemy.y, desired.x, desired.y, obstacles);
      dirX = chosen.x;
      dirY = chosen.y;
      const dot = dirX * desired.x + dirY * desired.y;
      if (dot < 0.82) {
        enemy.commitX = dirX;
        enemy.commitY = dirY;
        enemy.commitTime = CONFIG.enemyCommitTime;
      }
    }
  }

  const prevX = enemy.x;
  const prevY = enemy.y;
  const next = moveWithCollision(
    enemy.x,
    enemy.y,
    CONFIG.enemyRadius,
    dirX * speed * dt,
    dirY * speed * dt,
    obstacles,
  );
  enemy.x = next.x;
  enemy.y = next.y;

  const moved = dist(prevX, prevY, enemy.x, enemy.y);
  if (moved < speed * dt * 0.18 && speed * dt > 0.4) enemy.stuckTime += dt;
  else enemy.stuckTime = 0;

  if (enemy.stuckTime > CONFIG.enemyStuckTime) {
    enemy.stuckTime = 0;
    enemy.commitTime = 0;
    if (enemy.state === "CHASE") {
      const away = normalize(playerX - enemy.x, playerY - enemy.y);
      const sign = rng() < 0.5 ? 1 : -1;
      if (away) {
        enemy.commitX = -away.y * sign;
        enemy.commitY = away.x * sign;
        enemy.commitTime = 0.75;
      }
    } else if (enemy.state === "SEARCH") {
      const search = pickOpenPoint(
        enemy.x,
        enemy.y,
        rng,
        obstacles,
        enemy.lastSeenX,
        enemy.lastSeenY,
        160,
      );
      enemy.wanderTargetX = search.x;
      enemy.wanderTargetY = search.y;
    } else {
      const wander = pickOpenPoint(enemy.x, enemy.y, rng, obstacles);
      enemy.wanderTargetX = wander.x;
      enemy.wanderTargetY = wander.y;
      enemy.retargetIn = randRange(
        rng,
        CONFIG.enemyWanderRetargetMin,
        CONFIG.enemyWanderRetargetMax,
      );
    }
  }

  return { spotted };
}
