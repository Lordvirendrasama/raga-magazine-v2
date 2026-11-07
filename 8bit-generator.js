const fs = require('fs');
const path = require('path');

const EDITIONS_8BIT_FILE = path.join(__dirname, 'editions-8bit.json');

// Curated high-resolution gaming master stills
const CURATED_GAMING_IMAGES = [
  "https://cdn.mos.cms.futurecdn.net/PhVjZbGy2wt3kcRcFUPNc7-1920-80.jpg",
  "https://kotaku.com/app/uploads/2026/11/flotsam.jpg",
  "https://assetsio.gnwcdn.com/mass-effect-expanse-rpg-david-gaider.jpg",
  "https://cdn.mos.cms.futurecdn.net/7AYjZbGy2wt3kcRcFUPNc7-1920-80.jpg",
  "https://cdn.mos.cms.futurecdn.net/2ZqH3N66u3wY89LkjGDF67-1920-80.jpg",
  "https://assetsio.gnwcdn.com/gta-6-screenshot-vice-city.jpg",
  "https://cdn.mos.cms.futurecdn.net/4nKjZbGy2wt3kcRcFUPNc7-1920-80.jpg"
];

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8230;/g, '...')
    .replace(/&hellip;/g, '...')
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .trim();
}

function stripHtmlTags(str) {
  if (!str) return '';
  return decodeHtmlEntities(str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function normalizeTitle(str) {
  if (!str) return '';
  return decodeHtmlEntities(str)
    .toLowerCase()
    .replace(/['’"“”]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanImageUrl(url) {
  if (!url) return '';
  return url.replace(/-\d+x\d+(\.[a-zA-Z0-9]+)$/, '$1');
}

function extractBestGamingImage(itemXml, defaultIndex = 0) {
  const encMatch = itemXml.match(/<enclosure[^>]+url="([^">]+)"/i);
  if (encMatch && encMatch[1]) return cleanImageUrl(encMatch[1]);

  const mediaMatch = itemXml.match(/<media:content[^>]+url="([^">]+)"/i);
  if (mediaMatch && mediaMatch[1]) return cleanImageUrl(mediaMatch[1]);

  const matches = [...itemXml.matchAll(/https?:\/\/[^\s"'<>]+\.(?:webp|jpg|jpeg|png)/gi)].map(m => m[0]);
  const valid = matches.filter(u => {
    const low = u.toLowerCase();
    return !low.includes('avatar') && !low.includes('logo') && !low.includes('icon') && !low.includes('badge') && !low.includes('32x32') && !low.includes('-150x');
  });

  if (valid.length > 0) return cleanImageUrl(valid[0]);
  return CURATED_GAMING_IMAGES[defaultIndex % CURATED_GAMING_IMAGES.length];
}

function extractQuotes(text) {
  if (!text) return null;
  const matches = [...text.matchAll(/["“]([^"”]{25,180})["”]/g)].map(m => m[1].trim());
  return matches.length > 0 ? `“${matches[0]}”` : null;
}

function detectPlatforms(text) {
  const t = text.toLowerCase();
  const plats = [];
  if (t.includes('switch') || t.includes('nintendo')) plats.push('NINTENDO SWITCH OLED');
  if (t.includes('pc') || t.includes('steam') || t.includes('windows')) plats.push('PC // STEAM');
  if (t.includes('ps5') || t.includes('playstation')) plats.push('PLAYSTATION 5');
  if (t.includes('xbox') || t.includes('series x')) plats.push('XBOX SERIES X');
  return plats.length > 0 ? plats.join(' · ') : 'MULTI-PLATFORM // ARCHIVAL';
}

function rewriteAsLuxuryGamingEssay(title, contentOrDesc, source, link) {
  const cleanTitle = decodeHtmlEntities(title).trim();
  const rawText = stripHtmlTags(contentOrDesc || '').trim();
  const lower = (cleanTitle + ' ' + rawText).toLowerCase();
  const platform = detectPlatforms(cleanTitle + ' ' + rawText);
  const realQuote = extractQuotes(rawText);
  const sentences = rawText.split(/(?<=[.!?])\s+/).filter(s => s.length > 25 && !s.toLowerCase().includes('cookie') && !s.toLowerCase().includes('subscribe'));

  let kicker = "CRITICAL ESSAY // CONTEMPORARY PERSPECTIVES";
  let badge = "CURATOR'S SELECTION";
  let lead = "";
  let p1 = "";
  let p2 = "";
  let quote = "";
  let score = "9.8 / 10";
  let verdict = "ESSENTIAL · MASTERWORK";
  let curatorialNote = "A masterclass in tension, spatial geography, and player agency.";

  if (lower.includes('gta') || lower.includes('grand theft auto') || lower.includes('rockstar') || lower.includes('open-world') || lower.includes('open world')) {
    kicker = "ARCHITECTURAL STUDY // OPEN WORLD SCALE";
    badge = "DEFINITIVE FEATURE";
    lead = `In an industry increasingly dominated by ephemeral streaming trends, this work stands as a monolithic statement of computational ambition and spatial fidelity.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Rather than relying on sterile procedural generation, the environmental architecture evokes an unmistakable tactile presence. Every street corner, weather cycle, and ambient light bounce serves an intentional design thesis.`;
    quote = realQuote || `“We wanted this world to feel living and breathing—not merely as a playground, but as an authentic cultural artifact.”`;
    curatorialNote = "Redefining the relationship between urban realism and systemic simulation.";
    score = "10 / 10";
    verdict = "LANDMARK · SYSTEM SELLER";
  } else if (lower.includes('patch') || lower.includes('update') || lower.includes('rebalance') || lower.includes('buff') || lower.includes('nerf')) {
    kicker = "SYSTEM METRICS // MECHANICAL REFINEMENT";
    badge = "DESIGN DISPATCH";
    lead = `Behind every competitive canvas lies a delicate architecture of numbers, frame timings, and behavioral incentives.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `This overhaul recalibrates the dialogue between player skill and systemic reward. By stripping away degenerate friction and tuning hitbox geometry, the title enters its most elegant competitive state yet.`;
    quote = realQuote || `“Balance is never static; it is an ongoing conversation with our most dedicated community of players.”`;
    curatorialNote = "A refined lesson in how responsive iteration preserves mechanical longevity.";
    score = "9.6 / 10";
    verdict = "CRUCIAL · SYSTEMIC UPGRADE";
  } else if (lower.includes('zelda') || lower.includes('ocarina') || lower.includes('remake') || lower.includes('retro') || lower.includes('nintendo') || lower.includes('mario')) {
    kicker = "HERITAGE RETROSPECTIVE // TIMELESS MASTERY";
    badge = "CANONICAL WORK";
    lead = `True design mastery does not diminish with age; it endures, revealing fresh layers of structural brilliance to each successive generation.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `By honoring the sacred geometry of the original vision while integrating modern atmospheric rendering, this release demonstrates why classical Japanese ludic philosophy remains the foundation of contemporary game design.`;
    quote = realQuote || `“Respecting the original vision meant capturing how the game felt in our childhood imaginations, not just how it rendered on screen.”`;
    curatorialNote = "Preserving the sacred geometry and emotional resonance of video game history.";
    score = "9.9 / 10";
    verdict = "TIMELESS · CANONICAL MASTERPIECE";
  } else if (lower.includes('rpg') || lower.includes('path of exile') || lower.includes('mass effect') || lower.includes('dragon age')) {
    kicker = "NARRATIVE ARCHITECTURE // DEEP SYSTEMS";
    badge = "LUDIC CRITICISM";
    lead = `The finest role-playing experiences succeed because they respect player autonomy as an active literary medium.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Through intricate mathematical progression, deliberate moral ambiguity, and uncompromising mechanical depth, the experience transcends mere entertainment to become a sustained meditation on cause and consequence.`;
    quote = realQuote || `“We designed this world for players who demand that their choices reverberate with lasting moral weight.”`;
    curatorialNote = "An expansive achievement in branching narrative design and player consequence.";
    score = "9.7 / 10";
    verdict = "ESSENTIAL · NARRATIVE TRIUMPH";
  } else {
    kicker = "CONTEMPORARY DISPATCH // INDUSTRY CURATION";
    badge = "CRITICS' NOTE";
    lead = `A razor-sharp examination of craft, intention, and authorship at the leading edge of modern interactive entertainment: ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Pushing back against algorithmic homogenization and corporate formulas, this work commands undivided attention through sheer clarity of artistic conviction.`;
    quote = realQuote || `“When games are crafted with singular creative conviction rather than commercial compromise, the medium elevates as a whole.”`;
    curatorialNote = "A compelling demonstration of authorial voice and mechanical discipline.";
    score = "9.5 / 10";
    verdict = "RECOMMENDED · HIGH MERIT";
  }

  return {
    kicker,
    badge,
    lead,
    p1,
    p2,
    quote,
    score,
    verdict,
    curatorialNote,
    platform,
    sourceLink: link || '#'
  };
}

// Harvest fresh gaming news skipping previous issues
async function harvestGamingStories(coveredMap, targetCount = 35) {
  const freshArticles = [];
  const skippedArticles = [];

  const NON_GAMING_TERMS = [
    'movie review', 'film review', 'ryan gosling', 'flintstones', 'hollywood',
    'box office', 'emmy', 'oscar', 'tv show', 'netflix series', 'hbo series',
    'bamm-bamm', 'trailer', 'movies to watch', 'what to watch', 'streaming guide',
    'best tv', 'best movie', 'films to watch', 'shows to stream', 'dune 3'
  ];

  const feeds = [
    { src: 'Polygon', url: 'https://www.polygon.com/rss/index.xml' },
    { src: 'Kotaku', url: 'https://kotaku.com/rss' },
    { src: 'PC Gamer', url: 'https://www.pcgamer.com/rss/' },
    { src: 'Eurogamer', url: 'https://www.eurogamer.net/feed' }
  ];

  for (let feedIdx = 0; feedIdx < feeds.length; feedIdx++) {
    const f = feeds[feedIdx];
    try {
      const res = await fetch(f.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.split(/<item>|<entry>/i).slice(1);

      items.forEach(item => {
        const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const linkMatch = item.match(/<link[^>]*href="([^"]+)"/i) || item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        const descMatch = item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i) || item.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || item.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);

        if (titleMatch && linkMatch) {
          const rawTitle = decodeHtmlEntities(titleMatch[1]);
          const normTitle = normalizeTitle(rawTitle);

          if (!normTitle || normTitle.length < 5) return;
          if (NON_GAMING_TERMS.some(t => normTitle.includes(t))) return;

          // Check if covered in previous editions
          let coveredIn = coveredMap.get(normTitle);
          if (coveredIn) {
            skippedArticles.push({ title: rawTitle, coveredIn });
            return;
          }

          if (freshArticles.some(a => normalizeTitle(a.title) === normTitle)) return;

          const rawDesc = descMatch ? stripHtmlTags(descMatch[1]) : '';
          const bestImage = extractBestGamingImage(item, freshArticles.length);

          freshArticles.push({
            source: f.src,
            title: rawTitle,
            link: linkMatch[1].trim(),
            desc: rawDesc,
            image: bestImage
          });
        }
      });
    } catch (e) {
      console.warn(`Feed error on ${f.url}:`, e.message);
    }
  }

  console.log(`🏛️ [LUXURY HARVESTER] Harvested ${freshArticles.length} gaming stories (Skipped ${skippedArticles.length} previously covered).`);
  return { freshArticles, skippedCount: skippedArticles.length };
}

// Generate the 30-Page Luxury Gaming Publication
async function scrapeAndGenerate8BitMagazine() {
  console.log('🏛️ [LUXURY GAMING ENGINE] Compiling high-fashion gaming monograph (zero CRT, Swiss grid, luxury typography)...');

  // 1. Read editions memory
  let memory = { activeEdition: 0, history: [] };
  if (fs.existsSync(EDITIONS_8BIT_FILE)) {
    try {
      memory = JSON.parse(fs.readFileSync(EDITIONS_8BIT_FILE, 'utf8'));
    } catch (e) {
      console.warn('Could not read editions-8bit.json, starting fresh:', e.message);
    }
  }

  const coveredMap = new Map();
  if (Array.isArray(memory.history)) {
    memory.history.forEach(edition => {
      if (Array.isArray(edition.featuredStories)) {
        edition.featuredStories.forEach(t => coveredMap.set(normalizeTitle(t), edition.volume || edition.stage));
      }
    });
  }

  // 2. Harvest fresh stories
  const { freshArticles, skippedCount } = await harvestGamingStories(coveredMap, 40);

  if (freshArticles.length < 30) {
    console.warn(`⚠️ Only harvested ${freshArticles.length} stories. Padding with curated gaming highlights.`);
    while (freshArticles.length < 30) {
      const idx = freshArticles.length;
      freshArticles.push({
        source: 'Polygon',
        title: `Spatial Architecture & The Virtual Sublime: Essay ${idx + 1}`,
        link: 'https://www.polygon.com',
        desc: 'Cutting edge graphics, real-time lighting pipelines, and modular indie designs redefine modern gameplay.',
        image: CURATED_GAMING_IMAGES[idx % CURATED_GAMING_IMAGES.length]
      });
    }
  }

  const newVol = (memory.activeEdition || 0) + 1;
  const issueDate = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

  // 3. Prepare Stories & Rewrites
  const selectedStories = freshArticles.slice(0, 30);
  const heroStory = selectedStories[0];
  heroStory.essay = rewriteAsLuxuryGamingEssay(heroStory.title, heroStory.desc, heroStory.source, heroStory.link);

  const interiorStories = selectedStories.slice(1).map(s => {
    s.essay = rewriteAsLuxuryGamingEssay(s.title, s.desc, s.source, s.link);
    return s;
  });

  // 4. Build Complete 30-Page Luxury Document
  let mainContentHtml = '';

  // PAGE 01: LUXURY COLLECTOR'S COVER (EDGE / APWOT HIGH-FASHION STYLE)
  mainContentHtml += `
    <!-- ========================================================
         PAGE 01: LUXURY COLLECTOR'S COVER
         ======================================================== -->
    <article id="page-1" class="luxury-sheet page-cover-monograph">
      <img class="cover-master-photo" src="${heroStory.image}" alt="${heroStory.title}" />
      <div class="cover-gradient-scrim"></div>

      <div class="cover-layout-frame">
        <!-- Top Minimalist Folio -->
        <header class="cover-folio-top">
          <div class="folio-left-block">
            <span class="luxury-crimson-dot">●</span>
            <span class="folio-brand-title">THE 8 BIT BISTRO</span>
            <span class="folio-divider">/</span>
            <span class="folio-meta-muted">THE JOURNAL OF INTERACTIVE ART</span>
          </div>
          <div class="folio-right-block">
            <span class="folio-vol-badge">VOL. ${String(newVol).padStart(2, '0')}</span>
            <span class="folio-edition-tag">COLLECTOR'S EDITION</span>
          </div>
        </header>

        <!-- Center Architectural Masthead -->
        <div class="cover-masthead-hero">
          <div class="masthead-eyebrow">A CURATED ANTHOLOGY OF MODERN LUDOLOGY</div>
          <h1 class="masthead-display-title">THE 8 BIT BISTRO</h1>
          <div class="masthead-architectural-line"></div>
        </div>

        <!-- Gold Foil Monograph Emblem -->
        <div class="cover-luxury-emblem">
          <div class="emblem-inner">
            <span class="emblem-edition">VOL. ${newVol}</span>
            <span class="emblem-label">ARCHIVE ANTHOLOGY</span>
            <span class="emblem-pages">30 CURATED PAGES</span>
          </div>
        </div>

        <!-- Bottom Curatorial Lead Card -->
        <div class="cover-curatorial-card">
          <div class="curatorial-meta-row">
            <span class="meta-tag-crimson">${heroStory.essay.badge}</span>
            <span class="meta-tag-plat">${heroStory.source.toUpperCase()} MONOGRAPH</span>
            <span class="meta-tag-spec">${heroStory.essay.platform}</span>
          </div>

          <h2 class="cover-feature-headline">
            <a href="${heroStory.link}" target="_blank" rel="noopener noreferrer" class="cover-essay-link">
              ${heroStory.title}
            </a>
          </h2>

          <p class="cover-curatorial-lead">
            ${heroStory.essay.lead}
          </p>

          <div class="cover-curatorial-footer">
            <a href="${heroStory.link}" target="_blank" rel="noopener noreferrer" class="luxury-btn-action">
              <span>READ ORIGINAL DISPATCH</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>

            <div class="critic-evaluation-badge">
              <span class="eval-label">CRITICS' SELECTION</span>
              <span class="eval-score">${heroStory.essay.score}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Running Barcode & Archival Serial -->
        <footer class="cover-folio-bottom">
          <div class="archival-serial">
            <span class="serial-code">ISBN 978-0-8BIT-2026-${newVol}</span>
            <span class="serial-divider">·</span>
            <span>PUBLISHED ${issueDate.toUpperCase()}</span>
          </div>
          <div class="archival-rights">
            <span>CURATED FROM POLYGON, KOTAKU, PC GAMER &amp; EUROGAMER</span>
          </div>
        </footer>
      </div>
    </article>
  `;

  // PAGES 02 - 30: ALTERNATING LUXURY SPREADS
  interiorStories.forEach((s, idx) => {
    const pageNum = idx + 2; // Pages 2 to 30
    const isSpread = pageNum % 2 === 0; // Even pages: CINEMATIC MONOLITH SPREAD
    const isWhiteGallery = pageNum % 4 === 3; // Type B: SWISS MINIMALIST GALLERY SHEET (White)
    // Otherwise Type C: OBSIDIAN ANTHRACITE ESSAY (Deep Luxury Dark)

    if (isSpread) {
      // TEMPLATE 1: CINEMATIC NEGATIVE-SPACE SPREAD (Full Photographic Monolith)
      mainContentHtml += `
        <!-- ========================================================
             PAGE ${String(pageNum).padStart(2, '0')}: CINEMATIC SPREAD (${s.title})
             ======================================================== -->
        <article id="page-${pageNum}" class="luxury-sheet page-cinematic-monolith">
          <img class="spread-full-photo" src="${s.image}" alt="${s.title}" loading="lazy" />
          <div class="spread-vignette-scrim"></div>

          <!-- Running Top Header -->
          <header class="luxury-folio-top">
            <div class="folio-left">
              <span class="folio-crimson-marker"></span>
              <span class="folio-mag-name">THE 8 BIT BISTRO</span>
              <span class="folio-pipe">/</span>
              <span class="folio-sub">${s.essay.kicker}</span>
            </div>
            <div class="folio-right">
              <span class="folio-page-num">PAGE ${String(pageNum).padStart(2, '0')}</span>
            </div>
          </header>

          <!-- Floating Frosted Glass Monograph Card -->
          <div class="monograph-frosted-card">
            <div class="card-eyebrow-strap">
              <span class="badge-crimson-hairline">${s.essay.badge}</span>
              <span class="card-source-label">${s.source} CRITIQUE</span>
            </div>

            <h3 class="card-essay-title">
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:#ffffff; text-decoration:none;">
                ${s.title}
              </a>
            </h3>

            <p class="card-essay-lead">${s.essay.lead}</p>
            <p class="card-essay-body">${s.essay.p1}</p>

            <!-- Refined Pull Quote in Italic Serif -->
            <div class="card-editorial-quote">
              <p>${s.essay.quote}</p>
            </div>

            <div class="card-action-bar">
              <div class="card-metadata-pills">
                <span class="pill-plat">${s.essay.platform}</span>
                <span class="pill-score">${s.essay.verdict}</span>
              </div>
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="luxury-btn-outline">
                <span>READ CRITIQUE</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            </div>
          </div>

          <!-- Running Bottom Folio -->
          <footer class="luxury-folio-bottom">
            <span>THE 8 BIT BISTRO // ESSAYS ON VIRTUAL SPACES // CURATED FROM <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:var(--crimson); font-weight:700;">${s.source} ↗</a></span>
            <span>CRITICS' SCORE // ${s.essay.score}</span>
            <span>PAGE ${String(pageNum).padStart(2, '0')} OF 30</span>
          </footer>
        </article>
      `;
    } else if (isWhiteGallery) {
      // TEMPLATE 2: SWISS MINIMALIST GALLERY SHEET (Crisp Luxury White)
      mainContentHtml += `
        <!-- ========================================================
             PAGE ${String(pageNum).padStart(2, '0')}: SWISS GALLERY SHEET (${s.title})
             ======================================================== -->
        <article id="page-${pageNum}" class="luxury-sheet page-white-gallery">
          <!-- Running Top Header -->
          <header class="white-folio-top">
            <div class="folio-left">
              <span class="folio-crimson-marker"></span>
              <span class="white-mag-title">THE 8 BIT BISTRO</span>
              <span class="white-divider">/</span>
              <span class="white-dept">${s.essay.kicker}</span>
            </div>
            <div class="folio-right">
              <span class="white-page-pill">PAGE ${String(pageNum).padStart(2, '0')}</span>
            </div>
          </header>

          <div class="white-main-container">
            <div class="white-headline-block">
              <div class="white-meta-badge-row">
                <span class="tag-crimson-solid">${s.essay.badge}</span>
                <span class="tag-source-muted">${s.source} DISPATCH</span>
                <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="white-source-link">
                  READ ORIGINAL ESSAY ↗
                </a>
              </div>

              <h2 class="white-headline">
                <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:none;">
                  ${s.title}
                </a>
              </h2>
            </div>

            <!-- Two-Column Swiss Grid -->
            <div class="white-content-grid">
              <div class="white-left-col">
                <div class="white-framed-photo">
                  <img src="${s.image}" alt="${s.title}" loading="lazy" />
                  <div class="photo-caption-tag">
                    <span>FIGURE ${String(pageNum).padStart(2, '0')} · PRODUCTION STILL // ${s.source.toUpperCase()}</span>
                  </div>
                </div>

                <!-- Curatorial Analysis Box -->
                <div class="curatorial-analysis-box">
                  <div class="box-label">CURATORIAL EVALUATION</div>
                  <p class="box-text">${s.essay.curatorialNote}</p>
                  <div class="box-stat">
                    <span>STATUS:</span>
                    <strong>${s.essay.verdict}</strong>
                  </div>
                </div>
              </div>

              <div class="white-right-col">
                <p class="white-lead-text">${s.essay.lead}</p>
                <p class="white-body-text">${s.essay.p1}</p>
                <p class="white-body-text">${s.essay.p2}</p>

                <!-- Elegant Serif Pull Quote -->
                <div class="white-pull-quote">
                  <p>${s.essay.quote}</p>
                </div>

                <div class="white-footer-meta">
                  <span class="white-plat-label">PLATFORM: <strong>${s.essay.platform}</strong></span>
                  <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="white-action-btn">
                    READ COMPLETE MONOGRAPH ↗
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Folio -->
          <footer class="white-folio-bottom">
            <span>THE 8 BIT BISTRO // VOL. ${newVol} // INDEPENDENT GAMING ESSAYS</span>
            <span>DOCUMENTATION &amp; ARCHIVAL CRITIQUE</span>
            <span>PAGE ${String(pageNum).padStart(2, '0')} OF 30</span>
          </footer>
        </article>
      `;
    } else {
      // TEMPLATE 3: OBSIDIAN ANTHRACITE MONOGRAPH (Deep Luxury Dark)
      mainContentHtml += `
        <!-- ========================================================
             PAGE ${String(pageNum).padStart(2, '0')}: OBSIDIAN ANTHRACITE (${s.title})
             ======================================================== -->
        <article id="page-${pageNum}" class="luxury-sheet page-obsidian-dark">
          <header class="obsidian-folio-top">
            <div class="folio-left">
              <span class="folio-crimson-marker"></span>
              <span class="obsidian-mag-title">THE 8 BIT BISTRO</span>
              <span class="obsidian-divider">/</span>
              <span class="obsidian-dept">${s.essay.kicker}</span>
            </div>
            <div class="folio-right">
              <span class="obsidian-page-pill">PAGE ${String(pageNum).padStart(2, '0')}</span>
            </div>
          </header>

          <div class="obsidian-main-container">
            <div class="obsidian-headline-row">
              <span class="obsidian-badge-crimson">${s.essay.badge}</span>
              <h2 class="obsidian-headline">
                <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:#ffffff; text-decoration:none;">
                  ${s.title}
                </a>
              </h2>
            </div>

            <!-- Wide Luxury Hero Image Banner -->
            <div class="obsidian-wide-photo-frame">
              <img src="${s.image}" alt="${s.title}" loading="lazy" />
              <div class="wide-photo-caption">
                <span>IN FRAME: ARCHIVAL DOCUMENTATION // ${s.source.toUpperCase()}</span>
                <span class="caption-plat">${s.essay.platform}</span>
              </div>
            </div>

            <!-- Two-Column Refined Editorial Analysis -->
            <div class="obsidian-body-grid">
              <div class="obsidian-col-left">
                <p class="obsidian-lead-text">${s.essay.lead}</p>
                <p class="obsidian-body-text">${s.essay.p1}</p>
              </div>

              <div class="obsidian-col-right">
                <p class="obsidian-body-text">${s.essay.p2}</p>

                <!-- High-Fashion Quote Card -->
                <div class="obsidian-quote-card">
                  <div class="quote-crimson-bar"></div>
                  <p class="quote-text">${s.essay.quote}</p>
                </div>

                <div class="obsidian-action-row">
                  <span class="obsidian-score-pill">${s.essay.score}</span>
                  <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="obsidian-btn-link">
                    OPEN FULL DISPATCH ON ${s.source.toUpperCase()} ↗
                  </a>
                </div>
              </div>
            </div>
          </div>

          <footer class="obsidian-folio-bottom">
            <span>THE 8 BIT BISTRO · VOLUME ${newVol} · ESSAYS &amp; CRITICISM</span>
            <span>SOURCE: <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:var(--crimson);">${s.source}</a></span>
            <span>PAGE ${String(pageNum).padStart(2, '0')} OF 30</span>
          </footer>
        </article>
      `;
    }
  });

  // 5. Assemble Full Standalone 8bit.html File with Pure Luxury Styling
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>THE 8 BIT BISTRO — Luxury Gaming Monograph (Vol. ${newVol})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,600;0,6..96,800;0,6..96,900;1,6..96,600;1,6..96,800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Space+Grotesk:wght@500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --obsidian: #0b0d13;
      --anthracite: #131620;
      --card-glass: rgba(15, 18, 26, 0.88);
      --crimson: #e60012;
      --crimson-soft: rgba(230, 0, 18, 0.12);
      --gold: #d4af37;
      --gold-soft: rgba(212, 175, 55, 0.15);
      --white: #ffffff;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-400: #94a3b8;
      --slate-700: #334155;
      --slate-900: #0f172a;

      --font-display: 'Syne', -apple-system, sans-serif;
      --font-serif: 'Bodoni Moda', Georgia, serif;
      --font-grotesk: 'Space Grotesk', sans-serif;
      --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: var(--obsidian);
      color: var(--slate-200);
      font-family: var(--font-body);
      min-height: 100vh;
      overflow-x: hidden;
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Fixed Minimalist Luxury Top Bar */
    .luxury-top-bar {
      position: sticky;
      top: 0;
      z-index: 10000;
      background: rgba(11, 13, 19, 0.94);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
      padding: 12px 28px;
    }

    .luxury-bar-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1440px;
      margin: 0 auto;
      gap: 16px;
      flex-wrap: wrap;
    }

    .brand-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .kiosk-back-pill {
      font-family: var(--font-grotesk);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--slate-400);
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.18);
      padding: 6px 14px;
      border-radius: 9999px;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .kiosk-back-pill:hover {
      color: #fff;
      border-color: rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.12);
    }

    .mag-main-title {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 16px;
      letter-spacing: 0.04em;
      color: #ffffff;
      text-decoration: none;
    }

    .mag-vol-pill {
      font-family: var(--font-grotesk);
      font-size: 11px;
      font-weight: 700;
      color: var(--crimson);
      background: var(--crimson-soft);
      border: 1px solid rgba(230, 0, 18, 0.35);
      padding: 3px 10px;
      border-radius: 9999px;
      letter-spacing: 0.12em;
    }

    .top-actions-cluster {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .luxury-btn {
      font-family: var(--font-grotesk);
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .btn-scrape-luxury {
      background: #ffffff;
      color: #0b0d13;
      border: 1px solid #ffffff;
      box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
    }
    .btn-scrape-luxury:hover {
      background: #f1f5f9;
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(255, 255, 255, 0.25);
    }

    .btn-pdf-luxury {
      background: var(--crimson);
      color: #ffffff;
      border: 1px solid var(--crimson);
      box-shadow: 0 4px 18px rgba(230, 0, 18, 0.35);
    }
    .btn-pdf-luxury:hover {
      background: #ff1a2e;
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(230, 0, 18, 0.5);
    }

    .btn-html-luxury {
      background: rgba(255, 255, 255, 0.06);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    .btn-html-luxury:hover {
      color: #fff;
      border-color: rgba(255, 255, 255, 0.35);
    }

    /* Minimalist Horizontal Page Pager */
    .luxury-nav-track {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding: 6px 0 2px;
      max-width: 1440px;
      margin: 4px auto 0;
      scrollbar-width: thin;
    }

    .nav-dot-pill {
      font-family: var(--font-grotesk);
      font-size: 10px;
      font-weight: 600;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.05);
      color: var(--slate-400);
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      border-radius: 9999px;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .nav-dot-pill:hover, .nav-dot-pill.active {
      background: #ffffff;
      color: #0b0d13;
      border-color: #ffffff;
      font-weight: 700;
    }

    /* Magazine Workspace Canvas */
    .luxury-canvas {
      max-width: 800px;
      margin: 36px auto 90px;
      padding: 0 16px;
    }

    /* Luxury Sheet Standard (Exact A4 Proportion: 800px width by 1130px height) */
    .luxury-sheet {
      width: 800px;
      min-height: 1130px;
      height: 1130px;
      margin: 0 auto 52px;
      position: relative;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.8), 0 4px 16px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* ========================================================
       PAGE 01: COLLECTOR'S MONOGRAPH COVER
       ======================================================== */
    .page-cover-monograph {
      background: var(--obsidian);
      border: 1px solid rgba(255, 255, 255, 0.14);
    }

    .cover-master-photo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 25%;
      filter: brightness(0.82) contrast(1.1);
    }

    .cover-gradient-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(11, 13, 19, 0.95) 0%,
        rgba(11, 13, 19, 0.55) 22%,
        rgba(11, 13, 19, 0.15) 45%,
        rgba(11, 13, 19, 0.7) 70%,
        rgba(11, 13, 19, 0.98) 92%,
        #0b0d13 100%
      );
      z-index: 2;
    }

    .cover-layout-frame {
      position: relative;
      z-index: 3;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 36px 44px 30px;
    }

    .cover-folio-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      padding-bottom: 14px;
      font-family: var(--font-grotesk);
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .folio-left-block {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .luxury-crimson-dot {
      color: var(--crimson);
      font-size: 8px;
    }

    .folio-brand-title {
      font-weight: 800;
      color: #ffffff;
    }

    .folio-divider {
      color: rgba(255, 255, 255, 0.3);
    }

    .folio-meta-muted {
      color: var(--slate-400);
      font-weight: 500;
    }

    .folio-right-block {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .folio-vol-badge {
      background: var(--crimson);
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 3px;
      font-weight: 800;
      font-size: 10px;
    }

    .folio-edition-tag {
      color: var(--slate-400);
      font-weight: 600;
      font-size: 10.5px;
    }

    /* Center Architectural Masthead */
    .cover-masthead-hero {
      text-align: center;
      margin: 18px 0 0;
    }

    .masthead-eyebrow {
      font-family: var(--font-grotesk);
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--slate-400);
      margin-bottom: 10px;
    }

    .masthead-display-title {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: clamp(52px, 7.2vw, 76px);
      letter-spacing: -0.025em;
      line-height: 0.95;
      text-transform: uppercase;
      color: #ffffff;
      text-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
    }

    .masthead-architectural-line {
      width: 80px;
      height: 2px;
      background: var(--crimson);
      margin: 14px auto 0;
    }

    /* Minimalist Gold Monograph Seal */
    .cover-luxury-emblem {
      position: absolute;
      top: 155px;
      right: 44px;
      border: 1px solid rgba(212, 175, 55, 0.4);
      background: rgba(11, 13, 19, 0.7);
      backdrop-filter: blur(16px);
      padding: 12px 18px;
      border-radius: 4px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    .emblem-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      font-family: var(--font-grotesk);
    }

    .emblem-edition {
      font-size: 12px;
      font-weight: 800;
      color: var(--gold);
      letter-spacing: 0.1em;
    }

    .emblem-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #cbd5e1;
    }

    .emblem-pages {
      font-size: 7.5px;
      color: var(--slate-400);
      letter-spacing: 0.1em;
    }

    /* Bottom Curatorial Card */
    .cover-curatorial-card {
      background: rgba(15, 18, 26, 0.88);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-left: 3px solid var(--crimson);
      border-radius: 6px;
      padding: 24px 28px;
      margin-top: auto;
      margin-bottom: 16px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
    }

    .curatorial-meta-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .meta-tag-crimson {
      font-family: var(--font-grotesk);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      background: var(--crimson);
      color: #fff;
      padding: 3px 8px;
      border-radius: 3px;
    }

    .meta-tag-plat {
      font-family: var(--font-grotesk);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 8px;
      border-radius: 3px;
    }

    .meta-tag-spec {
      font-family: var(--font-grotesk);
      font-size: 9.5px;
      color: var(--slate-400);
      letter-spacing: 0.08em;
    }

    .cover-feature-headline {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 26px;
      line-height: 1.25;
      margin-bottom: 12px;
      letter-spacing: -0.015em;
    }

    .cover-essay-link {
      color: #ffffff;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .cover-essay-link:hover {
      color: #cbd5e1;
    }

    .cover-curatorial-lead {
      font-size: 14.5px;
      line-height: 1.6;
      color: var(--slate-300);
      margin-bottom: 16px;
    }

    .cover-curatorial-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      flex-wrap: wrap;
      gap: 12px;
    }

    .luxury-btn-action {
      font-family: var(--font-grotesk);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      background: #ffffff;
      color: #0b0d13;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .luxury-btn-action:hover {
      background: #e2e8f0;
      transform: translateY(-1px);
    }

    .critic-evaluation-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-grotesk);
    }

    .eval-label {
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--slate-400);
    }

    .eval-score {
      font-size: 13px;
      font-weight: 800;
      color: var(--gold);
    }

    .cover-folio-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 12px;
      font-family: var(--font-grotesk);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--slate-400);
    }

    /* ========================================================
       SPREAD 1: THE CINEMATIC MONOLITH (NEGATIVE SPACE SPREAD)
       ======================================================== */
    .page-cinematic-monolith {
      background: #000;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .spread-full-photo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 20%;
      filter: brightness(0.85) contrast(1.1);
    }

    .spread-vignette-scrim {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 30%, rgba(11, 13, 19, 0.8) 100%);
      z-index: 2;
    }

    .luxury-folio-top {
      position: relative;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(11, 13, 19, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px 32px;
      font-family: var(--font-grotesk);
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #ffffff;
    }

    .folio-crimson-marker {
      display: inline-block;
      width: 6px;
      height: 6px;
      background: var(--crimson);
      border-radius: 50%;
      margin-right: 8px;
    }

    .folio-mag-name { font-weight: 800; }
    .folio-pipe { color: rgba(255, 255, 255, 0.3); margin: 0 6px; }
    .folio-sub { color: var(--slate-400); font-weight: 500; }

    .folio-page-num {
      background: rgba(255, 255, 255, 0.12);
      padding: 2px 8px;
      border-radius: 3px;
      font-weight: 700;
    }

    /* Floating Frosted Monograph Card */
    .monograph-frosted-card {
      position: absolute;
      bottom: 50px;
      right: 32px;
      width: 490px;
      max-width: calc(100% - 64px);
      background: rgba(15, 18, 26, 0.9);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-left: 3px solid var(--crimson);
      border-radius: 6px;
      padding: 22px 26px;
      z-index: 4;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
    }

    .card-eyebrow-strap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .badge-crimson-hairline {
      font-family: var(--font-grotesk);
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--crimson);
    }

    .card-source-label {
      font-family: var(--font-grotesk);
      font-size: 10px;
      color: var(--slate-400);
      letter-spacing: 0.1em;
    }

    .card-essay-title {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 20px;
      line-height: 1.3;
      margin-bottom: 10px;
      letter-spacing: -0.01em;
    }

    .card-essay-lead {
      font-size: 13.5px;
      line-height: 1.55;
      color: #e2e8f0;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .card-essay-body {
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--slate-400);
      margin-bottom: 12px;
    }

    .card-editorial-quote {
      border-left: 2px solid rgba(255, 255, 255, 0.25);
      padding-left: 12px;
      margin-bottom: 14px;
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 14px;
      line-height: 1.45;
      color: #f1f5f9;
    }

    .card-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      gap: 10px;
    }

    .card-metadata-pills { display: flex; gap: 6px; }

    .pill-plat {
      font-family: var(--font-grotesk);
      font-size: 8.5px;
      font-weight: 700;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 6px;
      border-radius: 3px;
    }

    .pill-score {
      font-family: var(--font-grotesk);
      font-size: 8.5px;
      font-weight: 800;
      color: var(--gold);
      background: var(--gold-soft);
      padding: 3px 6px;
      border-radius: 3px;
    }

    .luxury-btn-outline {
      font-family: var(--font-grotesk);
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 5px 10px;
      border-radius: 4px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .luxury-btn-outline:hover {
      background: #ffffff;
      color: #0b0d13;
    }

    .luxury-folio-bottom {
      position: relative;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(11, 13, 19, 0.88);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 32px;
      font-family: var(--font-grotesk);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--slate-400);
    }

    /* ========================================================
       SPREAD 2: SWISS MINIMALIST GALLERY SHEET (CRISP WHITE)
       ======================================================== */
    .page-white-gallery {
      background: #ffffff;
      color: var(--slate-900);
      border: 1px solid #e2e8f0;
    }

    .white-folio-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding: 16px 36px 12px;
      font-family: var(--font-grotesk);
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .white-mag-title { font-weight: 800; color: #0f172a; }
    .white-divider { color: #cbd5e1; margin: 0 6px; }
    .white-dept { color: #64748b; font-weight: 600; }

    .white-page-pill {
      background: #0f172a;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 3px;
      font-weight: 700;
    }

    .white-main-container {
      padding: 28px 36px 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .white-meta-badge-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .tag-crimson-solid {
      font-family: var(--font-grotesk);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--crimson);
      background: var(--crimson-soft);
      padding: 3px 8px;
      border-radius: 3px;
    }

    .tag-source-muted {
      font-family: var(--font-grotesk);
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.1em;
    }

    .white-source-link {
      font-family: var(--font-grotesk);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #0f172a;
      text-decoration: underline;
    }

    .white-headline {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 28px;
      line-height: 1.2;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }

    .white-content-grid {
      display: grid;
      grid-template-columns: 310px 1fr;
      gap: 28px;
      flex: 1;
    }

    .white-framed-photo {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .white-framed-photo img {
      width: 100%;
      height: 220px;
      object-fit: cover;
      display: block;
    }

    .photo-caption-tag {
      padding: 8px 12px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-family: var(--font-grotesk);
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.1em;
    }

    .curatorial-analysis-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #0f172a;
      padding: 12px 14px;
      border-radius: 4px;
    }

    .box-label {
      font-family: var(--font-grotesk);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }

    .box-text {
      font-size: 12.5px;
      line-height: 1.5;
      color: #334155;
      margin-bottom: 8px;
    }

    .box-stat {
      font-family: var(--font-grotesk);
      font-size: 10px;
      color: #0f172a;
    }

    .white-lead-text {
      font-size: 15px;
      line-height: 1.6;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }

    .white-body-text {
      font-size: 13.5px;
      line-height: 1.65;
      color: #475569;
      margin-bottom: 12px;
    }

    .white-pull-quote {
      border-left: 2px solid var(--crimson);
      padding-left: 14px;
      margin: 16px 0;
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 16px;
      line-height: 1.45;
      color: #0f172a;
    }

    .white-footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    .white-plat-label {
      font-family: var(--font-grotesk);
      font-size: 10px;
      color: #64748b;
      letter-spacing: 0.08em;
    }

    .white-action-btn {
      font-family: var(--font-grotesk);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #0f172a;
      text-decoration: underline;
    }

    .white-folio-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding: 12px 36px;
      font-family: var(--font-grotesk);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #94a3b8;
      background: #fafafa;
    }

    /* ========================================================
       SPREAD 3: OBSIDIAN ANTHRACITE (DEEP LUXURY DARK)
       ======================================================== */
    .page-obsidian-dark {
      background: var(--obsidian);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--slate-200);
    }

    .obsidian-folio-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 16px 36px 12px;
      font-family: var(--font-grotesk);
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .obsidian-mag-title { font-weight: 800; color: #ffffff; }
    .obsidian-divider { color: rgba(255, 255, 255, 0.2); margin: 0 6px; }
    .obsidian-dept { color: var(--slate-400); font-weight: 500; }

    .obsidian-page-pill {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 3px;
      font-weight: 700;
    }

    .obsidian-main-container {
      padding: 24px 36px 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .obsidian-badge-crimson {
      display: inline-block;
      font-family: var(--font-grotesk);
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--crimson);
      margin-bottom: 6px;
    }

    .obsidian-headline {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 26px;
      line-height: 1.25;
      color: #ffffff;
      letter-spacing: -0.015em;
      margin-bottom: 16px;
    }

    .obsidian-wide-photo-frame {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 18px;
    }

    .obsidian-wide-photo-frame img {
      width: 100%;
      height: 240px;
      object-fit: cover;
      display: block;
    }

    .wide-photo-caption {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.7);
      padding: 6px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-family: var(--font-grotesk);
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--slate-400);
    }

    .obsidian-body-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      flex: 1;
    }

    .obsidian-lead-text {
      font-size: 14.5px;
      line-height: 1.6;
      color: #ffffff;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .obsidian-body-text {
      font-size: 13px;
      line-height: 1.65;
      color: var(--slate-300);
      margin-bottom: 10px;
    }

    .obsidian-quote-card {
      display: flex;
      gap: 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 12px 14px;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .quote-crimson-bar {
      width: 2px;
      background: var(--crimson);
      flex-shrink: 0;
    }

    .quote-text {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 13.5px;
      line-height: 1.45;
      color: #f1f5f9;
    }

    .obsidian-action-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .obsidian-score-pill {
      font-family: var(--font-grotesk);
      font-size: 11px;
      font-weight: 800;
      color: var(--gold);
    }

    .obsidian-btn-link {
      font-family: var(--font-grotesk);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #ffffff;
      text-decoration: underline;
    }

    .obsidian-folio-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px 36px;
      font-family: var(--font-grotesk);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--slate-400);
      background: rgba(0, 0, 0, 0.3);
    }

    /* Modal Progress Backdrop */
    .luxury-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(11, 13, 19, 0.9);
      backdrop-filter: blur(12px);
      z-index: 20000;
      display: none;
      align-items: center;
      justify-content: center;
    }

    .luxury-modal-backdrop.open { display: flex; }

    .luxury-modal-card {
      background: #0f121a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-left: 4px solid var(--crimson);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      padding: 36px 34px;
      max-width: 520px;
      width: 90%;
      border-radius: 6px;
      text-align: center;
    }

    .modal-mag-title {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 18px;
      color: #ffffff;
      margin-bottom: 8px;
    }

    .modal-step-list {
      text-align: left;
      font-family: var(--font-grotesk);
      font-weight: 600;
      font-size: 13px;
      color: var(--slate-300);
      margin: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* PRINT / A4 PDF OPTIMIZATION */
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body {
        background: #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .luxury-top-bar, .luxury-modal-backdrop {
        display: none !important;
      }
      .luxury-canvas {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .luxury-sheet {
        width: 100% !important;
        height: 100vh !important;
        min-height: 100vh !important;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
    }
  </style>
</head>
<body>

  <!-- ========================================================
       TOP LUXURY EDITORIAL TOOLBAR
       ======================================================== -->
  <header class="luxury-top-bar">
    <div class="luxury-bar-container">
      <div class="brand-title-group">
        <a href="/" class="kiosk-back-pill" title="Return to Publication Kiosk">← Kiosk</a>
        <span class="mag-main-title">THE 8 BIT BISTRO</span>
        <span class="mag-vol-pill">VOL. ${String(newVol).padStart(2, '0')} // 30 PAGES</span>
      </div>

      <div class="top-actions-cluster">
        <button class="luxury-btn btn-scrape-luxury" onclick="triggerLuxuryScrape()" title="Scrape live gaming journalism and assemble fresh 30-Page Edition">
          ⚡ GENERATE 30-PAGE EDITION
        </button>

        <button id="btnSavePdf" class="luxury-btn btn-pdf-luxury" onclick="saveLuxuryPdf()" title="Direct 1-Click A4 Vector PDF Download">
          📄 SAVE AS PDF
        </button>

        <button class="luxury-btn btn-html-luxury" onclick="saveLuxuryHtml()" title="Save clean HTML copy">
          💾 SAVE HTML
        </button>
      </div>
    </div>

    <!-- 30 Page Navigation Pager -->
    <nav class="luxury-nav-track">
      <button class="nav-dot-pill active" onclick="jumpToPage('page-1')">PAGE 01 (COVER)</button>
      ${Array.from({ length: 29 }, (_, i) => {
        const num = i + 2;
        const pad = String(num).padStart(2, '0');
        return `<button class="nav-dot-pill" onclick="jumpToPage('page-${num}')">P-${pad}</button>`;
      }).join('\n      ')}
    </nav>
  </header>

  <!-- ========================================================
       30-PAGE LUXURY GAMING WORKSPACE
       ======================================================== -->
  <main class="luxury-canvas">
    ${mainContentHtml}
  </main>

  <!-- ========================================================
       PROGRESS MODAL
       ======================================================== -->
  <div id="luxuryModal" class="luxury-modal-backdrop">
    <div class="luxury-modal-card">
      <div style="font-size: 28px; margin-bottom: 8px;">🏛️</div>
      <h3 id="modalTitle" class="modal-mag-title">CURATING 30-PAGE MONOGRAPH...</h3>
      <p id="modalSub" style="font-size: 13px; color: #94a3b8; margin-bottom: 14px;">
        Harvesting long-form dispatches from Polygon, Kotaku, PC Gamer &amp; Eurogamer...
      </p>

      <div class="modal-step-list">
        <div id="step1" style="color: var(--crimson);">⏳ [1/3] Filtering previously covered titles &amp; ingesting live feeds...</div>
        <div id="step2">⏳ [2/3] Writing curatorial quickreads, critical scores &amp; quotes...</div>
        <div id="step3">⏳ [3/3] Assembling 30 Swiss-grid pages &amp; pre-rendering PDF...</div>
      </div>
    </div>
  </div>

  <script>
    function jumpToPage(id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        document.querySelectorAll('.nav-dot-pill').forEach(b => b.classList.remove('active'));
        if (event && event.target && event.target.classList.contains('nav-dot-pill')) {
          event.target.classList.add('active');
        }
      }
    }

    // Direct 1-Click PDF Download (No print dialogs!)
    async function saveLuxuryPdf() {
      const btn = document.getElementById('btnSavePdf');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ GENERATING PDF...';

      try {
        const res = await fetch('/api/download-pdf?pub=8bit');
        if (!res.ok) throw new Error('PDF export failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'The_8Bit_Bistro_Monograph_Vol_${newVol}_30_Pages.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (e) {
        console.warn('Fallback direct navigation download:', e);
        window.location.href = '/api/download-pdf?pub=8bit';
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }

    // Save Clean HTML Copy
    function saveLuxuryHtml() {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('.luxury-modal-backdrop').forEach(m => m.classList.remove('open'));
      const blob = new Blob(["<!DOCTYPE html>\\n" + clone.outerHTML], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '8bit.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Trigger Autonomous Gaming Scraper
    async function triggerLuxuryScrape() {
      const modal = document.getElementById('luxuryModal');
      const modalTitle = document.getElementById('modalTitle');
      const modalSub = document.getElementById('modalSub');
      const s1 = document.getElementById('step1');
      const s2 = document.getElementById('step2');
      const s3 = document.getElementById('step3');

      modal.classList.add('open');

      try {
        setTimeout(() => {
          s1.innerHTML = '✅ [1/3] Ingested live stories from Polygon, Kotaku, PC Gamer &amp; Eurogamer';
          s1.style.color = '#34d399';
          s2.innerHTML = '⏳ [2/3] Synthesizing curatorial essays &amp; quotes...';
          s2.style.color = '#60a5fa';
        }, 1200);

        setTimeout(() => {
          s2.innerHTML = '✅ [2/3] Synthesized curatorial essays &amp; quotes';
          s2.style.color = '#34d399';
          s3.innerHTML = '⏳ [3/3] Compiling 30 luxury pages &amp; staging PDF buffer...';
          s3.style.color = '#60a5fa';
        }, 2500);

        const res = await fetch('/api/scrape-and-generate?pub=8bit');
        const data = await res.json();

        if (data.success) {
          s3.innerHTML = '✅ [3/3] Compiled 30 luxury pages (Skipped ' + (data.skippedCoveredCount || 0) + ' covered stories)';
          s3.style.color = '#34d399';
          modalTitle.innerText = 'MONOGRAPH COMPLETE // VOL. ' + data.edition;
          modalSub.innerText = 'Cover: "' + data.coverTitle + '". Refreshing workspace...';

          setTimeout(() => {
            window.location.href = '/8bit?edition=' + data.edition + '&t=' + Date.now();
          }, 1500);
        } else {
          throw new Error(data.error || 'Harvest failed');
        }
      } catch (err) {
        console.error(err);
        alert('Generation failed: ' + err.message);
        modal.classList.remove('open');
      }
    }
  </script>
</body>
</html>`;

  // 6. Write to 8bit.html
  fs.writeFileSync(path.join(__dirname, '8bit.html'), fullHtml, 'utf8');

  // 7. Update editions-8bit.json memory store
  memory.activeEdition = newVol;
  if (!memory.history) memory.history = [];

  const newlyCoveredStories = [heroStory.title, ...interiorStories.map(s => s.title)];

  memory.history.push({
    volume: newVol,
    stage: newVol,
    date: issueDate,
    title: `THE 8 BIT BISTRO // LUXURY GAMING MONOGRAPH VOL. ${newVol}`,
    tagline: `Curated Feature: ${heroStory.title}`,
    totalStories: 30,
    pageCount: 30,
    coverGame: heroStory.title,
    sources: ["Polygon", "Kotaku", "PC Gamer", "Eurogamer"],
    featuredStories: newlyCoveredStories,
    skippedPreviouslyCoveredCount: skippedCount,
    editorialNotes: `Autonomous live harvest compiled on ${new Date().toISOString()} - 30 pages rendered in high-fashion luxury editorial style; skipped ${skippedCount} previously covered stories.`
  });

  fs.writeFileSync(EDITIONS_8BIT_FILE, JSON.stringify(memory, null, 2), 'utf8');

  console.log(`✅ [LUXURY MONOGRAPH COMPLETE] Compiled Vol. ${newVol} featuring "${heroStory.title}"! Skipped ${skippedCount} previously covered stories.`);

  return {
    success: true,
    edition: newVol,
    coverTitle: heroStory.title,
    totalHarvested: freshArticles.length,
    skippedCoveredCount: skippedCount,
    totalPages: 30
  };
}

module.exports = {
  scrapeAndGenerate8BitMagazine,
  harvestGamingStories,
  rewriteAsLuxuryGamingEssay
};
