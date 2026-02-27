import React, { useState, useRef } from 'react';
import api from '../services/api';
import { Icon } from '@iconify/react';

// ── Client-side CSV type detection (mirrors server logic) ──────────────────
async function detectCsvType(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const header = e.target.result.split('\n')[0].toLowerCase();
      if (header.includes('order id') || header.includes('fill price')) resolve('order');
      else if (header.includes('balance before') || header.includes('realized p')) resolve('balance');
      else resolve('unknown');
    };
    reader.readAsText(file.slice(0, 512));
  });
}

const ImportCSV = ({ refresh }) => {
  const [file, setFile]             = useState(null);
  const [detectedType, setDetectedType] = useState(null);
  const [manualOverride, setManualOverride] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const fileInputRef                = useRef(null);

  const activeType = manualOverride ?? detectedType;

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setManualOverride(null);
    const t = await detectCsvType(f);
    setDetectedType(t);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !f.name.endsWith('.csv')) return;
    setFile(f);
    setResult(null);
    setManualOverride(null);
    const t = await detectCsvType(f);
    setDetectedType(t);
  };

  const handleUpload = async () => {
    if (!file || !activeType || activeType === 'unknown') return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('csv_type', activeType);
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/trades/import-csv', formData);
      setResult({ success: true, message: res.data.message });
      setFile(null);
      setDetectedType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (refresh) refresh();
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.detail || 'Import failed. Check the file and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setDetectedType(null);
    setManualOverride(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isDisabled = loading || !file || !activeType || activeType === 'unknown';

  // ── Type badge label / color ───────────────────────────────────────────
  const typeLabel = {
    balance: { label: '✓ Balance History', color: 'text-green-dark border-green-dark' },
    order:   { label: '✓ Order History',   color: 'text-green-500 border-green-500' },
    unknown: { label: '⚠ Unknown format',  color: 'text-yellow-500 border-yellow-600' },
  };

  const modeBtn = (val, label, isActive) =>
    `px-3 py-1 text-xs border transition rounded ${
      isActive
        ? 'border-green-dark text-green-dark bg-green-950/40'
        : 'border-green-900/60 text-green-800 bg-black hover:border-green-600 hover:text-green-600'
    }`;

  return (
    <div className="border border-green-900/60 p-4 sm:p-5 font-jersey15 bg-black text-green-600">

      {/* ── Title ── */}
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="pixelarticons:file-plus" width={20} height={20} className="text-green-dark" />
        <span className="text-green-dark text-lg">Import CSV</span>
        <span className="text-green-900 text-xs ml-1">TradingView</span>
      </div>

      {/* ── Drop zone ── */}
      <div
        className={`border border-dashed transition cursor-pointer p-5 text-center mb-4 ${
          file
            ? 'border-green-600/80 bg-green-950/20'
            : 'border-green-900/60 hover:border-green-600/60'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        {file ? (
          <div className="flex flex-col items-center gap-1">
            <Icon icon="pixelarticons:file" width={28} height={28} className="text-green-dark" />
            <p className="text-green-dark text-sm font-semibold truncate max-w-full px-4">{file.name}</p>
            <p className="text-green-900 text-xs">{(file.size / 1024).toFixed(1)} KB · click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Icon icon="pixelarticons:upload" width={28} height={28} className="text-green-800" />
            <p className="text-green-700 text-sm">Drop CSV here or click to select</p>
            <p className="text-green-900 text-xs">Order History or Balance History</p>
          </div>
        )}
      </div>

      {/* ── Parser mode selector ── */}
      {file && (
        <div className="mb-4">
          <p className="text-green-900 text-xs mb-2 uppercase tracking-wider">Parser mode</p>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setManualOverride(null)}
              className={modeBtn(null, 'Auto-detect', !manualOverride)}
            >
              Auto-detect
            </button>
            <button
              onClick={() => setManualOverride('balance')}
              className={modeBtn('balance', 'Balance History', manualOverride === 'balance')}
            >
              Balance History
            </button>
            <button
              onClick={() => setManualOverride('order')}
              className={modeBtn('order', 'Order History', manualOverride === 'order')}
            >
              Order History
            </button>

            {/* Detection badge */}
            {detectedType && !manualOverride && (
              <span className={`text-xs px-2 py-0.5 border ${typeLabel[detectedType]?.color ?? 'text-green-800 border-green-900'}`}>
                {typeLabel[detectedType]?.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Order History warning ── */}
      {activeType === 'order' && (
        <div className="border border-yellow-700/40 bg-yellow-950/20 p-3 mb-4 text-xs text-yellow-500 leading-relaxed">
          <span className="text-yellow-400 font-semibold">⚠ Note:</span> Order History only
          works correctly if exported from your <span className="text-yellow-400">very first trade</span>.
          A partial export will produce wrong sides near the top of the file.{' '}
          <span className="text-yellow-400">Balance History is always accurate</span>.
        </div>
      )}

      {/* ── Unknown warning ── */}
      {file && activeType === 'unknown' && (
        <div className="border border-yellow-700/40 bg-yellow-950/20 p-3 mb-4 text-xs text-yellow-500">
          ⚠ Could not detect file type. Please select a parser mode above.
        </div>
      )}

      {/* ── Import button ── */}
      <button
        onClick={handleUpload}
        disabled={isDisabled}
        className={`w-full p-3 border text-base transition rounded ${
          isDisabled
            ? 'border-green-900/40 text-green-900 cursor-not-allowed'
            : 'border-green-600/60 text-green-600 bg-black hover:border-green-300 hover:text-green-400'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Icon icon="pixelarticons:refresh" className="animate-spin" width={16} height={16} />
            Importing…
          </span>
        ) : (
          `Import${
            activeType && activeType !== 'unknown'
              ? ` (${activeType === 'balance' ? 'Balance' : 'Order'} History)`
              : ''
          }`
        )}
      </button>

      {/* ── Result ── */}
      {result && (
        <div
          className={`mt-3 p-3 border text-sm ${
            result.success
              ? 'border-green-700/60 bg-green-950/30 text-green-dark'
              : 'border-red-800/60 bg-red-950/20 text-red-500'
          }`}
        >
          {result.success ? '✓ ' : '✗ '}
          {result.message}
          {result.success && (
            <button
              onClick={handleReset}
              className="ml-3 text-green-700 hover:text-green-500 underline text-xs transition"
            >
              Import another
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportCSV;