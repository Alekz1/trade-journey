import React, { useState, useEffect } from "react";
import { To, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import api from "./services/api";
import {Icon} from "@iconify/react"

import TradeList from "./components/TradeList";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import ImportCSV from "./components/ImportCSV";
import { TimezoneSelector } from "./components/TimezoneSelect";
import { ClockWithTimezone } from "./components/ClockWithTimezone";
import { LanguageSelector } from "./components/LanguageSelector";
import { useTranslation } from "react-i18next";
import TradeForm2 from "./components/TradeForm2";

type Trade = {
  id?: number;
  symbol: string;
  side: string;
  pnl: number | null;
  entry_price: number;
  quantity: number;
  partial_closes: {
    exit_price: number;
    closed_quantity: number;
    fees: number | null;
    timestamp: string | null;
  }[];
  file: File | null
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
  sellpercent?: number;
};

const Trades: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    total_pnl: 0,
    winrate: 0,
    sellpercent: 0,
  });
  const [selectedTz, setSelectedTz] = useState<string>("Local Timezone");
  const [filters, setFilters] = useState<Filters>({
    symbol: "",
    side: "",
    date_from: "",
    date_to: "",
    limit: 10,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth).catch((err) => console.error("Firebase logout error:", err));
    localStorage.removeItem("token");
  };

  const handleRedirect = (rurl: To) => {
    navigate(rurl)
  }


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

  const fetchTradesUnfiltered = async () => {
    try {
      const res = await api.get<Trade[]>("/trades/");
      setAllTrades(res.data);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
      setError("Failed to fetch trades");
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

  const fullrefresh = async () => {
    await fetchTrades();
    await fetchTradesUnfiltered();
    await refreshUserStats();
  };

  const refreshTradeList = async () => {
    fetchTrades();
    refreshUserStats();
  };

  const handleTimezoneChange = (tz: string) => {
    setSelectedTz(tz);
    localStorage.setItem("preferredTimezone", tz);
    console.log(localStorage.getItem("preferredTimezone"));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedTz = localStorage.getItem("preferredTimezone");
    console.log("Stored timezone:", storedTz);
    if (storedTz) {
      setSelectedTz(storedTz);
    } else setSelectedTz("Local Timezone");
    setIsLoggedIn(!!token);
    if (!token) return;
    fetchTrades();
    fetchUserStats();
    fetchTradesUnfiltered();
    getUserData();
  }, []);

  const getUserData = async () => {
    const auth = getAuth();
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
  };

  const addTrade = async (trade: Trade) => {
  try {
    const fd = new FormData();
    fd.append("symbol", trade.symbol);
    fd.append("side", trade.side);
    fd.append("entry_price", String(trade.entry_price));
    fd.append("quantity", String(trade.quantity));
    fd.append("partial_closes", JSON.stringify(trade.partial_closes));

    if (trade.file) {
      fd.append("file", trade.file);
    }

    const res = await api.post<Trade>("/trades/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setTrades((prev) => [...prev, res.data]);
    handleTradeAdded();
  } catch (err: any) {
    if (err.response && err.response.status === 401) {
      setError(t("unauthorized"));
    } else {
      setError(t("addtradeerror"));
      console.error("Error:", err.response?.data || err);
    }
  }
};

  const handleTradeAdded = () => {
    fetchTrades();
    fetchTradesUnfiltered();
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
      <div className="flex justify-between border-b fixed w-full">
        <h1 className="px-4 p-2 text-green-dark">TradeJourney</h1>
        <div className="m-4 flex gap-2">
          <ClockWithTimezone timezone={selectedTz} />
          <TimezoneSelector selectedTz={selectedTz} onChange={handleTimezoneChange} />
          <LanguageSelector />
          {!isLoggedIn && <LoginSignupButton />}
          {isLoggedIn && <LogoutButton />}
        </div>
      </div>
      <div className="flex fixed top-18.5">
        <div className="w-1/20 h-screen border-r flex-col">
          <img src={user?.photoURL ?? undefined} className="p-2.5 mt-2.5 mb-7.5 border-b"></img>
          <div className="flex-col gap-5 text-center">
            <button className="" onClick={()=>handleRedirect("/home")}>
              <Icon icon="pixelarticons:home" width={45} height={45}/>
            </button>
            <button className="my-5" onClick={()=>handleRedirect("/trades")}>
              <Icon icon="pixelarticons:chart-add" width={45} height={45}/>
            </button>
          </div>
        </div>  
        {isLoggedIn && (
          <div className="p-8 overflow-y-auto h-screen w-screen pb-30">
            <div className="flex justify-between">
              <h2 className="text-4xl px-1 mb-2.5 text-green-dark">
                {t("addtrade")}
              </h2>
            </div>
            <TradeForm2 onAdd={addTrade} />
            {error && <p className="text-red-600 my-4">{error}</p>}
            <div className="flex flex-col gap-5">
              <TradeList
                trades={trades}
                filters={filters}
                onFilterChange={handleFilterChange}
                onApplyFilters={handleApplyFilters}
                loading={loading}
                error={error}
                refresh={fullrefresh}
                selectedTz={selectedTz}
              />
              <div className="pt-5">
                <ImportCSV refresh={fullrefresh} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trades;