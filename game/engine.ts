import { GameAudio } from "./audio";
import { Camera, computeScale } from "./camera";
import { CONFIG } from "./constants";
import type { Difficulty } from "./difficulty";
import { enemyCountFor } from "./difficulty";
import { updateEnemy } from "./enemy";
import { InputManager } from "./input";
import { circlesSweptHit, dist, pointSegmentDistance } from "./math";
import { updatePlayer } from "./player";
import type { Coin, Decor, Enemy, EnemyState, GamePhase, HudSnapshot, Obstacle, Particle, Player, RockObstacle } from "./types";
import { createWorld } from "./world";

export class GameEngine {
  phase: GamePhase = "READY";
  difficulty: Difficulty = "easy";
  player: Player;
  enemies: Enemy[];
  obstacles: Obstacle[];
  coins: Coin[];
  decor: Decor[];
  particles: Particle[] = [];
  camera = new Camera();
  input = new InputManager();
  audio = new GameAudio();
  elapsed = 0;
  anim = 0;
  coinsCollected = 0;
  grace = 0;
  shake = 0;
  warningText: string | null = null;
  warningTimer = 0;
  warningId = 0;
  reduceMotion = false;

  constructor() {
    const world = createWorld();
    this.player = world.player;
    this.enemies = world.enemies;
    this.obstacles = world.obstacles;
    this.coins = world.coins;
    this.decor = world.decor;
    this.camera.snap(this.player.x, this.player.y);
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }

  cameraScale(cssWidth: number, cssHeight: number): number {
    return computeScale(cssWidth, cssHeight);
  }

  start(difficulty: Difficulty = this.difficulty): void {
    this.difficulty = difficulty;
    const world = createWorld(Math.random, enemyCountFor(difficulty));
    this.player = world.player;
    this.enemies = world.enemies;
    this.obstacles = world.obstacles;
    this.coins = world.coins;
    this.decor = world.decor;
    this.particles = [];
    this.elapsed = 0;
    this.coinsCollected = 0;
    this.grace = CONFIG.startGrace;
    this.shake = 0;
    this.warningText = null;
    this.warningTimer = 0;
    this.phase = "PLAYING";
    this.input.clear();
    this.camera.snap(this.player.x, this.player.y);
    this.audio.unlock();
  }

  pause(): void {
    if (this.phase !== "PLAYING") return;
    this.phase = "PAUSED";
    this.input.setJoystick(0, 0);
  }

  resume(): void {
    if (this.phase !== "PAUSED") return;
    this.phase = "PLAYING";
  }

  getHud(): HudSnapshot {
    return {
      phase: this.phase,
      coins: this.coinsCollected,
      coinsRequired: CONFIG.coinsRequired,
      elapsed: this.elapsed,
      difficulty: this.difficulty,
      enemyState: dominantEnemyState(this.enemies),
      warning: this.warningTimer > 0 ? this.warningText : null,
      warningId: this.warningId,
    };
  }

  getAlertLevel(): number {
    let level = 0;
    for (const enemy of this.enemies) {
      const distance = dist(this.player.x, this.player.y, enemy.x, enemy.y);
      const inVision = distance <= CONFIG.visionRadius + 8;
      if (enemy.state === "CHASE") {
        const proximity = Math.max(0, 1 - distance / CONFIG.enemyLoseRadius);
        level = Math.max(level, Math.min(1, (inVision ? 0.5 : 0.28) + proximity * 0.45));
      } else if (enemy.state === "SEARCH") {
        level = Math.max(level, 0.16);
      } else if (inVision) {
        level = Math.max(level, 0.22);
      }
    }
    return level;
  }

  update(dt: number): void {
    const step = Math.min(CONFIG.maxDelta, Math.max(0, dt));

    if (this.phase === "READY") {
      this.anim += step;
      for (const enemy of this.enemies) {
        enemy.armAngle += CONFIG.enemySpinWander * step;
        enemy.faceAngle -= CONFIG.enemyFaceSpin * step;
      }
      return;
    }

    if (this.phase !== "PLAYING") return;

    this.elapsed += step;
    this.anim += step;
    this.grace = Math.max(0, this.grace - step);
    if (this.warningTimer > 0) {
      this.warningTimer -= step;
      if (this.warningTimer <= 0) {
        this.warningTimer = 0;
        this.warningText = null;
      }
    }

    let closeness = 0;
    for (const enemy of this.enemies) {
      if (enemy.state !== "CHASE") continue;
      const distance = dist(this.player.x, this.player.y, enemy.x, enemy.y);
      closeness = Math.max(closeness, Math.max(0, 1 - distance / 220));
    }
    const sustained = closeness * 5.5;
    this.shake = Math.max(sustained, this.shake - step * 22);

    const prevPlayerX = this.player.x;
    const prevPlayerY = this.player.y;
    const prevEnemies = this.enemies.map((enemy) => ({ x: enemy.x, y: enemy.y }));

    const move = this.input.getMove();
    updatePlayer(this.player, move.x, move.y, this.obstacles, step);
    let spotted = false;
    for (let index = 0; index < this.enemies.length; index += 1) {
      const enemy = this.enemies[index];
      const peers = peerObstacles(this.enemies, index);
      const enemyEvent = updateEnemy(
        enemy,
        this.player.x,
        this.player.y,
        peers.length > 0 ? [...this.obstacles, ...peers] : this.obstacles,
        step,
        this.grace <= 0,
        Math.random,
      );
      if (enemyEvent.spotted) spotted = true;
    }

    if (spotted) {
      this.warningText = "“認識”された";
      this.warningTimer = CONFIG.warningDuration;
      this.warningId += 1;
      this.shake = Math.max(this.shake, 12);
      this.audio.play("alert");
    }

    const caught = this.enemies.some((enemy, index) =>
      circlesSweptHit(
        prevPlayerX,
        prevPlayerY,
        this.player.x,
        this.player.y,
        CONFIG.playerRadius,
        prevEnemies[index].x,
        prevEnemies[index].y,
        enemy.x,
        enemy.y,
        CONFIG.enemyRadius,
      ),
    );

    if (caught) {
      this.phase = "GAME_OVER";
      this.shake = Math.max(this.shake, 16);
      this.input.clear();
      this.audio.play("death");
      return;
    }

    for (let i = this.coins.length - 1; i >= 0; i -= 1) {
      if (this.coinsCollected >= CONFIG.coinsRequired) break;
      const coin = this.coins[i];
      const reach = CONFIG.playerRadius + coin.radius + 8;
      const hit =
        pointSegmentDistance(
          coin.x,
          coin.y,
          prevPlayerX,
          prevPlayerY,
          this.player.x,
          this.player.y,
        ) <= reach;
      if (!hit) continue;
      this.coins.splice(i, 1);
      this.coinsCollected += 1;
      this.spawnPickup(coin.x, coin.y);
      this.audio.play("coin");
      if (this.coinsCollected >= CONFIG.coinsRequired) {
        this.phase = "CLEAR";
        this.input.clear();
        this.audio.play("clear");
        return;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      if (particle.life <= 0) this.particles.splice(i, 1);
    }

    this.camera.update(this.player.x, this.player.y, step);
  }

  private spawnPickup(x: number, y: number): void {
    this.particles.push({
      x,
      y: y - 10,
      vx: 0,
      vy: -38,
      life: 0.7,
      maxLife: 0.7,
      text: "+1",
      radius: 0,
    });
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 70,
        vy: Math.sin(angle) * 70,
        life: 0.4,
        maxLife: 0.4,
        text: "",
        radius: 3,
      });
    }
  }
}

function dominantEnemyState(enemies: readonly Enemy[]): EnemyState {
  if (enemies.some((enemy) => enemy.state === "CHASE")) return "CHASE";
  if (enemies.some((enemy) => enemy.state === "SEARCH")) return "SEARCH";
  return "WANDER";
}

function peerObstacles(enemies: readonly Enemy[], index: number): RockObstacle[] {
  const peers: RockObstacle[] = [];
  for (let other = 0; other < enemies.length; other += 1) {
    if (other === index) continue;
    const enemy = enemies[other];
    peers.push({
      id: -1 - other,
      kind: "rock",
      x: enemy.x,
      y: enemy.y,
      radius: CONFIG.enemyRadius * 5,
      seed: 0,
      points: [],
    });
  }
  return peers;
}

export function enemyStatusLabel(state: EnemyState): string {
  if (state === "CHASE") return "認識中";
  if (state === "SEARCH") return "見失い探索";
  return "徘徊中";
}
