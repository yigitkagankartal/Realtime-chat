// src/api/client.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
});

// Request interceptor – JWT token ekleme
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }

    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

export default api;
