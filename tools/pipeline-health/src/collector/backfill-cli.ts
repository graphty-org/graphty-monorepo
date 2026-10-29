// The backfill from this machine (src/collector/backfill.ts), with the AWS profile's credentials:
//   cd tools/pipeline-health && AWS_PROFILE=graphty AWS_REGION=us-east-2 pnpm run backfill [-- --days 28 --per-hour 2000]
// To re-read only some days' runs of some workflows (days an earlier backfill lost), whatever the cursors say:
//   ... pnpm run backfill -- --repair-days 2026-10-09,2026-10-11 --repair-workflows release.yml,bisect.yml

import { dynamoStore } from "../dynamo.js";
import { ssmGetParams } from "./aws.js";
import { backfill, backfillRepos } from "./backfill.js";
import { GitHub, installationToken, readAppConfig } from "./github.js";

async function main() {
    const arg = (name: string, d: number) => {
        const i = process.argv.indexOf(`--${name}`);
        return i > 0 ? Number(process.argv[i + 1]) : d;
    };
    const list = (name: string) => {
        const i = process.argv.indexOf(`--${name}`);
        return i > 0 ? process.argv[i + 1].split(",").filter(Boolean) : [];
    };
    const days = list("repair-days");
    const app = await readAppConfig(ssmGetParams());
    if (!app) {
        console.error("The collector's GitHub App is not set up (no /graphty-health/github-app/* parameters in SSM).");
        process.exit(2);
    }
    const gh = new GitHub(() => installationToken(app, fetch, Date.now()));
    const store = dynamoStore(process.env.TABLE_NAME ?? "graphty-health");
    const repo = "graphty-org/graphty-monorepo";
    const r = await backfill({
        store,
        gh,
        repos: await backfillRepos(gh, "graphty-org", repo, Date.now()),
        repo,
        days: arg("days", 28),
        perHour: arg("per-hour", 2000),
        now: Date.now(),
        ...(days.length ? { repair: { days, workflows: list("repair-workflows") } } : {}),
        log: (l) => console.log(l),
    });
    console.log(JSON.stringify(r));
}

await main();
