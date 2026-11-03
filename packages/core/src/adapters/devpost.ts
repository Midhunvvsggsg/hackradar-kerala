import { Hackathon } from "../schema.js";
import { isKerala, isNearby, normalizeKeralaCity, normalizeNearbyCity } from "../geo.js";
import { parseToKolkataISO, isHackathonOpen } from "../time.js";
import { SourceAdapter } from "./types.js";

interface DevpostItem {
  id: number;
  title: string;
  url: string;
  displayed_location?: {
    location?: string;
  };
  open_state?: string;
  thumbnail_url?: string;
  time_left_to_submission?: string;
  submission_period_dates?: string;
  themes?: Array<{ name: string }>;
  prize_amount?: string;
  organization_name?: string;
}

interface DevpostResponse {
  hackathons?: DevpostItem[];
}

export class DevpostAdapter implements SourceAdapter {
  readonly id = "devpost";
  readonly name = "Devpost API";

  async fetch(): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(
        "https://devpost.com/api/hackathons?challenge_type[]=online&status[]=upcoming&status[]=open",
        {
          headers: {
            "User-Agent": "HackRadar-Kerala/1.0 (+https://github.com/hackradar-kerala)",
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        throw new Error(`Devpost API responded with status ${res.status}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  normalize(raw: unknown, now: Date = new Date()): Hackathon[] {
    const data = raw as DevpostResponse;
    if (!data || !Array.isArray(data.hackathons)) {
      return [];
    }

    const nowISO = now.toISOString();
    const nowMs = now.getTime();
    const results: Hackathon[] = [];

    for (const item of data.hackathons) {
      if (!item.title || !item.url) continue;

      if (item.open_state && item.open_state.toLowerCase() === "closed") {
        continue;
      }

      const locText = item.displayed_location?.location || "Online";
      const isOnline = /online/i.test(locText);
      const isKer = isKerala(undefined, undefined, `${item.title} ${locText}`);
      const isNear = isNearby(undefined, undefined, `${item.title} ${locText}`);

      if (!isOnline && !isKer && !isNear) continue;

      const mode = isOnline ? (isKer ? "hybrid" : "online") : "offline";

      // Parse submission_period_dates, e.g. "Oct 01 - Nov 12, 2026"
      let deadlineISO: string | null = null;
      if (item.submission_period_dates) {
        const parts = item.submission_period_dates.split("-");
        const rawEnd = parts[parts.length - 1]?.trim();
        if (rawEnd) {
          deadlineISO = parseToKolkataISO(rawEnd, true);
        }
      }

      if (deadlineISO) {
        const deadlineMs = new Date(deadlineISO).getTime();
        if (isNaN(deadlineMs) || deadlineMs < nowMs) {
          continue;
        }
      } else {
        continue;
      }

      let prizeText: string | undefined;
      if (item.prize_amount) {
        prizeText = item.prize_amount.replace(/<[^>]+>/g, "").trim();
      }

      const imageUrl = item.thumbnail_url?.startsWith("//")
        ? `https:${item.thumbnail_url}`
        : item.thumbnail_url;

      results.push({
        id: `devpost-${item.id}`,
        title: item.title,
        source: this.id,
        sources: [{ name: this.id, url: item.url }],
        url: item.url,
        organizer: item.organization_name || "Devpost Host",
        mode,
        city: isKer ? normalizeKeralaCity(locText) : (isNear ? normalizeNearbyCity(locText) : undefined),
        state: isKer ? "Kerala" : undefined,
        country: isKer ? "India" : "Global",
        registrationDeadline: deadlineISO,
        startDate: null,
        endDate: deadlineISO,
        fee: { type: "free" },
        prize: prizeText,
        themes: (item.themes || []).map((t) => t.name).filter(Boolean),
        imageUrl,
        lastSeenAt: nowISO,
        isNearby: isNear && !isKer,
        deadlineUnknown: !deadlineISO,
      });
    }

    return results.filter((h) => isHackathonOpen(h, now));
  }
}
