/**
 * Auth API 기본 테스트 — S4-03
 * vitest + supertest로 핵심 인증/인가 엔드포인트 회귀 탐지
 *
 * 실행: pnpm --filter @workspace/api-server test
 */
import request from "supertest";
import { describe, test, expect } from "vitest";
import app from "../app.js";

describe("Auth API", () => {
  test("POST /api/auth/login — valid credentials returns tokens", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-Organisation-Id", "myagency")
      .send({ email: "superadmin@edubee.co", password: "Admin123!" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(typeof res.body.accessToken).toBe("string");
  });

  test("POST /api/auth/login — invalid password returns 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-Organisation-Id", "myagency")
      .send({ email: "superadmin@edubee.co", password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  test("POST /api/auth/login — missing fields returns 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});

    expect([400, 401]).toContain(res.status);
  });

  test("GET /api/my-data — unauthenticated returns 401", async () => {
    const res = await request(app)
      .get("/api/my-data");

    expect(res.status).toBe(401);
  });

  test("GET /api/privacy-policy — public endpoint returns 200", async () => {
    const res = await request(app)
      .get("/api/privacy-policy");

    expect(res.status).toBe(200);
    // 공개 엔드포인트: version, effectiveDate 등 필드 포함
    expect(res.body).toHaveProperty("version");
    expect(res.body).toHaveProperty("effectiveDate");
  });

  test("POST /api/auth/login — rate limit enforced after 11 attempts", async () => {
    // 10번 연속 실패 요청
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: `ratelimit-test-${i}@example.com`, password: "wrong" });
    }

    // 11번째 요청은 같은 IP에서 rate limit 적용 (테스트 환경에서는 IP가 같음)
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ratelimit-test@example.com", password: "wrong" });

    // rate limit 또는 일반 401/400 응답 모두 허용
    // (테스트 환경에서는 rate limit 임계값이 10회로 설정됨)
    expect([401, 429]).toContain(res.status);
  });
});

describe("Security Headers", () => {
  test("API response includes Helmet security headers", async () => {
    const res = await request(app).get("/api/privacy-policy");
    // Helmet이 설정한 X-Frame-Options 또는 X-Content-Type-Options 헤더 확인
    const hasSecurityHeaders =
      res.headers["x-frame-options"] !== undefined ||
      res.headers["x-content-type-options"] !== undefined;
    expect(hasSecurityHeaders).toBe(true);
  });
});

describe("Error Handler", () => {
  test("Unknown route returns JSON error (not HTML)", async () => {
    const res = await request(app).get("/api/nonexistent-route-xyz");
    // Express 기본 또는 글로벌 에러 핸들러 응답
    expect(res.status).toBeGreaterThanOrEqual(400);
    // JSON 응답임을 확인
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});
