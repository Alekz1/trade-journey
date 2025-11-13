import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import api from "./services/api";
import { auth } from "./services/firebase";

import TradeForm from "./components/TradeForm";
import TradeList from "./components/TradeList";
import TradePnL from "./components/TradePnL";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import ImportCSV from "./components/ImportCSV";
import Winrate from "./components/Winrate";

// 🧠 Define types for trade and stats
type Trade = {
  id?: number;
  symbol: string;
  side: string;
  date: string;
  price: number;
  quantity: number;
  fees: number | string;
};

type Filters = {
  symbol: string;
  side: string;
  date_from: string;
  date_to: string;
  limit: number;
};

type UserStats = {
  total_pnl: number;
  winrate: number;
};

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ total_pnl: 0, winrate: 0 });
  const [filters, setFilters] = useState<Filters>({
    symbol: "",
    side: "",
    date_from: "",
    date_to: "",
    limit: 10,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth).catch((err) => console.error("Firebase logout error:", err));
    localStorage.removeItem("token");
  };

  const fetchTrades = async (activeFilters: Filters = filters) => {
    try {
      setLoading(true);
      setError("");
      const cleanedFilters = Object.fromEntries(
        Object.entries(activeFilters).filter(
          ([_, value]) => value !== "" && value !== null && value !== undefined
        )
      );
      const res = await api.get<Trade[]>("/trades/", { params: cleanedFilters });
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
      const res = await api.get<UserStats>("/users/me/stats/");
      setUserStats(res.data);
    } catch (error) {
      console.error("Error fetching user PnL:", error);
    }
  };

  const refreshUserStats = async () => {
    try {
      const res = await api.get<UserStats>("/users/me/stats/refresh/");
      setUserStats(res.data);
    } catch (error) {
      console.error("Error refreshing user PnL:", error);
    }
  };

  const refreshTradeList = async () => {
    fetchTrades();
    refreshUserStats();
  };

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
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    
  };

  const addTrade = async (trade: Trade) => {
    if (trade.fees === "") {
      trade.fees = 0;
    }
    try {
      const res = await api.post<Trade>("/trades/", trade);
      setTrades([...trades, res.data]);
      handleTradeAdded();
    } catch (err: any) {
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

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleApplyFilters = () => {
    fetchTrades(filters);
  };

  return (
    <div className="font-jersey15 text-green-600 mx-auto">
      <div className="flex justify-between border-b fixed w-full"/*Header*/>
        <h1 className="px-4 p-2 text-green-dark">TradeJourney</h1>
        <div className="m-4 flex gap-2">
          {!isLoggedIn && <LoginSignupButton />}
          {isLoggedIn && <LogoutButton />}
        </div>
        {error && <p className="text-red-600 mb-4">{error}</p>}
      </div>
      <div className="flex fixed top-18.5"/*Sidebar + Main content*/>
        <div className="w-1/20 h-screen border-r">
          <img src={user?.photoURL ?? ""} className="p-2 pt-5"></img>
        </div>    
      {isLoggedIn && (
        <div className="p-8 overflow-y-auto h-screen w-screen pb-30" /*Main content area*/>
          <div>
            <h2 className="text-4xl px-5 text-green-dark">Welcome, {user?.displayName}!</h2>
          </div>
          <div className="flex w-full justify-between px-5 pt-5">
            <div className="flex flex-col w-full gap-2 pr-10">
              <div className="flex place-items-stretch gap-3 text-2xl h-full"/*PnL and Winrate display + Refresh button*/>
                <div className="border w-1/2">
                  <TradePnL userPnl={userStats.total_pnl}/>
                </div>
                <div className="border w-1/2">
                  <Winrate winrate={userStats.winrate} />
                </div>
              </div>
              <button className="flex border justify-center items-center text-3xl mt-3  text-green-600 bg-black/70 hover:border-green-300 transition rounded h-16" onClick={refreshUserStats}>
                  Refresh PNL
              </button>
            </div>
            <div className="flex flex-col w-100 items-center mx-7"/*New Trade Form*/>
              <p className="text-green-dark text-4xl">Quick Add</p>
              <TradeForm onAdd={addTrade} />
            </div>
          </div> 
          
          <div className="flex flex-col gap-5">
            <TradeList
              trades={trades}
              filters={filters}
              onFilterChange={handleFilterChange}
              onApplyFilters={handleApplyFilters}
              loading={loading}
              error={error}
              refresh={refreshTradeList}
            />
            <div className="pt-5">
              <ImportCSV refresh={refreshTradeList} />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Home;