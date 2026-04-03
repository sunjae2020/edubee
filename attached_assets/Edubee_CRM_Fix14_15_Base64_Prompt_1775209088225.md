# 🐝 Edubee CRM — Fix 14~15: 로고 / 파비콘 업로드 (Base64 → DB 저장)
# Replit AI Agent 전용 | 즉시 실행 프롬프트
# 작성일: 2026-04-03
# 환경: Replit 내장 PostgreSQL (Helium) / GCS 차단 → 기존 product image와 동일 방식

---

## 🎯 작업 목적

**환경 확정:**
- DB: Replit PostgreSQL (Helium) — `postgresql://*@helium/*`
- Storage: Replit GCS 401 차단 → **Base64 → DB 직접 저장** 방식 사용
- 근거: 기존 product image 갤러리와 **동일한 패턴** 유지 (일관성)
- Express body 제한: 이미 10MB 설정됨 → 로고(~200KB) 충분

| Fix | 엔드포인트 | 저장 방식 |
|-----|-----------|---------|
| Fix 14 | `POST /api/settings/branding/logo`    | Base64 → `organisations.logo_url` |
| Fix 15 | `POST /api/settings/branding/favicon` | Base64 → `organisations.favicon_url` |

---

## 🛡️ 안전 규칙

- **수정 파일: `/server/src/routes/settings.ts` 1개만**
- 기존 product image 업로드 코드를 먼저 읽고 **동일한 패턴**으로 작성
- 기존 `GET/PUT /api/settings/branding` 변경 없음
- `npx tsc --noEmit` 오류 0개 확인 후 완료

---

## 📋 Step 1: 사전 확인 (수정 전 필수)

### 1-1. 기존 product image 업로드 코드 확인

product image 갤러리가 Base64를 어떻게 처리하는지 패턴을 읽는다.
아래 파일 중 실제 존재하는 파일을 찾아 읽는다:

```
/server/src/routes/products.ts
/server/src/routes/product-catalog.ts
/server/src/routes/files.ts
```

확인 항목:
- Base64 인코딩 방식 (`data:image/...;base64,...` 형식인지)
- DB 컬럼에 직접 저장하는 방식 확인
- multer 사용 여부 또는 `req.body`로 직접 받는지 확인

---

### 1-2. settings.ts 현재 상태 확인

`/server/src/routes/settings.ts` 를 읽고:
- 기존 `branding` 관련 라우트 위치 확인
- `organisations` 테이블의 `logo_url`, `favicon_url` 컬럼명 정확히 확인
- 파일 상단 import 목록 확인

---

### 1-3. Express body 제한 확인

`/server/src/index.ts` (메인 서버 파일)를 읽고:
```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```
설정이 있는지 확인한다. 없으면 추가한다 (있으면 그대로 유지).

---

## 📋 Step 2: 코드 추가

Step 1 확인 완료 후, 기존 product image 패턴에 맞춰 아래 코드를
`/server/src/routes/settings.ts` 맨 하단에 추가한다.

```typescript
// ═══════════════════════════════════════════════════════════════
// BRANDING UPLOAD — Fix 14~15
// Base64 → DB 직접 저장 방식 (기존 product image 갤러리와 동일)
// 환경: Replit PostgreSQL (Helium) / GCS 차단으로 Storage 미사용
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Fix 14 — POST /branding/logo : 로고 업로드
// Body: { logoBase64: "data:image/png;base64,..." }
// ─────────────────────────────────────────────────────────────
router.post('/branding/logo', authenticate, async (req, res) => {
  try {
    const { logoBase64 } = req.body;
    const organisationId = req.tenantId;

    // 필수값 확인
    if (!logoBase64) {
      return res.status(400).json({ message: '로고 이미지 데이터가 없습니다.' });
    }

    // Base64 형식 검증: data:image/{type};base64,{data}
    const base64Regex = /^data:image\/(png|jpeg|jpg|svg\+xml|webp);base64,/;
    if (!base64Regex.test(logoBase64)) {
      return res.status(400).json({
        message: 'PNG, JPG, SVG, WEBP 형식의 이미지만 업로드 가능합니다.',
      });
    }

    // 파일 크기 확인 (Base64는 원본의 약 1.37배)
    // 2MB 원본 기준 → Base64 약 2.74MB
    const base64Data = logoBase64.split(',')[1] ?? '';
    const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
    const MAX_BYTES = 2 * 1024 * 1024; // 2MB

    if (estimatedBytes > MAX_BYTES) {
      return res.status(400).json({
        message: '로고 파일은 2MB 이하여야 합니다.',
        estimatedSize: `${(estimatedBytes / 1024).toFixed(0)}KB`,
      });
    }

    // DB 저장: organisations.logo_url 에 Base64 직접 저장
    await db
      .update(organisations)
      .set({
        logoUrl: logoBase64,
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, organisationId));

    return res.json({
      success: true,
      logoUrl: logoBase64,
      message: '로고가 저장됐습니다.',
    });
  } catch (err) {
    console.error('[POST /branding/logo]', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 15 — POST /branding/favicon : 파비콘 업로드
// Body: { faviconBase64: "data:image/png;base64,..." }
// ─────────────────────────────────────────────────────────────
router.post('/branding/favicon', authenticate, async (req, res) => {
  try {
    const { faviconBase64 } = req.body;
    const organisationId = req.tenantId;

    // 필수값 확인
    if (!faviconBase64) {
      return res.status(400).json({ message: '파비콘 이미지 데이터가 없습니다.' });
    }

    // Base64 형식 검증 (ICO + PNG만 허용)
    const base64Regex = /^data:image\/(x-icon|vnd\.microsoft\.icon|png);base64,/;
    if (!base64Regex.test(faviconBase64)) {
      return res.status(400).json({
        message: 'ICO 또는 PNG 형식의 파비콘만 업로드 가능합니다.',
      });
    }

    // 파일 크기 확인 (500KB 제한)
    const base64Data = faviconBase64.split(',')[1] ?? '';
    const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
    const MAX_BYTES = 500 * 1024; // 500KB

    if (estimatedBytes > MAX_BYTES) {
      return res.status(400).json({
        message: '파비콘 파일은 500KB 이하여야 합니다.',
        estimatedSize: `${(estimatedBytes / 1024).toFixed(0)}KB`,
      });
    }

    // DB 저장: organisations.favicon_url 에 Base64 직접 저장
    await db
      .update(organisations)
      .set({
        faviconUrl: faviconBase64,
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, organisationId));

    return res.json({
      success: true,
      faviconUrl: faviconBase64,
      message: '파비콘이 저장됐습니다.',
    });
  } catch (err) {
    console.error('[POST /branding/favicon]', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});
```

---

## 📋 Step 3: 프론트엔드 Branding.tsx 확인 및 업데이트

`/client/src/pages/settings/Branding.tsx` 를 읽고,
로고 업로드 버튼이 **Base64 방식으로 API를 호출**하는지 확인한다.

기존 product image 갤러리의 프론트엔드 파일 읽기 패턴을 참고하여,
아래 흐름으로 구현되어 있는지 확인한다:

```typescript
// 프론트엔드 로고 업로드 흐름 (확인용)
const handleLogoUpload = async (file: File) => {
  // 1. FileReader로 Base64 변환
  const reader = new FileReader();
  reader.onload = async (e) => {
    const logoBase64 = e.target?.result as string;
    // "data:image/png;base64,iVBORw0KGgo..." 형태

    // 2. API 호출
    const res = await fetch('/api/settings/branding/logo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Organisation-Id': organisationId,
      },
      body: JSON.stringify({ logoBase64 }),
    });

    // 3. 응답에서 logoUrl 받아 미리보기 업데이트
    const data = await res.json();
    if (data.success) {
      setLogoPreview(data.logoUrl); // Base64 → <img src> 직접 사용
    }
  };
  reader.readAsDataURL(file);
};
```

**구현이 없거나 다른 방식으로 되어 있으면:**
기존 product image 갤러리 프론트엔드 코드를 참고하여
동일한 패턴으로 `Branding.tsx` 에 구현한다.

---

## 📋 Step 4: TypeScript 검증

```bash
npx tsc --noEmit
```

오류 발생 시:

| 오류 패턴 | 해결 방법 |
|-----------|-----------|
| `logoUrl` / `faviconUrl` 컬럼 없음 | 스키마에서 실제 컬럼명 확인 (`logo_url` → `logoUrl`) |
| `req.tenantId` 타입 오류 | 기존 코드의 tenantId 사용 방식 확인 후 동일하게 적용 |

---

## 📋 Step 5: API 검증

```bash
# 터미널에서 curl 테스트 (또는 Postman)
curl -X POST http://localhost:5000/api/settings/branding/logo \
  -H "Content-Type: application/json" \
  -H "X-Organisation-Id: [유효한 UUID]" \
  -d '{"logoBase64":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}'

# 기대 응답:
# { "success": true, "logoUrl": "data:image/png;base64,...", "message": "로고가 저장됐습니다." }
```

**DB 확인:**
```sql
SELECT
  id,
  name,
  LEFT(logo_url, 50)    AS logo_url_preview,
  LEFT(favicon_url, 50) AS favicon_url_preview,
  modified_on
FROM organisations
WHERE id = '[테스트 테넌트 UUID]';
-- logo_url 이 'data:image/...' 로 시작하면 성공
```

---

## ✅ 완료 보고 형식

```
✅ Fix 14~15 완료

수정 파일:
  - /server/src/routes/settings.ts
  - /client/src/pages/settings/Branding.tsx (프론트 확인/수정)

저장 방식: Base64 → Replit PostgreSQL 직접 저장
           (기존 product image 갤러리와 동일 패턴)

추가된 엔드포인트:
  ✅ Fix 14: POST /api/settings/branding/logo
             허용: PNG/JPG/SVG/WEBP, 2MB 이하
             저장: organisations.logo_url (Base64)
  ✅ Fix 15: POST /api/settings/branding/favicon
             허용: ICO/PNG, 500KB 이하
             저장: organisations.favicon_url (Base64)

검증:
  - TypeScript: 오류 0개
  - 서버 기동: 정상
  - 로고 업로드 API: [결과]
  - 파비콘 업로드 API: [결과]
  - DB 저장 확인: logo_url/favicon_url Base64 값 확인 ✅

다음 작업:
  - Fix 16: SuperAdminGuard 프론트엔드 가드
  - Fix 17: 예약어 서브도메인 차단 유틸 파일 분리
```
