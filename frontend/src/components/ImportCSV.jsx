import React, { useState, useRef } from 'react';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// CSV type detection (mirrors server-side logic, runs client-side for instant UX)
// ─────────────────────────────────────────────────────────────────────────────
async function detectCsvType(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const header = e.target.result.split('\n')[0].toLowerCase();
      if (header.includes('order id') || header.includes('fill price')) {
        resolve('order');
      } else if (header.includes('balance before') || header.includes('realized p')) {
        resolve('balance');
      } else {
        resolve('unknown');
      }
    };
    reader.readAsText(file.slice(0, 512));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const ImportCSV = ({ refresh }) => {
  const [file, setFile]           = useState(null);
  const [detectedType, setDetectedType] = useState(null); // 'order' | 'balance' | 'unknown'
  const [manualOverride, setManualOverride] = useState(null); // null = use autodetect
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);  // { success, message }
  const fileInputRef              = useRef(null);

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

  const handleUpload = async () => {
    if (!file || !activeType || activeType === 'unknown') return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('csv_type', activeType);   // backend reads this to pick the right parser

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

  // ── styles ─────────────────────────────────────────────────────────────────
  const s = {
    wrap: {
      background: '#12141f',
      border: '1px solid #1e2235',
      borderRadius: 12,
      padding: '20px 24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#e2e8f0',
      maxWidth: 520,
    },
    label: {
      fontSize: 11,
      color: '#475569',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom: 6,
      display: 'block',
    },
    dropzone: (active) => ({
      border: `2px dashed ${active ? '#60a5fa' : '#1e2235'}`,
      borderRadius: 8,
      padding: '18px 16px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'border-color 0.15s',
      marginBottom: 16,
      background: active ? 'rgba(96,165,250,0.05)' : 'transparent',
    }),
    fileName: {
      fontSize: 13,
      color: '#94a3b8',
      marginTop: 4,
    },
    typeRow: {
      display: 'flex',
      gap: 8,
      marginBottom: 16,
      alignItems: 'center',
    },
    typeBtn: (active, color) => ({
      padding: '6px 14px',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      border: active ? `1px solid ${color}` : '1px solid #1e2235',
      background: active ? `${color}18` : '#0d0f1a',
      color: active ? color : '#475569',
      transition: 'all 0.15s',
    }),
    badge: (type) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600,
      background:
        type === 'balance' ? 'rgba(34,197,94,0.12)' :
        type === 'order'   ? 'rgba(96,165,250,0.12)' :
                             'rgba(239,68,68,0.12)',
      color:
        type === 'balance' ? '#22c55e' :
        type === 'order'   ? '#60a5fa' :
                             '#ef4444',
    }),
    warning: {
      background: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      color: '#fbbf24',
      marginBottom: 16,
      lineHeight: 1.5,
    },
    uploadBtn: (disabled) => ({
      width: '100%',
      padding: '10px',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: 'none',
      background: disabled ? '#1e2235' : '#3b82f6',
      color: disabled ? '#334155' : '#fff',
      transition: 'background 0.15s',
    }),
    resultBox: (success) => ({
      marginTop: 12,
      padding: '10px 14px',
      borderRadius: 8,
      fontSize: 12,
      background: success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
      color: success ? '#22c55e' : '#ef4444',
    }),
  };

  const isDisabled = loading || !file || !activeType || activeType === 'unknown';

  return (
    <div style={s.wrap}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Import Trades</span>
        <span style={{ fontSize: 12, color: '#334155', marginLeft: 8 }}>TradingView CSV</span>
      </div>

      {/* ── File picker ── */}
      <span style={s.label}>Select file</span>
      <div
        style={s.dropzone(!!file)}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {file ? (
          <>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{file.name}</div>
            <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>
              {(file.size / 1024).toFixed(1)} KB · click to change
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 22, marginBottom: 4 }}>⬆️</div>
            <div style={{ fontSize: 13, color: '#475569' }}>Click to select a TradingView CSV</div>
            <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>
              Order History or Balance History
            </div>
          </>
        )}
      </div>

      {/* ── Type selector ── */}
      {file && (
        <>
          <span style={s.label}>Parser mode</span>
          <div style={s.typeRow}>
            {/* Auto-detect */}
            <button
              onClick={() => setManualOverride(null)}
              style={s.typeBtn(!manualOverride, '#a78bfa')}
            >
              Auto-detect
            </button>

            {/* Balance History */}
            <button
              onClick={() => setManualOverride('balance')}
              style={s.typeBtn(manualOverride === 'balance', '#22c55e')}
            >
              Balance History
            </button>

            {/* Order History */}
            <button
              onClick={() => setManualOverride('order')}
              style={s.typeBtn(manualOverride === 'order', '#60a5fa')}
            >
              Order History
            </button>

            {/* Detection result badge */}
            {detectedType && !manualOverride && (
              <span style={s.badge(detectedType)}>
                {detectedType === 'balance' ? '✓ Balance' :
                 detectedType === 'order'   ? '✓ Order'   :
                                              '⚠ Unknown'}
              </span>
            )}
          </div>

          {/* ── Order History warning ── */}
          {activeType === 'order' && (
            <div style={s.warning}>
              <strong>⚠ Order History limitation:</strong> This parser works correctly only
              if the export covers the <em>full account history from the very first trade</em>.
              If the file starts mid-history, close orders near the top of the file may have
              no matching open order, causing wrong sides and P&amp;L.{' '}
              <strong>Balance History is always accurate</strong> — use it when possible.
            </div>
          )}

          {/* ── Unknown file warning ── */}
          {activeType === 'unknown' && (
            <div style={s.warning}>
              ⚠ Could not detect file type. Please select Balance History or Order History manually above.
            </div>
          )}
        </>
      )}

      {/* ── Upload button ── */}
      <button
        onClick={handleUpload}
        disabled={isDisabled}
        style={s.uploadBtn(isDisabled)}
      >
        {loading ? 'Importing…' : `Import${activeType && activeType !== 'unknown' ? ` (${activeType === 'balance' ? 'Balance' : 'Order'} History)` : ''}`}
      </button>

      {/* ── Result message ── */}
      {result && (
        <div style={s.resultBox(result.success)}>
          {result.success ? '✓ ' : '✗ '}
          {result.message}
          {result.success && (
            <button
              onClick={handleReset}
              style={{ marginLeft: 10, background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
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