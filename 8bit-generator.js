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
  if (t.includes('switch') || t.includes('nintendo')) plats.push('NINTENDO SWITCH');
  if (t.includes('pc') || t.includes('steam') || t.includes('windows')) plats.push('PC / STEAM');
  if (t.includes('ps5') || t.includes('playstation')) plats.push('PLAYSTATION 5');
  if (t.includes('xbox') || t.includes('series x')) plats.push('XBOX SERIES X');
  return plats.length > 0 ? plats.join(' · ') : 'NINTENDO SWITCH · MULTI-PLATFORM';
}

function rewriteAsGamingQuickread(title, contentOrDesc, source, link) {
  const cleanTitle = decodeHtmlEntities(title).trim();
  const rawText = stripHtmlTags(contentOrDesc || '').trim();
  const lower = (cleanTitle + ' ' + rawText).toLowerCase();
  const platform = detectPlatforms(cleanTitle + ' ' + rawText);
  const realQuote = extractQuotes(rawText);
  const sentences = rawText.split(/(?<=[.!?])\s+/).filter(s => s.length > 25 && !s.toLowerCase().includes('cookie') && !s.toLowerCase().includes('subscribe'));

  let kicker = "★ POWER FEATURE // EXCLUSIVE DISPATCH";
  let badge = "POWER PICK";
  let hookTitle = cleanTitle;
  let lead = "";
  let p1 = "";
  let p2 = "";
  let quote = "";
  let fullExplainer = "";
  let verdict = "POWER METER: 10/10 ★ NINTENDO POWER PICK";
  let counselorTip = "Keep your thumb ready on the dash button—timing is everything!";
  let powerRating = 98;

  if (lower.includes('gta') || lower.includes('grand theft auto') || lower.includes('rockstar') || lower.includes('open-world') || lower.includes('open world')) {
    kicker = "👑 TITAN ALERT // OPEN WORLD MAYHEM";
    badge = "MEGA HIT";
    hookTitle = `Open World Heavyweight: ${cleanTitle}`;
    lead = `Clear your memory cards and get ready for the biggest seismic release in modern gaming history.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Pushing hardware limits with breathtaking fidelity and endless emergent chaos, this is where hundreds of hours of your gaming life are headed.`;
    quote = realQuote || `“We wanted this world to feel impossibly alive—every street corner has a story, every NPC has a schedule.”`;
    counselorTip = "Explore off the beaten path early on to unlock high-tier safe houses and vehicles!";
    fullExplainer = `${cleanTitle}. In the frame: High-octane next-gen open world gameplay capture.`;
    verdict = "POWER METER: 10/10 ★ SYSTEM SELLER";
    powerRating = 99;
  } else if (lower.includes('patch') || lower.includes('update') || lower.includes('rebalance') || lower.includes('buff') || lower.includes('nerf')) {
    kicker = "🔍 CLASSIFIED INFORMATION // SECRET META GUIDE";
    badge = "TOP SECRET";
    hookTitle = `Meta Shakeup: ${cleanTitle}`;
    lead = `The counselors combed through the latest balance notes so you can dominate your next tournament lobby.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `With major quality-of-life adjustments, weapon scaling overhauls, and frame-data tuning, the competitive meta is completely rewritten.`;
    quote = realQuote || `“Our goal was to eliminate toxic cheese strategies while rewarding tactical mastery and team coordination.”`;
    counselorTip = "Re-map your secondary ability to the shoulder trigger for instantaneous reaction timing!";
    fullExplainer = `${cleanTitle}. In the frame: Overhauled combat mechanics and balance adjustments live on servers now.`;
    verdict = "POWER METER: 9.6/10 ★ ESSENTIAL UPDATE";
    powerRating = 95;
  } else if (lower.includes('zelda') || lower.includes('ocarina') || lower.includes('remake') || lower.includes('retro') || lower.includes('nintendo') || lower.includes('mario')) {
    kicker = "🕹️ RETRO VAULT // NINTENDO POWER HERITAGE";
    badge = "LEGENDARY";
    hookTitle = `Timeless Masterpiece: ${cleanTitle}`;
    lead = `Some games never die; they return with modern lighting, buttery 60 FPS performance, and unmatched magic.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Preserving the original atmosphere while rebuilding the geometry from the ground up, this release reminds us why we fell in love with gaming in the first place.`;
    quote = realQuote || `“Respecting the original vision wasn't optional—every texture was handcrafted to match what childhood memory felt like.”`;
    counselorTip = "Equip the Pegasus Boots before entering the catacombs to breeze past moving trap blocks!";
    fullExplainer = `${cleanTitle}. In the frame: Legendary retro adventures reimagined for modern displays. Pure nostalgia.`;
    verdict = "POWER METER: 9.9/10 ★ TIMELESS CLASSIC";
    powerRating = 99;
  } else if (lower.includes('rpg') || lower.includes('path of exile') || lower.includes('mass effect') || lower.includes('dragon age')) {
    kicker = "🧙 DEEP RPG // STRATEGY & BUILD CRAFTING";
    badge = "100+ HOURS";
    hookTitle = `Build Mastery: ${cleanTitle}`;
    lead = `Say goodbye to your weekend sleep schedule. ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Featuring deep skill trees, visceral loot progression, and branching narrative dialogue written by veteran role-playing masters, this is RPG comfort food at its peak.`;
    quote = realQuote || `“We built this for players who want to dissect character stats and uncover hidden lore in dark catacombs.”`;
    counselorTip = "Stack elemental resistance gear before attempting the fifth labyrinth boss!";
    fullExplainer = `${cleanTitle}. In the frame: Deep gameplay progression, intricate character stats, and massive boss encounters.`;
    verdict = "POWER METER: 9.7/10 ★ ESSENTIAL RPG";
    powerRating = 97;
  } else {
    kicker = "🎮 PAK WATCH // UPCOMING RELEASES & RADAR";
    badge = "PAK WATCH";
    hookTitle = `Counselor Dispatch: ${cleanTitle}`;
    lead = `Here is the unfiltered dispatch straight from the game development front lines: ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 250);
    p2 = sentences.slice(2, 4).join(' ') || `Pushing back against predatory live-service bloat, this title shines by delivering what Nintendo fans cherish most: responsive controls, rewarding loops, and pure player fun.`;
    quote = realQuote || `“When games are crafted with genuine passion rather than corporate revenue checklists, players feel the difference instantly.”`;
    counselorTip = "Practice your jump cancels in the training arena to master aerial combo extensions!";
    fullExplainer = `${cleanTitle}. In the frame: Studio gameplay capture and developmental milestones.`;
    verdict = "POWER METER: 9.5/10 ★ MUST PLAY";
    powerRating = 94;
  }

  return {
    kicker,
    badge,
    hookTitle,
    lead,
    p1,
    p2,
    quote,
    counselorTip,
    fullExplainer,
    platform,
    verdict,
    powerRating,
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

  console.log(`🕹️ [NINTENDO POWER HARVESTER] Harvested ${freshArticles.length} gaming stories (Skipped ${skippedArticles.length} previously covered).`);
  return { freshArticles, skippedCount: skippedArticles.length };
}

// Generate the 30-Page Nintendo Magazine Inspired Publication
async function scrapeAndGenerate8BitMagazine() {
  console.log('⚡ [NINTENDO POWER ENGINE] Initializing autonomous crawl & Nintendo Magazine layout generation...');

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
        title: `Nintendo Power Dispatch: Stage ${idx + 1} System Feature`,
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

  // 4. Build Complete 30-Page Nintendo Magazine Document
  let mainContentHtml = '';

  // PAGE 01: HERO COVER (NINTENDO POWER STYLE)
  mainContentHtml += `
    <!-- ========================================================
         PAGE 01: HERO COVER (NINTENDO POWER STYLE)
         ======================================================== -->
    <article id="stage-1" class="nintendo-page page-cover">
      <img class="cover-hero-photo" src="${heroStory.image}" alt="${heroStory.title}" />
      <div class="cover-vignette-scrim"></div>

      <div class="cover-content-wrap">
        <!-- Top Nintendo Racing Stripe & Masthead Bar -->
        <header class="cover-top-strap">
          <div class="strap-capsule-logo">
            <span class="capsule-pill">( THE 8 BIT BISTRO )</span>
          </div>
          <div class="strap-edition-label">
            <span>OFFICIAL GAMING MAGAZINE // VOL. ${String(newVol).padStart(2, '0')} // 30 PACKED PAGES</span>
          </div>
          <div class="strap-date-tag">
            <span>${issueDate.toUpperCase()}</span>
          </div>
        </header>

        <!-- Giant Nintendo Power Display Masthead -->
        <div class="cover-masthead-center">
          <div class="masthead-slanted-title">THE 8 BIT BISTRO</div>
          <div class="masthead-yellow-subline">★ NOW YOU'RE PLAYING WITH POWER! ★</div>
        </div>

        <!-- Official Gold Seal of Quality Badge -->
        <div class="official-gold-seal">
          <div class="seal-inner">
            <div class="seal-stars">★★★★★</div>
            <div class="seal-text-small">OFFICIAL 8-BIT</div>
            <div class="seal-text-bold">SEAL OF QUALITY</div>
            <div class="seal-sub">VERIFIED EDITION</div>
          </div>
        </div>

        <!-- Cover Stories Teaser Callouts Left Flank -->
        <div class="cover-side-teasers">
          <div class="teaser-card">
            <span class="teaser-badge">PAK WATCH</span>
            <div class="teaser-text">WHAT'S NEXT FOR SWITCH &amp; PC?</div>
          </div>
          <div class="teaser-card">
            <span class="teaser-badge" style="background:#ffdc00; color:#000;">CLASSIFIED</span>
            <div class="teaser-text">TOP SECRET CODES &amp; META SHAKEUPS</div>
          </div>
          <div class="teaser-card">
            <span class="teaser-badge" style="background:#00c853; color:#fff;">STRATEGY</span>
            <div class="teaser-text">EXCLUSIVE BOSS BATTLE MAPS INSIDE</div>
          </div>
        </div>

        <!-- Bottom Giant Feature Lead Block -->
        <div class="cover-bottom-feature-card">
          <div class="feature-tag-row">
            <span class="feature-tilted-badge">💥 EXCLUSIVE COVER STORY</span>
            <span class="feature-source-badge">${heroStory.source} INTEL</span>
            <span class="feature-plat-badge">${heroStory.hook.platform}</span>
          </div>

          <h2 class="cover-feature-heading">
            <a href="${heroStory.link}" target="_blank" rel="noopener noreferrer" class="cover-link-title">
              ${heroStory.title}
            </a>
          </h2>

          <p class="cover-feature-lead">
            ${heroStory.hook.lead}
          </p>

          <div class="cover-feature-actions">
            <a href="${heroStory.link}" target="_blank" rel="noopener noreferrer" class="nintendo-btn-primary">
              READ FULL DISPATCH ON ${heroStory.source.toUpperCase()} ↗
            </a>
            <div class="cover-counselor-callout">
              <span class="counselor-bubble-title">COUNSELOR'S TIP:</span>
              <span class="counselor-bubble-text">${heroStory.hook.counselorTip}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Running Folio Barcode -->
        <footer class="cover-footer-barcode-bar">
          <div class="barcode-wrap">
            <div class="barcode-bars">|||| | ||||| || |||| || ||| |||| | ||</div>
            <span class="barcode-sn">NINTENDO-POWER-VOL${newVol}-ISSUE30</span>
          </div>
          <div class="footer-tagline">
            <span>THE 8 BIT BISTRO // THE OFFICIAL PRINT &amp; DIGITAL GAMING QUARTERLY</span>
          </div>
        </footer>
      </div>
    </article>
  `;

  // PAGES 02 - 30: ALTERNATING NINTENDO MAGAZINE SPREADS
  interiorStories.forEach((s, idx) => {
    const pageNum = idx + 2; // Pages 2 to 30
    const isSpread = pageNum % 2 === 0; // Even pages: POWER FEATURE // FULL STRATEGY SPREAD
    const isClassified = pageNum % 4 === 3; // Type B: CLASSIFIED INFORMATION (White Glossy Sheet)
    // Otherwise Type C: PAK WATCH // SYSTEM RADAR (Neon Cyan & Charcoal Sheet)

    if (isSpread) {
      // TEMPLATE 1: POWER FEATURE // STRATEGY GUIDE SPREAD (Cinematic Photographic Spread)
      mainContentHtml += `
        <!-- ========================================================
             PAGE ${String(pageNum).padStart(2, '0')}: POWER STRATEGY SPREAD (${s.title})
             ======================================================== -->
        <article id="stage-${pageNum}" class="nintendo-page page-strategy-spread">
          <img class="spread-hero-photo" src="${s.image}" alt="${s.title}" loading="lazy" />
          <div class="spread-cinema-scrim"></div>

          <!-- Running Top Header -->
          <header class="nintendo-folio-top">
            <div class="folio-left">
              <span class="folio-capsule">( THE 8 BIT BISTRO )</span>
              <span class="folio-section-tag">★ POWER STRATEGY GUIDE ★</span>
            </div>
            <div class="folio-middle">
              <span class="hazard-tape-mini">⚡ LEVEL BOSS ENCOUNTER // ${s.source.toUpperCase()} ⚡</span>
            </div>
            <div class="folio-right">
              <span class="page-number-pill">PAGE ${String(pageNum).padStart(2, '0')}</span>
            </div>
          </header>

          <!-- Floating Strategy Card in Bottom Right -->
          <div class="strategy-floating-card">
            <div class="card-racing-top">
              <span class="card-eyebrow">⚔️ COUNSELOR'S STRATEGY ALERT</span>
              <span class="card-power-meter">POWER: ${s.hook.powerRating}%</span>
            </div>

            <h3 class="strategy-card-title">
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:#ffffff; text-decoration:none;">
                ${s.title}
              </a>
            </h3>

            <!-- Segmented Power Meter Bar -->
            <div class="segmented-power-gauge">
              <span class="gauge-label">POWER METER</span>
              <div class="gauge-bar-track">
                <div class="gauge-bar-fill" style="width: ${s.hook.powerRating}%;"></div>
              </div>
              <span class="gauge-score">${s.hook.powerRating}%</span>
            </div>

            <p class="strategy-card-lead">${s.hook.lead}</p>
            <p class="strategy-card-body">${s.hook.p1}</p>

            <!-- Counselor Advice Speech Bubble -->
            <div class="counselor-speech-box">
              <div class="speech-tail"></div>
              <strong style="color:#ffe600;">COUNSELOR'S TIP:</strong> ${s.hook.counselorTip}
            </div>

            <div class="strategy-card-footer">
              <div class="footer-platform-pills">
                <span class="plat-pill plat-switch">${s.hook.platform}</span>
                <span class="plat-pill plat-rating">${s.hook.verdict}</span>
              </div>
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="nintendo-btn-action">
                READ ORIGINAL INTEL ↗
              </a>
            </div>
          </div>

          <!-- Bottom Running Folio -->
          <footer class="nintendo-folio-bottom">
            <span>THE 8 BIT BISTRO // STRATEGY ARCHIVE // SOURCE: <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:#ffeb00;">${s.source} ↗</a></span>
            <div class="dpad-controller-graphic">✚ (A) (B)</div>
            <span>PAGE ${String(pageNum).padStart(2, '0')} OF 30</span>
          </footer>
        </article>
      `;
    } else if (isClassified) {
      // TEMPLATE 2: CLASSIFIED INFORMATION // SECRET WARP ZONE (Crisp White Editorial Sheet)
      mainContentHtml += `
        <!-- ========================================================
             PAGE ${String(pageNum).padStart(2, '0')}: CLASSIFIED INFORMATION (${s.title})
             ======================================================== -->
        <article id="stage-${pageNum}" class="nintendo-page page-classified-white">
          <!-- Top Racing Stripe Header -->
          <header class="classified-top-header">
            <div class="classified-red-banner">
              <span class="classified-pill">( THE 8 BIT BISTRO )</span>
              <span class="classified-title">🔍 CLASSIFIED INFORMATION // TOP SECRET TACTICS</span>
              <span class="classified-page-badge">PAGE ${String(pageNum).padStart(2, '0')}</span>
            </div>
            <div class="hazard-stripe-bar"></div>
          </header>

          <div class="classified-main-content">
            <!-- Headline Row with Tilted Stamp -->
            <div class="classified-headline-block">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="classified-tag-yellow">⚡ LEVEL 1 CLEARANCE // ${s.hook.kicker}</span>
                <span class="secret-stamp-tilted">TOP SECRET</span>
              </div>
              <h2 class="classified-heading">
                <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:none;">
                  ${s.title}
                </a>
              </h2>
            </div>

            <!-- Two Column Editorial Layout with Framed Image -->
            <div class="classified-grid">
              <div class="classified-col-left">
                <div class="nintendo-framed-photo">
                  <img src="${s.image}" alt="${s.title}" loading="lazy" />
                  <div class="photo-pointer-arrow">LOOK OUT!</div>
                  <div class="photo-caption-bar">
                    <span>SCREENSHOT: ${s.source}</span>
                    <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:#ffeb00;">[OPEN]</a>
                  </div>
                </div>

                <!-- Warp Zone Secret Box -->
                <div class="warp-zone-card">
                  <div class="warp-zone-header">
                    <span>🌀 WARP ZONE SECRET</span>
                  </div>
                  <p class="warp-zone-body">
                    ${s.hook.counselorTip}
                  </p>
                </div>
              </div>

              <div class="classified-col-right">
                <div class="editorial-lead-para">
                  ${s.hook.lead}
                </div>

                <div class="editorial-text-para">
                  ${s.hook.p1}
                </div>

                <div class="editorial-text-para">
                  ${s.hook.p2}
                </div>

                <!-- Developer / Source Quote in Nintendo Speech Frame -->
                <div class="classified-quote-frame">
                  <div class="quote-speaker-tag">TRANSMISSION FROM ${s.source.toUpperCase()}:</div>
                  <div class="quote-body-text">${s.hook.quote}</div>
                </div>

                <div class="classified-action-row">
                  <span class="plat-tag-dark">${s.hook.platform}</span>
                  <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="nintendo-pill-btn">
                    READ ORIGINAL ARTICLE ON ${s.source.toUpperCase()} ↗
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Folio -->
          <footer class="classified-bottom-folio">
            <span>THE 8 BIT BISTRO · ISSUE VOL. ${newVol} · CLASSIFIED CODES</span>
            <div class="dpad-controller-graphic" style="color:#e60012;">✚ (A) (B) (X) (Y)</div>
            <span>PAGE ${String(pageNum).padStart(2, '0')} OF 30</span>
          </footer>
        </article>
      `;
    } else {
      // TEMPLATE 3: PAK WATCH // SYSTEM PREVIEW & RADAR (Neon Cyan & Charcoal Sheet)
      mainContentHtml += `
        <!-- ========================================================
             PAGE ${String(pageNum).padStart(2, '0')}: PAK WATCH PREVIEW (${s.title})
             ======================================================== -->
        <article id="stage-${pageNum}" class="nintendo-page page-pakwatch-cyan">
          <header class="pakwatch-top-header">
            <div class="pakwatch-brand-bar">
              <span class="pakwatch-pill">( THE 8 BIT BISTRO )</span>
              <span class="pakwatch-title">🎮 PAK WATCH // SNEAK PEEK &amp; RADAR</span>
              <span class="pakwatch-page-badge">PAGE ${String(pageNum).padStart(2, '0')}</span>
            </div>
          </header>

          <div class="pakwatch-main-content">
            <div class="pakwatch-headline-row">
              <span class="pakwatch-badge-yellow">★ UPCOMING TITAN // ${s.hook.badge}</span>
              <h2 class="pakwatch-heading">
                <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:#ffffff; text-decoration:none;">
                  ${s.title}
                </a>
              </h2>
            </div>

            <!-- Big Framed Artwork with Joy-Con Colored Border -->
            <div class="joycon-split-frame">
              <img src="${s.image}" alt="${s.title}" loading="lazy" />
              <div class="frame-tag-left">JOY-CON BLUE</div>
              <div class="frame-tag-right">NEON RED</div>
            </div>

            <div class="pakwatch-text-grid">
              <div class="pakwatch-col-lead">
                <p class="pakwatch-lead-para">${s.hook.lead}</p>
                <p class="pakwatch-body-para">${s.hook.p1}</p>
                <p class="pakwatch-body-para">${s.hook.p2}</p>
              </div>

              <div class="pakwatch-col-radar">
                <!-- Power Radar Specs Card -->
                <div class="power-radar-card">
                  <div class="radar-card-title">★ POWER METER EVALUATION</div>
                  <div class="radar-stat-row">
                    <span>GRAPHICS &amp; ART:</span>
                    <strong style="color:#ffeb00;">★★★★★ 9.9</strong>
                  </div>
                  <div class="radar-stat-row">
                    <span>GAMEPLAY LOOP:</span>
                    <strong style="color:#00ff66;">★★★★★ 9.8</strong>
                  </div>
                  <div class="radar-stat-row">
                    <span>SOUND &amp; VIBE:</span>
                    <strong style="color:#00c3e3;">★★★★★ 9.7</strong>
                  </div>
                  <div class="radar-verdict-box">
                    ${s.hook.verdict}
                  </div>
                </div>

                <div class="pakwatch-counselor-box">
                  <strong>PRO STRATEGY:</strong> ${s.hook.counselorTip}
                </div>

                <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="pakwatch-btn-source">
                  READ FULL REPORT ON ${s.source.toUpperCase()} ↗
                </a>
              </div>
            </div>
          </div>

          <footer class="pakwatch-bottom-folio">
            <span>THE 8 BIT BISTRO // PAK WATCH RADAR // CURATED FROM <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:#00c3e3;">${s.source} ↗</a></span>
            <div class="dpad-controller-graphic" style="color:#00c3e3;">✚ (SELECT) (START)</div>
            <span>PAGE ${String(pageNum).padStart(2, '0')} OF 30</span>
          </footer>
        </article>
      `;
    }
  });

  // 5. Assemble Full Standalone 8bit.html File with Authentic Nintendo Magazine CSS
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>THE 8 BIT BISTRO MAG — Official Nintendo Power Edition (Vol. ${newVol})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Space+Grotesk:wght@400;500;600;700;800&family=Press+Start+2P&family=Righteous&display=swap" rel="stylesheet">
  <style>
    :root {
      --nintendo-red: #e60012;
      --nintendo-red-dark: #b8000e;
      --star-yellow: #ffeb00;
      --star-yellow-dark: #ffd000;
      --joycon-cyan: #00c3e3;
      --joycon-blue: #0096c7;
      --luigi-green: #00c853;
      --charcoal-bg: #12131a;
      --card-dark: #1a1c26;
      --white-sheet: #ffffff;
      --font-display: 'Rubik', sans-serif;
      --font-body: 'Space Grotesk', -apple-system, sans-serif;
      --font-retro: 'Press Start 2P', monospace;
      --font-badge: 'Righteous', sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: #0a0b10;
      color: #1a1a24;
      font-family: var(--font-body);
      min-height: 100vh;
      overflow-x: hidden;
      line-height: 1.6;
    }

    /* Fixed Nintendo Red Top Editor / Reader Bar */
    .nintendo-top-bar {
      position: sticky;
      top: 0;
      z-index: 10000;
      background: var(--nintendo-red);
      border-bottom: 3px solid #000;
      box-shadow: 0 4px 25px rgba(230, 0, 18, 0.4), 0 8px 30px rgba(0, 0, 0, 0.6);
      padding: 8px 24px;
    }

    .nintendo-bar-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto;
      gap: 16px;
      flex-wrap: wrap;
    }

    .brand-cluster {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .nintendo-capsule-btn {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 14px;
      background: #ffffff;
      color: var(--nintendo-red);
      padding: 6px 18px;
      border-radius: 9999px;
      border: 2px solid #000;
      text-decoration: none;
      box-shadow: 2px 2px 0 #000;
      letter-spacing: 0.05em;
    }

    .brand-edition-title {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      color: #ffffff;
      font-size: 15px;
      letter-spacing: 0.08em;
      text-shadow: 2px 2px 0 #000;
    }

    .brand-status-pill {
      font-family: var(--font-badge);
      font-size: 12px;
      background: var(--star-yellow);
      color: #000;
      padding: 3px 10px;
      border-radius: 4px;
      border: 1.5px solid #000;
      box-shadow: 2px 2px 0 #000;
      font-weight: 700;
    }

    .top-action-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .action-btn {
      font-family: var(--font-display);
      font-weight: 800;
      font-style: italic;
      font-size: 12px;
      padding: 7px 16px;
      border-radius: 6px;
      border: 2px solid #000;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      box-shadow: 3px 3px 0 #000;
      transition: transform 0.12s ease, box-shadow 0.12s ease;
    }

    .action-btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 5px 5px 0 #000;
    }

    .action-btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 #000;
    }

    .btn-generate {
      background: var(--star-yellow);
      color: #000;
      border-color: #000;
    }

    .btn-pdf {
      background: #ffffff;
      color: var(--nintendo-red);
      border-color: #000;
    }

    .btn-kiosk {
      background: #111;
      color: #fff;
      border-color: #000;
    }

    /* Page Navigation Pager Track */
    .nintendo-nav-track {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding: 6px 0 2px;
      max-width: 1400px;
      margin: 4px auto 0;
      scrollbar-width: thin;
    }

    .nav-pill-btn {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 10px;
      padding: 4px 10px;
      background: rgba(0, 0, 0, 0.4);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      cursor: pointer;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .nav-pill-btn:hover, .nav-pill-btn.active {
      background: var(--star-yellow);
      color: #000;
      border-color: #000;
      box-shadow: 0 0 10px var(--star-yellow);
    }

    /* Magazine Canvas (A4 Dimensions Proportional) */
    .magazine-canvas {
      max-width: 800px;
      margin: 36px auto 80px;
      padding: 0 16px;
    }

    /* Base Page Sheet Standard */
    .nintendo-page {
      width: 800px;
      min-height: 1130px;
      height: 1130px;
      margin: 0 auto 48px;
      position: relative;
      overflow: hidden;
      background: #ffffff;
      border: 3px solid #000;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* ========================================================
       PAGE 01: HERO COVER (NINTENDO POWER STYLE)
       ======================================================== */
    .page-cover {
      background: #000;
      border-color: var(--nintendo-red);
    }

    .cover-hero-photo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 20%;
      filter: brightness(0.85) contrast(1.15);
    }

    .cover-vignette-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.88) 0%,
        rgba(0, 0, 0, 0.3) 25%,
        rgba(0, 0, 0, 0.25) 55%,
        rgba(0, 0, 0, 0.85) 85%,
        #000000 100%
      );
      z-index: 2;
    }

    .cover-content-wrap {
      position: relative;
      z-index: 3;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24px 32px 20px;
    }

    .cover-top-strap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--nintendo-red);
      border: 2px solid #000;
      box-shadow: 4px 4px 0 #000;
      padding: 6px 14px;
      border-radius: 4px;
    }

    .capsule-pill {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      background: #ffffff;
      color: var(--nintendo-red);
      padding: 3px 12px;
      border-radius: 9999px;
      font-size: 11px;
      letter-spacing: 0.05em;
    }

    .strap-edition-label {
      font-family: var(--font-display);
      font-weight: 800;
      font-style: italic;
      color: #ffffff;
      font-size: 11px;
      letter-spacing: 0.1em;
    }

    .strap-date-tag {
      font-family: var(--font-badge);
      color: var(--star-yellow);
      font-size: 12px;
      font-weight: 700;
    }

    /* Giant Slanted Masthead */
    .cover-masthead-center {
      text-align: center;
      margin: 14px 0 0;
    }

    .masthead-slanted-title {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: clamp(48px, 6.8vw, 68px);
      line-height: 0.95;
      color: var(--star-yellow);
      text-transform: uppercase;
      letter-spacing: -0.02em;
      transform: skew(-5deg);
      text-shadow: 
        4px 4px 0 #000, 
        8px 8px 0 var(--nintendo-red),
        0 0 30px rgba(255, 235, 0, 0.4);
    }

    .masthead-yellow-subline {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 15px;
      color: #ffffff;
      letter-spacing: 0.22em;
      margin-top: 6px;
      text-shadow: 2px 2px 0 #000;
    }

    /* Official Gold Seal of Quality */
    .official-gold-seal {
      position: absolute;
      top: 110px;
      right: 32px;
      width: 104px;
      height: 104px;
      background: radial-gradient(circle, #ffe600 0%, #ffd000 65%, #d4a000 100%);
      border: 3px dashed #000;
      border-radius: 50%;
      box-shadow: 4px 4px 0 #000, 0 0 20px rgba(255, 230, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(-10deg);
      z-index: 5;
    }

    .seal-inner {
      text-align: center;
      color: #000;
      line-height: 1.1;
    }

    .seal-stars { font-size: 9px; letter-spacing: 1px; color: #b8000e; }
    .seal-text-small { font-family: var(--font-display); font-weight: 900; font-size: 7.5px; letter-spacing: 0.05em; }
    .seal-text-bold { font-family: var(--font-display); font-weight: 900; font-style: italic; font-size: 8px; color: var(--nintendo-red-dark); }
    .seal-sub { font-size: 6px; font-weight: 800; letter-spacing: 0.1em; }

    /* Side Teasers */
    .cover-side-teasers {
      position: absolute;
      top: 190px;
      left: 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 220px;
      z-index: 4;
    }

    .teaser-card {
      background: rgba(0, 0, 0, 0.88);
      border: 2px solid #fff;
      border-left: 5px solid var(--nintendo-red);
      padding: 6px 10px;
      box-shadow: 3px 3px 0 #000;
    }

    .teaser-badge {
      display: inline-block;
      font-family: var(--font-display);
      font-weight: 900;
      font-size: 8.5px;
      background: var(--nintendo-red);
      color: #fff;
      padding: 2px 6px;
      border-radius: 3px;
      margin-bottom: 3px;
    }

    .teaser-text {
      font-family: var(--font-display);
      font-weight: 800;
      font-style: italic;
      font-size: 11px;
      color: #ffffff;
      line-height: 1.25;
    }

    /* Bottom Feature Block */
    .cover-bottom-feature-card {
      background: rgba(18, 19, 26, 0.94);
      border: 3px solid var(--star-yellow);
      box-shadow: 6px 6px 0 #000, 10px 10px 0 var(--nintendo-red);
      padding: 20px 24px;
      border-radius: 6px;
      margin-top: auto;
      margin-bottom: 12px;
    }

    .feature-tag-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .feature-tilted-badge {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 9.5px;
      background: var(--nintendo-red);
      color: #fff;
      padding: 4px 10px;
      transform: skew(-4deg);
      border: 1px solid #fff;
      box-shadow: 2px 2px 0 #000;
    }

    .feature-source-badge {
      font-family: var(--font-badge);
      font-size: 11px;
      background: var(--joycon-cyan);
      color: #000;
      padding: 3px 8px;
      font-weight: 800;
    }

    .feature-plat-badge {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 10px;
      background: #000;
      color: var(--star-yellow);
      border: 1px solid var(--star-yellow);
      padding: 2px 8px;
    }

    .cover-feature-heading {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 23px;
      line-height: 1.25;
      margin-bottom: 10px;
    }

    .cover-link-title {
      color: #ffffff;
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .cover-link-title:hover {
      color: var(--star-yellow);
      text-shadow: 0 0 10px var(--star-yellow);
    }

    .cover-feature-lead {
      font-size: 14px;
      line-height: 1.48;
      color: #cbd5e1;
      margin-bottom: 12px;
    }

    .cover-feature-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .nintendo-btn-primary {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 11px;
      background: var(--nintendo-red);
      color: #fff;
      padding: 8px 16px;
      border: 2px solid #000;
      text-decoration: none;
      box-shadow: 3px 3px 0 #000;
    }
    .nintendo-btn-primary:hover {
      background: #ff1f35;
      transform: translate(-1px, -1px);
    }

    .cover-counselor-callout {
      background: #000;
      border: 1px solid var(--star-yellow);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      max-width: 440px;
    }

    .counselor-bubble-title { color: var(--star-yellow); font-family: var(--font-display); font-weight: 900; margin-right: 4px; }
    .counselor-bubble-text { color: #e2e8f0; font-style: italic; }

    .cover-footer-barcode-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 10px;
      font-family: var(--font-display);
      font-size: 10px;
      color: #94a3b8;
    }

    .barcode-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .barcode-bars {
      font-family: monospace;
      letter-spacing: 2px;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
    }

    /* ========================================================
       SPREAD 1: POWER FEATURE STRATEGY (CINEMATIC FULL SPREAD)
       ======================================================== */
    .page-strategy-spread {
      background: #000;
      border-color: #000;
    }

    .spread-hero-photo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(0.85) contrast(1.1);
    }

    .spread-cinema-scrim {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 35%, rgba(0, 0, 0, 0.75) 100%);
      z-index: 2;
    }

    .nintendo-folio-top {
      position: relative;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.88);
      border-bottom: 2px solid var(--star-yellow);
      padding: 8px 24px;
      font-family: var(--font-display);
      font-size: 10px;
      color: #fff;
    }

    .folio-capsule {
      font-weight: 900;
      font-style: italic;
      color: var(--nintendo-red);
      background: #fff;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-right: 8px;
    }

    .folio-section-tag {
      font-weight: 900;
      font-style: italic;
      color: var(--star-yellow);
      letter-spacing: 0.1em;
    }

    .hazard-tape-mini {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      color: #000;
      background: var(--star-yellow);
      padding: 2px 10px;
      border: 1px solid #000;
    }

    .page-number-pill {
      background: var(--nintendo-red);
      color: #fff;
      padding: 3px 10px;
      border-radius: 9999px;
      font-weight: 800;
    }

    .strategy-floating-card {
      position: absolute;
      bottom: 50px;
      right: 28px;
      width: 500px;
      max-width: calc(100% - 56px);
      background: rgba(18, 19, 26, 0.96);
      border: 3px solid var(--star-yellow);
      box-shadow: 6px 6px 0 #000, 10px 10px 0 var(--nintendo-red);
      border-radius: 6px;
      padding: 20px 24px;
      z-index: 4;
    }

    .card-racing-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--nintendo-red);
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    .card-eyebrow {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 11px;
      color: var(--star-yellow);
      letter-spacing: 0.08em;
    }

    .card-power-meter {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 11px;
      color: var(--joycon-cyan);
    }

    .strategy-card-title {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 18px;
      line-height: 1.3;
      margin-bottom: 10px;
    }

    /* Segmented Power Gauge */
    .segmented-power-gauge {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #000;
      border: 1.5px solid rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      margin-bottom: 12px;
      border-radius: 3px;
    }

    .gauge-label { font-family: var(--font-display); font-weight: 900; font-size: 9px; color: var(--nintendo-red); }
    .gauge-bar-track { flex: 1; height: 10px; background: #2a1114; border-radius: 2px; overflow: hidden; }
    .gauge-bar-fill { height: 100%; background: linear-gradient(90deg, var(--nintendo-red), var(--star-yellow)); }
    .gauge-score { font-family: var(--font-display); font-weight: 900; font-size: 10px; color: var(--star-yellow); }

    .strategy-card-lead {
      font-size: 14px;
      line-height: 1.45;
      color: #e2e8f0;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .strategy-card-body {
      font-size: 13px;
      line-height: 1.45;
      color: #94a3b8;
      margin-bottom: 12px;
    }

    /* Comic Speech Bubble with Tail */
    .counselor-speech-box {
      position: relative;
      background: #000;
      border: 2px solid var(--star-yellow);
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 12.5px;
      line-height: 1.4;
      color: #fff;
      margin-bottom: 14px;
    }

    .speech-tail {
      position: absolute;
      top: -8px;
      left: 20px;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid var(--star-yellow);
    }

    .strategy-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
      gap: 10px;
    }

    .footer-platform-pills { display: flex; gap: 6px; }

    .plat-pill {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 8px;
      padding: 3px 8px;
      border-radius: 3px;
    }

    .plat-switch { background: var(--nintendo-red); color: #fff; }
    .plat-rating { background: var(--star-yellow); color: #000; }

    .nintendo-btn-action {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 9.5px;
      background: var(--joycon-cyan);
      color: #000;
      padding: 6px 12px;
      border: 1.5px solid #000;
      text-decoration: none;
      box-shadow: 2px 2px 0 #000;
    }
    .nintendo-btn-action:hover {
      background: #38d8f0;
    }

    .nintendo-folio-bottom {
      position: relative;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.9);
      border-top: 2px solid var(--nintendo-red);
      padding: 8px 24px;
      font-family: var(--font-display);
      font-size: 10px;
      color: #94a3b8;
    }

    .dpad-controller-graphic {
      font-family: monospace;
      font-size: 12px;
      color: var(--star-yellow);
      letter-spacing: 2px;
    }

    /* ========================================================
       SPREAD 2: CLASSIFIED INFORMATION (WHITE GLOSSY SHEET)
       ======================================================== */
    .page-classified-white {
      background: #ffffff;
      color: #12131a;
      padding: 0;
    }

    .classified-top-header {
      width: 100%;
    }

    .classified-red-banner {
      background: var(--nintendo-red);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 24px;
      color: #fff;
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
    }

    .classified-pill {
      background: #ffffff;
      color: var(--nintendo-red);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
    }

    .classified-title {
      font-size: 12px;
      letter-spacing: 0.1em;
      color: var(--star-yellow);
    }

    .classified-page-badge {
      background: #000;
      color: #fff;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 10px;
    }

    .hazard-stripe-bar {
      height: 8px;
      background: repeating-linear-gradient(
        -45deg,
        #ffd000,
        #ffd000 12px,
        #000000 12px,
        #000000 24px
      );
      border-bottom: 2px solid #000;
    }

    .classified-main-content {
      padding: 24px 32px 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .classified-tag-yellow {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 10.5px;
      background: var(--star-yellow);
      color: #000;
      padding: 3px 8px;
      border: 1.5px solid #000;
      box-shadow: 2px 2px 0 #000;
    }

    .secret-stamp-tilted {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 12px;
      color: var(--nintendo-red);
      border: 2px solid var(--nintendo-red);
      padding: 2px 8px;
      transform: rotate(-6deg);
      letter-spacing: 0.12em;
    }

    .classified-heading {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 24px;
      line-height: 1.25;
      color: #000;
      margin: 10px 0 16px;
    }

    .classified-grid {
      display: grid;
      grid-template-columns: 310px 1fr;
      gap: 24px;
      flex: 1;
    }

    .nintendo-framed-photo {
      position: relative;
      border: 3px solid #000;
      box-shadow: 5px 5px 0 var(--nintendo-red);
      border-radius: 4px;
      overflow: hidden;
      height: 220px;
      margin-bottom: 14px;
    }

    .nintendo-framed-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .photo-pointer-arrow {
      position: absolute;
      top: 10px;
      left: 10px;
      background: var(--nintendo-red);
      color: #fff;
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 9px;
      padding: 3px 8px;
      border: 1px solid #fff;
      box-shadow: 2px 2px 0 #000;
      transform: rotate(-8deg);
    }

    .photo-caption-bar {
      position: absolute;
      bottom: 0;
      inset-inline: 0;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-family: var(--font-display);
      font-size: 8px;
      padding: 4px 8px;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid var(--star-yellow);
    }

    .warp-zone-card {
      background: #fff8d6;
      border: 2px dashed #000;
      border-left: 6px solid var(--nintendo-red);
      padding: 10px 12px;
      box-shadow: 3px 3px 0 #000;
    }

    .warp-zone-header {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 10.5px;
      color: var(--nintendo-red);
      margin-bottom: 4px;
    }

    .warp-zone-body {
      font-size: 12px;
      line-height: 1.4;
      color: #2a2200;
      font-weight: 600;
    }

    .editorial-lead-para {
      font-size: 15px;
      line-height: 1.5;
      font-weight: 700;
      color: #000000;
      margin-bottom: 12px;
    }

    .editorial-text-para {
      font-size: 13.5px;
      line-height: 1.55;
      color: #334155;
      margin-bottom: 12px;
    }

    .classified-quote-frame {
      background: #f1f5f9;
      border-left: 4px solid var(--nintendo-red);
      padding: 10px 14px;
      margin: 12px 0;
    }

    .quote-speaker-tag {
      font-family: var(--font-display);
      font-weight: 900;
      font-size: 8.5px;
      color: var(--nintendo-red);
      margin-bottom: 4px;
    }

    .quote-body-text {
      font-size: 13px;
      line-height: 1.4;
      font-style: italic;
      color: #1e293b;
    }

    .classified-action-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      gap: 10px;
    }

    .plat-tag-dark {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 9px;
      background: #000;
      color: #fff;
      padding: 4px 8px;
    }

    .nintendo-pill-btn {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 9px;
      background: var(--nintendo-red);
      color: #fff;
      padding: 6px 12px;
      border: 1.5px solid #000;
      text-decoration: none;
      box-shadow: 2px 2px 0 #000;
    }
    .nintendo-pill-btn:hover { background: var(--nintendo-red-dark); }

    .classified-bottom-folio {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 2px solid #000;
      padding: 10px 32px;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 10px;
      color: #64748b;
      background: #f8fafc;
    }

    /* ========================================================
       SPREAD 3: PAK WATCH PREVIEW (NEON CYAN & CHARCOAL SHEET)
       ======================================================== */
    .page-pakwatch-cyan {
      background: #10121a;
      color: #ffffff;
      padding: 0;
    }

    .pakwatch-top-header { width: 100%; }

    .pakwatch-brand-bar {
      background: var(--joycon-cyan);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 24px;
      color: #000;
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      border-bottom: 2px solid #000;
    }

    .pakwatch-pill {
      background: #000;
      color: var(--joycon-cyan);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
    }

    .pakwatch-title { font-size: 12px; letter-spacing: 0.1em; color: #000; }
    .pakwatch-page-badge { background: #fff; color: #000; padding: 2px 8px; border-radius: 3px; font-size: 10px; }

    .pakwatch-main-content {
      padding: 20px 32px 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .pakwatch-badge-yellow {
      display: inline-block;
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 10px;
      background: var(--star-yellow);
      color: #000;
      padding: 3px 8px;
      margin-bottom: 6px;
    }

    .pakwatch-heading {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 23px;
      line-height: 1.25;
      margin-bottom: 14px;
    }

    /* Joy-Con Split Frame: Left Neon Blue, Right Neon Red */
    .joycon-split-frame {
      position: relative;
      height: 240px;
      border-top: 4px solid var(--joycon-cyan);
      border-bottom: 4px solid var(--joycon-cyan);
      border-left: 8px solid var(--joycon-cyan);
      border-right: 8px solid var(--nintendo-red);
      box-shadow: 6px 6px 0 #000;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 18px;
    }

    .joycon-split-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .frame-tag-left {
      position: absolute;
      top: 8px;
      left: 8px;
      background: var(--joycon-cyan);
      color: #000;
      font-family: var(--font-display);
      font-weight: 900;
      font-size: 7.5px;
      padding: 2px 6px;
    }

    .frame-tag-right {
      position: absolute;
      top: 8px;
      right: 8px;
      background: var(--nintendo-red);
      color: #fff;
      font-family: var(--font-display);
      font-weight: 900;
      font-size: 7.5px;
      padding: 2px 6px;
    }

    .pakwatch-text-grid {
      display: grid;
      grid-template-columns: 1fr 270px;
      gap: 24px;
      flex: 1;
    }

    .pakwatch-lead-para {
      font-size: 15px;
      line-height: 1.5;
      color: #f8fafc;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .pakwatch-body-para {
      font-size: 13.5px;
      line-height: 1.55;
      color: #94a3b8;
      margin-bottom: 10px;
    }

    /* Power Radar Evaluation Box */
    .power-radar-card {
      background: #1b1e2a;
      border: 2px solid var(--joycon-cyan);
      box-shadow: 4px 4px 0 #000;
      padding: 12px 14px;
      margin-bottom: 12px;
    }

    .radar-card-title {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 10px;
      color: var(--star-yellow);
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 4px;
      margin-bottom: 8px;
    }

    .radar-stat-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 5px;
      font-family: var(--font-display);
    }

    .radar-verdict-box {
      background: #000;
      color: var(--star-yellow);
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 10px;
      padding: 4px 8px;
      margin-top: 6px;
      text-align: center;
      border: 1px solid var(--star-yellow);
    }

    .pakwatch-counselor-box {
      background: #000;
      border-left: 4px solid var(--star-yellow);
      padding: 8px 12px;
      font-size: 12px;
      line-height: 1.4;
      color: #e2e8f0;
      margin-bottom: 12px;
    }

    .pakwatch-btn-source {
      display: block;
      text-align: center;
      background: var(--joycon-cyan);
      color: #000;
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 10px;
      padding: 8px 12px;
      border: 2px solid #000;
      text-decoration: none;
      box-shadow: 3px 3px 0 #000;
    }
    .pakwatch-btn-source:hover { background: #38d8f0; }

    .pakwatch-bottom-folio {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 2px solid var(--joycon-cyan);
      padding: 10px 32px;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 10px;
      color: #64748b;
      background: #0b0d14;
    }

    /* Modal Progress Backdrop */
    .nintendo-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 20000;
      display: none;
      align-items: center;
      justify-content: center;
    }

    .nintendo-modal-backdrop.open { display: flex; }

    .nintendo-modal-card {
      background: #ffffff;
      border: 4px solid #000;
      box-shadow: 8px 8px 0 var(--nintendo-red);
      padding: 36px 32px;
      max-width: 520px;
      width: 90%;
      text-align: center;
    }

    .modal-nintendo-title {
      font-family: var(--font-display);
      font-weight: 900;
      font-style: italic;
      font-size: 20px;
      color: var(--nintendo-red);
      margin-bottom: 10px;
    }

    .modal-step-list {
      text-align: left;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 14px;
      color: #1e293b;
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
      .nintendo-top-bar, .nintendo-modal-backdrop {
        display: none !important;
      }
      .magazine-canvas {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .nintendo-page {
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
       TOP NINTENDO POWER TOOLBAR
       ======================================================== -->
  <header class="nintendo-top-bar">
    <div class="nintendo-bar-main">
      <div class="brand-cluster">
        <a href="/" class="action-btn btn-kiosk" title="Return to Magazine Selection Kiosk">← KIOSK</a>
        <span class="nintendo-capsule-btn">( THE 8 BIT BISTRO )</span>
        <span class="brand-edition-title">NINTENDO POWER EDITION</span>
        <span class="brand-status-pill">★ 30 PACKED PAGES</span>
      </div>

      <div class="top-action-buttons">
        <button class="action-btn btn-generate" onclick="triggerNintendoScrape()" title="Scrape live gaming news and compile fresh 30-Page Issue">
          ⚡ GENERATE 30-PAGE POWER ISSUE
        </button>

        <button id="btnSavePdf" class="action-btn btn-pdf" onclick="saveNintendoPdf()" title="Direct 1-Click A4 PDF Download">
          📄 SAVE AS PDF
        </button>

        <button class="action-btn" style="background:#fff; color:#000;" onclick="saveNintendoHtml()" title="Save clean HTML copy">
          💾 SAVE HTML
        </button>
      </div>
    </div>

    <!-- 30 Page Navigation Pager -->
    <nav class="nintendo-nav-track">
      <button class="nav-pill-btn active" onclick="jumpToStage('stage-1')">PAGE 01 (COVER)</button>
      ${Array.from({ length: 29 }, (_, i) => {
        const num = i + 2;
        const pad = String(num).padStart(2, '0');
        return `<button class="nav-pill-btn" onclick="jumpToStage('stage-${num}')">P-${pad}</button>`;
      }).join('\n      ')}
    </nav>
  </header>

  <!-- ========================================================
       30-PAGE NINTENDO MAGAZINE WORKSPACE
       ======================================================== -->
  <main class="magazine-canvas">
    ${mainContentHtml}
  </main>

  <!-- ========================================================
       PROGRESS MODAL ("NOW YOU'RE PLAYING WITH POWER!")
       ======================================================== -->
  <div id="nintendoModal" class="nintendo-modal-backdrop">
    <div class="nintendo-modal-card">
      <div style="font-size: 42px; margin-bottom: 10px;">🍄⭐🎮</div>
      <h3 id="modalTitle" class="modal-nintendo-title">NOW YOU'RE PLAYING WITH POWER!</h3>
      <p id="modalSub" style="font-size: 14px; color: #475569; margin-bottom: 14px;">
        Harvesting latest dispatches from Polygon, Kotaku, PC Gamer &amp; Eurogamer...
      </p>

      <div class="modal-step-list">
        <div id="step1" style="color: var(--nintendo-red);">⏳ [1/3] Ingesting RSS feeds &amp; filtering covered stories...</div>
        <div id="step2">⏳ [2/3] Writing counselor tips, power meters &amp; strategies...</div>
        <div id="step3">⏳ [3/3] Assembling 30-page Nintendo Power spreads &amp; PDF...</div>
      </div>
    </div>
  </div>

  <script>
    function jumpToStage(id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        document.querySelectorAll('.nav-pill-btn').forEach(b => b.classList.remove('active'));
        if (event && event.target && event.target.classList.contains('nav-pill-btn')) {
          event.target.classList.add('active');
        }
      }
    }

    // Direct 1-Click PDF Download (No print dialogs!)
    async function saveNintendoPdf() {
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
        a.download = 'The_8Bit_Bistro_Nintendo_Power_Vol_${newVol}_30_Pages.pdf';
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
    function saveNintendoHtml() {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('.nintendo-modal-backdrop').forEach(m => m.classList.remove('open'));
      const blob = new Blob(["<!DOCTYPE html>\\n" + clone.outerHTML], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '8bit.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Trigger Autonomous Gaming Scraper
    async function triggerNintendoScrape() {
      const modal = document.getElementById('nintendoModal');
      const modalTitle = document.getElementById('modalTitle');
      const modalSub = document.getElementById('modalSub');
      const s1 = document.getElementById('step1');
      const s2 = document.getElementById('step2');
      const s3 = document.getElementById('step3');

      modal.classList.add('open');

      try {
        setTimeout(() => {
          s1.innerHTML = '✅ [1/3] Harvested fresh gaming stories from 4 feeds!';
          s1.style.color = 'var(--luigi-green)';
          s2.innerHTML = '⏳ [2/3] Writing counselor tips &amp; classified intel...';
          s2.style.color = 'var(--nintendo-red)';
        }, 1200);

        setTimeout(() => {
          s2.innerHTML = '✅ [2/3] Written counselor tips &amp; classified intel';
          s2.style.color = 'var(--luigi-green)';
          s3.innerHTML = '⏳ [3/3] Compiling 30 pages &amp; staging PDF buffer...';
          s3.style.color = 'var(--nintendo-red)';
        }, 2500);

        const res = await fetch('/api/scrape-and-generate?pub=8bit');
        const data = await res.json();

        if (data.success) {
          s3.innerHTML = '✅ [3/3] Compiled 30 pages (Skipped ' + (data.skippedCoveredCount || 0) + ' covered stories)';
          s3.style.color = 'var(--luigi-green)';
          modalTitle.innerText = 'MISSION ACCOMPLISHED! // VOL. ' + data.edition;
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
    title: `THE 8 BIT BISTRO MAG // NINTENDO POWER EDITION VOL. ${newVol}`,
    tagline: `Power Edition: ${heroStory.title}`,
    totalStories: 30,
    pageCount: 30,
    coverGame: heroStory.title,
    sources: ["Polygon", "Kotaku", "PC Gamer", "Eurogamer"],
    featuredStories: newlyCoveredStories,
    skippedPreviouslyCoveredCount: skippedCount,
    editorialNotes: `Autonomous live harvest compiled on ${new Date().toISOString()} - 30 pages generated in Nintendo Power / Official Nintendo Magazine style; skipped ${skippedCount} previously covered stories.`
  });

  fs.writeFileSync(EDITIONS_8BIT_FILE, JSON.stringify(memory, null, 2), 'utf8');

  console.log(`✅ [NINTENDO POWER COMPLETE] Compiled Vol. ${newVol} featuring "${heroStory.title}"! Skipped ${skippedCount} previously covered stories.`);

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
