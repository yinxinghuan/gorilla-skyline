const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'no-preference'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('guest-shell')) errors.push(msg.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:5206/?qa=1', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.Gorillas));
    await page.evaluate(() => window.__sgDebug.runGhost());
    await page.waitForTimeout(550);
    const ghostState = await page.locator('[data-ghost]').evaluate((el) => ({
      className: el.className,
      opacity: getComputedStyle(el).opacity,
      animationName: getComputedStyle(el).animationName
    }));
    const ghostDebug = await page.evaluate(() => window.__sgDebug?.state());
    await page.screenshot({ path: `_qa/ui/${viewport.width}x${viewport.height}-ghost.png` });
    const grab = await page.locator('#bomb-grab-area').boundingBox();
    const sx = grab.x + grab.width / 2;
    const sy = grab.y + grab.height / 2;
    await page.locator('#bomb-grab-area').dispatchEvent('pointerdown', {
      pointerId: 9, pointerType: 'touch', clientX: sx, clientY: sy, bubbles: true, isPrimary: true
    });
    await page.dispatchEvent('body', 'pointermove', {
      pointerId: 9, pointerType: 'touch', clientX: sx - 82, clientY: sy + 92, bubbles: true, isPrimary: true
    });
    const velocity = await page.locator('#info-left .velocity').textContent();
    await page.screenshot({ path: `_qa/ui/${viewport.width}x${viewport.height}-aim.png` });
    await page.dispatchEvent('body', 'pointerup', {
      pointerId: 9, pointerType: 'touch', clientX: sx - 82, clientY: sy + 92, bubbles: true, isPrimary: true
    });
    await page.waitForTimeout(350);
    const phaseAfterThrow = await page.evaluate(() => window.Gorillas.getState().phase);
    await page.evaluate(() => {
      const panel = document.querySelector('#congratulations');
      panel.style.opacity = '1';
      panel.style.visibility = 'visible';
      window.dispatchEvent(new CustomEvent('gorilla:gameover', {
        detail: { playerWon: true, score: 1088, round: 2 }
      }));
    });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `_qa/ui/${viewport.width}x${viewport.height}-result.png` });
    await page.locator('[data-rank]').click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `_qa/ui/${viewport.width}x${viewport.height}-leaderboard-external.png` });
    const download = await page.locator('.sg-download a').textContent();
    console.log(JSON.stringify({ viewport, ghostState, ghostDebug, grab, velocity, phaseAfterThrow, download, errors }));
    await context.close();
  }
  await browser.close();
})();
