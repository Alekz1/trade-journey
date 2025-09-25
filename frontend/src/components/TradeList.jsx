export default function TradeList({ trades }) {
  return (
    <table border="1" cellPadding="5">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Side</th>
          <th>Entry</th>
          <th>Exit</th>
          <th>Qty</th>
          <th>PNL</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t) => (
          <tr key={t.id}>
            <td>{t.symbol}</td>
            <td>{t.side}</td>
            <td>{t.entry_price}</td>
            <td>{t.exit_price}</td>
            <td>{t.quantity}</td>
            <td>{t.pnl}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
