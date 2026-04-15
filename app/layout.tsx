import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "I aint doin allat! – TA Automation",
  description:
    "Automate repetitive teaching assistant tasks: send grade emails, allocate exam seats, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen font-sans text-slate-900">
        <Navbar />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
          Made by Omer Haydar
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
