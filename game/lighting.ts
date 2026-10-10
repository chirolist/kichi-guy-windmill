export class DarknessLayer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cssWidth = 1;
  private cssHeight = 1;
  private dpr = 1;

  constructor() {
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("暗闇レイヤーの2Dコンテキストを取得できません");
    this.ctx = context;
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.cssWidth = Math.max(1, cssWidth);
    this.cssHeight = Math.max(1, cssHeight);
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(this.cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(this.cssHeight * dpr));
  }

  /**
   * オフスクリーン上で暗闇を作り、視界の円だけ destination-out で切り抜く。
   * 本体キャンバスの合成モードは触らない。
   */
  draw(
    main: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    radiusPx: number,
    alert: number,
  ): void {
    const ctx = this.ctx;
    const width = this.cssWidth;
    const height = this.cssHeight;
    const radius = Math.max(12, radiusPx);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.97)";
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "destination-out";
    const hole = ctx.createRadialGradient(playerX, playerY, radius * 0.38, playerX, playerY, radius);
    hole.addColorStop(0, "rgba(0,0,0,1)");
    hole.addColorStop(0.62, "rgba(0,0,0,0.96)");
    hole.addColorStop(0.82, "rgba(0,0,0,0.55)");
    hole.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(playerX, playerY, radius, 0, Math.PI * 2);
    ctx.fill();

    if (alert > 0.02) {
      ctx.globalCompositeOperation = "source-over";
      const ring = ctx.createRadialGradient(
        playerX,
        playerY,
        radius * 0.55,
        playerX,
        playerY,
        radius,
      );
      const alpha = Math.min(0.34, 0.06 + alert * 0.28);
      ring.addColorStop(0, "rgba(120, 0, 0, 0)");
      ring.addColorStop(0.72, "rgba(120, 0, 0, 0)");
      ring.addColorStop(1, `rgba(170, 18, 18, ${alpha})`);
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(playerX, playerY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    main.save();
    main.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    main.drawImage(this.canvas, 0, 0, width, height);
    main.restore();
  }
}
