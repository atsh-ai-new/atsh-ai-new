import {test,expect} from "@playwright/test";
for(const [header,locale] of [["ar-EG, en;q=0.8","ar"],["en-US,ar;q=0.8","en"],["fr-FR,ar;q=0.8","en"],["en;q=0.3,ar;q=0.9","ar"]]){
 test("HTTP language negotiation "+header,async({request,page})=>{
  const response=await request.get("/?language_test=1",{headers:{"Accept-Language":header},maxRedirects:0});
  expect(response.status()).toBe(307);
  const location=response.headers()["location"];
  expect(location).toMatch(new RegExp("/"+locale+"\\?language_test=1$"));
  await page.goto(location);
  await expect(page.locator("html")).toHaveAttribute("lang",locale);
  await expect(page.locator("html")).toHaveAttribute("dir",locale==="ar"?"rtl":"ltr");
 });
}
for(const [deviceLocale,expected] of [["ar-EG","ar"],["en-US","en"],["fr-FR","en"]]){
 test.describe("real browser locale "+deviceLocale,()=>{
  test.use({locale:deviceLocale});
  test("automatic home language",async({page})=>{
   await page.goto("/");
   await expect(page).toHaveURL(new RegExp("/"+expected+"$"));
   await expect(page.locator("html")).toHaveAttribute("lang",expected);
  });
 });
}
test.describe("Arabic device preference",()=>{
 test.use({locale:"ar-EG"});
 test("manual language survives subsequent visits and explicit URLs override preference",async({page,context})=>{
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
  await expect(page).toHaveURL(/\/en$/);
  await page.locator(".atsh-fab-language").first().click();
  await expect(page).toHaveURL(/\/ar$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar$/);
 });
});
