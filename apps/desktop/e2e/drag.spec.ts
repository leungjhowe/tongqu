import { test, expect, type Page } from "@playwright/test";

async function loginAsGuest(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /以游客身份进入/ }).click();
  const guestName = `e2e-drag-${Date.now()}`;
  await page.getByLabel("游客用户名").fill(guestName);
  await page.getByRole("button", { name: /游客进入/ }).click();
  await page.waitForURL(/\/app\/home/);
}

async function createProject(page: Page) {
  await page.goto("/app/workspace");
  await page.getByRole("button", { name: /\+ 新建项目/ }).click();
  const nameInput = page.getByLabel("项目名称");
  const projectName = `drag-test-${Date.now()}`;
  await nameInput.fill(projectName);
  await page.getByRole("button", { name: "创建" }).click();
  await page.waitForURL(/\/app\/workspace\/[\w-]+/);
  return projectName;
}

test.describe("节点拖拽跟随鼠标", () => {
  test("新增节点 → 拖动 → 节点跟随鼠标 → 松开后吸附重新显示", async ({ page }) => {
    await loginAsGuest(page);
    await createProject(page);

    // 等待 React Flow 画布加载
    await page.waitForSelector(".react-flow", { timeout: 10000 });

    // 点击左侧胶囊工具栏的 ➕（新增节点 — 用 title 精确匹配）
    const addBtn = page.getByTitle("新增节点");
    await addBtn.hover();
    await page.waitForTimeout(300);

    // 点击「文本节点」
    const textNodeBtn = page.getByRole("button", { name: /文本节点/ });
    await expect(textNodeBtn).toBeVisible({ timeout: 3000 });
    await textNodeBtn.click();

    // 等待节点出现在画布上
    await page.waitForSelector(".react-flow__node", { timeout: 5000 });
    const node = page.locator(".react-flow__node").first();
    await expect(node).toBeVisible();

    // 记录初始位置
    const box0 = await node.boundingBox();
    expect(box0).not.toBeNull();

    // 拖拽节点：鼠标从节点中心向右下拖动 200px
    const startX = box0!.x + box0!.width / 2;
    const startY = box0!.y + box0!.height / 2;
    const endX = startX + 200;
    const endY = startY + 100;

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // 分 10 步移动（模拟真实拖动）
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(
        startX + (endX - startX) * (i / 10),
        startY + (endY - startY) * (i / 10)
      );
      await page.waitForTimeout(50); // 50ms 每步 → 共 500ms 拖完
    }

    // 在拖动过程中截屏供对照
    await page.screenshot({
      path: "e2e/screenshots/drag-in-progress.png",
      fullPage: false,
    });

    await page.mouse.up();

    // 等 React Flow 更新位置
    await page.waitForTimeout(300);

    // 验证节点位置已经移动（用节点中心坐标比较）
    const box1 = await node.boundingBox();
    expect(box1).not.toBeNull();

    const finalCX = box1!.x + box1!.width / 2;
    const finalCY = box1!.y + box1!.height / 2;

    console.log(`初始位置: (${box0!.x}, ${box0!.y})`);
    console.log(`最终位置: (${box1!.x}, ${box1!.y}) ` +
      `中心 (${finalCX}, ${finalCY})`);
    console.log(`预期中心: (${endX}, ${endY})`);
    console.log(`X 增量: ${finalCX - (box0!.x + box0!.width / 2)}, ` +
      `Y 增量: ${finalCY - (box0!.y + box0!.height / 2)}`);

    // 验证节点实际移动了 ≈200px（React Flow snap 允许 ±10px 误差）
    const movedX = Math.abs(finalCX - endX);
    const movedY = Math.abs(finalCY - endY);
    expect(movedX).toBeLessThan(10);
    expect(movedY).toBeLessThan(10);

    // 验证吸附（NodeAttachments / ChatPanel）可见
    // 吸附包含文本 "Claude Sonnet" 在底部条
    const popover = page.locator("text=Claude Sonnet");
    await expect(popover).toBeVisible({ timeout: 3000 });
  });
});
