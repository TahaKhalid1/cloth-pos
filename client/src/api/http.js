import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiMessage = error.response?.data?.error;
    const message = apiMessage || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

export default http;
