# go.sstb.ai operations

This fork deploys one Cloudflare Worker as the redirect origin, dashboard, REST API, and OpenAPI endpoint for `go.sstb.ai`. Production does not use `workers.dev` or a Pages project.

## Environments

| Environment | Worker | D1 | KV | Analytics dataset | Route |
|---|---|---|---|---|---|
| Preview | `sstb-link-shortener-preview` | `sstb-link-shortener-preview` | `sstb-link-shortener-preview-cache` | `sstb-link-shortener-preview` | generated `workers.dev` URL |
| Production | `sstb-link-shortener-production` | `sstb-link-shortener-production` | `sstb-link-shortener-production-cache` | `sstb-link-shortener-production` | Worker Custom Domain `go.sstb.ai` |

The configs are [`wrangler.preview.toml`](../wrangler.preview.toml),
[`wrangler.production-stage.toml`](../wrangler.production-stage.toml), and
[`wrangler.toml`](../wrangler.toml). The stage config uses production resources
but exposes only the isolated `workers.dev` URL; the final config replaces that
surface with the `go.sstb.ai` custom domain. Preview bindings and rate-limit
namespaces are isolated from production.

Request flow: `go.sstb.ai` → Worker → D1 link lookup/KV cache → HTTP redirect. A click writes a privacy-preserving event to Analytics Engine; scheduled aggregation writes durable rollups to D1. The dashboard, REST API, and OpenAPI are served by the same Worker.

## Required secrets

Set each value independently in preview and production. Never store values in Git.

- `SETUP_TOKEN`: one-time first-owner setup credential.
- `ANALYTICS_IP_HASH_SECRET`: HMAC key for daily-rotating visitor identifiers.
- `CLOUDFLARE_API_TOKEN`: narrow token with Account Analytics Read only, used for recent Analytics Engine SQL queries.

`CLOUDFLARE_ACCOUNT_ID` is a non-secret Wrangler variable. API keys used by agents are application credentials created after setup, not Cloudflare credentials.

Production credentials are stored in macOS Keychain under the `BradGroux`
account. The service labels are `go.sstb.ai-owner-password`,
`go.sstb.ai-setup-token`, `go.sstb.ai-analytics-ip-hash-secret`,
`sstb-link-shortener-analytics-read`, and `go.sstb.ai-agent-api-key`. The owner
username is `BradGroux`. Retrieve a credential only when needed, for example:

```bash
security find-generic-password -a BradGroux -s go.sstb.ai-owner-password -w
```

## Verification and deployment

```bash
npm ci
npm run verify
npm audit --omit=dev
npx wrangler deploy --dry-run --config wrangler.preview.toml
npx wrangler deploy --dry-run --config wrangler.production-stage.toml
npx wrangler deploy --dry-run --config wrangler.toml
```

Deploy preview first:

```bash
npm run deploy:preview
```

Required preview smoke checks:

1. `/dashboard/health` returns 200.
2. `/openapi.json` returns the 3.1 contract.
3. an unauthenticated `/api/v1/links` request returns 401.
4. first-owner setup, login, domain creation, link creation, redirect, analytics read, and API-key domain/scope denial all pass.
5. MCP calls the same REST API; `archive_link` requires confirmation and permanent deletion is not exposed.

Stage production resources on the isolated `workers.dev` URL before the
custom-domain cutover:

```bash
npm run deploy:production-stage
```

Production is explicit:

```bash
npm run deploy:production
```

Do not run it until preview is green and the production secret names are present. The custom domain declaration is scoped only to `go.sstb.ai`; do not edit any other `sstb.ai` DNS record.

## Agent access

- Canonical REST base: `https://go.sstb.ai/api/v1`
- OpenAPI: `https://go.sstb.ai/openapi.json`
- MCP server: [`mcp/src/server.mjs`](../mcp/src/server.mjs)
- Default API-key scopes: domain/taxonomy read, link read/write, analytics read.
- `links:delete` is opt-in and omitted from default agent keys.
- The production agent key expires on August 13, 2027 and is stored in Keychain
  as `go.sstb.ai-agent-api-key`.
- `https://go.sstb.ai/home` is the initial tracked link to the SSTB home page.

MCP environment:

```bash
SSTB_LINK_API_URL=https://go.sstb.ai/api/v1
SSTB_LINK_API_KEY=<application-api-key>
node mcp/src/server.mjs
```

## Tracking convention

Use native fields instead of inventing schema. Put the stable business dimensions `campaign`, `channel`, `source`, `content`, `owner`, `project`, and `created_by` in link `metadata`; use tags for reusable groupings and standard `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` query parameters for acquisition analytics. Example metadata:

```json
{"campaign":"ai-dev-days","channel":"linkedin","source":"organic","owner":"brad","created_by":"marketing-agent"}
```

## Cloudflare Free-plan footprint

Limits below were verified against Cloudflare documentation on 2026-08-13. Recheck before capacity decisions.

| Product | Required | Use | Free allowance most likely to matter |
|---|---|---|---|
| Workers | Yes | API, dashboard, redirects, cron | 100,000 requests/day and 10 ms CPU/request |
| D1 | Yes | users, links, keys, settings, rollups | 5M rows read/day, 100k rows written/day, 5 GB account storage; 500 MB/database |
| KV | Yes | redirect/session cache | 100k reads/day but only 1,000 writes/day |
| Analytics Engine | Yes | recent click events | 100k data points written/day and 10k queries/day; billing is not active at the time of this review |
| Native rate limits | Yes | login/register/refresh/API-auth abuse control | Included binding; approximate/location-local enforcement |
| R2 | No | Not provisioned | Not applicable |
| Queues | No | Not provisioned | Not applicable |

Sources: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/), [Analytics Engine pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/), [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Database migrations and recovery

List and apply migrations without touching production first:

```bash
npx wrangler d1 migrations list DB --remote --config wrangler.preview.toml
npm run db:migrate:preview
npx wrangler d1 migrations list DB --remote --config wrangler.preview.toml
```

Export before a production migration and keep the SQL file outside Git:

```bash
npx wrangler d1 export DB --remote --config wrangler.toml --output ./sstb-link-production-backup.sql
```

Restore to a newly created recovery database, never over the live database without a deliberate incident decision:

```bash
npx wrangler d1 create sstb-link-shortener-recovery
npx wrangler d1 execute DB --remote --config wrangler.recovery.toml --file ./sstb-link-production-backup.sql
```

KV is a cache and can be rebuilt; API keys and user state live in D1. Analytics Engine raw events are not the recovery authority; D1 rollups are.

## Upstream updates

Upstream is `https://github.com/idhamsy/openshortlink`; this hardening started from `bd337fcf45f237087373e9a837bb884d02e7eb4f`. Preserve that provenance:

```bash
git fetch upstream --tags
git log --oneline bd337fcf45f237087373e9a837bb884d02e7eb4f..upstream/main
git switch -c maintenance/upstream-YYYY-MM-DD
git merge --no-ff upstream/main
npm ci
npm run verify
npx wrangler deploy --dry-run --config wrangler.preview.toml
```

Resolve hardening conflicts in favor of scoped credentials, HTTP(S)-only destinations, native rate limits, environment isolation, and the preview-first gate. Deploy and smoke preview before merging an update PR.

## Troubleshooting

- **Short link returns 404:** verify the domain row is active, link status is active, slug and route match, and the link exists in production D1. Purge its KV cache entry only after the D1 record is confirmed.
- **Redirect works but analytics do not:** verify `ANALYTICS_IP_HASH_SECRET`, the `ANALYTICS` binding, `ANALYTICS_DATASET_NAME`, Analytics Engine account enablement, and the narrow read token. Trigger one non-sensitive click, then query after propagation.
- **API returns 401/403:** 401 means the application key is missing/invalid/expired; 403 usually means a missing operation scope, domain restriction, IP allowlist, or user permission. Never substitute a Cloudflare token for an application API key.
- **D1 migration failure:** stop deployment, inspect `wrangler d1 migrations list`, preserve the error, and restore/test against a new recovery DB. Do not edit an already-applied migration.
- **Worker binding missing:** compare the deployed binding list with the selected Wrangler config; confirm config filename, resource IDs, and secret names, then run a dry-run before redeploying.
- **MCP authentication failure:** confirm `SSTB_LINK_API_URL` ends in `/api/v1`, `SSTB_LINK_API_KEY` is an application key, the key includes the required operation/domain scope, and direct REST returns the same result. MCP intentionally exposes no permanent delete tool.

## Limits and response

This deployment targets low-volume Free-plan use. Watch Worker errors/CPU, D1 reads and writes, KV writes, and Analytics Engine writes/queries. Rate limits are abuse controls, not exact global counters.

If a release fails runtime smoke checks, remove the Custom Domain from the new Worker or roll back to the last known-good Worker version in Cloudflare, then verify `go.sstb.ai` from a fresh request. D1 migrations are forward-only; take a D1 backup before any future destructive schema migration.
