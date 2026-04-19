const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("portal_token");
}

/**
 * Extract tenant slug from hostname.
 * e.g. "ts.edubee.co"       → "ts"
 *      "myagency.edubee.co" → "myagency"
 *      "localhost"           → null  (dev: no restriction)
 *      "edubee.co"           → null  (root domain: no restriction)
 */
function getTenantSlug(): string | null {
  // 1순위: 서브도메인 자동 감지 (운영)
  const hostname = window.location.hostname;
  const match = hostname.match(/^([^.]+)\.edubee\.co$/);
  if (match && !["www", "app", "portal"].includes(match[1])) {
    return match[1];
  }
  // 2순위: 개발 환경에서 로그인 시 저장한 테넌트 슬러그
  return localStorage.getItem("portal_tenant_slug");
}

function headers(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  const slug = getTenantSlug();
  if (slug) h["X-Organisation-Id"] = slug;
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
