/**
 * Automatically notifies IndexNow (Bing, Yandex, Seznam, Naver) of updated site pages.
 */
async function notifyIndexNow() {
  const payload = {
    host: "hackradar-kerala.vercel.app",
    key: "c49d8825c93d40ecb8e8fef650c8e3da",
    keyLocation: "https://hackradar-kerala.vercel.app/c49d8825c93d40ecb8e8fef650c8e3da.txt",
    urlList: [
      "https://hackradar-kerala.vercel.app/",
      "https://hackradar-kerala.vercel.app/feed.xml",
      "https://hackradar-kerala.vercel.app/api/hackathons.json"
    ]
  };

  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow"
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload)
      });
      console.log(`[IndexNow] Submitted to ${ep}: HTTP ${res.status}`);
    } catch (e) {
      console.warn(`[IndexNow] Failed for ${ep}:`, e.message);
    }
  }
}

notifyIndexNow();
