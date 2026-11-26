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
  await expect(page.locator(".atsh-fab-language")).toBeVisible();
  await page.locator(".atsh-fab-language").click();
  await expect(page).toHaveURL(/\/en$/);
  expect((await context.cookies()).find(c=>c.name==="atsh_locale")?.value).toBe("en");
  expect((await context.cookies()).find(c=>c.name==="atsh_locale_device")?.value).toBe("ar");
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("lang","ar");
  await expect(page.locator(".atsh-fab-language")).toBeVisible();
  await page.locator(".atsh-fab-language").click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator(".atsh-fab-language")).toBeVisible();
  await page.locator(".atsh-fab-language").click();
  await expect(page).toHaveURL(/\/ar$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar$/);
 });
});

test("legacy manual cookie cannot override the device language",async({request})=>{
 const response=await request.get("/",{headers:{"Accept-Language":"ar-EG","Cookie":"atsh_locale=en"},maxRedirects:0});
 expect(response.status()).toBe(307);
 expect(response.headers()["location"]).toMatch(/\/ar$/);
});
test("changing device language overrides a preference from the old device language",async({request})=>{
 for(const [header,cookie,locale] of [["ar-EG","atsh_locale=en; atsh_locale_device=fr","ar"],["en-US","atsh_locale=ar; atsh_locale_device=ar","en"]]){
  const response=await request.get("/",{headers:{"Accept-Language":header,"Cookie":cookie},maxRedirects:0});
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toMatch(new RegExp("/"+locale+"$"));
 }
});
