"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Disable SSR entirely — email-tool uses localStorage, FileReader, and other browser-only APIs
const EmailToolClient = dynamic(() => import("./EmailToolClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh] gap-3 text-slate-400">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm">Loading email tool…</span>
    </div>
  ),
});

export default function EmailToolPage() {
  return <EmailToolClient />;
}
