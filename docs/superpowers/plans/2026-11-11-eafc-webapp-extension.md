# EA FC Web App Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Automated tests are not run unless the user asks.

**Goal:** Add a Chrome Manifest V3 extension integrated with the visible EA FC 27 Web App while retaining local-only club planning.

**Architecture:** A narrow host-matched content script injects a Shadow DOM companion panel. It reads visible card DOM and invokes visible controls only after user action. `chrome.storage.local` stores the club and preferences. No cookies, private endpoints, request interception, or server.

**Tech Stack:** Chrome Manifest V3, plain JavaScript, CSS, `chrome.storage.local`.

**Spec:** [../specs/2026-11-11-eafc-webapp-extension-design.md](../specs/2026-11-11-eafc-webapp-extension-design.md)

## Global Constraints

- Only run the content script on the official EA Ultimate Team Web App path.
- Protected items are never offered to SBC plans.
- Manual price entry only; no FUTBIN/FUT.GG scraping.
- Never access cookies, private APIs, web requests, credentials, or authentication pages.
- Never buy/open packs automatically or submit SBCs unattended.
- Keep player data in `chrome.storage.local` and do not transmit it.
- Report the Web App screens that could not be verified because the current page is unauthenticated.

## Review Focus

- Duplicate physical copies: each DOM card instance has a distinct stable ID and is never selected twice.
- Protected status: set locally by user and excluded from every SBC candidate list.
- EA route changes: extension does nothing outside the exact configured match pattern.
- Missing or changed card selectors: show “not detected” and offer manual/CSV input; never infer a false club inventory.
- Irreversible controls: final SBC submit and direct-to-club operations require an explicit user confirmation.

## Live UI findings (2026-11-12)

- Authenticated club roster cards use `main li.listFUTItem`; OVR/position are under `.entityContainer .player.item` and names under `.name.untradeable` or `.main-view.name`.
- The club roster is paginated. Scan each loaded page and verify the expected count.
- FUTGenie may add a card/player ID as a DOM attribute. Without it, the extension uses a provisional signature that can change if card order changes.
- The DME candidate surface uses `.ut-one-click-sbc-work-area-item-view` but does not expose stable IDs or names; automatic selection is intentionally blocked there.
- Pack-opening controls have not been observed on the authenticated page.

## File Map

- `extension/manifest.json` — MV3 manifest, narrow scope, minimal permissions.
- `extension/content.js` — page adapter, Shadow DOM panel, local commands, keyboard shortcuts.
- `extension/content.css` — panel and overlay styles.
- `extension/core/club.js` — roster model, protected flags, local history.
- `extension/core/solver.js` — two SBC planners and score estimates.
- `extension/core/ea-dom.js` — visible card scanning and explicit visible-control actions.
- `extension/core/prices.js` — manual quote history and provider links.
- `extension/README.md` — unpacked install, permissions, unsupported screens, risk.
- `extension/release.json` — extension version/changelog.

## Task 1: Create the restricted extension shell

- [ ] Add Manifest V3, scoped EA URL match, local storage permission, and no cookie/network permissions.
- [ ] Add Shadow DOM panel and hide/show action with route-aware initialization.
- [ ] Confirm through static inspection that no files run on the EA login host or unrelated domains.

## Task 2: Add visible club scanning and local inventory

- [ ] Implement an adapter that scans only recognizable visible player-card containers.
- [ ] Keep one stable `instanceId` per physical card and persist the last scan locally.
- [ ] Show a clear failure state if the current page does not expose reliable card fields; support manual correction and protected flags.

## Task 3: Add SBC planning and visible squad fill

- [ ] Port the current local solver into extension-safe scripts.
- [ ] Support Item Score target, optional player count, traditional 11-player requirements, and estimated rating.
- [ ] Exclude protected cards and explain why every selected card was chosen.
- [ ] Map chosen item IDs to visible SBC slot controls only after user action; require confirmation before final submission.

## Task 4: Add Gallery and market helpers

- [ ] Support local Gallery Sets/history and manually entered thresholds.
- [ ] Add FUTBIN/FUT.GG player-page links and user-entered price snapshots.
- [ ] Keep all reads/writes local; make no market-data requests.

## Task 5: Add requested keyboard and pack/club actions

- [ ] Add documented shortcuts scoped to the active EA Web App page.
- [ ] Add opt-in skip-animation action for a visible skip/continue control after user opens a pack.
- [ ] Add user-triggered send-to-club action with a confirmation and a local history entry.
- [ ] Leave auto-open/auto-purchase packs, auto-submit SBCs, and market transactions unavailable.

## Task 6: Package and hand off

- [ ] Document Load unpacked steps and extension permission scope.
- [ ] Run syntax checks only; no automated tests unless user requests them.
- [ ] Recheck the extension match pattern and verify the extension does not request cookies or broad host access.
- [ ] Do not publish/install the extension until the user reviews the concrete package; the previously created public repository remains empty.
