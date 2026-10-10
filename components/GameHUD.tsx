"use client";

import { DIFFICULTIES } from "@/game/difficulty";
import { enemyStatusLabel } from "@/game/engine";
import { formatTime } from "@/game/math";
import type { HudSnapshot } from "@/game/types";

type GameHUDProps = {
  hud: HudSnapshot;
  onPause: () => void;
  onResume: () => void;
};

export function GameHUD({ hud, onPause, onResume }: GameHUDProps) {
  const paused = hud.phase === "PAUSED";
  const status = enemyStatusLabel(hud.enemyState);
  const difficulty = DIFFICULTIES.find((item) => item.id === hud.difficulty)?.label ?? "EASY";

  return (
    <>
      <header className="hud">
        <div className="hud-cluster">
          <p className="hud-difficulty">{difficulty}</p>
          <p className="hud-coins">COINS：{hud.coins} / {hud.coinsRequired}</p>
          <p className="hud-time">{formatTime(hud.elapsed)}</p>
          <p className={`hud-status hud-status-${hud.enemyState.toLowerCase()}`}>{status}</p>
        </div>
        <button
          type="button"
          className="hud-pause"
          onClick={paused ? onResume : onPause}
        >
          {paused ? "再開" : "一時停止"}
        </button>
      </header>
      {hud.warning ? (
        <p key={hud.warningId} className="warning-banner" aria-live="assertive">
          {hud.warning}
        </p>
      ) : null}
    </>
  );
}
