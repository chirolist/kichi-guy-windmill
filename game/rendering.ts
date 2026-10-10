import { CONFIG } from "./constants";
import { isOnScreen, worldToScreen, type View } from "./camera";
import type { GameEngine } from "./engine";
import type { DarknessLayer } from "./lighting";
import {
  drawBox,
  drawCoin,
  drawDecor,
  drawFloater,
  drawPlayer,
  drawRock,
  drawWindmill,
  preloadWindmillSprites,
} from "./sprites";

function drawField(ctx: CanvasRenderingContext2D, view: View): void {
  const origin = worldToScreen(0, 0, view);
  const width = CONFIG.worldWidth * view.scale;
  const height = CONFIG.worldHeight * view.scale;

  ctx.fillStyle = "#0c0c11";
  ctx.fillRect(origin.x, origin.y, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(origin.x, origin.y, width, height);
  ctx.clip();

  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const step = 80;
  const startX = Math.floor(view.left / step) * step;
  const startY = Math.floor(view.top / step) * step;
  const endX = view.left + view.width;
  const endY = view.top + view.height;
  for (let x = startX; x <= endX; x += step) {
    const sx = worldToScreen(x, 0, view).x;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, view.cssHeight);
  }
  for (let y = startY; y <= endY; y += step) {
    const sy = worldToScreen(0, y, view).y;
    ctx.moveTo(0, sy);
    ctx.lineTo(view.cssWidth, sy);
  }
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "#3a3a44";
  ctx.lineWidth = 2;
  ctx.strokeRect(origin.x, origin.y, width, height);
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  darkness: DarknessLayer,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): void {
  const scale = engine.cameraScale(cssWidth, cssHeight);
  const shakeMag = engine.reduceMotion ? 0 : engine.shake;
  const shakeX = Math.sin(engine.anim * 46) * shakeMag;
  const shakeY = Math.cos(engine.anim * 37) * shakeMag * 0.75;
  const view = engine.camera.getView(cssWidth, cssHeight, scale, shakeX, shakeY);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  preloadWindmillSprites();

  drawField(ctx, view);

  for (const decor of engine.decor) {
    if (!isOnScreen(decor.x, decor.y, 20, view)) continue;
    const pos = worldToScreen(decor.x, decor.y, view);
    drawDecor(ctx, pos.x, pos.y, decor.size * view.scale, decor.kind);
  }

  const playerPos = worldToScreen(engine.player.x, engine.player.y, view);
  const visionPx = CONFIG.visionRadius * view.scale;
  const glow = ctx.createRadialGradient(
    playerPos.x,
    playerPos.y,
    0,
    playerPos.x,
    playerPos.y,
    visionPx,
  );
  glow.addColorStop(0, "rgba(255, 214, 150, 0.09)");
  glow.addColorStop(0.45, "rgba(255, 214, 150, 0.03)");
  glow.addColorStop(1, "rgba(255, 214, 150, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(playerPos.x, playerPos.y, visionPx, 0, Math.PI * 2);
  ctx.fill();

  for (const obstacle of engine.obstacles) {
    const bound = obstacle.kind === "rock" ? obstacle.radius : Math.max(obstacle.hw, obstacle.hh);
    if (!isOnScreen(obstacle.x, obstacle.y, bound + 8, view)) continue;
    const pos = worldToScreen(obstacle.x, obstacle.y, view);
    if (obstacle.kind === "rock") {
      drawRock(ctx, pos.x, pos.y, obstacle.points, obstacle.seed, view.scale);
    } else {
      drawBox(ctx, pos.x, pos.y, obstacle.hw * view.scale, obstacle.hh * view.scale);
    }
  }

  for (const coin of engine.coins) {
    if (!isOnScreen(coin.x, coin.y, coin.radius + 8, view)) continue;
    const pos = worldToScreen(coin.x, coin.y, view);
    drawCoin(ctx, pos.x, pos.y, coin.radius * view.scale, engine.anim, coin.seed);
  }

  for (const enemy of engine.enemies) {
    if (!isOnScreen(enemy.x, enemy.y, 90, view)) continue;
    const pos = worldToScreen(enemy.x, enemy.y, view);
    drawWindmill(
      ctx,
      pos.x,
      pos.y,
      CONFIG.enemyRadius * view.scale,
      enemy.armAngle,
      enemy.state,
    );
  }

  drawPlayer(
    ctx,
    playerPos.x,
    playerPos.y,
    CONFIG.playerRadius * view.scale * 1.15,
    engine.player.facing,
    engine.player.walk,
    engine.player.moving,
  );

  for (const particle of engine.particles) {
    if (!isOnScreen(particle.x, particle.y, 20, view)) continue;
    const pos = worldToScreen(particle.x, particle.y, view);
    const alpha = Math.max(0, particle.life / particle.maxLife);
    drawFloater(ctx, pos.x, pos.y, particle.text, particle.radius * view.scale, alpha);
  }

  darkness.draw(ctx, playerPos.x, playerPos.y, visionPx, engine.getAlertLevel());

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(playerPos.x, playerPos.y, 0, playerPos.x, playerPos.y, 42);
  halo.addColorStop(0, "rgba(255, 236, 190, 0.22)");
  halo.addColorStop(1, "rgba(255, 236, 190, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(playerPos.x, playerPos.y, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  if (engine.phase === "GAME_OVER") {
    ctx.fillStyle = "rgba(90, 0, 0, 0.28)";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
  }
}
