import { useEffect } from "react";
import { useState } from "react";
import LoginSignupButton from "./components/LoginSignupButton";


const LandingPage = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
        const script = document.createElement("script");
        script.type = "module";
        script.src = "/src/services/home3d.js";
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        
        <div className=" flex flex-col mx-auto text-green-400 font-jersey15">
            <canvas id="bg"></canvas>   

            {/* NAV */}
            <nav className="mx-6 mt-4 rounded-lg border border-green-700/40 relative px-6 py-3 flex items-center justify-center">
                {/* left block: logo + links */}
                
                    <span className="text-4xl font-bold text-green-dark absolute  left-6">TradeJourney</span>

                    {/* links: centered vertically with the logo because of items-center above */}
                    <div className="flex gap-8 text-green-300 text-2xl justify-self-center">
                        <a href="#" className="nav-link">Features</a>
                        <a href="#" className="nav-link">Contacts</a>
                        <a href="#" className="nav-link">Contribute</a>
                    </div>
                

                {/* right: login */}
                <LoginSignupButton></LoginSignupButton>
            </nav>
            
            {/* HERO */}
            <div className="text-center mt-32">
                <h1 className="text-8xl md:text-8xl font-extrabold leading-tight neon-title">
                {/* Use the typing span for the animation */}
                <span className="inline-block typing font-workbech text-green-dark">TradeJourney</span>
                </h1>

                <p className="mt-6 text-gray-400 text-lg tracking-wider">
                Analyze your way to success
                </p>
            </div>
        </div>
    );
}
export default LandingPage;