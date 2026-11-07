# Raga Magazine 🎵📖

> **The Journal of South Asian Sound** — An autonomous, editorial-grade 30-page digital and print magazine with live RSS news harvesting, casual Gen-Z quickread re-writing, interactive web layout, and direct 1-click A4 print PDF compilation.

---

## 🌟 Key Features

* **30-Page Alternating Visual Editorial:**
  * **Full Photographic Negative Space Spreads:** Canopy sky, asymmetric left flank, obsidian monolith, and stage shadow wells.
  * **Crisp Editorial Text Sheets:** High-contrast White sheets and Deep Luxury Black sheets with flowing float image wrappers.
* **Autonomous Live News Scraper:**
  * Live crawler harvesting stories from **Rolling Stone India** and **The Indian Music Diaries**.
  * **Deep Archive Crawling:** Dynamically pages through RSS archives to continuously find fresh news.
  * **Issue Memory & Duplicate Protection:** Remembers all stories covered across previous volumes in `editions.json` and skips duplicate coverage.
* **Casual Print-Magazine Quickread Rewriter:**
  * Strips generic press release boilerplate and transforms raw articles into casual, hook-filled quickreads.
  * Contextual tone detection (Tributes & Obituaries, Live Concerts & Tours, Album Drops, In-depth Interviews, Heritage Folk, Vernacular Hip-Hop).
  * Real artist quotes and facts extracted directly from source text.
* **Interactive Story Rundown Cards & PDF Hyperlinks:**
  * Redesigned floating story cards on full photo spreads with frosted glassmorphism and clear layout.
  * **Vector PDF Hyperlink Preservation:** Direct clickable hyperlinks (`<a>` tags) embedded across the web view and the exported PDF to open original live articles.
* **1-Click Direct Vector PDF Generator:**
  * Headless Microsoft Edge / Chromium compilation powered by `puppeteer-core`.
  * Generates an exact 30-page A4 print PDF (`210mm x 297mm`) with margins, backgrounds, and clickable links preserved.
  * Pre-renders in the background for instant 1-click downloads with no browser print dialogs.

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
The magazine will run on `http://localhost:3000/`.

### 3. Usage & Controls
* **Preview Mode:** Smooth page scrolling, navigation bar (Cover + Pages 01–29).
* **⚡ Scrape & Generate 30 Pages:** Trigger a fresh crawl of Rolling Stone India & The Indian Music Diaries to compile a brand-new 30-page issue with zero duplicate news.
* **📄 Save as PDF:** Directly download the full 30-page high-res vector PDF with one click.
* **✏️ Edit Mode:** In-place visual editing of headlines, leads, image sizing, shapes, and photo replacement.

---

## 🛠️ Tech Stack

* **Frontend:** Vanilla HTML5, CSS3 (Modern Flexbox, CSS Grid, Negative Space Scrims, Print CSS `@media print`).
* **Backend:** Node.js HTTP server.
* **PDF Compilation:** `puppeteer-core` driving headless Microsoft Edge / Chromium.
* **Data & Memory:** Dynamic JSON edition store (`editions.json`) and live XML/RSS parsers.

---

## 📜 License

MIT License. Curated for independent South Asian sound culture.
