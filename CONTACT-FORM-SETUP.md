# Contact form setup guide (for beginners)

This connects the website's **Contact Us** and **Prayer Request** forms to Google, so that every message is:
1. saved in a Google Sheet,
2. emailed to the church official, and
3. confirmed to the visitor by email.

You need **one Google account** (a Gmail address). Use a church-owned account if possible, not a personal one.
All emails are sent *from* this account. Free Gmail allows about 100 emails per day (each message uses 2: one to the church, one to the visitor); Google Workspace allows more.

Menu names in Google tools change slightly over time. If a button looks a little different, look for the closest match.

---

## Part 1 – The Google Sheet (spreadsheet)

### Option A (easiest, recommended): let the script create it
Do nothing now. In Part 3 you will run a function called `setup`, which creates the spreadsheet automatically, adds the headings, and shows you its link. If it already exists, the script reuses it and never creates a second one.

### Option B: use a spreadsheet you create yourself
1. Go to https://sheets.new while signed in to the church's Google account.
2. Click the title "Untitled spreadsheet" and name it, e.g. `Owode Baptist Church - Website Messages`.
3. Rename the bottom tab (double-click "Sheet1") to exactly: `Contact Messages`
4. In **row 1**, type these headings, one per column, A to F, spelled exactly like this:
   `Timestamp` | `Full Name` | `Email` | `Phone` | `Subject` | `Message`
5. Copy the spreadsheet ID from the address bar. It is the long text between `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`THIS_LONG_PART_IS_THE_ID`**`/edit`
6. Keep it for Part 2, step 6.

(The script will add a second tab called `Prayer Requests` by itself for the prayer-request form.)

---

## Part 2 – Create the Apps Script project

1. Go to https://script.google.com (signed in to the **same** Google account).
2. Click **New project**. Click "Untitled project" at the top and rename it: `OBC Contact Form`.
3. You will see a file called `Code.gs` containing a little sample code. **Select all of it and delete it.**
4. Open the file `apps-script/Code.gs` from this website folder, copy **everything**, and paste it into the editor.
5. Near the top, find this line and replace the placeholder with the church official's email, keeping the quotes:
   ```js
   CHURCH_EMAIL: 'PASTE_CHURCH_EMAIL_HERE',
   ```
6. **Only if you used Option B:** put the ID from Part 1 in the next line, keeping the quotes:
   ```js
   SPREADSHEET_ID: '',
   ```
   (Leave it as `''` if you used Option A.)
7. Click the **Save** icon (or press Ctrl+S).

---

## Part 3 – Give permission (authorize) and create the sheet

Google needs your permission before the script may use your Sheets and send email for you. You only do this once.

1. In the toolbar, find the function drop-down (it may say `doGet` or `doPost`). Choose **`setup`**.
2. Click **Run**.
3. A box says **Authorization required**. Click **Review permissions**.
4. Choose the church's Google account.
5. You will probably see **"Google hasn't verified this app"**. This is normal: you wrote/own this script and have not submitted it to Google for review. Click **Advanced**, then **Go to OBC Contact Form (unsafe)**.
6. Read the list and click **Allow**. It will ask to:
   - see, edit, create and delete your spreadsheets (so it can save messages), and
   - send email as you (so it can send the notification and the confirmation).
7. The script runs. At the bottom, the **Execution log** shows:
   - `Spreadsheet ready: https://docs.google.com/spreadsheets/d/...` ← click it to see your new sheet with headings
   - `Emails you can still send today: ...`
   - A warning if you forgot to set `CHURCH_EMAIL`.

**Quick email test (optional but recommended):** choose **`testSubmission`** in the drop-down and click **Run**. Check the church inbox: you should receive two emails (the "New message" notification and the visitor confirmation, because the test uses the church email as the visitor) and a new row in the sheet.

---

## Part 4 – Deploy as a Web App

1. Click **Deploy** (top right) → **New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `Contact form v1`
   - **Execute as:** **Me** (your account)
   - **Who has access:** **Anyone**
   > It must be **Anyone** (not "Anyone with Google account"), otherwise website visitors will be asked to sign in and the form will fail.
4. Click **Deploy** (authorize again if asked).
5. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfycb.........../exec`
6. Check it works: paste the URL in a new browser tab. You should see: *Owode Baptist Church contact form backend is running.*

---

## Part 5 – Connect the website

1. In the website folder, open `assets/js/config.js` in any text editor (Notepad is fine).
2. Replace the placeholder with your Web app URL. Keep the quotes:
   ```js
   window.OBC_CONFIG = {
     CONTACT_ENDPOINT: "https://script.google.com/macros/s/PASTE_YOURS_HERE/exec"
   };
   ```
3. Save, then upload the website to your hosting (or refresh it if you are testing on your computer).

The church email address is **not** in the website code. It exists only inside your Apps Script.

---

## Part 6 – Test everything

Use a **second email address of your own** as the "visitor" so you can see the confirmation email.

1. Open the website's **Contact Us** page.
2. **Test empty/invalid:** click **Send Message** with the form empty. Red messages should appear and nothing is sent. Try a fake email such as `abc`; it should be refused.
3. **Test a real message:** fill every field properly and send. Expect:
   - the green message: *"Thank you for contacting Owode Baptist Church. We have received your message…"*
   - the form clears
4. Check three places (allow up to a minute):
   - the **Google Sheet**: a new row with Timestamp, Full Name, Email, Phone, Subject, Message
   - the **church inbox**: "[Website] New message: …" (pressing Reply goes to the visitor)
   - your **second email**: the thank-you confirmation (check Spam too)
5. **Test the prayer form** the same way. It saves to the `Prayer Requests` tab.
6. **Test the error message:** turn off your internet/Wi-Fi, send again, and you should see a red message asking the visitor to try again or call.
7. **Spam protection note:** sending twice quickly from the same email is blocked for 60 seconds on purpose. If you test repeatedly, wait a minute or change the email.

If something fails, see "Troubleshooting" below.

---

## Part 7 – Updating the script later

Saving the code is **not enough**: the live Web App keeps running the old version until you publish a new version.

1. Edit the code in the Apps Script editor and click **Save**.
2. Click **Deploy** → **Manage deployments**.
3. Click the **pencil (Edit)** icon on your existing deployment.
4. Under **Version**, choose **New version**, add a short description, click **Deploy**.
5. The **Web app URL stays the same**, so you do not need to change `config.js`.

> Do **not** choose "New deployment" for updates; that creates a *different* URL. Also do not use the `/dev` test URL on the live site.

If you change the church email or spreadsheet ID in `CONFIG`, follow the same steps (Save, then New version).

---

## Part 8 – What you must replace with your own details

| Where | What to replace | Required? |
|---|---|---|
| `apps-script/Code.gs` → `CHURCH_EMAIL` | The church official's email, e.g. the address that should receive notifications | **Yes** |
| `apps-script/Code.gs` → `SPREADSHEET_ID` | ID of your own existing spreadsheet | Only if you used Option B (otherwise leave `''`) |
| `assets/js/config.js` → `CONTACT_ENDPOINT` | The Web app URL from Part 4 | **Yes** |
| `Code.gs` → `CHURCH_PHONE`, `CHURCH_ADDRESS` | Already filled from the church document. Change only if they change. | No |

Nothing else needs to be replaced.

---

## Troubleshooting

| Problem | What to check |
|---|---|
| Website says it could not send | The URL in `config.js` is correct and ends in `/exec`; deployment access is **Anyone**; you deployed (Part 4) after the last code change (Part 7). |
| Opening the Web app URL asks me to sign in | Access is set wrongly. Redeploy with **Anyone**. |
| Row appears in the sheet but no email | Open Apps Script → **Executions** (left menu) and read the error. Check `CHURCH_EMAIL` is set, and your daily email limit. The message is never lost: it is saved first. |
| Confirmation email not received | Check Spam. Free Gmail limits ~100 emails/day. |
| "Authorization required" after editing the code | Run `setup` once more and allow permissions again. |
| Form says "Sending your message…" for ages | Slow connection; it stops after 25 seconds and shows an error. |
| Form says "you have just sent a message" | Same email used within 60 seconds. Wait a minute. |
| Test form shows "online sending is not switched on yet" | `config.js` still contains the placeholder. |

## Safety notes
- Keep the Google Sheet **private**. Share it only with church leaders who need it (Share button, specific people).
- The Web app URL is public by design (the website must reach it). It is protected by server-side validation, a hidden honeypot field, a minimum-fill-time check, and a 60-second limit per email address.
- Visitors' messages may contain personal information. Treat the sheet and emails with care, and tell visitors not to send passwords or payment details (the form already says so).
- Anything a visitor types is stored as plain text in the sheet, so it cannot run as a formula.
