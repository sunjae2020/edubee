-- ============================================================
-- Edubee CRM — Menu Allocation Migration
-- 생성일: 2026-03-24
-- 목적: Page Access > Menu Allocation 기능 추가
--       사이드바 카테고리·메뉴 순서 관리 테이블 (2개 신규)
-- 주의: 기존 테이블 변경 없음. 신규 테이블만 추가.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. menu_categories — 사이드바 카테고리 마스터
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  status       VARCHAR(20)  NOT NULL DEFAULT 'Active',
  created_on   TIMESTAMP    NOT NULL DEFAULT NOW(),
  modified_on  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. menu_items — 사이드바 메뉴 아이템 마스터
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID         NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  route_key       VARCHAR(100) NOT NULL UNIQUE,
  icon_name       VARCHAR(100),
  sort_order      INTEGER      NOT NULL DEFAULT 0,
  is_visible      BOOLEAN      NOT NULL DEFAULT TRUE,
  status          VARCHAR(20)  NOT NULL DEFAULT 'Active',
  created_on      TIMESTAMP    NOT NULL DEFAULT NOW(),
  modified_on     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. 기본 데이터 (현재 Page Access 스크린샷 기준)
-- ─────────────────────────────────────────────
INSERT INTO menu_categories (id, name, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'CORE',        1),
  ('11111111-0000-0000-0000-000000000002', 'SERVICES',    2),
  ('11111111-0000-0000-0000-000000000003', 'ACCOUNTING',  3),
  ('11111111-0000-0000-0000-000000000004', 'MAINTENANCE', 4)
ON CONFLICT DO NOTHING;

-- CORE
INSERT INTO menu_items (category_id, name, route_key, icon_name, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Dashboard',      'dashboard',      'LayoutDashboard', 1),
  ('11111111-0000-0000-0000-000000000001', 'Leads',          'leads',          'Users',           2),
  ('11111111-0000-0000-0000-000000000001', 'Applications',   'applications',   'ClipboardList',   3),
  ('11111111-0000-0000-0000-000000000001', 'Contracts',      'contracts',      'FileText',        4),
  ('11111111-0000-0000-0000-000000000001', 'Package Groups', 'package-groups', 'Package',         5),
  ('11111111-0000-0000-0000-000000000001', 'Users',          'users',          'UserCog',         6)
ON CONFLICT (route_key) DO NOTHING;

-- SERVICES
INSERT INTO menu_items (category_id, name, route_key, icon_name, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000002', 'Institute Mgmt', 'institute-mgmt', 'School',    1),
  ('11111111-0000-0000-0000-000000000002', 'Hotel Mgmt',     'hotel-mgmt',     'Hotel',     2),
  ('11111111-0000-0000-0000-000000000002', 'Pickup Mgmt',    'pickup-mgmt',    'Bus',       3),
  ('11111111-0000-0000-0000-000000000002', 'Tour Mgmt',      'tour-mgmt',      'Map',       4),
  ('11111111-0000-0000-0000-000000000002', 'Interviews',     'interviews',     'Mic',       5),
  ('11111111-0000-0000-0000-000000000002', 'Settlement',     'settlement',     'BarChart2', 6)
ON CONFLICT (route_key) DO NOTHING;

-- ACCOUNTING
INSERT INTO menu_items (category_id, name, route_key, icon_name, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000003', 'Transactions',      'transactions',      'CreditCard', 1),
  ('11111111-0000-0000-0000-000000000003', 'Invoices',          'invoices',          'Receipt',    2),
  ('11111111-0000-0000-0000-000000000003', 'Commissions',       'commissions',       'DollarSign', 3),
  ('11111111-0000-0000-0000-000000000003', 'Financial Reports', 'financial-reports', 'TrendingUp', 4)
ON CONFLICT (route_key) DO NOTHING;

-- MAINTENANCE
INSERT INTO menu_items (category_id, name, route_key, icon_name, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000004', 'System Settings', 'system-settings', 'Settings',   1),
  ('11111111-0000-0000-0000-000000000004', 'Page Access',     'page-access',     'Lock',       2),
  ('11111111-0000-0000-0000-000000000004', 'Audit Log',       'audit-log',       'FileSearch', 3)
ON CONFLICT (route_key) DO NOTHING;
