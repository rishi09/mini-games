"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import puzzles from "@/data/shade-puzzles.json";
import { computeClues, checkWin, type CellState } from "@/lib/nonogram";
import { getDailySeed, getPuzzleNumber } from "@/lib/daily-seed";
import {
  getStats,
  saveResult,
  hasPlayedToday,
  type GameStats,
} from "@/lib/storage";
import GameShell from "@/components/shared/GameShell";
import ShareButton from "@/components/shared/ShareButton";
import StatsModal from "@/components/shared/StatsModal";
import Grid from "./Grid";

const GAME_ID = "shade";
const SHADE_COLOR = "#8b5cf6";

interface ShadeState {
  solution: number[][];
  grid: CellState[][];
  rowClues: number[][];
  colClues: number[][];
  mode: "shade" | "mark";
  status: "playing" | "won";
  startTime: number;
  elapsed: number;
  label: string;
}

type ShadeAction =
  | { type: "TOGGLE_CELL"; row: number; col: number }
  | { type: "DRAG_CELL"; row: number; col: number }
  | { type: "DRAG_END" }
  | { type: "TOGGLE_MODE" }
  | { type: "TICK" }
  | { type: "RESTORE_WON"; elapsed: number };

interface DragState {
  action: CellState;
  lastCell: string;
}

let dragState: DragState | null = null;

function createInitialState(): ShadeState {
  const seed = getDailySeed();
  const puzzleIndex = seed % puzzles.length;
  const puzzle = puzzles[puzzleIndex];
  const { rowClues, colClues } = computeClues(puzzle.grid);
  const size = puzzle.grid.length;

  return {
    solution: puzzle.grid,
    grid: Array.from({ length: size }, () =>
      Array.from({ length: size }, () => "empty" as CellState)
    ),
    rowClues,
    colClues,
    mode: "shade",
    status: "playing",
    startTime: Date.now(),
    elapsed: 0,
    label: puzzle.label,
  };
}

function reducer(state: ShadeState, action: ShadeAction): ShadeState {
  switch (action.type) {
    case "TOGGLE_CELL": {
      if (state.status === "won") return state;
      const { row, col } = action;
      const newGrid = state.grid.map((r) => [...r]);
      const current = newGrid[row][col];

      let newValue: CellState;
      if (state.mode === "shade") {
        newValue = current === "shaded" ? "empty" : "shaded";
      } else {
        newValue = current === "marked" ? "empty" : "marked";
      }
      newGrid[row][col] = newValue;

      // Set drag state
      dragState = {
        action: newValue,
        lastCell: `${row}-${col}`,
      };

      const won = checkWin(newGrid, state.solution);
      return {
        ...state,
        grid: newGrid,
        status: won ? "won" : "playing",
      };
    }
    case "DRAG_CELL": {
      if (state.status === "won" || !dragState) return state;
      const { row, col } = action;
      const cellKey = `${row}-${col}`;
      if (dragState.lastCell === cellKey) return state;
      dragState.lastCell = cellKey;

      const newGrid = state.grid.map((r) => [...r]);
      newGrid[row][col] = dragState.action;

      const won = checkWin(newGrid, state.solution);
      return {
        ...state,
        grid: newGrid,
        status: won ? "won" : "playing",
      };
    }
    case "DRAG_END": {
      dragState = null;
      return state;
    }
    case "TOGGLE_MODE": {
      return {
        ...state,
        mode: state.mode === "shade" ? "mark" : "shade",
      };
    }
    case "TICK": {
      if (state.status === "won") return state;
      return {
        ...state,
        elapsed: Math.floor((Date.now() - state.startTime) / 1000),
      };
    }
    case "RESTORE_WON": {
      // Restore completed state
      const newGrid = state.solution.map((row) =>
        row.map((cell) => (cell === 1 ? "shaded" : "empty") as CellState)
      );
      return {
        ...state,
        grid: newGrid,
        status: "won",
        elapsed: action.elapsed,
      };
    }
    default:
      return state;
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildShareText(
  puzzleNumber: number,
  elapsed: number,
  solution: number[][]
): string {
  const time = formatTime(elapsed);
  const emojiGrid = solution
    .map((row) => row.map((cell) => (cell === 1 ? "\u2B1B" : "\u2B1C")).join(""))
    .join("\n");
  return `Shade #${puzzleNumber} \u2014 ${time}\n${emojiGrid}`;
}

export default function ShadeGame() {
  const puzzleNumber = getPuzzleNumber();
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [shareText, setShareText] = useState("");
  const savedRef = useRef(false);

  // Check if already played today on mount
  useEffect(() => {
    if (hasPlayedToday(GAME_ID)) {
      const existingStats = getStats(GAME_ID);
      if (existingStats.todayResult) {
        dispatch({
          type: "RESTORE_WON",
          elapsed: existingStats.todayResult.score,
        });
        setShareText(existingStats.todayResult.shareText);
        savedRef.current = true;
      }
    }
  }, []);

  // Timer
  useEffect(() => {
    if (state.status === "won") return;
    const interval = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(interval);
  }, [state.status]);

  // Save result on win
  useEffect(() => {
    if (state.status === "won" && !savedRef.current) {
      savedRef.current = true;
      const text = buildShareText(puzzleNumber, state.elapsed, state.solution);
      setShareText(text);
      saveResult(GAME_ID, state.elapsed, text, true);
    }
  }, [state.status, state.elapsed, state.solution, puzzleNumber]);

  const handleShowStats = useCallback(() => {
    setStats(getStats(GAME_ID));
    setShowStats(true);
  }, []);

  const handleCellToggle = useCallback(
    (row: number, col: number) => dispatch({ type: "TOGGLE_CELL", row, col }),
    []
  );

  const handleDragCell = useCallback(
    (row: number, col: number) => dispatch({ type: "DRAG_CELL", row, col }),
    []
  );

  const handleDragEnd = useCallback(
    () => dispatch({ type: "DRAG_END" }),
    []
  );

  return (
    <GameShell
      title="Shade"
      color={SHADE_COLOR}
      puzzleNumber={puzzleNumber}
      onShowStats={handleShowStats}
    >
      {/* Timer */}
      <div className="text-center mb-3">
        <span className="text-lg font-mono text-gray-500 tabular-nums">
          {formatTime(state.elapsed)}
        </span>
      </div>

      {/* Grid */}
      <Grid
        grid={state.grid}
        solution={state.solution}
        rowClues={state.rowClues}
        colClues={state.colClues}
        mode={state.mode}
        status={state.status}
        onCellToggle={handleCellToggle}
        onDragCell={handleDragCell}
        onDragEnd={handleDragEnd}
      />

      {/* Mode toggle */}
      {state.status === "playing" && (
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => dispatch({ type: "TOGGLE_MODE" })}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm
              transition-all active:scale-95
              ${
                state.mode === "shade"
                  ? "bg-[#8b5cf6] text-white"
                  : "bg-gray-200 text-gray-600"
              }
            `}
          >
            <div
              className={`w-4 h-4 rounded-sm ${
                state.mode === "shade" ? "bg-white/30" : "bg-gray-400"
              }`}
            />
            Shade
          </button>
          <button
            onClick={() => dispatch({ type: "TOGGLE_MODE" })}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm
              transition-all active:scale-95
              ${
                state.mode === "mark"
                  ? "bg-[#8b5cf6] text-white"
                  : "bg-gray-200 text-gray-600"
              }
            `}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M4 4L12 12" />
              <path d="M12 4L4 12" />
            </svg>
            Mark
          </button>
        </div>
      )}

      {/* Win state */}
      {state.status === "won" && (
        <div className="flex flex-col items-center gap-4 mt-6 animate-slide-up">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{state.label}</p>
            <p className="text-sm text-gray-500 mt-1">
              Solved in {formatTime(state.elapsed)}
            </p>
          </div>
          <ShareButton text={shareText} color={SHADE_COLOR} />
        </div>
      )}

      {/* Stats modal */}
      {showStats && stats && (
        <StatsModal
          stats={stats}
          gameTitle="Shade"
          color={SHADE_COLOR}
          onClose={() => setShowStats(false)}
        />
      )}
    </GameShell>
  );
}
