import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function LoginSignupButton() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/auth"); // redirect to AuthPage
  };

  const {t} = useTranslation();

  return (
    <button
      onClick={handleClick}
      className="p-2 px-6 rounded-md border right-6 border-green-600/60 text-green-600 bg-black/70 hover:border-green-300 transition"
    >
      {t('login_signup')}
    </button>
  );
}
