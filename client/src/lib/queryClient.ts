import { QueryClient, QueryFunction } from "@tanstack/react-query";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "";

// In dev, use relative /api URLs so the Vite proxy is used and session cookies (same origin) are sent.
// Direct requests to localhost:5001 from localhost:5173 are cross-origin and may not send cookies.
export const getFullUrl = (url: string) => {
  if (url.startsWith("http")) return url;

  const isDev =
    import.meta.env.DEV &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (isDev && url.startsWith("/api")) {
    return url;
  }

  const backendUrl = BASE_URL || (window.location.hostname === "localhost" ? "http://localhost:5001" : "");
  if (url.startsWith("/api") && backendUrl) {
    return `${backendUrl}${url}`;
  }

  return url;
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = getFullUrl(url);
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const fullUrl = getFullUrl(url);

    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
