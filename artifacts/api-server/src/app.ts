import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import router from "./routes/index.js";
import webhookRoutes from "./routes/webhook.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// Cloudflare 및 Replit 리버스 프록시 신뢰 (1홉만 신뢰 — true보다 안전)
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

// ── 구조화 HTTP 요청 로깅 (pino — Sprint 3-04) ───────────────────────────
app.use((req: any, _res: any, next: any) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, "Request received");
  next();
});

// ⚠️ Stripe webhook MUST be registered BEFORE express.json() to receive raw body
app.use("/api/webhook", webhookRoutes);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", generalLimiter, router);

// ── 프로덕션 정적 파일 서빙 ────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const frontends: Array<{ prefix: string; dir: string }> = [
    { prefix: "/admin",  dir: path.join(__dirname, "../../edubee-admin/dist/public")  },
    { prefix: "/portal", dir: path.join(__dirname, "../../edubee-portal/dist/public") },
    { prefix: "/camp",   dir: path.join(__dirname, "../../edubee-camp/dist/public")   },
    { prefix: "",        dir: path.join(__dirname, "../../edubee-website/dist/public") },
  ];

  for (const { prefix, dir } of frontends) {
    if (!fs.existsSync(dir)) {
      logger.warn({ dir }, "Static build directory not found");
      continue;
    }
    app.use(prefix || "/", express.static(dir, { maxAge: "1d", etag: true }));
    const fallbackPattern = prefix ? `${prefix}/*wildcard` : `/*wildcard`;
    app.get(fallbackPattern, (_req: any, res: any) => {
      res.sendFile(path.join(dir, "index.html"));
    });
    logger.info({ prefix: prefix || "/", dir }, "Static serving registered");
  }
}

// ── 글로벌 에러 핸들러 — 반드시 마지막에 등록 (Sprint 3-02) ─────────────
app.use(errorHandler);

// Crash guard — keeps server alive on uncaught errors
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
});
process.on('unhandledRejection', (reason: any) => {
  logger.error({ reason }, 'Unhandled rejection');
});

export default app;
