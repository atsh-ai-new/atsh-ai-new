import {test,expect} from "@playwright/test";

for (const locale of ["ar","en"]) {
 test("homepage contact is a compact single-line link above the header controls "+locale,async({page})=>{
  await page.goto("/"+locale);
  const header=page.locator(".platform-header");
  const contact=header.locator(".platform-header-contact");
  await expect(contact).toHaveText("51 ش 9 المعادي القاهرة 01007735321");
  await expect(contact).toHaveAttribute("href","tel:+201007735321");
  await expect(contact).toBeVisible();
  const geometry=await contact.evaluate(el=>{
   const link=el.getBoundingClientRect();
   const logo=el.parentElement!.querySelector(".platform-brand")!.getBoundingClientRect();
   const style=getComputedStyle(el);
   return {inside:link.left>=0&&link.right<=window.innerWidth,above:link.bottom<=logo.top,nowrap:style.whiteSpace==="nowrap",small:parseFloat(style.fontSize)<=12};
  });
  expect(geometry).toEqual({inside:true,above:true,nowrap:true,small:true});
 });
}
