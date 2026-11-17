import {test,expect} from "@playwright/test";

test("Arabic catalog sector > subcategory > demo flow",async({page})=>{
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
 await page.getByRole("link",{name:"تخصيص الباقة والسعر"}).click();
 await expect(page).toHaveURL(/sector=agzakhana/);
});

test("mobile filters and previews remain accessible without horizontal overflow",async({page})=>{
 await page.goto("/catalog");
 await expect(page.getByRole("navigation",{name:"القطاعات الرئيسية"})).toBeVisible();
 await page.getByRole("searchbox",{name:"البحث في الكتالوجات"}).fill("سوبر ماركت");
 await expect(page.getByRole("heading",{name:"سوبر ماركت"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"عيادتي"})).toHaveCount(0);
 await page.getByRole("link",{name:/المعاينة التفاعلية/}).first().click();
 await expect(page.getByRole("navigation",{name:"أقسام النموذج"})).toBeVisible();
 await page.getByRole("button",{name:/إضافة سجل تجريبي/}).click();
 await page.getByRole("textbox",{name:"اسم السجل"}).fill("عنصر تجريبي");
 await page.getByRole("button",{name:"حفظ تجريبي"}).click();
 await expect(page.getByRole("cell",{name:"عنصر تجريبي"})).toBeVisible();
});
