import puppeteer from 'puppeteer';
import { buildInvoiceHtml } from './invoiceHtmlBuilder.js';

let browserLaunchPromise = null;

function launchOptions() {
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  };
}

async function getBrowser() {
  if (!browserLaunchPromise) {
    browserLaunchPromise = puppeteer.launch(launchOptions()).catch((err) => {
      browserLaunchPromise = null;
      throw err;
    });
  }
  const browser = await browserLaunchPromise;
  if (!browser.isConnected()) {
    browserLaunchPromise = puppeteer.launch(launchOptions()).catch((err) => {
      browserLaunchPromise = null;
      throw err;
    });
    return await browserLaunchPromise;
  }
  return browser;
}

/**
 * Renders the styled HTML invoice and returns a PDF buffer.
 * Uses existing order fields only — no pricing recomputation.
 */
export async function generateOrderInvoicePdf(order) {
  const html = buildInvoiceHtml(order);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '10mm',
        bottom: '12mm',
        left: '10mm',
      },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close().catch(() => {});
  }
}

/** Optional cleanup for tests or graceful shutdown */
export async function closeInvoicePdfBrowser() {
  if (!browserLaunchPromise) return;
  try {
    const b = await browserLaunchPromise;
    await b.close();
  } catch {
    /* ignore */
  }
  browserLaunchPromise = null;
}
