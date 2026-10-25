# Results service

A Cloudflare Worker, `graphty-results`, with a D1 database of the same name. CI jobs and local runs
write their test results to it: one record per test group, each failure as it happens, and job, step
and task durations. It stores what it is sent and answers; it never starts a workflow or files an
issue.

## Endpoints

| Call                   | Who may call it       | What it does                                                                                              |
| ---------------------- | --------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /v1/health`       | anyone                | `{ "ok": true, "schema": 1 }` when the Worker and its database answer                                     |
| `POST /v1/invocations` | CI, local             | stores one test group's record, its per-file counts and its failures                                      |
| `POST /v1/failures`    | CI, local             | stores one failure (`{ invocation, file, name, message }`) or a batch (`{ invocation, failures: [...] }`) |
| `POST /v1/durations`   | CI, site repositories | stores `{ rows: [{ runId, attempt, workflow, job, step, task, sha, startedAt, ms, conclusion }] }`        |

A repeated post of the same record id stores nothing the second time (`"stored": false`).

## Credentials and kinds

Every write carries `Authorization: Bearer <token>`. The Worker decides the record's kind from the
token, never from the body:

- **GitHub Actions OIDC**, audience `graphty-results` (the job needs `permissions: id-token: write`):
    - a `pull_request` run of graphty-monorepo writes kind `pr`, only for its own merge commit;
    - master's own `release.yml` or `ci.yml`, and the lanes release.yml calls (`gpu.yml`, `hosts.yml`,
      `work-protection-macos.yml`), write `full`; `bisect.yml` writes `bisect`,
      `base-check.yml` writes `base` and `restricted-cpu-stress.yml` writes `stress`, only when both the
      run's ref and the workflow file's ref are `refs/heads/master`. Anything else is refused with 403;
    - a site repository (`DEPLOY_REPOSITORY_IDS` in `wrangler.toml`) writes only durations, of kind
      `deploy`.
- **A local token**: `GRAPHTY_RESULTS_TOKEN` in the root `.env`. The Worker holds only its SHA-256 in
  the secret `LOCAL_TOKEN_HASHES` (comma-separated, so a new token can be added before the old one is
  removed). It writes kind `local` only.

A record id names the run that wrote it: `<run_id>.<run_attempt>.<job>.<group>.<try>` for CI,
`local.<ms>.<host>.<pid>.<group>` for a local run. A token cannot write under another run's id.

## Deploy

`.github/workflows/results-service.yml` deploys from master on every push that touches this directory
or `tools/release-scheduler/`: it runs both Workers' tests, creates the D1 database on its first run,
applies `migrations/` and deploys both Workers. It needs the repository secrets
`CLOUDFLARE_API_TOKEN` (Workers Scripts edit and D1 edit) and `CLOUDFLARE_ACCOUNT_ID`, and checks
`/v1/health` at the repository variable `RESULTS_URL`.

Once, after the first deploy:

```bash
cd tools/results-service
token="$(openssl rand -hex 32)"
printf 'GRAPHTY_RESULTS_TOKEN=%s\n' "$token" >> ../../.env
printf '%s' "$token" | sha256sum | cut -d' ' -f1 | npx wrangler@4.149.0 secret put LOCAL_TOKEN_HASHES
gh variable set RESULTS_URL --body "https://graphty-results.<account>.workers.dev"
```

## Test

```bash
node tools/results-service/test/index.test.mjs
```

The tests run the real migrations and SQL on `node:sqlite` (`test/d1-shim.mjs`) with OIDC tokens
signed by a generated key. Schema changes are additive only: a new file in `migrations/`, never an
edit of an applied one.
