-- ATSH-approved starting prices for stores, based on the market tariff.
-- One-time independent snapshot. Never alter existing store prices or publish an offer.
DO $commerce$
DECLARE applied text;
BEGIN
  PERFORM pg_advisory_xact_lock(20261127,168);
  INSERT INTO schema_migrations(version) VALUES('2026-11-27-commerce-base-offer')
    ON CONFLICT(version) DO NOTHING RETURNING version INTO applied;
  IF applied IS NULL THEN RETURN; END IF;

  INSERT INTO product_ownership_prices(scope,owner_key,mode,list_price,initial_price,discount_percent)
    SELECT 'sector','commerce-engine',v.mode,v.amount,v.amount,0
    FROM (VALUES ('rent_monthly',199.00),('rent',1990.00),('copy',46870.00),('code',7990.00)) v(mode,amount)
    ON CONFLICT(scope,owner_key,mode) DO NOTHING;

  UPDATE site_pages
    SET content=jsonb_set(content,'{items}',(content->'items')||$offer$[{
      "slug":"commerce-engine","name":"متجر إلكتروني ATSH",
      "category":"المتاجر","sectorId":"business","subcategoryId":"retail","icon":"🛒",
      "description":"متجر إلكتروني بواجهة قابلة للتخصيص ومنتجات ومخزون وطلبات وإدارة التاجر.",
      "features":["اختيار تصميم المتجر","المنتجات والمخزون والطلبات","لوحة إدارة التاجر","ربط الإضافات المركزية"],
      "modules":["المنتجات","المخزون","الطلبات","نقطة البيع","الفريق"],
      "sampleStats":[],"sampleRows":[],"note":"معاينة تجريبية","published":false,"archived":false,
      "sortOrder":100,"imageUrl":"","previewUrl":"","demoSlug":"","basePrice":null,"addons":[],"pricedAddons":[]
    }]$offer$::jsonb,false), updated_at=now()
    WHERE slug='catalog' AND locale='ar' AND jsonb_typeof(content->'items')='array'
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(content->'items') i WHERE i->>'slug'='commerce-engine');
END $commerce$;
