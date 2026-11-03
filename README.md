# Owode Baptist Church website

Plain HTML, CSS and JavaScript – no build tools needed. Open `index.html` in a browser,
or upload the whole folder to any web host.

## Files
- `index.html, about.html, plan-your-visit.html, ministries.html, events.html, reflections.html, contact.html, giving.html`
- `assets/css/style.css` – all styling (colours are at the top, in `:root`)
- `assets/js/main.js` – mobile menu, animations, form validation
- `assets/images/` – put church photos and the logo here

## Items marked "to be confirmed" (yellow tags on the site)
Official church email (goes in `Code.gs`, not on the site) · social media links · pastor's personal welcome message · ministry meeting times · annual programme dates · membership class dates ·
exact Google Maps pin · online prayer-request form approval · **giving/bank details (not published)**

## Logo and photographs
- Logo: `assets/images/logo.png` (transparent background; also used as the favicon). It appears in every page header and footer.
- `assets/images/pastor-oyekan.jpg` – pastor photo (home page and About page).
- `assets/images/church-leaders.jpg` – group photo (home, About and Plan Your Visit pages).
To swap a photo, replace the file with another of the same name, or change the `src` in the `<img>` tag.
Only use pastor/leadership-approved photos.

## Contact form (Google Apps Script + Google Sheets)
The Contact and Prayer forms send to a Google Apps Script Web App that saves each message in a
Google Sheet and sends two emails. **Follow `CONTACT-FORM-SETUP.md`** (step-by-step for beginners).
Files: `apps-script/Code.gs` (paste into script.google.com) and `assets/js/config.js` (paste the Web App URL).
Until the URL is set, the forms validate but do not send, and ask visitors to call the church.

## Updating Reflections
Open `reflections.html`, find the comment "REFLECTIONS LIST", copy an `<article class="card">` block
and edit it.

## Giving
`giving.html` shows a "coming soon" notice. Replace it with approved details only after
the pastor and leadership approve.

## Fonts
Work Sans and Source Serif 4 load from Google Fonts (internet needed); the site falls back to system fonts offline.
