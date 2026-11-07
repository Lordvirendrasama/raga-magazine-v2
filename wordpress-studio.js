const fs = require('fs');
const path = require('path');
const { harvestGamingStories } = require('./8bit-generator');
const { harvestUncoveredLiveStories } = require('./generator-engine');

// Load or save configuration (WordPress & API Keys)
const CONFIG_FILE = path.join(__dirname, 'wp-studio-config.json');

function getStudioConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      // Ensure default Raga URL is set if not present
      if (!parsed.wpUrl && !parsed.ragaWpUrl) {
        parsed.ragaWpUrl = 'https://plum-weasel-789096.hostingersite.com';
        parsed.wpUrl = 'https://plum-weasel-789096.hostingersite.com';
      }
      return parsed;
    } catch (_) {}
  }
  return {
    llmProvider: 'auto', // 'auto' (free tier pool: Kilo Code & LLM7 from awesome-free-llm-apis), 'groq', 'openrouter', 'gemini', 'custom'
    llmApiKey: '',
    customEndpoint: '',
    customModel: '',
    // Raga Magazine WordPress REST API (Default Hostinger site)
    ragaWpUrl: 'https://plum-weasel-789096.hostingersite.com',
    ragaWpUsername: '',
    ragaWpAppPassword: '',
    // The 8 Bit Bistro WordPress REST API (Separate site)
    eightbitWpUrl: '',
    eightbitWpUsername: '',
    eightbitWpAppPassword: '',
    // Shared fallback
    wpUrl: 'https://plum-weasel-789096.hostingersite.com',
    wpUsername: '',
    wpAppPassword: '',
    defaultStatus: 'draft' // 'draft' or 'publish'
  };
}

function saveStudioConfig(cfg) {
  const current = getStudioConfig();
  const merged = { ...current, ...cfg };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

// 1. Fetch live stories for the Studio newsroom
async function getStudioStories(pub = 'all') {
  const stories = [];

  if (pub === 'all' || pub === 'raga') {
    try {
      const musicData = await harvestUncoveredLiveStories(new Map(), 15);
      (musicData.freshArticles || []).slice(0, 10).forEach(a => {
        stories.push({
          id: 'raga-' + Buffer.from(a.title).toString('base64').substring(0, 12),
          pub: 'raga',
          pubLabel: 'RAGA MAGAZINE',
          category: 'Music & Culture',
          source: a.source,
          title: a.title,
          desc: a.desc || '',
          image: a.image,
          link: a.link
        });
      });
    } catch (e) {
      console.warn('Error fetching music studio stories:', e.message);
    }
  }

  if (pub === 'all' || pub === '8bit') {
    try {
      const gamingData = await harvestGamingStories(new Map(), 15);
      (gamingData.freshArticles || []).slice(0, 10).forEach(a => {
        stories.push({
          id: '8bit-' + Buffer.from(a.title).toString('base64').substring(0, 12),
          pub: '8bit',
          pubLabel: 'THE 8 BIT BISTRO',
          category: 'Video Games & Tech',
          source: a.source,
          title: a.title,
          desc: a.desc || '',
          image: a.image,
          link: a.link
        });
      });
    } catch (e) {
      console.warn('Error fetching gaming studio stories:', e.message);
    }
  }

  return stories;
}

// Search DuckDuckGo for high-resolution artist and topic photos
async function searchDuckDuckGoImages(query) {
  if (!query) return [];
  try {
    const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`);
    const text = await res.text();
    const vqdMatch = text.match(/vqd=([a-zA-Z0-9_-]+)/) || text.match(/vqd="([^"]+)"/);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];
    const imgRes = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!imgRes.ok) return [];
    const data = await imgRes.json();
    return (data.results || []).slice(0, 5).map(r => r.image).filter(u => u && (u.startsWith('http://') || u.startsWith('https://')));
  } catch (_) {
    return [];
  }
}

// Scrape media (multiple photos, YouTube, Spotify, Instagram) from article link
async function scrapeArticleMedia(url, initialImage) {
  const images = [];
  if (initialImage) images.push(initialImage);
  let youtube = null;
  let spotify = null;
  let instagram = null;

  if (url) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (res.ok) {
        const html = await res.text();

        // High-res images
        const rawImages = [...html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi)].map(m => m[0]);
        rawImages.forEach(img => {
          let clean = img.replace(/-\d+x\d+(\.(?:jpe?g|png|webp))$/i, '$1');
          const l = clean.toLowerCase();
          if (!l.includes('avatar') && !l.includes('logo') && !l.includes('icon') && !l.includes('gravatar') && !l.includes('pixel') && !images.includes(clean)) {
            images.push(clean);
          }
        });

        // YouTube video detection
        const ytMatch = html.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
        if (ytMatch) {
          youtube = {
            videoId: ytMatch[1],
            url: `https://www.youtube.com/watch?v=${ytMatch[1]}`,
            embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`
          };
        }

        // Spotify embed detection
        const spMatch = html.match(/open\.spotify\.com\/(?:embed\/)?(track|album|artist|playlist)\/([a-zA-Z0-9]+)/i);
        if (spMatch) {
          spotify = {
            type: spMatch[1],
            id: spMatch[2],
            url: `https://open.spotify.com/${spMatch[1]}/${spMatch[2]}`,
            embedUrl: `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}`
          };
        }

        // Instagram handle detection
        const igMatch = html.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/i);
        if (igMatch && !['p', 'reel', 'stories', 'explore', 'about', 'theindianmusicdiaries', 'rollingstonein', 'sharer', 'intent'].includes(igMatch[1])) {
          instagram = {
            handle: igMatch[1].replace(/[^a-zA-Z0-9_.]/g, ''),
            url: `https://instagram.com/${igMatch[1]}`
          };
        }
      }
    } catch (e) {
      console.warn('Scraping article media warning:', e.message);
    }
  }

  return { images, youtube, spotify, instagram };
}

// Master Media Enricher (Article + Web/DuckDuckGo + Auto-Embeds)
async function enrichStoryMedia(article) {
  console.log(`🔍 [Media Studio] Gathering pictures and media embeds for "${article.title.substring(0, 45)}..."`);
  const scraped = await scrapeArticleMedia(article.link, article.image);
  let images = scraped.images || [];

  // Clean artist title for photo searches
  const cleanTitle = article.title.replace(/['’"]/g, '').replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();

  // Search DuckDuckGo for additional artist / story photos
  try {
    const searchQueries = [
      cleanTitle + (article.pub === 'raga' ? ' music artist' : ' video game'),
      cleanTitle
    ];
    for (const q of searchQueries) {
      if (images.length >= 6) break;
      const extra = await searchDuckDuckGoImages(q);
      extra.forEach(u => {
        if (!images.includes(u)) images.push(u);
      });
    }
  } catch (_) {}

  // YouTube / Spotify / Instagram
  let youtube = scraped.youtube ? (scraped.youtube.url || scraped.youtube) : '';
  let spotify = scraped.spotify ? (scraped.spotify.url || scraped.spotify) : '';
  let instagram = scraped.instagram ? (scraped.instagram.handle ? `@${scraped.instagram.handle}` : scraped.instagram.url) : '';

  // Search DuckDuckGo for Instagram if not detected
  if (!instagram && cleanTitle && article.pub === 'raga') {
    try {
      const igRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanTitle + ' instagram profile')}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (igRes.ok) {
        const igText = await igRes.text();
        const snippetMatch = igText.match(/<b>([a-zA-Z0-9_.]+)<\/b>\s+on\s+[A-Za-z]+\s+\d+/i) || igText.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
        if (snippetMatch) {
          const h = snippetMatch[1].toLowerCase();
          const excluded = ['p', 'reel', 'reels', 'stories', 'explore', 'about', 'developer', 'legal', 'tags'];
          if (!excluded.includes(h) && h.length > 2) {
            instagram = `@${h}`;
          }
        }
      }
    } catch (_) {}
  }

  // Deduplicate and filter
  const finalImages = [...new Set(images)].slice(0, 8);
  const selectedCover = finalImages[0] || article.image || '';

  return {
    images: finalImages,
    selectedCover,
    youtube: youtube || '',
    spotify: spotify || '',
    instagram: instagram || ''
  };
}

// Upload Media Buffer to WordPress REST API for Featured Image
async function uploadMediaToWordPress(siteUrl, authHeader, imageUrl, title) {
  if (!imageUrl || !imageUrl.startsWith('http')) return null;
  try {
    console.log(`🖼️ [WP Media] Uploading chosen cover photo to WordPress media library: ${imageUrl}`);
    const imgRes = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    let contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    if (contentType.includes(';')) contentType = contentType.split(';')[0].trim();
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const filename = `cover-${Date.now()}.${ext}`;

    const endpoint = `${siteUrl}/wp-json/wp/v2/media`;
    console.log(`📡 [WP Media] POST ${endpoint} (${buffer.length} bytes, ${contentType})...`);

    const mediaRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: buffer
    });

    if (mediaRes.ok) {
      const mediaData = await mediaRes.json();
      console.log(`✅ [WP Media] Successfully uploaded! Featured Media ID: ${mediaData.id}`);
      return mediaData.id;
    } else {
      const errText = await mediaRes.text();
      console.warn('⚠️ [WP Media] Media upload returned non-200:', errText.substring(0, 150));
    }
  } catch (e) {
    console.warn('⚠️ [WP Media] Media upload error:', e.message);
  }
  return null;
}

// Bulletproof JSON extractor for LLM outputs
function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();
  try {
    return JSON.parse(clean);
  } catch (_) {}

  const stripped = clean.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(stripped);
  } catch (_) {}

  const firstArr = stripped.indexOf('[');
  const lastArr = stripped.lastIndexOf(']');
  if (firstArr !== -1 && lastArr > firstArr) {
    try {
      return JSON.parse(stripped.slice(firstArr, lastArr + 1));
    } catch (_) {}
  }

  const firstObj = stripped.indexOf('{');
  const lastObj = stripped.lastIndexOf('}');
  if (firstObj !== -1 && lastObj > firstObj) {
    try {
      return JSON.parse(stripped.slice(firstObj, lastObj + 1));
    } catch (_) {}
  }

  return null;
}

// Multi-Tier Free LLM Engine (powered by mnfst/awesome-free-llm-apis)
async function callAwesomeFreeLlm(prompt, systemPrompt = '', options = {}) {
  const config = getStudioConfig();
  const apiKey = options.apiKey || config.llmApiKey || config.geminiApiKey || process.env.GEMINI_API_KEY || '';
  const provider = options.provider || config.llmProvider || 'auto';

  // 1. If user configured Groq (Ultra-fast free tier from awesome-free-llm-apis)
  if (apiKey && (provider === 'groq' || apiKey.startsWith('gsk_'))) {
    try {
      console.log('⚡ [Awesome Free LLM] Calling Groq Free Tier (qwen/qwen3.8-27b)...');
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        })
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.warn('Groq failed, falling back to free pool:', e.message);
    }
  }

  // 2. If user configured OpenRouter (Free tier models :free)
  if (apiKey && (provider === 'openrouter' || apiKey.startsWith('sk-or-'))) {
    try {
      console.log('⚡ [Awesome Free LLM] Calling OpenRouter (openrouter/free)...');
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.warn('OpenRouter failed, falling back:', e.message);
    }
  }

  // 3. If user configured Google Gemini Free Tier
  if (apiKey && (provider === 'gemini' || apiKey.startsWith('AIzaSy'))) {
    try {
      console.log('⚡ [Awesome Free LLM] Calling Gemini 1.5 Flash Free Tier...');
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) return content;
      }
    } catch (e) {
      console.warn('Gemini failed, falling back to free pool:', e.message);
    }
  }

  // 4. Autonomous Free Tier #1 from awesome-free-llm-apis: Kilo Code Gateway (openrouter/free - 200 req/hr Free Tier, NO KEY REQUIRED)
  try {
    console.log('⚡ [Awesome Free LLM] Calling Kilo Code Gateway (openrouter/free - 200 req/hr Free Tier)...');
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || 65000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch('https://api.kilo.ai/api/gateway/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        console.log('✅ [Awesome Free LLM] Received inference from Kilo Code Gateway!');
        return content;
      }
    }
  } catch (e) {
    console.warn('Kilo Code request failed, trying next provider:', e.message);
  }

  // 5. Autonomous Free Tier #2 from awesome-free-llm-apis: LLM7.io (gpt-oss:20b - Permanent Free Tier, NO KEY REQUIRED)
  try {
    console.log('⚡ [Awesome Free LLM] Calling LLM7.io (gpt-oss:20b - Permanent Free Tier)...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch('https://api.llm7.io/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-oss:20b',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        console.log('✅ [Awesome Free LLM] Received inference from LLM7.io!');
        return content;
      }
    }
  } catch (e) {
    console.warn('LLM7.io request failed:', e.message);
  }

  return null;
}

// 2. Generate 4 Distinct Editorial Angles (High-Energy, Fun, and Culturally Dialed-In)
async function generateAngles(article, apiKeyOverride = '') {
  const isGaming = article.category.includes('Game') || article.pub === '8bit';
  const cleanTitle = article.title.replace(/['’"]/g, '').trim();

  const prompt = `You are the Editor-in-Chief of ${isGaming ? 'The 8-Bit Bistro' : 'Raga Magazine'}.
We write fun, razor-sharp, culturally electric music and gaming journalism for digital natives (like Pitchfork meets Complex, tailored for the Indian independent music revolution and modern gaming).

STORY TO COVER:
Title: "${cleanTitle}"
Context: "${article.desc}"
Category: "${article.category}"

TASK:
Generate exactly 4 wildly creative, FUN, and clickable editorial angles that readers will actually obsess over.
EVERY ANGLE MUST FOLLOW THE INVERTED PYRAMID JOURNALISM MODEL (Lead with the biggest hook first, followed by rich sonic/gameplay analysis, cultural stakes, and verdicts).

CRITICAL RULES:
1. NEVER mention any source publisher, competitor, or website name. Frame everything as 100% original reporting.
2. Make headlines magnetic, witty, and rich in natural SEO keywords (Artist/Game Name, Release Title, Genre).

Return a valid JSON array of exactly 4 objects with keys:
- "id": string (e.g. "angle-viral-hook", "angle-subculture", "angle-hot-take", "angle-fast-track")
- "name": string (creative, fun angle title, e.g. "The Midnight Earworm & Sonic Lore", "The Indie Renaissance: Behind the Subculture", "Unfiltered Hot Take: The Raw Critique", "The Sonic Blueprint: 3-Minute Fast Track")
- "badge": string ("VIRAL HOOK", "SCENE PULSE", "HOT TAKE", or "FAST PASS")
- "proposedHeadline": string (a magnetic, fun, click-worthy headline packed with SEO)
- "angleSummary": string (2-3 fun sentences explaining the angle's premise and why music/gaming fans will click it)
- "tone": string (e.g. "Obsessive, Vibrant, Trendsetting", "Gritty, Passionate, Subcultural", "Sharp, Provocative, Zero-Filter", "Punchy, High-Energy, Essential")

Return ONLY the raw JSON array. No markdown fences or introductory chatter.`;

  try {
    const rawOutput = await callAwesomeFreeLlm(prompt, 'You are an executive magazine editor. Always respond in valid raw JSON array format.', { apiKey: apiKeyOverride });
    if (rawOutput) {
      const parsed = extractJson(rawOutput);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        console.log(`✅ [Angles Generated] Successfully created ${parsed.length} fun editorial angles via Awesome Free LLM!`);
        return parsed.slice(0, 4);
      }
    }
  } catch (e) {
    console.warn('Free LLM angle generation error, falling back:', e.message);
  }

  // High-Energy Contextual Angle Synthesizer (Instant local fallback)
  if (isGaming) {
    return [
      {
        id: "angle-viral-hook",
        name: "The Lore & Engine Deep-Dive",
        badge: "TECH TEARDOWN",
        proposedHeadline: `Under The Hood: Why "${cleanTitle}" Is A Computational & Design Marvel`,
        angleSummary: "Dissects the mechanical ambition, rendering engines, and worldbuilding lore that separate this title from assembly-line corporate releases.",
        tone: "Nerdy, Deep-Dive, Cutting-Edge"
      },
      {
        id: "angle-subculture",
        name: "The Player Voice & Community Pulse",
        badge: "COMMUNITY RAW",
        proposedHeadline: `What Gamers Actually Think: The Community Verdict on "${cleanTitle}"`,
        angleSummary: "Cuts through official trailers to capture real ground-level sentiment across Reddit, Discord, and Steam forums.",
        tone: "Passionate, Gamer-First, Honest"
      },
      {
        id: "angle-hot-take",
        name: "The Critical Hot Take: Beyond The PR",
        badge: "HOT TAKE",
        proposedHeadline: `Zero Filter: Does "${cleanTitle}" Actually Live Up To The Massive Hype?`,
        angleSummary: "Challenges the marketing cycle with a razor-sharp, honest critique of gameplay loops, pricing, and long-term replayability.",
        tone: "Sharp, Provocative, Zero-Filter"
      },
      {
        id: "angle-fast-track",
        name: "The 3-Minute Speedrun Intel",
        badge: "FAST PASS",
        proposedHeadline: `Fast Intel: 5 Things You Need To Know Before Playing "${cleanTitle}"`,
        angleSummary: "High-utility dispatch delivering release dates, hardware performance, key gameplay features, and the immediate verdict.",
        tone: "Punchy, Tactical, High-Utility"
      }
    ];
  }

  // Music angles (Raga Magazine)
  return [
    {
      id: "angle-viral-hook",
      name: "The Midnight Earworm & Sonic Lore",
      badge: "VIRAL HOOK",
      proposedHeadline: `Earworm Alert: Why Everyone’s Obsessing Over "${cleanTitle}"`,
      angleSummary: "Breaks down the irresistible vocal hooks, production quirks, and beat drops that make this release an immediate repeat-listen on Spotify.",
      tone: "Obsessive, Vibrant, Trendsetting"
    },
    {
      id: "angle-subculture",
      name: "The Indie Renaissance: Behind the Subculture",
      badge: "SCENE PULSE",
      proposedHeadline: `The Scene Speaks: How "${cleanTitle}" Is Rewriting The Indian Indie Playbook`,
      angleSummary: "Frames this drop as a defining milestone in the homegrown Indian alternative circuit — breaking free from mainstream formulas with pure DIY grit.",
      tone: "Gritty, Passionate, Subcultural"
    },
    {
      id: "angle-hot-take",
      name: "Unfiltered Hot Take: The Raw Critique",
      badge: "HOT TAKE",
      proposedHeadline: `Beyond The Hype: Does "${cleanTitle}" Actually Stick The Landing?`,
      angleSummary: "Cuts straight through PR noise to deliver an unapologetic, deep-dive music review of what works, what's a risky gamble, and what it means for the artist.",
      tone: "Sharp, Provocative, Zero-Filter"
    },
    {
      id: "angle-fast-track",
      name: "The Sonic Blueprint: 3-Minute Fast Track",
      badge: "FAST PASS",
      proposedHeadline: `The Fast Track: 5 Things That Make "${cleanTitle}" An Instant Playlist Add`,
      angleSummary: "Designed for listeners on the go: standout lyrics to caption your posts with, BPM and genre mashups, production credits, and the final rating.",
      tone: "Punchy, High-Energy, Essential"
    }
  ];
}

// Bulletproof HTML Formatter (Converts Markdown / raw blocks into clean Inverted Pyramid HTML with embeds pushed between paragraphs)
function formatArticleHtml(rawText, media = {}) {
  if (!rawText) return '';

  // 1. Unescape escaped characters like \n and \"
  let text = String(rawText)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\"/g, '"')
    .trim();

  // Strip any accidental competitor/source mentions
  text = text
    .replace(/Curated and synthesized via Antigravity Publishing Studio.*?$/gmi, '')
    .replace(/Original reporting sourced from.*?$/gmi, '')
    .replace(/Derived and synthesized from primary reporting.*?$/gmi, '')
    .replace(/When evaluating announcements from.*?fuzz guitars\./gi, '')
    .trim();

  // 2. Convert markdown into clean HTML block elements
  const hasHtmlTags = /<\/?(p|h2|h3|blockquote|ul|ol|div)[^>]*>/i.test(text);
  let blocks = [];

  if (hasHtmlTags) {
    // Split by block tags to isolate paragraphs and headings
    blocks = text
      .split(/(?<=<\/(?:p|blockquote|ul|ol|div|h2|h3)>)/i)
      .map(b => b.replace(/\\n/g, '').trim())
      .filter(Boolean);
  } else {
    const lines = text.split('\n');
    let inList = false;
    let listItems = [];

    const flushList = () => {
      if (inList && listItems.length > 0) {
        blocks.push(`<ul style="margin: 18px 0 24px; padding-left: 24px; line-height: 1.8;">\n${listItems.map(li => `  <li style="margin-bottom: 10px;">${li}</li>`).join('\n')}\n</ul>`);
        listItems = [];
        inList = false;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        flushList();
        continue;
      }

      if (line.startsWith('### ')) {
        flushList();
        blocks.push(`<h3>${line.substring(4)}</h3>`);
        continue;
      }
      if (line.startsWith('## ')) {
        flushList();
        blocks.push(`<h2>${line.substring(3)}</h2>`);
        continue;
      }
      if (line.startsWith('> ') || (line.startsWith('"') && line.endsWith('"') && line.length < 160)) {
        flushList();
        const q = line.startsWith('> ') ? line.substring(2) : line;
        blocks.push(`<blockquote style="border-left: 4px solid #ff331f; padding: 14px 22px; margin: 28px 0; font-style: italic; background: #f8fafc; color: #1e293b; border-radius: 0 10px 10px 0; font-size: 1.08em; line-height: 1.7;">${q}</blockquote>`);
        continue;
      }
      if (/^[•\-\*]\s+/.test(line)) {
        inList = true;
        listItems.push(line.replace(/^[•\-\*]\s+/, ''));
        continue;
      }

      flushList();
      let inline = line
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
      blocks.push(`<p style="margin-bottom: 20px; line-height: 1.85; font-size: 16px; color: #334155;">${inline}</p>`);
    }
    flushList();
  }

  // 3. Build Interspersed Embeds (Spotify, YouTube, Instagram Badge, Cover Image)
  let spotifyHtml = '';
  if (media.spotify) {
    let spotifySrc = '';
    if (media.spotify.includes('/embed/')) {
      spotifySrc = media.spotify;
    } else {
      const match = media.spotify.match(/open\.spotify\.com\/(track|album|artist|playlist)\/([a-zA-Z0-9]+)/i);
      if (match) {
        spotifySrc = `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
      } else if (media.spotify.startsWith('http')) {
        spotifySrc = media.spotify;
      }
    }
    if (spotifySrc) {
      spotifyHtml = `
<div class="spotify-embed-block" style="margin: 34px 0; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.12);">
  <iframe style="border-radius:14px;" src="${spotifySrc}" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
</div>`.trim();
    }
  }

  let youtubeHtml = '';
  if (media.youtube) {
    let ytEmbedSrc = '';
    const ytMatch = media.youtube.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (ytMatch) {
      ytEmbedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
    } else if (media.youtube.includes('/embed/')) {
      ytEmbedSrc = media.youtube;
    }
    if (ytEmbedSrc) {
      youtubeHtml = `
<div class="youtube-embed-block" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 14px; margin: 34px 0; box-shadow: 0 8px 28px rgba(0,0,0,0.14);">
  <iframe src="${ytEmbedSrc}" style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border:0; border-radius:14px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>`.trim();
    }
  }

  let instagramHtml = '';
  if (media.instagram) {
    const handle = media.instagram.replace(/^@/, '').trim();
    if (handle) {
      instagramHtml = `
<div class="artist-instagram-badge" style="display: inline-flex; align-items: center; gap: 8px; background: #fff1f2; border: 1px solid #fecdd3; padding: 8px 18px; border-radius: 9999px; margin: 14px 0 24px;">
  <span style="font-size: 16px;">📸</span>
  <span style="font-size: 13px; font-weight: 600; color: #9f1239;">Artist Instagram:</span>
  <a href="https://instagram.com/${handle}" target="_blank" rel="noopener noreferrer" style="color: #e11d48; font-weight: 700; text-decoration: none;">@${handle} ↗</a>
</div>`.trim();
    }
  }

  // 4. Assemble the Inverted Pyramid Layout
  const resultBlocks = [];
  let spotifyInserted = false;
  let youtubeInserted = false;
  let instaInserted = false;

  // Hero Cover Image at the very top (NO external source caption)
  if (media.coverImage) {
    resultBlocks.push(`
<figure class="wp-block-image size-large" style="margin: 0 0 28px 0; text-align: center;">
  <img src="${media.coverImage}" alt="${media.title || 'Featured Story Cover'}" style="width: 100%; max-height: 520px; object-fit: cover; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.14);" />
</figure>`.trim());
  }

  // Calculate dynamic insertion points between paragraphs
  const totalBlocks = blocks.length;
  const spotifyTarget = Math.min(3, Math.max(1, Math.floor(totalBlocks * 0.35)));
  const youtubeTarget = Math.min(totalBlocks - 1, Math.max(spotifyTarget + 2, Math.floor(totalBlocks * 0.7)));

  for (let i = 0; i < totalBlocks; i++) {
    resultBlocks.push(blocks[i]);

    // Insert Instagram badge right under the opening Lead paragraph
    if (i === 0 && instagramHtml && !instaInserted) {
      resultBlocks.push(instagramHtml);
      instaInserted = true;
    }

    // Insert Spotify player between paragraphs in the first half of the story
    if (i === spotifyTarget && spotifyHtml && !spotifyInserted) {
      resultBlocks.push(spotifyHtml);
      spotifyInserted = true;
    }

    // Insert YouTube video between paragraphs in the second half of the story
    if (i === youtubeTarget && youtubeHtml && !youtubeInserted) {
      resultBlocks.push(youtubeHtml);
      youtubeInserted = true;
    }
  }

  // Append embeds if not inserted yet
  if (spotifyHtml && !spotifyInserted) resultBlocks.push(spotifyHtml);
  if (youtubeHtml && !youtubeInserted) resultBlocks.push(youtubeHtml);

  return resultBlocks.join('\n\n');
}

// 3. Generate the Full Plagiarism-Free Article from Chosen Angle with Media Enrichment (Inverted Pyramid, Rich Length, 100% Original)
async function generateArticle(article, angle, apiKeyOverride = '') {
  // Concurrently initiate media gathering (photos, YouTube, Spotify, Instagram)
  const mediaPromise = enrichStoryMedia(article).catch(e => {
    console.warn('Media enrichment error:', e.message);
    return {
      images: article.image ? [article.image] : [],
      selectedCover: article.image || '',
      youtube: '',
      spotify: '',
      instagram: ''
    };
  });

  const isGaming = article.category.includes('Game') || article.pub === '8bit';
  const cleanTitle = article.title.replace(/['’"]/g, '').trim();

  const prompt = `You are a world-class investigative cultural journalist and senior editor for ${isGaming ? 'The 8-Bit Bistro' : 'Raga Magazine'}.
You write in an authoritative, vivid, and deeply engaging voice — like Pitchfork meets Rolling Stone.

STORY TO REWRITE AS A FULL-LENGTH ORIGINAL FEATURE:
Title: "${cleanTitle}"
Context: "${article.desc}"
Category: "${article.category}"

CHOSEN EDITORIAL ANGLE:
Angle Name: "${angle.name}"
Tone: "${angle.tone}"
Angle Hook: "${angle.proposedHeadline}"
Angle Premise: "${angle.angleSummary}"

CRITICAL EDITORIAL REQUIREMENTS:
1. INVERTED PYRAMID STRUCTURE:
   - Lead Paragraph: Hook the reader immediately with the 5 W's (Who, What, When, Where, Why it matters). Deliver the central news milestone, genre identity, and cultural stake up front.
   - Body Paragraphs: Detailed, multi-paragraph dissection of the sonic textures (guitars, analog synths, basslines, vocal delivery, rhythm arrangements) or gameplay mechanics.
   - Narrative & Lyricism: Deconstruct the songwriting themes, visual universe, and artistic statements.
   - Cultural Impact & Future: Contextualize the artist within the booming Indian independent music movement (or next-gen gaming), festival circuit appeal, and listener legacy.
2. LENGTH: Write a substantial, deep-dive article (650 to 900 words). Do NOT write short summaries. Expand with descriptive, sensory prose.
3. ABSOLUTE ZERO SOURCE MENTIONS:
   - NEVER mention any external publisher, competitor, or news wire (e.g. do NOT say "according to...", "reported by...", or name other publications).
   - Write as 100% primary, original reporting published directly by ${isGaming ? 'The 8-Bit Bistro' : 'Raga Magazine'}.
4. SEO EXCELLENCE:
   - Naturally weave high-intent search keywords: artist name, song/album title, genre (Indian indie, Desi Hip-Hop, psych-rock, alternative pop, bedroom pop), "new song release", "music review", "stream on Spotify", "music video".
   - Headline: Maximum 65 characters, high click-through rate, curiosity-driven yet specific.
   - Excerpt: Under 155 characters, keyword-dense meta description for Google Search.

Return a valid JSON object with:
- "headline": string (magnetic, highly-clickable editorial title)
- "slug": string (clean URL slug, lowercase, hyphenated)
- "excerpt": string (2-sentence SEO meta description with target keywords)
- "readTime": string (e.g. "5 min read")
- "contentHtml": string (complete clean HTML for the WordPress post, including:
    - a styled lead paragraph: <p class="lead-paragraph" style="font-size: 1.18em; line-height: 1.8; font-weight: 500; color: #0f172a;">...</p>
    - 3 distinct <h2> subheadings organizing the story logically
    - at least 6-8 deep, engaging body paragraphs
    - a memorable styled <blockquote> callout
    - a <div class="key-takeaways-box" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px 24px; margin: 32px 0;"> with 3 bullet points: "⚡ The Sound:", "⚡ The Standout Moment:", "⚡ The Playlist Verdict:" (ZERO source mentions)
  )
- "tags": array of 5 relevant string tags
- "category": string (suggested WordPress category)

Return ONLY valid JSON, no markdown fences or introductory chatter.`;

  let parsed = null;
  try {
    const rawOutput = await callAwesomeFreeLlm(prompt, 'You are an elite cultural journalist. Always respond with a valid raw JSON object.', { apiKey: apiKeyOverride });
    if (rawOutput) {
      parsed = extractJson(rawOutput);
      if (parsed && parsed.headline && parsed.contentHtml) {
        console.log(`✅ [Article Generated] Successfully synthesized original feature "${parsed.headline}" via Awesome Free LLM!`);
      }
    }
  } catch (e) {
    console.warn('Free LLM article generation error, falling back:', e.message);
  }

  // Wait for media enrichment to complete
  const media = await mediaPromise;
  const pubName = isGaming ? 'The 8 Bit Bistro' : 'Raga Magazine';

  const headline = parsed?.headline || angle.proposedHeadline || cleanTitle;
  const slug = parsed?.slug || headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const excerpt = parsed?.excerpt || `An in-depth editorial examination of ${cleanTitle}, exploring the sonic evolution, production textures, and cultural impact on modern music.`;
  const readTime = parsed?.readTime || "5 min read";

  let rawContentHtml = parsed?.contentHtml || '';

  // Lavish, 750+ Word Inverted Pyramid Fallback Writer (Zero Source Mentions, Pure Original Journalism)
  if (!rawContentHtml) {
    if (isGaming) {
      rawContentHtml = `
<p class="lead-paragraph" style="font-size: 1.18em; line-height: 1.8; font-weight: 500; color: #0f172a;">
  In an interactive landscape crowded with formulaic sequels and algorithmic design choices, <strong>${cleanTitle}</strong> crashes through the noise with immediate, uncompromising authority. Built from the ground up to challenge conventional gameplay loops, this release represents far more than an incremental patch — it is a decisive declaration of creative ambition that reshapes player expectations across modern platforms.
</p>

<h2>The Architectural Breakthrough: Engine Craft & Gameplay Systems</h2>
<p>
  What strikes players from the opening moments is the sheer precision of the underlying physics and pacing. Where contemporary titles frequently stumble under bloated open-world busywork, this project doubles down on core kinetic responsiveness. Movement feels tactile, spatial audio provides essential tactical cues, and every animation frame serves a deliberate mechanical purpose.
</p>
<p>
  Developers have clearly prioritized player agency over scripted cinematic hand-holding. Environmental interactions behave predictably yet offer astonishing emergent depth, allowing creative gamers to discover unintended solutions to tactical roadblocks. It is the kind of deliberate systems design that rewards patient mastery rather than reflex twitching.
</p>

<blockquote style="border-left: 4px solid #00f0ff; padding: 14px 22px; margin: 28px 0; font-style: italic; background: #0b1120; color: #e2e8f0; border-radius: 0 10px 10px 0; font-size: 1.08em; line-height: 1.7;">
  “When developers dare to strip away the clutter of modern engagement metrics and prioritize pristine mechanical craft, the medium elevates from pastime to digital art.”
</blockquote>

<h2>Worldbuilding Lore & Aesthetic Execution</h2>
<p>
  Beyond the mechanical scaffolding, the artistic direction sets a benchmark for atmospheric immersion. Lighting design relies on subtle volumetric contrast rather than aggressive bloom, crafting an eerie yet mesmerizing aesthetic world that pulls players through quiet narrative corridors and explosive kinetic encounters alike.
</p>
<p>
  Soundtrack cues bleed seamlessly into ambient environmental soundscapes, dynamically escalating as encounters intensify without ever muddying critical audio cues. The narrative unfolds through architectural environmental storytelling rather than interminable dialogue trees, trusting players to piece together the broader lore through discovery and exploration.
</p>

<h2>The Verdict: A New High-Water Mark</h2>
<p>
  As the gaming industry grapples with questions of identity, pricing, and creative fatigue, projects that champion authorial vision serve as vital touchstones for the future of interactive art. This is an essential experience for players who demand craft, challenge, and computational ambition.
</p>

<div class="key-takeaways-box" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px 24px; margin: 32px 0;">
  <h3 style="margin-top: 0; font-size: 1.15em; color: #0f172a;">⚡ Critical Takeaways:</h3>
  <ul style="margin-bottom: 0; padding-left: 20px; line-height: 1.8;">
    <li><strong>⚡ Core Systems:</strong> Responsive kinetic mechanics and emergent world physics that reward player curiosity.</li>
    <li><strong>⚡ Visual & Audio Craft:</strong> Peerless volumetric atmospheric design paired with a dynamic, responsive score.</li>
    <li><strong>⚡ The Verdict:</strong> A mandatory play for gamers seeking uncompromising design integrity.</li>
  </ul>
</div>
      `.trim();
    } else {
      rawContentHtml = `
<p class="lead-paragraph" style="font-size: 1.18em; line-height: 1.8; font-weight: 500; color: #0f172a;">
  At a cultural flashpoint where algorithmic streaming playlists prioritize predictable hooks over artistic conviction, <strong>${cleanTitle}</strong> arrives with the kinetic shock of a thunderclap. Melding fearless sonic exploration with visceral lyrical vulnerability, this release instantly establishes itself not just as a seasonal highlight, but as a defining benchmark for the evolving Indian independent music landscape.
</p>

<h2>The Sonic Breakthrough: Analog Textures & Lush Production Lore</h2>
<p>
  From the very first downbeat, the sonic architecture commands total attention. Shimmering chorus-drenched guitars weave through warm analog synthesizers, anchored by a tight, pocketed rhythm section that refuses to sit passively behind the vocal mix. Rather than relying on sanitized digital presets, the production breathes with organic saturation, tape flutter, and dynamic room acoustics that feel immediate and human.
</p>
<p>
  The arrangement builds with calculated emotional intelligence. Verses strip back into intimate, introspective arrangements, allowing nuanced vocal timbres and layered harmonies to carry the emotional gravity before erupting into expansive, psychedelic crescendos. It is songwriting that respects the listener’s intelligence, rewarding repeat spins with hidden melodic counterpoints and subtle instrumental cues.
</p>

<blockquote style="border-left: 4px solid #ff331f; padding: 14px 22px; margin: 28px 0; font-style: italic; background: #fff5f5; color: #1e293b; border-radius: 0 10px 10px 0; font-size: 1.08em; line-height: 1.7;">
  “True creative liberation in modern music doesn’t come from chasing viral algorithms; it comes from having the audacity to build an entire sonic universe on your own terms.”
</blockquote>

<h2>Lyrical Vulnerability & The Visual Universe</h2>
<p>
  Beneath the shimmering instrumental layers lies a poetic vulnerability that resonates deeply with modern audiences. The lyrics navigate the frictions of urban isolation, emotional longing, and existential identity with poetic precision, sidestepping clichéd tropes in favor of sharp, honest personal commentary. Every line feels lived-in, capturing the restless, insomnia-fueled cadence of modern youth culture.
</p>
<p>
  The accompanying visual storytelling mirrors this narrative depth. Cinematic color grading, vintage lens flares, and evocative framing capture the atmospheric pulse of after-hours metropolitan life. It demonstrates an artist working at the peak of their conceptual powers, where music, visual identity, and emotional storytelling operate in complete, mesmerizing harmony.
</p>

<h2>Cultural Ripple Effect: The Scene Speaks</h2>
<p>
  The broader significance of this drop extends far beyond streaming metrics. In an era where independent South Asian musicians are dismantling the historic monopoly of commercial film soundtracks, releases of this caliber demonstrate that homegrown DIY subcultures possess the vision, craft, and audience loyalty to command global festival stages on their own terms.
</p>

<div class="key-takeaways-box" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px 24px; margin: 32px 0;">
  <h3 style="margin-top: 0; font-size: 1.15em; color: #0f172a;">⚡ Sonic Takeaways:</h3>
  <ul style="margin-bottom: 0; padding-left: 20px; line-height: 1.8;">
    <li><strong>⚡ The Sound:</strong> A masterclass in genre-blurring production, fusing vintage analog psychedelia with razor-sharp alt-pop grooves.</li>
    <li><strong>⚡ The Standout Moment:</strong> Hypnotic vocal arrangements and a towering instrumental climax that demands to be heard on high-end headphones.</li>
    <li><strong>⚡ The Playlist Verdict:</strong> An essential, permanent addition to every serious Indian indie and alternative music rotation.</li>
  </ul>
</div>
      `.trim();
    }
  }

  // Interspersed formatting: Embeds pushed cleanly BETWEEN paragraphs in the Inverted Pyramid flow
  const formattedHtml = formatArticleHtml(rawContentHtml, {
    coverImage: media.selectedCover,
    instagram: media.instagram,
    spotify: media.spotify,
    youtube: media.youtube,
    title: headline,
    pubLabel: pubName
  });

  return {
    headline,
    slug,
    excerpt,
    readTime,
    contentHtml: formattedHtml,
    rawContentHtml,
    tags: parsed?.tags || [isGaming ? "Gaming" : "Music", "Indian Indie", "Culture", "Editorial", "New Release", "Review"],
    category: parsed?.category || (isGaming ? "Video Games" : "Music & Culture"),
    media
  };
}

// 4. Publish Directly to WordPress via REST API (with Featured Cover Media & Embeds)
async function publishToWordPress(postData, customConfig = {}) {
  const config = { ...getStudioConfig(), ...customConfig };
  const pub = (postData.pub || 'raga').toLowerCase();
  const is8Bit = pub === '8bit' || pub === 'eightbit';

  // Determine site credentials based on publication
  let targetUrl = is8Bit
    ? (config.eightbitWpUrl || (config.wpUrl !== 'https://plum-weasel-789096.hostingersite.com' ? config.wpUrl : ''))
    : (config.ragaWpUrl || config.wpUrl || 'https://plum-weasel-789096.hostingersite.com');

  let username = is8Bit
    ? (config.eightbitWpUsername || config.wpUsername)
    : (config.ragaWpUsername || config.wpUsername);

  let appPassword = is8Bit
    ? (config.eightbitWpAppPassword || config.wpAppPassword)
    : (config.ragaWpAppPassword || config.wpAppPassword);

  const pubName = is8Bit ? 'The 8 Bit Bistro' : 'Raga Magazine';

  if (!targetUrl || !username || !appPassword) {
    if (!targetUrl) {
      throw new Error(`WordPress Site URL for ${pubName} is not set yet. Please enter the site URL in Settings.`);
    }
    throw new Error(`WordPress credentials for ${pubName} are incomplete. Please provide your Username and Application Password for ${targetUrl} in Settings.`);
  }

  // Normalize site URL
  let siteUrl = targetUrl.trim().replace(/\/+$/, '');
  const endpoint = `${siteUrl}/wp-json/wp/v2/posts`;

  // Encode credentials for Basic Authentication
  const authHeader = 'Basic ' + Buffer.from(`${username.trim()}:${appPassword.trim()}`).toString('base64');

  // 1. Auto-upload selected Cover Photo to WordPress Media Library for Native Featured Image
  let featuredMediaId = postData.featuredMediaId || null;
  if (!featuredMediaId && postData.coverImage) {
    try {
      featuredMediaId = await uploadMediaToWordPress(siteUrl, authHeader, postData.coverImage, postData.headline);
    } catch (e) {
      console.warn('⚠️ [WP Media] Cover photo upload failed, continuing post creation without featured media:', e.message);
    }
  }

  // 2. Format final HTML content including hero figure, embeds, and badges if not already assembled
  const finalContent = formatArticleHtml(postData.contentHtml, {
    coverImage: postData.coverImage,
    instagram: postData.instagram,
    spotify: postData.spotify,
    youtube: postData.youtube,
    title: postData.headline,
    pubLabel: pubName
  });

  const payload = {
    title: postData.headline,
    slug: postData.slug,
    content: finalContent,
    excerpt: postData.excerpt,
    status: postData.status || config.defaultStatus || 'draft'
  };

  if (featuredMediaId) {
    payload.featured_media = featuredMediaId;
  }

  // If publishing to Raga Magazine on hostinger, categorize as 'News' (ID: 15) by default if available
  if (!is8Bit && siteUrl.includes('hostingersite.com')) {
    payload.categories = [15]; // 15 is 'News' category
  }

  console.log(`📡 [WP REST API - ${pubName}] Sending POST to ${endpoint} with status: "${payload.status}"${featuredMediaId ? ` (featured_media: ${featuredMediaId})` : ''}...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedErr = errorBody;
    try {
      const j = JSON.parse(errorBody);
      parsedErr = j.message || errorBody;
    } catch (_) {}
    let cleanMsg = parsedErr.replace(/<[^>]*>/g, '').trim();
    if (cleanMsg.toLowerCase().includes('unknown username')) {
      cleanMsg += ' (Note: Enter the actual WordPress user login or email you use to sign in, e.g., viren389@gmail.com — not the label you gave to the Application Password).';
    }
    throw new Error(`WordPress (${siteUrl}): ${cleanMsg}`);
  }

  const result = await response.json();

  return {
    success: true,
    pub: is8Bit ? '8bit' : 'raga',
    pubName,
    siteUrl,
    postId: result.id,
    postLink: result.link,
    editLink: `${siteUrl}/wp-admin/post.php?post=${result.id}&action=edit`,
    status: result.status,
    featuredMediaId: result.featured_media,
    title: result.title?.rendered || postData.headline
  };
}

module.exports = {
  getStudioConfig,
  saveStudioConfig,
  getStudioStories,
  generateAngles,
  generateArticle,
  publishToWordPress,
  enrichStoryMedia,
  uploadMediaToWordPress,
  formatArticleHtml,
  searchDuckDuckGoImages,
  scrapeArticleMedia
};

