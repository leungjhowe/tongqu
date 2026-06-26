import { test, expect, type Page } from "@playwright/test";

test.describe("login flow", () => {
  test("账号密码登录 (admin/admin123)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("用户名").fill("admin");
    await page.getByLabel("密码").fill("admin123");
    await page.getByRole("button", { name: /进入系统/ }).click();
    await page.waitForURL(/\/app\/home/);
    await expect(page.getByText("交通规划AI工作流系统")).toBeVisible();
  });

  test("错误密码 → 提示错误", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("用户名").fill("admin");
    await page.getByLabel("密码").fill("wrong");
    await page.getByRole("button", { name: /进入系统/ }).click();
    await expect(page.getByText(/用户名或密码错误/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("游客模式：填用户名直接进", async ({ page }) => {
    await page.goto("/login");
    // 切到游客模式
    await page.getByRole("button", { name: /以游客身份进入/ }).click();
    const guestName = `e2e-guest-${Date.now()}`;
    await page.getByLabel("游客用户名").fill(guestName);
    await page.getByRole("button", { name: /游客进入/ }).click();
    await page.waitForURL(/\/app\/home/);
  });
});
