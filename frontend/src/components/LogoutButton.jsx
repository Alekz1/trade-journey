import React from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

export default function LogoutButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = () => {
    signOut(auth).catch((err) => console.error("Firebase logout error:", err));
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 px-3 sm:px-5 py-1.5 border border-green-600/60 text-green-600 bg-black hover:border-green-300 hover:text-green-400 transition text-sm rounded"
    >
      <Icon icon="pixelarticons:log-out" width={16} height={16} className="shrink-0" />
      <span className="hidden sm:inline">{t("logout")}</span>
    </button>
  );
}