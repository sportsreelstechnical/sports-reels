import { QueryClient, QueryFunction } from "@tanstack/react-query";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "";

// Helper to ensure URL handles both relative and absolute paths correctly
const getFullUrl = (url: string) => {
  if (url.startsWith("http")) return url;

  // If we are on a production domain but BASE_URL is localhost, use relative path
  const isLocalBackend =
    BASE_URL.includes("localhost") || BASE_URL.includes("127.0.0.1");
  const isLocalFrontend =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (
    url.startsWith("/api") &&
    BASE_URL &&
    (isLocalFrontend || !isLocalBackend)
  ) {
    return `${BASE_URL}${url}`;
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
