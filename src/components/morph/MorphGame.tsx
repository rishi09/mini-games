"use client";

import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import { getDailySeed, getPuzzleNumber } from "@/lib/daily-seed";
import { getStats, saveResult, hasPlayedToday } from "@/lib/storage";
import GameShell from "@/components/shared/GameShell";
import ShareButton from "@/components/shared/ShareButton";
import StatsModal from "@/components/shared/StatsModal";
import WordChain from "./WordChain";
import WordInput from "./WordInput";
import puzzles from "@/data/morph-puzzles.json";
import wordList from "@/data/words-4.json";

const GAME_ID = "morph";
const MORPH_COLOR = "#06b6d4";
const wordSet = new Set(wordList.map((w: string) => w.toUpperCase()));

interface MorphState {
  startWord: string;
  targetWord: string;
  chain: string[];
  currentInput: string;
  status: "playing" | "won";
  par: number;
  error?: string;
  revealed: boolean;
}

type MorphAction =
  | { type: "SET_INPUT"; value: string }
  | { type: "SUBMIT" }
  | { type: "CLEAR_ERROR" }
  | { type: "RESTORE"; chain: string[] }
  | { type: "RESET" }
  | { type: "SHOW_ANSWER"; solution: string[] };

function diffByOne(a: string, b: string): boolean {
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs++;
  }
  return diffs === 1;
}

function findPath(start: string, target: string): string[] | null {
  if (start === target) return [start];
  const queue: string[][] = [[start]];
  const visited = new Set<string>([start]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (let i = 0; i < last.length; i++) {
      for (let c = 65; c <= 90; c++) {
        const ch = String.fromCharCode(c);
        if (ch === last[i]) continue;
        const neighbor = last.slice(0, i) + ch + last.slice(i + 1);
        if (!wordSet.has(neighbor) || visited.has(neighbor)) continue;
        const newPath = [...path, neighbor];
        if (neighbor === target) return newPath;
        visited.add(neighbor);
        queue.push(newPath);
      }
    }
  }
  return null;
}

function createReducer(par: number) {
  return function reducer(state: MorphState, action: MorphAction): MorphState {
    switch (action.type) {
      case "SET_INPUT":
        return { ...state, currentInput: action.value, error: undefined };

      case "SUBMIT": {
        const word = state.currentInput.toUpperCase();
        const lastWord = state.chain[state.chain.length - 1];

        if (word.length !== 4) {
          return { ...state, error: "Enter a 4-letter word" };
        }

        if (!wordSet.has(word)) {
          return { ...state, error: "Not a valid word" };
        }

        if (!diffByOne(lastWord, word)) {
          return { ...state, error: "Change exactly one letter" };
        }

        if (state.chain.includes(word)) {
          return { ...state, error: "Already used that word" };
        }

        const newChain = [...state.chain, word];
        const won = word === state.targetWord;

        return {
          ...state,
          chain: newChain,
          currentInput: "",
          status: won ? "won" : "playing",
          error: undefined,
        };
      }

      case "CLEAR_ERROR":
        return { ...state, error: undefined };

      case "RESTORE": {
        const lastWord = action.chain[action.chain.length - 1];
        const isWon = lastWord === state.targetWord;
        return {
          ...state,
          chain: action.chain,
          status: isWon ? "won" : "playing",
          currentInput: "",
          error: undefined,
        };
      }

      case "RESET": {
        if (state.status === "won") return state;
        return {
          ...state,
          chain: [state.startWord],
          currentInput: "",
          error: undefined,
        };
      }

      case "SHOW_ANSWER": {
        return {
          ...state,
          chain: action.solution,
          status: "won",
          currentInput: "",
          error: undefined,
          revealed: true,
        };
      }

      default:
        return state;
    }
  };
}

function buildShareText(
  puzzleNumber: number,
  chain: string[],
  par: number,
  isPractice: boolean
): string {
  const steps = chain.length - 1;
  const chainText = chain.join(" → ");
  const rating =
    steps <= par ? " (Par!)" : steps <= par + 2 ? "" : " (Keep practicing!)";
  const label = isPractice ? "Morph Practice" : `Morph #${puzzleNumber}`;
  return `${label} — ${steps} steps${rating}\n${chainText}`;
}

export default function MorphGame() {
  const [isPractice] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("p");
  });
  const [practiceSeed] = useState(() => {
    if (typeof window === "undefined") return 0;
    const params = new URLSearchParams(window.location.search);
    const raw = parseInt(params.get("seed") || "", 10);
    return Number.isFinite(raw) && raw > 0 ? raw : Date.now();
  });

  const seed = isPractice ? practiceSeed : getDailySeed();
  const puzzleIndex = seed % puzzles.length;
  const puzzle = puzzles[puzzleIndex];
  const puzzleNumber = getPuzzleNumber();

  const [state, dispatch] = useReducer(createReducer(puzzle.par), {
    startWord: puzzle.start,
    targetWord: puzzle.target,
    chain: [puzzle.start],
    currentInput: "",
    status: "playing" as const,
    par: puzzle.par,
    revealed: false,
  });

  const [showStats, setShowStats] = useState(false);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sharePuzzleCopied, setSharePuzzleCopied] = useState(false);
  const savedRef = useRef(false);

  // Check if already played today on mount (daily mode only)
  useEffect(() => {
    setMounted(true);
    if (!isPractice && hasPlayedToday(GAME_ID)) {
      savedRef.current = true;
      const stats = getStats(GAME_ID);
      if (stats.todayResult?.shareText) {
        const chainMatch = stats.todayResult.shareText.match(/\n(.+)$/);
        if (chainMatch) {
          const savedChain = chainMatch[1].split(" → ").map((w: string) => w.trim());
          if (savedChain.length > 0 && savedChain[0] === puzzle.start) {
            dispatch({ type: "RESTORE", chain: savedChain });
          }
        }
      }
    }
  }, [puzzle.start, isPractice]);

  // Save result on win (daily mode only)
  useEffect(() => {
    if (state.status === "won" && mounted && !isPractice && !state.revealed && !savedRef.current) {
      savedRef.current = true;
      const steps = state.chain.length - 1;
      const shareText = buildShareText(puzzleNumber, state.chain, state.par, false);
      saveResult(GAME_ID, steps, shareText, true);
    }
  }, [state.status, state.chain, mounted, puzzleNumber, state.par, isPractice]);

  // Auto-clear errors
  useEffect(() => {
    if (state.error) {
      setShake(true);
      const shakeTimer = setTimeout(() => setShake(false), 400);
      const errorTimer = setTimeout(() => dispatch({ type: "CLEAR_ERROR" }), 1500);
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(errorTimer);
      };
    }
  }, [state.error]);

  const handleSubmit = useCallback(() => {
    dispatch({ type: "SUBMIT" });
  }, []);

  const handleUndo = useCallback(() => {
    if (state.chain.length > 1 && state.status === "playing") {
      const newChain = state.chain.slice(0, -1);
      dispatch({ type: "RESTORE", chain: newChain });
    }
  }, [state.chain, state.status]);

  const handleGiveUp = useCallback(() => {
    const solution = findPath(state.startWord, state.targetWord);
    if (solution) {
      dispatch({ type: "SHOW_ANSWER", solution });
    }
  }, [state.startWord, state.targetWord]);

  const handleSharePuzzle = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setSharePuzzleCopied(true);
      setTimeout(() => setSharePuzzleCopied(false), 2000);
    });
  }, []);

  const steps = state.chain.length - 1;
  const stats = mounted ? getStats(GAME_ID) : null;
  const shareText = buildShareText(puzzleNumber, state.chain, state.par, isPractice);

  if (!mounted) {
    return (
      <GameShell title="Morph" color={MORPH_COLOR} practiceMode={isPractice} puzzleNumber={isPractice ? undefined : puzzleNumber}>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Loading...
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Morph"
      color={MORPH_COLOR}
      practiceMode={isPractice}
      puzzleNumber={isPractice ? undefined : puzzleNumber}
      onShowStats={isPractice ? undefined : () => setShowStats(true)}
    >
      {/* Par info */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500">
          Transform{" "}
          <span className="font-bold text-gray-800">{state.startWord}</span>
          {" → "}
          <span className="font-bold text-gray-800">{state.targetWord}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Change one letter at a time. Par: {state.par} steps
        </p>
      </div>

      {/* Chain display */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto pb-2">
        <WordChain
          chain={state.chain}
          targetWord={state.targetWord}
          won={state.status === "won"}
        />
      </div>

      {/* Step counter */}
      <div className="text-center my-2">
        <span
          className={`text-sm font-medium ${
            state.status === "won"
              ? steps <= state.par
                ? "text-green-600"
                : "text-[#06b6d4]"
              : "text-gray-500"
          }`}
        >
          {steps} {steps === 1 ? "step" : "steps"}
          {state.status === "won" && steps <= state.par && " — Par!"}
          {state.status === "won" && steps > state.par && ` (par: ${state.par})`}
        </span>
      </div>

      {/* Error message */}
      {state.error && (
        <div className="text-center mb-2 animate-slide-up">
          <span className="text-sm text-red-500 font-medium">
            {state.error}
          </span>
        </div>
      )}

      {/* Input or win state */}
      {state.status === "playing" ? (
        <div className="flex flex-col items-center gap-2 pb-2">
          <WordInput
            value={state.currentInput}
            onChange={(v) => dispatch({ type: "SET_INPUT", value: v })}
            onSubmit={handleSubmit}
            disabled={false}
            shake={shake}
          />
          {state.chain.length > 1 && (
            <div className="flex items-center gap-4 mt-1">
              <button
                onClick={handleUndo}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Undo
              </button>
              <button
                onClick={() => dispatch({ type: "RESET" })}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleGiveUp}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Give Up
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4 animate-slide-up">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">
              {state.revealed ? "Solution" : steps <= state.par ? "Brilliant!" : steps <= state.par + 2 ? "Well done!" : "You made it!"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {state.revealed
                ? `${state.startWord} → ${state.targetWord} in ${steps} steps (par: ${state.par})`
                : `You morphed ${state.startWord} into ${state.targetWord} in ${steps} ${steps === 1 ? "step" : "steps"}`}
            </p>
          </div>
          <ShareButton text={shareText} color={MORPH_COLOR} />
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isPractice ? (
              <>
                <button
                  onClick={handleSharePuzzle}
                  className="px-5 py-2.5 rounded-full border border-cyan-500 text-cyan-600 font-medium text-sm transition-all active:scale-95"
                >
                  {sharePuzzleCopied ? "Copied!" : "Share Puzzle"}
                </button>
                <button
                  onClick={() => {
                    window.location.href = `${window.location.pathname}?p=1&seed=${Date.now()}`;
                  }}
                  className="px-5 py-2.5 rounded-full bg-cyan-500 text-white font-semibold text-sm transition-all active:scale-95"
                >
                  New Puzzle
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  window.location.href = `${window.location.pathname}?p=1`;
                }}
                className="px-5 py-2.5 rounded-full bg-gray-100 text-gray-600 font-medium text-sm transition-all active:scale-95 hover:bg-gray-200"
              >
                Practice Mode
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats modal */}
      {showStats && stats && (
        <StatsModal
          stats={stats}
          gameTitle="Morph"
          color={MORPH_COLOR}
          onClose={() => setShowStats(false)}
        />
      )}
    </GameShell>
  );
}
