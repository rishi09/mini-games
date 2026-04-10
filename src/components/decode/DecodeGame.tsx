"use client";

import { useReducer, useEffect, useCallback, useState } from "react";
import { getDailySeed, getPuzzleNumber } from "@/lib/daily-seed";
import { createRng, shuffle } from "@/lib/random";
import { getStats, saveResult, hasPlayedToday } from "@/lib/storage";
import GameShell from "@/components/shared/GameShell";
import ShareButton from "@/components/shared/ShareButton";
import StatsModal from "@/components/shared/StatsModal";
import CipherText from "./CipherText";
import LetterPicker from "./LetterPicker";
import quotes from "@/data/quotes.json";

const GAME_ID = "decode";
const GAME_COLOR = "#10b981";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface DecodeState {
  originalQuote: string;
  author: string;
  cipherMap: Record<string, string>;
  reverseCipherMap: Record<string, string>;
  guesses: Record<string, string>;
  selectedCipher: string | null;
  status: "playing" | "won";
  startTime: number;
  hintsUsed: number;
  elapsedMs: number;
  revealed: boolean;
}

type DecodeAction =
  | { type: "SELECT_CIPHER"; letter: string }
  | { type: "ASSIGN_LETTER"; letter: string }
  | { type: "CLEAR_SELECTED" }
  | { type: "HINT"; rng: () => number }
  | { type: "TICK"; now: number }
  | { type: "RESTORE"; guesses: Record<string, string>; hintsUsed: number; elapsedMs: number }
  | { type: "RESET" }
  | { type: "SHOW_ANSWER" };

function generateCipherMap(rng: () => number): Record<string, string> {
  const shuffled = shuffle(ALPHABET, rng);

  // Fix self-mappings to ensure a derangement
  for (let i = 0; i < 26; i++) {
    if (shuffled[i] === ALPHABET[i]) {
      // Swap with the next element (wrap around)
      const swapIdx = (i + 1) % 26;
      [shuffled[i], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[i]];
    }
  }

  const map: Record<string, string> = {};
  for (let i = 0; i < 26; i++) {
    map[ALPHABET[i]] = shuffled[i];
  }
  return map;
}

function getUniqueLetters(text: string): string[] {
  const seen = new Set<string>();
  for (const ch of text) {
    if (/[A-Z]/.test(ch)) seen.add(ch);
  }
  return Array.from(seen);
}

function checkWin(
  originalQuote: string,
  cipherMap: Record<string, string>,
  guesses: Record<string, string>
): boolean {
  const uniqueLetters = getUniqueLetters(originalQuote);
  for (const plain of uniqueLetters) {
    const cipher = cipherMap[plain];
    if (guesses[cipher] !== plain) return false;
  }
  return true;
}

function reducer(state: DecodeState, action: DecodeAction): DecodeState {
  switch (action.type) {
    case "SELECT_CIPHER": {
      if (state.status === "won") return state;
      return { ...state, selectedCipher: action.letter };
    }

    case "ASSIGN_LETTER": {
      if (state.status === "won" || !state.selectedCipher) return state;

      const newGuesses = { ...state.guesses };
      const targetCipher = state.selectedCipher;
      const newPlain = action.letter;

      // If this plaintext letter is already assigned to another cipher letter, remove it
      for (const [cipher, plain] of Object.entries(newGuesses)) {
        if (plain === newPlain && cipher !== targetCipher) {
          delete newGuesses[cipher];
          break;
        }
      }

      newGuesses[targetCipher] = newPlain;

      const won = checkWin(state.originalQuote, state.cipherMap, newGuesses);

      return {
        ...state,
        guesses: newGuesses,
        selectedCipher: won ? null : state.selectedCipher,
        status: won ? "won" : "playing",
      };
    }

    case "CLEAR_SELECTED": {
      if (state.status === "won" || !state.selectedCipher) return state;
      const newGuesses = { ...state.guesses };
      delete newGuesses[state.selectedCipher];
      return { ...state, guesses: newGuesses };
    }

    case "HINT": {
      if (state.status === "won") return state;

      // Find all cipher letters that are not yet correctly guessed
      const uniqueLetters = getUniqueLetters(state.originalQuote);
      const unguessed: string[] = [];
      for (const plain of uniqueLetters) {
        const cipher = state.cipherMap[plain];
        if (state.guesses[cipher] !== plain) {
          unguessed.push(plain);
        }
      }

      if (unguessed.length === 0) return state;

      const idx = Math.floor(action.rng() * unguessed.length);
      const plainToReveal = unguessed[idx];
      const cipherToReveal = state.cipherMap[plainToReveal];

      const newGuesses = { ...state.guesses };

      // Remove any existing assignment of this plaintext letter
      for (const [cipher, plain] of Object.entries(newGuesses)) {
        if (plain === plainToReveal) {
          delete newGuesses[cipher];
          break;
        }
      }

      newGuesses[cipherToReveal] = plainToReveal;

      const won = checkWin(state.originalQuote, state.cipherMap, newGuesses);

      return {
        ...state,
        guesses: newGuesses,
        hintsUsed: state.hintsUsed + 1,
        selectedCipher: won ? null : state.selectedCipher,
        status: won ? "won" : "playing",
      };
    }

    case "TICK": {
      if (state.status === "won") return state;
      return { ...state, elapsedMs: action.now - state.startTime };
    }

    case "RESTORE": {
      return {
        ...state,
        guesses: action.guesses,
        hintsUsed: action.hintsUsed,
        elapsedMs: action.elapsedMs,
        status: "won",
        selectedCipher: null,
      };
    }

    case "RESET": {
      if (state.status === "won") return state;
      return {
        ...state,
        guesses: {},
        selectedCipher: null,
      };
    }

    case "SHOW_ANSWER": {
      if (state.status === "won") return state;
      const correctGuesses: Record<string, string> = {};
      const uniqueLetters = getUniqueLetters(state.originalQuote);
      for (const plain of uniqueLetters) {
        const cipher = state.cipherMap[plain];
        correctGuesses[cipher] = plain;
      }
      return {
        ...state,
        guesses: correctGuesses,
        status: "won",
        selectedCipher: null,
        revealed: true,
      };
    }

    default:
      return state;
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildShareText(
  puzzleNumber: number,
  elapsedMs: number,
  originalQuote: string,
  author: string,
  isPractice: boolean = false
): string {
  const time = formatTime(elapsedMs);
  const preview =
    originalQuote.length > 30
      ? originalQuote.slice(0, 30) + "..."
      : originalQuote;
  const header = isPractice ? "Decode Practice" : `Decode #${puzzleNumber}`;
  let text = `${header} \u2014 ${time} \uD83D\uDC9A\n"${preview}" \u2014 ${author}`;
  if (isPractice && typeof window !== "undefined") {
    text += `\n${window.location.href}`;
  }
  return text;
}

function initState(seed: number): DecodeState {
  const quoteIndex = seed % quotes.length;
  const quote = quotes[quoteIndex];

  const rng = createRng(seed);
  const cipherMap = generateCipherMap(rng);

  const reverseCipherMap: Record<string, string> = {};
  for (const [plain, cipher] of Object.entries(cipherMap)) {
    reverseCipherMap[cipher] = plain;
  }

  return {
    originalQuote: quote.text,
    author: quote.author,
    cipherMap,
    reverseCipherMap,
    guesses: {},
    selectedCipher: null,
    status: "playing",
    startTime: Date.now(),
    hintsUsed: 0,
    elapsedMs: 0,
    revealed: false,
  };
}

export default function DecodeGame() {
  const puzzleNumber = getPuzzleNumber();
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
  const [state, dispatch] = useReducer(reducer, seed, initState);
  const [showStats, setShowStats] = useState(false);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [hintRng] = useState(() => createRng(Date.now()));
  const [copiedPuzzle, setCopiedPuzzle] = useState(false);

  // Check if already played today (daily mode only)
  useEffect(() => {
    if (isPractice) return;
    if (hasPlayedToday(GAME_ID)) {
      const stats = getStats(GAME_ID);
      if (stats.todayResult) {
        setAlreadyPlayed(true);
        // We need to restore the completed state
        // Reconstruct all correct guesses
        const guesses: Record<string, string> = {};
        const uniqueLetters = getUniqueLetters(state.originalQuote);
        for (const plain of uniqueLetters) {
          const cipher = state.cipherMap[plain];
          guesses[cipher] = plain;
        }
        dispatch({
          type: "RESTORE",
          guesses,
          hintsUsed: 0,
          elapsedMs: (stats.todayResult.score ?? 0) * 1000,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer tick
  useEffect(() => {
    if (state.status === "won" || alreadyPlayed) return;
    const interval = setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.status, alreadyPlayed]);

  // Save result when won (daily mode only)
  useEffect(() => {
    if (isPractice) return;
    if (state.status === "won" && !alreadyPlayed && !state.revealed) {
      const shareText = buildShareText(
        puzzleNumber,
        state.elapsedMs,
        state.originalQuote,
        state.author,
        false
      );
      const score = Math.floor(state.elapsedMs / 1000);
      saveResult(GAME_ID, score, shareText, true);
    }
  }, [state.status, alreadyPlayed, isPractice, puzzleNumber, state.elapsedMs, state.originalQuote, state.author]);

  const handleSelectCipher = useCallback((letter: string) => {
    dispatch({ type: "SELECT_CIPHER", letter });
  }, []);

  const handlePickLetter = useCallback((letter: string) => {
    dispatch({ type: "ASSIGN_LETTER", letter });
  }, []);

  const handleHint = useCallback(() => {
    dispatch({ type: "HINT", rng: hintRng });
  }, [hintRng]);

  const handleClear = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTED" });
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.status === "won") return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        if (state.selectedCipher) {
          dispatch({ type: "ASSIGN_LETTER", letter: key });
        }
      } else if (e.key === "Backspace" || e.key === "Delete") {
        dispatch({ type: "CLEAR_SELECTED" });
      } else if (e.key === "Escape") {
        dispatch({ type: "SELECT_CIPHER", letter: "" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.status, state.selectedCipher]);

  const handleNewPuzzle = useCallback(() => {
    window.location.href = `${window.location.pathname}?p=1&seed=${Date.now()}`;
  }, []);

  const handleSharePuzzle = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedPuzzle(true);
    setTimeout(() => setCopiedPuzzle(false), 2000);
  }, []);

  const shareText = buildShareText(
    puzzleNumber,
    state.elapsedMs,
    state.originalQuote,
    state.author,
    isPractice
  );

  const stats = getStats(GAME_ID);

  return (
    <GameShell
      title="Decode"
      color={GAME_COLOR}
      puzzleNumber={isPractice ? undefined : puzzleNumber}
      practiceMode={isPractice}
      onShowStats={isPractice ? undefined : () => setShowStats(true)}
    >
      {/* Timer */}
      <div className="text-center mb-4">
        {state.status === "playing" ? (
          <span className="text-sm font-mono text-gray-500">
            {formatTime(state.elapsedMs)}
          </span>
        ) : state.revealed ? (
          <div className="animate-bounce-once">
            <span className="text-sm font-semibold text-gray-500">
              Answer revealed
            </span>
          </div>
        ) : (
          <div className="animate-bounce-once">
            <span className="text-sm font-semibold text-emerald-600">
              Solved in {formatTime(state.elapsedMs)}!
            </span>
          </div>
        )}
      </div>

      {/* Cipher text display */}
      <div className="flex-1 flex flex-col items-center justify-start w-full pb-4 pt-2">
        <CipherText
          originalQuote={state.originalQuote}
          cipherMap={state.cipherMap}
          guesses={state.guesses}
          selectedCipher={state.selectedCipher}
          onSelectCipher={handleSelectCipher}
          status={state.status}
        />

        {/* Author attribution */}
        <div className="mt-4 text-sm text-gray-400 italic text-center">
          {state.status === "won"
            ? `\u2014 ${state.author}`
            : `${getUniqueLetters(state.originalQuote).length} unique letters`}
        </div>

        {state.hintsUsed > 0 && (
          <div className="mt-1 text-xs text-gray-400">
            Hints used: {state.hintsUsed}
          </div>
        )}

        {/* Reset / Give Up buttons while playing */}
        {state.status === "playing" && Object.keys(state.guesses).length > 0 && (
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => dispatch({ type: "SHOW_ANSWER" })}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Give Up
            </button>
          </div>
        )}

        {/* Win state */}
        {state.status === "won" && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <ShareButton text={shareText} color={GAME_COLOR} />
            {isPractice ? (
              <>
                <button
                  onClick={handleSharePuzzle}
                  className="px-5 py-2.5 rounded-full border border-emerald-500 text-emerald-600 font-medium text-sm transition-all active:scale-95"
                >
                  {copiedPuzzle ? "Copied!" : "Share Puzzle"}
                </button>
                <button
                  onClick={handleNewPuzzle}
                  className="px-5 py-2.5 rounded-full bg-emerald-500 text-white font-semibold text-sm transition-all active:scale-95"
                >
                  New Puzzle
                </button>
              </>
            ) : (
              <button
                onClick={handleNewPuzzle}
                className="px-5 py-2.5 rounded-full bg-gray-100 text-gray-600 font-medium text-sm transition-all active:scale-95 hover:bg-gray-200"
              >
                Practice Mode
              </button>
            )}
          </div>
        )}
      </div>

      {/* Keyboard */}
      <LetterPicker
        guesses={state.guesses}
        reverseCipherMap={state.reverseCipherMap}
        selectedCipher={state.selectedCipher}
        onPickLetter={handlePickLetter}
        onHint={handleHint}
        onClear={handleClear}
        status={state.status}
      />

      {/* Stats modal */}
      {showStats && (
        <StatsModal
          stats={stats}
          gameTitle="Decode"
          color={GAME_COLOR}
          onClose={() => setShowStats(false)}
        />
      )}
    </GameShell>
  );
}
