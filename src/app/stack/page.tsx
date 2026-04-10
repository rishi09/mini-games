"use client";

import dynamic from "next/dynamic";
import GameShell from "@/components/shared/GameShell";

const StackGame = dynamic(() => import("@/components/stack/StackGame"), {
  ssr: false,
});

export default function StackPage() {
  return (
    <GameShell title="Stack" color="#f97316" hideCountdown>
      <StackGame />
    </GameShell>
  );
}
