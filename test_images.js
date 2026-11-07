const urls = [
  'https://theindianmusicdiaries.com/feed/',
  'https://theindianmusicdiaries.com/feed/?paged=2',
  'https://theindianmusicdiaries.com/feed/?paged=3',
  'https://rollingstoneindia.com/feed/',
  'https://rollingstoneindia.com/feed/?paged=2',
  'https://rollingstoneindia.com/feed/?paged=3'
];

Promise.all(urls.map(u => fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text()))).then(results => {
  const articles = [];
  results.forEach(xml => {
    const items = xml.split('<item>').slice(1);
    items.forEach(it => {
      const titleMatch = it.match(/<title>([\s\S]*?)<\/title>/);
      // Find all image urls in this item
      const imgUrls = [...it.matchAll(/https?:\/\/[^\s"'<>]+\.(?:webp|jpg|jpeg|png)/gi)].map(m => m[0]);
      // Prefer highest resolution or 1080 / scaled
      const bestImg = imgUrls.find(u => u.includes('1080w') || (!u.includes('150x') && !u.includes('300x') && !u.includes('logo'))) || imgUrls[0];
      
      if (titleMatch && bestImg) {
        articles.push({
          title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim(),
          image: bestImg
        });
      }
    });
  });

  console.log('Total articles with real live images found:', articles.length);
  articles.slice(0, 15).forEach((a, i) => {
    console.log(`${i + 1}. [${a.title.substring(0, 45)}...]`);
    console.log(`   Image: ${a.image}`);
  });
}).catch(console.error);

