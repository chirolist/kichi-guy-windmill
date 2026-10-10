"use client";

import { DIFFICULTIES, type Difficulty } from "@/game/difficulty";

type DifficultySelectProps = {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
};

export function DifficultySelect({ value, onChange }: DifficultySelectProps) {
  return (
    <div className="difficulty">
      <p className="difficulty-label">難易度</p>
      <div className="difficulty-list" role="group" aria-label="難易度">
        {DIFFICULTIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="difficulty-option"
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}
          >
            <strong>{item.label}</strong>
            <span>風車 {item.enemies}体</span>
          </button>
        ))}
      </div>
    </div>
  );
}
