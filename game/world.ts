import { CONFIG } from "./constants";
import { circleHitsObstacle, obstacleBound } from "./collision";
import { dist, randRange } from "./math";
import { createEnemy } from "./enemy";
import { createPlayer } from "./player";
import type { BoxObstacle, Coin, Decor, Enemy, Obstacle, Rng, RockObstacle, WorldState } from "./types";

function separated(a: Obstacle, b: Obstacle): boolean {
  const gap = dist(a.x, a.y, b.x, b.y);
  return gap >= obstacleBound(a) + obstacleBound(b) + CONFIG.obstacleGap;
}

function makeRock(id: number, x: number, y: number, radius: number, rng: Rng): RockObstacle {
  const count = 7 + Math.floor(rng() * 3);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.25;
    const mag = radius * (0.72 + rng() * 0.28);
    points.push({
      x: Math.cos(angle) * mag,
      y: Math.sin(angle) * mag * (0.82 + rng() * 0.16),
    });
  }
  return { id, kind: "rock", x, y, radius, seed: rng() * 10, points };
}

function makeBox(id: number, x: number, y: number, hw: number, hh: number, rng: Rng): BoxObstacle {
  return { id, kind: "box", x, y, hw, hh, seed: rng() * 10 };
}

function randomObstacle(id: number, rng: Rng): Obstacle {
  const x = randRange(rng, 90, CONFIG.worldWidth - 90);
  const y = randRange(rng, 90, CONFIG.worldHeight - 90);
  if (rng() < 0.55) {
    return makeRock(id, x, y, randRange(rng, 26, 54), rng);
  }
  return makeBox(
    id,
    x,
    y,
    randRange(rng, 28, 54),
    randRange(rng, 22, 42),
    rng,
  );
}

function inSpawnBounds(x: number, y: number): boolean {
  return x >= 140 && y >= 140 && x <= CONFIG.worldWidth - 140 && y <= CONFIG.worldHeight - 140;
}

function clearOf(x: number, y: number, points: readonly { x: number; y: number }[], gap: number): boolean {
  return points.every((point) => dist(point.x, point.y, x, y) >= gap);
}

function placeEnemies(
  playerX: number,
  playerY: number,
  count: number,
  rng: Rng,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const fallbacks = [
    { x: 180, y: 180 },
    { x: CONFIG.worldWidth - 180, y: 180 },
    { x: 180, y: CONFIG.worldHeight - 180 },
    { x: CONFIG.worldWidth - 180, y: CONFIG.worldHeight - 180 },
    { x: CONFIG.worldWidth / 2, y: 180 },
    { x: CONFIG.worldWidth / 2, y: CONFIG.worldHeight - 180 },
    { x: 180, y: CONFIG.worldHeight / 2 },
    { x: CONFIG.worldWidth - 180, y: CONFIG.worldHeight / 2 },
  ];

  for (let n = 0; n < count; n += 1) {
    const base = (n / count) * Math.PI * 2 + rng() * 0.35;
    let chosen: { x: number; y: number } | null = null;

    for (let i = 0; i < 80 && !chosen; i += 1) {
      const angle = base + (rng() - 0.5) * ((Math.PI * 2) / count);
      const separation = randRange(rng, CONFIG.enemySpawnMinDistance, CONFIG.enemySpawnMinDistance + 420);
      const x = playerX + Math.cos(angle) * separation;
      const y = playerY + Math.sin(angle) * separation;
      if (!inSpawnBounds(x, y) || !clearOf(x, y, points, 340)) continue;
      chosen = { x, y };
    }

    for (let i = 0; i < 80 && !chosen; i += 1) {
      const x = randRange(rng, 140, CONFIG.worldWidth - 140);
      const y = randRange(rng, 140, CONFIG.worldHeight - 140);
      if (dist(x, y, playerX, playerY) < CONFIG.enemySpawnMinDistance) continue;
      if (!clearOf(x, y, points, 280)) continue;
      chosen = { x, y };
    }

    if (!chosen) {
      const open = [...fallbacks].sort(
        (a, b) => dist(b.x, b.y, playerX, playerY) - dist(a.x, a.y, playerX, playerY),
      );
      chosen = open.find((spot) => clearOf(spot.x, spot.y, points, 200)) ?? open[n % open.length];
    }
    points.push(chosen);
  }

  return points;
}

export function createWorld(rng: Rng = Math.random, enemyCount = 1): WorldState {
  const playerX = randRange(rng, 280, CONFIG.worldWidth - 280);
  const playerY = randRange(rng, 280, CONFIG.worldHeight - 280);
  const enemyPoints = placeEnemies(playerX, playerY, Math.max(1, enemyCount), rng);

  const obstacles: Obstacle[] = [];
  let guard = 0;
  while (obstacles.length < CONFIG.obstacleCount && guard < 900) {
    guard += 1;
    const obstacle = randomObstacle(obstacles.length + 1, rng);
    if (circleHitsObstacle(playerX, playerY, CONFIG.playerSafeRadius, obstacle)) continue;
    if (enemyPoints.some((point) => circleHitsObstacle(point.x, point.y, 90, obstacle))) continue;
    if (obstacles.some((other) => !separated(obstacle, other))) continue;
    const bound = obstacleBound(obstacle);
    if (
      obstacle.x - bound < 20 ||
      obstacle.y - bound < 20 ||
      obstacle.x + bound > CONFIG.worldWidth - 20 ||
      obstacle.y + bound > CONFIG.worldHeight - 20
    ) {
      continue;
    }
    obstacles.push(obstacle);
  }

  const coins: Coin[] = [];
  guard = 0;
  while (coins.length < CONFIG.coinCount && guard < 900) {
    guard += 1;
    const x = randRange(rng, 50, CONFIG.worldWidth - 50);
    const y = randRange(rng, 50, CONFIG.worldHeight - 50);
    if (dist(x, y, playerX, playerY) < 170) continue;
    if (enemyPoints.some((point) => dist(x, y, point.x, point.y) < 120)) continue;
    if (obstacles.some((obstacle) => circleHitsObstacle(x, y, CONFIG.coinRadius + 12, obstacle))) {
      continue;
    }
    if (coins.some((coin) => dist(coin.x, coin.y, x, y) < 90)) continue;
    coins.push({
      id: coins.length + 1,
      x,
      y,
      radius: CONFIG.coinRadius,
      seed: rng() * Math.PI * 2,
    });
  }

  guard = 0;
  while (coins.length < CONFIG.coinsRequired && guard < 400) {
    guard += 1;
    const x = randRange(rng, 40, CONFIG.worldWidth - 40);
    const y = randRange(rng, 40, CONFIG.worldHeight - 40);
    if (dist(x, y, playerX, playerY) < CONFIG.playerRadius + CONFIG.coinRadius + 24) continue;
    if (obstacles.some((obstacle) => circleHitsObstacle(x, y, CONFIG.coinRadius + 8, obstacle))) {
      continue;
    }
    coins.push({
      id: coins.length + 1,
      x,
      y,
      radius: CONFIG.coinRadius,
      seed: rng() * Math.PI * 2,
    });
  }

  const decor: Decor[] = [];
  for (let i = 0; i < 70; i += 1) {
    decor.push({
      x: randRange(rng, 20, CONFIG.worldWidth - 20),
      y: randRange(rng, 20, CONFIG.worldHeight - 20),
      size: randRange(rng, 2, 7),
      seed: rng() * 10,
      kind: rng() < 0.7 ? "pebble" : "scratch",
    });
  }

  const enemies: Enemy[] = enemyPoints.map((point) => createEnemy(point.x, point.y, rng));

  return {
    player: createPlayer(playerX, playerY),
    enemies,
    obstacles,
    coins,
    decor,
  };
}
