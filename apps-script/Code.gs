/**
 * ============================================================
 *  Owode Baptist Church – Website contact form backend
 *  Google Apps Script (paste this whole file into Code.gs)
 * ============================================================
 *  What it does when a visitor submits the website form:
 *   1. Checks the data (server-side validation + spam checks)
 *   2. Saves it in a Google Sheet (creates the Sheet if needed)
 *   3. Emails the church official
 *   4. Emails a short thank-you to the visitor
 *   5. Replies to the website with {ok:true} or {ok:false,error:"..."}
 */

/* ------------------------------------------------------------
 *  CONFIGURATION – the only part you need to edit
 * ------------------------------------------------------------ */
var CONFIG = {
  // 1) REQUIRED: the church official's email address that receives
  //    "new message" notifications. Replace the placeholder text.
  CHURCH_EMAIL: 'PASTE_CHURCH_EMAIL_HERE',

  // 2) OPTIONAL: ID of an EXISTING Google Sheet to use.
  //    Leave as '' and the script will create a new Sheet for you
  //    the first time (and then keep using that same Sheet).
  //    The ID is the long text between /d/ and /edit in the Sheet's URL.
  SPREADSHEET_ID: '',

  // Names (you can leave these as they are)
  SPREADSHEET_NAME: 'Owode Baptist Church - Website Messages',
  MESSAGES_TAB: 'Contact Messages',
  PRAYER_TAB: 'Prayer Requests',
  CHURCH_NAME: 'Owode Baptist Church',
  CHURCH_TAGLINE: 'Tabernacle of His Glory',
  CHURCH_PHONE: '08038469771',
  CHURCH_ADDRESS: 'Behind Owode Police Headquarters, Owode Area, Ogbomoso, Oyo State, Nigeria',

  // Spam protection settings
  MIN_SECONDS_TO_FILL: 2,     // forms sent faster than this are treated as bots
  RATE_LIMIT_SECONDS: 60      // same email address may submit once per this many seconds
};

// Column headings, in order (do not change the order)
var HEADERS = ['Timestamp', 'Full Name', 'Email', 'Phone', 'Subject', 'Message'];


/* ------------------------------------------------------------
 *  WEB APP ENTRY POINTS
 * ------------------------------------------------------------ */

/** Receives the form from the website (HTTP POST). */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    // --- Spam check 1: honeypot. Real people never see/fill this field.
    //     We pretend everything worked so bots learn nothing.
    if (p.website) { return json_({ ok: true }); }

    // --- Spam check 2: submitted impossibly fast (bot)
    if (p.elapsed !== undefined && p.elapsed !== '' && !isNaN(Number(p.elapsed)) &&
        Number(p.elapsed) < CONFIG.MIN_SECONDS_TO_FILL * 1000) {
      return json_({ ok: false, error: 'Please take a moment to complete the form, then send it again.' });
    }

    // --- Server-side validation (never trust the browser alone)
    var result = validate_(p);
    if (!result.valid) {
      return json_({ ok: false, error: 'Please correct the highlighted fields and try again.', errors: result.errors });
    }
    var d = result.data;

    // --- Spam check 3: same email sending again too quickly
    var cache = CacheService.getScriptCache();
    var key = 'rl_' + Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, d.email.toLowerCase()));
    if (cache.get(key)) {
      return json_({ ok: false, error: 'You have just sent a message. Please wait a minute before sending another.' });
    }

    // --- Save to the spreadsheet (one at a time, so rows never clash)
    if (!lock.tryLock(20000)) {
      return json_({ ok: false, error: 'The system is busy. Please try again in a moment.' });
    }
    var saved = saveToSheet_(d);
    lock.releaseLock();
    cache.put(key, '1', CONFIG.RATE_LIMIT_SECONDS);

    // --- Emails. The message is already saved, so an email problem
    //     must NOT make the visitor think their message was lost.
    try { sendChurchNotification_(d, saved.url); }
    catch (err1) { Logger.log('Church notification failed: ' + err1); }
    try { sendVisitorConfirmation_(d); }
    catch (err2) { Logger.log('Visitor confirmation failed: ' + err2); }

    return json_({ ok: true });

  } catch (err) {
    Logger.log('doPost error: ' + err + (err && err.stack ? '\n' + err.stack : ''));
    try { lock.releaseLock(); } catch (ignore) {}
    return json_({ ok: false, error: 'Sorry, something went wrong on our side. Please try again, or call ' + CONFIG.CHURCH_PHONE + '.' });
  }
}

/** Opening the Web App URL in a browser shows this (handy for testing). */
function doGet() {
  return ContentService.createTextOutput(CONFIG.CHURCH_NAME + ' contact form backend is running.');
}


/* ------------------------------------------------------------
 *  ONE-TIME SETUP (run these from the Apps Script editor)
 * ------------------------------------------------------------ */

/**
 * Run this ONCE. It asks Google for permission, creates (or opens) the
 * spreadsheet, adds the column headings, and prints the Sheet link in
 * the "Execution log" at the bottom of the editor.
 */
function setup() {
  var ss = getSpreadsheet_();
  getSheet_(ss, 'contact');
  getSheet_(ss, 'prayer');
  Logger.log('Spreadsheet ready: ' + ss.getUrl());
  Logger.log('Spreadsheet ID: ' + ss.getId());
  Logger.log('Emails you can still send today: ' + MailApp.getRemainingDailyQuota());
  if (!isEmail_(CONFIG.CHURCH_EMAIL)) {
    Logger.log('WARNING: CONFIG.CHURCH_EMAIL is still the placeholder. Replace it with the church official email.');
  }
}

/**
 * Optional test: pretends a visitor submitted the form. Uses the church
 * email as the visitor email, so both emails arrive in the church inbox.
 */
function testSubmission() {
  var fake = { parameter: {
    form_type: 'contact',
    name: 'Test Visitor',
    email: CONFIG.CHURCH_EMAIL,
    phone: '08000000000',
    subject: 'Test message from Apps Script',
    message: 'This is a test message to check that saving and emails work.'
  } };
  Logger.log(doPost(fake).getContent());
}


/* ------------------------------------------------------------
 *  VALIDATION
 * ------------------------------------------------------------ */

function clean_(v, max) {
  // text only, single line: remove line breaks/control characters, trim, limit length
  return String(v === undefined || v === null ? '' : v)
    .replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s{2,}/g, ' ').trim().substring(0, max);
}
function cleanMultiline_(v, max) {
  // message: keep line breaks, remove other control characters
  return String(v === undefined || v === null ? '' : v)
    .replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim().substring(0, max);
}
function isEmail_(v) {
  return /^[^\s@<>,;:"]+@[^\s@<>,;:"]+\.[A-Za-z]{2,}$/.test(v) && v.length <= 254;
}

function validate_(p) {
  var errors = {};
  var d = {
    type: p.form_type === 'prayer' ? 'prayer' : 'contact',
    name: clean_(p.name, 100),
    email: clean_(p.email, 254),
    phone: clean_(p.phone, 25),
    subject: clean_(p.subject, 150),
    message: cleanMultiline_(p.message, 3000)
  };
  if (d.name.length < 2) errors.name = 'Please enter your full name.';
  if (!isEmail_(d.email)) errors.email = 'Please enter a valid email address.';
  if (d.phone && !/^\+?[\d\s\-()]{7,16}$/.test(d.phone)) errors.phone = 'Please enter a valid phone number.';
  if (d.subject.length < 3) errors.subject = 'Please add a short subject.';
  if (d.message.length < 10) errors.message = 'Please write at least 10 characters.';
  return { valid: Object.keys(errors).length === 0, errors: errors, data: d };
}


/* ------------------------------------------------------------
 *  GOOGLE SHEETS
 * ------------------------------------------------------------ */

/** Finds the spreadsheet: configured ID -> remembered ID -> create new. */
function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();

  if (CONFIG.SPREADSHEET_ID) {                       // 1) ID typed in CONFIG
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  var savedId = props.getProperty('SPREADSHEET_ID'); // 2) created earlier by this script
  if (savedId) {
    try { return SpreadsheetApp.openById(savedId); }
    catch (e) { Logger.log('Saved spreadsheet could not be opened, creating a new one. ' + e); }
  }
  var ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME); // 3) create it
  props.setProperty('SPREADSHEET_ID', ss.getId());
  var first = ss.getSheets()[0];
  first.setName(CONFIG.MESSAGES_TAB);
  return ss;
}

/** Gets the right tab, creating it with headings if it does not exist. */
function getSheet_(ss, type) {
  var name = type === 'prayer' ? CONFIG.PRAYER_TAB : CONFIG.MESSAGES_TAB;
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#1e7a36').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    // Store everything as plain text: keeps phone numbers like 0803... intact and
    // stops anything typed by a visitor (e.g. "=SUM(...)") running as a formula.
    sheet.getRange('A:F').setNumberFormat('@');
    sheet.setColumnWidths(1, 1, 150);
    sheet.setColumnWidths(2, 1, 160);
    sheet.setColumnWidths(3, 1, 220);
    sheet.setColumnWidths(4, 1, 120);
    sheet.setColumnWidths(5, 1, 220);
    sheet.setColumnWidths(6, 1, 450);
  }
  return sheet;
}

function saveToSheet_(d) {
  var ss = getSpreadsheet_();
  var sheet = getSheet_(ss, d.type);
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([stamp, d.name, d.email, d.phone, d.subject, d.message]);
  return { url: ss.getUrl() };
}


/* ------------------------------------------------------------
 *  EMAILS (MailApp)
 * ------------------------------------------------------------ */

function sendChurchNotification_(d, sheetUrl) {
  if (!isEmail_(CONFIG.CHURCH_EMAIL)) {
    Logger.log('Church notification skipped: CONFIG.CHURCH_EMAIL is not set.');
    return;
  }
  var kind = d.type === 'prayer' ? 'prayer request' : 'message';
  var body =
    'A new ' + kind + ' was sent through the ' + CONFIG.CHURCH_NAME + ' website.\n\n' +
    'Name:    ' + d.name + '\n' +
    'Email:   ' + d.email + '\n' +
    'Phone:   ' + (d.phone || '(not given)') + '\n' +
    'Subject: ' + d.subject + '\n\n' +
    'Message:\n' + d.message + '\n\n' +
    '----------------------------------------\n' +
    'Tip: press "Reply" to answer ' + d.name + ' directly.\n' +
    'All messages are saved here: ' + sheetUrl + '\n';
  MailApp.sendEmail({
    to: CONFIG.CHURCH_EMAIL,
    replyTo: d.email,
    subject: '[Website] New ' + kind + ': ' + d.subject,
    body: body,
    name: CONFIG.CHURCH_NAME + ' Website'
  });
}

function sendVisitorConfirmation_(d) {
  var intro = d.type === 'prayer'
    ? 'Thank you for sharing your prayer request with ' + CONFIG.CHURCH_NAME + '. We have received it and will be praying with you. We will get back to you as soon as possible. God bless you.'
    : 'Thank you for contacting ' + CONFIG.CHURCH_NAME + '. We have received your message and will get back to you as soon as possible. God bless you.';
  var text =
    'Dear ' + d.name + ',\n\n' + intro + '\n\n' +
    'Your subject: ' + d.subject + '\n\n' +
    CONFIG.CHURCH_NAME + ' - ' + CONFIG.CHURCH_TAGLINE + '\n' +
    CONFIG.CHURCH_ADDRESS + '\n' +
    'Phone: ' + CONFIG.CHURCH_PHONE + '\n\n' +
    '(This is an automatic confirmation. If you did not send a message to us, please ignore this email.)';
  var html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#12281b;max-width:560px">' +
    '<p>Dear ' + esc_(d.name) + ',</p><p>' + esc_(intro) + '</p>' +
    '<p style="color:#546058">Your subject: ' + esc_(d.subject) + '</p>' +
    '<p style="border-top:3px solid #1e7a36;padding-top:12px"><strong>' + esc_(CONFIG.CHURCH_NAME) + '</strong> &ndash; ' + esc_(CONFIG.CHURCH_TAGLINE) + '<br>' +
    esc_(CONFIG.CHURCH_ADDRESS) + '<br>Phone: ' + esc_(CONFIG.CHURCH_PHONE) + '</p>' +
    '<p style="font-size:12px;color:#7a847d">This is an automatic confirmation. If you did not send a message to us, please ignore this email.</p></div>';
  var options = {
    to: d.email,
    subject: 'We received your message - ' + CONFIG.CHURCH_NAME,
    body: text,
    htmlBody: html,
    name: CONFIG.CHURCH_NAME
  };
  if (isEmail_(CONFIG.CHURCH_EMAIL)) { options.replyTo = CONFIG.CHURCH_EMAIL; }  // visitor's "Reply" goes to the church
  MailApp.sendEmail(options);
}


/* ------------------------------------------------------------
 *  HELPERS
 * ------------------------------------------------------------ */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
