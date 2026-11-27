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
