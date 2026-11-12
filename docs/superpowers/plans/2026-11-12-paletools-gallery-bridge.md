# Paletools Gallery Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Automated tests are not run unless the user asks.

**Goal:** Let the user open the visible Paletools Gallery from Club Companion and see which Paletools version is loaded.

**Architecture:** The existing content script locates visible controls by exact accessible label, clicks only navigation controls after an explicit companion button/shortcut action, then opens `Open Gallery`. The Paletools UI handles its own market action and destination selection.

**Tech Stack:** Chrome Manifest V3, vanilla JavaScript, CSS, Markdown.

**Spec:** [../specs/2026-11-12-paletools-gallery-bridge-design.md](../specs/2026-11-12-paletools-gallery-bridge-design.md)

## Global Constraints

- Do not embed or execute the Paletools userscript.
- Do not perform a buy, sell, list, transfer, pack, or destination action.
- Do not add extension permissions, requests, or price synchronization.
- Only navigate visible Paletools UI after the user invokes the companion button or `Alt+G`.

## Review Focus

- Paletools missing or renamed: show a clear notice and stop.
- Already in Gallery: report that the Gallery is open without clicking another control.
- Delayed SPA render: wait for the visible `Open Gallery` control with a finite timeout.
- Version not exactly `v27.2.1`: disable the destination selector and report detected version instead of guessing.
- Destination controls missing or outside the same purchased-item dialog: do not render or click them.
- Text inputs focused: preserve existing shortcut guard so `Alt+G` does not interrupt typing.

---

### Task 1: Add the visible Gallery bridge

**Files:**
- Modify: `extension/content.js`
- Modify: `extension/manifest.json`
- Modify: `extension/release.json`
- Modify: `extension/README.md`
- Modify: `README.md`
- Create: `docs/superpowers/specs/2026-11-12-paletools-gallery-bridge-design.md`
- Create: `docs/superpowers/plans/2026-11-12-paletools-gallery-bridge.md`

**Interfaces:**
- Add `openPaletoolsGallery()` to drive only the visible `Paletools` and `Open Gallery` buttons.
- Add `detectPaletoolsVersion()` reading the version label from the visible Web App text.

- [x] Add `Alt+G`, a Gallery-tab launcher, and a Links entry for the official Paletools page/version.
- [x] Implement exact-label visible-control lookup, detect the current Gallery, and wait up to 2.5 seconds for `Open Gallery`.
- [x] Offer Club/Transfer List destinations only for a matching visible bought-item dialog containing both options; re-find the chosen control after the user's confirmation, then click only that destination.
- [x] Bump extension version/release metadata and document the integration boundary.
- [x] Run syntax/JSON/diff checks only, inspect unchanged host permissions, update the Obsidian project note, commit and push to the already authorized public repository.
