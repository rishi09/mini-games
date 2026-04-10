"use client";

import GameShell from "@/components/shared/GameShell";
import StackGame from "@/components/stack/StackGame";

export default function StackPage() {
  return (
    <GameShell title="Stack" color="#f97316">
      <StackGame />
    </GameShell>
  );
}
