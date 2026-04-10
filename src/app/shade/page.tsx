"use client";

import dynamic from "next/dynamic";

const ShadeGame = dynamic(() => import("@/components/shade/ShadeGame"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[100dvh] items-center justify-center text-gray-400">
      Loading...
    </div>
  ),
});

export default function ShadePage() {
  return <ShadeGame />;
}
