import React, { useState, useCallback, ChangeEvent, KeyboardEvent, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import FileUpload from "./FileUpload";
import { FTrade } from "../services/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface PartialCloseInput {
  exit_price: string;
  closed_quantity: string;
  fees: string;
  timestamp: string;
}

interface TradeFormData {
  symbol: string;
  side: "buy" | "sell";
  entry_price: string;
  quantity: string;
  timestamp: string;
}

interface TradeFormProps {
  onAdd: (trade: FTrade) => void;
  compactMode?: boolean;
  journalId: number;
}

// ── Shared styles ──────────────────────────────────────────────────────────
const inputCls = "border border-green-800/60 focus:border-green-400 focus:shadow-[0_0_8px_rgba(74,222,128,0.2)] bg-black/40 text-green-300 placeholder-green-900/80 px-3 py-2.5 outline-none transition-all duration-300 w-full text-sm";
const selectCls = "border border-green-800/60 focus:border-green-400 focus:shadow-[0_0_8px_rgba(74,222,128,0.2)] bg-black/40 text-green-300 px-3 py-2.5 outline-none transition-all duration-300 text-sm";
const labelCls = "text-[11px] text-green-700 uppercase tracking-widest mb-1.5 block font-semibold truncate";
const sectionCls = "border border-green-900/40 bg-green-950/5 p-4 relative";
const sectionTitleCls = "absolute -top-2.5 left-3 bg-black px-2 text-[10px] text-green-600 tracking-widest uppercase";

// Tag color — deterministic by string
const TAG_COLORS_BG = [
  "border-green-700/60 text-green-600 bg-green-950/30",
  "border-blue-800/60 text-blue-500 bg-blue-950/20",
  "border-yellow-700/60 text-yellow-500 bg-yellow-950/20",
  "border-purple-800/60 text-purple-500 bg-purple-950/20",
  "border-cyan-800/60 text-cyan-500 bg-cyan-950/20",
  "border-orange-800/60 text-orange-500 bg-orange-950/20",
];
const tagCls = (tag: string) =>
  TAG_COLORS_BG[[...tag].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) % TAG_COLORS_BG.length];

// ── TagInput component ─────────────────────────────────────────────────────
const TagInput: React.FC<{
  tags: string[];
  onChange: (tags: string[]) => void;
}> = ({ tags, onChange }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");

  const commit = useCallback(() => {
    const raw = input.trim().replace(/^#+/, "").toLowerCase();
    const next = raw.split(/[\s,]+/).filter(Boolean);
    if (next.length === 0) return;
    const combined = [...new Set([...tags, ...next])];
    onChange(combined);
    setInput("");
  }, [input, tags, onChange]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const remove = (tag: string) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="border border-green-900/60 focus-within:border-green-500 bg-black px-2 py-1.5 flex flex-wrap gap-1 items-center min-h-[38px] transition-colors">
      {tags.map(tag => (
        <span key={tag} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 border tracking-wide ${tagCls(tag)}`}>
          #{tag}
          <button type="button" onClick={() => remove(tag)} className="hover:opacity-60 transition leading-none ml-0.5">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={commit}
        placeholder={tags.length === 0 ? t("tags_placeholder") : ""}
        className="bg-transparent text-green-400 placeholder-green-900 outline-none text-sm flex-1 min-w-[80px]"
      />
    </div>
  );
};

// ── TradeForm ──────────────────────────────────────────────────────────────
const TradeForm: React.FC<TradeFormProps> = ({ onAdd, compactMode, journalId }) => {
  const { t } = useTranslation();

  const [form, setForm] = useState<TradeFormData>({
    symbol: "", side: "buy", entry_price: "", quantity: "", timestamp: "",
  });
  const [closes, setCloses] = useState<PartialCloseInput[]>([
    { exit_price: "", closed_quantity: "", fees: "", timestamp: "" },
  ]);
  const [multiClose, setMultiClose] = useState(false);
  const [message, setMessage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [validationMsg, setValidationMsg] = useState("");

  // ── Quantity validation ───────────────────────────────────────────────────
  const validateQty = useCallback((qty: string, cls: PartialCloseInput[]) => {
    if (!multiClose) { setValidationMsg(""); return; }
    const total = cls.reduce((s, pc) => s + (parseFloat(pc.closed_quantity) || 0), 0);
    const q = parseFloat(qty) || 0;
    if (!q) { setValidationMsg(""); return; }
    if (total > q) setValidationMsg(t("closedQuantityExceeds"));
    else if (total < q) setValidationMsg(t("closedQuantityLess"));
    else setValidationMsg(t("closedQuantityMatch"));
  }, [multiClose, t]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    validateQty(updated.quantity, closes);
  };

  const handleCloseChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const updated = closes.map((pc, idx) =>
      idx === i ? { ...pc, [e.target.name]: e.target.value } : pc
    );
    setCloses(updated);
    validateQty(form.quantity, updated);
  };

  const addClose = () => setCloses(c => [...c, { exit_price: "", closed_quantity: "", fees: "", timestamp: "" }]);
  const removeClose = (i: number) => {
    if (closes.length === 1) return;
    const updated = closes.filter((_, idx) => idx !== i);
    setCloses(updated);
    validateQty(form.quantity, updated);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.entry_price || !form.quantity) {
      alert(t("fillrequiredfields")); return;
    }
    if (validationMsg && validationMsg !== t("closedQuantityMatch")) return;

    const out: FTrade = {
      symbol: form.symbol,
      side: form.side,
      entry_price: parseFloat(form.entry_price),
      quantity: parseFloat(form.quantity),
      pnl: null,
      timestamp: form.timestamp || null,
      partial_closes: closes.map(pc => ({
        exit_price: parseFloat(pc.exit_price),
        closed_quantity: parseFloat(pc.closed_quantity) || parseFloat(form.quantity),
        fees: pc.fees ? parseFloat(pc.fees) : null,
        timestamp: pc.timestamp || null,
        pnl: null,
      })),
      file: file ?? null,
      journal_id: journalId,
      message: message.trim() || null,
      tags,
    };

    onAdd(out);
    setForm({ symbol: "", side: "buy", entry_price: "", quantity: "", timestamp: "" });
    setCloses([{ exit_price: "", closed_quantity: "", fees: "", timestamp: "" }]);
    setMultiClose(false);
    setMessage(""); setTags([]); setFile(null);
    setValidationMsg("");
  };

  const validCls =
    validationMsg === t("closedQuantityMatch") ? "text-green-500" :
      validationMsg === t("closedQuantityLess") ? "text-yellow-500" : "text-red-500";

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-5 ${compactMode ? "w-full max-w-xs" : "w-full max-w-2xl"} font-jersey15`}
    >
      {/* ── Core Details ── */}
      <div className={sectionCls}>
        <span className={sectionTitleCls}>{t("core_details", "Core Details")}</span>
        <div className="flex flex-col sm:flex-row gap-4 mb-4 mt-2">
          <div className="flex-1 min-w-0">
            <label className={labelCls}>{t("symbol")} *</label>
            <input name="symbol" value={form.symbol} onChange={handleChange} placeholder="BTCUSDT" className={inputCls} />
          </div>
          <div className="w-full sm:w-32 shrink-0">
            <label className={labelCls}>{t("quantity")} *</label>
            <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="0.1" className={inputCls} />
          </div>
          <div className="w-full sm:w-28 shrink-0">
            <label className={labelCls}>{t("side")}</label>
            <select name="side" value={form.side} onChange={handleChange} className={`${selectCls} w-full`}>
              <option value="buy">{t("buy")}</option>
              <option value="sell">{t("sell")}</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>{t("entry")} *</label>
          <input name="entry_price" value={form.entry_price} onChange={handleChange} placeholder="42000.00" className={inputCls} />
        </div>
      </div>

      {/* ── Exit Strategy ── */}
      <div className={sectionCls}>
        <span className={sectionTitleCls}>{t("exit_strategy", "Exit Strategy")}</span>

        {/* Close mode toggle */}
        <div className="flex items-center gap-3 mb-4 mt-2 bg-green-950/20 py-2 px-3 border border-green-900/30">
          <span className={`text-xs ${!multiClose ? "text-green-400" : "text-green-800"}`}>{t("singleCloseMode")}</span>
          <button
            type="button"
            onClick={() => { setMultiClose(v => !v); setValidationMsg(""); }}
            className={`w-10 h-5 border relative transition-colors ${multiClose ? "border-green-500 bg-green-950" : "border-green-700 bg-black"}`}
          >
            <span className={`absolute top-0.5 h-3.5 w-4 border transition-all duration-200 ${multiClose ? "right-0.5 border-green-400 bg-green-500" : "left-0.5 border-green-600 bg-green-800"
              }`} />
          </button>
          <span className={`text-xs ${multiClose ? "text-green-400" : "text-green-800"}`}>{t("partialCloses")}</span>
        </div>

        {/* ── Single close ── */}
        {!multiClose && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t("exit")}</label>
              <input name="exit_price" value={closes[0]?.exit_price ?? ""} onChange={e => handleCloseChange(0, e)} placeholder="45000.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("fees")}</label>
              <input name="fees" value={closes[0]?.fees ?? ""} onChange={e => handleCloseChange(0, e)} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("close_time")}</label>
              <input name="timestamp" type="datetime-local" value={closes[0]?.timestamp ?? ""} onChange={e => handleCloseChange(0, e)} className={inputCls} />
            </div>
          </div>
        )}

        {/* ── Multiple closes ── */}
        {multiClose && (
          <div className="flex flex-col gap-3">
            {closes.map((pc, i) => (
              <div key={i} className="border border-green-800/40 bg-black/40 p-3 pt-5 flex flex-col gap-3 relative">
                <span className="text-[10px] text-green-600 bg-green-950/50 px-2 py-0.5 border border-green-900/40 absolute top-[-8px] left-2">{t("close_n", { n: i + 1 })}</span>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="min-w-0">
                    <label className={labelCls}>{t("exit")}</label>
                    <input name="exit_price" value={pc.exit_price} onChange={e => handleCloseChange(i, e)} placeholder="45000.00" className={inputCls} />
                  </div>
                  <div className="min-w-0">
                    <label className={labelCls} title={t("closedQuantity")}>{t("closedQuantity")}</label>
                    <input name="closed_quantity" value={pc.closed_quantity} onChange={e => handleCloseChange(i, e)} placeholder="0.05" className={inputCls} />
                  </div>
                  <div className="min-w-0">
                    <label className={labelCls}>{t("fees")}</label>
                    <input name="fees" value={pc.fees} onChange={e => handleCloseChange(i, e)} placeholder="1.50" className={inputCls} />
                  </div>
                  <div className="min-w-0">
                    <label className={labelCls}>{t("close_time")}</label>
                    <input name="timestamp" type="datetime-local" value={pc.timestamp} onChange={e => handleCloseChange(i, e)} className={inputCls} />
                  </div>
                </div>
                {closes.length > 1 && (
                  <button type="button" onClick={() => removeClose(i)}
                    className="absolute top-2 right-2 text-red-700 hover:text-red-400 bg-black/60 px-1 border border-red-900/40 transition-colors">
                    <Icon icon="pixelarticons:close" width={14} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addClose}
              className="border border-green-800/60 text-green-500 hover:border-green-400 hover:bg-green-950/30 hover:shadow-[0_0_10px_rgba(74,222,128,0.15)] py-2 text-sm flex items-center gap-2 justify-center transition-all duration-300 mt-1">
              <Icon icon="pixelarticons:plus" width={16} />
              {t("addPartialClose")}
            </button>
          </div>
        )}

        {validationMsg && <p className={`text-xs font-semibold mt-3 ${validCls}`}>{validationMsg}</p>}
      </div>

      {/* ── Advanced Data (Now always visible) ── */}
      <div className={sectionCls}>
        <span className={sectionTitleCls}>{t("additional_data", "Additional Data")}</span>
        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Open timestamp */}
            <div>
              <label className={labelCls}>{t("open_time")}</label>
              <input name="timestamp" type="datetime-local" value={form.timestamp} onChange={handleChange} className={inputCls} />
            </div>

            {/* Tags */}
            <div>
              <label className={labelCls}>{t("tags")}</label>
              <TagInput tags={tags} onChange={setTags} />
              <p className="text-[10px] text-green-800 mt-1">{t("tags_hint")}</p>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className={labelCls}>{t("note")}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={t("note_placeholder")}
              className={`${inputCls} resize-none mb-1`}
            />
          </div>

          {/* Image upload */}
          <div>
            <label className={labelCls}>{t("image")}</label>
            <FileUpload onFileSelect={setFile} />
          </div>
        </div>
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        className="mt-2 border border-green-500/80 py-4 text-green-400 bg-green-950/20 hover:bg-green-600 hover:text-black hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] transition-all duration-300 text-lg uppercase tracking-widest font-bold flex items-center justify-center gap-3 w-full"
      >
        <Icon icon="pixelarticons:check" width={24} />
        {t("addtrade")}
      </button>
    </form>
  );
};

export default TradeForm;
export type { TradeFormProps };
