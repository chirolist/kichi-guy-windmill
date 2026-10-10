import type { EnemyState } from "./types";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

type EmojiSprites = {
  grin: HTMLImageElement;
  point: HTMLImageElement;
  shock: HTMLImageElement;
  you: HTMLImageElement;
  stand: HTMLImageElement;
  walk: HTMLImageElement;
  stride: HTMLImageElement;
};

let emojiSprites: EmojiSprites | null = null;

function loadEmoji(src: string): HTMLImageElement {
  const image = new Image();
  image.src = src;
  return image;
}

/** 絵文字画像を先に読み、OSのフォント差で見た目が変わらないようにする。 */
export function preloadWindmillSprites(): void {
  if (emojiSprites || typeof Image === "undefined") return;
  emojiSprites = {
    grin: loadEmoji("/emoji/1f601.png"),
    point: loadEmoji("/emoji/1f449.png"),
    shock: loadEmoji("/emoji/1faea.png"),
    you: loadEmoji("/emoji/1faf5.png"),
    stand: loadEmoji("/emoji/1f9cd.png"),
    walk: loadEmoji("/emoji/1f6b6.png"),
    stride: loadEmoji("/emoji/1f3c3.png"),
  };
}

function drawable(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

function drawEmoji(ctx: CanvasRenderingContext2D, image: HTMLImageElement, size: number): void {
  ctx.drawImage(image, -size / 2, -size / 2, size, size);
}

/**
 * 通常時は😁の周りを👉が回る。
 * 認識中は顔が🫪、手が🫵になる。顔は正位置のまま、手だけ回転する。
 */
export function drawWindmill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  armAngle: number,
  state: EnemyState,
): void {
  preloadWindmillSprites();
  const sprites = emojiSprites;
  if (!sprites) return;

  const chasing = state === "CHASE";
  const face = chasing ? sprites.shock : sprites.grin;
  const hand = chasing ? sprites.you : sprites.point;
  const faceSize = radius * 3.1;
  const handSize = radius * 2.45;
  const orbit = radius * 2.85;

  ctx.save();
  ctx.translate(x, y);

  if (drawable(hand)) {
    ctx.save();
    ctx.rotate(armAngle);
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 4);
      ctx.translate(orbit, 0);
      // 🫵は上向きなので、外側を向くよう90度回す。👉は初めから右向き。
      if (chasing) ctx.rotate(Math.PI / 2);
      drawEmoji(ctx, hand, handSize);
      ctx.restore();
    }
    ctx.restore();
  }

  if (drawable(face)) drawEmoji(ctx, face, faceSize);

  ctx.restore();
}

/**
 * 停止中は立っている人。移動中は歩くポーズと、反対の足が前に出るポーズを交互に出す。
 * 絵文字は左向きなので、右へ進むときは左右反転する。
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  facing: number,
  walk: number,
  moving: boolean,
): void {
  preloadWindmillSprites();
  const sprites = emojiSprites;
  const height = radius * 4.6;
  const bob = moving ? Math.abs(Math.sin(walk)) * radius * 0.35 : 0;
  const step = Math.floor(walk / Math.PI) % 2 === 0;
  const pose = !sprites
    ? undefined
    : !moving
      ? sprites.stand
      : step
        ? sprites.walk
        : sprites.stride;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.35, radius * 1.15, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  if (drawable(pose)) {
    ctx.save();
    if (moving && facing > 0) ctx.scale(-1, 1);
    ctx.drawImage(pose, -height / 2, -height * 0.92, height, height);
    ctx.restore();
  }

  ctx.restore();
}

export function drawRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  points: readonly { x: number; y: number }[],
  seed: number,
  scale: number,
): void {
  if (points.length < 3) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(2 * scale, 8 * scale, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => {
    const px = point.x * scale;
    const py = point.y * scale;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  const shade = 92 + (seed % 3) * 8;
  ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
  ctx.fill();
  ctx.strokeStyle = "#2e3238";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  points.slice(0, 4).forEach((point, index) => {
    const px = point.x * scale * 0.42;
    const py = point.y * scale * 0.42;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfW: number,
  halfH: number,
): void {
  const w = halfW * 2;
  const h = halfH * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-halfW + 4, halfH - 4, w, 8);

  ctx.fillStyle = "#6b4428";
  roundRect(ctx, -halfW, -halfH, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = "#3a2416";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#8a5a34";
  ctx.fillRect(-halfW + 3, -halfH + 3, w - 6, h * 0.42);

  ctx.strokeStyle = "#d9c093";
  ctx.lineWidth = Math.max(2, halfH * 0.12);
  ctx.beginPath();
  ctx.moveTo(0, -halfH + 2);
  ctx.lineTo(0, halfH - 2);
  ctx.moveTo(-halfW + 2, 0);
  ctx.lineTo(halfW - 2, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  seed: number,
): void {
  const bob = Math.sin(time * 3.2 + seed) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.85, radius * 0.7, radius * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c8881a";
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd76a";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff2c2";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-radius * 0.15, -radius * 0.2, radius * 0.38, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  ctx.fillStyle = "#a56b10";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawDecor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  kind: "pebble" | "scratch",
): void {
  if (kind === "pebble") {
    ctx.fillStyle = "rgba(170, 170, 180, 0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.65, 0.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = "rgba(180, 180, 190, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size * 1.4, y + size * 0.4);
  ctx.stroke();
}

export function drawFloater(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  radius: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (text) {
    ctx.fillStyle = "#ffe08a";
    ctx.font = "700 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  } else {
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
