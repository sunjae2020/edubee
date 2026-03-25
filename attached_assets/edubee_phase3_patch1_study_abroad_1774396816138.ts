// ============================================================
// Edubee CRM — Phase 3 패치 #1
// 파일: /server/src/routes/services-study-abroad.ts
// 목적: programContext = 'study_abroad' 필터 추가
//       (camp 레코드가 Study Abroad 목록에 노출되는 문제 해결)
// ============================================================
// 적용 방법:
//   아래 PATCH 항목을 찾아 해당 위치의 코드를 교체하세요.
//   "찾을 코드" → "교체할 코드" 방식으로 설명합니다.
//   총 4곳 수정 (visa-alerts / 목록 / 상세 / 생성)
// ============================================================


// ============================================================
// PATCH 1-A: visa-alerts — programContext 필터 추가
// ============================================================

// 【찾을 코드】 (visa-alerts의 WHERE 절)
/*
  where(
    and(
      isNotNull(studyAbroadMgt.visaExpiryDate),
      lte(studyAbroadMgt.visaExpiryDate, thirtyDaysFromNow),
      gte(studyAbroadMgt.visaExpiryDate, today)
    )
  )
*/

// 【교체할 코드】
/*
  where(
    and(
      isNotNull(studyAbroadMgt.visaExpiryDate),
      lte(studyAbroadMgt.visaExpiryDate, thirtyDaysFromNow),
      gte(studyAbroadMgt.visaExpiryDate, today),
      eq(studyAbroadMgt.programContext, 'study_abroad')  // ← 추가
    )
  )
*/


// ============================================================
// PATCH 1-B: 목록 조회 — programContext 필터 추가
// ============================================================
// 위치: GET /services/study-abroad 핸들러의 WHERE 절
// SELECT_COLS 변경 없음 — WHERE 조건만 추가

// 【찾을 코드】
// 패턴 A — conditions 배열을 쌓는 방식일 경우:
/*
  const conditions = [];

  if (applicationStage) {
    conditions.push(eq(studyAbroadMgt.applicationStage, applicationStage));
  }
  if (status) {
    conditions.push(eq(studyAbroadMgt.status, status));
  }
  if (search) {
    conditions.push(
      // search 조건...
    );
  }
*/

// 【교체할 코드】 — 배열 초기화 시 programContext 필터를 기본값으로 추가
/*
  const conditions = [
    eq(studyAbroadMgt.programContext, 'study_abroad')  // ← 추가: camp 제외
  ];

  if (applicationStage) {
    conditions.push(eq(studyAbroadMgt.applicationStage, applicationStage));
  }
  if (status) {
    conditions.push(eq(studyAbroadMgt.status, status));
  }
  if (search) {
    conditions.push(
      // search 조건... (기존 유지)
    );
  }
*/

// ※ 패턴 B — and() 를 직접 사용하는 방식일 경우:
// 【찾을 코드】
/*
  .where(
    and(
      applicationStage ? eq(studyAbroadMgt.applicationStage, applicationStage) : undefined,
      status ? eq(studyAbroadMgt.status, status) : undefined,
      // ...
    )
  )
*/
// 【교체할 코드】
/*
  .where(
    and(
      eq(studyAbroadMgt.programContext, 'study_abroad'),  // ← 추가
      applicationStage ? eq(studyAbroadMgt.applicationStage, applicationStage) : undefined,
      status ? eq(studyAbroadMgt.status, status) : undefined,
      // ...
    )
  )
*/


// ============================================================
// PATCH 1-C: 상세 조회 — programContext 필터 추가
// ============================================================
// 위치: GET /services/study-abroad/:id 핸들러

// 【찾을 코드】
/*
  .where(eq(studyAbroadMgt.id, id))
*/

// 【교체할 코드】
/*
  .where(
    and(
      eq(studyAbroadMgt.id, id),
      eq(studyAbroadMgt.programContext, 'study_abroad')  // ← 추가: camp 레코드 직접 접근 차단
    )
  )
*/

// ※ PATCH (:id) 핸들러도 동일하게 적용
// 【찾을 코드】
/*
  .where(eq(studyAbroadMgt.id, id))
*/
// 【교체할 코드】
/*
  .where(
    and(
      eq(studyAbroadMgt.id, id),
      eq(studyAbroadMgt.programContext, 'study_abroad')  // ← 추가
    )
  )
*/


// ============================================================
// PATCH 1-D: 생성 — programContext 기본값 명시
// ============================================================
// 위치: POST /services/study-abroad 핸들러의 insert 구문

// 【찾을 코드】
/*
  await db.insert(studyAbroadMgt).values({
    contractId,
    leadId,
    assignedStaffId,
    applicationStage,
    // ... 기타 필드들
    status: status || 'pending',
  });
*/

// 【교체할 코드】
/*
  await db.insert(studyAbroadMgt).values({
    contractId,
    leadId,
    assignedStaffId,
    applicationStage,
    // ... 기타 필드들
    status: status || 'pending',
    programContext: 'study_abroad',  // ← 추가: 일반 유학으로 명시
  });
*/


// ============================================================
// PATCH 1-E: SELECT_COLS에 신규 필드 추가 (옵션 — UI 필요시)
// ============================================================
// 현재 SELECT_COLS에 programContext가 없으므로
// 프론트에서 컨텍스트 확인이 필요하면 추가

// 【찾을 코드】 SELECT_COLS 객체 마지막 필드 근처
/*
  updatedAt: studyAbroadMgt.updatedAt,
*/

// 【교체할 코드】
/*
  updatedAt: studyAbroadMgt.updatedAt,
  programContext: studyAbroadMgt.programContext,  // ← 추가 (옵션)
*/


// ============================================================
// 적용 후 검증 쿼리
// ============================================================
/*
-- Study Abroad 목록에 camp 레코드가 없는지 확인
-- (API 응답 확인용 DB 쿼리)
SELECT program_context, COUNT(*)
FROM study_abroad_mgt
GROUP BY program_context;

-- API 테스트
-- GET /api/services/study-abroad
-- 응답에 program_context = 'camp' 인 레코드가 없어야 함
*/


// ============================================================
// 완료 보고 형식
// ============================================================
/*
✅ 수정된 파일: /server/src/routes/services-study-abroad.ts
✅ 수정 내용:
   - visa-alerts: programContext = 'study_abroad' 필터 추가
   - 목록 조회: programContext 기본 필터 추가
   - 상세/수정 조회: programContext = 'study_abroad' AND id 조건
   - 생성: programContext = 'study_abroad' 기본값 명시
✅ 검증 결과: [tsc / 서버 / DB / API 각각 결과 기입]
⚠️  다음 할 작업: packages.ts 패치 적용 (Phase 3 패치 #2)
*/
