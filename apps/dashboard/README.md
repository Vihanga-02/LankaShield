# LankaShield Dashboard

React + Vite officer dashboard for Duty Officers, District Officers and DMC Analysts —
UC02 Verify Hazard Report, UC03 Manage Emergency Shelter, UC04 Generate and Analyze Disaster Response Report.

```bash
cp .env.example .env     # fill in Firebase values
npm run dashboard        # from the repo root
```

Deployed on Vercel with `apps/dashboard` as the root directory (`npm run build`, output `dist`).

## Stakeholder notifications

Choose Verify and escalate, select stakeholders, edit the title/message, and record the decision.
This atomically saves a VERIFIED report, warning request, and PENDING stakeholderNotifications record.
Use Send Notification on the report or Notifications page to deliver to registered in-app inboxes.
SENT means inbox records were persisted for all resolved recipients; it does not mean read, SMS, or email delivery.

The stakeholder selector uses the five existing registered roles: Citizen (CITIZEN),
Volunteer (VOLUNTEER), Duty Officer (DUTY_OFFICER), District Officer (DISTRICT_OFFICER),
and Analyst (DMC_ANALYST). Each selected role includes all active registered users in that role,
across districts. No specialist memberships are required for new notifications.
Previously saved specialist-group notifications retain their original recipient matching.

Duty Officers and DMC Analysts can also compose notifications on the Notifications page by
selecting a verified hazard report, one or more roles, and entering a title/message.
Send Notification saves a Pending record before attempting delivery. Both sender roles have
an outbox and a Received tab; District Officers have a received inbox. Citizens and volunteers
see received messages in the mobile Notifications tab.

Missing recipients for any group produces a visible FAILED record; no group is silently skipped.
Recipients are frozen on the first resolved attempt. Bounded transactions retain delivery progress and
stable inbox document IDs, so retries do not duplicate or reset delivered inbox messages.
Latest attempt time/count/error and recipient progress are stored in Firestore. Verification is never rolled back.

Automatic retries run every minute and on reconnect while a Duty Officer or DMC Analyst dashboard session is open,
only after Send Notification has been requested. Records survive browser closure and login.
An offline click keeps the saved notification pending for manual retry after reconnecting.
There is no always-running server worker. Received inboxes are available to dashboard roles
and mobile citizens/volunteers through the existing Notifications pages.

Deployed Firestore rules must authorize active Duty Officers and DMC Analysts to read the recipient directory,
create/update the stakeholder outbox, update linked warning statuses, and create recipient inbox records.
Recipients should only read their own inbox; specialist memberships should be administrator-managed.
This repository has no deployed Firestore rules configuration. Live rules and user memberships are unchanged.

Focused tests from the repository root:

    npx.cmd vitest run apps/dashboard/src/features/notifications/notifications.service.test.ts apps/dashboard/src/features/verification/verification.service.test.ts
