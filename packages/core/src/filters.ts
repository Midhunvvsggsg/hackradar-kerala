import { Hackathon, FilterOptions } from "./schema.js";
import { isHackathonOpen, nowInKolkata } from "./time.js";
import { isKerala, isNearby, getGeoPriority } from "./geo.js";

/**
 * Strict filtering function applied at runtime by CLI and Web.
 */
export function filterHackathons(
  hackathons: Hackathon[],
  options: FilterOptions = {},
  now: Date = nowInKolkata()
): Hackathon[] {
  const {
    fee = "all",
    mode = "all",
    city,
    nearby = false,
    theme,
    closingDays,
    search,
  } = options;

  return hackathons.filter((h) => {
    // 1. NON-NEGOTIABLE: Is it open right now in IST?
    if (!isHackathonOpen(h, now)) {
      return false;
    }

    // 2. Kerala validation:
    // Must be from Kerala. If not from Kerala, it can only be included if nearby is explicitly enabled and event is a nearby hub.
    const inKerala = isKerala(h.city, h.state, `${h.title} ${h.organizer}`);
    if (!inKerala) {
      if (!nearby || !h.isNearby) {
        return false;
      }
    }

    // 3. Fee filter
    if (fee === "free") {
      if (h.fee.type !== "free") return false;
    } else if (fee === "paid") {
      if (h.fee.type !== "paid") return false;
    }

    // 4. Mode filter
    if (mode !== "all" && h.mode !== mode) {
      return false;
    }

    // 5. City filter
    if (city) {
      const targetCity = city.trim().toLowerCase();
      const eventCity = (h.city || "").toLowerCase();
      if (!eventCity.includes(targetCity)) {
        return false;
      }
    }

    // 6. Theme filter
    if (theme) {
      const targetTheme = theme.trim().toLowerCase();
      const hasTheme = h.themes.some((t) =>
        t.toLowerCase().includes(targetTheme)
      );
      if (!hasTheme) return false;
    }

    // 7. Closing soon filter (closing within N days)
    if (closingDays !== undefined && closingDays > 0) {
      if (!h.registrationDeadline) return false;
      const deadlineMs = new Date(h.registrationDeadline).getTime();
      const maxMs = now.getTime() + closingDays * 24 * 60 * 60 * 1000;
      if (deadlineMs > maxMs) return false;
    }

    // 8. Search query filter
    if (search) {
      const query = search.trim().toLowerCase();
      const matchTitle = h.title.toLowerCase().includes(query);
      const matchOrg = h.organizer.toLowerCase().includes(query);
      const matchCity = (h.city || "").toLowerCase().includes(query);
      const matchThemes = h.themes.some((t) => t.toLowerCase().includes(query));
      if (!matchTitle && !matchOrg && !matchCity && !matchThemes) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts hackathons by closing soonest.
 * Events with explicit deadlines are sorted ascending (closing earliest first).
 * Events with unknown deadlines are placed afterwards, sorted by startDate/title.
 */
export function sortHackathonsByClosingSoonest(
  hackathons: Hackathon[],
  preserveGeoPriority = false
): Hackathon[] {
  return [...hackathons].sort((a, b) => {
    if (preserveGeoPriority) {
      const prioA = getGeoPriority(a);
      const prioB = getGeoPriority(b);
      if (prioA !== prioB) return prioA - prioB;
    }

    // Both have deadlines
    if (a.registrationDeadline && b.registrationDeadline) {
      const timeA = new Date(a.registrationDeadline).getTime();
      const timeB = new Date(b.registrationDeadline).getTime();
      return timeA - timeB;
    }

    // One has deadline, the other does not
    if (a.registrationDeadline && !b.registrationDeadline) return -1;
    if (!a.registrationDeadline && b.registrationDeadline) return 1;

    // Both unknown deadlines: sort by startDate
    if (a.startDate && b.startDate) {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    }

    return a.title.localeCompare(b.title);
  });
}
