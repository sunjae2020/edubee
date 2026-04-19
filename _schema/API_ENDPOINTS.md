# API_ENDPOINTS.md — Edubee CRM API 엔드포인트 목록

> 생성일: 2026-04-19 | 소스: routes/index.ts + 각 라우트 파일 | Base URL: `/api`

---

## 인증 방식

```
Authorization: Bearer <access_token>
```
- 스태프 Access Token 만료: 8h
- 포털 Access Token 만료: 24h
- Refresh Token 만료: 7d (DB에 저장)

---

## 에러 응답 형식 (공통)

```json
{
  "success": false,
  "code": "UNAUTHORIZED | FORBIDDEN | VALIDATION_ERROR | NOT_FOUND | INTERNAL_ERROR",
  "message": "설명 텍스트",
  "details": [ ... ],       // Zod 오류 시만
  "timestamp": "ISO8601"
}
```

---

## 페이지네이션 방식

```
GET /api/leads?page=1&limit=20
```
```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 1. 인증 (`auth.ts`)

| 메서드 | 경로 | 설명 | 인증 | Rate Limit |
|--------|------|------|------|-----------|
| POST | `/auth/login` | 스태프+포털 통합 로그인 | ❌ | 10/15min |
| POST | `/auth/refresh` | Access Token 갱신 | ❌ | 30/15min |
| POST | `/auth/logout` | 로그아웃 (Refresh Token 삭제) | ✅ | - |
| GET | `/auth/me` | 현재 사용자 정보 | ✅ | - |
| POST | `/auth/forgot-password` | 비밀번호 재설정 이메일 | ❌ | - |
| POST | `/auth/reset-password` | 비밀번호 재설정 | ❌ | - |
| POST | `/auth/accept-invite` | 초대장 수락 | ❌ | - |
| POST | `/auth/register` | 테넌트 회원가입 | ❌ | - |

---

## 2. 리드 (`crm-leads.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/leads` | 리드 목록 (페이지네이션, 필터) | 인증 |
| POST | `/leads` | 리드 생성 | 인증 |
| GET | `/leads/:id` | 리드 상세 | 인증 |
| PUT | `/leads/:id` | 리드 수정 | 인증 |
| DELETE | `/leads/:id` | 리드 삭제 (soft) | admin+ |

---

## 3. 견적 (`crm-quotes.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/quotes` | 견적 목록 | 인증 |
| POST | `/quotes` | 견적 생성 | 인증 |
| GET | `/quotes/:id` | 견적 상세 | 인증 |
| PUT | `/quotes/:id` | 견적 수정 | 인증 |
| DELETE | `/quotes/:id` | 견적 삭제 | admin+ |

**Quote Products (`quote-products.ts`):**
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/quote-products?quoteId=uuid` | 견적 항목 조회 |
| POST | `/quote-products` | 항목 추가 |
| PUT | `/quote-products/:id` | 항목 수정 |
| DELETE | `/quote-products/:id` | 항목 삭제 |

---

## 4. 계약 (`crm-contracts.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/contracts` | 계약 목록 | 인증 |
| POST | `/contracts` | 계약 생성 | 인증 |
| GET | `/contracts/:id` | 계약 상세 | 인증 |
| PUT | `/contracts/:id` | 계약 수정 | admin+ |
| GET | `/contracts/:id/products` | 계약 항목(AR/AP) | 인증 |
| PUT | `/contracts/:id/products/:pid` | 항목 수정 | admin+ |

---

## 5. 재무 / 인보이스 (`finance.ts`, `invoices.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/invoices` | 인보이스 목록 | 인증 |
| POST | `/invoices` | 인보이스 생성 | admin+ |
| PUT | `/invoices/:id` | 인보이스 수정 | admin+ |
| GET | `/transactions` | 트랜잭션 목록 | 인증 |
| POST | `/transactions` | 트랜잭션 생성 | admin+ |
| GET | `/payment-headers` | 결제 헤더 목록 | 인증 |
| POST | `/payment-headers` | 결제 생성 | admin+ |
| GET | `/receipts` | 영수증 목록 | 인증 |

---

## 6. 세금 계산서 (`tax-invoices.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/tax-invoices` | 세금계산서 목록 | admin, super_admin, camp_coordinator |
| POST | `/tax-invoices` | 세금계산서 생성 | admin+ |
| GET | `/tax-invoices/:id/pdf` | PDF 다운로드 | admin+ |

---

## 7. 포털 API (`portal.ts` — 1662라인)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/portal/login` | 포털 로그인 | ❌ |
| GET | `/portal/dashboard` | 에이전트 대시보드 | Portal |
| GET | `/portal/students` | 내 학생 목록 | Portal (agent) |
| GET | `/portal/students/:id` | 학생 상세 | Portal (agent) |
| GET | `/portal/leads` | 컨설테이션 목록 | Portal (agent) |
| GET | `/portal/leads/:id` | 리드 상세 | Portal (agent) |
| GET | `/portal/quotes` | 견적 목록 | Portal |
| GET | `/portal/quotes/:id` | 견적 상세 | Portal |
| GET | `/portal/contracts` | 계약 목록 | Portal |
| GET | `/portal/contracts/:id` | 계약 상세 | Portal |
| GET | `/portal/finance` | 커미션/재무 | Portal (agent) |
| GET | `/portal/documents` | 문서 목록 | Portal |
| GET | `/portal/partner/dashboard` | 파트너 대시보드 | Portal (partner) |
| GET | `/portal/partner/bookings` | 예약 목록 | Portal (partner) |
| GET | `/portal/student/dashboard` | 학생 대시보드 | Portal (student) |
| GET | `/portal/student/finance` | 납입 현황 | Portal (student) |
| GET | `/portal/photos/:filename` | 캠프 사진 | Portal (student) |

---

## 8. Privacy Act (APP 12/13) (`my-data.ts`, `privacy.ts`)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/privacy-policy` | 개인정보처리방침 | ❌ (공개) |
| GET | `/my-data` | 자기 열람 (APP 12) | Portal/Staff |
| POST | `/my-data/correction-request` | 수정 요청 (APP 13) | Portal/Staff |
| POST | `/my-data/withdraw-consent` | 동의 철회 | Portal/Staff |

---

## 9. 슈퍼어드민 (`superadmin.ts`) — super_admin only

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/superadmin/tenants` | 테넌트 목록 |
| POST | `/superadmin/tenants` | 테넌트 생성 |
| GET | `/superadmin/tenants/:id` | 테넌트 상세 |
| GET | `/superadmin/dashboard` | 플랫폼 KPI |

---

## 10. 설정 / 기타

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/settings` | 테넌트 설정 | ❌ (theme only) |
| PUT | `/settings` | 설정 수정 | admin+ |
| GET | `/health` | 헬스체크 | ❌ |
| POST | `/webhook` | Stripe Webhook | ❌ (raw body) |
| POST | `/ai/chat` | Gemini AI 챗봇 | 인증 |
| POST | `/storage/upload` | 파일 업로드 | 인증 |
| GET | `/documents/:id/view` | 문서 조회 (Signed URL) | 인증 |
| GET | `/documents/:id/download` | 문서 다운로드 | 인증 |

---

## 11. 파일 업로드 엔드포인트

| 경로 | 최대 크기 | 타입 제한 | 저장소 |
|------|----------|----------|--------|
| `POST /storage/upload` | 12 MB | 없음 | GCS |
| `POST /documents` (upload) | 20 MB | mimetype 기록만 | GCS |
| `POST /camp-photos` | 미설정 | 이미지만 | Local + GCS |
| `POST /data-manager/import` | 5 MB | CSV | 임시 로컬 |
| `POST /chatbot/upload` | 5 MB | 없음 | 임시 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
