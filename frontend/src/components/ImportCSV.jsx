// frontend/src/components/ImportCSV.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import axios from 'axios';
import api from '../services/api';

const ImportCSV = ({refresh}) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus('');
  };

  const makeTradeFromRows = (entry, exit) => {
    const entryPrice = parseFloat(entry['Fill Price']);
    const exitPrice  = parseFloat(exit['Fill Price']);
    const quantity   = parseFloat(entry.Qty);
    const entryFees  = parseFloat(entry.Commission || 0);
    const exitFees   = parseFloat(exit.Commission || 0);
    const timestamp = new Date(entry['Placing Time']);

    return {
      symbol: entry.Symbol.trim(),
      side: entry.Side.trim(),           // entry side
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      fees: entryFees + exitFees,
      timestamp: timestamp
    };
  };

  const handleUpload = () => {
    if (!file) return;

    setStatus('Parsing CSV…');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // --- callback form ----------------------------------------------------
      complete: async (results) => {
        if (!results || !results.data) {
          setStatus('Could not parse CSV – no data returned.');
          return;
        }

        const rows = results.data;

        // Ensure chronological order
        rows.sort((a, b) =>
          new Date(a['Placing Time']) - new Date(b['Placing Time'])
        );

        // Build trade pairs
        const trades = [];
        for (let i = 0; i < rows.length; i += 2) {
            if (i + 1 >= rows.length) {
                setStatus('Odd number of rows – the last one was skipped');
                console.warn(status)
                break;
            }

            let entry = rows[i+1];
            let exit  = rows[i];

            if (new Date(entry['Placing Time']) > new Date(exit['Placing Time'])) {
                entry=rows[i];
                exit=rows[i+1];
            }

            if (
                entry.Symbol.trim() === exit.Symbol.trim() &&
                entry.Side.trim() !== exit.Side.trim()
            ) {
                trades.push(makeTradeFromRows(entry, exit));
            } else {
                setStatus(
                `Row ${i + 1} and ${i + 2} don’t look like a proper pair.`
                );
                console.warn(status)
                return;
            }
        }

        // Upload trades
        setStatus(`Uploading ${trades.length} trades…`);
        try {
          for (const trade of trades) {
            console.log(trade);
            await api.post('/trades/', trade)
          }
          setStatus('All trades uploaded successfully!');
          refresh();
          console.log('status')
        } catch (err) {
          console.error(err);
          setStatus(`Upload error: ${err.message}`);
        }
      },
      // -----------------------------------------------------------------------
    });
  };

        
  return (
    <div className="p-2 border border-gray-300 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Import Trades from CSV</h3>
      <div className="text-sm text-gray-600 flex gap-2">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="w-full align-text-bottom text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
      ></input>
      <button
        onClick={handleUpload}
        disabled={!file}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        Upload
      </button>
      {status && <p className="text-red-500 mt-4">{status}</p>}
    </div>
    </div>
  );
};

export default ImportCSV;