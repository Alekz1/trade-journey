import React, { use } from "react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../services/api";

const TradePnL = () => {
    const navigate = useNavigate();
    const [userPnl, setUserPnl] = useState("");
    
    useEffect(() => {
        fetchUserPnL();
    }, []);
    
    const fetchUserPnL = async () => {
        try {
            const res = await api.get("/users/me/pnl/");
            setUserPnl(res.data.total_pnl);
        } catch (error) {
            console.error("Error fetching user PnL:", error);
            //navigate("/auth");
        }
    };
    
    return (
        <div className="p-4 left-7">
            <h2>📊 PnL Summary</h2>
            {userPnl ? <p className="text-2xl text-green-600 font-bold">{userPnl}$</p> : "Loading..."}
        </div>
    );
};

export default TradePnL;