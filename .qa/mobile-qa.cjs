const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_URL = 'http://127.0.0.1:4175/memory-lp/';
const OUT_DIR = path.join(__dirname, 'screenshots');
const VIEWPORT_HEIGHT = 1400;
const DESKTOP_HEIGHT = 1200;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function waitForStable(page) {
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function snapshotIndex(page, width, outPath) {
  await page.screenshot({ path: outPath, fullPage: false });
  return outPath;
}

async function openMemoryFromList(page, width, mobile) {
  const result = await page.evaluate(() => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
    const buttons = Array.from(document.querySelectorAll('button[data-memory-id]'));
    if (!buttons.length || !viewport) return null;
    const index = Math.min(7, buttons.length - 1);
    const button = buttons[index];
    const beforeRect = button.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const targetScrollTop = viewport.scrollTop + (beforeRect.top - viewportRect.top) - viewport.clientHeight / 2 + beforeRect.height / 2;
    viewport.scrollTop = Math.max(0, targetScrollTop);
    const afterRect = button.getBoundingClientRect();
    const scrollY = window.scrollY;
    const bodyTop = document.body.getBoundingClientRect().top;
    const rootTop = document.documentElement.getBoundingClientRect().top;
    const text = button.textContent || '';
    return {
      index,
      text,
      beforeTop: beforeRect.top,
      beforeLeft: beforeRect.left,
      afterTop: afterRect.top,
      afterLeft: afterRect.left,
      afterWidth: afterRect.width,
      afterHeight: afterRect.height,
      viewportScrollTop: viewport.scrollTop,
      beforeScrollY: scrollY,
      beforeBodyTop: bodyTop,
      beforeRootTop: rootTop,
    };
  });
  if (!result) throw new Error(`No memory buttons found at width ${width}`);
  await page.mouse.click(result.afterLeft + result.afterWidth / 2, result.afterTop + result.afterHeight / 2);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (mobile) {
    const opened = await page.evaluate(() => ({
      readingOpen: document.body.classList.contains('is-reading-open'),
      hasBack: Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Voltar')),
    }));
    if (!opened.readingOpen && !opened.hasBack) {
      throw new Error(`Mobile reading did not open at width ${width}`);
    }
  }
  await waitForStable(page);
  return result;
}

async function closeReading(page) {
  await page.evaluate(() => {
    const back = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Voltar'));
    if (back) back.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const closed = await page.evaluate(() => ({
    readingOpen: document.body.classList.contains('is-reading-open'),
    hasBack: Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Voltar')),
  }));
  if (closed.readingOpen || closed.hasBack) {
    throw new Error('Mobile reading did not close');
  }
  await waitForStable(page);
}

async function measureAnchor(page) {
  return page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[data-memory-id]'));
    const index = Math.min(7, buttons.length - 1);
    const button = buttons[index];
    const rect = button.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      scrollY: window.scrollY,
      bodyTop: document.body.getBoundingClientRect().top,
      rootTop: document.documentElement.getBoundingClientRect().top,
      text: button.textContent || '',
    };
  });
}

async function screenshotReading(page, outPath) {
  await page.screenshot({ path: outPath, fullPage: false });
  return outPath;
}

async function runViewport(browser, width) {
  const page = await browser.newPage();
  const mobile = width < 1024;
  await page.setViewport({ width, height: mobile ? VIEWPORT_HEIGHT : DESKTOP_HEIGHT, deviceScaleFactor: 1 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await waitForStable(page);

  const indexPath = path.join(OUT_DIR, `${width}-index.png`);
  await snapshotIndex(page, width, indexPath);

  const before = await openMemoryFromList(page, width, mobile);
  const readingPath = path.join(OUT_DIR, `${width}-reading.png`);
  await screenshotReading(page, readingPath);
  const beforeClose = await measureAnchor(page);
  let after = beforeClose;
  let postIndexPath = path.join(OUT_DIR, `${width}-postclose.png`);

  if (mobile) {
    await closeReading(page);
    after = await measureAnchor(page);
    await snapshotIndex(page, width, postIndexPath);
  } else {
    await snapshotIndex(page, width, postIndexPath);
  }

  await page.close();
  return {
    width,
    before,
    beforeClose,
    after,
    indexPath,
    readingPath,
    postIndexPath,
    deltaTop: Math.round(after.top - before.top),
    deltaScrollY: after.scrollY - before.scrollY,
  };
}

(async () => {
  ensureDir(OUT_DIR);
  const executablePath = await puppeteer.executablePath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const widths = [320, 360, 768, 1024, 1440];
  const results = [];
  for (const width of widths) {
    results.push(await runViewport(browser, width));
  }

  await browser.close();

  console.log(JSON.stringify({ results }, null, 2));
})();
