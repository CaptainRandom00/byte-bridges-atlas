# Site-wide Technical SEO

**Target**: https://atlas.bytebridges.dev/  (bb-atlas hosted documentation snapshot)
**Date**: 2026-06-14
**Skill**: site-audit-on-page-seo (section B — site-wide technical SEO)
**Inputs**: `config.json`, `inventory.json`, `link-graph.json`, `link-status.json`
**Crawl mode**: http-only (production host) + local-mode cross-check against
generated `docs/atlas/index.html`

> Audited surface is a single self-contained HTML file with hash-routed views
> (`#/overview`, `#/architecture`, `#/security`, …). Findings reflect the SEO
> implications of a hash-routed SPA being served as a public docs site.

## Sitemap

- `/sitemap.xml` — **missing** (HTTP 404).
- `/sitemap_index.xml` — missing.
- `/sitemap-0.xml` — missing.
- `inventory.json` lists 1 indexable URL (`/`) plus 11 hash routes. Hash routes
  are not addressable by search engines, so the sitemap would only ever contain
  the root. A sitemap is still expected; its absence is a missed signal.

## Robots.txt

- `/robots.txt` — **missing** (HTTP 404).
- Without it, well-behaved crawlers fall back to default-allow, which is the
  current intent — but there is no `Sitemap:` reference (because there is no
  sitemap), and no scope for adding `Disallow` for `/_next/` style internals
  later without retrofitting one.

## Canonical enforcement

| Page | Canonical declared | Absolute | Matches host | Notes |
|---|---|---|---|---|
| `/` | **missing** | — | — | No `<link rel="canonical">` in `<head>`. |

- Config canonical host: `https://atlas.bytebridges.dev` (read from
  `config.json` → `canonical`).
- Generated HTML has no `<link rel="canonical">` at all. For a single-page
  doc this is low-impact, but it leaves Google free to pick its own canonical
  if the same content is mirrored to a preview URL (Vercel preview, GitHub
  Pages staging).
- HTTPS enforced at the edge — non-`https://` requests 308 to HTTPS. Good.
- `www.` subdomain not configured — apex-only, no www → apex redirect needed.

## Redirects

- 301: 1 (`http://` → `https://` at the apex)
- 302: 0
- 308: 1 (same HTTPS upgrade, served by the host platform)
- chains: 0
- loops: 0

The redirect surface is minimal — single-page deployment, nothing to chain
through. No legacy URL migrations to honour yet.

## Status-code health

| class | count | notable |
|---|---|---|
| 2xx | 1 | `/` returns 200, content-type `text/html; charset=utf-8` |
| 3xx | 1 | HTTP → HTTPS upgrade (expected) |
| 4xx | 2 | `/sitemap.xml`, `/robots.txt` — both 404, both findings (see P1/P2) |
| 5xx | 0 | — |
| 0   | 0 | — |

`link-status.json` contains 14 entries — 13 fragment anchors against `/`
(skipped from status counting per the skill convention) plus the 1 indexable
URL itself.

## HTTPS / non-www / www enforcement

- HTTP → HTTPS: ✅ enforced (308).
- Non-canonical host: not applicable (apex-only).
- Trailing slash: consistent — apex with no path serves the SPA, all in-page
  navigation is hash-based.

## Pagination / hreflang

- No pagination — single-page doc.
- No multi-language variant — English only.

## 404 page

- `/this-does-not-exist` returns **200** (the SPA shell), not 404. This is the
  classic SPA SEO pitfall — every unknown path renders the same shell, so
  search engines see infinite duplicate content if the URL space is ever
  expanded.
- Currently low-impact because nothing inbound-links to invented paths, but
  becomes a real problem the moment the deployment moves to a multi-page
  generated output (which is on the v1.2.0 brainstorm list).

## Mobile viewport

- `<meta name="viewport" content="width=device-width, initial-scale=1">` ✅
  present in the generated `<head>`.
- No `maximum-scale` constraint — accessibility-friendly.

## Indexability across environments

- Production (`atlas.bytebridges.dev`): indexable (no `noindex`).
- Preview / staging: **not enforced** — any Vercel/Pages preview URL of the
  same HTML would be indexable too, because the `<head>` has no environment-
  aware robots meta. This duplicates production content under preview hosts.
- Auth-gated areas: none.

---

## Findings

### P1
- **Catch-all routing returns 200 for unknown paths.** Every `/anything`
  resolves to the SPA shell with a 200. Acceptable for the current single-
  route deployment, but a blocker if v1.2.0 ships multi-page output (per the
  roadmap brainstorm). Fix shape: hosting-platform 404 for unmapped paths,
  or a `<meta name="robots" content="noindex">` injection on routes outside
  `inventory.json`.

### P2
- **Missing `/robots.txt`.** Adds no Disallow scope, no `Sitemap:` reference,
  no precedent for the next deploy. Cheap to add — even a single
  `User-agent: *` / `Allow: /` / `Sitemap: …` block is enough.
- **Missing `/sitemap.xml`.** With a single indexable URL the sitemap is
  near-empty, but the file's presence itself is a quality signal. Generator
  could emit one automatically when `bb-atlas generate` is run with a
  `--public-url` flag.
- **No canonical tag.** Add `<link rel="canonical" href="<config.canonical>/">`
  in the generated `<head>`. Prevents preview-URL canonical confusion.
- **No `noindex` on preview deployments.** Add an env-aware robots meta in
  `lib/generate.js` (or document the deployment-time injection). Vercel
  preview URLs would otherwise compete with production for the same content.
- **No `og:image`, `og:url`, `og:site_name` on the generated HTML.** OG tags
  are partially populated (`og:title`, `og:description`) but the image, URL,
  and site_name fields are absent — shareability is degraded.

### P3
- **No `twitter:card` meta.** Falls back to OG when Twitter parses the page,
  but explicit `summary_large_image` would render better in-feed.
- **No JSON-LD `Organization` / `WebSite` schema** on the homepage. With a
  single-page deployment the impact is small; worth adding when a multi-page
  variant lands.
- **`<title>` is generic** — currently `"BB Atlas"`. Could include a primary
  keyword phrase (`"BB Atlas — JSON-driven living-document generator"`).
- **Heading hierarchy is reasonable** but the `#/security` view introduces
  H4s nested under H2s without an intervening H3 in two places. Visual-only
  on the rendered view; flag for tidy-up when the SEO of hash routes
  actually matters (i.e., never, while they remain hash-routed).
- **No `<meta name="description">`** — only OG description is set. Add a
  matching `<meta name="description">` for SERP rendering.

---

## Calibration check

Findings spread (1 P1 / 5 P2 / 5 P3) sits within the per-skill calibration
band (1–3 P1, 3–10 P2, many P3). The single P1 is the catch-all-200 issue,
which is latent rather than active — acceptable for the current deployment
shape, blocking for the next.

## Follow-ups for the bb-atlas generator

These are repo-level fixes that would make every atlas-generated site
better, not site-specific corrections:

- `lib/generate.js`: emit `<link rel="canonical">` when
  `project.publicUrl` is present in the schema.
- `lib/generate.js`: emit `<meta name="robots" content="noindex">` when
  `VERCEL_ENV=preview` or equivalent.
- New `bb-atlas sitemap <input.json>` subcommand that writes a
  single-entry `sitemap.xml` next to the generated HTML.
- Schema: add optional `project.publicUrl` (canonical host) and
  `project.seo.{title,description,ogImage}` overrides — feeds the head.
- Auto-derive a richer `<title>` from `project.name` + `project.tagline`
  when no explicit override is set.

These would land in a v1.2.0 alongside the multi-page output work the
brainstorm already references.
