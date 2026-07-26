import axios from "axios";

// Setup API client targeting FastAPI backend with cookie credentials enabled.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,  // Send shield_token cookies in requests
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith("/api/cmp/")) {
    config.url = config.url.replace("/api/cmp/", "/api/");
  }
  return config;
});

// Response interceptor to easily extract data and handle global 401 redirects
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear cookies and redirect to login
      // but only if we aren't already on public routes
      const path = window.location.pathname;
      if (
        path !== "/" &&
        path !== "/login" &&
        path !== "/signup" &&
        !path.startsWith("/marketplace") &&
        !path.startsWith("/vendor/")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(
      error.response?.data?.detail || error.response?.data?.error || error.message
    );
  }
);
