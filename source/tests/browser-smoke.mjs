import {chromium} from "playwright";
import assert from "node:assert/strict";
const browser=await chromium.launch({headless:true});
const origin=process.env.BROWSER_BASE_URL||"http://127.0.0.1:3000";
let checked=0;
try{
 for(const [width,height] of [[1280,800],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},locale:"ar-EG"});
  await page.goto(origin+"/catalog",{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:/استكشف الأنظمة حسب مجالك/}).waitFor();
  const health=page.getByRole("button",{name:/الصحة والرعاية الطبية/});
  for(let tries=0;tries<12;tries++){
   await health.click();
   if(await health.getAttribute("aria-pressed")==="true")break;
   await page.waitForTimeout(150);
  }
  assert.equal(await health.getAttribute("aria-pressed"),"true","Sector filter must react after hydration");
  await page.getByRole("heading",{name:"عيادتي"}).waitFor();
  await page.getByRole("heading",{name:"سوبر ماركت"}).waitFor({state:"detached",timeout:5000});
  await page.locator('a[href="/catalog/eyadaty"]').click();
  // Browser Smoke runs the production frontend WITHOUT its API/DB.
  // Missing backend must fail closed (no stale private/unpublished catalog fallback).
  // Full interactive sector CRUD is checked in the separate PostgreSQL-backed Browser E2E workflow.
  await page.getByRole("heading",{name:"الكتالوج غير متاح"}).waitFor({timeout:12000});
  assert.equal(await page.locator("iframe").count(),0,"Unpublished or unavailable demos must not be exposed");
  const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(overflow.document<=overflow.viewport+2,`Horizontal overflow on ${width}px: ${JSON.stringify(overflow)}`);
  checked++;
  await page.close();
 }
 const home=await browser.newPage({viewport:{width:390,height:844}});
 await home.goto(origin,{waitUntil:"domcontentloaded"});
 await home.getByRole("button",{name:/فتح مساعد ATSH AI/}).click();
 await home.getByRole("dialog",{name:/مساعد ATSH AI/}).waitFor();
 const account=await browser.newPage({viewport:{width:390,height:844}});
 await account.goto(origin+"/account/login",{waitUntil:"domcontentloaded"});
 await account.getByRole("heading",{name:"تسجيل الدخول"}).waitFor();
 checked+=2;
 const start=await browser.newPage({viewport:{width:390,height:844},locale:"ar-EG"});
 await start.goto(origin+"/start",{waitUntil:"domcontentloaded"});
 await start.getByRole("heading",{name:"ابدأ مشروعك بالطريقة المناسبة"}).waitFor();
 await start.getByRole("button",{name:/مشروع بمواصفات خاصة/}).click();
 await start.getByRole("button",{name:"التالي"}).click();
 await start.getByRole("textbox",{name:"اسم المشروع / النشاط"}).fill("نظام اختبار");
 checked++;
 console.log(`PASS: ${checked} browser checks across desktop and mobile`);
 await home.close();await account.close();await start.close();
}finally{await browser.close();}
