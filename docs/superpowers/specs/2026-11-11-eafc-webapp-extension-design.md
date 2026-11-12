# EA FC Web App Companion Extension — design

Date: 2026-11-11

## Intent

Turn the local Club Companion into a Chrome extension that runs on the EA SPORTS FC Ultimate Team Web App and helps inspect the visible club, plan SBC squads, preserve a local player history, link to FUTBIN/FUT.GG, and skip pack-opening animations when the user enables that behavior.

## User decisions carried forward

- Build a Chrome extension integrated with the official EA Web App even though EA advises against third-party extensions.
- Protected player items must never be suggested for SBCs.
- SBC solver validates only the limits entered by the user and does not calculate chemistry.
- Prefer duplicates first, then lower OVR.
- Support traditional and FC 27 Item Score SBCs; estimate traditional Squad Rating with the public community formula and label it as an estimate.
- Use manual price snapshots and links to FUTBIN/FUT.GG; do not scrape or sync prices.
- Keep Gallery Sets and historical player tracking.
- Add keyboard shortcuts scoped to the Web App.
- The user previously requested direct-to-club actions and automatic pack-animation skipping.

## Architecture

Use Chrome Manifest V3 with a content script restricted to the EA Web App host and path. The content script adds an isolated companion panel and reads the visible DOM only. The extension stores the user’s roster, protected flags, plans, Gallery events, preferences, and manual prices in `chrome.storage.local`. It does not call EA APIs, access cookies, inspect network requests, or transmit roster data to a server.

The authenticated Web App was observed on 2026-11-12. The club uses `main li.listFUTItem`; OVR and position are under `.entityContainer .player.item`, and names are under `.name.untradeable` or `.main-view.name`. The DME builder renders candidate items in `.ut-one-click-sbc-work-area-item-view`, but those nodes expose no stable card ID or name in the DOM snapshot. Club scanning is now mapped to the observed list. DME autofill remains disabled until candidates can be matched reliably. Pack-opening UI was not observed.

## Behaviors

- Read card details only from visible Web App card elements and allow a manual/CSV correction path if the page does not expose a field.
- Build SBC suggestions locally; exclude protected cards and never reuse a physical item instance.
- Fill visible SBC slots only after the user chooses a solution. Require a final explicit user action before submitting an SBC because submission consumes items irreversibly.
- A user toggle may automatically activate the visible pack “skip/continue” control after a pack is opened by the user. Do not purchase or open packs automatically.
- Send-to-club is user-triggered on a visible item action and confirms the number of items before applying the EA action.
- FUTBIN/FUT.GG links and manual price records only.
- Keyboard shortcuts operate only while the EA Web App tab is active and do not submit an SBC or send an item by themselves.

## Risk and limits

EA currently recommends avoiding third-party browser extensions and disallows bots/automation. The user chose to proceed with that risk. The implementation still avoids credentials, cookies, private APIs, market transactions, and unattended SBC submission. UI automation is brittle: EA page updates can break detection and will require versioned extension updates.

## Approaches considered

1. **Read/write undocumented EA endpoints or session data:** rejected due credential/session exposure and dependence on private APIs.
2. **Inject a DOM-based panel into the visible Web App:** selected because it uses the user-facing controls, requires no login handling by the extension, and supports the requested integration. It is brittle and remains subject to EA restrictions.
3. **Keep the PWA independent:** does not meet the user's latest request for an extension connected to the Web App.

## Success criteria

The extension loads only on the official Web App, stores the club locally, builds explainable SBC suggestions while excluding protected cards, and opens manual market links. DME autofill is not yet a success criterion because the observed candidate surface has no stable public DOM identity. It never submits SBCs unattended or opens/purchases packs automatically.
