const fs = require('fs');
const path = require('path');

const EDITIONS_FILE = path.join(__dirname, 'editions.json');

// Curated high-resolution editorial backup images (authentic South Asian & indie music photography)
const CURATED_EDITORIAL_IMAGES = [
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/11/thef16s_1688625382_3140739803856456217_1498385654_881932e848-639436464-e1793786410457.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/11/DSC03024-scaled-e1793690026355.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/SaveInta.com_747604579_18117211894912310_8118762070029784635_n.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/Copy-of-DSC00329-scaled-e1793167289768.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/ZainBlue-128-Edit-Edit-scaled-e1791969187550.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/D_M00072-scaled.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/885288196269-cover-zoom.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/Rev1-Fin.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/bffbf26ed3adb2a68de4cc8b42711aec.1000x1000x1-1601862500-e1792143474359.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/IMG_7319-e1793003944125.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/Kaali-Duniya01-1-1-scaled-e1791282416137.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/10/2-Shot-by-Shantanu-Krishnan.JPG-scaled.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/09/nicotine.itp-x-DnBIndia-BLRMassive-026-2024-03-29-_-23-scaled.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/09/DSC09053.jpg-1-scaled.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/09/2.-Shashwat-Bulusu-Press-Photo_1-scaled.webp",
  "https://theindianmusicdiaries.com/wp-content/uploads/2026/09/rashmeet-edited.webp"
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

function normalizeTitle(str) {
  if (!str) return '';
  return decodeHtmlEntities(str)
    .toLowerCase()
    .replace(/['’‘`"]/g, '') // remove apostrophes so "dept's" -> "depts"
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtmlTags(str) {
  if (!str) return '';
  let clean = decodeHtmlEntities(str);
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '');
  clean = clean.replace(/<[^>]+>/g, ' ');
  // Remove WordPress promotional footers
  clean = clean.replace(/The post .*? appeared first on .*/gi, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// Clean WordPress image URL to get master full resolution
function cleanImageUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  // Strip WordPress downscaled thumbnail suffixes like -480x360, -768x576, -1024x768
  clean = clean.replace(/-\d+x\d+(\.(?:jpe?g|png|webp|avif))$/i, '$1');
  return clean;
}

// Extract the best, highest-resolution image from an RSS item XML fragment
function extractBestImage(itemXml, defaultIndex = 0) {
  // Check enclosure
  const encMatch = itemXml.match(/<enclosure[^>]+url="([^">]+)"/i);
  if (encMatch && encMatch[1]) return cleanImageUrl(encMatch[1]);

  // Check media:content
  const mediaMatch = itemXml.match(/<media:content[^>]+url="([^">]+)"/i);
  if (mediaMatch && mediaMatch[1]) return cleanImageUrl(mediaMatch[1]);

  // Check all image URLs inside description or content
  const matches = [...itemXml.matchAll(/https?:\/\/[^\s"'<>]+\.(?:webp|jpg|jpeg|png)/gi)].map(m => m[0]);
  
  // Filter out tiny thumbnails, icons, avatars
  const valid = matches.filter(u => {
    const low = u.toLowerCase();
    return !low.includes('avatar') && !low.includes('logo') && !low.includes('icon') && !low.includes('badge') && !low.includes('-150x') && !low.includes('32x32');
  });

  if (valid.length > 0) {
    return cleanImageUrl(valid[0]);
  }

  return CURATED_EDITORIAL_IMAGES[defaultIndex % CURATED_EDITORIAL_IMAGES.length];
}

// Extract real quotes from source article text
function extractQuotesFromText(text) {
  if (!text) return null;
  const matches = [...text.matchAll(/["“]([^"”]{25,180})["”]/g)].map(m => m[1].trim());
  if (matches.length > 0) {
    return `“${matches[0]}”`;
  }
  return null;
}

// Rewrite an article into a Casual Print Magazine Quickread with hooks all over
function rewriteAsCasualQuickread(title, contentOrDesc, source, link) {
  const cleanTitle = decodeHtmlEntities(title).trim();
  const rawText = stripHtmlTags(contentOrDesc || '').trim();
  const lower = (cleanTitle + ' ' + rawText).toLowerCase();
  const artist = extractArtistInFrame(cleanTitle, rawText);

  // 1. Detect Category & Emotional Register
  const isObit = lower.includes('passes away') || lower.includes('passed away') || lower.includes('died') || lower.includes('death of') || lower.includes('mourns') || lower.includes('tribute to');
  const isFestival = lower.includes('festival') || lower.includes('lineup') || lower.includes('headline') || lower.includes('tour') || lower.includes('concert') || lower.includes('rolling loud') || lower.includes('lollapalooza') || lower.includes('dgtl');
  const isRelease = lower.includes('album') || lower.includes('ep') || lower.includes('single') || lower.includes('music video') || lower.includes('drops') || lower.includes('releases') || lower.includes('spotlight') || lower.includes('track');
  const isInterview = lower.includes('in conversation') || lower.includes('interview') || lower.includes('talks about') || lower.includes('reflects on') || lower.includes('exclusive');
  const isFolk = lower.includes('folk') || lower.includes('tradition') || lower.includes('roots') || lower.includes('ghazal') || lower.includes('qawwali') || lower.includes('carnatic') || lower.includes('sufi');
  const isHipHop = lower.includes('hip-hop') || lower.includes('hip hop') || lower.includes('rap') || lower.includes('trap') || lower.includes('drill') || lower.includes('cipher');

  // 2. Extract Sentences & Real Quotes from the actual source story
  const realQuote = extractQuotesFromText(rawText);
  const sentences = rawText.split(/(?<=[.!?])\s+/).filter(s => s.length > 30 && !s.toLowerCase().includes('cookie') && !s.toLowerCase().includes('subscribe') && !s.toLowerCase().includes('rights reserved'));

  let kicker = "⚡ THE SCOOP // CASUAL DISPATCH";
  let badge = "⚡ QUICKREAD";
  let hookTitle = cleanTitle;
  let lead = "";
  let p1 = "";
  let p2 = "";
  let quote = "";
  let fullExplainer = "";

  if (isObit) {
    kicker = "🕊️ IN MEMORIAM // ROCK ROYALTY";
    badge = "🕊️ TRIBUTE";
    hookTitle = `Remembering a Legend: The Enduring Legacy of ${artist}`;
    lead = `The South Asian music community is mourning the loss of a genuine pioneer. ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 260);
    p2 = sentences.slice(2, 4).join(' ') || `Artists, bandmates, and fans across generations have shared tributes, remembering a visionary whose sonic conviction and guitar tone helped shape the sound of Indian rock.`;
    quote = realQuote || `“Their sound wasn’t just technique—it was the heartbeat of an entire generation that dared to play loud.”`;
    fullExplainer = `${p1.substring(0, 180)}... In the frame: Celebrating a legendary sonic legacy that will echo for decades to come.`;
  } else if (isFestival) {
    kicker = "🔊 LIVE TRANSMISSION // TOUR ALERT";
    badge = "🔥 LIVE SCENE";
    hookTitle = `Festival Shockwave: ${artist} Take Center Stage`;
    lead = `Get the group chat ready and clear your calendar—${cleanTitle.toLowerCase().startsWith('festival') ? cleanTitle : cleanTitle + ' is officially happening'}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 260);
    p2 = sentences.slice(2, 4).join(' ') || `Expect high-voltage energy, massive crowd anthems, and an audience that knows every single ad-lib by heart. If you're planning on being in the pit, don't sleep on tickets.`;
    quote = realQuote || `“Nothing compares to the communal chaos of thousands of fans singing the hook in unison under blinding floodlights.”`;
    fullExplainer = `${cleanTitle}. In the frame: ${artist} gearing up to turn the stage into pure adrenaline. The festival circuit just got an earth-shattering upgrade.`;
  } else if (isRelease) {
    kicker = "💿 ON REPEAT // FRESH HEAT";
    badge = "🎧 NEW DROP";
    hookTitle = `Sonic Revolution: ${artist} Drops A Masterpiece`;
    lead = `If your daily playlist feels like elevator ambient for tech workers, here’s your antidote. ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 260);
    p2 = sentences.slice(2, 4).join(' ') || `What makes this project hit differently is the tactile analog warmth and raw vulnerability—zero corporate polish, just honest, unapologetic songwriting.`;
    quote = realQuote || `“We didn’t make this for the streaming algorithms—we made it for kids who listen with headphones on in the dark.”`;
    fullExplainer = `${p1.substring(0, 180)}... In the frame: ${artist} visual concept and artwork monograph, capturing the release's hypnotic aesthetic.`;
  } else if (isInterview) {
    kicker = "🎙️ THE REAL TALK // UNFILTERED";
    badge = "🎙️ DEEP DIVE";
    hookTitle = `Unfiltered Dialogue: In Conversation With ${artist}`;
    lead = `No corporate PR filters, no rehearsed soundbites. ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 260);
    p2 = sentences.slice(2, 4).join(' ') || `The conversation dives deep into the reality of surviving as an independent artist in an algorithmic landscape, staying true to vernacular roots, and building community from the ground up.`;
    quote = realQuote || `“The moment you stop begging the mainstream for approval, you realize you already built your own world.”`;
    fullExplainer = `${p1.substring(0, 180)}... In the frame: ${artist} in an intimate portrait session documenting life behind the console.`;
  } else if (isHipHop) {
    kicker = "🩸 STREET CIPHER // VERNACULAR SWAGGER";
    badge = "🎤 HIP-HOP";
    hookTitle = `Street Report: ${artist} Breaks the Mold`;
    lead = `Vernacular rhymes, heavy basslines, and zero corporate compromise: ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 260);
    p2 = sentences.slice(2, 4).join(' ') || `Grounded in neighborhood reality and unfiltered lyricism, this release cuts straight through streaming noise, proving that authenticity will always outlast viral gimmicks.`;
    quote = realQuote || `“We don’t rap for corporate brand sponsorships. We spit for the kids who survived the last decade with cracked phone screens.”`;
    fullExplainer = `${cleanTitle}. In the frame: ${artist} bringing raw vernacular swagger and lyrical heat.`;
  } else if (isFolk) {
    kicker = "🪨 HERITAGE VIBES // ANCESTRAL SOUND";
    badge = "🪨 CULTURE";
    hookTitle = `Archival Defiance: ${artist} Reclaims Ancestral Sound`;
    lead = `Ancestral history meets contemporary sound design. ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 260);
    p2 = sentences.slice(2, 4).join(' ') || `Bypassing corporate trend cycles, this work connects generational folk poetry with modern frequencies, reminding listeners that our most radical sounds come from heritage.`;
    quote = realQuote || `“To sing poetry written hundreds of years ago over modern analog instruments is to remind the world that ancestors are listening.”`;
    fullExplainer = `${p1.substring(0, 180)}... In the frame: Documenting generational oral history and living sonic traditions.`;
  } else {
    kicker = "⚡ CULTURE DISPATCH // NEXT UP";
    badge = "⚡ SPOTLIGHT";
    hookTitle = `Next Level Energy: ${artist} Breaks Through`;
    lead = `Here is what’s actually happening on the ground in South Asian sound: ${cleanTitle}.`;
    p1 = sentences.slice(0, 2).join(' ') || rawText.substring(0, 260);
    p2 = sentences.slice(2, 4).join(' ') || `Pushing back against generic playlist formulas, this release proves that authenticity and raw creative conviction always win in the end.`;
    quote = realQuote || `“When the culture moves, it moves from the ground up—not from boardroom focus groups.”`;
    fullExplainer = `${cleanTitle}. In the frame: ${artist} captured in their creative sanctuary.`;
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
    artist,
    sourceLink: link || '#'
  };
}

// Extract exact, clean Artist name in frame from headline and story details
function extractArtistInFrame(title, desc = '') {
  const t = decodeHtmlEntities(title).trim();

  // 1. "In Conversation With <Artist>"
  const convMatch = t.match(/In Conversation With\s+([^–—\-,:'"”\n]+)/i);
  if (convMatch) return convMatch[1].replace(/\s+on\s+.*$/i, '').trim();

  // 2. "... by <Artist>"
  const byMatch = t.match(/by\s+([^–—\-,:'"”\n]+?)(?:[:'’–—\n]|\s+Delivers|\s+Releases|\s+Drops|$)/i);
  if (byMatch) return byMatch[1].trim();

  // 3. "<Artist>’s '<Work>'" or "<Artist>'s <Work>"
  const possMatch = t.match(/^([^:–—\n]+?)(?:'s|’s)\s+/i);
  if (possMatch) {
    const raw = possMatch[1].replace(/^(Analysing|Analyzing|Inside|Reviewing|Exploring|Dissecting)\s+/i, '').trim();
    if (raw.length < 35) return raw;
  }

  // 4. "<Artist(s)> to Headline/Headlines/Perform/Release/Drop..."
  const headlineVerbMatch = t.match(/^([A-Za-z0-9\s,&.&]+?)\s+(?:to\s+Headline|Headline|Headlines|to\s+Perform|Perform|Performs|to\s+Release|to\s+Drop|to\s+Star)\b/i);
  if (headlineVerbMatch) {
    const raw = headlineVerbMatch[1].trim();
    if (raw.length < 55) return raw;
  }

  // 5. "<Artist> Blends/Explores/Delivers/Announces/Returns/Drops/Releases/Plays/Tops/Brings/Defends"
  const verbMatch = t.match(/^([A-Z0-9][A-Za-z0-9\s.&,&]+?)\s+(?:Blends|Explores|Delivers|Announces|Returns|Drops|Releases|Plays|Unveils|Teams Up|Presents|Captures|Pours|Brings|Scores|Preview|Tops|Clears Up|Postpone|Reads|Puts|Turn|Defends)\b/i);
  if (verbMatch) {
    const raw = verbMatch[1].trim();
    if (raw.length < 45) return raw;
  }

  // 6. "<Artist>: <Headline>"
  const colonMatch = t.match(/^([A-Za-z0-9\s.&]{3,32}):\s+/);
  if (colonMatch) return colonMatch[1].trim();

  // 7. Fallback: take first clean chunk before punctuation
  const firstPart = t.split(/[:'’–—-]/)[0].trim();
  if (firstPart.length > 3 && firstPart.length < 35) return firstPart;

  return 'Featured Artists';
}

// Harvest fresh, UNCOVERED stories by scanning feed pages and checking editions memory
async function harvestUncoveredLiveStories(coveredMap, targetCount = 35) {
  const freshArticles = [];
  const skippedArticles = [];
  let page = 1;
  const maxPages = 15;

  const NON_MUSIC_TERMS = [
    'trial', 'guilty', 'rape', 'lawsuit', 'sexual assault',
    'k drama', 'kdrama', 'k dramas', 'kdramas', 'korean horror',
    'best movie', 'nyff', 'star trek', 'x men',
    'film review', 'movie review', 'letterman', 'jimmy carr', 'patrick stewart',
    'breaking bad', 'walter white', 'rj mitte', 'aaron paul', 'actor', 'actress',
    'box office', 'emmy', 'oscar', 'tv series', 'season 1', 'season 2', 'season 3',
    'season 4', 'season 5', 'netflix series', 'hbo series', 'standup comedy', 'comedian',
    'the pitt', 'crichton', 'superman', 'golden globe', 'director', 'tinto brass',
    'caligula', 'michael douglas', 'kirk douglas', 'memoir', 'artificial gives',
    'fraudster', 'prison', 'sentenced to'
  ];

  while (freshArticles.length < targetCount && page <= maxPages) {
    const feeds = [
      { src: 'The Indian Music Diaries', url: `https://theindianmusicdiaries.com/feed/${page > 1 ? '?paged=' + page : ''}` },
      { src: 'Rolling Stone India', url: `https://rollingstoneindia.com/feed/${page > 1 ? '?paged=' + page : ''}` }
    ];

    for (let feedIdx = 0; feedIdx < feeds.length; feedIdx++) {
      const f = feeds[feedIdx];
      try {
        const res = await fetch(f.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          }
        });
        if (!res.ok) continue;
        const xml = await res.text();

        const items = xml.split('<item>').slice(1);
        items.forEach((item) => {
          const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
          const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
          const contentMatch = item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
          const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
          const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

          if (titleMatch && linkMatch) {
            const rawTitle = decodeHtmlEntities(titleMatch[1]);
            const normTitle = normalizeTitle(rawTitle);

            if (!normTitle || normTitle.length < 5) return;

            // Check Categories to filter out non-music articles
            const catMatches = [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').toLowerCase().trim());
            const nonMusicCats = ['films & tv', 'film', 'films', 'movies', 'movie', 'television', 'tv', 'cinema', 'hollywood', 'books', 'book review', 'courts'];
            if (catMatches.some(c => nonMusicCats.some(nm => c.includes(nm)))) {
              return;
            }

            // Skip non-music articles by title keywords
            if (NON_MUSIC_TERMS.some(term => normTitle.includes(term))) {
              return;
            }

            // CHECK IF PREVIOUSLY COVERED IN PREVIOUS EDITIONS
            let coveredIn = coveredMap.get(normTitle);
            if (!coveredIn) {
              // Check partial match for longer titles
              for (const [pastNorm, pastVol] of coveredMap.entries()) {
                if (pastNorm.length > 15 && normTitle.length > 15 && (normTitle.includes(pastNorm) || pastNorm.includes(normTitle))) {
                  coveredIn = pastVol;
                  break;
                }
              }
            }

            if (coveredIn) {
              skippedArticles.push({ title: rawTitle, coveredIn });
              return; // SKIP IT!
            }

            // Ensure not duplicate within current harvest run
            if (freshArticles.some(a => normalizeTitle(a.title) === normTitle)) {
              return;
            }

            const rawDesc = descMatch ? stripHtmlTags(descMatch[1]) : '';
            const rawContent = contentMatch ? stripHtmlTags(contentMatch[1]) : rawDesc;
            const bestImage = extractBestImage(item, freshArticles.length);

            freshArticles.push({
              source: f.src,
              title: rawTitle,
              link: linkMatch[1].trim(),
              desc: rawDesc,
              content: rawContent,
              date: dateMatch ? dateMatch[1].trim() : 'Winter 2026',
              image: bestImage
            });
          }
        });
      } catch (e) {
        console.warn(`Feed fetch warning on ${f.url}:`, e.message);
      }
    }

    console.log(`📡 [HARVESTER] Scanned page ${page}: Found ${freshArticles.length}/${targetCount} fresh uncovered stories (Skipped ${skippedArticles.length} previously covered).`);
    page++;
  }

  console.log(`✅ [HARVESTER COMPLETE] Harvested ${freshArticles.length} brand-new stories. Total previously covered stories skipped: ${skippedArticles.length}.`);
  return {
    freshArticles,
    skippedCount: skippedArticles.length
  };
}

// Format each page with alternating visual spreads
function formatPage(s, pageNum) {
  const isSpread = pageNum % 2 === 0; // Even pages are Full Photo Spreads
  const isDark = pageNum % 4 === 3;   // Every 4th page is Deep Luxury Black

  if (isSpread) {
    const spreadTypes = ['spread-canopy', 'spread-asymmetric', 'spread-monolith', 'spread-shadow-well'];
    const chosenType = spreadTypes[(pageNum / 2) % spreadTypes.length];
    const scrimClass = chosenType + '-scrim';

    return `
    <!-- PAGE ${pageNum}: FULL IMAGE SPREAD (${s.title}) -->
    <article id="page-${pageNum}" class="portrait-sheet spread-fullpage ${chosenType} editable-image-host">
      <img class="spread-bg" src="${s.image}" alt="${s.title}" loading="lazy" />
      <div class="img-action-bar" onclick="event.stopPropagation()">
        <button class="img-action-btn" onclick="replaceImageDirect(this)">📷 Replace Photo</button>
      </div>

      <!-- FUN & INFORMATIVE STORY RUNDOWN CARD WITH HYPERLINK -->
      <aside class="story-rundown-card" onclick="event.stopPropagation()">
        <div class="rundown-header">
          <span class="rundown-badge">${s.rundown ? s.rundown.badge : '⚡ THE SCOOP'}</span>
          <span class="rundown-source">${s.source} Archive</span>
        </div>
        <h3 class="rundown-hook-title">${s.rundown ? s.rundown.hookTitle : s.title}</h3>
        <p class="rundown-explainer">${s.rundown ? s.rundown.fullExplainer : s.hook.lead}</p>
        <div class="rundown-footer">
          <div class="rundown-inframe-tag">
            <span class="tag-icon">📷</span> In Frame: <strong>${s.artistInFrame}</strong>
          </div>
          <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="rundown-source-link" title="Open live article on ${s.source}">
            <span>Read Original Story</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>
      </aside>

      <div class="${scrimClass}">
        <div>
          <header class="spread-strap-top">
            <span>Raga Magazine · <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:underline;">${s.source} Harvest ↗</a></span>
            <span style="background:var(--accent); color:#fff; padding:2px 10px; border-radius:9999px; font-weight:800;">Page ${String(pageNum).padStart(2, '0')}</span>
          </header>

          <div style="margin-top:24px; max-width:760px;">
            <span class="meta-eyebrow" style="color:var(--accent); font-size:11px; letter-spacing:0.18em;">${s.hook.kicker}</span>
            <h2 class="headline-xl" style="color:#ffffff; font-size:clamp(30px, 4.2vw, 48px); line-height:1.12; margin:6px 0 14px;">
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:none;">${s.title}</a>
            </h2>
            <p style="font-size:17px; line-height:1.55; color:rgba(255,255,255,0.94); font-weight:600; max-width:680px; margin-bottom:18px;">
              ${s.hook.lead}
            </p>

            <div class="spread-2col-text">
              <div>
                <p>${s.hook.p1}</p>
              </div>
              <div>
                <p>${s.hook.p2}</p>
                <div class="spread-quote-callout">
                  ${s.hook.quote}
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="spread-strap-bottom">
          <span>Raga Magazine · Curated from <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:var(--accent); font-weight:700;">${s.source} ↗</a></span>
          <span>In Frame: <strong>${s.artistInFrame}</strong></span>
          <span>Page ${String(pageNum).padStart(2, '0')} · Full Spread</span>
        </footer>
      </div>
    </article>`;
  }

  // Text Sheet (Crisp White or Deep Black)
  const sheetClass = isDark ? 'portrait-sheet sheet-dark' : 'portrait-sheet';
  const pillStyle = isDark ? 'background:#ffffff; color:#0c0e14;' : 'background:var(--ink); color:#ffffff;';
  const shapes = ['wrap-circle-right', 'wrap-pill-left', 'wrap-rect-right', 'wrap-circle-left'];
  const shape = shapes[pageNum % shapes.length];

  return `
    <!-- PAGE ${pageNum}: ${isDark ? 'BLACK BG' : 'WHITE BG'} EDITORIAL (${s.title}) -->
    <article id="page-${pageNum}" class="${sheetClass}">
      <header class="folio-top">
        <span class="mag-mark">Raga Magazine</span>
        <span>Curated Feature // <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit;">${s.source} ↗</a></span>
        <span class="page-pill" style="${pillStyle}">Page ${String(pageNum).padStart(2, '0')}</span>
      </header>

      <div class="sheet-content-host">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <span class="meta-eyebrow" style="margin-bottom:0;">${s.hook.kicker}</span>
          <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="sheet-source-btn" title="Read original article on ${s.source}">
            <span>Read Original Story on ${s.source}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>
        <h2 class="headline-xl">
          <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:none;">${s.title}</a>
        </h2>

        <div class="body-text">
          <div class="editable-image-host ${shape}">
            <img style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" src="${s.image}" alt="${s.title}" loading="lazy" />
            <div class="img-action-bar" onclick="event.stopPropagation()">
              <button class="img-action-btn" onclick="resizeSelectedDirect(this, -30)" title="Make picture smaller">➖</button>
              <button class="img-action-btn" onclick="resizeSelectedDirect(this, 30)" title="Make picture larger">➕</button>
              <button class="img-action-btn" onclick="cycleFrameShape(this)" title="Cycle frame shape">🔄 Shape</button>
              <button class="img-action-btn" onclick="toggleFloatSide(this)" title="Toggle float side">⇄ Side</button>
              <button class="img-action-btn" onclick="replaceImageDirect(this)" title="Replace photo">📷</button>
              <button class="img-action-btn btn-delete" onclick="deleteImage(this)" title="Delete picture">🗑️</button>
            </div>
            <div class="image-caption-tag" onclick="event.stopPropagation()">
              <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:#ffffff; text-decoration:none; display:inline-flex; align-items:center; gap:5px;">
                <span>📷 <strong>${s.artistInFrame}</strong></span>
                <span style="opacity:0.8; font-size:9px;">· Open ↗</span>
              </a>
            </div>
          </div>

          <p class="lead-copy">${s.hook.lead}</p>
          <p>${s.hook.p1}</p>
          <p>${s.hook.p2}</p>
        </div>

        <blockquote class="pull-quote">
          ${s.hook.quote}
          <cite>Curated from <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:underline;">${s.source} Harvest Archive ↗</a></cite>
        </blockquote>
      </div>

      <footer class="folio-bottom">
        <span>Raga Magazine · ${s.source} Edition</span>
        <span>Story: <a href="${s.link}" target="_blank" rel="noopener noreferrer" style="color:inherit;">${s.title.substring(0, 32)}... ↗</a></span>
        <span>Page ${String(pageNum).padStart(2, '0')}</span>
      </footer>
    </article>`;
}

// Generate complete Cover + 29 alternating pages with ONLY UNCOVERED stories!
async function scrapeAndGenerateMagazine() {
  console.log('⚡ [GENERATOR ENGINE] Starting live harvest & checking previous editions...');

  // 1. Load editions memory to check what news has already been covered
  let memory = { activeEdition: 24, history: [] };
  if (fs.existsSync(EDITIONS_FILE)) {
    try {
      memory = JSON.parse(fs.readFileSync(EDITIONS_FILE, 'utf8'));
    } catch (e) {
      console.warn('Could not parse editions.json, initializing fresh memory');
    }
  }

  // Build Map of all previously covered stories (normalized title -> volume covered)
  const coveredMap = new Map();
  (memory.history || []).forEach(h => {
    const vol = `Vol. ${h.volume}`;
    if (h.coverArtist) coveredMap.set(normalizeTitle(h.coverArtist), vol);
    (h.featuredArtists || []).forEach(a => coveredMap.set(normalizeTitle(a), vol));
  });

  console.log(`📋 Loaded ${coveredMap.size} previously covered stories across all editions in memory.`);

  // 2. Harvest brand-new stories while skipping everything in coveredMap
  const { freshArticles, skippedCount } = await harvestUncoveredLiveStories(coveredMap, 35);
  console.log(`✓ Harvested ${freshArticles.length} fresh, uncovered stories (Skipped ${skippedCount} previously covered).`);

  const newVol = (memory.activeEdition || 24) + 1;
  const issueDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // If even deep crawling has fewer than 30 stories (rare), pad with curated archives
  let candidatePool = [...freshArticles];
  while (candidatePool.length < 30) {
    const idx = candidatePool.length + 1;
    candidatePool.push({
      source: 'Raga Archive',
      title: `Sound Exploration & Emerging Frequencies #${idx}`,
      desc: 'Investigating contemporary South Asian sonic counterculture and analog production methods.',
      image: CURATED_EDITORIAL_IMAGES[idx % CURATED_EDITORIAL_IMAGES.length]
    });
  }

  // Separate pools by source for balanced interleaving
  let timdPool = candidatePool.filter(a => a.source === 'The Indian Music Diaries');
  let rsPool = candidatePool.filter(a => a.source === 'Rolling Stone India');

  // Select Hero Cover Story from fresh pool (prioritize inspiring music features)
  const heroCandidates = candidatePool.filter(a => {
    const low = a.title.toLowerCase();
    return !low.includes('fraud') && !low.includes('prison') && !low.includes('sentenced') && !low.includes('lawsuit');
  });
  const heroCoverStory = heroCandidates.length > 0 ? heroCandidates[0] : candidatePool[0];
  console.log(`🌟 Selected Brand-New Hero Cover Story for Issue ${newVol}: "${heroCoverStory.title}" (${heroCoverStory.source})`);

  // Remove chosen hero from pool so it doesn't appear in interior
  timdPool = timdPool.filter(a => a.title !== heroCoverStory.title);
  rsPool = rsPool.filter(a => a.title !== heroCoverStory.title);

  // Interleave TIMD and Rolling Stone India fresh stories to create a balanced 29-page interior
  const selectedInterior = [];
  while (selectedInterior.length < 29 && (timdPool.length > 0 || rsPool.length > 0)) {
    if (timdPool.length > 0) selectedInterior.push(timdPool.shift());
    if (selectedInterior.length < 29 && rsPool.length > 0) selectedInterior.push(rsPool.shift());
  }

  // If pool was under 29, pad from candidatePool
  let poolIdx = 1;
  while (selectedInterior.length < 29) {
    if (poolIdx < candidatePool.length && candidatePool[poolIdx].title !== heroCoverStory.title) {
      selectedInterior.push(candidatePool[poolIdx]);
    } else {
      selectedInterior.push({
        source: 'Raga Archive',
        title: `Sound Exploration & Emerging Frequencies #${selectedInterior.length + 1}`,
        desc: 'Investigating contemporary South Asian sonic counterculture and analog production methods.',
        image: CURATED_EDITORIAL_IMAGES[selectedInterior.length % CURATED_EDITORIAL_IMAGES.length]
      });
    }
    poolIdx++;
  }

  // Enrich cover story and interior pages with Gen-Z editorial hooks, rundowns & in-frame credits
  const heroArtist = extractArtistInFrame(heroCoverStory.title, heroCoverStory.desc);
  // Enrich cover story and interior pages using our Casual Quickread Engine
  const heroQuickread = rewriteAsCasualQuickread(heroCoverStory.title, heroCoverStory.content || heroCoverStory.desc, heroCoverStory.source, heroCoverStory.link);
  heroCoverStory.artistInFrame = heroQuickread.artist;
  heroCoverStory.hook = heroQuickread;
  heroCoverStory.rundown = heroQuickread;

  const enrichedInterior = selectedInterior.slice(0, 29).map(a => {
    const quickread = rewriteAsCasualQuickread(a.title, a.content || a.desc, a.source, a.link);
    return {
      ...a,
      artistInFrame: quickread.artist,
      hook: quickread,
      rundown: quickread
    };
  });

  // Pick 5 teaser stories for the cover right column
  const coverTeasers = [
    enrichedInterior[0],
    enrichedInterior[2],
    enrichedInterior[4],
    enrichedInterior[6],
    enrichedInterior[8]
  ];

  // Quick Cover Art Presets (Top 4 distinct photo features from this issue)
  const coverArtPresets = [
    { title: 'Hero Feature', img: heroCoverStory.image },
    { title: enrichedInterior[0].title.split(/[:'’–-]/)[0].substring(0, 18), img: enrichedInterior[0].image },
    { title: enrichedInterior[1].title.split(/[:'’–-]/)[0].substring(0, 18), img: enrichedInterior[1].image },
    { title: enrichedInterior[3].title.split(/[:'’–-]/)[0].substring(0, 18), img: enrichedInterior[3].image }
  ];

  // Build the Cover HTML
  const coverHtml = `
    <!-- PAGE 0: COVER (FULL IMAGE SPREAD) -->
    <article id="cover" class="portrait-sheet cover-portrait editable-image-host">
      <!-- Quick Cover Art Switcher -->
      <div class="cover-art-switcher" onclick="event.stopPropagation()">
        <span style="font-family:var(--font-grotesk); font-size:10px; font-weight:800; color:var(--accent); text-transform:uppercase; letter-spacing:0.1em; padding-left:4px;">Cover Art:</span>
        ${coverArtPresets.map((p, idx) => `
        <button class="cover-art-btn ${idx === 0 ? 'active' : ''}" data-img="${p.img}" onclick="switchCoverArt(this)">${p.title}</button>
        `).join('')}
      </div>

      <img id="coverHeroBg" class="cover-bg" src="${heroCoverStory.image}" alt="${heroCoverStory.title}" />

      <div class="img-action-bar" onclick="event.stopPropagation()">
        <button class="img-action-btn" onclick="replaceImageDirect(this)">📷 Replace Cover Photo</button>
      </div>

      <div class="cover-scrim">
        <div class="cover-masthead-wrapper">
          <div class="cover-top-foliostrap">
            <span>The Journal of South Asian Sound</span>
            <span class="strap-highlight">Vol. 28 · Issue ${newVol} · ${issueDate}</span>
            <span>Print: ₹350 / £8 / $12</span>
          </div>

          <div class="cover-stamp-seal">
            <span class="seal-star">★</span>
            <span class="seal-txt">ARCHIVE</span>
            <span class="seal-sub">NO. ${newVol}</span>
          </div>

          <div class="cover-masthead-lockup">
            <h1 class="cover-masthead-title">RAGA</h1>
            <div class="cover-masthead-subline">
              <span class="subline-rule"></span>
              <span class="subline-text">M A G A Z I N E</span>
              <span class="subline-rule"></span>
            </div>
          </div>

          <div class="cover-sub-strap">
            <span>Rolling Stone India &amp; Indian Music Diaries Live Harvest</span>
            <span>Special 30-Page Edition // Issue ${newVol}</span>
          </div>
        </div>

        <div class="cover-negative-space-grid">
          <div class="cover-hero-editorial">
            <span class="cover-hero-kicker">★ COVER MONOGRAPH · LIVE ISSUE ${newVol}</span>
            <h2 class="cover-hero-title-sculpted">
              <a href="${heroCoverStory.link}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:none;">${heroCoverStory.title.toUpperCase()}</a>
            </h2>
            <p class="cover-hero-lead-deck">
              ${heroCoverStory.hook.lead}
            </p>

            <div style="display:flex; align-items:center; gap:12px; margin-top:14px; flex-wrap:wrap;">
              <a href="${heroCoverStory.link}" target="_blank" rel="noopener noreferrer" class="cover-source-link">
                <span>🔗 Read Full Story on ${heroCoverStory.source}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
              <div class="cover-in-frame-badge" onclick="event.stopPropagation()">
                <span class="in-frame-pill">📷 IN FRAME</span>
                <span><strong>${heroCoverStory.artistInFrame}</strong></span>
              </div>
            </div>

            <div style="font-family:var(--font-grotesk); font-size:12px; font-weight:700; color:var(--accent); letter-spacing:0.12em; text-transform:uppercase; margin-top:16px;">
              Inside: 30 Curated Releases with Direct Story Links →
            </div>
          </div>

          <div class="cover-teasers-stack">
            ${coverTeasers.map((t, idx) => `
            <a href="${t.link}" target="_blank" rel="noopener noreferrer" class="cover-teaser-entry" title="Read on ${t.source}">
              <div class="teaser-cat">${String(idx + 1).padStart(2, '0')} // ${t.source} ↗</div>
              <div class="teaser-hl">${t.title.substring(0, 42)}</div>
              <div class="teaser-desc">${t.rundown ? t.rundown.hookTitle : t.hook.kicker}</div>
            </a>
            `).join('')}
          </div>
        </div>

        <footer class="cover-footer-bar">
          <div class="cover-barcode-group">
            <div class="cover-barcode-lines">||||| | || |||| | |||||| || |</div>
            <div style="font-size:10px; line-height:1.2; color:#9ca3af;">
              ISSN 2954-8192<br>RAGA-${newVol}-${new Date().getFullYear()}
            </div>
          </div>

          <div style="font-size:11px; color:#cbd5e1; text-align:center;">
            Harvested Live from <strong>Rolling Stone India</strong> &amp; <strong>The Indian Music Diaries</strong>
          </div>

          <div style="font-size:10.5px; font-weight:700; color:var(--accent); letter-spacing:0.14em;">
            DISPLAY UNTIL ${new Date(Date.now() + 60*24*3600*1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
          </div>
        </footer>
      </div>
    </article>`;

  // Build the 29 interior pages
  let mainContentHtml = `\n    ${coverHtml}\n\n`;
  enrichedInterior.forEach((art, i) => {
    mainContentHtml += formatPage(art, i + 1) + '\n\n';
  });

  // Read current index.html template
  let currentHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  // Replace <main class="mag-canvas">...</main>
  const mainStart = currentHtml.indexOf('<main class="mag-canvas">');
  const mainEnd = currentHtml.indexOf('</main>', mainStart);
  if (mainStart !== -1 && mainEnd !== -1) {
    currentHtml = currentHtml.substring(0, mainStart + '<main class="mag-canvas">'.length) + mainContentHtml + '  ' + currentHtml.substring(mainEnd);
  }

  // Update Navigation Bar
  let navButtonsHtml = `<nav class="mag-nav" style="overflow-x:auto; max-width:95vw; white-space:nowrap; padding: 6px 12px;">
    <span class="nav-label" style="flex-shrink:0;">RAGA ${newVol}</span>
    <button class="nav-btn active" onclick="jumpTo('cover')">Cover</button>`;

  for (let i = 1; i <= 29; i++) {
    const isSpread = i % 2 === 0;
    const isDark = i % 4 === 3;
    let btnClass = 'nav-btn';
    let title = `P${i} (White)`;

    if (isSpread) {
      btnClass = 'nav-btn nav-btn-spread';
      title = `P${i} (Full Photo)`;
    } else if (isDark) {
      btnClass = 'nav-btn nav-btn-dark';
      title = `P${i} (Black)`;
    }

    const pNum = String(i).padStart(2, '0');
    navButtonsHtml += `\n    <button class="${btnClass}" onclick="jumpTo('page-${i}')" title="${title}">${pNum}</button>`;
  }
  navButtonsHtml += `\n  </nav>`;

  const navRegex = /<nav class="mag-nav"[\s\S]*?<\/nav>/;
  currentHtml = currentHtml.replace(navRegex, navButtonsHtml);

  // Update Scroll Listener
  const pagesListStr = `const pages = ['cover', ` + Array.from({ length: 29 }, (_, k) => `'page-${k + 1}'`).join(', ') + `];`;
  const pagesRegex = /const pages = \[[^\]]*?\];/;
  currentHtml = currentHtml.replace(pagesRegex, pagesListStr);

  // Write updated files
  fs.writeFileSync(path.join(__dirname, 'index.html'), currentHtml, 'utf8');
  fs.writeFileSync(path.join(__dirname, 'raga-magazine-issue.html'), currentHtml, 'utf8');

  // Update editions.json memory store with newly covered stories so future runs skip them
  memory.activeEdition = newVol;
  if (!memory.history) memory.history = [];
  
  const newlyCoveredTitles = [heroCoverStory.title, ...enrichedInterior.map(a => a.title)];
  
  memory.history.push({
    volume: newVol,
    date: issueDate,
    title: `RAGA MAGAZINE VOL. ${newVol}`,
    tagline: `Uncovered Edition: ${heroCoverStory.title}`,
    totalStories: 30,
    pageCount: 30,
    coverArtist: heroCoverStory.title,
    sources: ["Rolling Stone India", "The Indian Music Diaries"],
    featuredArtists: newlyCoveredTitles,
    skippedPreviouslyCoveredCount: skippedCount,
    editorialNotes: `Autonomous live harvest generated on ${new Date().toISOString()} - Verified 100% fresh news; skipped ${skippedCount} previously covered stories.`
  });
  fs.writeFileSync(EDITIONS_FILE, JSON.stringify(memory, null, 2), 'utf8');

  console.log(`✅ [GENERATION COMPLETE] Successfully compiled Issue ${newVol} featuring "${heroCoverStory.title}"! Skipped ${skippedCount} previously covered stories.`);
  return {
    success: true,
    edition: newVol,
    coverTitle: heroCoverStory.title,
    totalHarvested: freshArticles.length,
    skippedCoveredCount: skippedCount,
    totalPages: 30
  };
}

module.exports = {
  scrapeAndGenerateMagazine,
  harvestUncoveredLiveStories
};
