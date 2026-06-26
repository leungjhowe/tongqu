import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin123");
  await page.getByRole("button", { name: /进入系统/ }).click();
  await page.waitForURL(/\/app/);
}

test.describe("/app/home dashboard", () => {
  test("登录后能看到核心 UI 元素并截图", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/app\/home/);

    // Header — logo 产品名
    await expect(page.getByText("交通规划AI工作流系统")).toBeVisible();

    // 4 个导航胶囊，主页激活
    const nav = page.locator('nav[aria-label="主导航"]');
    const homeNav = nav.getByRole("button", { name: /主页/ });
    await expect(homeNav).toBeVisible();
    await expect(homeNav).toHaveAttribute("aria-current", "page");

    for (const label of ["工作空间", "资产", "模板"]) {
      await expect(nav.getByRole("button", { name: new RegExp(label) })).toBeVisible();
    }

    // AI 提示词输入
    await expect(page.getByRole("textbox", { name: /AI 提示词/ })).toBeVisible();

    // Hero 标题
    await expect(page.getByRole("heading", { name: /今天要做什么/ })).toBeVisible();

    // admin 没有项目，显示空态
    await expect(page.getByText(/暂无历史项目/)).toBeVisible();
    await expect(page.getByRole("button", { name: /新建一个/ })).toBeVisible();

    // 截图（2K 视口）
    await page.screenshot({
      path: "e2e/screenshots/dashboard-home-2k.png",
      fullPage: false,
    });
  });

  test("AI 提示词输入并提交 → console 日志 + 输入清空", async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on("console", (msg) => consoleLogs.push(msg.text()));

    await login(page);
    const prompt = page.getByRole("textbox", { name: /AI 提示词/ });
    await prompt.fill("测试一下");
    await prompt.press("Enter");

    // 等待 console 日志出现
    await expect
      .poll(() => consoleLogs.some((l) => l.includes("[AiPrompt] submit")), { timeout: 5000 })
      .toBe(true);

    // 输入已清空
    await expect(prompt).toHaveValue("");
  });

  test("点击 4 个导航胶囊跳转", async ({ page }) => {
    await login(page);
    const nav = page.locator('nav[aria-label="主导航"]');

    // 工作空间
    await nav.getByRole("button", { name: /工作空间/ }).click();
    await expect(page).toHaveURL(/\/app\/workspace/);
    await expect(page.getByRole("button", { name: /\+ 新建项目/ })).toBeVisible();

    // 回主页
    await page.goto("/app/home");

    // 资产
    await nav.getByRole("button", { name: /资产/ }).click();
    await expect(page).toHaveURL(/\/app\/assets/);
    await expect(page.getByRole("heading", { name: "资产" })).toBeVisible();

    await page.goto("/app/home");

    // 模板
    await nav.getByRole("button", { name: /模板/ }).click();
    await expect(page).toHaveURL(/\/app\/templates/);
    await expect(page.getByRole("heading", { name: "模板" })).toBeVisible();
  });

  test("无项目时显示空态", async ({ page }) => {
    await login(page);
    await expect(page.getByText(/暂无历史项目/)).toBeVisible();
  });

  test("点击新建项目弹出 modal", async ({ page }) => {
    await login(page);
    // admin 没有项目，点空态里的"新建一个"按钮触发 modal
    await page.getByRole("button", { name: /新建一个/ }).click();
    await expect(page.getByRole("dialog", { name: /新建项目/ })).toBeVisible();
  });

  test("点击所有项目 → /app/workspace", async ({ page }) => {
    await login(page);
    const nav = page.locator('nav[aria-label="主导航"]');
    await nav.getByRole("button", { name: /工作空间/ }).click();
    await expect(page).toHaveURL(/\/app\/workspace/);
    await expect(page.getByRole("button", { name: /\+ 新建项目/ })).toBeVisible();
  });
});
