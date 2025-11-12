const Winrate = ({ winrate }) => {
    winrate = parseFloat(winrate).toFixed(2);
    return (
        <div className="p-4 left-7">
            <h2>📊 Winrate </h2>

            {winrate !== null && winrate !== undefined ? (
                <p className={`text-2xl ${winrate === 0 ? "text-gray-600 font-bold" : winrate > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}`}>
                    {winrate}%
                </p>
            ) : (
                "Loading..."
            )}
        </div>
    );
};

export default Winrate;