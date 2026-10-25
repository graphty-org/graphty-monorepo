#!/usr/bin/env node
// full-run.mjs -- the 6-hour full run's two decisions in release.yml (design/ci/channels-pipeline/channels.md
// sections 5 and 6): which commit a slot tests, and the verdict on it.
//
//   node tools/full-run.mjs pick      which commit to test, or why the slot does nothing
//       env MODE (full | restart), HEAD_SHA (the commit the run started on); RESULTS_URL and the job's OIDC token
//       writes run, sha, why and good to GITHUB_OUTPUT
//   node tools/full-run.mjs verdict   the verdict on the tested commit: posted to the store, the red issue filed or
//                                     closed, one bisect dispatched, the outcome announced
//       env SHA, GOOD, LANES (JSON { lane: result }), LLM_OWNER_ITEM, CAPTURES (a directory of results.json),
//           RUN_ID, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY
//
// The store is the source of truth for verdicts; every read fails open ("unknown means run"): a store that does
// not answer makes the slot test master's head and makes the verdict skip only its own record.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { diffCommits } from "./release-diff.mjs";
import { call, config } from "./results/client.mjs";

export const RED_TITLE = "Full run red:";
const GREEN = new Set(["green-clean", "green-images", "approved"]);
const PASSING_IMAGES = new Set(["unchanged", "excluded"]);

/** The lanes in the order a red names them, each with its reader-facing name and its bisect.yml lane. */
export const LANES = {
    ci: { name: "CI", bisect: "ci" },
    llm: { name: "LLM regression", bisect: "llm" },
    t4: { name: "T4 GPU", bisect: "gpu" },
    hosts: { name: "Hosts", bisect: "hosts" },
    autosave_macos: { name: "work protection (macOS)", bisect: "macos" },
    audit: { name: "security audit", bisect: null },
    version_dry_run: { name: "version dry run", bisect: null },
};

/**
 * The commit a slot tests, or why it does nothing.
 * @param o the inputs
 * @param o.mode full or restart
 * @param o.head the commit the run started on (master's head when it was dispatched)
 * @param o.store `GET /v1/candidate`'s answer, or null when the store did not answer
 * @param o.firstParents (sha) => that commit and its first parents, newest first
 * @param o.stray (from, to) => the changes between two commits that are neither versions nor screenshot approvals
 * @returns `{ run, sha, why, good, inherit }`; inherit is the verdict the commit takes over, when it does
 */
export function pick({ mode, head, store, firstParents, stray }) {
    if (!store) return { run: true, sha: head, why: "the results store did not answer: testing master's head" };
    // a restart tests the merge that references the red issue; a slot tests the newest commit with a built site
    const sha = mode === "restart" ? head : store.candidate?.sha;
    if (!sha) return { run: true, sha: head, why: "the store records no site yet: testing master's head" };
    const judged = new Map((store.recent ?? []).map((v) => [v.sha, v]));
    const chain = firstParents(sha);
    const good = chain.slice(1).find((s) => GREEN.has(judged.get(s)?.state)) ?? "";
    const own = judged.get(sha);
    if (own) return { run: false, sha, good, why: `${short(sha)} is already judged ${own.state}` };
    const at = chain.findIndex((s) => judged.has(s));
    if (at > 0 && stray(chain[at], sha).length === 0) {
        const inherit = judged.get(chain[at]);
        const why = `every merge since ${short(chain[at])} (judged ${inherit.state}) changes only versions or screenshot approvals`;
        return { run: false, sha, good, why, inherit };
    }
    return { run: true, sha, good, why: `${short(sha)} is not judged yet` };
}

/**
 * The verdict on a full run (channels 5).
 * @param lanes `{ lane: result }` for every lane in LANES; an LLM lane that was not due is `skipped`
 * @param images the screenshots that differ from their baselines, or null when no capture was found
 * @param ownerItem why a red LLM lane is the owner's to fix (a refused key or balance), or empty
 * @returns `{ state, red }`: red lists the lanes that did not pass, in LANES order
 */
export function verdictOf(lanes, images, ownerItem = "") {
    // only the LLM lane may be skipped (not due that day); any other lane that did not run is not a pass
    const passed = (l) => lanes[l] === "success" || (l === "llm" && (lanes[l] ?? "skipped") === "skipped");
    const red = Object.keys(LANES).filter((l) => !passed(l));
    if (red.length === 1 && red[0] === "llm" && ownerItem) return { state: "owner-item", red };
    if (red.length) return { state: "red", red };
    // no capture at all is not "nothing differs": the owner looks
    return { state: images === 0 ? "green-clean" : "green-images", red };
}

/**
 * The screenshots that differ in a directory of downloaded visual captures, or null when it holds none.
 * @param dir the directory
 * @returns a count, or null
 */
export function differingImages(dir) {
    if (!dir || !existsSync(dir)) return null;
    // an artifact is visual-<project>-<attempt>/...: a re-run's newest attempt replaces the earlier ones
    const newest = new Map();
    for (const f of readdirSync(dir, { recursive: true }).map(String)) {
        const m = /^visual-(.+)-(\d+)[/\\].*results\.json$/.exec(f);
        if (m && Number(m[2]) >= (newest.get(m[1])?.attempt ?? 0)) newest.set(m[1], { attempt: Number(m[2]), f });
    }
    const files = [...newest.values()].map((v) => v.f);
    if (!files.length) return null;
    let n = 0;
    for (const f of files) {
        const items = JSON.parse(readFileSync(join(dir, f), "utf8")).items ?? [];
        n += items.filter((i) => !PASSING_IMAGES.has(i.status)).length;
    }
    return n;
}

/**
 * The red issue's title and body.
 * @param o the facts
 * @param o.sha the red commit
 * @param o.red the lanes that did not pass (LANES keys)
 * @param o.lanes every lane's result
 * @param o.run the run's URL
 * @param o.bisect one sentence on the bisect
 * @returns `{ title, body }`
 */
export function redIssue({ sha, red, lanes, run, bisect }) {
    const names = red.map((l) => LANES[l].name).join(", ");
    const results = Object.keys(LANES)
        .map((l) => `${LANES[l].name} ${lanes[l] ?? "skipped"}`)
        .join(", ");
    const body = [
        `The full run failed on ${sha} (${names}): ${run}`,
        "",
        `Results: ${results}`,
        "",
        bisect,
        "",
        "Nothing was published. Name this issue in the fix or the revert (`Refs #<this issue>`): its green master build restarts the full run on it, and a green verdict closes this issue.",
    ].join("\n");
    return { title: `${RED_TITLE} ${names} on ${short(sha)}`, body };
}

/**
 * The bisect.yml dispatch for a red run, or why there is none.
 * @param o the facts
 * @param o.red the lanes that did not pass (LANES keys)
 * @param o.sha the red commit
 * @param o.good the last green full-run commit, or empty
 * @param o.run the run id
 * @param o.failures `GET /v1/failures`'s answer, or null
 * @returns `{ inputs }` for bisect.yml, or `{ why }`
 */
export function bisectPlan({ red, sha, good, run, failures }) {
    const lane = red.find((l) => LANES[l].bisect);
    if (!lane) return { why: `${red.map((l) => LANES[l].name).join(", ")}: no bisect; the pipeline round looks` };
    if (!good) return { why: "no green full run is recorded before this one, so there is no range to bisect" };
    const tests = lane === "ci" ? (failures?.tests ?? []) : [];
    return {
        inputs: {
            lane: LANES[lane].bisect,
            good,
            bad: sha,
            run_id: String(run),
            targets: JSON.stringify(tests),
            failed_before: JSON.stringify(lane === "ci" ? (failures?.failedBefore ?? []) : []),
        },
    };
}

const short = (sha) => (sha ?? "").slice(0, 7);
const sh = (cmd, args, input) =>
    execFileSync(cmd, args, { encoding: "utf8", input, stdio: [input ? "pipe" : "ignore", "pipe", "inherit"] }).trim();
const output = (fields) => {
    const lines = Object.entries(fields).map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
    console.log(lines.join("\n"));
};
const read = async (cfg, path) => {
    const r = await call(cfg, "GET", path);
    if (!r.ok) console.log(`::warning::results store: GET ${path} did not answer (${r.why})`);
    return r.ok ? r.data : null;
};
const record = async (cfg, verdict) => {
    const r = await call(cfg, "POST", "/v1/verdicts", verdict);
    console.log(
        r.ok ? `recorded ${verdict.state} on ${short(verdict.sha)}` : `::warning::verdict not recorded (${r.why})`,
    );
};

async function pickMain(env) {
    const cfg = config(env);
    const store = cfg ? await read(cfg, "/v1/candidate") : null;
    const firstParents = (sha) => sh("git", ["rev-list", "--first-parent", "-n", "200", sha]).split("\n");
    const stray = (from, to) => diffCommits(from, to, { acceptMerges: true }).stray;
    const p = pick({ mode: env.MODE, head: env.HEAD_SHA, store, firstParents, stray });
    console.log(`::notice::${p.why}`);
    if (p.inherit) {
        await record(cfg, { sha: p.sha, state: p.inherit.state, lane: `inherited from ${short(p.inherit.sha)}` });
    }
    output({ run: String(p.run), sha: p.sha, good: p.good ?? "", why: p.why });
}

// The open red issue's number, or empty.
const openRed = () =>
    sh("gh", [
        "issue",
        "list",
        "--state",
        "open",
        "--search",
        `"${RED_TITLE}" in:title`,
        "--json",
        "number,title",
        "--jq",
        `[.[] | select(.title | startswith("${RED_TITLE}"))][0].number // empty`,
    ]);

function fileRed(issue) {
    const file = join(tmpdir(), `full-run-red-${process.pid}.md`);
    writeFileSync(file, issue.body);
    const open = openRed();
    if (open) {
        sh("gh", ["issue", "edit", open, "--title", issue.title]);
        sh("gh", ["issue", "comment", open, "--body-file", file]);
        return Number(open);
    }
    const url = sh("gh", [
        "issue",
        "create",
        "--title",
        issue.title,
        "--label",
        "bug",
        "--label",
        "priority:critical",
        "--label",
        "effort:medium",
        "--body-file",
        file,
    ]);
    return Number(url.split("/").pop());
}

function dispatchBisect(plan) {
    if (!plan.inputs) return `No bisect: ${plan.why}.`;
    const args = Object.entries(plan.inputs).flatMap(([k, v]) => ["-f", `${k}=${v}`]);
    sh("gh", ["workflow", "run", "bisect.yml", "--ref", "master", ...args]);
    return `Bisect dispatched: bisect.yml, lane ${plan.inputs.lane}, ${short(plan.inputs.good)}..${short(plan.inputs.bad)}.`;
}

async function verdictMain(env) {
    const cfg = config(env);
    const lanes = JSON.parse(env.LANES);
    const { state, red } = verdictOf(lanes, differingImages(env.CAPTURES), env.LLM_OWNER_ITEM);
    let issue = null;
    let what = state === "owner-item" ? env.LLM_OWNER_ITEM : state;
    if (state === "red") {
        const failures = cfg ? await read(cfg, `/v1/failures?run=${env.RUN_ID}&good=${env.GOOD}`) : null;
        const bisect = dispatchBisect(bisectPlan({ red, sha: env.SHA, good: env.GOOD, run: env.RUN_ID, failures }));
        issue = fileRed(redIssue({ sha: env.SHA, red, lanes, run: env.RUN_URL, bisect }));
        what = red.map((l) => LANES[l].name).join(", ");
    } else if (state !== "owner-item") {
        const open = openRed();
        if (open)
            sh("gh", ["issue", "close", open, "--comment", `The full run is ${state} on ${env.SHA}: ${env.RUN_URL}`]);
    }
    if (cfg) await record(cfg, { sha: env.SHA, state, lane: red.join(",") || null, issue });
    output({ state, issue: issue ? String(issue) : "", what });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const cmd = process.argv[2];
    if (cmd === "pick") await pickMain(process.env);
    else if (cmd === "verdict") await verdictMain(process.env);
    else {
        console.error("usage: node tools/full-run.mjs pick | verdict (see the head of the file)");
        process.exit(2);
    }
}
