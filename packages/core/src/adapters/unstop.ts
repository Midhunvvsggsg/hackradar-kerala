import { Hackathon } from "../schema.js";
import { isKerala, isNearby, normalizeKeralaCity, normalizeNearbyCity } from "../geo.js";
import { parseToKolkataISO, isHackathonOpen } from "../time.js";
import { SourceAdapter } from "./types.js";

interface UnstopItem {
  id: number;
  title: string;
  public_url: string;
  isPaid?: boolean | number;
  end_date?: string;
  regn_open?: boolean | number;
  organisation?: {
    name?: string;
  };
  locations?: Array<{
    city?: string;
    state?: string;
  }>;
  subtype?: string;
  logoUrl2?: string;
  prizes?: Array<{ cash?: number; title?: string }>;
  tags?: Array<{ name?: string }>;
}

interface UnstopResponse {
  data?: {
    data?: UnstopItem[];
  };
}

export class UnstopAdapter implements SourceAdapter {
  readonly id = "unstop";
  readonly name = "Unstop API";

  async fetch(): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(
        "https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&per_page=15",
        {
          headers: {
            "User-Agent": "HackRadar-Kerala/1.0 (+https://github.com/hackradar-kerala)",
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        throw new Error(`Unstop API responded with status ${res.status}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  normalize(raw: unknown, now: Date = new Date()): Hackathon[] {
    const resp = raw as UnstopResponse;
    const items = resp?.data?.data;
    if (!Array.isArray(items)) {
      return [];
    }

    const nowISO = now.toISOString();
    const nowMs = now.getTime();
    const results: Hackathon[] = [];

    for (const item of items) {
      if (!item.title || !item.public_url) continue;

      if (item.regn_open === false || item.regn_open === 0) {
        continue;
      }

      const deadlineISO = parseToKolkataISO(item.end_date, true);
      if (deadlineISO) {
        const deadlineMs = new Date(deadlineISO).getTime();
        if (isNaN(deadlineMs) || deadlineMs < nowMs) {
          continue;
        }
      } else {
        continue;
      }

      const firstLoc = item.locations?.[0];
      const city = firstLoc?.city;
      const state = firstLoc?.state;

      const isOnline = item.subtype?.includes("online") || !city;
      const isKer = isKerala(city, state, `${item.title} ${item.organisation?.name || ""}`);
      const isNear = isNearby(city, state, `${item.title} ${item.organisation?.name || ""}`);

      if (!isKer && !isOnline && !isNear) continue;

      const mode = isOnline
        ? (isKer ? "hybrid" : "online")
        : "offline";

      const isPaid = Boolean(item.isPaid);
      const fee = isPaid ? { type: "paid" as const } : { type: "free" as const };

      let prizeText: string | undefined;
      if (item.prizes && item.prizes.length > 0) {
        const cash = item.prizes[0].cash;
        prizeText = cash ? `₹${cash.toLocaleString("en-IN")}` : item.prizes[0].title;
      }

      const themes = (item.tags || [])
        .map((t) => t.name)
        .filter((t): t is string => Boolean(t));

      const cleanCity = normalizeKeralaCity(city) || normalizeNearbyCity(city) || city;
      const url = `https://unstop.com/${item.public_url.replace(/^\/+/, "")}`;

      results.push({
        id: `unstop-${item.id}`,
        title: item.title,
        source: this.id,
        sources: [{ name: this.id, url }],
        url,
        organizer: item.organisation?.name || "Unstop Organizer",
        mode,
        city: cleanCity,
        state: isKer ? "Kerala" : state,
        country: "India",
        registrationDeadline: deadlineISO,
        startDate: null,
        endDate: deadlineISO,
        fee,
        prize: prizeText,
        themes,
        imageUrl: item.logoUrl2,
        lastSeenAt: nowISO,
        isNearby: isNear && !isKer,
        deadlineUnknown: !deadlineISO,
      });
    }

    return results.filter((h) => isHackathonOpen(h, now));
  }
}
