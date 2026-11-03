import { describe, it, expect } from "vitest";
import {
  isHackathonOpen,
  getDeadlineInfo,
  parseToKolkataISO,
  formatKolkataDate,
} from "../src/time.js";

describe("Time & IST Deadline Rules", () => {
  const referenceNow = new Date("2026-11-02T12:00:00+05:30"); // 12 PM IST

  it("identifies event as open when registrationDeadline is in the future", () => {
    const event = {
      registrationDeadline: "2026-11-05T23:59:59+05:30",
      endDate: "2026-11-10T23:59:59+05:30",
    };
    expect(isHackathonOpen(event, referenceNow)).toBe(true);
  });

  it("strictly identifies event as closed when registrationDeadline has passed", () => {
    const event = {
      registrationDeadline: "2026-11-01T23:59:59+05:30", // yesterday
      endDate: "2026-11-10T23:59:59+05:30",
    };
    expect(isHackathonOpen(event, referenceNow)).toBe(false);
  });

  it("shows event as open when registrationDeadline is unknown but endDate is future", () => {
    const event = {
      registrationDeadline: null,
      endDate: "2026-11-15T23:59:59+05:30",
    };
    expect(isHackathonOpen(event, referenceNow)).toBe(true);

    const info = getDeadlineInfo(
      { ...event, deadlineUnknown: true },
      referenceNow
    );
    expect(info.isOpen).toBe(true);
    expect(info.isUnknown).toBe(true);
    expect(info.badgeText).toBe("Deadline unknown");
  });

  it("strictly drops event when registrationDeadline is unknown but endDate has passed", () => {
    const event = {
      registrationDeadline: null,
      endDate: "2026-10-30T23:59:59+05:30", // passed
    };
    expect(isHackathonOpen(event, referenceNow)).toBe(false);

    const info = getDeadlineInfo(
      { ...event, deadlineUnknown: true },
      referenceNow
    );
    expect(info.isOpen).toBe(false);
    expect(info.badgeText).toBe("Closed");
  });

  it("strictly drops event when registrationDeadline is in future but endDate has already passed", () => {
    const event = {
      registrationDeadline: "2026-11-10T23:59:59+05:30", // future deadline
      endDate: "2026-10-30T23:59:59+05:30", // already ended
    };
    expect(isHackathonOpen(event, referenceNow)).toBe(false);

    const info = getDeadlineInfo(
      { ...event, deadlineUnknown: false },
      referenceNow
    );
    expect(info.isOpen).toBe(false);
    expect(info.badgeText).toBe("Closed");
  });

  it("strictly drops event when endDate is missing and startDate has already passed", () => {
    const event = {
      registrationDeadline: null,
      startDate: "2026-10-20T09:00:00+05:30", // passed
      endDate: null,
    };
    expect(isHackathonOpen(event, referenceNow)).toBe(false);
  });

  it("strictly drops event when no dates are specified at all", () => {
    const event = {
      registrationDeadline: null,
      startDate: null,
      endDate: null,
    };
    expect(isHackathonOpen(event, referenceNow)).toBe(false);
  });

  it("marks urgency correctly when remaining deadline is under 3 days", () => {
    const urgentEvent = {
      registrationDeadline: "2026-11-04T12:00:00+05:30", // 2 days left
      endDate: "2026-11-10T23:59:59+05:30",
      deadlineUnknown: false,
    };
    const notUrgentEvent = {
      registrationDeadline: "2026-11-10T12:00:00+05:30", // 8 days left
      endDate: "2026-11-15T23:59:59+05:30",
      deadlineUnknown: false,
    };

    const urgentInfo = getDeadlineInfo(urgentEvent, referenceNow);
    const notUrgentInfo = getDeadlineInfo(notUrgentEvent, referenceNow);

    expect(urgentInfo.isUrgent).toBe(true);
    expect(urgentInfo.badgeText).toBe("Closes in 2d");

    expect(notUrgentInfo.isUrgent).toBe(false);
    expect(notUrgentInfo.badgeText).toBe("Closes in 8d");
  });

  it("handles date-only string and applies IST end-of-day offset", () => {
    const iso = parseToKolkataISO("2026-11-20");
    expect(iso).not.toBeNull();
    // 2026-11-20T23:59:59.000+05:30 in UTC is 18:29:59.000Z
    const d = new Date(iso!);
    const formatted = formatKolkataDate(iso, true);
    expect(formatted).toContain("20 Nov 2026");
    expect(formatted).toContain("11:59 pm");
  });
});
