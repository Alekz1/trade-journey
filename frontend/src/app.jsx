import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import AuthPage from "./AuthPage";
import { useNavigate } from "react-router-dom";
import Home from "./Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        {/* fallback for unknown routes */}
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
