import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { HackathonDataset, HackathonDatasetSchema, collectHackathons } from "@hackradar/core";

const CACHE_DIR = path.join(os.homedir(), ".cache", "hackradar");
const CACHE_FILE = path.join(CACHE_DIR, "data.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Finds local repository data/hackathons.json if present.
 */
function findLocalDataPath(): string | null {
  // Start searching upwards from the package directory itself
  try {
    let dir = path.dirname(new URL(import.meta.url).pathname);
    while (true) {
      const candidate = path.join(dir, "data", "hackathons.json");
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // Ignore URL parse error
  }

  // Fallback to searching upwards from current working directory
  let currentDir = process.cwd();
  while (true) {
    const candidate = path.join(currentDir, "data", "hackathons.json");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }
  return null;
}

/**
 * Loads data from cache, local file, or live collector.
 */
export async function loadDataset(live = false): Promise<{ dataset: HackathonDataset; source: string }> {
  // If --live requested, run collectors immediately and write to cache
  if (live) {
    const dataset = await collectHackathons({ quiet: true });
    writeCache(dataset);
    return { dataset, source: "live fetch" };
  }

  // 1. Check workspace local data/hackathons.json if running in project
  const localDataPath = findLocalDataPath();
  if (localDataPath) {
    try {
      const content = fs.readFileSync(localDataPath, "utf-8");
      const parsed = JSON.parse(content);
      const dataset = HackathonDatasetSchema.parse(parsed);
      writeCache(dataset);
      return { dataset, source: "workspace dataset" };
    } catch {
      // Continue to cache
    }
  }

  // 2. Check local user cache (~/.cache/hackradar/data.json)
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const stats = fs.statSync(CACHE_FILE);
      const isFresh = Date.now() - stats.mtimeMs < CACHE_TTL_MS;
      const content = fs.readFileSync(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(content);
      const dataset = HackathonDatasetSchema.parse(parsed);

      if (isFresh) {
        return { dataset, source: "local cache (fresh)" };
      }
    } catch {
      // Cache corrupted or unparseable, continue
    }
  }

  // Fallback to live run if no cache or local dataset is available
  try {
    const dataset = await collectHackathons({ quiet: true });
    writeCache(dataset);
    return { dataset, source: "live fallback" };
  } catch (err) {
    // If live fails, check if stale cache exists
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const content = fs.readFileSync(CACHE_FILE, "utf-8");
        const parsed = JSON.parse(content);
        const dataset = HackathonDatasetSchema.parse(parsed);
        return { dataset, source: "offline cache (stale)" };
      } catch {
        // Fall through
      }
    }
    throw err;
  }
}

function writeCache(dataset: HackathonDataset): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(dataset, null, 2), "utf-8");
  } catch {
    // Non-fatal if cache write fails
  }
}
