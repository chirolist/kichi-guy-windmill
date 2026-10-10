import { CONFIG } from "./constants";
import { moveWithCollision } from "./collision";
import { normalize } from "./math";
import type { Obstacle, Player } from "./types";

export function createPlayer(x: number, y: number): Player {
  return { x, y, facing: 1, walk: 0, moving: false };
}

export function updatePlayer(
  player: Player,
  moveX: number,
  moveY: number,
  obstacles: readonly Obstacle[],
  dt: number,
): void {
  const direction = normalize(moveX, moveY);
  if (!direction) {
    player.moving = false;
    return;
  }

  const dx = direction.x * CONFIG.playerSpeed * dt;
  const dy = direction.y * CONFIG.playerSpeed * dt;
  const next = moveWithCollision(
    player.x,
    player.y,
    CONFIG.playerRadius,
    dx,
    dy,
    obstacles,
  );
  player.x = next.x;
  player.y = next.y;
  if (direction.x !== 0) player.facing = direction.x < 0 ? -1 : 1;
  player.moving = true;
  player.walk += dt * 9;
}
