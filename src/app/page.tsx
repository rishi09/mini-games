import GameCard from "@/components/hub/GameCard";

const GAMES = [
  {
    title: "Morph",
    description: "Transform one word into another, one letter at a time",
    href: "/morph",
    color: "#06b6d4",
    icon: "🔗",
    gameId: "morph",
  },
  {
    title: "Decode",
    description: "Crack the cipher to reveal a famous quote",
    href: "/decode",
    color: "#10b981",
    icon: "🔐",
    gameId: "decode",
  },
  {
    title: "Stack",
    description: "Drop blocks with precision — how high can you go?",
    href: "/stack",
    color: "#f97316",
    icon: "🏗️",
    gameId: "stack",
  },
  {
    title: "Shade",
    description: "Fill in the grid to reveal the hidden picture",
    href: "/shade",
    color: "#8b5cf6",
    icon: "🎨",
    gameId: "shade",
  },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[500px]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mini Games</h1>
          <p className="text-gray-500 text-sm">Pick a game and play!</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((game) => (
            <GameCard key={game.gameId} {...game} />
          ))}
        </div>
      </div>
    </div>
  );
}
