# Eatery sales dashboard

A static web page. It holds **no sales data**: when you open it, it asks the Google Sheet for the numbers
through a small Apps Script web app, using a password that only you know.

- Open the page, type the password once. The browser remembers it.
- Add the day's numbers in the Google Sheet (`Daily_Data`). Reload the page and they show up.
- Months missing from `Monthly_Data` are rebuilt from the daily rows. The month in progress is marked "so far".

Edit `WEBAPP_URL` (the `URL_` constant near the bottom of `index.html`) only if the Apps Script is deployed again as a new web app.
Targets: add a `Targets` tab to the sheet with `Year, MonthNumber, Target_EGP` (the Apps Script must return it, see below). A row with MonthNumber `0` is the target for the whole year (e.g. `2026, 0, 115000000`). The Overview shows two donuts: the selected month against its target, and the year up to that month against the year target.
- **+ Add day** (top right): paste the daily message or type the numbers. The day is written to `Daily_Data`;
  if the day is already saved you see old and new and must press **Replace saved day**. Every write is logged in the `Entry_Log` tab.
- The Apps Script code is in `apps-script/Code.gs` (backup copy). After changing it: Deploy > Manage deployments > edit > New version.

Tests: `node tests/conv.test.js`, `node tests/logic.test.js`, `node tests/entry.test.js`, `node tests/apps-script.test.js`.

## Install as an app
The page is a PWA (`manifest.webmanifest` and `icons/`). Android and laptop Chrome: menu > Install app. iPhone Safari: Share > Add to Home Screen. It still needs the internet: sales are read live from the sheet and are never stored in the app.
