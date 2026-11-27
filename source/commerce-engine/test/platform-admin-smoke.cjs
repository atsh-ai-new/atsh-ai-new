const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const base=process.env.ATSH_ADMIN_TEST_URL||'http://127.0.0.1:3301';
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const projectId='12345678-1234-1234-1234-123456789abc';let payload,stores=[];
 page.on('dialog',d=>d.accept());
 await page.route('**/api/admin/**',async route=>{
  const action=new URL(route.request().url()).pathname.split('/api/admin/')[1];
  const result=action==='me'?{email:'owner@example.test',role:'owner',permissions:{}}:action==='commerce/overview'?{configured:true,runtimeAvailable:true,publicOrigin:'https://shops.example.test',stores,sectors:[{id:'fashion',ar:'ملابس',categories:[]}],themes:[{id:'fashion-canvas',sector:'fashion',name:'Canvas · Fashion',accent:'#46665a',bg:'#f4f1e9',ink:'#243d38',layout:'editorial'}]}:action==='commerce/projects'?{projects:[{id:projectId,title:'مشروع متجر',customer_name:'عميل تجريبي',mode:'copy',status:'paid'}]}:action==='commerce/addon-requests'?{requests:[{id:'extension',title:'مشروع متجر',quote_id:42,quote_status:'accepted',total_piasters:69000,verified_paid:69000,items:[{code:'extra_page',name:'صفحات إضافية',quantity:1}],activated_at:null,canActivate:true}]}:action==='commerce/stores'?(()=>{payload=route.request().postDataJSON();const store={id:'store',name:payload.name,slug:payload.slug,sector:'fashion',theme:payload.theme,mode:'copy',project_id:projectId,products:0,pages:0,orders:0};stores=[store];return {store,token:'test-once-only'}})():{};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto(base+'/admin');
 await page.getByRole('button',{name:'محتوى المنصة',exact:true}).click();
 const nav=page.getByRole('navigation',{name:'أقسام لوحة الإدارة'});
 const buttons=await nav.getByRole('button').allTextContents();const index=buttons.findIndex(x=>x.includes('المنتجات'));assert.ok(buttons[index+1].includes('المتاجر'));
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
 assert.equal(await page.getByRole('heading',{name:'إدارة الأنظمة المخصصة ومعاينات القطاعات'}).count(),0);
 await page.getByRole('button',{name:'إضافة وإدارة الإضافات المطلوبة للمتجر'}).click();
 assert.equal(await page.getByRole('tab',{name:'الإضافات',exact:true}).getAttribute('aria-selected'),'true');
 await page.getByRole('heading',{name:'إدارة الإضافات للباقات والأنظمة المخصصة'}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('Admin navigation, store provisioning form and central add-on button passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
