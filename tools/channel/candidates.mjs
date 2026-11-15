#!/usr/bin/env node
// candidates.mjs -- master's full runs for the review page's candidate mode (`visual-review serve
// --candidate next`, the `candidates` command in visual-review.config.json): prints JSON
// `[{ commit, runId, waiting, verdict, promoted, at }]`, read from the results store's GET /v1/candidate (every
// commit's latest verdict of the last 30 days) and GET /v1/release-state (nightly's commit).
// Design: design/ci/channels-pipeline/channels.md section 7, stories-as-tests.md section 7.
// `waiting` is the review page's one question: a green-images run not promoted yet, and while nightly is held only
// the held head. Needs RESULTS_URL and a
// read token (GRAPHTY_RESULTS_TOKEN), from the environment or the repository's .env; fails loudly otherwise.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { call, config } from "../results/client.mjs";
import { parseEnvFile } from "../sonar/api.mjs";

/**
 * The full-run records the review page picks its candidate from.
 * @param get reads one store route and returns its JSON, throwing when it cannot
 * @returns `[{ commit, runId, waiting, verdict, promoted, at }]`, `at` the verdict's time in milliseconds
 */
export async function listCandidates(get) {
    const [{ recent, hold }, { nightly }] = await Promise.all([get("/v1/candidate"), get("/v1/release-state")]);
    // ponytail: ordered by verdict time, not site build time; a run judged out of order would be offered out of order
    return recent.map((v) => {
        // the store's `approved` state is written by release.yml's promotion after the approval
        // (tools/channel/resume.mjs); the review page also treats a candidate whose accept commit reached master as done
        const promoted = v.state === "approved" || v.sha === nightly?.sha;
        // while nightly is held, only the held head is offered (design/ci/channels-pipeline.md section 5)
        const offerable = !hold || hold.head === v.sha;
        return {
            commit: v.sha,
            runId: v.runId,
            // an inherited verdict's run captured nothing to review (tools/full-run.mjs records its lane)
            waiting:
                offerable && v.state === "green-images" && !promoted && !String(v.lane ?? "").startsWith("inherited"),
            verdict: v.state,
            promoted,
            at: v.at,
        };
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const env = { ...process.env };
    const dotenv = fileURLToPath(new URL("../../.env", import.meta.url));
    if (!env.RESULTS_URL && existsSync(dotenv)) {
        env.RESULTS_URL = parseEnvFile(readFileSync(dotenv, "utf8"), "RESULTS_URL");
    }
    const cfg = config(env);
    if (!cfg) {
        console.error("candidates: the results store is not configured (RESULTS_URL and GRAPHTY_RESULTS_TOKEN)");
        process.exit(1);
    }
    const get = async (path) => {
        const r = await call(cfg, "GET", path);
        if (!r.ok) throw new Error(`GET ${path}: ${r.why}`);
        return r.data;
    };
    try {
        console.log(JSON.stringify(await listCandidates(get)));
    } catch (e) {
        console.error(`candidates: ${e.message}`);
        process.exit(1);
    }
}
