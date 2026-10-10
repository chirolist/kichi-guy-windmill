"use client";

import { useEffect, useRef, useState } from "react";

type VirtualJoystickProps = {
  onChange: (x: number, y: number) => void;
};

export function VirtualJoystick({ onChange }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const activeRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    return () => onChangeRef.current(0, 0);
  }, []);

  const apply = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const max = rect.width * 0.36;
    const length = Math.hypot(dx, dy);
    if (length > max && length > 0) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }
    setKnob({ x: dx, y: dy });
    if (max <= 0 || length / max < 0.12) {
      onChangeRef.current(0, 0);
      return;
    }
    onChangeRef.current(dx / max, dy / max);
  };

  const release = () => {
    activeRef.current = false;
    setKnob({ x: 0, y: 0 });
    onChangeRef.current(0, 0);
  };

  return (
    <div className="joystick">
      <div
        ref={baseRef}
        className="joystick-base"
        onPointerDown={(event) => {
          activeRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
          apply(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!activeRef.current) return;
          apply(event.clientX, event.clientY);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <div
          className="joystick-knob"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>
    </div>
  );
}
