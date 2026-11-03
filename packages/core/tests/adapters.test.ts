import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import { ManualAdapter } from "../src/adapters/manual.js";
import { DevfolioAdapter } from "../src/adapters/devfolio.js";
import { DevpostAdapter } from "../src/adapters/devpost.js";
import { UnstopAdapter } from "../src/adapters/unstop.js";
import { collectHackathons } from "../src/collector.js";
import { SourceAdapter } from "../src/adapters/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Source Adapters & Normalizers", () => {
  it("normalizes manual.yaml correctly", async () => {
    const adapter = new ManualAdapter();
    const raw = await adapter.fetch();
    const events = adapter.normalize(raw);

    expect(events.length).toBeGreaterThan(0);
    const kochiEvent = events.find((e) => e.title.includes("TinkerHack"));
    expect(kochiEvent).toBeDefined();
    expect(kochiEvent?.city).toBe("Kochi");
    expect(kochiEvent?.fee.type).toBe("free");

    // All manual events must have valid, well-formed URLs
    for (const ev of events) {
      expect(ev.url).toMatch(/^https?:\/\//);
      expect(() => new URL(ev.url)).not.toThrow();
    }
  });

  it("normalizes devfolio fixture response and filters closed/ended events", () => {
    const fixturePath = path.join(__dirname, "fixtures/devfolio.json");
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const adapter = new DevfolioAdapter();
    const events = adapter.normalize(raw);

    expect(events.length).toBe(2);
    const kochi = events.find((e) => e.title === "Kochi Buildathon");
    expect(kochi).toBeDefined();
    expect(kochi?.isNearby).toBe(false);
    expect(kochi?.city).toBe("Kochi");

    const blr = events.find((e) => e.title === "Bengaluru DevJam");
    expect(blr).toBeDefined();
    expect(blr?.isNearby).toBe(true);

    // Test that closed/past hackathons are filtered out
    const pastFixture = {
      result: [
        {
          uuid: "past-1",
          name: "Old Hackathon",
          slug: "old-hack",
          starts_at: "2024-01-01T00:00:00.000Z",
          ends_at: "2024-01-02T00:00:00.000Z",
          city: "Kochi",
          state: "Kerala",
          hackathon_setting: {
            reg_ends_at: "2023-12-31T00:00:00.000Z",
          },
        },
      ],
    };
    const pastEvents = adapter.normalize(pastFixture);
    expect(pastEvents.length).toBe(0);
  });

  it("normalizes devpost fixture response", () => {
    const fixturePath = path.join(__dirname, "fixtures/devpost.json");
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const adapter = new DevpostAdapter();
    const events = adapter.normalize(raw);

    expect(events.length).toBe(1);
    expect(events[0].title).toBe("Global AI Challenge 2026");
    expect(events[0].mode).toBe("online");
    expect(events[0].fee.type).toBe("free");
  });

  it("normalizes unstop fixture response", () => {
    const fixturePath = path.join(__dirname, "fixtures/unstop.json");
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const adapter = new UnstopAdapter();
    const events = adapter.normalize(raw);

    expect(events.length).toBe(1);
    expect(events[0].title).toBe("National Code Sprint");
    expect(events[0].mode).toBe("online");
    expect(events[0].prize).toBe("₹50,000");
  });

  it("collector never crashes when an adapter fails and logs health error", async () => {
    const workingAdapter: SourceAdapter = {
      id: "mock-working",
      name: "Mock Working Adapter",
      fetch: async () => [{ title: "Working Hack", url: "https://example.com" }],
      normalize: () => [
        {
          id: "mock-1",
          title: "Working Hack",
          source: "mock-working",
          url: "https://example.com/mock-1",
          organizer: "Test Org",
          mode: "online",
          city: "Kochi",
          state: "Kerala",
          country: "India",
          registrationDeadline: "2026-11-20T18:00:00+05:30",
          fee: { type: "free" },
          themes: [],
          lastSeenAt: new Date().toISOString(),
          isNearby: false,
          deadlineUnknown: false,
        },
      ],
    };

    const failingAdapter: SourceAdapter = {
      id: "mock-failing",
      name: "Mock Failing Adapter",
      fetch: async () => {
        throw new Error("Simulated network timeout 504");
      },
      normalize: () => [],
    };

    const tempOut = path.join(__dirname, "test-output.json");
    const dataset = await collectHackathons({
      adapters: [workingAdapter, failingAdapter],
      outputPath: tempOut,
      quiet: true,
    });

    expect(dataset.events.length).toBe(1);
    expect(dataset.events[0].title).toBe("Working Hack");

    const failedHealth = dataset.sources.find((s) => s.id === "mock-failing");
    expect(failedHealth).toBeDefined();
    expect(failedHealth?.status).toBe("error");
    expect(failedHealth?.error).toContain("Simulated network timeout");

    if (fs.existsSync(tempOut)) {
      fs.unlinkSync(tempOut);
    }
  });
});
