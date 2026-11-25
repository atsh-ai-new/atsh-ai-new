import {test,expect} from "@playwright/test";
for(const [header,locale] of [["ar-EG, en;q=0.8","ar"],["en-US,ar;q=0.8","en"],["fr-FR,ar;q=0.8","en"],["en;q=0.3,ar;q=0.9","ar"]]){
 test("primary browser locale "+header,async({page})=>{
  await page.setExtraHTTPHeaders({"Accept-Language":header});
  await page.goto("/?language_test=1");
  await expect(page).toHaveURL(new RegExp("/"+locale+"\\?language_test=1$"));
  await expect(page.locator("html")).toHaveAttribute("lang",locale);
  await expect(page.locator("html")).toHaveAttribute("dir",locale==="ar"?"rtl":"ltr");
 });
}
test("manual language survives subsequent visits and explicit URLs override preference",async({page,context})=>{
 await page.setExtraHTTPHeaders({"Accept-Language":"ar-EG"});
 await page.goto("/");
 await expect(page.locator("html")).toHaveAttribute("lang","ar");
 await page.locator(".atsh-fab-language").first().click();
 await expect(page).toHaveURL(/\/en$/);
 expect((await context.cookies()).find(c=>c.name==="atsh_locale")?.value).toBe("en");
 await page.goto("/");
 await expect(page).toHaveURL(/\/en$/);
 await page.goto("/ar");
 await expect(page.locator("html")).toHaveAttribute("lang","ar");
 await page.locator(".atsh-fab-language").first().click();
 await page.locator(".atsh-fab-language").first().click();
 await expect(page).toHaveURL(/\/ar$/);
 await page.goto("/");
 await expect(page).toHaveURL(/\/ar$/);
});
