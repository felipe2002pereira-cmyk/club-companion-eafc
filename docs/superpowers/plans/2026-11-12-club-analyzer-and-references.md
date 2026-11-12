# Club Analyzer and References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Automated tests are not run unless the user asks.

**Goal:** Add a local roster breakdown and a reference links tab to the Chrome companion.

**Architecture:** Extend the existing Shadow DOM UI in `extension/content.js`; aggregate registered `club` players locally at render time. Add only external links, no imported third-party code or permissions.

**Tech Stack:** Chrome Manifest V3, vanilla JavaScript, CSS, Markdown.

**Spec:** [../specs/2026-11-12-club-analyzer-and-references-design.md](../specs/2026-11-12-club-analyzer-and-references-design.md)

## Global Constraints

- Only analyze locally stored cards whose status is `club`.
- Mark missing league, club, position, and rarity as “Sem informação”.
- Do not add network access, permissions, third-party code, or market automation.
- Explain that club scanning is limited to visible pages; CSV/manual entry is needed for fuller coverage.

## Review Focus

- Empty roster: present an explicit empty state.
- Missing category values: count them as “Sem informação”, not as omitted cards.
- Historical/used cards: exclude them from active-club analysis.
- Untrusted names/categories: HTML-escape before rendering.
- External links: open only on explicit user click in a new tab with `noopener noreferrer`.

---

### Task 1: Add local club analysis and project references

**Files:**
- Modify: `extension/content.js`
- Modify: `extension/content.css`
- Modify: `extension/manifest.json`
- Modify: `extension/release.json`
- Modify: `extension/README.md`
- Modify: `README.md`
- Create: `docs/superpowers/specs/2026-11-12-club-analyzer-and-references-design.md`
- Create: `docs/superpowers/plans/2026-11-12-club-analyzer-and-references.md`

**Interfaces:**
- Render aggregation from the existing `state.players` objects (`name`, `ovr`, `position`, `league`, `club`, `rarity`, `status`).
- Add `Análise` and `Links` tabs to the existing nav and route map.

- [x] Add analysis rendering for active club cards: count by normalized position family and exact position, league, club, and rarity; display missing data explicitly.
- [x] Add link cards for FUTClubAnalyzer, EasyFUT, and FUT-Trader, plus a statement that FUT-Trader is reference-only and its market automation/CAPTCHA solver are not included.
- [x] Add compact styles, bump extension version/release metadata, and document partial scan coverage.
- [x] Verify `content.js` syntax, `manifest.json` and `release.json` parse, and inspect the diff for data escaping and unchanged minimal permissions. Do not run an automated test suite.
- [x] Update the Obsidian project note after the work is published, recording actual validation and deliverables.
