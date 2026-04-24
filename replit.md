# Kontrib - Financial Group Management System

## Overview
Kontrib is a full-stack web application for managing group financial contributions in Nigeria. It enables administrators to create contribution groups and projects, while members can join and make secure payments. The platform aims to provide transparent tracking, secure transactions, and efficient communication, aspiring to be the leading solution for community and group contributions in Nigeria.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite, leveraging Shadcn/UI (based on Radix UI) and Tailwind CSS. It features a custom Nigerian-themed color palette and a mobile-first design, including dynamic Open Graph meta tags for social sharing.

### Technical Implementations
- **Frontend**: Utilizes React Query for state management, Wouter for routing, and React Hook Form with Zod for form validation. Client-side authentication is handled via `localStorage` with backend validation on page load.
- **Backend**: Built with Node.js and Express.js, featuring Drizzle ORM for type-safe database operations and Zod for shared validation schemas.
- **Authentication**: WhatsApp OTP authentication with device remembering. Flow: phone entry → OTP verification → profile completion (new users) → role selection. Device tokens (90-day expiry) enable automatic login on trusted devices. Sessions validated via device token on page refresh with graceful fallback. Role-based access control (Admin/Member) with global phone number validation.
- **Payment Processing**: Members upload proof of payment for admin approval; the system tracks transactions, progress, and payment history.

### Feature Specifications
- **Dual-Role System**: Users with one WhatsApp number can be admin of some groups and member of others. The `/api/groups/all/:userId` endpoint returns all groups with role metadata ("admin", "member", "both"). Dashboard shows separate "Groups You Manage" and "Your Contributions" sections. Group details page displays tabs for dual-role users.
- **Group Management**: Admins can create groups with custom URLs, generate registration links, and manage group statuses. When an admin creates a group, they are automatically added as the first group member.
- **Member Management**: Dedicated members page (/group/:id/members) shows all group members with name and phone. Admins can remove members with one click; removed members receive an in-app notification immediately.
- **Project Type System**: Projects support multiple types - Target Goal (with target amount and progress tracking), Monthly Dues, Yearly Levy, Event, and Emergency. Monthly/Yearly types have no target amount and hide progress bars.
- **Dedicated Project Pages**: Each project has its own page (/project/:id) with full details, contributors list, and payment information. Projects are clickable from group pages.
- **Payment Account Details**: Admins can specify bank account details (Bank Name, Account Number, Account Name, Additional Instructions) when creating projects. These details are displayed to members with copy-to-clipboard buttons.
- **Web Push Notifications**: Native browser push notifications powered by Web Push API and VAPID. Admins receive push alerts for new receipts even when the app is closed. Service worker (`client/public/sw.js`) handles push events and notification clicks. Subscriptions stored in `push_subscriptions` DB table. Users opt-in via the notification bell panel. VAPID keys stored as `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` env vars.
- **WhatsApp Integration**: Generates professional sharing messages and dynamic Open Graph meta tags.
- **Unified My Groups Page**: Single entry point for all users at /groups. Shows all groups with role badges (Admin in green, Member in blue). Filter pills allow filtering by All, Admin, or Member roles.
- **Simplified Navigation**: Three main navigation links: My Groups, Pay, History. Logo links directly to /groups. Old dashboard routes (/dashboard, /admin) redirect to /groups.
- **Project Contribution Transparency**: Members can view detailed contributor lists for any project, showing all confirmed contributions sorted by amount, total contributions, and remaining balance.
- **Unified Groups Page**: Single "My Groups" page with filter pills (All, Admin, Member) to filter groups by role. Each group card shows role badges and context-aware action buttons.
- **Payment Reminders**: Admins can nudge unpaid members via WhatsApp. Project page shows "Unpaid Members" section with individual "Remind" buttons (opens direct WhatsApp message) and "Remind All via WhatsApp" for bulk reminders. Button states reflect phone number availability - disabled for members without phone numbers.
- **Funds Disbursement Tracking**: Admins can record how collected funds are spent. When recording, admin can choose to assign a group member as recipient (with dropdown) or enter a custom "other" recipient. If a member is assigned, they receive a push notification and see a "Confirm I Received These Funds" button on the project page; confirmed disbursements show a green "Confirmed" badge. Disbursement report masks member names as "Member" for private groups. Schema: `disbursements` table includes `recipientUserId` (nullable FK), `memberConfirmed` (boolean), `memberConfirmedAt` (timestamp). Routes: `POST /api/disbursements/:id/confirm` for member confirmation.
- **Co-Admin Badge**: Group cards show a blue "Co-admin" badge for users who are co-admins but not the primary admin. Co-admins receive a push notification when appointed.
- **Co-Admin Permissions**: Co-admins can approve/reject contribution receipts and view proofs. Only the primary admin can edit group settings, manage members, or delete the group.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM for a relational schema (Users, Groups, Members, Contributions, OTPs).
- **Modularity**: Designed for scalability and maintainability of frontend and backend components.
- **Environment Configuration**: Supports development and production environments using environment variables.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL driver.
- **drizzle-orm**: Type-safe ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/...**: Accessible UI component primitives.
- **wouter**: Lightweight React router.
- **PostgreSQL**: Primary database.
- **Drizzle Kit**: Database migration and schema management.
- **TypeScript**: Static type checking.
- **Vite**: Build tool and development server.
- **Tailwind CSS**: Utility-first CSS framework.
- **canvas**: Node.js Canvas API for dynamic image generation.
## Verified Ajo (Phase 1) — Stress-tested April 2026

End-to-end stress test of all 7 shipped steps passed after one bug fix:

- **Bug found & fixed**: the apply flow was creating a `verification_officers` row for the admin themselves with `status='pending'`, but no UX existed for the admin to ever "accept" themselves. As a result, `maybeAdvanceVerificationStatus` could never see all-officers-accepted, and applications were stuck in `submitted` forever even after 5+ vouches.
- **Fix**: `submitVerificationSchema` now requires `adminLegalName` + `adminSelfie`. The apply storage call writes the admin officer row directly as `accepted` with those values and mirrors them onto the user profile. The apply modal collects them on step 2 (legal name input + selfie file upload with preview).
- **Verified end-to-end**: eligibility floor, apply gating, officer accept/decline (with auth + selfie validation), attester vouch/decline, auto-advance to `under_review` at 5 vouches, ops queue auth, ops approve → group becomes verified-active with 12-month expiry + public listing default-on, admin-only listing toggle, locality-ranked discovery (same-LGA > other state), discovery hides on listing-off and on expiry, identity-light join gate (legal name + data: image selfie required for verified groups, NOT required for unverified groups, persisted on `group_members.joiner_legal_name` / `joiner_selfie_data_url`).

## 3-Group-Type Architecture — Phase 1 Foundation (April 2026)

The product now distinguishes three categories of groups end-to-end:

- **Ajo / Esusu** (`groupType='ajo'`) — rotating cycle savings; members pay a fixed amount each cycle and take turns receiving the pot.
- **Association Dues & Levies** (`groupType='association'`) — recurring dues plus one-off levies; money goes to the association.
- **Project Funds** (`groupType='project'`) — goal-based collection (weddings, gifts, fundraisers); the original Kontrib flow.

Phase 1 (foundation) shipped:

- **Schema**: `groups.group_type` text column (notNull, default `'project'`). All 43 pre-existing groups backfilled to `'project'` automatically by the default. New `users.onboarding_choice_at` timestamp tracks whether the post-signup type-picker card has been acknowledged.
- **Type metadata**: `client/src/lib/group-types.ts` is the single source of truth for label, blurb, example, icon and color per type — used by the onboarding card, the create-group modal, and the dashboard buckets.
- **Onboarding card**: New `GroupTypeOnboarding` component renders on `/groups` for signed-in users with zero groups and no `onboardingChoiceAt`. Three big cards open the create-modal pre-set to that type; a "Have an invite link?" footer routes to `/join-group`. Skipping or picking stamps `onboardingChoiceAt` via `PATCH /api/users/:userId/onboarding-choice`.
- **Create-group modal**: Now a 3-step flow (`type → group → project`). Step 1 is the type picker; on selection the group sub-type pre-selects sensibly (`ajo→monthly`, `association→yearly`, `project→target`). The chosen `groupType` is sent with `POST /api/groups`. When opened with an `initialType` prop, the type step is skipped.
- **Dashboard bucketing**: `/groups` lists are now grouped under section headers per type with the type icon and count, instead of one flat list. Buckets only render when they contain groups.

Phases 2-4: Ajo cycle workflow (Phase 2A done, see below) → Association dues/levies → Reports & polish (Verified Ajo restricted to `ajo`-type groups, public discovery filtered by type).

## Ajo Cycle Workflow — Phase 2A (April 2026)

`groupType='ajo'` groups now run on a dedicated rotating-savings workflow instead of the generic project list. End-to-end smoke-tested at the API level (setup → cycle 1 → advance → cycle 2 → advance → cycle 3 → advance → completed).

- **Schema**: New `ajo_settings` table (one row per ajo group: `contributionAmount`, `frequency` ∈ {weekly, biweekly, monthly}, `payoutOrder` text[] of userIds, `startDate`, `totalRounds`, `currentCycleNumber`, `status` ∈ {active, completed}). The `projects` table now also carries `cycleNumber`, `recipientUserId`, `payoutAt` so each cycle is materialized as a `projects` row with `projectType='ajo_cycle'` — reusing the existing contribution/approval/disbursement infrastructure for free.
- **Storage**: `createAjoSettingsAndStartCycle` (writes settings + creates Cycle 1 project), `getAjoStatus` (returns `{settings, currentCycle: ProjectWithRecipient|null, paidCount, expectedCount}`), `advanceAjoCycle` (closes current cycle project, creates next one or marks settings.status='completed' on the last cycle), `updateAjoPayoutOrder` (locks the prefix `[0..currentCycleNumber-1]`, only the unfinished tail can be reordered).
- **Routes**: `GET /api/groups/:id/ajo`, `POST /api/groups/:id/ajo` (admin-gated, requires `groupType='ajo'`), `PATCH /api/groups/:id/ajo/payout-order`, `POST /api/groups/:id/ajo/advance` (admin-gated).
- **Frontend**: `create-group-modal.tsx` skips the project step entirely for ajo groups (settings drive Cycle 1 instead). `group-projects.tsx` branches on `groupType==='ajo'` — admins see a "Set up your Ajo cycle" CTA → bottom-sheet wizard (`AjoSetupModal`: amount, weekly/biweekly/monthly tri-toggle, start date, up/down reorderable payout list); once settings exist, everyone sees `AjoCycleStatus` (cycle X of N badge, recipient name+pot, due date with days-late/-to-go, paid/expected progress, "Pay or view this cycle" → routes to the cycle's project page, "Coming up" upcoming list, admin-only "Advance to next cycle" button with confirm dialog). When `settings.status='completed'`, the panel shows a "Round complete" hero card.
- **Forbidden generic project flow for ajo**: ajo groups never see the "Create New Project" / "Create First Project" / FAB buttons. The page heading shows "Cycle" instead of "Projects".
### Phase 2B follow-ups (April 2026)

End-to-end smoke-tested: setup → disburse + confirm cycle 1 → auto-advance to cycle 2 → reorder tail → disburse + confirm cycle 2 → cycle 3 starts with the reordered recipient.

- **Auto-advance on confirm**: `POST /api/disbursements/:id/confirm` now, after `confirmDisbursement` succeeds, looks up the disbursement's project; if it's an `ajo_cycle` whose `cycleNumber` matches `ajo_settings.currentCycleNumber` and settings are still `active`, calls `storage.advanceAjoCycle(groupId)` automatically. Wrapped in try/catch so a confirm never fails because of an advance edge case. The new recipient gets a push notification (`type: 'ajo_cycle_started'`). Admins can still hit the manual "Advance to next cycle" button as an override.
- **Unpaid this cycle (admin)**: `AjoCycleStatus` now queries `/api/contributions/project/:cycleProjectId`, intersects with the active members, omits the recipient, and renders an "Unpaid this cycle" card. Each row gets a per-member WhatsApp "Remind" button (uses `generateIndividualReminderMessage` + `generateWhatsAppLink`); a "Remind all" pill at the top opens a WhatsApp share sheet with `generateBulkReminderMessage`. Hidden when fully paid; admin-only.
- **Reorder upcoming members (admin)**: New `client/src/components/ajo-reorder-modal.tsx` — bottom-sheet showing the full payout order with positions `< currentCycleNumber` locked (greyed, no buttons) and the unfinished tail using the same up/down reorder pattern as `AjoSetupModal`. Save sends the full new array to `PATCH /api/groups/:id/ajo/payout-order`; backend rejects illegal reorders ("Cannot reorder past or current recipients") and the UI surfaces the error toast. Triggered by a "Reorder upcoming members" link inside the admin advance card; only shown while `cycleNumber < totalRounds`.

- **Phase 2B (still pending)**: late-payment tracking and dropout handling — out of scope for this iteration.

## Association Dues & Levies — Phase 3A (April 2026)

`groupType='association'` groups now run on a dedicated dues + levies workflow instead of the generic project list. End-to-end smoke-tested at the API level (setup → period 1 with confirmed contribution → admin advance → period 2 with the next month's name → add levy → status reflects 4 expected payers, 1 paid, 1 active levy).

- **Schema**: New `association_settings` table (one row per association group: `duesAmount`, `duesFrequency` ∈ {monthly, quarterly, yearly}, `startDate`, `currentPeriodNumber`, `status` ∈ {active, paused}). The `projects` table reuses `cycleNumber` for the period number. Two new `projectType` values: `'association_dues'` (one project per period, materialized so the contribution/disbursement infra is reused) and `'association_levy'` (one-off charges like building funds).
- **Storage** (`server/storage.ts`, `DbStorage` prototype assignment, MemStorage stubs throw): `createAssociationSettingsAndStartPeriod` (writes settings + creates period 1 dues project), `getAssociationStatus` (returns `{settings, currentPeriod: Project|null, paidCount, expectedCount, levies: Project[]}` — `expectedCount` = active group members), `advanceAssociationPeriod` (closes current period's project, creates the next one with the right month/quarter/year label), `createAssociationLevy` (creates an `association_levy` project with optional deadline + description).
- **Routes** (all admin-gated, require `groupType='association'` where applicable): `GET /api/groups/:id/association`, `POST /api/groups/:id/association` (initial setup), `POST /api/groups/:id/association/advance`, `POST /api/groups/:id/association/levy`.
- **Frontend**: `group-projects.tsx` branches on `groupType==='association'` (page heading reads "Dues" instead of "Projects"; FAB and generic "Create Project" CTAs are hidden). Admins with no settings see a "Set up association dues" CTA → bottom-sheet wizard (`AssociationSetupModal`: amount, monthly/quarterly/yearly tri-toggle, start date). Once settings exist, everyone sees `AssociationStatusPanel` (period N badge, current period name like "May 2026 dues" / "Q2 2026 dues" / "2026 annual dues", per-member + expected-total cards, due date with days-late/-to-go, paid/expected progress bar, "Pay or view this period" → routes to the period's project page). Admin-only: an "Unpaid this period" card with per-member WhatsApp Remind buttons + a "Remind all" share link (reuses Phase 2B `reminders.ts`); a "Levies" card with an inline "Add levy" dialog (name + amount + optional deadline + notes); an "Advance to period N+1" button with a confirm dialog.

## Group Setup Enrichment — Phase 3B (April 2026)

Tightens the on-ramp for the two strictest group types. **Ajo** admins must finish a Kontrib-reviewed KYC and lock a T&C choice before they can configure cycle settings; new members can't join without accepting the T&C the admin chose. **Association** admins gain an optional group-logo upload that surfaces everywhere the group name appears.

- **Schema** (`shared/schema.ts`): `users` gains `kycStatus` ∈ {`not_started`, `pending`, `approved`, `rejected`}, `kycGovName`, `kycPhotoUrl`, `kycIdUrl`, `kycSelfieUrl`, `kycSubmittedAt`, `kycReviewedAt`, `kycReviewedBy`, `kycRejectionReason`. `groups` gains `logoUrl`, `tcMode` ∈ {`kontrib`, `custom`}, `customTcUrl`. `group_members` gains `tcAcceptedAt` (snapshot of when each member accepted the active terms; existing members are grandfathered with NULL).
- **Storage** (`server/storage.ts`, DbStorage prototype-assignment + interface declaration-merging at end of file): `submitAdminKyc`, `approveAdminKyc`, `rejectAdminKyc`, `listPendingKyc` (Kontrib super-admin queue), `setGroupTerms({tcMode, customTcUrl?})`, `setGroupLogo(logoUrl)`, `recordMemberTcAcceptance(groupId, userId)`. Member-T&C is recorded server-side immediately after `addGroupMember` in the join flow, not via a separate client call.
- **Routes** (`server/routes.ts`): `POST /api/users/:id/kyc/submit`, `POST /api/users/:id/kyc/approve`, `POST /api/users/:id/kyc/reject`, `GET /api/kyc/pending` (Kontrib super-admin only — gated by `KONTRIB_SUPERADMIN_USER_ID` env), `POST /api/groups/:id/terms`, `POST /api/groups/:id/logo`, `GET /api/groups/:id/terms` (public, used by join page). `POST /api/groups/:id/ajo` now defence-in-depths: admin must have `kycStatus='approved'` AND group must have `tcMode` set, otherwise 403. `POST /api/registration/:link/join` requires `acceptedTerms===true` in the body and snapshots `tcAcceptedAt` after `addGroupMember`. Object-upload endpoints (`POST /api/objects/upload-url`, `POST /api/objects/normalize`) reused for KYC docs, custom T&C PDF, and group logo.
- **Legal copy** (`client/src/lib/legal.ts`): centralises the Kontrib generic terms, the indemnity language admins accept when uploading a custom T&C, and tiny helpers used by `GroupTermsModal` and the join page.
- **Frontend components**:
  - `KycFileField` — wraps `ObjectUploader` + `/api/objects/normalize`, renders an inline image preview when applicable, and exposes a Replace button. Reused for KYC docs, custom T&C PDF, and the optional group logo.
  - `AdminKycModal` — status-aware form (gov name, profile photo, ID, selfie). Shows a pending banner after submit and a rejection-reason banner with a "Resubmit" affordance when Kontrib rejects.
  - `GroupTermsModal` — admin chooses Kontrib generic T&C (just confirm) or Custom (uploads a PDF + ticks an indemnity acknowledgement); writes via `POST /api/groups/:id/terms`.
  - `KontribKycReviewPage` (`/kontrib/kyc-review`) — env-gated by `VITE_KONTRIB_SUPERADMIN_USER_ID`, lists pending submissions with side-by-side ID/selfie thumbnails and Approve / Reject (with reason) buttons.
- **Ajo gate**: `ajo-setup-modal.tsx` wraps the existing form fieldset in a precondition check; until both KYC is approved and T&C is chosen the form is disabled and inline cards link out to the AdminKyc and GroupTerms modals. Server enforces the same rules on `POST /api/groups/:id/ajo` so a stale client can't bypass.
- **Member T&C on join** (`join-group.tsx`): fetches `/api/groups/:id/terms`, renders the Kontrib generic copy or a "View custom terms" PDF link plus an acceptance checkbox; the join button stays disabled until ticked. Server requires `acceptedTerms=true` and writes `tcAcceptedAt` after `addGroupMember`.
- **Association logo** (`association-setup-modal.tsx`): optional `KycFileField` at the top of the dues setup wizard preloaded from `group.logoUrl`. On save, if the logo changed the modal posts to `/api/groups/:id/logo` first, then to `/api/groups/:id/association`. The logo surfaces as a small avatar to the left of the group name on the `/groups` cards and as a 12×12 thumbnail in the group-projects header.
