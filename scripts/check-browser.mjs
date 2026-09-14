/** Production-browser regression checks. Run after build; the temporary preview
 * server and browser are always closed. Screenshots go to ignored .qa/. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
const address = server.httpServer.address();
const origin = `http://127.0.0.1:${address.port}`;
let browser;
const errors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir('.qa', { recursive: true });

try {
  browser = await puppeteer.launch({
    headless: true,
    // Software WebGL makes this repeatable on Linux CI without a physical GPU.
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  async function pageAt(width = 1487, height = 1058, fallback = false) {
    const page = await browser.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    if (fallback)
      await page.evaluateOnNewDocument(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return kind === 'webgl' ? null : getContext.call(this, kind, ...args);
        };
      });
    await page.goto(origin, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.artwork-touch:not([hidden])');
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  async function settled(page) {
    await page.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.motion === 'settled',
      { timeout: 20000 },
    );
  }
  async function figurePoint(page, x = 0.65, y = 0.42) {
    return page.$eval(
      '[data-artwork]',
      (el, x, y) => {
        const box = el.getBoundingClientRect();
        return { x: box.left + box.width * x, y: box.top + box.height * y };
      },
      x,
      y,
    );
  }
  async function moveInside(page) {
    const p = await figurePoint(page);
    await page.mouse.move(p.x, p.y, { steps: 5 });
    await sleep(200);
  }

  if (process.argv.includes('--social')) {
    const social = await pageAt(1200, 630);
    await social.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await social.addStyleTag({
      content: `
      .home-shell { padding: 0 55px; height: 630px; overflow: hidden; }
      .site-header { height: 120px; padding: 25px 0; }
      .site-header > .text-link, .site-footer > a, .artwork-hint { display: none !important; }
      .site-footer { position: absolute; left: 55px; right: 55px; bottom: 10px; min-height: 44px; justify-content: center; }
      .footer-note { font-size: 21px; }
      .home-hero { min-height: 0; }
      .hero-copy { padding-top: 45px; padding-bottom: 0; }
      .headline-sans { font-size: 106px; }
      .hero-copy h1 em { font-size: 115px; }
      .hero-subtitle { font-size: 29px; margin-top: 23px; }
      .artwork { width: 52%; top: -105px; bottom: 60px; right: -2%; }
    `,
    });
    await social.screenshot({
      path: 'public/assets/brand/social-cover.jpg',
      type: 'jpeg',
      quality: 90,
    });
    console.log('Exported social cover from the current HTML, fonts, monogram and artwork.');
  } else {
    const desktop = await pageAt();
    assert.equal(await desktop.$eval('[data-artwork]', (el) => el.dataset.renderer), 'webgl');
    assert.equal(await desktop.$('.motion-controls'), null);
    for (const x of [320, 321, 320]) {
      await desktop.mouse.move(x, 735);
      await sleep(150);
      assert.equal(
        await desktop.$eval('.curiosity-trail', (el) => el.style.opacity),
        '1',
        'slow direction changes work immediately after artwork initialization',
      );
    }
    await settled(desktop);
    const before = await (await desktop.$('[data-artwork]')).screenshot();
    await desktop.mouse.move(450, 735);
    await sleep(150);
    assert.ok(await desktop.$eval('.curiosity-trail', (el) => Number(el.style.opacity) > 0));
    await desktop.screenshot({ path: '.qa/desktop-invitation.jpg', quality: 90 });
    await sleep(700);
    assert.equal(
      await desktop.$eval('.curiosity-trail', (el) => el.style.opacity),
      '0',
      'fragments clear within 650ms after pointer movement stops',
    );
    // Grazing the broad interaction boundary is not deliberate discovery.
    const edge = await figurePoint(desktop, 0.13, 0.5);
    await desktop.mouse.move(edge.x, edge.y);
    await desktop.mouse.move(450, 735);
    await sleep(150);
    assert.equal(
      await desktop.$eval('.curiosity-trail', (el) => el.style.opacity),
      '1',
      'sparkles resume after briefly grazing the artwork boundary',
    );
    // Sparse one-pixel moves, including reversals, must keep working after the
    // animation settles. They must not depend on speed or travel direction.
    await settled(desktop);
    for (const x of [449, 448, 449, 450, 449]) {
      await desktop.mouse.move(x, 735);
      await sleep(150);
      assert.equal(
        await desktop.$eval('.curiosity-trail', (el) => el.style.opacity),
        '1',
        'slow one-pixel moves and reversals still produce sparkles',
      );
      await sleep(600);
    }
    await moveInside(desktop);
    assert.equal(await desktop.$eval('.curiosity-trail', (el) => el.style.opacity), '0');
    const after = await (await desktop.$('[data-artwork]')).screenshot();
    assert.notDeepEqual(after, before, 'hover changes WebGL output without a click');
    await desktop.mouse.move(450, 735);
    await sleep(150);
    assert.equal(
      await desktop.$eval('.curiosity-trail', (el) => el.style.opacity),
      '1',
      'a short pass through the figure does not permanently dismiss sparkles',
    );
    const center = await figurePoint(desktop, 0.6, 0.5);
    for (let i = 0; i < 16; i++) {
      await desktop.mouse.move(center.x + (i % 2) * 4, center.y);
      await sleep(100);
    }
    await desktop.mouse.move(450, 735);
    await sleep(200);
    assert.equal(
      await desktop.$eval('.curiosity-trail', (el) => el.style.opacity),
      '0',
      'the invitation stays dismissed when returning to whitespace after discovery',
    );
    await desktop.focus('.artwork-touch');
    await desktop.keyboard.press('Enter');
    assert.match(
      await desktop.$eval('[data-artwork-announcement]', (el) => el.textContent),
      /new perspective/,
    );
    await desktop.keyboard.press('Escape');
    await settled(desktop);
    await desktop.keyboard.press('ArrowRight');
    assert.equal(await desktop.$eval('[data-artwork]', (el) => el.dataset.motion), 'active');
    await settled(desktop);
    await desktop.screenshot({ path: '.qa/desktop.jpg', quality: 90 });

    // Live preference changes work in both directions; old session preferences
    // from the removed pause control cannot strand the new interaction.
    await desktop.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await desktop.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.motion === 'reduced',
    );
    assert.ok(await desktop.$eval('.artwork-touch', (el) => el.disabled));
    await desktop.mouse.move(300, 700);
    assert.equal(await desktop.$eval('.curiosity-trail', (el) => el.style.opacity), '0');
    await desktop.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'no-preference' },
    ]);
    await desktop.waitForFunction(() => !document.querySelector('.artwork-touch').disabled);
    await desktop.evaluate(() => sessionStorage.setItem('guni.motionPaused', 'true'));
    await desktop.reload({ waitUntil: 'networkidle0' });
    await desktop.waitForSelector('.artwork-touch:not([hidden]):not(:disabled)');

    const fallback = await pageAt(1487, 1058, true);
    assert.equal(await fallback.$eval('[data-artwork]', (el) => el.dataset.renderer), 'image');
    await settled(fallback);
    const neutral = await fallback.$eval('.artwork-image', (el) => el.style.transform);
    await moveInside(fallback);
    assert.notEqual(await fallback.$eval('.artwork-image', (el) => el.style.transform), neutral);
    // A pen can hover without contact. Dispatch a primary PointerEvent to
    // exercise the browser handler even on machines without a stylus.
    await fallback.evaluate(() => {
      const el = document.querySelector('.artwork-touch');
      const b = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: 'pen',
          isPrimary: true,
          clientX: b.x + b.width * 0.3,
          clientY: b.y + b.height * 0.4,
          buttons: 0,
        }),
      );
    });
    assert.equal(await fallback.$eval('[data-artwork]', (el) => el.dataset.motion), 'active');
    await fallback.screenshot({ path: '.qa/fallback.jpg', quality: 90 });

    // Context loss must reveal the real image, and restoration must rebind
    // uniforms without leaving the image's fallback transform in the canvas.
    await desktop.bringToFront();
    await desktop.evaluate(() => {
      const gl = document.querySelector('canvas').getContext('webgl');
      window.qaContext = gl.getExtension('WEBGL_lose_context');
      window.qaContext.loseContext();
    });
    await desktop.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.renderer === 'image',
    );
    await desktop.evaluate(() => window.qaContext.restoreContext());
    await desktop.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.renderer === 'webgl',
    );

    for (const width of [320, 390, 820]) {
      const mobile = await pageAt(width, 844, true);
      assert.ok(
        await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `no overflow at ${width}px`,
      );
      await mobile.screenshot({ path: `.qa/${width}.jpg`, fullPage: true, quality: 90 });
      await mobile.close();
    }
    const touch = await pageAt(390, 844, true);
    await touch.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await touch.reload({ waitUntil: 'networkidle0' });
    await touch.waitForSelector('.artwork-touch:not([hidden])');
    await settled(touch);
    const touchPoint = await figurePoint(touch, 0.55, 0.4);
    const client = await touch.createCDPSession();
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [touchPoint],
    });
    await sleep(150);
    assert.equal(await touch.$eval('[data-artwork]', (el) => el.dataset.motion), 'active');
    for (let i = 1; i <= 6; i++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: touchPoint.x, y: touchPoint.y - i * 25 }],
      });
      await sleep(30);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(250);
    assert.ok(
      await touch.evaluate(() => scrollY > 0),
      'touch scrolling remains available over artwork',
    );

    const noJS = await browser.newPage();
    await noJS.setJavaScriptEnabled(false);
    await noJS.goto(origin, { waitUntil: 'networkidle0' });
    assert.ok(await noJS.$eval('.artwork-image', (el) => el.complete && el.naturalWidth > 0));
    assert.ok(await noJS.$eval('.artwork-touch', (el) => el.hidden));
    assert.match(await noJS.$eval('h1', (el) => el.textContent), /LearningUpgraded/);
    await desktop.bringToFront();
    await desktop.goto(`${origin}/merch/`, { waitUntil: 'networkidle0' });
    assert.equal(await desktop.$$eval('.product-card', (els) => els.length), 11);
    await desktop.click('[data-filter="dresses"]');
    assert.equal(await desktop.$$eval('.product-card:not([hidden])', (els) => els.length), 3);
    await desktop.goto(`${origin}/merch/impossible-cup/`, { waitUntil: 'networkidle0' });
    await desktop.click('[data-gallery-src]');
    assert.ok(
      await desktop.$eval('[data-gallery-src]', (el) => el.getAttribute('aria-current') === 'true'),
    );
    assert.deepEqual(errors, [], 'no application errors or broken requests');
    console.log(
      'Browser checks passed: WebGL hover, trails, keyboard, idle settling, live reduced motion, image fallback, pen hover, context recovery, 320/390/820px layouts, touch + scrolling, no-JS, merch and gallery. Screenshots: .qa/',
    );
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
