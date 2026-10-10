"use client";

import { useEffect, useRef, useState } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { GameHUD } from "@/components/GameHUD";
import { PauseScreen } from "@/components/PauseScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { StartScreen } from "@/components/StartScreen";
import { VirtualJoystick } from "@/components/VirtualJoystick";
import type { Difficulty } from "@/game/difficulty";
import type { GameEngine } from "@/game/engine";
import type { HudSnapshot } from "@/game/types";

const INITIAL_HUD: HudSnapshot = {
  phase: "READY",
  coins: 0,
  coinsRequired: 10,
  elapsed: 0,
  difficulty: "easy",
  enemyState: "WANDER",
  warning: null,
  warningId: 0,
};

export function GameApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const fit = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      root.style.width = `${width}px`;
      root.style.height = `${height}px`;
      root.style.top = `${offsetTop}px`;
    };

    const enableTouch = () => root.classList.add("touch-ui");
    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("scroll", fit);
    window.addEventListener("touchstart", enableTouch, { passive: true, once: true });

    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("scroll", fit);
      window.removeEventListener("touchstart", enableTouch);
    };
  }, []);

  const sync = () => {
    const engine = engineRef.current;
    if (engine) setHud(engine.getHud());
  };

  const playing = hud.phase === "PLAYING";

  return (
    <div
      ref={rootRef}
      className="game-root"
      onContextMenu={(event) => event.preventDefault()}
    >
      <GameCanvas engineRef={engineRef} onHud={setHud} />
      {hud.phase === "READY" ? (
        <StartScreen
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onStart={() => {
            engineRef.current?.start(difficulty);
            sync();
          }}
        />
      ) : null}
      {playing || hud.phase === "PAUSED" ? (
        <GameHUD
          hud={hud}
          onPause={() => {
            engineRef.current?.pause();
            sync();
          }}
          onResume={() => {
            engineRef.current?.resume();
            sync();
          }}
        />
      ) : null}
      {hud.phase === "PAUSED" ? (
        <PauseScreen
          onResume={() => {
            engineRef.current?.resume();
            sync();
          }}
          onRetry={() => {
            engineRef.current?.start(difficulty);
            sync();
          }}
        />
      ) : null}
      {hud.phase === "GAME_OVER" || hud.phase === "CLEAR" ? (
        <ResultScreen
          hud={hud}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onRetry={() => {
            engineRef.current?.start(difficulty);
            sync();
          }}
        />
      ) : null}
      {playing ? (
        <VirtualJoystick
          onChange={(x, y) => engineRef.current?.input.setJoystick(x, y)}
        />
      ) : null}
    </div>
  );
}
