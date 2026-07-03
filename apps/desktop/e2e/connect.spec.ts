import { test, expect, type Page } from "@playwright/test";

async function loginAsGuest(page: Page) {
  await page.goto("http://localhost:1420/login");
  await page.getByRole("button", { name: /以游客身份进入/ }).click();
  const guestName = `e2e-connect-${Date.now()}`;
  await page.getByLabel("游客用户名").fill(guestName);
  await page.getByRole("button", { name: /游客进入/ }).click();
  await page.waitForURL(/\/app\/home/);
}

async function createTwoNodesAndConnect(page: Page) {
  await page.goto("http://localhost:1420/app/workspace");
  await page.getByRole("button", { name: /\+ 新建项目/ }).click();
  const nameInput = page.getByLabel("项目名称");
  const projectName = `connect-test-${Date.now()}`;
  await nameInput.fill(projectName);
  await page.getByRole("button", { name: "创建" }).click();
  await page.waitForURL(/\/app\/workspace\/[\w-]+/);

  await page.waitForSelector(".react-flow", { timeout: 10000 });

  // 添 2 个文本节点（通过 window 暴露的 handleAddNode，避开 hover flyout）
  await page.waitForFunction(
    () => typeof (window as any).__workspaceAddNode === "function"
  );
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => (window as any).__workspaceAddNode("data"));
    await page.waitForTimeout(300);
  }

  const nodes = page.locator(".react-flow__node");
  await expect(nodes).toHaveCount(2);
  return nodes;
}

test.describe("节点连接（ConnectionOverlay）", () => {
  test("从节点1右侧端口拖到节点2左侧端口 — 创建 edge", async ({ page }) => {
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.startsWith("[conn]") || text.startsWith("[toolbar")) {
        console.log("[browser]", text);
      }
    });

    await loginAsGuest(page);
    const nodes = await createTwoNodesAndConnect(page);

    // 两个节点默认位置：node-1 = (100,150), node-2 = (340,150)
    // 但 fitView 之后会重新居中
    const node0 = nodes.nth(0);
    const node1 = nodes.nth(1);
    const box0 = await node0.boundingBox();
    const box1 = await node1.boundingBox();
    expect(box0).not.toBeNull();
    expect(box1).not.toBeNull();

    // 节点 1 右侧端口中心：right edge, vertical center
    // 节点 2 左侧端口中心：left edge, vertical center
    // 但 + 圆圈伸出节点边缘 34px（!-right-[34px]），所以真实视觉中心是 edge + 34px
    // 点击 + 圆圈中心触发 drag
    const sourceX = box0!.x + box0!.width + 34;
    const sourceY = box0!.y + box0!.height / 2;
    const targetX = box1!.x - 34;
    const targetY = box1!.y + box1!.height / 2;

    console.log(`[test] source: (${sourceX}, ${sourceY}), target: (${targetX}, ${targetY})`);
    await page.screenshot({ path: "e2e/screenshots/connect-0-before.png" });

    // 拖动
    await page.mouse.move(sourceX, sourceY);
    await page.mouse.down();

    // 中间移动
    await page.mouse.move((sourceX + targetX) / 2, (sourceY + targetY) / 2, {
      steps: 10,
    });

    // 移动到目标
    await page.mouse.move(targetX, targetY, { steps: 10 });

    await page.screenshot({ path: "e2e/screenshots/connect-1-mid.png" });

    // 等吸附生效
    await page.waitForTimeout(200);
    await page.screenshot({ path: "e2e/screenshots/connect-2-near-target.png" });

    // 截图查看 ghost / 吸附高亮 / 终点 snap
    await page.screenshot({
      path: "e2e/screenshots/connect-in-progress.png",
      fullPage: false,
    });

    await page.mouse.up();
    await page.waitForTimeout(500);

    // 验证 edge 已创建
    const edges = page.locator(".react-flow__edge");
    await expect(edges).toHaveCount(1, { timeout: 3000 });

    // 截图最终结果
    await page.screenshot({
      path: "e2e/screenshots/connect-success.png",
      fullPage: false,
    });
  });
});