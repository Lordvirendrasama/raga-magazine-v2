const fs = require('fs');
const path = require('path');
const { harvestGamingStories } = require('./8bit-generator');
const { harvestUncoveredLiveStories } = require('./generator-engine');

// Load or save configuration (WordPress & API Keys)
const CONFIG_FILE = path.join(__dirname, 'wp-studio-config.json');

function getStudioConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (_) {}
  }
  return {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    wpUrl: '',
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

// 2. Generate 4 Distinct Editorial Angles
async function generateAngles(article, apiKeyOverride = '') {
  const config = getStudioConfig();
  const geminiKey = apiKeyOverride || config.geminiApiKey || process.env.GEMINI_API_KEY;

  // If Gemini API Key is provided, use Google Gemini Live
  if (geminiKey) {
    try {
      const prompt = `You are the executive editor of an elite digital publication.
Analyze this news item:
TITLE: "${article.title}"
SOURCE: "${article.source}"
SUMMARY: "${article.desc}"
CATEGORY: "${article.category}"

Generate 4 completely different editorial angles for how our writers should cover this story for our blog.
Return a valid JSON array of exactly 4 objects with keys:
- "id": string (e.g. "angle-deepdive", "angle-community", "angle-critique", "angle-digest")
- "name": string (e.g. "The Industry Deep-Dive", "The Fan / Player Voice", "The Critical & Skeptical Take", "The Essential Digest")
- "badge": string (e.g. "ANALYSIS", "CULTURE", "CRITIQUE", "QUICK-READ")
- "proposedHeadline": string (a punchy, high-fashion editorial headline)
- "angleSummary": string (2-3 sentences explaining what this angle focuses on and why readers will click it)
- "tone": string (e.g. "Authoritative & Insightful", "Excited & Fan-Centric", "Provocative & Searing", "Crisp & High-Paced")

Return ONLY the JSON array, no markdown fences or other text.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Gemini API angle generation failed, falling back to contextual generator:', e.message);
    }
  }

  // Smart Contextual Angle Synthesizer (Instant fallback with zero API key needed!)
  const isGaming = article.category.includes('Game') || article.pub === '8bit';
  const cleanTitle = article.title.replace(/['’"]/g, '');

  return [
    {
      id: "angle-deepdive",
      name: isGaming ? "The Industry & Systems Deep-Dive" : "The Sonic & Cultural Anatomy",
      badge: "INVESTIGATIVE",
      proposedHeadline: isGaming
        ? `Architectural Ambition: Inside the Real Stakes Behind "${cleanTitle}"`
        : `Rooted In Lineage: Why "${cleanTitle}" Redefines The Soundscape`,
      angleSummary: isGaming
        ? "Goes behind corporate press releases to examine the developmental economics, engine technology, and computational stakes shaping this move."
        : "Unpacks the artistic heritage, studio production choices, and cultural resonance that separates this release from streaming noise.",
      tone: "Authoritative, In-Depth, Investigative"
    },
    {
      id: "angle-community",
      name: isGaming ? "The Player & Community Perspective" : "The Fan & Scene Pulse",
      badge: "CULTURE & COMMUNITY",
      proposedHeadline: isGaming
        ? `What Players Actually Need: Breaking Down "${cleanTitle}"`
        : `The Scene Speaks: How Fans Are Rallying Around "${cleanTitle}"`,
      angleSummary: isGaming
        ? "Focuses on the ground-level gamer experience: playability, pricing fairness, community expectations, and real reactions from Reddit, Discord, and Steam."
        : "Celebrates the grassroots fan reaction, underground venue energy, and what this milestone means for the independent music community.",
      tone: "Passionate, Relatable, Community-Focused"
    },
    {
      id: "angle-critique",
      name: "The Critical & Provocative Take",
      badge: "CRITIQUE",
      proposedHeadline: isGaming
        ? `Skepticism Required: The Questionable Promises Surrounding "${cleanTitle}"`
        : `Beyond The Hype: Does "${cleanTitle}" Truly Deliver On Its Potential?`,
      angleSummary: "Challenges the mainstream consensus, questioning whether marketing hype matches reality and holding executives and publishers accountable.",
      tone: "Sharp, Uncompromising, Intellectual"
    },
    {
      id: "angle-digest",
      name: "The Executive Quick-Read Digest",
      badge: "FAST DIGEST",
      proposedHeadline: `Fast Intel: 5 Things You Must Know About "${cleanTitle}"`,
      angleSummary: "Designed for readers short on time: delivers the 핵심 facts, bulleted takeaways, key dates, and actionable verdicts in under 3 minutes.",
      tone: "Crisp, Concise, High-Utility"
    }
  ];
}

// 3. Generate the Full Plagiarism-Free Article from Chosen Angle
async function generateArticle(article, angle, apiKeyOverride = '') {
  const config = getStudioConfig();
  const geminiKey = apiKeyOverride || config.geminiApiKey || process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      const prompt = `You are a world-class cultural journalist writing an original, plagiarism-free article ready to publish on a high-traffic WordPress site.
SOURCE STORY TO REWRITE:
Title: "${article.title}"
Source Publisher: "${article.source}"
Raw Summary/Content: "${article.desc}"
Category: "${article.category}"

CHOSEN EDITORIAL ANGLE:
Angle Name: "${angle.name}"
Tone: "${angle.tone}"
Proposed Angle Hook: "${angle.proposedHeadline}"
Angle Focus: "${angle.angleSummary}"

TASK:
Write a completely original article from this specific angle. Do NOT copy sentences from the source. Synthesize the facts into an engaging, magazine-style piece.
Return a valid JSON object with:
- "headline": string (a magnetic, highly-clickable editorial title)
- "slug": string (clean URL slug, lowercase, hyphenated)
- "excerpt": string (2-sentence SEO meta description)
- "readTime": string (e.g. "4 min read")
- "contentHtml": string (complete clean HTML for the WordPress post, including <h2> subheadings, thoughtful body paragraphs, a <blockquote> with a memorable quote/takeaway, and a <ul> key takeaways box)
- "tags": array of strings (5 relevant tags)
- "category": string (suggested WordPress category)

Return ONLY valid JSON, no markdown fences.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.headline && parsed.contentHtml) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Gemini article generation failed, using intelligent fallback writer:', e.message);
    }
  }

  // Intelligent Contextual Fallback Writer (Generates clean WordPress HTML immediately)
  const headline = angle.proposedHeadline || article.title;
  const slug = headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const isGaming = article.category.includes('Game') || article.pub === '8bit';

  const contentHtml = `
<p class="lead-paragraph" style="font-size: 1.15em; line-height: 1.7; font-weight: 500;">
  In an era dominated by rapid algorithmic news cycles, <strong>${article.title}</strong> emerges not merely as another press bullet, but as a defining case study in how modern ${isGaming ? 'interactive media' : 'contemporary sound'} is evolving. Approached through the lens of <em>${angle.name}</em>, the real stakes become immediately apparent.
</p>

<h2>The Structural Landscape</h2>
<p>
  When evaluating announcements from <em>${article.source}</em>, distinguishing genuine artistic or technical ambition from calculated marketing noise is critical. What immediately sets this development apart is how directly it addresses longstanding friction points in the medium.
</p>
<p>
  ${article.desc ? article.desc.substring(0, 320) + '...' : 'Rather than settling for standardized corporate formulas, the creators behind this project are pushing back with deliberate creative intentionality.'}
</p>

<blockquote style="border-left: 4px solid #e60012; padding: 12px 18px; margin: 24px 0; font-style: italic; background: #f8fafc;">
  “When creators dare to prioritize authorial conviction over algorithmic validation, audiences respond with undivided attention.”
</blockquote>

<h2>What This Means Moving Forward</h2>
<p>
  The broader implications extend far beyond this single announcement. As audiences demand higher standards of craft, projects that prioritize authenticity over easy virality are forging the definitive creative canon of our era.
</p>

<div class="key-takeaways-box" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 22px; margin: 28px 0;">
  <h3 style="margin-top: 0; font-size: 1.1em; color: #0f172a;">⚡ Critical Takeaways:</h3>
  <ul style="margin-bottom: 0; padding-left: 20px;">
    <li><strong>Core Shift:</strong> Highlights a decisive pivot toward sustainable, authorial creative design.</li>
    <li><strong>Audience Impact:</strong> Delivers measurable value for readers following ${isGaming ? 'next-gen gaming' : 'independent music'} culture.</li>
    <li><strong>Verified Context:</strong> Derived and synthesized from primary reporting via <em>${article.source}</em>.</li>
  </ul>
</div>

<p style="font-size: 0.9em; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
  <em>Curated and synthesized via Antigravity Publishing Studio. Original reporting sourced from <a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.source} ↗</a>.</em>
</p>
  `.trim();

  return {
    headline,
    slug,
    excerpt: `An in-depth editorial examination of ${article.title}, exploring the creative stakes, technical landscape, and broader cultural impact.`,
    readTime: "4 min read",
    contentHtml,
    tags: [isGaming ? "Gaming" : "Music", "Culture", "Editorial", article.source, "Analysis"],
    category: isGaming ? "Video Games" : "Music & Culture"
  };
}

// 4. Publish Directly to WordPress via REST API
async function publishToWordPress(postData, customConfig = {}) {
  const config = { ...getStudioConfig(), ...customConfig };

  if (!config.wpUrl || !config.wpUsername || !config.wpAppPassword) {
    throw new Error("WordPress configuration is incomplete. Please provide your WordPress Site URL, Username, and Application Password.");
  }

  // Normalize site URL
  let siteUrl = config.wpUrl.trim().replace(/\/+$/, '');
  const endpoint = `${siteUrl}/wp-json/wp/v2/posts`;

  // Encode credentials for Basic Authentication
  const authHeader = 'Basic ' + Buffer.from(`${config.wpUsername.trim()}:${config.wpAppPassword.trim()}`).toString('base64');

  const payload = {
    title: postData.headline,
    slug: postData.slug,
    content: postData.contentHtml,
    excerpt: postData.excerpt,
    status: config.defaultStatus || 'draft'
  };

  console.log(`📡 [WP REST API] Sending POST to ${endpoint} with status: "${payload.status}"...`);

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
    throw new Error(`WordPress REST API Error (HTTP ${response.status}): ${errorBody}`);
  }

  const result = await response.json();

  return {
    success: true,
    postId: result.id,
    postLink: result.link,
    editLink: `${siteUrl}/wp-admin/post.php?post=${result.id}&action=edit`,
    status: result.status,
    title: result.title?.rendered || postData.headline
  };
}

module.exports = {
  getStudioConfig,
  saveStudioConfig,
  getStudioStories,
  generateAngles,
  generateArticle,
  publishToWordPress
};
