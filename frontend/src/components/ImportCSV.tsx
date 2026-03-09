import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import api from "../services/api";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

// ── Types ──────────────────────────────────────────────────────────────────
type CsvType = "order" | "balance" | "unknown";
type ImportResult = { success: boolean; message: string; imported?: number; skipped?: number };

interface ImportCSVProps {
  refresh?: () => void;
  /** Active journal to import trades into — import is disabled when null */
  journalId: number | null;
}

const TYPE_META: Record<Exclude<CsvType, "unknown">, { label: string; colorCls: string }> = {
  balance: { label: "✓ Balance History", colorCls: "text-green-dark border-green-dark" },
  order: { label: "✓ Order History", colorCls: "text-green-500 border-green-500" },
};

// ── CSV detection ─────────────────────────────────────────────────────────
async function detectCsvType(file: File): Promise<CsvType> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const header = (e.target?.result as string).split("\n")[0].toLowerCase();
      if (header.includes("order id") || header.includes("fill price")) resolve("order");
      else if (header.includes("balance before") || header.includes("realized p")) resolve("balance");
      else resolve("unknown");
    };
    reader.readAsText(file.slice(0, 512));
  });
}

const MAX_SIZE_MB = 5;

// ── Component ──────────────────────────────────────────────────────────────
const ImportCSV: React.FC<ImportCSVProps> = ({ refresh, journalId }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<CsvType | null>(null);
  const [manualOverride, setManualOverride] = useState<Exclude<CsvType, "unknown"> | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sizeWarning, setSizeWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeType: CsvType | null = manualOverride ?? detectedType;

  const applyFile = useCallback(async (f: File) => {
    setFile(f); setResult(null); setManualOverride(null);
    setSizeWarning(f.size > MAX_SIZE_MB * 1024 * 1024);
    setDetectedType(await detectCsvType(f));
  }, []);

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await applyFile(f);
  }, [applyFile]);

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) await applyFile(f);
  }, [applyFile]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragActive(true); }, []);
  const handleDragLeave = useCallback(() => setDragActive(false), []);

  const handleUpload = useCallback(async () => {
    if (!file || !activeType || activeType === "unknown" || !journalId) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("csv_type", activeType);
    formData.append("journal_id", String(journalId));
    setLoading(true); setResult(null);
    try {
      const res = await api.post<{ message: string; imported?: number; skipped?: number }>("/trades/import-csv", formData);
      setResult({ success: true, message: res.data.message, imported: res.data.imported, skipped: res.data.skipped });
      setFile(null); setDetectedType(null); setSizeWarning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Import failed. Check the file and try again.";
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }, [file, activeType, journalId, refresh]);

  const handleReset = useCallback(() => {
    setFile(null); setDetectedType(null); setManualOverride(null);
    setResult(null); setSizeWarning(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const noJournal = journalId === null;
  const isDisabled = loading || !file || !activeType || activeType === "unknown" || noJournal;

  const modeCls = (active: boolean) =>
    `px-3 py-1 text-xs border transition ${active
      ? "border-green-dark text-green-dark bg-green-950/40"
      : "border-green-900/60 text-green-800 bg-black hover:border-green-600 hover:text-green-600"
    }`;

  return (
    <div className="border border-green-900/60 p-4 sm:p-5 font-jersey15 bg-black text-green-600">

      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="pixelarticons:file-plus" width={20} className="text-green-dark" />
        <span className="text-green-dark text-lg">{t("import_csv")}</span>
        <span className="text-green-900 text-xs ml-1">TradingView</span>
      </div>

      {/* No journal warning */}
      {noJournal && (
        <div className="border border-yellow-700/40 bg-yellow-950/20 p-2.5 mb-3 text-xs text-yellow-500">
          {t("import_no_journal")}
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button" tabIndex={0} aria-label="Upload CSV file"
        className={`border border-dashed transition cursor-pointer p-5 text-center mb-4 outline-none
          ${dragActive ? "border-green-400 bg-green-950/30" :
            file ? "border-green-600/80 bg-green-950/20" :
              "border-green-900/60 hover:border-green-600/60"}`}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        {file ? (
          <div className="flex flex-col items-center gap-1">
            <Icon icon="pixelarticons:file" width={28} className="text-green-dark" />
            <p className="text-green-dark text-sm font-semibold truncate max-w-full px-4">{file.name}</p>
            <p className="text-green-900 text-xs">{(file.size / 1024).toFixed(1)} KB · {t("click_to_change")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Icon icon={dragActive ? "pixelarticons:arrow-down" : "pixelarticons:upload"} width={28} className={dragActive ? "text-green-400" : "text-green-800"} />
            <p className={`text-sm ${dragActive ? "text-green-400" : "text-green-700"}`}>
              {dragActive ? t("drop_to_upload") : t("drop_or_click")}
            </p>
            <p className="text-green-900 text-xs">{t("order_or_balance_history")}</p>
          </div>
        )}
      </div>

      {sizeWarning && (
        <div className="border border-yellow-700/40 bg-yellow-950/20 p-2.5 mb-3 text-xs text-yellow-500">
          {t("file_too_large", { mb: MAX_SIZE_MB })}
        </div>
      )}

      {/* Parser mode */}
      {file && (
        <div className="mb-4">
          <p className="text-green-900 text-xs mb-2 uppercase tracking-wider">{t("parser_mode")}</p>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setManualOverride(null)} className={modeCls(!manualOverride)}>{t("auto_detect")}</button>
            <button onClick={() => setManualOverride("balance")} className={modeCls(manualOverride === "balance")}>{t("balance_history")}</button>
            <button onClick={() => setManualOverride("order")} className={modeCls(manualOverride === "order")}>{t("order_history")}</button>
            {detectedType && !manualOverride && detectedType !== "unknown" && (
              <span className={`text-xs px-2 py-0.5 border ${TYPE_META[detectedType].colorCls}`}>
                {TYPE_META[detectedType].label}
              </span>
            )}
            {detectedType === "unknown" && !manualOverride && (
              <span className="text-xs px-2 py-0.5 border border-yellow-700/60 text-yellow-500">{t("unknown_format")}</span>
            )}
          </div>
        </div>
      )}

      {activeType === "order" && (
        <div className="border border-yellow-700/40 bg-yellow-950/20 p-3 mb-4 text-xs text-yellow-500 leading-relaxed">
          <span className="text-yellow-400 font-semibold">⚠ Note:</span> Order History only works
          correctly if exported from your <span className="text-yellow-400">very first trade</span>.
          A partial export will produce wrong sides near the top of the file.{" "}
          <span className="text-yellow-400">{t("balance_history_accurate")}</span>.
        </div>
      )}

      {file && activeType === "unknown" && (
        <div className="border border-yellow-700/40 bg-yellow-950/20 p-3 mb-4 text-xs text-yellow-500">
          {t("could_not_detect_type")}
        </div>
      )}

      {/* Import button */}
      <button
        onClick={handleUpload}
        disabled={isDisabled}
        className={`w-full p-3 border text-base transition ${isDisabled
          ? "border-green-900/40 text-green-900 cursor-not-allowed"
          : "border-green-600/60 text-green-600 bg-black hover:border-green-300 hover:text-green-400"
          }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Icon icon="pixelarticons:refresh" className="animate-spin" width={16} />
            {t("importing")}
          </span>
        ) : (
          `Import${activeType && activeType !== "unknown"
            ? ` (${activeType === "balance" ? "Balance" : "Order"} History)`
            : ""}`
        )}
      </button>

      {result && (
        <div className={`mt-3 p-3 border text-sm ${result.success
          ? "border-green-700/60 bg-green-950/30 text-green-dark"
          : "border-red-800/60 bg-red-950/20 text-red-500"
          }`}>
          {result.success ? "✓ " : "✗ "}{result.message}
          {result.success && result.skipped != null && result.skipped > 0 && (
            <span className="ml-2 text-xs text-green-800">
              ({result.skipped} duplicate{result.skipped !== 1 ? "s" : ""} skipped)
            </span>
          )}
          {result.success && (
            <button onClick={handleReset} className="ml-3 text-green-700 hover:text-green-500 underline text-xs transition">
              {t("import_another")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportCSV;