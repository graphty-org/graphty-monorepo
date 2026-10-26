#!/usr/bin/env node
// The nightly promotion's decisions and records in release.yml (design/ci/channels-pipeline/channels.md, sections
// 3, 7 and 11; the stall alarm, design/ci/channels-pipeline.md section 7). Issue #1020.
//
//   node tools/channel/nightly.mjs decide        the verdict job: does a green-clean candidate promote now?
//       env STATE (the verdict), GH_TOKEN, GITHUB_REPOSITORY, GATE (the screenshot gate's outcome: success or failure)
//       writes promote (true | false) and why to GITHUB_OUTPUT
//   node tools/channel/nightly.mjs channel-json  the site job: channel.json for the site-<sha> prerelease, on stdout
//       env SHA, COMMIT (the version commit, empty when nothing was versioned), RUN_ID, SITE_SHA256, CONFIG_REF
//   node tools/channel/nightly.mjs deployed-json the site job: deployed.json for graphty-nightly, on stdout
//       env SHA, SITE_SHA256, CONFIG_REF
//   node tools/channel/nightly.mjs wait          the site job: wait for graphty-nightly's deploy of deployed.json
//       env SITE_REPO, PUSHED (the deployed.json commit), SITE_URL, SHA, GH_TOKEN; ends on the deploy run's
//       conclusion or on the site's build stamp naming SHA, never on a timer (the job's timeout-minutes is only a
//       hang guard)
//   node tools/channel/nightly.mjs record        the site job: the promotion to the results store (fail open)
//       env SHA, COMMIT, SITE_SHA256, CHANNEL_SHA256, RESULTS_URL and the job's OIDC token
//   node tools/channel/nightly.mjs stall         every release.yml run's timings job: the age:nightly alarm
//       env RESULTS_URL, GH_TOKEN, GITHUB_REPOSITORY, RUN_URL
//   node tools/channel/nightly.mjs failed        the site job, when it failed: one priority:critical issue
//       env SHA, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY; prints the issue's number
//   node tools/channel/nightly.mjs deployed      the site job, when it deployed: closes that issue, if open
//       env SHA, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY
import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { call, config } from "../results/client.mjs";

const HOUR = 3_600_000;
export const STALL_TITLE = "Nightly stalled since";
export const FAILED_TITLE = "Nightly site deploy failed";
export const PUBLISH_HOLD = "Release held: publish failed";

/**
 * Whether a full run's verdict promotes its candidate to nightly now (channels 7 and 11).
 * @param o the inputs
 * @param o.state the verdict: green-clean, green-images, red or owner-item
 * @param o.publishHold the open publish hold's issue number, or empty
 * @param o.gate the screenshot gate's outcome on the candidate against channel/nightly: success, or anything else
 * @returns `{ promote, why }`
 */
export function promotion({ state, publishHold, gate }) {
    if (state !== "green-clean")
        return { promote: false, why: `the verdict is ${state || "missing"}, not green-clean` };
    if (publishHold) {
        return {
            promote: false,
            why: `the nightly promotion waits: publish hold #${publishHold} is open (re-run its publish to clear it)`,
        };
    }
    if (gate !== "success") {
        return {
            promote: false,
            why: "the screenshot gate refused: the candidate's visual-baselines/ differ from nightly's without the owner's signed approval of that tree",
        };
    }
    return { promote: true, why: "green-clean, no publish hold, and the screenshot gate passed" };
}

/**
 * Every published package's version at a commit, by nx project name (channel.json's `versions`, the keys
 * promote.mjs builds `<project>@<version>` release tags from), so promote.yml can compare it with npm's `latest`
 * whatever was skipped in between. The project name is project.json's, else the package's npm name
 * (remote-logger has no project.json, and its project is "@graphty/remote-logger").
 * @param show (path) => the file's text at that commit, or null when it is not there
 * @returns `{ "<project>": "<version>" }`
 */
export function versionsAt(show) {
    const workspace = show("pnpm-workspace.yaml") ?? "";
    // the `packages:` list: the "- dir" lines after it, up to the first line that is not one
    const lines = workspace.split("\n");
    const dirs = [];
    for (const line of lines.slice(lines.indexOf("packages:") + 1)) {
        const item = line.trim();
        if (!item.startsWith("- ")) break;
        dirs.push(item.slice(2).trim().replaceAll(/["']/g, ""));
    }
    const out = {};
    for (const dir of dirs) {
        const text = show(`${dir}/package.json`);
        if (!text) continue;
        const pkg = JSON.parse(text);
        if (pkg.private === true || !pkg.name || !pkg.version) continue;
        const project = JSON.parse(show(`${dir}/project.json`) ?? "{}").name ?? pkg.name;
        out[project] = pkg.version;
    }
    return out;
}

/**
 * graphty-element's autosave and project format version at a commit (channels 10), or null when it is not found.
 * @param source the text of graphty-element/src/autosave/Autosaver.ts
 * @returns the version
 */
export function autosaveFormatOf(source) {
    const m = /export const AUTOSAVE_FORMAT_VERSION = (\d+);/.exec(source ?? "");
    return m ? Number(m[1]) : null;
}

/**
 * channel.json, the record of one promotion (channels 3).
 * @param o the fields
 * @param o.sha the candidate
 * @param o.commit the version commit, or empty when nothing was versioned
 * @param o.versions versionsAt() of the version commit (or of the candidate)
 * @param o.run the release.yml run id
 * @param o.configBlob the blob id of graphty/sites/nightly.json that the site deploys as site.json
 * @param o.autosaveFormat autosaveFormatOf() at the same commit
 * @param o.siteSha256 the sha256 of site.tar.zst
 * @param o.now milliseconds
 * @returns the record
 */
export function channelRecord({ sha, commit, versions, run, configBlob, autosaveFormat, siteSha256, now }) {
    return {
        channel: "nightly",
        commit: sha,
        versionCommit: commit || null,
        versions,
        fullRun: String(run),
        screenshots: "unchanged",
        siteConfigBlob: configBlob,
        autosaveFormat,
        siteSha256,
        promotedAt: new Date(now).toISOString(),
        promotedBy: "auto",
    };
}

/**
 * deployed.json for the site repository (tools/channel/site-deploy.yml's input).
 * @param o the fields
 * @param o.sha the candidate
 * @param o.siteSha256 the sha256 of site.tar.zst
 * @param o.configRef the master commit whose graphty/sites/nightly.json becomes site.json
 * @param o.now milliseconds
 * @returns the record
 */
export function deployedRecord({ sha, siteSha256, configRef, now }) {
    return {
        site: "nightly",
        tag: `site-${sha}`,
        sha256: siteSha256,
        configRef,
        time: new Date(now).toISOString(),
        approver: "auto",
    };
}

/**
 * The commit a page's build stamp names, `<meta name="graphty-build" content="commit=<sha> ...">`.
 * @param html the page
 * @returns the commit, or null
 */
export function stampOf(html) {
    const meta = /<meta[^>]*name=["']graphty-build["'][^>]*>/i.exec(html ?? "")?.[0] ?? "";
    return /commit=([0-9a-f]{7,40})/.exec(meta)?.[1] ?? null;
}

/**
 * Whether the site's deploy has ended (channels 3: on the deploy report, or on the public stamp).
 * @param o the inputs
 * @param o.runs the site repository's workflow runs for the deployed.json commit (status, conclusion, html_url)
 * @param o.stamp the commit the site's build stamp names
 * @param o.sha the candidate
 * @returns `{ done, ok, why }`
 */
export function deployState({ runs, stamp, sha }) {
    const finished = (runs ?? []).filter((r) => r.status === "completed");
    const bad = finished.find((r) => r.conclusion !== "success" && r.conclusion !== "skipped");
    if (bad) return { done: true, ok: false, why: `the site's deploy ended ${bad.conclusion}: ${bad.html_url}` };
    const good = finished.find((r) => r.conclusion === "success");
    if (good) return { done: true, ok: true, why: `the site's deploy passed: ${good.html_url}` };
    if (stamp && sha.startsWith(stamp)) return { done: true, ok: true, why: `the site's build stamp names ${stamp}` };
    return { done: false };
}

/**
 * The stall alarm (main section 7): over 24 hours since nightly moved while canary holds an unpromoted commit,
 * one priority:critical issue naming what blocks it; over 48 hours it asks the owner to act.
 * @param o the inputs
 * @param o.state GET /v1/release-state's answer
 * @param o.publishHold the open publish hold's number, or empty
 * @param o.now milliseconds
 * @returns null when nightly is not stalled, else `{ title, body, urgent }`
 */
export function stall({ state, publishHold, now }) {
    const age = state?.ageNightlyMs ?? 0;
    if (age <= 24 * HOUR) return null;
    const since = new Date(now - age).toISOString().slice(0, 10);
    const canary = state.canary?.sha?.slice(0, 7) ?? "canary";
    const redIssue = state.red?.issue ? " (#" + state.red.issue + ")" : "";
    const redLane = state.red?.lane ? " on its " + state.red.lane + " lane" : "";
    const blocks = {
        red: `the full run is red${redIssue}${redLane}: fix it forward or revert the culprit`,
        "owner-item": "an owner item: a lane failed for a reason no code change fixes (see the Release status issue)",
        "waiting-for-screenshots": `waiting for the owner's screenshot review of ${state.offered?.sha?.slice(0, 7) ?? "the offered candidate"}`,
        "resume-due": "an approved candidate waits for its resume run (release.yml mode promote-nightly)",
        rejected: "the owner rejected the candidate's screenshots: fix forward",
        promotable: "the verdict is green-clean but nothing promoted it: read the newest release.yml run",
        unjudged: `${canary} has no verdict yet: no full run judged it`,
    };
    const what = [blocks[state.blocking] ?? `blocked: ${state.blocking}`];
    if (publishHold)
        what.unshift(`publish hold #${publishHold} is open, so no promotion runs until its publish is re-run`);
    const urgent = age > 48 * HOUR;
    const hours = Math.floor(age / HOUR);
    const body = [
        `nightly.graphty.app and npm \`next\` have not moved for ${hours} hours, while canary holds ${canary}, a commit nightly does not.`,
        "",
        ...what.map((w) => `- ${w}`),
        "",
        "This issue is updated by every release.yml run and closes itself once nightly moves (tools/channel/nightly.mjs stall).",
    ];
    if (urgent) body.push("", `ACTION NEEDED: nightly stalled ${hours} h; ${what[0]}`);
    return { title: `${STALL_TITLE} ${since}`, body: body.join("\n"), urgent };
}

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();

function openIssue(prefix, repo) {
    const out = gh(
        "issue",
        "list",
        "-R",
        repo,
        "--state",
        "open",
        "--search",
        `in:title "${prefix}"`,
        "--limit",
        "20",
        "--json",
        "number,title,body",
    );
    return JSON.parse(out || "[]").find((i) => i.title.startsWith(prefix)) ?? null;
}

function output(fields) {
    const lines = Object.entries(fields).map(([k, v]) => `${k}=${v}`);
    console.log(lines.join("\n"));
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

function bodyFile(text) {
    const path = join(process.env.RUNNER_TEMP ?? tmpdir(), `nightly-${process.pid}-${Date.now()}.md`);
    writeFileSync(path, text);
    return path;
}

const show = (ref) => (path) => {
    try {
        return execFileSync("git", ["show", `${ref}:${path}`], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        });
    } catch {
        return null;
    }
};

function need(env, names) {
    const missing = names.filter((n) => !env[n]);
    if (missing.length) throw new Error(`missing ${missing.join(", ")}`);
}

async function stallMain(env) {
    const repo = env.GITHUB_REPOSITORY;
    const res = await call(config(env), "GET", "/v1/release-state");
    if (!res.ok) {
        console.log(`::warning::age:nightly not checked: the results store did not answer (${res.why})`);
        return;
    }
    let publishHold = "";
    try {
        publishHold = String(openIssue(PUBLISH_HOLD, repo)?.number ?? "");
    } catch {
        // the alarm matters more than the hold's number
    }
    const alarm = stall({ state: res.data, publishHold, now: Date.now() });
    const open = openIssue(STALL_TITLE, repo);
    if (!alarm) {
        console.log(`age:nightly ${Math.round((res.data?.ageNightlyMs ?? 0) / HOUR)} h: not stalled`);
        if (open)
            gh(
                "issue",
                "close",
                String(open.number),
                "-R",
                repo,
                "--comment",
                `Nightly moved (or caught up with canary): ${env.RUN_URL ?? ""}`,
            );
        return;
    }
    console.log(`::warning::age:nightly over 24 h: ${alarm.title}`);
    if (!open) {
        const file = bodyFile(alarm.body);
        console.log(
            gh(
                "issue",
                "create",
                "-R",
                repo,
                "--title",
                alarm.title,
                "--label",
                "bug",
                "--label",
                "priority:critical",
                "--label",
                "effort:medium",
                "--body-file",
                file,
            ),
        );
        return;
    }
    const crossed = alarm.urgent && !(open.body ?? "").includes("ACTION NEEDED");
    gh("issue", "edit", String(open.number), "-R", repo, "--body-file", bodyFile(alarm.body));
    // a comment notifies; an edit does not. Once on crossing 48 hours, never on every run.
    if (crossed) gh("issue", "comment", String(open.number), "-R", repo, "--body-file", bodyFile(alarm.body));
}

// One look at the site's deploy: graphty-nightly's runs for the deployed.json commit, and the site's stamp.
async function lookAtDeploy(env) {
    let runs = [];
    try {
        runs = JSON.parse(
            gh(
                "api",
                `repos/${env.SITE_REPO}/actions/runs?head_sha=${env.PUSHED}&event=push`,
                "--jq",
                ".workflow_runs",
            ),
        );
    } catch {
        // a read the site repository refuses leaves the build stamp to decide
    }
    let stamp = null;
    try {
        const res = await fetch(`${env.SITE_URL}/?nightly-wait=${Date.now()}`, { signal: AbortSignal.timeout(10_000) });
        if (res.ok) stamp = stampOf(await res.text());
    } catch {
        // not served yet
    }
    return { ...deployState({ runs, stamp, sha: env.SHA }), stamp };
}

// The deploy sends no event the job can wait on when it never starts (a disabled workflow, a refused runs read),
// so the wait has its own limit, counted from the job's start (JOB_STARTED_MS, the site job's first step) and
// 4 minutes under its 20-minute hang guard: it fails by name and the job's failure report runs, which a job
// timeout (cancelled) would skip, however long the download and pack before it took.
export const WAIT_LIMIT_MS = 16 * 60_000;

/**
 * When the deploy wait gives up.
 * @param env JOB_STARTED_MS (the job's start, else now) and WAIT_LIMIT_MS (a test's override)
 * @param now milliseconds
 * @returns milliseconds
 */
export function waitDeadline(env, now) {
    return (Number(env.JOB_STARTED_MS) || now) + Number(env.WAIT_LIMIT_MS ?? WAIT_LIMIT_MS);
}

async function waitMain(env, now = Date.now) {
    need(env, ["SITE_REPO", "PUSHED", "SITE_URL", "SHA"]);
    const limit = waitDeadline(env, now());
    for (;;) {
        const s = await lookAtDeploy(env);
        if (s.done) {
            console.log(s.ok ? s.why : `::error::${s.why}`);
            return s.ok ? 0 : 1;
        }
        if (now() >= limit) {
            console.log(
                `::error::${env.SITE_REPO}'s deploy of ${env.PUSHED.slice(0, 7)} did not finish, and ${env.SITE_URL} does not name ${env.SHA} (stamp: ${s.stamp ?? "none"}): check that repository's deploy workflow ran`,
            );
            return 1;
        }
        console.log(`waiting for ${env.SITE_REPO}'s deploy of ${env.PUSHED.slice(0, 7)} (stamp: ${s.stamp ?? "none"})`);
        await new Promise((r) => setTimeout(r, 20_000));
    }
}

function decideMain(env) {
    let hold = "";
    if (env.STATE === "green-clean") {
        try {
            hold = execFileSync("tools/release-held.sh", ["find", PUBLISH_HOLD], { encoding: "utf8" }).trim();
        } catch (error) {
            // an unknown hold is not "no hold": a promotion that cannot check waits for the next run
            hold = "(unknown: " + error.message.split("\n")[0] + ")";
        }
    }
    const p = promotion({ state: env.STATE, publishHold: hold, gate: env.GATE });
    if (!p.promote && env.STATE === "green-clean") console.log(`::notice::${p.why}`);
    if (env.GITHUB_STEP_SUMMARY) {
        appendFileSync(env.GITHUB_STEP_SUMMARY, `Nightly promotion: ${p.promote ? "yes" : "no"} -- ${p.why}\n`);
    }
    output({ promote: String(p.promote), why: p.why });
}

function channelJsonMain(env) {
    need(env, ["SHA", "RUN_ID", "SITE_SHA256", "CONFIG_REF"]);
    const at = show(env.COMMIT || env.SHA);
    const blob = execFileSync("git", ["rev-parse", `${env.CONFIG_REF}:graphty/sites/nightly.json`], {
        encoding: "utf8",
    }).trim();
    const record = channelRecord({
        sha: env.SHA,
        commit: env.COMMIT,
        versions: versionsAt(at),
        run: env.RUN_ID,
        configBlob: blob,
        autosaveFormat: autosaveFormatOf(at("graphty-element/src/autosave/Autosaver.ts")),
        siteSha256: env.SITE_SHA256,
        now: Date.now(),
    });
    console.log(JSON.stringify(record, null, 2));
}

function deployedJsonMain(env) {
    need(env, ["SHA", "SITE_SHA256", "CONFIG_REF"]);
    const record = deployedRecord({
        sha: env.SHA,
        siteSha256: env.SITE_SHA256,
        configRef: env.CONFIG_REF,
        now: Date.now(),
    });
    console.log(JSON.stringify(record, null, 4));
}

async function recordMain(env) {
    const body = {
        channel: "nightly",
        sha: env.SHA,
        versionCommit: env.COMMIT || undefined,
        siteSha256: env.SITE_SHA256,
        channelSha256: env.CHANNEL_SHA256,
    };
    const res = await call(config(env), "POST", "/v1/channel-moves", body);
    console.log(
        res.ok
            ? `recorded nightly at ${env.SHA}`
            : `::warning::the results store did not record the nightly promotion (${res.why}); age:nightly counts from the previous one`,
    );
}

function failedMain(env) {
    need(env, ["SHA", "GITHUB_REPOSITORY"]);
    const repo = env.GITHUB_REPOSITORY;
    const text = [
        `The nightly site job failed on ${env.SHA}: ${env.RUN_URL ?? ""}`,
        "",
        "npm `next` may already hold this candidate's versions while nightly.graphty.app still serves the previous nightly. Read the failed step; once fixed, re-run the run's failed jobs (`gh run rerun <run id> --failed`), which re-runs only the site job. A missing NIGHTLY_SITE_DEPLOY_KEY (environment `nightly`) or a graphty-nightly without .github/workflows/deploy.yml is an owner item.",
    ].join("\n");
    const open = openIssue(FAILED_TITLE, repo);
    if (open) {
        gh("issue", "comment", String(open.number), "-R", repo, "--body-file", bodyFile(text));
        console.log(open.number);
        return;
    }
    const title = `${FAILED_TITLE} on ${env.SHA.slice(0, 7)}`;
    const labels = ["--label", "bug", "--label", "priority:critical", "--label", "effort:medium"];
    const url = gh("issue", "create", "-R", repo, "--title", title, ...labels, "--body-file", bodyFile(text));
    console.log(url.split("/").pop());
}

function deployedMain(env) {
    need(env, ["SHA", "GITHUB_REPOSITORY"]);
    const open = openIssue(FAILED_TITLE, env.GITHUB_REPOSITORY);
    if (!open) return;
    const text = `nightly.graphty.app serves ${env.SHA} (${env.RUN_URL ?? ""}).`;
    gh("issue", "close", String(open.number), "-R", env.GITHUB_REPOSITORY, "--comment", text);
    console.log(`closed #${open.number}`);
}

const COMMANDS = {
    decide: decideMain,
    "channel-json": channelJsonMain,
    "deployed-json": deployedJsonMain,
    wait: waitMain,
    record: recordMain,
    stall: stallMain,
    failed: failedMain,
    deployed: deployedMain,
};

async function main(command, env = process.env) {
    const run = COMMANDS[command];
    if (!run) {
        console.error(
            `usage: node tools/channel/nightly.mjs ${Object.keys(COMMANDS).join(" | ")} (see the head of the file)`,
        );
        return 2;
    }
    return (await run(env)) ?? 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    try {
        process.exitCode = await main(process.argv[2]);
    } catch (error) {
        console.log(`::error::${error.message}`);
        process.exitCode = 1;
    }
}
