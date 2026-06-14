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
