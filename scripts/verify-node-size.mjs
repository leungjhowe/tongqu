import { chromium } from 'playwright';

const BASE = 'http://localhost:1420';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1920, height: 1080 } });

  // 设置 console 输出到 stdout
  page.on('console', msg => console.log('  [PAGE]', msg.type(), msg.text()));

  console.log('[1] 打开项目页面...');
  await page.goto(BASE + '/app/workspace/demo');

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // 检查是否在登录页（意味着需要重登录）
  const isLoginPage = await page.evaluate(() => {
    const text = document.body.innerText;
    return /游客身份进入|输入账号/.test(text);
  });

  if (isLoginPage) {
    console.log('[2] 需要登录，进行游客登录...');
    await page.click('text=以游客身份进入');
    await page.waitForTimeout(1500);

    // 等待 input 出现
    try {
      await page.waitForSelector('input', { timeout: 5000 });
      const inputs = page.locator('input');
      const count = await inputs.count();
      console.log('   找到 input 数量:', count);
      // 用第一个 text input
      await inputs.first().fill('test');
      await page.waitForTimeout(500);
      await page.click('button:has-text("游客进入")');
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('   登录失败:', e.message);
      // 尝试直接去目标 URL
      await page.goto(BASE + '/app/workspace/demo');
    }

    console.log('[3] 跳转后 URL:', page.url());
    await page.waitForTimeout(2000);
  } else {
    console.log('[2] 已登录，直接访问项目页面');
  }

  console.log('[4] 检查页面状态...');
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('   body text:', bodyText);

  // 查找 reactflow 容器
  const rfExists = await page.evaluate(() => !!document.querySelector('.react-flow'));
  console.log('[5] React Flow 容器存在:', rfExists);

  if (rfExists) {
    console.log('[6] 读取画布缩放比例 (zoom)...');
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
      // 尝试从 transform attribute
      const tAttr = await page.evaluate(() => {
        const rf = document.querySelector('.react-flow');
        return rf?.getAttribute('style') || '';
      });
      console.log('   style attr:', tAttr.substring(0, 200));
    }

    // 检查节点渲染尺寸
    console.log('[7] 检查节点渲染尺寸...');
    const nodes = await page.evaluate(() => {
      const els = document.querySelectorAll('.react-flow__node');
      if (els.length === 0) return null;
      return Array.from(els).slice(0, 3).map(el => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height, left: rect.left };
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
    console.log('[8] 截图保存...');
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
