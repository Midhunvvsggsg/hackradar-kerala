# HackRadar Kerala - Data Sources & Compliance

This document records the evaluation of hackathon discovery sources, compliance with terms, rate limits, caching, and adapter architecture.

## Evaluated Sources

| Source | Access Route | Mode / Relevance | Health Status | Policy / Terms Notes |
| :--- | :--- | :--- | :--- | :--- |
| **manual.yaml** | Local file / Git PRs | Kerala colleges, IEEE, TinkerHub, KSUM | Healthy (`ok`) | Community-curated via peer-reviewed GitHub Pull Requests. Strict Zod schema validation. |
| **Devfolio** | Public JSON API (`/api/hackathons`) | Kerala & Pan-India | Healthy (`ok`) | Official public feed for community hackathons. Rate-limited (1 request / run), clear custom User-Agent. |
| **Devpost** | Public JSON API (`/api/hackathons`) | Online & Global | Healthy (`ok`) | Filtered to online challenges open to Indian developers. Rate-limited with custom User-Agent. |
| **Unstop** | Public JSON API (`/api/public/opportunity`) | Pan-India & Kerala | Healthy (`ok`) | Public opportunity listing endpoint. Minimal pagination, respectful rate limits. |
| **Kerala Startup Mission (KSUM)** | Evaluated via manual.yaml & community feeds | Kerala | Healthy (`manual`) | Curated through official KSUM and TinkerHub community event notices into `manual.yaml`. |
| **MLH (Major League Hacking)** | Evaluated | Global | Skipped | Most member hackathons are NA/EU focused; relevant Indian MLH events cross-post on Devfolio. |
| **HackerEarth** | Evaluated | Corporate challenges | Skipped | Closed enterprise recruitment challenges rather than open student/community hackathons. |

## Compliance & Scraping Rules

1. **Static-First & Scheduled Collection**:
   - Scraping only runs on a scheduled CI job (every 6 hours) or locally on explicit `--live` invocation.
   - Websites and terminal clients consume the published `data/hackathons.json` with client-side 1-hour cache TTL, putting zero ongoing load on source endpoints.

2. **User-Agent & Identification**:
   - All network requests identify with:
     `User-Agent: HackRadar-Kerala/1.0 (+https://github.com/hackradar-kerala)`

3. **Resilience & Fault Isolation**:
   - Every adapter executes in a separate error boundary with an 8-second abort controller.
   - If a third-party source is slow or encounters HTTP 5xx/429 errors, the adapter logs the error in the dataset's `sources` health status array without failing the collector run.
