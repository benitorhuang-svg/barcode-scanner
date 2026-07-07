import { expect, test, type Page } from '@playwright/test';
import QRCode from 'qrcode';

async function clearScanDatabase(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('barcode-scanner-db', 1);

      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('scans')) {
          const store = db.createObjectStore('scans', { keyPath: 'id' });
          store.createIndex('by-time', 'timestamp');
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('scans', 'readwrite');
        transaction.objectStore('scans').clear();
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  });
}

async function createQrPngBuffer(value: string): Promise<Buffer> {
  const dataUrl = await QRCode.toDataURL(value, {
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 512,
  });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as unknown as {
      __barcodeScannerTestHooks?: {
        scanImageBlob?: () => Promise<Array<{ text: string; format: string }>>;
      };
    };

    testWindow.__barcodeScannerTestHooks = {
      scanImageBlob: async () => {
        const state = window as unknown as {
          __e2eDetectedBarcodeValue?: string;
        };
        return state.__e2eDetectedBarcodeValue
          ? [{ text: state.__e2eDetectedBarcodeValue, format: 'QR Code' }]
          : [];
      },
    };
  });
  await page.goto('/');
  await clearScanDatabase(page);
  await page.reload();
});

test('supports tab navigation, image scanning, CSV export, and QR generation', async ({
  page,
}) => {
  await expect(page).toHaveTitle(/Webcam 條碼掃描器/);
  await expect(page.locator('#scanResultsSection')).toBeVisible();

  await page.locator('[data-tab="paste"]').click();
  await expect(page.locator('#tab-paste')).toHaveClass(/active/);

  const scanValue = `E2E-QR-${Date.now()}`;
  await page.evaluate((value) => {
    const state = window as unknown as { __e2eDetectedBarcodeValue?: string };
    state.__e2eDetectedBarcodeValue = value;
  }, scanValue);
  await page.locator('#fileInput').setInputFiles({
    name: 'scan.png',
    mimeType: 'image/png',
    buffer: await createQrPngBuffer(scanValue),
  });

  await expect(page.locator('#resultsBody')).toContainText(scanValue);
  await expect(page.locator('#countBadge')).toContainText('1');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btnExport').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^barcode_scan_\d{4}-\d{2}-\d{2}\.csv$/,
  );

  await page.locator('[data-tab="generator"]').click();
  await expect(page.locator('#generatorResultSection')).toBeVisible();
  await page.locator('#qrInput').fill('https://example.com/barcode-scanner');
  await expect(page.locator('#qrPreviewWrap')).toBeVisible();
  await expect(page.locator('#downloadSection')).toBeVisible();

  const canvasBox = await page.locator('#qrCanvas').boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(0);
  expect(canvasBox?.height).toBeGreaterThan(0);
});
