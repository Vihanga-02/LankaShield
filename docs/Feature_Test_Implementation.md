# LankaShield: Feature Test Guide (Phases 4–9)

This guide is for testing every feature built so far, from the screens, the way a real user would. It covers:

- the **officer web dashboard**, run locally in a browser, and
- the **mobile app** for Citizens and Volunteers, run in **Expo Go** on an Android phone.

You don't need to read any code. Each test has steps, the expected result, and a column for your result.

**Not covered here.** These come later, so don't log them as missing:

- Notifications lists on mobile and web (Phase 10).
- Maps inside the mobile app. They need the Android development build; see [section 3](#3-known-limitations-not-bugs).
- Deployment, the installable APK, and security rules (Phases 11–12).

---

## Contents

1. [Setup](#1-setup)
2. [Demo accounts and demo data](#2-demo-accounts-and-demo-data)
3. [Known limitations (not bugs)](#3-known-limitations-not-bugs)
4. [How to test and record results](#4-how-to-test-and-record-results)
5. [Phase 4: Sign-in, roles and app shells](#5-phase-4-sign-in-roles-and-app-shells)
6. [Phase 5: Report a hazard online (UC01)](#6-phase-5-report-a-hazard-online-uc01)
7. [Phase 6: Offline reports and sync](#7-phase-6-offline-reports-and-sync)
8. [Phase 7: Verify hazard reports (UC02)](#8-phase-7-verify-hazard-reports-uc02)
9. [Phase 8: Manage shelters (UC03)](#9-phase-8-manage-shelters-uc03)
10. [Phase 9: Disaster analytics and reports (UC04)](#10-phase-9-disaster-analytics-and-reports-uc04)
11. [End-to-end scenario](#11-end-to-end-scenario)
12. [Deferred until the Android development build](#12-deferred-until-the-android-development-build)
13. [Bug report template](#13-bug-report-template)

---

## 1. Setup

### What you need

| Item | Notes |
| --- | --- |
| Laptop with Node.js (current LTS) and Git | Windows, macOS or Linux |
| Access to the GitHub repository | Ask the project owner which branch to test |
| The two `.env` files | `apps/dashboard/.env` and `apps/mobile/.env`. These are **not in Git**; get them from the project owner privately. |
| Android phone with **Expo Go** | Install it from the Play Store. Put the phone on the **same Wi-Fi** as the laptop. |
| Chrome or Edge | For the dashboard |

An iPhone is untested; use Android.

### Install

```bash
git clone <repository-url> LankaShield
cd LankaShield
git checkout <branch-to-test>
npm install
```

Copy the two `.env` files into `apps/dashboard/` and `apps/mobile/`.

### Run the web dashboard

```bash
npm run dashboard
```

Open **http://localhost:5173**.

### Run the mobile app in Expo Go

```bash
npm run mobile
```

Scan the QR code in the terminal with Expo Go. The app loads on the phone in about 30–60 seconds the first time.

If the phone cannot connect (for example on a campus network that blocks it), use a tunnel instead:

```bash
cd apps/mobile
npx expo start --tunnel
```

You can run the dashboard and the mobile app at the same time in two terminals. Most tests need both.

### Reset the demo data (when needed)

All testers share **one Firebase project**, so your changes are visible to everyone.

To reset the demo data to the state described in [section 2](#2-demo-accounts-and-demo-data), run this from the repository root. Ask the project owner for the demo password.

```powershell
# PowerShell
$env:SEED_DEMO_PASSWORD="<demo password>"; npm run seed
```

```bash
# Bash / macOS
SEED_DEMO_PASSWORD="<demo password>" npm run seed
```

What a reset does:

- **Overwrites** all demo documents (IDs starting with `LS-SEED-`, `SH-SEED-`, `EVT-SEED-` and so on), so their statuses and shelter occupancy go back to the original values.
- **Does not delete** anything testers created: new accounts, new reports, new shelters, new allocations, saved analytics reports.
- Affects everyone, so **tell the team before you run it**.

---

## 2. Demo accounts and demo data

### Accounts

All demo accounts use the same password. Ask the project owner for it.

| Role | Email | Name | Use it in |
| --- | --- | --- | --- |
| Citizen | `citizen.demo@example.com` | Nimal Perera (Ratnapura, 0771234567) | Mobile |
| Community Volunteer | `volunteer.demo@example.com` | Kumari Silva (Kalutara, 0712345678) | Mobile |
| Duty Officer | `duty.officer.demo@example.com` | Ruwan Jayasinghe | Web: Verification Queue |
| District Officer | `district.officer.demo@example.com` | Shalini Fernando | Web: Shelters |
| DMC Analyst | `analyst.demo@example.com` | Dilan Wickramasinghe | Web: Disaster Analytics |

You can also register your own Citizen or Volunteer accounts in the mobile app (see P4-M01). Use an address you can recognise, for example `yourname+cit1@example.com`. No email is sent.

### Disaster events

| Event | District | Status | What analytics should show (fresh data) |
| --- | --- | --- | --- |
| Ratnapura Floods — May 2025 | Ratnapura | Completed | **Final** report |
| Kalutara Landslides — November 2025 | Kalutara | Completed | **Final** report |
| Ratnapura Floods — October 2026 | Ratnapura | **Active** | **Provisional**, with 2 unreviewed reports |

### Hazard reports

| Tracking ID | Title | Reporter | District | Status |
| --- | --- | --- | --- | --- |
| LS-SEED-001 | Kalu Ganga overflowing near the town bridge | Citizen | Ratnapura | Verified |
| LS-SEED-002 | Houses submerged in Kuruwita lowlands | Volunteer | Ratnapura | Escalated |
| LS-SEED-003 | Cracks on slope above Pelmadulla road | Citizen | Ratnapura | Verified |
| LS-SEED-004 | Water on the road at Muwagama | Citizen | Ratnapura | Rejected |
| LS-SEED-005 | Flood water entering Eheliyagoda hospital grounds | Volunteer | Ratnapura | Verified |
| LS-SEED-006 | Landslide blocking Bulathsinhala road | Volunteer | Kalutara | Escalated |
| LS-SEED-007 | Earth slipping behind houses in Agalawatta | Citizen | Kalutara | Verified |
| LS-SEED-008 | Drains overflowing in Horana town | Citizen | Kalutara | Verified |
| LS-SEED-009 | Fallen tree on village path | Citizen | Kalutara | Rejected |
| LS-SEED-010 | Kalu Ganga rising quickly at Ratnapura town | Citizen | Ratnapura | Escalated |
| LS-SEED-011 | Paddy fields flooded in Elapatha | Volunteer | Ratnapura | Verified |
| LS-SEED-012 | Small landslide near Kiriella school | Volunteer | Ratnapura | Verified |
| **LS-SEED-013** | Water entering homes in Kahangama | Citizen | Ratnapura | **Pending Verification** |
| **LS-SEED-014** | Strong winds damaging roofs in Ratnapura | Citizen | Ratnapura | **Pending Verification** |
| **LS-SEED-015** | Minor flooding at Panadura junction | Volunteer | Kalutara | **Pending Verification** |

Seeded reports have no photos. To test photos, submit your own report from the mobile app.

### Shelters

| Shelter | District | Capacity | Occupied | Available | Status |
| --- | --- | --- | --- | --- | --- |
| Ratnapura Central College | Ratnapura | 300 | 180 | 120 | Available |
| Sivali Central College Hall | Ratnapura | 150 | 125 | 25 | Nearly Full |
| Kuruwita Temple Community Hall | Ratnapura | 80 | 80 | 0 | Full |
| Horana Community Centre | Kalutara | 200 | 0 | 200 | Available |
| Agalawatta Divisional Secretariat Hall | Kalutara | 120 | 0 | 120 | Available |
| Bulathsinhala School Hall | Kalutara | 100 | 0 | 0 | Closed |

Status rules:

| Status | Rule |
| --- | --- |
| Available | Under 80% full |
| Nearly Full | 80% to 99% full |
| Full | 100% full |
| Closed | Set by the officer; it can't take evacuees |

---

## 3. Known limitations (not bugs)

| # | What you will see | Why | Status |
| --- | --- | --- | --- |
| L1 | **Mobile maps are black or blank in Expo Go.** This affects "Choose on map" and the Location map on Report details. | A known Expo Go problem with Google Maps. It works in the Android development build. | Tests marked 🔸 are deferred ([section 12](#12-deferred-until-the-android-development-build)) |
| L2 | **Web maps show "Maps are not configured (no web API key)."** or "The map could not be loaded…", with coordinates and an "open in Google Maps" link. | The Google Maps web key is missing or not allowed for `localhost`. This fallback is intended behaviour. | Pass if the fallback shows the right coordinates. Tell the project owner if you expected a real map. |
| L3 | The mobile **Notifications** tab says "No notifications". The web **Notifications** page is a placeholder. On mobile Home, "Active warnings" always says "No active warnings". | Built in Phase 10 | Not tested now |
| L4 | **Share with donor** doesn't contact a real organisation, and the organisation names end in "(mock)". | Donor delivery is simulated for the prototype | Expected |
| L5 | In Expo Go, turning on airplane mode may show "Disconnected from Metro" or a similar message. | Expo Go loses contact with the laptop | Ignore it. **Don't reload the app while offline**, because Expo Go needs the laptop to load it. |
| L6 | Everything suddenly fails with **"You do not have permission to do this. Sign in again."** | The Firebase project's temporary test-mode rules have expired | Stop testing and tell the project owner. This is not an app bug. |
| L7 | The first page load of the dashboard is slow. | Development mode | Expected |

---

## 4. How to test and record results

### Recommended order

1. Reset the demo data, or confirm with the project owner that it is fresh.
2. **Phase 4**: sign-in and roles, on both apps.
3. **Phase 9, part A (baseline)**: read-only checks against fresh data. Do this before Phases 7 and 8 change the numbers.
4. **Phases 5 → 6 → 7 → 8**, in order.
5. **Phase 9, parts B–D**: filters, save/export/share, and cross-checks that your Phase 7 and 8 actions show up in analytics.
6. The **end-to-end scenario** in [section 11](#11-end-to-end-scenario).

### Recording

- Fill in the **Result** column with **Pass**, **Fail**, **Blocked** (couldn't run it) or **Deferred** (🔸 tests).
- For every Fail, write a bug report using the [template](#13-bug-report-template) and put its number in the Result column, for example `Fail – BUG-03`.
- Text in "quotes" is the exact message the app should show. A different message is worth noting, even if the behaviour is right.
- "Live" means the screen should update **by itself** within a few seconds, without a page refresh.

---

## 5. Phase 4: Sign-in, roles and app shells

### 5.1 Mobile (Expo Go)

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P4-M01 | Register a Citizen | Tap "Create an account". Choose **Citizen**, enter a full name, a new email and a password of at least 6 characters (twice). Leave the phone empty and tap "Create account". | You land on **Home** with "Hello, *first name*" and "Citizen" under it. | |
| P4-M02 | Register a Volunteer | Same as P4-M01 but choose **Community Volunteer** and enter a phone number such as `0771234567`. | Home shows "Community Volunteer". Profile shows the phone number. | |
| P4-M03 | Registration validation | On "Create an account", tap "Create account" with everything empty. Then try: email `abc`; phone `123`; password `123`; two passwords that don't match. | The messages are "Enter your full name.", "Enter your email address.", "Enter a valid email address.", "Enter a valid phone number, e.g. 0771234567 or +94771234567.", "Password must be at least 6 characters." and "Passwords do not match." No account is created. | |
| P4-M04 | Email already used | Register with `citizen.demo@example.com`. | Banner: "An account with this email already exists. Sign in instead." | |
| P4-M05 | Sign in | Sign in as `citizen.demo@example.com`. | Home shows "Hello, Nimal" and "Citizen". | |
| P4-M06 | Wrong password | Sign in with the right email and a wrong password. | Banner: "Incorrect email or password." | |
| P4-M07 | Empty sign-in and password visibility | Tap "Sign in" with empty fields. Then type a password and tap the eye icon. | Messages: "Enter your email address." and "Enter your password." The eye icon shows and hides the password. | |
| P4-M08 | Officer blocked from mobile | Sign in as `duty.officer.demo@example.com`. Repeat with the District Officer and DMC Analyst accounts. | You stay on Sign in, with a banner such as "Duty Officer accounts use the LankaShield officer web dashboard." | |
| P4-M09 | Session restore | While signed in, close Expo Go completely (swipe it away), then open the project again from Expo Go. | You go straight to Home, still signed in, with no login screen. | |
| P4-M10 | Tabs | Tap each bottom tab. | **Home**, **Report Hazard**, **My Reports**, **Notifications** and **Profile** all open. Notifications shows "No notifications" (L3). | |
| P4-M11 | Profile | Open Profile as the demo citizen. | Shows initials "NP", "Nimal Perera", "Citizen", the email, phone 0771234567 and district Ratnapura. | |
| P4-M12 | Sign out | On Profile, tap "Sign out". Then close and reopen the app. | You return to Sign in and stay signed out after reopening. | |

### 5.2 Web dashboard

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P4-W01 | Login page | Open http://localhost:5173 while signed out. | Redirected to the login page with "LankaShield" and "Officer dashboard for Duty Officers, District Officers and DMC Analysts". | |
| P4-W02 | Login validation | Submit with empty fields, then with a wrong password. | "Enter your email address." and "Enter your password.", then "Incorrect email or password." | |
| P4-W03 | Duty Officer menu | Sign in as the Duty Officer. | The Overview says "Welcome back, Ruwan". The sidebar has **only** Overview, Verification Queue, Notifications, Profile and Logout. | |
| P4-W04 | District Officer menu | Sign in as the District Officer. | The sidebar has **only** Overview, Shelters, Profile and Logout. | |
| P4-W05 | DMC Analyst menu | Sign in as the DMC Analyst. | The sidebar has **only** Overview, Disaster Analytics, Profile and Logout. | |
| P4-W06 | Mobile users blocked from web | Sign in as `citizen.demo@example.com`, then as `volunteer.demo@example.com`. | Stays on login with "Citizen accounts use the LankaShield mobile app." or "Community Volunteer accounts use the LankaShield mobile app." | |
| P4-W07 | Direct URL blocked by role | As the District Officer, type `http://localhost:5173/verification` in the address bar. Try `/analytics` too. As the Analyst, try `/shelters` and `/verification/LS-SEED-013`. | "This page is not available for your role", with "District Officer accounts cannot open this page." (or the Analyst version) and a "Back to overview" button. | |
| P4-W08 | Return to the requested page after login | Sign out. Open `http://localhost:5173/shelters`, then sign in as the District Officer. | After sign-in you land on **Shelters**, not Overview. | |
| P4-W09 | Unknown page | Open `http://localhost:5173/abc`. | A "not found" page, not a blank screen. | |
| P4-W10 | Overview numbers (fresh data) | Sign in with any officer account and look at Overview. | **Pending verification 3**, **Verified reports 10**, **Active disaster events 1**, **Available shelter places 465**.<br>Recent hazard reports: 5 rows, newest first, starting with LS-SEED-015.<br>Shelter summary: Available 3, Nearly Full 1, Full 1, Closed 1; "Occupancy of open shelters: 385 / 850 (45%)".<br>Disaster events: "Ratnapura Floods — October 2026" and "2 completed events". | |
| P4-W11 | Session restore | Press F5 on any page. | "Restoring your session…" shows briefly, then the same page, still signed in. | |
| P4-W12 | Logout | Click Logout in the sidebar, then press the browser Back button. | You return to the login page. Back doesn't show the dashboard again. | |
| P4-W13 | Profile page | Open Profile with each officer. | Name, Email, Role and District are shown. The Analyst shows "All districts". | |
| P4-W14 | Small screens | Make the browser window narrow, or use DevTools device mode at about 390 px wide. | Pages stay usable: navigation is reachable, nothing is cut off, and there is no sideways scrolling of the whole page. | |

---

## 6. Phase 5: Report a hazard online (UC01)

Sign in on the phone as `citizen.demo@example.com`, or your own citizen account. Keep the web dashboard open as the **Duty Officer** on **Verification Queue**.

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P5-01 | Form validation | Open **Report Hazard** and tap "Submit report" without filling anything in. | Messages: "Select a hazard type.", "Select a severity.", "Title must be at least 5 characters.", "Describe the hazard in at least 10 characters.", "Select a location." and "Select a district." Nothing is sent. | |
| P5-02 | Length limits | Enter a 4-character title and a 9-character description, then submit. | The same title and description errors appear. They clear once the text is long enough. | |
| P5-03 | GPS location | Tap "Use GPS" and allow location access. | "Getting your location…" shows, then your address (or coordinates) with "Current GPS location". The button changes to "Refresh GPS". The **District** is filled in automatically when your area is recognised. | |
| P5-04 | GPS permission denied | In the phone settings, deny location for Expo Go (or choose "Don't allow" when asked), then tap "Use GPS". | "Location permission was denied. Choose the hazard location on the map instead." | |
| P5-05 | Location services off | Turn off phone Location (GPS) and tap "Use GPS". | "Location services are turned off. Turn them on or choose the location on the map." | |
| P5-06 | Change the district | Open the District picker and choose a different district. | The chosen district is shown and is used for the report. | |
| P5-07 | Add photos | Tap "Take photo" and take one. Then tap "Gallery" and pick two. | Thumbnails appear, and the counter shows "3/3 photos · JPEG or PNG, up to 5 MB each". Both buttons are disabled at 3 photos. The ✕ on a thumbnail removes it and re-enables the buttons. | |
| P5-08 | Camera permission denied | Deny camera access for Expo Go, then tap "Take photo". | "Camera permission was denied. Choose a photo from the gallery." | |
| P5-09 | Submit online | Fill in every field with 2 photos. Note the "Tracking ID for this report" shown under the button, then tap "Submit report". | The button shows "Uploading photo 1 of 2…", "Uploading photo 2 of 2…" and then "Saving report…".<br>The **Report submitted** screen shows the **same tracking ID** (format `LS-YYYYMMDD-XXXXXX`), a **Pending Verification** badge and "A Duty Officer will review your report…". | |
| P5-10 | Report appears on web (live) | Watch the dashboard Verification Queue while doing P5-09. | The new report appears **without refreshing**. The "Live · N pending verification" count goes up by 1.<br>The row shows your title and tracking ID, the district and address, reporter "Citizen", evidence count **2** and an age of "just now" or similar. | |
| P5-11 | Report details | On Report submitted, tap "View report". | Shows the status badge, title, "Hazard · Severity severity · District", the tracking ID, "Waiting for a Duty Officer to review this report.", the description, "Evidence (2)" with both photos, and the Submitted and Last updated times. The address or coordinates text under Location is correct. (The map itself is black, see L1 🔸.) | |
| P5-12 | My Reports | Open **My Reports**. | Your new report is at the top.<br>Filter chips show counts. For the demo citizen before your own reports: **All 9, Pending 2, Verified 4, Escalated 1, Rejected 2**.<br>Each chip filters the list. An empty filter shows a message such as "No escalated reports". Tapping a report opens its details. | |
| P5-13 | Home recent reports | Open **Home**. | "Recent reports" shows the newest 3 reports with "See all", which opens My Reports. | |
| P5-14 | Report another | Submit a report, then tap "Report another hazard". | The form is empty, and the tracking ID under the button is **new**. | |
| P5-15 | No double submission | Fill the form and tap "Submit report" twice quickly. | Only **one** report is created. The button is disabled while it sends. Check the web queue: only one row has that tracking ID. | |
| P5-16 | Volunteer report | Sign in as `volunteer.demo@example.com` and submit a report. | On the web queue, the reporter column shows "Community Volunteer". | |
| P5-17 🔸 | Choose on map | Tap "Choose on map", tap a point and then "Use this location". | **Deferred (L1).** In the development build: the pin is placed and can be dragged, the address shows "Selected on map", and the district is detected. | Deferred |

---

## 7. Phase 6: Offline reports and sync

**How to go offline in Expo Go:** first open the app while online. Then turn on **airplane mode**, or turn off both Wi-Fi and mobile data. **Don't reload the app** while offline (L5).

Keep the web Verification Queue open as the Duty Officer.

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P6-01 | Offline form | Go offline and open **Report Hazard**. | Banner: "You're offline. Your report will be saved on this device and sent automatically when you are back online." The button says "Save on this device". | |
| P6-02 | Save offline | Fill the form while offline, with 1 photo. GPS works offline, but the address may show as coordinates and the district may not fill in, so choose the district yourself. Tap "Save on this device". | The **Saved on this device** screen shows the tracking ID, a **Pending Sync** badge, "It has not been sent yet…" and a "Sync now" button. Nothing appears on the web queue. | |
| P6-03 | Sync now while offline | On that screen, tap "Sync now". | "You're still offline. It will send automatically." | |
| P6-04 | Queue on My Reports and Home | Open My Reports and Home. | My Reports has a **Waiting to sync** section with a yellow card showing "Pending Sync", "Saved … ago", the tracking ID and "Sync now".<br>The My Reports tab has a badge with the number of queued reports.<br>Both screens show a banner: "1 report saved on this device. They will be sent automatically when you are back online." | |
| P6-05 | Several queued reports | While still offline, save 2 more reports. | The banner says "3 reports saved on this device…". There are 3 cards and the tab badge shows 3. | |
| P6-06 | Sign-out warning | While reports are queued, go to Profile and tap "Sign out". | An alert, "Reports not sent yet", says "3 reports are saved only on this device…". Choose **Stay signed in** and nothing changes. | |
| P6-07 | Automatic sync on reconnect | Turn airplane mode off and stay on My Reports. | Within a few seconds the banner shows "Syncing 1 of 3…" and so on, and the cards switch to "Syncing". Each card then disappears and the report shows under **Submitted** as **Pending Verification**. The tab badge disappears. All 3 reports appear on the web queue (live). | |
| P6-08 | Created exactly once | On the web queue, search each synced tracking ID. Then tap "Sync now" anywhere it is still visible. | Exactly **one** row per tracking ID. No duplicates appear after extra sync taps. | |
| P6-09 | Offline origin is kept | On the web, open one synced report. | The **Submitted** row says "… on the device (sent from the offline queue)". "Submitted" is the time you saved it offline and "Received" is the time it synced, so Received is later. | |
| P6-10 | Photo survives the queue | Open the synced report that had a photo, on mobile (Report details) and on web (review page). | The photo is there on both. | |
| P6-11 | Manual sync | Save one report offline, go back online, and if it hasn't synced by itself within about 10 seconds, tap "Sync now" on the banner or card. | It syncs and appears on the web queue. | |
| P6-12 | Queued reports belong to their owner | Save 1 report offline. Sign out with "Sign out" in the alert (offline sign-out works). Go online and sign in as a **different** mobile user. Then sign out, and sign back in as the **original** user. | The other user **doesn't** see or send that report. When the original user signs in, it syncs automatically. | |
| P6-13 | Connection lost while sending (optional) | Online, submit a report with 3 photos and turn on airplane mode while "Uploading photo…" is showing. | The report is **not lost**. Either it finishes, or it ends up "Saved on this device" (Pending Sync). After reconnecting it syncs once, with no duplicate. | |
| P6-14 | Sync Failed, Retry and Discard (optional, hard to trigger) | If a queued card ever shows **Sync Failed**: | It shows the error text and "(attempt N)" with **Retry** and **Discard** buttons. Discard asks "Discard this report?" before deleting it from the phone. Note what caused the failure in your results. | |

---

## 8. Phase 7: Verify hazard reports (UC02)

Web dashboard, signed in as the **Duty Officer**. Also keep the phone signed in as the **citizen** who owns the report being reviewed.

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P7-01 | Pending queue | Open **Verification Queue**. | The default status is **Pending Verification**. It lists LS-SEED-013, 014 and 015 plus any reports you submitted. The header chip says "Live · N pending verification". | |
| P7-02 | Status filter | Change Status to Verified, then Escalated, then Rejected. | With fresh data, before your own decisions: **Verified 7, Escalated 3, Rejected 2**. The header chip text follows the selected status. | |
| P7-03 | Search | Search `Kahangama`, then `LS-SEED-015`, then a word that is only in a description (e.g. `market` with status Escalated). Then search `zzzz`. | Each search finds the matching report. `zzzz` shows "No reports match these filters". | |
| P7-04 | Filters together | With status Verified, set Hazard type Flood, Severity High and District Ratnapura. Then set them back to "All". | Only rows matching **all** the filters show. Clearing the filters brings every row back. | |
| P7-05 | Pagination | Change "Rows per page" (10/25/50). If more than 10 rows are listed, use the next-page arrow. | Paging and row counts are correct. Changing a filter returns you to page 1. | |
| P7-06 | Open a report | Click a row. Also try pressing Tab to reach a row and then Enter. | The review page opens for that report. | |
| P7-07 | Review page contents | Open **LS-SEED-013**. | **Header:** the title, the tracking ID with a **Copy** button (paste it somewhere to check), and a **Pending Verification** chip.<br>**Report:** Flood, High, Ratnapura, the Received and Submitted times, and the description.<br>**Evidence (0):** "No photos were attached."<br>**Location:** a map with a marker, or the L2 fallback, plus the coordinates and "GPS".<br>**Reporter:** Nimal Perera, Citizen, citizen.demo@example.com, 0771234567.<br>**Possible duplicates (0):** "No other flood reports within 1 km and 24 hours." | |
| P7-08 | Evidence photos | Open a report you submitted with photos. | Thumbnails show. Clicking one opens the full image in a new tab. | |
| P7-09 | Duplicate indicator | On the phone, submit **two reports of the same hazard type** from the same place (GPS) a few minutes apart. Open either one on the web. Then submit a third report from the same place with a **different** hazard type. | "Possible duplicates (1)" lists the other report with "… m away · … h apart · status". The link opens it. The different-hazard report is **not** listed as a duplicate. | |
| P7-10 | Decision required | On a pending report, click "Record decision" without choosing anything. | "Choose a decision." | |
| P7-11 | Rejection needs remarks | Select **Reject report**, leave Remarks empty (or type 3 characters), then click "Record decision". | The Remarks label changes to "Remarks (required)". Error: "Explain why the report is rejected (at least 5 characters)." Nothing is saved. | |
| P7-12 | Event suggestion | Open LS-SEED-013 (Ratnapura) and look at "Disaster event (optional)". Then open LS-SEED-015 (Kalutara). | LS-SEED-013 has **"Ratnapura Floods — October 2026 · Active"** pre-selected, and the list also shows the completed May 2025 event.<br>LS-SEED-015 shows "Not linked to an event", because Kalutara has no active event; the completed November 2025 event is listed. | |
| P7-13 | Verify | On LS-SEED-013, choose **Verify information**, add an optional remark, keep the event, then click "Record decision". | The form is replaced by a green box: "Verify information — recorded *time*. The reporter has been notified." It also shows the Remarks and the Disaster event name. The chip changes to **Verified**. In the queue (Pending) the report disappears live; it is listed under Verified. | |
| P7-14 | Citizen sees the result (live) | On the phone as the citizen, open My Reports and then the report's details. | The status is **Verified** without restarting the app. Details show "Verified on *date*" and "Officer remarks: *your remark*", or "No remarks from the officer." | |
| P7-15 | Escalate | On LS-SEED-014, choose **Verify and escalate for warning assessment** and record it. | Status **Escalated** on web and mobile. | |
| P7-16 | Reject | On a report you submitted in Phase 5, choose **Reject report** with remarks such as "Test rejection" and record it. | Status **Rejected** on web. On mobile, details show "Officer remarks: Test rejection". | |
| P7-17 | No second decision | Open the **same pending report** in two browser tabs (e.g. LS-SEED-015). Choose a decision in both. Click "Record decision" in tab A, then in tab B. | Tab B either switches to the recorded decision by itself (live) before you can submit, or shows "This report has already been reviewed by another officer." when you submit. **Only one decision** is saved. | |
| P7-18 | Unknown report | Open `http://localhost:5173/verification/LS-NOPE`. | "Report not found" and "No report with ID LS-NOPE." | |
| P7-19 | Back to queue | Click "← Verification Queue" on a review page. | Returns to the queue. | |
| P7-20 | Overview updates | After your decisions, open Overview. | "Pending verification" went down and "Verified reports" went up by the number of verify and escalate decisions you made. | |

---

## 9. Phase 8: Manage shelters (UC03)

Web dashboard, signed in as the **District Officer**. The expected numbers assume fresh demo data; adjust them if earlier tests changed a shelter.

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P8-01 | Shelters page | Open **Shelters**. | Status summary: **Available 3, Nearly Full 1, Full 1, Closed 1**.<br>The map shows 6 coloured markers zoomed to fit them all (or the L2 fallback).<br>The table matches the shelter table in [section 2](#shelters): occupancy bar and %, available places, status chip, contact under the address. | |
| P8-02 | Map marker | Click a marker on the map. | A popup shows the shelter name and details, with an **Allocate** button for open shelters. | |
| P8-03 | Filters | Search `college`. Then clear it and set District **Kalutara**. Then set Status **Full**. Then try a search with no match. | `college` shows the 2 colleges. Kalutara shows 3 shelters and the map re-fits to them. Full shows only Kuruwita Temple Community Hall. No match shows "No shelters match these filters". | |
| P8-04 | Register validation | Click "Register shelter" and then "Register shelter" in the dialog with everything empty. | "Shelter name must be at least 3 characters.", "Select a district.", "Enter the shelter address.", "Enter the shelter capacity." and a location error. | |
| P8-05 | Register a shelter | Fill in: name `Test Shelter <your initials>`, district Ratnapura, an address, capacity `50`, occupancy `0`. Click the map to place it, **or** type latitude `6.69` and longitude `80.40`. Add an optional contact name and phone `0451234567`. Save. | Toast: "Test Shelter … was registered." It appears in the table and on the map as **Available**, with 50 available. | |
| P8-06 | Number rules | Register another shelter: first capacity `0`, then `10.5`, then capacity `50` with occupancy `60`, then capacity `50` with occupancy `45`. | "Capacity must be at least 1.", "Capacity must be a whole number." and "Occupancy cannot exceed capacity." The last one saves as **Nearly Full** (90%). | |
| P8-07 | Duplicate-name warning | Register a shelter named `ratnapura central college` (lower case) in district Ratnapura. | Yellow warning: "A shelter named “Ratnapura Central College” is already registered in Ratnapura. Check that this is not the same shelter." Saving is **still allowed**, because it's only a warning. Change the district to Kalutara and the warning disappears. | |
| P8-08 | Phone validation | Enter contact phone `12345`. | "Enter a valid phone number, e.g. 0771234567 or +94771234567." | |
| P8-09 | Edit a shelter | Click the ✎ icon on your test shelter. Change the address and clear the contact name and phone, then save. | The dialog title is "Edit *name*". **Current occupancy is greyed out** with "Changes only through evacuee allocations." Toast: "… was updated." The new address shows and the contact is gone from the row. | |
| P8-10 | Capacity below occupancy | Edit **Sivali Central College Hall** (125 occupied) and set capacity `100`. | Refused with "Occupancy cannot exceed capacity." (or "Capacity cannot be lower than the current occupancy (125)."). Nothing changes. | |
| P8-11 | Capacity changes status | Edit Sivali: set capacity `125` and save, then `300` and save, then `150` and save. | The status becomes **Full**, then **Available**, then **Nearly Full** again. | |
| P8-12 | Close and reopen | Edit your test shelter and switch on "Closed — cannot receive evacuees", then save. Then edit again, switch it off and save. | When closed: status **Closed**, the **Allocate** button is disabled, and it is left out of Overview's available places. When reopened: the status is worked out again from occupancy (e.g. Available). | |
| P8-13 | Allocate | On **Ratnapura Central College** (180/300), click Allocate and enter `20`. | The dialog shows "180 / 300 occupied · **120 available**". Preview: "After this allocation: 200 / 300 occupied, 100 places left — Available."<br>The "Disaster event (optional)" list shows **only** "Ratnapura Floods — October 2026" (active events in this district). | |
| P8-14 | Confirm allocation | Continuing P8-13, pick the event and click "Confirm allocation". | "Allocation confirmed", "20 evacuees allocated to Ratnapura Central College." and "Now 200 occupied · 100 places left" with an **Available** chip. After "Done", the table shows 200 (67%) and 100 available, live. | |
| P8-15 | 80% boundary | Allocate `40` more to Ratnapura Central College (200/300). | Preview: 240 / 300 — **Nearly Full**. Exactly 80% counts as Nearly Full. | |
| P8-16 | Fill exactly | Allocate `25` to **Sivali Central College Hall** (125/150). | Preview: "0 places left — Full". After confirming, the status is **Full**. | |
| P8-17 | Not enough space and alternatives | Click Allocate on **Kuruwita Temple Community Hall** (Full, 80/80) and enter `30`. | Warning: "Insufficient capacity: Kuruwita Temple Community Hall has only 0 places for 30 evacuees."<br>**Alternative shelters** are listed, with Ratnapura shelters first, each showing "District · N available". "Confirm allocation" is disabled. | |
| P8-18 | Allocate here | In P8-17, click **"Allocate here"** next to an alternative. | The dialog switches to that shelter with a new preview. Confirm works and its occupancy goes up by 30. | |
| P8-19 | No alternative possible | On any shelter, enter `5000`. | "No open shelter can take 5000 evacuees. Split the group or register another shelter." | |
| P8-20 | Invalid counts | Enter `0`, then `-3`, then `2.5`. | "Enter a whole number above zero." "Confirm allocation" is disabled. | |
| P8-21 | Closed shelter | Look at **Bulathsinhala School Hall** (Closed). Then do P8-17 again. | Its Allocate button is disabled, and it never appears as an alternative. | |
| P8-22 | No event in district | Allocate on **Horana Community Centre** (Kalutara). | The event list only has "Not linked to an event", because Kalutara has no active event. Allocation still works. | |
| P8-23 | Two officers at once | Register a test shelter with **capacity 10**. Open Shelters in two windows (a normal window and an Incognito window, both signed in as the District Officer). Open Allocate on that shelter in both and enter `6` in each. Click Confirm in window A, then window B. | **Only one** allocation succeeds. Window B either disables Confirm and shows "Insufficient capacity…" (it updates live), or shows "The selected shelter does not have enough available places." Final occupancy is **6**, never 12. | |
| P8-24 | Overview follows | Open Overview after your allocations. | "Available shelter places" and the shelter summary match the Shelters page. | |

---

## 10. Phase 9: Disaster analytics and reports (UC04)

Web dashboard, signed in as the **DMC Analyst**. Open **Disaster Analytics**.

The metric tiles are:

- **Hazard reports received:** reports linked to the event.
- **Verified reports:** Verified plus Escalated.
- **Citizens reached:** different people whose verification notification was delivered.
- **Current shelter occupancy:** today's total for the district's shelters. Shelters keep no history, so a past event also shows today's figure.
- **Evacuees allocated:** confirmed allocations linked to the event.

### Part A: Baseline (do right after a fresh data reset, before Phases 7–8)

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P9-01 | Event list | Open Disaster Analytics. Use the Status, District and search filters. | 3 events, each with hazard, district, period, status chip (Active or Completed) and an "Analyse" button. The active event's period ends with "ongoing". The filters work, and no match shows "No events match these filters". | |
| P9-02 | Final report | Click Analyse on **Ratnapura Floods — May 2025**. | The header shows the name, "Flood · Ratnapura · dates". A green **Final Report** chip with "Completed event with every metric complete."<br>Tiles: **5 · 4 · 2 · 385 · 240**, all ✓ "Complete" with their source collection. | |
| P9-03 | Charts and tables | On the same page, hover the bars and use the Chart/Table toggle on each card. | **Reports by day:** 21 May 2, 22 May 1, 23 May 1, 24 May 1.<br>**Reports by hazard type:** Flood 4, Landslide 1.<br>**Verification outcomes:** Verified 3, Escalated 1, Rejected 1, Pending 0.<br>**Shelter occupancy by district:** Ratnapura 385 / 530 (about 73%), Kalutara 0 / 320. The closed shelter isn't counted.<br>Tooltips appear on hover, and the Table view shows the same numbers. | |
| P9-04 | Second final report | Open **Kalutara Landslides — November 2025**. | **Final Report**. Tiles: **4 · 3 · 2 · 0 · 105**. | |
| P9-05 | Provisional report | Open **Ratnapura Floods — October 2026**. | Orange **Provisional Report** chip: "Provisional because the event is still active and some metrics are missing or incomplete."<br>Warning: "2 hazard reports are in Ratnapura during this event still waiting for verification…"<br>Info: "Some metrics could not be calculated. Missing or incomplete: Hazard reports received, Verified reports."<br>Tiles: **3 (Incomplete) · 3 (Incomplete) · 2 · 385 · 385**. "Share with donor" is disabled and the note says "Provisional reports can be saved and exported but not shared with donors." | |

### Part B: Filters

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P9-06 | Date filter | On the May 2025 event, set From `2025-05-22` and To `2025-05-23`, then click "Generate report". | Hazard reports received **2** and Verified reports **1**. Reports by day shows only 22 and 23 May. | |
| P9-07 | Date order check | Set From after To, then click "Generate report". | "End date must be on or after the start date." The figures on screen don't change. | |
| P9-08 | District filter | On the May 2025 event, set District **Kalutara** and generate. | "No hazard reports linked to this event match these filters." The report charts say "No data for these filters." Current shelter occupancy shows Kalutara's figure. | |
| P9-09 | Reset | Click "Reset". | Back to the event's own district with no dates, and the original numbers. | |
| P9-10 | Refresh | Note the "Data as of …" time and click "Refresh". | The time updates to now. | |

### Part C: Save, export and share

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P9-11 | Save | On the May 2025 event (no filters), click "Save report". | Toast: "Report saved." The button changes to **Saved** and is disabled. "Saved reports for this event" gains a row with a Final chip, the time, and "5 reports · 240 evacuees". | |
| P9-12 | Export PDF | Click "Export PDF". | The button shows "Exporting…". A PDF named `LankaShield-EVT-SEED-RAT-2025-<id>.pdf` downloads. Toast: "PDF exported and stored." An **"Open stored PDF"** link appears and opens the stored copy. The history row gains a **PDF** link. | |
| P9-13 | PDF contents | Open the downloaded PDF. | Title "LankaShield — Disaster Response Report", the event name, "Flood · Ratnapura · dates · Event completed" and **FINAL REPORT**. Then the report ID, generated time and analyst name, the filters, and a metrics table (Metric / Value / Complete / Source). Then tables for hazard type, verification outcomes and shelter occupancy. The footer reads "Authorised final report · Page X of Y". | |
| P9-14 | Provisional PDF | On the **October 2026** event, click "Export PDF" without saving first. | It saves automatically (a new history row appears) and downloads. The PDF says **PROVISIONAL REPORT**, lists bullet notes (unreviewed reports, missing metrics, "The event is still active…"), and the footer says "Provisional — not for distribution". | |
| P9-15 | Share needs a saved Final report | On the May 2025 event, change a filter and click "Generate report", then look at the share button before and after "Save report". | "Share with donor" is **disabled until saved**. A new analysis run resets the button to "Save report". | |
| P9-16 | Share with donor | After saving a Final report, click "Share with donor", choose an organisation and click "Record share". | The dialog explains that delivery is mocked. Toast: "Authorised share with *organisation* recorded." The history row shows "Shared with *organisation*". | |
| P9-17 | Export failure keeps the analysis | Open DevTools (F12) → Network → set **Offline**, or turn off the laptop's Wi-Fi. Click "Export PDF". Then go back online and click **Retry**. | A red message: "PDF export failed. … The analysis above is kept — nothing needs to be recalculated." The tiles and charts stay on screen. Retry succeeds once you are online. A short wait before the error is normal. | |
| P9-18 | Unknown event | Open `http://localhost:5173/analytics/NOPE`. | "Event not found". | |

### Part D: Cross-checks (after Phases 7 and 8)

| ID | Test | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| P9-19 | Verification feeds analytics | In P7-13 and P7-15 you verified LS-SEED-013 and escalated LS-SEED-014, linked to the October 2026 event. Open that event. | Hazard reports received **5**, Verified reports **5**, both **Complete**. The "waiting for verification" warning is gone, unless newer pending Ratnapura reports exist. The report is still **Provisional**, because the event is active. | |
| P9-20 | Allocations feed analytics | Add up the allocations you linked to "Ratnapura Floods — October 2026" in Phase 8. | **Evacuees allocated** = 385 + your total. **Current shelter occupancy** equals the sum of the Ratnapura shelters' occupancy on the Shelters page. | |

---

## 11. End-to-end scenario

Run this once at the end with two people, or one person using the phone and the laptop. It walks through one disaster from the first report to the donor report.

| Step | Who / where | Action | Check | Result |
| --- | --- | --- | --- | --- |
| 1 | Citizen (phone) | Go **offline** and report a **Flood**, severity High, with 1 photo. Choose district **Ratnapura**. | "Saved on this device" and Pending Sync | |
| 2 | Citizen (phone) | Go **online**. | Syncs automatically and shows Pending Verification | |
| 3 | Duty Officer (web) | Find the report in the queue (live), open it, and check the photo and "(sent from the offline queue)". Choose **Verify and escalate**, link **Ratnapura Floods — October 2026**, and add a remark. | Recorded and status Escalated | |
| 4 | Citizen (phone) | Open My Reports. | Escalated, with the officer's remark shown | |
| 5 | District Officer (web) | Allocate `30` evacuees to a Ratnapura shelter, linked to the October 2026 event. If it doesn't fit, use an alternative. | Allocation confirmed and the table updated | |
| 6 | DMC Analyst (web) | Open the October 2026 event. | Reports received and Verified each went up by 1; Evacuees allocated went up by 30; still Provisional | |
| 7 | DMC Analyst (web) | Export the PDF. | The PDF shows the new numbers and PROVISIONAL REPORT | |

---

## 12. Deferred until the Android development build

These can't be tested in Expo Go. They will be tested once the installable development build is ready.

| ID | Feature |
| --- | --- |
| D-01 | "Choose on map": tap to place the pin, drag it, "Use this location", and the district detected from the chosen point (P5-17) |
| D-02 | The Location map on the mobile Report details screen |
| D-03 | The "This location is outside Sri Lanka. Check it before submitting." warning when a point outside Sri Lanka is picked on the map |
| D-04 | Queued offline reports surviving a full app restart while offline. Expo Go can't reopen without the laptop. |
| D-05 | Installing and opening the app without Expo Go: app name, icon and splash screen |

---

## 13. Bug report template

Copy this for each problem you find:

```markdown
### BUG-NN: <short title>

- **Test ID:** P7-11
- **App:** Web dashboard / Mobile (Expo Go)
- **Account used:** duty.officer.demo@example.com
- **Device / browser:** e.g. Samsung A52 Android 14, Expo Go / Chrome 129 on Windows 11
- **Steps to reproduce:**
  1. …
  2. …
- **Expected:** …
- **Actual:** …
- **Screenshot / screen recording:** (attach)
- **Tracking ID / shelter / event involved:** e.g. LS-20261005-AB12CD
- **How often:** every time / sometimes / once
- **Severity:** Blocker (can't continue) / Major (feature wrong) / Minor (cosmetic, wording)
```

### Results summary

| Phase | Total tests | Pass | Fail | Blocked | Deferred | Tester | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4 — Sign-in and shells | 26 | | | | | | |
| 5 — Online report (UC01) | 17 | | | | 1 | | |
| 6 — Offline and sync | 14 | | | | | | |
| 7 — Verification (UC02) | 20 | | | | | | |
| 8 — Shelters (UC03) | 24 | | | | | | |
| 9 — Analytics (UC04) | 20 | | | | | | |
| End-to-end | 7 steps | | | | | | |
