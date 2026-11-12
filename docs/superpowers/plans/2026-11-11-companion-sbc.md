# Companion SBC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build an installable standalone PWA for local club planning, FC 27 SBC and Gallery recommendations, and timestamped manual market-price tracking.

**Architecture:** Static HTML/CSS/JavaScript modules hosted as a PWA, with IndexedDB for the club, history, sets, and price snapshots. Solver logic is isolated from rendering and never calls EA, FUTBIN, or FUT.GG APIs; price actions open the provider pages and users enter the observed values.

**Tech Stack:** HTML, CSS, modern JavaScript modules, IndexedDB, Web App Manifest, Service Worker, GitHub Pages. No runtime framework or backend.

**Spec:** [../specs/2026-11-11-companion-sbc-design.md](../specs/2026-11-11-companion-sbc-design.md)

## Global Constraints

- “Os dados pessoais do elenco ficam no dispositivo. A aplicação não pede login EA nem envia o inventário para um servidor.”
- “Injetar código na EA Web App ou no Companion oficial, acessar a sessão, cookies, endpoints privados ou credenciais.” stays out of scope.
- “Cartas protegidas ficam sempre fora das sugestões de SBC.”
- “Na primeira versão, o solver valida somente os limites e requisitos que o usuário informou; não calcula química.”
- “O rating da escalação de SBC é calculado como estimativa usando uma fórmula comunitária para os 11 itens enviados.”
- “O usuário pode importar ou editar esses dados” and “exportação/importação de backup” remain supported.
- “Não buscar, raspar ou sincronizar automaticamente preços desses sites.”
- “Usar publicação estática e atualizações versionadas com changelog e confirmação explícita do usuário.”
- “Usar links externos para buscar a carta no FUTBIN e no FUT.GG.”
- Never submit SBCs, apply Gallery changes, move cards, open packs, or run market transactions.

## Review Focus

- Duplicate player versions and repeated copies: keep each item instance separate so the solver cannot reuse one card twice.
- Protected cards in both solver modes: exclude every protected item from SBC candidates; keep its protection state unchanged.
- Import with missing, malformed, or duplicate identifiers: explain row errors and do not silently replace the saved club.
- Stale or manually entered market prices: show provider, platform, timestamp, and that the value is manual.
- Item Score table changes by season or EA update: store a version label with the table and preserve the score version used by saved plans.

---

## File Map

- `index.html` — PWA document shell and accessible app mount point.
- `app.webmanifest` — install name, icons, theme, and standalone display settings.
- `assets/icon.svg` — app icon referenced by the manifest.
- `sw.js` — static asset cache and user-confirmed activation of new releases.
- `assets/app.css` — responsive layout, player cards, gallery, and SBC screens.
- `src/main.js` — app bootstrap and top-level navigation.
- `src/storage/database.js` — versioned IndexedDB setup and CRUD for app data.
- `src/storage/backup.js` — JSON backup import/export and CSV player import.
- `src/domain/player-items.js` — player item instance schema, validation, and status transitions.
- `src/domain/item-score.js` — versioned OVR/rarity/holographic score table and score calculation.
- `src/domain/sbc-requirements.js` — SBC challenge schemas and requirement validation.
- `src/domain/sbc-solver.js` — Item Score subset planner and traditional 11-card planner.
- `src/domain/gallery-planner.js` — manually entered Gallery Set filters, scores, and grade targets.
- `src/domain/market-prices.js` — manual quote records and provider URL builders; no data fetching.
- `src/ui/club-view.js` — club list, gallery filters, protected/duplicate controls, and manual history.
- `src/ui/sbc-view.js` — requirement forms, solver results, explanations, and manual use logging.
- `src/ui/gallery-view.js` — Set criteria and non-destructive Gallery recommendations.
- `src/ui/market-view.js` — price snapshots, age/source display, and external FUTBIN/FUT.GG links.
- `src/ui/settings-view.js` — keyboard shortcuts, data backup, update preferences, and help.
- `release.json` — published app version and short changelog for update prompts.
- `README.md` — local use, install, import schema, limitations, and release process.

## Task 1: Create the static PWA shell and local database

**Files:**
- Create: `index.html`
- Create: `app.webmanifest`
- Create: `sw.js`
- Create: `assets/app.css`
- Create: `src/main.js`
- Create: `src/storage/database.js`

**Interfaces:**
- `openDatabase() -> Promise<IDBDatabase>` creates schema version 1 with stores `playerItems`, `events`, `sbcPlans`, `gallerySets`, and `priceSnapshots`.
- `readAll(storeName) -> Promise<Array>` and `writeOne(storeName, value) -> Promise<void>` are the only database access functions used by UI modules.
- `main.js` opens the database, renders the primary navigation, and reports storage initialization failures without erasing data.

- [x] Create installable PWA shell with responsive navigation for Clube, SBCs, Gallery, Preços, and Configurações.
- [x] Create a simple SVG icon referenced by the web manifest.
- [x] Implement IndexedDB stores and versioned schema upgrades; make destructive database resets unavailable from normal navigation.
- [x] Add service worker caching for only app-owned static files and a prompt before activating a new app release.

## Task 2: Define player data, history, and safe import/export

**Files:**
- Create: `src/domain/player-items.js`
- Create: `src/storage/backup.js`
- Modify: `src/storage/database.js`
- Create: `src/ui/club-view.js`

**Interfaces:**
- `validatePlayerItem(input) -> {ok: boolean, value?: PlayerItem, errors: string[]}`.
- `PlayerItem` fields: `instanceId`, `itemId`, `name`, `ovr`, `position`, `league`, `nation`, `club`, `rarity`, `holographic`, `tradeable`, `duplicate`, `protected`, `status`, `notes`.
- `status` is `club`, `past`, or `used`; changing it adds an event and retains the item record.
- `exportBackup() -> Promise<Blob>` writes a versioned JSON backup; `importBackup(file, mode) -> Promise<ImportReport>` supports preview, rejects invalid records, and requires explicit confirmation before replace.
- `importPlayersCsv(file) -> Promise<ImportReport>` maps documented headers and reports row/column errors without replacing valid records.

- [x] Add player instance validation and preserve multiple copies of the same card as separate `instanceId` records.
- [x] Implement club filters, duplicate/protected toggles, past-club status, and an append-only manual history view.
- [x] Implement import preview, safe merge/replace confirmation, versioned JSON backup, and documented CSV field mapping.

## Task 3: Implement Item Score and the two SBC planning modes

**Files:**
- Create: `src/domain/item-score.js`
- Create: `src/domain/sbc-requirements.js`
- Create: `src/domain/sbc-solver.js`
- Create: `src/ui/sbc-view.js`
- Modify: `src/storage/database.js`

**Interfaces:**
- `calculateItemScore(item) -> {score, estimated, source}` uses manual final Item Score when present. Otherwise it uses the versioned official base OVR/quality table; rare/holographic bonuses are not invented and the result is labeled estimated where their values may apply.
- `SbcRequirement` fields include `mode`, `itemCount`, `targetItemScore`, `minimumPlayerOvr`, `minimumSquadRating`, `minimumByAttribute`, and `maximumByAttribute`; chemistry is not a supported field.
- `solveItemScoreSbc(items, requirement) -> SolveResult` excludes protected and ineligible cards, selects unique item instances, reaches target score, prioritizes duplicates then lower OVR, and minimizes overage after those priorities.
- `estimateTraditionalSbcRating(items) -> {rating: number, label: "estimate", formulaVersion: string}` applies the public 11-card community formula and surfaces an estimate warning.
- The estimate formula is explicit: `mean = sum(ovr) / 11`; `excess = sum(max(0, ovr - mean))`; `rating = floor(round(sum(ovr) + excess) / 11)`. Keep this as a versioned estimate, never label it official.
- `solveTraditionalSbc(items, requirement) -> SolveResult` returns the best eligible 11-item recommendation with a per-requirement explanation. Rank feasible results by fewer non-duplicates, then lower total OVR, then lower rating overage, then `instanceId` order.
- `SolveResult` includes `selectedInstanceIds`, `computedScore?`, `estimatedSquadRating?`, `unmetRequirements`, `explanation`, and `isFeasible`.

- [x] Add an EA-derived, versioned Item Score base table; accept the user-entered final score for special/holographic items and label fallback scores as estimates.
- [x] Implement Item Score planning with protected-card exclusion and deterministic lexicographic optimization: minimize selected non-duplicates, then total OVR, then Item Score overage, then order by `instanceId`.
- [x] Implement traditional 11-item planning with user-entered count constraints and an explicitly labeled estimate for Squad Rating; do not calculate chemistry.
- [x] Build the SBC form and results view with mode selection, item-level explanation, unmet-constraint diagnosis, and a manual “registrar como usado” action that updates history only after user confirmation.

## Task 4: Add the Gallery Set planner

**Files:**
- Create: `src/domain/gallery-planner.js`
- Create: `src/ui/gallery-view.js`
- Modify: `src/storage/database.js`

**Interfaces:**
- `GallerySet` stores `id`, `name`, explicit eligibility constraints, manually entered grade thresholds, and the score table version.
- `planGallerySet(items, set) -> GalleryPlan` returns eligible historical/club item instances, calculated Item Score, and the next user-entered grade threshold.
- Gallery planning may reuse one recorded item across multiple sets and never changes club, history, or protection state.

- [x] Implement user-created Gallery Sets with manually entered eligibility and grade thresholds.
- [x] Suggest eligible current or past items, calculate their Item Score, and show D/C/B/A/S target progress only when the user supplied those thresholds.
- [x] Keep “mark as added to Gallery” as a user-confirmed local event; never send a change to EA.

## Task 5: Add manual market snapshots and source links

**Files:**
- Create: `src/domain/market-prices.js`
- Create: `src/ui/market-view.js`
- Modify: `src/storage/database.js`

**Interfaces:**
- `PriceSnapshot` fields: `instanceId`, `source` (`futbin` or `fut.gg`), `platform` (`console` or `pc`), `coins`, and ISO `checkedAt`.
- `buildProviderUrl(item, source, platform) -> string` creates an external search/player link without reading provider page content.
- `recordPriceSnapshot(snapshot) -> Promise<void>` validates and stores a manual quote.

- [x] Add FUTBIN and FUT.GG outbound links for each player item.
- [x] Add manual price entry per provider/platform and show the value, source, timestamp, and age; label it as user-entered and not real time.
- [x] Do not fetch provider endpoints, scrape pages, or place provider keys in the app.

## Task 6: Add keyboard shortcuts, update prompt, and user documentation

**Files:**
- Create: `src/ui/settings-view.js`
- Create: `release.json`
- Create: `README.md`
- Modify: `src/main.js`
- Modify: `sw.js`
- Modify: `assets/app.css`

**Interfaces:**
- `shortcutMap` maps documented actions (`focusSearch`, `nextView`, `exportBackup`, `closeDialog`) to configurable key combinations.
- `checkRelease(currentVersion) -> Promise<ReleaseInfo|null>` reads only the static release manifest and displays version/changelog; service worker activation waits for explicit user confirmation.

- [x] Add remappable, disableable shortcuts scoped only to the PWA and list them in Settings/help.
- [x] Add version and changelog prompt without modifying player data; provide an update-later action.
- [x] Document data fields, manual backups, score/rating estimate limitations, manual prices, and excluded EA actions.

## Task 7: Prepare the public static release

**Files:**
- Create or modify: `README.md`
- Configure: GitHub Pages publishing from the project root.

- [x] Set relative static paths and release version for a root-based static host.
- [x] Prepare the public PWA package without including user inventory, credentials, or AI attribution.
- [ ] Configure a GitHub Pages repository and publish as the final external action. This checkout has no Git remote or existing reusable repository. Creating a public GitHub repository requires an action-time confirmation under the computer-use confirmation policy; the app package is ready.

## Delivery review checklist

- Every core screen operates without EA login and stores club data only in local IndexedDB.
- SBC recommendations cannot include protected items or reuse one `instanceId` twice.
- The simplified SBC mode uses the versioned Item Score table; traditional rating is always labeled as an estimate; chemistry remains unsupported.
- Gallery advice is non-destructive and can include items marked past/used.
- Prices are manually entered, attributed, timestamped, and accompanied by links; no automatic data extraction occurs.
- Keyboard shortcuts affect only the PWA, and updates require user confirmation.
