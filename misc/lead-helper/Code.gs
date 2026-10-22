/**
 * Quotely Pro – Lead Helper logger.
 * Google Apps Script web app bound to the Growth Tracker sheet. Appends one row per event
 * to the "Website Leads" tab. Deploy steps: see README.md in this folder.
 *
 * The website posts JSON as text/plain with mode "no-cors", so it never reads the response.
 * Anything that is not a valid event is ignored. Only known fields are stored, as short text.
 */

var SHEET_NAME = 'Website Leads';
var TIME_ZONE = 'Asia/Kolkata';

// Columns, in order. "timestamp" is set here, not by the browser.
var COLUMNS = [
  'timestamp', 'session_id', 'page_slug', 'page_type', 'industry', 'event', 'question', 'answer',
  'quotes_per_day', 'current_method', 'visitor_type', 'source', 'device', 'referrer', 'phone'
];

var ALLOWED_EVENTS = [
  'shown', 'opened', 'closed', 'hook_yes', 'hook_no', 'answered', 'skipped', 'whatsapp_click', 'download_click',
  'toast_whatsapp_click', 'inline_whatsapp_click', 'number_submitted'
];

// Max length per field. Unlisted fields are dropped.
var MAX_LENGTH = {
  session_id: 64, page_slug: 100, page_type: 20, industry: 60, event: 20, question: 40, answer: 60,
  quotes_per_day: 20, current_method: 40, visitor_type: 30, source: 60, device: 10, referrer: 200, phone: 13
};

// The number a visitor typed in the chat ("+91" + 10-digit Indian mobile). Kept only on
// "number_submitted" rows and only in that exact shape; anything else is left blank.
function phone_(data) {
  var p = typeof data.phone === 'string' ? data.phone : '';
  return data.event === 'number_submitted' && /^\+91[6-9]\d{9}$/.test(p) ? p : '';
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 4000) return done_();
    var data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || ALLOWED_EVENTS.indexOf(data.event) === -1) return done_();
    if (!clean_(data.session_id, MAX_LENGTH.session_id)) return done_();

    var row = COLUMNS.map(function (col) {
      if (col === 'timestamp') return Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
      if (col === 'phone') return clean_(phone_(data), MAX_LENGTH.phone);
      return clean_(data[col], MAX_LENGTH[col]);
    });

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet_().appendRow(row);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // Ignore bad input; the website never reads the response.
  }
  return done_();
}

// Plain text only, trimmed, cut to the max length. A leading = + - @ gets a ' so Sheets
// never treats a value as a formula.
function clean_(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  var text = String(value).replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLength || 100);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
  }
  // Keep the header in step with COLUMNS (e.g. the "phone" column added later).
  var header = sheet.getRange(1, 1, 1, COLUMNS.length);
  if (header.getValues()[0].join('|') !== COLUMNS.join('|')) header.setValues([COLUMNS]);
  header.setFontWeight('bold');
  return sheet;
}

function done_() {
  return ContentService.createTextOutput('ok');
}

// Run once from the editor (select testPost ▶ Run) to check the tab and columns.
function testPost() {
  doPost({ postData: { contents: JSON.stringify({
    session_id: 'test-' + Date.now(), page_slug: 'cctv-quotation-format', page_type: 'industry',
    industry: 'cctv', event: 'shown', question: '', answer: '', quotes_per_day: '', current_method: '',
    visitor_type: 'unknown', source: 'direct', device: 'desktop', referrer: ''
  }) } });
}
