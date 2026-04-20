-- Migration: menu_categories and menu_items tables
CREATE TABLE IF NOT EXISTS "menu_categories" (
  "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        VARCHAR(100) NOT NULL,
  "sort_order"  INTEGER     NOT NULL DEFAULT 0,
  "status"      VARCHAR(20)  NOT NULL DEFAULT 'Active',
  "created_on"  TIMESTAMP   NOT NULL DEFAULT NOW(),
  "modified_on" TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "menu_categories_status_idx" ON "menu_categories"("status");

CREATE TABLE IF NOT EXISTS "menu_items" (
  "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "category_id" UUID        REFERENCES "menu_categories"("id"),
  "name"        VARCHAR(100) NOT NULL,
  "route_key"   VARCHAR(100) NOT NULL,
  "icon_name"   VARCHAR(100),
  "sort_order"  INTEGER     NOT NULL DEFAULT 0,
  "is_visible"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "status"      VARCHAR(20)  NOT NULL DEFAULT 'Active',
  "created_on"  TIMESTAMP   NOT NULL DEFAULT NOW(),
  "modified_on" TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "menu_items_route_key_uq"   ON "menu_items"("route_key");
CREATE INDEX        IF NOT EXISTS "menu_items_category_idx"   ON "menu_items"("category_id");
CREATE INDEX        IF NOT EXISTS "menu_items_status_idx"     ON "menu_items"("status");
