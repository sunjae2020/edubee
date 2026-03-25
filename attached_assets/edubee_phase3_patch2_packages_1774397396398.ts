// ============================================================
// Edubee CRM — Phase 3 패치 #2
// 파일: /server/src/routes/packages.ts
// 목적: Phase 1에서 추가한 productContext / campPackageId /
//       products.productId 필드를 API에 반영
// ============================================================
// 수정 범위:
//   A. Packages CRUD  — product_id 읽기/쓰기
//   B. Products CRUD  — product_context / camp_package_id 읽기/쓰기
//   C. Lookup helpers — camp_package / camp_addon 타입 지원
// ============================================================


// ============================================================
// PATCH 2-A: Packages — productId 필드 추가
// ============================================================

// 【위치】 GET /packages 또는 GET /packages/:id 의 SELECT 컬럼 목록

// 【찾을 코드】 packages SELECT 컬럼 (마지막 필드 근처)
/*
  status: packages.status,
  createdAt: packages.createdAt,
  updatedAt: packages.updatedAt,
*/

// 【교체할 코드】
/*
  status: packages.status,
  createdAt: packages.createdAt,
  updatedAt: packages.updatedAt,
  productId: packages.productId,          // ← 추가: Product 연결 ID
*/


// 【위치】 POST /packages 의 insert 구문

// 【찾을 코드】 packages insert values 마지막 필드 근처
/*
    maxParticipants: body.maxParticipants,
    currentEnrollment: 0,
    status: body.status || 'Active',
*/

// 【교체할 코드】
/*
    maxParticipants: body.maxParticipants,
    currentEnrollment: 0,
    status: body.status || 'Active',
    productId: body.productId || null,      // ← 추가: Product 연결 (선택)
*/


// 【위치】 PUT /packages/:id 의 update set 구문

// 【찾을 코드】 packages update set 마지막 필드 근처
/*
    maxParticipants: body.maxParticipants,
    status: body.status,
    updatedAt: new Date(),
*/

// 【교체할 코드】
/*
    maxParticipants: body.maxParticipants,
    status: body.status,
    updatedAt: new Date(),
    ...(body.productId !== undefined && { productId: body.productId }),  // ← 추가
*/


// ============================================================
// PATCH 2-B: Products — productContext / campPackageId 추가
// ============================================================

// 【위치】 GET /products 또는 GET /products/:id 의 SELECT 컬럼 목록

// 【찾을 코드】 products SELECT 컬럼 (마지막 필드 근처)
/*
  displayOnQuote: products.displayOnQuote,
  displayOnInvoice: products.displayOnInvoice,
  status: products.status,
  createdOn: products.createdOn,
  modifiedOn: products.modifiedOn,
*/

// 【교체할 코드】
/*
  displayOnQuote: products.displayOnQuote,
  displayOnInvoice: products.displayOnInvoice,
  status: products.status,
  createdOn: products.createdOn,
  modifiedOn: products.modifiedOn,
  productContext: products.productContext,      // ← 추가: 'general'|'camp_package'|'camp_addon'
  campPackageId: products.campPackageId,        // ← 추가: camp_package 타입 역참조
*/


// 【위치】 GET /products 목록 조회 — 필터 파라미터 처리 부분

// 【찾을 코드】 쿼리 파라미터 추출 (기존 필터들 근처)
/*
  const { search, status, serviceModuleType, page, limit } = req.query;
*/

// 【교체할 코드】
/*
  const { search, status, serviceModuleType, productContext, page, limit } = req.query;
*/

// 【찾을 코드】 conditions 배열 또는 WHERE 조건 (serviceModuleType 필터 근처)
/*
  if (serviceModuleType) {
    conditions.push(eq(products.serviceModuleType, serviceModuleType as string));
  }
*/

// 【교체할 코드】
/*
  if (serviceModuleType) {
    conditions.push(eq(products.serviceModuleType, serviceModuleType as string));
  }
  if (productContext) {
    conditions.push(eq(products.productContext, productContext as string));  // ← 추가
  }
*/


// 【위치】 POST /products 의 insert 구문

// 【찾을 코드】 products insert values (마지막 필드 근처)
/*
    displayOnQuote: body.displayOnQuote ?? true,
    displayOnInvoice: body.displayOnInvoice ?? true,
    taxRateId: body.taxRateId || null,
    productTypeId: body.productTypeId || null,
    status: body.status || 'Active',
*/

// 【교체할 코드】
/*
    displayOnQuote: body.displayOnQuote ?? true,
    displayOnInvoice: body.displayOnInvoice ?? true,
    taxRateId: body.taxRateId || null,
    productTypeId: body.productTypeId || null,
    status: body.status || 'Active',
    productContext: body.productContext || 'general',   // ← 추가
    campPackageId: body.campPackageId || null,          // ← 추가
*/


// 【위치】 PUT /products/:id 의 update set 구문

// 【찾을 코드】 products update set (마지막 필드 근처)
/*
    displayOnQuote: body.displayOnQuote,
    displayOnInvoice: body.displayOnInvoice,
    status: body.status,
    modifiedOn: new Date(),
*/

// 【교체할 코드】
/*
    displayOnQuote: body.displayOnQuote,
    displayOnInvoice: body.displayOnInvoice,
    status: body.status,
    modifiedOn: new Date(),
    ...(body.productContext !== undefined && { productContext: body.productContext }),  // ← 추가
    ...(body.campPackageId !== undefined  && { campPackageId: body.campPackageId }),   // ← 추가
*/


// ============================================================
// PATCH 2-C: Lookup helpers — camp 타입 지원 추가
// ============================================================

// 【위치】 GET /products-lookup/product-types 핸들러

// 【찾을 코드】 serviceModuleType 필터 처리
/*
  const { serviceModuleType } = req.query;
  // ...
  if (serviceModuleType) {
    conditions.push(eq(productTypes.serviceModuleType, serviceModuleType as string));
  }
*/

// 【교체할 코드】 — 변경 없음, 기존 필터로 'camp' 값도 지원됨
// ※ product_types.service_module_type 에 'camp' 값이 이미 허용값으로 정의되어 있음
// ※ 추가 수정 불필요


// 【신규 추가】 GET /products-lookup/camp-packages
// 위치: 기존 lookup helpers 마지막에 추가
// 목적: Quote 작성 시 camp_package 타입 상품 목록 조회용

/*
// Camp Package 타입 상품 목록 (Quote 선택용)
router.get('/products-lookup/camp-packages', requireAuth, async (req, res) => {
  try {
    const results = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        currency: products.currency,
        campPackageId: products.campPackageId,
        status: products.status,
      })
      .from(products)
      .where(
        and(
          eq(products.productContext, 'camp_package'),
          eq(products.status, 'Active')
        )
      )
      .orderBy(products.name);

    res.json(results);
  } catch (error) {
    console.error('Error fetching camp package products:', error);
    res.status(500).json({ error: 'Failed to fetch camp package products' });
  }
});
*/

// 【신규 추가】 GET /products-lookup/camp-addons
// 목적: Quote 작성 시 camp_addon 타입 상품 목록 조회용

/*
// Camp Addon 타입 상품 목록 (옵션 추가용)
router.get('/products-lookup/camp-addons', requireAuth, async (req, res) => {
  try {
    const { campPackageId } = req.query;  // 특정 패키지의 addon만 필터 가능

    const conditions: any[] = [
      eq(products.productContext, 'camp_addon'),
      eq(products.status, 'Active'),
    ];

    // 특정 패키지에 연결된 addon만 조회 (선택적)
    if (campPackageId) {
      conditions.push(eq(products.campPackageId, campPackageId as string));
    }

    const results = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        currency: products.currency,
        campPackageId: products.campPackageId,
        itemDescription: products.itemDescription,
        status: products.status,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(products.name);

    res.json(results);
  } catch (error) {
    console.error('Error fetching camp addon products:', error);
    res.status(500).json({ error: 'Failed to fetch camp addon products' });
  }
});
*/


// ============================================================
// PATCH 2-D: Package-Product 연결 동기화 헬퍼 (권장)
// ============================================================
// 목적: Package에 productId를 연결할 때
//       해당 Product의 campPackageId도 자동 동기화

// 【위치】 PUT /packages/:id 핸들러 내부 — update 실행 후 추가

/*
// Package update 후 productId가 변경된 경우 product 동기화
if (body.productId !== undefined) {
  // 이전 연결 product의 campPackageId 해제
  await db
    .update(products)
    .set({ campPackageId: null })
    .where(
      and(
        eq(products.campPackageId, id),           // 이 package를 참조하던 product
        ne(products.id, body.productId || '')      // 새 productId가 아닌 것만
      )
    );

  // 새 product의 campPackageId 설정
  if (body.productId) {
    await db
      .update(products)
      .set({
        campPackageId: id,
        productContext: 'camp_package',
        modifiedOn: new Date(),
      })
      .where(eq(products.id, body.productId));
  }
}
*/


// ============================================================
// 적용 후 검증 쿼리
// ============================================================
/*
-- 1. products 컨텍스트 분포 확인
SELECT product_context, COUNT(*)
FROM products
GROUP BY product_context;
-- 기대: general = 기존수, camp_package/camp_addon = 신규 등록 후

-- 2. packages-products 연결 현황
SELECT
  p.name AS package_name,
  pr.name AS product_name,
  pr.product_context,
  pr.price
FROM camp_packages p
LEFT JOIN products pr ON p.product_id = pr.id
LIMIT 10;

-- 3. API 테스트
-- GET /api/products?productContext=camp_package   → camp 패키지 상품만
-- GET /api/products?productContext=camp_addon     → camp 옵션 상품만
-- GET /api/products-lookup/camp-packages          → Quote 선택용 목록
-- GET /api/products-lookup/camp-addons            → Quote 옵션 추가용 목록
*/


// ============================================================
// 완료 보고 형식
// ============================================================
/*
✅ 수정된 파일: /server/src/routes/packages.ts
✅ 수정 내용:
   - Packages: productId 필드 SELECT/INSERT/UPDATE 추가
   - Products: productContext, campPackageId 필드 SELECT/INSERT/UPDATE 추가
   - Products 목록: productContext 필터 파라미터 추가
   - Lookup: /products-lookup/camp-packages 신규 엔드포인트
   - Lookup: /products-lookup/camp-addons 신규 엔드포인트
   - Package-Product 연결 동기화 헬퍼 추가 (선택)
✅ 검증 결과: [tsc / 서버 / DB / API 각각 결과 기입]
⚠️  다음 할 작업: Phase 4 — 프론트엔드 메뉴 재구성
*/
