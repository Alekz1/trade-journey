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
    navigate("/auth");
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-500 text-white rounded"
    >
      Logout
    </button>
  );
}
