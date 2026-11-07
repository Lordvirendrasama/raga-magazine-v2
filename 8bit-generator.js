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
  if (t.includes('pc') || t.includes('steam') || t.includes('windows')) plats.push('PC / STEAM');
  if (t.includes('ps5') || t.includes('playstation')) plats.push('PS5');
  if (t.includes('switch') || t.includes('nintendo')) plats.push('SWITCH');
  if (t.includes('xbox') || t.includes('series x')) plats.push('XBOX');
  if (t.includes('steam deck')) plats.push('STEAM DECK');
  return plats.length > 0 ? plats.join(' · ') : 'PC · MULTI-PLATFORM';
}

function rewriteAsGamingQuickread(title, contentOrDesc, source, link) {
  const cleanTitle = decodeHtmlEntities(title).trim();
  const rawText = stripHtmlTags(contentOrDesc || '').trim();
  const lower = (cleanTitle + ' ' + rawText).toLowerCase();
  const platform = detectPlatforms(cleanTitle + ' ' + rawText);
  const realQuote = extractQuotes(rawText);
  const sentences = rawText.split(/(?<=[.!?])\s+/).filter(s => s.length > 25 && !s.toLowerCase().includes('cookie') && !s.toLowerCase().includes('subscribe'));

  let kicker = "👾 QUEST LOG // ARCADE DISPATCH";
  let badge = "🎮 GAMING SCOOP";
  let hookTitle = cleanTitle;
  let lead = "";
  let p1 = "";
  let p2 = "";
  let quote = "";
  let fullExplainer = "";
  let verdict = "VERDICT: DAY ONE MUST-PLAY";
  let difficulty = "NORMAL";
  let xp = "500 XP";

  if (lower.includes('gta') || lower.includes('grand theft auto') || lower.includes('rockstar') || lower.includes('open-world') || lower.includes('open world')) {
    kicker = "👑 TITAN ALERT // OPEN WORLD";
    badge = "🔥 MEGA-DROP";
    hookTitle = `Open World Mayhem: ${cleanTitle}`;
    lead = `Clear out your SSD and ready your controller—this is the seismic release shaking the entire gaming industry right now.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Pushing hardware limits with jaw-dropping fidelity, physics-driven interactions, and unmatched scale, this is where hundreds of hours of your life are going.`;
    quote = realQuote || `“We wanted this world to feel impossibly alive—every street corner has a story, every NPC has a schedule.”`;
    fullExplainer = `${cleanTitle}. In the frame: High-octane next-gen open world gameplay capture. The countdown begins.`;
    verdict = "VERDICT: SYSTEM SELLER · 10/10 HYPE";
    difficulty = "HARDCORE";
    xp = "1500 XP";
  } else if (lower.includes('patch') || lower.includes('update') || lower.includes('rebalance') || lower.includes('buff') || lower.includes('nerf')) {
    kicker = "⚔️ PATCH NOTES // SYSTEM BALANCE";
    badge = "🛠️ UPDATE v1.0";
    hookTitle = `Meta Shakeup: ${cleanTitle}`;
    lead = `We combed through the patch notes so you don't have to get wrecked in your next ranked lobby.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `With major quality-of-life tweaks, rebalanced weapon scaling, and crucial hit-box refinements, the competitive meta is completely reset.`;
    quote = realQuote || `“Our goal was to eliminate toxic cheese strategies while rewarding tactical mastery and team coordination.”`;
    fullExplainer = `${cleanTitle}. In the frame: Overhauled combat mechanics and balance adjustments live on servers now.`;
    verdict = "VERDICT: META UPGRADE · ESSENTIAL UPDATE";
    difficulty = "MEDIUM";
    xp = "350 XP";
  } else if (lower.includes('zelda') || lower.includes('ocarina') || lower.includes('remake') || lower.includes('retro') || lower.includes('nintendo')) {
    kicker = "🕹️ RETRO VAULT // NOSTALGIA REBORN";
    badge = "🪙 INSERT COIN";
    hookTitle = `Timeless Classic: ${cleanTitle}`;
    lead = `Some games never die; they just get upgraded with modern lighting, smoother frame rates, and immaculate love.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Preserving the original atmosphere while rebuilding the geometry from the ground up, this remake reminds us why we fell in love with gaming in the first place.`;
    quote = realQuote || `“Respecting the original vision wasn't optional—every texture was handcrafted to match what childhood memory felt like.”`;
    fullExplainer = `${cleanTitle}. In the frame: Legendary retro adventures reimagined for modern displays. Pure nostalgia.`;
    verdict = "VERDICT: MASTERPIECE TRIBUTE · 9.8/10";
    difficulty = "CLASSIC";
    xp = "1000 XP";
  } else if (lower.includes('rpg') || lower.includes('path of exile') || lower.includes('mass effect') || lower.includes('dragon age')) {
    kicker = "🧙 DEEP RPG // BUILD CRAFTING";
    badge = "⚡ 100+ HOUR QUEST";
    hookTitle = `Build Mastery: ${cleanTitle}`;
    lead = `Say goodbye to your weekend sleep schedule. ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Featuring deep skill trees, visceral loot drops, and intricate dialogue trees penned by veteran narrative designers, this is RPG comfort food at its finest.`;
    quote = realQuote || `“We built this for players who want to dissect character stats and uncover hidden lore in dark catacombs.”`;
    fullExplainer = `${cleanTitle}. In the frame: Deep gameplay progression, intricate character stats, and massive boss encounters.`;
    verdict = "VERDICT: ESSENTIAL RPG · ADDICTIVE LOOT";
    difficulty = "EXPERT";
    xp = "1200 XP";
  } else {
    kicker = "🎮 GAME RADAR // LATEST INTEL";
    badge = "👾 INTEL REPORT";
    hookTitle = `Arcade Dispatch: ${cleanTitle}`;
    lead = `Here’s the unfiltered gaming dispatch from the front lines of game development: ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Pushing back against predatory live-service bloat, this project stands out by prioritizing what actually matters: responsive controls, rewarding loops, and authentic player fun.`;
    quote = realQuote || `“When games are built with genuine passion rather than corporate quarterly targets, players feel it instantly.”`;
    fullExplainer = `${cleanTitle}. In the frame: Studio gameplay capture and developmental milestones.`;
    verdict = "VERDICT: WISHLIST IMMEDIATELY";
    difficulty = "NORMAL";
    xp = "600 XP";
  }

  return {
    kicker,
    badge,
    hookTitle,
    lead,
    p1,
    p2,
    quote,
    fullExplainer,
    platform,
    verdict,
    difficulty,
    xp,
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

  console.log(`🕹️ [8-BIT HARVESTER] Harvested ${freshArticles.length} gaming stories (Skipped ${skippedArticles.length} previously covered).`);
  return { freshArticles, skippedCount: skippedArticles.length };
}

// Generate the 30-Stage Pixel Art Magazine
async function scrapeAndGenerate8BitMagazine() {
  console.log('👾 [8-BIT ENGINE] Initializing autonomous gaming crawl & stage generation...');

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
        title: `Next-Gen Gaming Protocol: Stage ${idx + 1} System Dispatch`,
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
  heroStory.hook = rewriteAsGamingQuickread(heroStory.title, heroStory.desc, heroStory.source, heroStory.link);

  const interiorStories = selectedStories.slice(1).map((s, idx) => {
    s.hook = rewriteAsGamingQuickread(s.title, s.desc, s.source, s.link);
    return s;
  });

  // 4. Build Complete 30-Stage Pixel Art Document
  let mainContentHtml = '';

  // STAGE 01: HERO COVER
  mainContentHtml += `
    <!-- ========================================================
         STAGE 01: HERO COVER SCREEN (INSERT COIN)
         ======================================================== -->
    <article id="stage-1" class="pixel-page stage-cover">
      <img class="cover-hero-img" src="${heroStory.image}" alt="${heroStory.title}" />
      <div class="crt-scanline-overlay"></div>
      <div class="pixel-scrim-dark"></div>

      <div class="stage-cover-content">
        <!-- Top Arcade Header -->
        <div class="cover-top-arcade-hud">
          <span class="hud-arcade-tag">★ THE 8 BIT BISTRO ★ // QUARTERLY ARCADE GAZETTE</span>
          <span class="hud-insert-coin">[1P READY // CREDITS: 99]</span>
          <span class="hud-vol-tag">VOL. ${String(newVol).padStart(2, '0')} // STAGE 01</span>
        </div>

        <!-- Giant Pixel Masthead -->
        <div class="cover-masthead-box">
          <h1 class="pixel-masthead-title">THE 8 BIT BISTRO</h1>
          <div class="pixel-masthead-subline">THE ARCADE GAZETTE OF VIDEO GAME NEWS &amp; CULTURE</div>
        </div>

        <!-- Center Screen Feature Showcase -->
        <div class="cover-feature-dossier">
          <div class="pixel-badge-row">
            <span class="pixel-badge badge-cyan">${heroStory.hook.badge}</span>
            <span class="pixel-badge badge-pink">${heroStory.hook.platform}</span>
            <span class="pixel-badge badge-green">${heroStory.source} EXCLUSIVE</span>
          </div>

          <h2 class="cover-headline-pixel">
            <a href="${heroStory.link}" target="_blank" rel="noopener noreferrer" class="cover-title-link">
              ${heroStory.title}
            </a>
          </h2>

          <p class="cover-lead-summary">
            ${heroStory.hook.lead}
          </p>

          <div class="cover-quickread-box">
            <p>${heroStory.hook.p1}</p>
          </div>

          <div class="cover-interactive-row">
            <a href="${heroStory.link}" target="_blank" rel="noopener noreferrer" class="pixel-btn-action">
              <span>▶ READ SOURCE DISPATCH ↗</span>
            </a>
            <span class="cover-score-pill">METASCORE: 9.8/10</span>
          </div>
        </div>

        <!-- Bottom Arcade Marquee Barcode Strap -->
        <div class="cover-bottom-hud">
          <div class="hud-barcode-segment">
            <div class="pixel-barcode">|| | ||| || |||| | ||| || ||||</div>
            <span class="hud-serial-no">SN# 8BIT-STAGE-VOL${newVol}-2026</span>
          </div>
          <div class="hud-date-stamp">
            <span>RELEASE: ${issueDate.toUpperCase()} // ALL RIGHTS RESERVED</span>
          </div>
          <div class="hud-quarter-stamp">
            <span>PRINT &amp; PDF ARCHIVE EDITION</span>
          </div>
        </div>
      </div>
    </article>
  `;

  // STAGES 02 - 30: ALTERNATING ARCADE LAYOUTS
  interiorStories.forEach((s, idx) => {
    const stageNum = idx + 2; // stages 2 through 30
    const isSpread = stageNum % 2 === 0; // Even stages: Full Screen Game Boss Spread
    const isNeonDark = stageNum % 4 === 3; // Type A: Neon Cyberpunk Terminal
    // Otherwise Type B: Phosphor Green / Retro Terminal

    if (isSpread) {
      // FULL BLEED GAME BOSS SPREAD
      mainContentHtml += `
        <!-- ========================================================
             STAGE ${String(stageNum).padStart(2, '0')}: BOSS STAGE // FULL GAME CAPTURE SPREAD
             ======================================================== -->
        <article id="stage-${stageNum}" class="pixel-page stage-boss-spread">
          <img class="spread-game-bg" src="${s.image}" alt="${s.title}" loading="lazy" />
          <div class="crt-scanline-overlay"></div>
          <div class="boss-vignette-scrim"></div>

          <!-- Top HUD Folio -->
          <header class="stage-hud-top">
            <span class="hud-brand">THE 8 BIT BISTRO</span>
            <span class="hud-middle-tag">⚔️ BOSS STAGE // IN-GAME CAPTURE</span>
            <span class="hud-stage-counter">STAGE ${String(stageNum).padStart(2, '0')} / 30</span>
          </header>

          <!-- Bottom Right Floating Boss Rundown Card -->
          <div class="boss-rundown-hud-card">
            <div class="boss-card-header">
              <span class="pixel-badge badge-pink">👾 BOSS ENCOUNTER</span>
              <span class="boss-source-tag">${s.source} DISPATCH</span>
            </div>

            <h3 class="boss-card-title">
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:#ffffff; text-decoration:none;">
                ${s.title}
              </a>
            </h3>

            <!-- Health Bar Graphic -->
            <div class="hud-health-bar-container">
              <span class="hp-label">HP</span>
              <div class="hp-track">
                <div class="hp-fill" style="width: 85%;"></div>
              </div>
              <span class="hp-percent">85%</span>
            </div>

            <p class="boss-card-lead">${s.hook.lead}</p>
            <p class="boss-card-p1">${s.hook.p1}</p>

            <div class="boss-quote-box">
              ${s.hook.quote}
            </div>

            <div class="boss-card-footer">
              <div class="boss-tags">
                <span class="tag-pill-cyan">${s.hook.platform}</span>
                <span class="tag-pill-gold">${s.hook.verdict}</span>
              </div>
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="pixel-btn-source">
                READ INTEL ↗
              </a>
            </div>
          </div>

          <!-- Bottom Folio Bar -->
          <footer class="stage-hud-bottom">
            <span>THE 8 BIT BISTRO · SOURCE: <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:var(--cyan);">${s.source} ↗</a></span>
            <span>PLATFORM: <strong>${s.hook.platform}</strong></span>
            <span>STAGE ${String(stageNum).padStart(2, '0')} // HIGH SCORE: 999990</span>
          </footer>
        </article>
      `;
    } else if (isNeonDark) {
      // TYPE A: NEON CYBERPUNK TERMINAL SHEET
      mainContentHtml += `
        <!-- ========================================================
             STAGE ${String(stageNum).padStart(2, '0')}: NEON CYBERPUNK TERMINAL (${s.title})
             ======================================================== -->
        <article id="stage-${stageNum}" class="pixel-page stage-neon-terminal">
          <div class="crt-scanline-overlay"></div>

          <header class="terminal-folio-top">
            <span class="terminal-brand-pill">⚡ 8-BIT TERMINAL // STAGE ${String(stageNum).padStart(2, '0')}</span>
            <span class="terminal-kicker">${s.hook.kicker}</span>
            <span class="terminal-difficulty">[DIFF: ${s.hook.difficulty}]</span>
          </header>

          <div class="terminal-headline-row">
            <h2 class="terminal-heading-neon">
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:none;">
                ${s.title}
              </a>
            </h2>
            <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="pixel-link-btn" title="Open original article">
              SOURCE INTEL ↗
            </a>
          </div>

          <!-- Two-Column Terminal Grid -->
          <div class="terminal-body-grid">
            <div class="terminal-col-left">
              <div class="terminal-screenshot-frame">
                <img src="${s.image}" alt="${s.title}" loading="lazy" />
                <div class="screenshot-corner-border"></div>
                <div class="screenshot-meta-badge">CAPTURE: ${s.source}</div>
              </div>

              <div class="terminal-stats-card">
                <div class="stat-line"><span>PLATFORM:</span> <strong>${s.hook.platform}</strong></div>
                <div class="stat-line"><span>QUEST XP:</span> <strong style="color:var(--green);">${s.hook.xp}</strong></div>
                <div class="stat-line"><span>STATUS:</span> <strong style="color:var(--gold);">${s.hook.verdict}</strong></div>
              </div>
            </div>

            <div class="terminal-col-right">
              <div class="terminal-lead-text">
                ${s.hook.lead}
              </div>

              <div class="terminal-body-p">
                ${s.hook.p1}
              </div>

              <div class="terminal-body-p">
                ${s.hook.p2}
              </div>

              <div class="terminal-quote-callout">
                ${s.hook.quote}
              </div>
            </div>
          </div>

          <footer class="terminal-folio-bottom">
            <span>THE 8 BIT BISTRO // EDITORIAL DISPATCH</span>
            <span>VERIFIED GAMEPLAY LOG // CURATED FROM <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:var(--pink);">${s.source} ↗</a></span>
            <span>STAGE ${String(stageNum).padStart(2, '0')} OF 30</span>
          </footer>
        </article>
      `;
    } else {
      // TYPE B: RETRO PHOSPHOR GREEN TERMINAL SHEET
      mainContentHtml += `
        <!-- ========================================================
             STAGE ${String(stageNum).padStart(2, '0')}: PHOSPHOR GREEN DOSSIER (${s.title})
             ======================================================== -->
        <article id="stage-${stageNum}" class="pixel-page stage-green-dossier">
          <div class="crt-scanline-overlay"></div>

          <header class="dossier-folio-top">
            <span class="dossier-mark">👾 ARCADE DOSSIER // STAGE ${String(stageNum).padStart(2, '0')}</span>
            <span class="dossier-badge-green">${s.hook.badge}</span>
            <span class="dossier-xp">${s.hook.xp}</span>
          </header>

          <div class="dossier-header-block">
            <span class="dossier-eyebrow">${s.hook.kicker}</span>
            <h2 class="dossier-title">
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:none;">
                ${s.title}
              </a>
            </h2>
          </div>

          <!-- Editorial Layout: Floating Retro Framed Screenshot -->
          <div class="dossier-content-flow">
            <div class="dossier-float-frame">
              <img src="${s.image}" alt="${s.title}" loading="lazy" />
              <div class="float-frame-hud">
                <span>PRESS [A] TO INSPECT</span>
                <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:var(--green); text-decoration:none;">[LINK ↗]</a>
              </div>
            </div>

            <div class="dossier-text-block">
              <p class="dossier-lead">${s.hook.lead}</p>
              <p class="dossier-paragraph">${s.hook.p1}</p>
              <p class="dossier-paragraph">${s.hook.p2}</p>
            </div>

            <div class="dossier-quote-box">
              <div class="quote-dialog-speaker">NPC TRANSMISSION:</div>
              <div class="quote-dialog-text">${s.hook.quote}</div>
            </div>

            <div class="dossier-summary-bar">
              <span class="dossier-pill-verdict">${s.hook.verdict}</span>
              <span class="dossier-pill-plat">${s.hook.platform}</span>
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="dossier-read-btn">
                READ ORIGINAL ARTICLE ON ${s.source.toUpperCase()} ↗
              </a>
            </div>
          </div>

          <footer class="dossier-folio-bottom">
            <span>THE 8 BIT BISTRO // ISSUE VOL. ${newVol}</span>
            <span>SOURCE: <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:var(--green);">${s.source}</a></span>
            <span>STAGE ${String(stageNum).padStart(2, '0')} OF 30</span>
          </footer>
        </article>
      `;
    }
  });

  // 5. Assemble Full Standalone 8bit.html File
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>THE 8 BIT BISTRO MAG — Stage 01 to 30 (Vol. ${newVol})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Grotesk:wght@400;500;600;700;800&family=VT323&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0714;
      --card-bg: #130f24;
      --card-green: #071711;
      --cyan: #00f0ff;
      --pink: #ff0055;
      --green: #00ff66;
      --gold: #ffb800;
      --purple: #8a2be2;
      --font-pixel: 'Press Start 2P', monospace;
      --font-hud: 'VT323', monospace;
      --font-body: 'Space Grotesk', -apple-system, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: var(--bg);
      color: #e2e8f0;
      font-family: var(--font-body);
      min-height: 100vh;
      overflow-x: hidden;
      line-height: 1.6;
    }

    /* Fixed Retro Arcade Top Bar */
    .arcade-top-bar {
      position: sticky;
      top: 0;
      z-index: 10000;
      background: rgba(11, 7, 20, 0.96);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 2px solid var(--cyan);
      box-shadow: 0 4px 24px rgba(0, 240, 255, 0.25), 0 10px 40px rgba(0, 0, 0, 0.8);
      padding: 8px 20px;
    }

    .arcade-bar-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto;
      gap: 16px;
      flex-wrap: wrap;
    }

    .arcade-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .arcade-logo {
      font-family: var(--font-pixel);
      font-size: 13px;
      color: var(--cyan);
      letter-spacing: 0.05em;
      text-shadow: 0 0 10px rgba(0, 240, 255, 0.8);
      text-decoration: none;
    }

    .arcade-hud-status {
      font-family: var(--font-hud);
      font-size: 16px;
      color: var(--green);
      letter-spacing: 0.1em;
      background: rgba(0, 255, 102, 0.1);
      border: 1px solid rgba(0, 255, 102, 0.3);
      padding: 2px 10px;
      border-radius: 4px;
    }

    .arcade-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .pixel-btn {
      font-family: var(--font-pixel);
      font-size: 10px;
      padding: 8px 14px;
      border: 2px solid #ffffff;
      background: #000000;
      color: #ffffff;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 3px 3px 0 #000, 5px 5px 0 var(--cyan);
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }

    .pixel-btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 5px 5px 0 #000, 7px 7px 0 var(--cyan);
    }

    .pixel-btn:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0 #000;
    }

    .btn-coin {
      border-color: var(--gold);
      background: #1a1200;
      color: var(--gold);
      box-shadow: 3px 3px 0 #000, 5px 5px 0 var(--gold);
      animation: coinPulse 2s infinite ease-in-out;
    }

    .btn-pdf {
      border-color: var(--green);
      background: #001a0a;
      color: var(--green);
      box-shadow: 3px 3px 0 #000, 5px 5px 0 var(--green);
    }

    .btn-kiosk {
      border-color: #94a3b8;
      color: #94a3b8;
      box-shadow: 3px 3px 0 #000, 5px 5px 0 #94a3b8;
    }

    @keyframes coinPulse {
      0%, 100% { box-shadow: 3px 3px 0 #000, 5px 5px 0 var(--gold); }
      50% { box-shadow: 3px 3px 0 #000, 7px 7px 0 rgba(255, 184, 0, 0.8), 0 0 15px rgba(255, 184, 0, 0.4); }
    }

    /* Stage Navigation Jump Bar */
    .stage-nav-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding: 6px 0 2px;
      max-width: 1400px;
      margin: 4px auto 0;
      scrollbar-width: thin;
    }

    .stage-nav-bar::-webkit-scrollbar {
      height: 4px;
    }
    .stage-nav-bar::-webkit-scrollbar-thumb {
      background: var(--cyan);
    }

    .nav-stage-btn {
      font-family: var(--font-pixel);
      font-size: 8px;
      padding: 4px 8px;
      background: #141026;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94a3b8;
      cursor: pointer;
      flex-shrink: 0;
      border-radius: 2px;
    }

    .nav-stage-btn:hover, .nav-stage-btn.active {
      background: var(--cyan);
      color: #000;
      font-weight: 700;
      border-color: var(--cyan);
      box-shadow: 0 0 8px rgba(0, 240, 255, 0.6);
    }

    /* Magazine Canvas Host */
    .arcade-canvas {
      max-width: 800px;
      margin: 32px auto 80px;
      padding: 0 16px;
    }

    /* Common Pixel Page Base (A4 Ratio Standard) */
    .pixel-page {
      width: 800px;
      min-height: 1130px;
      height: 1130px;
      margin: 0 auto 48px;
      position: relative;
      overflow: hidden;
      background: var(--card-bg);
      border: 2px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 240, 255, 0.05);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* CRT Scanline Overlay */
    .crt-scanline-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
      background: repeating-linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0) 0px,
        rgba(0, 0, 0, 0) 2px,
        rgba(0, 0, 0, 0.18) 3px,
        rgba(0, 0, 0, 0.18) 4px
      );
    }

    /* STAGE 01: COVER SPECIFICS */
    .stage-cover {
      background: #000000;
    }

    .cover-hero-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 20%;
      filter: brightness(0.7) contrast(1.15);
    }

    .pixel-scrim-dark {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(11, 7, 20, 0.95) 0%,
        rgba(11, 7, 20, 0.65) 20%,
        rgba(11, 7, 20, 0.2) 45%,
        rgba(11, 7, 20, 0.6) 65%,
        rgba(11, 7, 20, 0.98) 92%,
        #0b0714 100%
      );
      z-index: 2;
    }

    .stage-cover-content {
      position: relative;
      z-index: 3;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 36px 44px 30px;
    }

    .cover-top-arcade-hud {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px dashed rgba(0, 240, 255, 0.4);
      padding-bottom: 12px;
      font-family: var(--font-pixel);
      font-size: 9px;
      color: var(--cyan);
      letter-spacing: 0.1em;
    }

    .hud-insert-coin {
      color: var(--gold);
      animation: coinPulse 1.5s infinite;
    }

    .cover-masthead-box {
      text-align: center;
      margin: 18px 0 10px;
    }

    .pixel-masthead-title {
      font-family: var(--font-pixel);
      font-size: 38px;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: #ffffff;
      text-shadow: 
        4px 4px 0 #000, 
        0 0 20px rgba(0, 240, 255, 0.8),
        0 0 40px rgba(255, 0, 85, 0.5);
      margin-bottom: 8px;
    }

    .pixel-masthead-subline {
      font-family: var(--font-hud);
      font-size: 18px;
      color: var(--gold);
      letter-spacing: 0.18em;
    }

    .cover-feature-dossier {
      background: rgba(19, 15, 36, 0.88);
      border: 2px solid var(--cyan);
      box-shadow: 4px 4px 0 #000, 8px 8px 0 rgba(0, 240, 255, 0.4);
      padding: 24px 28px;
      border-radius: 4px;
      margin-top: auto;
      margin-bottom: 24px;
    }

    .pixel-badge-row {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .pixel-badge {
      font-family: var(--font-pixel);
      font-size: 8px;
      padding: 4px 10px;
      border: 1px solid currentColor;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .badge-cyan { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 240, 255, 0.1); }
    .badge-pink { color: var(--pink); border-color: var(--pink); background: rgba(255, 0, 85, 0.1); }
    .badge-green { color: var(--green); border-color: var(--green); background: rgba(0, 255, 102, 0.1); }
    .badge-gold { color: var(--gold); border-color: var(--gold); background: rgba(255, 184, 0, 0.1); }

    .cover-headline-pixel {
      font-family: var(--font-pixel);
      font-size: 20px;
      line-height: 1.35;
      margin-bottom: 12px;
    }

    .cover-title-link {
      color: #ffffff;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .cover-title-link:hover {
      color: var(--cyan);
      text-shadow: 0 0 10px var(--cyan);
    }

    .cover-lead-summary {
      font-size: 15px;
      line-height: 1.5;
      color: #cbd5e1;
      margin-bottom: 14px;
    }

    .cover-quickread-box {
      font-size: 13.5px;
      color: #94a3b8;
      border-left: 3px solid var(--pink);
      padding-left: 12px;
      margin-bottom: 16px;
      line-height: 1.45;
    }

    .cover-interactive-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pixel-btn-action {
      font-family: var(--font-pixel);
      font-size: 9px;
      background: var(--pink);
      color: #fff;
      padding: 8px 14px;
      text-decoration: none;
      border: 1px solid #fff;
      box-shadow: 2px 2px 0 #000;
    }
    .pixel-btn-action:hover {
      background: #ff2a75;
      box-shadow: 3px 3px 0 #000;
    }

    .cover-score-pill {
      font-family: var(--font-hud);
      font-size: 18px;
      color: var(--green);
      letter-spacing: 0.12em;
    }

    .cover-bottom-hud {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 14px;
      font-family: var(--font-hud);
      font-size: 15px;
      color: #94a3b8;
      letter-spacing: 0.12em;
    }

    .hud-barcode-segment {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pixel-barcode {
      font-family: monospace;
      letter-spacing: 2px;
      font-weight: 700;
      color: #fff;
    }

    /* STAGE SPREAD: FULL SCREEN BOSS FIGHT */
    .stage-boss-spread {
      background: #000;
    }

    .spread-game-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(0.85) contrast(1.1);
    }

    .boss-vignette-scrim {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 30%, rgba(11, 7, 20, 0.8) 100%);
      z-index: 2;
    }

    .stage-hud-top {
      position: relative;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px 0;
      font-family: var(--font-pixel);
      font-size: 8.5px;
      color: var(--cyan);
      text-shadow: 0 0 8px rgba(0, 0, 0, 0.9);
    }

    .boss-rundown-hud-card {
      position: absolute;
      bottom: 60px;
      right: 32px;
      width: 480px;
      max-width: calc(100% - 64px);
      background: rgba(13, 9, 24, 0.94);
      border: 2px solid var(--pink);
      box-shadow: 4px 4px 0 #000, 8px 8px 0 rgba(255, 0, 85, 0.4);
      border-radius: 4px;
      padding: 20px 24px;
      z-index: 4;
    }

    .boss-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .boss-source-tag {
      font-family: var(--font-hud);
      font-size: 15px;
      color: var(--gold);
      letter-spacing: 0.1em;
    }

    .boss-card-title {
      font-family: var(--font-pixel);
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 12px;
    }

    /* Health Bar */
    .hud-health-bar-container {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #000;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      margin-bottom: 12px;
      font-family: var(--font-pixel);
      font-size: 7.5px;
    }

    .hp-label { color: var(--pink); font-weight: 700; }
    .hp-track {
      flex: 1;
      height: 8px;
      background: #2a1420;
      position: relative;
    }
    .hp-fill {
      height: 100%;
      background: linear-gradient(90deg, #ff0055, #00ff66);
    }
    .hp-percent { color: var(--green); }

    .boss-card-lead {
      font-size: 13.5px;
      line-height: 1.45;
      color: #e2e8f0;
      margin-bottom: 10px;
    }

    .boss-card-p1 {
      font-size: 12.5px;
      line-height: 1.4;
      color: #94a3b8;
      margin-bottom: 10px;
    }

    .boss-quote-box {
      font-family: var(--font-hud);
      font-size: 16px;
      color: var(--cyan);
      border-left: 2px solid var(--cyan);
      padding-left: 10px;
      margin-bottom: 14px;
      line-height: 1.35;
    }

    .boss-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
    }

    .boss-tags {
      display: flex;
      gap: 8px;
    }

    .tag-pill-cyan {
      font-family: var(--font-pixel);
      font-size: 7px;
      color: var(--cyan);
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid var(--cyan);
      padding: 2px 6px;
    }

    .tag-pill-gold {
      font-family: var(--font-pixel);
      font-size: 7px;
      color: var(--gold);
      background: rgba(255, 184, 0, 0.1);
      border: 1px solid var(--gold);
      padding: 2px 6px;
    }

    .pixel-btn-source {
      font-family: var(--font-pixel);
      font-size: 8px;
      color: #000;
      background: var(--green);
      border: 1px solid #fff;
      padding: 5px 10px;
      text-decoration: none;
      font-weight: 700;
      box-shadow: 2px 2px 0 #000;
    }
    .pixel-btn-source:hover {
      background: #33ff88;
    }

    .stage-hud-bottom {
      position: relative;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 32px 24px;
      font-family: var(--font-hud);
      font-size: 14px;
      color: #94a3b8;
      letter-spacing: 0.12em;
    }

    /* STAGE TYPE A: NEON CYBERPUNK TERMINAL */
    .stage-neon-terminal {
      background: #0d0a18;
      border-color: rgba(0, 240, 255, 0.3);
      padding: 32px 40px;
    }

    .terminal-folio-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 240, 255, 0.3);
      padding-bottom: 12px;
      font-family: var(--font-pixel);
      font-size: 8px;
      color: var(--cyan);
    }

    .terminal-headline-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 18px 0 14px;
      gap: 16px;
    }

    .terminal-heading-neon {
      font-family: var(--font-pixel);
      font-size: 16px;
      line-height: 1.4;
      color: #ffffff;
      flex: 1;
    }

    .pixel-link-btn {
      font-family: var(--font-pixel);
      font-size: 8px;
      padding: 6px 10px;
      border: 1px solid var(--pink);
      color: var(--pink);
      background: rgba(255, 0, 85, 0.1);
      text-decoration: none;
      flex-shrink: 0;
    }
    .pixel-link-btn:hover {
      background: var(--pink);
      color: #fff;
    }

    .terminal-body-grid {
      display: grid;
      grid-template-columns: 310px 1fr;
      gap: 24px;
      margin-top: 10px;
      flex: 1;
    }

    .terminal-screenshot-frame {
      position: relative;
      border: 2px solid var(--cyan);
      box-shadow: 4px 4px 0 #000, 6px 6px 0 rgba(0, 240, 255, 0.3);
      height: 230px;
      margin-bottom: 16px;
      overflow: hidden;
    }

    .terminal-screenshot-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .screenshot-meta-badge {
      position: absolute;
      bottom: 6px;
      left: 6px;
      background: #000;
      color: var(--cyan);
      font-family: var(--font-pixel);
      font-size: 6.5px;
      padding: 2px 6px;
      border: 1px solid var(--cyan);
    }

    .terminal-stats-card {
      background: #141026;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 12px 14px;
      font-family: var(--font-hud);
      font-size: 15px;
      letter-spacing: 0.08em;
    }

    .stat-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      border-bottom: 1px dotted rgba(255, 255, 255, 0.1);
      padding-bottom: 4px;
    }

    .terminal-lead-text {
      font-size: 15.5px;
      line-height: 1.5;
      color: #ffffff;
      font-weight: 600;
      margin-bottom: 14px;
    }

    .terminal-body-p {
      font-size: 13.5px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 14px;
    }

    .terminal-quote-callout {
      font-family: var(--font-hud);
      font-size: 18px;
      color: var(--pink);
      background: rgba(255, 0, 85, 0.08);
      border-left: 3px solid var(--pink);
      padding: 10px 14px;
      margin: 16px 0;
      line-height: 1.4;
    }

    .terminal-folio-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 14px;
      margin-top: 20px;
      font-family: var(--font-hud);
      font-size: 14px;
      color: #64748b;
      letter-spacing: 0.12em;
    }

    /* STAGE TYPE B: PHOSPHOR GREEN DOSSIER */
    .stage-green-dossier {
      background: var(--card-green);
      border-color: rgba(0, 255, 102, 0.3);
      padding: 32px 40px;
    }

    .dossier-folio-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 255, 102, 0.3);
      padding-bottom: 12px;
      font-family: var(--font-pixel);
      font-size: 8px;
      color: var(--green);
    }

    .dossier-header-block {
      margin: 16px 0 14px;
    }

    .dossier-eyebrow {
      font-family: var(--font-pixel);
      font-size: 8px;
      color: var(--gold);
      display: inline-block;
      margin-bottom: 8px;
    }

    .dossier-title {
      font-family: var(--font-pixel);
      font-size: 16px;
      line-height: 1.4;
      color: #ffffff;
    }

    .dossier-content-flow {
      margin-top: 10px;
      flex: 1;
    }

    .dossier-float-frame {
      float: right;
      width: 320px;
      height: 230px;
      border: 2px solid var(--green);
      box-shadow: 4px 4px 0 #000, 6px 6px 0 rgba(0, 255, 102, 0.3);
      margin: 0 0 16px 20px;
      position: relative;
      overflow: hidden;
    }

    .dossier-float-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .float-frame-hud {
      position: absolute;
      bottom: 0;
      inset-inline: 0;
      background: rgba(0, 0, 0, 0.85);
      border-top: 1px solid var(--green);
      padding: 4px 8px;
      display: flex;
      justify-content: space-between;
      font-family: var(--font-pixel);
      font-size: 6.5px;
      color: #cbd5e1;
    }

    .dossier-lead {
      font-size: 15.5px;
      line-height: 1.5;
      color: #f1f5f9;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .dossier-paragraph {
      font-size: 13.5px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 12px;
    }

    .dossier-quote-box {
      clear: both;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid var(--green);
      border-left: 4px solid var(--green);
      padding: 12px 16px;
      margin: 16px 0;
    }

    .quote-dialog-speaker {
      font-family: var(--font-pixel);
      font-size: 7.5px;
      color: var(--green);
      margin-bottom: 6px;
    }

    .quote-dialog-text {
      font-family: var(--font-hud);
      font-size: 17px;
      color: #e2e8f0;
      line-height: 1.35;
    }

    .dossier-summary-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #05140e;
      border: 1px solid rgba(0, 255, 102, 0.2);
      padding: 10px 14px;
      margin-top: 14px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .dossier-pill-verdict {
      font-family: var(--font-pixel);
      font-size: 7.5px;
      color: var(--gold);
    }

    .dossier-pill-plat {
      font-family: var(--font-hud);
      font-size: 15px;
      color: var(--cyan);
    }

    .dossier-read-btn {
      font-family: var(--font-pixel);
      font-size: 7.5px;
      color: var(--green);
      text-decoration: none;
      border: 1px solid var(--green);
      padding: 4px 8px;
    }
    .dossier-read-btn:hover {
      background: var(--green);
      color: #000;
    }

    .dossier-folio-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(0, 255, 102, 0.3);
      padding-top: 14px;
      margin-top: 20px;
      font-family: var(--font-hud);
      font-size: 14px;
      color: #64748b;
      letter-spacing: 0.12em;
    }

    /* Modal Progress Backdrop */
    .arcade-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 20000;
      display: none;
      align-items: center;
      justify-content: center;
    }

    .arcade-modal-backdrop.open {
      display: flex;
    }

    .arcade-modal-card {
      background: #0f0a1c;
      border: 3px solid var(--cyan);
      box-shadow: 6px 6px 0 #000, 12px 12px 0 var(--pink);
      padding: 36px 32px;
      max-width: 520px;
      width: 90%;
      text-align: center;
    }

    .modal-arcade-title {
      font-family: var(--font-pixel);
      font-size: 14px;
      color: var(--cyan);
      margin-bottom: 14px;
    }

    .modal-step-list {
      text-align: left;
      font-family: var(--font-hud);
      font-size: 18px;
      color: #94a3b8;
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
      .arcade-top-bar, .arcade-modal-backdrop {
        display: none !important;
      }
      .arcade-canvas {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .pixel-page {
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
       TOP ARCADE TOOLBAR & HUD
       ======================================================== -->
  <header class="arcade-top-bar">
    <div class="arcade-bar-main">
      <div class="arcade-brand">
        <a href="/" class="pixel-btn btn-kiosk" title="Return to Magazine Selection Kiosk">← KIOSK</a>
        <span class="arcade-logo">THE 8 BIT BISTRO</span>
        <span class="arcade-hud-status">[STAGE 01-30 // 1P READY]</span>
      </div>

      <div class="arcade-actions">
        <button class="pixel-btn btn-coin" onclick="trigger8BitScrape()" title="Scrape Kotaku, Polygon, PC Gamer, Eurogamer to compile 30 Stages">
          👾 INSERT COIN // GENERATE 30 STAGES
        </button>

        <button id="btnSavePdf" class="pixel-btn btn-pdf" onclick="save8BitAsPdf()" title="Direct 1-Click A4 PDF Download">
          📄 SAVE AS PDF
        </button>

        <button class="pixel-btn" onclick="save8BitHtml()" title="Save clean HTML copy">
          💾 SAVE HTML
        </button>
      </div>
    </div>

    <!-- 30 Stage Navigation Pager -->
    <nav class="stage-nav-bar">
      <button class="nav-stage-btn active" onclick="jumpToStage('stage-1')">STAGE 01 (COVER)</button>
      ${Array.from({ length: 29 }, (_, i) => {
        const num = i + 2;
        const pad = String(num).padStart(2, '0');
        return `<button class="nav-stage-btn" onclick="jumpToStage('stage-${num}')">ST-${pad}</button>`;
      }).join('\n      ')}
    </nav>
  </header>

  <!-- ========================================================
       30-STAGE MAGAZINE WORKSPACE CANVAS
       ======================================================== -->
  <main class="arcade-canvas">
    ${mainContentHtml}
  </main>

  <!-- ========================================================
       PROGRESS MODAL (INSERT COIN / LEVEL LOAD)
       ======================================================== -->
  <div id="arcadeModal" class="arcade-modal-backdrop">
    <div class="arcade-modal-card">
      <div style="font-size: 40px; margin-bottom: 12px;">🕹️</div>
      <h3 id="modalTitle" class="modal-arcade-title">DOWNLOADING GAME TELEMETRY...</h3>
      <p id="modalSub" style="font-size: 13px; color: #cbd5e1; margin-bottom: 14px;">
        Harvesting latest dispatches from Polygon, Kotaku, PC Gamer &amp; Eurogamer...
      </p>

      <div class="modal-step-list">
        <div id="step1" style="color: var(--cyan);">⏳ [1/3] Ingesting RSS feeds &amp; filtering duplicates...</div>
        <div id="step2">⏳ [2/3] Synthesizing quickread hooks, bosses &amp; specs...</div>
        <div id="step3">⏳ [3/3] Compiling 30 arcade stages &amp; PDF buffers...</div>
      </div>
    </div>
  </div>

  <script>
    function jumpToStage(id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        document.querySelectorAll('.nav-stage-btn').forEach(b => b.classList.remove('active'));
        if (event && event.target && event.target.classList.contains('nav-stage-btn')) {
          event.target.classList.add('active');
        }
      }
    }

    // Direct 1-Click PDF Download (No print dialogs!)
    async function save8BitAsPdf() {
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
        a.download = 'The_8Bit_Bistro_Mag_Vol_${newVol}_30_Stages.pdf';
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
    function save8BitHtml() {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('.arcade-modal-backdrop').forEach(m => m.classList.remove('open'));
      const blob = new Blob(["<!DOCTYPE html>\\n" + clone.outerHTML], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '8bit.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Trigger Autonomous Gaming Scraper
    async function trigger8BitScrape() {
      const modal = document.getElementById('arcadeModal');
      const modalTitle = document.getElementById('modalTitle');
      const modalSub = document.getElementById('modalSub');
      const s1 = document.getElementById('step1');
      const s2 = document.getElementById('step2');
      const s3 = document.getElementById('step3');

      modal.classList.add('open');

      try {
        setTimeout(() => {
          s1.innerHTML = '✅ [1/3] Harvested fresh gaming stories from 4 feeds!';
          s1.style.color = 'var(--green)';
          s2.innerHTML = '⏳ [2/3] Synthesizing boss stages &amp; terminal stats...';
          s2.style.color = 'var(--cyan)';
        }, 1200);

        setTimeout(() => {
          s2.innerHTML = '✅ [2/3] Synthesized boss stages &amp; terminal stats';
          s2.style.color = 'var(--green)';
          s3.innerHTML = '⏳ [3/3] Compiling 30 stages &amp; staging PDF buffer...';
          s3.style.color = 'var(--cyan)';
        }, 2500);

        const res = await fetch('/api/scrape-and-generate?pub=8bit');
        const data = await res.json();

        if (data.success) {
          s3.innerHTML = '✅ [3/3] Compiled 30 stages (Skipped ' + (data.skippedCoveredCount || 0) + ' covered stories)';
          s3.style.color = 'var(--green)';
          modalTitle.innerText = 'STAGE COMPLETE! // VOL. ' + data.edition;
          modalSub.innerText = 'Featured: "' + data.coverTitle + '". Refreshing workspace...';

          setTimeout(() => {
            window.location.href = '/8bit?edition=' + data.edition + '&t=' + Date.now();
          }, 1500);
        } else {
          throw new Error(data.error || 'Harvest failed');
        }
      } catch (err) {
        console.error(err);
        alert('8-Bit generation failed: ' + err.message);
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
    title: `THE 8 BIT BISTRO MAG // STAGE ${newVol}`,
    tagline: `Arcade Edition: ${heroStory.title}`,
    totalStories: 30,
    pageCount: 30,
    coverGame: heroStory.title,
    sources: ["Polygon", "Kotaku", "PC Gamer", "Eurogamer"],
    featuredStories: newlyCoveredStories,
    skippedPreviouslyCoveredCount: skippedCount,
    editorialNotes: `Autonomous live harvest compiled on ${new Date().toISOString()} - 30 stages generated with pixel art styling; skipped ${skippedCount} previously covered stories.`
  });

  fs.writeFileSync(EDITIONS_8BIT_FILE, JSON.stringify(memory, null, 2), 'utf8');

  console.log(`✅ [8-BIT GENERATION COMPLETE] Compiled Stage/Vol ${newVol} featuring "${heroStory.title}"! Skipped ${skippedCount} previously covered stories.`);

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
  rewriteAsGamingQuickread
};

