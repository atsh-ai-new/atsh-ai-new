import {expect,test} from "@playwright/test";

const ticker={
 enabled:true,url:"/catalog",speed:40,background:"#ffffff",color:"#14243C",position:"below_header",
 text:"حوّل فكرتك إلى مشروع رقمي متكامل مع ATSH AI — برمجة احترافية، حلول ذكية، وأسعار تناسب طموحك.",
};

test("news bubbles preserve RTL text, colors, placement, links and pause",async({page})=>{
 await page.route("**/api/site-content/home?locale=*",route=>route.fulfill({json:{page:{content:{newsTicker:ticker}}}}));
 await page.goto("/ar");
 const bar=page.locator(".platform-header + .atsh-news-slot .atsh-news-ticker");
 await expect(bar).toHaveAttribute("dir","rtl");
 await expect(bar).toHaveCSS("color","rgb(20, 36, 60)");
 await expect(bar).toHaveCSS("background-color","rgb(255, 255, 255)");
 const links=bar.getByRole("link");
 await expect(links).toHaveText(["حوّل فكرتك إلى مشروع رقمي متكامل مع ATSH AI","برمجة احترافية","حلول ذكية","وأسعار تناسب طموحك."]);
 await expect(links.first()).toHaveAttribute("href","/catalog");
 await expect(links.first()).toHaveCSS("border-radius","999px");
 const pause=bar.getByRole("button",{name:"إيقاف حركة شريط الأخبار"});
 await pause.click();
 await expect(pause).toHaveAttribute("aria-pressed","true");
 await expect(bar.locator("ul[aria-hidden]")).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await pause.click();
 await expect(pause).toHaveAttribute("aria-pressed","false");
 await expect(bar.locator("ul[aria-hidden]")).toBeVisible();
});

test("news bubbles respect reduced motion and preserve the English fallback",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.route("**/api/site-content/home?locale=*",route=>route.fulfill({json:{page:{content:{newsTicker:new URL(route.request().url()).searchParams.get("locale")==="ar"?ticker:null}}}}));
 await page.goto("/en");
 const bar=page.getByRole("region",{name:"Platform news"});
 await expect(bar).toHaveAttribute("dir","ltr");
 await expect(bar.getByRole("link")).toHaveText(["Explore ATSH AI websites and apps","Customize your system now"]);
 await expect(bar.getByRole("button")).toHaveCount(0);
 await expect(bar.locator("ul[aria-hidden]")).toBeHidden();
});

for(const language of ["ar","en"] as const){
 test(`news bubbles fill the viewport throughout the ${language} loop`,async({page})=>{
  await page.route("**/api/site-content/home?locale=*",route=>route.fulfill({json:{page:{content:{newsTicker:{...ticker,text:language==="ar"?ticker.text:"Explore ATSH AI websites and apps | Customize your system now"}}}}}));
  await page.goto(`/${language}`);
  const bar=page.locator("[data-news-bubbles]");
  await expect(bar).toHaveAttribute("dir",language==="ar"?"rtl":"ltr");
  await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
  const geometry=await bar.evaluate(section=>{
   const main=section.querySelector("ul")!;
   const track=main.parentElement!;
   const viewport=track.parentElement!.getBoundingClientRect();
   const animation=track.getAnimations()[0];
   const duration=Number(animation.effect!.getTiming().duration);
   animation.pause();
   const frames=Array.from({length:21},(_,i)=>{
    animation.currentTime=duration*Math.min(i/20,0.99999);
    const bounds=track.getBoundingClientRect();
    return {left:bounds.left,right:bounds.right,visible:[...track.querySelectorAll("li")].some(item=>{
     const bubble=item.firstElementChild!.getBoundingClientRect();
     return bubble.right>viewport.left+1&&bubble.left<viewport.right-1;
    })};
   });
   return {left:viewport.left,right:viewport.right,frames,direction:getComputedStyle(main).direction};
  });
  expect(geometry.direction).toBe(language==="ar"?"rtl":"ltr");
  for(const frame of geometry.frames){
   expect(frame.left).toBeLessThanOrEqual(geometry.left+1);
   expect(frame.right).toBeGreaterThanOrEqual(geometry.right-1);
   expect(frame.visible).toBe(true);
  }
  const displacement=geometry.frames.at(-1)!.left-geometry.frames[0].left;
  expect(language==="ar"?displacement:-displacement).toBeGreaterThan(100);
 });
}
