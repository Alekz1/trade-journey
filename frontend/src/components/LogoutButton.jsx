import React from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

export default function LogoutButton() {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = () => {
    // Sign out from Firebase
    signOut(auth).catch((err) => console.error("Firebase logout error:", err));

    // Remove backend JWT
    localStorage.removeItem("token");

    // Redirect to login page
    navigate("/");
  };

  return (
    <button
      onClick={handleLogout}
      className="p-2 px-6 rounded-md border right-6 border-green-600/60 text-green-600 bg-black/70 hover:border-green-300 transition"
    >
      Logout
    </button>
  );
}
