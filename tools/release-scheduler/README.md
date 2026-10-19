# Release scheduler

A Cloudflare Worker that starts graphty-monorepo's release train four times a day, at 00:00, 06:00,
12:00 and 18:00 UTC. At each slot it dispatches `.github/workflows/release.yml` on `master` with the
input `scheduled: true`, which is exactly what the train's schedule would do.

GitHub's own `schedule:` trigger creates this repository's scheduled runs hours late, or not at all,
so `release.yml` has no cron of its own. The Worker signs in as a GitHub App, so there is no
personal access token to expire or rotate.

When the Worker cannot start a train, it opens an issue titled **"Release scheduler could not start
a release train"** with the slot time, the HTTP status and GitHub's response. If that issue is
already open, it comments on it instead of opening another.

## Set it up

You need owner access to the `graphty-org` organization and a free Cloudflare account.

### 1. Create the GitHub App

1. In GitHub, open the organization's **Settings > Developer settings > GitHub Apps > New GitHub App**.
2. Name it (for example `graphty-release-scheduler`) and give any homepage URL, such as the
   repository's.
3. Under **Webhook**, clear **Active**. The App needs no webhook.
4. Under **Repository permissions**, set **Actions: Read and write** and **Issues: Read and write**.
   Leave everything else at **No access**.
5. Under **Where can this GitHub App be installed?**, choose **Only on this account**, then
   **Create GitHub App**.
6. Note the **App ID** shown at the top of the App's page.
7. On the same page, under **Private keys**, choose **Generate a private key**. Your browser
   downloads a `.pem` file.
8. Choose **Install App** in the sidebar, install it on `graphty-org`, and select **Only select
   repositories: graphty-monorepo**.
9. After installing, the browser shows a URL ending in `/installations/<number>`. That number is
   the **installation ID**.

### 2. Convert the private key

GitHub's key is in PKCS#1 format, which the Worker cannot read. Convert it to PKCS#8:

```bash
openssl pkcs8 -topk8 -nocrypt -in <downloaded>.pem -out release-scheduler-key.pem
```

If you skip this, the Worker logs an error naming this command and starts no train.

### 3. Deploy the Worker

1. Create a free account at https://dash.cloudflare.com/sign-up.
2. In the Cloudflare dashboard, open **My Profile > API Tokens > Create Token**, and use the **Edit
   Cloudflare Workers** template. Copy the token.
3. From this directory (`tools/release-scheduler/`), deploy and set the three secrets:

```bash
export CLOUDFLARE_API_TOKEN=<the token>
npx wrangler@4 deploy
npx wrangler@4 secret put APP_ID
npx wrangler@4 secret put INSTALLATION_ID
npx wrangler@4 secret put PRIVATE_KEY < release-scheduler-key.pem
```

`secret put` prompts for the value of `APP_ID` and `INSTALLATION_ID`. The API token works on a
machine without a browser; `npx wrangler@4 login` works too if you have one.

4. Delete both key files, the downloaded `.pem` and `release-scheduler-key.pem`. Cloudflare holds
   the only copy the Worker needs, and GitHub can generate a new key at any time.

## Test it once

A test fire starts a **real** release attempt. That is safe: an attempt skips itself when a release
pull request or a "Release held" issue is open, and otherwise runs the train as the schedule would.

- **From the dashboard:** open **Workers & Pages > graphty-release-scheduler > Settings > Triggers**
  and trigger the cron.
- **From your machine:** create `.dev.vars` in this directory (it is never committed) with the
  three values, then run the Worker locally and fire it:

```bash
cat > .dev.vars <<'EOF'
APP_ID=<app id>
INSTALLATION_ID=<installation id>
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
EOF
npx wrangler@4 dev --test-scheduled
# in another terminal:
curl "http://localhost:8787/__scheduled?cron=0+0+*+*+*"
```

Delete `.dev.vars` afterwards. A successful fire logs `release train dispatched`, and a new
`release.yml` run appears in the repository's **Actions** tab.

## Operate it

- **See its runs:** in the Cloudflare dashboard, **Workers & Pages > graphty-release-scheduler >
  Logs**. Each slot logs either `release train dispatched` or the error.
- **The failure issue** means a slot passed without a train. The issue body has GitHub's response:
  a 401 or 403 usually means the App lost a permission or was uninstalled; a 404 means
  `release.yml` was renamed or the App cannot see the repository; a 422 means `release.yml` no
  longer accepts the `scheduled` input. Fix the cause, then close the issue. Start the missed train
  by hand if needed: `gh workflow run release.yml --ref master`.
- **When the logs show an error and there is no issue,** the Worker could not get a token from
  GitHub, so it could not file one either: check the App ID, the installation ID and the key.
- **Stop it:** remove the cron trigger (**Settings > Triggers**, or delete the `crons` line from
  `wrangler.toml` and deploy again), or uninstall the GitHub App from the organization.
