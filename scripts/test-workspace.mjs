import { chromium } from 'playwright';

const BASE = 'http://localhost:1420';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1920, height: 1080 } });

  // 设置 console 输出
  page.on('console', msg => console.log('  [PAGE]', msg.type(), msg.text()));

  // 步骤 1: 直接访问登录页
  console.log('[1] 访问登录页...');
  await page.goto(BASE + '/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 步骤 2: 查找并填写用户名
  console.log('[2] 填写用户名...');
  const inputs = page.locator('input[type="text"]');
  await inputs.first().waitFor({ timeout: 10000 });
  await inputs.first().fill('test');
  await page.waitForTimeout(300);

  // 步骤 3: 点击游客进入
  console.log('[3] 点击游客进入...');
  await page.click('button:has-text("游客进入")');
  await page.waitForURL(BASE + '/app/home', { timeout: 15000 });
  console.log('   登录成功，URL:', page.url());

  // 步骤 4: 创建工作空间
  console.log('[4] 进入工作空间...');
  await page.click('button:has-text("工作空间")');
  await page.waitForTimeout(1000);

  console.log('[5] 点击新建项目...');
  await page.click('button:has-text("+ 新建项目")');
  await page.waitForTimeout(500);

  // 步骤 6: 通过 React fiber 调用创建
  console.log('[6] 通过 React fiber 创建项目...');
  const result = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="text"]');
    if (inputs.length < 2) return { error: 'not enough inputs', count: inputs.length };
    
    const inp = inputs[1]; // 项目名称 input
    const fKey = Object.keys(inp).find(k => k.startsWith('__reactFiber'));
    if (!fKey) return { error: 'no react fiber' };
    
    let f = inp[fKey];
    while (f) {
      if (f.tag === 0 && f.memoizedProps && typeof f.memoizedProps.onCreated === 'function') {
        return { success: true, called: true };
      }
      f = f.return;
    }
    return { error: 'no onCreated' };
  });

  if (result.success) {
    // 调用 onCreated
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"]');
      const inp = inputs[1];
      const fKey = Object.keys(inp).find(k => k.startsWith('__reactFiber'));
      let f = inp[fKey];
      while (f) {
        if (f.tag === 0 && f.memoizedProps && typeof f.memoizedProps.onCreated === 'function') {
          f.memoizedProps.onCreated('test-node-size');
          return;
        }
        f = f.return;
      }
    });
    console.log('   项目创建中...');
    await page.waitForTimeout(2000);
  } else {
    console.log('   创建失败:', result.error);
  }

  console.log('[7] 跳转后 URL:', page.url());
  console.log('   页面内容:', (await page.evaluate(() => document.body.innerText)).substring(0, 500));

  // 步骤 8: 检查 React Flow 画布
  console.log('[8] 检查 React Flow 画布...');
  const rfExists = await page.evaluate(() => !!document.querySelector('.react-flow'));
  console.log('   React Flow 容器存在:', rfExists);

  if (rfExists) {
    console.log('[9] 读取画布缩放比例 (zoom)...');
    const zoom = await page.evaluate(() => {
      const rf = document.querySelector('.react-flow');
      if (!rf) return null;
      const transform = rf.style.transform || window.getComputedStyle(rf).transform;
      const m = transform.match(/matrix\(([^,]+)/);
      if (m) return parseFloat(m[1]);
      return null;
    });

    if (zoom !== null) {
      console.log('   画布 zoom =', zoom);
      if (zoom < 0.6) {
        console.log('   ❌ 失败：zoom =', zoom, '< 0.6，minZoom 未生效');
      } else {
        console.log('   ✅ 通过：zoom =', zoom, '>= 0.6');
      }
    } else {
      console.log('   ⚠️ 无法从 transform 读取 zoom');
    }

    // 检查节点渲染尺寸
    console.log('[10] 检查节点渲染尺寸...');
    const nodes = await page.evaluate(() => {
      const els = document.querySelectorAll('.react-flow__node');
      if (els.length === 0) return null;
      return Array.from(els).slice(0, 5).map(el => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
    });

    if (nodes) {
      console.log('   节点数量:', nodes.length);
      nodes.forEach((n, i) => {
        console.log('   节点 ' + i + ':', n.width.toFixed(2), 'x', n.height.toFixed(2));
        if (n.width < 100) {
          console.log('      ❌ 失败：宽度 < 100px');
        } else if (n.width < 130) {
          console.log('      ⚠️ 接近边界：100-130px');
        } else {
          console.log('      ✅ 通过：宽度 >= 130px');
        }
      });
    } else {
      console.log('   ⚠️ 未找到任何节点');
    }

    // 截图
    console.log('[11] 截图保存...');
    await page.screenshot({ path: '/d/code/company/mine/tongqu/test-node-size-result.png' });
    console.log('   截图已保存: test-node-size-result.png');
  } else {
    console.log('   ❌ 未找到 React Flow 画布，截图记录当前页面...');
    await page.screenshot({ path: '/d/code/company/mine/tongqu/test-node-size-failed.png' });
  }

  await browser.close();
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
