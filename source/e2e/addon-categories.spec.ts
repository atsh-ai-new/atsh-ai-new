import {test,expect} from "@playwright/test";
import {addonCategories} from "../src/lib/addon-categories";

test("central add-on categories reorder, move and appear in both pricing flows",async({page})=>{
 const tier=(price:number,period:"fixed"|"yearly"|"monthly")=>({price,list_price:price,initial_price:price,discount_percent:0,period});
 const ownershipPrices={rent_monthly:tier(300,"monthly"),rent:tier(3000,"yearly"),copy:tier(5000,"fixed"),code:tier(12000,"fixed")};
 const pkg={ownershipPrices,id:"11111111-1111-4111-8111-111111111111",name:"باقة تجريبية",description:"",tagline:"",price:5000,currency:"EGP",features:[],is_featured:false,is_custom_quote:false,is_published:true,sort_order:1};
 const categories=addonCategories.map((c,i)=>({code:c.code,sort_order:(i+1)*10}));
 const options=[{id:"a",code:"language",category_code:"foundation",name:"اللغة الإضافية",price:500,sort_order:10},{id:"b",code:"payment_gateway",category_code:"integrations",name:"الدفع الإلكتروني",price:1000,sort_order:10},{id:"c",code:"social_links",category_code:"marketing",name:"روابط السوشيال",price:200,sort_order:10},{id:"d",code:"hosting",category_code:"hosting",name:"استضافة مُدارة",price:225,sort_order:10}].map(o=>({...o,description:"",pricing_type:o.code==="hosting"?"yearly":"fixed",unit_label:"",is_required:false,is_active:true,visibility:"both"}));
 const catalog=()=>({packages:[pkg],addonCategories:categories,sharedOptions:options.map(o=>({...o,category_sort_order:categories.find(c=>c.code===o.category_code)?.sort_order})),options:options.map(o=>({...o,package_id:pkg.id,category_sort_order:categories.find(c=>c.code===o.category_code)?.sort_order}))});
 await page.route("**/api/admin/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/api/admin/me")return route.fulfill({json:{email:"owner@example.test",role:"owner",permissions:{products:true,content:true}}});
  if(path==="/api/admin/packages")return route.fulfill({json:catalog()});
  if(path==="/api/admin/addon-categories"&&route.request().method()==="PATCH"){
   const {codes}=route.request().postDataJSON();for(const [i,code] of codes.entries())categories.find(c=>c.code===code)!.sort_order=(i+1)*10;
   return route.fulfill({json:{addonCategories:categories}});
  }
  if(path==="/api/admin/options/b"&&route.request().method()==="PATCH"){
   const input=route.request().postDataJSON();Object.assign(options[1],{category_code:input.categoryCode,sort_order:input.sortOrder});
   return route.fulfill({json:{option:options[1]}});
  }
  return route.fulfill({json:{}});
 });
 await page.route("**/api/catalog",route=>route.fulfill({json:catalog()}));
 await page.route("**/api/site-content/**",route=>route.fulfill({json:{vatRate:14,page:{content:{items:[{slug:"test-system",name:"نظام تجريبي",basePrice:5000,ownershipPrices,published:true}]}}}}));
 await page.goto("/admin");
 const nav=page.getByRole("navigation",{name:"أقسام لوحة الإدارة"});
 await nav.getByRole("button",{name:"محتوى المنصة",exact:true}).click();
 await nav.getByRole("button",{name:"المنتجات",exact:true}).click();
 await page.getByRole("tab",{name:"الإضافات",exact:true}).click();
 // Readable text throughout the administration shell and the add-on editor.
 await expect(nav.getByRole("button",{name:"المنتجات",exact:true})).toHaveCSS("font-size","15px");
 await expect(nav.getByRole("button",{name:"المنتجات",exact:true})).toHaveCSS("font-weight","600");
 await expect(page.locator(".admin-content-title h2").first()).toHaveCSS("font-size",page.viewportSize()!.width<=767?"18px":"20px");
 const field=page.locator(".admin-option-create .admin-field").first();
 await expect(field).toHaveCSS("font-size","14px");
 await expect(field).toHaveCSS("font-weight","600");
 await expect(page.locator(".admin-option-create input").first()).toHaveCSS("font-size",page.viewportSize()!.width<=767?"16px":"15px");
 await expect(page.locator(".admin-option-create .button").first()).toHaveCSS("font-size","15px");
 await expect(page.locator(".admin-option-create .button").first()).toHaveCSS("font-weight","600");

 await page.getByText("ترتيب عرض الأقسام",{exact:true}).click();
 await page.getByRole("button",{name:"تقديم البرمجة والأنظمة والتكاملات",exact:true}).click();
 await page.getByRole("button",{name:"حفظ ترتيب الأقسام",exact:true}).click();
 await expect.poll(()=>categories.find(c=>c.code==="integrations")?.sort_order).toBe(10);
 await expect(page.getByRole("button",{name:"حفظ ترتيب الأقسام",exact:true})).toBeEnabled();
 await page.getByRole("button",{name:"البرمجة والأنظمة والتكاملات (1)",exact:true}).click();
 const card=page.locator(".admin-package-editor").filter({hasText:"الدفع الإلكتروني"});
 await expect(card).toBeVisible();
 await expect(card.getByRole("combobox",{name:"القسم",exact:true})).toHaveValue("integrations");
 await card.getByRole("combobox",{name:"القسم",exact:true}).selectOption("marketing");
 await card.getByLabel("ترتيب العرض داخل القسم").fill("5");
 await card.getByRole("button",{name:"حفظ التعديلات"}).click();
 await expect.poll(()=>options[1].category_code).toBe("marketing");
 const publicPage=await page.context().newPage();
 await publicPage.route("**/api/catalog",route=>route.fulfill({json:catalog()}));
 await publicPage.route("**/api/site-content/**",route=>route.fulfill({json:{vatRate:14,page:{content:{items:[{slug:"test-system",name:"نظام تجريبي",basePrice:5000,ownershipPrices,published:true}]}}}}));
 for(const path of ["/configure?package=landing","/catalog/test-system/pricing"]){
  await publicPage.goto(path);
  await publicPage.locator('input[value="copy"]').check();
  const group=publicPage.locator('[data-addon-category="marketing"]');
  await expect(group).toBeVisible();
  await expect(group.locator(".select-card").first()).toBeHidden();
  await group.locator("summary").click();
  await expect(publicPage.locator("body")).toHaveCSS("font-weight","500");
  await expect(group.locator(".select-card-copy strong").first()).toHaveCSS("font-size","14px");
  await expect(group.locator(".select-card-copy b").first()).toHaveCSS("font-size","14px");

  await expect(group.locator(".select-card").first()).toContainText("الدفع الإلكتروني");
  await expect(publicPage.locator('[data-addon-category="foundation"]')).toContainText("اللغة الإضافية");
  await group.getByRole("button",{name:/الدفع الإلكتروني/}).click();
  await expect(group.getByRole("button",{name:/الدفع الإلكتروني/})).toHaveAttribute("aria-pressed","true");
  await group.locator("summary").click();
  await expect(group.locator(".select-card").first()).toBeHidden();
  await expect(group.locator("summary")).toContainText("تم اختيار 1");
  await group.locator("summary").click();
  await expect(group.getByRole("button",{name:/الدفع الإلكتروني/})).toHaveAttribute("aria-pressed","true");
  const hosting=publicPage.locator('[data-addon-category="hosting"]');
  await hosting.locator("summary").click();
  await expect(hosting.locator(".addon-price-current")).toContainText("اشتراك سنوي (12 شهرًا)");
 }
});
