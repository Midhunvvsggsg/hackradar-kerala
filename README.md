# 📡 HackRadar Kerala

> **A static-first radar for open hackathons in Kerala, India.** Available as both a fast terminal CLI and a website.
> **Live Website**: [https://hackradar-kerala.vercel.app](https://hackradar-kerala.vercel.app)

[![CI Pipeline](https://github.com/Midhunvvsggsg/hackradar-kerala/actions/workflows/scrape-and-deploy.yml/badge.svg)](https://github.com/Midhunvvsggsg/hackradar-kerala/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![CLI: hackradar](https://img.shields.io/badge/npm-hackradar-teal.svg)](https://www.npmjs.com/package/hackradar)
[![Live on Vercel](https://img.shields.io/badge/Deployment-Live%20on%20Vercel-success.svg)](https://hackradar-kerala.vercel.app)

```
   ◉ HACKRADAR KERALA ))) — Active Hackathon Radar
     Focus: Kerala Offline/Hybrid ◆ Online Pan-India ◆ Nearby Tech Hubs
     [Data source: local cache (fresh)]

 ┌────┬────────────────────────────┬────────────────┬────────────┬────────────────┐
 │ #  │ Event                      │ Mode/City      │ Fee        │ Deadline       │
 ├────┼────────────────────────────┼────────────────┼────────────┼────────────────┤
 │ 1  │ Trivandrum Cloud Sprint    │ OFFLINE        │ FREE       │ ⚡ Closes in 2d│
 │ 2  │ Hack@Arch 2026             │ OFFLINE        │ PAID ₹199  │ Closes in 3d   │
 │ 3  │ FOSS Hack Kerala 2026      │ HYBRID         │ FREE       │ Closes in 7d   │
 │ 4  │ TinkerHack 2026            │ HYBRID         │ FREE       │ Closes in 10d  │
 │ 5  │ BeachHack Season 6         │ OFFLINE        │ PAID ₹350  │ Closes in 13d  │
 │ 6  │ Make-a-Ton 7.0             │ OFFLINE        │ FREE       │ Closes in 15d  │
 └────┴────────────────────────────┴────────────────┴────────────┴────────────────┘
```

---

## 🌟 Why HackRadar Kerala?

1. **Non-Negotiable Freshness**: NEVER shows a hackathon whose registration has closed or whose deadline has passed against current **Asia/Kolkata (IST)** time.
2. **Transparent Fee Badges**: Every listing clearly displays `FREE` (in bright green) or `PAID ₹X` (in amber).
3. **Geo-Priority for Kerala**:
   - **Tier 1**: Offline & hybrid events physically in Kerala (*Kochi, Thiruvananthapuram, Kozhikode, Thrissur, Palakkad, etc.*).
   - **Tier 2**: Online events open to Indian developers.
   - **Tier 3**: Nearby tech hubs (*Bengaluru, Coimbatore, Chennai, Mangaluru*) via `--nearby` toggle.
4. **Offline-Capable Terminal Tool**: Instant local cache (1-hour TTL) with live fallback.
5. **Static-First Web Architecture**: Zero-JS server baseline that works without JavaScript, hydrating live second-by-second countdowns, URL query synchronization, and one-click calendar exports.

---

## 🚀 Quick Start: Terminal CLI

Run immediately without installing via `npx`:

```bash
npx hackradar
```

Or install globally:

```bash
npm install -g hackradar
```

### CLI Commands & Flags

```bash
# View all open hackathons sorted by closing soonest
hackradar

# Show only free hackathons
hackradar --free

# Show only paid hackathons
hackradar --paid

# Filter by city
hackradar --city kochi

# Include nearby tech hubs (Bengaluru, Coimbatore, Chennai, Mangaluru)
hackradar --nearby

# Filter by technology or theme
hackradar --theme AI

# Show hackathons closing within 5 days
hackradar --closing 5

# Open event website directly in default browser
hackradar open 1

# Export calendar .ics file with registration reminder and event dates
hackradar ics 1

# Output clean JSON for scripts / piping
hackradar --json
```

---

## 🌐 Quick Start: Website

The web client (`apps/web`) is built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com), exporting fully static HTML deployable on GitHub Pages or Vercel.

```bash
# Start local development server
pnpm web
# Serves at http://localhost:4321
```

### Web Features
- **Radar Hero Animation**: Backwater teal, coconut green, and kasavu gold theme with rotating radar sweep (respects `prefers-reduced-motion`).
- **Live Countdowns**: Second-by-second countdown timers to registration deadlines.
- **URL Query Sync**: Every filter is stored in the URL (`?fee=free&mode=offline&city=kochi`) so custom views are shareable.
- **One-Click Calendar Export**: Generates and downloads standard `.ics` calendar files directly in the browser.
- **Zero-JS Fallback**: Statically prerendered so all hackathons are readable even with JavaScript disabled.
- **Open RSS & REST Endpoints**:
  - `/feed.xml`: Standard RSS 2.0 feed for feed readers.
  - `/api/hackathons.json`: Public REST API endpoint with CORS headers.

---

## 🏗️ Architecture & Monorepo Layout

```
hackradar-kerala/
├── .github/workflows/
│   └── scrape-and-deploy.yml    # Runs every 6h: scrapes, dedupes, commits, and deploys
├── packages/
│   ├── core/                    # Core engine: Zod schema, IST calculations, dedupe
│   │   ├── src/adapters/        # Devfolio, Devpost, Unstop, manual.yaml
│   │   └── tests/               # Vitest suites (timezone edge cases, fees, dedupe)
│   └── cli/                     # 'hackradar' executable terminal CLI
├── apps/
│   └── web/                     # Astro static website + Tailwind CSS
├── data/
│   ├── hackathons.json          # Published dataset with per-source health status
│   └── manual.yaml              # Curated community events submitted via PR
├── SOURCES.md                   # Scraping policies and platform compliance notes
├── CONTRIBUTING.md              # Guide for adding new sources and local events
└── LICENSE                      # MIT License
```

---

## ✏️ Adding Your College or Community Event

Have a hackathon in your college or tech community? Submit it directly via GitHub Pull Request:

1. Open [`data/manual.yaml`](data/manual.yaml).
2. Add your event under `hackathons`:
   ```yaml
   - id: manual-my-college-hack
     title: BeachHack 2026
     url: https://mycollege.ac.in
     organizer: College Tech Club
     mode: offline # offline | hybrid | online
     city: Thrissur
     state: Kerala
     registrationDeadline: "2026-11-20T23:59:59+05:30"
     fee:
       type: free
     themes: ["AI", "IoT"]
   ```
3. Submit a PR. The 6-hourly automated workflow compiles and deploys your event to both the CLI and web app!

---

## 🧪 Testing & Verification

```bash
# Run all unit and integration test suites
pnpm test

# Run scrapers and verify dataset output
pnpm collect

# Build all packages and website static distribution
pnpm build
```

---

## ⚖️ Legal & Data Disclaimer

HackRadar Kerala only accesses public information feeds, official APIs, and community-curated submissions. All network requests rate-limit appropriately and identify with `User-Agent: HackRadar-Kerala/1.0`. All event trademarks and logos belong to their respective organizers. See [SOURCES.md](SOURCES.md) for detailed platform terms and compliance documentation.

## 📄 License

Distributed under the [MIT License](LICENSE).
