import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

const dealerApi = axios.create({
  baseURL: `${apiBaseUrl}/dealer`,
  headers: {
    "Content-Type": "application/json",
  },
});

dealerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("dealerToken") || sessionStorage.getItem("dealerToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default dealerApi;
