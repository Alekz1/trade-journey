import React, { useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "react-i18next";

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const {t} = useTranslation();

  // Google login
  const handleGoogleLogin = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    await sendTokenToBackend(token);
  };

  // Email signup
  const handleSignup = async () => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    await sendTokenToBackend(token);
  };

  // Email login
  const handleLogin = async () => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    await sendTokenToBackend(token);
  };

  // Send token to backend
  const sendTokenToBackend = async (token) => {
    const response = await fetch("http://localhost:8000/auth/firebase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    console.log("Backend verified:", data);
     // Save the backend JWT in localStorage
    localStorage.setItem("token", data.access_token);

    // Redirect to home
    window.location.href = "/home";
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        await sendTokenToBackend(token);
      }
    });

    return () => unsubscribe();
  }, []);


  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 font-jersey15 text-green-dark mx-auto">
      <h1 className="text-2xl font-workbech">TradeJourney</h1>
      <input
        type="email"
        placeholder={t('email')}
        className="border p-2 rounded "
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder={t('password')}
        className="border p-2 rounded"
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex-col">
      <div className="flex gap-2">
        <button onClick={handleLogin} className="p-2 px-6 rounded-md border right-6 border-green-600/60 text-green-600 bg-black/70 hover:border-green-300 transition">
          {t('login')}
        </button>
        <button onClick={handleSignup} className="p-2 px-6 rounded-md border right-6 border-green-600/60 text-green-600 bg-black/70 hover:border-green-300 transition">
          {t('signup')}
        </button>
      </div>
      <div className="flex justify-center mt-2">
      <button
        onClick={handleGoogleLogin}
        className="p-2 px-6 rounded-md border right-6 border-green-600/60 text-green-600 bg-black/70 hover:border-green-300 transition justify-self-center w-full"
      >
        {t('google_login')}
      </button>
      </div>
      </div>
    </div>
  );
}

export default AuthPage;
