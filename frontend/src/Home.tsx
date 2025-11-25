import React, { useState, useEffect, use } from "react";
import { useNavigate, Link, redirect, To } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import api from "./services/api";
import { auth } from "./services/firebase";
import { Icon } from "@iconify/react"

import TradeForm from "./components/TradeForm";
import TradeList from "./components/TradeList";
import TradePnL from "./components/TradePnL";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";
import ImportCSV from "./components/ImportCSV";
import Winrate from "./components/Winrate";
import { DualProgressBar } from "./components/Dualprogressbar";
import { TradeLineChart } from "./components/TradePnlLineChart";
import { WinrateLineChart } from "./components/WinrateLineChart";
import { TimezoneSelector } from "./components/TimezoneSelect";
import { ClockWithTimezone } from "./components/ClockWithTimezone";
import { LanguageSelector } from "./components/LanguageSelector";
import { useTranslation } from "react-i18next";

// 🧠 Define types for trade and stats
type Trade = {
  id?: number;
  symbol: string;
  side: string;
  timestamp: string;
  pnl: number;
  entry_price: number;
  exit_price: number;
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
  sellpercent?: number;
};

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ total_pnl: 0, winrate: 0, sellpercent: 0 });
  const [selectedTz, setSelectedTz] = useState<string>("Local Timezone");
  const [filters, setFilters] = useState<Filters>({
    symbol: "",
    side: "",
    date_from: "",
    date_to: "",
    limit: 10,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const {t} = useTranslation();

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
  }

  const refreshTradeList = async () => {
    fetchTrades();
    refreshUserStats();
  };
  
  const handleTimezoneChange = (tz: string) => {
    setSelectedTz(tz);
    localStorage.setItem('preferredTimezone', tz);
    console.log(localStorage.getItem('preferredTimezone'));
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedTz = localStorage.getItem('preferredTimezone');
    console.log("Stored timezone:", storedTz);
    if(storedTz){
      setSelectedTz(storedTz);
    }else setSelectedTz('Local Timezone');
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
    if (trade.fees === "") {
      trade.fees = 0;
    }
    try {
      const res = await api.post<Trade>("/trades/", trade);
      setTrades([...trades, res.data]);
      handleTradeAdded();
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError(t("unauthorized"));
      } else {
        setError(t("addtradeerror"));
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

  const redirectToTrades = (rurl: To) => {
    navigate(rurl)
  }

  return (
    <div className="font-jersey15 text-green-600 mx-auto">
      <div className="flex justify-between border-b fixed w-full"/*Header*/>
        <h1 className="px-4 p-2 text-green-dark">TradeJourney</h1>
        <div className="m-4 flex gap-2">
          <ClockWithTimezone timezone={selectedTz} />
          <TimezoneSelector selectedTz={selectedTz} onChange={handleTimezoneChange} />
          <LanguageSelector /> 
          {!isLoggedIn && <LoginSignupButton />}
          {isLoggedIn && <LogoutButton />}
        </div>
        {error && <p className="text-red-600 mb-4">{error}</p>}
      </div>
      <div className="flex fixed top-18.5"/*Sidebar + Main content*/>
        <div className="w-1/20 h-screen border-r flex-col">
          <img src={user?.photoURL ?? undefined} className="p-2.5 mt-2.5 mb-7.5 border-b"></img>
          <div className="flex-col gap-5 text-center">
            <button className="" onClick={()=>redirectToTrades("/home")}>
              <Icon icon="pixelarticons:home" width={45} height={45}/>
            </button>
            <button className="my-5" onClick={()=>redirectToTrades("/trades")}>
              <Icon icon="pixelarticons:chart-add" width={45} height={45}/>
            </button>
          </div>
        </div>    
      {isLoggedIn && (
        <div className="p-8 overflow-y-auto h-screen w-screen pb-30" /*Main content area*/>
          <div className="flex justify-between">
            <h2 className="text-4xl px-5 text-green-dark">{t('welcome')}, {user?.displayName}!</h2>
            <h2 className="text-4xl px-5 text-green-dark">{t("yourtrades")}</h2>
          </div>
          <div className="flex w-full justify-between px-5 pt-5">
            <div className="flex flex-col w-full gap-2 pr-10">
              <div className="flex place-items-stretch gap-3 text-2xl h-full"/*PnL and Winrate display + Refresh button*/>
                <div className="border w-1/2">
                  <TradePnL userPnl={userStats.total_pnl}/>
                  <div className="w-full z-100 px-5 pl-7">
                    <TradeLineChart trades={allTrades} />
                  </div>
                </div>
                <div className="border w-1/2">
                  <Winrate winrate={userStats.winrate} />
                  <div className="w-full z-100 px-5 pl-7">
                    <WinrateLineChart trades={allTrades} />
                  </div>
                </div>
              </div>
              <div className="border w-full flex justify-start items-center text-2xl mt-3 h-32">
                <p className="text-green-dark px-5">{t('totaltrades')}: {trades.length}</p>
                <div className="w-full pt-2.5 px-5 flex flex-col">
                  <DualProgressBar rightPercent={userStats.sellpercent ?? 0} leftColor="bg-green-500" rightColor="bg-red-600" />
                  <div className="flex justify-between w-full">
                    <p className="text-green-dark px-2 pt-1">{t('buy')} %: {(100 - (userStats.sellpercent ?? 0)).toFixed(2)}%</p>
                    <p className="text-red-600 px-2 pt-1">{t('sell')} %: {userStats.sellpercent?.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
              <button className="flex border justify-center items-center text-3xl mt-3  text-green-600 bg-black/70 hover:border-green-300 transition rounded h-16" onClick={refreshUserStats}>
                  {t('refreshstats')}
              </button>
            </div>
            <div className="flex flex-col w-100 items-center mx-7"/*New Trade Form*/>
              <p className="text-green-dark text-4xl">{t('quickadd')}</p>
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

export default Home;