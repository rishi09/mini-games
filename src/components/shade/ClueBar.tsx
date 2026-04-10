"use client";

interface ClueBarProps {
  clues: number[];
  completed: boolean;
  direction: "row" | "col";
}

export default function ClueBar({ clues, completed, direction }: ClueBarProps) {
  return (
    <div
      className={`flex items-center justify-end gap-0.5 ${
        direction === "row" ? "flex-row pr-1.5" : "flex-col pb-1.5"
      }`}
    >
      {clues.map((clue, i) => (
        <span
          key={i}
          className={`text-xs font-semibold leading-none ${
            completed ? "text-gray-300" : "text-gray-700"
          } transition-colors duration-200`}
        >
          {clue}
        </span>
      ))}
    </div>
  );
}
