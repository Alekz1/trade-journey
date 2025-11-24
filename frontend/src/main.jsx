import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./services/i18n"; // import i18n configuration
import "./index.css"; // only if you use Tailwind/global CSS

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);