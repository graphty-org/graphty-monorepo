#!/usr/bin/env node
// rolling-merge.mjs -- merges a rolling approval pull request (visual/approve-rolling-<sha12>, opened by the owner's
// Finish on the review page's rolling target) only in a merge window (design/visual-testing/early-capture.md, 4d
// rule 3): no nightly candidate held and no full run between its pick and its verdict. An approval merging while a
// full run judges a commit, or beside a held candidate's own approval, could leave master with a baselines tree
// nobody signed. pr-open.sh never arms auto-merge for these (they change visual-baselines/), so the session that
// merges them runs this instead of `gh pr merge`.
//
//   node tools/channel/rolling-merge.mjs <pr>
// Exit 0: merged. Exit 2: not now (prints why; try again later). Exit 1: refused or failed. It fails closed: a store
// or GitHub that does not answer is "not now". Needs RESULTS_URL and a read token (GRAPHTY_RESULTS_TOKEN), and gh.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { call, config } from "../results/client.mjs";
import { parseEnvFile } from "../sonar/api.mjs";

export const ROLLING_BRANCH = /^visual\/approve-rolling-[0-9a-f]{12}$/;

/**
 * Whether a rolling approval may merge now.
 * @param o the facts
 * @param o.branch the pull request's head branch
 * @param o.state the pull request's state (OPEN, MERGED, CLOSED)
 * @param o.hold the store's held candidate (`GET /v1/candidate` hold) or null
 * @param o.releaseRuns release.yml runs not completed (`[{ status, url }]`)
 * @returns `{ merge, retry, why }`: merge now; else retry later (true) or never (false)
 */
export function mergeWindow({ branch, state, hold, releaseRuns }) {
    if (!ROLLING_BRANCH.test(branch ?? ""))
        return { merge: false, retry: false, why: `${branch} is not a rolling approval` };
    if (state !== "OPEN") return { merge: false, retry: false, why: `the pull request is ${state}` };
    if (hold)
        return {
            merge: false,
            retry: true,
            why: `nightly is held on ${String(hold.head).slice(0, 12)}: its own review goes first`,
        };
    if (releaseRuns.length > 0)
        return {
            merge: false,
            retry: true,
            why: `a full run is between its pick and its verdict (${releaseRuns[0].url})`,
        };
    return { merge: true, retry: false, why: "no candidate held and no full run going" };
}

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();

async function main(pr) {
    const env = { ...process.env };
    const dotenv = fileURLToPath(new URL("../../.env", import.meta.url));
    if (!env.RESULTS_URL && existsSync(dotenv))
        env.RESULTS_URL = parseEnvFile(readFileSync(dotenv, "utf8"), "RESULTS_URL");
    const cfg = config(env);
    if (!cfg) throw new Error("the results store is not configured (RESULTS_URL and GRAPHTY_RESULTS_TOKEN)");
    const { headRefName: branch, state } = JSON.parse(gh("pr", "view", pr, "--json", "headRefName,state"));
    const store = await call(cfg, "GET", "/v1/candidate");
    if (!store.ok) return { merge: false, retry: true, why: `the results store did not answer (${store.why})` };
    const runs = JSON.parse(gh("run", "list", "--workflow", "release.yml", "--limit", "10", "--json", "status,url"));
    const releaseRuns = runs.filter((r) => r.status !== "completed");
    const w = mergeWindow({ branch, state, hold: store.data.hold, releaseRuns });
    if (w.merge) gh("pr", "merge", pr, "--merge");
    return w;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const pr = process.argv[2];
    if (!/^\d+$/.test(pr ?? "")) {
        console.error("usage: node tools/channel/rolling-merge.mjs <pr>");
        process.exit(1);
    }
    try {
        const w = await main(pr);
        let outcome = "refused";
        let code = 1;
        if (w.merge) [outcome, code] = ["merged", 0];
        else if (w.retry) [outcome, code] = ["not now", 2];
        console.log(`rolling-merge #${pr}: ${outcome}: ${w.why}`);
        process.exit(code);
    } catch (e) {
        console.error(`rolling-merge: ${e.message}`);
        process.exit(1);
    }
}
