import {test,expect} from "@playwright/test";

for (const locale of ["ar","en"]) {
 test("homepage contact is a compact single-line link above the header controls "+locale,async({page})=>{
  await page.goto("/"+locale);
  const header=page.locator(".platform-header");
  const contact=header.locator(".platform-header-contact");
  await expect(contact).toHaveText("شارع النقطة القديمة منيل شيحة أبو النمرس الجيزة 01007735321");
  await expect(contact).toHaveAttribute("href","tel:+201007735321");
  await expect(contact).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("font-weight","500");
  await expect(header.locator(".platform-brand small")).toHaveCSS("font-size",page.viewportSize()!.width<=767?"13px":"14px");
  await expect(header.locator(".platform-brand small")).toHaveCSS("font-weight","600");
  await expect(contact).toHaveCSS("font-weight","600");

  const geometry=await contact.evaluate(el=>{
   const link=el.getBoundingClientRect();
   const logo=el.parentElement!.querySelector(".platform-brand")!.getBoundingClientRect();
   const style=getComputedStyle(el);
   return {inside:link.left>=0&&link.right<=window.innerWidth,above:link.bottom<=logo.top,nowrap:style.whiteSpace==="nowrap",small:parseFloat(style.fontSize)<=12};
  });
  expect(geometry).toEqual({inside:true,above:true,nowrap:true,small:true});
 });
}

test("news ticker stays immediately below the homepage header rather than covering the viewport",async({page})=>{
 await page.route("**/api/site-content/home?locale=*",route=>route.fulfill({json:{page:{content:{newsTicker:{enabled:true,text:"Test news",speed:25,background:"#fff",color:"#14243C",url:""}}}}}));
 await page.goto("/ar");
 const header=page.locator(".platform-header");
 const ticker=page.locator(".platform-header + .atsh-news-slot .atsh-news-ticker");
 await expect(ticker).toBeVisible();
 await expect(ticker).toHaveCSS("font-size","14px");
 await expect(ticker).toHaveCSS("font-weight","600");
 const initial=await ticker.boundingBox(),headerBounds=await header.boundingBox();
 expect(Math.abs(initial!.y-(headerBounds!.y+headerBounds!.height))).toBeLessThan(2);
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
