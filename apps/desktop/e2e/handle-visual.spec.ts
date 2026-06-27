import { test, expect, type Page } from "@playwright/test";

async function setup(page: Page) {
  await page.goto("http://localhost:1420/login");
  await page.getByRole("button", { name: /以游客身份进入/ }).click();
  const guestName = `e2e-visual-${Date.now()}`;
  await page.getByLabel("游客用户名").fill(guestName);
  await page.getByRole("button", { name: /游客进入/ }).click();
  await page.waitForURL(/\/app\/home/);
  await page.goto("http://localhost:1420/app/workspace");
  await page.getByRole("button", { name: /\+ 新建项目/ }).click();
  const nameInput = page.getByLabel("项目名称");
  await nameInput.fill(`visual-test-${Date.now()}`);
  await page.getByRole("button", { name: "创建" }).click();
  await page.waitForURL(/\/app\/workspace\/[\w-]+/);
  await page.waitForSelector(".react-flow", { timeout: 10000 });
  await page.waitForFunction(() => typeof (window as any).__workspaceAddNode === "function");
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => (window as any).__workspaceAddNode("data"));
    await page.waitForTimeout(300);
  }
}

test.describe("Handle 视觉 + 磁吸", () => {
  test("鼠标靠近 handle 时对齐 + 边框颜色", async ({ page }) => {
    await setup(page);

    // 找到 handle span（含有 border-2 的 span）
    const sourceHandle = page.locator('[style*="border: 2px solid"]').first();
    await expect(sourceHandle).toBeVisible();

    // 截图 before
    await page.screenshot({ path: "e2e/screenshots/handle-before.png" });

    // 读取 handle 的 border 样式
    const borderColor = await sourceHandle.evaluate((el) =>
      getComputedStyle(el).borderColor
    );
    const borderWidth = await sourceHandle.evaluate((el) =>
      getComputedStyle(el).borderWidth
    );
    console.log(`💡 Handle border: ${borderWidth} ${borderColor}`);

    // React Flow 默认 handle border 是 1px solid white
    // white = rgb(255, 255, 255) 或 hsl(0, 0%, 100%)
    // 我们的应该是 hwb(0 92% 0%) ≈ hsl(0 0% 92%) = #ebebeb
    // 看实际值：
    console.log(`  期望: 白色 / rgb(255,255,255)`);
    console.log(`  实际: ${borderColor}`);

    // 把鼠标移到 handle 正上方，截图看是否对齐
    const box = await sourceHandle.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
      await page.screenshot({ path: "e2e/screenshots/handle-hover-center.png" });

      // 鼠标偏移 20px，验证 handle 跟随（transform）
      await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2);
      await page.waitForTimeout(100);
      await page.screenshot({ path: "e2e/screenshots/handle-moved-20px.png" });

      // 读取 handle transform
      const transform = await sourceHandle.evaluate((el) =>
        getComputedStyle(el).transform
      );
      console.log(`  磁吸 transform (offset 20px right): ${transform}`);

      // 鼠标回到 handle 正中心 → 应完全对齐（transform = 接近 matrix(1,0,0,1,0,0)）
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
      await page.screenshot({ path: "e2e/screenshots/handle-back-to-center.png" });
      const transformCenter = await sourceHandle.evaluate((el) =>
        getComputedStyle(el).transform
      );
      console.log(`  回到中心 transform: ${transformCenter}`);

      // 鼠标移远（>RELEASE_RANGE），应归位
      await page.mouse.move(box.x + 100, box.y + box.height / 2);
      await page.waitForTimeout(300);
      await page.screenshot({ path: "e2e/screenshots/handle-far.png" });
      const transformFar = await sourceHandle.evaluate((el) =>
        getComputedStyle(el).transform
      );
      console.log(`  远离 transform: ${transformFar}`);
    }
  });
});