---
name: bb-atlas
description: Generate an interactive HTML "living atlas" from a single JSON file. Drill-down dashboard with roadmap, optional sprint timeline + task-level acceptance criteria, architecture teardown (modules + data model), Monte Carlo schedule simulation, risk register, pricing, and devlog. Everything is clickable; views cross-link via a hash router; single self-contained file (no build step, no deps). Use when CJ asks for a "living document", "living atlas", "navigable dashboard", "visualise and simulate the plan", or wants a project plan / constitution / runbook / knowledge base turned into a single interactive doc.
---

# BB Atlas — global living-doc generator

Turns one JSON file into a self-contained, hash-routed `index.html`. No
build step, no dependencies, opens in any browser. Reusable across
**project plans** (full schema — sprints + Monte Carlo + pricing) and
**non-project docs** (constitutions, runbooks, knowledge bases — slim
schema with optional fields).

## Install

Tool lives at `~/Development/byte-bridges-atlas/` (own git repo, npm
package: `byte-bridges-atlas`). The skill folder
`~/.claude/skills/bb-atlas/` is a symlink → the repo, so SKILL.md +
template stay reachable from any Claude session.

Global `bb-atlas` CLI installed via `npm link` from the repo root.

```
~/Development/byte-bridges-atlas/
├── bin/bb-atlas              ← CLI dispatcher (chmod +x, in $PATH)
├── lib/
│   ├── generate.js           ← pure generator (module + script entry)
│   ├── init.js               ← `bb-atlas init` impl
│   ├── serve.js              ← `bb-atlas serve` impl
│   └── validate.js           ← `bb-atlas validate` impl
├── templates/starter.project.json
├── project.template.json     ← canonical worked example (bb finance plan)
├── SKILL.md                  ← this file (skill metadata for Claude)
├── README.md
└── package.json              ← bin: { "bb-atlas": "bin/bb-atlas" }
```

## Invocation

```bash
bb-atlas <input.json> <output.html>      # generate (default subcommand)
bb-atlas init [dir]                       # scaffold a starter project.json
bb-atlas serve <input.json> [--port N]    # watch + live-reload + open browser
bb-atlas validate <input.json>            # schema lint without generating
bb-atlas --help                           # full usage
bb-atlas --version                        # version
```

The CLI is the primary entry point. The library is also requireable
(`require('byte-bridges-atlas')` → `{ generate, generateString }`) for
programmatic embedding.

If `bb-atlas` is not in `$PATH` on this machine, run `npm link` from
the repo root. As a fallback for any host:

```bash
node ~/Development/byte-bridges-atlas/bin/bb-atlas <input> <output>
```

## When to use

- "Make this a **living document** / living doc"
- "Turn the plan into a **navigable dashboard**"
- "**Visualise** and simulate the plan"
- "Roadmap + devlog dashboard in /docs"
- Constitution / agent estate / hook registry → single interactive page
- Runbook with linked sections (architecture + dependencies + change log)
- Any time a body of knowledge should be browsable + drill-down rather than
  scrolled top-to-bottom

## input.json schema — what's REQUIRED vs OPTIONAL

| Key | Required? | Purpose |
|---|---|---|
| `project` | **required** | `{name, tagline, atlasBrand?, status?, phase?, updated?, repo?}` — last word of `atlasBrand` (or `name`) is bolded in the nav lockup |
| `output` | optional | Default output path relative to the tool folder. Override with the CLI 2nd arg. |
| `metrics[]` | optional | `{label, value, unit}` — snapshot tiles |
| `roadmap` | optional | `{now[], next[], later[]}` — each card `{title, detail, tag, link?}`. `link` shapes: `"sprint/<N>"`, `"module/<id>"`, or any hash route |
| `architecture` | optional | `{summary, title?, eyebrow?, navLabel?, modules[], dataModel[], kindLabels{}, dataModelLabel?}` |
| `architecture.modules[]` | required if `architecture` present | `{id, name, kind, state?, role, depends[], sprints[]?, stories[]?, detail?}`. `kind` is free-form (`feature`/`shared`/`agent`/`hook`/`registry`/`plugin` all get pre-styled colour chips; anything else falls back to muted) |
| `architecture.dataModel[]` | optional | `{entity, fields[], relations}` — table at the bottom of the arch view |
| `sprints[]` | optional | `{id, name, weeks:[start,end], points, status, risk, deliverable, goal, depends[], unblocks[], tasks[]}` — each becomes `#/sprint/<id>` |
| `sprints[].tasks[]` | optional | `{name, est, owner, story, ac}` |
| `milestones[]` | optional | `{week, label, major?}` — only renders if `sprints` exists |
| `risks[]` | optional | `{name, severity, prob?, delayWeeks?, impact, mitigation, sprint?}` — feeds the Monte Carlo if `simulation` also present |
| `risksLabel` | optional | Section heading override (e.g. `"GOTCHAS"` for constitutional use) |
| `simulation` | optional | `{totalPoints, velocityMean, velocityStd, sprintWeeks, runs, note}` — Monte Carlo widget. Auto-disabled if no `sprints` |
| `pricing` | optional | `{model, monthly, annual, annualSaving, free[], paid[]}` |
| `devlog[]` | optional | `{date, title, tags[], body}` — reverse-chronological |
| `devlogLabel` | optional | Section heading override (e.g. `"Change Log"`, `"Constitutional History"`) |

### What gets skipped if you omit a key

- No `sprints` → no sprint timeline section, no per-sprint pages, no Monte Carlo
- No `architecture` → no arch view in the top nav, no module pages
- No `risks` → no Risk Register section
- No `pricing` → no Pricing section
- No `devlog` → no Devlog section
- No `metrics` → no Snapshot tiles
- No `simulation` (or no `sprints`) → no Monte Carlo widget

All values fall through `esc()` (HTML-escaped) — content is safe to paste
markdown-style text into.

## Common use shapes

### Project plan (the original use case)
Populate everything. Full atlas with Monte Carlo schedule simulation.
See `project.template.json` for a complete worked example
(bb finance — iOS budget app).

### Constitution / workflow doc
- `metrics` → counts (agents, hooks, registries, last update)
- `roadmap` → active conventions / next sprints / parked ideas
- `architecture.modules` (kind: `agent`) → one card per Claude sub-agent
- `architecture.dataModel` → registries matrix (port / bot / roadmap / bbpark)
- `risks` + `risksLabel: "GOTCHAS"` → past incidents + mitigations
- `devlog` + `devlogLabel: "Constitutional History"` → rule additions / removals
- Omit `sprints`, `simulation`, `pricing`

### Runbook / knowledge base
- `metrics` → operational counts (services, runbooks, on-call rota size)
- `roadmap` → upcoming maintenance windows / pending audits / deferred
- `architecture.modules` (kind: `service` or `runbook`) → one card per system
- Omit `sprints`, `simulation`, `pricing`, optionally `risks`

## Customising for a new project

1. Scaffold: `bb-atlas init <your-dir>` (creates project.json + index.html).
2. Open `<your-dir>/project.json` and replace placeholder content.
3. Live-edit: `bb-atlas serve <your-dir>/project.json` (auto-regen + live-reload).
4. Or batch-regen: `bb-atlas generate <your-dir>/project.json <your-dir>/index.html`.
5. Commit the resulting `index.html` (or serve it) alongside your repo's other docs.

## Theming

CSS variables in the generator's `<style>` block at the `:root{}`
declaration. Edit the hex values to retheme. The default palette
("mission control" dark) uses:

- `--bg: #0A0E27` (deep navy background)
- `--cyan: #00D9FF` (primary accent — links, highlights)
- `--teal: #06D6A0` (secondary accent — section heads)
- `--amber: #FFA500` (warnings, mid-severity)
- `--red: #E63946` (high severity)
- Display font: Chakra Petch · Body: IBM Plex Sans · Mono: IBM Plex Mono (Google Fonts, falls back to system)

## Routes

The hash router is hard-coded (schema-driven where dynamic):

- `#/` — overview
- `#/sprint/<id>` — per-sprint page (if `sprints` present)
- `#/arch` — architecture teardown (if `architecture` present)
- `#/module/<id>` — per-module page (if `architecture.modules` present)

Works on `file://` (no server needed). Browser back/forward and
bookmarks all behave correctly.

## Reference implementations

- **Project plan**: `bb finance` — `/Volumes/b/01_PROFESSIONAL/Software_Development/bb finance/00_planning/byte-bridges-atlas/project.json`
- **Constitution**: `claudeworkflow` — `~/claudeworkflow/atlas/constitution.json` (built 2026-06-09 — first non-project atlas)

## Maintenance

The repo at `~/Development/byte-bridges-atlas/` is the canonical source.
The bb finance project (`/Volumes/b/.../byte-bridges-atlas/`) has an
older standalone copy of the generator; that copy will be migrated to
either use `bb-atlas` CLI directly or `require('byte-bridges-atlas')` in
a separate sprint.

Re-link after pulling updates to the repo:

```bash
cd ~/Development/byte-bridges-atlas && npm link
```

The skill folder is a symlink, so SKILL.md / templates / lib changes are
picked up immediately by both Claude sessions and the CLI.
