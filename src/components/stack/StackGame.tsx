"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import StackCanvas from "./StackCanvas";
import ShareButton from "@/components/shared/ShareButton";
import { saveHighScore, getHighScore } from "@/lib/storage";

interface Layer {
  x: number;
  width: number;
  color: string;
}

type Status = "ready" | "playing" | "ended";

const GAME_WIDTH = 400;

const PRESETS = {
  easy: { baseSpeed: 1.5, speedIncrement: 0.1, maxSpeed: 4, perfectTolerance: 4, label: "Easy" },
  normal: { baseSpeed: 2, speedIncrement: 0.15, maxSpeed: 6, perfectTolerance: 2, label: "Normal" },
  hard: { baseSpeed: 3, speedIncrement: 0.2, maxSpeed: 8, perfectTolerance: 1, label: "Hard" },
  insane: { baseSpeed: 4, speedIncrement: 0.3, maxSpeed: 10, perfectTolerance: 0.5, label: "Insane" },
} as const;

type Difficulty = keyof typeof PRESETS;

const DIFFICULTY_KEYS: Difficulty[] = ["easy", "normal", "hard", "insane"];

function layerColor(index: number): string {
  return `hsl(${(index * 25) % 360}, 70%, 60%)`;
}

function createBaseLayer(): Layer {
  return { x: 0, width: GAME_WIDTH, color: layerColor(0) };
}

function createSpawnLayer(width: number, index: number): Layer {
  return { x: -width, width, color: layerColor(index) };
}

export default function StackGame() {
  // Difficulty from URL param or default
  const searchParams = useSearchParams();
  const initialDifficulty = (() => {
    const d = searchParams.get("d");
    if (d && d in PRESETS) return d as Difficulty;
    return "normal" as Difficulty;
  })();

  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const config = PRESETS[difficulty];
  const configRef = useRef(config);
  configRef.current = config;

  const [layers, setLayers] = useState<Layer[]>([createBaseLayer()]);
  const [current, setCurrent] = useState<Layer | null>(
    createSpawnLayer(GAME_WIDTH, 1)
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  const [speed, setSpeed] = useState<number>(config.baseSpeed);
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [perfectFlash, setPerfectFlash] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Container sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [containerHeight, setContainerHeight] = useState(600);

  // Refs for animation loop values
  const layersRef = useRef(layers);
  const currentRef = useRef(current);
  const directionRef = useRef(direction);
  const speedRef = useRef(speed);
  const statusRef = useRef(status);
  const perfectFlashRef = useRef(perfectFlash);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const perfectFlashTimerRef = useRef<number>(0);

  // Sync refs
  layersRef.current = layers;
  currentRef.current = current;
  directionRef.current = direction;
  speedRef.current = speed;
  statusRef.current = status;
  perfectFlashRef.current = perfectFlash;

  // Load high score on mount
  useEffect(() => {
    setHighScore(getHighScore("stack"));
  }, []);

  // Container resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setContainerWidth(Math.min(rect.width, 500));
      setContainerHeight(rect.height);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animation loop
  const tick = useCallback(
    (time: number) => {
      if (statusRef.current !== "playing") return;

      const delta = lastTimeRef.current ? (time - lastTimeRef.current) / 16 : 1;
      lastTimeRef.current = time;

      const cur = currentRef.current;
      if (!cur) return;

      // Move current block
      let newX = cur.x + directionRef.current * speedRef.current * delta;
      let newDir = directionRef.current;

      // Bounce off edges
      if (newX + cur.width > GAME_WIDTH) {
        newX = GAME_WIDTH - cur.width;
        newDir = -1 as const;
      } else if (newX < 0) {
        newX = 0;
        newDir = 1 as const;
      }

      if (newDir !== directionRef.current) {
        setDirection(newDir);
      }
      setCurrent({ ...cur, x: newX });

      // Handle perfect flash fade
      if (perfectFlashTimerRef.current > 0) {
        perfectFlashTimerRef.current -= delta * 16;
        const remaining = perfectFlashTimerRef.current;
        const total = 500;
        if (remaining <= 0) {
          setPerfectFlash(0);
          perfectFlashTimerRef.current = 0;
        } else if (remaining < total * 0.4) {
          // Fade out in last 40%
          setPerfectFlash(remaining / (total * 0.4));
        } else if (remaining > total * 0.8) {
          // Fade in first 20%
          setPerfectFlash(1 - (remaining - total * 0.8) / (total * 0.2));
        } else {
          setPerfectFlash(1);
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [] // No dependencies -- we read from refs
  );

  const startLoop = useCallback(() => {
    lastTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  // Start/stop loop based on status
  useEffect(() => {
    if (status === "playing") {
      startLoop();
    } else {
      stopLoop();
    }
    return stopLoop;
  }, [status, startLoop, stopLoop]);

  const resetGame = useCallback(() => {
    const base = createBaseLayer();
    const spawn = createSpawnLayer(GAME_WIDTH, 1);
    setLayers([base]);
    setCurrent(spawn);
    setDirection(1);
    setSpeed(configRef.current.baseSpeed);
    setScore(0);
    setPerfectCount(0);
    setPerfectFlash(0);
    perfectFlashTimerRef.current = 0;
    setStatus("ready");
    setHighScore(getHighScore("stack"));
  }, []);

  const handleDrop = useCallback(() => {
    if (status === "ready") {
      setStatus("playing");
      return;
    }

    if (status !== "playing") return;

    const cur = currentRef.current;
    const currentLayers = layersRef.current;
    if (!cur || currentLayers.length === 0) return;

    const topLayer = currentLayers[currentLayers.length - 1];

    // Calculate overlap
    const overlapLeft = Math.max(cur.x, topLayer.x);
    const overlapRight = Math.min(cur.x + cur.width, topLayer.x + topLayer.width);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      // Game over
      setStatus("ended");
      const finalScore = currentLayers.length - 1; // -1 for base
      saveHighScore("stack", finalScore);
      setHighScore(Math.max(getHighScore("stack"), finalScore));
      return;
    }

    // Check for perfect alignment
    const xDiff = Math.abs(cur.x - topLayer.x);
    const widthDiff = Math.abs(cur.width - topLayer.width);
    const isPerfect = xDiff <= configRef.current.perfectTolerance && widthDiff <= configRef.current.perfectTolerance;

    let settledLayer: Layer;
    const newIndex = currentLayers.length;

    if (isPerfect) {
      // Perfect drop: keep the previous layer's dimensions
      settledLayer = {
        x: topLayer.x,
        width: topLayer.width,
        color: layerColor(newIndex),
      };
      setPerfectCount((c) => c + 1);
      setPerfectFlash(1);
      perfectFlashTimerRef.current = 500;
    } else {
      // Trim overhang
      settledLayer = {
        x: overlapLeft,
        width: overlapWidth,
        color: layerColor(newIndex),
      };
      setPerfectCount(0);
    }

    const newLayers = [...currentLayers, settledLayer];
    const newScore = newLayers.length - 1; // -1 for base
    const newSpeed = Math.min(configRef.current.baseSpeed + configRef.current.speedIncrement * newScore, configRef.current.maxSpeed);

    setLayers(newLayers);
    setScore(newScore);
    setSpeed(newSpeed);

    // Spawn next block
    const nextLayer = createSpawnLayer(settledLayer.width, newLayers.length);
    setCurrent(nextLayer);
    // Alternate starting direction
    setDirection(newScore % 2 === 0 ? 1 : -1);
  }, [status]);

  const shareText = `Stack \u{1F3D7}\uFE0F (${config.label}) \u2014 ${score} high!\n${"\u{1F7E7}".repeat(Math.min(score, 20))}`;

  const difficultySelector = (
    <div className="flex gap-2 justify-center flex-wrap">
      {DIFFICULTY_KEYS.map((key) => (
        <button
          key={key}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDifficulty(key);
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 min-h-[48px] ${
            difficulty === key
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {PRESETS[key].label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full flex-1 gap-3">
      {status === "ready" && (
        <div className="pb-1">{difficultySelector}</div>
      )}

      <div
        ref={containerRef}
        className="relative w-full flex-1 rounded-xl overflow-hidden cursor-pointer select-none"
        style={{ maxWidth: 500 }}
        onPointerDown={handleDrop}
      >
        <StackCanvas
          layers={layers}
          current={current}
          score={score}
          highScore={highScore}
          status={status}
          perfectFlash={perfectFlash}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
        />
      </div>

      {status === "ended" && (
        <div className="flex flex-col items-center gap-3 pb-2">
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              resetGame();
            }}
            className="px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm transition-all active:scale-95 min-h-[48px]"
          >
            Play Again
          </button>
          {difficultySelector}
          <ShareButton text={shareText} color="#f97316" />
        </div>
      )}
    </div>
  );
}
