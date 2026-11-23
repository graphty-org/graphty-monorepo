#!/usr/bin/env node
// A save file must open the same way on any later build, so it carries everything it uses and never
// names a built-in the reading build might not ship (design/architecture/self-contained-save-files.md).
// graphty-element's tests under test/saved-format/ check that, against a list of known exceptions
// (saved-format-lists.json). This check refuses a push that weakens them without the owner:
//
//   node tools/check-saved-format-allowlist.mjs [--base <rev>]
//   (pnpm run check:saved-format-allowlist; tools/prepush-source-checks.sh, ci.yml's Checks job)
//
// Each commit from the push base (tools/push-base.mjs) to HEAD is judged on its own. A commit needs a
// `Saved-Format-Exception-Approved: <reason>` trailer, which only the owner adds, when it
//   - adds an exception, a path to an exception, a notSaved catalog or a volatile field,
//   - removes a selfContained kind,
//   - deletes a test file under graphty-element/test/saved-format/, or
//   - changes the shader-library snapshot (the helpers every carried shader may call).
// Removing a shipped shader hash, or its archived text, fails with no trailer escape unless the same
// commit adds that hash to the revoked list: a file carrying that text must stay trusted or be refused
// on purpose. The one exception is an exact revert of a first-parent merge of the base (what
// `git revert -m 1 <merge>` makes when master is red): it may drop the hashes that merge added. Free: adding a shipped hash with its text, adding a revoked hash, adding a selfContained
// kind, removing an exception, and editing an exception's finding or issue.
//
// PR Integrity (tools/pr-integrity.mjs) separately needs a code owner's approval for any change to
// these files, since anyone can type a trailer.
//
// ponytail: merge commits are not judged (their parents' commits are); a conflict resolution that edits
// the lists slips past this check but not PR Integrity's owner approval.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { pushBase } from "./push-base.mjs";

const DIR = "graphty-element/test/saved-format/";
export const LISTS = `${DIR}saved-format-lists.json`;
export const LIBRARY = `${DIR}shader-library.json`;
export const SHIPPED = "graphty-element/src/catalog/shipped-shader-hashes.json";
export const REVOKED = "graphty-element/src/catalog/revoked-shader-hashes.json";
const ARCHIVE = "graphty-element/test/shaders/shipped-texts/";
const TRAILER = "Saved-Format-Exception-Approved";

/**
 * What one commit does to the saved-format checks that needs the owner, and what it may never do.
 * @param before the lists, shipped and revoked hashes before the commit
 * @param after the same after it
 * @param changes `{ status, path }` of each file the commit changes
 * @param reverted shipped hashes the commit may drop: those a merge it exactly reverts added
 * @returns `{ needsOwner, forbidden }`, each a list of sentences
 */
export function judge(before, after, changes, reverted = new Set()) {
    const needsOwner = [];
    const forbidden = [];
    const kinds = new Map((before.lists.exceptions ?? []).map((each) => [each.kind, each]));
    for (const each of after.lists.exceptions ?? []) {
        const old = kinds.get(each.kind);
        if (old === undefined) {
            needsOwner.push(`adds the exception ${each.kind}`);
            continue;
        }
        for (const path of each.paths.filter((p) => !old.paths.includes(p))) {
            needsOwner.push(`adds the path ${path} to the exception ${each.kind}`);
        }
        for (const catalog of each.catalogs.filter((c) => !old.catalogs.includes(c))) {
            needsOwner.push(`adds the catalog ${catalog} to the exception ${each.kind}`);
        }
    }
    for (const key of Object.keys(after.lists.notSaved ?? {}).filter((k) => !(k in (before.lists.notSaved ?? {})))) {
        needsOwner.push(`adds ${key} to notSaved`);
    }
    for (const field of (after.lists.volatile ?? []).filter((f) => !(before.lists.volatile ?? []).includes(f))) {
        needsOwner.push(`adds the volatile field ${field}`);
    }
    for (const kind of (before.lists.selfContained ?? []).filter(
        (k) => !(after.lists.selfContained ?? []).includes(k),
    )) {
        needsOwner.push(`removes the self-contained kind ${kind}`);
    }
    for (const { status, path } of changes) {
        if (status === "D" && path.startsWith(DIR) && /\.test\.[cm]?[jt]s$/.test(path)) {
            needsOwner.push(`deletes the test ${path}`);
        }
        if (path === LIBRARY) needsOwner.push("changes the shader-library snapshot");
    }
    const revoked = new Set(after.revoked);
    const archived = changes.filter((c) => c.status === "D" && c.path.startsWith(ARCHIVE));
    const gone = [
        ...before.shipped.filter((hash) => !after.shipped.includes(hash)),
        ...archived.map((c) => c.path.slice(ARCHIVE.length).replace(/\.txt$/, "")),
    ];
    for (const hash of new Set(gone)) {
        if (!revoked.has(hash) && !reverted.has(hash)) {
            forbidden.push(`removes the shipped shader hash ${hash} or its archived text without revoking it`);
        }
    }
    return { needsOwner, forbidden };
}

/**
 * Every problem in the commits from base to HEAD.
 * @param opts where to look
 * @param opts.cwd the checkout
 * @param opts.base the push base
 * @returns one line per problem
 */
export function problems({ cwd, base }) {
    const git = (args) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 30 });
    const json = (rev, path, empty) => {
        try {
            return JSON.parse(git(["show", `${rev}:${path}`]));
        } catch {
            return empty; // not in that tree
        }
    };
    const state = (rev) => ({
        lists: json(rev, LISTS, {}),
        shipped: json(rev, SHIPPED, []),
        revoked: json(rev, REVOKED, []),
    });
    // The merge a commit exactly reverts: its message names a first-parent merge of the base, and
    // its tree is that merge undone on top of the commit's parent.
    const firstParent = new Set(git(["rev-list", "--first-parent", "--merges", base]).split("\n").filter(Boolean));
    const revertedBy = (sha, parent) => {
        const named = /This reverts commit ([0-9a-f]{7,40})/u.exec(git(["log", "-1", "--format=%B", sha]))?.[1];
        if (named === undefined || parent === undefined) return null;
        const merge = git(["rev-parse", named]).trim();
        if (!firstParent.has(merge)) return null;
        const undone = git(["merge-tree", "--write-tree", `--merge-base=${merge}`, parent, `${merge}^1`]).trim();
        return undone === git(["rev-parse", `${sha}^{tree}`]).trim() ? merge : null;
    };
    const addedBy = (merge) => {
        const had = new Set(json(`${merge}^1`, SHIPPED, []));
        return new Set(json(merge, SHIPPED, []).filter((hash) => !had.has(hash)));
    };
    const out = [];
    // The pull request that first adds the lists has nothing to ratchet against: its starting list is
    // approved by PR Integrity's code-owner review. Once the lists are in the base, every commit is judged.
    const bootstrap = json(base, LISTS, null) === null;
    const commits = git(["rev-list", "--reverse", "--no-merges", `${base}..HEAD`])
        .split("\n")
        .filter(Boolean);
    for (const sha of commits) {
        const changes = git(["diff-tree", "--no-commit-id", "-r", "--no-renames", "--name-status", "--root", sha])
            .split("\n")
            .filter(Boolean)
            .map((line) => {
                const [status, path] = line.split("\t");
                return { status, path };
            });
        if (
            !changes.some(
                (c) => c.path.startsWith(DIR) || c.path === SHIPPED || c.path === REVOKED || c.path.startsWith(ARCHIVE),
            )
        ) {
            continue;
        }
        const parent = git(["rev-list", "--parents", "-n", "1", sha]).trim().split(" ")[1];
        let merge = null;
        try {
            merge = revertedBy(sha, parent);
        } catch {
            merge = null; // a named commit that is not here, or a revert that does not apply
        }
        const { needsOwner, forbidden } = judge(
            parent ? state(parent) : { lists: {}, shipped: [], revoked: [] },
            state(sha),
            changes,
            merge === null ? new Set() : addedBy(merge),
        );
        const subject = git(["log", "-1", "--format=%h %s", sha]).trim();
        const approved = git(["log", "-1", `--format=%(trailers:key=${TRAILER},valueonly)`, sha]).trim() !== "";
        out.push(...forbidden.map((p) => `${subject}: ${p}`));
        if (!approved && !bootstrap)
            out.push(...needsOwner.map((p) => `${subject}: ${p} (needs the owner's ${TRAILER} trailer)`));
    }
    return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const i = process.argv.indexOf("--base");
    const base = i === -1 ? pushBase() : process.argv[i + 1];
    const found = problems({ cwd: process.cwd(), base });
    if (found.length === 0) {
        console.log("Saved-format checks: no unapproved exception and no removed shipped shader hash");
        process.exit(0);
    }
    console.error("This push weakens the checks that keep save files self-contained:");
    for (const line of found) console.error(`  ${line}`);
    console.error(
        "Carry what the file uses instead of naming it, or ask the owner: only he adds a " +
            `\`${TRAILER}: <reason>\` trailer to the commit. Never add it yourself. ` +
            "A shipped shader hash leaves the list only by moving to the revoked list.",
    );
    process.exit(1);
}
