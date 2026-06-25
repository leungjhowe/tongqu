import { test, expect, type Page } from "@playwright/test";

/** Mock auth: any non-empty username/password succeeds. */
async function login(page: Page) {
  await page.goto("/login");
  // Login uses a FloatingInput that renders <label> as a sibling (no id/for).
  // AutoComplete attributes give us a stable hook.
  await page.locator('input[autocomplete="username"]').fill("tester");
  await page.locator('input[autocomplete="current-password"]').fill("any");
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

    // 4 个项目卡：1 新建 + 3 最近
    await expect(page.getByRole("button", { name: /新建项目/ })).toBeVisible();
    await expect(page.getByText("滨海新城交通评估")).toBeVisible();
    await expect(page.getByText("东莞地铁 12 号线规划")).toBeVisible();
    await expect(page.getByText("松山湖通勤 OD 矩阵")).toBeVisible();
    // 第 4 个（虎门港物流通道仿真）不应该可见 — 我们只显示 3 个最近
    await expect(page.getByText("虎门港物流通道仿真")).not.toBeVisible();

    // "所有项目" 链接
    await expect(page.getByRole("button", { name: /所有项目/ })).toBeVisible();

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
    await expect(page.getByRole("heading", { name: "工作空间" })).toBeVisible();

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

  test("点击历史项目卡 → /app/workspace/:id", async ({ page }) => {
    await login(page);
    await page.getByText("滨海新城交通评估").first().click();
    await expect(page).toHaveURL(/\/app\/workspace\/p-001/);
  });

  test("点击新建项目 → /app/workspace/new", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /新建项目/ }).click();
    await expect(page).toHaveURL(/\/app\/workspace\/new/);
  });

  test("点击所有项目 → /app/workspace", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /所有项目/ }).click();
    await expect(page).toHaveURL(/\/app\/workspace$/);
  });
});
