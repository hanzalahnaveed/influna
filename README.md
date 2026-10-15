# Influna

Influna is a Next.js app with a PostgreSQL-backed campaign API and the first creator-marketplace foundation.

## Run locally

Requirements: Node.js 20+ and PostgreSQL 14+.

1. Install packages with `npm install`.
2. Create a PostgreSQL database named `influna`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to your database connection string.
4. Generate the Prisma client and apply migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the app with `npm run dev`.

The frontend and API run together at `http://localhost:3000`; there is no separate service on port 8000. Open `/auth` to register or sign in as a brand/agency or creator.

For production, configure `DATABASE_URL`, run `npm run db:generate` during the build, and run `npm run db:deploy` before serving traffic.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Register a BRAND or CREATOR account; creator registration creates a private profile |
| `POST` | `/api/v1/auth/login` | Sign in and set an HTTP-only session cookie |
| `POST` | `/api/v1/auth/logout` | End the current session |
| `GET` | `/api/v1/auth/me` | Return the current account and creator profile ID, if applicable |
| `GET` | `/api/v1/campaigns` | List the signed-in brand account's campaigns, newest first |
| `POST` | `/api/v1/campaigns` | Create a campaign using the UI's campaign sections |
| `GET` | `/api/v1/campaigns/:id` | Get one campaign |
| `PUT` | `/api/v1/campaigns/:id` | Partially update campaign sections |
| `DELETE` | `/api/v1/campaigns/:id` | Delete a campaign |
| `GET` | `/api/v1/dashboard` | Get campaign totals by status |
| `GET` | `/api/v1/reports/campaigns` | Summarize owned campaign collaboration and deliverable progress |
| `GET` | `/api/v1/campaigns/:id/creators/:campaignCreatorId/commercials` | Read proposal and agreed commercial terms for a collaboration |
| `PATCH` | `/api/v1/campaigns/:id/creators/:campaignCreatorId/commercials` | Send/revise offers, accept/reject offers, counteroffer, or accept a counteroffer with role and ownership checks |
| `GET` | `/api/v1/payments` | List payment records for the signed-in brand or creator |
| `POST` | `/api/v1/payments` | Create a planned payment record against an agreed fee (brand only) |
| `PATCH` | `/api/v1/payments/:id` | Update a payment record status (brand only) |
| `GET` | `/api/v1/creators` | List public creator profiles; optional `search` and `country` filters |
| `POST` | `/api/v1/creators` | Create a creator profile and social-account handles |
| `GET` | `/api/v1/creators/:id` | Get one public creator and latest recorded metrics |
| `PATCH` | `/api/v1/creators/:id` | Update creator profile fields |
| `POST` | `/api/v1/social-accounts/:id/snapshots` | Record a timestamped social-metric snapshot |
| `POST` | `/api/v1/campaigns/:id/matches` | Calculate and save transparent rule-based creator matches |
| `GET` | `/api/v1/campaigns/:id/creators` | List creator records and workflow status for a campaign |
| `PATCH` | `/api/v1/campaigns/:id/creators/:campaignCreatorId` | Apply a validated creator collaboration workflow transition |
| `GET` | `/api/v1/campaigns/:id/creators/:campaignCreatorId/deliverables` | List requirements and versioned submissions for a collaboration |
| `POST` | `/api/v1/campaigns/:id/creators/:campaignCreatorId/deliverables` | Add a deliverable requirement (brand only) |
| `PATCH` | `/api/v1/campaigns/:id/creators/:campaignCreatorId/deliverables/:deliverableId` | Submit a version, request revisions, or approve a submission with ownership checks |
| `GET` | `/api/v1/campaigns/:id/creators/:campaignCreatorId/shipments` | Read manually recorded shipment details for an owned collaboration |
| `POST` | `/api/v1/campaigns/:id/creators/:campaignCreatorId/shipments` | Record carrier and tracking details for an accepted collaboration |
| `PATCH` | `/api/v1/campaigns/:id/creators/:campaignCreatorId/shipments/:shipmentId` | Update tracking details or advance Preparing → Shipped → Delivered → Received |
| `GET` | `/api/v1/creator/campaigns` | List active campaigns for a signed-in creator, including their application status |
| `POST` | `/api/v1/creator/campaigns` | Apply to an active campaign from the signed-in creator profile |
| `GET` | `/api/v1/creators/:id/invitations` | List invitations for the signed-in creator profile only |
| `POST` | `/api/v1/creators/:id/social-accounts` | Add a self-reported social account to the signed-in creator profile |
| `DELETE` | `/api/v1/creators/:id/social-accounts/:socialAccountId` | Remove a social account owned by the signed-in creator |
| `POST` | `/api/v1/creators/:id/social-accounts/:socialAccountId/verification` | Submit or resubmit a creator-owned social account for verification review |
| `GET` | `/api/v1/admin/verification-requests` | List pending verification requests (ADMIN only) |
| `GET` | `/api/v1/admin/integrations/status` | Report integration configuration readiness without exposing secrets (ADMIN only) |
| `GET` | `/api/v1/notifications` | List the signed-in user’s notifications and unread count |
| `PATCH` | `/api/v1/notifications` | Mark one notification or all notifications as read |
| `PATCH` | `/api/v1/admin/social-accounts/:id/verification` | Approve or reject a pending request with an audit timestamp and reviewer identity (ADMIN only) |

Brand-only campaign endpoints and creator-only profile/invitation endpoints require an active session. Campaign reads and writes are scoped to the signed-in brand owner; creator profile updates, metric snapshots, invitations, and content submissions are scoped to the signed-in creator. New creator profiles start private. Existing records without an owner remain in the database but are not visible through owner-scoped campaign endpoints. Passwords are hashed with Node.js scrypt; sessions use random opaque tokens stored as SHA-256 digests and an HTTP-only, SameSite=Strict cookie.

Campaign JSON uses `campaign_details`, `targeting_criteria`, `platform_details`, and `payment_information`. Campaign-level payment information remains a place for general terms; collaboration-specific offers and negotiated fees are stored on the campaign-creator relationship. Complete campaigns are validated on create/update; drafts may be incomplete.

## Creator data and matching

Creator profile fields and social-account handles are supplied by the creator unless otherwise stated. Each metrics snapshot requires a `data_source` of `creator_provided`, `meta_api`, `platform_api`, or `manual_review`, and records when it was observed. Creator-facing metric submission accepts only `creator_provided`; API-source labels cannot be self-asserted through that endpoint. A social account is only marked verified when an authorized reviewer approves its pending request; creators cannot approve their own accounts. Requests may include a reviewer note and evidence URL, and the review stores status, timestamps, reviewer identity, and feedback. The admin endpoints require a user whose database role is `ADMIN`; do not expose admin role selection during public registration. For this milestone, an administrator must be provisioned through a trusted database/operations process. A handle or profile URL alone does not prove account ownership or official metrics. Do not label metrics as API-sourced unless they really came from an authorized platform integration.

The Campaign Reports dashboard summarizes creator collaboration states, deliverable approvals, overdue deliverables, creator acceptance rate among decided invitations/applications, average stored profile-fit score, and on-time approval rate among approved deliverables with deadlines. These are operational workflow metrics from Influna records; they do not claim verified reach, engagement, sales, or ROI.\n\nThe matching endpoint uses a deterministic, explainable rule-based score for creator categories/interests, creator location, language, requested platform, and—when criteria and recorded data are available—follower range, minimum engagement rate, and target audience age/gender breakdowns. Campaign setup exposes optional minimum/maximum follower counts and minimum engagement rate. Factors without enough metric data are excluded rather than scored as a mismatch; creator-provided metrics are explicitly identified. The score is a preliminary profile-fit estimate, **not** an AI prediction of campaign performance, authenticity, reach, conversions, or ROI. The matching algorithm is versioned as `rule_based_v2`.

## Important limitations

The Deliverables dashboard lets brands define per-creator requirements, descriptions, and deadlines; creators submit content URLs as versioned submissions; brands can request revisions or approve a version. Each revision is retained with its URL, notes, timestamp, status, and reviewer feedback. The Product Shipping dashboard lets brands record a carrier, tracking number/URL, shipment notes, and manually advance shipment status; creators can confirm receipt after the brand marks the package delivered. These are workflow records only—media is not uploaded, posts are not published, and notifications/payments are not triggered. Creator discovery supports name/bio/category search, country filtering, plus client-side platform and category filters. Creators can browse active campaigns at `/dashboard/creator-campaigns` and apply directly; brands can accept or decline applications in Creator Workflow. Brands can calculate preliminary profile-fit matches and record an invitation directly from a match card; invitations appear in the creator inbox, but recording an invitation does not deliver an external message. The dashboard includes a manual campaign collaboration tracker with Suggested → Invited → Accepted/Declined → ContentSubmitted → ChangesRequested/Approved → Completed states, plus cancellation. Creator accounts can manage their own profile and social handles at `/dashboard/creator-profile`, review invitations at `/dashboard/creator-invitations`, and submit or resubmit content URLs for brand review. The tracker does not send invitations or notifications, and social handles are self-reported until a real platform authorization/verification flow is implemented. Content links and review notes are stored with timestamps.

Email verification, password reset, rate limiting/abuse controls, CSRF tokens for cross-site deployments, Meta OAuth/API integration, automated invitations/notifications, payment execution, and production monitoring are not implemented yet. The admin Integration Readiness page at `/dashboard/admin-integrations` reports whether required server environment variables are present without returning their values. Meta is explicitly blocked until API access approval is recorded; having credentials alone does not mean OAuth or metric synchronization is implemented. The endpoint is operational readiness reporting only, not a live provider health check. Creator verification requests and an admin review interface are available at `/dashboard/admin-verification`; the interface and review APIs require an `ADMIN` database role. Admin accounts must be provisioned through a trusted database/operations process; public registration must never offer the `ADMIN` role. Authentication and ownership checks now cover the primary campaign, creator, invitation, matching, metric-snapshot, and dashboard APIs, but this is still an early-stage foundation and requires a security review before production exposure. Do not use real creator data in a public demo without permission.


## Commercial operations

Brands can send an offer with a fee, currency, payment terms, and note to a linked creator. Creators can accept or reject an offer, or submit a counteroffer. Brands can accept a counteroffer or send a revised offer. Accepted terms are stored as an agreed fee and cannot be silently overwritten by a new offer. Payment records support planned, processing, paid, and cancelled statuses, due dates, references, and notes. Multiple installments are supported, the payment currency must match the agreed fee currency, and non-cancelled payment records cannot exceed the agreed fee. Paid and cancelled payment records are terminal.

The dashboard is available at `/dashboard/commercials` for brand and creator accounts. These are **manual commercial and ledger records**, not a payment processor: no money is charged or transferred, and marking a record paid is an explicit manual action after an external payment has been confirmed. Payment provider integration, invoices/tax workflows, dispute handling, and notification delivery remain future work.


## In-app notifications

The notifications inbox is available at `/dashboard/notifications`. It stores user-scoped notifications in the database and supports unread counts, marking individual items read, and marking all items read. Notifications are generated for creator campaign applications, invitations and responses, commercial offers/counteroffers, and deliverable submissions/reviews. Notification creation is best-effort: a notification insert failure is logged but does not undo the campaign action. These are in-app notifications only; email, push delivery, and real-time updates are not included in this milestone.
