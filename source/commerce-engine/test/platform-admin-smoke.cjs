const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const base=process.env.ATSH_ADMIN_TEST_URL||'http://127.0.0.1:3301';
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const projectId='12345678-1234-1234-1234-123456789abc';let payload,stores=[];
 const baseRates={rent_monthly:199,rent:1990,copy:46870,code:7990};let savedTariffs;
 const tariffs=Object.fromEntries(Object.entries(baseRates).map(([m,price])=>[m,{price,list_price:price,initial_price:price,discount_percent:0,period:m==='rent'?'yearly':m==='rent_monthly'?'monthly':'fixed'}]));
 page.on('dialog',d=>d.accept());
 await page.route('**/api/admin/**',async route=>{
  const action=new URL(route.request().url()).pathname.split('/api/admin/')[1];
  if(action==='pages')return route.fulfill({json:{pages:[{slug:'catalog',locale:'ar',is_published:true,content:{items:[{slug:'commerce-engine',name:'متجر إلكتروني ATSH',published:false,archived:false}]}}]}});
  if(action==='ownership-prices/sector/commerce-engine'){
   if(route.request().method()==='PATCH'){
    savedTariffs=route.request().postDataJSON();
    for(const [m,v] of Object.entries(savedTariffs))Object.assign(tariffs[m],v,{price:v.list_price*(100-v.discount_percent)/100});
   }
   return route.fulfill({json:{prices:tariffs}});
  }
  const result=action==='me'?{email:'owner@example.test',role:'owner',permissions:{}}:action==='commerce/overview'?{configured:true,runtimeAvailable:true,publicOrigin:'https://shops.example.test',stores,sectors:[{id:'fashion',ar:'ملابس',categories:[]}],themes:[{id:'fashion-canvas',sector:'fashion',name:'Canvas · Fashion',accent:'#46665a',bg:'#f4f1e9',ink:'#243d38',layout:'editorial'}]}:action==='commerce/projects'?{projects:[{id:projectId,title:'مشروع متجر',customer_name:'عميل تجريبي',mode:'copy',status:'paid'}]}:action==='commerce/addon-requests'?{requests:[{id:'extension',title:'مشروع متجر',quote_id:42,quote_status:'accepted',total_piasters:69000,verified_paid:69000,items:[{code:'extra_page',name:'صفحات إضافية',quantity:1}],activated_at:null,canActivate:true}]}:action==='commerce/stores'?(()=>{payload=route.request().postDataJSON();const store={id:'store',name:payload.name,slug:payload.slug,sector:'fashion',theme:payload.theme,mode:'copy',project_id:projectId,products:0,pages:0,orders:0};stores=[store];return {store,token:'test-once-only'}})():{};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto(base+'/admin');
 await page.getByRole('button',{name:'محتوى المنصة',exact:true}).click();
 const nav=page.getByRole('navigation',{name:'أقسام لوحة الإدارة'});
 const buttons=await nav.getByRole('button').allTextContents();const index=buttons.findIndex(x=>x.includes('المنتجات'));assert.ok(buttons[index+1].includes('المتاجر'));
 assert.equal(await nav.getByRole('button',{name:'منشئ المحتوى',exact:true}).count(),0);
 await nav.getByRole('button',{name:'فيديو',exact:true}).click();
 await nav.getByRole('button',{name:'منشئ المحتوى',exact:true}).waitFor();
 await nav.getByRole('button',{name:'فيديوهات المنصة',exact:true}).waitFor();
 await nav.getByRole('button',{name:'محتوى المنصة',exact:true}).click();
 await nav.getByRole('button',{name:'المتاجر'}).click();
 await page.getByRole('heading',{name:'محرك المتاجر',exact:true}).waitFor();
 await page.getByText('المحرك متصل',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Canvas · Fashion ملابس'}).click();
 await page.locator('label').filter({hasText:'مشروع العميل'}).locator('select').selectOption(projectId);
 await page.getByLabel('اسم المتجر',{exact:true}).fill('متجر تجريبي');
 await page.getByLabel('رابط المتجر',{exact:true}).fill('demo-test');
 await page.getByRole('button',{name:'تجهيز المتجر',exact:true}).click();
 await page.getByRole('heading',{name:'تم إنشاء المتجر'}).waitFor();
 assert.deepEqual(payload,{projectId,name:'متجر تجريبي',slug:'demo-test',theme:'fashion-canvas',shipping:0});
 await page.getByRole('button',{name:'إخفاء الرمز'}).click();
 await page.getByRole('button',{name:'إعداد وتسعير عرض المتاجر'}).click();
 await page.getByRole('heading',{name:'إعداد عرض المتاجر',exact:true}).waitFor();
 await page.getByLabel('اسم عرض المتجر').waitFor();
 assert.equal(await page.getByLabel('اسم عرض المتجر').inputValue(),'متجر إلكتروني ATSH');
 const offer=page.locator('#catalog-item-editor');
 const copyRow=offer.getByText('نسخة تشغيلية',{exact:true}).locator('..');
 const price=copyRow.getByLabel('السعر',{exact:true});
 await price.waitFor();assert.equal(await price.inputValue(),'46870');
 await price.fill('47000');await offer.getByRole('button',{name:'حفظ أسعار التملك'}).click();
 await offer.getByText('تم تحديث الأسعار',{exact:true}).waitFor();
 assert.equal(savedTariffs.copy.list_price,47000);assert.equal(savedTariffs.rent_monthly.list_price,199);
 assert.equal(await page.getByRole('heading',{name:'إدارة الأنظمة المخصصة ومعاينات القطاعات'}).count(),0);
 await page.getByRole('button',{name:'إضافة وإدارة الإضافات المطلوبة للمتجر'}).click();
 assert.equal(await page.getByRole('tab',{name:'الإضافات',exact:true}).getAttribute('aria-selected'),'true');
 await page.getByRole('heading',{name:'إدارة الإضافات للباقات والأنظمة المخصصة'}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('Admin navigation, store provisioning form and central add-on button passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
