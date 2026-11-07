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
  '.ico': 'image/x-icon'
};

function startServer(port) {
  const server = http.createServer((req, res) => {
    // API Endpoint: Live Scrape & Auto-Generate 30 Pages
    if (req.url.startsWith('/api/scrape-and-generate')) {
      console.log('\n📡 Received /api/scrape-and-generate trigger from browser UI...');
      scrapeAndGenerateMagazine()
        .then(result => {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(result));

          // Trigger asynchronous background pre-rendering of PDF so next download is instant!
          setTimeout(() => {
            generateMagazinePdf(port).catch(e => console.warn('Pre-render PDF warning:', e.message));
          }, 2000);
        })
        .catch(err => {
          console.error('Scrape error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        });
      return;
    }

    // API Endpoint: Direct PDF Download (1-click, no print dialog!)
    if (req.url.startsWith('/api/download-pdf')) {
      console.log('\n📄 Received /api/download-pdf direct download request...');
      let memory = { activeEdition: 26 };
      try {
        memory = JSON.parse(fs.readFileSync(path.join(__dirname, 'editions.json'), 'utf8'));
      } catch (_) {}

      const editionNum = memory.activeEdition || 26;
      const downloadFilename = `Raga_Magazine_Issue_${editionNum}_30_Pages.pdf`;

      // Check if pre-rendered PDF is available
      const cached = getLatestPdf();
      if (cached && !req.url.includes('fresh=1')) {
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
      console.log('Generating fresh 30-page PDF via headless Edge...');
      generateMagazinePdf(port)
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

    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

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
    console.log(`🚀 RAGA MAGAZINE LIVE ON LOCALHOST:`);
    console.log(`👉 http://localhost:${port}/`);
    console.log(`👉 http://127.0.0.1:${port}/`);
    console.log(`API  http://localhost:${port}/api/scrape-and-generate`);
    console.log(`======================================================\n`);
  });
}

startServer(3000);
