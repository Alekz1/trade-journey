import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import AuthPage from "./AuthPage";
import { useNavigate } from "react-router-dom";
import Home from "./Home.tsx";
import Home_old from "./Home_old";
import LandingPage from "./LandingPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/old" element={<Home_old />} />
        {/* fallback for unknown routes */}
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
