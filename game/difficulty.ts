export type Difficulty = "easy" | "normal" | "hard" | "nightmare";

export const DIFFICULTIES: readonly {
  id: Difficulty;
  label: string;
  enemies: number;
}[] = [
  { id: "easy", label: "EASY", enemies: 1 },
  { id: "normal", label: "NORMAL", enemies: 2 },
  { id: "hard", label: "HARD", enemies: 3 },
  { id: "nightmare", label: "NIGHTMARE", enemies: 4 },
];

export function enemyCountFor(difficulty: Difficulty): number {
  return DIFFICULTIES.find((item) => item.id === difficulty)?.enemies ?? 1;
}
