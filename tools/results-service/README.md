# Results service

A Cloudflare Worker, `graphty-results`, with a D1 database of the same name. CI jobs and local runs
write their test results to it: one record per test group, each failure as it happens, and job, step
and task durations. It stores what it is sent and answers; it never starts a workflow or files an
issue.

## Endpoints

| Call                             | Who may call it                                                              | What it does                                                                                                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/health`                 | anyone                                                                       | `{ "ok": true, "schema": 1 }` when the Worker and its database answer                                                                                                                                                         |
| `POST /v1/invocations`           | CI, local                                                                    | stores one test group's record, its per-file counts and its failures                                                                                                                                                          |
| `POST /v1/failures`              | CI, local                                                                    | stores one failure (`{ invocation, file, name, message }`) or a batch (`{ invocation, failures: [...] }`)                                                                                                                     |
| `POST /v1/durations`             | CI, site repositories                                                        | stores `{ rows: [{ runId, attempt, workflow, job, step, task, sha, startedAt, ms, conclusion }] }`                                                                                                                            |
| `POST /v1/verdicts`              | master's release.yml                                                         | stores the full run's verdict on its candidate (`{ sha, state, lane, issue }`; state `green-clean`, `green-images`, `red` or `owner-item`; `approved` or `rejected` from the promotion after the owner's screenshot approval) |
| `POST /v1/sites`                 | `deploy-pages.yml`                                                           | records `{ sha }`: that master build kept its site as artifact `site-<sha>`, in the calling run                                                                                                                               |
| `POST /v1/channel-moves`         | master's release.yml                                                         | records a nightly promotion `{ channel: "nightly", sha, versionCommit, siteSha256, channelSha256 }`; a re-run replaces its run's row                                                                                          |
| `POST /v1/hold`                  | master's release.yml, and release-rerun.yml for a red run it does not re-run | holds the nightly candidate `{ base, head, issue }` (one at a time: another base answers 409), or clears it `{ clear: true }`; `GET /v1/candidate` and `GET /v1/release-state` return it as `hold`                            |
| `PUT /v1/durations/tests/<name>` | master's own runs                                                            | replaces test shard `<name>`'s duration history (tools/vitest-time-budget.mjs; a JSON object, at most 1.9 MB)                                                                                                                 |

A repeated post of the same record id stores nothing the second time (`"stored": false`).
`POST /v1/durations` answers `trend` too: per posted key, within the run's kind, the median of its
last 5 runs (`recent`), of the 10 before (`earlier`), and `alarm` when `recent` is over the budget the
body sends (`budgets: { "<key>": seconds }`) or over 1.3 times `earlier` and 60 s slower, with the
commit `range` where it crossed. The posting `timings` job files or closes the issue.

Reads take any credential and answer from stored records only, computed when they are read:

| Call                                               | What it answers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/plan?sha=&base=&variants=&inputs=&files=` | `quarantine` (entries not left, not expired, with under 20 passing master runs since their last failure, never `webgpu-graph-algorithms*`), `failingOnBase` (failures master's own runs of the asked variants saw on `base` or on the same variant and inputs, outside `files`, each with its `variant`), and per variant `passedWithInputs`, `order` (files failed in the last 7 days, newest first) and `fileMs` (median of the last 9 runs). `variants` and `inputs` are comma lists, pairwise |
| `GET /v1/candidate`                                | the newest commit with a recorded site, and its latest verdict when it is already judged; `recent`: every commit's latest verdict of the last 30 days, newest first                                                                                                                                                                                                                                                                                                                               |
| `GET /v1/failures?run=&good=`                      | the tests a run saw fail (`tests`: `{ shard, file, name }`), and in `failedBefore` those master's own runs saw fail before `good`'s site was built: a full run's bisect input                                                                                                                                                                                                                                                                                                                     |
| `GET /v1/release-state`                            | `nightly` (sha, when it moved), the open `red` verdict, the `approved` candidates newer than nightly (each a resume that is due), the `offered` (oldest waiting) candidate, `canary`, `ageNightlyMs` and what is `blocking` canary                                                                                                                                                                                                                                                                |
| `GET /v1/durations/medians?workflows=&kind=&n=`    | master's median seconds per key (`job:`, `step:`, `task:`) over the last `n` runs (10, at most 50) of `kind` (`full` by default) of the listed workflows in 30 days, cancelled runs left out                                                                                                                                                                                                                                                                                                      |
| `GET /v1/durations/tests/<name>`                   | test shard `<name>`'s duration history, `{}` when none is stored                                                                                                                                                                                                                                                                                                                                                                                                                                  |

The `site`, `verdict` and `channel_move` tables these read (`migrations/0002_release_state.sql`) are
written by deploy-pages.yml and release.yml once those post them.

## Credentials and kinds

Every write carries `Authorization: Bearer <token>`. The Worker decides the record's kind from the
token, never from the body:

- **GitHub Actions OIDC**, audience `graphty-results` (the job needs `permissions: id-token: write`):
    - a `pull_request` run of graphty-monorepo writes kind `pr`, only for its own merge commit;
    - master's own `release.yml` or `ci.yml`, and the lanes release.yml calls (`gpu.yml`, `hosts.yml`,
      `work-protection-macos.yml`), write `full`, except master's own `push` of `ci.yml` (a build with no
      tests), which writes `master` (durations only); `bisect.yml` writes `bisect`,
      `base-check.yml` writes `base`, `restricted-cpu-stress.yml` writes `stress` and `deploy-pages.yml`
      writes `site` (sites and durations only), only when both the run's ref and the workflow file's ref
      are `refs/heads/master`. Anything else is refused with 403;
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
