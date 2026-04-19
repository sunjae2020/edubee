# 🐝 Edubee CRM — 문서 자동 추출 프롬프트 모음

> 기존 Replit 코드를 분석해서 `_context / _rules / _schema / _design / _workflows / _test` 문서를 역으로 생성하기 위한 프롬프트 모음입니다.
> 각 프롬프트를 **순서대로** Replit AI에 입력하세요.

---

## ⚠️ 사용 전 필수 안내

- 각 프롬프트는 **읽기 전용 분석**입니다. 코드를 수정하지 않습니다.
- 한 번에 하나씩 실행하고 결과를 확인 후 다음으로 넘어가세요.
- 생성된 문서는 `_context/`, `_rules/` 등 해당 폴더에 저장하세요.

---

---

# 📁 STEP 1 — `_context/` 문서 생성

---

## [PROMPT 1-1] PROJECT_OVERVIEW.md 생성

```
지금부터 코드를 수정하지 말고, 프로젝트 전체를 분석해서 문서만 작성해줘.

아래 파일들을 읽고 분석해:
- package.json (루트, client, server 모두)
- .replit 또는 replit.nix
- vite.config.ts
- tsconfig.json
- .env.example 또는 .env (값은 가리고 키 이름만)
- 디렉토리 전체 트리 구조

분석 후 아래 내용을 포함한 PROJECT_OVERVIEW.md 를 작성해줘:

1. 프로젝트명 및 목적 (1~2줄 요약)
2. 현재 개발 단계 (Beta/MVP 등 코드에서 유추)
3. 기술 스택 전체 목록
   - Frontend: 프레임워크, UI 라이브러리, 상태관리, 라우팅
   - Backend: 런타임, 프레임워크, ORM, 인증방식
   - Database: DB 종류, 마이그레이션 도구
   - 외부 서비스: 이메일, 스토리지, 결제 등 (env key 기준)
4. 폴더 구조 설명 (2단계까지)
5. 실행 방법 (dev / build / start 스크립트)
6. Replit 환경 특이사항 (포트, 환경변수 주의사항 등)

마크다운 형식으로 작성하고, 추측이 필요한 항목은 "(추정)" 표시를 붙여줘.
```

---

## [PROMPT 1-2] GLOSSARY.md 생성

```
코드를 수정하지 말고, 용어 사전 문서만 작성해줘.

아래 파일들을 읽어:
- /db/schema.ts (또는 Drizzle 스키마 파일 전체)
- /server/src/routes/ 폴더 전체
- /client/src/pages/ 폴더 전체
- /client/src/components/ 폴더 전체

분석 후 GLOSSARY.md 를 작성해줘. 포함할 내용:

1. 도메인 용어 정의 테이블
   | 용어(한국어) | 영어/코드명 | 설명 | 관련 테이블/컴포넌트 |
   형식으로 작성. 아래 항목 반드시 포함:
   - Lead, Quote, Contract, Invoice, Transaction, Receipt
   - EC, BK, MGR, ADMIN (역할 약자)
   - AR, AP, Commission, Cost Center
   - Account, Contact, Product, ProductType

2. DB 컬럼명 ↔ 화면 레이블 매핑 테이블
   (스키마에서 컬럼명을 읽고, 화면 컴포넌트에서 실제 label을 찾아 매핑)
   | DB 컬럼명 | 화면 표시 레이블 | 테이블명 |

3. API 경로명 ↔ 기능 설명 매핑
   | API 경로 | 메서드 | 기능 설명 |

추측이 필요한 항목은 "(추정)" 표시를 붙여줘.
```

---

## [PROMPT 1-3] USER_ROLES.md 생성

```
코드를 수정하지 말고, 사용자 역할 및 권한 문서만 작성해줘.

아래 파일들을 읽어:
- /db/schema.ts (users, roles, permissions 관련 테이블)
- /server/src/middleware/ 폴더 (인증/권한 미들웨어)
- /server/src/routes/ 폴더 (각 라우트의 권한 체크 코드)
- /client/src/pages/ 폴더 (역할별 조건부 렌더링 코드)

분석 후 USER_ROLES.md 를 작성해줘. 포함할 내용:

1. 역할 목록 및 설명
   (코드에서 발견된 모든 role 값 나열)

2. 역할별 권한 매트릭스
   | 역할 | 메뉴/기능 | 조회 | 추가 | 수정 | 삭제 |
   형식으로 코드에서 발견된 권한 체크를 기반으로 작성

3. 인증 방식 설명
   - JWT 구조 (payload에 포함된 필드)
   - 토큰 만료 시간
   - 미들웨어 동작 방식

4. 현재 미구현이거나 TODO로 표시된 권한 항목

5. SaaS 멀티테넌트 확장 시 변경이 필요한 부분 (추정)

마크다운 형식으로 작성해줘.
```

---

## [PROMPT 1-4] CURRENT_STATUS.md 생성

```
코드를 수정하지 말고, 현재 구현 상태 문서만 작성해줘.

아래를 분석해:
- /client/src/pages/ 폴더 전체 (파일 목록 + 각 파일의 주요 기능 파악)
- /server/src/routes/ 폴더 전체 (API 엔드포인트 목록)
- 코드 내 TODO, FIXME, HACK, NOTE 주석 전체 검색
- console.error, console.warn 이 있는 곳 (임시 처리 가능성)
- 아직 연결 안 된 버튼이나 비어있는 핸들러 함수

분석 후 CURRENT_STATUS.md 를 작성해줘. 포함할 내용:

1. 구현 완료 기능 목록 ✅
   (실제 API + UI 모두 연결된 기능)

2. 부분 구현 기능 목록 🔶
   (UI만 있거나 API만 있거나, 데이터 연결 미완)

3. 미구현 기능 목록 ❌
   (TODO 주석, 빈 핸들러, placeholder 데이터 사용 중인 것)

4. 알려진 버그 및 임시 해결책 목록
   (FIXME 주석, 하드코딩된 값, 예외처리 없는 곳)

5. 다음 작업 권장 우선순위 (코드 상태 기반)

각 항목에 파일 경로와 줄 번호를 명시해줘.
```

---

---

# 📁 STEP 2 — `_schema/` 문서 생성

---

## [PROMPT 2-1] DB_SCHEMA_OVERVIEW.md 생성

```
코드를 수정하지 말고, DB 스키마 분석 문서만 작성해줘.

/db/schema.ts 파일(또는 Drizzle 스키마 파일 전체)을 읽고
DB_SCHEMA_OVERVIEW.md 를 작성해줘. 포함할 내용:

1. 전체 테이블 목록
   | 테이블명 | 설명 | 주요 필드 | 관련 테이블 |

2. ERD 핵심 관계 요약 (텍스트 형식)
   - 1:N 관계
   - M:N 관계 (중간 테이블 포함)
   - self-join 테이블

3. 코어 파이프라인 관련 테이블 흐름
   Lead → Quote → Contract → Invoice → Transaction → Receipt
   각 단계에서 생성되는 테이블과 FK 연결 관계

4. Soft Delete 처리 방식
   (deleted_at, is_deleted, status 등 어떤 패턴을 쓰는지)

5. 공통 필드 패턴
   (created_at, updated_at, owner_id, tenant_id 등
    모든 테이블에 공통으로 있는 필드)

6. 인덱스가 필요하지만 누락된 것으로 보이는 컬럼 (성능 관점)

마크다운 테이블 형식으로 정리해줘.
```

---

## [PROMPT 2-2] API_ENDPOINTS.md 생성

```
코드를 수정하지 말고, API 엔드포인트 목록 문서만 작성해줘.

/server/src/routes/ 폴더 전체를 읽고
API_ENDPOINTS.md 를 작성해줘. 포함할 내용:

1. 전체 API 엔드포인트 목록
   | 메서드 | 경로 | 설명 | 인증 필요 | 필요 역할 | 요청 Body 주요 필드 | 응답 주요 필드 |

2. 인증 방식
   - Bearer Token 위치 (Header 키 이름)
   - 토큰 갱신 방식

3. 에러 응답 형식
   (공통 에러 응답 구조가 있으면 추출)

4. 페이지네이션 방식
   (query params 이름, 응답 형식)

5. 파일 업로드 엔드포인트 (있는 경우)

6. 아직 구현되지 않은 TODO 엔드포인트

마크다운 형식으로 작성하고, 라우트 파일별로 섹션을 나눠줘.
```

---

## [PROMPT 2-3] DRIZZLE_PATTERNS.md 생성

```
코드를 수정하지 말고, Drizzle ORM 패턴 분석 문서만 작성해줘.

/server/src/routes/ 와 /server/src/ 전체를 읽고
DRIZZLE_PATTERNS.md 를 작성해줘. 포함할 내용:

1. 실제 코드에서 추출한 자주 쓰는 쿼리 패턴
   - 단순 SELECT (where, orderBy)
   - JOIN 패턴 (어떤 테이블끼리 JOIN하는지)
   - INSERT + returning
   - UPDATE (부분 업데이트 패턴)
   - Soft Delete 처리
   - 트랜잭션 처리 (db.transaction 사용 예시)

2. 현재 코드에서 발견된 쿼리 최적화 문제점
   (N+1 쿼리, 불필요한 전체 컬럼 SELECT 등)

3. 현재 프로젝트에서 사용 중인 Drizzle 버전 및 설정

4. 멀티테넌트 SaaS 전환 시 수정이 필요한 쿼리 패턴
   (tenant_id 필터 추가가 필요한 쿼리 목록)

실제 코드 스니펫을 예시로 포함해서 작성해줘.
```

---

---

# 📁 STEP 3 — `_design/` 문서 생성

---

## [PROMPT 3-1] DESIGN_SYSTEM.md 생성

```
코드를 수정하지 말고, 디자인 시스템 분석 문서만 작성해줘.

아래 파일들을 읽어:
- tailwind.config.ts 또는 tailwind.config.js
- /client/src/index.css 또는 globals.css
- /client/src/components/ui/ 폴더 전체 (shadcn 컴포넌트)
- /client/src/components/ 폴더 전체 (공통 컴포넌트)

분석 후 DESIGN_SYSTEM.md 를 작성해줘. 포함할 내용:

1. 컬러 시스템
   - CSS 변수 전체 목록 (--primary, --secondary 등)
   - 실제 사용 중인 Tailwind 커스텀 컬러
   - 브랜드 컬러 추정값

2. 타이포그래피
   - 사용 중인 폰트
   - 폰트 사이즈 스케일

3. 공통 컴포넌트 목록
   | 컴포넌트명 | 파일 경로 | 주요 Props | 사용 예시 |

4. shadcn/ui 사용 중인 컴포넌트 목록

5. 반응형 브레이크포인트 (Tailwind 기준)

6. 컴포넌트 네이밍 패턴
   (현재 코드에서 발견된 패턴)

7. 아이콘 라이브러리 및 사용 패턴

마크다운 형식으로 작성해줘.
```

---

## [PROMPT 3-2] PAGE_LAYOUTS.md 생성

```
코드를 수정하지 말고, 페이지 레이아웃 분석 문서만 작성해줘.

아래 파일들을 읽어:
- /client/src/App.tsx 또는 라우팅 설정 파일
- /client/src/components/layout/ 폴더 (있는 경우)
- /client/src/pages/ 폴더 전체 (파일 목록과 레이아웃 구조)
- 사이드바, 헤더, 푸터 관련 컴포넌트

분석 후 PAGE_LAYOUTS.md 를 작성해줘. 포함할 내용:

1. 전체 페이지 목록 및 라우팅 구조
   | 경로 | 컴포넌트명 | 레이아웃 타입 | 인증 필요 | 접근 가능 역할 |

2. 레이아웃 타입별 설명
   (예: 인증 레이아웃 / 대시보드 레이아웃 / 풀스크린 레이아웃 등)

3. 사이드바 Navigation 구조
   - 메뉴 항목 전체 목록
   - 역할별 메뉴 노출 조건
   - 현재 활성 메뉴 표시 방법

4. 공통 레이아웃 컴포넌트 목록
   (Header, Sidebar, Breadcrumb, Footer 등)

5. 모달/다이얼로그 패턴
   (현재 사용 중인 모달 열기/닫기 방식)

마크다운 형식으로 작성해줘.
```

---

## [PROMPT 3-3] COLOR_STATUS_CODES.md 생성

```
코드를 수정하지 말고, 상태 컬러 코드 문서만 작성해줘.

아래를 검색해:
- /client/src/ 전체에서 Badge, Chip, Tag, Status 관련 컴포넌트
- 상태값(status)에 따라 색상이 바뀌는 모든 코드
- "Active", "Inactive", "Pending", "Completed" 등 상태 문자열이 있는 파일

분석 후 COLOR_STATUS_CODES.md 를 작성해줘. 포함할 내용:

1. 엔티티별 상태 코드 & 컬러 매핑
   | 엔티티 | 상태값 | 배경색 | 텍스트색 | Tailwind 클래스 |
   아래 엔티티 반드시 포함:
   - Lead Status
   - Task Status
   - Quote Status
   - Contract Status
   - Invoice Status
   - Transaction Status
   - Payment Status

2. 시스템 공통 컬러 코드
   - 성공 / 경고 / 오류 / 정보 색상

3. 현재 하드코딩된 색상 목록
   (inline style이나 직접 hex 코드를 사용하는 곳)

4. 상태값 한국어 ↔ 영어 ↔ DB 값 매핑 테이블

마크다운 형식으로 작성해줘.
```

---

---

# 📁 STEP 4 — `_templates/` 문서 생성

---

## [PROMPT 4-1] 코드 패턴 템플릿 추출

```
코드를 수정하지 말고, 반복 패턴을 분석해서 템플릿 문서를 작성해줘.

/server/src/routes/ 와 /client/src/pages/ 를 읽고
가장 많이 반복되는 코드 패턴 5개를 찾아서
CODE_PATTERNS.md 를 작성해줘. 포함할 내용:

1. API 라우트 표준 패턴
   (실제 코드에서 추출한 가장 깔끔한 예시 1개)
   - 인증 미들웨어 적용 위치
   - Zod 유효성 검사 패턴
   - 에러 응답 형식
   - 성공 응답 형식

2. React 페이지 표준 패턴
   (실제 코드에서 추출한 가장 깔끔한 예시 1개)
   - useQuery 데이터 패칭 패턴
   - useMutation 데이터 변경 패턴
   - 로딩/에러 상태 처리

3. Form + 유효성검사 패턴
   (실제 코드에서 추출한 가장 깔끔한 예시 1개)

4. 현재 코드에서 일관성이 없는 패턴 목록
   (같은 기능을 다른 방식으로 구현한 경우 목록)

5. 개선이 필요한 안티패턴 목록
   (try-catch 없는 async, any 타입 남용 등)

각 패턴에 파일 경로와 예시 코드를 포함해줘.
```

---

---

# 📁 STEP 5 — `_workflows/` 문서 생성

---

## [PROMPT 5-1] CORE_PIPELINE.md 생성

```
코드를 수정하지 말고, 핵심 비즈니스 파이프라인 문서만 작성해줘.

아래 파일들을 읽어:
- /db/schema.ts (leads, quotes, contracts, invoices, transactions 테이블)
- /server/src/routes/ 전체
- /client/src/pages/ 에서 Lead, Quote, Contract, Invoice, Transaction 관련 페이지

분석 후 CORE_PIPELINE.md 를 작성해줘. 포함할 내용:

1. 현재 구현된 파이프라인 단계
   (코드에 실제로 존재하는 것만)
   Lead → Quote → Contract → Invoice → Transaction → Receipt
   각 단계별:
   - 생성 API 경로
   - 필수 입력 필드
   - 다음 단계 이동 트리거 조건
   - 자동 생성되는 연관 데이터

2. 각 단계의 상태 전이 다이어그램 (텍스트 형식)
   (예: Lead: New → In Progress → Converted → Lost)

3. 현재 코드에서 자동화된 처리 목록
   (트리거, 이벤트, 자동 생성 로직)

4. 미구현 파이프라인 단계
   (코드에 없지만 비즈니스상 필요한 것)

5. 파이프라인 변경 시 영향을 받는 파일 목록
   (이 부분은 절대 건드리면 안 된다는 경고 목록)

마크다운 형식으로 작성해줘.
```

---

## [PROMPT 5-2] FINANCE_WORKFLOW.md 생성

```
코드를 수정하지 말고, 재무 처리 워크플로우 문서만 작성해줘.

아래를 읽어:
- /db/schema.ts (transactions, invoices, receipts, cost_centers 관련)
- /server/src/routes/ 에서 finance, transaction, invoice, payment 관련 파일
- 커미션 계산 관련 코드

분석 후 FINANCE_WORKFLOW.md 를 작성해줘. 포함할 내용:

1. Transaction 생성 흐름
   - Credit 생성 프로세스 (학생 입금)
   - Debit 생성 프로세스 (학교 송금)
   - AR/AP 처리 방식 (코드에서 발견된 것만)

2. Invoice 자동 발행 로직
   (due_date 기반 자동 발행이 구현되어 있는지 확인)

3. 커미션 계산 로직
   - 계산 공식 (코드에서 추출)
   - 관련 테이블 및 필드

4. Cost Center 분류 방식

5. Receipt 자동 발행 조건

6. 현재 미구현된 재무 기능 목록

각 항목에 관련 파일 경로를 명시해줘.
```

---

## [PROMPT 5-3] PERMISSION_MATRIX.md 생성

```
코드를 수정하지 말고, 권한 매트릭스 문서만 작성해줘.

아래를 읽어:
- /server/src/middleware/ (인증/권한 관련 파일 전체)
- /server/src/routes/ 전체 (각 라우트의 권한 체크 코드)
- /client/src/pages/ 전체 (역할 조건부 렌더링 코드)
- /client/src/ 에서 useAuth, useRole, hasPermission 등 권한 관련 훅

분석 후 PERMISSION_MATRIX.md 를 작성해줘. 포함할 내용:

1. 역할 × 기능 × CRUD 전체 매트릭스
   (코드에서 발견된 실제 권한 체크 기반)
   | 기능/메뉴 | Super Admin | Admin | EC | BK | MGR | 읽기전용 |

2. 현재 권한 체크가 누락된 API 엔드포인트 목록
   (미들웨어 없이 열려 있는 라우트)

3. 프론트엔드 vs 백엔드 권한 체크 불일치 항목
   (프론트에서는 막혀있지만 API는 열려있는 경우 등)

4. Role Switcher 구현 여부 및 코드 위치

5. 멀티테넌트 전환 시 권한 체계 변경 필요 사항

파일 경로와 줄 번호를 포함해서 작성해줘.
```

---

---

# 📁 STEP 6 — `_rules/` 문서 생성

---

## [PROMPT 6-1] REGRESSION_LOG.md 생성 (위험 파일 목록)

```
코드를 수정하지 말고, 변경 시 위험한 파일 목록 문서를 작성해줘.

아래를 분석해:
- /db/schema.ts (모든 테이블에서 참조되는 핵심 필드)
- /server/src/middleware/ (인증 관련)
- 가장 많은 파일에서 import되는 파일 목록
- 트랜잭션 처리 코드
- 환경변수를 직접 사용하는 파일

분석 후 REGRESSION_LOG.md 를 작성해줘. 포함할 내용:

1. 절대 수정하면 안 되는 파일 목록 🔴
   (수정 시 전체 시스템에 영향을 주는 파일)
   각 파일마다: 이유, 영향 범위, 수정 시 반드시 확인할 사항

2. 수정 시 주의가 필요한 파일 목록 🟠
   (특정 모듈에 영향을 주는 파일)

3. "이 파일 수정 시 여기도 같이 확인해야 한다" 의존성 맵
   | 수정 파일 | 함께 확인할 파일 | 이유 |

4. 현재 알려진 사이드 이펙트 이력
   (TODO/FIXME 주석에서 발견된 과거 문제들)

5. 환경변수 변경 시 영향을 받는 파일 목록

파일 경로를 정확히 명시해줘.
```

---

---

# 📁 STEP 7 — `_test/` 문서 생성

---

## [PROMPT 7-1] FEATURE_TEST_CASES.md 생성

```
코드를 수정하지 말고, 기능 테스트 케이스 문서를 작성해줘.

아래를 읽어:
- /client/src/pages/ 전체 (구현된 UI 기능)
- /server/src/routes/ 전체 (API 엔드포인트)
- 기존 테스트 파일 (*.test.ts, *.spec.ts) 있으면 포함

분석 후 FEATURE_TEST_CASES.md 를 작성해줘. 포함할 내용:

1. 핵심 파이프라인 시나리오 테스트
   Lead 생성 → Quote 작성 → Contract 체결 → Invoice 발행 → 입금 처리
   각 단계별 테스트 항목:
   - 정상 케이스
   - 오류 케이스 (필수값 누락, 잘못된 상태 전이 등)
   - 경계값 케이스

2. 역할별 권한 테스트 케이스
   | 테스트 항목 | 테스트 계정 | 기대 결과 |

3. 엣지 케이스 목록
   (현재 코드에서 처리가 불안한 경우)
   - 금액 0원, 음수
   - 날짜 역전 (시작일 > 종료일)
   - 미배정 상태 (owner 없는 레코드)
   - 동시 수정 충돌
   - 큰 숫자 (INT overflow 가능성)

4. API 응답 검증 체크리스트
   | API 경로 | 확인할 필드 | 기대 타입 | 기대 값 범위 |

5. 현재 테스트 커버리지 추정
   (테스트 파일이 없는 경우 "0%" 명시)

마크다운 형식으로 작성해줘.
```

---

---

# 🔄 STEP 8 — 최종 통합 검증

---

## [PROMPT 8-1] 문서 간 불일치 검증

```
코드를 수정하지 말고, 지금까지 작성된 문서들과 실제 코드 간의 불일치를 검증해줘.

아래를 교차 확인해:
- _context/GLOSSARY.md 의 테이블명 ↔ 실제 /db/schema.ts 테이블명
- _schema/API_ENDPOINTS.md 의 API 목록 ↔ 실제 /server/src/routes/ 의 엔드포인트
- _design/COLOR_STATUS_CODES.md 의 상태값 ↔ 실제 코드의 상태값
- _workflows/CORE_PIPELINE.md 의 흐름 ↔ 실제 DB 테이블 FK 관계

검증 결과를 VALIDATION_REPORT.md 로 작성해줘. 포함할 내용:

1. 불일치 항목 목록
   | 문서 | 문서 내용 | 실제 코드 | 수정 필요 문서 |

2. 문서에는 있지만 코드에 없는 항목 (미구현)

3. 코드에는 있지만 문서에 빠진 항목 (문서 누락)

4. 문서 업데이트 우선순위 추천

이 결과를 바탕으로 수정이 필요한 문서 목록을 알려줘.
코드는 절대 수정하지 마.
```

---

---

## 📌 프롬프트 실행 순서 요약

| 순서 | 프롬프트 | 생성 문서 | 소요 시간(추정) |
|------|----------|----------|---------------|
| 1 | STEP 1-1 | `_context/PROJECT_OVERVIEW.md` | 3분 |
| 2 | STEP 1-2 | `_context/GLOSSARY.md` | 5분 |
| 3 | STEP 1-3 | `_context/USER_ROLES.md` | 3분 |
| 4 | STEP 1-4 | `_context/CURRENT_STATUS.md` | 5분 |
| 5 | STEP 2-1 | `_schema/DB_SCHEMA_OVERVIEW.md` | 5분 |
| 6 | STEP 2-2 | `_schema/API_ENDPOINTS.md` | 5분 |
| 7 | STEP 2-3 | `_schema/DRIZZLE_PATTERNS.md` | 3분 |
| 8 | STEP 3-1 | `_design/DESIGN_SYSTEM.md` | 3분 |
| 9 | STEP 3-2 | `_design/PAGE_LAYOUTS.md` | 3분 |
| 10 | STEP 3-3 | `_design/COLOR_STATUS_CODES.md` | 2분 |
| 11 | STEP 4-1 | `_templates/CODE_PATTERNS.md` | 3분 |
| 12 | STEP 5-1 | `_workflows/CORE_PIPELINE.md` | 5분 |
| 13 | STEP 5-2 | `_workflows/FINANCE_WORKFLOW.md` | 4분 |
| 14 | STEP 5-3 | `_workflows/PERMISSION_MATRIX.md` | 4분 |
| 15 | STEP 6-1 | `_rules/REGRESSION_LOG.md` | 3분 |
| 16 | STEP 7-1 | `_test/FEATURE_TEST_CASES.md` | 5분 |
| 17 | STEP 8-1 | `_test/VALIDATION_REPORT.md` | 5분 |

**총 예상 소요 시간: 약 60~90분**

---

*© Edubee.Co. All Rights Reserved. 2026*
