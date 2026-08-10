# Shuttle Time 🏸

A family badminton training hub for Devon and Eden: plan and log sessions,
build an exercise bank, get AI-drafted sessions and tournament build-up
programs, and track weekly/monthly progress.

## Current architecture

```
Claude artifact (UI)  ──►  Claude shared storage (sync across devices
                            signed into the same Claude account)
```

The app runs today as a **Claude artifact**. Artifacts run in a sandboxed
iframe that blocks all outbound network calls except the built-in Anthropic
API call and the special `window.storage` API — so Google Sheets **cannot**
be reached from inside the artifact, on any device, ever. That's a platform
security boundary, not a bug to fix. See `docs/SETUP.md` for the full
explanation and what it means for the roadmap below.

## Repo layout

| Path | What it is |
|---|---|
| `app/badminton-training-hub.jsx` | The full app — runs as a Claude artifact today. Will be ported to a standalone `index.html` for Phase 3. |
| `backend/Code.gs` | Google Apps Script: turns a Google Sheet into a JSON API (load/save + an Anthropic proxy). Written and deployable now, but only usable once Phase 3 exists — an artifact can't call it. |
| `docs/SETUP.md` | Explains the sandbox limitation, current usage (Phase 1), and the Phase 3 plan for Sheets sync + independent access for Devon and Eden. |

## Roadmap

- **Phase 1 (current, done):** artifact + shared storage. Coach/player
  profiles, exercise bank, session planning/logging, AI single-session and
  multi-week build-up coach, effort ratings, printable sheets, on-court/
  off-court/running session types.
- **Phase 2:** skipped — not possible inside an artifact.
- **Phase 3 (next, needs Claude Code + desktop):** port `app/` to a
  standalone `index.html`, wire it to `backend/Code.gs` (already written)
  and a Google Sheet, host on GitHub Pages, add a family PIN gate so Devon
  and Eden can use it on their own phones without a Claude account.

## Development workflow

- Phase 1 changes happen in a Claude chat/Project (artifact-only APIs).
  After each change, the updated `.jsx` is committed here for history.
- Phase 3 build happens with **Claude Code** pointed at this repo, since it
  needs real file/deploy tooling outside the artifact sandbox.

## Status

- [x] Exercise bank with keyword categories (incl. running workouts)
- [x] Session planning/logging, 30–180 min, same-day multi-session support
- [x] AI coach: single sessions + multi-week tournament build-up (on/off-court split)
- [x] Effort ratings per player, printable courtside sheets
- [x] Coach/player profiles (Devon, Eden), color picker, shared-storage sync
- [x] Google Sheets backend script written and deployable (`backend/Code.gs`)
- [ ] Phase 3: standalone site built and connected to Sheets
- [ ] Family PIN gate on the standalone site
