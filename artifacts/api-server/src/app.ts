import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";
import webhookRoutes from "./routes/webhook.js";

const app: Express = express();

// Cloudflare 및 Replit 리버스 프록시 신뢰
// X-Forwarded-Host, X-Forwarded-For 등을 req.hostname / req.ip에 반영
app.set("trust proxy", true);

app.use(cors());

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

app.use("/api", router);

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
