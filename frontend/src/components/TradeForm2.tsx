import { Icon } from "@iconify/react";
import React, { useState, ChangeEvent, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import FileUpload from "./FileUpload";

interface PartialClose {
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
  pnl: string;
  timestamp: string;
}

interface CleanedTradeFormData {
  symbol: string;
  side: "buy" | "sell";
  entry_price: number;
  quantity: number;
  pnl: number | null;
  timestamp: string | null;
  partial_closes: {
    exit_price: number;
    closed_quantity: number;
    fees: number | null;
    timestamp: string | null;
    pnl: number | null;
  }[];
  file: File | null;
}

interface TradeForm2Props {
  onAdd: (trade: CleanedTradeFormData) => void;
  compactMode?: boolean;
}

const inputClass =
  "border border-green-600/60 p-2 rounded bg-black text-green-600 placeholder-green-900 focus:border-green-400 focus:outline-none w-full min-w-0 text-sm";
const selectClass =
  "border border-green-600/60 p-2 rounded bg-black text-green-600 focus:border-green-400 focus:outline-none text-sm";

const TradeForm2: React.FC<TradeForm2Props> = ({ onAdd, compactMode }) => {
  const { t } = useTranslation();

  const [form, setForm] = useState<TradeFormData>({
    symbol: "",
    side: "buy",
    entry_price: "",
    quantity: "",
    pnl: "",
    timestamp: "",
  });

  const [partialCloses, setPartialCloses] = useState<PartialClose[]>([
    { exit_price: "", closed_quantity: "", fees: "", timestamp: "" },
  ]);

  const [useSingleClose, setUseSingleClose] = useState<boolean>(true);
  const [validationMsg, setValidationMsg] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const validateQuantities = (quantity: string, closes: PartialClose[]) => {
    if (useSingleClose) { setValidationMsg(""); return; }
    const totalClosed = closes.reduce((sum, pc) => sum + (parseFloat(pc.closed_quantity) || 0), 0);
    const qty = parseFloat(quantity || "0");
    if (!qty) { setValidationMsg(""); return; }
    if (totalClosed > qty) setValidationMsg(t("closedQuantityExceeds"));
    else if (totalClosed < qty) setValidationMsg(t("closedQuantityLess"));
    else setValidationMsg(t(""));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const updatedForm = { ...form, [e.target.name]: e.target.value };
    setForm(updatedForm);
    validateQuantities(updatedForm.quantity, partialCloses);
  };

  const handlePartialChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const newCloses = [...partialCloses];
    newCloses[index][e.target.name as keyof PartialClose] = e.target.value;
    setPartialCloses(newCloses);
    validateQuantities(form.quantity, newCloses);
  };

  const addPartialClose = () => {
    const newCloses = [...partialCloses, { exit_price: "", closed_quantity: "", fees: "", timestamp: "" }];
    setPartialCloses(newCloses);
    validateQuantities(form.quantity, newCloses);
  };

  const removePartialClose = (index: number) => {
    if (partialCloses.length === 1) return;
    const newCloses = partialCloses.filter((_, i) => i !== index);
    setPartialCloses(newCloses);
    validateQuantities(form.quantity, newCloses);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.symbol || !form.entry_price || !form.quantity) {
      alert(t("fillrequiredfields"));
      return;
    }
    if (validationMsg) return;

    const cleanedForm: CleanedTradeFormData = {
      symbol: form.symbol,
      side: form.side,
      entry_price: parseFloat(form.entry_price),
      quantity: parseFloat(form.quantity),
      pnl: null,
      timestamp: form.timestamp || null,
      partial_closes: partialCloses.map((pc) => ({
        exit_price: parseFloat(pc.exit_price),
        closed_quantity: parseFloat(pc.closed_quantity) || parseFloat(form.quantity),
        fees: pc.fees ? parseFloat(pc.fees) : null,
        timestamp: pc.timestamp || null,
        pnl: null,
      })),
      file: file ?? null,
    };

    onAdd(cleanedForm);
    setForm({ symbol: "", side: "buy", entry_price: "", quantity: "", pnl: "", timestamp: "" });
    setPartialCloses([{ exit_price: "", closed_quantity: "", fees: "", timestamp: "" }]);
    setUseSingleClose(true);
    setValidationMsg("");
  };

  const validationClass =
    validationMsg === t("closedQuantityMatch")
      ? "text-green-500"
      : validationMsg === t("closedQuantityLess")
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-3 ${compactMode ? "w-full max-w-xs" : "w-full max-w-2xl"}`}
    >
      {/* ── Symbol / Qty / Side row ── */}
      <div className="flex flex-wrap gap-2">
        <input
          name="symbol"
          value={form.symbol}
          onChange={handleChange}
          placeholder={t("symbol")}
          className={`${inputClass} flex-1 min-w-[80px]`}
        />
        <input
          name="quantity"
          value={form.quantity}
          onChange={handleChange}
          placeholder={t("quantity")}
          className={`${inputClass} flex-1 min-w-[80px]`}
        />
        <select
          name="side"
          value={form.side}
          onChange={handleChange}
          className={`${selectClass} w-24`}
        >
          <option value="buy">{t("buy")}</option>
          <option value="sell">{t("sell")}</option>
        </select>
      </div>

      {/* ── Entry price ── */}
      <input
        name="entry_price"
        value={form.entry_price}
        onChange={handleChange}
        placeholder={t("entry")}
        className={inputClass}
      />

      {/* ── Single/multi toggle ── */}
      <div className="flex gap-3 text-sm items-center">
        <label className="text-green-600">{t("singleCloseMode")}</label>
        <input
          type="checkbox"
          checked={!useSingleClose}
          onChange={() => setUseSingleClose(!useSingleClose)}
          className="accent-green-600"
        />
      </div>

      {/* ── Single close ── */}
      {useSingleClose && (
        <div className="flex flex-wrap gap-2">
          <input
            name="exit_price"
            value={partialCloses[0]?.exit_price || ""}
            onChange={(e) => handlePartialChange(0, e)}
            placeholder={t("exit")}
            className={`${inputClass} flex-1 min-w-[90px]`}
          />
          <input
            name="fees"
            value={partialCloses[0]?.fees ?? ""}
            onChange={(e) => handlePartialChange(0, e)}
            placeholder={t("fees")}
            className={`${inputClass} flex-1 min-w-[80px]`}
          />
          <input
            name="timestamp"
            type="datetime-local"
            value={partialCloses[0]?.timestamp ?? ""}
            onChange={(e) => handlePartialChange(0, e)}
            className={`${inputClass} flex-1 min-w-[160px]`}
          />
        </div>
      )}

      {/* ── Multiple closes ── */}
      {!useSingleClose && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs text-green-800">{t("partialCloses")}</h3>
          {partialCloses.map((pc, index) => (
            <div key={index} className="flex flex-wrap gap-2 items-start border border-green-900/40 p-2 rounded">
              <input
                name="exit_price"
                value={pc.exit_price}
                onChange={(e) => handlePartialChange(index, e)}
                placeholder={t("exit")}
                className={`${inputClass} flex-1 min-w-[80px]`}
              />
              <input
                name="closed_quantity"
                value={pc.closed_quantity}
                onChange={(e) => handlePartialChange(index, e)}
                placeholder={t("closedQuantity")}
                className={`${inputClass} flex-1 min-w-[80px]`}
              />
              <input
                name="fees"
                value={pc.fees}
                onChange={(e) => handlePartialChange(index, e)}
                placeholder={t("fees")}
                className={`${inputClass} flex-1 min-w-[70px]`}
              />
              <input
                name="timestamp"
                type="datetime-local"
                value={pc.timestamp}
                onChange={(e) => handlePartialChange(index, e)}
                className={`${inputClass} flex-1 min-w-[160px]`}
              />
              {partialCloses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePartialClose(index)}
                  className="text-red-600 border border-red-900/60 p-1.5 rounded hover:border-red-500 transition"
                >
                  <Icon icon="pixelarticons:close-box" width={16} height={16} />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addPartialClose}
            className="border border-green-600/60 p-2 text-green-600 bg-black hover:border-green-300 transition rounded text-sm"
          >
            {t("addPartialClose")}
          </button>
        </div>
      )}

      <FileUpload onFileSelect={(selectedFile) => setFile(selectedFile)} />

      {validationMsg && (
        <p className={`text-sm font-semibold ${validationClass}`}>{validationMsg}</p>
      )}

      <button
        type="submit"
        className="border border-green-600/60 p-2 text-green-600 bg-black hover:border-green-300 transition rounded text-xl sm:text-2xl"
      >
        {t("addtrade")}
      </button>
    </form>
  );
};

export default TradeForm2;