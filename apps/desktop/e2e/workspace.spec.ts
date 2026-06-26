import { test, expect, type Page } from "@playwright/test";

async function loginAsGuest(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /以游客身份进入/ }).click();
  const guestName = `e2e-workspace-${Date.now()}`;
  await page.getByLabel("游客用户名").fill(guestName);
  await page.getByRole("button", { name: /游客进入/ }).click();
  await page.waitForURL(/\/app\/home/);
}

test.describe("/app/workspace CRUD", () => {
  test("创建项目 → 列表出现 → 重命名 → 归档 → 列表消失", async ({ page }) => {
    await loginAsGuest(page);
    await page.goto("/app/workspace");
    await expect(page).toHaveURL(/\/app\/workspace/);

    // 新建
    await page.getByRole("button", { name: /\+ 新建项目/ }).click();
    const dialog = page.getByRole("dialog", { name: /新建项目/ });
    await expect(dialog).toBeVisible();
    const nameInput = page.getByLabel("项目名称");
    const testName = `测试项目 ${Date.now()}`;
    await nameInput.fill(testName);
    await page.getByRole("button", { name: "创建" }).click();

    // 跳到详情占位页（/workspace/:id）
    await page.waitForURL(/\/app\/workspace\/[\w-]+/);

    // 回 workspace
    await page.goto("/app/workspace");
    await expect(page.getByText(testName)).toBeVisible();

    // 重命名
    const newName = `已重命名 ${Date.now()}`;
    await page.getByRole("button", { name: /重命名/ }).first().click();
    const renameInput = page.getByLabel("项目名称");
    await renameInput.fill(newName);
    await renameInput.press("Enter");
    await expect(page.getByText(newName)).toBeVisible();
    await expect(page.getByText(testName)).not.toBeVisible();

    // 归档（confirm 弹窗接受）
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /归档/ }).first().click();
    await expect(page.getByText(newName)).not.toBeVisible();
  });
});
