import {test,expect} from "@playwright/test";

test("admin creates and activates a service and sees persisted server responses",async({page})=>{
 const projectId="11111111-2222-4333-8444-555555555555";
 const serviceId="22222222-3333-4444-8555-666666666666";
 const services:Array<Record<string,string>>=[];
 const mutations:string[]=[];
 await page.route("**/api/admin/**",async route=>{
  const url=new URL(route.request().url());
  const path=url.pathname;
  const method=route.request().method();
  let status=200;
  let body:Record<string,unknown>={};
  if(path==="/api/admin/me")body={email:"owner@example.test",role:"owner",permissions:{customers:true}};
  else if(path==="/api/admin/customer-service-projects")body={projects:[{id:projectId,title:"متجر الاختبار",customer_name:"عميل الاختبار",customer_email:"customer@example.test",linked_journey_id:null}]};
  else if(path==="/api/admin/customer-services"&&method==="GET")body={services};
  else if(path==="/api/admin/customer-services"&&method==="POST"){
   const data=route.request().postDataJSON() as Record<string,string>;
   expect(data.projectDraftId).toBe(projectId);
   expect(data.serviceCode).toBe("hosting");
   services.push({id:serviceId,service_code:data.serviceCode,service_name:data.serviceName,description:data.description||"",source_type:data.sourceType,status:data.status});
   mutations.push("create");status=201;body={service:services[0]};
  }else if(path==="/api/admin/customer-services/"+serviceId&&method==="PATCH"){
   const data=route.request().postDataJSON() as {status:string};
   services[0].status=data.status;mutations.push("status:"+data.status);body={service:services[0]};
  }
  await route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});
 });
 await page.goto("/admin");
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"العملاء"}).click();
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:/المشاريع/}).click();
 const section=page.locator('section[aria-label="خدمات العملاء"]');
 await expect(section).toBeVisible();
 await section.getByLabel("اختر مشروع العميل").selectOption(projectId);
 await section.getByRole("button",{name:"عرض الخدمات"}).click();
 await expect(section.getByText("لا توجد خدمات مسجلة لهذا المشروع.")).toBeVisible();
 await section.getByText("إضافة خدمة جديدة للمشروع",{exact:true}).click();
 await section.getByLabel("اسم الخدمة").fill("استضافة العميل");
 await section.getByLabel("كود الخدمة").fill("hosting");
 await section.getByRole("button",{name:"حفظ الخدمة"}).click();
 await expect(section.getByText("استضافة العميل")).toBeVisible();
 await expect.poll(()=>mutations).toContain("create");
 await section.locator("article").getByLabel("الحالة").selectOption("active");
 await expect.poll(()=>mutations).toContain("status:active");
 await expect(section.getByText("manual — active")).toBeVisible();
});
