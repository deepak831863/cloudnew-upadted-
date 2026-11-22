const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api/v1" : "")).replace(/\/$/, "");

export const apiEnabled = Boolean(API_URL);

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Request failed");
  return payload.data;
}
