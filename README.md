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
| `GET` | `/api/v1/creators/:id/invitations` | List invitations for the signed-in creator profile only |
| `POST` | `/api/v1/creators/:id/social-accounts` | Add a self-reported social account to the signed-in creator profile |\n| `DELETE` | `/api/v1/creators/:id/social-accounts/:socialAccountId` | Remove a social account owned by the signed-in creator |

Brand-only campaign endpoints and creator-only profile/invitation endpoints require an active session. Campaign reads and writes are scoped to the signed-in brand owner; creator profile updates, metric snapshots, invitations, and content submissions are scoped to the signed-in creator. New creator profiles start private. Existing records without an owner remain in the database but are not visible through owner-scoped campaign endpoints. Passwords are hashed with Node.js scrypt; sessions use random opaque tokens stored as SHA-256 digests and an HTTP-only, SameSite=Strict cookie.

Campaign JSON uses `campaign_details`, `targeting_criteria`, `platform_details`, and `payment_information`. Payment information is stored as terms only; no charges or payment-provider operations are performed. Complete campaigns are validated on create/update; drafts may be incomplete.

## Creator data and matching

Creator profile fields and social-account handles are supplied by the creator unless otherwise stated. Each metrics snapshot requires a `data_source` of `creator_provided`, `meta_api`, `platform_api`, or `manual_review`, and records when it was observed. These labels are provenance supplied by the caller, not proof that an API connection or verification has occurred. Do not label metrics as API-sourced unless they really came from an authorized platform integration.

The matching endpoint currently uses a deterministic, explainable rule-based score for categories/interests, location, language, and requested platform. It is a preliminary fit score, **not** an AI prediction of campaign performance. Audience insights and historical metric snapshots are stored separately so future ranking can distinguish audience fit from performance fit.

## Important limitations

The Deliverables dashboard lets brands define per-creator requirements, descriptions, and deadlines; creators submit content URLs as versioned submissions; brands can request revisions or approve a version. Each revision is retained with its URL, notes, timestamp, status, and reviewer feedback. These are workflow records only—media is not uploaded, posts are not published, and notifications/payments are not triggered. Creator discovery supports name/bio/category search, country filtering, plus client-side platform and category filters. Brands can calculate preliminary profile-fit matches and record an invitation directly from a match card; invitations appear in the creator inbox, but recording an invitation does not deliver an external message. The dashboard includes a manual campaign collaboration tracker with Suggested → Invited → Accepted/Declined → ContentSubmitted → ChangesRequested/Approved → Completed states, plus cancellation. Creator accounts can manage their own profile and social handles at `/dashboard/creator-profile`, review invitations at `/dashboard/creator-invitations`, and submit or resubmit content URLs for brand review. The tracker does not send invitations or notifications, and social handles are self-reported until a real platform authorization/verification flow is implemented. Content links and review notes are stored with timestamps.

Email verification, password reset, rate limiting/abuse controls, CSRF tokens for cross-site deployments, creator consent/verification flows, Meta OAuth/API integration, automated invitations/notifications, payment execution, and production monitoring are not implemented yet. Authentication and ownership checks now cover the primary campaign, creator, invitation, matching, metric-snapshot, and dashboard APIs, but this is still an early-stage foundation and requires a security review before production exposure. Do not use real creator data in a public demo without permission.
