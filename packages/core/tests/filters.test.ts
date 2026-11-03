import { describe, it, expect } from "vitest";
import { filterHackathons, sortHackathonsByClosingSoonest } from "../src/filters.js";
import { Hackathon } from "../src/schema.js";

const mockNow = new Date("2026-11-02T10:00:00+05:30");

const sampleHackathons: Hackathon[] = [
  {
    id: "h-1",
    title: "Kochi AI Hackathon",
    source: "manual",
    url: "https://example.com/kochi-ai",
    organizer: "TinkerHub Kochi",
    mode: "offline",
    city: "Kochi",
    state: "Kerala",
    country: "India",
    registrationDeadline: "2026-11-04T18:00:00+05:30", // in ~2 days
    startDate: "2026-11-08T09:00:00+05:30",
    endDate: "2026-11-09T18:00:00+05:30",
    fee: { type: "free" },
    themes: ["AI", "Open Source"],
    lastSeenAt: "2026-11-02T00:00:00Z",
    isNearby: false,
    deadlineUnknown: false,
  },
  {
    id: "h-2",
    title: "Kerala Web3 Sprint",
    source: "devfolio",
    url: "https://example.com/web3-sprint",
    organizer: "Kerala Startup Mission",
    mode: "hybrid",
    city: "Thiruvananthapuram",
    state: "Kerala",
    country: "India",
    registrationDeadline: "2026-11-12T18:00:00+05:30", // in ~10 days
    startDate: "2026-11-15T09:00:00+05:30",
    endDate: "2026-11-16T18:00:00+05:30",
    fee: { type: "paid", amountINR: 250 },
    themes: ["Web3", "Blockchain"],
    lastSeenAt: "2026-11-02T00:00:00Z",
    isNearby: false,
    deadlineUnknown: false,
  },
  {
    id: "h-3",
    title: "Bengaluru Tech Jam",
    source: "devpost",
    url: "https://example.com/blr-tech",
    organizer: "Tech Community BLR",
    mode: "offline",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    registrationDeadline: "2026-11-06T18:00:00+05:30",
    startDate: "2026-11-10T09:00:00+05:30",
    endDate: "2026-11-11T18:00:00+05:30",
    fee: { type: "free" },
    themes: ["Cloud", "DevOps"],
    lastSeenAt: "2026-11-02T00:00:00Z",
    isNearby: true,
    deadlineUnknown: false,
  },
  {
    id: "h-4",
    title: "Closed Hackathon",
    source: "manual",
    url: "https://example.com/closed",
    organizer: "Past Org",
    mode: "online",
    city: undefined,
    state: undefined,
    country: "India",
    registrationDeadline: "2026-10-25T18:00:00+05:30", // expired
    startDate: "2026-11-01T09:00:00+05:30",
    endDate: "2026-11-02T08:00:00+05:30",
    fee: { type: "free" },
    themes: ["IoT"],
    lastSeenAt: "2026-11-02T00:00:00Z",
    isNearby: false,
    deadlineUnknown: false,
  },
];

describe("Filter Engine", () => {
  it("never returns closed hackathons", () => {
    const results = filterHackathons(sampleHackathons, { nearby: true }, mockNow);
    const ids = results.map((r) => r.id);
    expect(ids).not.toContain("h-4");
  });

  it("filters by fee (free vs paid)", () => {
    const freeOnly = filterHackathons(sampleHackathons, { fee: "free", nearby: true }, mockNow);
    expect(freeOnly.every((h) => h.fee.type === "free")).toBe(true);
    expect(freeOnly.map((h) => h.id)).toContain("h-1");
    expect(freeOnly.map((h) => h.id)).not.toContain("h-2");

    const paidOnly = filterHackathons(sampleHackathons, { fee: "paid", nearby: true }, mockNow);
    expect(paidOnly.every((h) => h.fee.type === "paid")).toBe(true);
    expect(paidOnly.map((h) => h.id)).toContain("h-2");
  });

  it("excludes nearby hackathons unless explicitly requested", () => {
    const defaultNearbyOff = filterHackathons(sampleHackathons, { nearby: false }, mockNow);
    expect(defaultNearbyOff.map((h) => h.id)).not.toContain("h-3");

    const nearbyEnabled = filterHackathons(sampleHackathons, { nearby: true }, mockNow);
    expect(nearbyEnabled.map((h) => h.id)).toContain("h-3");
  });

  it("filters by city substring", () => {
    const kochiOnly = filterHackathons(sampleHackathons, { city: "kochi" }, mockNow);
    expect(kochiOnly.length).toBe(1);
    expect(kochiOnly[0].id).toBe("h-1");
  });

  it("filters by theme", () => {
    const web3Only = filterHackathons(sampleHackathons, { theme: "web3", nearby: true }, mockNow);
    expect(web3Only.length).toBe(1);
    expect(web3Only[0].id).toBe("h-2");
  });

  it("filters by closingDays", () => {
    // Only h-1 closes within 3 days (on Nov 4)
    const closing3Days = filterHackathons(sampleHackathons, { closingDays: 3, nearby: true }, mockNow);
    expect(closing3Days.map((h) => h.id)).toEqual(["h-1"]);
  });

  it("sorts by closing soonest", () => {
    const open = filterHackathons(sampleHackathons, { nearby: true }, mockNow);
    const sorted = sortHackathonsByClosingSoonest(open);
    // Order should be: h-1 (Nov 4), h-3 (Nov 6), h-2 (Nov 12)
    expect(sorted.map((h) => h.id)).toEqual(["h-1", "h-3", "h-2"]);
  });
});
