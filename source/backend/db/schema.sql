CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS schema_migrations (version varchar(120) PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS packages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(160) NOT NULL, description text NOT NULL DEFAULT '', price numeric(12,2) NOT NULL CHECK(price>=0), currency char(3) NOT NULL DEFAULT 'EGP' CHECK(currency='EGP'), features jsonb NOT NULL DEFAULT '[]', is_published boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE packages ADD COLUMN IF NOT EXISTS tagline varchar(160) NOT NULL DEFAULT '';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_custom_quote boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS package_options (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE, code varchar(80) NOT NULL, name varchar(160) NOT NULL, description text NOT NULL DEFAULT '', price numeric(12,2) NOT NULL CHECK(price>=0), pricing_type varchar(20) NOT NULL DEFAULT 'fixed', is_required boolean NOT NULL DEFAULT false, is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE package_options ADD COLUMN IF NOT EXISTS code varchar(80);
UPDATE package_options SET code='legacy-'||id::text WHERE code IS NULL OR code='';
ALTER TABLE package_options ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS package_options_package_code_unique ON package_options(package_id,code);
ALTER TABLE package_options ADD COLUMN IF NOT EXISTS unit_label varchar(40) NOT NULL DEFAULT '';
ALTER TABLE package_options ADD COLUMN IF NOT EXISTS visibility varchar(16) NOT NULL DEFAULT 'both';
UPDATE package_options SET visibility='both' WHERE visibility NOT IN ('both','packages','systems');
ALTER TABLE package_options DROP CONSTRAINT IF EXISTS package_options_visibility_check;
ALTER TABLE package_options ADD CONSTRAINT package_options_visibility_check CHECK (visibility IN ('both','packages','systems'));
ALTER TABLE package_options DROP CONSTRAINT IF EXISTS package_options_pricing_type_check;
ALTER TABLE package_options ADD CONSTRAINT package_options_pricing_type_check CHECK(pricing_type IN ('fixed','monthly','yearly','per_page'));
CREATE TABLE IF NOT EXISTS site_settings (id integer PRIMARY KEY DEFAULT 1 CHECK(id=1), vat_rate numeric(5,2) NULL CHECK(vat_rate IS NULL OR (vat_rate>=0 AND vat_rate<=100)), theme jsonb NOT NULL DEFAULT '{"navy":"#203958","blue":"#4c78ae","gold":"#b59a6b","page":"#faf9f5"}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{"navy":"#203958","blue":"#4c78ae","gold":"#b59a6b","page":"#faf9f5"}'::jsonb;
INSERT INTO site_settings(id,vat_rate) VALUES(1,14) ON CONFLICT(id) DO UPDATE SET vat_rate=COALESCE(site_settings.vat_rate,14);
CREATE TABLE IF NOT EXISTS orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference varchar(40) NOT NULL UNIQUE, customer_name varchar(120) NOT NULL, phone varchar(30) NOT NULL, email varchar(254), notes varchar(4000) NOT NULL DEFAULT '', package_id uuid REFERENCES packages(id) ON DELETE SET NULL, status varchar(24) NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','quoted','approved','in_progress','completed','cancelled')), currency char(3) NOT NULL DEFAULT 'EGP', subtotal numeric(12,2) NOT NULL, vat_rate numeric(5,2), vat_amount numeric(12,2), total numeric(12,2) NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE TABLE IF NOT EXISTS audit_logs (id bigserial PRIMARY KEY, actor varchar(254) NOT NULL, action varchar(100) NOT NULL, entity_type varchar(60) NOT NULL, entity_id uuid NOT NULL, before_data jsonb, after_data jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS site_pages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(100) NOT NULL, locale varchar(8) NOT NULL DEFAULT 'ar', content jsonb NOT NULL DEFAULT '{}'::jsonb, is_published boolean NOT NULL DEFAULT true, updated_by varchar(254), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(slug,locale));
CREATE TABLE IF NOT EXISTS site_media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_type varchar(32) NOT NULL CHECK(content_type IN ('image/png','image/jpeg','image/webp')), original_name varchar(255) NOT NULL DEFAULT '', data bytea NOT NULL, byte_size integer NOT NULL CHECK(byte_size > 0 AND byte_size <= 5242880), created_by varchar(254) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS content_studio_drafts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(180) NOT NULL, source_filename varchar(255) NOT NULL DEFAULT '', brief_markdown text NOT NULL, production_plan jsonb NOT NULL, status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','generating','video_ready')), video_data bytea, video_size integer CHECK(video_size IS NULL OR (video_size > 0 AND video_size <= 26214400)), video_generated_at timestamptz, created_by varchar(254) NOT NULL, updated_by varchar(254) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS content_studio_drafts_updated_idx ON content_studio_drafts(updated_at DESC);
CREATE TABLE IF NOT EXISTS team_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(254) NOT NULL UNIQUE, display_name varchar(120) NOT NULL, role varchar(20) NOT NULL CHECK(role IN ('admin','editor','sales','viewer')), password_hash text NOT NULL, is_active boolean NOT NULL DEFAULT true, permission_overrides jsonb DEFAULT NULL CHECK (permission_overrides IS NULL OR jsonb_typeof(permission_overrides) = 'object'), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS permission_overrides jsonb DEFAULT NULL;
CREATE TABLE IF NOT EXISTS owner_password_overrides (id integer PRIMARY KEY DEFAULT 1 CHECK (id=1), password_hash text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
-- Monotonic credential revision makes owner sessions resilient to JWT second-level timestamp rounding.
ALTER TABLE owner_password_overrides ADD COLUMN IF NOT EXISTS session_version bigint NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS owner_password_reset_tokens (id integer PRIMARY KEY DEFAULT 1 CHECK (id=1), token_hash char(64) NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES team_members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_assigned_to_idx ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS team_members_active_idx ON team_members(is_active,email);
CREATE INDEX IF NOT EXISTS site_pages_slug_idx ON site_pages(slug,locale);
INSERT INTO site_pages(slug,locale,content,is_published) VALUES('home','ar','{"heroTitle":"ابنِ موقعك بالطريقة التي تناسب مشروعك","heroDescription":"اختر مكونات موقعك خطوة بخطوة، وراجع تكلفة كل إضافة مباشرةً.","ctaText":"كوّن طلبك"}'::jsonb,true) ON CONFLICT(slug,locale) DO NOTHING;
INSERT INTO site_pages(slug,locale,content,is_published) VALUES('works','ar','{"title":"سجل الأعمال","description":"نماذج من الأعمال والمشروعات السابقة.","projects":[]}'::jsonb,true) ON CONFLICT(slug,locale) DO NOTHING;

INSERT INTO packages(id,name,tagline,description,price,currency,features,is_featured,is_custom_quote,is_published,sort_order) SELECT '11111111-1111-4111-8111-111111111111','موقع صفحة واحدة','صفحة هبوط','واجهة واضحة تركز على خدمة أو حملة واحدة.',1000,'EGP','["صفحة واحدة","3 أفكار تصميم","5 اتجاهات لونية"]'::jsonb,false,false,true,10 WHERE NOT EXISTS(SELECT 1 FROM packages WHERE name='موقع صفحة واحدة') ON CONFLICT(id) DO NOTHING;
INSERT INTO packages(id,name,tagline,description,price,currency,features,is_featured,is_custom_quote,is_published,sort_order) SELECT '22222222-2222-4222-8222-222222222222','موقع متعدد الصفحات','موقع تعريفي','موقع أعمال متكامل حتى خمس صفحات أساسية.',2500,'EGP','["حتى 5 صفحات","3 أفكار تصميم","5 اتجاهات لونية"]'::jsonb,false,false,true,20 WHERE NOT EXISTS(SELECT 1 FROM packages WHERE name='موقع متعدد الصفحات') ON CONFLICT(id) DO NOTHING;
INSERT INTO packages(id,name,tagline,description,price,currency,features,is_featured,is_custom_quote,is_published,sort_order) SELECT '33333333-3333-4333-8333-333333333333','موقع بإدارة محتوى','موقع ديناميكي','موقع قابل للتحديث مع لوحة محتوى وقاعدة بيانات.',6000,'EGP','["حتى 5 صفحات","إدارة المحتوى","قابل للتوسع التجاري"]'::jsonb,true,false,true,30 WHERE NOT EXISTS(SELECT 1 FROM packages WHERE name='موقع بإدارة محتوى') ON CONFLICT(id) DO NOTHING;
INSERT INTO packages(id,name,tagline,description,price,currency,features,is_featured,is_custom_quote,is_published,sort_order) SELECT '44444444-4444-4444-8444-444444444444','حل مخصص','مؤسسي','نراجع التكاملات والنطاق ونقدم عرضا مناسبا للمشروع.',0,'EGP','["تحليل متطلبات","تكاملات خاصة","عرض نطاق مخصص"]'::jsonb,false,true,true,40 WHERE NOT EXISTS(SELECT 1 FROM packages WHERE name='حل مخصص') ON CONFLICT(id) DO NOTHING;

DO $$
DECLARE package_defaults_migration varchar(120);
BEGIN
  INSERT INTO schema_migrations(version) VALUES('2026-11-09-package-card-defaults')
  ON CONFLICT(version) DO NOTHING
  RETURNING version INTO package_defaults_migration;
  IF package_defaults_migration IS NOT NULL THEN
    UPDATE packages SET tagline=CASE name
      WHEN 'موقع صفحة واحدة' THEN 'صفحة هبوط'
      WHEN 'موقع متعدد الصفحات' THEN 'موقع تعريفي'
      WHEN 'موقع بإدارة محتوى' THEN 'موقع ديناميكي'
      WHEN 'حل مخصص' THEN 'مؤسسي'
      ELSE tagline END
    WHERE name IN ('موقع صفحة واحدة','موقع متعدد الصفحات','موقع بإدارة محتوى','حل مخصص') AND tagline='';
    UPDATE packages SET is_featured=true WHERE name='موقع بإدارة محتوى';
    UPDATE packages SET is_custom_quote=true WHERE name='حل مخصص';
  END IF;
END $$;

INSERT INTO package_options(package_id,code,name,description,price,pricing_type,unit_label,is_required,is_active,sort_order)
SELECT p.id,o.code,o.name,o.description,o.price,o.pricing_type,o.unit_label,false,true,o.sort_order
FROM packages p CROSS JOIN (VALUES
('language','إضافة اللغة الإنجليزية','إضافة نسخة باللغة الإنجليزية إلى الموقع.',900,'fixed','',10),
('logo','تصميم شعار','تطوير شعار وملفات تسليم أساسية.',800,'fixed','',20),
('brand','هوية بصرية موسعة','شعار وتطبيقات الهوية ودليل الاستخدام.',3500,'fixed','',30),
('writing','كتابة المحتوى','كتابة ومراجعة محتوى صفحات الموقع.',250,'per_page','صفحة',40),
('seo','تحسين الظهور في البحث','تهيئة الصفحات والخرائط وأدوات القياس.',1200,'fixed','',50),
('booking','حجز المواعيد','عرض المواعيد واستقبال طلبات الحجز.',1800,'fixed','',60),
('contact','نماذج تواصل وخرائط','نموذج تواصل وروابط موقعك الجغرافي.',500,'fixed','',70),
('analytics','تحليلات وتقارير','متابعة الزيارات والتفاعل الأساسي.',600,'fixed','',80),
('hosting','استضافة مُدارة وحماية','استضافة سنوية مع حماية ومتابعة.',600,'yearly','',90),
('maintenance','صيانة ودعم','صيانة ودعم فني لمدة سنة.',3600,'yearly','',100),
('domain_com','نطاق .com (السنة الأولى)','تسجيل نطاق .com للسنة الأولى مع الاستضافة.',0,'yearly','',110),
('domain_eg','نطاق .eg (السنة الأولى)','تسجيل نطاق .eg للسنة الأولى مع الاستضافة.',0,'yearly','',120)
) AS o(code,name,description,price,pricing_type,unit_label,sort_order)
WHERE p.is_published=true AND NOT EXISTS(SELECT 1 FROM package_options existing WHERE existing.package_id=p.id AND existing.code=o.code);


-- Shared add-ons for custom systems. Preserve domain products for website packages.
UPDATE package_options SET visibility='packages'
WHERE code IN ('domain_com','domain_eg') AND visibility='both';

INSERT INTO package_options(package_id,code,name,description,price,pricing_type,unit_label,is_required,is_active,sort_order,visibility)
SELECT p.id,a.code,a.name,a.description,a.price,a.pricing_type,'',false,true,a.sort_order,'systems'
FROM packages p CROSS JOIN (VALUES
 ('smart_bot','البوت الذكي','ردود آلية محفوظة',500,'fixed',110),
 ('ai_assistant','المساعد الذكي','شبيه بمساعد ATSH AI',2500,'yearly',120)
) AS a(code,name,description,price,pricing_type,sort_order)
WHERE p.is_published=true
AND NOT EXISTS(SELECT 1 FROM package_options o WHERE o.package_id=p.id AND o.code=a.code);


-- ATSH customer journey: additive migration; preserves pricing, team and content studio.
CREATE TABLE IF NOT EXISTS customer_journey_projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_name varchar(120) NOT NULL,
 customer_email varchar(254),
 template_id varchar(120),
 status varchar(32) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','configured','quoted','payment_pending','paid','building','preview_ready','approved','delivered','support','archived')),
 created_by varchar(254) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customer_journey_messages (
 id bigserial PRIMARY KEY, project_id uuid NOT NULL REFERENCES customer_journey_projects(id) ON DELETE CASCADE,
 actor varchar(12) NOT NULL CHECK(actor IN ('customer','assistant','admin')),
 body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journey_messages_project_idx ON customer_journey_messages(project_id,created_at);

-- Stage 5: one authoritative order per journey; no price duplication or payment inference.
CREATE TABLE IF NOT EXISTS customer_journey_order_links (
 project_id uuid PRIMARY KEY REFERENCES customer_journey_projects(id) ON DELETE CASCADE,
 order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
 linked_by varchar(254) NOT NULL,
 linked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journey_order_links_order_idx ON customer_journey_order_links(order_id);

-- Stage 6: one revocable, time-limited access code per customer project.
CREATE TABLE IF NOT EXISTS customer_journey_access (
 project_id uuid PRIMARY KEY REFERENCES customer_journey_projects(id) ON DELETE CASCADE,
 token_hash char(64) NOT NULL,
 expires_at timestamptz NOT NULL,
 issued_by varchar(254) NOT NULL,
 revoked_at timestamptz
);

-- Unified template catalog; public entries require editorial publication.
CREATE TABLE IF NOT EXISTS platform_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug varchar(100) NOT NULL UNIQUE,
 title varchar(160) NOT NULL,
 sector varchar(100) NOT NULL,
 description text NOT NULL DEFAULT '',
 preview_url text,
 is_published boolean NOT NULL DEFAULT false,
 updated_by varchar(254),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT template_preview_https CHECK (preview_url IS NULL OR preview_url ~ '^https://[^[:space:]]+$')
);
CREATE INDEX IF NOT EXISTS platform_templates_published_idx ON platform_templates(is_published,sector);

-- Review-first project builder; no automatic deployment or code execution.
CREATE TABLE IF NOT EXISTS project_builder_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL,
 plan jsonb NOT NULL,
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_builder_plans_slug_idx ON project_builder_plans(slug,created_at DESC);
CREATE TABLE IF NOT EXISTS project_visual_edits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 plan_id uuid NOT NULL REFERENCES project_builder_plans(id) ON DELETE CASCADE,
 proposal jsonb NOT NULL,
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Internal project work assignments. Separate from customer-visible order ownership.
CREATE TABLE IF NOT EXISTS customer_journey_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES customer_journey_projects(id) ON DELETE CASCADE,
 title varchar(180) NOT NULL,
 description text NOT NULL DEFAULT '',
 status varchar(24) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','blocked','done')),
 assigned_to uuid REFERENCES team_members(id) ON DELETE SET NULL,
 created_by varchar(254) NOT NULL,
 updated_by varchar(254) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_journey_tasks_project_idx ON customer_journey_tasks(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS customer_journey_tasks_assignee_idx ON customer_journey_tasks(assigned_to,status);
