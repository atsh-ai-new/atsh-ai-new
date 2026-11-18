import {test,expect} from "@playwright/test";

test("public catalog shows sector cards and real interactive pharmacy preview",async({page})=>{
 await page.goto("/catalog");
 await expect(page.getByRole("heading",{name:"استكشف الأنظمة حسب مجالك"})).toBeVisible();
 await page.getByRole("button",{name:/الصحة والرعاية الطبية/}).click();
 await expect(page.getByRole("heading",{name:"عيادتي"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"أجزخانة"})).toBeVisible();
 await page.getByRole("combobox",{name:"التصنيف الفرعي"}).selectOption("pharmacies");
 await expect(page.getByRole("heading",{name:"أجزخانة"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"عيادتي"})).toHaveCount(0);
 await page.getByRole("link",{name:/المعاينة التفاعلية/}).first().click();
 await expect(page).toHaveURL(/\/catalog\/agzakhana$/);
 await expect(page.getByText("معاينة تجريبية — بلا خادم أو دفع حقيقي")).toBeVisible();
 await page.getByRole("textbox",{name:"اسم النشاط التجريبي"}).fill("صيدلية العميل");
 await expect(page.getByRole("heading",{name:/صيدلية العميل/})).toBeVisible();
 const modules=page.getByRole("navigation",{name:"أقسام النموذج"});
 await modules.getByRole("button",{name:"الكاشير"}).click();
 await expect(page.getByRole("heading",{name:"كاشير POS تفاعلي"})).toBeVisible();
 await page.getByRole("button",{name:"إضافة للفاتورة"}).click();
 await expect(page.getByText("الفاتورة الحالية")).toBeVisible();
 await page.getByRole("button",{name:"إتمام بيع تجريبي"}).click();
 await expect(page.getByRole("status").filter({hasText:"صدرت فاتورة تجريبية"})).toBeVisible();
 await modules.getByRole("button",{name:"المبيعات"}).click();
 await expect(page.getByRole("heading",{name:"سجل فواتير المبيعات"})).toBeVisible();
 await page.getByRole("link",{name:"تخصيص الباقة والسعر"}).click();
 await expect(page).toHaveURL(/sector=agzakhana/);
});

test("mobile sector previews: checkout changes inventory and no page overflow",async({page})=>{
 await page.goto("/catalog");
 await expect(page.getByRole("navigation",{name:"القطاعات الرئيسية"})).toBeVisible();
 await page.getByRole("searchbox",{name:"البحث في الكتالوجات"}).fill("سوبر ماركت");
 await expect(page.getByRole("heading",{name:"سوبر ماركت"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"عيادتي"})).toHaveCount(0);
 await page.getByRole("link",{name:/المعاينة التفاعلية/}).first().click();
 const modules=page.getByRole("navigation",{name:"أقسام النموذج"});
 await modules.getByRole("button",{name:"الكاشير"}).click();
 await expect(page.getByRole("heading",{name:"كاشير POS تفاعلي"})).toBeVisible();
 await page.getByRole("button",{name:"إضافة للفاتورة"}).click();
 await page.getByRole("button",{name:"إتمام بيع تجريبي"}).click();
 await modules.getByRole("button",{name:"الأصناف"}).click();
 await expect(page.getByRole("row").filter({hasText:"أرز 1 كجم"})).toContainText("24");
 const viewportOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 expect(viewportOverflow).toBe(false);
});

test("clinic schedules and completes a fictional appointment",async({page})=>{
 await page.goto("/catalog/eyadaty");
 const modules=page.getByRole("navigation",{name:"أقسام النموذج"});
 await modules.getByRole("button",{name:"المواعيد"}).click();
 await page.getByRole("textbox",{name:"تاريخ الموعد"}).fill("2026-12-05T14:00");
 await page.getByRole("button",{name:"حجز موعد"}).click();
 await expect(page.getByRole("status").filter({hasText:"تم حجز موعد تجريبي"})).toBeVisible();
 await page.getByRole("button",{name:"اكتمال الكشف"}).last().click();
 await modules.getByRole("button",{name:"الكشوفات"}).click();
 await expect(page.getByRole("cell",{name:"مكتمل"})).toBeVisible();
});

test("legal preview tracks case status and can issue fictional fees",async({page})=>{
 await page.goto("/catalog/avocato");
 const modules=page.getByRole("navigation",{name:"أقسام النموذج"});
 await modules.getByRole("button",{name:"القضايا"}).click();
 await page.getByRole("textbox",{name:"عنوان القضية"}).fill("نزاع تجاري افتراضي");
 await page.getByRole("button",{name:"إضافة قضية تجريبية"}).click();
 await expect(page.getByRole("cell",{name:"نزاع تجاري افتراضي"})).toBeVisible();
 await page.getByRole("button",{name:"تغيير الحالة"}).first().click();
 await expect(page.getByRole("cell",{name:"قيد المتابعة"})).toBeVisible();
 await modules.getByRole("button",{name:"الأتعاب"}).click();
 await page.getByRole("button",{name:"إصدار فاتورة تجريبية"}).click();
 await expect(page.getByRole("button",{name:"تسجيل سداد تجريبي"})).toBeVisible();
});
