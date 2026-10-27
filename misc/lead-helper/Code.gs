/**
 * Quotely Pro – Lead Helper logger.
 * Google Apps Script web app bound to the Growth Tracker sheet. For every event it
 *   1. appends one raw row to the "Website Leads" tab (unchanged format), and
 *   2. keeps one readable row per visit (session_id) up to date in the "Visitors" tab.
 * Deploy steps: see README.md in this folder.
 *
 * The website posts JSON as text/plain with mode "no-cors", so it never reads the response.
 * Anything that is not a valid event is ignored. Only known fields are stored, as short text.
 * Events can arrive out of order (each one is a separate script run), so the Visitors row is
 * merged in an order-independent way: steps only move forward and answers are never blanked.
 */

var SHEET_NAME = 'Website Leads';
var VISITORS_SHEET_NAME = 'Visitors';
var TIME_ZONE = 'Asia/Kolkata';

// Raw tab columns, in order. "timestamp" is set here, not by the browser.
var COLUMNS = [
  'timestamp', 'session_id', 'page_slug', 'page_type', 'industry', 'event', 'question', 'answer',
  'quotes_per_day', 'current_method', 'visitor_type', 'source', 'device', 'referrer', 'phone', 'visitor_id'
];

// Visitors tab columns, in order: one row per session_id.
var VISITOR_COLUMNS = [
  'first_seen', 'last_seen', 'session_id', 'page_slug', 'industry', 'source', 'device', 'visitor_type',
  'current_method', 'quotes_per_day', 'furthest_step', 'downloaded', 'whatsapp', 'phone', 'result'
];

var ALLOWED_EVENTS = [
  'shown', 'opened', 'closed', 'hook_yes', 'hook_no', 'answered', 'skipped', 'whatsapp_click', 'download_click',
  'toast_whatsapp_click', 'inline_whatsapp_click', 'number_submitted',
  // self-serve signup funnel (raw tab only, not the Visitors summary)
  'signup_started', 'signup_completed', 'onboarding_step', 'first_quote_created', 'first_pdf_downloaded',
  // website editor + save-as-signup funnel, and the Lead Helper's signup button
  'editor_opened', 'editor_edited', 'save_click', 'google_prompt_opened', 'google_prompt_closed', 'draft_imported', 'signup_click',
  'item_added', 'custom_pdf_whatsapp_click'
];
var FUNNEL_EVENTS = [
  'signup_started', 'signup_completed', 'onboarding_step', 'first_quote_created', 'first_pdf_downloaded',
  'editor_opened', 'editor_edited', 'save_click', 'google_prompt_opened', 'google_prompt_closed', 'draft_imported', 'signup_click',
  'item_added', 'custom_pdf_whatsapp_click'
];

// Max length per field. Unlisted fields are dropped.
var MAX_LENGTH = {
  session_id: 64, page_slug: 100, page_type: 20, industry: 60, event: 24, question: 40, answer: 60,
  quotes_per_day: 20, current_method: 40, visitor_type: 30, source: 60, device: 10, referrer: 200, phone: 13, visitor_id: 64
};

// How far into the chat the visit got. Higher wins.
var STEP_RANK = { shown: 1, opened: 2, hook: 3, current_method: 4, quotes_per_day: 5, result: 6, end: 7 };
var WHATSAPP_EVENTS = ['whatsapp_click', 'toast_whatsapp_click', 'inline_whatsapp_click'];
var DOWNLOAD_NAMES = { pdf: 'pdf', xlsx: 'excel', docx: 'word' };
var VISITOR_CACHE_SECONDS = 6 * 60 * 60;
var RETURNING_NOTE = 'Returning visitor: answers remembered from an earlier visit';
// Events that mean the visitor answered in this session.
var ANSWER_EVENTS = ['hook_yes', 'hook_no', 'answered'];

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 4000) return done_();
    var data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || ALLOWED_EVENTS.indexOf(data.event) === -1) return done_();
    if (!clean_(data.session_id, MAX_LENGTH.session_id)) return done_();

    var strNow = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
    var row = COLUMNS.map(function (col) {
      if (col === 'timestamp') return strNow;
      if (col === 'phone') return clean_(phone_(data), MAX_LENGTH.phone);
      return clean_(data[col], MAX_LENGTH[col]);
    });

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet_(SHEET_NAME, COLUMNS).appendRow(row);
      if (FUNNEL_EVENTS.indexOf(data.event) === -1) upsertVisitor_(data, strNow);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // Ignore bad input; the website never reads the response.
  }
  return done_();
}

// The number a visitor typed in the chat ("+91" + 10-digit Indian mobile). Kept only on
// "number_submitted" rows and only in that exact shape; anything else is left blank.
function phone_(data) {
  var p = typeof data.phone === 'string' ? data.phone : '';
  return data.event === 'number_submitted' && /^\+91[6-9]\d{9}$/.test(p) ? p : '';
}

// Plain text only, trimmed, cut to the max length. A leading = + - @ gets a ' so Sheets
// never treats a value as a formula.
function clean_(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  var text = String(value).replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLength || 100);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

// The tab, created with a bold frozen header if missing; the header is kept in step with columns.
function sheet_(strName, lstColumns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(strName) || ss.insertSheet(strName);
  if (sheet.getLastRow() === 0) sheet.appendRow(lstColumns);
  var header = sheet.getRange(1, 1, 1, lstColumns.length);
  if (header.getValues()[0].join('|') !== lstColumns.join('|')) header.setValues([lstColumns]);
  header.setFontWeight('bold');
  if (sheet.getFrozenRows() !== 1) sheet.setFrozenRows(1);
  return sheet;
}

// ---- Visitors tab ------------------------------------------------------------------------

// The chat step a "question" value names. Every event carries the step the chat was on (closed,
// opened, answered, clicks…), so any of them proves the visitor got that far. Page-level
// questions (teaser, toast, page, inline, launcher) are not chat steps.
var QUESTION_STEP = {
  hook: 'hook', industry: 'hook', download: 'hook',
  current_method: 'current_method', quotes_per_day: 'quotes_per_day', result: 'result', end: 'end'
};

// Furthest step an event proves: the higher of its event type and its question.
function stepOf_(data) {
  var strFromEvent = stepOfEvent_(data);
  var strFromQuestion = QUESTION_STEP[typeof data.question === 'string' ? data.question : ''] || '';
  return (STEP_RANK[strFromQuestion] || 0) > (STEP_RANK[strFromEvent] || 0) ? strFromQuestion : strFromEvent;
}

function stepOfEvent_(data) {
  var q = typeof data.question === 'string' ? data.question : '';
  switch (data.event) {
    case 'shown': return 'shown';
    case 'opened': return 'opened';
    case 'hook_yes':
    case 'hook_no': return 'hook';
    case 'answered':
      if (q === 'industry') return 'hook';
      if (q === 'current_method' || q === 'quotes_per_day') return q;
      return '';
    case 'whatsapp_click': return q === 'result' ? 'result' : q === 'end' ? 'end' : '';
    case 'download_click': return q === 'result' || q === 'download' || q === 'end' ? 'end' : '';
    case 'number_submitted': return 'end';
    default: return '';
  }
}

// Outcome label from the merged row, so it does not depend on the order events arrived in.
// blnReturning: the answers came from an earlier visit (see upsertVisitor_).
function resultOf_(objRow, blnReturning) {
  if (objRow.whatsapp === 'Yes') return '🟢 WhatsApp lead';
  if (objRow.phone) return '📞 Number given';
  if (objRow.downloaded) return '📥 Downloaded only';
  if (blnReturning) return '🔁 Returning, saw offer, left';
  var intRank = STEP_RANK[objRow.furthest_step] || 0;
  if (intRank >= STEP_RANK.hook) return '🟡 Answered, left at ' + objRow.furthest_step;
  if (objRow.furthest_step === 'opened') return '⚪ Opened, no answer';
  return 'Seen teaser only';
}

// Row number of this session in the Visitors tab, or 0. Cache first, then a TextFinder on
// the session_id column (the cache is checked against the sheet, so deleted rows are safe).
function findVisitorRow_(sheet, strSid) {
  var intSidCol = VISITOR_COLUMNS.indexOf('session_id') + 1;
  var cache = CacheService.getScriptCache();
  var strCached = cache.get('v:' + strSid);
  if (strCached) {
    var intRow = Number(strCached);
    if (intRow > 1 && intRow <= sheet.getLastRow() && String(sheet.getRange(intRow, intSidCol).getValue()) === strSid) return intRow;
  }
  if (sheet.getLastRow() < 2) return 0;
  var found = sheet.getRange(2, intSidCol, sheet.getLastRow() - 1, 1).createTextFinder(strSid).matchEntireCell(true).findNext();
  if (!found) return 0;
  cache.put('v:' + strSid, String(found.getRow()), VISITOR_CACHE_SECONDS);
  return found.getRow();
}

// Create or update the visit's row. Called inside the doPost lock.
function upsertVisitor_(data, strNow) {
  var sheet = sheet_(VISITORS_SHEET_NAME, VISITOR_COLUMNS);
  var strSid = clean_(data.session_id, MAX_LENGTH.session_id);
  var intRow = findVisitorRow_(sheet, strSid);

  var objRow = {};
  if (intRow) {
    var lstOld = sheet.getRange(intRow, 1, 1, VISITOR_COLUMNS.length).getValues()[0];
    VISITOR_COLUMNS.forEach(function (col, i) {
      var v = lstOld[i];
      // Sheets turns "yyyy-MM-dd HH:mm:ss" text into a date; read it back in the same shape.
      if (Object.prototype.toString.call(v) === '[object Date]') v = Utilities.formatDate(v, TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
      objRow[col] = v === null || v === undefined ? '' : String(v);
    });
  } else {
    VISITOR_COLUMNS.forEach(function (col) { objRow[col] = ''; });
    objRow.first_seen = strNow;
    objRow.session_id = strSid;
  }
  objRow.last_seen = strNow;

  // Returning visitor: method / quotes arrive on events that are not answers (opened, shown,
  // closed, clicks), so they came from an earlier visit, and no answer was given in this
  // session. Any answer event (even one that arrives late) means they answered here, which
  // clears the flag. Kept as a note on the session_id cell (no extra column); "answered here"
  // is kept in the script cache, which outlives any single visit.
  var intSidCol = VISITOR_COLUMNS.indexOf('session_id') + 1;
  var cache = CacheService.getScriptCache();
  var blnAnswerEvent = ANSWER_EVENTS.indexOf(data.event) !== -1;
  if (blnAnswerEvent) cache.put('a:' + strSid, '1', VISITOR_CACHE_SECONDS);
  var blnAnsweredHere = blnAnswerEvent || cache.get('a:' + strSid) === '1';
  var blnReturning = !blnAnsweredHere && (
    (intRow && sheet.getRange(intRow, intSidCol).getNote() === RETURNING_NOTE) ||
    !!(clean_(data.current_method, MAX_LENGTH.current_method) || clean_(data.quotes_per_day, MAX_LENGTH.quotes_per_day))
  );

  // Answers: fill only when the new value is known; never blank a known one. "unknown" is not an answer.
  ['page_slug', 'industry', 'source', 'device', 'visitor_type', 'current_method', 'quotes_per_day'].forEach(function (col) {
    var v = clean_(data[col], MAX_LENGTH[col]);
    if (v && !(col === 'visitor_type' && v === 'unknown')) objRow[col] = v;
  });
  if (!objRow.visitor_type && clean_(data.visitor_type, MAX_LENGTH.visitor_type) === 'unknown') objRow.visitor_type = 'unknown';

  // Steps only move forward.
  var strStep = stepOf_(data);
  if (strStep && (STEP_RANK[strStep] || 0) > (STEP_RANK[objRow.furthest_step] || 0)) objRow.furthest_step = strStep;

  if (data.event === 'download_click') {
    var strFormat = DOWNLOAD_NAMES[String(data.answer || '').toLowerCase()];
    if (strFormat) {
      var lstFormats = objRow.downloaded ? objRow.downloaded.split(', ') : [];
      if (lstFormats.indexOf(strFormat) === -1) lstFormats.push(strFormat);
      objRow.downloaded = lstFormats.join(', ');
    }
  }
  if (WHATSAPP_EVENTS.indexOf(data.event) !== -1) objRow.whatsapp = 'Yes';
  else if (!objRow.whatsapp) objRow.whatsapp = 'No';
  var strPhone = phone_(data);
  if (strPhone) objRow.phone = strPhone;

  objRow.result = resultOf_(objRow, blnReturning);

  // Everything is written through clean_ (formula protection), with no extra length cut.
  var lstValues = VISITOR_COLUMNS.map(function (col) { return clean_(objRow[col], 200); });
  if (intRow) {
    sheet.getRange(intRow, 1, 1, lstValues.length).setValues([lstValues]);
  } else {
    sheet.appendRow(lstValues);
    intRow = sheet.getLastRow();
    cache.put('v:' + strSid, String(intRow), VISITOR_CACHE_SECONDS);
  }
  var cellSid = sheet.getRange(intRow, intSidCol);
  var strNote = blnReturning ? RETURNING_NOTE : '';
  if (cellSid.getNote() !== strNote) cellSid.setNote(strNote);
}

function done_() {
  return ContentService.createTextOutput('ok');
}

// Run once from the editor (select testPost ▶ Run) to check both tabs. Delete the test rows after.
function testPost() {
  var strSid = 'test-' + Date.now();
  var base = { session_id: strSid, page_slug: 'cctv-quotation-format', page_type: 'industry', industry: 'cctv',
    question: '', answer: '', quotes_per_day: '', current_method: '', visitor_type: 'unknown',
    source: 'direct', device: 'desktop', referrer: '' };
  var post = function (patch) {
    var obj = {};
    Object.keys(base).forEach(function (k) { obj[k] = base[k]; });
    Object.keys(patch).forEach(function (k) { obj[k] = patch[k]; });
    doPost({ postData: { contents: JSON.stringify(obj) } });
  };
  post({ event: 'shown' });
  post({ event: 'opened', answer: 'teaser' });
  post({ event: 'hook_yes', question: 'hook', answer: 'yes', visitor_type: 'owner' });
  post({ event: 'answered', question: 'current_method', answer: 'Excel', current_method: 'Excel', visitor_type: 'owner' });
  post({ event: 'answered', question: 'quotes_per_day', answer: '2–5', current_method: 'Excel', quotes_per_day: '2–5', visitor_type: 'owner' });
}
