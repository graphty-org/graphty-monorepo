#!/usr/bin/env node
// rolling.mjs -- the review page's "master rolling" target (`rolling` in visual-review.config.json; design:
// design/visual-testing/early-capture.md, 4d). Prints JSON, newest render commit first:
//   [{ commit, at, items: [{ project, id, mode, runId, attempt, artifact }], pending: [{ project, id, mode, why }] }]
// One entry per render commit X of the rolling slices (story-slices.yml): each story's NEWEST render that is changed,
// new or unseeded against X's own baselines. An item is offered (`items`) only while X's visual-baselines tree is
// still master's and no merge since X reaches its project; otherwise it waits for its re-render (`pending`), which
// the reached-first slice order brings soon. Reach only holds an item back; it never skips a render, and nothing
// here approves anything: every decision is the owner's, on exactly the render listed.
// Needs RESULTS_URL and a read token (GRAPHTY_RESULTS_TOKEN), from the environment or the repository's .env, and
// origin/master fetched (the review server fetches it on every refresh).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { call, config } from "../results/client.mjs";
import { parseEnvFile } from "../sonar/api.mjs";

export const CAPTURES_PATH = "/v1/story-captures";
// what a decision can be taken on; unstable and failed renders are never offered
const OFFERED = new Set(["changed", "new", "unseeded"]);
// how many merges after X the store is asked about (D1 binds at most 100); X further back than that waits
export const MAX_MERGES = 100;

/**
 * The rolling target's offers.
 * @param captures the store's newest capture of each story (`GET /v1/story-captures` captures)
 * @param tip `{ tree }`: master's visual-baselines tree now
 * @param mergesSince (sha) => master's first-parent commits after sha up to its tip, or null when sha is not on that
 *   line within MAX_MERGES
 * @param reach Map(sha -> Set of reach keys `<project>:<file>` or `<project>:*`)
 * @returns offers, newest render commit first
 */
export function rollingOffers(captures, tip, mergesSince, reach) {
    const byCommit = new Map();
    for (const c of captures.filter((x) => OFFERED.has(x.status))) {
        const o = byCommit.get(c.sha) ?? { commit: c.sha, at: 0, items: [], pending: [] };
        o.at = Math.max(o.at, c.at);
        const why = holdBack(c, tip, mergesSince, reach);
        const id = { project: c.project, id: c.story, mode: c.mode || null };
        if (why) o.pending.push({ ...id, why });
        else o.items.push({ ...id, runId: c.runId, attempt: c.attempt, artifact: c.artifact });
        byCommit.set(c.sha, o);
    }
    return [...byCommit.values()].sort((a, b) => b.at - a.at);
}

function holdBack(c, tip, mergesSince, reach) {
    if (c.baselinesTree !== tip.tree) return "an approval changed master's baselines since this render";
    const merges = mergesSince(c.sha);
    if (merges === null) return `rendered more than ${MAX_MERGES} merges ago, or not on master`;
    // ponytail: a file-level reach key holds back the whole project (capture rows carry no story file); per-file once
    // reach rows are file-level (test-select-rules.json selectProjects) and capture rows name their unit
    const reached = merges.filter((m) => [...(reach.get(m) ?? [])].some((k) => k.startsWith(`${c.project}:`)));
    return reached.length ? `re-render pending: ${reached.length} merges since reach ${c.project}` : null;
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

async function main(get) {
    const tipRef = "refs/remotes/origin/master";
    const tree = git("rev-parse", `${tipRef}:visual-baselines`);
    const line = git("rev-list", "--first-parent", `--max-count=${MAX_MERGES + 1}`, tipRef).split("\n");
    const mergesSince = (sha) => {
        const at = line.indexOf(sha);
        return at === -1 || at > MAX_MERGES ? null : line.slice(0, at);
    };
    const { captures } = await get(CAPTURES_PATH);
    const shas = new Set(captures.flatMap((c) => mergesSince(c.sha) ?? []));
    const reach = new Map();
    if (shas.size) {
        const { reach: rows } = await get(`/v1/story-reach?shas=${[...shas].slice(0, MAX_MERGES).join(",")}`);
        for (const r of rows) reach.set(r.sha, (reach.get(r.sha) ?? new Set()).add(r.unit));
    }
    return rollingOffers(captures, { tree }, mergesSince, reach);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const env = { ...process.env };
    const dotenv = fileURLToPath(new URL("../../.env", import.meta.url));
    if (!env.RESULTS_URL && existsSync(dotenv))
        env.RESULTS_URL = parseEnvFile(readFileSync(dotenv, "utf8"), "RESULTS_URL");
    const cfg = config(env);
    if (!cfg) {
        console.error("rolling: the results store is not configured (RESULTS_URL and GRAPHTY_RESULTS_TOKEN)");
        process.exit(1);
    }
    const get = async (path) => {
        const r = await call(cfg, "GET", path);
        if (!r.ok) throw new Error(`GET ${path}: ${r.why}`);
        return r.data;
    };
    try {
        // a store without the rolling slices' routes yet (deployed with tools/results-service) has nothing to offer
        const ready = await call(cfg, "GET", CAPTURES_PATH);
        if (!ready.ok && ready.why === "HTTP 404") {
            console.error("rolling: the results store has no story captures route yet; nothing to offer");
            console.log("[]");
            process.exit(0);
        }
        console.log(JSON.stringify(await main(get)));
    } catch (e) {
        console.error(`rolling: ${e.message}`);
        process.exit(1);
    }
}
