const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CACHED_RAGA_PDF = path.join(__dirname, 'raga-magazine-latest.pdf');
const CACHED_8BIT_PDF = path.join(__dirname, '8bit-magazine-latest.pdf');

const isGeneratingMap = { raga: false, '8bit': false };
const pendingResolversMap = { raga: [], '8bit': [] };

function getPdfPath(pub = 'raga') {
  return pub === '8bit' ? CACHED_8BIT_PDF : CACHED_RAGA_PDF;
}

async function generateMagazinePdf(port = 3000, pub = 'raga') {
  const normPub = (pub === '8bit' || pub === 'eightbit') ? '8bit' : 'raga';
  const cachedPdfPath = getPdfPath(normPub);

  if (isGeneratingMap[normPub]) {
    console.log(`[PDF GENERATOR - ${normPub.toUpperCase()}] PDF generation already in progress, queuing listener...`);
    return new Promise((resolve, reject) => {
      pendingResolversMap[normPub].push({ resolve, reject });
    });
  }

  isGeneratingMap[normPub] = true;
  console.log(`📄 [PDF GENERATOR - ${normPub.toUpperCase()}] Starting headless Edge PDF compilation...`);
  const start = Date.now();

  try {
    const browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--hide-scrollbars'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });

    const targetUrl = normPub === '8bit'
      ? `http://localhost:${port}/8bit.html?pdf_export=1`
      : `http://localhost:${port}/raga.html?pdf_export=1`;

    console.log(`📡 [PDF GENERATOR] Navigating to ${targetUrl}...`);

    await page.goto(targetUrl, {
      waitUntil: 'load',
      timeout: 60000
    });

    // Brief settling wait for CSS fonts and layout calculations
    await new Promise(r => setTimeout(r, 2000));

    console.log(`🖨️ [PDF GENERATOR] Printing 30 ${normPub.toUpperCase()} pages to PDF...`);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      timeout: 120000
    });

    await browser.close();

    fs.writeFileSync(cachedPdfPath, pdfBuffer);
    const dur = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`✅ [PDF GENERATOR COMPLETE] Compiled ${cachedPdfPath} in ${dur}s! Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    // Notify any queued requests
    const resolvers = [...pendingResolversMap[normPub]];
    pendingResolversMap[normPub] = [];
    resolvers.forEach(r => r.resolve(pdfBuffer));

    return pdfBuffer;
  } catch (err) {
    console.error(`❌ [PDF GENERATOR ERROR - ${normPub.toUpperCase()}]:`, err);
    const resolvers = [...pendingResolversMap[normPub]];
    pendingResolversMap[normPub] = [];
    resolvers.forEach(r => r.reject(err));
    throw err;
  } finally {
    isGeneratingMap[normPub] = false;
  }
}

function getLatestPdf(pub = 'raga') {
  const normPub = (pub === '8bit' || pub === 'eightbit') ? '8bit' : 'raga';
  const cachedPdfPath = getPdfPath(normPub);
  if (fs.existsSync(cachedPdfPath)) {
    return fs.readFileSync(cachedPdfPath);
  }
  return null;
}

module.exports = {
  generateMagazinePdf,
  getLatestPdf,
  CACHED_RAGA_PDF,
  CACHED_8BIT_PDF
};
