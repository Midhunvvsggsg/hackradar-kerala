import { describe, it, expect } from "vitest";
import {
  deduplicateHackathons,
  areDuplicates,
  normalizeTitle,
} from "../src/dedupe.js";
import { Hackathon } from "../src/schema.js";

describe("Cross-Source Deduplication", () => {
  it("normalizes titles properly", () => {
    expect(normalizeTitle("Make-a-Ton 2026 Hackathon")).toBe("makeaton");
    expect(normalizeTitle("TinkerHack 2025 Edition")).toBe("tinkerhack");
  });

  const eventDevfolio: Hackathon = {
    id: "devfolio-1",
    title: "Make-a-Ton 2026",
    source: "devfolio",
    url: "https://makeaton2026.devfolio.co",
    organizer: "CUSAT Kochi",
    mode: "offline",
    city: "Kochi",
    state: "Kerala",
    country: "India",
    registrationDeadline: "2026-11-10T18:00:00+05:30",
    startDate: "2026-11-20T09:00:00+05:30",
    endDate: "2026-11-21T18:00:00+05:30",
    fee: { type: "unknown" },
    prize: "₹1,00,000",
    themes: ["Web", "AI"],
    lastSeenAt: "2026-11-02T00:00:00Z",
    isNearby: false,
    deadlineUnknown: false,
  };

  const eventManual: Hackathon = {
    id: "manual-1",
    title: "Make a Ton 2026 Hackathon",
    source: "manual",
    url: "https://cusat.ac.in/makeaton",
    organizer: "CUSAT",
    mode: "offline",
    city: "Kochi",
    state: "Kerala",
    country: "India",
    registrationDeadline: "2026-11-09T23:59:59+05:30", // earlier deadline
    startDate: "2026-11-20T09:00:00+05:30",
    endDate: "2026-11-21T18:00:00+05:30",
    fee: { type: "free" }, // richer fee info
    themes: ["Open Source"],
    lastSeenAt: "2026-11-02T00:00:00Z",
    isNearby: false,
    deadlineUnknown: false,
  };

  const eventUnrelated: Hackathon = {
    id: "unrelated-1",
    title: "TinkerHack Kochi",
    source: "manual",
    url: "https://tinkerhub.org/tinkerhack",
    organizer: "TinkerHub",
    mode: "offline",
    city: "Kochi",
    state: "Kerala",
    country: "India",
    registrationDeadline: "2026-11-15T18:00:00+05:30",
    startDate: "2026-11-25T09:00:00+05:30",
    endDate: "2026-11-26T18:00:00+05:30",
    fee: { type: "free" },
    themes: ["Hardware"],
    lastSeenAt: "2026-11-02T00:00:00Z",
    isNearby: false,
    deadlineUnknown: false,
  };

  it("detects duplicates across different platforms", () => {
    expect(areDuplicates(eventDevfolio, eventManual)).toBe(true);
    expect(areDuplicates(eventDevfolio, eventUnrelated)).toBe(false);
  });

  it("merges duplicates retaining richest data and combining sources", () => {
    const deduped = deduplicateHackathons([eventDevfolio, eventManual, eventUnrelated]);

    expect(deduped.length).toBe(2);

    const merged = deduped.find((d) => d.id === "devfolio-1")!;
    expect(merged).toBeDefined();

    // Combined sources
    expect(merged.sources?.length).toBe(2);
    expect(merged.sources?.map((s) => s.name)).toContain("devfolio");
    expect(merged.sources?.map((s) => s.name)).toContain("manual");

    // Richer fee preferred
    expect(merged.fee.type).toBe("free");

    // Earlier registration deadline kept
    expect(merged.registrationDeadline).toBe("2026-11-09T23:59:59+05:30");

    // Combined themes
    expect(merged.themes).toContain("Web");
    expect(merged.themes).toContain("AI");
    expect(merged.themes).toContain("Open Source");
  });
});
