import {test,expect} from "@playwright/test";

test("retired start route redirects to catalogue",async({page})=>{
 await page.goto("/start");
 await expect(page).toHaveURL(/\/catalog\/?$/);
});

for(const existing of [false,true]){
 test("invoice survives management submission and reload (existing draft: "+existing+")",async({page})=>{
 const id="11111111-2222-4333-8444-555555555555",projectId="22222222-3333-4444-8555-666666666666";
 const invoice={title:"متجر الاختبار",items:[{name:"الباقة الأساسية",amount:1000,period:"fixed"}],subtotal:1000,vat:140,total:1140,fixed:1000,monthly:0,yearly:0,currency:"EGP",savedAt:"2026-11-24T00:00:00Z"};
 const selection={packageId:"store-basic",sectorSlug:"retail",projectMode:"ready",solutionType:"store",draftInvoice:invoice};
 let drafts:any[]=existing?[{id,title:invoice.title,revision:1,draft:selection,linked_journey_id:null}]:[];
 let sent=0,created=0;
 await page.route("**/api/customer/auth/**",async route=>{
 const p=new URL(route.request().url()).pathname,m=route.request().method();let body:any={};
 if(p.endsWith("/me"))body={customer:{name:"عميل"}};
 else if(p.endsWith("/workspace"))body={workspace:{draft:selection}};
 else if(p.endsWith("/project-drafts")&&m==="GET")body={drafts};
 else if(p.endsWith("/project-drafts")&&m==="POST"){created++;const data=route.request().postDataJSON();drafts=[{id,title:data.title,revision:1,draft:data.draft,linked_journey_id:null}];body={projectDraft:drafts[0]};}
 else if(p.endsWith("/submit")){sent++;expect(drafts[0].draft.draftInvoice).toEqual(invoice);expect(drafts[0].draft.packageId).toBe("store-basic");drafts[0]={...drafts[0],linked_journey_id:projectId};body={projectId,status:"draft"};}
 else if(p.endsWith("/projects"))body={projects:sent?[{id:projectId,customer_name:invoice.title,status:"draft"}]:[]};
 else if(p.endsWith("/previews"))body={previews:[]};
 else if(p.endsWith("/messages"))body={messages:[]};
 await route.fulfill({status:200,json:body});
 });
 await page.route("**/api/customer/commercial/**",route=>route.fulfill({status:200,json:{orders:[],quotes:[],contracts:[],invoices:[]}}));
 await page.route("**/api/customer/deliverables",route=>route.fulfill({status:200,json:{deliverables:[]}}));
 await page.goto("/account/dashboard");
 await expect(page.getByText("الباقة الأساسية",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"تأكيد وإرسال الطلب للإدارة"}).click();
 await expect.poll(()=>sent).toBe(1);
 await expect(page.getByRole("button",{name:"تأكيد وإرسال الطلب للإدارة"})).toHaveCount(0);
 await expect(page.getByText("الباقة الأساسية",{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByText("الباقة الأساسية",{exact:true})).toBeVisible();
 expect(created).toBe(existing?0:1);
 });
}
