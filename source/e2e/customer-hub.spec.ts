import {test,expect} from "@playwright/test";

const draftId="11111111-2222-4333-8444-555555555555";
test.beforeEach(async({page})=>{
 await page.route("**/api/customer/auth/**",async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  const payload=path.endsWith("/me")?{customer:{name:"عميل تجريبي",email:"client@example.test"}}:
   path.endsWith("/workspace")?{workspace:{draft:{sectorSlug:"eyadaty",sectorName:"عيادتي",sectorAddonCodes:["booking"]}}}:
   path.endsWith("/project-drafts")?{drafts:[{id:draftId,title:"مشروع العيادة",revision:2,updated_at:"2026-11-18T01:00:00.000Z",draft:{sectorSlug:"eyadaty",sectorName:"عيادتي",packageId:"dynamic",sectorAddonCodes:["booking"]}}]}:
   path.endsWith("/previews")?{previews:[{id:"11111111-2222-4333-8444-555555555556",revision:1,approval_status:"pending",created_at:"2026-11-18T01:00:00.000Z",snapshot:{sectorSlug:"eyadaty"}}]}:
   path.endsWith("/projects")?{projects:[]}:{};
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(payload)});
 });
 await page.route("**/api/customer/commercial/**",async route=>{
  const kind=new URL(route.request().url()).pathname.split("/").at(-1);
  const payload=kind==="orders"?{orders:[]}:
   kind==="quotes"?{quotes:[]}:
   kind==="contracts"?{contracts:[]}:{invoices:[]};
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(payload)});
 });
 await page.route("**/api/customer/deliverables",async route=>route.fulfill({status:200,contentType:"application/json",body:'{"deliverables":[]}'}));
});

test("account shows a unified customer path and stable project cards",async({page})=>{
 await page.goto("/account/dashboard");
 const nav=page.getByRole("navigation",{name:"أقسام حساب العميل"});
 await expect(nav.getByRole("button",{name:"الرئيسية"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"رحلة المشروع الحالية"})).toBeVisible();
 await expect(page.getByText("مشروع العيادة")).toBeVisible();
 await nav.getByRole("button",{name:"مشروعاتي ومعايناتي"}).click();
 await expect(page.getByRole("heading",{name:"مسودات مشروعاتي المستقلة"})).toBeVisible();
 await expect(page.getByText("1 إضافة مختارة")).toBeVisible();
 await nav.getByRole("button",{name:"الطلبات وعروض الأسعار"}).click();
 await expect(page.getByRole("heading",{name:"عروض الأسعار"})).toBeVisible();
 await nav.getByRole("button",{name:"العقود"}).click();
 await expect(page.getByRole("heading",{name:"عقودي"})).toBeVisible();
 await nav.getByRole("button",{name:"الفواتير والمدفوعات"}).click();
 await expect(page.getByRole("heading",{name:"الفواتير وسجل المدفوعات"})).toBeVisible();
 await nav.getByRole("button",{name:"التسليم والمراجعات"}).click();
 await expect(page.getByRole("heading",{name:/تسليماتي/})).toBeVisible();
});
test("mobile hub remains usable without horizontal page overflow",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/account/dashboard");
 await expect(page.getByRole("heading",{name:"من الفكرة حتى تسليم مشروعك"})).toBeVisible();
 await page.getByRole("navigation",{name:"أقسام حساب العميل"}).getByRole("button",{name:"مشروعاتي ومعايناتي"}).click();
 await expect(page.getByText("مشروع العيادة").first()).toBeVisible();
 const geometry=await page.evaluate(()=>({viewport:window.innerWidth,document:document.documentElement.scrollWidth}));
 expect(geometry.document).toBeLessThanOrEqual(geometry.viewport+2);
});
