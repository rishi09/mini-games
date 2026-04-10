"use client";

interface CipherTextProps {
  originalQuote: string;
  cipherMap: Record<string, string>;
  guesses: Record<string, string>;
  selectedCipher: string | null;
  onSelectCipher: (cipherLetter: string) => void;
  status: "playing" | "won";
}

function isWordComplete(
  word: { plain: string; cipher: string }[],
  guesses: Record<string, string>,
  reverseCipherMap: Record<string, string>
): boolean {
  return word.every((ch) => {
    if (!/[A-Z]/.test(ch.plain)) return true;
    const guessed = guesses[ch.cipher];
    return guessed === reverseCipherMap[ch.cipher];
  });
}

export default function CipherText({
  originalQuote,
  cipherMap,
  guesses,
  selectedCipher,
  onSelectCipher,
  status,
}: CipherTextProps) {
  // Build reverse cipher map (cipher -> plaintext)
  const reverseCipherMap: Record<string, string> = {};
  for (const [plain, cipher] of Object.entries(cipherMap)) {
    reverseCipherMap[cipher] = plain;
  }

  // Split quote into words (preserving spaces)
  const words: { plain: string; cipher: string; index: number }[][] = [];
  let currentWord: { plain: string; cipher: string; index: number }[] = [];

  for (let i = 0; i < originalQuote.length; i++) {
    const ch = originalQuote[i];
    if (ch === " ") {
      if (currentWord.length > 0) {
        words.push(currentWord);
        currentWord = [];
      }
    } else {
      const isLetter = /[A-Z]/.test(ch);
      currentWord.push({
        plain: ch,
        cipher: isLetter ? cipherMap[ch] : ch,
        index: i,
      });
    }
  }
  if (currentWord.length > 0) {
    words.push(currentWord);
  }

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 justify-center w-full select-none">
      {words.map((word, wi) => {
        const complete = isWordComplete(word, guesses, reverseCipherMap);
        return (
          <div
            key={wi}
            className={`inline-flex gap-[2px] ${
              complete ? "border-b-2 border-emerald-300" : ""
            }`}
          >
            {word.map((ch) => {
              const isLetter = /[A-Z]/.test(ch.plain);
              if (!isLetter) {
                // Punctuation: render inline
                return (
                  <div
                    key={ch.index}
                    className="flex flex-col items-center justify-end w-[28px] min-w-[28px]"
                  >
                    <span className="text-xs text-gray-400 h-4">&nbsp;</span>
                    <span className="text-lg font-bold text-gray-800 h-7 leading-7">
                      {ch.plain}
                    </span>
                  </div>
                );
              }

              const cipherLetter = ch.cipher;
              const guessed = guesses[cipherLetter] || "";
              const isSelected = selectedCipher === cipherLetter;
              const isCorrect =
                guessed === reverseCipherMap[cipherLetter];

              return (
                <button
                  key={ch.index}
                  onClick={() => status === "playing" && onSelectCipher(cipherLetter)}
                  className={`flex flex-col items-center justify-end w-[28px] min-w-[28px] rounded transition-colors ${
                    status === "won"
                      ? "bg-emerald-50"
                      : isSelected
                      ? "bg-emerald-100 ring-2 ring-emerald-500"
                      : guessed
                      ? isCorrect
                        ? "bg-gray-50"
                        : "bg-gray-50"
                      : "bg-gray-100"
                  }`}
                  disabled={status === "won"}
                >
                  <span className="text-[10px] text-gray-400 h-4 leading-4 font-mono">
                    {cipherLetter}
                  </span>
                  <span
                    className={`text-lg font-bold h-7 leading-7 ${
                      status === "won"
                        ? "text-emerald-600"
                        : guessed
                        ? "text-gray-900"
                        : "text-transparent"
                    }`}
                  >
                    {guessed || "_"}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
