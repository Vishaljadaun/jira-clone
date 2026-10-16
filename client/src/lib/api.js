import axios from "axios";
export const serverUrl = (import.meta.env.VITE_SERVER_URL || "").replace(
  /\/$/,
  "",
);
export const api = axios.create({ baseURL: serverUrl, timeout: 30000 });
export const auth = (user) => ({
  headers: { Authorization: `Bearer ${user.token}` },
});
export const message = (error) =>
  error.response?.data?.message || "Unable to connect. Please try again.";
export const avatar = (value) =>
  value?.startsWith("/") ? `${serverUrl}${value}` : value;
