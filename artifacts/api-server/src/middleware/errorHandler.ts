import * as Sentry from "@sentry/node";
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

/**
 * Global error handler — registered after all routers, last in app.ts.
 * S3-02: Guarantees standardised JSON error responses.
 * S4-01: Automatically sends 500 errors to Sentry.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  // ── 1. Application-defined errors ────────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      Sentry.captureException(err, { extra: { method: req.method, url: req.url } });
      logger.error({ err, method: req.method, url: req.url }, err.message);
    } else {
      logger.warn({ code: err.code, method: req.method, url: req.url }, err.message);
    }
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
      timestamp: new Date().toISOString(),
    });
  }

  // ── 2. Zod validation errors ────────────────────────────────────────────
  if (err instanceof ZodError) {
    logger.warn({ url: req.url, issues: err.issues }, "Validation error");
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Input validation failed",
      details: err.errors,
      timestamp: new Date().toISOString(),
    });
  }

  // ── 3. Express/Node base errors (with status) ────────────────────────────
  if (typeof err === "object" && err !== null && "status" in err) {
    const e = err as { status: number; message?: string };
    return res.status(e.status).json({
      success: false,
      code: "HTTP_ERROR",
      message: e.message ?? "HTTP Error",
      timestamp: new Date().toISOString(),
    });
  }

  // ── 4. Unexpected errors — send to Sentry + structured log ──────────────────
  Sentry.captureException(err, { extra: { method: req.method, url: req.url } });
  logger.error({ err, method: req.method, url: req.url }, "Unhandled server error");
  return res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    timestamp: new Date().toISOString(),
  });
}
