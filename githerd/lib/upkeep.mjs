/**
 * Pull request updates and stack upkeep, the `upkeep` write group (design 3.3 and 4.6, "Updates"
 * and "Stacks"). githerd updates a pull request only for a reason Mergify does not cover (its
 * failing key was fixed on master, its stack base moved, it was unparked) and never just to merge
 * it. The paths, in order of preference:
 *
 * 1. a conflict only under `visual-baselines/`: the review tool's `visual-review update <pr>`, which
 *    takes master's side of each baseline and accepts nothing. It merges master's tip and pushes
 *    with `--no-verify`, so it runs only when master's tip is the CI-green commit, as an entry of
 *    the push queue;
 * 2. no conflict and the commit to merge is the base branch's tip: `PUT /pulls/{n}/update-branch`
 *    with `expected_head_sha`, a signed merge commit made by GitHub; a stale head answers 422;
 * 3. no conflict otherwise: a signed merge commit made locally (`git merge-tree` and
 *    `git commit-tree`, no checkout), checked out in a daemon worktree and pushed through the push
 *    queue, gate included.
 *
 * Any other conflict is the caller's: a `pr` job resolves it. A stacked child is updated from its
 * base pull request's head the same way, and a child whose base merged is retargeted to master.
 * Nothing here writes unless the group is `acting`; otherwise each step is a `would-do` line.
 *
 * githerd never runs git stash, reset, checkout of a file, clean or rebase.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { stackSteps } from "./prs.mjs";
import { run } from "./worktrees.mjs";

const GROUP = "upkeep";
const BASELINES = "visual-baselines/";
const REVIEW_TOOL = ["node", "visual-review/trusted/cli.mjs", "update"];

/**
 * @typedef {import("./prs.mjs").StackPr} StackPr
 * @typedef {(entry: {kind: string} & Record<string, unknown>) => unknown} Ledger
 * @typedef {{code: number, stdout: string, stderr: string}} RunResult
 * @typedef {(label: string, task: () => Promise<RunResult>) => Promise<RunResult>} PushQueue runs
 *   one push-queue entry (a push with the gate, or the review tool) and answers its result
 * @typedef {{
 *   gh: {write: Function},
 *   repo: string,
 *   root: string,
 *   mode: (group: string) => string,
 *   ledger: Ledger,
 *   queue?: PushQueue,
 *   env?: Record<string, string | undefined>,
 *   remote?: string,
 *   branch?: string,
 *   reviewTool?: string[],
 *   own?: (sha: string) => void,
 * }} Context the GitHub client, `owner/name`, the main checkout, each group's mode, the ledger, the
 *   push queue, the environment git and the review tool run with (the owner's signing variables),
 *   the remote, the default branch, the review tool's update command (the pull request's
 *   number is appended), and what records a head githerd pushed as its own
 * @typedef {{path: "review-tool" | "update-branch" | "local" | "none",
 *   result: "updated" | "would-do" | "current" | "conflict" | "stale" | "wait" | "failed",
 *   conflicts?: string[], why?: string}} UpdateResult which path was taken and how it ended:
 *   `conflict` needs a `pr` job; for a stacked child, every result but `updated`, `current` and
 *   `would-do` is judged again on the next reconcile
 */

// ponytail: no queue until the daemon's push queue exists; pass it as `queue` then.
/**
 * Runs a push-queue entry at once.
 * @param {string} _label the entry's label
 * @param {() => Promise<RunResult>} task the entry
 * @returns {Promise<RunResult>} its result
 */
const defaultQueue = (_label, task) => task();

/**
 * Runs git in `root` with the context's environment and never throws.
 * @param {Context} ctx the context
 * @param {string[]} args git's arguments
 * @param {string} [cwd] where to run it, the main checkout by default
 * @returns {Promise<RunResult>} exit code and output
 */
const git = (ctx, args, cwd = ctx.root) => run("git", args, { cwd, env: ctx.env ?? process.env });

/**
 * Runs git and answers its trimmed output, throwing with git's message on failure.
 * @param {Context} ctx the context
 * @param {string[]} args git's arguments
 * @param {string} [cwd] where to run it
 * @returns {Promise<string>} stdout, trimmed
 */
async function gitOut(ctx, args, cwd) {
    const r = await git(ctx, args, cwd);
    if (r.code !== 0) throw new Error(`git ${args[0]} failed: ${(r.stderr || r.stdout).trim()}`);
    return r.stdout.trim();
}

/**
 * The paths that conflict when `onto` is merged into `head`, from `git merge-tree` (no checkout).
 * @param {Context} ctx the context; both commits must be in its object store
 * @param {string} head the pull request's head
 * @param {string} onto the commit to merge
 * @returns {Promise<{tree: string, conflicts: string[]}>} the merged tree and the conflicting
 *   paths (none for a clean merge)
 */
export async function mergeTree(ctx, head, onto) {
    const r = await git(ctx, ["merge-tree", "--write-tree", "--name-only", "--no-messages", head, onto]);
    // Exit 1 is a conflict; a bad revision also exits 1, but prints no tree.
    if (r.code > 1 || r.stdout.trim() === "") throw new Error(`git merge-tree failed: ${r.stderr.trim()}`);
    const [tree, ...conflicts] = r.stdout.split("\n").filter(Boolean);
    return { tree, conflicts: r.code === 1 ? [...new Set(conflicts)] : [] };
}

/**
 * Records a step the group may not take yet, the way the write gate does.
 * @param {Context} ctx the context
 * @param {string} op what would be done
 * @param {Record<string, unknown>} fields extra ledger fields
 * @returns {Promise<boolean>} true when the group is acting and the step should run
 */
async function acting(ctx, op, fields) {
    if (ctx.mode(GROUP) === "acting") return true;
    await ctx.ledger({ kind: "would-do", op, group: GROUP, ...fields });
    return false;
}

/**
 * Logs a push-queue entry's result and reads the branch back from the remote.
 * @param {Context} ctx the context
 * @param {{op: string, branch: string, before: string, fields: Record<string, unknown>}} entry what
 *   ran, the branch it updates, its head before, and extra ledger fields
 * @param {RunResult} res the entry's result
 * @returns {Promise<boolean>} true when the remote branch moved off `before`
 */
async function pushed(ctx, { op, branch, before, fields }, res) {
    if (res.code !== 0) {
        await ctx.ledger({
            kind: "action",
            op,
            group: GROUP,
            result: "failed",
            error: (res.stderr || res.stdout).trim(),
            ...fields,
        });
        return false;
    }
    const now = (await git(ctx, ["ls-remote", ctx.remote ?? "origin", `refs/heads/${branch}`])).stdout.split("\t")[0];
    const moved = now !== "" && now !== before;
    if (moved) ctx.own?.(now);
    await ctx.ledger({ kind: "action", op, group: GROUP, result: "pushed", head: now, ...fields });
    if (!moved) await ctx.ledger({ kind: "write-mismatch", op, group: GROUP, ...fields });
    return moved;
}

/**
 * Updates one pull request by the first path that applies (see the module comment).
 * @param {Context} ctx the context
 * @param {{pr: StackPr, onto: string, tip: string, reason: string}} update the pull request; the
 *   commit to merge into it (master's CI-green commit, or its base pull request's head); the tip
 *   of its base branch now; and why it is updated, recorded as the ledger's `situation`
 * @returns {Promise<UpdateResult>} the path and how it ended
 */
export async function updatePr(ctx, { pr, onto, tip, reason }) {
    const { remote = "origin", branch = "master" } = ctx;
    const fields = { situation: reason, target: `pr:${pr.number}` };
    await gitOut(ctx, ["fetch", "-q", "--no-tags", remote, pr.head, onto]);
    if ((await git(ctx, ["merge-base", "--is-ancestor", onto, pr.head])).code === 0) {
        return { path: "none", result: "current" };
    }
    const { tree, conflicts } = await mergeTree(ctx, pr.head, onto);
    if (conflicts.length > 0) {
        if (!conflicts.every((p) => p.startsWith(BASELINES))) return { path: "none", result: "conflict", conflicts };
        // The tool merges master, so a stacked child's baseline conflict with its base is a pr job's.
        if (pr.base !== branch) return { path: "none", result: "conflict", conflicts };
        if (onto !== tip) {
            const why = `the review tool merges ${branch}'s tip, which is not the commit to merge`;
            return { path: "none", result: "wait", conflicts, why };
        }
        return reviewTool(ctx, pr, { ...fields, situation: `${reason}, baseline-only conflict` }, conflicts);
    }
    if (onto === tip) return updateBranch(ctx, pr, fields);
    return localMerge(ctx, pr, { onto, tree }, fields);
}

/**
 * The review tool's update, as a push-queue entry. Exit 1 means it refused and changed nothing.
 * @param {Context} ctx the context
 * @param {StackPr} pr the pull request
 * @param {Record<string, unknown>} fields ledger fields
 * @param {string[]} conflicts the baseline paths in conflict
 * @returns {Promise<UpdateResult>} the result
 */
async function reviewTool(ctx, pr, fields, conflicts) {
    const op = `visual-review update ${pr.number}`;
    if (!(await acting(ctx, op, fields))) return { path: "review-tool", result: "would-do", conflicts };
    const [file, ...args] = ctx.reviewTool ?? REVIEW_TOOL;
    const queue = ctx.queue ?? defaultQueue;
    const res = await queue(op, () =>
        run(file, [...args, String(pr.number)], { cwd: ctx.root, env: ctx.env ?? process.env }),
    );
    const moved = await pushed(ctx, { op, branch: pr.headRef, before: pr.head, fields }, res);
    if (moved) return { path: "review-tool", result: "updated", conflicts };
    return { path: "review-tool", result: res.code === 1 ? "conflict" : "failed", conflicts, why: res.stderr.trim() };
}

/**
 * GitHub's own update: a merge of the base branch's tip, refused with 422 when the head moved.
 * @param {Context} ctx the context
 * @param {StackPr} pr the pull request
 * @param {Record<string, unknown>} fields ledger fields
 * @returns {Promise<UpdateResult>} the result
 */
async function updateBranch(ctx, pr, fields) {
    const path = `repos/${ctx.repo}/pulls/${pr.number}`;
    try {
        const out = await ctx.gh.write(
            "PUT",
            `${path}/update-branch`,
            { expected_head_sha: pr.head },
            { group: GROUP, check: { path, lacks: { head: { sha: pr.head } } }, fields },
        );
        return { path: "update-branch", result: out.performed ? "updated" : "would-do" };
    } catch (err) {
        const e = /** @type {{status?: number, message: string}} */ (err);
        if (e.status === 422) return { path: "update-branch", result: "stale", why: e.message };
        throw err;
    }
}

/**
 * The local path: a signed merge commit from the merged tree, checked out detached in a daemon
 * worktree and pushed from there through the push queue, so the pre-push gate runs on it. The push
 * is a fast-forward of the head githerd read, so a branch that moved meanwhile refuses it.
 * @param {Context} ctx the context
 * @param {StackPr} pr the pull request
 * @param {{onto: string, tree: string}} merge the commit merged and the merged tree
 * @param {Record<string, unknown>} fields ledger fields
 * @returns {Promise<UpdateResult>} the result
 */
async function localMerge(ctx, pr, { onto, tree }, fields) {
    const op = `merge ${onto.slice(0, 12)} into ${pr.headRef} and push`;
    if (!(await acting(ctx, op, fields))) return { path: "local", result: "would-do" };
    const message = `Merge commit '${onto}' into ${pr.headRef}`;
    const commit = await gitOut(ctx, ["commit-tree", "-S", "-p", pr.head, "-p", onto, "-m", message, tree]);
    const dir = join(ctx.root, ".worktrees", `githerd-update-${pr.number}`);
    // ponytail: a worktree left by a daemon that died mid-push is removed here, the next time the
    // same pull request is updated; sweep them at start if they ever pile up.
    if (existsSync(dir)) await gitOut(ctx, ["worktree", "remove", dir]);
    await gitOut(ctx, ["worktree", "add", "-q", "--detach", dir, commit]);
    try {
        const queue = ctx.queue ?? defaultQueue;
        const res = await queue(op, () =>
            git(ctx, ["push", ctx.remote ?? "origin", `HEAD:refs/heads/${pr.headRef}`], dir),
        );
        const moved = await pushed(ctx, { op, branch: pr.headRef, before: pr.head, fields }, res);
        return moved
            ? { path: "local", result: "updated" }
            : { path: "local", result: "failed", why: res.stderr.trim() };
    } finally {
        await gitOut(ctx, ["worktree", "remove", dir]);
    }
}

/**
 * Retargets a child whose base pull request merged to the default branch. GitHub will not, since
 * branches are not deleted on merge, and deleting the base branch would close the child. The
 * retarget starts no CI; Mergify's update of the now-behind child does.
 * @param {Context} ctx the context
 * @param {number} number the child
 * @returns {Promise<{performed: boolean}>} whether it was sent
 */
async function retarget(ctx, number) {
    const { branch = "master" } = ctx;
    const path = `repos/${ctx.repo}/pulls/${number}`;
    return ctx.gh.write(
        "PATCH",
        path,
        { base: branch },
        {
            group: GROUP,
            check: { path, expect: { base: { ref: branch } } },
            retry: true,
            fields: { situation: "stack base merged", target: `pr:${number}` },
        },
    );
}

/** The update results after which a child needs nothing more until its base moves again. */
const SETTLED = new Set(["updated", "current", "would-do"]);

/**
 * The stack upkeep of one reconcile: retargets and child updates from `stackSteps`, parents
 * first. A child is updated from its base pull request's head, which is also its base branch's
 * tip, so it takes GitHub's update, never a local merge; a conflict with its base is a `pr` job's.
 * A step that throws is recorded with its error and the next step still runs.
 * @param {Context} ctx the context
 * @param {{prs: StackPr[], lastHeads: Record<string, string>, mergedHeads: string[]}} poll the
 *   open pull requests, each one's head at the previous poll, and the head branches merged since
 * @returns {Promise<{pr: number, action: string, base?: number,
 *   result?: UpdateResult | {performed: boolean}, error?: string}[]>} what each step did; `base` is
 *   an updated child's base pull request
 */
export async function upkeepStacks(ctx, { prs, lastHeads, mergedHeads }) {
    const byNumber = new Map(prs.map((p) => [p.number, p]));
    const out = [];
    for (const step of stackSteps(prs, lastHeads, mergedHeads, ctx.branch ?? "master")) {
        const pr = /** @type {StackPr} */ (byNumber.get(step.pr));
        try {
            if (step.action === "retarget") {
                out.push({ pr: step.pr, action: "retarget", result: await retarget(ctx, step.pr) });
                continue;
            }
            const parent = /** @type {StackPr} */ (byNumber.get(step.base));
            const result = await updatePr(ctx, { pr, onto: parent.head, tip: parent.head, reason: "stack base moved" });
            out.push({ pr: step.pr, action: "update", base: step.base, result });
        } catch (err) {
            const error = /** @type {Error} */ (err).message;
            await ctx.ledger({ kind: "error", where: "stacks", target: `pr:${step.pr}`, error });
            out.push({ pr: step.pr, action: step.action, ...("base" in step ? { base: step.base } : {}), error });
        }
    }
    return out;
}

/**
 * The stack record for the next reconcile: each open pull request's head, except that a base whose
 * child's update did not settle keeps its previous head, so `stackSteps` asks for the update again;
 * and the merged branches whose child's retarget threw, kept for the same reason.
 * @param {{prs: StackPr[], lastHeads: Record<string, string>, mergedHeads: string[]}} poll what
 *   `upkeepStacks` was given
 * @param {Awaited<ReturnType<typeof upkeepStacks>>} steps what it did
 * @returns {{lastHeads: Record<string, string>, mergedHeads: string[]}} the record to keep
 */
export function nextStackRecord({ prs, lastHeads, mergedHeads }, steps) {
    const unsettled = new Set();
    const keep = new Set();
    for (const s of steps) {
        if (s.action === "retarget") {
            if (s.error) keep.add(prs.find((p) => p.number === s.pr)?.base);
        } else if (!SETTLED.has(/** @type {UpdateResult | undefined} */ (s.result)?.result ?? "")) {
            unsettled.add(s.base);
        }
    }
    return {
        lastHeads: Object.fromEntries(
            prs.map((p) => [p.number, unsettled.has(p.number) && lastHeads[p.number] ? lastHeads[p.number] : p.head]),
        ),
        mergedHeads: mergedHeads.filter((h) => keep.has(h)),
    };
}
