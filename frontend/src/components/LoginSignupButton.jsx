import React from "react";
import { useNavigate } from "react-router-dom";

export default function LoginSignupButton() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/auth"); // redirect to AuthPage
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      Login / Sign Up
    </button>
  );
}
