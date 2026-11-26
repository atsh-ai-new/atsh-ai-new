import {test,expect} from "@playwright/test";

for (const locale of ["ar","en"]) {
 test("homepage contact is a compact single-line link above the header controls "+locale,async({page})=>{
  await page.goto("/"+locale);
  const header=page.locator(".platform-header");
  const contact=header.locator(".platform-header-contact");
  await expect(contact).toHaveText("51 ش 9 المعادي القاهرة 01007735321");
  await expect(contact).toHaveAttribute("href","tel:+201007735321");
  await expect(contact).toBeVisible();
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
 const initial=await ticker.boundingBox(),headerBounds=await header.boundingBox();
 expect(Math.abs(initial!.y-(headerBounds!.y+headerBounds!.height))).toBeLessThan(2);
 await page.evaluate(()=>window.scrollBy(0,500));
 await expect.poll(async()=>ticker.evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThan(0);
});

test("localized administration links resolve to their existing canonical pages",async({request})=>{
 for(const path of ["/admin","/admin/builder","/admin/deliverables"]){
  const response=await request.get("/en"+path+"?test=1",{maxRedirects:0});
  expect(response.status()).toBe(307);
  expect(new URL(response.headers()["location"]).pathname).toBe(path);
  expect(new URL(response.headers()["location"]).search).toBe("?test=1");
 }
});
