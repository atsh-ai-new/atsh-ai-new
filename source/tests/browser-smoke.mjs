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
  await page.getByRole("button",{name:/الصحة والرعاية الطبية/}).click();
  await page.getByRole("heading",{name:"عيادتي"}).waitFor();
  assert.equal(await page.getByRole("heading",{name:"سوبر ماركت"}).count(),0);
  await page.locator('a[href="/catalog/eyadaty"]').click();
  await page.getByRole("heading",{name:/عيادتي/}).waitFor();
  const title=page.getByLabel("اسم النشاط التجريبي");
  await title.fill("عيادة اختبار ATSH");
  assert.match(await page.getByRole("heading",{level:1}).innerText(),/عيادة اختبار ATSH/);
  await page.getByRole("button",{name:"المرضى"}).click();
  await page.getByRole("heading",{name:"المرضى"}).waitFor();
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
 console.log(`PASS: ${checked} browser checks across desktop and mobile`);
 await home.close();await account.close();
}finally{await browser.close();}
