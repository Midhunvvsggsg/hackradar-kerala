import { Hackathon, SourceLink } from "./schema.js";

/**
 * Normalizes title for fuzzy comparison.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(hackathon|hack|coding|challenge|competition|2024|2025|2026|2027|v\d+|edition|\.io)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Calculates Jaccard token similarity between two strings.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/).filter(Boolean));
  const set2 = new Set(str2.toLowerCase().split(/\s+/).filter(Boolean));

  if (set1.size === 0 && set2.size === 0) return 1.0;
  if (set1.size === 0 || set2.size === 0) return 0.0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Determines whether two hackathons represent the same real-world event.
 */
export function areDuplicates(h1: Hackathon, h2: Hackathon): boolean {
  // Exact or normalized title match
  const t1 = normalizeTitle(h1.title);
  const t2 = normalizeTitle(h2.title);

  const exactNormalized = t1.length > 3 && t2.length > 3 && t1 === t2;
  const highSimilarity = stringSimilarity(h1.title, h2.title) > 0.65;

  if (!exactNormalized && !highSimilarity) {
    return false;
  }

  // Check date alignment if available
  if (h1.startDate && h2.startDate) {
    const diff = Math.abs(
      new Date(h1.startDate).getTime() - new Date(h2.startDate).getTime()
    );
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (diff > threeDaysMs) return false;
  }

  // Check organizers if distinct
  if (h1.organizer && h2.organizer) {
    const orgSim = stringSimilarity(h1.organizer, h2.organizer);
    if (orgSim < 0.2 && !exactNormalized) {
      return false;
    }
  }

  return true;
}

/**
 * Merges two duplicate hackathons, picking the richer fields and combining sources.
 */
export function mergeHackathons(primary: Hackathon, secondary: Hackathon): Hackathon {
  const sources: SourceLink[] = [];

  const addSource = (s: SourceLink) => {
    if (!sources.some((x) => x.url === s.url)) {
      sources.push(s);
    }
  };

  addSource({ name: primary.source, url: primary.url });
  (primary.sources || []).forEach(addSource);

  addSource({ name: secondary.source, url: secondary.url });
  (secondary.sources || []).forEach(addSource);

  // Combine unique themes
  const combinedThemes = Array.from(
    new Set([...primary.themes, ...secondary.themes])
  );

  // Prefer known fee over unknown
  let bestFee = primary.fee;
  if (bestFee.type === "unknown" && secondary.fee.type !== "unknown") {
    bestFee = secondary.fee;
  }

  // Prefer earlier registration deadline if both exist
  let bestDeadline = primary.registrationDeadline;
  if (!bestDeadline) {
    bestDeadline = secondary.registrationDeadline;
  } else if (secondary.registrationDeadline) {
    const d1 = new Date(bestDeadline).getTime();
    const d2 = new Date(secondary.registrationDeadline).getTime();
    if (d2 < d1) bestDeadline = secondary.registrationDeadline;
  }

  return {
    ...primary,
    registrationDeadline: bestDeadline,
    startDate: primary.startDate || secondary.startDate,
    endDate: primary.endDate || secondary.endDate,
    prize: primary.prize || secondary.prize,
    themes: combinedThemes,
    eligibility: primary.eligibility || secondary.eligibility,
    teamSize: primary.teamSize || secondary.teamSize,
    imageUrl: primary.imageUrl || secondary.imageUrl,
    city: primary.city || secondary.city,
    state: primary.state || secondary.state,
    fee: bestFee,
    sources,
    deadlineUnknown: !bestDeadline,
  };
}

/**
 * Deduplicates an array of hackathons, preserving order of first appearance.
 */
export function deduplicateHackathons(hackathons: Hackathon[]): Hackathon[] {
  const result: Hackathon[] = [];

  for (const item of hackathons) {
    const existingIndex = result.findIndex((r) => areDuplicates(r, item));
    if (existingIndex >= 0) {
      result[existingIndex] = mergeHackathons(result[existingIndex], item);
    } else {
      result.push({
        ...item,
        sources: item.sources || [{ name: item.source, url: item.url }],
      });
    }
  }

  return result;
}
