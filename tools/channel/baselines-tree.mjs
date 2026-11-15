#!/usr/bin/env node
// baselines-tree.mjs -- a pull request that changes visual-baselines/ must leave master with exactly the baselines
// tree it carries (design/visual-testing/early-capture.md, 4d rule 4). The owner signs the baselines tree of an
// approval pull request's head; when master's baselines moved since (another approval merged), the merge would put
// a tree nobody signed on master, which the screenshot gate then refuses for every later candidate. Such a pull
// request fails here; `node visual-review/trusted/cli.mjs update <pr>` merges master, and the owner signs again. When
// master's baselines moved only by the approval of an earlier head of the same held candidate (a fixed-forward hold
// approved twice), `node tools/channel/approval-update.mjs <branch>` merges master and keeps the signed tree (#5410).
//
//   node tools/channel/baselines-tree.mjs [dir]
// Run in ci.yml's Build job on a pull request's merge checkout (HEAD^1 the base, HEAD^2 the head). Exit 0 when HEAD
// is not a merge, the pull request does not change the baselines, or the merge result's baselines tree is the
// head's; exit 1 naming both trees otherwise. Node built-ins and git only.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const BASELINES = "visual-baselines";

/**
 * The check on one checkout.
 * @param git (...args) => stdout trimmed, throwing on a git error
 * @returns `{ ok, why }`
 */
export function baselinesTreeCheck(git) {
    const parents = git("rev-list", "--parents", "-n", "1", "HEAD").split(" ").slice(1);
    if (parents.length !== 2) return { ok: true, why: "not a merge: nothing to compare" };
    const tree = (rev) => {
        try {
            return git("rev-parse", `${rev}:${BASELINES}`);
        } catch {
            return null; // no baselines directory there
        }
    };
    const base = git("merge-base", "HEAD^1", "HEAD^2");
    if (tree(base) === tree("HEAD^2")) return { ok: true, why: `the pull request does not change ${BASELINES}/` };
    const merged = tree("HEAD");
    const head = tree("HEAD^2");
    if (merged === head) return { ok: true, why: `merging leaves ${BASELINES}/ exactly as the head has it (${head})` };
    return {
        ok: false,
        why:
            `merging this pull request would leave ${BASELINES}/ as tree ${merged}, not the head's ${head}: ` +
            `master's baselines changed since it was made, so the owner's signature would not cover master. ` +
            `Run node visual-review/trusted/cli.mjs update <pr>, and the owner reviews and signs again; or, for an ` +
            `approval of a held candidate whose earlier head's approval master holds, ` +
            `node tools/channel/approval-update.mjs <branch>, which keeps the signed tree with no new review.`,
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const cwd = process.argv[2] ?? process.cwd();
    const git = (...args) =>
        execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const { ok, why } = baselinesTreeCheck(git);
    console.log(ok ? `baselines-tree: ${why}` : `::error::baselines-tree: ${why}`);
    process.exit(ok ? 0 : 1);
}
