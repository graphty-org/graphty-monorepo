/**
 * Keeps the main checkout's default branch current (owner decision 2026-10-06): after the default
 * branch's head moves on GitHub, and once per start, githerd fast-forwards the main checkout when
 * it is on the default branch with no changes to tracked files and no operation in progress. It
 * never does anything but `git merge --ff-only`: no other branch, worktree, index or untracked
 * file is touched, and it never stashes, resets, checks out or cleans.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

/** The files git keeps while an operation is in progress, and what each one means. */
const IN_PROGRESS = [
    ["MERGE_HEAD", "a merge"],
    ["CHERRY_PICK_HEAD", "a cherry-pick"],
    ["REVERT_HEAD", "a revert"],
    ["rebase-merge", "a rebase"],
    ["rebase-apply", "a rebase"],
];

/**
 * @typedef {{outcome: "updated" | "would-update" | "current" | "skipped" | "fetch-failed", text: string}}
 *   MainCheckoutResult
 */

/**
 * Fetches the default branch, when the checkout could take it, and fast-forwards the main checkout to it when that is safe.
 * @param {(args: string[]) => Promise<{code: number, stdout: string, stderr: string}>} git runs git
 *   in the main checkout
 * @param {string} branch the default branch
 * @param {{fetched: boolean, acting: boolean}} options whether `origin/<branch>` was just fetched,
 *   and whether to write (otherwise the result only says what it would do)
 * @returns {Promise<MainCheckoutResult>} what happened, with a line for the board
 */
export async function updateMainCheckout(git, branch, { fetched, acting }) {
    const skip = (/** @type {string} */ why) => ({
        outcome: /** @type {const} */ ("skipped"),
        text: `main checkout not updated: ${why}`,
    });
    const head = await git(["symbolic-ref", "--quiet", "--short", "HEAD"]);
    if (head.code !== 0) return skip("HEAD is detached");
    const current = head.stdout.trim();
    if (current !== branch) return skip(`on branch ${current}`);
    const gitDir = (await git(["rev-parse", "--absolute-git-dir"])).stdout.trim();
    const busy = gitDir ? IN_PROGRESS.find(([file]) => existsSync(join(gitDir, file))) : undefined;
    if (busy) return skip(`${busy[1]} is in progress`);
    const status = await git(["status", "--porcelain", "--untracked-files=no"]);
    if (status.code !== 0 || status.stdout.trim() !== "") return skip("has changes to tracked files");
    if (!fetched) {
        const f = await git(["fetch", "origin", branch]);
        if (f.code !== 0) {
            return {
                outcome: "fetch-failed",
                text: `main checkout not updated: git fetch origin ${branch} failed: ${f.stderr.trim() || "exit " + f.code}`,
            };
        }
    }
    const target = `origin/${branch}`;
    const [mine, theirs] = await Promise.all([git(["rev-parse", "HEAD"]), git(["rev-parse", target])]);
    const sha = theirs.stdout.trim();
    if (mine.stdout.trim() === sha) return { outcome: "current", text: "main checkout is current" };
    if ((await git(["merge-base", "--is-ancestor", "HEAD", target])).code !== 0) {
        return skip(`diverged from ${target}`);
    }
    if (!acting)
        return { outcome: "would-update", text: `main checkout would be fast-forwarded to ${sha.slice(0, 8)}` };
    const merged = await git(["merge", "--ff-only", "-q", target]);
    if (merged.code !== 0) return skip(`git merge --ff-only failed: ${merged.stderr.trim() || "exit " + merged.code}`);
    return { outcome: "updated", text: `main checkout updated to ${sha.slice(0, 8)}` };
}
