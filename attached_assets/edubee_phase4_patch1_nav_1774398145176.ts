// ============================================================
// Edubee CRM — Phase 4 패치 #1
// 파일: /client/src/components/app-sidebar.tsx
//       /client/src/App.tsx
// 목적: 메뉴 재구성 + 신규 라우트 추가
// ============================================================


// ============================================================
// PATCH A: app-sidebar.tsx — Camp 섹션 수정
// ============================================================

// 【찾을 코드】 Camp 섹션 전체
/*
  {
    title: "Camp",
    items: [
      { title: "Package Groups",    url: "/admin/package-groups" },
      { title: "Packages",          url: "/admin/packages" },
      { title: "Enrollment Spots",  url: "/admin/enrollment-spots" },
      { title: "Camp Application",  url: "/admin/camp-applications" },
      { title: "Camp Contract",     url: "/admin/camp-contracts" },
      { title: "Institute / Study", url: "/admin/services/institute" },
      { title: "Hotel",             url: "/admin/services/hotel" },
      { title: "Pickup / Transfer", url: "/admin/services/pickup" },
      { title: "Tour",              url: "/admin/services/tour" },
      { title: "Interviews",        url: "/admin/services/interviews" },
    ],
  },
*/

// 【교체할 코드】 Camp 섹션 — Package 2개 제거, Institute/Tour 링크 수정
/*
  {
    title: "Camp",
    items: [
      { title: "Camp Application",  url: "/admin/camp-applications" },
      { title: "Camp Contract",     url: "/admin/camp-contracts" },
      { title: "Institute",         url: "/admin/camp-services/institutes" },   // ← 수정
      { title: "Enrollment Spots",  url: "/admin/enrollment-spots" },
      { title: "Interviews",        url: "/admin/services/interviews" },
      { title: "Hotel",             url: "/admin/services/hotel" },             // 공용 백엔드
      { title: "Pickup / Transfer", url: "/admin/services/pickup" },            // 공용 백엔드
      { title: "Tour",              url: "/admin/camp-services/tours" },        // ← 신규
    ],
  },
*/


// ============================================================
// PATCH B: app-sidebar.tsx — Products 섹션 수정
// ============================================================

// 【찾을 코드】 Products 섹션
/*
  {
    title: "Products",
    items: [
      { title: "Products Group",  url: "/admin/product-groups" },
      { title: "Products Type",   url: "/admin/product-types" },
      { title: "Products",        url: "/admin/products" },
      { title: "Promotion",       url: "/admin/promotions" },
      { title: "Commission",      url: "/admin/commissions" },
    ],
  },
*/

// 【교체할 코드】 Products 섹션 — Package Groups / Packages 추가
/*
  {
    title: "Products",
    items: [
      { title: "Products Group",  url: "/admin/product-groups" },
      { title: "Products Type",   url: "/admin/product-types" },
      { title: "Products",        url: "/admin/products" },
      { title: "Promotion",       url: "/admin/promotions" },
      { title: "Commission",      url: "/admin/commissions" },
      { title: "Package Groups",  url: "/admin/package-groups" },  // ← Camp에서 이동
      { title: "Packages",        url: "/admin/packages" },        // ← Camp에서 이동
    ],
  },
*/


// ============================================================
// PATCH C: App.tsx — 신규 import 추가
// ============================================================

// 【찾을 코드】 camp import 블록 마지막 줄 근처
/*
import CampTourDetail from "@/pages/admin/camp-tour-detail";
*/

// 【교체할 코드】 — 아래 2줄 추가
/*
import CampTourDetail from "@/pages/admin/camp-tour-detail";
import CampInstitutes from "@/pages/admin/camp-services/camp-institutes";   // ← 추가
import CampTours from "@/pages/admin/camp-services/camp-tours";             // ← 추가
*/


// ============================================================
// PATCH D: App.tsx — 신규 라우트 추가
// ============================================================

// 【찾을 코드】 기존 camp-services 라우트 2개
/*
<Route path="/admin/camp-services/institutes/:id">
  <CampInstituteDetail />
</Route>
<Route path="/admin/camp-services/tours/:id">
  <CampTourDetail />
</Route>
*/

// 【교체할 코드】 — 목록 라우트 2개 추가
/*
<Route path="/admin/camp-services/institutes/:id">
  <CampInstituteDetail />
</Route>
<Route path="/admin/camp-services/institutes">     // ← 추가 (목록)
  <CampInstitutes />
</Route>
<Route path="/admin/camp-services/tours/:id">
  <CampTourDetail />
</Route>
<Route path="/admin/camp-services/tours">          // ← 추가 (목록)
  <CampTours />
</Route>
*/
