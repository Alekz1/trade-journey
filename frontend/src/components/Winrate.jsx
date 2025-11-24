import { useTranslation } from "react-i18next";


const Winrate = ({ winrate }) => {
    const {t} = useTranslation();
    winrate = parseFloat(winrate).toFixed(2);
    return (
        <div className="p-4 left-7">
            <h2>📊{t("winrate")}</h2>

            {winrate !== null && winrate !== undefined ? (
                <p className={`${winrate === 0 ? "text-gray-600 font-bold" : winrate > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}`}>
                    {winrate}%
                </p>
            ) : (
                "Loading..."
            )}
        </div>
    );
};

export default Winrate;