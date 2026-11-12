# nx remote cache

A Cloudflare Worker, `graphty-nx-cache`, that serves nx's self-hosted remote cache API from an R2 bucket of
the same name. CI's Build job reads and writes each nx task's outputs here instead of building what an
earlier run already built. Entries expire 14 days after they are written.

## Endpoints

| Call                   | Who may call it | What it does                                                                |
| ---------------------- | --------------- | --------------------------------------------------------------------------- |
| `GET /v1/health`       | anyone          | `{ "ok": true }`; the deploy job's check                                    |
| `GET /v1/cache/{hash}` | read or write   | the task's tarball, or 404                                                  |
| `PUT /v1/cache/{hash}` | write only      | stores the tarball; 403 for a read token, 409 when the entry already exists |

Tokens are sent as `Authorization: Bearer <token>` (nx's `NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN`). The
Worker holds only their SHA-256 hashes, in the secrets `READ_TOKEN_HASHES` and `WRITE_TOKEN_HASHES`
(comma-separated, so a new token can be added before the old one is removed).

## Who writes

Only master. The write token is the secret `NX_CACHE_TOKEN` of the GitHub environment `nx-cache-write`,
whose deployment branches are `master` only; the read token is the repository secret of the same name.
ci.yml's Build job declares the environment only on master, so a pull request's run gets the read token
and its writes are refused.

## Deploy

`.github/workflows/results-service.yml` (job `nx-cache`) tests and deploys the Worker from master on every
push that touches this directory, creating the bucket and its 14-day expiry rule on its first run.

Once, after the first deploy (from this directory, with wrangler logged in to the account):

```bash
read_token="$(openssl rand -hex 32)"; write_token="$(openssl rand -hex 32)"
printf '%s' "$read_token" | sha256sum | cut -d' ' -f1 | npx wrangler@4.149.0 secret put READ_TOKEN_HASHES
printf '%s' "$write_token" | sha256sum | cut -d' ' -f1 | npx wrangler@4.149.0 secret put WRITE_TOKEN_HASHES
printf '%s' "$read_token" | gh secret set NX_CACHE_TOKEN
printf '%s' "$write_token" | gh secret set NX_CACHE_TOKEN --env nx-cache-write
gh variable set NX_CACHE_URL --body "https://graphty-nx-cache.<account>.workers.dev"
unset read_token write_token
```

To turn the cache off, delete the variable: `gh variable delete NX_CACHE_URL`. The Build job then builds
without it.

## Test

```bash
node tools/nx-cache-worker/test/index.test.mjs
```
