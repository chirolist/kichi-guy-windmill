import { CONFIG } from "./constants";
import { clamp } from "./math";

export type View = {
  scale: number;
  left: number;
  top: number;
  width: number;
  height: number;
  shakeX: number;
  shakeY: number;
  cssWidth: number;
  cssHeight: number;
};

export function computeScale(cssWidth: number, cssHeight: number): number {
  const shortSide = Math.min(cssWidth, cssHeight);
  const desiredDiameter = shortSide * 0.72;
  const scale = desiredDiameter / (CONFIG.visionRadius * 2);
  const minScale = shortSide < 540 ? 0.88 : 0.95;
  return clamp(scale, minScale, 1.85);
}

export class Camera {
  focusX = CONFIG.worldWidth / 2;
  focusY = CONFIG.worldHeight / 2;

  snap(x: number, y: number): void {
    this.focusX = x;
    this.focusY = y;
  }

  update(targetX: number, targetY: number, dt: number): void {
    const blend = 1 - Math.exp(-dt * CONFIG.cameraLerp);
    this.focusX += (targetX - this.focusX) * blend;
    this.focusY += (targetY - this.focusY) * blend;
  }

  getView(
    cssWidth: number,
    cssHeight: number,
    scale: number,
    shakeX: number,
    shakeY: number,
  ): View {
    const width = cssWidth / scale;
    const height = cssHeight / scale;
    const maxLeft = Math.max(0, CONFIG.worldWidth - width);
    const maxTop = Math.max(0, CONFIG.worldHeight - height);
    const left = clamp(this.focusX - width / 2, 0, maxLeft);
    const top = clamp(this.focusY - height / 2, 0, maxTop);
    return {
      scale,
      left,
      top,
      width,
      height,
      shakeX,
      shakeY,
      cssWidth,
      cssHeight,
    };
  }
}

export function worldToScreen(x: number, y: number, view: View): { x: number; y: number } {
  return {
    x: (x - view.left) * view.scale + view.shakeX,
    y: (y - view.top) * view.scale + view.shakeY,
  };
}

export function isOnScreen(x: number, y: number, margin: number, view: View): boolean {
  return (
    x > view.left - margin &&
    x < view.left + view.width + margin &&
    y > view.top - margin &&
    y < view.top + view.height + margin
  );
}
