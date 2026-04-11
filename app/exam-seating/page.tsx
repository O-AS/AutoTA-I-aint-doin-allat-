"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ExamSeatingClient = dynamic(() => import("./ExamSeatingClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh] gap-3 text-slate-400">
      <Loader2 size={20} className="animate-spin" />
      Loading…
    </div>
  ),
});

export default function ExamSeatingPage() {
  return <ExamSeatingClient />;
}
