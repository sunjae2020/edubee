# 🐝 Edubee CRM — Fix 8~13: 도메인 API 6개 엔드포인트
# Replit AI Agent 전용 | 즉시 실행 프롬프트
# 작성일: 2026-04-03

---

## 🎯 작업 목적

`domain_configs` 테이블은 Fix 5에서 이미 생성됨.
이제 그 테이블을 사용하는 **도메인 관련 API 6개**를 `settings.ts`에 추가한다.

| Fix | 엔드포인트 | 역할 |
|-----|-----------|------|
| Fix 8  | `PUT  /api/settings/domain/subdomain`       | 서브도메인 저장 |
| Fix 9  | `PUT  /api/settings/domain/custom`          | 커스텀 도메인 등록 |
| Fix 10 | `GET  /api/settings/domain/dns-instructions`| DNS 레코드 설정 안내 |
| Fix 11 | `POST /api/settings/domain/custom/verify`   | DNS 인증 실행 |
| Fix 12 | `GET  /api/settings/domain/custom/status`   | 인증·SSL 상태 조회 |
| Fix 13 | `DELETE /api/settings/domain/custom`        | 커스텀 도메인 제거 |

---

## 🛡️ 안전 규칙

- **수정 파일: `/server/src/routes/settings.ts` 1개만**
- 기존 `GET /api/settings/domain` 과 `POST /api/settings/domain/check` 는 **절대 변경하지 않는다**
- 6개 엔드포인트를 기존 코드 **하단에 추가**만 한다
- 각 엔드포인트 추가 후 `npx tsc --noEmit` 으로 TypeScript 오류 확인
- 오류 발생 시 즉시 수정 후 다음 엔드포인트로 진행

---

## 📋 Step 1: 사전 확인 (수정 전 반드시)

`/server/src/routes/settings.ts` 파일을 읽고 아래를 확인한다:

1. **현재 import 목록** — `domainConfigs` 테이블이 import 되어 있는가?
   - 없으면 스키마 파일에서 `domainConfigs` 의 정확한 export 경로를 찾아 추가
2. **`ne` (not equal) operator** — Drizzle `ne()` 가 import 되어 있는가?
   - 없으면 기존 `eq, and` import 구문에 `ne` 추가
3. **`dns` 모듈** — 파일 상단에 `import dns from 'dns/promises'` 있는가?
   - 없으면 추가
4. **기존 domain 엔드포인트 경로 확인** — 이미 구현된 경로와 충돌 없는지 확인

**확인 후 아래 6개를 순서대로 추가한다.**

---

## 📋 Step 2: 6개 엔드포인트 추가

> 기존 코드 맨 하단에 아래 블록을 통째로 추가한다.
> 각 엔드포인트 사이 주석 구분선을 반드시 포함한다.

```typescript
// ═══════════════════════════════════════════════════════════════
// DOMAIN API — Fix 8~13
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Fix 8 — PUT /domain/subdomain : 서브도메인 저장
// ─────────────────────────────────────────────────────────────
router.put('/domain/subdomain', authenticate, async (req, res) => {
  try {
    const { subdomain } = req.body;
    const organisationId = req.tenantId;

    if (!subdomain) {
      return res.status(400).json({ message: '서브도메인을 입력해 주세요.' });
    }

    // 유효성: 소문자·숫자·하이픈, 3~50자
    if (!/^[a-z0-9-]{3,50}$/.test(subdomain)) {
      return res.status(400).json({
        message: '서브도메인은 소문자, 숫자, 하이픈만 사용 가능하며 3~50자여야 합니다.',
      });
    }

    // 예약어 차단
    const RESERVED = [
      'admin', 'superadmin', 'api', 'www', 'mail', 'ftp', 'smtp',
      'support', 'billing', 'app', 'static', 'cdn', 'assets',
      'dev', 'development', 'staging', 'test', 'demo', 'sandbox',
      'edubee', 'crm', 'platform', 'portal', 'login', 'auth',
    ];
    if (RESERVED.includes(subdomain.toLowerCase())) {
      return res.status(400).json({
        available: false,
        reason: 'reserved',
        message: '시스템에서 사용 중인 예약어입니다.',
      });
    }

    // 중복 확인 (자기 자신 제외)
    const duplicate = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(
        and(
          eq(organisations.subdomain, subdomain),
          ne(organisations.id, organisationId)
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      return res.status(409).json({
        available: false,
        message: '이미 사용 중인 서브도메인입니다.',
      });
    }

    // 저장
    await db
      .update(organisations)
      .set({ subdomain, modifiedOn: new Date() })
      .where(eq(organisations.id, organisationId));

    return res.json({
      success: true,
      subdomain,
      fullDomain: `${subdomain}.edubee.com`,
    });
  } catch (err) {
    console.error('[PUT /domain/subdomain]', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 9 — PUT /domain/custom : 커스텀 도메인 등록
// ─────────────────────────────────────────────────────────────
router.put('/domain/custom', authenticate, async (req, res) => {
  try {
    const { customDomain } = req.body;
    const organisationId = req.tenantId;

    if (!customDomain) {
      return res.status(400).json({ message: '도메인을 입력해 주세요.' });
    }

    // 플랜 확인 (starter는 커스텀 도메인 불가)
    const [org] = await db
      .select()
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);

    if (!org) {
      return res.status(404).json({ message: '테넌트를 찾을 수 없습니다.' });
    }

    if (org.planType === 'starter' || org.planType === 'solo') {
      return res.status(403).json({
        message: '커스텀 도메인은 Professional 플랜 이상에서 사용 가능합니다.',
        currentPlan: org.planType,
      });
    }

    // 도메인 형식 검사
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(customDomain)) {
      return res.status(400).json({ message: '유효하지 않은 도메인 형식입니다.' });
    }

    // TXT 인증 토큰 생성
    const txtToken = `edubee-verify-${Math.random().toString(36).slice(2, 12)}`;
    const dnsTarget = org.subdomain
      ? `${org.subdomain}.edubee.com`
      : 'app.edubee.com';

    // domain_configs upsert (기존 있으면 UPDATE, 없으면 INSERT)
    const [existing] = await db
      .select({ id: domainConfigs.id })
      .from(domainConfigs)
      .where(
        and(
          eq(domainConfigs.organisationId, organisationId),
          eq(domainConfigs.domainType, 'custom')
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(domainConfigs)
        .set({
          domainValue: customDomain,
          fullDomain: customDomain,
          dnsRecordType: 'CNAME',
          dnsTarget,
          txtVerificationToken: txtToken,
          verificationStatus: 'pending',
          sslStatus: 'pending',
          checkAttempts: 0,
          errorMessage: null,
          verifiedAt: null,
          modifiedOn: new Date(),
        })
        .where(eq(domainConfigs.id, existing.id));
    } else {
      await db.insert(domainConfigs).values({
        organisationId,
        domainType: 'custom',
        domainValue: customDomain,
        fullDomain: customDomain,
        dnsRecordType: 'CNAME',
        dnsTarget,
        txtVerificationToken: txtToken,
        verificationStatus: 'pending',
        sslStatus: 'pending',
      });
    }

    // organisations.custom_domain 업데이트
    await db
      .update(organisations)
      .set({ customDomain, modifiedOn: new Date() })
      .where(eq(organisations.id, organisationId));

    return res.json({
      success: true,
      customDomain,
      dnsTarget,
      txtVerificationToken: txtToken,
      message:
        '커스텀 도메인이 등록됐습니다. DNS 레코드 설정 후 인증을 진행해 주세요.',
    });
  } catch (err) {
    console.error('[PUT /domain/custom]', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 10 — GET /domain/dns-instructions : DNS 레코드 설정 안내
// ─────────────────────────────────────────────────────────────
router.get('/domain/dns-instructions', authenticate, async (req, res) => {
  try {
    const organisationId = req.tenantId;

    const [org] = await db
      .select()
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);

    const [cfg] = await db
      .select()
      .from(domainConfigs)
      .where(
        and(
          eq(domainConfigs.organisationId, organisationId),
          eq(domainConfigs.domainType, 'custom'),
          eq(domainConfigs.status, 'Active')
        )
      )
      .limit(1);

    if (!cfg) {
      return res.status(404).json({
        message: '등록된 커스텀 도메인이 없습니다.',
      });
    }

    return res.json({
      subdomain: {
        description:
          '서브도메인은 Edubee가 자동으로 관리합니다. 별도 DNS 설정이 필요하지 않습니다.',
        currentUrl: org?.subdomain
          ? `${org.subdomain}.edubee.com`
          : null,
      },
      customDomain: {
        domain: cfg.domainValue,
        cnameRecord: {
          type: 'CNAME',
          host: '@',             // 루트 도메인 또는 서브도메인 부분
          value: cfg.dnsTarget,
          ttl: 3600,
        },
        txtRecord: {
          type: 'TXT',
          host: '_edubee-verify',
          value: cfg.txtVerificationToken,
          ttl: 3600,
        },
        providerGuides: {
          cloudflare:
            'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
          godaddy:
            'https://www.godaddy.com/help/add-a-cname-record-19236',
          namecheap:
            'https://www.namecheap.com/support/knowledgebase/article.aspx/9646/',
          route53:
            'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html',
          crazyDomains: 'https://www.crazydomains.com.au/help/cname-records/',
          melbourneIT:  'https://help.melbourneit.com.au',
        },
        propagationNote:
          'DNS 변경 사항이 전 세계에 전파되는 데 최대 48시간이 소요될 수 있습니다.',
      },
    });
  } catch (err) {
    console.error('[GET /domain/dns-instructions]', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 11 — POST /domain/custom/verify : DNS 인증 실행
// ─────────────────────────────────────────────────────────────
router.post('/domain/custom/verify', authenticate, async (req, res) => {
  try {
    const organisationId = req.tenantId;

    const [cfg] = await db
      .select()
      .from(domainConfigs)
      .where(
        and(
          eq(domainConfigs.organisationId, organisationId),
          eq(domainConfigs.domainType, 'custom'),
          eq(domainConfigs.status, 'Active')
        )
      )
      .limit(1);

    if (!cfg) {
      return res.status(404).json({ message: '등록된 커스텀 도메인이 없습니다.' });
    }

    const now = new Date();

    // TXT 레코드 조회
    let txtVerified = false;
    try {
      const txtRecords = await dns.resolveTxt(
        `_edubee-verify.${cfg.domainValue}`
      );
      txtVerified = txtRecords.some((record) =>
        record.join('').includes(cfg.txtVerificationToken ?? '')
      );
    } catch {
      txtVerified = false;
    }

    // CNAME 레코드 조회
    let cnameVerified = false;
    try {
      const cnameRecords = await dns.resolveCname(cfg.domainValue);
      cnameVerified = cnameRecords.some((r) =>
        r.includes(cfg.dnsTarget ?? '')
      );
    } catch {
      cnameVerified = false;
    }

    const verified = txtVerified && cnameVerified;
    const newAttempts = (cfg.checkAttempts ?? 0) + 1;

    // domain_configs 상태 업데이트
    await db
      .update(domainConfigs)
      .set({
        verificationStatus: verified ? 'verified' : 'failed',
        verifiedAt: verified ? now : null,
        sslStatus: verified ? 'issuing' : 'pending',
        checkAttempts: newAttempts,
        lastCheckedAt: now,
        errorMessage: verified
          ? null
          : `TXT: ${txtVerified ? '확인됨' : '미확인'}  CNAME: ${cnameVerified ? '확인됨' : '미확인'}`,
        modifiedOn: now,
      })
      .where(eq(domainConfigs.id, cfg.id));

    // 인증 성공 시 organisations도 업데이트
    if (verified) {
      await db
        .update(organisations)
        .set({
          dnsVerified: true,
          domainVerifiedAt: now,
          modifiedOn: now,
        })
        .where(eq(organisations.id, organisationId));
    }

    return res.json({
      success: verified,
      verificationStatus: verified ? 'verified' : 'failed',
      txtVerified,
      cnameVerified,
      checkAttempts: newAttempts,
      checkedAt: now,
      message: verified
        ? '도메인 인증이 완료됐습니다. SSL 인증서 발급을 진행합니다.'
        : 'DNS 레코드를 확인할 수 없습니다. 설정 후 최대 48시간이 소요될 수 있습니다.',
    });
  } catch (err) {
    console.error('[POST /domain/custom/verify]', err);
    return res.status(500).json({ message: 'DNS 조회 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 12 — GET /domain/custom/status : 인증·SSL 상태 폴링
// ─────────────────────────────────────────────────────────────
router.get('/domain/custom/status', authenticate, async (req, res) => {
  try {
    const organisationId = req.tenantId;

    const [cfg] = await db
      .select()
      .from(domainConfigs)
      .where(
        and(
          eq(domainConfigs.organisationId, organisationId),
          eq(domainConfigs.domainType, 'custom'),
          eq(domainConfigs.status, 'Active')
        )
      )
      .limit(1);

    if (!cfg) {
      return res.status(404).json({
        message: '등록된 커스텀 도메인이 없습니다.',
      });
    }

    return res.json({
      domain:             cfg.domainValue,
      verificationStatus: cfg.verificationStatus,
      verifiedAt:         cfg.verifiedAt,
      sslStatus:          cfg.sslStatus,
      sslIssuedAt:        cfg.sslIssuedAt,
      sslExpiresAt:       cfg.sslExpiresAt,
      lastCheckedAt:      cfg.lastCheckedAt,
      checkAttempts:      cfg.checkAttempts,
      errorMessage:       cfg.errorMessage,
    });
  } catch (err) {
    console.error('[GET /domain/custom/status]', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 13 — DELETE /domain/custom : 커스텀 도메인 제거
// ─────────────────────────────────────────────────────────────
router.delete('/domain/custom', authenticate, async (req, res) => {
  try {
    const organisationId = req.tenantId;

    // domain_configs Soft Delete
    await db
      .update(domainConfigs)
      .set({ status: 'Inactive', modifiedOn: new Date() })
      .where(
        and(
          eq(domainConfigs.organisationId, organisationId),
          eq(domainConfigs.domainType, 'custom')
        )
      );

    // organisations 도메인 관련 필드 초기화
    await db
      .update(organisations)
      .set({
        customDomain:     null,
        dnsVerified:      false,
        domainVerifiedAt: null,
        sslStatus:        'pending',
        modifiedOn:       new Date(),
      })
      .where(eq(organisations.id, organisationId));

    return res.json({
      success: true,
      message: '커스텀 도메인이 제거됐습니다.',
    });
  } catch (err) {
    console.error('[DELETE /domain/custom]', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});
```

---

## 📋 Step 3: TypeScript 검증

6개 모두 추가 완료 후:
```bash
npx tsc --noEmit
```

오류 발생 시 패턴별 해결:

| 오류 패턴 | 해결 방법 |
|-----------|-----------|
| `domainConfigs` not found | 스키마 파일에서 import 경로 확인 후 추가 |
| `ne` is not defined | `import { eq, and, ne } from 'drizzle-orm'` 에 `ne` 추가 |
| `dns` is not defined | 파일 상단에 `import dns from 'dns/promises'` 추가 |
| `dnsVerified` does not exist | 스키마 파일에서 실제 컬럼명 확인 후 수정 |
| `domainVerifiedAt` does not exist | 스키마 파일에서 실제 컬럼명 확인 후 수정 |

---

## 📋 Step 4: 서버 재시작 후 API 검증

유효한 `X-Organisation-Id` 헤더로 아래 순서로 테스트:

```
1. PUT  /api/settings/domain/subdomain
   body: { "subdomain": "testcrm" }
   기대: 200 { success: true, fullDomain: "testcrm.edubee.com" }

2. PUT  /api/settings/domain/subdomain
   body: { "subdomain": "admin" }
   기대: 400 { reason: "reserved" }

3. PUT  /api/settings/domain/custom
   body: { "customDomain": "crm.myagency.com.au" }
   기대: 200 { success: true, txtVerificationToken: "edubee-verify-..." }
        또는 403 (starter 플랜인 경우)

4. GET  /api/settings/domain/dns-instructions
   기대: 200 { cnameRecord: {...}, txtRecord: {...} }

5. POST /api/settings/domain/custom/verify
   기대: 200 { verificationStatus: "failed", txtVerified: false, cnameVerified: false }
        (실제 DNS 미설정이므로 failed 정상)

6. GET  /api/settings/domain/custom/status
   기대: 200 { verificationStatus: "failed", checkAttempts: 1, ... }

7. DELETE /api/settings/domain/custom
   기대: 200 { success: true }
```

---

## ✅ 완료 보고 형식

```
✅ Fix 8~13 완료

수정 파일:
  - /server/src/routes/settings.ts

추가된 엔드포인트:
  ✅ Fix 8:  PUT    /api/settings/domain/subdomain
  ✅ Fix 9:  PUT    /api/settings/domain/custom
  ✅ Fix 10: GET    /api/settings/domain/dns-instructions
  ✅ Fix 11: POST   /api/settings/domain/custom/verify
  ✅ Fix 12: GET    /api/settings/domain/custom/status
  ✅ Fix 13: DELETE /api/settings/domain/custom

검증:
  - TypeScript: 오류 0개
  - 서버 기동: 정상
  - API 응답: [각 엔드포인트 결과]

다음 작업:
  - Fix 14~15: 로고/파비콘 업로드 (POST /settings/branding/logo·favicon)
  - Fix 16: SuperAdminGuard 프론트엔드 가드
  - Fix 17: 예약어 차단 목록 유틸 파일 분리
```
