#!/usr/bin/env node
// full-run.mjs -- the 6-hour full run's two decisions in release.yml (design/ci/channels-pipeline/channels.md
// sections 5 and 6): which commit a slot tests, and the verdict on it.
//
//   node tools/full-run.mjs pick      which commit to test, or why the slot does nothing
//       env MODE (full | restart | candidate), HEAD_SHA (the commit the run started on); RESULTS_URL and the job's
//       OIDC token; PICK_RULE "rolling" lets the ordering-only rule choose (early-capture.md 4e; otherwise it is only
//       logged); writes run, sha, why, good, held, forward, today, rolling_sha and rolling_why to GITHUB_OUTPUT
//   node tools/full-run.mjs verdict   the verdict on the tested commit: posted to the store, the red issue filed or
//                                     closed, one bisect dispatched, the outcome announced
//       env SHA, GOOD, LANES (JSON { lane: result }, with pick's own result), LLM_OWNER_ITEM, VERSION_HELD
//           (the version dry run's held projects), CAPTURES (a directory of results.json),
//           RUN_ID, RUN_URL, GH_TOKEN, GITHUB_REPOSITORY, FORWARD (the held commit, when SHA is a held head past
//           it: red goes to the hold issue only, no "Full run red" issue and no bisect)
//   node tools/full-run.mjs lane-red  files or updates the red issue the moment one lane ends red, so a fix that
//                                     references it restarts the run without waiting for the other lanes
//       env LANE (a LANES key), RESULT, SHA, RUN_URL, OWNER_ITEM (the lane's owner item: the verdict decides those),
//           GH_TOKEN, GITHUB_REPOSITORY, RUN_ATTEMPT, MODE, GITHUB_ACTOR (attempt 1 of a re-runnable mode
//           files nothing, unless the run was dispatched with a workflow's GITHUB_TOKEN)
//   node tools/full-run.mjs file-deferred <file>
//                                     files the red issue and dispatches the bisect an attempt-1 verdict deferred
//                                     (its verdict-1 record), when release-rerun.yml does not re-run the run after all;
//                                     nothing when a fix closed the commit's red issue in the last hour (fixed=<n>)
//
// Same-commit re-run, once (design/ci/channels-pipeline.md section 3): attempt 1 of a full or restart run that ends
// red on a lane that failed (or was cancelled) records its verdict but files no red issue, dispatches no bisect and
// announces nothing: release-rerun.yml re-runs its failed jobs once, and that attempt decides. The verdict writes
// verdict-<attempt>.json (env RECORD) for the next attempt and for release-rerun.yml. A run dispatched with a
// workflow's GITHUB_TOKEN (GITHUB_ACTOR github-actions[bot]: release-due's restart and candidate runs) is never seen by
// release-rerun.yml, so its attempt 1 decides at once like any later attempt. A lane red on attempt 1 and
// green on attempt 2, and a story the re-capture found flaky (flaky.json in the final captures), each get one
// "Flaky in full run: <name>" issue (bug, priority:critical, effort:medium) and block nothing; more than FLAKY_GROUP
// stories of one project at once get one issue for the project (flakyFilings).
//
// Held candidate (section 3): the deciding verdict of a run that is not green-clean holds its commit when nothing is
// held yet (output hold=start, tools/channel/hold.mjs); a verdict on the held head updates the hold (hold=update);
// any other commit's verdict leaves the hold alone and never promotes (tools/channel/nightly.mjs). The verdict reads
// the hold from the store when it decides (output held), never from the pick: a re-run attempt keeps attempt 1's pick
// outputs, and another run may have held its commit since. An attempt-1 red that waits for its re-run is recorded as
// `deferred`, which the pick does not count as judged, so a re-run that never runs leaves the commit to be tested.
//
// The store is the source of truth for verdicts; every read fails open ("unknown means run"): a store that does
// not answer makes the slot test master's head and makes the verdict skip only its own record.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { PUBLISH_HOLD } from "./channel/nightly.mjs";
import { diffCommits } from "./release-diff.mjs";
import { call, config } from "./results/client.mjs";

export const RED_TITLE = "Full run red:";
export const FLAKY_TITLE = "Flaky in full run:";
/** The modes whose attempt 1 is re-run once by release-rerun.yml instead of filing at once. */
export const RERUN_MODES = new Set(["full", "restart", "candidate"]);
const GREEN = new Set(["green-clean", "green-images", "approved"]);
/** The state an attempt-1 verdict that waits for its same-commit re-run records: not a verdict, so pick ignores it. */
export const DEFERRED = "deferred";
/**
 * The actor of a run dispatched with a workflow's GITHUB_TOKEN (ci.yml's release-due: every restart and candidate
 * run). GitHub starts no workflow for an event such a run raises, so release-rerun.yml never sees it end: its
 * attempt 1 must decide at once, or a red one files nothing (#4359).
 */
export const WORKFLOW_TOKEN_ACTOR = "github-actions[bot]";
/**
 * The actor that decides whether a run is re-run: a run on channel/full-run (env WATCHED true) is dispatched with
 * a workflow's GITHUB_TOKEN too, but its last job asks release-rerun.yml itself, so it is re-run like any other.
 * @param env the environment
 * @returns GITHUB_ACTOR, or empty for a watched run
 */
export const actorOf = (env) => (env.WATCHED === "true" ? "" : env.GITHUB_ACTOR);
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
    // the release.yml job that shoots the changed stories again and writes the final captures
    recapture: { name: "screenshot re-capture", bisect: null },
    // not a job: the verdict sets it from the downloaded captures (captureLane), so a capture that is missing is a
    // pipeline failure, never "the screenshots changed"
    captures: { name: "screenshot capture", bisect: null },
};

/**
 * The commit a slot tests, or why it does nothing.
 * @param o the inputs
 * @param o.mode full, restart or candidate
 * @param o.head the commit the run started on (master's head when it was dispatched)
 * @param o.store `GET /v1/candidate`'s answer (candidate, sites, recent), or null when the store did not answer
 * @param o.firstParents (sha) => that commit and its first parents, newest first
 * @param o.stray (from, to) => the changes between two commits that are neither versions nor screenshot approvals
 * @param o.sameBaselines (from, to) => whether two commits have the same visual-baselines/ tree; a verdict is never
 *     inherited across a baselines change, because those screenshots were never captured and gated against nightly
 *     (an inherited green-clean commit is never promoted, so the owner's approved baselines would never reach it)
 * @param o.onNightly (sha) => whether channel/nightly holds that commit; a green-clean commit it lacks was not
 *     promoted (a publish hold, the screenshot gate, a refused push)
 * @param o.hold `{ open, closedAt }`: the open publish hold's number (or empty) and when the newest closed one
 *     closed (ms, 0 for none). An unpromoted green-clean commit is tested again only once a publish hold closed
 *     after its verdict: the same commit meets the same screenshot gate, and a refused push ends when master moves,
 *     which gives a new candidate; re-testing while the blocker stands pays for the paid lanes for nothing
 * @param o.hasNightly (sha) => whether that commit's history holds channel/nightly (true before it exists); a
 *     candidate older than nightly could never promote (the land job refuses it), so the slot does nothing
 * @param o.rolling the ordering-only rule's inputs for a full slot (`{ on, tree, captures }`, see rollingPick), or
 *     null; with `on` false the rule's choice is only returned, never tested
 * @returns `{ run, sha, why, good, inherit, held, forward, today, rolling }`; inherit is the verdict the commit takes
 *   over, when it does; held is the held candidate's head ("" when nothing is held, "unknown" when the store did not
 *   answer); forward is the held commit when the tested head is past it; today is what today's rule chose and
 *   rolling the ordering rule's `{ sha, why }`
 */
export function pick({
    mode,
    head,
    store,
    firstParents,
    stray,
    sameBaselines = () => true,
    onNightly = () => true,
    hasNightly = () => true,
    hold = { open: "", closedAt: 0 },
    rolling = null,
}) {
    if (!store) {
        return {
            run: true,
            sha: head,
            held: "unknown",
            why: "the results store did not answer: testing master's head",
        };
    }
    // an attempt-1 red that waits for its same-commit re-run decided nothing: a re-run that never ran (a newer
    // dispatch replaced it while pending) must leave its commit to be tested again, not judged red
    store = { ...store, recent: (store.recent ?? []).filter((v) => v.state !== DEFERRED) };
    const held = store.hold?.head ?? "";
    // a held candidate's head no run judged yet is tested first (catch-up order, channels-pipeline.md section 3);
    // a judged one leaves the slot to master, whose verdict never promotes or replaces it. A head past the held
    // commit (fixes merged forward, tools/channel/candidate-fix.mjs) is re-tested only where the fixes reach:
    // forward names the held commit
    if (held && !(store.recent ?? []).some((v) => v.sha === held)) {
        const forward = store.hold.base && store.hold.base !== held ? store.hold.base : "";
        return {
            run: true,
            sha: held,
            good: "",
            held,
            forward,
            why: `the held candidate ${short(held)} is not judged yet`,
        };
    }
    // mode candidate only re-tests a held head that fixes moved on; it never tests master
    if (mode === "candidate") {
        return {
            run: false,
            sha: held || head,
            held,
            why: held ? "the held head is judged already" : "nothing is held",
        };
    }
    const p = pickSlot({ mode, head, store, firstParents, stray, sameBaselines, onNightly, hasNightly, hold, rolling });
    return { ...p, held };
}

/** The rolling captures' statuses that are a picture nobody approved yet (results-service QUEUE_STATUSES). */
const UNAPPROVED = new Set(["changed", "new", "unseeded"]);

/**
 * The ordering-only pick rule (design/visual-testing/early-capture.md 4e): the newest kept-site commit that holds the
 * newest approval merge (head's visual-baselines tree) and is older than the first commit whose rolling capture shows
 * a picture not yet approved. It only chooses which commit the slot renders: the full run still renders that commit
 * whole and its own captures decide the verdict. A rolling capture rendered under another baselines tree is left out,
 * since an approval merged after it may cover it.
 * @param o the inputs
 * @param o.head the commit the run started on
 * @param o.sites the commits with a kept site
 * @param o.judged the store's recent verdicts by commit
 * @param o.firstParents (sha) => that commit and its first parents, newest first
 * @param o.sameBaselines (from, to) => whether two commits have the same visual-baselines/ tree
 * @param o.hasNightly (sha) => whether that commit's history holds channel/nightly
 * @param o.tree head's visual-baselines tree
 * @param o.captures GET /v1/story-captures' captures (each story's newest), or null when the store did not answer
 * @returns `{ sha, why }`; sha is "" when the rule has no preference and the slot keeps today's rule
 */
export function rollingPick({ head, sites, judged, firstParents, sameBaselines, hasNightly, tree, captures }) {
    if (!captures) return { sha: "", why: "the store did not answer for the rolling captures" };
    // a story re-rendered since it changed counts from its first unapproved render (firstUnapprovedSha), not its newest
    const unapproved = new Set(
        captures
            .filter((c) => UNAPPROVED.has(c.status) && c.baselinesTree === tree)
            .flatMap((c) => [c.sha, c.firstUnapprovedSha ?? c.sha]),
    );
    const chain = firstParents(head);
    // ponytail: the first unapproved commit is the oldest render showing one, not the merge that changed the picture;
    // a picture changed between a story's last unchanged render and that one is held by the full run, as today
    const first = chain.findLastIndex((s) => unapproved.has(s));
    if (first < 0) return { sha: "", why: "no rolling capture shows an unapproved picture" };
    const x = short(chain[first]);
    const sha = chain.slice(first + 1).find((s) => sites.has(s) && sameBaselines(s, head)) ?? "";
    if (!sha) return { sha, why: `no kept-site commit older than ${x} holds the newest approval` };
    if (judged.has(sha)) return { sha: "", why: `${short(sha)}, older than ${x}, is judged already` };
    if (!hasNightly(sha)) return { sha: "", why: `${short(sha)}, older than ${x}, is older than nightly` };
    return { sha, why: `${x} has an unapproved rolling picture, so the newest commit before it` };
}

function pickSlot({ mode, head, store, firstParents, stray, sameBaselines, onNightly, hasNightly, hold, rolling }) {
    // a restart tests the merge that references the red issue; a slot tests the newest commit with a built site,
    // newest by master's first-parent order from the head, not by when its site was recorded (a re-run of an
    // older commit's build records its site late)
    const sites = new Set(store.sites ?? []);
    const byOrder = sites.size ? firstParents(head).find((s) => sites.has(s)) : undefined;
    const today = mode === "restart" ? head : (byOrder ?? store.candidate?.sha);
    if (!today) return { run: true, sha: head, why: "the store records no site yet: testing master's head" };
    const judged = new Map((store.recent ?? []).map((v) => [v.sha, v]));
    const rule =
        mode === "full" && rolling
            ? rollingPick({ head, sites, judged, firstParents, sameBaselines, hasNightly, ...rolling })
            : undefined;
    const on = { judged, firstParents, stray, sameBaselines, onNightly, hasNightly, hold };
    const preferred = rule?.sha && rolling.on ? slotOn(rule.sha, on) : undefined;
    // a preferred commit that would only inherit a verdict tests nothing: the slot keeps today's rule
    const p = preferred?.run ? preferred : slotOn(today, on);
    const why = p.sha === today ? p.why : `ordering: ${rule.why}: ${p.why}`;
    return { ...p, why, today, rolling: rule };
}

function slotOn(sha, { judged, firstParents, stray, sameBaselines, onNightly, hasNightly, hold }) {
    // a promotion's version merge onto a newer master leaves that master's site the newest until the merge's own
    // is recorded: testing it would spend a whole run on a commit nightly cannot move to
    if (!hasNightly(sha)) {
        return {
            run: false,
            sha,
            why: `${short(sha)} lacks channel/nightly: it is older than nightly, nothing to promote`,
        };
    }
    const chain = firstParents(sha);
    const good = chain.slice(1).find((s) => GREEN.has(judged.get(s)?.state)) ?? "";
    // ponytail: a cleared hold re-runs the whole suite; a promote-only run from the stored verdict if slots get scarce
    const unpromoted = (v) => v.state === "green-clean" && !onNightly(v.sha);
    const own = judged.get(sha);
    if (own && unpromoted(own)) {
        const s = short(sha);
        if (hold.open) {
            return {
                run: false,
                sha,
                good,
                why: `${s} is judged green-clean; its promotion waits for publish hold #${hold.open}`,
            };
        }
        if (hold.closedAt > (own.at ?? 0)) {
            return {
                run: true,
                sha,
                good,
                why: `${s} is judged green-clean and the publish hold that kept it off nightly closed: testing again`,
            };
        }
        return {
            run: false,
            sha,
            good,
            why: `${s} is judged green-clean but was not promoted (the screenshot gate or a refused push): testing it again changes nothing, a newer commit promotes`,
        };
    }
    if (own) return { run: false, sha, good, why: `${short(sha)} is already judged ${own.state}` };
    const at = chain.findIndex((s) => judged.has(s));
    if (
        at > 0 &&
        !unpromoted(judged.get(chain[at])) &&
        stray(chain[at], sha).length === 0 &&
        sameBaselines(chain[at], sha)
    ) {
        const inherit = judged.get(chain[at]);
        const why = `every merge since ${short(chain[at])} (judged ${inherit.state}) changes only versions or approval records`;
        return { run: false, sha, good, why, inherit };
    }
    return { run: true, sha, good, why: `${short(sha)} is not judged yet` };
}

/**
 * The verdict on a full run (channels 5).
 * @param lanes `{ lane: result }` for every lane in LANES; an LLM lane that was not due is `skipped`; `pick`
 *   may be left out
 * @param images how many screenshots differ from their baselines (a missing capture is lanes.captures, not this)
 * @param ownerItem why a red LLM lane is the owner's to fix (a refused key or balance), or empty
 * @param held the projects the version dry run held for want of a release-approvals.json entry, or empty: the
 *   version job leaves them and their dependents out (RELEASE_HOLD_ALSO), so the dry run's failure passes
 * @returns `{ state, red }`: red lists the lanes that did not pass, in LANES order
 */
export function verdictOf(lanes, images, ownerItem = "", held = "") {
    if ((lanes.pick ?? "success") !== "success") return { state: "red", red: ["pick"] };
    // only the LLM lane may be skipped (not due that day); any other lane that did not run is not a pass. The
    // captures come from the CI lane, so they are judged only when CI passed: a red CI explains a missing one
    const passed = (l) =>
        l === "pick" ||
        lanes[l] === "success" ||
        // a fix forward's re-test leaves out a lane its fixes do not reach (tools/channel/candidate-fix.mjs plan)
        lanes[l] === "unaffected" ||
        (l === "llm" && (lanes[l] ?? "skipped") === "skipped") ||
        (l === "version_dry_run" && lanes[l] === "failure" && !!held) ||
        ((l === "captures" || l === "recapture") && lanes.ci !== "success");
    const red = Object.keys(LANES).filter((l) => !passed(l));
    if (red.length === 1 && red[0] === "llm" && ownerItem) return { state: "owner-item", red };
    if (red.length) return { state: "red", red };
    return { state: images === 0 ? "green-clean" : "green-images", red };
}

// the lanes a re-run of the run's failed jobs can change: each is a job (or, for captures, the re-capture job's work)
const JOB_RESULTS = new Set(["failure", "cancelled"]);

/**
 * Whether attempt 1's red verdict waits for the one same-commit re-run (release-rerun.yml) instead of filing: every
 * red lane is a job that failed or was cancelled, which `gh run rerun --failed` runs again. A failed pick (it would
 * pick again) and a capture missing while the re-capture job passed (nothing to re-run) decide at once.
 * @param o the facts
 * @param o.attempt the run attempt
 * @param o.mode the run's mode
 * @param o.state the verdict
 * @param o.red the red lanes
 * @param o.lanes every lane's result
 * @param [o.actor] the run's actor (GITHUB_ACTOR): WORKFLOW_TOKEN_ACTOR's runs are never re-run, so never defer
 * @returns boolean
 */
export function deferred({ attempt, mode, state, red, lanes, actor }) {
    if (Number(attempt) !== 1 || !RERUN_MODES.has(mode) || state !== "red") return false;
    if (actor === WORKFLOW_TOKEN_ACTOR) return false;
    return red.every((l) =>
        l === "captures" ? JOB_RESULTS.has(lanes.recapture) : l !== "pick" && JOB_RESULTS.has(lanes[l]),
    );
}

/**
 * The lanes that were red on the attempt before and passed on this one: flaky, filed, never blocking.
 * @param before the earlier attempt's red lanes
 * @param red this attempt's red lanes
 * @returns LANES keys
 */
export const flakyLanes = (before, red) => before.filter((l) => l !== "pick" && !red.includes(l));

/**
 * What the deciding verdict does to the held candidate (channels-pipeline.md section 3).
 * @param o the facts
 * @param o.held the held head ("" none, "unknown" when the store did not answer)
 * @param o.sha the judged commit
 * @param o.state the verdict
 * @returns "start" (hold this commit), "update" (a verdict on the held head) or "none"
 */
export function holdAction({ held, sha, state }) {
    if (held === "unknown") return "none";
    if (!held) return state === "green-clean" ? "none" : "start";
    return held === sha ? "update" : "none";
}

/**
 * The screenshots that differ in a directory of downloaded visual captures, and the expected projects with no
 * capture there (one that crashed before writing results.json is not "nothing differs").
 * @param dir the directory
 * @param [expected] the projects a full run captures (visual-review.config.json)
 * @returns `{ changed, missing }`: changed lists `<project>/<file>`; missing lists projects (a capture that is not
 *   complete is missing too), or ["every project"] when the directory holds no capture at all
 */
export function differingImages(dir, expected = []) {
    // an artifact is visual-<project>-<attempt>/...: a re-run's newest attempt replaces the earlier ones
    const newest = new Map();
    const all = dir && existsSync(dir) ? readdirSync(dir, { recursive: true }).map(String) : [];
    for (const f of all) {
        const m = /^visual-(.+)-(\d+)[/\\](?:.*[/\\])?results\.json$/.exec(f);
        if (m && Number(m[2]) >= (newest.get(m[1])?.attempt ?? 0)) newest.set(m[1], { attempt: Number(m[2]), f });
    }
    if (!newest.size) return { changed: [], missing: expected.length ? expected : ["every project"] };
    const read = [...newest].map(([project, { f }]) => ({
        project,
        results: JSON.parse(readFileSync(join(dir, f), "utf8")),
    }));
    const changed = read.flatMap(({ project, results }) =>
        (results.items ?? []).filter((i) => !PASSING_IMAGES.has(i.status)).map((i) => `${project}/${i.file ?? i.id}`),
    );
    // a capture that stopped part way (complete false: a crash, a shard missing from the merge) is not "nothing
    // else differs": its project counts as missing, as the gate refuses it
    const incomplete = read.filter(({ results }) => results.complete !== true).map(({ project }) => project);
    const missing = [...new Set([...expected.filter((p) => !newest.has(p)), ...incomplete])];
    return { changed: changed.sort(), missing };
}

/**
 * The captures lane's result: success, or which projects have no capture.
 * @param missing differingImages' missing
 * @returns a LANES result
 */
export const captureLane = (missing) => (missing.length ? `missing for ${missing.join(", ")}` : "success");

/**
 * The owner's item for a green-images verdict: how many screenshots differ, by project.
 * @param changed differingImages' changed
 * @returns one line, e.g. "10 screenshots differ from master's baselines: graphty 10"
 */
export function changedSummary(changed) {
    const by = new Map();
    for (const c of changed) {
        const p = c.split("/")[0];
        by.set(p, (by.get(p) ?? 0) + 1);
    }
    const parts = [...by].map(([p, n]) => `${p} ${n}`).join(", ");
    const noun = changed.length === 1 ? "screenshot differs" : "screenshots differ";
    return `${changed.length} ${noun} from master's baselines: ${parts}`;
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
    // the verdict and the early red jobs run only when nobody cancelled the run (!cancelled()), so a lane GitHub
    // reports as cancelled hit its job time limit (timeout-minutes): a real red, not a cancelled run (#4556)
    const said = (r) => (r === "cancelled" ? "timed out (cancelled)" : (r ?? "skipped"));
    const results = Object.keys(LANES)
        .map((l) => `${LANES[l].name} ${said(lanes[l])}`)
        .join(", ");
    const timedOut = red.some((l) => lanes[l] === "cancelled")
        ? [
              "",
              "The run itself was not cancelled (a cancelled run is judged by nobody): a lane GitHub reports as cancelled hit its job time limit, so its tests never finished. Find what made it slow in the job's log.",
          ]
        : [];
    const body = [
        `The full run failed on ${sha} (${names}): ${run}`,
        "",
        `Results: ${results}`,
        ...timedOut,
        "",
        bisect,
        "",
        "Nothing was published. Name this issue in the fix or the revert. `Fixes #<this issue>` closes it, cancels this run if it is still going and restarts the full run on the fix once its master build is green. `Refs #<this issue>` restarts the full run after this run ends, keeping this run's verdict and bisect; a green verdict then closes this issue.",
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

/**
 * The red issue for one lane that ended red while the others still run; the verdict later updates the same issue.
 * @param o the facts
 * @param o.lane the red lane (a LANES key)
 * @param o.result its result
 * @param o.sha the red commit
 * @param o.run the run's URL
 * @returns `{ title, body }`, as redIssue makes them
 */
export function laneRedIssue({ lane, result, sha, run }) {
    const lanes = Object.fromEntries(Object.keys(LANES).map((l) => [l, l === lane ? result : "not finished"]));
    lanes.pick = "success";
    const bisect = "The other lanes are still running: the verdict updates this issue and starts any bisect.";
    return redIssue({ sha, red: [lane], lanes, run, bisect });
}

/**
 * Runs fn up to three times, 5 then 15 seconds apart: GitHub answers a 5xx now and then.
 * @param fn the call
 * @param [waits] the waits in milliseconds
 * @returns fn's value; throws its last error
 */
export function retry(fn, waits = process.env.RELEASE_RERUN_RETRY_MS ? [0, 0] : [5000, 15000]) {
    for (let i = 0; ; i++) {
        try {
            return fn();
        } catch (error) {
            if (i >= waits.length) throw error;
            console.log(`::warning::retrying after: ${String(error?.message ?? error).split("\n")[0]}`);
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waits[i]);
        }
    }
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
/**
 * The held candidate's head as the store has it now: "" none, "unknown" when the store does not answer.
 * @param cfg the store's config, or null
 * @param fallback what to use with no store configured (the pick's output)
 * @returns the head
 */
export async function heldNow(cfg, fallback) {
    if (!cfg) return fallback ?? "unknown";
    const store = await read(cfg, "/v1/candidate");
    return store ? (store.hold?.head ?? "") : "unknown";
}
const record = async (cfg, verdict) => {
    const r = await call(cfg, "POST", "/v1/verdicts", verdict);
    console.log(
        r.ok ? `recorded ${verdict.state} on ${short(verdict.sha)}` : `::warning::verdict not recorded (${r.why})`,
    );
};

/**
 * Whether channel/nightly holds a commit: in its history, or differing from it only in versions (the version merge
 * a promotion pushes to master, whose second parent is nightly's version commit). Not acceptMerges: a commit whose
 * visual-baselines/ differ from nightly's has screenshots nightly does not serve.
 * @param sha the commit
 * @param nightly channel/nightly's ref
 * @param [cwd] the repository
 * @returns a boolean; false when there is no channel/nightly yet
 */
export function isOnNightly(sha, nightly, cwd) {
    try {
        execFileSync("git", ["merge-base", "--is-ancestor", sha, nightly], { stdio: "ignore", cwd });
        return true;
    } catch {
        try {
            return diffCommits(nightly, sha, { cwd }).stray.length === 0;
        } catch {
            return false;
        }
    }
}

// The publish hold's state for the pick; an unreadable one counts as open, so the pick spends nothing on a guess
function publishHold() {
    try {
        // release-held.sh retries its own read; this one is retried here (GitHub answers a 5xx now and then)
        const open = execFileSync("tools/release-held.sh", ["find", PUBLISH_HOLD], { encoding: "utf8" }).trim();
        const closed = retry(() =>
            sh("gh", [
                "issue",
                "list",
                "-R",
                process.env.GITHUB_REPOSITORY,
                "--state",
                "closed",
                "--limit",
                "20",
                "--search",
                `in:title "${PUBLISH_HOLD}"`,
                "--json",
                "closedAt",
                "-q",
                '[.[].closedAt] | max // ""',
            ]),
        );
        return { open, closedAt: closed ? Date.parse(closed) : 0 };
    } catch (error) {
        return { open: `(unknown: ${error.message.split("\n")[0]})`, closedAt: 0 };
    }
}

async function pickMain(env) {
    const cfg = config(env);
    const store = cfg ? await read(cfg, "/v1/candidate") : null;
    const firstParents = (sha) => sh("git", ["rev-list", "--first-parent", "-n", "200", sha]).split("\n");
    const stray = (from, to) => diffCommits(from, to, { acceptMerges: true }).stray;
    const baselines = (sha) => sh("git", ["rev-parse", `${sha}:visual-baselines`]);
    const sameBaselines = (from, to) => baselines(from) === baselines(to);
    const NIGHTLY = "refs/remotes/origin/channel/nightly";
    const onNightly = (sha) => isOnNightly(sha, NIGHTLY);
    const hasNightly = (sha) => {
        try {
            execFileSync("git", ["rev-parse", "-q", "--verify", NIGHTLY], { stdio: "ignore" });
        } catch {
            return true; // no channel/nightly yet
        }
        try {
            execFileSync("git", ["merge-base", "--is-ancestor", NIGHTLY, sha], { stdio: "ignore" });
            return true;
        } catch {
            return false;
        }
    };
    const p = pick({
        mode: env.MODE,
        head: env.HEAD_SHA,
        store,
        firstParents,
        stray,
        sameBaselines,
        onNightly,
        hasNightly,
        hold: publishHold(),
        rolling: env.MODE === "full" && store ? await rollingInputs(cfg, env) : null,
    });
    console.log(`::notice::${p.why}`);
    if (p.rolling) {
        const on = env.PICK_RULE === "rolling" ? "on" : "off (shadow)";
        const chose = p.rolling.sha ? short(p.rolling.sha) : "no preference";
        const line = `ordering pick rule ${on}: ${chose} (${p.rolling.why}); today's rule: ${short(p.today)}`;
        console.log(`::notice::${line}`);
        if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
    }
    if (p.inherit) {
        await record(cfg, { sha: p.sha, state: p.inherit.state, lane: `inherited from ${short(p.inherit.sha)}` });
    }
    output({
        run: String(p.run),
        sha: p.sha,
        good: p.good ?? "",
        why: p.why,
        held: p.held ?? "",
        forward: p.forward ?? "",
        // the trial's comparison (early-capture.md 4e): what today's rule and the ordering rule chose
        today: p.today ?? "",
        rolling_sha: p.rolling?.sha ?? "",
        rolling_why: p.rolling?.why ?? "",
    });
}

// The ordering rule's inputs: each story's newest rolling capture and head's visual-baselines tree; env PICK_RULE
// "rolling" (the repository variable FULL_RUN_PICK_RULE) lets the rule choose, anything else only logs its choice
async function rollingInputs(cfg, env) {
    const answer = await read(cfg, "/v1/story-captures");
    const tree = sh("git", ["rev-parse", `${env.HEAD_SHA}:visual-baselines`]);
    return { on: env.PICK_RULE === "rolling", tree, captures: answer?.captures ?? null };
}

/**
 * The "Full run red" issues, newest first, as `{ number, title, state, closedAt }` (state OPEN or CLOSED). A plain
 * listing, not GitHub search, which indexes a new issue a while later: the verdict that follows a lane's early red
 * issue, and release-due on a quick fix that references it, must both find it.
 * @param [state] open, closed or all
 * @param [since] ISO time: only issues updated since then
 * @returns the issues
 */
export const listRedIssues = (state = "open", since = "") =>
    sh("gh", [
        "api",
        `repos/{owner}/{repo}/issues?state=${state}&labels=priority:critical&per_page=100${since ? `&since=${since}` : ""}`,
        "--jq",
        String.raw`.[] | select(.title | startswith("${RED_TITLE}")) | {number, title, state: (.state // "open" | ascii_upcase), createdAt: .created_at, closedAt: .closed_at, stateReason: .state_reason} | tojson`,
        // every page: an issue left open for weeks must not drop out of the listing
        "--paginate",
    ])
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
// The open red issue's number and title ("<number> <title>"), or empty. The oldest, the one duplicateOf keeps.
const openRedIssue = () => {
    const i = listRedIssues().at(-1);
    return i ? `${i.number} ${i.title}` : "";
};
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

/**
 * The older red issue a just-created one duplicates: two lanes that end red together each find none open and each
 * create one. The oldest stays, so both filers agree on it.
 * @param created the issue just created
 * @param open the open red issues' numbers
 * @returns the number to keep, or null when `created` is the oldest
 */
export function duplicateOf(created, open) {
    const first = Math.min(created, ...open);
    return first < created ? first : null;
}

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
    const created = Number(url.split("/").pop());
    const first = duplicateOf(
        created,
        listRedIssues().map((i) => i.number),
    );
    if (!first) return created;
    sh("gh", ["issue", "comment", String(first), "--body-file", file]);
    sh("gh", ["issue", "close", String(created), "--reason", "not planned", "--comment", `Duplicate of #${first}.`]);
    return first;
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

/**
 * The flaky stories the re-capture listed (flaky.json in each final capture), each with the story test its
 * results.json item names (`test: { file, name }`), when it has one.
 * @param dir the downloaded captures
 * @returns `{ name: <project>/<file>, why, test }` per story
 */
export function flakyStories(dir) {
    const out = [];
    for (const f of dir && existsSync(dir) ? readdirSync(dir, { recursive: true }).map(String) : []) {
        const m = /^visual-(.+)-\d+[/\\]flaky\.json$/.exec(f);
        if (!m) continue;
        const results = join(dir, dirname(f), "results.json");
        const items = existsSync(results) ? (JSON.parse(readFileSync(results, "utf8")).items ?? []) : [];
        for (const s of JSON.parse(readFileSync(join(dir, f), "utf8"))) {
            const test = items.find((i) => i.file === s.file)?.test;
            out.push({ name: `${m[1]}/${s.file}`, why: s.why, test });
        }
    }
    return out;
}

/**
 * A flaky story issue's body. Its "Flaky test: <file> > <story>" line is how the health dashboard's flaky page
 * (tools/pipeline-health/src/collector/flaky.ts, namesTest) matches the issue to the story test it saw fail.
 * @param s a flaky story, as flakyStories returns it
 * @param at where and when it was found
 * @param tail the closing paragraph
 * @returns the body
 */
export function flakyStoryBody(s, at, tail) {
    const named = s.test ? `Flaky test: ${s.test.file} > ${s.test.name}\n\n` : "";
    return `${named}The story ${s.name} ${s.why} ${at}.\n\n${tail}`;
}

/** More flaky stories than this in one project at once is one cause (#4940), filed as one issue. */
export const FLAKY_GROUP = 5;
// GitHub refuses an issue body over 65,536 characters
const MAX_BODY = 60_000;

/**
 * What to file for the flaky stories: one issue per story, or one per project when more than FLAKY_GROUP of its
 * stories flipped at once. A grouped body still names each story test, so the dashboard matches it to them.
 * @param stories the flaky stories, as flakyStories returns them
 * @param at where and when they were found
 * @param tail the closing paragraph
 * @returns `{ name, body }` per issue
 */
export function flakyFilings(stories, at, tail) {
    const byProject = Map.groupBy(stories, (s) => s.name.split("/")[0]);
    return [...byProject].flatMap(([project, all]) => {
        if (all.length <= FLAKY_GROUP) return all.map((s) => ({ name: s.name, body: flakyStoryBody(s, at, tail) }));
        let list = "";
        for (const s of all) {
            const story = s.test ? "Flaky test: " + s.test.file + " > " + s.test.name + " (" + s.name + ")" : s.name;
            const line = `- ${story}: ${s.why}\n`;
            if (list.length + line.length > MAX_BODY) {
                list += "- ... and more (the run's visual-final captures list them all)\n";
                break;
            }
            list += line;
        }
        const head = `${all.length} stories of ${project} were found flaky at once ${at}. So many at once is one cause (the renderer, the capture code, the runner), not ${all.length} unstable stories.`;
        return [{ name: `${project} (${FLAKY_GROUP}+ stories at once)`, body: `${head}\n\n${list}\n${tail}` }];
    });
}

// One open "Flaky in full run: <name>" issue per name: a comment when it recurs
function fileFlaky(name, body) {
    const title = `${FLAKY_TITLE} ${name}`;
    const open = sh("gh", [
        "api",
        "repos/{owner}/{repo}/issues?state=open&labels=priority:critical&per_page=100",
        "--jq",
        `.[] | select(.title == ${JSON.stringify(title)}) | .number`,
        "--paginate",
    ]).split("\n")[0];
    const file = join(tmpdir(), `full-run-flaky-${process.pid}.md`);
    writeFileSync(file, body);
    if (open) return sh("gh", ["issue", "comment", open, "--body-file", file]);
    const labels = ["bug", "priority:critical", "effort:medium"].flatMap((l) => ["--label", l]);
    return sh("gh", ["issue", "create", "--title", title, ...labels, "--body-file", file]);
}

function fileFlakies(env, lanes, stories) {
    const at = `on ${env.SHA} (${env.RUN_URL}, attempt ${env.RUN_ATTEMPT ?? 1})`;
    const tail = "It does not block nightly: this is a confirmation, not a quarantine. Find the mechanism and fix it.";
    for (const l of lanes) {
        const body = `${LANES[l].name} failed on the full run's first attempt and passed when re-run ${at}.\n\n${tail}`;
        bestEffort(
            () => fileFlaky(LANES[l].name, body),
            `filing the flaky ${LANES[l].name}`,
            () => null,
        );
    }
    for (const { name, body } of flakyFilings(stories, at, tail)) {
        bestEffort(
            () => fileFlaky(name, body),
            `filing the flaky story ${name}`,
            () => null,
        );
    }
}

// The red path: bisect once, file or update the red issue
async function fileRedVerdict(cfg, { sha, good, runId, runUrl, red, lanes }) {
    const failures = cfg ? await read(cfg, `/v1/failures?run=${runId}&good=${good}`) : null;
    const bisect = tryBisect(bisectPlan({ red, sha, good, run: runId, failures }));
    const body = redIssue({ sha, red, lanes, run: runUrl, bisect });
    const issue = bestEffort(
        () => fileRed(body),
        "filing the red issue",
        () => null,
    );
    return { issue, bisect };
}

const readJson = (file) => {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return null;
    }
};

/**
 * What a verdict found, in one line: the red lanes, the owner's item or the changed screenshots.
 * @param o the facts
 * @param o.state the verdict
 * @param o.red the red lanes
 * @param o.lanes every lane's result
 * @param o.changed differingImages' changed
 * @param o.env LLM_OWNER_ITEM and VERSION_HELD
 * @returns the line
 */
function whatOf({ state, red, lanes, changed, env }) {
    const held = heldLine(env.VERSION_HELD);
    let what = state;
    if (state === "owner-item") what = env.LLM_OWNER_ITEM;
    else if (state === "red")
        what = red.map((l) => (l === "captures" ? `${LANES[l].name} ${lanes[l]}` : LANES[l].name)).join(", ");
    else if (state === "green-images") what = changedSummary(changed);
    return held ? `${what}; ${held}` : what;
}

/**
 * The owner's item for the projects the version dry run held: they and their dependents wait, the rest promote.
 * @param held VERSION_HELD, comma separated nx project names, or empty
 * @returns the line, or "" when nothing is held
 */
export const heldLine = (held) =>
    held
        ? `${held} held with the projects that depend on it (a major or a first publish): add its release-approvals.json entry to release them`
        : "";

async function verdictMain(env) {
    const cfg = config(env);
    const lanes = JSON.parse(env.LANES);
    const projects = Object.keys(JSON.parse(readFileSync("visual-review.config.json", "utf8")).projects ?? {});
    const { changed, missing } = differingImages(env.CAPTURES, projects);
    lanes.captures = captureLane(missing);
    const { state, red } = verdictOf(lanes, changed.length, env.LLM_OWNER_ITEM, env.VERSION_HELD);
    // unset (a run by hand): no attempt to wait for, so it decides at once
    const attempt = Number(env.RUN_ATTEMPT || 0);
    const wait = deferred({ attempt, mode: env.MODE, state, red, lanes, actor: actorOf(env) });
    let issue = null;
    let bisect = "";
    const what = whatOf({ state, red, lanes, changed, env });
    // a held head past its commit (FORWARD) is the hold issue's to report, never a "Full run red" one: master
    // does not hold it, so neither a bisect nor a restart on master could help
    const forward = !!env.FORWARD;
    const facts = { sha: env.SHA, good: env.GOOD, runId: env.RUN_ID, runUrl: env.RUN_URL, red, lanes, forward };
    if (wait) {
        console.log(`::notice::attempt 1 is red (${red.join(", ")}): release-rerun.yml re-runs its failed jobs once`);
    } else if (state === "red") {
        if (!forward) ({ issue, bisect } = await fileRedVerdict(cfg, facts));
    } else if (state !== "owner-item") {
        bestEffort(
            () => closeRedOnGreen(state, env),
            "closing the red issue",
            () => null,
        );
    }
    // a lane red on the attempt before and green now, and a story the re-capture found flaky: filed, not blocking
    const before = attempt > 1 ? readJson(join(env.RECORDS ?? "", `verdict-${attempt - 1}.json`)) : null;
    if (!wait) fileFlakies(env, flakyLanes(before?.red ?? [], red), flakyStories(env.CAPTURES));
    // green-images: the owner reviews these (release.yml announces it); the files go to the run's log
    if (state === "green-images") console.log(`::notice::${what}\n${changed.join("\n")}`);
    // a failed pick judged no commit: recording red on one would make the next slot skip it. A deferred red is
    // recorded as deferred, which the pick ignores, until the re-run (or release-rerun.yml) decides
    const recorded = wait ? DEFERRED : state;
    if (cfg && red[0] !== "pick")
        await record(cfg, { sha: env.SHA, state: recorded, lane: red.join(",") || null, issue });
    if (env.RECORD) writeFileSync(env.RECORD, `${JSON.stringify({ ...facts, state, deferred: wait, attempt })}\n`);
    // the hold as the store has it now, not as the pick saw it: a re-run attempt keeps attempt 1's pick outputs, and
    // another run may have held its commit since
    const held = await heldNow(cfg, env.HELD);
    const hold = wait || red[0] === "pick" ? "none" : holdAction({ held, sha: env.SHA, state });
    const owner = heldLine(env.VERSION_HELD);
    output({ state, issue: issue ? String(issue) : "", what, bisect, deferred: String(wait), hold, owner, held });
}

/**
 * Files what an attempt-1 verdict deferred, when its run is not re-run after all (release-rerun.yml).
 * @param file the verdict-1.json record
 * @param env the environment
 */
async function fileDeferredMain(file, env) {
    const facts = readJson(file);
    if (!facts?.deferred || facts.forward) {
        console.log(`::notice::${file} defers nothing to file`);
        return;
    }
    // a fix merged for this commit's red issue in the last hour: release-due cancelled the run on purpose to restart
    // on the fix, so its deferred red is that fix's, not a red to file again (or a commit to hold)
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const fixed = bestEffort(
        () => fixedRecently(listRedIssues("closed", since), facts.sha),
        "reading the red issues a fix closed",
        () => null,
    );
    if (fixed) {
        console.log(`::notice::#${fixed} was fixed by a merge that cancelled this run: filing nothing`);
        output({ issue: "", bisect: "", sha: facts.sha, fixed: String(fixed) });
        return;
    }
    const { issue, bisect } = await fileRedVerdict(config(env), facts);
    output({ issue: issue ? String(issue) : "", bisect, sha: facts.sha });
}

/**
 * A red issue on this commit that a fixing merge closed in the last hour: release-due is about to cancel this run, so
 * a lane ending red now files nothing (the verdict still files, if the run is not cancelled after all).
 * @param closed the closed red issues, as listRedIssues returns them
 * @param sha the run's commit
 * @param [now] milliseconds
 * @returns its number, or null
 */
export function fixedRecently(closed, sha, now = Date.now()) {
    const hit = closed.find(
        (i) =>
            i.title.endsWith(` on ${short(sha)}`) &&
            i.stateReason === "completed" && // a duplicate fileRed closed is "not_planned"
            i.closedAt &&
            now - Date.parse(i.closedAt) <= 60 * 60 * 1000,
    );
    return hit ? hit.number : null;
}

function laneRedMain(env) {
    const rerun = RERUN_MODES.has(env.MODE) && actorOf(env) !== WORKFLOW_TOKEN_ACTOR;
    if ((env.RUN_ATTEMPT || env.GITHUB_RUN_ATTEMPT) === "1" && rerun) {
        console.log(`::notice::attempt 1: the verdict decides after the one same-commit re-run`);
        return;
    }
    if (env.OWNER_ITEM) {
        console.log(`::notice::${LANES[env.LANE].name} is red with an owner item: the verdict decides it`);
        return;
    }
    const fixed = fixedRecently(listRedIssues("closed", new Date(Date.now() - 60 * 60 * 1000).toISOString()), env.SHA);
    if (fixed) {
        console.log(`::notice::#${fixed} was fixed by a merge that cancels this run: filing nothing`);
        return;
    }
    const issue = fileRed(laneRedIssue({ lane: env.LANE, result: env.RESULT, sha: env.SHA, run: env.RUN_URL }));
    output({ issue: String(issue) });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const cmd = process.argv[2];
    if (cmd === "pick") await pickMain(process.env);
    else if (cmd === "verdict") await verdictMain(process.env);
    else if (cmd === "lane-red") laneRedMain(process.env);
    else if (cmd === "file-deferred") await fileDeferredMain(process.argv[3], process.env);
    else {
        console.error(
            "usage: node tools/full-run.mjs pick | verdict | lane-red | file-deferred <file> (see the head of the file)",
        );
        process.exit(2);
    }
}
