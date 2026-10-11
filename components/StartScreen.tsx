"use client";

import { DifficultySelect } from "@/components/DifficultySelect";
import type { Difficulty } from "@/game/difficulty";

type StartScreenProps = {
  difficulty: Difficulty;
  onDifficulty: (difficulty: Difficulty) => void;
  onStart: () => void;
};

export function StartScreen({ difficulty, onDifficulty, onStart }: StartScreenProps) {
  return (
    <div className="overlay overlay-start">
      <div className="overlay-card">
        <p className="overlay-kicker">2D SURVIVAL</p>
        <h1>キチガイ風車から逃げろ！</h1>
        <p className="overlay-lead">暗闇の中でコインを10枚集めろ。見つかったら、終わり。</p>
        <DifficultySelect value={difficulty} onChange={onDifficulty} />
        <button type="button" className="primary-button" onClick={onStart}>
          ゲームスタート
        </button>
        <div className="controls">
          <p className="hint-desktop">WASD / 矢印キーで移動（Escで一時停止）</p>
          <p className="hint-mobile">中央下のジョイスティックで移動</p>
        </div>
      </div>
    </div>
  );
}
