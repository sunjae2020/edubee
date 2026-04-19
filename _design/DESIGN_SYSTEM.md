# DESIGN_SYSTEM.md — Edubee CRM 디자인 시스템

> 생성일: 2026-04-19 | 소스: index.css, tailwind config, components/ui/

---

## 1. 브랜드 컬러 시스템

### Edubee 기본 오렌지 팔레트 (`#F5821F`)
```css
/* 테넌트 브랜딩 오렌지 — applyThemeToDom()이 JS로 재정의 가능 */
--e-orange:      #F5821F   /* 메인 브랜드 컬러 */
--e-orange-dk:   #d26a10   /* Hover/Active 다크 */
--e-orange-lt:   #fef0e3   /* 배경/연한 강조 */
--e-orange-ring: rgba(245,130,31,0.15)  /* 포커스 링 */

--e-orange-50:   #fef0e3   /* 연한 배경 */
--e-orange-100:  #fde2c6   /* 경계선 */
--e-orange-200:  #fcc89d   /* 강조 배경 */
--e-orange-300:  #f9a664   /* 중간 */
--e-orange-400:  #f78d3a   /* 버튼 hover */
--e-orange-500:  #F5821F   /* Primary 기본 */
--e-orange-600:  #d26a10   /* 텍스트 강조 */
--e-orange-700:  #a85010   /* 헤더/제목 */
```

### 중성(Neutral) 팔레트
```css
--neutral-50:  #FAFAF9   /* 페이지 배경 */
--neutral-100: #F4F3F1   /* 카드 배경 */
--neutral-200: #E8E6E2   /* 구분선, 테두리 */
--neutral-400: #A8A29E   /* Placeholder 텍스트 */
--neutral-600: #57534E   /* 보조 텍스트 */
--neutral-900: #1C1917   /* 제목 텍스트 */
```

### CSS 변수 (Tailwind 연동)
| 변수 | 용도 |
|------|------|
| `--color-background` | 페이지 배경 |
| `--color-foreground` | 기본 텍스트 |
| `--color-primary` | 브랜드 오렌지 |
| `--color-secondary` | 보조 컬러 |
| `--color-muted` | 비활성 요소 |
| `--color-destructive` | 에러/삭제 (빨간) |
| `--color-chart-1~5` | 차트 컬러 |
| `--color-sidebar-*` | 사이드바 전용 |

---

## 2. 타이포그래피

| 항목 | 값 |
|------|-----|
| 폰트 (웹) | `Inter` (Google Fonts) |
| 폰트 (시스템 fallback) | `system-ui, sans-serif` |
| `--font-sans` | Inter |
| `--font-display` | Inter |

### 타이포그래피 플러그인
- `@tailwindcss/typography` — 마크다운/장문 텍스트 렌더링용

---

## 3. Border Radius 시스템
| 토큰 | 값 |
|------|-----|
| `--radius-sm` | 4px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |

---

## 4. shadcn/ui 컴포넌트 목록

Admin CRM (`artifacts/edubee-admin/src/components/ui/`) 에서 사용 중:

| 컴포넌트 | 설명 |
|----------|------|
| `badge.tsx` | 상태 뱃지 (variant: default/secondary/destructive/outline) |
| `button.tsx` | 버튼 (variant: default/outline/ghost/destructive) |
| `card.tsx` | 카드 레이아웃 |
| `dialog.tsx` | 모달 다이얼로그 |
| `dropdown-menu.tsx` | 드롭다운 메뉴 |
| `form.tsx` | RHF + Zod 통합 폼 |
| `input.tsx` | 텍스트 입력 |
| `select.tsx` | 셀렉트 박스 |
| `table.tsx` | 데이터 테이블 |
| `tabs.tsx` | 탭 네비게이션 |
| `toast.tsx` + `toaster.tsx` | 알림 토스트 |
| `tooltip.tsx` | 툴팁 |
| `separator.tsx` | 구분선 |
| `sheet.tsx` | 사이드 슬라이드 패널 |
| `skeleton.tsx` | 로딩 스켈레톤 |
| `status-badge.tsx` | 커스텀 상태 뱃지 |

---

## 5. 커스텀 공통 컴포넌트

### Admin CRM
| 컴포넌트 | 경로 | 용도 |
|----------|------|------|
| `StatusBadge` | `components/ui/status-badge.tsx` | 엔티티 상태 표시 |
| `ReportStatusBadge` | `components/shared/ReportStatusBadge.tsx` | 보고서 상태 |
| `EntityDocumentsTab` | `components/shared/EntityDocumentsTab.tsx` | 공통 문서 탭 |
| `ProductDrawer` | `components/shared/ProductDrawer.tsx` | 상품 선택 드로어 |
| `ContractFinanceTab` | `components/contracts/ContractFinanceTab.tsx` | 계약 재무 탭 |
| `ContractSignatureTab` | `components/contracts/ContractSignatureTab.tsx` | 서명 탭 |
| `SuperAdminGuard` | `components/guards/SuperAdminGuard.tsx` | 슈퍼어드민 보호 |

### Portal
| 컴포넌트 | 경로 | 용도 |
|----------|------|------|
| `PortalLayout` | `components/portal-layout.tsx` | 포털 공통 레이아웃 (사이드바+헤더) |
| `AuthProvider` | `lib/auth.tsx` | JWT 인증 컨텍스트 |

---

## 6. 아이콘 라이브러리

**Lucide React** (`lucide-react ^0.545.0`)

자주 사용되는 아이콘:
- `LayoutDashboard` — 대시보드
- `Users` — 컨설테이션/사용자
- `GraduationCap` — My Students
- `FileText` — 견적/문서
- `BookOpen` — 계약
- `Package` — 서비스
- `Wallet` — 재무
- `FolderOpen` — 파일/문서
- `MessageCircle` — 커뮤니티
- `User` — 프로필

---

## 7. 반응형 브레이크포인트

Tailwind CSS v4 기본값 사용:
| 브레이크포인트 | 값 |
|--------------|-----|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

---

## 8. 다크모드

CSS `@custom-variant dark (&:is(.dark *))` 정의됨.  
현재 UI에서는 대부분 라이트 모드 사용. 다크모드 변수는 `:root` + `.dark` 클래스 패턴.

---

## 9. 테넌트 테마 시스템

`applyThemeToDom()` 함수가 테넌트 설정에서 오렌지 계열 색상을 동적으로 재정의:
- 기본값: `#F5821F` (Edubee 오렌지)
- 테넌트별로 커스텀 브랜드 컬러 가능
- `useTenantTheme()` 훅이 API에서 설정을 로드하여 CSS 변수에 적용

---

*© Edubee.Co. 2026 — 자동 생성 문서*
