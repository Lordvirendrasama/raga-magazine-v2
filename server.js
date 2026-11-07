const http = require('http');
const fs = require('fs');
const path = require('path');
const { scrapeAndGenerateMagazine } = require('./generator-engine');
const { generateMagazinePdf, getLatestPdf } = require('./pdf-generator');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

function startServer(port) {
  const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, `http://localhost:${port}`);
    const pathname = urlObj.pathname;
    const pubParam = (urlObj.searchParams.get('pub') || 'raga').toLowerCase();
    const pub = (pubParam === '8bit' || pubParam === 'eightbit') ? '8bit' : 'raga';

    // API Endpoint: Live Scrape & Auto-Generate 30 Pages / Stages
    if (pathname === '/api/scrape-and-generate') {
      console.log(`\n📡 [API] Received /api/scrape-and-generate for publication: "${pub.toUpperCase()}"...`);
      scrapeAndGenerateMagazine(pub)
        .then(result => {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(result));

          // Trigger asynchronous background pre-rendering of PDF so next download is instant!
          setTimeout(() => {
            generateMagazinePdf(port, pub).catch(e => console.warn(`Pre-render ${pub} PDF warning:`, e.message));
          }, 2000);
        })
        .catch(err => {
          console.error(`Scrape error on ${pub}:`, err);
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        });
      return;
    }

    // API Endpoint: Direct PDF Download (1-click, no print dialog!)
    if (pathname === '/api/download-pdf') {
      console.log(`\n📄 [API] Received /api/download-pdf direct download request for: "${pub.toUpperCase()}"...`);

      let editionNum = 1;
      let downloadFilename = '';

      if (pub === '8bit') {
        let mem = { activeEdition: 1 };
        try {
          mem = JSON.parse(fs.readFileSync(path.join(__dirname, 'editions-8bit.json'), 'utf8'));
        } catch (_) {}
        editionNum = mem.activeEdition || 1;
        downloadFilename = `The_8Bit_Bistro_Mag_Vol_${editionNum}_30_Stages.pdf`;
      } else {
        let mem = { activeEdition: 30 };
        try {
          mem = JSON.parse(fs.readFileSync(path.join(__dirname, 'editions-raga.json'), 'utf8'));
        } catch (_) {
          try {
            mem = JSON.parse(fs.readFileSync(path.join(__dirname, 'editions.json'), 'utf8'));
          } catch (_) {}
        }
        editionNum = mem.activeEdition || 30;
        downloadFilename = `Raga_Magazine_Issue_${editionNum}_30_Pages.pdf`;
      }

      // Check if pre-rendered PDF is available
      const cached = getLatestPdf(pub);
      if (cached && !urlObj.searchParams.has('fresh')) {
        console.log(`⚡ Instant stream: serving pre-compiled 30-page PDF (${(cached.length / (1024*1024)).toFixed(2)} MB) -> "${downloadFilename}"`);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${downloadFilename}"`,
          'Content-Length': cached.length,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(cached);
        return;
      }

      // Generate on-demand if not cached yet
      console.log(`Generating fresh 30-page PDF for ${pub.toUpperCase()} via headless Edge...`);
      generateMagazinePdf(port, pub)
        .then(pdfBuffer => {
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${downloadFilename}"`,
            'Content-Length': pdfBuffer.length,
            'Access-Control-Allow-Origin': '*'
          });
          res.end(pdfBuffer);
        })
        .catch(err => {
          console.error('PDF export error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });
      return;
    }

    // Static Page Routing
    let reqPath = pathname;
    if (reqPath === '/' || reqPath === '' || reqPath === '/portal') {
      reqPath = '/portal.html';
    } else if (reqPath === '/raga') {
      reqPath = '/raga.html';
    } else if (reqPath === '/8bit') {
      reqPath = '/8bit.html';
    }

    const filePath = path.join(__dirname, reqPath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + reqPath);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 ANTIGRAVITY PUBLISHING ENGINE ACTIVE ON LOCALHOST:`);
    console.log(`👉 http://localhost:${port}/           (Selection Kiosk Portal)`);
    console.log(`👉 http://localhost:${port}/raga       (RAGA MAGAZINE - 30 Pages)`);
    console.log(`👉 http://localhost:${port}/8bit       (THE 8 BIT BISTRO - 30 Stages)`);
    console.log(`📡 http://localhost:${port}/api/scrape-and-generate?pub=raga`);
    console.log(`📡 http://localhost:${port}/api/scrape-and-generate?pub=8bit`);
    console.log(`======================================================\n`);
  });
}

startServer(3000);
