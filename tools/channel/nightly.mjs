#!/usr/bin/env node
// The nightly promotion's decisions and records in release.yml (design/ci/channels-pipeline/channels.md, sections
// 3, 7 and 11; the stall alarm, design/ci/channels-pipeline.md section 7). Issue #1020.
//
//   node tools/channel/nightly.mjs decide        the verdict job: does a green-clean candidate promote now?
//       env STATE (the verdict), GH_TOKEN, GITHUB_REPOSITORY, GATE (the screenshot gate's outcome: success or failure),
//           GATE_REASON (the gate's refusal lines, from screenshot-gate.sh),
//           HELD (the held candidate's head, from the pick), SHA
//       writes promote (true | false) and why to GITHUB_OUTPUT
//   node tools/channel/nightly.mjs channel-json  the site job: channel.json for the site-<sha> prerelease, on stdout
//       env SHA, COMMIT (the version commit, empty when nothing was versioned), RUN_ID, SITE_SHA256, CONFIG_REF
//   node tools/channel/nightly.mjs site-release  the site job: the site-<sha> prerelease with site.tar.zst and
//       channel.json (from $RUNNER_TEMP/out) in one call (releases are immutable); writes tag to GITHUB_OUTPUT
//       env SHA, SITE_SHA256, RUN_URL, GH_TOKEN, RUNNER_TEMP
//   node tools/channel/nightly.mjs deployed-json the site job: deployed.json for graphty-nightly, on stdout
//       env SHA, SITE_SHA256, CONFIG_REF, TAG (the release site-release made; default site-<SHA>)
//   node tools/channel/nightly.mjs wait          the site job: wait for graphty-nightly's deploy of deployed.json
//       env SITE_REPO, PUSHED (the deployed.json commit), SITE_URL, SHA, GH_TOKEN; ends on the deploy run's
//       conclusion or on the site's build stamp naming SHA, never on a timer (the job's timeout-minutes is only a
//       hang guard)
//   node tools/channel/nightly.mjs record        the site job: the promotion to the results store (fail open)
//       env SHA, COMMIT, SITE_SHA256, CHANNEL_SHA256, RESULTS_URL and the job's OIDC token
//   node tools/channel/nightly.mjs stall         every release.yml run's timings job: the age:nightly alarm, now only
//       the fallback for a slot that produced no run at all (quiet while a "Nightly missed slot" issue is open)
//       env RESULTS_URL, GH_TOKEN, GITHUB_REPOSITORY, RUN_URL
//   node tools/channel/nightly.mjs slot          the slot job at the end of every full, restart and candidate run: the
//       missed-slot alarm (#5052). Nightly did not move: file or update one priority:critical "Nightly missed slot
//       <date hh:mm> UTC: <cause>" issue; nightly moved: close it
//       env MODE, PUSHED (the land job pushed channel/nightly), PICK_RESULT, RELEASE, PICK_WHY, RESUME, SHA, STATE,
//       DEFERRED, HOLD, HELD, HELD_STATE, WHAT, ISSUE, PROMOTE, WHY, RUN_ID, RUN_URL, RESULTS_URL, GH_TOKEN,
//       GITHUB_REPOSITORY
//   node tools/channel/nightly.mjs failed        the site job, when it failed: one priority:critical issue
//       env SHA, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY; prints the issue's number
//   node tools/channel/nightly.mjs deployed      the site job, when it deployed: closes that issue, if open
//       env SHA, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY
import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { REVIEW_PAGE } from "../release-status.mjs";
import { call, config } from "../results/client.mjs";

const HOUR = 3_600_000;
export const STALL_TITLE = "Nightly stalled since";
export const MISSED_TITLE = "Nightly missed slot";
const SLOT = 6 * HOUR;
// one slot plus a full run's length: past it, a slot passed with no run that could report it (the stall fallback)
const STALL_MS = SLOT + 2 * HOUR;

export const FAILED_TITLE = "Nightly site deploy failed";
export const PUBLISH_HOLD = "Release held: publish failed";

/**
 * Whether a full run's verdict promotes its candidate to nightly now (channels 7 and 11).
 * @param o the inputs
 * @param o.state the verdict: green-clean, green-images, red or owner-item; approved for the promotion after the
 *   owner's screenshot approval
 * @param o.publishHold the open publish hold's issue number, or empty
 * @param o.gate the screenshot gate's outcome on the candidate against channel/nightly: success, or anything else
 * @param [o.gateReason] the gate's own refusal lines (screenshot-gate.sh's reason), shown instead of the generic
 *   text when present
 * @param [o.held] the held candidate's head (channels-pipeline.md section 3): "" for none, "unknown" when the store did
 *   not answer; while one is held, only it promotes
 * @param [o.sha] the judged commit
 * @returns `{ promote, why }`
 */
export function promotion({ state, publishHold, gate, gateReason = "", held = "", sha = "" }) {
    // approved: a green-images head the owner approved (tools/channel/resume.mjs), gated against its accept commit
    if (state !== "green-clean" && state !== "approved")
        return { promote: false, why: `the verdict is ${state || "missing"}, not green-clean` };
    if (held && held !== sha) {
        const on = held === "unknown" ? "the results store did not say what is held" : `nightly is held on ${held}`;
        return { promote: false, why: `${on}: only the held candidate promotes` };
    }
    if (publishHold) {
        return {
            promote: false,
            why: `the nightly promotion waits: publish hold #${publishHold} is open (re-run its publish to clear it)`,
        };
    }
    if (gate !== "success") {
        return {
            promote: false,
            why: gateReason
                ? `the screenshot gate refused: ${gateReason}`
                : "the screenshot gate refused: the candidate's visual-baselines/ differ from nightly's without the owner's signed approval of that tree",
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
 * @param o.screenshots "unchanged", or "approved:<tree>" when the candidate's visual-baselines/ tree differs from
 *   the previous nightly's and the owner signed it (release.yml's screenshot gate step)
 * @returns the record
 */
export function channelRecord({
    sha,
    commit,
    versions,
    run,
    configBlob,
    autosaveFormat,
    siteSha256,
    now,
    screenshots,
}) {
    if (screenshots !== "unchanged" && !/^approved:[0-9a-f]{40}$/.test(screenshots ?? ""))
        throw new Error(`screenshots must be "unchanged" or "approved:<tree sha>", not ${JSON.stringify(screenshots)}`);
    return {
        channel: "nightly",
        commit: sha,
        versionCommit: commit || null,
        versions,
        fullRun: String(run),
        screenshots,
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
 * @param [o.tag] the release holding the site, site-<sha> unless that one was left without its asset
 * @returns the record
 */
export function deployedRecord({ sha, siteSha256, configRef, now, tag = `site-${sha}` }) {
    return {
        site: "nightly",
        tag,
        sha256: siteSha256,
        configRef,
        time: new Date(now).toISOString(),
        approver: "auto",
    };
}

/**
 * What the site job does with the site-<commit> release it needs (#4149). Releases in this repository are
 * immutable once published: assets go on in the same call that creates the release, and never later.
 * @param release the release as the REST API returns it (assets with their digest), or null when there is none
 * @param siteSha256 the sha256 of the site.tar.zst this job packed
 * @returns `{ action: "create" | "reuse" | "carrier" | "refuse", why }`: carrier when the release holds no
 *   site.tar.zst and can never take one, so the site needs another site-<commit> tag
 */
export function siteReleasePlan(release, siteSha256) {
    if (!release) return { action: "create", why: "no release yet" };
    const asset = (release.assets ?? []).find((a) => a.name === "site.tar.zst");
    if (!asset) return { action: "carrier", why: `${release.tag_name} has no site.tar.zst and is immutable` };
    if (asset.digest === `sha256:${siteSha256}`)
        return { action: "reuse", why: `${release.tag_name} holds this archive` };
    return {
        action: "refuse",
        why: `${release.tag_name} holds a site.tar.zst with ${asset.digest ?? "no digest"}, not sha256:${siteSha256}: the same artifact packed differently; deploy the asset it holds by writing deployed.json with that sha256`,
    };
}

/**
 * The carrier commit for a site whose site-<sha> release cannot take its asset: sha's own tree, sha as its only
 * parent, a fixed author and sha's commit time, so every run makes the same commit and a re-run reuses its release.
 * @param sha the candidate
 * @param git runs git with the given arguments and environment, returns stdout
 * @returns the carrier's commit id
 */
export function carrierCommit(sha, git) {
    const when = git(["log", "-1", "--format=%cI", sha]);
    const who = { NAME: "github-actions[bot]", EMAIL: "github-actions[bot]@users.noreply.github.com" };
    const env = {};
    for (const role of ["AUTHOR", "COMMITTER"]) {
        env[`GIT_${role}_NAME`] = who.NAME;
        env[`GIT_${role}_EMAIL`] = who.EMAIL;
        env[`GIT_${role}_DATE`] = when;
    }
    const message = [
        `site: carrier for the nightly site of ${sha}`,
        "",
        `Same source tree as ${sha}. Exists only to carry the release site-<this commit> for ${sha}'s built site,`,
        `because the release site-${sha} was published without it and releases are immutable (#4149).`,
    ].join("\n");
    return git(["commit-tree", `${sha}^{tree}`, "-p", sha, "-m", message], env);
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
 * @param o.runs the site repository's workflow runs for the deployed.json commit (status, conclusion, html_url,
 *     path), or null when they could not be read
 * @param o.stamp the commit the site's build stamp names
 * @param o.sha the candidate
 * @returns `{ done, ok, why }`
 */
export function deployState({ runs, stamp, sha }) {
    // only the site's deploy workflow; another push workflow there says nothing about the deploy
    const deploys = (runs ?? []).filter((r) => !r.path || r.path.endsWith("/deploy.yml"));
    const finished = deploys.filter((r) => r.status === "completed");
    const bad = finished.find((r) => r.conclusion !== "success" && r.conclusion !== "skipped");
    if (bad) return { done: true, ok: false, why: `the site's deploy ended ${bad.conclusion}: ${bad.html_url}` };
    const good = finished.find((r) => r.conclusion === "success");
    if (good) return { done: true, ok: true, why: `the site's deploy passed: ${good.html_url}` };
    // the stamp decides only when the runs cannot be read: a re-run's site already carries this commit's stamp from
    // the first attempt, so with readable runs it waits for this deploy's own run
    if (runs === null && stamp && sha.startsWith(stamp)) {
        return { done: true, ok: true, why: `the site's build stamp names ${stamp}` };
    }
    return { done: false };
}

/**
 * The stall alarm (main section 7): over one slot and a run (8 hours) since nightly moved while canary holds an
 * unpromoted commit, one priority:critical issue naming what blocks it; over 48 hours it asks the owner to act. The
 * missed-slot alarm (missedSlot) reports every slot a run ended in; this is the fallback for a slot with no run.
 * @param o the inputs
 * @param o.state GET /v1/release-state's answer
 * @param o.publishHold the open publish hold's number, or empty
 * @param o.now milliseconds
 * A null age means nightly has never moved: not started, no alarm.
 * @returns null when nightly is not stalled, else `{ title, body, urgent }`
 */
export function stall({ state, publishHold, now }) {
    const age = state?.ageNightlyMs ?? 0;
    if (age <= STALL_MS) return null;
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
        held: heldBlock(state),
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
        "No full run reported a missed slot, so a slot may have produced no run at all: check the release scheduler (tools/release-scheduler/) and the newest release.yml runs.",
        "",
        "This issue is updated by every release.yml run and closes itself once nightly moves (tools/channel/nightly.mjs stall).",
    ];
    if (urgent) body.push("", `ACTION NEEDED: nightly stalled ${hours} h; ${what[0]}`);
    return { title: `${STALL_TITLE} ${since}`, body: body.join("\n"), urgent };
}

const s7 = (sha) => (sha ?? "").slice(0, 7);

/**
 * The missed-slot alarm (#5052; owner, 2026-10-30: a successful nightly every 6-hour slot, and a slot that does not
 * promote is an incident with a named cause): what kept a full, restart or candidate run from moving nightly.
 * @param f the run's facts, as the slot job hands them (see the head of the file); moved: nightly moved in the run
 * @param started when the run started, ms: its slot is that time rounded down to 00, 06, 12 or 18 UTC
 * @param [state] GET /v1/release-state's answer: what still blocks nightly when the run tested nothing new (#5135)
 * @returns null when nightly moved or the run decides nothing yet (an attempt 1 waiting for its re-run), else
 *   `{ title, cause, detail }`
 */
export function missedSlot(f, started, state = null) {
    if (f.moved || f.deferred === "true") return null;
    const { cause, detail = "" } = pickCause(f, state) ?? verdictCause(f);
    const slot = new Date(Math.floor(started / SLOT) * SLOT).toISOString().slice(0, 16).replace("T", " ");
    const short = cause.length > 90 ? cause.slice(0, 87) + "..." : cause;
    return { title: `${MISSED_TITLE} ${slot} UTC: ${short}`, cause, detail };
}

// a slot that judged nothing: the pick failed, found nothing new, or the run ended before its verdict
function pickCause(f, state) {
    if (f.pickResult && f.pickResult !== "success") return { cause: `the pick failed (${f.pickResult})` };
    // a run that tested nothing new (#5135: a candidate run whose fix could not enter the held head) changes nothing:
    // the slot is still blocked by what blocked it before, which the store's release state names
    if (f.release !== "true" && f.resume !== "true")
        return stateCause(state) ?? { cause: `no new candidate: ${f.pickWhy || "nothing to test"}` };
    if (!f.state) return { cause: "no verdict: the run ended before judging its candidate" };
    return null;
}

// what the verdict on the slot's commit kept from nightly
function verdictCause(f) {
    const sha = s7(f.sha);
    const what = f.what || "see the run";
    if (f.state === "red") return { cause: `red lane on ${sha}: ${what}` + (f.issue ? ` (#${f.issue})` : "") };
    if (f.state === "owner-item") return { cause: `owner item on ${sha}: ${what}` };
    if (f.state === "green-images") return imagesCause(f, sha);
    if (f.promote === "true") return { cause: `the promotion of ${sha} failed before it landed` };
    return { cause: `${sha} is green-clean but did not promote: ${f.why || "see the run"}` };
}

// changed screenshots: held for the owner's review, behind another held candidate, or behind a hold nobody reviews
function imagesCause(f, sha) {
    const held = s7(f.held);
    if (f.hold === "start" || f.hold === "update")
        return { cause: `waiting on the owner's screenshot review of ${sha}`, detail: `Review it on ${REVIEW_PAGE}.` };
    if (f.heldState === "green-images") {
        return {
            cause: `waiting on the owner's screenshot review of the held ${held}`,
            detail: `${sha} also changed screenshots but is not held: the held ${held} is reviewed first, on ${REVIEW_PAGE}.`,
        };
    }
    return {
        cause: `hold on ${held || "an unknown commit"} is not reviewable (${f.heldState || "not judged"})`,
        detail: "A green run should have replaced it: fix it forward from its head, or abandon it (`gh workflow run nightly-abandon.yml --ref master -f reason=...`).",
    };
}

// what blocks nightly by the store's release state, in the words a run that judged it uses, or null
function stateCause(state) {
    const offered = s7(state?.offered?.sha);
    if (state?.hold) {
        const held = s7(state.hold.head);
        return offered === held
            ? {
                  cause: `waiting on the owner's screenshot review of the held ${held}`,
                  detail: `Review it on ${REVIEW_PAGE}.`,
              }
            : imagesCause({ held: state.hold.head, heldState: "its head is not green-images" });
    }
    if (state?.blocking === "red" && state.red) {
        return verdictCause({ state: "red", sha: state.red.sha, what: state.red.lane, issue: state.red.issue });
    }
    if (state?.blocking === "waiting-for-screenshots" && offered)
        return {
            cause: `waiting on the owner's screenshot review of ${offered}`,
            detail: `Review it on ${REVIEW_PAGE}.`,
        };
    return null;
}

/**
 * When nightly last moved (#5135): the store's newest nightly move, or the newest push to channel/nightly, whichever
 * is later. The store misses a move whose record it refused (the 2026-10-29 promotion), and a push is the move itself.
 * @param storeMovedAt the release state's nightly.movedAt, ms, or null
 * @param pushedAt the newest push to channel/nightly, ms, or null
 * @returns ms, or null when neither knows
 */
export function lastNightlyMove(storeMovedAt, pushedAt) {
    const known = [storeMovedAt, pushedAt].filter((t) => typeof t === "number" && Number.isFinite(t));
    return known.length ? Math.max(...known) : null;
}

/**
 * The missed-slot issue's text.
 * @param o the inputs
 * @param o.mode the run's mode
 * @param o.runUrl the run's URL
 * @param o.alarm missedSlot's answer
 * @param o.moved lastNightlyMove's answer
 * @param o.now milliseconds
 * @returns the markdown
 */
export function slotText({ mode, runUrl, alarm, moved, now }) {
    const when =
        moved === null
            ? "at an unknown time (neither the results store nor channel/nightly's pushes say)"
            : `at ${new Date(moved).toISOString().slice(0, 16).replace("T", " ")} UTC, ${Math.floor((now - moved) / HOUR)} hours ago`;
    return [
        `The slot's ${mode || "full"} run ended without moving nightly: ${runUrl ?? ""}`,
        "",
        `Cause: ${alarm.cause}`,
        ...(alarm.detail ? ["", alarm.detail] : []),
        "",
        `Nightly last moved ${when}. Goal (owner, 2026-10-30): a nightly promotion every 6-hour slot; a slot that does not promote is an incident with a named cause.`,
        "",
        "This issue is retitled and commented on by every full, restart and candidate run that ends without moving nightly, and closes itself when nightly moves (tools/channel/nightly.mjs slot).",
    ].join("\n");
}

// What a held candidate (channels-pipeline.md section 3) waits for: the owner's screenshot review once its head is
// green-images, else a fix forward
function heldBlock(state) {
    const head = state.hold?.head?.slice(0, 7) ?? "the held candidate";
    const issue = state.hold?.issue ? ` (#${state.hold.issue})` : "";
    if (state.offered && state.offered.sha === state.hold?.head)
        return `nightly is held on ${head}${issue}, waiting for the owner's screenshot review of it`;
    return `nightly is held on ${head}${issue}: fix it forward from its head, or abandon it (nightly-abandon.yml)`;
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
    // the missed-slot alarm names the cause of every slot a run ended in: the stall issue is only for a slot with none
    const missed = openIssue(MISSED_TITLE, repo);
    const alarm = missed ? null : stall({ state: res.data, publishHold, now: Date.now() });
    const open = openIssue(STALL_TITLE, repo);
    if (!alarm) {
        console.log(`age:nightly ${Math.round((res.data?.ageNightlyMs ?? 0) / HOUR)} h: not stalled`);
        const why = missed
            ? `The missed-slot alarm #${missed.number} reports it`
            : "Nightly moved (or caught up with canary)";
        if (open) gh("issue", "close", String(open.number), "-R", repo, "--comment", `${why}: ${env.RUN_URL ?? ""}`);
        return;
    }
    console.log(`::warning::age:nightly over ${STALL_MS / HOUR} h: ${alarm.title}`);
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

async function slotMain(env, now = Date.now()) {
    const repo = env.GITHUB_REPOSITORY;
    let started = now;
    try {
        started = Date.parse(gh("api", `repos/${repo}/actions/runs/${env.RUN_ID}`, "--jq", ".run_started_at")) || now;
    } catch {
        // the slot is then the one the run ends in
    }
    const res = await call(config(env), "GET", "/v1/release-state");
    const state = res.ok ? res.data : null;
    let pushedAt = null;
    try {
        pushedAt = Date.parse(
            gh(
                "api",
                `repos/${repo}/activity?ref=refs/heads/channel/nightly&per_page=1`,
                "--jq",
                ".[0].timestamp // empty",
            ),
        );
    } catch {
        // the store's move, if it has one, says when
    }
    const movedAt = lastNightlyMove(state?.nightly?.movedAt ?? null, pushedAt);
    // moved: this run pushed channel/nightly, or another run moved it since this one started
    const moved = env.PUSHED === "true" || (movedAt !== null && movedAt >= started);
    const facts = {
        moved,
        pickResult: env.PICK_RESULT,
        release: env.RELEASE,
        pickWhy: env.PICK_WHY,
        resume: env.RESUME,
        sha: env.SHA,
        state: env.STATE,
        deferred: env.DEFERRED,
        hold: env.HOLD,
        held: env.HELD,
        heldState: env.HELD_STATE,
        what: env.WHAT,
        issue: env.ISSUE,
        promote: env.PROMOTE,
        why: env.WHY,
    };
    const alarm = missedSlot(facts, started, state);
    const open = openIssue(MISSED_TITLE, repo);
    if (!alarm) {
        console.log(moved ? "nightly moved in this slot" : "attempt 1 waits for its re-run: the re-run reports");
        if (moved && open)
            gh("issue", "close", String(open.number), "-R", repo, "--comment", `Nightly moved: ${env.RUN_URL ?? ""}`);
        return;
    }
    console.log(`::warning::${alarm.title}`);
    const text = slotText({ mode: env.MODE, runUrl: env.RUN_URL, alarm, moved: movedAt, now });
    if (!open) {
        const labels = ["bug", "priority:critical", "effort:medium"].flatMap((l) => ["--label", l]);
        console.log(
            gh("issue", "create", "-R", repo, "--title", alarm.title, ...labels, "--body-file", bodyFile(text)),
        );
        return;
    }
    gh("issue", "edit", String(open.number), "-R", repo, "--title", alarm.title, "--body-file", bodyFile(text));
    // a comment notifies; an edit does not. Only a new slot or a new cause is news: a second run in the same slot
    // with the same cause (a re-run, a candidate run that tested nothing) only refreshes the body
    if (open.title !== alarm.title)
        gh("issue", "comment", String(open.number), "-R", repo, "--body-file", bodyFile(text));
}

// One look at the site's deploy: graphty-nightly's runs for the deployed.json commit, and the site's stamp.
async function lookAtDeploy(env) {
    let runs = null;
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

const NIGHTLY_BLOCKED = "Nightly blocked:";

function decideMain(env) {
    let hold = "";
    if (env.STATE === "green-clean" || env.STATE === "approved") {
        try {
            hold = execFileSync("tools/release-held.sh", ["find", PUBLISH_HOLD], { encoding: "utf8" }).trim();
        } catch (error) {
            // an unknown hold is not "no hold", and a refusal here would never be retried (full-run.mjs pick skips a
            // judged green-clean commit): fail the job, so re-running its failed jobs decides again
            console.log(
                `::error::cannot read the publish hold, so the promotion is undecided: ${error.message.split("\n")[0]}`,
            );
            process.exit(1);
        }
    }
    const p = promotion({
        state: env.STATE,
        publishHold: hold,
        gate: env.GATE,
        gateReason: env.GATE_REASON ?? "",
        held: env.HELD ?? "",
        sha: env.SHA,
    });
    if (!p.promote && env.STATE !== "green-images") console.log(`::notice::${p.why}`);
    if (!p.promote && env.STATE === "green-clean" && env.GATE !== "success" && env.FIRST === "true") {
        // no channel/nightly yet, so no move and no age: without this issue the stall alarm never fires
        const body = bodyFile(
            [
                `The first nightly promotion is blocked: the screenshot gate refused ${env.SHA} (${env.RUN_URL}).`,
                "Before channel/nightly exists the gate compares visual-baselines/ with the last release, so nightly",
                "starts only once the owner approves (signs) the candidate's visual-baselines/ tree on the review page.",
            ].join("\n"),
        );
        execFileSync("tools/release-held.sh", ["open", `${NIGHTLY_BLOCKED} ${env.SHA}`, body, NIGHTLY_BLOCKED], {
            stdio: "inherit",
        });
    }
    if (env.GITHUB_STEP_SUMMARY) {
        appendFileSync(env.GITHUB_STEP_SUMMARY, `Nightly promotion: ${p.promote ? "yes" : "no"} -- ${p.why}\n`);
    }
    output({ promote: String(p.promote), why: p.why });
}

function channelJsonMain(env) {
    need(env, ["SHA", "RUN_ID", "SITE_SHA256", "CONFIG_REF", "SCREENSHOTS"]);
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
        screenshots: env.SCREENSHOTS,
    });
    console.log(JSON.stringify(record, null, 2));
}

function releaseOf(tag) {
    try {
        return JSON.parse(gh("api", `repos/${process.env.GITHUB_REPOSITORY}/releases/tags/${tag}`));
    } catch {
        return null; // 404: none (a draft is not listed here either)
    }
}

const gitWith = (args, extra = {}) =>
    execFileSync("git", args, { encoding: "utf8", env: { ...process.env, ...extra } }).trim();

/**
 * Makes the carrier commit for sha and pushes its site-<carrier> tag (pushing it again is a no-op).
 * @param sha the candidate
 * @returns the carrier's commit id
 */
function pushCarrier(sha) {
    try {
        gitWith(["cat-file", "-e", `${sha}^{commit}`]);
    } catch {
        gitWith(["fetch", "--quiet", "--no-tags", "--filter=blob:none", "origin", sha]);
    }
    const carrier = carrierCommit(sha, gitWith);
    gitWith(["push", "--quiet", "--no-verify", "origin", `${carrier}:refs/tags/site-${carrier}`]);
    return carrier;
}

function createSiteRelease(tag, env) {
    const out = join(env.RUNNER_TEMP, "out");
    const carried =
        tag === `site-${env.SHA}`
            ? ""
            : ` site-${env.SHA} was published without it, so it hangs on a commit with the same tree.`;
    const notes = `The built site of ${env.SHA}, promoted to nightly.graphty.app by ${env.RUN_URL ?? ""}.${carried}`;
    const title = `Nightly site ${env.SHA.slice(0, 7)}`;
    const assets = [join(out, "site.tar.zst"), join(out, "channel.json")];
    gh(
        "release",
        "create",
        tag,
        ...assets,
        "--verify-tag",
        "--prerelease",
        "--latest=false",
        "--title",
        title,
        "--notes",
        notes,
    );
    const check = siteReleasePlan(releaseOf(tag), env.SITE_SHA256);
    if (check.action !== "reuse") throw new Error(`${tag} after its creation: ${check.why}`);
}

function planFor(tag, siteSha256) {
    const plan = siteReleasePlan(releaseOf(tag), siteSha256);
    console.log(`${tag}: ${plan.action} (${plan.why})`);
    return plan;
}

function siteReleaseMain(env) {
    need(env, ["SHA", "SITE_SHA256", "RUNNER_TEMP", "GITHUB_REPOSITORY"]);
    let tag = `site-${env.SHA}`;
    let plan = planFor(tag, env.SITE_SHA256);
    if (plan.action === "carrier") {
        tag = `site-${pushCarrier(env.SHA)}`;
        plan = planFor(tag, env.SITE_SHA256);
        if (plan.action === "carrier") throw new Error(`the carrier's release ${tag} has no site.tar.zst either`);
    }
    if (plan.action === "refuse") throw new Error(plan.why);
    if (plan.action === "create") createSiteRelease(tag, env);
    output({ tag });
}

function deployedJsonMain(env) {
    need(env, ["SHA", "SITE_SHA256", "CONFIG_REF"]);
    const record = deployedRecord({
        tag: env.TAG || undefined,
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
        "npm `next` may already hold this candidate's versions while nightly.graphty.app still serves the previous nightly. Read the failed step. A re-run of the run's failed jobs (`gh run rerun <run id> --failed`) re-runs only the site job, with the workflow as that run had it; to deploy with master's `.github/workflows/nightly-site.yml`, dispatch it with the values the failed job logged (the command is at the head of that file). A missing NIGHTLY_SITE_DEPLOY_KEY (environment `nightly`) or a graphty-nightly without .github/workflows/deploy.yml is an owner item.",
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
    "site-release": siteReleaseMain,
    "deployed-json": deployedJsonMain,
    wait: waitMain,
    record: recordMain,
    stall: stallMain,
    slot: slotMain,
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
