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

  let content = "{}";
  if (fs.existsSync(candidate)) {
    try {
      const raw = JSON.parse(fs.readFileSync(candidate, "utf-8"));
      const parsed = HackathonDatasetSchema.parse(raw);
      const openEvents = filterHackathons(parsed.events, { nearby: true }, nowInKolkata());
      const dataset = {
        ...parsed,
        totalEvents: openEvents.length,
        events: openEvents,
      };
      content = JSON.stringify(dataset, null, 2);
    } catch {
      content = fs.readFileSync(candidate, "utf-8");
    }
  }

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
