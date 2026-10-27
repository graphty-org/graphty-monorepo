#!/usr/bin/env node
// release-rerun.mjs -- one decision for release-rerun.yml (and release-watch.yml, which stays silent on a run that is
// re-run): whether a finished run's failed jobs are re-run once, on the same commit (design/ci/channels-pipeline.md
// section 3, "Same-commit re-run, once").
//
//   node tools/release-rerun.mjs [--dry]
//       env RUN (the run id), WORKFLOW (its workflow's name), TITLE (its display title, "Release (full)"),
//           ATTEMPT, CONCLUSION, RUN_URL, HEAD_SHA, GH_TOKEN, GITHUB_REPOSITORY
//       writes decision=rerun|file|none to GITHUB_OUTPUT; without --dry also acts on it
//
// A full, restart or candidate Release run: its attempt-1 verdict wrote verdict-1.json (artifact verdict-1). When it
// deferred a red verdict, the failed jobs are re-run once (`gh run rerun --failed`): the lanes, the re-capture and the
// verdict, never the version, land, publish or promote jobs; a failed job outside that list files what the verdict
// deferred (tools/full-run.mjs file-deferred) instead. A verdict that did not defer already decided, so nothing,
// except when only the Verdict job failed after deciding a verdict that is not red (an error in the screenshot gate,
// the promotion decision or the hold, each of which says "re-run the failed jobs"): that job is re-run once. A
// second attempt that ended cancelled with no verdict of its own (a newer dispatch replaced it while it was pending)
// files what attempt 1 deferred, since nothing else will.
// Every other run (GPU, the weekly paired benchmark, a legacy or shadow Release) is re-run once only when all it lost
// was its machine.dev runner (tools/gpu-runner-lost.sh), as gpu-rerun-on-runner-loss.yml did.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { RERUN_MODES, retry } from "./full-run.mjs";

/** The failed jobs a same-commit re-run may run again: the lanes, their red-early filers and the verdict. */
const RERUNNABLE = [
    "CI",
    "T4 GPU",
    "Hosts",
    "Work protection (macOS)",
    "Security audit",
    "LLM regression",
    "Version dry run",
    "Re-capture",
    // a fix forward's site, which the promotion deploys (release.yml candidate_site)
    "Assemble the held head's site",
    "Red early",
    "Verdict",
    "Coverage",
    "Timings",
];
export const rerunnable = (job) =>
    RERUNNABLE.some((p) => job === p || job.startsWith(`${p} `) || job.startsWith(`${p}/`));

/**
 * The mode a Release run's display title names ("Release (full)" is full).
 * @param title the run's display title
 * @returns the mode, or ""
 */
export const modeOf = (title) => /^Release \(([a-z-]+)\)$/.exec(title ?? "")?.[1] ?? "";

/**
 * What to do with a finished run.
 * @param o the facts
 * @param o.workflow its workflow's name
 * @param o.title its display title
 * @param o.attempt its attempt
 * @param o.conclusion its conclusion (failure, cancelled when a job timed out, timed_out)
 * @param o.record its attempt-1 verdict record (verdict-1.json), or null
 * @param [o.record2] its attempt-2 verdict record (verdict-2.json), or null
 * @param o.failed the names of its failed or cancelled jobs
 * @param o.lostRunner () => whether every failed job only lost its runner
 * @returns "rerun", "file" or "none"
 */
export function decide({ workflow, title, attempt, conclusion, record, record2 = null, failed, lostRunner }) {
    const release = workflow === "Release" && RERUN_MODES.has(modeOf(title));
    // the re-run attempt was cancelled before its verdict (replaced while pending in the release-train group): attempt
    // 1's deferred red is filed here, or it is lost
    if (release && Number(attempt) === 2 && conclusion === "cancelled") {
        return record?.deferred && !record2 ? "file" : "none";
    }
    if (Number(attempt) !== 1) return "none";
    if (release) {
        if (conclusion === "success") return "none";
        // a job that hits its timeout-minutes ends cancelled, and so does the run: a deferred verdict is acted on
        // whatever the run's conclusion, or nothing re-runs it and nothing files it
        if (record?.deferred) return failed.length && failed.every(rerunnable) ? "rerun" : "file";
        // the verdict decided, then a later step of its job failed (the screenshot gate, the promotion decision, the
        // hold): its message says re-run the failed jobs, so this does, once. Never a red one, which filed its issue
        // and bisect already
        return failed.length && failed.every((j) => j === "Verdict") && record?.state !== "red" ? "rerun" : "none";
    }
    return conclusion === "failure" && lostRunner() ? "rerun" : "none";
}

// stdio "ignore" returns null, not ""
const gh = (args, opts = {}) => (execFileSync("gh", args, { encoding: "utf8", ...opts }) ?? "").trim();

/**
 * A run's verdict-<n>.json: null when the run has no such artifact (no verdict ran), and an error, never null, when
 * GitHub could not be asked, so a failed download is never read as "no record".
 * @param env RUN and GITHUB_REPOSITORY
 * @param dir where to download it
 * @param n the attempt
 * @returns the record, or null
 */
function verdictRecord(env, dir, n) {
    const name = `verdict-${n}`;
    const count = retry(() =>
        gh([
            "api",
            `repos/${env.GITHUB_REPOSITORY}/actions/runs/${env.RUN}/artifacts?name=${name}`,
            "--jq",
            ".total_count",
        ]),
    );
    if (Number(count) === 0) return null;
    const at = join(dir, String(n));
    retry(() =>
        gh(["run", "download", env.RUN, "-R", env.GITHUB_REPOSITORY, "-n", name, "-D", at], { stdio: "ignore" }),
    );
    return JSON.parse(readFileSync(join(at, `${name}.json`), "utf8"));
}

function facts(env) {
    const repo = env.GITHUB_REPOSITORY;
    const failed = retry(() =>
        gh([
            "api",
            `repos/${repo}/actions/runs/${env.RUN}/attempts/1/jobs?per_page=100`,
            "--paginate",
            "--jq",
            '.jobs[] | select(.conclusion == "failure" or .conclusion == "cancelled") | .name',
        ]),
    )
        .split("\n")
        .filter(Boolean);
    const dir = mkdtempSync(join(tmpdir(), "release-rerun-"));
    // no verdict ran on attempt 1 (a failed pick, a cancelled run): it deferred nothing
    const record = verdictRecord(env, dir, 1);
    const record2 = Number(env.ATTEMPT) === 2 ? verdictRecord(env, dir, 2) : null;
    const lostRunner = () => {
        try {
            execFileSync("tools/gpu-runner-lost.sh", [env.RUN, "1"], { stdio: "inherit" });
            return true;
        } catch {
            return false;
        }
    };
    return { failed, record, record2, lostRunner, file: join(dir, "1", "verdict-1.json") };
}

function main(env, dry) {
    const f = facts(env);
    const d = decide({
        workflow: env.WORKFLOW,
        title: env.TITLE,
        attempt: env.ATTEMPT,
        conclusion: env.CONCLUSION,
        ...f,
    });
    console.log(`run ${env.RUN} (${env.TITLE}, attempt ${env.ATTEMPT}): ${d}; failed jobs: ${f.failed.join(", ")}`);
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `decision=${d}\n`);
    if (dry || d === "none") return;
    const release = env.WORKFLOW === "Release";
    if (d === "rerun" && !rerun(env, release && f.record?.deferred)) {
        console.log("::warning::the re-run did not start: attempt 1 decides what it deferred");
    } else if (d === "rerun") {
        if (!release) return;
        let what = "Re-run 2 after the T4 runner was lost";
        if (f.record?.deferred) what = `Re-run 2 on the same commit after ${f.record.red.join(", ")} failed`;
        else if (f.record || f.failed.includes("Verdict")) what = "Re-run 2 of the verdict, whose job failed";
        try {
            execFileSync(
                "node",
                [
                    "tools/release-status.mjs",
                    "started",
                    "--attempt",
                    "2",
                    "--sha",
                    env.HEAD_SHA,
                    "--what",
                    what,
                    "--run",
                    env.RUN_URL,
                ],
                { stdio: "inherit" },
            );
        } catch {
            // the phone's notice is never fatal
        }
        return;
    }
    // file: the run is not re-run after all, so attempt 1 decides what it deferred
    fileDeferred(env, f);
}

/**
 * Re-runs the run's failed jobs.
 * @param env the environment
 * @param fallback whether a failed re-run falls back to filing what attempt 1 deferred
 * @returns whether it started; throws when it did not and there is nothing to fall back to
 */
function rerun(env, fallback) {
    try {
        gh(["run", "rerun", env.RUN, "--failed", "-R", env.GITHUB_REPOSITORY], { stdio: "inherit" });
        return true;
    } catch (error) {
        if (!fallback) throw error;
        return false;
    }
}

/**
 * Files what attempt 1's verdict deferred: the red issue and the bisect, the announcement, and the hold of its commit
 * when nothing is held, as a red second attempt would have.
 * @param env the environment
 * @param f facts()
 */
function fileDeferred(env, f) {
    const out = execFileSync("node", ["tools/full-run.mjs", "file-deferred", f.file], {
        encoding: "utf8",
        env: { ...env, GITHUB_OUTPUT: "" },
    });
    const field = (k) => new RegExp(`^${k}=(.*)$`, "m").exec(out)?.[1] ?? "";
    execFileSync(
        "node",
        [
            "tools/release-status.mjs",
            "red",
            "--sha",
            f.record.sha,
            "--what",
            f.record.red.join(", "),
            "--issue",
            field("issue"),
            "--bisect",
            field("bisect"),
            "--attempt",
            "1",
            "--run",
            env.RUN_URL,
        ],
        { stdio: "inherit" },
    );
    if (f.record.forward) return; // a held head past its commit: the hold stands already
    execFileSync("node", ["tools/channel/hold.mjs", "start"], {
        stdio: "inherit",
        env: {
            ...env,
            SHA: f.record.sha,
            STATE: "red",
            WHAT: f.record.red.join(", "),
            RUN_URL: env.RUN_URL,
        },
    });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.env, process.argv.includes("--dry"));
