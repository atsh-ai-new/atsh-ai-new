import {test,expect} from "@playwright/test";

test("new customer chooses ready store and keeps a scoped preference draft",async({page})=>{
 await page.goto("/start");
 await page.getByRole("button",{name:/متجر إلكتروني/}).click();
 await page.getByRole("button",{name:"التالي"}).click();
 await page.getByRole("textbox",{name:"اسم المشروع / النشاط"}).fill("متجر العميل");
 await page.getByRole("checkbox",{name:"دفع إلكتروني"}).check();
 await page.getByRole("button",{name:/عرض النماذج التفاعلية/}).click();
 await expect(page).toHaveURL(/\/catalog$/);
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("atsh_customer_workspace_v1")||"{}"));
 expect(data).toMatchObject({projectMode:"ready",solutionType:"store",businessName:"متجر العميل",options:["payments"]});
});

test("custom client request creates one authenticated account-owned project draft",async({page})=>{
 const submitted:Array<Record<string,unknown>>=[];
 await page.route("**/api/customer/auth/me",async route=>route.fulfill({status:200,contentType:"application/json",body:'{"customer":{"name":"عميل","email":"client@example.test"}}'}));
 await page.route("**/api/customer/auth/project-drafts",async route=>{
  submitted.push(route.request().postDataJSON() as Record<string,unknown>);
  await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({projectDraft:{id:"11111111-2222-4333-8444-555555555555"}})});
 });
 await page.route("**/api/customer/auth/project-drafts/11111111-2222-4333-8444-555555555555",async route=>route.fulfill({status:404,contentType:"application/json",body:'{}'}));
 await page.goto("/start");
 await page.getByRole("button",{name:/تطبيق موبايل/}).click();
 await page.getByRole("button",{name:/مشروع بمواصفات خاصة/}).click();
 await page.getByRole("button",{name:"التالي"}).click();
 await page.getByRole("textbox",{name:"اسم المشروع / النشاط"}).fill("تطبيق الشحن");
 await page.getByRole("textbox",{name:"اشرح طلبك"}).fill("نظام للسائقين والعملاء ولوحة تحكم");
 await page.getByRole("checkbox",{name:"لوحة إدارة"}).check();
 await page.getByRole("button",{name:/حفظ مسودة المشروع/}).click();
 await expect.poll(()=>submitted.length).toBe(1);
 expect(submitted[0].draft).toMatchObject({projectMode:"custom",solutionType:"mobile",businessName:"تطبيق الشحن",options:["admin-panel"],requirements:"نظام للسائقين والعملاء ولوحة تحكم"});
});
