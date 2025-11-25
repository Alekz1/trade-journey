import { Icon } from "@iconify/react";
import { parse } from "date-fns";
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
  file: File | null
}

interface TradeForm2Props {
  onAdd: (trade: CleanedTradeFormData) => void;
}

const TradeForm2: React.FC<TradeForm2Props> = ({ onAdd }) => {
  const { t } = useTranslation();

  const [form, setForm] = useState<TradeFormData>({
    symbol: "",
    side: "buy",
    entry_price: "",
    quantity: "",
    pnl: "",
    timestamp: ""
  });

  const [partialCloses, setPartialCloses] = useState<PartialClose[]>([
    { exit_price: "", closed_quantity: "", fees: "", timestamp: "" },
  ]);

  const [useSingleClose, setUseSingleClose] = useState<boolean>(true);
  const [validationMsg, setValidationMsg] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const validateQuantities = (quantity: string, closes: PartialClose[]) => {
    if (useSingleClose) {
      setValidationMsg("");
      return;
    }
    const totalClosed = closes.reduce(
      (sum, pc) => sum + (parseFloat(pc.closed_quantity) || 0),
      0
    );
    const qty = parseFloat(quantity || "0");

    if (!qty) {
      setValidationMsg("");
      return;
    }

    if (totalClosed > qty) {
      setValidationMsg(t("closedQuantityExceeds"));
    } else if (totalClosed < qty) {
      setValidationMsg(t("closedQuantityLess"));
    } else {
      setValidationMsg(t(""));
    }
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
    const newCloses = [
      ...partialCloses,
      { exit_price: "", closed_quantity: "", fees: "", timestamp: "" },
    ];
    setPartialCloses(newCloses);
    validateQuantities(form.quantity, newCloses);
  };

  const removePartialClose = (index: number) => {
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

    if(validationMsg){
      return
    }

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
      file: file ? file : null
    };

    onAdd(cleanedForm);
    console.log("Submitting trade:", cleanedForm);

    // Reset
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
      : validationMsg === t("closedQuantityExceeds")
      ? "text-red-500"
      : "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      {/* Main trade fields */}
      <div className="flex gap-3">
        <input
          name="symbol"
          value={form.symbol}
          onChange={handleChange}
          placeholder={t("symbol")}
          className="border p-2 rounded w-full"
        />
        <input
          name="quantity"
          value={form.quantity}
          onChange={handleChange}
          placeholder={t("quantity")}
          className="border p-2 rounded w-full"
        />
        <select
          name="side"
          value={form.side}
          onChange={handleChange}
          className="border p-2 rounded w-2/3"
          style={{ backgroundColor: "#242424" }}
        >
          <option value="buy">{t("buy")}</option>
          <option value="sell">{t("sell")}</option>
        </select>
      </div>

      <input
        name="entry_price"
        value={form.entry_price}
        onChange={handleChange}
        placeholder={t("entry")}
        className="border p-2 rounded"
      />

      {/* Toggle for single vs multiple closes */}
      <div className="flex gap-3 text-lg items-center">
        <label>{t("singleCloseMode")}</label>
        <input
          type="checkbox"
          checked={!useSingleClose}
          onChange={() => setUseSingleClose(!useSingleClose)}
        />
      </div>

      {/* Single close mode */}
      {useSingleClose && (
        <div className="flex gap-2">
          <input
            name="exit_price"
            value={partialCloses[0].exit_price}
            onChange={(e) => handlePartialChange(0, e)}
            placeholder={t("exit")}
            className="border p-2 rounded"
          />
          <input
            name="fees"
            value={partialCloses[0].fees}
            onChange={(e) => handlePartialChange(0, e)}
            placeholder={t("fees")}
            className="border p-2 rounded"
          />
          <input
            name="timestamp"
            type="datetime-local"
            value={partialCloses[0].timestamp}
            onChange={(e) => handlePartialChange(0, e)}
            className="border p-2 rounded"
          />
        </div>
      )}

      {/* Multiple close mode */}
      {!useSingleClose && (
        <>
          <h3 className="text-sm text-gray-400">{t("partialCloses")}</h3>
          {partialCloses.map((pc, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                name="exit_price"
                value={pc.exit_price}
                onChange={(e) => handlePartialChange(index, e)}
                placeholder={t("exit")}
                className="border p-2 rounded"
              />
              <input
                name="closed_quantity"
                value={pc.closed_quantity}
                onChange={(e) => handlePartialChange(index, e)}
                placeholder={t("closedQuantity")}
                className="border p-2 rounded"
              />
              <input
                name="fees"
                value={pc.fees}
                onChange={(e) => handlePartialChange(index, e)}
                placeholder={t("fees")}
                className="border p-2 rounded"
              />
              <input
                name="timestamp"
                type="datetime-local"
                value={pc.timestamp}
                onChange={(e) => handlePartialChange(index, e)}
                className="border p-2 rounded"
              />
              <button
                type="button"
                onClick={() => removePartialClose(index)}
                className="text-red-500 border p-2 rounded border-green-500"
              >
                <Icon icon="pixelarticons:close-box"/>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPartialClose}
            className="border p-2 text-green-500 bg-black/50 hover:border-green-300 transition rounded"
          >
            + {t("addPartialClose")}
          </button>
        </>
      )}
      <FileUpload onFileSelect={(selectedFile) => setFile(selectedFile)} />
      {/* Validation message above submit */}
      {validationMsg && (
        <p className={`font-semibold mb-2 ${validationClass}`}>
          {validationMsg}
        </p>
      )}

      <button
        type="submit"
        className="border p-2 text-green-600 bg-black/70 hover:border-green-300 transition rounded text-3xl"
      >
        {t("addtrade")}
      </button>
    </form>
  );
};

export default TradeForm2;
