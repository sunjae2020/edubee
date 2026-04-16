/**
 * 프로덕션용 정적 파일 서버
 * BASE_PATH 접두사를 제거한 후 dist/public 에서 파일을 제공합니다.
 * SPA 라우팅을 위해 파일이 없으면 index.html 을 반환합니다.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const BASE = (process.env.BASE_PATH || "/").replace(/\/$/, ""); // e.g. "/admin"
const DIST = path.join(__dirname, "dist", "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".webp": "image/webp",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
};

function getMime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function serveFile(res, filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    res.writeHead(200, { "Content-Type": getMime(filePath), "Content-Length": stat.size });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  let urlPath = (req.url || "/").split("?")[0];

  // BASE 접두사 제거: /admin/assets/... → /assets/...
  if (BASE && urlPath.startsWith(BASE)) {
    urlPath = urlPath.slice(BASE.length) || "/";
  }
  if (!urlPath.startsWith("/")) urlPath = "/" + urlPath;

  // 파일 요청 처리
  const filePath = path.join(DIST, urlPath === "/" ? "index.html" : urlPath);
  if (serveFile(res, filePath)) return;

  // 디렉토리 요청 → index.html
  const indexPath = path.join(DIST, urlPath, "index.html");
  if (serveFile(res, indexPath)) return;

  // SPA 폴백
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  fs.createReadStream(path.join(DIST, "index.html")).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serving dist/public on port ${PORT} (base: ${BASE || "/"})`);
});
