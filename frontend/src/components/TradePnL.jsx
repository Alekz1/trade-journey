const TradePnL = ({ userPnl }) => {
    userPnl = parseFloat(userPnl).toFixed(2);
    return (
        <div className="p-4 left-7">
            <h2>📊 PnL Summary</h2>

            {userPnl !== null && userPnl !== undefined ? (
                <p className={`${userPnl === 0 ? "text-gray-600 font-bold" : userPnl > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}`}>
                    {userPnl}$
                </p>
            ) : (
                "Loading..."
            )}
        </div>
    );
};

export default TradePnL;