"use client";

import { DifficultySelect } from "@/components/DifficultySelect";
import type { Difficulty } from "@/game/difficulty";
import { formatTime } from "@/game/math";
import type { HudSnapshot } from "@/game/types";

type ResultScreenProps = {
  hud: HudSnapshot;
  difficulty: Difficulty;
  onDifficulty: (difficulty: Difficulty) => void;
  onRetry: () => void;
};

export function ResultScreen({ hud, difficulty, onDifficulty, onRetry }: ResultScreenProps) {
  const clear = hud.phase === "CLEAR";

  return (
    <div className={clear ? "overlay overlay-clear" : "overlay overlay-dead"}>
      <div className="overlay-card">
        <p className="overlay-kicker">{clear ? "脱出成功！" : "捕まった"}</p>
        <h2>{clear ? "CLEAR" : "GAME OVER"}</h2>
        <dl className="result-stats">
          <div>
            <dt>生存時間</dt>
            <dd>{formatTime(hud.elapsed)}</dd>
          </div>
          <div>
            <dt>コイン</dt>
            <dd>
              {hud.coins} / {hud.coinsRequired}
            </dd>
          </div>
        </dl>
        <DifficultySelect value={difficulty} onChange={onDifficulty} />
        <button type="button" className="primary-button" onClick={onRetry}>
          リトライ
        </button>
      </div>
    </div>
  );
}
