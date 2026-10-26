# Pipeline health backend

The AWS side of the pipeline health dashboard (https://health.graphty.app): a CDK stack in
TypeScript and the Lambda handlers it deploys. Design: `design/ci/health-dashboard.md`.

This is a standalone package with its own lockfile. It is not part of the repository's pnpm
workspace, so it is neither an nx project nor released to npm.

## What it deploys

Stack `graphty-health`, account 494945606241, Region us-east-2:

- DynamoDB table `graphty-health` (on demand, `pk`/`sk`, TTL attribute `ttl`, retained, deletion protection).
- HTTP API:
    - `GET /v1/health`, `/v1/status`, `/v1/page/{page}`, `/v1/{proxy+}`: public reads (20 requests/s, burst 40).
    - `POST /v1/ingest/{kind}`: CI writes with a GitHub OIDC token, audience `graphty-health` (50/s, burst 100).
    - `POST /v1/local/{kind}`: this machine's writer, `Authorization: Bearer <token>`; the Lambda compares
      the token's SHA-256 with the SSM parameter `/graphty-health/local-token-sha256`.
- Lambdas `Ingest`, `Read`, `Collector` (Node 22, arm64, reserved concurrency 20 / 5 / 1); the collector
  runs every 5 minutes from EventBridge Scheduler.
- SNS topic `graphty-health-alarms`, the alarm `graphty-health-collector-dead-man` (no successful
  collector run in 20 minutes), and a 10 USD monthly AWS Budget whose action at 100% attaches a
  deny-all policy to the three Lambda roles.

Outputs: `ApiUrl`, `TableName`, `TopicArn`.

## Use it

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run synth                                 # no AWS credentials needed
pnpm run deploy                                # needs the AWS profile `graphty`
curl "$(aws cloudformation describe-stacks --stack-name graphty-health --profile graphty --region us-east-2 \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)/v1/health"
```

A local dev server of the page needs its origin allowed by CORS: `pnpm run deploy -c devOrigin=https://host:port`.

The first deploy into an account needs `pnpm exec cdk bootstrap aws://494945606241/us-east-2 --profile graphty`.

## The collector

Every 5 minutes the `Collector` Lambda reads GitHub as the collector's GitHub App: workflow runs, jobs
and steps since its cursor across the organization's repositories with Actions activity, the jobs of every
unfinished run (runner use against the limits in `config/slas.json`), pull requests and issues in one
GraphQL query each, master's state (a cancelled build is classified from its check-run annotations as
superseded, by hand or red), and the release lanes from `release.yml`'s job conclusions. Hourly it reads
the weekly stress run, the host matrix, npm (tagged versions npm does not list) and Coveralls' newest
master build; daily the money lines (AWS Cost Explorer, plus the rates in `config/rates.json`, which also
price T4 jobs and paid LLM runs). Everything is written through the model's raw writers, so a cycle that
runs twice writes the same items.

The App is read from the SSM SecureStrings `/graphty-health/github-app/app-id`, `installation-id` and
`private-key`. Until they exist the collector collects nothing from GitHub, and the GitHub sources show
"not set up" on the Data sources page; coverage and billing are collected either way.

The App needs read-only access, installed on the graphty-org organization (all repositories):

| Permission          | Level | For                                                    |
| ------------------- | ----- | ------------------------------------------------------ |
| Actions             | Read  | runs, jobs, steps, attempts                            |
| Checks              | Read  | check-run annotations (cancel class, hangs)            |
| Contents            | Read  | tags and the master compare (untested master age)      |
| Issues              | Read  | issues, "Release held" issues                          |
| Pull requests       | Read  | pull requests, their checks and ready events           |
| Metadata            | Read  | (always on) the organization's repositories            |
| Self-hosted runners | Read  | (organization) the runner groups, for the Runners page |

No webhooks and no write permission.

### Backfill

`pnpm run backfill` loads the last 28 days of runs and jobs (every attempt), pull requests and issues into
the table, at most 3,000 GitHub requests an hour, and marks the range's buckets for recompute. It is
resumable: a cursor per repository holds the last finished day, so running it again continues. It needs
the App's parameters in SSM and the AWS profile `graphty`:

```bash
AWS_PROFILE=graphty AWS_REGION=us-east-2 pnpm run backfill -- --days 28 --per-hour 3000
```
