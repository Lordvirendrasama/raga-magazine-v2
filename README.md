# Antigravity Magazine OS 🎵🕹️📖

> **Dual Publication Autonomous Publishing Suite** featuring **Raga Magazine** (South Asian Sound & Culture) and **The 8 Bit Bistro Mag** (Retro Arcade Gaming News). Powered by autonomous live RSS scraping, dynamic quickread synthesis, dual-kiosk selection portal, and 1-click A4 vector print PDF export.

---

## 🏛️ The Publications

### 1. 🎵 RAGA MAGAZINE — The Journal of South Asian Sound
* **Focus:** Contemporary South Asian sound, indie rock, vernacular hip-hop, electronic crossover, acoustic folk, and tour captures.
* **Live Feeds:** Harvested dynamically from *Rolling Stone India* & *The Indian Music Diaries*.
* **Aesthetic:** High-fashion editorial, full-bleed photographic negative space spreads, and crisp black-and-white print sheets.
* **Workspace URL:** `http://localhost:3000/raga`

### 2. 👾 THE 8 BIT BISTRO MAG — The Arcade Gazette of Video Game News
* **Focus:** Video game releases, open-world titans, patch meta breakdowns, retro remakes, hardware specs, and developer intel.
* **Live Feeds:** Harvested dynamically from *Polygon*, *Kotaku*, *PC Gamer* & *Eurogamer*.
* **Aesthetic:** Pixel art retro arcade, CRT scanlines, arcade HUD headers (`[1P READY // CREDITS: 99]`), boss fight health bars, inventory stats, and coin-op styling.
* **Workspace URL:** `http://localhost:3000/8bit`

---

## 🌟 Core Features Across Both Publications

* **Dual-Cabinet Kiosk Selection Portal (`/`):**
  * Interactive 3D entrance portal allowing the reader to choose their publication cabinet.
* **Autonomous 30-Page Live News Harvester:**
  * One-click trigger crawls live RSS feeds across publication-specific sources.
  * **Zero Duplicate Coverage:** Dedicated issue memory (`editions-raga.json` and `editions-8bit.json`) tracks covered stories across every volume and skips previously covered stories.
* **Dynamic Quickread Rewriter:**
  * Transforms raw news into casual, hook-filled magazine quickreads.
  * Extracts genuine quotes, key facts, platform metadata (`PC`, `PS5`, `SWITCH`, `XBOX`), and custom verdicts.
* **Clickable Source Hyperlinks (Web + Vector PDF):**
  * Every article retains active `<a>` hyperlinks to the original publisher articles in both the web reader and exported PDF.
* **1-Click Direct Vector PDF Engine:**
  * Headless Microsoft Edge / Chromium compilation powered by `puppeteer-core`.
  * Generates exact A4 print-ready PDFs (`210mm x 297mm`) with margins, backgrounds, and clickable links preserved.
  * Instant download with 0 browser print dialogs.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Localhost Server
```bash
node server.js
```

### 3. Open in Browser
* **Selection Kiosk:** [`http://localhost:3000/`](http://localhost:3000/)
* **Raga Magazine:** [`http://localhost:3000/raga`](http://localhost:3000/raga)
* **The 8 Bit Bistro Mag:** [`http://localhost:3000/8bit`](http://localhost:3000/8bit)

---

## 📡 API Endpoints

* `GET /` — Dual-cabinet Selection Kiosk Portal.
* `GET /raga` — Raga Magazine 30-page workspace.
* `GET /8bit` — The 8 Bit Bistro 30-stage arcade workspace.
* `GET /api/scrape-and-generate?pub=raga` — Scrape music news and compile new Raga issue.
* `GET /api/scrape-and-generate?pub=8bit` — Scrape gaming news and compile new 8-Bit stage issue.
* `GET /api/download-pdf?pub=raga` — Direct download vector PDF of Raga Magazine.
* `GET /api/download-pdf?pub=8bit` — Direct download vector PDF of The 8 Bit Bistro Mag.

---

## 📜 License

MIT License.
