"use client";

import { useReducer, useEffect, useCallback, useState } from "react";
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
}

type MorphAction =
  | { type: "SET_INPUT"; value: string }
  | { type: "SUBMIT" }
  | { type: "CLEAR_ERROR" }
  | { type: "RESTORE"; chain: string[] };

function diffByOne(a: string, b: string): boolean {
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs++;
  }
  return diffs === 1;
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

      default:
        return state;
    }
  };
}

function buildShareText(
  puzzleNumber: number,
  chain: string[],
  par: number
): string {
  const steps = chain.length - 1;
  const chainText = chain.join(" → ");
  const rating =
    steps <= par ? " (Par!)" : steps <= par + 2 ? "" : " (Keep practicing!)";
  return `Morph #${puzzleNumber} — ${steps} steps${rating}\n${chainText}`;
}

export default function MorphGame() {
  const seed = getDailySeed();
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
  });

  const [showStats, setShowStats] = useState(false);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if already played today on mount
  useEffect(() => {
    setMounted(true);
    if (hasPlayedToday(GAME_ID)) {
      const stats = getStats(GAME_ID);
      if (stats.todayResult?.shareText) {
        // Parse the chain from the share text
        const chainMatch = stats.todayResult.shareText.match(/\n(.+)$/);
        if (chainMatch) {
          const savedChain = chainMatch[1].split(" → ").map((w: string) => w.trim());
          if (savedChain.length > 0 && savedChain[0] === puzzle.start) {
            dispatch({ type: "RESTORE", chain: savedChain });
          }
        }
      }
    }
  }, [puzzle.start]);

  // Save result on win
  useEffect(() => {
    if (state.status === "won" && mounted) {
      const steps = state.chain.length - 1;
      const shareText = buildShareText(puzzleNumber, state.chain, state.par);
      saveResult(GAME_ID, steps, shareText, true);
    }
  }, [state.status, state.chain, mounted, puzzleNumber, state.par]);

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

  const steps = state.chain.length - 1;
  const stats = mounted ? getStats(GAME_ID) : null;
  const shareText = buildShareText(puzzleNumber, state.chain, state.par);

  if (!mounted) {
    return (
      <GameShell title="Morph" color={MORPH_COLOR} puzzleNumber={puzzleNumber}>
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
      puzzleNumber={puzzleNumber}
      onShowStats={() => setShowStats(true)}
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
            <button
              onClick={handleUndo}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
              Undo last word
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4 animate-slide-up">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">
              {steps <= state.par ? "Brilliant!" : steps <= state.par + 2 ? "Well done!" : "You made it!"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              You morphed {state.startWord} into {state.targetWord} in {steps}{" "}
              {steps === 1 ? "step" : "steps"}
            </p>
          </div>
          <ShareButton text={shareText} color={MORPH_COLOR} />
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
