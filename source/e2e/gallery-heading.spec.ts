import {test,expect} from "@playwright/test";
for(const locale of ["ar","en"]){
 test("gallery copy reflects published content and hides empty fields "+locale,async({page})=>{
  let content={galleryHeading:"Test gallery "+locale,galleryDescription:"Test description "+locale};
  await page.route("**/api/site-content/home?*",route=>route.fulfill({json:{page:{content}}}));
  await page.goto(locale==="en"?"/en/catalog":"/catalog");
  await expect(page.getByRole("heading",{name:content.galleryHeading,exact:true})).toBeVisible();
  await expect(page.getByText(content.galleryDescription,{exact:true})).toBeVisible();
  content={galleryHeading:"",galleryDescription:""};
  await page.reload();
  await expect(page.getByText("Test gallery "+locale,{exact:true})).toHaveCount(0);
  await expect(page.getByText("Test description "+locale,{exact:true})).toHaveCount(0);
  await expect(page.getByRole("navigation",{name:locale==="en"?"Industry sectors":"القطاعات الرئيسية"})).toBeVisible();
 });
}
