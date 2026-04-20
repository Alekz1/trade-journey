import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import AuthPage from "./AuthPage";
import { useNavigate } from "react-router-dom";
import Home from "./Home.tsx";
import LandingPage from "./LandingPage";
import Trades from "./Trades.tsx";
import Risk from "./Risk.tsx";
import Analytics from "./Analytics.tsx";
import JournalInsights from "./JournalInsights.tsx";
import "./App.css";

function App() {
  return (
    <div className="app-root">
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/trades" element={<Trades/>}/>     
        <Route path="/risk" element={<Risk/>} /> 
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/journal" element={<JournalInsights />} />
        <Route path="*" element={<Home />} /> {/* fallback for unknown routes */}
      </Routes>
    </Router>
    </div>
  );
}

export default App;
