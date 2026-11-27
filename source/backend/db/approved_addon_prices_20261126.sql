-- Approved initial EGP tariff. Apply only once: future administrative edits survive restarts.
ALTER TABLE shared_addons ADD COLUMN IF NOT EXISTS initial_price numeric(12,2) CHECK(initial_price>=0);
ALTER TABLE shared_addons ADD COLUMN IF NOT EXISTS initial_pricing_type varchar(20) CHECK(initial_pricing_type IN ('fixed','monthly','yearly','per_page'));
ALTER TABLE shared_addons ADD COLUMN IF NOT EXISTS initial_unit_label varchar(40);
DO $$
DECLARE applied text;
BEGIN
  PERFORM pg_advisory_xact_lock(20261126,13);
  INSERT INTO schema_migrations(version) VALUES('2026-11-26-approved-addon-prices')
  ON CONFLICT(version) DO NOTHING RETURNING version INTO applied;
  IF applied IS NOT NULL THEN
    INSERT INTO shared_addons(code,name,description,price,pricing_type,unit_label,is_active,category_code,sort_order)
    VALUES
      ('language','إضافة اللغة الإنجليزية','نسخة باللغة الإنجليزية حتى 5 صفحات.',2920,'fixed','حتى 5 صفحات',true,'foundation',10),
      ('extra_language','لغة إضافية','إضافة لغة أخرى للمحتوى المتفق عليه.',438,'fixed','لغة',true,'foundation',20),
      ('extra_page','صفحات إضافية','إضافة صفحة للمشروع.',1342,'per_page','صفحة',true,'foundation',30),
      ('logo','تصميم شعار','تصميم شعار وملفات التسليم الأساسية.',800,'fixed','شعار',true,'foundation',40),
      ('brand','هوية بصرية موسعة','شعار وتطبيقات الهوية ودليل الاستخدام.',3500,'fixed','هوية',true,'foundation',50),
      ('writing','كتابة المحتوى','كتابة ومراجعة محتوى صفحة أو مقال واحد.',400,'per_page','صفحة محتوى',true,'foundation',60),
      ('seo','تهيئة محركات البحث','تهيئة SEO الأساسية للموقع.',3649,'fixed','موقع',true,'foundation',70),
      ('booking','نظام حجز المواعيد','إعداد نظام الحجز الأساسي.',1898,'fixed','نظام',true,'foundation',80),
      ('contact','نماذج تواصل وخرائط','إعداد نموذج التواصل الأساسي.',1000,'fixed','نموذج',true,'foundation',90),
      ('analytics','تحليلات وتقارير','إعداد التحليلات والتقارير الأساسية.',1000,'fixed','إعداد',true,'foundation',100),
      ('payment_gateway','ربط الدفع الإلكتروني','ربط بوابة دفع واحدة؛ رسوم المزود منفصلة.',2175,'fixed','بوابة',true,'integrations',10),
      ('admin_dashboard','لوحة تحكم الإدارة','لوحة إدارة أساسية.',1500,'fixed','لوحة',true,'integrations',20),
      ('customer_portal','بوابة العملاء','بوابة عملاء أساسية.',3500,'fixed','بوابة',true,'integrations',30),
      ('pwa','تطبيق ويب PWA','تجهيز تطبيق ويب قابل للتثبيت.',4000,'fixed','تطبيق',true,'integrations',40),
      ('android_app','تطبيق Android','التطوير بعد التحقق من البناء والنشر؛ رسوم المتجر منفصلة.',7750,'fixed','تطبيق',false,'integrations',50),
      ('ios_app','تطبيق iOS','التطوير بعد التحقق من بيئة البناء والاختبار؛ رسوم المتجر منفصلة.',7750,'fixed','تطبيق',false,'integrations',60),
      ('api_integration','تكامل API','ربط واجهة برمجية واحدة حسب النطاق المتفق عليه.',4379,'fixed','تكامل',true,'integrations',70),
      ('shipping_integration','تكامل الشحن','ربط مزود شحن واحد؛ رسوم المزود منفصلة.',730,'fixed','مزود',true,'integrations',80),
      ('notifications','نظام الإشعارات','تأسيس الإشعارات الأساسية.',1000,'fixed','نظام',true,'integrations',90),
      ('workflow_automation','أتمتة Workflow','تأسيس مسار أتمتة واحد حسب النطاق.',4379,'fixed','مسار',true,'integrations',100),
      ('email_sms_integration','ربط البريد الإلكتروني وSMS','تأسيس البريد (2000) وSMS (6000) معًا؛ رسوم الرسائل منفصلة.',8000,'fixed','ربط البريد وSMS',true,'integrations',110),
      ('site_migration','نقل الموقع','ترحيل موقع واحد وفق نطاق البيانات.',5109,'fixed','موقع',true,'integrations',120),
      ('smart_bot','البوت الذكي','إعداد بوت تقليدي بردود آلية محفوظة.',3000,'fixed','بوت',true,'conversation',10),
      ('ai_assistant','المساعد الذكي للعملاء','تأسيس مساعد AI للعملاء؛ الاستهلاك الخارجي منفصل.',6000,'fixed','مساعد',true,'conversation',20),
      ('whatsapp_bot','واتساب بوت','تأسيس بوت واتساب؛ رسوم المزود والاستهلاك منفصلة.',3500,'fixed','بوت',true,'conversation',30),
      ('live_chat_text','المحادثات النصية','محادثة نصية بشرية مع الفريق أو خدمة العملاء.',1200,'fixed','نظام',true,'conversation',40),
      ('live_chat_attachments','المرفقات داخل المحادثة','إضافة إرسال صور وملفات إلى نظام المحادثة النصية.',800,'fixed','إضافة للشات',true,'conversation',50),
      ('internal_ai_assistant','المساعد الذكي الداخلي','تأسيس مساعد داخلي؛ تكلفة الاستهلاك منفصلة.',2500,'fixed','مساعد',true,'conversation',60),
      ('ad_banners','تصميم بانر إعلاني','تصميم بانر واحد.',150,'fixed','بانر',true,'creative',10),
      ('social_design','تصميم منشورات سوشيال','تصميم منشور واحد دون إدارة الحساب.',150,'fixed','منشور',true,'creative',20),
      ('company_profile','بروفايل شركة','تصميم بروفايل شركة بالنطاق المتفق عليه.',1500,'fixed','بروفايل',true,'creative',30),
      ('promo_video','فيديو إعلاني قصير','إنتاج فيديو إعلاني قصير حسب النطاق المعتمد.',2500,'fixed','فيديو',true,'creative',40),
      ('explainer_video','موشن جرافيك','إنتاج موشن جرافيك لمدة 30 ثانية.',3500,'fixed','30 ثانية',true,'creative',50),
      ('hosting','استضافة مُدارة وحماية','استضافة سنوية بمساحة 500MB.',225,'yearly','500MB',true,'hosting',10),
      ('maintenance','صيانة ودعم','صيانة ودعم شهري بعقد 6 أشهر حسب نطاق الخدمة.',1500,'monthly','موقع',true,'hosting',20),
      ('business_email','بريد احترافي','حساب بريد احترافي سنوي؛ سعر الحساب ضمن باقة 5 حسابات.',500,'yearly','حساب بريد',true,'hosting',30),
      ('advanced_backup','النسخ الاحتياطي المتقدم','نسخ احتياطي سحابي سنوي بمساحة 5GB.',750,'yearly','5GB',true,'hosting',40),
      ('hosting_upgrade','ترقية الاستضافة','فرق سنوي لترقية المساحة من 500MB إلى 2GB.',495,'yearly','ترقية إلى 2GB',true,'hosting',50),
      ('seo_monthly','إدارة وتحسين SEO المستمر','تحسين SEO شهري حسب نطاق العمل.',1500,'monthly','موقع',true,'marketing',10),
      ('google_business_profile','إعداد Google Business وخرائط جوجل','تجهيز الملف لنشاط واحد؛ التحقق بمشاركة العميل.',2500,'fixed','نشاط',true,'marketing',20),
      ('ads_management','إدارة الحملات الإعلانية','إدارة الحملات؛ ميزانية الإعلان منفصلة. مؤجلة حتى التحقق.',2500,'monthly','حساب',false,'marketing',30),
      ('social_management','إدارة السوشيال ميديا','الإدارة الشهرية للحسابات؛ مؤجلة حتى التحقق.',3000,'monthly','حساب',false,'marketing',40),
      ('campaign_tracking','ربط أدوات تتبع الحملات والبكسل','إعداد أدوات التتبع والبكسل بشكل أساسي.',2500,'fixed','إعداد',true,'marketing',50),
      ('click_to_call','زر الاتصال المباشر','إضافة زر اتصال مباشر واحد.',500,'fixed','زر',true,'marketing',60),
      ('social_links','ربط حسابات السوشيال بالموقع','ربط مجموعة روابط حسابات السوشيال بالموقع دون إدارتها.',500,'fixed','مجموعة روابط',true,'marketing',70)
    ON CONFLICT(code) DO UPDATE SET
      description=EXCLUDED.description,price=EXCLUDED.price,pricing_type=EXCLUDED.pricing_type,
      unit_label=EXCLUDED.unit_label,is_active=EXCLUDED.is_active,
      is_required=CASE WHEN EXCLUDED.is_active THEN shared_addons.is_required ELSE false END;
  END IF;
  UPDATE shared_addons SET initial_price=price,initial_pricing_type=pricing_type,initial_unit_label=unit_label
  WHERE initial_price IS NULL OR initial_pricing_type IS NULL OR initial_unit_label IS NULL;
END $$;

CREATE OR REPLACE FUNCTION capture_initial_addon_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.initial_price=NEW.price;
  NEW.initial_pricing_type=NEW.pricing_type;
  NEW.initial_unit_label=NEW.unit_label;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS shared_addon_initial_price ON shared_addons;
CREATE TRIGGER shared_addon_initial_price BEFORE INSERT ON shared_addons
FOR EACH ROW EXECUTE FUNCTION capture_initial_addon_price();
ALTER TABLE shared_addons ALTER COLUMN initial_price SET NOT NULL;
ALTER TABLE shared_addons ALTER COLUMN initial_pricing_type SET NOT NULL;
ALTER TABLE shared_addons ALTER COLUMN initial_unit_label SET NOT NULL;

-- Effective price is the existing canonical price, including discounts. Keep the
-- editable price before discount independently so all checkout paths stay authoritative.
ALTER TABLE shared_addons ADD COLUMN IF NOT EXISTS list_price numeric(12,2) CHECK(list_price>=0);
ALTER TABLE shared_addons ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(discount_percent BETWEEN 0 AND 100);
UPDATE shared_addons SET list_price=price WHERE list_price IS NULL;
ALTER TABLE shared_addons ALTER COLUMN list_price SET NOT NULL;
CREATE OR REPLACE FUNCTION calculate_shared_addon_discount() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.list_price=COALESCE(NEW.list_price,NEW.price);
  ELSIF NEW.price IS DISTINCT FROM OLD.price AND NEW.list_price IS NOT DISTINCT FROM OLD.list_price THEN
    -- Compatibility for other database writers that still set the canonical price.
    NEW.list_price=NEW.price;
  END IF;
  NEW.price=round(NEW.list_price*(100-NEW.discount_percent)/100,2);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS shared_addon_discount ON shared_addons;
CREATE TRIGGER shared_addon_discount BEFORE INSERT OR UPDATE ON shared_addons
FOR EACH ROW EXECUTE FUNCTION calculate_shared_addon_discount();
CREATE OR REPLACE FUNCTION capture_initial_addon_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.initial_price=NEW.list_price;
  NEW.initial_pricing_type=NEW.pricing_type;
  NEW.initial_unit_label=NEW.unit_label;
  RETURN NEW;
END $$;
-- Additive approved EGP launch tariff; never reset an existing administrator definition.
-- Each row is a one-time implementation scope, not hosting or an external subscription.
-- The existing shared_addon triggers capture initial/list prices and project into every package.
DO $$
DECLARE applied text;
BEGIN
  PERFORM pg_advisory_xact_lock(20261127,20);
  INSERT INTO schema_migrations(version) VALUES('2026-11-27-addon-market-expansion')
  ON CONFLICT(version) DO NOTHING RETURNING version INTO applied;
  IF applied IS NOT NULL THEN
    INSERT INTO shared_addons(code,name,description,price,pricing_type,unit_label,is_required,is_active,category_code,sort_order)
    VALUES
      ('news_ticker','شريط الأخبار والإعلانات المتحرك','شريط واحد قابل للإيقاف وتعديل النص والروابط والسرعة. تُطلب فقط إذا لم تكن مشمولة في النظام.',500,'fixed','ميزة',false,true,'foundation',110),
      ('image_slider','سلايدر الصور والعروض','سلايدر متجاوب واحد حتى 5 شرائح؛ الصور يقدمها العميل. تُطلب فقط إذا لم تكن مشمولة في النظام.',750,'fixed','ميزة',false,true,'foundation',120),
      ('internal_search','محرك البحث الداخلي','بحث نصي داخل نوع محتوى واحد مع النتائج والترقيم؛ دون محرك بحث خارجي. تُطلب فقط إذا لم تكن مشمولة في النظام.',2000,'fixed','ميزة',false,true,'foundation',130),
      ('blog_cms','مدونة ونظام نشر المقالات','قائمة وتصنيفات وصفحة مقال وإدارة النشر؛ كتابة المقالات منفصلة. تُطلب فقط إذا لم تكن مشمولة في النظام.',2100,'fixed','ميزة',false,true,'foundation',140),
      ('media_gallery','معرض الصور والفيديوهات المتقدم','معرض واحد بتصنيفات وعرض مكبر وروابط فيديو؛ إنتاج الوسائط والاستضافة منفصلان. تُطلب فقط إذا لم تكن مشمولة في النظام.',1500,'fixed','ميزة',false,true,'foundation',150),
      ('customer_reviews','تقييمات وآراء العملاء','إرسال تقييمات وعرضها بعد اعتماد الإدارة؛ دون جلب تقييمات خارجية مدفوعة. تُطلب فقط إذا لم تكن مشمولة في النظام.',1500,'fixed','ميزة',false,true,'marketing',80),
      ('promo_popup','النوافذ الإعلانية المنبثقة','نافذة إعلان واحدة مع الإغلاق والتحكم بوقت العرض وتكراره. تُطلب فقط إذا لم تكن مشمولة في النظام.',750,'fixed','ميزة',false,true,'marketing',90),
      ('countdown_timer','عداد تنازلي للعروض','عداد واحد مرتبط بموعد انتهاء العرض مع إخفائه بعد الانتهاء. تُطلب فقط إذا لم تكن مشمولة في النظام.',500,'fixed','ميزة',false,true,'marketing',100),
      ('coupons_discounts','نظام الكوبونات والخصومات','كوبونات لنوع طلب واحد مع نسبة أو مبلغ وحدود صلاحية واستخدام. تُطلب فقط إذا لم تكن مشمولة في النظام.',2500,'fixed','ميزة',false,true,'marketing',110),
      ('loyalty_rewards','نظام نقاط الولاء والمكافآت','قواعد اكتساب واستبدال النقاط وسجل الحركات لنوع طلب واحد. تُطلب فقط إذا لم تكن مشمولة في النظام.',4000,'fixed','ميزة',false,true,'marketing',120),
      ('newsletter_subscriptions','النشرة البريدية والاشتراكات','نموذج اشتراك وإلغاء اشتراك وربط قائمة بريدية واحدة؛ رسوم الإرسال منفصلة. تُطلب فقط إذا لم تكن مشمولة في النظام.',1250,'fixed','ميزة',false,true,'marketing',130),
      ('dynamic_qr','إنشاء رموز QR ديناميكية','إنشاء روابط QR قابلة لتعديل الوجهة مع لوحة إدارة أساسية؛ خدمات خارجية منفصلة. تُطلب فقط إذا لم تكن مشمولة في النظام.',2000,'fixed','ميزة',false,true,'integrations',130),
      ('support_tickets','نظام تذاكر الدعم الفني','فتح التذاكر وتصنيفها وتعيينها ومتابعة الردود والحالة؛ دون تكلفة الرسائل الخارجية. تُطلب فقط إذا لم تكن مشمولة في النظام.',3500,'fixed','ميزة',false,true,'conversation',70),
      ('excel_pdf_import_export','تصدير واستيراد Excel وPDF','استيراد وتصدير Excel لكيان بيانات واحد مع تحقق من الأعمدة، وتصدير PDF بتقرير واحد. تُطلب فقط إذا لم تكن مشمولة في النظام.',3000,'fixed','ميزة',false,true,'integrations',140),
      ('advanced_staff_roles','صلاحيات الموظفين المتقدمة','مصفوفة صلاحيات وحدات إضافية وسجل تغييرات للأدوار؛ الحماية الأساسية مشمولة أصلًا. تُطلب فقط إذا لم تكن مشمولة في النظام.',3500,'fixed','ميزة',false,true,'integrations',150),
      ('multi_branch','نظام الفروع المتعددة','إدارة الفروع وعزل بياناتها وصلاحياتها وتقاريرها ضمن مشروع واحد؛ دون ترحيل بيانات. تُطلب فقط إذا لم تكن مشمولة في النظام.',5500,'fixed','ميزة',false,true,'integrations',160),
      ('paid_memberships','نظام الاشتراكات والعضويات المدفوعة','خطط عضوية وحالات اشتراك وتجديد وصلاحيات وصول؛ ربط بوابة الدفع ورسومها منفصلان إذا لم يكونا موجودين. تُطلب فقط إذا لم تكن مشمولة في النظام.',5000,'fixed','ميزة',false,true,'integrations',170),
      ('google_sign_in','تسجيل الدخول بحساب Google','ربط Google OAuth لمشروع واحد بحسابات العميل؛ لا يشمل رسوم أو خدمات خارجية. تُطلب فقط إذا لم تكن مشمولة في النظام.',1750,'fixed','ميزة',false,true,'integrations',180),
      ('advanced_2fa','المصادقة الثنائية المتقدمة 2FA','إدارة سياسات 2FA للأدوار وحسابات الاسترداد كامتداد اختياري؛ لا تُباع الحماية الأساسية كإضافة. تُطلب فقط إذا لم تكن مشمولة في النظام.',2000,'fixed','ميزة',false,true,'hosting',60),
      ('electronic_signature','ربط التوقيع الإلكتروني للمستندات','ربط مزود توقيع واحد لمستند نموذجي ومسار متابعة؛ التراخيص والشهادات والتحقق القانوني منفصلة. تُطلب فقط إذا لم تكن مشمولة في النظام.',2500,'fixed','ميزة',false,true,'integrations',190)
    ON CONFLICT(code) DO NOTHING;
  END IF;
END $$;
