import type { Difficulty } from "./difficulty";

export type GamePhase = "READY" | "PLAYING" | "PAUSED" | "GAME_OVER" | "CLEAR";

export type EnemyState = "WANDER" | "CHASE" | "SEARCH";

export type Rng = () => number;

export type Player = {
  x: number;
  y: number;
  /** 横向き。-1 が左、1 が右。 */
  facing: number;
  walk: number;
  moving: boolean;
};

export type Enemy = {
  x: number;
  y: number;
  state: EnemyState;
  armAngle: number;
  faceAngle: number;
  wanderTargetX: number;
  wanderTargetY: number;
  retargetIn: number;
  lastSeenX: number;
  lastSeenY: number;
  searchTime: number;
  approachTime: number;
  stuckTime: number;
  commitX: number;
  commitY: number;
  commitTime: number;
  armScales: number[];
};

export type RockObstacle = {
  id: number;
  kind: "rock";
  x: number;
  y: number;
  radius: number;
  seed: number;
  points: { x: number; y: number }[];
};

export type BoxObstacle = {
  id: number;
  kind: "box";
  x: number;
  y: number;
  hw: number;
  hh: number;
  seed: number;
};

export type Obstacle = RockObstacle | BoxObstacle;

export type Coin = {
  id: number;
  x: number;
  y: number;
  radius: number;
  seed: number;
};

export type Decor = {
  x: number;
  y: number;
  size: number;
  seed: number;
  kind: "pebble" | "scratch";
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  radius: number;
};

export type HudSnapshot = {
  phase: GamePhase;
  coins: number;
  coinsRequired: number;
  elapsed: number;
  difficulty: Difficulty;
  enemyState: EnemyState;
  warning: string | null;
  warningId: number;
};

export type WorldState = {
  player: Player;
  enemies: Enemy[];
  obstacles: Obstacle[];
  coins: Coin[];
  decor: Decor[];
};
