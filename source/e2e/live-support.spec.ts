import {test,expect} from "@playwright/test";
test("live support opens, sends and displays a reply without leaving the page",async({page})=>{
 let messages:{id:string;sender:string;body:string}[]=[];
 await page.route("**/api/visitor/live-support/**",async route=>{
 const url=new URL(route.request().url());
 if(url.pathname.endsWith("/start"))return route.fulfill({status:201,json:{id:"test",token:"test-token"}});
 if(url.pathname.endsWith("/status"))return route.fulfill({json:{online:true}});
 if(route.request().method()==="POST"){const message={id:"1",sender:"visitor",body:route.request().postDataJSON().body};messages=[message,{id:"2",sender:"staff",body:"Support reply"}];return route.fulfill({status:201,json:{message}});}
 return route.fulfill({json:{messages}});
 });
 await page.goto("/");
 await page.getByRole("button",{name:"قنوات التواصل واللغة"}).click();
 await page.getByRole("button",{name:"خدمة العملاء",exact:true}).click();
 const dialog=page.getByRole("dialog",{name:"خدمة العملاء"});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByText("متصل الآن",{exact:true})).toBeVisible();
 await dialog.getByPlaceholder("اكتب رسالتك").fill("Test visitor message");
 await dialog.getByRole("button",{name:"إرسال",exact:true}).click();
 await expect(dialog.getByText("Test visitor message",{exact:true})).toBeVisible();
 await expect(dialog.getByText("Support reply",{exact:true})).toBeVisible({timeout:10000});
 await expect(dialog.getByLabel("إرفاق ملف")).toBeAttached();
 const box=await dialog.boundingBox();const viewport=page.viewportSize();expect(box).not.toBeNull();if(box&&viewport){expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1);}
 await dialog.getByRole("button",{name:"إغلاق"}).click();await expect(dialog).toHaveCount(0);
});
