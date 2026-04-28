import pino from "pino";

/**
 * Edubee structured logger (pino)
 * Sprint 3-04: APP 11 compliance — automatic masking of passport numbers / passwords
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
      : undefined,
  base: { service: "edubee-api", env: process.env.NODE_ENV || "development" },
  redact: {
    paths: [
      "*.passport_number",
      "*.visa_number",
      "*.medical_conditions",
      "*.password",
      "*.token",
      "*.refreshToken",
      "*.accessToken",
      "req.headers.authorization",
      "*.credit_card",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      ip: req.remoteAddress,
    }),
  },
});
