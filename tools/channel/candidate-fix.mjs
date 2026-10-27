#!/usr/bin/env node
// Fix forward into the held nightly candidate (design/ci/channels-pipeline.md section 3, "Fix forward into the
// candidate"). A held candidate C is fixed on branches made from the candidate's head, never from newer master: the
// branch is named for the hold issue (`./tools/worktree-new.sh fix/<hold issue>-<topic> origin/channel/candidate`),
// or a commit on it says `Refs #<hold issue>`. Its pull request merges into master as usual (tools/pr-open.sh, which
// merges origin/master into the branch on top of the fix); that master merge never enters the candidate.
//
//   node tools/channel/candidate-fix.mjs advance   release.yml's candidate_fix job (before the pick; the deploy key)
//       Every merge on master since C that references the hold issue is a fix. Its fix commit F is the newest of
//       its pull request's commits whose history, past the candidate's head, holds only that pull request's
//       commits: no master commit, and so nothing newer from master. F is merged (a fast-forward when it starts
//       from the head; never a cherry-pick) into the head, branch channel/candidate is pushed and the results
//       store's hold moves to the new head, which the pick then tests first. A fix that cannot enter (none of its
//       commits starts from the candidate, part of the fix sits on newer master, a conflict) is told on the hold
//       issue once, and skipped from then on.
//       env RESULTS_URL and the job's OIDC token, GH_TOKEN, GITHUB_REPOSITORY, RUN_URL; git: master's checkout
//       with full history, pushing with the deploy key; writes head and moved to GITHUB_OUTPUT
//   node tools/channel/candidate-fix.mjs plan      release.yml's pick job, when it tests a held head past C
//       What the re-test of head H runs: only the test shards of the projects nx calls affected by C..H, Hosts and
//       work protection (macOS) only when their packages or the lockfile changed, and the screenshots of the
//       affected Storybooks shot again whole; every other project's screenshots are carried over from the run that
//       judged the head before (its visual-final-* captures), with their changed and new stories shot again. A lane
//       the earlier verdict found red runs again; a red CI lane or screenshot capture, or no earlier run to carry
//       captures from, re-runs everything.
//       env BASE (C), SHA (H), RESULTS_URL and the job's OIDC token; git: H fetched; dependencies installed (nx)
//       writes shards (a JSON list, empty for the whole suite), hosts, macos (true | false), capture (a JSON list of
//       projects shot whole) and source_run (the run whose captures carry over, empty for a whole run)
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { call, config } from "../results/client.mjs";
import { acceptsIn } from "./resume.mjs";

/**
 * The marker of a refusal on the hold issue: one per fix merge, so a refused fix is told once.
 * @param merge the fix's merge commit on master
 * @returns the marker
 */
export const REFUSED = (merge) => `<!-- candidate-fix refused ${merge} -->`;
const FULL_RUN_STATES = new Set(["red", "owner-item", "green-clean", "green-images"]);
// lanes whose red re-runs everything: a whole CI suite, and the screenshots with it
const WHOLE_RUN_LANES = new Set(["pick", "ci", "recapture", "captures"]);
// ponytail: one small shard when nx calls nothing affected; ci.yml's `shards` input must not be empty (that is
// the whole suite), and the run still builds every package and Storybook
const NOTHING_AFFECTED = ["graph-format"];

/**
 * Whether a master merge is a fix for the hold: its pull request's branch is named for the hold issue
 * (`<type>/<issue>-<topic>`, as tools/worktree-new.sh names it), or one of its commits references the issue.
 * @param merge `{ subject, messages }`: the merge commit's subject and the brought-in commits' messages, joined
 * @param issue the hold issue's number
 * @returns boolean
 */
export function referencesHold(merge, issue) {
    if (!issue) return false;
    const branch = /^Merge pull request #\d+ from [^/\s]+\/(?:[\w.-]+\/)?(\d+)-/.exec(merge.subject ?? "");
    if (branch && Number(branch[1]) === Number(issue)) return true;
    return new RegExp(String.raw`(^|[^\w/])#${issue}\b|graphty-monorepo/issues/${issue}\b`).test(merge.messages ?? "");
}

/**
 * The fix commit F of a fix merge.
 * @param o the facts
 * @param o.commits the commits the merge brought into master (its pull request's commits), `[{ sha, merge }]`
 * @param o.rangeOf (sha) => the commits in its history that the candidate's head lacks (`head..sha`)
 * @returns `{ f }`, `{ done: true }` when the head holds the fix already, or `{ refuse }` with the reason
 */
export function fixCommit({ commits, rangeOf }) {
    const own = new Set(commits.map((c) => c.sha));
    const ranges = new Map(commits.map((c) => [c.sha, rangeOf(c.sha)]));
    // a commit whose history past the head is the pull request's own: nothing from master, newer or older
    const clean = commits.filter((c) => ranges.get(c.sha).every((s) => own.has(s)));
    if (clean.length === 0) {
        return {
            refuse: "none of its commits starts from the candidate's head: the branch holds master commits the candidate lacks. A defect already fixed on master from a newer base cannot enter the candidate without a copy: the owner abandons the hold (the next slot holds a commit with the fix), or the fix is made again on a branch from the candidate's head",
        };
    }
    const f = clean.reduce((a, b) => (ranges.get(b.sha).length > ranges.get(a.sha).length ? b : a));
    const inF = new Set(ranges.get(f.sha));
    if (inF.size === 0) return { done: true };
    // a fix commit made on top of the master merge would be left behind: the candidate must get all of the fix
    const left = commits.filter((c) => !c.merge && !inF.has(c.sha) && ranges.get(c.sha).length > 0);
    if (left.length) {
        return {
            refuse: `its commit ${left.map((c) => c.sha.slice(0, 12)).join(", ")} is made on newer master (after the master merge), so the candidate would get only part of the fix. Make the next fix commit on a branch from the last candidate-side commit and merge that branch into the pull request's branch`,
        };
    }
    return { f: f.sha };
}

/**
 * What a held head's re-test runs.
 * @param o the facts
 * @param o.prior the latest full-run verdict on the candidate before this head (`{ state, lane, runId }`), or null
 * @param o.affected the nx projects affected by C..H
 * @param o.shards (affected) => the test shards of those projects (tools/ci-test-matrix.mjs)
 * @param o.visual `{ <capture project>: <nx project> }` (visual-review.config.json)
 * @returns `{ shards, hosts, macos, capture, sourceRun }`; shards "" is the whole suite with every screenshot
 */
export function planOf({ prior, affected, shards, visual }) {
    const red =
        prior?.state === "red"
            ? String(prior.lane ?? "")
                  .split(",")
                  .filter(Boolean)
            : [];
    const whole = { shards: "", hosts: true, macos: true, capture: [], sourceRun: "" };
    if (!prior?.runId || red.some((l) => WHOLE_RUN_LANES.has(l))) return whole;
    const has = (p) => affected.includes(p);
    const lock = has("*lockfile*");
    const picked = shards(affected.filter((p) => p !== "*lockfile*"));
    return {
        shards: JSON.stringify(picked.length ? picked : NOTHING_AFFECTED),
        hosts: red.includes("hosts") || lock || has("webgpu-graph-algorithms") || has("graph-format"),
        macos: red.includes("autosave_macos") || lock || has("graphty-element"),
        capture: Object.keys(visual).filter((p) => lock || has(visual[p])),
        sourceRun: String(prior.runId),
    };
}

/**
 * The nx project each Storybook belongs to, from its build command (`nx run <project>:build-storybook`).
 * @param cfg visual-review.config.json
 * @returns `{ <capture project>: <nx project> }`
 */
export const visualProjects = (cfg) =>
    Object.fromEntries(
        Object.entries(cfg.projects ?? {}).map(([p, v]) => [
            p,
            /nx run ([\w@/.-]+):build-storybook/.exec(v.build ?? "")?.[1] ?? p,
        ]),
    );

const git = (args, opts = {}) =>
    execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
const gitOk = (args) => {
    try {
        git(args);
        return true;
    } catch {
        return false;
    }
};
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const output = (fields) => {
    const lines = Object.entries(fields).map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
    console.log(lines.join("\n"));
};
const comment = (issue, text) => {
    const file = join(tmpdir(), `candidate-fix-${process.pid}.md`);
    writeFileSync(file, text);
    gh("issue", "comment", String(issue), "--body-file", file);
};
const lines = (s) => s.split("\n").filter(Boolean);

async function storeHold(cfg) {
    const r = cfg ? await call(cfg, "GET", "/v1/candidate") : { ok: false, why: "no store configured" };
    if (!r.ok) throw new Error(`the results store did not answer (${r.why})`);
    return r.data;
}

// the merges on master's first-parent line since C, oldest first: `{ sha, subject, commits, messages }`
function mergesSince(base) {
    return lines(git(["log", "--merges", "--first-parent", "--reverse", "--format=%H%x09%s", `${base}..HEAD`])).map(
        (line) => {
            const [sha, subject] = line.split("\t");
            const raw = git(["log", "--format=%H %P%x09%s%x1f%B%x1e", `${sha}^1..${sha}^2`]);
            const commits = raw
                .split("\x1e")
                .map((c) => c.trim())
                .filter(Boolean)
                .map((c) => {
                    const [head, body] = c.split("\x1f");
                    const [ids, subj] = head.split("\t");
                    const [id, ...parents] = ids.split(" ");
                    return { sha: id, parents, subject: subj, merge: parents.length > 1, body };
                });
            return { sha, subject, commits, messages: commits.map((c) => c.body).join("\n") };
        },
    );
}

// channel/candidate may be ahead of the store after a store write that failed: start from it then
function startOf(hold) {
    if (gitOk(["fetch", "--quiet", "origin", "+refs/heads/channel/candidate:refs/remotes/origin/channel/candidate"])) {
        const branch = git(["rev-parse", "refs/remotes/origin/channel/candidate"]);
        return gitOk(["merge-base", "--is-ancestor", hold.head, branch]) ? branch : hold.head;
    }
    gitOk(["fetch", "--quiet", "origin", hold.head]); // master's checkout holds C; a later head is on the branch
    return hold.head;
}

// one fix merge into HEAD: the fix commit merged, or why it cannot enter; null when HEAD holds it already
function mergeFix(m, pr) {
    const d = fixCommit({ commits: m.commits, rangeOf: (sha) => lines(git(["rev-list", sha, "^HEAD"])) });
    if (d.done) return null;
    if (d.refuse) return { why: d.refuse };
    if (gitOk(["merge", "--no-edit", "-m", `Merge fix #${pr} into channel/candidate`, d.f])) return { f: d.f };
    gitOk(["merge", "--abort"]);
    const head = git(["rev-parse", "HEAD"]).slice(0, 12);
    return {
        why: `${d.f.slice(0, 12)} conflicts with the candidate's head ${head}: make the fix again on a branch from that head`,
    };
}

// merges every waiting fix into HEAD, telling the hold issue once about each that cannot enter
function mergeFixes(hold, merges, said, runUrl) {
    const merged = [];
    for (const m of merges) {
        if (!referencesHold(m, hold.issue) || acceptsIn(m.commits).length || said.includes(REFUSED(m.sha))) continue;
        const pr = /#(\d+)/.exec(m.subject)?.[1] ?? m.sha.slice(0, 12);
        const r = mergeFix(m, pr);
        if (r?.f) merged.push(`#${pr} (${r.f.slice(0, 12)})`);
        if (!r?.why) continue;
        console.log(`::warning::fix #${pr} does not enter the candidate: ${r.why}`);
        const text = `${REFUSED(m.sha)}\nThe fix in pull request #${pr} (merged as ${m.sha}) did not enter the held candidate: ${r.why}. ${runUrl}`;
        if (hold.issue) comment(hold.issue, text.trim());
    }
    return merged;
}

async function advance(env) {
    const cfg = config(env);
    const { hold } = await storeHold(cfg);
    if (!hold) {
        output({ head: "", moved: "false" });
        console.log("::notice::nothing is held: no fix forward");
        return;
    }
    const start = startOf(hold);
    const said = hold.issue
        ? gh("api", `repos/{owner}/{repo}/issues/${hold.issue}/comments`, "--paginate", "--jq", ".[].body")
        : "";
    // master's merges first: the checkout leaves master's tip
    const merges = mergesSince(hold.base);
    git(["checkout", "--quiet", "--detach", start]);
    const merged = mergeFixes(hold, merges, said, env.RUN_URL ?? "");
    const head = git(["rev-parse", "HEAD"]);
    if (head === hold.head) {
        output({ head, moved: "false" });
        return;
    }
    if (!gitOk(["push", "--no-verify", "origin", `${head}:refs/heads/channel/candidate`])) {
        // the deploy-key ruleset must cover channel/candidate (an owner item); the lanes could not fetch the head
        console.log(`::warning::could not push channel/candidate to ${head}: the fixes wait for the next run`);
        output({ head: hold.head, moved: "false" });
        return;
    }
    const r = await call(cfg, "POST", "/v1/hold", { base: hold.base, head, issue: hold.issue ?? null });
    if (!r.ok) throw new Error(`POST /v1/hold failed (${r.why}); channel/candidate is at ${head}`);
    const into = merged.length ? `Merged ${merged.join(", ")} into it. ` : "";
    const text = `Fix forward: the held candidate's head is now ${head}. ${into}The next run re-tests it. ${env.RUN_URL ?? ""}`;
    if (hold.issue) comment(hold.issue, text.trim());
    output({ head, moved: "true" });
}

function shardsOf(affected) {
    if (!affected.length) return [];
    const all = execFileSync("pnpm", ["exec", "nx", "show", "projects", "--json"], { encoding: "utf8" }).trim();
    const out = execFileSync("node", ["tools/ci-test-matrix.mjs", all, JSON.stringify(affected)], {
        encoding: "utf8",
    });
    const matrix = JSON.parse(/^test-matrix=(.*)$/m.exec(out)?.[1] ?? '{"include":[]}');
    return [...new Set(matrix.include.flatMap((e) => e.members ?? [e.shard]))];
}

async function plan(env) {
    const { BASE: base, SHA: sha } = env;
    const r = config(env) ? await call(config(env), "GET", "/v1/candidate") : { ok: false };
    const chain = new Set([base, ...lines(git(["rev-list", sha, `^${base}`]))]);
    const prior =
        (r.ok ? r.data.recent : []).find((v) => v.sha !== sha && chain.has(v.sha) && FULL_RUN_STATES.has(v.state)) ??
        null;
    const affected = JSON.parse(
        execFileSync(
            "pnpm",
            ["exec", "nx", "show", "projects", "--affected", `--base=${base}`, `--head=${sha}`, "--json"],
            {
                encoding: "utf8",
            },
        ).trim() || "[]",
    );
    if (lines(git(["diff", "--name-only", base, sha])).includes("pnpm-lock.yaml")) affected.push("*lockfile*");
    const visual = visualProjects(JSON.parse(readFileSync("visual-review.config.json", "utf8")));
    const p = planOf({ prior, affected, shards: shardsOf, visual });
    const tests = p.shards ? "shards " + p.shards : "the whole suite";
    const whole = p.capture.join(", ") || (p.shards ? "none" : "every project");
    console.log(`::notice::re-test of ${sha.slice(0, 12)}: ${tests}; screenshots shot whole: ${whole}`);
    output({
        shards: p.shards,
        hosts: String(p.hosts),
        macos: String(p.macos),
        capture: JSON.stringify(p.capture),
        source_run: p.sourceRun,
    });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const cmd = { advance, plan }[process.argv[2]];
    if (!cmd) {
        console.error("usage: node tools/channel/candidate-fix.mjs advance | plan (see the head of the file)");
        process.exit(2);
    }
    try {
        await cmd(process.env);
    } catch (error) {
        console.log(`::error::${error.message}`);
        process.exitCode = 1;
    }
}
