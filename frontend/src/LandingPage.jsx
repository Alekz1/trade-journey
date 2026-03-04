import { useEffect } from "react";
import { useState } from "react";
import LoginSignupButton from "./components/LoginSignupButton";
import { LanguageSelector } from "./components/LanguageSelector";
import { useTranslation } from "react-i18next";


const LandingPage = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
        import("./services/home3d")
    }, []);

    const { t } = useTranslation()

    return (
        
        <div className=" flex flex-col mx-auto text-green-400 font-jersey15">
            <canvas id="bg"></canvas>   

            {/* NAV */}
            <nav className="mx-6 mt-4 rounded-lg border border-green-700/40 relative px-6 py-3 flex items-center justify-between">
                {/* left block: logo + links */}
                
                    <span className="text-4xl font-bold text-green-dark">TradeJourney</span>

                    {/* links: centered vertically with the logo because of items-center above */}
                    <div className="flex gap-8 text-green-300 text-2xl justify-self-center absolute left-1/2 transform -translate-x-1/2">
                        <a href="#" className="nav-link">{t('features')}</a>
                        <a href="#" className="nav-link">{t('contacts')}</a>
                        <a href="#" className="nav-link">{t('contribute')}</a>
                    </div>
                

                {/* right: login */}
                <div className="flex justify-between items-center">
                    <div className="p-2  rounded-mdtext-green-600 bg-black/70 transition"><LanguageSelector></LanguageSelector></div>
                    <LoginSignupButton></LoginSignupButton>
                </div>
            </nav>
            
            {/* HERO */}
            <div className="text-center mt-32">
                <h1 className="text-8xl md:text-8xl font-extrabold leading-tight neon-title">
                <span className="inline-block typing font-workbech text-green-dark">TradeJourney</span>
                </h1>

                <p className="mt-6 text-gray-400 text-lg tracking-wider">
                {t('moto')}
                </p>
            </div>
        </div>
    );
}
export default LandingPage;