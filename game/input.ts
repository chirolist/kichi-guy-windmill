const CODE_TO_TOKEN: Record<string, string> = {
  KeyW: "w",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  ArrowUp: "arrowup",
  ArrowDown: "arrowdown",
  ArrowLeft: "arrowleft",
  ArrowRight: "arrowright",
};

export class InputManager {
  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;

  private onKeyDown = (event: KeyboardEvent) => {
    const token = this.token(event);
    if (!token) return;
    this.keys.add(token);
    event.preventDefault();
  };

  private onKeyUp = (event: KeyboardEvent) => {
    const token = this.token(event);
    if (!token) return;
    this.keys.delete(token);
  };

  private onBlur = () => {
    this.keys.clear();
  };

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.clear();
  }

  clear(): void {
    this.keys.clear();
    this.joyX = 0;
    this.joyY = 0;
  }

  setJoystick(x: number, y: number): void {
    this.joyX = x;
    this.joyY = y;
  }

  /** キーボードとジョイスティックを合成し、斜め移動が速くならないよう正規化する。 */
  getMove(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;

    const joy = Math.hypot(this.joyX, this.joyY);
    if (joy > 0.12) {
      x += this.joyX;
      y += this.joyY;
    }

    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) return { x: x / magnitude, y: y / magnitude };
    if (magnitude > 0.001) return { x, y };
    return { x: 0, y: 0 };
  }

  private token(event: KeyboardEvent): string | null {
    const fromCode = CODE_TO_TOKEN[event.code];
    if (fromCode) return fromCode;
    const key = event.key.toLowerCase();
    if (key === "w" || key === "a" || key === "s" || key === "d") return key;
    if (key === "arrowup" || key === "arrowdown" || key === "arrowleft" || key === "arrowright") {
      return key;
    }
    return null;
  }
}
