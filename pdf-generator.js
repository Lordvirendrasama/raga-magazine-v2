const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CACHED_PDF_PATH = path.join(__dirname, 'raga-magazine-latest.pdf');

let isGenerating = false;
let pendingResolvers = [];

async function generateMagazinePdf(port = 3000) {
  if (isGenerating) {
    console.log('PDF generation already in progress, queuing listener...');
    return new Promise((resolve, reject) => {
      pendingResolvers.push({ resolve, reject });
    });
  }

  isGenerating = true;
  console.log('📄 [PDF GENERATOR] Starting headless Edge PDF compilation...');
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

    const targetUrl = `http://localhost:${port}/?pdf_export=1`;
    console.log(`📡 [PDF GENERATOR] Navigating to ${targetUrl}...`);

    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 35000
    });

    console.log('🖨️ [PDF GENERATOR] Printing 30 pages to PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await browser.close();

    fs.writeFileSync(CACHED_PDF_PATH, pdfBuffer);
    const dur = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`✅ [PDF GENERATOR COMPLETE] Compiled ${CACHED_PDF_PATH} in ${dur}s! Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    // Notify any queued requests
    const resolvers = [...pendingResolvers];
    pendingResolvers = [];
    resolvers.forEach(r => r.resolve(pdfBuffer));

    return pdfBuffer;
  } catch (err) {
    console.error('❌ [PDF GENERATOR ERROR]:', err);
    const resolvers = [...pendingResolvers];
    pendingResolvers = [];
    resolvers.forEach(r => r.reject(err));
    throw err;
  } finally {
    isGenerating = false;
  }
}

function getLatestPdf() {
  if (fs.existsSync(CACHED_PDF_PATH)) {
    return fs.readFileSync(CACHED_PDF_PATH);
  }
  return null;
}

module.exports = {
  generateMagazinePdf,
  getLatestPdf,
  CACHED_PDF_PATH
};

