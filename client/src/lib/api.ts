import { queryOptions } from "@tanstack/react-query";

export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<any> {
  const res = await fetch(path, {
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
    return null;
  }

  return await res.json();
}

export const getQueryFn =
  <T>(url: string) =>
  async (): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return await res.json();
  };

export const api = {
  get: (path: string) => apiRequest("GET", path),
  post: (path: string, body?: unknown) => apiRequest("POST", path, body),
  put: (path: string, body?: unknown) => apiRequest("PUT", path, body),
  patch: (path: string, body?: unknown) => apiRequest("PATCH", path, body),
  delete: (path: string) => apiRequest("DELETE", path),
};
