import axios from "axios";

let accessToken = "";

export function setAuthToken(token) {
  accessToken = token || "";
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000
});

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiMessage = error.response?.data?.error;
    const message = apiMessage || error.message || "Request failed";
    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    return Promise.reject(normalizedError);
  }
);

export default http;
