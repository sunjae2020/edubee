const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("portal_token");
}

function headers(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const err = await res.json();
      msg = err.message ?? err.error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as T;
}

export const api = {
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  get: <T>(path: string) => request<T>("GET", path),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
