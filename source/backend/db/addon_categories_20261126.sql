-- Preserve pre-existing definitions and prices. Classify each legacy code once.
CREATE TABLE IF NOT EXISTS addon_categories (
  code varchar(40) PRIMARY KEY,
  sort_order integer NOT NULL
);
INSERT INTO addon_categories(code,sort_order) VALUES
 ('foundation',10),('integrations',20),('conversation',30),('creative',40),('hosting',50),('marketing',60)
ON CONFLICT(code) DO NOTHING;
ALTER TABLE shared_addons ADD COLUMN IF NOT EXISTS category_code varchar(40) REFERENCES addon_categories(code);
WITH mapping(code,category_code,sort_order) AS (VALUES
 ('language','foundation',10),('extra_language','foundation',20),('extra_page','foundation',30),('logo','foundation',40),('brand','foundation',50),('writing','foundation',60),('seo','foundation',70),('booking','foundation',80),('contact','foundation',90),('analytics','foundation',100),
 ('payment_gateway','integrations',10),('admin_dashboard','integrations',20),('customer_portal','integrations',30),('pwa','integrations',40),('android_app','integrations',50),('ios_app','integrations',60),('api_integration','integrations',70),('shipping_integration','integrations',80),('notifications','integrations',90),('workflow_automation','integrations',100),('email_sms_integration','integrations',110),('site_migration','integrations',120),
 ('smart_bot','conversation',10),('ai_assistant','conversation',20),('whatsapp_bot','conversation',30),('live_chat_text','conversation',40),('live_chat_attachments','conversation',50),('internal_ai_assistant','conversation',60),
 ('ad_banners','creative',10),('social_design','creative',20),('company_profile','creative',30),('promo_video','creative',40),('explainer_video','creative',50),
 ('hosting','hosting',10),('maintenance','hosting',20),('business_email','hosting',30),('advanced_backup','hosting',40),('hosting_upgrade','hosting',50),
 ('seo_monthly','marketing',10),('google_business_profile','marketing',20),('ads_management','marketing',30),('social_management','marketing',40),('campaign_tracking','marketing',50),('click_to_call','marketing',60),('social_links','marketing',70)
)
UPDATE shared_addons a SET category_code=m.category_code,sort_order=m.sort_order
FROM mapping m WHERE a.code=m.code AND a.category_code IS NULL;
UPDATE shared_addons SET category_code='foundation' WHERE category_code IS NULL;
ALTER TABLE shared_addons ALTER COLUMN category_code SET DEFAULT 'foundation';
ALTER TABLE shared_addons ALTER COLUMN category_code SET NOT NULL;
