import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { auth } from "./firebase";

const API_URL = import.meta.env.VITE_API_URL as string;

interface FailedRequest {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
});

const authApi: AxiosInstance = axios.create({
  baseURL: API_URL,
});

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: any, token: string | null = null): void => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  failedQueue = [];
};

// Request Interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token && !config.url?.includes("/auth/refresh")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No Firebase user");

      const freshFirebaseToken = await user.getIdToken(true);
      const res = await authApi.post<{ access_token: string }>("/auth/refresh", { 
        token: freshFirebaseToken 
      });
      
      const newToken = res.data.access_token;
      if (!newToken) throw new Error("No backend access_token returned");

      localStorage.setItem("token", newToken);
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      isRefreshing = false;

      return api(originalRequest);
    } catch (err) {
      processQueue(err, null);
      isRefreshing = false;
      localStorage.removeItem("token");
      try {
        await auth.signOut();
      } catch (e) {
        // Sign out error ignored
      }
      window.location.href = "/";
      return Promise.reject(err);
    }
  }
);

export default api;