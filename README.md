# BB Atlas

> JSON-driven living-doc generator. One JSON file → one self-contained
> interactive HTML "atlas". Hash-routed drill-down, Monte Carlo schedule
> simulation, risk register, **security model** (threats + mitigations +
> principles + compliance), **SEO posture** (findings + audits + checks),
> devlog. Reusable across project plans, constitutions, runbooks, and
> knowledge bases. No build step, no dependencies.

## What's new in v1.2.0

- **SEO view** (`#/seo`) with a By-severity (default) and By-area toggle.
  Findings are grouped P1 → P2 → P3, or by area (sitemap / robots /
  canonical / redirects / status / 404 / meta / schema / content).
- **Site-wide checks matrix** + **status-code health grid** + **principles
  strip** on the SEO view; **audit history** at the bottom with links to
  the source `audits/seo-tech-YYYY-MM-DD/seo-site.md` reports.
- **Per-module SEO posture** rendered on each module page (routes,
  indexability, canonical, schema types, finding refs).
- **Per-task 🔎 chips** on sprint pages where a task closes a
  named finding.
- **SEO tile** on the overview between security and risks
  (P1 / P2 / P3 counts + status-code health summary).
- **Devlog tagging** — `devlog[].tags` including `"seo"` renders a
  magnifying-glass glyph + amber-tinted tag chip.
- Designed to consume site-wide technical-SEO audits produced by the
  `site-audit-on-page-seo` skill (section B) — copy-paste lift from
  audit report → `seo.findings[]`.
- All additions are backward-compatible: a `project.json` with no
  `seo` block renders identically to v1.1.0.

## v1.1.0 — security-by-design

- **Security view** (`#/security`) with Threat-rooted (default) and
  Mitigation-rooted toggle. Per-module security posture, per-task 🔒
  chips, security tile on the overview, risk + devlog shield tagging.
  Full schema reference in `SKILL.md`.

## Install

Global CLI via `npm link` (from a local clone):

```bash
git clone https://github.com/CaptainRandom00/byte-bridges-atlas.git
cd byte-bridges-atlas
npm link
```

After linking, `bb-atlas` is available system-wide.

## Quick start

```bash
bb-atlas init my-plan          # scaffold my-plan/project.json + index.html
bb-atlas serve my-plan/project.json   # watch + live-reload at http://localhost:4321
```

Or batch:

```bash
bb-atlas generate my-plan/project.json my-plan/index.html
open my-plan/index.html
```

## CLI

```
bb-atlas <subcommand> [args]

  generate <input.json> [output.html]     emit atlas HTML (default)
  init [dir]                              scaffold starter project.json
  serve <input.json> [--port N] [--no-open]   watch + live-reload + open
  validate <input.json>                   schema lint, exits 1 on errors

  -h, --help        full usage
  -v, --version
```

If the first arg is a `.json` path, `generate` is implied:

```bash
bb-atlas my-plan/project.json my-plan/index.html
# ⇒ same as: bb-atlas generate my-plan/project.json my-plan/index.html
```

## Schema

See `SKILL.md` for the full schema. Only `project.name` is strictly
required. Every other section (`metrics`, `roadmap`, `sprints`,
`architecture`, `simulation`, `pricing`, `risks`, `security`, `seo`,
`devlog`, `milestones`) is optional — omit a key to drop that section.

See `project.template.json` for a worked example (bb finance iOS plan,
full schema populated).

## Use cases

**Project plans** — populate everything. Full atlas with sprints, Monte
Carlo schedule simulation, risk register, pricing, devlog.

**Constitutions / workflow docs** — omit `sprints` / `simulation` /
`pricing`. Use `architecture.modules` (`kind: agent`) for agent
estates, `risks` + `risksLabel: "GOTCHAS"` for past incidents, `devlog`
for change log. Reference: `~/claudeworkflow/atlas/constitution.json`.

**Runbooks / knowledge bases** — `architecture.modules` (`kind:
service` / `runbook`) per system. Omit anything project-oriented.

## Programmatic use

```js
const { generate, generateString } = require('byte-bridges-atlas');

// Generate to a file
generate({ dataPath: 'my-plan/project.json', outPath: 'my-plan/index.html' });

// Or get the HTML string directly
const D = require('./my-plan/project.json');
const { html, viewCount } = generateString(D);
```

## Claude skill

`~/.claude/skills/bb-atlas/` is a symlink → this repo. Any Claude
session can invoke this tool by name (`Skill: bb-atlas`). See
`SKILL.md` for the auto-discovery contract.

## Theming

Edit the `:root{}` CSS variable block in `lib/generate.js`. The default
palette is a "mission control" dark theme (deep navy + cyan/teal/amber
accents) using Chakra Petch + IBM Plex Sans/Mono.

## License

MIT
