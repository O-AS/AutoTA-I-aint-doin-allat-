"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, BookOpen, LayoutDashboard, Zap, ClipboardList } from "lucide-react";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/email-tool", label: "Email Tool", icon: Mail },
  { href: "/exam-seating", label: "Exam Seating", icon: ClipboardList },
  { href: "/tutorial", label: "Tutorial", icon: BookOpen },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-200 px-6 h-16 flex items-center sticky top-0 z-50">
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-slate-900 hover:text-slate-900 transition-colors"
        >
          <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          I aint doin allat!
        </Link>

        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
