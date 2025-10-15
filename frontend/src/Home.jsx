import React from "react";
import api from "./services/api";
import { useState, useEffect } from "react";
import TradeForm from "./components/TradeForm";
import TradeList from "./components/TradeList";
import { Link } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { auth } from "./services/firebase";
import { useNavigate } from "react-router-dom";
import LoginSignupButton from "./components/LoginSignupButton";
import LogoutButton from "./components/LogoutButton";


const Home = () => {
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [error, setError] = useState("");
    
    const handleLogout = () => {
        const auth = getAuth()
        signOut(auth).catch((err) => console.error("Firebase logout error:", err));
        localStorage.removeItem("token");
        window.location.href = "/auth";
    };

    const [trades, setTrades] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);

        if (!token) return;
    }, []);

    const addTrade = async (trade) => {
        try {
        const res = await api.post("/trades/", trade);
        setTrades([...trades, res.data]);
        } catch (err) {
            if (err.response && err.response.status === 401) {
            setError("❌ Unauthorized: Please log in to add trades.");
            } else {
            setError("❌ Failed to add trade.");
            }
        }
    };

    const navigate = useNavigate();

    return (
        <div>
            <h1 className="flex">Home Page</h1>
            <br />
            <ul>
                    <div className="mb-4 flex gap-2">
                        {!isLoggedIn && <LoginSignupButton />}
                        {isLoggedIn && <LogoutButton />}
                    </div>
                    {error && <p className="text-red-600 mb-4">{error}</p>}
            </ul>
        {isLoggedIn &&(
            <div className="p-4">
                <h1>📊 Trade Journal</h1>
                <TradeForm onAdd={addTrade} />
                <TradeList/>
            </div>
        )}
        </div>
    );
};


export default Home;