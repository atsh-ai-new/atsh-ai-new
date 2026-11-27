import {expect,test} from "@playwright/test";

for(const language of ["ar","en"] as const){
 const en=language==="en";
 const base=en?"/en":"";
 test(`customer sign-in in ${language} uses client navigation and waits for the verified session`,async({page})=>{
  let loginPosts=0, documentNavigations=0, commercialReads=0, verified=false;
  let resumeLogin!:()=>void,resumeSession!:()=>void;
  const pauseLogin=new Promise<void>(resolve=>{resumeLogin=resolve});
  const pauseSession=new Promise<void>(resolve=>{resumeSession=resolve});
  await page.route("**/api/customer/auth/**",async route=>{
   const pathname=new URL(route.request().url()).pathname;
   const action=pathname.split("/").at(-1);
   if(action==="login"){
    loginPosts++;
    expect(route.request().method()).toBe("POST");
    await pauseLogin;
    return route.fulfill({headers:{"Set-Cookie":"atsh_customer=fixture-session; Path=/; HttpOnly; SameSite=Lax"},json:{customer:{name:"Fixture"}}});
   }
   if(action==="me"){
    expect(await route.request().headerValue("cookie")).toContain("atsh_customer=fixture-session");
    await pauseSession;verified=true;
    return route.fulfill({json:{customer:{name:"Fixture"}}});
   }
   return route.fulfill({json:action==="projects"?{projects:[]}:action==="project-drafts"?{drafts:[]}:{workspace:{draft:{}}}});
  });
  await page.route("**/api/customer/commercial/**",async route=>{
   commercialReads++;
   expect(verified).toBe(true);
   return route.fulfill({status:503,json:{error:"Fixture document outage"}});
  });
  await page.route("**/api/customer/deliverables",async route=>route.fulfill({json:{deliverables:[]}}));
  await page.goto(`${base}/account/login`);
  page.on("request",req=>{if(req.isNavigationRequest()&&req.resourceType()==="document")documentNavigations++;});
  await page.getByLabel(en?"Email address":"البريد الإلكتروني").fill("fixture@example.test");
  await page.getByLabel(en?"Password":"كلمة المرور").fill("fixture-only");
  await page.getByRole("button",{name:en?"Continue":"متابعة",exact:true}).click();
  await expect(page.getByRole("button",{name:en?"Signing in…":"جارٍ تسجيل الدخول…"})).toBeDisabled();
  resumeLogin();
  await expect(page).toHaveURL(`${base}/account/dashboard`);
  await expect(page.getByRole("heading",{name:en?"Checking account…":"جارٍ التحقق من حسابك…"})).toBeVisible();
  expect(commercialReads).toBe(0);
  expect(loginPosts).toBe(1);
  expect(documentNavigations).toBe(0);
  resumeSession();
  await expect.poll(()=>commercialReads).toBe(4);
  await expect(page.getByRole("navigation",{name:en?"Customer journey":"رحلة العميل"})).toBeVisible();
 });
}

test("failed sign-in unlocks form without navigating",async({page})=>{
 await page.route("**/api/customer/auth/login",route=>route.fulfill({status:401,json:{error:"Invalid credentials or unverified account"}}));
 await page.goto("/en/account/login");
 await page.getByLabel("Email address").fill("fixture@example.test");
 await page.getByLabel("Password").fill("fixture-only");
 await page.getByRole("button",{name:"Continue",exact:true}).click();
 await expect(page.getByText("Invalid credentials or unverified account")).toBeVisible();
 await expect(page.getByRole("button",{name:"Continue",exact:true})).toBeEnabled();
 await expect(page).toHaveURL("/en/account/login");
});
