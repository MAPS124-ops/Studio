import React, { useEffect, useRef } from 'react';
import { GRID_COLS, GRID_ROWS, SnakeEngine } from '../engine/snakeEngine';
import { Direction } from '../types/game';

interface SnakeCanvasProps {
  engineRef: React.MutableRefObject<SnakeEngine | null>;
  borderColor: string;
}

export const SnakeCanvas: React.FC<SnakeCanvasProps> = ({ engineRef, borderColor }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 680,
    height: 600,
    dpr: 1,
  });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const targetRatio = GRID_COLS / GRID_ROWS;
      const availRatio = rect.width / rect.height;

      let cssWidth: number;
      let cssHeight: number;
      if (availRatio > targetRatio) {
        cssHeight = Math.floor(rect.height);
        cssWidth = Math.floor(cssHeight * targetRatio);
      } else {
        cssWidth = Math.floor(rect.width);
        cssHeight = Math.floor(cssWidth / targetRatio);
      }

      // Snap cell size cleanly so checkerboard squares never have subpixel seams
      const cell = Math.max(12, Math.floor(cssWidth / GRID_COLS));
      cssWidth = cell * GRID_COLS;
      cssHeight = cell * GRID_ROWS;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width: cssWidth, height: cssHeight, dpr };

      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const engine = engineRef.current;
      const canvas = canvasRef.current;
      if (engine && canvas) {
        engine.update(rawDt);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { width, height, dpr } = sizeRef.current;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          engine.render(ctx, width, height);
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [engineRef]);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    const threshold = 22;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    let dir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      dir = dy > 0 ? 'DOWN' : 'UP';
    }

    engineRef.current?.queueTurn(dir);
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full min-h-0 flex items-center justify-center p-2 sm:p-3"
    >
      <div
        className="rounded-xl p-1.5 sm:p-2 shadow-xl"
        style={{ backgroundColor: borderColor }}
      >
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="block rounded-lg"
        />
      </div>
    </div>
  );
};
