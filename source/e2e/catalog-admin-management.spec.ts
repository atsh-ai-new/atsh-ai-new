import {test,expect} from "@playwright/test";

test("admin replaces and clears a cover, deletes the selected system and leaves other records intact",async({page})=>{
 const assetId="a".repeat(64);
 const oldCover="https://example.test/old.png";
 const newCover="/api/site-media/12345678-1234-1234-1234-123456789abc";
 const template={category:"التجاري",sectorId:"business",published:true,archived:false,icon:"📁",description:"Demo",features:[],modules:[],sampleStats:[],sampleRows:[],sortOrder:10,previewUrl:"",basePrice:5000,addons:[],pricedAddons:[]};
 let items=[{...template,slug:"cover-test",name:"نظام الاختبار",imageUrl:oldCover,previewAssetId:assetId},{...template,slug:"other-system",name:"نظام آخر",imageUrl:"",previewAssetId:assetId}];
 let updatedAt="2026-11-25T00:00:00.000Z";
 let saves=0;
 const catalog=()=>({slug:"catalog",locale:"ar",is_published:true,updated_at:updatedAt,content:{items}});
 await page.route("**/api/admin/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/api/admin/me")return route.fulfill({json:{email:"owner@example.test",role:"owner",permissions:{products:true,content:true}}});
  if(path==="/api/admin/pages")return route.fulfill({json:{pages:[catalog()]}});
  if(path==="/api/admin/media")return route.fulfill({status:201,json:{media:{url:newCover}}});
  if(path==="/api/admin/pages/catalog"&&route.request().method()==="PATCH"){
   const input=route.request().postDataJSON();
   expect(input.expectedUpdatedAt).toBe(updatedAt);
   items=input.content.items;
   saves++;
   updatedAt=new Date(Date.parse(updatedAt)+1000).toISOString();
   return route.fulfill({json:{page:catalog()}});
  }
  return route.fulfill({json:{}});
 });
 await page.context().route("**/api/site-content/catalog?*",route=>{
  const query=new URL(route.request().url()).searchParams;
  if(query.has("thumbnail"))return route.fulfill({contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT8sAAAAASUVORK5CYII=","base64")});
  return route.fulfill({json:{page:catalog()}});
 });
 await page.route("**/api/site-media/**",route=>route.fulfill({contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT8sAAAAASUVORK5CYII=","base64")}));
 await page.goto("/admin");
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"محتوى المنصة",exact:true}).click();
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"المنتجات",exact:true}).click();
 await page.getByRole("tab",{name:"أنظمة مخصصة"}).click();
 const row=page.locator(".admin-team-row").filter({hasText:"نظام الاختبار"});
 await row.getByRole("button",{name:"تغيير الغلاف"}).click();
 const cover=page.locator("#catalog-cover-editor");
 await expect(cover).toBeFocused();
 await cover.locator('input[type="file"]').setInputFiles({name:"cover.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT8sAAAAASUVORK5CYII=","base64")});
 await expect(cover.locator("img")).toHaveAttribute("src",newCover);
 await page.getByRole("button",{name:"حفظ النظام المخصص",exact:true}).click();
 await expect.poll(()=>saves).toBe(1);
 await expect(page.locator("#catalog-item-editor h2")).toHaveText("إضافة نظام مخصص");
 expect(items[0].imageUrl).toBe(newCover);
 expect(items[0].previewAssetId).toBe(assetId);
 await row.getByRole("button",{name:"تغيير الغلاف"}).click();
 await cover.getByRole("button",{name:"إزالة الصورة واستخدام واجهة HTML"}).click();
 await page.getByRole("button",{name:"حفظ النظام المخصص",exact:true}).click();
 await expect.poll(()=>saves).toBe(2);
 await expect(page.locator("#catalog-item-editor h2")).toHaveText("إضافة نظام مخصص");
 expect(items[0].imageUrl).toBe("");
 expect(items[0].previewAssetId).toBe(assetId);
 const beforeMove=JSON.parse(JSON.stringify(items[0]));
 await row.getByRole("button",{name:"نقل إلى قسم آخر"}).click();
 await row.getByLabel("القطاع الجديد").selectOption("health");
 await row.getByLabel("التصنيف الفرعي الجديد").selectOption("clinics");
 await row.getByRole("button",{name:"حفظ النقل"}).click();
 await expect.poll(()=>saves).toBe(3);
 await expect(row).toContainText("الصحة / العيادات والمراكز الطبية");
 expect(items[0]).toEqual({...beforeMove,sectorId:"health",subcategoryId:"clinics",category:"العيادات والمراكز الطبية"});
 await page.getByRole("button",{name:"مسح الفلاتر"}).click();
 const gallery=await page.context().newPage();
 await gallery.goto("/catalog");
 await expect(gallery.locator('a[href="/catalog/cover-test?fullscreen=1"] img')).toHaveAttribute("src",new RegExp("thumbnail="+assetId));
 page.once("dialog",dialog=>dialog.dismiss());
 await row.getByRole("button",{name:"حذف نهائي"}).click();
 await expect(row).toBeVisible();
 expect(saves).toBe(3);
 page.once("dialog",dialog=>dialog.accept());
 await row.getByRole("button",{name:"حذف نهائي"}).click();
 await expect(row).toHaveCount(0);
 expect(items.map(item=>item.slug)).toEqual(["other-system"]);
 await gallery.reload();
 await expect(gallery.locator('a[href="/catalog/other-system?fullscreen=1"] img')).toBeVisible();
 await expect(gallery.locator('a[href="/catalog/cover-test?fullscreen=1"]')).toHaveCount(0);
 await gallery.close();
 await page.reload();
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"محتوى المنصة",exact:true}).click();
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"المنتجات",exact:true}).click();
 await page.getByRole("tab",{name:"أنظمة مخصصة"}).click();
 await expect(page.locator(".admin-team-row").filter({hasText:"نظام آخر"})).toBeVisible();
 await expect(row).toHaveCount(0);
});

test("admin navigates 105 systems using pagination, search, sector and publication filters without changing saved data",async({page})=>{
 const items=Array.from({length:105},(_,index)=>{
  const n=index+1,sectorId=n<=60?"health":"business",subcategoryId=n<=30?"clinics":n<=60?"pharmacies":"retail";
  const archived=n%5===0,published=!archived&&n%2===0;
  return {slug:"system-"+n,name:"نظام "+String(n).padStart(3,"0"),category:sectorId==="health"?"الصحة":"التجاري",sectorId,subcategoryId,published,archived,icon:"📁",description:"Demo",features:[],modules:[],sampleStats:[],sampleRows:[],sortOrder:n,imageUrl:"",previewUrl:"",basePrice:5000,addons:[],pricedAddons:[]};
 });
 let saves=0;
 await page.route("**/api/admin/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/api/admin/me")return route.fulfill({json:{email:"owner@example.test",role:"owner",permissions:{products:true,content:true}}});
  if(path==="/api/admin/pages")return route.fulfill({json:{pages:[{slug:"catalog",locale:"ar",is_published:true,updated_at:"2026-11-25T00:00:00.000Z",content:{items}}]}});
  if(route.request().method()==="PATCH")saves++;
  return route.fulfill({json:{}});
 });
 await page.goto("/admin");
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"محتوى المنصة",exact:true}).click();
 await page.getByRole("navigation",{name:"أقسام لوحة الإدارة"}).getByRole("button",{name:"المنتجات",exact:true}).click();
 await page.getByRole("tab",{name:"أنظمة مخصصة"}).click();
 const rows=page.locator(".catalog-system-row"),count=page.getByTestId("catalog-result-count"),pager=page.locator(".catalog-admin-pager");
 await expect(rows).toHaveCount(10);
 await expect(count).toHaveText("1–10 من 105 نظام");
 await expect(rows.first()).toContainText("نظام 001");
 await pager.getByRole("button",{name:"التالي",exact:true}).click();
 await expect(rows.first()).toContainText("نظام 011");
 await expect(count).toHaveText("11–20 من 105 نظام");
 const search=page.getByRole("searchbox",{name:"بحث عن نظام"});
 await search.fill("نظام 104");
 await expect(rows).toHaveCount(1);
 await expect(rows.first()).toContainText("نظام 104");
 await expect(pager.getByRole("button",{name:"التالي",exact:true})).toBeDisabled();
 await page.getByRole("button",{name:"مسح الفلاتر"}).click();
 await page.getByRole("combobox",{name:"تصفية القطاع"}).selectOption("health");
 await expect(count).toHaveText("1–10 من 60 نظام");
 await page.getByRole("combobox",{name:"تصفية التصنيف الفرعي"}).selectOption("clinics");
 await expect(count).toHaveText("1–10 من 30 نظام");
 await page.locator(".catalog-admin-stats button").filter({hasText:"مؤرشف"}).click();
 await expect(rows).toHaveCount(6);
 await expect(rows.first()).toContainText("نظام 005");
 await page.getByRole("button",{name:"مسح الفلاتر"}).click();
 await expect(rows).toHaveCount(10);
 await page.getByRole("combobox",{name:"عدد الأنظمة في الصفحة"}).selectOption("50");
 await expect(rows).toHaveCount(50);
 await pager.getByRole("button",{name:"التالي",exact:true}).click();
 await pager.getByRole("button",{name:"التالي",exact:true}).click();
 await expect(rows).toHaveCount(5);
 await expect(count).toHaveText("101–105 من 105 نظام");
 await expect(pager.getByRole("button",{name:"التالي",exact:true})).toBeDisabled();
 const sector=page.locator(".catalog-sector-details").filter({has:page.locator("summary").filter({hasText:"الصحة"})});
 await expect(sector).not.toHaveAttribute("open","");
 await sector.locator("summary").click();
 await sector.getByRole("button",{name:"عرض أنظمة القطاع"}).click();
 await expect(page.getByRole("combobox",{name:"تصفية القطاع"})).toHaveValue("health");
 await expect(count).toHaveText("1–50 من 60 نظام");
 await expect(rows.first()).toContainText("نظام 001");
 expect(saves).toBe(0);
});

test("products are nested under platform content while package and add-on pricing stay connected",async({page})=>{
 const pkg={id:"package-test",name:"باقة الاختبار",tagline:"",description:"",price:5000,currency:"EGP",features:[],is_featured:false,is_custom_quote:false,is_published:true,sort_order:1,visibility:"both"};
 const addon={id:"addon-test",package_id:pkg.id,code:"test_addon",name:"إضافة الاختبار",description:"",price:500,pricing_type:"yearly",unit_label:"",is_required:false,is_active:true,sort_order:1,visibility:"both"};
 const sharedAddon={...addon,id:"shared-addon-test",package_id:undefined,list_price:500,initial_price:500,discount_percent:0};
 const changes: Array<{path:string;price:number;visibility?:string;discountPercent?:number}>=[];
 await page.route("**/api/admin/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/api/admin/me")return route.fulfill({json:{email:"owner@example.test",role:"owner",permissions:{products:true,content:true,assistant:true}}});
  if(path==="/api/admin/packages")return route.fulfill({json:{packages:[pkg],options:[addon],sharedOptions:[sharedAddon]}});
  if(path==="/api/admin/pages")return route.fulfill({json:{pages:[]}});
  if(route.request().method()==="PATCH"){
   const input=route.request().postDataJSON();
   changes.push({path,price:input.price,visibility:input.visibility,discountPercent:input.discountPercent});
   if(path==="/api/admin/packages/"+pkg.id)pkg.price=input.price;
   if(path==="/api/admin/options/"+sharedAddon.id){sharedAddon.list_price=input.price;sharedAddon.discount_percent=input.discountPercent??0;sharedAddon.price=Math.round(input.price*(100-sharedAddon.discount_percent))/100;addon.price=sharedAddon.price;}
  }
  return route.fulfill({json:{}});
 });
 await page.goto("/admin");
 const nav=page.getByRole("navigation",{name:"أقسام لوحة الإدارة"});
 await expect(nav.getByRole("button",{name:"المنتجات",exact:true})).toHaveCount(0);
 await nav.getByRole("button",{name:"محتوى المنصة",exact:true}).click();
 const contentButtons=nav.getByRole("button",{name:"محتوى المنصة",exact:true}).locator("..").locator(":scope > div > button");
 await expect(contentButtons).toHaveCount(4);
 for(const [index,label] of ["صفحات المنصة","المنتجات","منشئ المحتوى","إدارة الفيديوهات"].entries()){
  await expect(contentButtons.nth(index)).toHaveAccessibleName(label);
 }
 await expect(nav.getByRole("button",{name:"منشئ المحتوى",exact:true})).toBeVisible();
 await expect(nav.getByRole("button",{name:"إدارة الفيديوهات",exact:true})).toBeVisible();
 await nav.getByRole("button",{name:"المنتجات",exact:true}).click();
 const packageCard=page.locator(".admin-package-quarter-grid .admin-package-editor").first();
 await packageCard.getByLabel("السعر قبل الخصم").fill("5500");
 await packageCard.getByRole("button",{name:"حفظ الباقة",exact:true}).click();
 await expect.poll(()=>changes.length).toBe(1);
 expect(changes[0]).toMatchObject({path:"/api/admin/packages/package-test",price:5500});
 await page.getByRole("tab",{name:"الإضافات",exact:true}).click();
 await expect(page.locator("#unified-package-options .admin-package-editor")).toHaveCount(1);
 const addonCard=page.locator("#unified-package-options .admin-package-editor").first();
 await addonCard.getByLabel("السعر",{exact:true}).fill("750");
 await addonCard.getByLabel("نسبة الخصم (%)",{exact:true}).fill("20");
 await expect(addonCard.locator(".addon-discount-badge")).toHaveText("خصم 20%");
 await expect(addonCard.locator(".addon-price-original")).toBeVisible();
 await expect(addonCard.locator(".addon-price-current")).toContainText("٦٠٠");
 await addonCard.getByRole("button",{name:"حفظ التعديلات",exact:true}).click();
 await expect.poll(()=>changes.length).toBe(2);
 expect(changes[1]).toMatchObject({path:"/api/admin/options/shared-addon-test",price:750,visibility:"both",discountPercent:20});
 await expect(page.locator("#unified-vat")).toBeVisible();
 await page.getByRole("tab",{name:"أنظمة مخصصة",exact:true}).click();
 await expect(page.locator("#unified-catalog-pricing")).toBeVisible();
 await page.getByRole("tab",{name:"الباقات",exact:true}).click();
 await expect(packageCard.getByLabel("السعر قبل الخصم")).toHaveValue("5500");
});

for(const products of [true,false]){
 test("nested navigation retains separate products permission: "+products,async({page})=>{
  await page.route("**/api/admin/**",route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==="/api/admin/me")return route.fulfill({json:{email:"member@example.test",role:"viewer",permissions:{products,content:!products,assistant:false}}});
   return route.fulfill({json:{}});
  });
  await page.goto("/admin");
  const nav=page.getByRole("navigation",{name:"أقسام لوحة الإدارة"});
  await nav.getByRole("button",{name:"محتوى المنصة",exact:true}).click();
  const product=nav.getByRole("button",{name:"المنتجات",exact:true});
  if(products){
   await expect(product).toBeVisible();
   await expect(nav.getByRole("button",{name:"صفحات المنصة",exact:true})).toHaveCount(0);
   await product.click();
   await expect(page.locator("#unified-package-pricing")).toBeVisible();
  }else{
   await expect(product).toHaveCount(0);
   await expect(page.locator("#unified-package-pricing")).toHaveCount(0);
   await expect(nav.getByRole("button",{name:"صفحات المنصة",exact:true})).toBeVisible();
  }
 });
}
