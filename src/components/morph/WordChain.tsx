"use client";

interface WordChainProps {
  chain: string[];
  targetWord: string;
  won: boolean;
}

function diffIndex(a: string, b: string): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return i;
  }
  return -1;
}

export default function WordChain({ chain, targetWord, won }: WordChainProps) {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {chain.map((word, idx) => {
        const isStart = idx === 0;
        const changedIdx = idx > 0 ? diffIndex(chain[idx - 1], word) : -1;

        return (
          <div
            key={`${word}-${idx}`}
            className={`flex gap-1.5 ${!isStart ? "animate-slide-up" : ""}`}
          >
            {word.split("").map((letter, li) => (
              <div
                key={li}
                className={`w-12 h-12 flex items-center justify-center rounded-lg text-lg font-bold border-2 transition-colors ${
                  li === changedIdx
                    ? "border-[#06b6d4] bg-[#06b6d4]/10 text-[#06b6d4]"
                    : "border-gray-300 bg-white text-gray-800"
                }`}
              >
                {letter}
              </div>
            ))}
          </div>
        );
      })}

      {/* Connector dots */}
      {!won && (
        <div className="flex flex-col items-center gap-0.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        </div>
      )}

      {/* Target word */}
      {!won && (
        <div className="flex gap-1.5">
          {targetWord.split("").map((letter, li) => (
            <div
              key={li}
              className="w-12 h-12 flex items-center justify-center rounded-lg text-lg font-bold border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400"
            >
              {letter}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
