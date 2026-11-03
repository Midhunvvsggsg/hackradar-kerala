import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { Hackathon, HackathonSchema } from "../schema.js";
import { isNearby, normalizeKeralaCity, normalizeNearbyCity } from "../geo.js";
import { isHackathonOpen } from "../time.js";
import { SourceAdapter } from "./types.js";

const ManualFileSchema = z.object({
  hackathons: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().url(),
      organizer: z.string(),
      mode: z.enum(["online", "offline", "hybrid"]),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().default("India"),
      registrationDeadline: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      fee: z.object({
        type: z.enum(["free", "paid", "unknown"]),
        amountINR: z.number().optional(),
      }),
      prize: z.string().optional(),
      themes: z.array(z.string()).default([]),
      eligibility: z.string().optional(),
      teamSize: z.string().optional(),
      imageUrl: z.string().url().optional(),
    })
  ),
});

export class ManualAdapter implements SourceAdapter {
  readonly id = "manual";
  readonly name = "Curated Community (manual.yaml)";
  private readonly filePath: string;

  constructor(filePath?: string) {
    if (filePath) {
      this.filePath = filePath;
    } else if (process.env.MANUAL_YAML_PATH) {
      this.filePath = process.env.MANUAL_YAML_PATH;
    } else {
      // Find data/manual.yaml starting from current directory up
      let currentDir = process.cwd();
      let foundPath = path.resolve(currentDir, "data/manual.yaml");
      while (!fs.existsSync(foundPath) && path.dirname(currentDir) !== currentDir) {
        currentDir = path.dirname(currentDir);
        foundPath = path.resolve(currentDir, "data/manual.yaml");
      }
      this.filePath = foundPath;
    }
  }

  async fetch(): Promise<unknown> {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`manual.yaml not found at ${this.filePath}`);
    }
    const content = fs.readFileSync(this.filePath, "utf-8");
    return parse(content);
  }

  normalize(raw: unknown, now: Date = new Date()): Hackathon[] {
    const parsed = ManualFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid manual.yaml format: ${parsed.error.message}`);
    }

    const nowISO = now.toISOString();
    const nowMs = now.getTime();

    return parsed.data.hackathons
      .filter((item) => isHackathonOpen(item, now))
      .map((item) => {
      const city = normalizeKeralaCity(item.city) || normalizeNearbyCity(item.city) || item.city;
      const nearby = isNearby(city, item.state);
      const deadlineUnknown = !item.registrationDeadline;

      const hackathon: Hackathon = {
        id: item.id,
        title: item.title,
        source: this.id,
        sources: [{ name: this.id, url: item.url }],
        url: item.url,
        organizer: item.organizer,
        mode: item.mode,
        city,
        state: item.state,
        country: item.country || "India",
        registrationDeadline: item.registrationDeadline || null,
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        fee: item.fee,
        prize: item.prize,
        themes: item.themes,
        eligibility: item.eligibility,
        teamSize: item.teamSize,
        imageUrl: item.imageUrl,
        lastSeenAt: nowISO,
        isNearby: nearby,
        deadlineUnknown,
      };

      return HackathonSchema.parse(hackathon);
    });
  }
}
