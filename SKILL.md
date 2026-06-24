---
name: bb-atlas
description: Generate an interactive HTML "living atlas" from a single JSON file. Drill-down dashboard with roadmap, optional sprint timeline + task-level acceptance criteria, architecture teardown (modules + data model), Monte Carlo schedule simulation, risk register, security model (threats + mitigations + principles + compliance), SEO posture (findings + audits + checks), pricing, and devlog. Everything is clickable; views cross-link via a hash router; single self-contained file (no build step, no deps). Use when CJ asks for a "living document", "living atlas", "navigable dashboard", "visualise and simulate the plan", or wants a project plan / constitution / runbook / knowledge base turned into a single interactive doc.
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
| `architecture.modules[]` | required if `architecture` present | `{id, name, kind, state?, role, depends[], sprints[]?, stories[]?, detail?, security?}`. `kind` is free-form (`feature`/`shared`/`agent`/`hook`/`registry`/`plugin` all get pre-styled colour chips; anything else falls back to muted). `security` is the per-module security posture — see [Security schema](#security-schema-v110). |
| `architecture.dataModel[]` | optional | `{entity, fields[], relations}` — table at the bottom of the arch view |
| `sprints[]` | optional | `{id, name, weeks:[start,end], points, status, risk, deliverable, goal, depends[], unblocks[], tasks[]}` — each becomes `#/sprint/<id>` |
| `sprints[].tasks[]` | optional | `{name, est, owner, story, ac, security?}`. `security` tags the task as implementing a mitigation; renders a 🔒 chip on the sprint page — see [Security schema](#security-schema-v110). |
| `milestones[]` | optional | `{week, label, major?}` — only renders if `sprints` exists |
| `risks[]` | optional | `{name, severity, prob?, delayWeeks?, impact, mitigation, sprint?, kind?}` — feeds the Monte Carlo if `simulation` also present. `kind: "security"` renders the risk with a shield glyph and a distinct border tint. |
| `risksLabel` | optional | Section heading override (e.g. `"GOTCHAS"` for constitutional use) |
| `simulation` | optional | `{totalPoints, velocityMean, velocityStd, sprintWeeks, runs, note}` — Monte Carlo widget. Auto-disabled if no `sprints` |
| **`security`** | optional | Top-level security model — threats, mitigations, principles, compliance. See [Security schema](#security-schema-v110). Renders the `#/security` view and the overview tile. |
| **`seo`** | optional | Top-level SEO posture — findings, audits, principles, status-code health, checks. See [SEO schema](#seo-schema-v120). Renders the `#/seo` view and the overview tile. |
| `pricing` | optional | `{model, monthly, annual, annualSaving, free[], paid[]}` |
| `devlog[]` | optional | `{date, title, tags[], body}` — reverse-chronological. A `tags` entry of `"security"` renders the row with a shield glyph; `"seo"` renders with a magnifying-glass glyph. |
| `devlogLabel` | optional | Section heading override (e.g. `"Change Log"`, `"Constitutional History"`) |

### What gets skipped if you omit a key

- No `sprints` → no sprint timeline section, no per-sprint pages, no Monte Carlo
- No `architecture` → no arch view in the top nav, no module pages
- No `risks` → no Risk Register section
- No `pricing` → no Pricing section
- No `devlog` → no Devlog section
- No `metrics` → no Snapshot tiles
- No `simulation` (or no `sprints`) → no Monte Carlo widget
- No `security` → no `#/security` view in the top nav, no security tile on overview, no 🔒 chips on tasks, no shield glyphs on risks/devlog (per-module / per-task `security` keys also become no-ops)
- No `seo` → no `#/seo` view in the top nav, no SEO tile on overview, no 🔎 chips on tasks, no magnifying-glass glyph on devlog (per-module / per-task `seo` keys also become no-ops)

## Security schema (v1.1.0+)

The `security` block is bb-atlas's first-class home for the security
model. Everything in it is optional; specify what you have, leave the
rest. Backward-compat: a project with no `security` block renders
exactly as it did in v1.0.0.

### Top-level shape

```jsonc
"security": {
  "summary": "Short narrative — your threat-model framing.",

  "principles": [
    { "id": "SP-001", "name": "Decimal money, never Double",
      "scope": "data", "verified": true }
  ],

  "threats": [
    { "id": "T-001", "name": "Stolen unlocked device",
      "severity": "high",                       // low | med | high
      "likelihood": 0.20,                       // 0..1
      "appliesTo": ["data", "transactions"],    // module IDs
      "impact": "Full financial history visible to anyone holding the unlocked phone",
      "mitigations": ["M-001", "M-002"] }
  ],

  "mitigations": [
    { "id": "M-001", "name": "Data Protection: NSFileProtectionCompleteUnlessOpen on CoreData store",
      "owner": "Data", "module": "data",
      "sprint": 1, "taskRef": "Define CoreData model",
      "status": "planned",                      // planned | in-progress | verified | dropped
      "evidence": "unit test reading the protection class" }
  ],

  "compliance": [
    { "name": "App Privacy nutrition label accurate",
      "sprint": 6, "status": "planned",
      "verifiedBy": "manual cross-check against code" }
  ]
}
```

### Per-module security posture

Inside any `architecture.modules[]` entry:

```jsonc
"security": {
  "dataClasses": ["financial-history", "merchant-text"],
  "atRest": "NSFileProtectionCompleteUnlessOpen",
  "atTransit": "n/a (offline)",
  "threats": ["T-001"],          // threat IDs the module is exposed to
  "mitigations": ["M-001"]       // mitigation IDs the module implements
}
```

Rendered as a "Security posture" subsection on the module page.

### Per-task security tag

Inside any `sprints[].tasks[]` entry:

```jsonc
"security": {
  "mitigation": "M-001",
  "ac": "Store + WAL + SHM opened with NSFileProtectionCompleteUnlessOpen; unit test reads protection class"
}
```

Renders a 🔒 chip beside the task with the mitigation ID and AC in a
tooltip. Links through to `#/security` to the matching mitigation.

### Risk + devlog tagging

- `risks[].kind: "security"` — shield glyph + distinct border tint in the risk register.
- `devlog[].tags` array including `"security"` — shield glyph beside the entry title.

### The `#/security` view

Two layouts on the same page, with a toggle in the top right:

- **Threat-rooted (default)** — threats listed by severity, each
  showing the mitigations covering it with status pills and a click
  through to the implementing module/sprint/task. Reads as "what
  could go wrong, and what are we doing about each".
- **Mitigation-rooted** — mitigations grouped by status (planned →
  in-progress → verified → dropped), each showing the threats it
  covers and the module/sprint/task it lives in. Reads as "what
  we've decided to do, and how much is done".

Plus a Principles strip at the top (read-only list of `SP-NNN`
invariants), an overview tile on `#/` showing the threat/mitigation
counts, and the Compliance checklist at the bottom of the view.

### Validation rules

Permissive (warnings, not errors) for unknown fields and missing
optional keys. Hard errors:

- `security` must be an object if present.
- `security.threats[].id` and `security.mitigations[].id` are required
  when their parent array is present.
- `severity ∈ {low, med, high}` if present.
- `status ∈ {planned, in-progress, verified, dropped}` if present.
- `likelihood ∈ [0, 1]` if present.

Cross-ref warnings (don't block generation):

- `threat.mitigations[]` IDs that don't resolve.
- `mitigation.module` that doesn't match any `architecture.modules[].id`.
- `mitigation.sprint` that doesn't match any `sprints[].id`.

All values fall through `esc()` (HTML-escaped) — content is safe to paste
markdown-style text into.

## SEO schema (v1.2.0+)

The `seo` block is bb-atlas's first-class home for SEO posture —
findings from an audit, the audit history itself, principles, and
site-wide checks. Mirrors the security-by-design pattern. Backward-
compat: a project with no `seo` block renders exactly as it did in
v1.1.0.

The shape was designed to consume site-wide technical-SEO audit
reports produced by the `site-audit-on-page-seo` skill (section B).
A typical workflow:

1. Run the audit; it writes `audits/seo-tech-YYYY-MM-DD/seo-site.md`.
2. Transcribe the findings into `seo.findings[]`.
3. Re-generate the atlas — the `#/seo` view now reflects current state.
4. As findings move from `open` → `in-progress` → `fixed`, update
   `status` in place. The overview tile re-counts automatically.

### Top-level shape

```jsonc
"seo": {
  "summary": "Short narrative — what surface this covers and the audit cadence.",
  "publicUrl": "https://atlas.bytebridges.dev",

  "principles": [
    { "id": "SEO-001", "name": "Every public page declares an absolute canonical",
      "scope": "all routes", "verified": false }
  ],

  "checks": [
    { "name": "sitemap.xml",  "status": "missing", "note": "404 at /sitemap.xml" },
    { "name": "robots.txt",   "status": "missing", "note": "404 at /robots.txt" },
    { "name": "canonical",    "status": "partial", "note": "no <link rel=canonical> on /" },
    { "name": "viewport meta","status": "present", "note": "width=device-width, initial-scale=1" }
  ],

  "statusHealth": { "2xx": 1, "3xx": 1, "4xx": 2, "5xx": 0, "0": 0 },

  "findings": [
    { "id": "F-001",
      "severity": "P1",                            // P1 | P2 | P3
      "area": "404",                               // sitemap | robots | canonical | redirects | status | 404 | meta | schema | content | other
      "name": "Catch-all routing returns 200 for unknown paths",
      "summary": "Every /<anything> resolves to the SPA shell with a 200.",
      "fix": "Hosting-platform 404 for unmapped paths, or noindex meta on routes outside inventory.json.",
      "status": "open",                            // open | in-progress | fixed | wontfix
      "module": "lib-generate",                    // optional cross-ref
      "sprint": 1,                                 // optional cross-ref
      "evidence": "curl -I /this-does-not-exist → HTTP/1.1 200",
      "audit": "seo-tech-2026-06-14" }
  ],

  "audits": [
    { "date": "2026-06-14",
      "target": "atlas.bytebridges.dev",
      "scope": "site-wide technical SEO",
      "source": "audits/seo-tech-2026-06-14/seo-site.md",
      "summary": "1 P1 (latent), 5 P2, 5 P3 — sitemap/robots/canonical missing" }
  ]
}
```

### Per-module SEO posture

Inside any `architecture.modules[]` entry:

```jsonc
"seo": {
  "routes": ["/"],
  "indexable": true,
  "canonical": "https://atlas.bytebridges.dev/",
  "schemaTypes": ["Organization", "WebSite"],
  "findings": ["F-001", "F-002"]
}
```

Rendered as an "SEO posture" subsection on the module page.

### Per-task SEO tag

Inside any `sprints[].tasks[]` entry:

```jsonc
"seo": {
  "finding": "F-001",
  "ac": "Hosting platform returns 404 (not 200) for any unmapped path; integration test asserts status code."
}
```

Renders a 🔎 chip beside the task with the finding ID and AC in a
tooltip. Links through to `#/seo` to the matching finding.

### Devlog tagging

- `devlog[].tags` array including `"seo"` — magnifying-glass glyph
  beside the entry title, amber-tinted tag chip.

### The `#/seo` view

Two layouts on the same page, with a toggle:

- **By severity (default)** — findings grouped P1 → P2 → P3, each
  with its area pill, status pill, evidence, and a cross-link to the
  implementing module/sprint and source audit. Reads as "what's
  broken in priority order".
- **By area** — findings grouped by area (sitemap, robots, canonical,
  ...), then sorted by severity within each group. Reads as "which
  surface is leaking the most".

Plus a Principles strip (read-only `SEO-NNN` invariants), a Status-
code health grid, a per-check matrix (sitemap / robots / canonical /
viewport / ...), and an Audit history list at the bottom of the view.

### Validation rules

Permissive (warnings, not errors) for unknown fields and missing
optional keys. Hard errors:

- `seo` must be an object if present.
- `seo.findings[].id` is required when `findings` is present.
- `severity ∈ {P1, P2, P3}` if present.
- `status ∈ {open, in-progress, fixed, wontfix}` if present.

Soft warnings:

- `area` outside the standard set — renders, but does not group with
  siblings under "By area".
- `findings[].module` that doesn't match any `architecture.modules[].id`.
- `findings[].sprint` that doesn't match any `sprints[].id`.
- `task.seo.finding` IDs that don't resolve.

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
- `#/security` — security view: threat-rooted (default) and mitigation-rooted toggle (if `security` present)
- `#/seo` — SEO view: by-severity (default) and by-area toggle (if `seo` present)

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
