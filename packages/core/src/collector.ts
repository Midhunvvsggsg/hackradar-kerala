import fs from "node:fs";
import path from "node:path";
import { Hackathon, HackathonDataset, SourceHealth } from "./schema.js";
import { SourceAdapter } from "./adapters/types.js";
import { ManualAdapter } from "./adapters/manual.js";
import { DevfolioAdapter } from "./adapters/devfolio.js";
import { DevpostAdapter } from "./adapters/devpost.js";
import { UnstopAdapter } from "./adapters/unstop.js";
import { deduplicateHackathons } from "./dedupe.js";
import { filterHackathons, sortHackathonsByClosingSoonest } from "./filters.js";
import { nowInKolkata } from "./time.js";

export interface CollectOptions {
  outputPath?: string;
  adapters?: SourceAdapter[];
  quiet?: boolean;
}

export async function collectHackathons(options: CollectOptions = {}): Promise<HackathonDataset> {
  const adapters: SourceAdapter[] = options.adapters || [
    new ManualAdapter(),
    new DevfolioAdapter(),
    new DevpostAdapter(),
    new UnstopAdapter(),
  ];

  const sourceHealthList: SourceHealth[] = [];
  const rawEvents: Hackathon[] = [];
  const now = nowInKolkata();
  const nowISO = now.toISOString();

  for (const adapter of adapters) {
    const startTime = Date.now();
    try {
      if (!options.quiet) {
        console.log(`[Collector] Running adapter: ${adapter.name}...`);
      }
      const raw = await adapter.fetch();
      const normalized = adapter.normalize(raw);

      sourceHealthList.push({
        id: adapter.id,
        name: adapter.name,
        status: "ok",
        count: normalized.length,
        lastRun: nowISO,
      });

      rawEvents.push(...normalized);
      if (!options.quiet) {
        console.log(
          `[Collector] ✓ ${adapter.name}: fetched ${normalized.length} events in ${Date.now() - startTime}ms`
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (!options.quiet) {
        console.error(`[Collector] ✗ ${adapter.name} failed: ${errorMsg}`);
      }

      sourceHealthList.push({
        id: adapter.id,
        name: adapter.name,
        status: "error",
        count: 0,
        lastRun: nowISO,
        error: errorMsg,
      });
    }
  }

  // Deduplicate across all sources
  const deduped = deduplicateHackathons(rawEvents);

  // Apply strict non-negotiable open check
  const openEvents = filterHackathons(deduped, { nearby: true }, now);

  // Sort by closing soonest
  const sorted = sortHackathonsByClosingSoonest(openEvents);

  const dataset: HackathonDataset = {
    generatedAt: nowISO,
    timezone: "Asia/Kolkata",
    totalEvents: sorted.length,
    sources: sourceHealthList,
    events: sorted,
  };

  // Determine output path
  let targetPath = options.outputPath;
  if (!targetPath) {
    let currentDir = process.cwd();
    let foundPath = path.resolve(currentDir, "data/hackathons.json");
    while (!fs.existsSync(path.dirname(foundPath)) && path.dirname(currentDir) !== currentDir) {
      currentDir = path.dirname(currentDir);
      foundPath = path.resolve(currentDir, "data/hackathons.json");
    }
    targetPath = foundPath;
  }

  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetPath, JSON.stringify(dataset, null, 2), "utf-8");

  if (!options.quiet) {
    console.log(
      `[Collector] Done! Saved ${dataset.totalEvents} active hackathons to ${targetPath}`
    );
  }

  return dataset;
}

// Direct execution CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  collectHackathons().catch((err) => {
    console.error("Fatal collector failure:", err);
    process.exit(1);
  });
}
