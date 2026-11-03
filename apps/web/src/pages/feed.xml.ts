import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { HackathonDatasetSchema, filterHackathons, nowInKolkata } from "@hackradar/core";

export const GET: APIRoute = async () => {
  let currentDir = process.cwd();
  let candidate = path.resolve(currentDir, "data/hackathons.json");
  while (!fs.existsSync(candidate) && path.dirname(currentDir) !== currentDir) {
    currentDir = path.dirname(currentDir);
    candidate = path.resolve(currentDir, "data/hackathons.json");
  }

  let itemsXml = "";
  if (fs.existsSync(candidate)) {
    try {
      const data = JSON.parse(fs.readFileSync(candidate, "utf-8"));
      const parsed = HackathonDatasetSchema.parse(data);
      const openEvents = filterHackathons(parsed.events, { nearby: true }, nowInKolkata());

      itemsXml = openEvents
        .map((h) => {
          const deadlineText = h.registrationDeadline
            ? `Registration deadline: ${new Date(h.registrationDeadline).toUTCString()}`
            : "Registration deadline: Unknown";

          const feeText = h.fee.type === "free" ? "Free" : `Paid (₹${h.fee.amountINR || "TBD"})`;
          const description = `<![CDATA[
            <p><strong>Organizer:</strong> ${h.organizer}</p>
            <p><strong>Mode:</strong> ${h.mode.toUpperCase()}${h.city ? ` (${h.city})` : ""}</p>
            <p><strong>Fee:</strong> ${feeText}</p>
            <p>${deadlineText}</p>
            <p><a href="${h.url}">Register on ${h.source}</a></p>
          ]]>`;

          return `
          <item>
            <title><![CDATA[${h.title}]]></title>
            <link>${h.url}</link>
            <guid isPermaLink="false">${h.id}</guid>
            <pubDate>${new Date(h.lastSeenAt).toUTCString()}</pubDate>
            <description>${description}</description>
          </item>
          `;
        })
        .join("\n");
    } catch {
      // Continue with empty items
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HackRadar Kerala</title>
    <link>https://hackradar-kerala.org</link>
    <description>Active hackathons open for registration relevant to Kerala developers</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://hackradar-kerala.org/feed.xml" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(xml.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
