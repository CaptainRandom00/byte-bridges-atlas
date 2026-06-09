# byte-bridges-atlas — Roadmap

> Living spec. Vision at top, current plan in the middle, decision
> trail at the bottom. Updated alongside docs/devlog.md whenever a
> phase step ships or the direction shifts.

---

## 1. Vision

_TBD — 1–3 paragraphs. Why this project exists; what success looks
like at maturity._

---

## 1b. First Principles

_TBD — cross-cutting invariants every phase must honor. Examples:
security by design, mobile-first, audit-trail by default,
pocket-first surface, single-machine tolerant._

---

## 2. Scaffold

_TBD — architectural / conceptual map. Layers, components, how they
fit together. Updated when the structure changes, not when files
change._

---

## 3. Brainstorms

Ideas in flight. Capture early via `/roadmap_brainstorm`; promote
to a phase via `/roadmap_promote <id> --phase <name>` when committed.

### Active

_(no brainstorms yet — add via `roadmap brainstorm "..." --source usage`)_

### Promoted

_(none yet — when a brainstorm becomes a phase, its entry moves here
with a strikethrough + pointer to the phase)_

---

## 4. Phased plan

Ordered, operational. Status markers:
`[ ]` pending · `[~]` in progress · `[x]` done — PR reference required
· `[–]` dropped — one-line reason required.

Each phase is an enriched entry with:
- **Purpose** — why this phase exists
- **Depends on** — phases that must complete first
- **First principles invoked** — invariants this phase upholds
- **Definition of done** — what's true when the phase is `[x]`
- **Steps** — the work items themselves

Phase headers use `###` (sub-sections of section 4) so the parser
sees them as phases, not as new top-level sections.

_TBD — no phases yet. Add the first phase by editing this section
directly._

---

## 5. Decision archive

Chronological, append-only. Two entry types share the same header:
- `decision` — forward-looking architectural call
- `diversion` — scope shift mid-phase

Append entries via `/roadmap_decide` and `/roadmap_divert`.

_(no decisions yet)_

---

> Last updated: 2026-06-09 — keep this line current.
