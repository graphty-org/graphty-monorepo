#!/usr/bin/env node
// full-run.mjs -- the 6-hour full run's two decisions in release.yml (design/ci/channels-pipeline/channels.md
// sections 5 and 6): which commit a slot tests, and the verdict on it.
//
//   node tools/full-run.mjs pick      which commit to test, or why the slot does nothing
//       env MODE (full | restart), HEAD_SHA (the commit the run started on); RESULTS_URL and the job's OIDC token
//       writes run, sha, why and good to GITHUB_OUTPUT
//   node tools/full-run.mjs verdict   the verdict on the tested commit: posted to the store, the red issue filed or
//                                     closed, one bisect dispatched, the outcome announced
//       env SHA, GOOD, LANES (JSON { lane: result }, with pick's own result), LLM_OWNER_ITEM, VERSION_HELD
//           (the version dry run's held projects), CAPTURES (a directory of results.json),
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
    // the pick job itself: a pick that failed tested nothing, so it is red on its own and nothing is recorded
    pick: { name: "candidate pick", bisect: null },
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
 * @param o.store `GET /v1/candidate`'s answer (candidate, sites, recent), or null when the store did not answer
 * @param o.firstParents (sha) => that commit and its first parents, newest first
 * @param o.stray (from, to) => the changes between two commits that are neither versions nor screenshot approvals
 * @returns `{ run, sha, why, good, inherit }`; inherit is the verdict the commit takes over, when it does
 */
export function pick({ mode, head, store, firstParents, stray }) {
    if (!store) return { run: true, sha: head, why: "the results store did not answer: testing master's head" };
    // a restart tests the merge that references the red issue; a slot tests the newest commit with a built site,
    // newest by master's first-parent order from the head, not by when its site was recorded (a re-run of an
    // older commit's build records its site late)
    const sites = new Set(store.sites ?? []);
    const byOrder = sites.size ? firstParents(head).find((s) => sites.has(s)) : undefined;
    const sha = mode === "restart" ? head : (byOrder ?? store.candidate?.sha);
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
 * @param lanes `{ lane: result }` for every lane in LANES; an LLM lane that was not due is `skipped`; `pick`
 *   may be left out
 * @param images the screenshots that differ from their baselines, or null when no capture was found
 * @param ownerItem why a red LLM lane is the owner's to fix (a refused key or balance), or empty
 * @param held the projects the version dry run held for want of a release-approvals.json entry, or empty
 * @returns `{ state, red }`: red lists the lanes that did not pass, in LANES order
 */
export function verdictOf(lanes, images, ownerItem = "", held = "") {
    if ((lanes.pick ?? "success") !== "success") return { state: "red", red: ["pick"] };
    // only the LLM lane may be skipped (not due that day); any other lane that did not run is not a pass
    const passed = (l) =>
        l === "pick" || lanes[l] === "success" || (l === "llm" && (lanes[l] ?? "skipped") === "skipped");
    const red = Object.keys(LANES).filter((l) => !passed(l));
    if (red.length === 1 && red[0] === "llm" && ownerItem) return { state: "owner-item", red };
    // a planned major or first publish waits for the owner's release-approvals.json entry: his item, not a bug
    if (red.length === 1 && red[0] === "version_dry_run" && held) return { state: "owner-item", red };
    if (red.length) return { state: "red", red };
    // no capture at all is not "nothing differs": the owner looks
    return { state: images === 0 ? "green-clean" : "green-images", red };
}

/**
 * The screenshots that differ in a directory of downloaded visual captures, or null when it holds none or
 * lacks a project's capture (one that crashed before writing results.json is not "nothing differs").
 * @param dir the directory
 * @param [expected] the projects a full run captures (visual-review.config.json)
 * @returns a count, or null
 */
export function differingImages(dir, expected = []) {
    if (!dir || !existsSync(dir)) return null;
    // an artifact is visual-<project>-<attempt>/...: a re-run's newest attempt replaces the earlier ones
    const newest = new Map();
    for (const f of readdirSync(dir, { recursive: true }).map(String)) {
        const m = /^visual-(.+)-(\d+)[/\\](?:.*[/\\])?results\.json$/.exec(f);
        if (m && Number(m[2]) >= (newest.get(m[1])?.attempt ?? 0)) newest.set(m[1], { attempt: Number(m[2]), f });
    }
    const files = [...newest.values()].map((v) => v.f);
    if (!files.length || expected.some((p) => !newest.has(p))) return null;
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
    // ponytail: the first MAX_TARGETS failing tests; a dispatch input holds at most 65,535 characters, and a
    // broken setup fails a thousand tests that all bisect to the same merge
    const tests = lane === "ci" ? (failures?.tests ?? []).slice(0, MAX_TARGETS) : [];
    return {
        inputs: {
            lane: LANES[lane].bisect,
            good,
            bad: sha,
            run_id: String(run),
            targets: JSON.stringify(tests),
            // only the capped targets' ids: the rest are not bisected, and the input has the same limit
            failed_before: JSON.stringify(
                (failures?.failedBefore ?? []).filter((id) =>
                    tests.some((t) => id === `${t.shard}: ${t.file} > ${t.name}`),
                ),
            ),
        },
    };
}

const MAX_TARGETS = 100;
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

// The open red issue's number and title ("<number> <title>"), or empty.
const openRedIssue = () =>
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
        String.raw`[.[] | select(.title | startswith("${RED_TITLE}"))][0] | select(.) | "\(.number) \(.title)"`,
    ]);
const openRed = () => openRedIssue().split(" ")[0];

/**
 * Whether a green verdict on `green` closes the open red issue: only when the red commit its title names
 * (`... on <short sha>`) is in the green commit's history, so an older green commit never closes a newer red.
 * @param title the red issue's title
 * @param green the green commit
 * @param isAncestor (a, b) => whether a is in b's history
 * @returns boolean
 */
export function greenCloses(title, green, isAncestor) {
    const red = / on ([0-9a-f]{7,40})$/.exec(title ?? "")?.[1];
    return !!red && isAncestor(red, green);
}
const ancestor = (a, b) => {
    try {
        execFileSync("git", ["merge-base", "--is-ancestor", a, b], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
};

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

/**
 * Runs one GitHub side effect of the verdict so that its failure (a rate limit, a 5xx) cannot lose
 * the verdict: a lost record makes the next slot rerun every lane and bisect the same red again.
 * @param fn the side effect
 * @param what what it does, for the warning
 * @param fallback (why) => the value to return instead
 * @returns fn's value, or fallback's
 */
export function bestEffort(fn, what, fallback) {
    try {
        return fn();
    } catch (error) {
        const why = String(error?.message ?? error).split("\n")[0];
        console.log(`::warning::${what} failed: ${why}`);
        return fallback(why);
    }
}

function tryBisect(plan) {
    return bestEffort(
        () => dispatchBisect(plan),
        "dispatching bisect.yml",
        (why) => `No bisect: dispatching bisect.yml failed (${why}); the pipeline round looks.`,
    );
}

function closeRedOnGreen(state, env) {
    const [open, ...title] = openRedIssue().split(" ");
    if (!open) return;
    if (greenCloses(title.join(" "), env.SHA, ancestor)) {
        sh("gh", ["issue", "close", open, "--comment", `The full run is ${state} on ${env.SHA}: ${env.RUN_URL}`]);
    } else {
        console.log(`::notice::#${open} stays open: its red commit is not in ${short(env.SHA)}'s history`);
    }
}

async function verdictMain(env) {
    const cfg = config(env);
    const lanes = JSON.parse(env.LANES);
    const projects = Object.keys(JSON.parse(readFileSync("visual-review.config.json", "utf8")).projects ?? {});
    const images = differingImages(env.CAPTURES, projects);
    const { state, red } = verdictOf(lanes, images, env.LLM_OWNER_ITEM, env.VERSION_HELD);
    let issue = null;
    let bisect = "";
    let what = state;
    if (state === "owner-item") {
        what =
            red[0] === "llm"
                ? env.LLM_OWNER_ITEM
                : `${env.VERSION_HELD} would publish a major or a first version: add its release-approvals.json entry`;
    }
    if (state === "red") {
        const failures = cfg ? await read(cfg, `/v1/failures?run=${env.RUN_ID}&good=${env.GOOD}`) : null;
        bisect = tryBisect(bisectPlan({ red, sha: env.SHA, good: env.GOOD, run: env.RUN_ID, failures }));
        const body = redIssue({ sha: env.SHA, red, lanes, run: env.RUN_URL, bisect });
        issue = bestEffort(
            () => fileRed(body),
            "filing the red issue",
            () => null,
        );
        what = red.map((l) => LANES[l].name).join(", ");
    } else if (state !== "owner-item") {
        bestEffort(
            () => closeRedOnGreen(state, env),
            "closing the red issue",
            () => null,
        );
    }
    // a failed pick judged no commit: recording red on one would make the next slot skip it
    if (cfg && red[0] !== "pick") await record(cfg, { sha: env.SHA, state, lane: red.join(",") || null, issue });
    output({ state, issue: issue ? String(issue) : "", what, bisect });
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
