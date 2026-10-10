export type SoundName = "coin" | "alert" | "death" | "clear";

/** 効果音を後から差し替えられる薄いラッパー。素材が無いのでWeb Audioで短い音を出す。 */
export class GameAudio {
  private ctx: AudioContext | null = null;

  unlock(): void {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) this.ctx = new AudioCtx();
    void this.ctx.resume();
  }

  play(name: SoundName): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    if (name === "death") {
      this.tone(ctx, now, "sawtooth", 180, 50, 0.45, 0.06);
      return;
    }
    if (name === "alert") {
      this.tone(ctx, now, "square", 140, 90, 0.28, 0.05);
      return;
    }
    if (name === "clear") {
      this.tone(ctx, now, "triangle", 523, 523, 0.12, 0.04);
      this.tone(ctx, now + 0.1, "triangle", 659, 659, 0.12, 0.04);
      this.tone(ctx, now + 0.2, "triangle", 784, 784, 0.22, 0.05);
      return;
    }
    this.tone(ctx, now, "square", 880, 1320, 0.1, 0.035);
  }

  private tone(
    ctx: AudioContext,
    when: number,
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    volume: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), when + duration);
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }
}
