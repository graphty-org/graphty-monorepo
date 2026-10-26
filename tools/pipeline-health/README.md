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
