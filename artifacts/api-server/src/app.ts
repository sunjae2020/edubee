import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import router from "./routes/index.js";
import webhookRoutes from "./routes/webhook.js";

const app: Express = express();

// Cloudflare 및 Replit 리버스 프록시 신뢰 (1홉만 신뢰 — true보다 안전)
// X-Forwarded-Host, X-Forwarded-For 등을 req.hostname / req.ip에 반영
app.set("trust proxy", 1);

// ── Helmet 보안 헤더 ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://storage.googleapis.com"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS 도메인 제한 ─────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── 전체 API Rate Limit (15분 내 500회) ────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please try again later.' },
  skip: (req) => req.path === '/health',
});

// ⚠️ Stripe webhook MUST be registered BEFORE express.json() to receive raw body
app.use("/api/webhook", webhookRoutes);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logger — logs method, path, and status code for debugging
app.use((req: any, res: any, next: any) => {
  const oldJson = res.json.bind(res);
  res.json = function(body: any) {
    if (res.statusCode >= 500) {
      console.error(`[500] ${req.method} ${req.path}`, body);
    }
    return oldJson(body);
  };
  next();
});

app.use("/api", generalLimiter, router);

// ── 프로덕션 정적 파일 서빙 ────────────────────────────────────────────────
// esbuild CJS 번들 기준: __dirname = artifacts/api-server/dist/
// 각 프론트엔드의 dist/public 디렉토리를 상대 경로로 서빙
if (process.env.NODE_ENV === "production") {
  const frontends: Array<{ prefix: string; dir: string }> = [
    { prefix: "/admin",  dir: path.join(__dirname, "../../edubee-admin/dist/public")  },
    { prefix: "/portal", dir: path.join(__dirname, "../../edubee-portal/dist/public") },
    { prefix: "/camp",   dir: path.join(__dirname, "../../edubee-camp/dist/public")   },
    { prefix: "",        dir: path.join(__dirname, "../../edubee-website/dist/public") },
  ];

  for (const { prefix, dir } of frontends) {
    if (!fs.existsSync(dir)) {
      console.warn(`[StaticServe] 빌드 디렉토리 없음: ${dir}`);
      continue;
    }
    // 정적 파일 서빙 (캐시 헤더 포함)
    app.use(prefix || "/", express.static(dir, { maxAge: "1d", etag: true }));
    // SPA 폴백: 알 수 없는 경로는 index.html 반환 (Express 5: 명명된 와일드카드 필요)
    const fallbackPattern = prefix ? `${prefix}/*wildcard` : `/*wildcard`;
    app.get(fallbackPattern, (_req: any, res: any) => {
      res.sendFile(path.join(dir, "index.html"));
    });
    console.log(`[StaticServe] ${prefix || "/"} → ${dir}`);
  }
}

// Global error handler — must be last middleware
app.use((err: any, req: any, res: any, _next: any) => {
  console.error(`[Unhandled Error] ${req.method} ${req.path}:`, err.message);
  res.status(err.status ?? 500).json({
    success: false,
    error: err.message ?? 'Internal server error',
  });
});

// Crash guard — keeps server alive on uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled rejection:', reason?.message ?? reason);
});

export default app;
