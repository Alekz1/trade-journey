import React from "react";
import api from "./services/api";
import { useState, useEffect } from "react";
import TradeForm from "./components/TradeForm";
import TradeList from "./components/TradeList";
import TradePnL from "./components/TradePnL";
import { Link } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { auth } from "./services/firebase";
import { useNavigate } from "react-router-dom";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import ImportCSV from "./components/ImportCSV";
import Winrate from "./components/Winrate";


const Home = () => {
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [error, setError] = useState("");
    
    let user;
    
    const handleLogout = () => {
        const auth = getAuth()
        signOut(auth).catch((err) => console.error("Firebase logout error:", err));
        localStorage.removeItem("token");
        //window.location.href = "/auth";
    };

    const [trades, setTrades] = useState([]);
    const [ userStats, setuserStats] = useState("");
    const [filters, setFilters] = useState({
        symbol: "",
        side: "",
        date_from: "",
        date_to: "",
        limit: 10,
    });
    const [loading, setLoading] = useState(false);

    const fetchTrades = async (activeFilters = filters) => {
        try {
        setLoading(true);
        setError("");
        const cleanedFilters = Object.fromEntries(
            Object.entries(activeFilters).filter(([key, value]) => value !== "" && value !== null && value !== undefined)
        );
        const res = await api.get("/trades/", { params: cleanedFilters });
        setTrades(res.data);
        } catch (err) {
        console.error("Failed to fetch trades:", err);
        setError("Failed to fetch trades");
        } finally {
        setLoading(false);
        }
    };

    const fetchUserStats = async () => {
        try {
            const res = await api.get("/users/me/stats/");
            setuserStats(res.data);
        } catch (error) {
            console.error("Error fetching user PnL:", error);
            //navigate("/auth");
        }
    };

    const refreshUserStats = async () => {
        try {
            const res = await api.get("/users/me/stats/refresh/");
            setuserStats(res.data);
        } catch (error) {
            console.error("Error fetching user PnL:", error);
            //navigate("/auth");
        }
    }
    
    const refreshTradeList = async () => {
        fetchTrades();
        refreshUserStats();
    }

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
        if (!token) return;
        fetchTrades();
        fetchUserStats();
        getUserData();
    }, []);

    const getUserData = async () => {
        const auth = getAuth();
        user = auth.currentUser;
    };

    const addTrade = async (trade) => {
        if (trade.fees === ""){
            trade.fees = 0;
        }
        try {
            const res = await api.post("/trades/", trade);
            setTrades([...trades, res.data]);
            handleTradeAdded();
        } catch (err) {
            if (err.response && err.response.status === 401) {
            setError("❌ Unauthorized: Please log in to add trades.");
            } else {
            setError("❌ Failed to add trade.");
            }
        }
    };
     const handleTradeAdded = () => {
        fetchTrades();
        refreshUserStats();
    };

    const handleFilterChange = (newFilters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    };

    const handleApplyFilters = () => {
        fetchTrades(filters);
    }

    const navigate = useNavigate();

    return (
        <div className="font-jersey15 text-green-400 mx-auto">
            <div className="flex justify-between border-b">
            <h1 className="px-4 p-2">TradeJourney</h1>
            
                 <div className="m-4 flex gap-2">
                        {!isLoggedIn && <LoginSignupButton />}
                        {isLoggedIn && <LogoutButton />}
                </div>
                {error && <p className="text-red-600 mb-4">{error}</p>}
        
            </div>
        {isLoggedIn &&(
            <div className="p-4">
                <div className="flex justify-left items-center gap-4 mb-4">
                    <TradePnL userPnl={userStats.total_pnl}/>
                    <Winrate winrate={userStats.winrate}/>
                    <button className="max-h-10" onClick={refreshUserStats}>Refresh PNL</button>
                </div>
                <TradeForm onAdd={addTrade} />
                <TradeList
                    trades={trades}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onApplyFilters={handleApplyFilters}
                    loading={loading}
                    error={error}
                    refresh={refreshTradeList}
                />
                <ImportCSV
                    refresh={refreshTradeList}
                />
            </div>
        )}
        </div>
    );
};


export default Home;