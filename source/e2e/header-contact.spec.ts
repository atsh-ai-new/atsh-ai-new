import {test,expect} from "@playwright/test";

for (const locale of ["ar","en"]) {
 test("homepage header omits street address and telephone while keeping its controls "+locale,async({page})=>{
  await page.goto("/"+locale);
  const header=page.locator(".platform-header");
  await expect(header).toBeVisible();
  await expect(header.locator(".platform-header-contact")).toHaveCount(0);
  await expect(header.locator('a[href^="tel:"]')).toHaveCount(0);
  await expect(header).not.toContainText("شارع النقطة القديمة");
  await expect(header).not.toContainText("01007735321");
  await expect(header.locator(".platform-brand")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("font-weight","500");
  await expect(header.locator(".platform-brand small")).toHaveCSS("font-size",page.viewportSize()!.width<=767?"13px":"14px");
  await expect(header.locator(".platform-brand small")).toHaveCSS("font-weight","600");
  await expect(header).not.toHaveClass(/platform-header-with-contact/);
  const contactMenu=page.locator(".atsh-fab-contact-menu");
  await expect(contactMenu).toBeVisible();
  // The Next.js development indicator overlays the Arabic floating menu in CI.
  await contactMenu.press("Enter");
  await expect(page.locator('#atsh-contact-submenu a[href="tel:+201007735321"]')).toBeVisible();
 });
}

test("news ticker stays at the very top above the homepage header rather than covering the viewport",async({page})=>{
 await page.route("**/api/site-content/home?locale=*",route=>route.fulfill({json:{page:{content:{newsTicker:{enabled:true,text:"Test news",speed:25,background:"#fff",color:"#14243C",url:""}}}}}));
 await page.goto("/ar");
 const header=page.locator(".platform-header");
 const ticker=page.locator("body > .atsh-news-slot:first-child .atsh-news-ticker");
 await expect(ticker).toBeVisible();
 await expect(ticker).toHaveCSS("font-size","14px");
 await expect(ticker).toHaveCSS("font-weight","600");
 const initial=await ticker.boundingBox(),headerBounds=await header.boundingBox();
 expect(Math.abs(initial!.y)).toBeLessThan(2);
 expect(Math.abs(initial!.y+initial!.height-headerBounds!.y)).toBeLessThan(2);
 await page.evaluate(()=>window.scrollBy(0,500));
 await expect.poll(async()=>ticker.evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThan(0);
});

test("localized administration links resolve to their existing canonical pages",async({request})=>{
 for(const path of ["/admin","/admin/builder","/admin/deliverables"]){
  const response=await request.get("/en"+path+"?test=1",{maxRedirects:0});
  expect(response.status()).toBe(307);
  expect(new URL(response.headers()["location"],response.url()).pathname).toBe(path);
  expect(new URL(response.headers()["location"],response.url()).search).toBe("?test=1");
 }
});

// Compact estimate typography is deliberately exempt from the platform-wide font scale.
for (const locale of ['ar', 'en']) {
 test(`homepage estimate retains original compact font sizes (${locale})`, async ({page})=>{
  await page.route('**/api/catalog', route=>route.fulfill({json:{packages:[{id:'multi',name:'موقع متعدد الصفحات',price:'1990',currency:'EGP',features:[],description:'',tagline:'',is_featured:false,is_custom_quote:false}],options:[],sharedOptions:[{id:'hosting',package_id:'multi',code:'hosting',name:'استضافة',price:'225',pricing_type:'yearly',description:'',is_required:false,is_active:true,sort_order:1}]}}));
  await page.goto('/'+locale);
  const card=page.locator('.hero-price-card');
  await expect(card).toBeVisible();
  const mobile=(page.viewportSize()?.width??1280)<=640;
  await expect(card.locator('.price-card-top')).toHaveCSS('font-size',mobile?'9px':'10px');
  await expect(card.locator('.price-preview-line').first()).toHaveCSS('font-size',mobile?'9px':'10px');
  await expect(card.locator('.price-preview-total strong')).toHaveCSS('font-size',mobile?'12px':'18px');
  await expect(card.locator('small')).toHaveCSS('font-size',mobile?'8px':'9px');
  await expect(card.locator('.addon-price-current')).toContainText(locale==='ar'?'12 شهرًا':'12 months');
  expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await expect(page.locator('.trust-strip')).toHaveCSS('font-size','14px');
 });
}

for (const [position,anchor] of [
 ["below_header",".platform-header + .atsh-news-slot"],
 ["after_hero",".build-hero + .atsh-news-slot"],
 ["before_footer",".atsh-news-slot:has(+ .platform-footer)"],
 ["invalid-value","body > .atsh-news-slot:first-child"]
]) {
 test("news ticker uses the saved position "+position,async({page})=>{
  await page.route("**/api/site-content/home?locale=*",route=>route.fulfill({json:{page:{content:{newsTicker:{enabled:true,text:"Position test",speed:25,position}}}}}));
  await page.goto("/en");
  await expect(page.locator(anchor+" .atsh-news-ticker")).toBeVisible();
  await expect(page.locator(".atsh-news-ticker")).toHaveCount(1);
 });
}

test("admin moves the ticker, previews the draft, publishes and reloads its position",async({page})=>{
 let published={slug:"home",locale:"ar",is_published:true,content:{newsTicker:{enabled:true,text:"خبر تجريبي",url:"",speed:25,background:"#ffffff",color:"#14243C"}}};
 let saves=0;
 await page.route("**/api/admin/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/api/admin/me")return route.fulfill({json:{email:"owner@example.test",role:"owner",permissions:{content:true,products:true}}});
  if(path==="/api/admin/pages")return route.fulfill({json:{pages:[published]}});
  if(path==="/api/admin/pages/home"&&route.request().method()==="PATCH"){
   published={...published,content:route.request().postDataJSON().content};saves++;
   return route.fulfill({json:{page:published}});
  }
  return route.fulfill({json:{}});
 });
 await page.route("**/api/site-content/home?locale=*",route=>route.fulfill({json:{page:published}}));
 await page.goto("/admin");
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"محتوى المنصة",exact:true}).click();
 const position=page.getByLabel("موضع الشريط في الصفحة");
 await expect(position).toHaveValue("top");
 await page.getByRole("button",{name:"↓ نقل الشريط للأسفل"}).click();
 await expect(position).toHaveValue("below_header");
 await expect(page.locator('[data-news-ticker-preview="below_header"]')).toBeVisible();
 await position.selectOption("before_footer");
 await page.getByRole("button",{name:"معاينة الموضع على الصفحة"}).click();
 await expect(page.locator('iframe[title="معاينة الرئيسية"]')).toHaveAttribute("src",/^\/ar\?atshPreview=/);
 const preview=page.frameLocator('iframe[title="معاينة الرئيسية"]');
 await expect(preview.locator(".atsh-news-slot:has(+ .platform-footer) .atsh-news-ticker")).toBeVisible();
 expect(saves).toBe(0);
 await page.getByRole("region",{name:"المعاينة الحية للصفحة"}).getByRole("button",{name:"حفظ ونشر",exact:true}).click();
 await expect.poll(()=>saves).toBe(1);
 expect((published.content.newsTicker as {position?:string}).position).toBe("before_footer");
 expect(published.content.newsTicker.text).toBe("خبر تجريبي");
 await page.reload();
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"محتوى المنصة",exact:true}).click();
 await expect(page.getByLabel("موضع الشريط في الصفحة")).toHaveValue("before_footer");
});

test("default ticker starts above the complete administration and customer portal layouts",async({page})=>{
 await page.route("**/api/site-content/home?locale=*",route=>route.fulfill({json:{page:{content:{newsTicker:{enabled:true,text:"Global news",speed:25}}}}}));
 await page.route("**/api/admin/**",route=>{
  const path=new URL(route.request().url()).pathname;
  return route.fulfill({json:path==="/api/admin/me"?{email:"owner@example.test",role:"owner",permissions:{content:true,products:true}}:{}});
 });
 await page.route("**/api/customer/auth/**",route=>{
  const path=new URL(route.request().url()).pathname;
  return route.fulfill({json:path.endsWith("/me")?{customer:{name:"عميل تجريبي",email:"client@example.test"}}:path.endsWith("/workspace")?{workspace:{draft:{}}}:{drafts:[],previews:[],projects:[],messages:[]}});
 });
 await page.route("**/api/customer/commercial/**",route=>route.fulfill({json:{orders:[],quotes:[],contracts:[],invoices:[]}}));
 await page.route("**/api/customer/deliverables",route=>route.fulfill({json:{deliverables:[]}}));
 for(const path of ["/admin","/account/dashboard","/account/login","/catalog"]){
  await page.goto(path);
  const ticker=page.locator("body > .atsh-news-slot:first-child .atsh-news-ticker");
  await expect(ticker).toBeVisible();
  await expect(page.locator(".atsh-news-ticker")).toHaveCount(1);
  expect(Math.abs((await ticker.boundingBox())!.y)).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
 }
});

test("private portal ticker stays above the actual signed-in layouts even when public placement is below the header",async({page})=>{
 await page.route("**/api/site-content/home?locale=*",route=>route.fulfill({json:{page:{content:{newsTicker:{enabled:true,text:"Portal news",speed:25,position:"below_header"}}}}}));
 await page.route("**/api/admin/**",route=>route.fulfill({json:new URL(route.request().url()).pathname==="/api/admin/me"?{email:"staff@example.test",role:"admin",permissions:{products:true,content:true}}:{}}));
 await page.route("**/api/customer/auth/**",route=>{
  const path=new URL(route.request().url()).pathname;
  return route.fulfill({json:path.endsWith("/me")?{customer:{name:"عميل تجريبي",email:"client@example.test"}}:path.endsWith("/workspace")?{workspace:{draft:{}}}:{drafts:[],previews:[],projects:[],messages:[]}});
 });
 await page.route("**/api/customer/commercial/**",route=>route.fulfill({json:{orders:[],quotes:[],contracts:[],invoices:[]}}));
 await page.route("**/api/customer/deliverables",route=>route.fulfill({json:{deliverables:[]}}));
 for(const path of ["/admin","/account/dashboard"]){
  await page.goto(path);
  const ticker=page.locator("body > .atsh-news-slot:first-child .atsh-news-ticker");
  await expect(ticker).toBeVisible();
  expect(Math.abs((await ticker.boundingBox())!.y)).toBeLessThan(2);
  await expect(page.locator(".atsh-news-ticker")).toHaveCount(1);
 }
});

for(const role of ["admin","owner"] as const){
 test("dashboard respects team permission and reports real failures: "+role,async({page})=>{
  let calls=0;
  const forbidden:string[]=[];
  await page.route("**/api/admin/**",route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==="/api/admin/me")return route.fulfill({json:{email:"staff@example.test",role,permissions:{products:true,content:true,customers:true,settings:true,audit:true,team:false}}});
   if(path==="/api/admin/team"){
    calls++;
    return route.fulfill({status:role==="owner"?503:403,json:{error:"Team unavailable"}});
   }
   if(path==="/api/admin/packages")return route.fulfill({json:{packages:[],sharedOptions:[]}});
   return route.fulfill({json:{}});
  });
  page.on("response",r=>{if(r.status()===403&&r.url().includes("/api/admin/team"))forbidden.push(r.url())});
  await page.goto("/admin");
  const card=page.locator(".admin-stat").filter({hasText:"أعضاء الفريق"});
  await expect(card).toBeVisible();
  if(role==="admin"){
   await expect(card).toContainText("غير متاح لصلاحياتك");
   await expect(page.getByText("تعذر تحديث بعض أقسام الإدارة",{exact:false})).toHaveCount(0);
   expect(calls).toBe(0);
   expect(forbidden).toHaveLength(0);
  }else{
   await expect(page.getByText("تعذر تحديث بعض أقسام الإدارة: team",{exact:false})).toBeVisible();
   await expect(card).toContainText("تعذر تحميل البيانات");
   expect(calls).toBe(1);
  }
  await expect(card.locator("strong")).toHaveText("—");
 });
}

for(const role of ["admin","viewer"] as const){
 test("granted team permission opens a real read-only team directory: "+role,async({page})=>{
  let requested=0;
  await page.route("**/api/admin/**",route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==="/api/admin/me")return route.fulfill({json:{email:"manager@example.test",role,permissions:{team:true}}});
   if(path==="/api/admin/team"){
    requested++;
    return route.fulfill({json:{members:[{id:"team-a",email:"employee@example.test",display_name:"عضو الفريق التجريبي",role:"viewer",is_active:true}]}});
   }
   return route.fulfill({json:{}});
  });
  await page.goto("/admin");
  await expect(page.locator(".admin-stat").filter({hasText:"أعضاء الفريق"}).locator("strong")).toHaveText("1");
  await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"الفريق",exact:true}).click();
  await expect(page.getByText("عضو الفريق التجريبي",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"إنشاء الحساب"})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"حذف نهائي"})).toHaveCount(0);
  expect(requested).toBeGreaterThan(0);
 });
}

test("owner changes a single team permission and sees the persisted result after refresh",async({page})=>{
 let member={id:"team-test",email:"manager@example.test",display_name:"مدير اختباري",role:"admin",is_active:true,permission_overrides:{} as Record<string,boolean>};
 const writes:Record<string,boolean>[]=[];
 await page.route("**/api/admin/**",route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/api/admin/me")return route.fulfill({json:{email:"owner@example.test",role:"owner",permissions:{}}});
  if(path==="/api/admin/team")return route.fulfill({json:{members:[member]}});
  if(path==="/api/admin/team/team-test"&&route.request().method()==="PATCH"){
   const permissions=route.request().postDataJSON().permissions;writes.push(permissions);
   member={...member,permission_overrides:permissions};
   return route.fulfill({json:{member}});
  }
  return route.fulfill({json:{}});
 });
 await page.goto("/admin");
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"الفريق",exact:true}).click();
 const checkbox=page.locator(".admin-team-row").filter({hasText:"مدير اختباري"}).getByLabel("الفريق",{exact:true});
 await expect(checkbox).not.toBeChecked();
 await checkbox.click({timeout:10000});
 await expect(checkbox).toBeChecked();
 await expect(page.getByText("تم حفظ صلاحيات العضو.",{exact:true})).toBeVisible();
 expect(writes).toEqual([{team:true}]);
 await page.reload();
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"الفريق",exact:true}).click();
 await expect(checkbox).toBeChecked();
 await checkbox.click({timeout:10000});
 await expect(checkbox).not.toBeChecked();
 expect(writes).toEqual([{team:true},{team:false}]);
});

test("open manager dashboard follows team grants and revocations and recovers task loading",async({page})=>{
 let team=false,tasksAvailable=false;
 let teamReads=0;
 await page.route("**/api/admin/**",route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/api/admin/me")return route.fulfill({json:{email:"manager@example.test",role:"admin",permissions:{team}}});
  if(path==="/api/admin/team"){
   teamReads++;
   return route.fulfill(team?{json:{members:[{id:"member-a",email:"member@example.test",display_name:"عضو الفريق المباشر",role:"viewer",is_active:true}]}}:{status:403,json:{error:"Insufficient permissions"}});
  }
  if(path==="/api/admin/journey/my-tasks")return route.fulfill(tasksAvailable?{json:{tasks:[]}}:{status:502,json:{error:"Unavailable"}});
  return route.fulfill({json:{}});
 });
 await page.goto("/admin");
 const teamTab=page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"الفريق",exact:true});
 await expect(page.getByText("تعذر تحميل المهام",{exact:true})).toBeVisible();
 await expect(page.getByText("لا توجد مهام مسندة حاليًا.",{exact:true})).toHaveCount(0);
 await expect(teamTab).toHaveCount(0);
 expect(teamReads).toBe(0);
 team=true;tasksAvailable=true;
 await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect(teamTab).toBeVisible();
 await expect(page.getByText("تعذر تحميل المهام",{exact:true})).toHaveCount(0);
 await expect(page.getByText("لا توجد مهام مسندة حاليًا.",{exact:true})).toBeVisible();
 await expect(page.locator(".admin-stat").filter({hasText:"أعضاء الفريق"}).locator("strong")).toHaveText("1");
 await teamTab.click();
 await expect(page.getByText("عضو الفريق المباشر",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"إنشاء الحساب"})).toHaveCount(0);
 team=false;
 await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect(teamTab).toHaveCount(0);
 await expect(page.getByText("عضو الفريق المباشر",{exact:true})).toHaveCount(0);
 await expect(page.locator(".admin-stat").filter({hasText:"أعضاء الفريق"}).locator("strong")).toHaveText("—");
 expect(teamReads).toBe(1);
});
