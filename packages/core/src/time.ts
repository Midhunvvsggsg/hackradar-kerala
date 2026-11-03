import { Hackathon } from "./schema.js";

export const KOLKATA_TIMEZONE = "Asia/Kolkata";
export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Returns current timestamp in UTC/Epoch.
 */
export function nowInKolkata(): Date {
  return new Date();
}

/**
 * Parses date inputs into an ISO string with timezone.
 * If the input is a date-only string (e.g. YYYY-MM-DD), attaches IST end-of-day (23:59:59+05:30)
 * or start-of-day depending on endOfDay flag.
 */
export function parseToKolkataISO(
  input: string | number | Date | null | undefined,
  endOfDay = true
): string | null {
  if (!input) return null;

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return input.toISOString();
  }

  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  const str = input.trim();
  if (!str) return null;

  // Check if date-only: YYYY-MM-DD
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (dateOnlyMatch) {
    const timePart = endOfDay ? "23:59:59.000" : "00:00:00.000";
    // Construct in IST: +05:30
    const istString = `${str}T${timePart}+05:30`;
    const parsed = new Date(istString);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Core product rule check:
 * A hackathon is open and upcoming if and only if:
 * 1. If endDate is specified: must be in the future (endDate >= now). If endDate has passed, event has ended!
 * 2. If registrationDeadline is specified: must be in the future (registrationDeadline >= now). If deadline has passed, registration is closed!
 * 3. If endDate is not specified, but startDate is: startDate must be in the future (startDate >= now).
 * 4. At least one valid date (registrationDeadline, endDate, or startDate) must exist and be in the future.
 */
export function isHackathonOpen(
  hackathon: {
    registrationDeadline?: string | null;
    endDate?: string | null;
    startDate?: string | null;
  },
  now: Date = new Date()
): boolean {
  const nowMs = now.getTime();

  // 1. If endDate is specified, event must NOT have ended
  if (hackathon.endDate) {
    const endMs = new Date(hackathon.endDate).getTime();
    if (isNaN(endMs) || endMs < nowMs) return false;
  }

  // 2. If registrationDeadline is specified, registration must NOT have closed
  if (hackathon.registrationDeadline) {
    const deadlineMs = new Date(hackathon.registrationDeadline).getTime();
    if (isNaN(deadlineMs) || deadlineMs < nowMs) return false;
  }

  // 3. If endDate is missing, check startDate
  if (!hackathon.endDate && hackathon.startDate) {
    const startMs = new Date(hackathon.startDate).getTime();
    if (isNaN(startMs) || startMs < nowMs) return false;
  }

  // 4. Must have at least one verifiable future date
  if (!hackathon.registrationDeadline && !hackathon.endDate && !hackathon.startDate) {
    return false;
  }

  return true;
}

/**
 * Explicit check if a hackathon is strictly upcoming and not ended.
 */
export function isHackathonUpcoming(
  hackathon: {
    registrationDeadline?: string | null;
    endDate?: string | null;
    startDate?: string | null;
  },
  now: Date = new Date()
): boolean {
  return isHackathonOpen(hackathon, now);
}

export interface DeadlineInfo {
  isOpen: boolean;
  isUnknown: boolean;
  isUrgent: boolean; // < 3 days left
  remainingMs: number | null;
  days: number | null;
  hours: number | null;
  minutes: number | null;
  seconds: number | null;
  badgeText: string;
}

/**
 * Calculates remaining time and badge status relative to current IST time.
 */
export function getDeadlineInfo(
  hackathon: Pick<Hackathon, "registrationDeadline" | "endDate" | "deadlineUnknown"> & {
    startDate?: string | null;
  },
  now: Date = new Date()
): DeadlineInfo {
  const nowMs = now.getTime();

  // If endDate is specified and has passed, event has ended!
  if (hackathon.endDate) {
    const endMs = new Date(hackathon.endDate).getTime();
    if (!isNaN(endMs) && endMs < nowMs) {
      return {
        isOpen: false,
        isUnknown: false,
        isUrgent: false,
        remainingMs: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        badgeText: "Closed",
      };
    }
  }

  if (!hackathon.registrationDeadline) {
    const isOpen = hackathon.endDate
      ? new Date(hackathon.endDate).getTime() >= nowMs
      : hackathon.startDate
      ? new Date(hackathon.startDate).getTime() >= nowMs
      : false;

    return {
      isOpen,
      isUnknown: true,
      isUrgent: false,
      remainingMs: null,
      days: null,
      hours: null,
      minutes: null,
      seconds: null,
      badgeText: isOpen ? "Deadline unknown" : "Closed",
    };
  }

  const deadlineMs = new Date(hackathon.registrationDeadline).getTime();
  if (isNaN(deadlineMs)) {
    return {
      isOpen: false,
      isUnknown: true,
      isUrgent: false,
      remainingMs: null,
      days: null,
      hours: null,
      minutes: null,
      seconds: null,
      badgeText: "Invalid date",
    };
  }

  const diffMs = deadlineMs - nowMs;
  if (diffMs <= 0) {
    return {
      isOpen: false,
      isUnknown: false,
      isUrgent: false,
      remainingMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      badgeText: "Closed",
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isUrgent = diffMs < THREE_DAYS_MS;

  let badgeText: string;
  if (days > 1) {
    badgeText = `Closes in ${days}d`;
  } else if (days === 1) {
    badgeText = `Closes in 1d ${hours}h`;
  } else if (hours > 0) {
    badgeText = `Closes in ${hours}h ${minutes}m`;
  } else {
    badgeText = `Closes in ${minutes}m`;
  }

  return {
    isOpen: true,
    isUnknown: false,
    isUrgent,
    remainingMs: diffMs,
    days,
    hours,
    minutes,
    seconds,
    badgeText,
  };
}

/**
 * Formats an ISO date into Asia/Kolkata localized string.
 */
export function formatKolkataDate(
  isoDate: string | null | undefined,
  includeTime = false
): string {
  if (!isoDate) return "Unknown";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "Invalid date";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: KOLKATA_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit", hour12: true }
      : {}),
  };

  return new Intl.DateTimeFormat("en-IN", options).format(d);
}
