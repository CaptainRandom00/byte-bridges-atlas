# byte-bridges-atlas — devlog

Append-only single-paragraph log of meaningful changes to the
**byte-bridges-atlas** repo. Newest first.

Format mirrors the other DVLAW-indexed devlogs so the skill parses
them with the same regex:

```
## YYYY-MM-DD — type(scope): subject  [tag] [tag]

Dense single-paragraph entry — what changed, why, how, tests, follow-ups.
```

<!-- First entry lands below this line. Newest entries always go at the top. -->

## 2026-06-14 — feat(schema): v1.2.0 — SEO posture as a first-class atlas citizen  [feat] [schema] [seo] [release]

Adds a top-level `seo` block to the project.json schema with `findings`, `audits`, `principles`, `checks`, and `statusHealth` — plus optional `architecture.modules[].seo` (routes, indexability, canonical, schemaTypes, finding refs) and `sprints[].tasks[].seo` (finding ID + AC) tags. Findings carry `severity ∈ {P1, P2, P3}`, `status ∈ {open, in-progress, fixed, wontfix}`, and an `area` discriminator (sitemap / robots / canonical / redirects / status / 404 / meta / schema / content / other) for the by-area grouping. Devlog entries tagged `seo` render with a 🔎 glyph and an amber-tinted tag chip (mirrors the security 🛡 + cyan-tint pattern). New `#/seo` view renders By-severity (default, P1 → P2 → P3) and By-area layouts behind a top-of-page toggle, plus a Principles strip, a Status-code health grid, a per-check matrix, and an Audit-history list with links to the source `audits/seo-tech-YYYY-MM-DD/seo-site.md` reports. Overview gains an SEO tile (amber + teal gradient strip, distinct from the security tile's cyan + teal) sitting between security and risks, summarising P1/P2/P3 counts and status-code health. Top nav adds a 🔎 SEO link when the block is present, hides it when absent. lib/validate.js gains `validateSeo()` with shape-and-enum checks (severity ∈ P1/P2/P3, status ∈ open/in-progress/fixed/wontfix; area outside the standard set warns but renders) plus cross-ref warnings for unresolved module / sprint / finding IDs. Schema designed to consume site-wide technical-SEO audits produced by the `site-audit-on-page-seo` skill section B — example report committed at `audits/seo-tech-2026-06-14/seo-site.md` (audit of a hypothetical `atlas.bytebridges.dev` deployment of the bb-atlas docs, 1 P1 / 5 P2 / 5 P3). All additions are backward-compatible: smoke-tested against the v1.1.0 `project.template.json` (no seo block → no nav link, no `/seo` view, no overview tile, identical render shape) and against atlas's own `docs/atlas/project.json` (which gains a populated seo block transcribed from the audit report). Driven by the audit example showing how naturally SEO posture maps onto the existing security-by-design rendering pattern — the schema is the same shape, just a different lens on the same plan-state machinery.

## 2026-06-14 — feat(schema): v1.1.0 — security-by-design as a first-class atlas citizen  [feat] [schema] [security] [release]

Adds a top-level `security` block to the project.json schema with `threats`, `mitigations`, `principles`, `compliance` — plus optional `architecture.modules[].security` (data classes, at-rest class, threats exposed to, mitigations implemented) and `sprints[].tasks[].security` (mitigation ID + AC) tags. Risks gain a `kind: "security"` flag; devlog entries gain shield-glyph rendering when tagged `security`. New `#/security` view renders Threat-rooted (default) and Mitigation-rooted layouts behind a top-of-page toggle; threats are grouped by severity, mitigations are grouped by status (planned → in-progress → verified → dropped). Overview gains a security tile between architecture and risks showing threat / mitigation / principle / compliance counts. Top nav adds a 🛡 Security link when the block is present, hides it when absent. lib/validate.js gains shape-and-enum checks (severity ∈ low/med/high, status ∈ planned/in-progress/verified/dropped, likelihood ∈ [0,1]) plus cross-ref warnings for unresolved mitigation / module / sprint IDs. All additions are backward-compatible: smoke-tested against the v1.0.0 `project.template.json` (no security block → no Security nav link, no `/security` view, identical render shape) and against bb-finance's real project.json (which is the schema's first downstream consumer). Driven by bb-finance discovering the gap during planning — security-by-design is the methodology, the tool now displays it natively. Reference implementation: bb-finance's `00_planning/byte-bridges-atlas/project.json` (to land separately as a security block authored against this schema).

## 2026-06-09 — feat(docs): install devlog + roadmap + self-atlas  [meta] [docs]

Initialised the three living documents on the freshly-extracted repo.
`python3 ~/.claude/skills/dvlaw/dvlaw.py init` created this devlog and
registered the repo in the DVLAW registry (now 7 repos). The roadmap
init skill created docs/roadmap.md (vision + first principles left as
TBD placeholders) and registered the repo in the roadmap registry
(now 27 repos). docs/atlas/project.json hand-authored — bb-atlas
documenting itself: 9 architecture modules (4 commands + 4 lib + 1
template) grouped by kind, schema dataModel, 3 known-caveats risks,
seeded devlog. Generated via `bb-atlas generate docs/atlas/project.json
docs/atlas/index.html` — dogfooded the CLI on its own home. 46 KB,
11 views. Follow-up: fill in roadmap vision + first principles when
v1.1 scope is clearer.

## 2026-06-09 — feat: bb-atlas v1.0.0 — CLI + skill extraction  [feat] [cli] [release]

Initial commit (e9b20aa). Extracted from `~/.claude/skills/bb-atlas/`
(inline directory under the global ~/.claude repo) to
`~/Development/byte-bridges-atlas/` as a standalone repo. bin/bb-atlas
dispatcher routes to lib/{generate,init,serve,validate}.js — pure
Node, zero runtime deps. package.json `bin` entry → `npm link` puts
`bb-atlas` in $PATH. The skill folder is now a symlink → this repo so
SKILL.md / templates stay reachable from any Claude session. Smoke-
tested against the bb finance baseline: 59 lines of whitespace +
footer-label diff, no functional regressions. First validation use
case (~/claudeworkflow/atlas/) renders cleanly at 44 views.
