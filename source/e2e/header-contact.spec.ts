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
