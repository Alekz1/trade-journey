import pandas as pd
from decimal import Decimal
import io

def parse_tradingview_csv(csv_content: str):
    # Използваме utf-8-sig за избягване на проблеми с BOM символи
    df = pd.read_csv(io.StringIO(csv_content))
    
    # Филтрираме само изпълнените ордери
    if 'Status' in df.columns:
        df = df[df['Status'].str.strip() == 'Filled']
    
    # Премахваме редове без цена (NaN)
    df = df.dropna(subset=['Fill Price'])
    
    # Сортиране хронологично по време на изпълнение
    df['Closing Time'] = pd.to_datetime(df['Closing Time'])
    df = df.sort_values('Closing Time', ascending=True).reset_index(drop=True)
    
    open_trades_queues = {} 
    finalized_trades = []

    for _, row in df.iterrows():
        symbol = str(row['Symbol']).strip()
        # ВЗИМАМЕ СТРАНАТА ТОЧНО КАКТО Е (Buy или Sell)
        side = str(row['Side']).strip() # "Buy" или "Sell"
        qty = Decimal(str(row['Qty']))
        price = Decimal(str(row['Fill Price']))
        
        raw_comm = row.get('Commission', 0)
        comm = Decimal(str(raw_comm)) if pd.notna(raw_comm) else Decimal("0")
        ts = row['Closing Time']
        
        if symbol not in open_trades_queues:
            open_trades_queues[symbol] = []
            
        queue = open_trades_queues[symbol]
        
        # Определяме коя е срещуположната страна за затваряне
        # Важно: TradingView използва главни букви "Buy" и "Sell"
        opposite_side = "Sell" if side == "Buy" else "Buy"
        
        # FIFO Логика
        while qty > 0 and queue and queue[0]['side'] == opposite_side:
            active_trade = queue[0]
            already_closed = sum(p['closed_quantity'] for p in active_trade['partial_closes'])
            remaining_in_active = active_trade['quantity'] - already_closed
            
            close_qty = min(qty, remaining_in_active)
            fee_share = (comm * (close_qty / qty)) if qty > 0 else Decimal("0")
            
            active_trade['partial_closes'].append({
                "exit_price": price,
                "closed_quantity": close_qty,
                "fees": fee_share,
                "timestamp": ts
            })
            
            qty -= close_qty
            comm -= fee_share
            
            if sum(p['closed_quantity'] for p in active_trade['partial_closes']) >= active_trade['quantity']:
                finalized_trades.append(queue.pop(0))

        # Ако остане количество след затварянето на срещуположните позиции,
        # отваряме НОВ ТРЕЙД със страната на текущия ордер
        if qty > 0:
            queue.append({
                "symbol": symbol,
                "side": side, # Тук се записва "Buy" или "Sell"
                "entry_price": price,
                "quantity": qty,
                "timestamp": ts,
                "partial_closes": []
            })
            
    for q in open_trades_queues.values():
        finalized_trades.extend(q)
        
    return finalized_trades