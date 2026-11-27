import {test,expect} from "@playwright/test";
const pkgId="11111111-1111-4111-8111-111111111111",draftId="a1111111-1111-4111-8111-111111111111",optId="b1111111-1111-4111-8111-111111111111",hostId="c1111111-1111-4111-8111-111111111111";
const prices=Object.fromEntries(Object.entries({rent:1490,rent_monthly:149,copy:2490,code:7490}).map(([m,p])=>[m,{price:p,list_price:p,initial_price:p,discount_percent:0,period:m==="rent"?"yearly":m==="rent_monthly"?"monthly":"fixed"}]));
const options=[{id:optId,code:"payment_gateway",name:"الدفع الإلكتروني",price:100,category_code:"integrations",pricing_type:"fixed"},{id:hostId,code:"hosting",name:"استضافة أساسية",price:225,category_code:"hosting",pricing_type:"yearly"}].map(o=>({...o,package_id:pkgId,is_active:true,is_required:false,description:"",visibility:"both"}));
const pkg={id:pkgId,name:"باقة تجريبية",description:"وصف",price:2490,is_custom_quote:false,features:[],ownershipPrices:prices};
const system={slug:"test-system",name:"نظام تجريبي",published:true,basePrice:2490,ownershipPrices:prices};
for(const kind of ["package","sector"] as const)test(kind+" ownership selector, independent hosting, same project update",async({page})=>{
 const direct=kind==="package"?"/packages/"+pkgId+"/pricing":"/catalog/test-system/pricing";
 let saved:any=null;
 const draft={id:draftId,title:"مشروع الاختبار",revision:7,linked_journey_id:null,draft:{ownershipMode:"copy",domainName:"example.test",...(kind==="package"?{packageId:pkgId,options:[optId],optionQuantities:{}}:{sectorSlug:system.slug,sectorAddonCodes:["payment_gateway"],sectorAddonQuantities:{}})}};
 await page.route("**/api/**",async route=>{
  const p=new URL(route.request().url()).pathname;
  if(p==="/api/catalog")return route.fulfill({json:{packages:[pkg],options,sharedOptions:options}});
  if(p==="/api/site-content/catalog")return route.fulfill({json:{vatRate:14,page:{content:{items:[system]}}}});
  if(p.startsWith("/api/site-content/"))return route.fulfill({json:{page:null,vatRate:14}});
  if(p==="/api/customer/auth/project-drafts/"+draftId){if(route.request().method()==="PATCH"){saved=route.request().postDataJSON();return route.fulfill({json:{projectDraft:{...draft,draft:saved.patch,revision:8}}});}return route.fulfill({json:{projectDraft:saved?{...draft,draft:saved.patch,revision:8}:draft}});}
  if(p==="/api/customer/auth/me")return route.fulfill({json:{customer:{id:"test",name:"Test"}}});
  if(p==="/api/customer/auth/projects")return route.fulfill({json:{projects:[]}});
  if(p==="/api/customer/auth/project-drafts")return route.fulfill({json:{projectDrafts:[saved?{...draft,draft:saved.patch,revision:8}:draft]}});
  return route.fulfill({json:{}});
 });
 await page.goto(kind==="package"?"/configure?package=landing":direct);
 await expect(page.locator('input[value="rent"]')).toBeChecked();
 await expect(page.getByText("استضافة أساسية",{exact:true})).toHaveCount(1);
 await expect(page.getByText(/معادل الشهر عند الدفع السنوي مقدمًا/)).toBeVisible();
 await page.locator('input[value="rent_monthly"]').check();
 await expect(page.locator('input[value="rent_monthly"]')).toBeChecked();
 await expect(page.getByText("استضافة أساسية",{exact:true})).toHaveCount(1);
 await page.locator('input[value="copy"]').check();
 await expect(page.getByText("استضافة أساسية",{exact:true})).toHaveCount(1);
 await page.locator('input[value="code"]').check();
 await expect(page.locator('input[value="code"]')).toBeChecked();
 await page.goto(direct+"?editProject="+draftId);
 await expect(page.locator('input[value="copy"]')).toBeChecked();
 await page.locator('[data-addon-category="integrations"] summary').click();
 await expect(page.getByRole("button",{name:/الدفع الإلكتروني/})).toHaveAttribute("aria-pressed","true");
 await page.locator('input[value="rent_monthly"]').check();
 await page.locator('[data-addon-category="hosting"] summary').click();
 await page.getByRole("button",{name:/استضافة أساسية/}).click();
 await expect(page.locator("[data-price-initial]")).toHaveAttribute("data-price-initial","540.36");
 await page.getByRole("button",{name:"حفظ الاختيارات والمتابعة"}).click();
 await expect(page).toHaveURL(/account\/dashboard\?view=projects&project=/);
 await expect(page.locator("[data-price-initial]")).toHaveAttribute("data-price-initial","540.36");
 await expect(page.getByText("كل شهر",{exact:true})).toBeVisible();
 await expect(page.getByText("كل سنة",{exact:true})).toBeVisible();
 expect(saved.expectedRevision).toBe(7);expect(saved.patch.ownershipMode).toBe("rent_monthly");expect(saved.patch.domainName).toBe("example.test");expect(saved.patch.draftInvoice.yearly).toBe(225);expect(saved.patch.draftInvoice.monthly).toBe(149);expect(saved.patch.draftInvoice.fixed).toBe(100);expect(saved.patch.draftInvoice.total).toBe(540.36);
});

for(const locale of ["ar","en"] as const)test("homepage package tariff excludes hosting ("+locale+")",async({page})=>{
 await page.route("**/api/catalog",route=>route.fulfill({json:{packages:[pkg],options,sharedOptions:options}}));
 await page.route("**/api/site-content/**",route=>route.fulfill({json:{page:null,vatRate:14}}));
 await page.goto("/"+locale);
 const card=page.locator(".package-card").first();
 await expect(card).toBeVisible();
 const price=card.locator(".package-price");
 await expect(price).toContainText(new Intl.NumberFormat(locale==="en"?"en-EG":"ar-EG").format(prices.rent.price));
 await expect(price).toContainText(locale==="ar"?"إيجار سنوي للنظام فقط — الاستضافة منفصلة":"Annual software rental only — hosting billed separately");
 await expect(price).not.toContainText(new Intl.NumberFormat(locale==="en"?"en-EG":"ar-EG").format(prices.rent.price+225));
});
