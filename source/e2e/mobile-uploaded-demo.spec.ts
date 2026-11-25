import {test,expect} from "@playwright/test";
test("uploaded standalone demo stays interactive inside catalog",async({page})=>{
 const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><button id="go" onclick="document.getElementById(\'result\').textContent=\'Entered\'">Enter demo</button><div id="result"></div></body></html>';
 await page.route("**/api/site-content/catalog?metadata=1",route=>route.fulfill({json:{page:{content:{items:[{slug:"avocato",name:"Avocato",published:true,hasPreviewHtml:true,modules:["Cases"],features:[],sampleRows:[],sampleStats:[]}]}}}}));
 await page.route("**/api/site-content/catalog?demo=avocato",route=>route.fulfill({json:{html}}));
 await page.goto("/catalog/avocato?fullscreen=1");
 const frame=page.frameLocator('iframe[title*="معاينة"]');
 await expect(page.locator("main[data-catalog-immersive=true]")).toBeVisible();
 await frame.getByRole("button",{name:"Enter demo"}).click();
 await expect(frame.getByText("Entered")).toBeVisible();
 await page.setViewportSize({width:390,height:700});
 await expect(frame.getByText("Entered")).toBeVisible();
 const bounds=await page.locator("main[data-catalog-immersive=true]").boundingBox();
 expect(bounds?.x).toBe(0);
 expect(bounds?.width).toBe(390);
 await expect(page).toHaveURL(/\/catalog\/avocato\?fullscreen=1$/);
 await expect(page.locator('iframe[title*="معاينة"]')).not.toHaveAttribute("sandbox",/allow-same-origin/);
});
