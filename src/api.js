const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://cloudnew-upadted-7.onrender.com/api/v1" : "")
).replace(/\/$/, "");
export const API_SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? "https://cloudnew-upadted-7.onrender.com" : "");
const API_TOKEN_KEY = "connectify_api_token";

export const apiEnabled = Boolean(API_URL);
export function setApiToken(token) {
  if (token) localStorage.setItem(API_TOKEN_KEY, token);
  else localStorage.removeItem(API_TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(API_TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Request failed");
  return payload.data;
}
