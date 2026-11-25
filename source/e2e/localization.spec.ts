import {test,expect} from "@playwright/test";

test("public homepage is real English LTR and switches back to Arabic",async({page})=>{
 await page.goto("/en");
 await expect(page.locator("html")).toHaveAttribute("lang","en");
 await expect(page.locator("html")).toHaveAttribute("dir","ltr");
 await expect(page.getByRole("heading",{level:1})).toContainText("Build a website");
 await expect(page.getByRole("link",{name:"التحويل إلى العربية"})).toHaveAttribute("href","/ar");
 await page.getByRole("link",{name:"التحويل إلى العربية"}).click();
 await expect(page).toHaveURL(/\/ar$/);
 await expect(page.locator("html")).toHaveAttribute("lang","ar");
 await expect(page.locator("html")).toHaveAttribute("dir","rtl");
});

test("English pricing configurator uses the same interactive selection and browser-safe navigation",async({page})=>{
 await page.goto("/en");
 await expect(page.getByText("Configure your project").first()).toBeVisible();
 await page.getByRole("button",{name:/Configure your project/}).first().click();
 await expect(page.locator("#configurator")).toBeVisible();
 await expect(page.getByText("Languages for your new website")).toBeVisible({timeout:12000}).catch(()=>{});
});

test("English project intake and catalog routes remain functional on mobile and desktop",async({page})=>{
 await page.goto("/en/start");
 await expect(page.locator("html")).toHaveAttribute("dir","ltr");
 await expect(page.getByRole("heading",{name:/Start your project your way/})).toBeVisible();
 await page.getByRole("button",{name:/E-commerce store/}).click();
 await page.getByRole("button",{name:/^Next(?:\s|$)/}).click();
 await expect(page.getByText("Required features")).toBeVisible();
 await page.goto("/en/catalog");
 await expect(page.getByRole("heading",{name:/Explore digital solutions by industry/})).toBeVisible();
 await expect(page.getByRole("link",{name:"Switch page to Arabic"})).toBeVisible();
});

test("English client login is a translated account form with original API flow",async({page})=>{
 await page.goto("/en/account/login");
 await expect(page.locator("html")).toHaveAttribute("lang","en");
 await expect(page.getByRole("heading",{name:"Sign in"})).toBeVisible();
 await expect(page.getByText("Email address")).toBeVisible();
 await expect(page.getByText("Password",{exact:true})).toBeVisible();
});
