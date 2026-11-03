import { Hackathon } from "./schema.js";

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generates an RFC 5545 standard .ics calendar string for a hackathon.
 */
export function generateICS(hackathon: Hackathon): string {
  const now = new Date();
  const dtstamp = formatICSDate(now);
  const events: string[] = [];

  const location = hackathon.mode === "online"
    ? "Online"
    : [hackathon.city, hackathon.state, hackathon.country].filter(Boolean).join(", ");

  // 1. Deadline Event (if present)
  if (hackathon.registrationDeadline) {
    const deadline = new Date(hackathon.registrationDeadline);
    const startStr = formatICSDate(deadline);
    // 1-hour window for the deadline marker
    const end = new Date(deadline.getTime() + 60 * 60 * 1000);
    const endStr = formatICSDate(end);

    events.push([
      "BEGIN:VEVENT",
      `UID:deadline-${hackathon.id}@hackradar.kerala`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:[DEADLINE] ${hackathon.title} Registration Closes`,
      `DESCRIPTION:Registration deadline for ${hackathon.title}\\n\\nOrganizer: ${hackathon.organizer}\\nFee: ${hackathon.fee.type.toUpperCase()}${hackathon.fee.amountINR ? ` (₹${hackathon.fee.amountINR})` : ""}\\nDetails: ${hackathon.url}`,
      `LOCATION:${location}`,
      `URL:${hackathon.url}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:Registration closes tomorrow for ${hackathon.title}`,
      "TRIGGER:-P1D",
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n"));
  }

  // 2. Hackathon Event Run Dates
  if (hackathon.startDate) {
    const start = new Date(hackathon.startDate);
    const end = hackathon.endDate
      ? new Date(hackathon.endDate)
      : new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const startStr = formatICSDate(start);
    const endStr = formatICSDate(end);

    events.push([
      "BEGIN:VEVENT",
      `UID:event-${hackathon.id}@hackradar.kerala`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${hackathon.title}`,
      `DESCRIPTION:${hackathon.title} by ${hackathon.organizer}\\nMode: ${hackathon.mode.toUpperCase()}\\nDetails: ${hackathon.url}`,
      `LOCATION:${location}`,
      `URL:${hackathon.url}`,
      "END:VEVENT",
    ].join("\r\n"));
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HackRadar Kerala//NONSGML Hackathon Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:HackRadar Kerala",
    "X-WR-TIMEZONE:Asia/Kolkata",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
