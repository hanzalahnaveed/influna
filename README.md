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
| `POST` | `/api/v1/creator-datasets/import` | Import up to 1,000 creator records from a CSV file (BRAND/ADMIN only); skips existing platform handles and labels metric snapshots as public-dataset reference data |
| `GET` | `/api/v1/saved-creators` | List public creator profiles saved by the signed-in brand |
| `POST` | `/api/v1/saved-creators` | Save a public creator to the signed-in brand’s shortlist |
| `DELETE` | `/api/v1/saved-creators/:creatorId` | Remove a creator from the signed-in brand’s shortlist |
| `POST` | `/api/v1/campaigns/:id/creators/shortlist` | Add saved public creators to an owned active or draft campaign as workflow suggestions; does not send invitations |
| `POST` | `/api/v1/creators` | Create a creator profile and social-account handles |
| `GET` | `/api/v1/creators/:id` | Get one public creator and latest recorded metrics |
| `PATCH` | `/api/v1/creators/:id` | Update creator profile fields |
| `POST` | `/api/v1/social-accounts/:id/snapshots` | Record a timestamped social-metric snapshot |
| `POST` | `/api/v1/campaigns/:id/matches` | Calculate and save transparent rule-based creator matches |
| `GET` | `/api/v1/campaigns/:id/creators` | List creator records, workflow status, commercial terms, and deliverables for a campaign |
| `GET` | `/api/v1/campaigns/:id/performance` | List creator collaborations, performance snapshot history, and summary metrics for an owned campaign |
| `POST` | `/api/v1/campaigns/:id/performance` | Record a manual performance snapshot for an accepted collaboration |
| `GET` | `/api/v1/campaigns/:id/plan` | Read the owned campaign's planned deliverables, creator rates, and budget |
| `PUT` | `/api/v1/campaigns/:id/plan` | Replace the owned campaign's proposed plan after ownership and public-rate validation |
| `POST` | `/api/v1/campaigns/:id/plan/deliverables` | Transfer planned lines into an accepted collaboration as deliverable requirements |
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
| `GET` | `/api/v1/creator/rate-cards` | List the signed-in creator's rate cards |
| `POST` | `/api/v1/creator/rate-cards` | Create or replace a rate card for a platform and deliverable type |
| `PATCH` | `/api/v1/creator/rate-cards` | Update a rate card owned by the signed-in creator |
| `DELETE` | `/api/v1/creator/rate-cards` | Delete a rate card owned by the signed-in creator |
| `GET` | `/api/v1/admin/verification-requests` | List pending verification requests (ADMIN only) |
| `GET` | `/api/v1/admin/integrations/status` | Report integration configuration readiness without exposing secrets (ADMIN only) |
| `GET` | `/api/v1/notifications` | List the signed-in user’s notifications and unread count |
| `PATCH` | `/api/v1/notifications` | Mark one notification or all notifications as read |
| `PATCH` | `/api/v1/admin/social-accounts/:id/verification` | Approve or reject a pending request with an audit timestamp and reviewer identity (ADMIN only) |

Brand-only campaign endpoints and creator-only profile/invitation endpoints require an active session. Campaign reads and writes are scoped to the signed-in brand owner; creator profile updates, metric snapshots, invitations, and content submissions are scoped to the signed-in creator. New creator profiles start private. Existing records without an owner remain in the database but are not visible through owner-scoped campaign endpoints. Passwords are hashed with Node.js scrypt; sessions use random opaque tokens stored as SHA-256 digests and an HTTP-only, SameSite=Strict cookie.

Campaign JSON uses `campaign_details`, `targeting_criteria`, `platform_details`, and `payment_information`. Campaign-level payment information remains a place for general terms; collaboration-specific offers and negotiated fees are stored on the campaign-creator relationship. Complete campaigns are validated on create/update; drafts may be incomplete.

## Creator data and matching

Creator profile fields and social-account handles are supplied by the creator unless otherwise stated. Each metrics snapshot requires a `data_source` of `creator_provided`, `meta_api`, `platform_api`, or `manual_review`, and records when it was observed. Creator-facing metric submission accepts only `creator_provided`; API-source labels cannot be self-asserted through that endpoint. A social account is only marked verified when an authorized reviewer approves its pending request; creators cannot approve their own accounts. Requests may include a reviewer note and evidence URL, and the review stores status, timestamps, reviewer identity, and feedback. The admin endpoints require a user whose database role is `ADMIN`; do not expose admin role selection during public registration. For this milestone, an administrator must be provisioned through a trusted database/operations process. A handle or profile URL alone does not prove account ownership or official metrics. Do not label metrics as API-sourced unless they really came from an authorized platform integration.

The Campaign Reports dashboard summarizes creator collaboration states, deliverable approvals, overdue deliverables, creator acceptance rate among decided invitations/applications, average stored profile-fit score, and on-time approval rate among approved deliverables with deadlines. Saved creator shortlists are private to each brand account; creators can be saved from Creator Discovery and managed at `/dashboard/saved-creators`. From that page, a brand can add saved creators to an active or draft campaign. Added profiles enter the campaign workflow as `Suggested`; brands must explicitly invite them from the workflow. The Creator Workflow page also brings the campaign brief, collaboration-specific commercial terms, and deliverable plan into one view, while editing offers and deliverables remains in their dedicated workspaces. In-app notifications cover collaboration, deliverable, commercial/payment, and shipment status events. Payment records remain an operational ledger and do not initiate real money transfers. These are operational workflow metrics from Influna records; they do not claim verified reach, engagement, sales, or ROI.\n\nThe matching endpoint uses a deterministic, explainable rule-based score for creator categories/interests, creator location, language, requested platform, and—when criteria and recorded data are available—follower range, minimum engagement rate, and target audience age/gender breakdowns. Campaign setup exposes optional minimum/maximum follower counts and minimum engagement rate. Factors without enough metric data are excluded rather than scored as a mismatch; creator-provided metrics are explicitly identified. The score is a preliminary profile-fit estimate, **not** an AI prediction of campaign performance, authenticity, reach, conversions, or ROI. The matching algorithm is versioned as `rule_based_v3`.

## Important limitations

The Deliverables dashboard lets brands define per-creator requirements, descriptions, and deadlines; creators submit content URLs as versioned submissions; brands can request revisions or approve a version. Each revision is retained with its URL, notes, timestamp, status, and reviewer feedback. The Product Shipping dashboard lets brands record a carrier, tracking number/URL, shipment notes, and manually advance shipment status; creators can confirm receipt after the brand marks the package delivered. These are workflow records only—media is not uploaded, posts are not published, and notifications/payments are not triggered. Creator discovery supports name/bio/category search, country filtering, plus client-side platform and category filters. Creators can browse active campaigns at `/dashboard/creator-campaigns` and apply directly; brands can accept or decline applications in Creator Workflow. Brands can calculate preliminary profile-fit matches and record an invitation directly from a match card; invitations appear in the creator inbox, but recording an invitation does not deliver an external message. The dashboard includes a manual campaign collaboration tracker with Suggested → Invited → Accepted/Declined → ContentSubmitted → ChangesRequested/Approved → Completed states, plus cancellation. Creator accounts can manage their own profile and social handles at `/dashboard/creator-profile`, review invitations at `/dashboard/creator-invitations`, and submit or resubmit content URLs for brand review. The tracker does not send invitations or notifications, and social handles are self-reported until a real platform authorization/verification flow is implemented. Content links and review notes are stored with timestamps.

Email verification, password reset, rate limiting/abuse controls, CSRF tokens for cross-site deployments, Meta OAuth/API integration, automated invitations/notifications, payment execution, and production monitoring are not implemented yet. The admin Integration Readiness page at `/dashboard/admin-integrations` reports whether required server environment variables are present without returning their values. Meta is explicitly blocked until API access approval is recorded; having credentials alone does not mean OAuth or metric synchronization is implemented. The endpoint is operational readiness reporting only, not a live provider health check. Creator verification requests and an admin review interface are available at `/dashboard/admin-verification`; the interface and review APIs require an `ADMIN` database role. Admin accounts must be provisioned through a trusted database/operations process; public registration must never offer the `ADMIN` role. Authentication and ownership checks now cover the primary campaign, creator, invitation, matching, metric-snapshot, and dashboard APIs, but this is still an early-stage foundation and requires a security review before production exposure. Do not use real creator data in a public demo without permission.


## Commercial operations

Brands can send an offer with a fee, currency, payment terms, and note to a linked creator. Creators can accept or reject an offer, or submit a counteroffer. Brands can accept a counteroffer or send a revised offer. Accepted terms are stored as an agreed fee and cannot be silently overwritten by a new offer. Payment records support planned, processing, paid, and cancelled statuses, due dates, references, and notes. Multiple installments are supported, the payment currency must match the agreed fee currency, and non-cancelled payment records cannot exceed the agreed fee. Paid and cancelled payment records are terminal.

The dashboard is available at `/dashboard/commercials` for brand and creator accounts. These are **manual commercial and ledger records**, not a payment processor: no money is charged or transferred, and marking a record paid is an explicit manual action after an external payment has been confirmed. Payment provider integration, invoices/tax workflows, dispute handling, and notification delivery remain future work.


## In-app notifications

The notifications inbox is available at `/dashboard/notifications`. It stores user-scoped notifications in the database and supports unread counts, marking individual items read, and marking all items read. Notifications are generated for creator campaign applications, invitations and responses, commercial offers/counteroffers, and deliverable submissions/reviews. Notification creation is best-effort: a notification insert failure is logged but does not undo the campaign action. These are in-app notifications only; email, push delivery, and real-time updates are not included in this milestone.


## Campaign performance tracking

Brands can open `/dashboard/performance` to record time-stamped performance snapshots for eligible creator collaborations. Supported metrics include impressions, reach, likes, comments, shares, saves, clicks, conversions, and attributed revenue. Each record may include a platform, published-content URL, publish date, currency, and notes.

- `GET /api/v1/campaigns/:id/performance` returns the campaign's creator collaborations, performance snapshot history, and summary metrics. Access is limited to the owning brand.
- `POST /api/v1/campaigns/:id/performance` records a snapshot for a collaboration owned by the authenticated brand. Performance entry is available after the creator accepts.
- Snapshots are marked `MANUAL` until authorized social-platform integrations can provide verified data. Snapshot totals may repeat the same content across reporting periods and must not be interpreted as unique reach or verified ROI.
- The `CampaignPerformanceSnapshot` table stores source, capture time, metrics, optional attributed revenue, and the user who recorded the snapshot.

The schema change is delivered in `20261016170000_campaign_performance_tracking`. Run the usual Prisma migration and client-generation commands locally after pulling this milestone.


## Explainable creator matching

The campaign matching endpoint (`POST /api/v1/campaigns/:id/matches`) uses the current rule-based `rule_based_v3` profile-fit scorer. It evaluates applicable campaign and creator data such as category alignment, objective/content signals, creator location, languages, platform presence, follower range, engagement rate, and available audience age, gender, or geography breakdowns.

The response includes:
- `match_score`: weighted profile-fit score from available evaluated factors; it is not a probability or prediction of campaign performance.
- `match_confidence`: the percentage of applicable weighted criteria that could be assessed from available data.
- `recommendation_tier` and `recommendation_label`: a review aid based on profile fit and data coverage.
- `match_factors` and `match_reasons`: factor-level scores and plain-language explanations.
- `missing_data`: gaps that a brand should review before relying on the recommendation.

Creator discovery displays these details and the available data gaps before the brand records an invitation. Budget-fit status compares a creator's lowest public rate in the campaign budget currency with that budget; this is indicative only and does not estimate the full cost of a multi-creator campaign. Social metrics and audience insights must be reviewed for source and verification status. These recommendations are explainable heuristics, not a trained ML model or a guarantee of results.


## Creator data sources and CSV import

Influna currently supports creator-provided profile and metric entry, plus CSV imports for development and marketplace seeding. No external social-platform API is required for these workflows. Brands and admins can open **Creator Data Import** in the dashboard and upload a CSV (up to 2 MB and 1,000 rows). Required columns are `display_name`, `platform`, and `handle`; supported platform values are Instagram, TikTok, YouTube, Facebook, and Other. Optional columns include `profile_url`, `bio`, `categories`, `country`, `city`, `languages`, `follower_count`, `following_count`, `post_count`, `average_views`, `average_likes`, `average_comments`, `engagement_rate`, and `observed_at`. Use `|` or `;` to separate multiple categories/languages.

Provide a dataset name or source URL in the source field. Imports create public creator profiles and timestamped `public_dataset` metric snapshots; existing platform handles are skipped rather than overwritten. Import results report imported rows, duplicates, and row-level errors. Public-dataset metrics are reference data, not live, creator-verified, or independently verified metrics. Only import datasets whose licenses and terms permit this use. The CSV template is synthetic example data and is not a real creator record.


## Synthetic creator benchmark dataset

For development, Influna can be seeded with fictional creator profiles from the [Bot Or Not (BON) Synthetic Influencers dataset](https://huggingface.co/datasets/mayacheruty/BON-Synthetic-Influencers). Its dataset card identifies an MIT license, 10,042 synthetic profiles, and no real people or personal data. The source is a benchmark, not a representative sample of the creator economy.

Prepare a small import file (Node.js 20+; internet access required):

```bash
node scripts/prepare-bon-dataset.mjs
# Optional: prepare up to 1,000 rows
node scripts/prepare-bon-dataset.mjs --limit=1000
```

The script downloads the source CSV and writes `data/bon-synthetic-creator-import.csv`. Upload that file at `/dashboard/creator-data` as a BRAND or ADMIN. The importer stores the records with synthetic handles and platform `Other` so they cannot be mistaken for real Instagram accounts. Metrics are marked `synthetic_dataset`; source labels are retained as benchmark metadata.

**Important:** the dataset's fraud labels and signals are simulated. Do not use them to accuse, rank, reject, or make payment decisions about real creators. They are suitable for demonstrating the data pipeline and later experimenting with fraud-risk methods, not for estimating real-world fraud prevalence. Never mix these synthetic profiles into a production marketplace without an explicit environment/data-type separation.


## Creator rate cards and campaign budget fit

Creators can manage indicative platform/deliverable prices at `/dashboard/rate-card`. The creator rate-card API lets the owner create/update a rate for each unique platform + deliverable type, mark it public/private, and remove it. Public rates are visible to brands; private rates are not returned in match results. These rates are indicative and do not replace campaign-specific offers or agreed fees.

Brands can set an optional total campaign budget and currency in the campaign payment step. Creator matching shows the lowest public rate in the same currency and labels each creator as within budget, over budget, no public rate, currency mismatch, or budget not set. Influna does not convert currencies or assume that one creator rate represents the total cost of a multi-creator campaign. Existing campaign budgets are optional.

After pulling this branch, run the new Prisma migration and regenerate the client:

```bash
npx prisma migrate dev
npx prisma generate
```


## Campaign planning and budget allocation

Brands can open `/dashboard/campaign-plan` to create a saved proposed creator lineup from creators already linked to a campaign. Each planned line selects a creator's public rate card and quantity, stores a price snapshot, and supports notes. The planner totals spend by currency, compares only spend in the campaign budget currency, and flags overspend or a low remaining balance. It does not convert currencies, invite creators, lock rates, or create payment records. A creator must first be linked to the campaign from Creator Discovery or Creator Workflow.

The campaign planning API is `GET/PUT /api/v1/campaigns/:id/plan`; saving replaces the proposed plan atomically after ownership and public-rate validation. The collaboration transfer endpoint is `POST /api/v1/campaigns/:id/plan/deliverables` and requires an accepted creator.


## Campaign plan to collaboration workflow

The Campaign Plan & Budget page now connects saved planning to the existing collaboration workflow. For a creator in the saved plan, a brand can save the plan and record an invitation directly when the creator is still in the `Suggested` state. This uses the existing campaign workflow transition and in-app notification behavior; it does not send an email or social-platform message.

After the creator accepts, the brand can transfer that creator’s planned lines into the Deliverables workflow without re-entering titles or notes. Quantities are included in deliverable titles, planning notes are retained, and descriptions explicitly label rate-card amounts as estimates—not negotiated or agreed fees. A plan-item marker prevents repeated transfer requests from creating the same requirements again. Creating deliverable requirements does not create payment records or publish content. Commercial offers and final agreed fees continue to be managed separately in Campaign Workflow / Commercials.
