import { queryOptions } from "@tanstack/react-query";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "";

// Helper to ensure URL handles both relative and absolute paths correctly
const getFullUrl = (path: string) => {
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api") && BASE_URL) {
    return `${BASE_URL}${path}`;
  }
  return path;
};

export async function apiRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const fullUrl = getFullUrl(path);

  const res = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }

  // Handle empty responses (e.g. 204 No Content)
  if (res.status === 204) {
    return null as T;
  }

  return await res.json();
}

export const getQueryFn =
  <T>(url: string) =>
  async (): Promise<T> => {
    const fullUrl = getFullUrl(url);
    const res = await fetch(fullUrl);
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return await res.json();
  };

export const api = {
  get: <T = unknown>(path: string) => apiRequest<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>("POST", path, body),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>("PUT", path, body),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>("PATCH", path, body),
  delete: <T = unknown>(path: string) => apiRequest<T>("DELETE", path),
};
