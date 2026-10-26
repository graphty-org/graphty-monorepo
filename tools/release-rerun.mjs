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
// deferred (tools/full-run.mjs file-deferred) instead. A verdict that did not defer already decided: nothing.
// Every other run (GPU, the weekly paired benchmark, a legacy or shadow Release) is re-run once only when all it lost
// was its machine.dev runner (tools/gpu-runner-lost.sh), as gpu-rerun-on-runner-loss.yml did.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { RERUN_MODES } from "./full-run.mjs";

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
 * @param o.conclusion its conclusion
 * @param o.record its attempt-1 verdict record (verdict-1.json), or null
 * @param o.failed the names of its failed or cancelled jobs
 * @param o.lostRunner () => whether every failed job only lost its runner
 * @returns "rerun", "file" or "none"
 */
export function decide({ workflow, title, attempt, conclusion, record, failed, lostRunner }) {
    if (conclusion !== "failure" || Number(attempt) !== 1) return "none";
    if (workflow === "Release" && RERUN_MODES.has(modeOf(title))) {
        if (!record?.deferred) return "none";
        return failed.length && failed.every(rerunnable) ? "rerun" : "file";
    }
    return lostRunner() ? "rerun" : "none";
}

const gh = (args, opts = {}) => execFileSync("gh", args, { encoding: "utf8", ...opts }).trim();

function facts(env) {
    const repo = env.GITHUB_REPOSITORY;
    const failed = gh([
        "api",
        `repos/${repo}/actions/runs/${env.RUN}/attempts/1/jobs?per_page=100`,
        "--paginate",
        "--jq",
        '.jobs[] | select(.conclusion == "failure" or .conclusion == "cancelled") | .name',
    ])
        .split("\n")
        .filter(Boolean);
    const dir = mkdtempSync(join(tmpdir(), "release-rerun-"));
    let record = null;
    try {
        gh(["run", "download", env.RUN, "-R", repo, "-n", "verdict-1", "-D", dir], { stdio: "ignore" });
        record = JSON.parse(readFileSync(join(dir, "verdict-1.json"), "utf8"));
    } catch {
        // no verdict ran on attempt 1 (a failed pick, a cancelled run): it deferred nothing
    }
    const lostRunner = () => {
        try {
            execFileSync("tools/gpu-runner-lost.sh", [env.RUN, "1"], { stdio: "inherit" });
            return true;
        } catch {
            return false;
        }
    };
    return { failed, record, lostRunner, file: join(dir, "verdict-1.json") };
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
    if (d === "rerun") {
        gh(["run", "rerun", env.RUN, "--failed", "-R", env.GITHUB_REPOSITORY], { stdio: "inherit" });
        if (!release) return;
        const what = f.record?.deferred
            ? `Re-run 2 on the same commit after ${f.record.red.join(", ")} failed`
            : "Re-run 2 after the T4 runner was lost";
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
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.env, process.argv.includes("--dry"));
