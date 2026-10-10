"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/game/engine";
import { DarknessLayer } from "@/game/lighting";
import { renderFrame } from "@/game/rendering";
import type { HudSnapshot } from "@/game/types";

type GameCanvasProps = {
  engineRef: { current: GameEngine | null };
  onHud: (hud: HudSnapshot) => void;
};

export function GameCanvas({ engineRef, onHud }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onHudRef = useRef(onHud);

  useEffect(() => {
    onHudRef.current = onHud;
  }, [onHud]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const engine = new GameEngine();
    engineRef.current = engine;
    engine.input.attach();
    const darkness = new DarknessLayer();

    let frame = 0;
    let last = performance.now();
    let cssWidth = 1;
    let cssHeight = 1;
    let dpr = 1;
    let hudKey = "READY|0|WANDER|0||0";

    const publish = () => {
      const hud = engine.getHud();
      const key = [
        hud.phase,
        hud.coins,
        hud.difficulty,
        hud.enemyState,
        hud.warningId,
        hud.warning ?? "",
        Math.floor(hud.elapsed * 5),
      ].join("|");
      if (key === hudKey) return;
      hudKey = key;
      onHudRef.current(hud);
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      cssWidth = Math.max(1, rect.width);
      cssHeight = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      darkness.resize(cssWidth, cssHeight, dpr);
    };

    const onVisibility = () => {
      last = performance.now();
      if (document.hidden && engine.phase === "PLAYING") {
        engine.pause();
        publish();
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (engine.phase === "PLAYING") engine.pause();
      else if (engine.phase === "PAUSED") engine.resume();
      else return;
      publish();
    };

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      engine.update(dt);
      if (cssWidth > 1 && cssHeight > 1) {
        renderFrame(context, engine, darkness, cssWidth, cssHeight, dpr);
      }
      publish();
      frame = requestAnimationFrame(loop);
    };

    resize();
    publish();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      engine.input.detach();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [engineRef]);

    return <canvas ref={canvasRef} className="game-canvas" aria-hidden="true" />;
}
