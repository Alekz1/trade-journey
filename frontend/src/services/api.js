import axios from "axios";
import { auth } from "./firebase";
import * as jwtDecode from "jwt-decode";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

const authApi = axios.create({
  baseURL: "http://localhost:8000",
}); // used only for refresh, no interceptors

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
};

// Attach JWT to normal requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token && !config.url.includes("/auth/refresh")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor handles 401
api.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest._retry = true;
        originalRequest.headers.Authorization = "Bearer " + token;
        return api(originalRequest);
      }).catch(err => Promise.reject(err));
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No Firebase user");

      const freshFirebaseToken = await user.getIdToken(true);
      const res = await authApi.post("/auth/refresh", { token: freshFirebaseToken });
      const newToken = res.data.access_token;

      if (!newToken) throw new Error("No backend access_token returned");

      localStorage.setItem("token", newToken);
      processQueue(null, newToken);

      originalRequest.headers.Authorization = "Bearer " + newToken;
      isRefreshing = false;

      return api(originalRequest);
    } catch (err) {
      processQueue(err, null);
      isRefreshing = false;
      localStorage.removeItem("token");
      try { auth.signOut(); } catch (e) {}
      window.location.href = "/";
      return Promise.reject(err);
    }
  }
);

export default api;
