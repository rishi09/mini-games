"use client";

import dynamic from "next/dynamic";

const DecodeGame = dynamic(() => import("@/components/decode/DecodeGame"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[100dvh] items-center justify-center text-gray-400">
      Loading...
    </div>
  ),
});

export default function DecodePage() {
  return <DecodeGame />;
}
