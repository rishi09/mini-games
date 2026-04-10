"use client";
import dynamic from "next/dynamic";
const MorphGame = dynamic(() => import("@/components/morph/MorphGame"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[100dvh] items-center justify-center text-gray-400">
      Loading...
    </div>
  ),
});
export default function MorphPage() {
  return <MorphGame />;
}
