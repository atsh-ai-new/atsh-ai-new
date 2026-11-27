const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const dir=mkdtempSync(join(tmpdir(),'commerce-ui-')),env={...process.env,COMMERCE_DB:join(dir,'test.sqlite'),PORT:'3298',HOST:'127.0.0.1'};
 let server,browser;
 try{
 const seed=spawn(process.execPath,['src/demo.js'],{env});let stdout='';seed.stdout.on('data',x=>stdout+=x);assert.equal((await once(seed,'exit'))[0],0);const token=stdout.match(/Owner access token: ([a-f0-9]{64})/)[1];
 server=spawn(process.execPath,['src/server.js'],{env});await once(server.stdout,'data');
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3298/store/dara');await page.getByRole('heading',{name:'بيتٌ يشبهك، بتفاصيل تدوم.'}).waitFor();
 await page.getByRole('button',{name:'أضف للسلة'}).first().click();await page.locator('#cart-open').click();
 for(const [name,value] of Object.entries({customer:'Test customer',phone:'01012345678',address:'Test address'}))await page.locator('[name='+name+']').fill(value);
 await page.getByRole('button',{name:'تأكيد الطلب'}).click();await page.getByRole('heading',{name:'تم تسجيل طلبك ✓'}).waitFor();
 await page.goto('http://127.0.0.1:3298/manage/dara');await page.locator('[name=token]').fill(token);await page.getByRole('button',{name:'دخول آمن'}).click();await page.getByText('المبيعات المحصلة').waitFor();
 await page.getByRole('button',{name:'المنتجات والمخزون'}).click();await page.getByRole('heading',{name:'سجل حركة المخزون'}).waitFor();
 await page.getByRole('button',{name:'تعديل',exact:true}).first().click();await page.getByRole('button',{name:'حفظ التعديلات'}).waitFor();await page.getByRole('button',{name:'إغلاق ×'}).click();
 await page.getByRole('button',{name:'صفحات المتجر',exact:true}).click();await page.getByRole('button',{name:'إعداد صفحة جديدة'}).click();await page.locator('#page-editor [name=title]').fill('About');await page.locator('#page-editor [name=slug]').fill('about');await page.getByRole('button',{name:'حفظ الصفحة'}).click();await page.getByText('تم حفظ الصفحة').waitFor();
 await page.getByRole('button',{name:'الطلبات',exact:true}).click();await page.getByText('Test customer').first().waitFor();
 await page.getByRole('button',{name:'تصميم المتجر'}).click();await page.getByRole('heading',{name:'محرر بصري'}).waitFor();
 await page.getByRole('button',{name:'Atelier · Furniture'}).click();await page.getByRole('button',{name:'حفظ ونشر التصميم'}).click();await page.getByText('تم حفظ التصميم').waitFor();
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3298/store/dara');await page.getByRole('heading',{name:'بيتٌ يشبهك، بتفاصيل تدوم.'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 console.log('Browser checkout, manager order, theme preservation and mobile layout passed');
 }finally{if(browser)await browser.close();if(server){server.kill();await once(server,'exit').catch(()=>{})}rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
