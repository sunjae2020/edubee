/**
 * Cloudflare Worker — Edubee Tenant Subdomain Router
 *
 * Handles all *.edubee.co wildcard requests.
 *
 * Routing logic:
 *   /api/* paths  →  Railway API  (adds X-Subdomain header)
 *   all other     →  Vercel admin CRM at app.edubee.co  (proxied with X-Subdomain)
 *
 * The Railway tenantResolver reads X-Subdomain to identify the tenant.
 *
 * Deploy:
 *   1. Create a Worker in Cloudflare dashboard → Workers & Pages
 *   2. Paste this script
 *   3. Add a Route: *.edubee.co/* → this Worker
 *      (exclude api.edubee.co, app.edubee.co, www.edubee.co, portal.edubee.co, camp.edubee.co)
 */

const SYSTEM_SUBDOMAINS = new Set([
  "www", "api", "app", "portal", "camp", "admin",
  "mail", "static", "cdn", "dev", "staging",
  "superadmin", "landing", "blog", "docs",
]);

const RAILWAY_API_ORIGIN = "https://api.edubee.co";
const VERCEL_APP_ORIGIN  = "https://app.edubee.co";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const parts = url.hostname.split(".");
  const subdomain = parts.length >= 3 ? parts[0] : null;

  // Pass through requests for system subdomains unchanged
  if (!subdomain || SYSTEM_SUBDOMAINS.has(subdomain)) {
    return fetch(request);
  }

  // Build modified headers with tenant subdomain
  const headers = new Headers(request.headers);
  headers.set("X-Subdomain", subdomain);

  const isApiRequest = url.pathname.startsWith("/api/") || url.pathname === "/api";

  if (isApiRequest) {
    // Route to Railway API server
    const apiUrl = `${RAILWAY_API_ORIGIN}${url.pathname}${url.search}`;
    return fetch(apiUrl, {
      method:  request.method,
      headers: headers,
      body:    request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
      redirect: "follow",
    });
  }

  // Route to Vercel admin CRM (proxy the SPA)
  const appUrl = `${VERCEL_APP_ORIGIN}${url.pathname}${url.search}`;
  const appRequest = new Request(appUrl, {
    method:  request.method,
    headers: headers,
    body:    request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
    redirect: "follow",
  });

  const response = await fetch(appRequest);

  // Remove HSTS and other origin-specific headers to avoid issues
  const newHeaders = new Headers(response.headers);
  newHeaders.delete("strict-transport-security");

  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers:    newHeaders,
  });
}
