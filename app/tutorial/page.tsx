import Link from "next/link";
import {
  Mail,
  ShieldCheck,
  Table,
  FileText,
  Send,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0">
        <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
          {number}
        </div>
      </div>
      <div className="pb-10 border-l border-slate-200 pl-6 -ml-[1.125rem] flex-1 pt-1.5">
        <h3 className="font-semibold text-slate-900 text-base mb-3">{title}</h3>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-emerald-400 text-xs font-mono rounded-xl px-5 py-4 overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function Note({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "tip";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    tip: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  return (
    <div
      className={`border rounded-xl px-4 py-3 text-sm flex gap-2.5 ${styles[type]}`}
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function TutorialPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
          Guide
        </p>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          How to Use the Marks Email Tool
        </h1>
        <p className="text-slate-500 leading-relaxed">
          This guide walks you through every step: getting email credentials,
          preparing your spreadsheet, writing a template, and sending reliably.
        </p>
        <div className="flex gap-3 mt-5">
          <Link
            href="/email-tool"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Mail size={14} />
            Open Email Tool
          </Link>
        </div>
      </div>

      {/* Contents */}
      <div className="bg-slate-100 rounded-2xl p-5 mb-10">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Contents
        </p>
        <ol className="space-y-1.5">
          {[
            ["Gmail App Password", "#gmail-app-password"],
            ["Other Email Providers", "#other-providers"],
            ["Preparing Your Spreadsheet", "#spreadsheet"],
            ["Uploading & Column Mapping", "#upload"],
            ["Writing Your Email Template", "#template"],
            ["Sending & Duplicate Prevention", "#sending"],
            ["Troubleshooting", "#troubleshooting"],
          ].map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ChevronRight size={13} className="text-slate-300" />
                {label}
              </a>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Section 1: Gmail ─────────────────────────────────────────────── */}
      <section id="gmail-app-password" className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
            <ShieldCheck size={16} className="text-slate-900" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Getting Your Gmail App Password
          </h2>
        </div>

        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          Gmail&apos;s Security policy requires an{" "}
          <strong>App Password</strong> (not your regular Gmail password) when
          connecting via SMTP. App Passwords are 16-character codes that
          authorize one specific app — and can be revoked at any time without
          changing your main password.
        </p>

        <div className="space-y-0">
          <Step number={1} title="Enable 2-Step Verification">
            <p>
              App Passwords require 2-Step Verification to be active on your
              Google account.
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                Go to{" "}
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 hover:underline inline-flex items-center gap-0.5"
                >
                  myaccount.google.com/security{" "}
                  <ExternalLink size={11} />
                </a>
              </li>
              <li>
                Find &quot;How you sign in to Google&quot; and click{" "}
                <strong>2-Step Verification</strong>
              </li>
              <li>Follow the prompts to enable it</li>
            </ol>
          </Step>

          <Step number={2} title="Create an App Password">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                Visit{" "}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 hover:underline inline-flex items-center gap-0.5"
                >
                  myaccount.google.com/apppasswords{" "}
                  <ExternalLink size={11} />
                </a>
              </li>
              <li>In the &quot;App name&quot; box type any name (e.g. <em>I aint doin allat!</em>)</li>
              <li>
                Click <strong>Create</strong>
              </li>
              <li>
                A 16-character password appears:{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-900">
                  xxxx xxxx xxxx xxxx
                </code>
              </li>
              <li>
                Copy it and paste it into the app&apos;s <strong>Password</strong>{" "}
                field (spaces are fine, they&apos;re ignored)
              </li>
            </ol>
            <Note type="tip">
              You can revoke this App Password at any time from the same page
              without affecting your main Google account.
            </Note>
          </Step>

          <Step number={3} title="Enter SMTP Settings in the App">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["SMTP Server", "smtp.gmail.com"],
                    ["Port", "587 (STARTTLS)"],
                    ["Sender Email", "yourname@gmail.com"],
                    ["Password", "Your 16-character App Password"],
                  ].map(([field, value]) => (
                    <tr key={field} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-slate-600 bg-slate-50 w-36">
                        {field}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 font-mono text-xs">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Step>
        </div>
      </section>

      {/* ── Section 2: Other providers ───────────────────────────────────── */}
      <section id="other-providers" className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Mail size={16} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Other Email Providers
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                  Provider
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                  Server
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                  Port
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Gmail", "smtp.gmail.com", "587", "Requires App Password"],
                ["Outlook / Office 365", "smtp.office365.com", "587", "Use your full email"],
                ["Yahoo Mail", "smtp.mail.yahoo.com", "587", "Requires App Password"],
                ["Zoho Mail", "smtp.zoho.com", "587", "Use your account password"],
                ["Custom server", "Your SMTP host", "587 / 465", "Port 465 = implicit SSL"],
              ].map(([provider, server, port, notes]) => (
                <tr key={provider} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{provider}</td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{server}</td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{port}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 3: Spreadsheet ───────────────────────────────────────── */}
      <section id="spreadsheet" className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Table size={16} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Preparing Your Spreadsheet
          </h2>
        </div>

        <p className="text-slate-600 text-sm mb-4 leading-relaxed">
          The app supports <strong>.xlsx</strong>, <strong>.xls</strong>, and{" "}
          <strong>.csv</strong> files. The first row must contain{" "}
          <strong>column headers</strong>.
        </p>

        <div className="bg-slate-50 rounded-xl p-5 mb-4 overflow-x-auto">
          <table className="text-xs font-mono">
            <thead>
              <tr className="text-slate-500">
                <th className="pr-8 pb-2 text-left font-semibold">Name</th>
                <th className="pr-8 pb-2 text-left font-semibold">Email</th>
                <th className="pr-8 pb-2 text-left font-semibold">Marks</th>
                <th className="pr-8 pb-2 text-left font-semibold">Course</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {[
                ["Alice Johnson", "alice@student.edu", "18", "BIO101"],
                ["Bob Smith", "bob@student.edu", "16", "BIO101"],
                ["Carol Davis", "carol@student.edu", "20", "BIO101"],
              ].map(([name, email, marks, course]) => (
                <tr key={email}>
                  <td className="pr-8 py-1">{name}</td>
                  <td className="pr-8 py-1">{email}</td>
                  <td className="pr-8 py-1">{marks}</td>
                  <td className="pr-8 py-1">{course}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="space-y-2 text-sm text-slate-600">
          {[
            "One row per student — no merged cells",
            "Must have a column containing student email addresses",
            'Column names can be anything (e.g. "Email ID ", "A2 Marks")',
            "Extra whitespace in column names is handled automatically",
            "Download the template from the Data tab for a ready-to-fill file",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="text-emerald-500 mt-0.5 shrink-0"
              />
              {tip}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Section 4: Upload ────────────────────────────────────────────── */}
      <section id="upload" className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <FileText size={16} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Uploading & Column Mapping
          </h2>
        </div>

        <ol className="list-decimal list-inside space-y-3 text-sm text-slate-600 mb-4 ml-1">
          <li>
            Go to the <strong>Data</strong> tab and drag your file onto the drop
            zone (or click to browse).
          </li>
          <li>
            A preview table appears — verify the data looks correct.
          </li>
          <li>
            Switch to the <strong>Template</strong> tab. The app automatically
            detects the email column (any column whose name contains
            &quot;email&quot;). You can override this with the dropdown.
          </li>
        </ol>

        <Note type="warning">
          If your email column is named something unusual (e.g. &quot;Email ID &quot;
          with a trailing space), select it manually from the dropdown in the
          Template tab.
        </Note>
      </section>

      {/* ── Section 5: Template ─────────────────────────────────────────── */}
      <section id="template" className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Mail size={16} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Writing Your Email Template
          </h2>
        </div>

        <p className="text-slate-600 text-sm mb-4">
          Use{" "}
          <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono text-xs">
            {"{{ColumnName}}"}
          </code>{" "}
          anywhere in the subject or body to insert values from your spreadsheet.
          Column names are <strong>case-sensitive</strong>.
        </p>

        <CodeBlock>{`Dear {{Name}},

Hoping you are doing well.

Your marks for Assignment 2:
  Score: {{Marks}}/20
  Class mean: 18.84
  Std deviation: 1.69

Best regards,
BIO101 Teaching Assistants Team

*This is an automated email. Please do not reply.*`}</CodeBlock>

        <p className="text-slate-500 text-xs mt-3 mb-4">
          Click any column chip in the sidebar to insert it at the cursor
          position. If you type a variable that doesn&apos;t match a column name,
          it will appear literally (e.g.{" "}
          <code className="font-mono">{"{{typo}}"}</code>).
        </p>

        <Note type="tip">
          Use the <strong>Preview with Row 1</strong> button to see exactly what
          the first recipient will receive before sending.
        </Note>
      </section>

      {/* ── Section 6: Sending ───────────────────────────────────────────── */}
      <section id="sending" className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Send size={16} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Sending & Duplicate Prevention
          </h2>
        </div>

        <div className="space-y-4 text-sm text-slate-600">
          <p>
            Once all three tabs are ✅, navigate to the{" "}
            <strong>Send</strong> tab.
          </p>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                    Button
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                    What it does
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Send Remaining",
                    "Skips already-sent emails; only sends to pending recipients. Safe to retry.",
                  ],
                  [
                    "Resend All",
                    "Ignores sent history and delivers to every recipient. Use for corrections.",
                  ],
                  [
                    "Stop",
                    "Halts the current send job after the current email finishes.",
                  ],
                  [
                    "Clear sent history",
                    "Erases the local tracking record for this campaign (sender + subject).",
                  ],
                ].map(([btn, desc]) => (
                  <tr key={btn} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                      {btn}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Note type="info">
            <strong>How tracking works:</strong> When an email is sent
            successfully, the app saves that recipient&apos;s address in your
            browser&apos;s local storage, keyed by a hash of your sender email + subject.
            If you close the tab or lose connection mid-send, reopen the app
            and click <em>Send Remaining</em> — it will automatically skip
            anyone who was already sent to.
          </Note>

          <Note type="warning">
            Tracking is <strong>per browser</strong>. If you switch to a
            different computer or clear your browser data, the history is lost.
            The app adds a ~350 ms delay between emails to respect SMTP rate limits.
          </Note>
        </div>
      </section>

      {/* ── Section 7: Troubleshooting ───────────────────────────────────── */}
      <section id="troubleshooting" className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <AlertCircle size={16} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Troubleshooting</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              problem: "Invalid login / Authentication failed",
              fix: "You are using your regular Gmail password. Create an App Password instead (see Step 1 above). Make sure 2-Step Verification is enabled.",
            },
            {
              problem: "Connection timed out",
              fix: "Check your SMTP host and port. Try port 587 (STARTTLS) instead of 465. Some networks block outgoing SMTP — try from a different network or use a VPN.",
            },
            {
              problem: "Emails sent but recipients not receiving",
              fix: 'Check spam/junk folders. Ask recipients to whitelist your sender address. If using Gmail, make sure "Less secure app access" is not the issue — App Passwords bypass this requirement.',
            },
            {
              problem: "{{ColumnName}} appears literally in the email",
              fix: "The variable name does not exactly match any column header. Check for typos, extra spaces, and case differences. Use the column chips in the sidebar to insert variables safely.",
            },
            {
              problem: "File upload shows no data",
              fix: "Ensure the first row contains column headers. Try saving the file as .xlsx from Excel and re-uploading. CSV files must use commas as delimiters.",
            },
            {
              problem: "Emails going to wrong column",
              fix: 'The app auto-detects columns containing "email" in their name. If your column has a different name (e.g. "Email ID "), manually select it in the Template tab\'s "Email address column" dropdown.',
            },
          ].map(({ problem, fix }) => (
            <div
              key={problem}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <p className="font-semibold text-slate-800 text-sm mb-1.5">
                {problem}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">{fix}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="bg-slate-900 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Ready to send?</h2>
        <p className="text-slate-300 text-sm mb-5">
          Everything makes sense now — head to the Email Tool and send your
          first batch.
        </p>
        <Link
          href="/email-tool"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 font-semibold rounded-xl text-sm hover:bg-slate-100 transition-colors"
        >
          <Mail size={15} />
          Open Email Tool
        </Link>
      </div>
    </div>
  );
}
