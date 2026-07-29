# Design

<!-- impeccable:design-schema 1 -->

## Direction contract

**THESIS.** An operator's console that reads like precision instrumentation: a quiet off-white
field, one calm sidebar, and data set in monospace so numbers line up and can be trusted at a
glance. It refuses the dark "crypto dashboard" cliché (near-black + neon) and the generic SaaS
card-grid; the interest lives in typographic precision and restraint, not decoration.

**OWN-WORLD.** Warm off-white ground (`#f6f6f4`); pure-white cards with hairline `#e7e7e3`
borders and 16px radii; near-black ink (`#0a0a0a`). One geometric UI face (Space Grotesk) for
all labels/headings/body; JetBrains Mono for every datum — IDs, tx hashes, addresses, amounts,
stat values, code, and the network pill. Color is Restrained: neutrals carry the surface; a
single green (`#15803d` on `#dcfce7`) means "settled/active" and nothing decorative; a solid
black pill is the only primary action. Chart series are muted periwinkle + gray, never neon.

**STORY.** The operator lands, sees settlement is live and healthy (tiles + pulsing Live badge),
scans volume over time, then drills into an individual payment and opens it on-chain.

**FIRST VIEWPORT.** Fixed 240px left sidebar (brand + Testnet pill + icon nav); content opens
with a page header (title + subtitle + Live badge), then a row of three stat cards, then the
volume chart with an insights rail to its right.

**FORM.** Operate-mode admin console; the visual world was pinned by the brief, so no concept
tournament ran.

## Durable rules

### Tokens (source of truth: `app/globals.css` `:root`)
- Ground `--bg #f6f6f4` · card `--surface #ffffff` · muted-fill `--fill #efefec`
- Ink `--text #0a0a0a` · muted `--muted #6b6b6b` · faint `--faint #9a9a97`
- Border `--border #e7e7e3` · hover-fill `--hover #f0f0ed`
- Primary `--ink #0a0a0a` / on-ink `#ffffff`
- Success `--ok #15803d` on `--ok-bg #dcfce7`; warn `#b45309` on `#fef3c7`
- Chart `--c1 #8ea0f0` (periwinkle) · `--c2 #a3a7ad` (gray); accent `--accent #16a34a`
- Radii: card 16 · control 12 · pill 999 · inset 10. Border 1px everywhere.
- Shadow: `--shadow 0 1px 2px rgba(0,0,0,.04)` only; no colored halos (the Live dot pulse is
  the one purposeful exception — it signals a live connection state).

### Type
- `--font-sans` Space Grotesk (300–500) · `--font-mono` JetBrains Mono (400–600), via
  `next/font`. Fixed rem scale (no fluid clamps). Titles tracking `-0.02em`, weight 400–500.
- Mono is reserved for code/data/measurement + the network pill — never as generic "technical"
  costume on prose or nav.

### Layout & components
- App shell: sidebar (base ground) + content region; sidebar collapses below ~860px.
- Cards never nest. Stat card = mono value + small muted label. Tables: uppercase faint
  column heads, mono cells for IDs/amounts/tx, green status pill, copy + explorer affordances.
- Every interactive element ships default/hover/focus-visible/active/disabled; tables and feeds
  ship empty + loading (skeleton) + error(offline) states.
- Motion 150–250ms, ease-out, conveys state only (row-in highlight, tile change, live pulse).
  No page-load choreography.

### Bans (checked against this world's own materials)
- No dark-by-default, no neon accents, no gradient text, no glass/blur decoration, no colored
  `border-left` > 1px, no sparkline-as-content.
