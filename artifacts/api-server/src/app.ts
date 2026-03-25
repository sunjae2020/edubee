import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

// Global error handler — must be last middleware
app.use((err: any, req: any, res: any, _next: any) => {
  console.error('Unhandled API error:', err.message);
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
