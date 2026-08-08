import axios from "axios";

const dealerApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/dealer`,
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
