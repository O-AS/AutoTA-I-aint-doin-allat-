"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  ChangeEvent,
  DragEvent,
} from "react";
import { track } from "@vercel/analytics";
import Link from "next/link";
import {
  Settings2,
  Upload,
  Mail,
  SendHorizontal,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Download,
  Trash2,
  RotateCcw,
  ChevronRight,
  Info,
  ShieldCheck,
  BookOpen,
  Minus,
  X,
  Send,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SmtpConfig {
  host: string;
  port: string;
  senderEmail: string;
  password: string;
  displayName: string;
}

type Row = Record<string, string>;

type SendStatus = "pending" | "sending" | "sent" | "error" | "skipped";

interface Recipient {
  idx: number;
  email: string;
  row: Row;
  status: SendStatus;
  error?: string;
}

type Tab = "smtp" | "data" | "template" | "send";

// ─── AES-GCM encryption for localStorage ─────────────────────────────────────

const ENC_SALT = "autota-v1-key-salt";

async function getEncKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(ENC_SALT + navigator.userAgent),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(ENC_SALT), iterations: 100_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptJson(obj: unknown): Promise<string> {
  const key = await getEncKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const buf = new Uint8Array(iv.length + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...buf));
}

async function decryptJson<T>(cipher: string): Promise<T | null> {
  try {
    const key = await getEncKey();
    const raw = Uint8Array.from(atob(cipher), (c) => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const ct = raw.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    return null;
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const SMTP_STORAGE_KEY = "autota_smtp_v2";

function defaultSmtp(): SmtpConfig {
  return { host: "smtp.gmail.com", port: "587", senderEmail: "", password: "", displayName: "" };
}

async function loadSmtp(): Promise<SmtpConfig> {
  try {
    const raw = localStorage.getItem(SMTP_STORAGE_KEY);
    if (!raw) return defaultSmtp();
    const dec = await decryptJson<SmtpConfig>(raw);
    return dec ? { ...defaultSmtp(), ...dec } : defaultSmtp();
  } catch {
    return defaultSmtp();
  }
}

async function saveSmtp(cfg: SmtpConfig) {
  const cipher = await encryptJson(cfg);
  localStorage.setItem(SMTP_STORAGE_KEY, cipher);
}

function sentStorageKey(senderEmail: string, subject: string): string {
  const raw = `${senderEmail.toLowerCase()}|||${subject}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return `autota_sent_${Math.abs(h)}`;
}

function loadSentSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function persistSentEmail(key: string, email: string) {
  const s = loadSentSet(key);
  s.add(email.toLowerCase().trim());
  localStorage.setItem(key, JSON.stringify([...s]));
}

function clearSentHistory(key: string) {
  localStorage.removeItem(key);
}

// ─── Template helpers ─────────────────────────────────────────────────────────

function interpolate(template: string, row: Row): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, varName: string) => {
    const k = varName.trim();
    const matchKey = Object.keys(row).find((col) => col.trim() === k);
    return matchKey != null ? (row[matchKey] ?? "") : `{{${k}}}`;
  });
}

// ─── xlsx loader (CDN — never touches the server) ─────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getXLSX(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).XLSX) return Promise.resolve((window as any).XLSX);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    s.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = (window as any).XLSX;
      if (lib) resolve(lib);
      else reject(new Error("XLSX failed to load from CDN"));
    };
    s.onerror = () => reject(new Error("Failed to load XLSX from CDN"));
    document.head.appendChild(s);
  });
}

async function downloadTemplate() {
  const XLSX = await getXLSX();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Name", "Email", "Marks", "Course"],
    ["Alice Johnson", "alice@example.com", "18", "BIO101"],
    ["Bob Smith", "bob@student.edu", "16", "BIO101"],
    ["Carol Davis", "carol@student.edu", "20", "BIO101"],
  ]);
  ws["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "autota_template.xlsx");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SendStatus }) {
  switch (status) {
    case "sent":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
          <CheckCircle2 size={11} /> Sent
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium">
          <XCircle size={11} /> Error
        </span>
      );
    case "sending":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
          <Loader2 size={11} className="animate-spin" /> Sending…
        </span>
      );
    case "skipped":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
          <CheckCircle2 size={11} /> Already sent
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{" "}
          Pending
        </span>
      );
  }
}

// ─── Test Email Modal ─────────────────────────────────────────────────────────

function TestEmailModal({
  open,
  onClose,
  smtp,
}: {
  open: boolean;
  onClose: () => void;
  smtp: SmtpConfig;
}) {
  const [testTo, setTestTo] = useState(smtp.senderEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setTestTo(smtp.senderEmail);
      setStatus("idle");
      setErrorMsg("");
    }
  }, [open, smtp.senderEmail]);

  if (!open) return null;

  const sendTest = async () => {
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp: { host: smtp.host, port: smtp.port, email: smtp.senderEmail, password: smtp.password },
          to: testTo,
          subject: "I aint doin allat! — Test Email",
          body: "This is a test email from I aint doin allat!\n\nIf you received this, your SMTP configuration is working correctly.\n\n— I aint doin allat!",
        }),
      });
      const data: { success: boolean; error?: string } = await res.json();
      if (data.success) setStatus("ok");
      else { setStatus("error"); setErrorMsg(data.error ?? "Failed to send."); }
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Send size={16} className="text-slate-600" />
            Send Test Email
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-500">Send a quick test email to verify your SMTP settings.</p>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Send test to</label>
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          {status === "ok" && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle2 size={15} /> Test email sent! Check your inbox.
            </div>
          )}
          {status === "error" && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
              <XCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Close
            </button>
            <button
              onClick={sendTest}
              disabled={!testTo || !testTo.includes("@") || status === "sending"}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {status === "sending" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {status === "sending" ? "Sending…" : "Send Test"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmailToolPage() {
  const [activeTab, setActiveTab] = useState<Tab>("smtp");

  // ── SMTP
  const [smtp, setSmtp] = useState<SmtpConfig>(defaultSmtp);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // ── Data
  const [dataMode, setDataMode] = useState<"upload" | "paste">("upload");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [csvText, setCsvText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Template
  const [emailColumn, setEmailColumn] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  // ── Send
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const stopRef = useRef(false);
  const [sendLog, setSendLog] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Derived
  const sentKey = sentStorageKey(smtp.senderEmail, subject);
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());

  useEffect(() => { loadSmtp().then(setSmtp); }, []);
  useEffect(() => { setSentSet(loadSentSet(sentKey)); }, [sentKey]);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sendLog]);
  useEffect(() => {
    if (columns.length > 0 && !emailColumn) {
      const guessed = columns.find(
        (c) => c.toLowerCase().includes("email") || c.toLowerCase() === "e-mail" || c.toLowerCase() === "mail"
      ) ?? "";
      setEmailColumn(guessed);
    }
  }, [columns, emailColumn]);

  // ── File parsing ─────────────────────────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await getXLSX();
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: Row[] = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
        if (parsed.length > 0) {
          const cols = Object.keys(parsed[0]);
          setColumns(cols);
          setRows(parsed.map((r) => {
            const norm: Row = {};
            Object.keys(r).forEach((k) => { norm[k] = String(r[k]); });
            return norm;
          }));
          setFileName(file.name);
          setEmailColumn("");
        } else {
          alert("The file appears to be empty or has no data rows.");
        }
      } catch {
        alert("Could not parse the file. Make sure it is .xlsx, .xls, or .csv.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const parseCsvText = useCallback((csv: string) => {
    const lines = csv.trim().split("\n").filter((l) => l.trim());
    if (lines.length < 2) { alert("CSV must have at least a header row and one data row."); return; }
    const splitLine = (line: string) => line.split(",").map((v) => v.trim().replace(/^"(.*)"$/, "$1"));
    const headers = splitLine(lines[0]);
    const parsed: Row[] = lines.slice(1).map((line) => {
      const vals = splitLine(line);
      const row: Row = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
      return row;
    });
    setColumns(headers);
    setRows(parsed);
    setFileName("pasted CSV");
    setEmailColumn("");
  }, []);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) parseFile(file); };
  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) parseFile(file); e.target.value = ""; };

  const insertVariable = (colName: string) => {
    const ta = bodyRef.current;
    if (!ta) { setBody((b) => b + `{{${colName}}}`); return; }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const newBody = body.slice(0, start) + `{{${colName}}}` + body.slice(end);
    setBody(newBody);
    requestAnimationFrame(() => { const pos = start + colName.length + 4; ta.setSelectionRange(pos, pos); ta.focus(); });
  };

  const toApiSmtp = (cfg: SmtpConfig) => ({ host: cfg.host, port: cfg.port, email: cfg.senderEmail, password: cfg.password, displayName: cfg.displayName });

  const testSmtp = async () => {
    setTestStatus("testing"); setTestError("");
    try {
      const res = await fetch("/api/test-smtp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ smtp: toApiSmtp(smtp) }) });
      const data: { success: boolean; error?: string } = await res.json();
      if (data.success) setTestStatus("ok");
      else { setTestStatus("error"); setTestError(data.error ?? "Connection failed."); }
    } catch (err) { setTestStatus("error"); setTestError((err as Error).message); }
  };

  const buildRecipients = useCallback((): Recipient[] => {
    const currentSent = loadSentSet(sentKey);
    return rows
      .filter((row) => { const em = row[emailColumn]?.trim(); return em && em.includes("@"); })
      .map((row, idx) => {
        const email = row[emailColumn].trim();
        return { idx, email, row, status: currentSent.has(email.toLowerCase()) ? "skipped" as SendStatus : "pending" as SendStatus };
      });
  }, [rows, emailColumn, sentKey]);

  const log = (msg: string) => setSendLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const startSend = async (skipAlreadySent = true) => {
    if (isSending) return;
    const built = buildRecipients();
    setRecipients(built);
    const queue = skipAlreadySent ? built.filter((r) => r.status === "pending") : built.map((r) => ({ ...r, status: "pending" as SendStatus }));
    if (queue.length === 0) { log("Nothing to send. All recipients already sent or no valid emails."); return; }
    setIsSending(true); stopRef.current = false; setSendLog([]);

    for (let i = 0; i < queue.length; i++) {
      if (stopRef.current) { log("⛔ Sending stopped by user."); break; }
      const rec = queue[i];
      const renderedSubject = interpolate(subject, rec.row);
      const renderedBody = interpolate(body, rec.row);
      setRecipients((prev) => prev.map((r) => r.email === rec.email ? { ...r, status: "sending" } : r));
      log(`Sending to ${rec.email}…`);

      try {
        const res = await fetch("/api/send-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ smtp: toApiSmtp(smtp), to: rec.email, subject: renderedSubject, body: renderedBody }),
        });
        const data: { success: boolean; error?: string } = await res.json();
        if (data.success) {
          persistSentEmail(sentKey, rec.email);
          setSentSet((prev) => new Set([...prev, rec.email.toLowerCase()]));
          setRecipients((prev) => prev.map((r) => r.email === rec.email ? { ...r, status: "sent" } : r));
          log(`✓ Sent to ${rec.email}`);
          track("email_sent", { student_count: queue.length });
        } else {
          setRecipients((prev) => prev.map((r) => r.email === rec.email ? { ...r, status: "error", error: data.error } : r));
          log(`✗ Failed: ${rec.email} — ${data.error}`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        setRecipients((prev) => prev.map((r) => r.email === rec.email ? { ...r, status: "error", error: msg } : r));
        log(`✗ Error: ${rec.email} — ${msg}`);
      }
      if (i < queue.length - 1) await new Promise((r) => setTimeout(r, 350));
    }
    setIsSending(false);
    log(`─── Done. Sent: ${queue.filter((r) => r.status === "sent").length} / ${queue.length} ───`);
  };

  const smtpComplete = smtp.host && smtp.port && smtp.senderEmail && smtp.password;
  const dataComplete = columns.length > 0 && rows.length > 0;
  const templateComplete = emailColumn && subject.trim() && body.trim();
  const tabDone: Record<Tab, boolean> = { smtp: !!smtpComplete, data: dataComplete, template: !!templateComplete, send: false };
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "smtp", label: "1 · SMTP", icon: <Settings2 size={15} /> },
    { id: "data", label: "2 · Data", icon: <Upload size={15} /> },
    { id: "template", label: "3 · Template", icon: <Mail size={15} /> },
    { id: "send", label: "4 · Send", icon: <SendHorizontal size={15} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <TestEmailModal open={showTestModal} onClose={() => setShowTestModal(false)} smtp={smtp} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Marks Email Tool</h1>
        <p className="text-slate-500 text-sm">
          Configure SMTP, upload marks, compose a template, then send — without ever leaving this page.{" "}
          <Link href="/tutorial" className="text-slate-900 hover:underline inline-flex items-center gap-0.5"><BookOpen size={12} /> Tutorial</Link>
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {TABS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? "bg-white text-slate-900 shadow-sm" : tabDone[id] ? "text-emerald-700 hover:bg-white/60" : "text-slate-500 hover:bg-white/60"
            }`}>
            {tabDone[id] && id !== "send" ? <CheckCircle2 size={13} className="text-emerald-500" /> : icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ─── Tab: SMTP ───────────────────────────────────────────────── */}
      {activeTab === "smtp" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <Settings2 size={17} className="text-slate-600" /> SMTP Configuration
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">SMTP Server</label>
                <input type="text" value={smtp.host} onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                  placeholder="smtp.gmail.com" autoComplete="off"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Port</label>
                <div className="flex gap-2">
                  <input type="number" value={smtp.port} onChange={(e) => setSmtp((s) => ({ ...s, port: e.target.value }))}
                    placeholder="587" autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent" />
                  <button type="button" onClick={() => setSmtp((s) => ({ ...s, port: "587" }))} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 whitespace-nowrap">587</button>
                  <button type="button" onClick={() => setSmtp((s) => ({ ...s, port: "465" }))} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 whitespace-nowrap">465</button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Sender Email</label>
                <input type="email" value={smtp.senderEmail} onChange={(e) => setSmtp((s) => ({ ...s, senderEmail: e.target.value }))}
                  placeholder="yourname@gmail.com" autoComplete="off"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Display Name <span className="text-slate-400 font-normal">(optional — shown as sender name)</span></label>
                <input type="text" value={smtp.displayName} onChange={(e) => setSmtp((s) => ({ ...s, displayName: e.target.value }))}
                  placeholder="e.g. Prof. Smith or CS101 Team"
                  autoComplete="off"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Password / App Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={smtp.password}
                    onChange={(e) => setSmtp((s) => ({ ...s, password: e.target.value }))}
                    placeholder="xxxx xxxx xxxx xxxx" autoComplete="new-password"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent font-mono" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <ShieldCheck size={11} /> Encrypted with AES-256-GCM in your browser.{" "}
                  <Link href="/tutorial#gmail-app-password" className="text-slate-600 hover:underline">Get App Password</Link>
                </p>
              </div>
            </div>

            {testStatus === "ok" && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg mb-4">
                <CheckCircle2 size={15} /> Connection successful!
              </div>
            )}
            {testStatus === "error" && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg mb-4">
                <XCircle size={15} className="mt-0.5 shrink-0" /><span>{testError}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button onClick={testSmtp} disabled={!smtpComplete || testStatus === "testing"}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {testStatus === "testing" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Test Connection
              </button>
              <button onClick={() => setShowTestModal(true)} disabled={!smtpComplete}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Send size={15} /> Send Test Email
              </button>
              <button onClick={async () => { await saveSmtp(smtp); setSmtpSaved(true); setTimeout(() => setSmtpSaved(false), 2000); }}
                disabled={!smtpComplete}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {smtpSaved ? <CheckCircle2 size={15} /> : <Settings2 size={15} />}
                {smtpSaved ? "Saved!" : "Save Settings"}
              </button>
              <button onClick={() => setActiveTab("data")} disabled={!smtpComplete}
                className="ml-auto flex items-center gap-1 px-4 py-2.5 text-slate-900 hover:text-slate-900 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800 text-white rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Common Providers</p>
              {[
                { name: "Gmail", host: "smtp.gmail.com", port: "587" },
                { name: "Outlook / Office 365", host: "smtp.office365.com", port: "587" },
                { name: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: "587" },
                { name: "Zoho Mail", host: "smtp.zoho.com", port: "587" },
              ].map((p) => (
                <button key={p.host} onClick={() => setSmtp((s) => ({ ...s, host: p.host, port: p.port }))}
                  className="w-full text-left mb-2 px-3 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.host} · {p.port}</p>
                </button>
              ))}
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck size={13} /> Security
              </p>
              <ul className="text-xs text-emerald-800 space-y-1.5 leading-relaxed">
                <li>• Credentials <strong>encrypted</strong> (AES-256-GCM) in localStorage</li>
                <li>• Sent over <strong>HTTPS only</strong> to the API route</li>
                <li>• <strong>Never logged</strong> or stored on any server</li>
                <li>• Password field uses <code className="font-mono">autocomplete=off</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Data ───────────────────────────────────────────────── */}
      {activeTab === "data" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Upload size={17} className="text-slate-600" /> Upload Student Data
              </h2>
              <button onClick={downloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                <Download size={13} /> Download Template
              </button>
            </div>

            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-5">
              {(["upload", "paste"] as const).map((m) => (
                <button key={m} onClick={() => setDataMode(m)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${dataMode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {m === "upload" ? "Upload File" : "Paste CSV"}
                </button>
              ))}
            </div>

            {dataMode === "upload" && (
              <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? "border-slate-500 bg-slate-100" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"}`}>
                <Upload size={32} className={`mx-auto mb-3 ${dragOver ? "text-slate-600" : "text-slate-300"}`} />
                <p className="text-sm font-medium text-slate-600">{dragOver ? "Drop to upload" : "Drag & drop or click to browse"}</p>
                <p className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls, .csv</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
              </div>
            )}

            {dataMode === "paste" && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Paste comma-separated values (CSV). First row must be column headers.</p>
                <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`Name,Email,Marks\nAlice Johnson,alice@example.com,18\nBob Smith,bob@example.com,16`}
                  rows={7} className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 resize-y" />
                <button onClick={() => parseCsvText(csvText)} disabled={!csvText.trim()}
                  className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                  Parse CSV
                </button>
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-slate-900 text-sm">
                  Preview — {fileName} &nbsp;
                  <span className="font-normal text-slate-400">({rows.length} row{rows.length !== 1 ? "s" : ""}, {columns.length} column{columns.length !== 1 ? "s" : ""})</span>
                </p>
                <button onClick={() => { setRows([]); setColumns([]); setFileName(""); setEmailColumn(""); }}
                  className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>{columns.map((col) => <th key={col} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        {columns.map((col) => <td key={col} className="px-3 py-2 text-slate-700 max-w-[200px] truncate">{row[col]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 5 && <p className="text-xs text-center text-slate-400 py-2 border-t border-slate-100">+ {rows.length - 5} more rows</p>}
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={() => setActiveTab("template")} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-900 hover:text-slate-900">
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Template ───────────────────────────────────────────── */}
      {activeTab === "template" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
                <Mail size={17} className="text-slate-600" /> Email Template
              </h2>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email address column <span className="text-red-500">*</span></label>
                <select value={emailColumn} onChange={(e) => setEmailColumn(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white">
                  <option value="">— select column —</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {columns.length === 0 && <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1"><AlertCircle size={11} /> Upload data first (go to the Data tab).</p>}
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Subject</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. BIO101 – Assignment 2 Results"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Body — use <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-900 font-mono text-xs">{"{{ColumnName}}"}</code> for dynamic values
                </label>
                <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={14}
                  placeholder={`Dear {{Name}},\n\nHoping you are well.\n\nYour score for Assignment 2 is: {{Marks}}/20\nClass mean: 18.84 | Std dev: 1.69\n\nBest regards,\nBIO101 Teaching Assistants Team\n\n*This is an automated email. Please do not reply.*`}
                  className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 resize-y leading-relaxed" />
              </div>
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => setShowPreview((v) => !v)} disabled={!body || !rows.length}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 transition-colors">
                  <Eye size={14} /> {showPreview ? "Hide Preview" : "Preview with Row 1"}
                </button>
                <button onClick={() => setActiveTab("send")} disabled={!templateComplete}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-900 hover:text-slate-900 disabled:opacity-40">
                  Next <ChevronRight size={15} />
                </button>
              </div>
              {showPreview && rows.length > 0 && (
                <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Preview (Row 1)</p>
                  <p className="text-xs text-slate-500 mb-1"><span className="font-medium">Subject:</span> {interpolate(subject, rows[0])}</p>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed mt-2 border-t border-slate-200 pt-3">{interpolate(body, rows[0])}</pre>
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-24">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Available Variables</p>
              {columns.length === 0 ? (
                <p className="text-xs text-slate-400">Upload data first to see available columns.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {columns.map((col) => (
                    <button key={col} onClick={() => insertVariable(col)} title={`Click to insert {{${col}}} at cursor`}
                      className="px-2.5 py-1 text-xs font-mono bg-slate-100 text-slate-900 border border-slate-200 rounded-full hover:bg-slate-200 transition-colors">
                      {"{{"}{col}{"}}"}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-xs text-amber-700 flex items-start gap-1.5">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  Click a variable chip to insert it at the cursor in the body field. Column names are case-sensitive.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Send ───────────────────────────────────────────────── */}
      {activeTab === "send" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <SendHorizontal size={17} className="text-slate-600" /> Pre-flight Checklist
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "SMTP configured", ok: !!smtpComplete },
                { label: "Data loaded", ok: dataComplete },
                { label: "Template ready", ok: !!templateComplete },
              ].map(({ label, ok }) => (
                <div key={label} className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                  {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />} {label}
                </div>
              ))}
            </div>

            {smtpComplete && dataComplete && templateComplete && (
              <div className="mt-5 flex flex-wrap gap-3 items-center">
                <button onClick={() => startSend(true)} disabled={isSending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-sm">
                  {isSending ? <Loader2 size={15} className="animate-spin" /> : <SendHorizontal size={15} />}
                  {isSending ? "Sending…" : "Send Remaining"}
                </button>
                <button onClick={() => startSend(false)} disabled={isSending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
                  <RotateCcw size={14} /> Resend All
                </button>
                {isSending && (
                  <button onClick={() => { stopRef.current = true; }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl transition-colors">
                    <Minus size={14} /> Stop
                  </button>
                )}
                <button onClick={() => { clearSentHistory(sentKey); setSentSet(new Set()); setRecipients((prev) => prev.map((r) => r.status === "skipped" ? { ...r, status: "pending" } : r)); }}
                  disabled={isSending}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                  <Trash2 size={12} /> Clear sent history
                </button>
              </div>
            )}
          </div>

          {(recipients.length > 0 || (dataComplete && templateComplete)) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-slate-900 text-sm">
                  Recipients
                  {recipients.length > 0 && (
                    <span className="ml-2 text-slate-400 font-normal">
                      {recipients.filter((r) => r.status === "sent").length} sent &nbsp;·&nbsp;
                      {recipients.filter((r) => r.status === "skipped").length} skipped &nbsp;·&nbsp;
                      {recipients.filter((r) => r.status === "error").length} errors &nbsp;·&nbsp;
                      {recipients.filter((r) => r.status === "pending").length} pending
                    </span>
                  )}
                </p>
                {recipients.length === 0 && (
                  <button onClick={() => setRecipients(buildRecipients())} className="text-xs text-slate-900 hover:underline">Load preview</button>
                )}
              </div>
              {recipients.length === 0 && dataComplete && templateComplete && (
                <p className="text-sm text-slate-400 text-center py-6">Click &quot;Load preview&quot; to see recipients or hit &quot;Send Remaining&quot; above.</p>
              )}
              {recipients.length > 0 && (
                <>
                  {isSending && (
                    <div className="mb-4">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-1000 transition-all duration-300 rounded-full"
                          style={{ width: `${(recipients.filter((r) => r.status === "sent" || r.status === "error" || r.status === "skipped").length / recipients.length) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">#</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                          {columns.filter((c) => c !== emailColumn).slice(0, 3).map((c) => (
                            <th key={c} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{c}</th>
                          ))}
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.map((r, i) => (
                          <tr key={r.email + i} className={`border-t border-slate-100 ${r.status === "sending" ? "bg-blue-50" : ""}`}>
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2 text-slate-700 font-mono">{r.email}</td>
                            {columns.filter((c) => c !== emailColumn).slice(0, 3).map((c) => (
                              <td key={c} className="px-3 py-2 text-slate-600 max-w-[150px] truncate">{r.row[c]}</td>
                            ))}
                            <td className="px-3 py-2">
                              <StatusBadge status={r.status} />
                              {r.error && <p className="text-xs text-red-500 mt-0.5 max-w-[200px] truncate" title={r.error}>{r.error}</p>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {sendLog.length > 0 && (
            <div className="bg-slate-900 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Send Log</p>
              <div className="h-40 overflow-y-auto space-y-1">
                {sendLog.map((line, i) => <p key={i} className="text-xs font-mono text-slate-300">{line}</p>)}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
