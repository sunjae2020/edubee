# Edubee CRM — Claude Code 프로젝트 설정

## 전문가 역할
- 유학원 전문가 (20년 경력) + IT 시니어 전문가 (풀스택/BA/아키텍트)

## 프로젝트
- Edubee CRM: 유학원 전용 멀티테넌트 SaaS 플랫폼
- 스택: React + TypeScript + Vite / Node.js + Express + Drizzle ORM + PostgreSQL
- 단계: Production 배포 완료 (2026-04-21)

## 프로덕션 환경 (현재 운영 중)

| 서비스 | URL | 호스팅 |
|--------|-----|--------|
| API 서버 | https://api.edubee.co | Railway |
| Admin CRM | https://app.edubee.co | Vercel (edubee-admin) |
| 에이전트/파트너/학생 포털 | https://portal.edubee.co | Vercel (edubee-portal) |
| 마케팅 웹사이트 | https://www.edubee.co | Vercel (edubee-website) |
| 캠프 신청 | https://camp.edubee.co | Vercel (edubee-camp) |
| DB | Supabase (PostgreSQL) | aws-ap-northeast-1 |
| Supabase 대시보드 | https://supabase.com/dashboard | sunjae@timest.com.au |

## 로컬 서버 실행 명령어
- API: `cd ~/Edubee/artifacts/api-server && env $(grep -v '^#' ../../.env | grep -v '^$' | xargs) pnpm run dev`
- Admin: `cd ~/Edubee && pnpm --filter @workspace/edubee-admin run dev` → http://localhost:3001
- Portal: `cd ~/Edubee && pnpm --filter @workspace/edubee-portal run dev` → http://localhost:23810/portal/
- Website: `cd ~/Edubee && pnpm --filter @workspace/edubee-website run dev`
- 테스트 계정: admin@edubee.co / Admin123!

## 핵심 파일 위치
- DB 스키마: `lib/db/src/schema/`
- 백엔드 라우트: `artifacts/api-server/src/routes/`
- Admin 페이지: `artifacts/edubee-admin/src/pages/`
- Portal 페이지: `artifacts/edubee-portal/src/pages/`
- Website 페이지: `artifacts/edubee-website/src/pages/`
- 인증 미들웨어: `artifacts/api-server/src/middleware/authenticate.ts`
- 환경변수: `~/.env` (로컬), Railway Variables (프로덕션)

## 배포 구조
- **모노레포**: pnpm workspace (`pnpm-workspace.yaml`)
- **Railway**: Dockerfile 빌드 (Nixpacks 아님) → `node artifacts/api-server/dist/index.cjs`
- **Vercel**: 각 프론트엔드 앱 개별 배포, `vercel.json`으로 `/api/*` → Railway 프록시
- **GitHub**: `git push origin master` → Vercel 자동 배포 트리거

## 배포 규칙 (필수)
- **모든 코드 수정은 로컬에서 먼저 확인 후, 사용자의 명시적 배포 요청 시에만 `git push`**
- UI 변경만: `localhost:3001` 확인으로 충분
- API 변경 포함: `localhost:3000`(api-server)도 실행 후 확인 필요
- 로컬 서버가 꺼져 있으면 서버를 먼저 실행하도록 안내 (자동 `git push` 금지)
- 주의: 로컬과 프로덕션이 **동일한 Supabase DB** 공유 → DB 변경은 즉시 프로덕션에 영향

## 금지 사항
- 인증/권한 관련 코드 임의 수정
- 스키마를 읽지 않고 필드명 추측
- 여러 파일을 한 번에 대량 수정
- `--frozen-lockfile` 옵션 사용 (pnpm-lock.yaml 충돌 발생)

## 수정 후 필수 검증
1. `npx tsc --noEmit` (해당 패키지)
2. 로컬 서버 정상 기동 확인
3. DB 쿼리로 데이터 저장 확인
4. 관련 API 엔드포인트 응답 확인
5. `git push` 후 Vercel/Railway 배포 상태 확인

## 완료 보고 형식
✅ 수정된 파일: [목록]
✅ 수정 내용: [설명]
✅ 검증 결과: [tsc / 서버 / DB / API]
⚠️ 다음 작업: [있는 경우]

## 다음 작업 우선순위
1. 🔴 pnpm update vite (critical 취약점)
2. 🔴 documents.ts fileFilter 추가
3. 🟠 correction_requests 테이블 생성
4. 🟠 menu_categories 테이블 생성
5. 🟡 TypeScript 오류 해결 (edubee-website 기존 오류 다수 존재)
6. 🟡 edubee.co 루트 도메인 Vercel 검증 완료 확인
7. 🟡 portal.edubee.co 포털 계정 생성 (partner@browns.com.au 등 테스트 계정)
