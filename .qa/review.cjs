const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = '/tmp/memory-lp';
const OUT = path.join(ROOT, '.qa', 'screenshots');
const URL = 'http://127.0.0.1:4175/memory-lp/';
const mobileWidths = [320, 360];
const desktopWidths = [768, 1024, 1440];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function captureIndex(page, width, label) {
  await page.setViewport({ width, height: 1200, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await sleep(300);
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const readingOpen = body.classList.contains('is-reading-open');
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      readingOpen,
      title: document.title,
      indexText: document.querySelector('[aria-label="Índice de memórias"]')?.textContent?.trim() ?? null,
    };
  });
  await page.screenshot({ path: path.join(OUT, `${width}-${label}.png`), fullPage: true });
  return metrics;
}

async function openReadingAndMeasure(page, width) {
  await page.setViewport({ width, height: 1200, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await sleep(300);

  const candidate = await page.evaluate(() => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) viewport.scrollTop = 1200;
    const buttons = [...document.querySelectorAll('button[data-memory-id]')];
    const visible = buttons.filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    const chosen = visible[7] || visible[0] || buttons[0] || null;
    if (!chosen) return null;
    const rect = chosen.getBoundingClientRect();
    return {
      id: chosen.getAttribute('data-memory-id'),
      text: chosen.getAttribute('aria-label') || chosen.textContent?.trim() || '',
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      scrollTop: viewport ? viewport.scrollTop : 0,
    };
  });

  if (!candidate) {
    throw new Error(`Nenhum item de índice encontrado em ${width}px`);
  }

  const before = await page.evaluate((id) => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
    const button = document.querySelector(`button[data-memory-id="${CSS.escape(id)}"]`);
    const rect = button?.getBoundingClientRect();
    return {
      scrollTop: viewport ? viewport.scrollTop : 0,
      bodyTop: document.body.getBoundingClientRect().top,
      rootTop: document.documentElement.getBoundingClientRect().top,
      buttonTop: rect ? rect.top : null,
      buttonText: button?.getAttribute('aria-label') || button?.textContent?.trim() || null,
    };
  }, candidate.id);

  await page.evaluate((id) => {
    const button = document.querySelector(`button[data-memory-id="${CSS.escape(id)}"]`);
    if (!button) return;
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }));
    button.click();
  }, candidate.id);
  await page.waitForFunction(() => Boolean(document.querySelector('.reading-pane__mobile-nav-back')), { timeout: 5000 });
  await sleep(200);

  const reading = await page.evaluate(() => {
    const doc = document.querySelector('.reading-document--mobile');
    const header = document.querySelector('.reading-pane__mobile-header');
    const nav = document.querySelector('.reading-pane__mobile-nav');
    const body = doc?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const rect = doc?.getBoundingClientRect();
    const buttons = [...document.querySelectorAll('.reading-pane__mobile-nav .ui-button')].map((button) => button.textContent?.replace(/\s+/g, ' ').trim());
    return {
      readingVisible: Boolean(doc),
      headerText: header?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      navText: nav?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      bodySnippet: body.slice(0, 420),
      bodyLen: body.length,
      rect: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null,
      buttons,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      windowY: window.scrollY,
      bodyTop: document.body.getBoundingClientRect().top,
      rootTop: document.documentElement.getBoundingClientRect().top,
      focused: document.activeElement?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    };
  });

  await page.screenshot({ path: path.join(OUT, `${width}-reading.png`), fullPage: true });

  await page.evaluate(() => {
    const back = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Voltar'));
    if (back) back.click();
  });
  await sleep(400);

  const after = await page.evaluate((id) => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
    const button = document.querySelector(`button[data-memory-id="${CSS.escape(id)}"]`);
    const rect = button?.getBoundingClientRect();
    return {
      scrollTop: viewport ? viewport.scrollTop : 0,
      bodyTop: document.body.getBoundingClientRect().top,
      rootTop: document.documentElement.getBoundingClientRect().top,
      buttonTop: rect ? rect.top : null,
      buttonText: button?.getAttribute('aria-label') || button?.textContent?.trim() || null,
      readingOpen: document.body.classList.contains('is-reading-open'),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  }, candidate.id);

  await page.screenshot({ path: path.join(OUT, `${width}-postclose.png`), fullPage: true });

  return { before, candidate, reading, after };
}

(async () => {
  ensureDir(OUT);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const results = [];

  for (const width of desktopWidths) {
    results.push({ width, kind: 'desktop-index', ...(await captureIndex(page, width, 'index')) });
  }

  for (const width of mobileWidths) {
    const indexMetrics = await captureIndex(page, width, 'index');
    const flow = await openReadingAndMeasure(page, width);
    results.push({ width, kind: 'mobile', indexMetrics, ...flow });
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
