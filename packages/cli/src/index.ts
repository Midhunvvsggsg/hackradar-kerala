import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import openBrowser from "open";
import pc from "picocolors";
import {
  filterHackathons,
  sortHackathonsByClosingSoonest,
  generateICS,
  nowInKolkata,
  FilterOptions,
  Hackathon,
} from "@hackradar/core";
import { loadDataset } from "./cache.js";
import { renderBanner, renderHackathonsTable } from "./render.js";

const program = new Command();

program
  .name("hackradar")
  .description("Track open hackathons relevant to Kerala, India")
  .version("1.0.0")
  .option("--free", "Show only free hackathons")
  .option("--paid", "Show only paid hackathons")
  .option("--online", "Show only online hackathons")
  .option("--offline", "Show only offline hackathons")
  .option("--city <name>", "Filter by city name (e.g. Kochi, Trivandrum)")
  .option("--nearby", "Include nearby tech hubs (Bengaluru, Coimbatore, Chennai, Mangaluru)")
  .option("--theme <tag>", "Filter by theme/technology tag")
  .option("--closing <days>", "Show hackathons closing within specified days", (v) => parseInt(v, 10))
  .option("--live", "Bypass cache and run scrapers live")
  .option("--json", "Output results in JSON format")
  .action(async (options) => {
    try {
      const { dataset, source } = await loadDataset(Boolean(options.live));
      const now = nowInKolkata();

      let fee: "all" | "free" | "paid" = "all";
      if (options.free) fee = "free";
      else if (options.paid) fee = "paid";

      let mode: "all" | "online" | "offline" | "hybrid" = "all";
      if (options.online) mode = "online";
      else if (options.offline) mode = "offline";

      const filterOpts: FilterOptions = {
        fee,
        mode,
        city: options.city,
        nearby: Boolean(options.nearby),
        theme: options.theme,
        closingDays: options.closing,
      };

      // Strict runtime IST filtering
      const filtered = filterHackathons(dataset.events, filterOpts, now);
      const sorted = sortHackathonsByClosingSoonest(filtered);

      if (options.json) {
        console.log(JSON.stringify(sorted, null, 2));
        return;
      }

      renderBanner(source);
      renderHackathonsTable(sorted, now);
    } catch (err) {
      console.error(pc.red("Error running hackradar:"), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("open <number>")
  .description("Open the event website in your default browser")
  .action(async (numStr: string) => {
    try {
      const idx = parseInt(numStr, 10) - 1;
      const { dataset } = await loadDataset(false);
      const now = nowInKolkata();
      const openEvents = sortHackathonsByClosingSoonest(
        filterHackathons(dataset.events, { nearby: true }, now)
      );

      if (isNaN(idx) || idx < 0 || idx >= openEvents.length) {
        console.error(pc.red(`Invalid index "${numStr}". Available range: 1 to ${openEvents.length}`));
        process.exit(1);
      }

      const target = openEvents[idx];
      console.log(`Opening ${pc.bold(target.title)} (${pc.cyan(target.url)})...`);
      await openBrowser(target.url);
    } catch (err) {
      console.error(pc.red("Failed to open event:"), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("ics <number>")
  .description("Export an iCalendar (.ics) file with registration deadline and event schedule")
  .option("-o, --output <path>", "Custom output file path")
  .action(async (numStr: string, cmdOpts) => {
    try {
      const idx = parseInt(numStr, 10) - 1;
      const { dataset } = await loadDataset(false);
      const now = nowInKolkata();
      const openEvents = sortHackathonsByClosingSoonest(
        filterHackathons(dataset.events, { nearby: true }, now)
      );

      if (isNaN(idx) || idx < 0 || idx >= openEvents.length) {
        console.error(pc.red(`Invalid index "${numStr}". Available range: 1 to ${openEvents.length}`));
        process.exit(1);
      }

      const target = openEvents[idx];
      const icsData = generateICS(target);
      const safeSlug = target.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const fileName = cmdOpts.output || `${safeSlug}.ics`;
      const fullPath = path.resolve(process.cwd(), fileName);

      fs.writeFileSync(fullPath, icsData, "utf-8");
      console.log(pc.green(`✓ Exported calendar file to: ${pc.bold(fullPath)}`));
      console.log(pc.dim("Import this file into Google Calendar, Apple Calendar, or Outlook."));
    } catch (err) {
      console.error(pc.red("Failed to export .ics:"), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

export function runCLI(): void {
  program.parse(process.argv);
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI();
}
