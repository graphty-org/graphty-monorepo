#!/usr/bin/env node
// approval-update.mjs -- brings master into the owner's approval pull request of a held nightly candidate while
// keeping visual-baselines/ exactly the tree he signed, so the approval can merge without a second review (#5410).
//
// The case: a held candidate H0 was approved once (accept commit on H0, merged into master), then fixed forward to H
// (channel/candidate never takes master), and the owner approved H. That second approval is H plus accept-only commits
// (tools/channel/resume.mjs), so its tree lacks what the first approval wrote into master's visual-baselines/ (its
// review record, and any image the fix put back). Merging it would leave master with a tree nobody signed, so
// tools/channel/baselines-tree.mjs fails it. The second review compared every story of H with H's own baselines, so
// it supersedes the first approval of an older head of the same hold: master can take the second signed tree whole.
//
// This writes one merge commit on the approval branch: parents the approval head P and master, master's files
// everywhere except visual-baselines/, which is P's tree byte for byte (the tree its visual-review-approvals/<tree>.json
// signs). It refuses when master's visual-baselines/ moved since the merge base for any reason other than an accept
// commit of an ancestor of H (another approval, a feature's baselines: discarding those would need the owner), when
// the branch is not an approval of a candidate, when its tree has no approval file, and when the merge conflicts
// outside visual-baselines/. It writes nothing under visual-baselines/ or visual-review-approvals/ that the owner did
// not sign; resume.mjs peels the merge off again (acceptPrefix), so the promotion still ships P.
//
//   node tools/channel/approval-update.mjs <branch> [--dry-run]
// fetches origin, writes the merge (signed with -S when commit.gpgSign is set) and pushes it to origin/<branch> as a fast
// forward; --dry-run prints the commit without pushing. Node built-ins and git only; no checkout, index or work tree
// of the repository is touched (git merge-tree and git mktree build the tree).
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { BASELINES } from "./baselines-tree.mjs";
import { acceptsIn } from "./resume.mjs";

export const APPROVALS = "visual-review-approvals";

const short = (sha) => String(sha ?? "").slice(0, 12);

/**
 * Parses `git log --format=%H %P%x09%s`.
 * @param log its output
 * @returns `[{ sha, parents, subject }]`
 */
const commitsOf = (log) =>
    log
        .split("\n")
        .filter(Boolean)
        .map((line) => {
            const [ids, subject] = line.split("\t");
            const [sha, ...parents] = ids.split(" ");
            return { sha, parents, subject };
        });

/**
 * Builds the merge commit (does not push it).
 * @param git (args, opts?) => stdout trimmed, throwing on a git error; opts.input is written to stdin, and with
 *   opts.allowExit1 an exit status of 1 returns its stdout
 * @param o the refs
 * @param o.master master's tip
 * @param o.head the approval branch's head P
 * @param o.branch the branch name, for the message
 * @returns `{ ok, why, commit }`: commit is the merge to push (null when refused or nothing to do)
 */
export function approvalUpdate(git, { master, head, branch }) {
    const no = (why) => ({ ok: false, why, commit: null });
    const tryGit = (args) => {
        try {
            return git(args);
        } catch {
            return null;
        }
    };
    const treeAt = (rev) => tryGit(["rev-parse", `${rev}:${BASELINES}`]);
    const isAncestor = (a, b) => tryGit(["merge-base", "--is-ancestor", a, b]) !== null;

    const own = commitsOf(git(["log", "--no-merges", "--format=%H %P%x09%s", `${master}..${head}`]));
    const candidate = acceptsIn(own)[0]?.candidate;
    if (!candidate) return no(`${branch} holds no accept commit "<prefix>: approve visual baselines at <sha12>"`);
    const tree = treeAt(head);
    if (!tree || tryGit(["cat-file", "-e", `${head}:${APPROVALS}/${tree}.json`]) === null)
        return no(`${branch} carries no ${APPROVALS}/${tree}.json: the owner has not signed its ${BASELINES}/ tree`);

    const base = git(["merge-base", master, head]);
    if (treeAt(base) === treeAt(master))
        return {
            ok: true,
            why: `master's ${BASELINES}/ has not moved since ${short(base)}: nothing to do`,
            commit: null,
        };
    // ponytail: merges are skipped here, so a hand-resolved merge that changed baselines on master is not seen; every
    // baselines change on master today arrives as an ordinary commit of an approval pull request
    const moved = commitsOf(
        git(["log", "--no-merges", "--format=%H %P%x09%s", `${base}..${master}`, "--", `${BASELINES}/`]),
    );
    const earlier = new Set(
        acceptsIn(moved)
            .filter((a) => isAncestor(a.candidate, candidate))
            .map((a) => a.accept),
    );
    const foreign = moved.filter((c) => !earlier.has(c.sha));
    if (foreign.length > 0)
        return no(
            `master changed ${BASELINES}/ since ${short(base)} in ${foreign.map((c) => short(c.sha)).join(", ")}, ` +
                `which is not an approval of an earlier head of ${short(candidate)}: the owner reviews again ` +
                `(node visual-review/trusted/cli.mjs update <pr>)`,
        );

    const merged = git(["merge-tree", "--write-tree", "--name-only", "--no-messages", master, head], {
        allowExit1: true,
    });
    const [mergedTree, ...conflicts] = merged.split("\n").filter(Boolean);
    const outside = conflicts.filter((p) => !p.startsWith(`${BASELINES}/`));
    if (outside.length > 0)
        return no(`merging master into ${branch} conflicts outside ${BASELINES}/: ${outside.join(", ")}`);

    // visual-baselines/ is a top-level directory: swap its entry in the merged root tree for the signed one
    const root = git(["ls-tree", mergedTree])
        .split("\n")
        .filter((line) => line && !line.endsWith(`\t${BASELINES}`));
    const result = git(["mktree"], { input: [...root, `040000 tree ${tree}\t${BASELINES}`].join("\n") + "\n" });
    if (treeAt(result) !== tree) return no(`the merge's ${BASELINES}/ is not the signed tree ${tree}`);
    const message =
        `Merge master into ${branch}, keeping its signed ${BASELINES}/ tree ${tree}\n\n` +
        `The owner's approval of ${short(candidate)} supersedes master's approval of its earlier head ` +
        `(${[...earlier].map(short).join(", ")}): ${BASELINES}/ stays the tree ${APPROVALS}/${tree}.json signs. ` +
        `Written by tools/channel/approval-update.mjs (#5410).`;
    // commit-tree ignores commit.gpgSign: sign when the repository's commits are signed
    const sign = tryGit(["config", "--bool", "commit.gpgSign"]) === "true" ? ["-S"] : [];
    const commit = git(["commit-tree", ...sign, result, "-p", head, "-p", master, "-m", message]);
    return { ok: true, why: `${short(commit)} merges master and keeps ${BASELINES}/ at ${tree}`, commit };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [branch, flag] = process.argv.slice(2);
    if (!branch || (flag && flag !== "--dry-run")) {
        console.error("usage: node tools/channel/approval-update.mjs <branch> [--dry-run]");
        process.exit(2);
    }
    const git = (args, opts = {}) => {
        try {
            return execFileSync("git", args, {
                encoding: "utf8",
                input: opts.input,
                stdio: [opts.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
            }).trim();
        } catch (error) {
            // merge-tree exits 1 on a conflict and still prints the tree and the conflicted paths
            if (opts.allowExit1 && error.status === 1 && error.stdout) return error.stdout.trim();
            throw error;
        }
    };
    git(["fetch", "-q", "origin", "master", branch]);
    const out = approvalUpdate(git, { master: "origin/master", head: `origin/${branch}`, branch });
    console.log(`approval-update: ${out.why}`);
    if (!out.ok) process.exit(1);
    if (out.commit && flag !== "--dry-run") {
        git(["push", "origin", `${out.commit}:refs/heads/${branch}`]);
        console.log(`approval-update: pushed ${out.commit} to ${branch}`);
    } else if (out.commit) console.log(`approval-update: --dry-run, not pushed: ${out.commit}`);
}
