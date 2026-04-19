import * as Sentry from "@sentry/node";
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

/**
 * 글로벌 에러 핸들러 — 모든 라우터 이후, app.ts 마지막에 등록.
 * S3-02: 표준화된 JSON 에러 응답 보장.
 * S4-01: 500 에러를 Sentry로 자동 전송.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  // ── 1. 애플리케이션 정의 에러 ────────────────────────────────────────────
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

  // ── 2. Zod 유효성 검사 에러 ────────────────────────────────────────────
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

  // ── 3. Express/Node 기본 에러 (status 포함) ────────────────────────────
  if (typeof err === "object" && err !== null && "status" in err) {
    const e = err as { status: number; message?: string };
    return res.status(e.status).json({
      success: false,
      code: "HTTP_ERROR",
      message: e.message ?? "HTTP Error",
      timestamp: new Date().toISOString(),
    });
  }

  // ── 4. 예상치 못한 에러 — Sentry 전송 + 구조화 로그 ──────────────────
  Sentry.captureException(err, { extra: { method: req.method, url: req.url } });
  logger.error({ err, method: req.method, url: req.url }, "Unhandled server error");
  return res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    timestamp: new Date().toISOString(),
  });
}
