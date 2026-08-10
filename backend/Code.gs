/**
 * Shuttle Time — Google Sheets backend
 * Turns this spreadsheet into a small JSON API for the badminton training hub.
 *
 * Tabs it manages (created automatically): players, exercises, sessions, meta.
 * Everything stays human-readable, so you can sort/chart the data in Sheets directly.
 *
 * Setup (see SETUP.md for the full walkthrough):
 *  1. In your Google Sheet: Extensions > Apps Script, paste this file over Code.gs.
 *  2. Project Settings (gear icon) > Script Properties, add:
 *       TOKEN              — any secret string you invent (the app must send it)
 *       ANTHROPIC_API_KEY  — optional, only needed for the AI coach on the web version
 *  3. Deploy > New deployment > Web app:
 *       Execute as: Me    |    Who has access: Anyone
 *  4. Copy the web app URL — that's your SHEETS_API_URL.
 */

const TABS = {
  players:   ["id", "name", "color"],
  exercises: ["id", "name", "type", "categories", "desc"],
  sessions:  ["id", "date", "title", "type", "playerIds", "duration", "blocks", "notes", "status", "feedback"],
  meta:      ["key", "value"],
};

/* ----------------------------- routing ----------------------------- */

function doGet(e) {
  return handle(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) {}
  return handle(p);
}

function handle(p) {
  var token = PropertiesService.getScriptProperties().getProperty("TOKEN") || "";
  if (token && p.token !== token) return out({ ok: false, error: "bad token" });

  if (p.action === "load") return out({ ok: true, data: load() });
  if (p.action === "save") {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000); // avoid two devices writing at once
    try { save(p.data || {}); } finally { lock.releaseLock(); }
    return out({ ok: true });
  }
  if (p.action === "ai") return out(ai(p));
  return out({ ok: false, error: "unknown action" });
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------- sheet utilities ------------------------- */

function sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(TABS[name]); }
  return sh;
}

function readRows(name) {
  var headers = TABS[name];
  var values = sheet(name).getDataRange().getValues();
  return values.slice(1)
    .filter(function (r) { return String(r[0]) !== ""; })
    .map(function (r) {
      var o = {};
      headers.forEach(function (h, i) { o[h] = r[i]; });
      return o;
    });
}

function writeRows(name, rows) {
  var headers = TABS[name];
  var sh = sheet(name);
  sh.clearContents();
  sh.appendRow(headers);
  if (rows.length) {
    sh.getRange(2, 1, rows.length, headers.length).setValues(rows.map(function (o) {
      return headers.map(function (h) { return o[h] === undefined || o[h] === null ? "" : o[h]; });
    }));
  }
}

function parseJson(v, fallback) {
  if (v === "" || v === undefined || v === null) return fallback;
  try {
    var x = JSON.parse(v);
    return x === null ? fallback : x;
  } catch (e) { return fallback; }
}

function fmtDate(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v).slice(0, 10);
}

/* ---------------------------- load / save --------------------------- */

function load() {
  var players = readRows("players").map(function (p) {
    return { id: String(p.id), name: String(p.name), color: String(p.color) };
  });

  var exercises = readRows("exercises").map(function (e) {
    return {
      id: String(e.id), name: String(e.name), type: String(e.type),
      categories: parseJson(e.categories, []), desc: String(e.desc || ""),
    };
  });

  var sessions = readRows("sessions").map(function (s) {
    return {
      id: String(s.id), date: fmtDate(s.date), title: String(s.title),
      type: String(s.type), playerIds: parseJson(s.playerIds, []),
      duration: Number(s.duration) || 90, blocks: parseJson(s.blocks, []),
      notes: String(s.notes || ""), status: String(s.status || "planned"),
      feedback: parseJson(s.feedback, undefined),
    };
  });

  var meta = {};
  readRows("meta").forEach(function (r) { meta[r.key] = r.value; });

  return {
    players: players,
    exercises: exercises,
    sessions: sessions,
    tournament: { name: String(meta.tournamentName || "Next tournament"), date: meta.tournamentDate ? fmtDate(meta.tournamentDate) : "" },
    settings: { coachPin: String(meta.coachPin || "") },
    updatedAt: Number(meta.updatedAt) || 0,
  };
}

function save(data) {
  writeRows("players", (data.players || []).map(function (p) {
    return { id: p.id, name: p.name, color: p.color };
  }));

  writeRows("exercises", (data.exercises || []).map(function (e) {
    return { id: e.id, name: e.name, type: e.type, categories: JSON.stringify(e.categories || []), desc: e.desc || "" };
  }));

  writeRows("sessions", (data.sessions || []).map(function (s) {
    return {
      id: s.id, date: s.date, title: s.title, type: s.type,
      playerIds: JSON.stringify(s.playerIds || []), duration: s.duration,
      blocks: JSON.stringify(s.blocks || []), notes: s.notes || "",
      status: s.status || "planned",
      feedback: s.feedback ? JSON.stringify(s.feedback) : "",
    };
  }));

  var t = data.tournament || {};
  var st = data.settings || {};
  writeRows("meta", [
    { key: "tournamentName", value: t.name || "" },
    { key: "tournamentDate", value: t.date || "" },
    { key: "coachPin", value: st.coachPin || "" },
    { key: "updatedAt", value: data.updatedAt || Date.now() },
  ]);
}

/* --------------------------- AI coach proxy -------------------------- */
/* Only needed for the standalone GitHub Pages version; the Claude       */
/* artifact has its own built-in AI access and never calls this.         */

function ai(p) {
  var key = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  if (!key) return { ok: false, error: "ANTHROPIC_API_KEY not set in Script Properties" };
  try {
    var resp = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
      method: "post",
      contentType: "application/json",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      payload: JSON.stringify({
        model: p.model || "claude-sonnet-4-6",
        max_tokens: p.max_tokens || 1500,
        messages: p.messages || [],
      }),
      muteHttpExceptions: true,
    });
    return { ok: true, result: JSON.parse(resp.getContentText()) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
