"use client";

import { useRef, useEffect } from "react";

interface WordInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  shake: boolean;
}

export default function WordInput({
  value,
  onChange,
  onSubmit,
  disabled,
  shake,
}: WordInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    onChange(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  // Display letters in individual styled boxes
  const letters = value.padEnd(4, " ").slice(0, 4).split("");

  return (
    <div className={`flex flex-col items-center gap-3 ${shake ? "animate-shake" : ""}`}>
      <div className="relative">
        {/* Visual letter boxes */}
        <div className="flex gap-1.5 pointer-events-none">
          {letters.map((letter, i) => (
            <div
              key={i}
              className={`w-12 h-12 flex items-center justify-center rounded-lg text-lg font-bold border-2 transition-colors ${
                letter.trim()
                  ? "border-[#06b6d4] bg-white text-gray-800"
                  : i === value.length
                  ? "border-[#06b6d4] bg-[#06b6d4]/5"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              {letter.trim() || ""}
            </div>
          ))}
        </div>

        {/* Hidden input overlaid on boxes */}
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={4}
          enterKeyHint="go"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-default"
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={disabled || value.length < 4}
        className="px-6 py-2.5 rounded-full text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
        style={{ backgroundColor: "#06b6d4" }}
      >
        Submit
      </button>
    </div>
  );
}
