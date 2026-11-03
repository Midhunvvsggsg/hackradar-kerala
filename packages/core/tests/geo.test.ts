import { describe, it, expect } from "vitest";
import {
  isKerala,
  isNearby,
  normalizeKeralaCity,
  normalizeNearbyCity,
  getGeoPriority,
} from "../src/geo.js";

describe("Kerala & Nearby Geo Detection", () => {
  it("normalizes Kerala cities and variations", () => {
    expect(normalizeKeralaCity("cochin")).toBe("Kochi");
    expect(normalizeKeralaCity("ernakulam")).toBe("Kochi");
    expect(normalizeKeralaCity("trivandrum")).toBe("Thiruvananthapuram");
    expect(normalizeKeralaCity("calicut")).toBe("Kozhikode");
    expect(normalizeKeralaCity("trichur")).toBe("Thrissur");
    expect(normalizeKeralaCity("palghat")).toBe("Palakkad");
    expect(normalizeKeralaCity("alleppey")).toBe("Alappuzha");
  });

  it("normalizes nearby cities", () => {
    expect(normalizeNearbyCity("bangalore")).toBe("Bengaluru");
    expect(normalizeNearbyCity("coimbatore")).toBe("Coimbatore");
    expect(normalizeNearbyCity("madras")).toBe("Chennai");
    expect(normalizeNearbyCity("mangalore")).toBe("Mangaluru");
  });

  it("identifies Kerala locations from text or state", () => {
    expect(isKerala(undefined, "Kerala")).toBe(true);
    expect(isKerala("Kochi", undefined)).toBe(true);
    expect(isKerala(undefined, undefined, "Organized at CUSAT, Kalamassery")).toBe(true);
    expect(isKerala("Mumbai", "Maharashtra")).toBe(false);
  });

  it("identifies nearby locations", () => {
    expect(isNearby("Bengaluru")).toBe(true);
    expect(isNearby("Coimbatore")).toBe(true);
    expect(isNearby("Kochi")).toBe(false);
    expect(isNearby("Delhi")).toBe(false);
  });

  it("assigns correct geo-priority", () => {
    // 1. Offline in Kerala -> priority 1
    expect(
      getGeoPriority({ mode: "offline", city: "Kochi", state: "Kerala" })
    ).toBe(1);

    // 2. Online event -> priority 2
    expect(
      getGeoPriority({ mode: "online" })
    ).toBe(2);

    // 3. Offline in Nearby -> priority 3
    expect(
      getGeoPriority({ mode: "offline", city: "Bengaluru", isNearby: true })
    ).toBe(3);
  });
});
