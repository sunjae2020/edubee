# CODE_PATTERNS.md — 코드 패턴 표준 가이드

> 생성일: 2026-04-19 | 소스: routes/invoices.ts, routes/crm-leads.ts, 각 페이지 파일

---

## 1. API 라우트 표준 패턴

**최적 예시:** `routes/invoices.ts`

```typescript
import { Router } from "express";
import { db } from "@workspace/db";
import { invoices } from "@workspace/db/schema";
import { eq, desc, and, ilike, count } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { logAudit, auditParamsFromReq } from "../lib/auditLogger.js";

const router = Router();
const STAFF = ["super_admin", "admin", "camp_coordinator"];
const ADMIN = ["super_admin", "admin"];

// ── GET 목록 (인증 + RBAC + 페이지네이션 + 필터) ─────────────────────────
router.get(
  "/",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      // 1. 파라미터 파싱
      const { status, search } = req.query as Record<string, string>;
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const offset = (page - 1) * limit;

      // 2. 조건 빌드
      const conditions: any[] = [];
      if (req.tenant) conditions.push(eq(invoices.organisationId, req.tenant.id));
      if (status) conditions.push(eq(invoices.status, status));
      if (search) conditions.push(ilike(invoices.invoiceNumber, `%${search}%`));

      const baseQuery = conditions.length > 0 ? and(...conditions) : undefined;

      // 3. 병렬 쿼리 (데이터 + 카운트)
      const [rows, [countResult]] = await Promise.all([
        baseQuery
          ? db.select().from(invoices).where(baseQuery).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset)
          : db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset),
        baseQuery
          ? db.select({ count: count() }).from(invoices).where(baseQuery)
          : db.select({ count: count() }).from(invoices),
      ]);

      const total = Number(countResult.count);

      // 4. 표준 응답
      return res.json({
        data: rows,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ── POST 생성 (인증 + RBAC + Audit Log) ─────────────────────────────────
router.post(
  "/",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      // 1. (선택) Zod 유효성 검사
      // const parsed = invoiceSchema.parse(req.body);

      // 2. 생성
      const [newInvoice] = await db
        .insert(invoices)
        .values({
          ...req.body,
          createdBy: req.user!.id,
          organisationId: req.tenant?.id,
        })
        .returning();

      // 3. Audit Log
      await logAudit({
        ...auditParamsFromReq(req),
        action: "CREATE",
        resourceType: "invoice",
        resourceId: newInvoice.id,
      });

      return res.status(201).json({ success: true, data: newInvoice });
    } catch (err) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
```

**핵심 원칙:**
- 인증: `authenticate` 미들웨어 필수
- RBAC: `requireRole(...roles)` 추가
- 테넌트 필터: `req.tenant?.id` 항상 확인
- 응답 형식: `{ success: true, data: ... }` 또는 `{ data: ..., meta: ... }`
- 에러: `res.status(500).json({ error: "..." })` 또는 전역 errorHandler

---

## 2. React 페이지 표준 패턴

**TanStack Query 데이터 패칭:**

```typescript
// pages/agent-quotes.tsx 패턴
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AgentQuotesPage() {
  const queryClient = useQueryClient();

  // 1. 데이터 조회
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", "quotes"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/portal/quotes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30_000,  // 30초 캐시
  });

  // 2. 로딩 처리
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState message={error.message} />;

  // 3. 렌더링
  return (
    <div>
      {data?.data?.map((quote: Quote) => (
        <QuoteCard key={quote.id} quote={quote} />
      ))}
    </div>
  );
}
```

**데이터 변경 (useMutation):**

```typescript
const mutation = useMutation({
  mutationFn: async (payload: CreateQuoteInput) => {
    const res = await fetch(`${BASE_URL}api/quotes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["portal", "quotes"] });
    toast({ title: "견적이 생성되었습니다." });
  },
  onError: (err) => {
    toast({ variant: "destructive", title: "오류", description: err.message });
  },
});
```

---

## 3. Form + 유효성 검사 패턴

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  amount: z.number().min(0, "금액은 0 이상이어야 합니다"),
});

type FormData = z.infer<typeof formSchema>;

export function ExampleForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", amount: 0 },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <Input {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 4. 일관성 없는 패턴 목록 ⚠️

| 항목 | 불일치 예시 |
|------|-----------|
| **상태값 케이스** | `Draft`(PascalCase) vs `in_progress`(snake_case) 혼재 |
| **에러 응답 형식** | `{ error: "..." }` vs `{ success: false, code: "...", message: "..." }` 혼재 |
| **createdAt/createdOn** | 테이블마다 다름 (`created_at` vs `created_on`) |
| **ID 생성 방식** | `defaultRandom()` vs `crypto.randomUUID()` 혼재 |
| **인보이스 번호 채번** | `finance.ts`와 `invoices.ts`에 각각 독립적으로 구현됨 |
| **테넌트 필터** | 일부 라우트는 `req.tenant?.id` 확인, 일부는 생략 |
| **console.log** | pino logger 사용 중이나 49개 console.log 잔존 |

---

## 5. 개선이 필요한 안티패턴

| 안티패턴 | 예시 위치 | 권장 대안 |
|---------|---------|----------|
| `any` 타입 남용 | `req.body as any`, `decoded as any` | Zod 스키마로 타입 보장 |
| 빈 catch 블록 | `catch { /* ignore */ }` | 최소한 logger.warn 추가 |
| console.log 잔존 | 49개 | `logger.info/debug` 교체 |
| try/catch 없는 async | 일부 라우트 핸들러 | `try/catch` 또는 asyncHandler 래퍼 |
| 하드코딩된 역할 배열 | 각 라우트마다 `["super_admin", "admin"]` | 공통 상수로 추출 |
| `db.select()` 전체 컬럼 | 다수 목록 API | 필요한 필드만 select |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
