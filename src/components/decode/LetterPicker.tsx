"use client";

interface LetterPickerProps {
  guesses: Record<string, string>;
  reverseCipherMap: Record<string, string>;
  selectedCipher: string | null;
  onPickLetter: (letter: string) => void;
  onHint: () => void;
  onClear: () => void;
  status: "playing" | "won";
}

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export default function LetterPicker({
  guesses,
  reverseCipherMap,
  selectedCipher,
  onPickLetter,
  onHint,
  onClear,
  status,
}: LetterPickerProps) {
  // Build reverse guesses: plaintext guess -> cipher letter it's assigned to
  const assignedTo: Record<string, string> = {};
  for (const [cipher, plain] of Object.entries(guesses)) {
    assignedTo[plain] = cipher;
  }

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-1 py-2 pb-[env(safe-area-inset-bottom,8px)] w-full">
      <div className="max-w-[500px] mx-auto flex flex-col gap-1">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-[4px]">
            {ri === 2 && (
              <button
                onClick={onHint}
                disabled={status === "won" || !selectedCipher}
                className="px-2 h-[42px] rounded bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40 transition-opacity active:scale-95"
              >
                Hint
              </button>
            )}
            {row.map((letter) => {
              const assignedCipher = assignedTo[letter];
              return (
                <button
                  key={letter}
                  onClick={() => onPickLetter(letter)}
                  disabled={status === "won" || !selectedCipher}
                  className={`flex flex-col items-center justify-center flex-1 max-w-[36px] h-[42px] rounded text-sm font-semibold transition-colors active:scale-95 ${
                    assignedCipher
                      ? "bg-gray-200 text-gray-600"
                      : "bg-gray-100 text-gray-900"
                  } disabled:opacity-50`}
                >
                  {assignedCipher && (
                    <span className="text-[9px] text-gray-400 leading-none font-mono">
                      {assignedCipher}
                    </span>
                  )}
                  <span className="leading-none">{letter}</span>
                </button>
              );
            })}
            {ri === 2 && (
              <button
                onClick={onClear}
                disabled={status === "won" || !selectedCipher}
                className="px-2 h-[42px] rounded bg-gray-300 text-gray-700 text-xs font-semibold disabled:opacity-40 transition-opacity active:scale-95"
              >
                Clear
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
