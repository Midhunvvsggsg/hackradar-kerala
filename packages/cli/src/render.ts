import pc from "picocolors";
import Table from "cli-table3";
import { Hackathon, getDeadlineInfo, formatKolkataDate } from "@hackradar/core";

export function renderBanner(sourceInfo?: string): void {
  const radarIcon = pc.green("◉");
  const wave1 = pc.dim(")))");
  const kasavu = pc.yellow("◆");

  console.log("");
  console.log(
    ` ${radarIcon} ${pc.bold(pc.cyan("HACKRADAR"))} ${pc.green("KERALA")} ${wave1} ${pc.dim("— Active Hackathon Radar")}`
  );
  console.log(
    `   ${pc.dim("Focus:")} Kerala Offline/Hybrid ${kasavu} Online Pan-India ${kasavu} Nearby Tech Hubs`
  );
  if (sourceInfo) {
    console.log(`   ${pc.dim(`[Data source: ${sourceInfo}]`)}`);
  }
  console.log("");
}

export function formatFeeBadge(fee: Hackathon["fee"]): string {
  if (fee.type === "free") {
    return pc.bold(pc.green("FREE"));
  }
  if (fee.type === "paid") {
    return fee.amountINR
      ? pc.bold(pc.yellow(`PAID ₹${fee.amountINR}`))
      : pc.bold(pc.yellow("PAID"));
  }
  return pc.dim("Fee unknown");
}

export function formatDeadlineBadge(hackathon: Hackathon, now: Date): string {
  const info = getDeadlineInfo(hackathon, now);

  if (info.isUnknown) {
    return pc.magenta("Deadline unknown");
  }

  if (!info.isOpen) {
    return pc.dim("Closed");
  }

  if (info.isUrgent) {
    return pc.bold(pc.red(`⚡ ${info.badgeText}`));
  }

  return pc.cyan(info.badgeText);
}

export function formatModeBadge(hackathon: Hackathon): string {
  let modeStr = "";
  if (hackathon.mode === "offline") {
    modeStr = pc.magenta("OFFLINE");
  } else if (hackathon.mode === "hybrid") {
    modeStr = pc.blue("HYBRID");
  } else {
    modeStr = pc.dim("ONLINE");
  }

  const city = hackathon.city || (hackathon.mode === "online" ? "Virtual" : "Kerala");
  const nearbyTag = hackathon.isNearby ? pc.dim(" [Nearby]") : "";

  return `${modeStr}\n${pc.bold(city)}${nearbyTag}`;
}

export function renderHackathonsTable(
  hackathons: Hackathon[],
  now: Date = new Date()
): void {
  if (hackathons.length === 0) {
    console.log(
      ` ${pc.yellow("Radar is quiet.")} No hackathons matching your criteria are currently open.`
    );
    console.log(
      ` ${pc.dim("Check back soon or submit local events via data/manual.yaml via pull request.")}\n`
    );
    return;
  }

  const termWidth = process.stdout.columns || 100;
  const isNarrow = termWidth < 85;

  const table = new Table({
    head: isNarrow
      ? [
          pc.bold("#"),
          pc.bold("Event"),
          pc.bold("Mode/City"),
          pc.bold("Fee"),
          pc.bold("Deadline"),
        ]
      : [
          pc.bold("#"),
          pc.bold("Event & Organizer"),
          pc.bold("Mode & City"),
          pc.bold("Fee"),
          pc.bold("Closing Status"),
          pc.bold("Prize"),
        ],
    wordWrap: true,
    colWidths: isNarrow
      ? [4, Math.max(22, Math.floor(termWidth * 0.35)), 16, 12, 16]
      : [4, 30, 18, 14, 20, 16],
    style: {
      head: [],
      border: ["dim"],
    },
  });

  hackathons.forEach((h, idx) => {
    const num = pc.dim(String(idx + 1));
    const title = pc.bold(h.title);
    const org = pc.dim(h.organizer);
    const eventCol = `${title}\n${org}`;

    const modeCol = formatModeBadge(h);
    const feeCol = formatFeeBadge(h.fee);
    const deadlineCol = formatDeadlineBadge(h, now);
    const prizeCol = h.prize ? pc.green(h.prize) : pc.dim("—");

    if (isNarrow) {
      table.push([num, eventCol, modeCol, feeCol, deadlineCol]);
    } else {
      table.push([num, eventCol, modeCol, feeCol, deadlineCol, prizeCol]);
    }
  });

  console.log(table.toString());

  console.log("");
  console.log(
    ` ${pc.dim("Tip:")} Run ${pc.cyan("hackradar open <#>")}` +
      ` to view in browser, or ${pc.cyan("hackradar ics <#>")}` +
      ` to export .ics calendar file.`
  );
  console.log("");
}
