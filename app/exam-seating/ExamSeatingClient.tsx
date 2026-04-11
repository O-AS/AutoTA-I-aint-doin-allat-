"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import {
  Upload,
  Plus,
  Trash2,
  Download,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Row = Record<string, string>;

interface Auditorium {
  id: number;
  name: string;
  seats: string;
}

interface AllocatedRow extends Row {
  "Allotted Auditorium": string;
  "Allotted Seat": string;
}

// ─── xlsx CDN loader ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getXLSX(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).XLSX) return Promise.resolve((window as any).XLSX);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
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

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Step({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          done
            ? "bg-slate-900 text-white"
            : active
            ? "bg-slate-900 text-white"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        {done ? <CheckCircle2 size={14} /> : n}
      </div>
      <span
        className={`text-sm font-medium ${
          active ? "text-slate-900" : done ? "text-slate-700" : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExamSeatingClient() {
  // Step: 1=upload, 2=configure, 3=results
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — file upload
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 — auditoriums
  const [auditoriums, setAuditoriums] = useState<Auditorium[]>([
    { id: 1, name: "", seats: "" },
  ]);
  const [configError, setConfigError] = useState("");

  // Step 3 — results
  const [allocated, setAllocated] = useState<AllocatedRow[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // ── Step 1: Parse file ───────────────────────────────────────────────────

  const parseFile = useCallback(async (file: File) => {
    setUploadError("");
    try {
      const XLSX = await getXLSX();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: Row[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (data.length === 0) {
        setUploadError("The file appears to be empty.");
        return;
      }
      setRows(data);
      setColumns(Object.keys(data[0]));
      setFileName(file.name);
      setStep(2);
    } catch {
      setUploadError("Failed to parse file. Make sure it is a valid CSV or Excel file.");
    }
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  // ── Step 2: Auditorium management ───────────────────────────────────────

  const addAuditorium = () =>
    setAuditoriums((prev) => [
      ...prev,
      { id: Date.now(), name: "", seats: "" },
    ]);

  const removeAuditorium = (id: number) =>
    setAuditoriums((prev) => prev.filter((a) => a.id !== id));

  const updateAuditorium = (
    id: number,
    field: "name" | "seats",
    value: string
  ) =>
    setAuditoriums((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );

  const totalSeats = auditoriums.reduce(
    (s, a) => s + (parseInt(a.seats) || 0),
    0
  );

  const runAllocation = () => {
    setConfigError("");

    // Validate
    for (const a of auditoriums) {
      if (!a.name.trim()) {
        setConfigError("All auditoriums must have a name.");
        return;
      }
      if (!a.seats || parseInt(a.seats) <= 0) {
        setConfigError("All auditoriums must have a valid seat count (> 0).");
        return;
      }
    }

    const names = auditoriums.map((a) => a.name.trim());
    if (new Set(names).size !== names.length) {
      setConfigError("Auditorium names must be unique.");
      return;
    }

    if (totalSeats < rows.length) {
      setConfigError(
        `Not enough seats. You have ${rows.length} students but only ${totalSeats} seats.`
      );
      return;
    }

    // Shuffle students
    const shuffled = shuffle(rows);

    // Allocate
    const result: AllocatedRow[] = [];
    let idx = 0;
    for (const aud of auditoriums) {
      const count = parseInt(aud.seats);
      for (let seat = 1; seat <= count; seat++) {
        if (idx >= shuffled.length) break;
        result.push({
          ...shuffled[idx],
          "Allotted Auditorium": aud.name.trim(),
          "Allotted Seat": String(seat),
        });
        idx++;
      }
    }

    setAllocated(result);
    setStep(3);
  };

  // ── Step 3: Download Excel ────────────────────────────────────────────────

  const downloadExcel = async () => {
    setDownloadError("");
    setDownloading(true);
    try {
      const XLSX = await getXLSX();
      const wb = XLSX.utils.book_new();

      // Per-auditorium sheets
      const audNames = [...new Set(allocated.map((r) => r["Allotted Auditorium"]))];
      for (const name of audNames) {
        const sheetRows = allocated.filter(
          (r) => r["Allotted Auditorium"] === name
        );
        const ws = XLSX.utils.json_to_sheet(sheetRows);
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      }

      // Master sheet
      const masterWs = XLSX.utils.json_to_sheet(allocated);
      XLSX.utils.book_append_sheet(wb, masterWs, "Master Sheet");

      XLSX.writeFile(wb, "seat_allocation.xlsx");
    } catch {
      setDownloadError("Failed to generate Excel file.");
    } finally {
      setDownloading(false);
    }
  };

  const resetAll = () => {
    setRows([]);
    setColumns([]);
    setFileName("");
    setUploadError("");
    setAuditoriums([{ id: 1, name: "", seats: "" }]);
    setConfigError("");
    setAllocated([]);
    setDownloadError("");
    setStep(1);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const auditoriumSummary = [...new Set(allocated.map((r) => r["Allotted Auditorium"]))].map(
    (name) => ({
      name,
      count: allocated.filter((r) => r["Allotted Auditorium"] === name).length,
    })
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Exam Seat Allocation
        </h1>
        <p className="text-slate-500 text-sm">
          Upload your student list, configure auditoriums, and randomly allocate seats. Download the result as an Excel file with per-auditorium sheets.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        <Step n={1} label="Upload Data" active={step === 1} done={step > 1} />
        <ChevronRight size={16} className="text-slate-300" />
        <Step n={2} label="Configure Auditoriums" active={step === 2} done={step > 2} />
        <ChevronRight size={16} className="text-slate-300" />
        <Step n={3} label="Results & Download" active={step === 3} done={false} />
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-slate-500" />
            Upload Student List (CSV or Excel)
          </h2>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-slate-500 bg-slate-100"
                : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            <Upload
              size={32}
              className={`mx-auto mb-3 ${dragOver ? "text-slate-600" : "text-slate-300"}`}
            />
            <p className="text-sm text-slate-600 font-medium mb-1">
              Drag & drop your file here, or click to browse
            </p>
            <p className="text-xs text-slate-400">.xlsx, .xls, .csv</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {uploadError && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {uploadError}
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400">
            The file should have at minimum a student name column and an email column. All columns will be preserved in the output.
          </p>
        </div>
      )}

      {/* ── STEP 2: Configure Auditoriums ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* File summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <FileSpreadsheet size={15} className="text-slate-500" />
              <span className="font-medium">{fileName}</span>
              <span className="text-slate-400">—</span>
              <span>{rows.length} students</span>
              <span className="text-slate-400">·</span>
              <span>Columns: {columns.join(", ")}</span>
            </div>
            <button
              onClick={resetAll}
              className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
            >
              <X size={12} /> Change file
            </button>
          </div>

          {/* Auditoriums table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Auditorium Configuration
            </h2>

            <div className="space-y-3 mb-4">
              {auditoriums.map((aud, i) => (
                <div key={aud.id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-5 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <input
                    type="text"
                    placeholder="Auditorium name (e.g. A1)"
                    value={aud.name}
                    onChange={(e) =>
                      updateAuditorium(aud.id, "name", e.target.value)
                    }
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <input
                    type="number"
                    placeholder="Seats"
                    min={1}
                    value={aud.seats}
                    onChange={(e) =>
                      updateAuditorium(aud.id, "seats", e.target.value)
                    }
                    className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  {auditoriums.length > 1 && (
                    <button
                      onClick={() => removeAuditorium(aud.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addAuditorium}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> Add auditorium
            </button>

            {/* Seat summary */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                Total seats:{" "}
                <span
                  className={`font-semibold ${
                    totalSeats >= rows.length
                      ? "text-slate-900"
                      : "text-red-600"
                  }`}
                >
                  {totalSeats}
                </span>{" "}
                / {rows.length} students
              </span>
              {totalSeats > rows.length && (
                <span className="text-xs text-slate-400">
                  {totalSeats - rows.length} seats will remain empty
                </span>
              )}
            </div>

            {configError && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {configError}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={runAllocation}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Shuffle size={15} />
                Allocate Seats Randomly
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Results ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 text-white rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Total Allocated</p>
              <p className="text-2xl font-bold">{allocated.length}</p>
              <p className="text-xs text-slate-400">students</p>
            </div>
            {auditoriumSummary.map((a) => (
              <div key={a.name} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1 truncate">{a.name}</p>
                <p className="text-2xl font-bold text-slate-900">{a.count}</p>
                <p className="text-xs text-slate-400">students</p>
              </div>
            ))}
          </div>

          {/* Download + actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">
                Allocation ready — {allocated.length} students across{" "}
                {auditoriumSummary.length} auditorium
                {auditoriumSummary.length !== 1 ? "s" : ""}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setStep(2); }}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Shuffle size={13} /> Re-shuffle
                </button>
                <button
                  onClick={downloadExcel}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Download size={15} />
                  {downloading ? "Generating…" : "Download Excel"}
                </button>
              </div>
            </div>

            {downloadError && (
              <div className="mb-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {downloadError}
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-auto rounded-xl border border-slate-100 max-h-96">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    {Object.keys(allocated[0] || {}).map((col) => (
                      <th
                        key={col}
                        className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${
                          col === "Allotted Auditorium" || col === "Allotted Seat"
                            ? "text-slate-900 bg-slate-100"
                            : "text-slate-500"
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allocated.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      {Object.entries(row).map(([col, val]) => (
                        <td
                          key={col}
                          className={`px-3 py-1.5 whitespace-nowrap ${
                            col === "Allotted Auditorium" || col === "Allotted Seat"
                              ? "font-semibold text-slate-900"
                              : "text-slate-600"
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              The downloaded Excel file will contain one sheet per auditorium plus a Master Sheet.
            </p>
          </div>

          <button
            onClick={resetAll}
            className="text-sm text-slate-400 hover:text-slate-700 underline"
          >
            Start over with a new file
          </button>
        </div>
      )}
    </div>
  );
}
