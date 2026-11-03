import { describe, it, expect } from "vitest";
import { generateICS } from "../src/ics.js";
import { Hackathon } from "../src/schema.js";

describe("ICS Calendar Generation", () => {
  const sampleHackathon: Hackathon = {
    id: "hack-kerala-2026",
    title: "Kerala FOSS Hack",
    source: "manual",
    url: "https://example.com/foss-hack",
    organizer: "FOSS United Kerala",
    mode: "hybrid",
    city: "Kochi",
    state: "Kerala",
    country: "India",
    registrationDeadline: "2026-11-10T18:00:00+05:30",
    startDate: "2026-11-15T09:00:00+05:30",
    endDate: "2026-11-16T18:00:00+05:30",
    fee: { type: "free" },
    themes: ["FOSS", "Linux"],
    lastSeenAt: "2026-11-02T00:00:00Z",
    isNearby: false,
    deadlineUnknown: false,
  };

  it("produces valid RFC 5545 calendar with deadline and event VEVENTs", () => {
    const ics = generateICS(sampleHackathon);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//HackRadar Kerala");
    expect(ics).toContain("SUMMARY:[DEADLINE] Kerala FOSS Hack Registration Closes");
    expect(ics).toContain("SUMMARY:Kerala FOSS Hack");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-P1D"); // 1 day reminder
    expect(ics).toContain("END:VCALENDAR");
  });
});
