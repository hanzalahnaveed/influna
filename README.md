# Influna

Influna is a Next.js app with a PostgreSQL-backed campaign API.

## Run locally

Requirements: Node.js 20+ and PostgreSQL 14+.

1. Install packages with `npm install`.
2. Create a PostgreSQL database named `influna`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to the connection string for your database.
4. Generate the Prisma client and create the database tables:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the app with `npm run dev`.

The frontend and API run together at `http://localhost:3000`. There is no separate service on port 8000.

For a production deployment, configure `DATABASE_URL`, run `npm run db:generate` during the build, and run `npm run db:deploy` before serving traffic.

## API

All endpoints return JSON except successful deletes, which return `204 No Content`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/campaigns` | List campaigns, newest first |
| `GET` | `/api/v1/campaigns?status=Draft` | Filter campaigns by `Active`, `Draft`, `Completed`, or `Cancelled` |
| `POST` | `/api/v1/campaigns` | Create a campaign; send the campaign sections used by the UI |
| `GET` | `/api/v1/campaigns/:id` | Get one campaign |
| `PUT` | `/api/v1/campaigns/:id` | Partially update campaign sections |
| `DELETE` | `/api/v1/campaigns/:id` | Delete a campaign |
| `GET` | `/api/v1/dashboard` | Get campaign totals by status |

Campaign JSON uses `campaign_details`, `targeting_criteria`, `platform_details`, and `payment_information` sections. Campaign payment information is stored as terms only; no charges or payment-provider operations are performed. Complete campaigns are validated on create/update; drafts may be incomplete.

## Access and security

Authentication and per-user ownership are not implemented. As currently built, anyone who can reach the app can read, create, update, and delete campaigns. Do not expose this API publicly until authentication and authorization are added.
