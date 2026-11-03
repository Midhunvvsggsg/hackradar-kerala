# Contributing to HackRadar Kerala

Welcome! We are excited to collaborate with engineers, students, and community organizers across Kerala.

## Ways to Contribute

1. **Submit Local Hackathons**: Add your college, IEEE, GDG, or community hackathons via `data/manual.yaml`.
2. **Build New Source Adapters**: Add scrapers/API adapters for new platforms in `packages/core/src/adapters/`.
3. **Enhance the CLI or Web UI**: Improve accessibility, animations, filtering, or calendar exports.

---

## 1. Adding an Event via `data/manual.yaml`

Local college fests and community events often do not list on platforms like Devfolio. Anyone can add an event via GitHub Pull Request:

1. Fork the repo and open `data/manual.yaml`.
2. Add a new entry to the `hackathons` list following this schema:

```yaml
  - id: manual-my-college-hack-2026
    title: My College Hackathon 2026
    url: https://mycollege.ac.in/hackathon
    organizer: Model Engineering College / CUSAT / CET
    mode: offline # online | offline | hybrid
    city: Kochi # Kochi | Thiruvananthapuram | Kozhikode | Thrissur etc.
    state: Kerala
    country: India
    registrationDeadline: "2026-11-20T23:59:59+05:30" # Required if known (ISO with offset)
    startDate: "2026-11-28T09:00:00+05:30"
    endDate: "2026-11-29T18:00:00+05:30"
    fee:
      type: free # free | paid | unknown
      amountINR: 0 # required if type is paid
    prize: "₹1,00,000"
    themes:
      - AI
      - Open Source
    eligibility: Open to all college students
    teamSize: 2-4 members
```

3. Run validation tests locally:
   ```bash
   pnpm test
   ```
4. Open a Pull Request! Once merged, the GitHub Action automatically updates `data/hackathons.json` and redeploys the site.

---

## 2. Adding a New Source Adapter

All adapters live in `packages/core/src/adapters/` and implement the `SourceAdapter` interface:

```typescript
import { Hackathon } from "../schema.js";
import { SourceAdapter } from "./types.js";

export class MyPlatformAdapter implements SourceAdapter {
  readonly id = "myplatform";
  readonly name = "My Platform Feed";

  async fetch(): Promise<unknown> {
    // 1. Fetch public JSON or RSS feed with User-Agent header and timeout
  }

  normalize(raw: unknown): Hackathon[] {
    // 2. Map raw payloads into validated Hackathon[] objects
    // 3. Mark isNearby, normalize Kerala city, and calculate IST registrationDeadline
  }
}
```

### Adapter Quality Guidelines:
- **Resilience**: A failing adapter must never crash the collector run. Use timeouts and abort controllers.
- **Ethics & Terms**: Check `robots.txt`, respect rate limits, set the standard `User-Agent: HackRadar-Kerala/1.0`, and document notes in `SOURCES.md`.
- **Fixtures**: Add a sample response payload under `packages/core/tests/fixtures/` and add test coverage in `packages/core/tests/adapters.test.ts`.

---

## 3. Local Development Setup

Prerequisites: Node.js 20+ and `pnpm` (v10+).

```bash
# Clone the repository
git clone https://github.com/hackradar-kerala.git
cd hackradar-kerala

# Install dependencies across workspaces
pnpm install

# Run all test suites
pnpm test

# Run scrapers / data collector locally
pnpm collect

# Run terminal CLI locally
pnpm cli
pnpm cli -- --free --city kochi

# Run Astro web development server
pnpm web
```

---

## 4. Code Standards & Commit Messages

- Strict TypeScript with no implicit `any`.
- Timezone rules: all comparisons must use `Asia/Kolkata` (IST) reference time.
- Clean semantic Git commits: `feat:`, `fix:`, `docs:`, `chore:`.
