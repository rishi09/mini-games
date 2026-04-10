"use client";

import { useRef, useEffect, useCallback } from "react";

export interface Layer {
  x: number;
  width: number;
  color: string;
}

export interface StackCanvasProps {
  layers: Layer[];
  current: Layer | null;
  score: number;
  highScore: number;
  status: "ready" | "playing" | "ended";
  perfectFlash: number; // 0-1 opacity for "PERFECT!" text
  containerWidth: number;
  containerHeight: number;
}

const BLOCK_HEIGHT = 30;
const GAME_WIDTH = 400;

export default function StackCanvas({
  layers,
  current,
  score,
  highScore,
  status,
  perfectFlash,
  containerWidth,
  containerHeight,
}: StackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const displayWidth = containerWidth;
    const displayHeight = containerHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.scale(dpr, dpr);

    // Scale factor to map GAME_WIDTH to display width
    const scale = displayWidth / GAME_WIDTH;

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Camera offset: keep the action near the top third of the screen
    const towerHeight = layers.length * BLOCK_HEIGHT * scale;
    const visibleTop = displayHeight * 0.3;
    let cameraY = 0;
    if (towerHeight > displayHeight - visibleTop) {
      cameraY = towerHeight - (displayHeight - visibleTop);
    }

    // Draw settled layers
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const x = layer.x * scale;
      const y = displayHeight - (i + 1) * BLOCK_HEIGHT * scale + cameraY;
      const w = layer.width * scale;
      const h = BLOCK_HEIGHT * scale;

      ctx.fillStyle = layer.color;
      ctx.fillRect(x, y, w, h);

      // Subtle border
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }

    // Draw current sliding block
    if (current && (status === "playing" || status === "ready")) {
      const i = layers.length;
      const x = current.x * scale;
      const y = displayHeight - (i + 1) * BLOCK_HEIGHT * scale + cameraY;
      const w = current.width * scale;
      const h = BLOCK_HEIGHT * scale;

      ctx.fillStyle = current.color;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }

    // "PERFECT!" flash
    if (perfectFlash > 0) {
      ctx.save();
      ctx.globalAlpha = perfectFlash;
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(28 * scale)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 20;
      ctx.fillText("PERFECT!", displayWidth / 2, displayHeight * 0.25);
      ctx.restore();
    }

    // Score display
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(48 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.9;
    ctx.fillText(score.toString(), displayWidth / 2, Math.round(60 * scale));
    ctx.restore();

    // High score badge (top-right corner)
    if (highScore > 0 && status === "playing") {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = `${Math.round(14 * scale)}px system-ui, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(`Best: ${highScore}`, displayWidth - 12 * scale, 28 * scale);
      ctx.restore();
    }

    // "Tap to start" overlay
    if (status === "ready") {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = `${Math.round(22 * scale)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Tap to Start", displayWidth / 2, displayHeight * 0.55);
      ctx.restore();
    }

    // Game over overlay
    if (status === "ended") {
      ctx.save();

      // Semi-transparent overlay
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // "Game Over"
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(36 * scale)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Game Over", displayWidth / 2, displayHeight * 0.35);

      // Score
      ctx.font = `${Math.round(20 * scale)}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(`Score: ${score}`, displayWidth / 2, displayHeight * 0.43);

      // High score
      ctx.fillText(`Best: ${Math.max(highScore, score)}`, displayWidth / 2, displayHeight * 0.49);

      ctx.restore();
    }
  }, [
    layers,
    current,
    score,
    highScore,
    status,
    perfectFlash,
    containerWidth,
    containerHeight,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="block"
      style={{
        width: containerWidth,
        height: containerHeight,
        touchAction: "none",
      }}
    />
  );
}
