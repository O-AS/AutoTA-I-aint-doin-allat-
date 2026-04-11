import Link from "next/link";
import { Mail, ArrowRight, BookOpen, Zap, ClipboardList } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-900 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-slate-200">
          <Zap size={14} />
          Built for Teaching Assistants
        </div>
        <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          I aint doin allat!
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Automate your TA workflows. Send personalized grade emails, track
          delivery, and save hours of manual work.
        </p>
        <p className="mt-5 text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          Built out of pure spite — TAing BIO 101 (a massive class, no cap)
          meant manually emailing hundreds of students their marks since I hated the concept of people just adding all marks to one sheet and pushing it to excel online (privacy aint no joke people).
          Similarly, allocating exam seats, and doing it all over again every exam (kill me). I aint doin allat for hours. So I had built these tools instead. Now consolidated on this site.
        </p>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {/* Email Tool */}
        <Link
          href="/email-tool"
          className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-slate-400 transition-all duration-200"
        >
          <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-300 transition-colors">
            <Mail className="text-slate-900" size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Marks Email Tool
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-4">
            Send personalized grade notifications to every student. Upload a
            spreadsheet, write a template, and send in one click.
          </p>
          <ul className="text-xs text-slate-400 space-y-1 mb-5">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
              Upload Excel / CSV or paste data
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
              Dynamic <code className="font-mono">{"{{variable}}"}</code> templates
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
              Tracks sent emails — no duplicates
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
              Works with Gmail, Outlook, any SMTP
            </li>
          </ul>
          <span className="inline-flex items-center text-slate-900 text-sm font-medium">
            Open Tool
            <ArrowRight
              size={15}
              className="ml-1 group-hover:translate-x-1 transition-transform"
            />
          </span>
        </Link>

        {/* Exam Seating Tool */}
        <Link
          href="/exam-seating"
          className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-slate-400 transition-all duration-200"
        >
          <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-300 transition-colors">
            <ClipboardList className="text-slate-900" size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Exam Seat Allocation
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-4">
            Randomly allocate students to auditoriums and seats. Upload a student list, configure auditoriums, and download a ready-to-use Excel file.
          </p>
          <ul className="text-xs text-slate-400 space-y-1 mb-5">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
              Upload Excel / CSV student list
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
              Configure multiple auditoriums &amp; seat counts
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
              Randomised Fisher-Yates allocation
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
              Per-auditorium sheets + master sheet
            </li>
          </ul>
          <span className="inline-flex items-center text-slate-900 text-sm font-medium">
            Open Tool
            <ArrowRight
              size={15}
              className="ml-1 group-hover:translate-x-1 transition-transform"
            />
          </span>
        </Link>

        {/* Tutorial CTA */}
        <Link
          href="/tutorial"
          className="group bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 hover:shadow-xl transition-all duration-200 flex flex-col"
        >
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4">
            <BookOpen className="text-white" size={22} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Tutorial</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-5 flex-1">
            New here? Learn how to set up Gmail App Passwords, prepare your
            data, and write email templates step by step.
          </p>
          <span className="inline-flex items-center text-slate-300 text-sm font-medium">
            Read Guide
            <ArrowRight
              size={15}
              className="ml-1 group-hover:translate-x-1 transition-transform"
            />
          </span>
        </Link>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-slate-400">
        This app runs entirely in your browser — your SMTP credentials are never
        stored on any server.
      </p>
    </div>
  );
}
