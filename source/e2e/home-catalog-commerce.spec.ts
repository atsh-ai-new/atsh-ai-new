import {test,expect} from "@playwright/test";

test("published catalog is directly visible in homepage packages with sector and demo drilldown",async({page})=>{
 await page.goto("/");
 const section=page.locator('[aria-label="الكتالوجات والتطبيقات المتاحة"]');
 await expect(section.getByRole("heading",{name:"اختر نظامًا جاهزًا وجرّبه قبل الطلب"})).toBeVisible();
 await expect(section.getByRole("heading",{name:"عيادتي"})).toBeVisible();
 await expect(section.getByRole("heading",{name:"أجزخانة"})).toBeVisible();
 await section.getByRole("button",{name:/الصحة والرعاية الطبية/}).click();
 await expect(section.getByRole("heading",{name:"عيادتي"})).toBeVisible();
 await expect(section.getByRole("heading",{name:"أفوكاتو"})).toHaveCount(0);
 await section.getByRole("button",{name:"اختيار وإضافة تفاصيل"}).first().click();
 await expect(section.getByRole("heading",{name:/تخصيص/})).toBeVisible();
 await expect(section.getByRole("link",{name:/شرح ومشاهدة النموذج الكامل/})).toBeVisible();
 await section.getByRole("link",{name:/شرح ومشاهدة النموذج الكامل/}).click();
 await expect(page).toHaveURL(/\/catalog\/(eyadaty|agzakhana)$/);
 await expect(page.getByRole("heading",{name:"المزايا والإضافات الخاصة بالنظام"})).toBeVisible();
 await expect(page.locator("iframe")).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 expect(overflow).toBe(false);
});

test("customer can review exact quote and contract, request changes, and accept without gateway",async({page})=>{
 const quoteId="412",contractId=903;
 let status="issued",changePending=false,invoiceCreated=false,acceptPayload:Record<string,unknown>|null=null;
 const base={quote:{id:Number(quoteId),revision:3,status:"issued",items:[{label:"نظام عيادات",quantity:1,unitPricePiasters:2800000},{label:"استضافة سنوية",quantity:1,unitPricePiasters:60000,period:"yearly"}],total_piasters:2860000,currency:"EGP",valid_until:"2027-02-18T00:00:00.000Z",accepted_at:null},contract:{id:contractId,status:"issued",body_snapshot:"عقد تطوير نظام عيادات يحدد الشروط وحقوق الكود وآلية التسليم.",signer_name:null,signed_at:null,template_category:"source_code",template_revision:1},invoices:[],changeRequests:[],project:{id:"11111111-2222-4333-8444-555555555555",status:"quoted",template_id:"eyadaty",draft_id:"11111111-2222-4333-8444-555555555556"},payment:{gatewayConnected:false,canPayOnline:false,note:"الدفع الإلكتروني لم يفعل"}};
 await page.route(`**/api/customer/commercial/quotes/${quoteId}/**`,async route=>{
  const req=route.request(),method=req.method(),pathname=new URL(req.url()).pathname;
  if(method==="GET"){
   const data={...base,quote:{...base.quote,status},contract:{...base.contract,status:status==="accepted"?"signed":"issued"},changeRequests:changePending?[{id:1,details:"أريد تحديث بند الاستضافة",status:"pending",created_at:new Date().toISOString()}]:[],invoices:invoiceCreated?[{id:114,amount_piasters:2860000,verified_paid_piasters:0,status:"unpaid",due_at:null}]:[]};
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)});
  }else if(pathname.endsWith("/request-changes")){changePending=true;await route.fulfill({status:201,contentType:"application/json",body:'{"changeRequest":{"id":1}}'});}
  else if(pathname.endsWith("/accept")){acceptPayload=req.postDataJSON();status="accepted";invoiceCreated=true;await route.fulfill({status:200,contentType:"application/json",body:'{"accepted":true,"paymentStatus":"pending_gateway"}'});}
  else await route.fulfill({status:404,body:"{}"});
 });
 await page.goto(`/account/checkout/${quoteId}`);
 await expect(page.getByRole("heading",{name:`عرض السعر رقم #${quoteId}`})).toBeVisible();
 await expect(page.getByText("بوابة الدفع الإلكتروني غير مفعّلة بعد",{exact:false})).toBeVisible();
 await expect(page.getByRole("cell",{name:"نظام عيادات"})).toBeVisible();
 await page.getByRole("button",{name:"طلب تعديل على العرض"}).click();
 await page.getByRole("textbox",{name:"ما البنود التي تريد تعديلها؟"}).fill("أريد تحديث بند الاستضافة السنوية");
 await page.getByRole("button",{name:"إرسال طلب التعديل للإدارة"}).click();
 await expect(page.getByText("لديك طلب تعديل مفتوح",{exact:false})).toBeVisible();
 expect(acceptPayload).toBeNull();
 // Simulate admin approval of the request before customer consent.
 changePending=false;
 await page.reload();
 await page.getByRole("textbox",{name:"الاسم الكامل لصاحب الإقرار"}).fill("عميل تجريبي معتمد");
 await page.getByRole("checkbox",{name:/قرأت عرض السعر والعقد/}).check();
 await page.getByRole("button",{name:/اعتماد العرض وإقرار العقد/}).click();
 await expect(page.getByText("بانتظار الدفع",{exact:false}).first()).toBeVisible();
 expect(acceptPayload).toMatchObject({contractId,quoteRevision:3,consent:true});
 await expect(page.getByText("لم يتم تحصيل",{exact:false})).toHaveCount(0);
 await expect(page.getByText("بوابة الدفع الإلكتروني غير مفعّلة بعد",{exact:false})).toBeVisible();
});


test("homepage shows a published admin-priced catalog addon and persists its selection into official builder",async({page})=>{
 const catalog={
  page:{slug:"catalog",content:{
   sectors:[{id:"health",name:"الصحة والرعاية الطبية",icon:"🩺",description:"أنظمة طبية",sortOrder:1,isPublished:true,subcategories:[{id:"clinics",name:"العيادات",sortOrder:1,isPublished:true}]}],
   items:[
    {slug:"eyadaty",name:"عيادتي",category:"العيادات",sectorId:"health",subcategoryId:"clinics",description:"نظام تجريبي للعيادات",icon:"🩺",features:["الحجوزات"],modules:["المواعيد"],sampleStats:[],sampleRows:[],note:"محاكاة فقط",published:true,archived:false,basePrice:25000,pricedAddons:[{code:"sms-reminders",name:"رسائل تذكير بالمواعيد",price:750,pricingType:"yearly"}]},
    {slug:"avocato",name:"أفوكاتو المخفي",category:"العيادات",sectorId:"health",subcategoryId:"clinics",description:"غير منشور",icon:"⚖️",published:false,archived:false,basePrice:500,pricedAddons:[]}
   ]
  }}
 };
 await page.route("**/api/site-content/catalog",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(catalog)}));
 await page.route("**/api/sector-price**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({subtotal:25750,monthly:0,yearly:750,needsCustomQuote:false,items:[{code:"sms-reminders",name:"رسائل تذكير بالمواعيد",price:750,pricingType:"yearly"}]})}));
 await page.goto("/");
 const section=page.locator('[aria-label="الكتالوجات والتطبيقات المتاحة"]');
 await expect(section.getByRole("heading",{name:"عيادتي"})).toBeVisible();
 await expect(section.getByRole("heading",{name:"أفوكاتو المخفي"})).toHaveCount(0);
 await section.getByRole("button",{name:/اختيار وإضافة تفاصيل/}).click();
 await expect(section.getByText("رسائل تذكير بالمواعيد")).toBeVisible();
 await section.getByRole("checkbox",{name:/رسائل تذكير بالمواعيد/}).check();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("atsh_customer_workspace_v1")||"{}"));
 expect(stored).toMatchObject({sectorSlug:"eyadaty",sectorAddonCodes:["sms-reminders"]});
 await section.getByRole("link",{name:/استكمال المواصفات وعرض السعر/}).click();
 await expect(page.locator("#configurator")).toBeVisible();
 await expect(page.getByRole("heading",{name:"إضافات خاصة بنظام عيادتي"})).toBeVisible();
 await expect(page.getByRole("checkbox",{name:/رسائل تذكير بالمواعيد/}).first()).toBeChecked();
});

test("private token review link opens contract and clears the URL secret from history",async({page})=>{
 const secret="A".repeat(43);
 let loaded=false;
 await page.route(`**/api/commercial/review/${secret}`,async route=>{
  loaded=true;
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({quote:{id:42,status:"issued",items:[{label:"متجر إلكتروني",quantity:1,unitPricePiasters:100000}],totalPiasters:100000,currency:"EGP",validUntil:null},contract:{id:4,body:"بنود عقد تجريبي لمتجر إلكتروني",status:"issued",signedAt:null}})});
 });
 await page.goto(`/commercial/review?token=${secret}`);
 await expect(page.getByRole("heading",{name:"عرض السعر رقم 42"})).toBeVisible();
 expect(loaded).toBe(true);
 await expect(page).toHaveURL(url=>url.pathname==="/commercial/review"&&!url.searchParams.has("token"));
 await expect(page.getByText("بنود عقد تجريبي لمتجر إلكتروني")).toBeVisible();
});
