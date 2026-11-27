import { expect, test } from "@playwright/test";

for (const locale of ["ar", "en"] as const) {
  test(`home prioritizes custom systems in ${locale}`, async ({ page }) => {
    await page.route("**/api/site-content/**", route => route.fulfill({ json: { page: null } }));
    await page.goto(`/${locale}`);
    const actions = page.locator(".hero-actions > a");
    await expect(actions).toHaveCount(2);
    await expect(actions.nth(0)).toHaveAttribute("href", locale === "ar" ? "/catalog" : "/en/catalog");
    await expect(actions.nth(0)).not.toHaveClass(/button-quiet/);
    await expect(actions.nth(0)).toHaveCSS("background-image", /linear-gradient/);
    await expect(actions.nth(1)).toHaveAttribute("href", "#packages");
    await expect(actions.nth(1)).toHaveClass(/button-quiet/);
    const [first, second] = await Promise.all([actions.nth(0).boundingBox(), actions.nth(1).boundingBox()]);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(locale === "ar" ? first!.x > second!.x : first!.x < second!.x).toBe(true);
  });
}
