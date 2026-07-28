import { test, expect } from "@playwright/test";

test("文本节点尺寸（Windows 适配）", async ({ page }) => {
  // 1. 游客登录
  await page.goto("/login");
  await page.getByRole("button", { name: /以游客身份进入/ }).click();
  const guestName = `e2e-node-${Date.now()}`;
  await page.getByLabel("游客用户名").fill(guestName);
  await page.getByRole("button", { name: /游客进入/ }).click();
  await page.waitForURL(/\/app\/home/);

  // 2. 进入工作空间 → 新建项目
  await page.getByText("工作空间").click();
  await page.waitForURL(/\/app\/workspace/);
  await page.getByText("+ 新建项目").click();
  await page.getByLabel("项目名称").fill(guestName);
  await page.getByRole("button", { name: "创建" }).click();
  await page.waitForTimeout(1500);

  // 3. 检查是否进入项目页面
  await page.waitForURL(/\/app\/workspace\/[^\/]+/);
  console.log("项目页面 URL:", page.url());

  // 4. 等待 React Flow 画布渲染 + zoom 初始化
  await page.waitForSelector(".react-flow__viewport");
  // 等一小段时间让 React Flow 完成 fitView 计算
  await page.waitForTimeout(1500);

  // 5. 读取画布缩放比例 (zoom) — transform 在 .react-flow__viewport 上
  let zoom: number | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    zoom = await page.evaluate(() => {
      const viewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (!viewport) return null;
      const transform = viewport.style.transform || window.getComputedStyle(viewport).transform;
      if (!transform || transform === "none") return null;
      // 格式 1: matrix(a, b, c, d, e, f) → a 就是 zoom
      const m1 = transform.match(/matrix\(([^,]+)/);
      if (m1) return parseFloat(m1[1]);
      // 格式 2: scale(x) 或 scale(x, y)
      const m2 = transform.match(/scale\(([^,\s]+)/);
      if (m2) return parseFloat(m2[1]);
      return null;
    });
    if (zoom !== null) break;
    await page.waitForTimeout(500);
  }

  console.log("画布 zoom =", zoom);
  if (zoom === null) {
    const debug = await page.evaluate(() => {
      const viewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
      return {
        exists: !!viewport,
        styleTransform: viewport?.style.transform,
        computedTransform: viewport ? window.getComputedStyle(viewport).transform : null,
      };
    });
    console.log("debug:", debug);
    throw new Error("无法读取画布 zoom，请检查 React Flow 是否正常渲染");
  }
  expect(zoom).toBeGreaterThanOrEqual(0.6);

  // 6. 检查节点渲染尺寸
  const nodeSizes = await page.evaluate(() => {
    const els = document.querySelectorAll(".react-flow__node");
    if (els.length === 0) return null;
    return Array.from(els).map(el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
  });

  console.log("节点数量:", nodeSizes?.length);
  if (nodeSizes) {
    nodeSizes.forEach((n, i) => {
      console.log(`节点 ${i}: ${n.width.toFixed(2)} x ${n.height.toFixed(2)}`);
    });
    // 节点应 >= 108px（180 * minZoom 0.6 = 108）
    for (const n of nodeSizes) {
      expect(n.width).toBeGreaterThanOrEqual(100);
    }
  }

  // 7. 截图保存
  await page.screenshot({ path: "e2e-node-size-result.png" });
});
