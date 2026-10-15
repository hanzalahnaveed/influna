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

The frontend and API run together at `http://localhost:3000`; there is no separate service on port 8000.

For production, configure `DATABASE_URL`, run `npm run db:generate` during the build, and run `npm run db:deploy` before serving traffic.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/campaigns` | List campaigns, newest first |
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
| `POST` | `/api/v1/campaigns/:id/matches` | Calculate and save transparent rule-based creator matches |\n| `GET` | `/api/v1/campaigns/:id/creators` | List creator records and workflow status for a campaign |\n| `PATCH` | `/api/v1/campaigns/:id/creators/:campaignCreatorId` | Apply a validated creator collaboration workflow transition |

Campaign JSON uses `campaign_details`, `targeting_criteria`, `platform_details`, and `payment_information`. Payment information is stored as terms only; no charges or payment-provider operations are performed. Complete campaigns are validated on create/update; drafts may be incomplete.

## Creator data and matching

Creator profile fields and social-account handles are supplied by the creator unless otherwise stated. Each metrics snapshot requires a `data_source` of `creator_provided`, `meta_api`, `platform_api`, or `manual_review`, and records when it was observed. These labels are provenance supplied by the caller, not proof that an API connection or verification has occurred. Do not label metrics as API-sourced unless they really came from an authorized platform integration.

The matching endpoint currently uses a deterministic, explainable rule-based score for categories/interests, location, language, and requested platform. It is a preliminary fit score, **not** an AI prediction of campaign performance. Audience insights and historical metric snapshots are stored separately so future ranking can distinguish audience fit from performance fit.

## Important limitations

The dashboard includes a manual campaign collaboration tracker with Suggested → Invited → Accepted/Declined → ContentSubmitted → ChangesRequested/Approved → Completed states, plus cancellation. The tracker records operator-entered status; it does not send invitations, notify creators, or authenticate a creator response. Content links and review notes are stored with timestamps.\n\nAuthentication, per-user authorization, creator consent/ownership verification, Meta OAuth/API integration, automated invitations/notifications, payment execution, and production monitoring are not implemented yet. The API is not safe to expose publicly until authentication and authorization are added. Do not use real creator data in a public demo without permission.
