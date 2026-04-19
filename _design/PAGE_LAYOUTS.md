# PAGE_LAYOUTS.md — Edubee CRM 페이지 레이아웃 & 라우팅

> 생성일: 2026-04-19 | 소스: App.tsx (admin + portal), portal-layout.tsx

---

## 1. Admin CRM 페이지 목록 (`/admin`)

### 인증 페이지 (레이아웃: 풀스크린 / 미인증)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/login` | `Login` | 로그인 |
| `/register` | `Register` | 테넌트 회원가입 |
| `/forgot-password` | `ForgotPassword` | 비밀번호 찾기 |
| `/reset-password` | `ResetPassword` | 비밀번호 재설정 |
| `/accept-invite` | `AcceptInvite` | 초대장 수락 |

### 공개 페이지 (레이아웃: 풀스크린)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/apply` | `ApplyPage` | 학생 직접 신청 |
| `/inquiry` | `LeadInquiryPage` | 문의 폼 |
| `/form/:slug` | `PublicFormGateway` | 공개 폼 게이트웨이 |

### CRM 메인 (레이아웃: 사이드바+헤더, 인증 필요)
| 경로 | 컴포넌트 | 필요 역할 |
|------|----------|----------|
| `/` | `DashboardCrmPage` | 모든 스태프 |
| `/leads` | `Leads` | 모든 스태프 |
| `/applications` | `Applications` | 모든 스태프 |
| `/applications/all` | `AllApplications` | 모든 스태프 |
| `/camp-applications` | `CampApplications` | 모든 스태프 |
| `/camp-applications/:id` | `CampApplicationDetail` | 모든 스태프 |
| `/package-groups` | `PackageGroups` | admin+ |
| `/packages` | `Packages` | admin+ |
| `/packages/:id` | `PackageDetail` | admin+ |
| `/users` | `Users` | admin+ |
| `/users/:id` | `UserDetail` | admin+ |
| `/teams` | `TeamsPage` | admin+ |
| `/teams/:id` | `TeamDetailPage` | admin+ |
| `/kpi/staff` | `StaffKpiPage` | 모든 스태프 |
| `/kpi/team` | `TeamKpiPage` | 모든 스태프 |
| `/kpi/targets` | `KpiTargetsPage` | admin+ |
| `/products` | `Products` | admin+ |
| `/products/:id` | `ProductDetail` | admin+ |
| `/product-groups` | `ProductGroups` | admin+ |
| `/product-types` | `ProductTypes` | admin+ |
| `/commissions` | `CommissionsPage` | admin+ |
| `/community` | `AdminCommunityPage` | 모든 스태프 |

### 서비스 관리
| 경로 | 컴포넌트 |
|------|----------|
| `/services/pickup` | `PickupManagement` |
| `/services/pickup/:id` | `PickupMgtDetail` |
| `/services/tour` | `TourManagement` |
| `/services/tour/:id` | `TourMgtDetail` |
| `/services/settlement` | `Settlement` |
| `/services/tasks` | `TasksCS` |

### 회계/재무
| 경로 | 컴포넌트 |
|------|----------|
| `/accounting/exchange-rates` | `ExchangeRates` |
| `/accounting/invoices` | `Invoices` |
| `/accounting/receipts` | `Receipts` |
| `/accounting/receipts/:id` | `ReceiptDetailPage` |
| `/accounting/transactions` | `Transactions` |
| `/accounting/transactions/:id` | `TransactionDetailPage` |
| `/my-accounting/settlements` | `MySettlements` |
| `/my-accounting/invoices` | `MyInvoices` |
| `/my-accounting/revenue` | `MyRevenue` |

### 판매 (영업)
| 경로 | 컴포넌트 |
|------|----------|
| `/sales/schooling` | `SchoolingConsultationsPage` |
| `/sales/study-abroad` | `StudyAbroadConsultationsPage` |

### 문서/리포트/설정
| 경로 | 컴포넌트 |
|------|----------|
| `/documents` | `DocumentsPage` |
| `/chatbot` | `ChatbotAdminPage` |
| `/reports` | `ReportsPage` |
| `/reports/:id` | `ReportViewerPage` |
| `/settings/general` | `GeneralSettings` |
| `/settings/page-access` | `PageAccess` |
| `/settings/field-permissions` | `FieldPermissions` |
| `/settings/doc-permissions` | `DocPermissions` |
| `/settings/company-profile` | `CompanyProfile` |
| `/settings/branding` | `Branding` |
| `/settings/domain-access` | `DomainAccess` |
| `/settings/users-teams` | `UsersTeams` |
| `/settings/plan-billing` | `PlanBilling` |
| `/settings/integrations` | `TenantIntegrations` |
| `/settings/data-manager` | `DataManager` |
| `/settings/lookup-values` | `LookupValues` |
| `/settings/db-sync` | `DbSync` |
| `/settings/impersonation-logs` | `ImpersonationLogs` |

### 슈퍼어드민 (`/superadmin/*`) — super_admin only
| 경로 | 컴포넌트 |
|------|----------|
| `/superadmin` | `SuperAdminDashboard` |
| `/superadmin/tenants` | `TenantList` |
| `/superadmin/tenants/:id` | `TenantDetail` |
| `/superadmin/plans` | `PlatformPlans` |
| `/superadmin/stripe` | `StripeSettings` |
| `/superadmin/crm` | `PlatformCrm` |
| `/superadmin/crm/:id` | `PlatformCrmDetail` |
| `/superadmin/integrations` | `SuperAdminIntegrations` |

---

## 2. Portal 페이지 목록 (`/portal`)

### 에이전트 포털 (portalRole: `agent`)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/dashboard` | `DashboardPage` | 에이전트 대시보드 |
| `/consultations` | `AgentConsultationsPage` | 담당 학생 목록/컨설테이션 |
| `/consultations/:id` | `AgentLeadDetailPage` | 리드 상세 |
| `/students` | `StudentsPage` | 내 학생 목록 |
| `/students/:id` | `StudentDetailPage` | 학생 상세 |
| `/quotes` | `AgentQuotesPage` | 견적 목록 |
| `/quotes/:id` | `AgentQuoteDetailPage` | 견적 상세 |
| `/contracts` | `AgentContractsPage` | 계약 목록 |
| `/services` | `AgentServicesPage` | 서비스 현황 |
| `/finance` | `CommissionsPage` | 커미션/재무 |
| `/documents` | `AgentDocumentsPage` | 문서 |
| `/profile` | `ProfilePage` | 내 프로필 |
| `/community` | `CommunityPage` | 커뮤니티 |

### 파트너 포털 (portalRole: `hotel`/`pickup`/`institute`/`tour`)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/partner/dashboard` | `PartnerDashboardPage` | 파트너 대시보드 |
| `/partner/consultations` | `PartnerConsultationsPage` | 컨설테이션 |
| `/partner/quotes` | `PartnerBookingsPage` | 예약 목록 |
| `/partner/quotes/:id` | `PartnerBookingDetailPage` | 예약 상세 |
| `/partner/contracts` | `PartnerContractsPage` | 계약 목록 |
| `/partner/services` | `PartnerServicesPage` | 서비스 현황 |
| `/partner/finance` | `PartnerFinancePage` | 재무 |
| `/partner/documents` | `PartnerDocumentsPage` | 문서 |

### 학생 포털 (portalRole: `student`)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/student/dashboard` | `StudentDashboardPage` | 학생 대시보드 |
| `/student/consultations` | `StudentConsultationsPage` | 상담 내역 |
| `/student/consultations/:id` | `StudentConsultationDetailPage` | 상담 상세 |
| `/student/quotes` | `StudentQuotesPage` | 견적 목록 |
| `/student/quotes/:id` | `StudentQuoteDetailPage` | 견적 상세 |
| `/student/contracts` | `StudentContractsPage` | 계약 목록 |
| `/student/services` | `StudentProgramsPage` | 서비스/프로그램 |
| `/student/services/:id` | `StudentServiceDetailPage` | 서비스 상세 |
| `/student/finance` | `StudentFinancePage` | 납입 현황 |
| `/student/documents` | `StudentDocumentsPage` | 문서 |
| `/student/photos` | `StudentPhotosPage` | 캠프 사진 |
| `/community` | `CommunityPage` | 커뮤니티 (공유) |

---

## 3. 레이아웃 타입

### 1. `PortalLayout` — 포털 공통 (`artifacts/edubee-portal/src/components/portal-layout.tsx`)
- 좌측 사이드바 (역할별 다른 메뉴)
- 상단 헤더 (테넌트 로고, 사용자명, 로그아웃)
- 반응형: 모바일 hamburger 메뉴
- 역할 감지: `portalRole` → `getNavForRole()` 함수

### 2. Admin Layout — CRM 공통
- 좌측 사이드바 (메뉴 권한별 노출)
- 상단 헤더 + Breadcrumb

### 3. 풀스크린 — 로그인/공개 페이지
- 레이아웃 없음, 컴포넌트 전체화면

---

## 4. 포털 사이드바 Navigation 구조

```
에이전트 메뉴:
  Dashboard → /dashboard
  Consultations → /consultations
  My Students → /students       [GraduationCap]
  Quotes → /quotes
  Contracts → /contracts
  Services → /services
  Finance → /finance
  Documents → /documents
  Community → /community
  My Profile → /profile

파트너 메뉴:
  Dashboard → /partner/dashboard
  Consultations → /partner/consultations
  Bookings → /partner/quotes
  Contracts → /partner/contracts
  Services → /partner/services
  Finance → /partner/finance
  Documents → /partner/documents
  Community → /community
  My Profile → /partner/profile

학생 메뉴:
  Dashboard → /student/dashboard
  Consultations → /student/consultations
  Quotes → /student/quotes
  Contracts → /student/contracts
  Services → /student/services
  Finance → /student/finance
  Documents → /student/documents
  Camp Photos → /student/photos   [Image]
  Community → /community
  My Profile → /student/profile
```

---

## 5. 모달/다이얼로그 패턴

Admin CRM에서 사용 중인 패턴:
- **Sheet** (`shadcn/ui sheet`): 사이드 슬라이드 — 상세 편집 폼
- **Dialog** (`shadcn/ui dialog`): 확인/취소 다이얼로그, 소규모 폼
- **Drawer** (`ProductDrawer`, 커스텀): 상품 선택 드로어

열기/닫기 방식: `useState<boolean>` + `open={open}` prop 전달

---

*© Edubee.Co. 2026 — 자동 생성 문서*
