# Accounts, return navigation and tournament community

## Create administrator accounts

All public sign-ups receive the Player role. To create an Admin or Super admin, first register the person's normal account. Log in as an existing Super admin, open **Admin → Players**, select the account role, enter a reason and confirm **Update role**. The change is recorded in Audit history and revokes the affected user's sessions; they must log in again.

The initial local Super admin is `jordan@touchline.example`. Its random password is in the ignored `.local/admin-credentials.txt` file. This password is not a production default. Ordinary admins cannot grant roles. Self-modification and modification of existing Super admin accounts are blocked by the API.

## Return after registration

Authentication entry links capture a same-origin destination, including query parameters and fragments. The Login → Create account link preserves it. Successful registration logs in the new account and replaces the auth screen with that destination. Direct sign-ups without a destination go to `/dashboard`. Verification remains mandatory before tournament registration. Unsafe external destinations, backslashes, control characters and auth-page loops are rejected. Only navigation state is stored in sessionStorage; credentials remain in HTTP-only cookies.

## Groups tab

Every tournament format now has a Groups tab. It contains one shared tournament community room, plus competitive group rosters where the format has groups. An Admin or Super admin can save, replace or remove an HTTPS invite link there. This link is private to approved participants and administrators; it is not included in public tournament payloads. The app does not fetch or embed the remote link.

The same participants can exchange plain-text messages. The UI shows the latest 100 messages, keeps unsent text after failures, and retries a message using its original client identifier to prevent duplicate storage. Messages persist in PostgreSQL. Completed and cancelled tournament rooms are read-only. Existing group rosters remain separate from the tournament-wide chat room.

## Transport and permissions

- `GET /api/v1/tournaments/:id/community`: permitted snapshot and latest messages.
- `PATCH /api/v1/tournaments/:id/community`: administrator-only link update, CSRF protected and audited.
- `POST /api/v1/tournaments/:id/community/messages`: participant/admin send, CSRF protected, max 1,000 characters, per-author burst limit.
- `GET /api/v1/tournaments/:id/community/stream`: cookie-authenticated Server-Sent Events; no tokens in URLs.

Messages trigger immediate snapshot events in the serving API process. A five-second database check catches changes from other processes and rechecks account status, session revocation, token expiry and membership. Streams close after five minutes and reconnect automatically; the REST client refreshes expired sessions when possible. Connections are capped at five per user per API process. A production reverse proxy must disable SSE response buffering and allow long-lived responses. Large deployments should replace periodic reads and process-local connection limits with shared pub/sub and distributed limits.

Chat content is rendered as text, never HTML. Link changes are audited without copying the private invitation URL into the audit metadata. On small screens the link panel stacks above chat; messages wrap and the history scrolls independently. Controls have labels, live connection feedback and keyboard focus.

## Notifications, kickoff and player identity

Each new chat message creates a persistent in-app notification for the other approved participants and the tournament creator. Replayed sends do not create duplicate notifications. The header bell shows unread notifications and a temporary toast for new arrivals; it checks every three seconds, including background tabs. Clicking a chat notification opens the tournament's Groups tab. These are in-app notifications, not operating-system push notifications.

Admins and Super admins can choose **Kick off now** on the tournament overview or admin tournament list. Confirmation closes registration, generates fixtures when needed, shifts an existing schedule to start now while retaining its spacing, and makes assigned opening-round matches live. This is one serializable transaction with audit and player notifications. Published tournaments need the configured minimum approved players and no pending registrations. Repeated kickoff requests cannot duplicate fixtures.

The Players tab links approved entrants to public profiles with an uploaded photo (or initials placeholder), eFootball username, and stats from official public-tournament results. Players can upload their picture in **My arena → Profile**. History privacy is respected. Private and empty participant lists have explanatory states. Night Fight's list was made public at the workspace owner's explicit request.

Login accepts email, Touchline username, or a unique eFootball username, without case sensitivity. New registrations and profile edits reject conflicting identifiers. PostgreSQL name claims prevent concurrent duplicate eFootball assignments. Existing duplicated names are reserved and remain unchanged until the owner chooses replacement names; ambiguous eFootball-name login is unavailable for those names, while email and Touchline-username login remain usable. Claims automatically become available when the old name is no longer used. No existing user's game username is silently renamed.

## Profile and bracket presentation

Public and personal profile pages share the cover, editable owner avatar, win-rate summary, official-stat panels and history cards. Only the profile owner sees the photo-change control. Public avatars and tournament artwork support cross-origin embedding from the local API; match evidence remains authenticated and permission checked.

Knockout brackets render connected match cards using actual next-match references, player names and profile pictures (initials when no photo is uploaded). Cards open match details. The horizontally scrollable board includes a round-filtered match-list alternative; third-place matches are displayed separately. League tournaments retain their standings table.

The notification menu includes **Enable notification sound** and **Mute notification sound**. Enabling plays a short confirmation chime. New notifications play the same chime while enabled; the preference is stored per account in this browser. Browser audio restrictions still require a user interaction to enable playback.

New account, profile, discovery and tournament platform controls offer PC and Mobile only. The API validates those choices. Existing console platform records are deliberately preserved; they were not bulk-converted to PC. Updating such a profile requires the user to explicitly choose a supported platform.

## Validation

The 56 automated tests cover private access, CSRF, unsafe links, duplicate sends/notifications, live delivery, stream revocation, role promotion, safe return destinations, all three login identifiers, case-insensitive name conflicts, immediate kickoff concurrency, official player stats, supported platforms and public-avatar/private-evidence access. Browser walkthroughs cover creation → original destination → verification → joining, live link updates, bidirectional messaging and notifications, immediate kickoff, player profiles, login identifiers and mobile width. Profile photo persistence, notification chimes, connected brackets, match links and league tables were also checked in the browser.

## Match readiness and launch checks (September 14)

Private match coordination is persisted separately from public match data. Opponents and administrators can read the room; other users receive 403. Each opponent can check in starting 30 minutes before the scheduled time. Lobby instructions are plain text and private. Check-in is idempotent. A player who has checked in can report a no-show 15 minutes after the scheduled time. Administrators receive a notification and an entry in the no-show queue under Matches/Disputes. Decisions explain next steps; they do not automatically change official scores. Existing result review remains the authority for scores and bracket progression.

Rescheduling is limited to scheduled matches in active competitions. It requires a future time and reason, notifies both players, and resets readiness and lobby details. An open no-show report must be reviewed first. Resolved report details are retained in the reschedule audit event and a new report may be filed for the new schedule.

A worker checks each minute for match check-in reminders. A database unique key prevents repeat notifications across workers or restarts, while a new schedule creates a fresh reminder. Players can disable these reminders in Account settings. The worker runs with the API process; offline reminders are not email or OS push notifications. Existing critical result and schedule notices remain enabled.

`npm run email:check` checks configured SMTP connectivity/authentication without sending an email or printing secrets. SMTP delivery requires encrypted transport. `npm run launch:check` reports environment readiness without revealing credentials. The current workspace remains local: SMTP, HTTPS deployment and persistent production storage are not configured. Provide the email provider and deployment/domain choices, then enter secrets through the deployment provider's secret settings. A real verification email and inbox walkthrough remain required after setup.

Older duplicate game usernames now have a private profile warning and a self-service path to choose a unique replacement. No account names were changed automatically. Organizer applications/workspace, waitlists, season rankings and shareable champion artwork remain separate follow-up work; they are not part of this match-lifecycle release.

Validation: 60 integration/unit tests and a real browser walkthrough using two players and an administrator cover private-room access, public avatar data, readiness, lobby delivery, no-show review, rescheduling, reminder deduplication, opt-out persistence and mobile width.

## Super administrator account deletion

Admin → Players offers Delete account only to super administrators. A modal requires the exact username and an audit reason. DELETE /api/v1/admin/users/:id enforces the role, session and CSRF requirements; the transaction rechecks the actor and target. Self-deletion and deletion of super administrators are blocked.

Deletion removes the profile, login credentials, sessions, reset/verification tokens, notifications and chat messages. The user becomes an irreversible anonymized tombstone named Deleted player, preserving tournament memberships, historical matches, evidence and audit references. Deleted accounts disappear from user management and cannot be restored through moderation controls. Existing active fixtures require a separate administrative decision. This is account deletion with retained competition records, not an erasure of all historical material. No existing real account was deleted during implementation; only isolated test fixtures were used.

## Administrator tournament deletion

Admin and Super admin can delete tournaments in any state from Admin → Tournaments. The dialog requires the tournament slug and an audit reason and explains the permanent removal of registrations, fixtures, results, standings and chat. The API rechecks role, active account and exact slug inside a serializable transaction. Dependent competition records are removed in foreign-key-safe order; user accounts and audit history remain. Participant notifications identify the deleted competition. Champion achievements are removed only if the player has no other championship records. No real tournaments were deleted during implementation; role and populated-tournament deletion checks use isolated fixtures.
