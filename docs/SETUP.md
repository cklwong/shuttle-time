# Shuttle Time — setup guide

## Important correction

An earlier version of this guide described connecting Google Sheets directly
from the Claude artifact. **That doesn't work and never will:** Claude
artifacts run in a sandboxed iframe that blocks all outbound `fetch()` calls
except the built-in Anthropic API call and the special `window.storage` API.
There's no setting that opens this up — it's a security boundary of the
artifact platform itself.

`backend/Code.gs` is still correct and still needed — it just connects to the
**Phase 3 standalone site** (a plain webpage has no such sandbox), not to the
artifact. Skip straight to Phase 3 below if multi-device family sync matters
to you now.

## How the pieces fit together (current: artifact only)

```
 Your phone / your sons' phones (all via YOUR Claude account for now)
            │
            ▼
 ┌─────────────────────────┐
 │  Shuttle Time app       │
 │  (Claude artifact)      │
 └───────────┬─────────────┘
             │
             ▼
 ┌─────────────────────────┐
 │  Shared storage          │  ← built-in, syncs across devices signed into
 │  (Claude's storage)      │     the same Claude account. No setup needed.
 └─────────────────────────┘
```

- **Profiles**: on open, everyone picks who they are. Coach gets full access
  (optionally PIN-protected); each son sees and logs only his own sessions.
  This is a family courtesy lock, not real security.
- Claude accounts are for adults. Your sons shouldn't have their own Claude
  accounts — for now they use the app on your device/account.

## Phase 1 — today (nothing to set up)

1. Open the artifact, choose **Coach**, and set a PIN if you want one.
2. Rename the two player chips and set the tournament date.
3. Train from your phone/laptop; Devon and Eden pick their name when it's
   their turn on your device.

## Phase 2 — skip

There is no working Phase 2 inside the artifact. Go to Phase 3 when you want
Google Sheets and independent access for the boys.

## Phase 3 — standalone site (Sheets sync + boys' own access)

This is the version that gets you everything you originally asked for:
Google Sheets as the data store, a fast local cache mirroring it, and a URL
the boys can open on their own phones with a family PIN — no Claude account,
nothing published publicly.

1. **Create the Sheet.** Go to sheets.new, name it e.g. "Shuttle Time data".
2. **Add the script.** Extensions → Apps Script. Paste in `backend/Code.gs`.
3. **Set the secrets.** Project Settings → Script Properties:
   - `TOKEN` → any secret string (e.g. `devon-eden-smash`)
   - `ANTHROPIC_API_KEY` → get one at console.anthropic.com — needed here
     because the standalone site, unlike the artifact, has no built-in AI
     access. Pay-per-use, cents per month at family volume.
4. **Deploy.** Deploy → **New deployment** (not "manage deployments" on an
   old one — Apps Script often won't apply code changes otherwise) → type:
   **Web app** → Execute as: **Me** → Who has access: **Anyone** → Deploy.
   Authorize when prompted. Copy the web app URL.
5. **Test it in a real browser** (not from inside Claude — Claude can't
   reach it, by design): open
   `<your-web-app-URL>?action=load&token=<your-token>`
   You should see `{"ok":true,"data":{...}}`.
6. **Build the site.** Bring the URL and token to a Claude Code session (or
   back to this chat once we're on desktop) and ask for the standalone
   `index.html` port — it reuses everything already built, wired to fetch
   from your script instead of `window.storage`.
7. **Host it.** A GitHub repo with Pages enabled, or any static host. Add a
   simple family PIN gate (I'll build this in) so it's not a bare public URL.

Notes:
- "Who has access: Anyone" is required so the site can call the script
  without a Google login; the `TOKEN` is what actually keeps strangers out.
  Fine for family data, not for anything sensitive.
- The Sheet stays human-readable throughout — open it any time to browse,
  sort, or chart the raw training data yourself.

