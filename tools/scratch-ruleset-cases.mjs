#!/usr/bin/env node
/**
 * scratch-ruleset-cases.mjs -- the trial cases for the master ruleset planned in design/ci/channels-pipeline.md
 * (section 13 item 5), run against the scratch ruleset "scratch ruleset trial" on branch scratch/ruleset-trial
 * (tmp/scratch-ruleset.sh makes both). Issue #3435, part of #3418.
 *
 *   node tools/scratch-ruleset-cases.mjs --dry-run           # the plan; no GitHub write
 *   node tools/scratch-ruleset-cases.mjs [--post]            # run it (with run_in_background), --post comments on #3418
 *       [--interval <s>] (300 or more)  [--max-hours <h>] (4)
 *       [--reset]  first force-update scratch/ruleset-trial to origin/master (a run refuses to start when its
 *                  tip is not on master, as after an earlier run merged its src-merges case into it)
 *
 * It opens one pull request per case into scratch/ruleset-trial as graphty-agent, polls all of them in one
 * GraphQL query at most every 5 minutes, judges each against its expectation, prints a table, and at the end
 * closes its pull requests and deletes its branches. It never uses the owner's credentials. Exit 0 when every
 * case matched, 1 when one did not, 2 when it refused to start, 4 on a GitHub rate limit.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs as parseCli } from "node:util";

export const REPO = "graphty-org/graphty-monorepo";
export const BASE = "scratch/ruleset-trial";
export const RULESET = "scratch ruleset trial";
export const LOG_ISSUE = 3418;
export const REQUIRED = ["All Checks Pass", "Lint PR Title", "Link PR Issue", "PR Integrity"];
const INTEGRITY = "PR Integrity";
// A 1x1 PNG, stored as a plain blob: no signed approval names it, which is the point of the case.
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
);

const note = (id, stamp) => `design/ci/scratch-ruleset-trial/${id}-${stamp}.md`;
const text = (s) => `Scratch ruleset trial file (#3435), ${s}. Deleted with its branch.\n`;

/**
 * The ten cases. `files(stamp, read)` gives the commit's changes as { path: content }; `read(path)` reads the
 * base. `from: "parent"` starts the branch at the base's first parent, so merging the base later is a merge
 * of master. `after` is a second commit pushed after the review is posted.
 */
export const CASES = [
    {
        id: "owned-waits",
        what: "an owned path (tools/results/, in .github/CODEOWNERS) with auto-merge on waits for code-owner review",
        title: "test(tools): scratch ruleset trial, owned path",
        files: (s) => ({ [`tools/results/scratch-ruleset-trial-${s}.txt`]: text("owned path") }),
        reviewed: true,
        autoMerge: true,
        expect: { kind: "waits" },
    },
    {
        id: "src-merges",
        what: "a graphty/src/ change with auto-merge on merges once the required checks pass",
        title: "test(graphty): scratch ruleset trial, unowned path",
        files: (s, read) => ({
            "graphty/src/App.tsx": `${read("graphty/src/App.tsx")}// scratch ruleset trial ${s}\n`,
        }),
        reviewed: true,
        autoMerge: true,
        expect: { kind: "merges" },
    },
    {
        id: "admin-refused",
        what: "gh pr merge --admin on the waiting owned-path pull request is refused",
        uses: "owned-waits",
        expect: { kind: "admin" },
    },
    {
        id: "revert-passes",
        what: "a revert of the newest first-parent merge of master passes PR Integrity with no Proof or review",
        revert: true,
        expect: { kind: "integrity", want: "SUCCESS" },
    },
    {
        id: "accept-only-passes",
        what: "an accept-only pull request (a visual-baselines/reviews/ record) passes PR Integrity with no Proof",
        title: "test(visual-review): scratch ruleset trial, accept-only",
        files: (s) => ({ [`visual-baselines/reviews/scratch-ruleset-trial-${s}.json`]: '{ "trial": true }\n' }),
        expect: { kind: "integrity", want: "SUCCESS" },
    },
    {
        id: "dependabot-passes",
        what: "an open Dependabot pull request passes PR Integrity (read only: it is observed, never touched)",
        observe: "dependabot",
        expect: { kind: "integrity", want: "SUCCESS" },
    },
    {
        id: "breaking-fails",
        what: "a 'feat!:' title fails PR Integrity (Proof and review present, so only the title can fail it)",
        title: "feat(tools)!: scratch ruleset trial, breaking title",
        files: (s, _r, id) => ({ [note(id, s)]: text("breaking title") }),
        reviewed: true,
        expect: { kind: "integrity", want: "FAILURE", rule: "Breaking change:", only: true },
    },
    {
        id: "unsigned-png-fails",
        what: "a baseline PNG with no signed approval fails PR Integrity",
        title: "test(visual-review): scratch ruleset trial, unsigned png",
        files: (s) => ({ [`visual-baselines/graphty/scratch-ruleset-trial-${s}.png`]: PNG }),
        expect: { kind: "integrity", want: "FAILURE", rule: "Baselines signed:" },
    },
    {
        id: "master-merge-keeps-review",
        what: "merging master into a reviewed pull request keeps its fresh review (PR Integrity passes on the merge)",
        title: "test(tools): scratch ruleset trial, master merge",
        files: (s, _r, id) => ({ [note(id, s)]: text("master merge") }),
        from: "parent",
        reviewed: true,
        after: "merge-base",
        expect: { kind: "integrity", want: "SUCCESS" },
    },
    {
        id: "fix-push-drops-review",
        what: "a fix commit pushed after the review makes the review stale (PR Integrity fails on the fix)",
        title: "test(tools): scratch ruleset trial, fix push",
        files: (s, _r, id) => ({ [note(id, s)]: text("fix push") }),
        reviewed: true,
        after: "fix",
        expect: { kind: "integrity", want: "FAILURE", rule: "Fresh review:" },
    },
];

/**
 * The newest run of a check on a commit, from a statusCheckRollup's contexts.
 * @param contexts CheckRun nodes ({ name, status, conclusion, startedAt, annotations }) or StatusContext ones
 * @param name the check's name
 * @returns `{ result, notes }` (result "PENDING" or the conclusion, notes its annotation messages), or null
 */
export function latestRun(contexts, name) {
    const runs = contexts
        .map((c) =>
            c.__typename === "StatusContext"
                ? { name: c.context, at: c.createdAt, result: c.state === "PENDING" ? "PENDING" : c.state }
                : { name: c.name, at: c.startedAt, result: c.status === "COMPLETED" ? c.conclusion : "PENDING" },
        )
        // Only the check's own annotations (title = its name, as `::error title=PR Integrity::` writes them), never
        // GitHub's "Process completed with exit code 1."
        .map((r, i) => ({
            ...r,
            notes: (contexts[i].annotations?.nodes ?? []).filter((a) => a.title === r.name).map((a) => a.message),
        }))
        .filter((r) => r.name === name)
        // A run not yet started (no time) is a queued re-run, so it sorts newest (as tools/pr-status-broker.mjs).
        .sort((a, b) => String(a.at ?? "9999").localeCompare(String(b.at ?? "9999")));
    return runs.at(-1) ?? null;
}

/**
 * The newest run's result of a check on a commit.
 * @param contexts as latestRun
 * @param name the check's name
 * @returns "PENDING", the conclusion ("SUCCESS", "FAILURE", ...) or null when it never ran
 */
export const latestCheck = (contexts, name) => latestRun(contexts, name)?.result ?? null;

// Dependabot's commit author email; GitHub maps it to the dependabot[bot] account.
const DEPENDABOT_EMAIL = "49699333+dependabot[bot]@users.noreply.github.com";

/**
 * One pull request's state, as the judge reads it.
 * @param node a pullRequest node of the poll query
 * @returns its number, state, merged, reviewDecision and checks (name to result)
 */
export function observe(node) {
    const contexts = node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes ?? [];
    const names = new Set([...REQUIRED, ...contexts.map((c) => c.name ?? c.context)]);
    return {
        number: node.number,
        state: node.state,
        merged: node.merged,
        reviewDecision: node.reviewDecision,
        checks: Object.fromEntries([...names].map((n) => [n, latestCheck(contexts, n)])),
        // The annotation messages of the newest PR Integrity run: one per problem, "<Rule>: ...".
        integrityNotes: latestRun(contexts, INTEGRITY)?.notes ?? [],
        // Only on the Dependabot search: every commit is Dependabot's own, as PR Integrity's onlyDependabot
        // reads it: Dependabot's author, signed by web-flow (GitHub's committer) with a valid signature.
        dependabotOnly: node.owned?.nodes?.every(
            ({ commit: c }) =>
                c?.author?.email === DEPENDABOT_EMAIL &&
                c.signature?.signer?.login === "web-flow" &&
                c.signature.isValid === true,
        ),
    };
}

const failedRequired = (o) => REQUIRED.filter((n) => o.checks[n] && !["PENDING", "SUCCESS"].includes(o.checks[n]));
const checkText = (o) => REQUIRED.map((n) => n + "=" + (o.checks[n] ?? "none")).join(" ");
const describe = (o) => `merged=${o.merged} review=${o.reviewDecision ?? "none"} ${checkText(o)}`;
const unfinished = (o) => REQUIRED.some((n) => !o.checks[n] || o.checks[n] === "PENDING");

const JUDGES = {
    // o.kind: "refused" (the ruleset's own refusal), "skip" (no admin rights to try), "merged" or "error".
    admin: (_e, o) => ({
        verdict: { refused: "pass", skip: "skip" }[o.kind] ?? "fail",
        actual:
            { refused: "refused: ", skip: "skipped: ", merged: "merged with --admin", error: "" }[o.kind] +
            (o.output ?? ""),
    }),
    // A FAILURE case passes only when its own rule fired (e.rule, the annotation's prefix), and with e.only
    // when no other rule did.
    integrity: (e, o) => {
        const got = o.checks[INTEGRITY];
        if (!got || got === "PENDING") return { verdict: "pending", actual: `PR Integrity ${got ?? "not run"}` };
        const rules = [...new Set((o.integrityNotes ?? []).map((n) => n.split(":")[0] + ":"))];
        const actual = `PR Integrity ${got}` + (rules.length ? ` (${rules.join(" ")})` : "");
        const ruleOk = !e.rule || (rules.includes(e.rule) && (!e.only || rules.length === 1));
        return { verdict: got === e.want && ruleOk ? "pass" : "fail", actual };
    },
    merges: (_e, o) => {
        if (o.merged) return { verdict: "pass", actual: "merged" };
        const bad = failedRequired(o).length > 0 || o.state === "CLOSED";
        return { verdict: bad ? "fail" : "pending", actual: describe(o) };
    },
    // Settled once every required check finished; then it must still be open, wanting a review.
    waits: (_e, o) => {
        if (o.merged) return { verdict: "fail", actual: "merged without a code-owner review" };
        if (unfinished(o)) return { verdict: "pending", actual: describe(o) };
        const ok = failedRequired(o).length === 0 && o.reviewDecision === "REVIEW_REQUIRED";
        return { verdict: ok ? "pass" : "fail", actual: describe(o) };
    },
};

/**
 * Whether a case met its expectation.
 * @param expect the case's expectation
 * @param o observe() of its pull request, or for "admin" `{ refused, output }`
 * @returns the verdict ("pending", "pass" or "fail") and what was seen (actual)
 */
export function judge(expect, o) {
    return o ? JUDGES[expect.kind](expect, o) : { verdict: "pending", actual: "not observed yet" };
}

const expectText = (e) =>
    ({ waits: "open, REVIEW_REQUIRED, checks green", merges: "merged", admin: "--admin refused" })[e.kind] ??
    `PR Integrity ${e.want}`;

/**
 * The results as a plain-ASCII table.
 * @param rows [{ id, expected, actual, verdict, pr }]
 * @returns the table
 */
export function table(rows) {
    const cols = ["case", "pr", "expected", "actual", "verdict"];
    const cells = rows.map((r) => [r.id, r.pr ? `#${r.pr}` : "-", r.expected, r.actual, r.verdict]);
    const width = cols.map((c, i) => Math.max(c.length, ...cells.map((row) => String(row[i]).length)));
    const line = (row) =>
        row
            .map((c, i) => String(c).padEnd(width[i]))
            .join(" | ")
            .trimEnd();
    return [line(cols), width.map((w) => "-".repeat(w)).join("-+-"), ...cells.map(line)].join("\n");
}

// ---------------------------------------------------------------------------------------------------------
// GitHub and git, as graphty-agent. Everything below needs the network; the parts above are pure.

/** A GitHub rate limit: the run stops (exit 4) instead of retrying. */
export class RateLimit extends Error {}

let indexCount = 0;

const agentEnv = () => {
    const env = { ...process.env, GIT_CONFIG_GLOBAL: `${process.env.HOME}/.config/git-agent/config` };
    env.GH_CONFIG_DIR = `${process.env.HOME}/.config/gh-agent`;
    for (const k of ["GH_TOKEN", "GITHUB_TOKEN", "GIT_CONFIG_PARAMETERS"]) delete env[k];
    return env;
};

function run(cmd, args, { input, env, cwd } = {}) {
    try {
        return execFileSync(cmd, args, {
            input,
            cwd,
            env: env ?? agentEnv(),
            encoding: "utf8",
            maxBuffer: 1 << 28,
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
    } catch (e) {
        const msg = `${e.stderr ?? ""}${e.stdout ?? ""}`;
        if (/rate limit/iu.test(msg)) throw new RateLimit(msg.trim());
        e.message = `${cmd} ${args.join(" ")}: ${msg.trim() || e.message}`;
        throw e;
    }
}

const gh = (args, input) => run("gh", args, { input });

/**
 * A signed commit made with plumbing in a private index, so no worktree, hook or checkout is touched.
 * @param ctx { root, tmp }
 * @param parents parent shas, the first being the tree's start
 * @param files { path: string | Buffer }
 * @param message the commit message
 * @param tree a tree to use instead (the revert and merge cases)
 * @returns the commit sha
 */
function commit(ctx, parents, files, message, tree) {
    const g = (args, input) => run("git", args, { input, cwd: ctx.root });
    if (!tree) {
        const env = { ...agentEnv(), GIT_INDEX_FILE: join(ctx.tmp, `index-${++indexCount}`) };
        const gi = (args, input) => run("git", args, { input, env, cwd: ctx.root });
        gi(["read-tree", parents[0]]);
        for (const [path, content] of Object.entries(files)) {
            const blob = gi(["hash-object", "-w", "--stdin"], content);
            gi(["update-index", "--add", "--cacheinfo", `100644,${blob},${path}`]);
        }
        tree = gi(["write-tree"]);
    }
    return g(["commit-tree", "-S", tree, ...parents.flatMap((p) => ["-p", p]), "-F", "-"], message);
}

const bodyFor = (c, stamp, proof) =>
    [
        `Scratch ruleset trial (#3435, run ${stamp}): ${c.what}.`,
        "Opened by tools/scratch-ruleset-cases.mjs into scratch/ruleset-trial; it closes this pull request itself.",
        "",
        "Refs #3435",
        ...(proof
            ? ["", "## Proof", "", "A scratch ruleset trial case; the runner judges its checks and merge state."]
            : []),
    ].join("\n");

/**
 * The plan: each case's branch and commits, made locally (real run) or only described (dry run).
 * @param ctx { root, tmp, base, stamp, make }
 * @returns [{ case, branch, title, head, after, describe }]
 */
function plan(ctx) {
    const git = (...args) => run("git", args, { cwd: ctx.root });
    const read = (path) => git("show", `${ctx.base}:${path}`) + "\n";
    const parent = git("rev-parse", `${ctx.base}^1`);
    const reverted = git("rev-list", "--first-parent", "--merges", "-1", ctx.base);
    return CASES.filter((c) => !c.uses && !c.observe).map((c) => {
        const start = c.from === "parent" ? parent : ctx.base;
        const p = { case: c, branch: `scratch/trial-${ctx.stamp}-${c.id}`, title: c.title, describe: [] };
        if (c.revert) return planRevert(ctx, p, start, reverted, git);
        const files = c.files(ctx.stamp, read, c.id);
        p.describe.push(`${c.title} on ${start.slice(0, 10)}: ${Object.keys(files).join(", ")}`);
        if (ctx.make) p.head = commit(ctx, [start], files, `${c.title}\n\nRefs #3435\n`);
        if (c.after) planAfter(ctx, p, files, git);
        return p;
    });
}

/**
 * The revert case: exactly the tree PR Integrity's revert check computes, on a commit naming the merge.
 * @param ctx the plan's context
 * @param p the case's plan entry, filled in
 * @param start the branch's start
 * @param reverted the merge it reverts
 * @param git git in the repository
 * @returns p
 */
function planRevert(ctx, p, start, reverted, git) {
    const subject = git("log", "-1", "--format=%s", reverted);
    p.title = `revert: scratch ruleset trial, revert of ${reverted.slice(0, 10)}`;
    p.describe.push(`revert -m 1 ${reverted.slice(0, 10)} ("${subject}") on ${start.slice(0, 10)}`);
    if (ctx.make) {
        const tree = git("merge-tree", "--write-tree", `--merge-base=${reverted}`, start, `${reverted}^1`).split(
            "\n",
        )[0];
        const msg = `Revert "${subject}"\n\nThis reverts commit ${reverted}.\n\nRefs #3435\n`;
        p.head = commit(ctx, [start], {}, msg, tree);
    }
    return p;
}

/**
 * The second commit, pushed after the review: a merge of master, or a fix to the branch's own file.
 * @param ctx the plan's context
 * @param p the case's plan entry, filled in
 * @param files the first commit's changes
 * @param git git in the repository
 */
function planAfter(ctx, p, files, git) {
    if (p.case.after === "merge-base") {
        p.describe.push(`after the review: merge ${ctx.base.slice(0, 10)} (a master commit) into it`);
        if (!ctx.make) return;
        const tree = git("merge-tree", "--write-tree", p.head, ctx.base).split("\n")[0];
        p.after = commit(
            ctx,
            [p.head, ctx.base],
            {},
            `Merge master (${ctx.base.slice(0, 10)}) into ${p.branch}\n`,
            tree,
        );
        return;
    }
    p.describe.push("after the review: a fix commit changing the same file");
    if (!ctx.make) return;
    const more = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, `${v}fixed\n`]));
    p.after = commit(ctx, [p.head], more, "test(tools): scratch ruleset trial, the fix\n\nRefs #3435\n");
}

const POLL = `query($q: String!) { repository(owner: "graphty-org", name: "graphty-monorepo") { %PRS% }
  dependabot: search(query: $q, type: ISSUE, first: 10) { nodes { ... on PullRequest { %FIELDS%
  owned: commits(first: 100) { nodes { commit { author { email } signature { isValid signer { login } } } } }
  } } } }`;
const FIELDS = `number state merged reviewDecision commits(last: 1) { nodes { commit { statusCheckRollup {
  contexts(first: 100) { nodes { __typename ... on CheckRun { name status conclusion startedAt
    annotations(first: 20) { nodes { title message } } }
  ... on StatusContext { context state createdAt } } } } } } }`;

/**
 * One GraphQL query for every trial pull request and the open Dependabot ones.
 * @param numbers the trial pull requests
 * @returns prs (number to observation) and dependabot (observations)
 */
function poll(numbers) {
    const prs = numbers.map((n) => `p${n}: pullRequest(number: ${n}) { ${FIELDS} }`).join("\n");
    const query = POLL.replace("%PRS%", prs).replaceAll("%FIELDS%", FIELDS);
    const q = `repo:${REPO} is:pr is:open author:app/dependabot`;
    const data = JSON.parse(gh(["api", "graphql", "-f", `query=${query}`, "-f", `q=${q}`])).data;
    return {
        prs: Object.fromEntries(numbers.map((n) => [n, observe(data.repository[`p${n}`])])),
        dependabot: data.dependabot.nodes.filter((n) => n.number).map(observe),
    };
}

/**
 * The newest Dependabot pull request whose PR Integrity finished and whose commits are all Dependabot's own
 * (one with a merge of master is an agent pull request to PR Integrity, rightly failed without a Proof).
 * @param list observations of the open Dependabot pull requests
 * @returns one observation, or null (the case is then skipped)
 */
export const pickDependabot = (list) =>
    [...list]
        .sort((a, b) => b.number - a.number)
        .find((o) => o.dependabotOnly && !["PENDING", null].includes(o.checks[INTEGRITY])) ?? null;

/**
 * --reset: force-update the scratch branch to origin/master (that one ref only).
 * @param io { gh, git } (git in the repository)
 * @returns the sha it now points at
 */
export function resetBase(io) {
    const sha = io.git(["rev-parse", "origin/master"]);
    try {
        io.gh(["api", "-X", "PATCH", `repos/${REPO}/git/refs/heads/${BASE}`, "-f", `sha=${sha}`, "-F", "force=true"]);
    } catch (e) {
        if (e instanceof RateLimit) throw e;
        throw new Error(
            `could not reset ${BASE} to origin/master (${sha.slice(0, 10)}): ${e.message.split("\n").at(-1)}. ` +
                `The scratch ruleset refuses a force-update to everyone but deploy keys; the owner resets it with ` +
                `"bash tmp/scratch-ruleset-reset.sh"`,
        );
    }
    console.log(`reset ${BASE} to origin/master (${sha.slice(0, 10)})`);
    return sha;
}

/**
 * Refuses a base that is not on master: every case is built on the premise that the base is a master commit.
 * @param base the scratch branch's tip
 * @param io { git }
 */
export function requireOnMaster(base, io) {
    try {
        io.git(["merge-base", "--is-ancestor", base, "origin/master"]);
    } catch {
        throw new Error(
            `the tip of ${BASE} (${base.slice(0, 10)}) is not on origin/master, so the revert, accept-only and ` +
                "master-merge cases would test the wrong thing; run again with --reset",
        );
    }
}

function preflight(root, dryRun) {
    let found = false;
    try {
        found = gh(["api", "--paginate", "--jq", ".[].name", `repos/${REPO}/rulesets`])
            .split("\n")
            .includes(RULESET);
    } catch (e) {
        if (e instanceof RateLimit) throw e;
        if (!dryRun) throw new Error(`cannot list the rulesets of ${REPO}: ${e.message}`);
    }
    const remote = run("git", ["ls-remote", "origin", `refs/heads/${BASE}`], { cwd: root });
    if (dryRun) return { found, remote: Boolean(remote) };
    if (!found) {
        throw new Error(
            `the ruleset '${RULESET}' does not exist on ${REPO}. The owner makes it with "bash tmp/scratch-ruleset.sh" ` +
                "once .github/workflows/pr-integrity.yml is on master; nothing was created",
        );
    }
    if (!remote) throw new Error(`branch ${BASE} does not exist on GitHub; tmp/scratch-ruleset.sh creates it`);
    return { found, remote: true };
}

function caseLines(c, p) {
    if (c.uses) return [`  on the pull request of ${c.uses}, once its checks are green: gh pr merge --admin --merge`];
    if (!p) return ["  no branch: reads the open Dependabot pull requests in the poll query"];
    const flags = [c.autoMerge && "auto-merge on", c.reviewed && "Proof and fresh review"].filter(Boolean);
    const suffix = flags.length ? ` (${flags.join(", ")})` : "";
    return [`  branch: ${p.branch}${suffix}`, ...p.describe.map((d) => `  commit: ${d}`)];
}

function printPlan(planned, base, pre) {
    const from = pre.remote ? BASE : `origin/master (standing in for ${BASE})`;
    console.log(`scratch ruleset trial plan, base ${from} at ${base.slice(0, 10)}`);
    const ruleset = pre.found ? "present" : "MISSING (a real run refuses)";
    console.log(`ruleset '${RULESET}': ${ruleset}; branch ${BASE}: ${pre.remote ? "present" : "missing"}`);
    for (const c of CASES) {
        console.log(`\n${c.id}: ${c.what}`);
        console.log(`  expect: ${expectText(c.expect)}`);
        for (const line of caseLines(
            c,
            planned.find((x) => x.case === c),
        ))
            console.log(line);
    }
}

async function open(planned, stamp, root) {
    const { patchId } = await import("./pr-integrity.mjs");
    const push = (refs) =>
        run("git", ["-c", "core.hooksPath=/dev/null", "push", "-q", "origin", ...refs], { cwd: root });
    push(planned.map((p) => `${p.head}:refs/heads/${p.branch}`));
    for (const p of planned) {
        const c = p.case;
        const url = gh([
            "pr",
            "create",
            "--base",
            BASE,
            "--head",
            p.branch,
            "--title",
            p.title,
            "--body",
            bodyFor(c, stamp, c.reviewed),
        ]);
        p.pr = Number(url.split("/").at(-1));
        console.log(`opened ${c.id}: ${url}`);
        if (c.reviewed) {
            const mb = run("git", ["merge-base", "origin/master", p.head], { cwd: root });
            const id = patchId(root, mb, p.head);
            gh([
                "pr",
                "review",
                String(p.pr),
                "--comment",
                "--body",
                `<!-- fresh-review ${id} -->\nScratch ruleset trial review (#3435).`,
            ]);
        }
        if (c.autoMerge) gh(["pr", "merge", String(p.pr), "--auto", "--merge"]);
    }
    const later = planned.filter((p) => p.after);
    if (later.length) push(later.map((p) => `${p.after}:refs/heads/${p.branch}`));
}

// GitHub's own refusal of a merge the ruleset blocks (GraphQL mergePullRequest), not any failure.
export const RULESET_REFUSAL = /Repository rule violations found|Waiting on code owner review/iu;

/**
 * The --admin attempt. Only an account with admin rights can show the ruleset refusing an admin, so without
 * them the case is skipped; only GitHub's rule-violation refusal passes it.
 * @param pr the waiting owned-path pull request
 * @param io { gh }
 * @returns the outcome: `{ kind, output }`, kind "refused", "skip", "merged" or "error"
 */
export function tryAdmin(pr, io) {
    const firstLine = (e) => e.message.split("\n").find((l) => l.trim()) ?? "";
    try {
        if (io.gh(["api", `repos/${REPO}`, "-q", ".permissions.admin"]) !== "true") {
            return { kind: "skip", output: "this account has no admin rights on the repository" };
        }
        io.gh(["pr", "merge", String(pr), "--admin", "--merge"]);
        return { kind: "merged", output: "" };
    } catch (e) {
        if (e instanceof RateLimit) throw e;
        const msg = e.message.replaceAll(/\s+/gu, " ");
        const hit = RULESET_REFUSAL.exec(msg);
        if (hit) return { kind: "refused", output: msg.slice(hit.index, hit.index + 120) };
        return { kind: "error", output: `not the ruleset's refusal: ${firstLine(e).slice(0, 120)}` };
    }
}

/**
 * Closes every trial pull request and deletes every trial branch. Never throws: what it could not remove (a
 * rate limit included) is printed and returned, so the caller always reaches its own cleanup.
 * @param planned the plan entries
 * @param io { gh, deleteBranch }
 * @returns the plan entries left behind
 */
export function cleanup(planned, io) {
    const left = [];
    for (const p of planned) {
        try {
            if (p.pr) io.gh(["pr", "close", String(p.pr), "--delete-branch"]);
            else if (p.head) io.deleteBranch(p.branch);
        } catch (e) {
            if (e instanceof RateLimit) {
                left.push(p);
                continue;
            }
            // A merged pull request cannot be closed: delete its branch.
            try {
                io.deleteBranch(p.branch);
            } catch {
                left.push(p);
            }
        }
    }
    if (left.length) {
        const what = left.map((p) => `${p.branch} (pull request ${p.pr ? "#" + p.pr : "none"})`).join(", ");
        console.log(`cleanup: left open, close them by hand: ${what}`);
    }
    return left;
}

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

/**
 * Judges every case on one poll; tries --admin once the owned-path pull request is waiting.
 * @param byCase the plan entries by case id
 * @param seen poll()
 * @param state { admin }: the --admin attempt, made once
 * @returns the results by case id
 */
function judgeAll(byCase, seen, state) {
    const results = {};
    for (const c of CASES) {
        let o = seen.prs[byCase[c.id]?.pr];
        if (c.observe) o = pickDependabot(seen.dependabot);
        if (c.uses) o = state.admin;
        results[c.id] = { ...judge(c.expect, o), pr: c.observe ? o?.number : byCase[c.uses ?? c.id]?.pr };
    }
    const admin = CASES.find((c) => c.uses);
    const owned = results[admin.uses];
    if (!state.admin && owned.verdict === "pass") {
        state.admin = tryAdmin(owned.pr, { gh });
        results[admin.id] = { ...judge(admin.expect, state.admin), pr: owned.pr };
    } else if (!state.admin && owned.verdict === "fail") {
        results[admin.id] = { verdict: "fail", actual: `not tried: ${admin.uses} did not wait`, pr: owned.pr };
    }
    return results;
}

async function watch(planned, { interval, maxHours }) {
    const byCase = Object.fromEntries(planned.map((p) => [p.case.id, p]));
    const state = { admin: null };
    const deadline = Date.now() + maxHours * 3600e3;
    let results = {};
    for (;;) {
        await sleep(interval);
        try {
            results = judgeAll(byCase, poll(planned.map((p) => p.pr)), state);
            const open = CASES.filter((c) => !c.observe && results[c.id].verdict === "pending");
            console.log(`${new Date().toISOString()} pending: ${open.map((c) => c.id).join(", ") || "none"}`);
            if (!open.length) return results;
        } catch (e) {
            if (e instanceof RateLimit) throw e;
            // A 502 or a network blip: one bad poll must not end a run of hours.
            console.log(`${new Date().toISOString()} poll failed, retried next interval: ${e.message.split("\n")[0]}`);
        }
        if (Date.now() > deadline) return results;
    }
}

function finish(results, post) {
    const rows = CASES.map((c) => {
        const r = results[c.id] ?? { verdict: "pending", actual: "never observed" };
        // The Dependabot case only observes; with no finished run it is skipped, never failed.
        const verdict = c.observe && r.verdict === "pending" ? "skip" : r.verdict;
        return { id: c.id, pr: r.pr, expected: expectText(c.expect), actual: r.actual, verdict };
    });
    const out = table(rows);
    console.log(`\n${out}`);
    if (post) {
        const body = `Scratch ruleset trial (#3435), run by tools/scratch-ruleset-cases.mjs against '${RULESET}' on ${BASE}:\n\n\`\`\`\n${out}\n\`\`\`\n`;
        gh(["issue", "comment", String(LOG_ISSUE), "--repo", REPO, "--body-file", "-"], body);
    }
    const ok = allMatched(rows);
    if (!ok && rows.some((r) => r.id === "admin-refused" && r.verdict === "skip")) {
        console.log("admin-refused was not shown: it needs a run by an account with admin rights on the repository");
    }
    return ok ? 0 : 1;
}

/**
 * Whether a run showed every case. Only the Dependabot case may skip (no open Dependabot pull request to
 * observe); a skipped admin case was not shown, so the run is not all matched.
 * @param rows finish()'s rows
 * @returns boolean
 */
export const allMatched = (rows) =>
    rows.every((r) => r.verdict === "pass" || (r.verdict === "skip" && r.id === "dependabot-passes"));

/**
 * The command line.
 * @param argv the arguments after the script
 * @returns the options
 */
export function parseArgs(argv) {
    const { values } = parseCli({
        args: argv,
        options: {
            "dry-run": { type: "boolean", default: false },
            post: { type: "boolean", default: false },
            reset: { type: "boolean", default: false },
            interval: { type: "string", default: "300" },
            "max-hours": { type: "string", default: "4" },
        },
    });
    const o = {
        dryRun: values["dry-run"],
        post: values.post,
        reset: values.reset,
        interval: Math.max(300, Number(values.interval)),
        maxHours: Number(values["max-hours"]),
    };
    if (Number.isNaN(o.interval) || Number.isNaN(o.maxHours) || o.maxHours <= 0) {
        throw new Error("--interval must be a number of seconds, --max-hours above 0");
    }
    return o;
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    const root = run("git", ["rev-parse", "--show-toplevel"]);
    const pre = preflight(root, opts.dryRun);
    const ref = pre.remote ? `origin/${BASE}` : "origin/master";
    const io = { gh, git: (args) => run("git", args, { cwd: root }) };
    const fetch = () =>
        io.git([
            "fetch",
            "-q",
            "origin",
            "master",
            ...(pre.remote ? [`+refs/heads/${BASE}:refs/remotes/origin/${BASE}`] : []),
        ]);
    fetch();
    if (opts.reset && !opts.dryRun) {
        resetBase(io);
        fetch();
    }
    const base = io.git(["rev-parse", ref]);
    if (pre.remote && !opts.dryRun) requireOnMaster(base, io);
    const stamp = new Date().toISOString().replaceAll(/[-:]/gu, "").slice(0, 13);
    const tmp = mkdtempSync(join(tmpdir(), "scratch-ruleset-"));
    const planned = plan({ root, tmp, base, stamp, make: !opts.dryRun });
    if (opts.dryRun) {
        printPlan(planned, base, pre);
        rmSync(tmp, { recursive: true, force: true });
        return 0;
    }
    try {
        await open(planned, stamp, root);
        return finish(await watch(planned, opts), opts.post);
    } finally {
        cleanup(planned, {
            gh,
            deleteBranch: (b) => io.git(["-c", "core.hooksPath=/dev/null", "push", "-q", "origin", "--delete", b]),
        });
        rmSync(tmp, { recursive: true, force: true });
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        process.exitCode = await main();
    } catch (e) {
        const limited = e instanceof RateLimit;
        console.error(`scratch-ruleset-cases: ${limited ? "GitHub rate limit; stopped. " : ""}${e.message}`);
        process.exitCode = limited ? 4 : 2;
    }
}
