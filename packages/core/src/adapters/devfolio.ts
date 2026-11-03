import { Hackathon } from "../schema.js";
import { isKerala, isNearby, normalizeKeralaCity, normalizeNearbyCity } from "../geo.js";
import { isHackathonOpen } from "../time.js";
import { SourceAdapter } from "./types.js";

interface DevfolioItem {
  uuid: string;
  name: string;
  slug: string;
  starts_at?: string | null;
  ends_at?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  location?: string | null;
  is_online?: boolean | null;
  cover_img?: string | null;
  hackathon_setting?: {
    site?: string | null;
    subdomain?: string | null;
    reg_starts_at?: string | null;
    reg_ends_at?: string | null;
  };
  themes?: Array<{ name: string }>;
}

interface DevfolioResponse {
  result?: DevfolioItem[];
}

export class DevfolioAdapter implements SourceAdapter {
  readonly id = "devfolio";
  readonly name = "Devfolio API";

  async fetch(): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch("https://api.devfolio.co/api/hackathons?filter=all&page=1", {
        headers: {
          "User-Agent": "HackRadar-Kerala/1.0 (+https://github.com/hackradar-kerala)",
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Devfolio API responded with status ${res.status}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  normalize(raw: unknown, now: Date = new Date()): Hackathon[] {
    const data = raw as DevfolioResponse;
    if (!data || !Array.isArray(data.result)) {
      return [];
    }

    const nowISO = now.toISOString();
    const nowMs = now.getTime();
    const results: Hackathon[] = [];

    for (const item of data.result) {
      if (!item.name || !item.slug) continue;

      // Filter out events whose registration has ended or event has ended
      const regEndsMs = item.hackathon_setting?.reg_ends_at
        ? new Date(item.hackathon_setting.reg_ends_at).getTime()
        : null;
      if (regEndsMs !== null && !isNaN(regEndsMs) && regEndsMs < nowMs) {
        continue;
      }

      const endsMs = item.ends_at ? new Date(item.ends_at).getTime() : null;
      if (endsMs !== null && !isNaN(endsMs) && endsMs < nowMs) {
        continue;
      }

      if (regEndsMs === null && endsMs === null) {
        const startsMs = item.starts_at ? new Date(item.starts_at).getTime() : null;
        if (startsMs === null || isNaN(startsMs) || startsMs < nowMs) {
          continue;
        }
      }

      const isOnline = Boolean(item.is_online);
      const rawCity = item.city || undefined;
      const rawState = item.state || undefined;
      const rawLocation = item.location || undefined;

      const isKer = isKerala(rawCity, rawState, `${item.name} ${rawLocation || ""}`);
      const isNear = isNearby(rawCity, rawState, `${item.name} ${rawLocation || ""}`);

      if (!isKer && !isOnline && !isNear) {
        continue;
      }

      const mode = isOnline
        ? (isKer ? "hybrid" : "online")
        : "offline";

      const deadline = item.hackathon_setting?.reg_ends_at || null;
      const city = normalizeKeralaCity(rawCity) || normalizeNearbyCity(rawCity) || rawCity;
      const themes = (item.themes || []).map((t) => t.name).filter(Boolean);
      const url = `https://${item.slug}.devfolio.co`;

      results.push({
        id: `devfolio-${item.uuid || item.slug}`,
        title: item.name,
        source: this.id,
        sources: [{ name: this.id, url }],
        url,
        organizer: item.hackathon_setting?.subdomain || "Devfolio Community",
        mode,
        city: city || undefined,
        state: rawState || (isKer ? "Kerala" : undefined),
        country: item.country || "India",
        registrationDeadline: deadline,
        startDate: item.starts_at || null,
        endDate: item.ends_at || null,
        fee: { type: "free" },
        prize: undefined,
        themes,
        imageUrl: item.cover_img || undefined,
        lastSeenAt: nowISO,
        isNearby: isNear && !isKer,
        deadlineUnknown: !deadline,
      });
    }

    return results.filter((h) => isHackathonOpen(h, now));
  }
}
