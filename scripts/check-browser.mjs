/** Production-browser regression checks. Run after build; the temporary preview
 * server and browser are always closed. Screenshots go to ignored .qa/.
 *
 * Software WebGL (SwiftShader) renders only a few frames per second, so every
 * assertion here waits on observable state (data attributes, pixels) rather
 * than on wall-clock animation timing. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
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
  async function pageAt(width = 1487, height = 1058, { fallback = false, touch = false } = {}) {
    const page = await browser.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1,
      isMobile: touch,
      hasTouch: touch,
    });
    if (fallback)
      await page.evaluateOnNewDocument(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return kind === 'webgl2' ? null : getContext.call(this, kind, ...args);
        };
      });
    await page.goto(origin, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.artwork-touch:not([hidden])');
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  const data = (page) => page.$eval('[data-artwork]', (el) => ({ ...el.dataset }));
  async function settled(page) {
    await page.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.motion === 'settled',
      { timeout: 90000 },
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
  /** Raw RGB pixels of a page region, for comparing rendered frames. */
  async function pixels(page, clip) {
    const png = await page.screenshot({ clip, type: 'png' });
    return sharp(png).removeAlpha().raw().toBuffer();
  }
  function changed(a, b, threshold = 28) {
    let count = 0;
    for (let i = 0; i < a.length; i += 3)
      if (
        Math.max(
          Math.abs(a[i] - b[i]),
          Math.abs(a[i + 1] - b[i + 1]),
          Math.abs(a[i + 2] - b[i + 2]),
        ) > threshold
      )
        count++;
    return count;
  }
  const letterWeights = (page) =>
    page.$$eval('.headline-letters > span', (letters) =>
      letters.map((letter) => letter.style.fontWeight),
    );

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
    // Let the light field re-measure and redraw the sculpture for the new layout.
    await sleep(400);
    await social.screenshot({
      path: 'public/assets/brand/social-cover.jpg',
      type: 'jpeg',
      quality: 90,
    });
    console.log('Exported social cover from the current HTML, fonts, monogram and artwork.');
  } else {
    // Reference layout and accessible heading without JavaScript.
    const noJS = await browser.newPage();
    await noJS.setViewport({ width: 1487, height: 1058, deviceScaleFactor: 1 });
    await noJS.setJavaScriptEnabled(false);
    await noJS.goto(origin, { waitUntil: 'networkidle0' });
    await noJS.evaluate(() => document.fonts.ready);
    assert.ok(await noJS.$eval('.artwork-image', (el) => el.complete && el.naturalWidth > 0));
    assert.ok(await noJS.$eval('.artwork-touch', (el) => el.hidden));
    assert.match(await noJS.$eval('h1', (el) => el.textContent), /LearningUpgraded/);
    assert.equal(await noJS.$('.light-field'), null, 'no canvas without JavaScript');
    const headingBox = (page) =>
      page.$eval('h1', (el) => {
        const box = el.getBoundingClientRect();
        return [box.x, box.y, box.width, box.height];
      });
    const staticHeading = await headingBox(noJS);
    const headingName = (page) =>
      page.accessibility.snapshot().then(function find(node) {
        if (node.role === 'heading') return node.name;
        for (const child of node.children ?? []) {
          const name = find(child);
          if (name) return name;
        }
      });
    const staticName = await headingName(noJS);
    await noJS.close();

    const desktop = await pageAt();
    assert.equal(await desktop.$eval('[data-artwork]', (el) => el.dataset.renderer), 'webgl');
    assert.ok(await desktop.$('.light-field.is-live'), 'the WebGL2 light field is live');
    assert.equal(await desktop.$('.motion-controls'), null);
    assert.equal(await desktop.$('.curiosity-trail'), null, 'the SVG trail is only a fallback');
    // Headline play keeps the page's real words and its exact layout.
    assert.equal(await headingName(desktop), staticName);
    const playfulHeading = await headingBox(desktop);
    assert.ok(
      playfulHeading.every((value, i) => Math.abs(value - staticHeading[i]) < 0.75),
      `splitting the heading into letters does not move it (${playfulHeading} vs ${staticHeading})`,
    );
    assert.ok(
      await desktop.$eval('.headline-letters', (el) => el.getAttribute('aria-hidden') === 'true'),
    );

    // Arrival motion settles by itself; a settled page schedules no frames.
    await settled(desktop);
    const whitespace = { x: 40, y: 730, width: 540, height: 200 };
    const calm = await pixels(desktop, whitespace);
    await sleep(500);
    assert.equal(changed(calm, await pixels(desktop, whitespace)), 0, 'settled frames are still');
    assert.deepEqual(await letterWeights(desktop), ['', '', '', '', '', '', '', '']);

    // Moving through whitespace wakes the swarm: motes become visible.
    await desktop.mouse.move(60, 760);
    for (let i = 1; i <= 12; i++) await desktop.mouse.move(60 + i * 40, 760 + (i % 3) * 30);
    await sleep(300);
    assert.equal((await data(desktop)).motion, 'active');
    const stirred = changed(calm, await pixels(desktop, whitespace));
    assert.ok(stirred > 25, `the pointer stirs visible motes (${stirred} pixels changed)`);
    await desktop.screenshot({ path: '.qa/desktop-swarm.jpg', quality: 90 });
    // And they vanish again: the settled page is the calm selected design.
    await settled(desktop);
    assert.ok(changed(calm, await pixels(desktop, whitespace)) <= 2, 'motes clear after settling');

    // "Learning" swells under the pointer without shifting, then rests.
    const letter = await desktop.$eval('.headline-letters > span:nth-child(3)', (el) => {
      const box = el.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await desktop.mouse.move(letter.x - 30, letter.y);
    await desktop.mouse.move(letter.x, letter.y, { steps: 4 });
    await desktop.waitForFunction(
      () =>
        [...document.querySelectorAll('.headline-letters > span')].some(
          (span) => Number(span.style.fontWeight) > 560,
        ),
      { timeout: 20000 },
    );
    await settled(desktop);
    assert.deepEqual(await letterWeights(desktop), ['', '', '', '', '', '', '', '']);

    // Hover changes the WebGL sculpture without a click; a brief pass is not
    // discovery, but sustained exploration retires the invitation.
    const before = await (await desktop.$('[data-artwork]')).screenshot();
    await moveInside(desktop);
    assert.notDeepEqual(
      await (await desktop.$('[data-artwork]')).screenshot(),
      before,
      'hover changes WebGL output without a click',
    );
    assert.notEqual((await data(desktop)).invite, 'off', 'a short pass is not discovery');
    const center = await figurePoint(desktop, 0.6, 0.5);
    for (let i = 0; i < 16; i++) {
      await desktop.mouse.move(center.x + (i % 2) * 4, center.y);
      await sleep(100);
    }
    await desktop.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.invite === 'off',
    );
    assert.equal((await data(desktop)).level, '1');

    // Hold to gather, release to burst: the swarm learns (level 2).
    await desktop.mouse.move(300, 820, { steps: 3 });
    await desktop.mouse.down();
    await sleep(1600);
    await desktop.screenshot({ path: '.qa/desktop-gather.jpg', quality: 90 });
    await desktop.mouse.up();
    await desktop.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.level === '2',
    );

    // Keyboard: ripple and announcement, Escape settles to a clean frame (not
    // a frozen ripple), a Space hold cannot get stranded, arrows explore, and
    // four rotating arrows draw the loop that upgrades the swarm (level 3).
    await settled(desktop);
    const sculpture = await desktop.$eval('.artwork-image', (el) => {
      const box = el.getBoundingClientRect();
      // The upper sculpture only: the floor light drifts with animation time.
      return { x: box.x, y: box.y, width: box.width, height: box.height * 0.7 };
    });
    const clean = await pixels(desktop, sculpture);
    await desktop.focus('.artwork-touch');
    await desktop.keyboard.press('Enter');
    assert.match(
      await desktop.$eval('[data-artwork-announcement]', (el) => el.textContent),
      /new perspective/,
    );
    await desktop.keyboard.press('Escape');
    await settled(desktop);
    await desktop.evaluate(() => document.activeElement.blur());
    const escaped = changed(clean, await pixels(desktop, sculpture), 12);
    assert.ok(escaped < 40, `Escape leaves the clean design (${escaped} pixels differ)`);
    await desktop.focus('.artwork-touch');
    await desktop.keyboard.down(' ');
    await sleep(300);
    await desktop.keyboard.down('Shift');
    await desktop.keyboard.press('Tab');
    await desktop.keyboard.up('Shift');
    await desktop.keyboard.up(' ');
    await settled(desktop);
    await desktop.focus('.artwork-touch');
    await desktop.keyboard.press('ArrowRight');
    assert.equal((await data(desktop)).motion, 'active');
    for (const key of ['ArrowDown', 'ArrowLeft', 'ArrowUp']) await desktop.keyboard.press(key);
    await desktop.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.level === '3',
    );
    await sleep(700);
    await desktop.screenshot({ path: '.qa/desktop-upgrade.jpg', quality: 90 });
    await settled(desktop);
    await desktop.screenshot({ path: '.qa/desktop.jpg', quality: 90 });

    // Live preference changes work in both directions and keep everything still.
    await desktop.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await desktop.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.motion === 'reduced',
    );
    assert.ok(await desktop.$eval('.artwork-touch', (el) => el.disabled));
    const still = await pixels(desktop, whitespace);
    for (let i = 0; i < 6; i++) await desktop.mouse.move(80 + i * 60, 800);
    await sleep(400);
    assert.equal(
      changed(still, await pixels(desktop, whitespace)),
      0,
      'no motes with reduced motion',
    );
    assert.equal((await data(desktop)).motion, 'reduced');
    await desktop.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'no-preference' },
    ]);
    await desktop.waitForFunction(() => !document.querySelector('.artwork-touch').disabled);

    // Context loss reveals the real image; restoration resumes the light field.
    await desktop.evaluate(() => {
      const gl = document.querySelector('.light-field').getContext('webgl2');
      window.qaContext = gl.getExtension('WEBGL_lose_context');
      window.qaContext.loseContext();
    });
    await desktop.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.renderer === 'image',
    );
    // The authored image fades back in.
    await desktop.waitForFunction(
      () => getComputedStyle(document.querySelector('.artwork-image')).opacity === '1',
    );
    await desktop.evaluate(() => window.qaContext.restoreContext());
    await desktop.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.renderer === 'webgl',
    );
    await desktop.close();

    // Drawing a loop around the sculpture upgrades a fresh visit directly.
    const looping = await pageAt();
    await settled(looping);
    await looping.evaluate(async () => {
      const art = document.querySelector('.artwork-image').getBoundingClientRect();
      const cx = art.left + art.width * 0.52;
      const cy = art.top + art.height * 0.5;
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2.2;
        document.body.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            isPrimary: true,
            pointerType: 'mouse',
            clientX: cx + Math.cos(angle) * art.width * 0.48,
            clientY: cy + Math.sin(angle) * art.height * 0.4,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 8));
      }
    });
    await looping.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.level === '3',
    );

    // Tilt moves the light on phones; hand tremor after settling does not wake it.
    await settled(looping);
    await looping.evaluate(async () => {
      for (let i = 0; i <= 20; i++) {
        window.dispatchEvent(
          new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 40 + i, gamma: i }),
        );
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
    });
    assert.equal((await data(looping)).tilt, 'on');
    assert.equal((await data(looping)).motion, 'active');
    await settled(looping);
    await looping.evaluate(async () => {
      for (let i = 0; i <= 20; i++) {
        window.dispatchEvent(
          new DeviceOrientationEvent('deviceorientation', {
            alpha: 0,
            beta: 60 + (i % 2),
            gamma: 20 - (i % 2),
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
    });
    await sleep(300);
    assert.equal((await data(looping)).motion, 'settled', 'tremor does not wake the page');
    await looping.evaluate(async () => {
      for (let i = 0; i <= 90; i++) {
        window.dispatchEvent(
          new DeviceOrientationEvent('deviceorientation', {
            alpha: 0,
            beta: 61 + i * 0.03,
            gamma: 19 + i * 0.03,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
    });
    await sleep(300);
    assert.equal((await data(looping)).motion, 'settled', 'slow drift does not wake the page');
    await looping.close();

    // An upgrade earned by play starts inside a frame; it must not start a
    // second animation loop. Our code may never have two frame requests
    // outstanding. (Counting only requests made by the site's bundle, because
    // Puppeteer's waitForFunction polling also uses requestAnimationFrame.)
    const counted = await browser.newPage();
    counted.on('pageerror', (error) => errors.push(error.message));
    await counted.evaluateOnNewDocument(() => {
      const request = window.requestAnimationFrame.bind(window);
      const cancel = window.cancelAnimationFrame.bind(window);
      const pending = new Set();
      window.qaMostPending = 0;
      window.requestAnimationFrame = (callback) => {
        const ours = /\/assets\/[^/]+\.js/.test(new Error().stack ?? '');
        const id = request((time) => {
          pending.delete(id);
          callback(time);
        });
        if (ours) {
          pending.add(id);
          window.qaMostPending = Math.max(window.qaMostPending, pending.size);
        }
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        pending.delete(id);
        cancel(id);
      };
    });
    await counted.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
    await counted.goto(origin, { waitUntil: 'networkidle0' });
    await counted.waitForSelector('.artwork-touch:not([hidden])');
    await settled(counted);
    const tap = await figurePoint(counted, 0.6, 0.45);
    await counted.mouse.click(tap.x, tap.y);
    for (let i = 0; i < 3; i++) {
      await counted.mouse.move(260, 700);
      await counted.mouse.down();
      await sleep(700);
      await counted.mouse.up();
      await sleep(300);
    }
    await counted.waitForFunction(
      () => document.querySelector('[data-artwork]').dataset.level === '3',
    );
    await sleep(800);
    assert.equal(await counted.evaluate(() => window.qaMostPending), 1, 'a single frame loop');
    await counted.close();

    // On wide screens the canvas outgrows the capped shell; it must follow the
    // window, not the shell, when only the width changes.
    const wide = await pageAt(2500, 1000);
    await wide.setViewport({ width: 2900, height: 1000, deviceScaleFactor: 1 });
    await wide.waitForFunction(() => {
      const canvas = document.querySelector('.light-field');
      return (
        canvas.clientWidth >= innerWidth - 1 &&
        Math.abs(canvas.width / canvas.height - canvas.clientWidth / canvas.clientHeight) < 0.01
      );
    });
    await wide.close();

    // Without WebGL2 the authored image responds and the SVG trail invites.
    const fallback = await pageAt(1487, 1058, { fallback: true });
    assert.equal(await fallback.$eval('[data-artwork]', (el) => el.dataset.renderer), 'image');
    await settled(fallback);
    await fallback.mouse.move(450, 735);
    await sleep(150);
    assert.equal(await fallback.$eval('.curiosity-trail', (el) => el.style.opacity), '1');
    await sleep(700);
    assert.equal(
      await fallback.$eval('.curiosity-trail', (el) => el.style.opacity),
      '0',
      'fragments clear within 650ms after pointer movement stops',
    );
    const neutral = await fallback.$eval('.artwork-image', (el) => el.style.transform);
    await moveInside(fallback);
    assert.notEqual(await fallback.$eval('.artwork-image', (el) => el.style.transform), neutral);
    // A pen can hover without contact. Dispatch a primary PointerEvent to
    // exercise the browser handler even on machines without a stylus; settle
    // first so that only the pen can have woken the artwork.
    await settled(fallback);
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
    await fallback.close();

    // Responsive layouts: no horizontal overflow, and the hero fits phones
    // held sideways and short laptop screens.
    for (const [width, height] of [
      [320, 640],
      [390, 844],
      [844, 390],
      [820, 1180],
      [1024, 1366],
      [1280, 720],
      [2560, 1440],
    ]) {
      const page = await pageAt(width, height, { fallback: true });
      const layout = await page.evaluate(() => {
        const art = document.querySelector('.artwork-image').getBoundingClientRect();
        const heading = document.querySelector('h1').getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          heading: heading.bottom <= innerHeight,
          artwork: art.top < innerHeight,
        };
      });
      assert.equal(layout.overflow, false, `no overflow at ${width}x${height}`);
      assert.ok(layout.heading, `the heading is on the first screen at ${width}x${height}`);
      assert.ok(layout.artwork, `the sculpture starts on the first screen at ${width}x${height}`);
      await page.screenshot({ path: `.qa/${width}x${height}.jpg`, fullPage: true, quality: 90 });
      await page.close();
    }

    // Touch: contact wakes the artwork, a sideways drag stays on the page and
    // keeps stirring, and vertical scrolling over the sculpture still works.
    const touch = await pageAt(390, 844, { touch: true });
    await settled(touch);
    const client = await touch.createCDPSession();
    const touchPoint = await figurePoint(touch, 0.55, 0.4);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [touchPoint],
    });
    await sleep(150);
    assert.equal((await data(touch)).motion, 'active');
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 60, y: 250 }],
    });
    for (let i = 1; i <= 10; i++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 60 + i * 26, y: 250 }],
      });
      await sleep(30);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(300);
    // Chromium's touch emulation performs overscroll history navigation (the
    // page has about:blank behind it); before touch-action was set, this very
    // drag navigated back.
    assert.equal(touch.url(), `${origin}/`, 'a sideways drag is not swipe-to-go-back');
    await settled(touch);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [touchPoint],
    });
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
    await touch.close();

    const merch = await browser.newPage();
    merch.on('pageerror', (error) => errors.push(error.message));
    await merch.goto(`${origin}/merch/`, { waitUntil: 'networkidle0' });
    assert.equal(await merch.$$eval('.product-card', (els) => els.length), 11);
    await merch.click('[data-filter="dresses"]');
    assert.equal(await merch.$$eval('.product-card:not([hidden])', (els) => els.length), 3);
    await merch.goto(`${origin}/merch/impossible-cup/`, { waitUntil: 'networkidle0' });
    await merch.click('[data-gallery-src]');
    assert.ok(
      await merch.$eval('[data-gallery-src]', (el) => el.getAttribute('aria-current') === 'true'),
    );
    assert.deepEqual(errors, [], 'no application errors or broken requests');
    console.log(
      'Browser checks passed: WebGL2 light field, swarm wake and settling, heading play without layout shift, discovery levels, hold/burst, keyboard loop, clean Escape, no stranded Space hold, pointer loop, tilt, tremor and drift, a single frame loop, wide-window canvas resize, live reduced motion, context recovery, image fallback with trail and pen hover, responsive layouts, touch drag and scrolling, no-JS, merch and gallery. Screenshots: .qa/',
    );
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
