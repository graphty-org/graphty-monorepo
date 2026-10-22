#!/usr/bin/env node
/**
 * The pull request gate: fails while a project holds visual changes the owner has not reviewed.
 *
 * It fails closed: nothing merges with an image nobody approved. Every project with baselines on the
 * base branch, and every project in the base branch's config or the pull request's, is gated, seeded
 * or not. Every story needs an approved baseline. A story with none blocks: `new` when the pull
 * request adds or changes it, `unseeded` when it looks as in master's newest capture. Either way
 * the owner accepts it (on the pull request, or by seeding it from the default branch), which
 * creates its first baseline.
 *
 * <dir> holds the downloaded `visual-<project>-<attempt>` artifacts of this CI run, every attempt
 * of it. For each project only the highest attempt counts, so re-running failed jobs (which
 * leaves the visual jobs' old attempt as the newest) can neither hide nor resurrect a capture.
 * Which projects exist and are seeded is read from <ref> (the base branch tip, fetched by the
 * caller), and so is visual-review.config.json (the projects and where the baselines live), so
 * neither deleting a project's baselines nor removing it from the config turns the gate off, and a
 * pull request that moves the baselines directory fails. The pull request's config can only add
 * projects. A gated project with no results.json, or an incomplete one, fails: a capture that
 * crashed has shown the owner nothing. An invalid results.json counts as missing. So does a story
 * compared at a diffThreshold above MAX_THRESHOLD, which would hide real changes.
 *
 * One exception: a project whose artifact holds, instead of results.json, the marker the workflow
 * writes when the pull request cannot affect it (skipped.json, results.mjs) passes without a
 * capture. Which projects a pull request affects is decided by the pull request's own workflow, so
 * the marker counts only where a full capture follows: never in a merge-queue run (every batch
 * captures every project before it merges), never for a project with no baselines on the base
 * branch, and never for a project whose baselines the pull request changes. Anywhere else a marker
 * is a missing capture.
 *
 * It also fails when a file of the baselines directory differs from the base's without the owner's
 * signed approval of exactly that file (composed approvals, baselineCoverage): a tree statement
 * `<approvals>/<tree>.json` (the config's `approvals`, outside the baselines directory, so adding it
 * leaves the tree it signs alone) naming a commit X that is an ancestor of the head and the tree of
 * the baselines directory at X, whose tree holds exactly that file at that path; or a review record
 * whose item takes that path to exactly that content; with no newer signed reject of that path and
 * content. So images two branches each had signed are approved where both are merged, without
 * another signature. Baseline PNGs are Git LFS pointers, which name each image's SHA-256, so the
 * approval covers every pixel. Once visual-review/passkeys.json on the base branch holds a key, every
 * statement and record must carry a passkey approval by one of the base branch's keys over exactly
 * its contents (approval.mjs). Keys are never read from the pull request, a pull request that would
 * leave no key fails, and a change to passkeys.json itself is merged by an administrator. Without
 * those approvals, committing the captured PNGs straight into the baselines directory would turn the
 * capture check green with no review at all.
 *
 * CI runs this file as the base branch has it, never the pull request's copy, so a pull request
 * cannot loosen the gate that judges it.
 *
 * In a merge-queue run (`--queue-event`) the head is a batch of several pull requests merged onto the
 * base. Baseline changes are compared with the commit the batch sits on (the draft's
 * `checking_base_sha`), not with the base branch, since a batch stacked on another holds that
 * batch's changes; a draft that names no such commit fails. Nothing else changes.
 *
 * Usage: visual-review gate --captures <dir> --base <ref> [--head <ref>] [--pr <number> |
 * --queue-event <file>], or node gate.mjs with the same options. `--pr` is only reported. Standard library only (results.mjs, config.mjs and approval.mjs
 * have no dependencies), so it runs from a checkout of this package without an install.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { PASSKEYS_FILE, parsePasskeys, verifyApproval, verifyRecord } from "./lib/approval.mjs";
import { loadConfigAt, repoRoot } from "./lib/config.mjs";
import { isSkipMarker, SKIPPED_FILE, validateResults } from "./lib/results.mjs";

const PASSING = new Set(["unchanged", "excluded"]);

/**
 * The loosest diffThreshold the gate trusts, the highest a story here uses. At 1 pixelmatch counts
 * no pixel as changed, so a settings file or a story's parameters could switch comparison off.
 */
export const MAX_THRESHOLD = 0.8;

/**
 * The newest attempt's results.json of every project in a directory of downloaded artifacts, and
 * whether that attempt holds the not-affected marker instead (`skipped: true`, only with no
 * results.json).
 * @param {string} dir the download directory, one subdirectory per artifact
 * @returns {Record<string, { attempt: number, results: object | null, skipped?: true }>} by project
 */
export function newestResults(dir) {
    /** @type {Record<string, { attempt: number, results: object | null, skipped?: true }>} */
    const out = {};
    const names = existsSync(dir) ? readdirSync(dir) : [];
    for (const name of names) {
        const m = /^visual-(.+)-(\d+)$/.exec(name);
        if (!m) {
            continue;
        }
        const [, project, n] = m;
        const attempt = Number(n);
        if (out[project] && out[project].attempt > attempt) {
            continue;
        }
        const file = join(dir, name, "results.json");
        let results = null;
        try {
            results = JSON.parse(readFileSync(file, "utf8"));
        } catch {
            // Missing or not JSON: counted as missing, like any invalid results.json.
        }
        out[project] = { attempt, results };
        if (!existsSync(file) && isSkipMarker(readJson(join(dir, name, SKIPPED_FILE)), project)) {
            out[project].skipped = true;
        }
    }
    return out;
}

function readJson(file) {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return null;
    }
}

/**
 * The projects the gate checks: every project with baselines at the base, and every project of the
 * base's config and of the pull request's.
 * @param {{ projects: Record<string, object> }} config the base branch's config
 * @param {Set<string>} seeded the projects with baselines at the base
 * @param {{ projects: Record<string, object> }} [headConfig] the pull request's config
 * @returns {string[]} the gated project ids
 */
export function gatedProjects(config, seeded, headConfig) {
    return [...new Set([...seeded, ...Object.keys(config.projects), ...Object.keys(headConfig?.projects ?? {})])];
}

/**
 * What blocks the pull request.
 * @param {{ config: { defaultBranch: string, baselines: string,
 *     projects: Record<string, { seedFromDefaultBranch: boolean }> },
 *     headConfig: { baselines: string, projects: Record<string, object> } | undefined, seeded: Set<string>,
 *     captures: Record<string, { attempt: number, results: object | null, skipped?: true }>,
 *     queue?: boolean, baselinesChanged?: Set<string>, notAffected?: string[] }} input the base
 *     branch's config, the pull request's config (if any), the projects with baselines on the base
 *     branch, the newest capture of each project, whether this is a merge-queue run, the projects
 *     whose baselines the pull request changes, and a list the projects whose not-affected marker
 *     the gate accepts are added to
 * @returns {string[]} one line per blocked project; empty when the gate passes
 */
export function gateProblems({
    config,
    headConfig,
    seeded,
    captures,
    queue = false,
    baselinesChanged = new Set(),
    notAffected = [],
}) {
    const problems = [];
    if (headConfig && headConfig.baselines !== config.baselines) {
        // Capture reads the pull request's config, so its baselines would be compared, not the base's.
        problems.push(
            `this pull request moves the baselines directory from ${config.baselines} to ${headConfig.baselines}; ` +
                "move it in a pull request of its own that changes nothing else, merged with an administrator's review",
        );
    }
    for (const p of gatedProjects(config, seeded, headConfig)) {
        const r = captures[p]?.results;
        if (!r && captures[p]?.skipped) {
            const refused = skipRefused(p, { config, seeded, queue, baselinesChanged });
            if (refused) {
                problems.push(`${p}: not captured (marked not affected by this pull request), but ${refused}`);
            } else {
                notAffected.push(p);
            }
            continue;
        }
        problems.push(...captureProblems(p, r, config, seeded));
    }
    return problems;
}

/**
 * What blocks one project's capture.
 * @param {string} p the project
 * @param {object | null | undefined} r its newest results.json
 * @param {{ defaultBranch: string, projects: Record<string, { seedFromDefaultBranch: boolean }> }} config the base branch's config
 * @param {Set<string>} seeded the projects with baselines on the base branch
 * @returns {string[]} the gate's lines for it
 */
function captureProblems(p, r, config, seeded) {
    if (!r) {
        return [`${p}: no capture results (the visual job failed or uploaded nothing); re-run it`];
    }
    const invalid = validateResults(r);
    if (invalid.length > 0) {
        return [`${p}: results.json is invalid (${invalid[0]}); re-run the visual job`];
    }
    if (!r.complete) {
        return [`${p}: the capture did not finish (${r.items.length} of ${r.expected} items); re-run it`];
    }
    const problems = [];
    const loose = r.items.filter((i) => i.threshold > MAX_THRESHOLD).length;
    if (loose > 0) {
        problems.push(
            `${p}: ${loose} ${loose === 1 ? "item is" : "items are"} compared at a diffThreshold above ${MAX_THRESHOLD}, ` +
                "which hides real changes; lower it in the story's parameters or its settings file",
        );
    }
    const open = r.items.map((i) => i.status).filter((s) => !PASSING.has(s));
    if (open.length > 0) {
        // No Object.groupBy: the gate runs on the runner's own Node, which may be 20.
        const counts = new Map();
        for (const s of open) {
            counts.set(s, (counts.get(s) ?? 0) + 1);
        }
        const what = [...counts].map(([s, n]) => `${n} ${s}`).join(", ");
        problems.push(`${p}: ${what} ${seeded.has(p) ? NOT_ACCEPTED : notSeeded(config, p)}`);
    }
    return problems;
}

/**
 * Why the not-affected marker does not stand in for a capture of a project; null when it does.
 * @param {string} p the project
 * @param {{ config: { defaultBranch: string }, seeded: Set<string>, queue: boolean,
 *     baselinesChanged: Set<string> }} input as in gateProblems
 * @returns {string | null} the rest of the gate's line
 */
function skipRefused(p, { config, seeded, queue, baselinesChanged }) {
    if (queue) {
        return "a merge-queue run must capture every project; re-run it";
    }
    if (!seeded.has(p)) {
        return `it has no baselines on ${config.defaultBranch} yet, so every pull request captures it`;
    }
    if (baselinesChanged.has(p)) {
        return "this pull request changes its baselines, so it must be captured";
    }
    return null;
}

/**
 * The projects whose baselines differ between two refs: the first directory under the baselines
 * directory of each changed path, review records left out.
 * @param {string} base the base branch tip
 * @param {string} head the pull request's checkout
 * @param {string} [cwd] the repository
 * @param {string} [baselines] the baselines directory
 * @returns {Set<string>} the projects
 */
export function baselinesChangedBetween(base, head, cwd = process.cwd(), baselines = "visual-baselines") {
    const prefix = `${baselines}/`;
    return new Set(
        gitOut(cwd, ["diff", "-z", "--no-renames", "--name-only", base, head, "--", prefix])
            .toString("utf8")
            .split("\0")
            .filter((f) => f.startsWith(prefix))
            .map((f) => f.slice(prefix.length).split("/"))
            .filter((parts) => parts.length > 1 && parts[0] !== "reviews")
            .map((parts) => parts[0]),
    );
}

const NOT_ACCEPTED = "(not accepted; a rejected item needs a code change, not another review)";

/**
 * Why an unseeded project blocks, and how to seed it.
 * @param {{ defaultBranch: string, projects: Record<string, { seedFromDefaultBranch: boolean }> }} config the
 *     base branch's config
 * @param {string} p the project
 * @returns {string} the rest of the gate's line
 */
function notSeeded(config, p) {
    const branch = config.defaultBranch;
    const here = "accept them on this pull request with `visual-review serve`";
    if (config.projects[p]?.seedFromDefaultBranch === false) {
        return `(not accepted; ${p} has no baselines on ${branch} yet, so ${here} to create its first ones)`;
    }
    return (
        `(not accepted; ${p} has no baselines on ${branch} yet. Seed it: capture a known-good commit with ` +
        `\`gh workflow run visual-seed.yml --ref ${branch} -f ref=<sha>\` (or take ${branch}'s newest run), ` +
        `review that run with \`visual-review serve --master-run <run id>\` and merge the seed pull ` +
        `request, then merge ${branch} into this branch; or ${here})`
    );
}

const gitOut = (cwd, args) => execFileSync("git", args, { cwd, maxBuffer: 1 << 28 });

/**
 * Why an earlier review record does not show that the owner approved image `to` for the baseline
 * `path` (one story in one mode of one project), or null when it does. The review server offers an
 * "approved before" accept only from a record that passes this.
 * @param {any} earlier the earlier record, parsed (untrusted)
 * @param {{ path: string, to: string | null }} claim the baseline and the image
 * @param {object[] | null} keys the base branch's keys once approvals are enforced: then the
 *     earlier record must carry a valid passkey approval itself
 * @returns {string | null} why not, or null
 */
export function earlierApprovalProblem(earlier, { path, to }, keys) {
    if (typeof earlier !== "object" || earlier === null || !Array.isArray(earlier.items)) {
        return "the earlier record is not a review record";
    }
    // A direct decision only: an approval never chains through another "approved before".
    const approves = (i) => i?.path === path && i.to === to && i.approvedBefore === undefined;
    if (typeof to !== "string" || !earlier.items.some(approves)) {
        return "the earlier record does not approve this image for this story";
    }
    return keys ? verifyRecord(earlier, keys, { pr: earlier.pr ?? null }) : null;
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * The SHA-256 of the file a blob stands for. Baseline PNGs are Git LFS pointers in git, and a
 * pointer names its object's SHA-256 (`oid sha256:<hex>`), which is the PNG's own hash, so no
 * LFS object is ever downloaded to check a record. Any other blob is hashed as it is.
 * @param {Buffer} bytes the blob
 * @returns {string} the hex SHA-256 of the content
 */
export function contentHash(bytes) {
    const text = bytes.subarray(0, 200).toString("latin1");
    const oid = /^version https:\/\/git-lfs\.github\.com\/spec\/v1\noid sha256:([0-9a-f]{64})\n/.exec(text);
    return oid ? oid[1] : sha256(bytes);
}

function parseOr(bytes) {
    try {
        return JSON.parse(bytes.toString("utf8"));
    } catch {
        return null;
    }
}

/**
 * The projects with at least one baseline PNG at a git ref: the directories under the baselines
 * directory at the base tip. They are gated whatever the config says.
 * @param {string} ref the base branch tip
 * @param {string} [cwd] the repository
 * @param {string} [baselines] the baselines directory
 * @returns {Set<string>} the seeded ones
 */
export function seededAt(ref, cwd = process.cwd(), baselines = "visual-baselines") {
    const files = execFileSync("git", ["ls-tree", "-r", "--name-only", ref, "--", `${baselines}/`], {
        cwd,
        encoding: "utf8",
        maxBuffer: 1 << 28,
    }).split("\n");
    const prefix = `${baselines}/`;
    return new Set(
        files
            .filter((f) => f.startsWith(prefix) && f.endsWith(".png"))
            .map((f) => f.slice(prefix.length).split("/"))
            .filter((parts) => parts.length > 1)
            .map((parts) => parts[0]),
    );
}

/**
 * A file at a git ref, or null when the ref does not hold it.
 * @param {string} ref the commit
 * @param {string} path the path
 * @param {string} cwd the repository
 * @returns {string | null} its text
 */
function fileAt(ref, path, cwd) {
    const listed = gitOut(cwd, ["ls-tree", "--name-only", ref, "--", path]).toString("utf8").trim();
    return listed === "" ? null : gitOut(cwd, ["show", `${ref}:${path}`]).toString("utf8");
}

/**
 * Whether approvals are enforced, and the keys they must come from: those of passkeys.json on the
 * base branch, never the pull request's. Absent, or with no key, enforcement is off.
 * @param {string} base the base branch tip
 * @param {string} head the pull request's checkout
 * @param {string} [cwd] the repository
 * @returns {{ keys: object[] | null, problems: string[] }} the keys (null when off), and what fails
 *     the gate: an invalid base file, or a pull request that would switch enforcement off
 */
export function approvalKeys(base, head, cwd = process.cwd()) {
    const text = fileAt(base, PASSKEYS_FILE, cwd);
    let keys = [];
    try {
        keys = text === null ? [] : parsePasskeys(text);
    } catch (err) {
        return { keys: null, problems: [`${PASSKEYS_FILE} on the base branch is invalid: ${err.message}`] };
    }
    if (keys.length === 0) {
        return { keys: null, problems: [] };
    }
    const problems = [];
    let left = 0;
    try {
        const own = fileAt(head, PASSKEYS_FILE, cwd);
        left = own === null ? 0 : parsePasskeys(own).length;
    } catch {
        // Invalid: counts as no key.
    }
    if (left === 0) {
        problems.push(
            `this pull request would switch approval enforcement off: its ${PASSKEYS_FILE} is missing, invalid or holds no key`,
        );
    }
    return { keys, problems };
}

const TREE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;

/**
 * The git tree of a directory at a commit, or null when the commit has no such directory.
 * @param {string} ref the commit
 * @param {string} dir the directory
 * @param {string} cwd the repository
 * @returns {string | null} the tree hash
 */
export function treeAt(ref, dir, cwd) {
    try {
        return (
            gitOut(cwd, ["rev-parse", "--verify", "--quiet", `${ref}:${dir}`])
                .toString("utf8")
                .trim() || null
        );
    } catch {
        return null;
    }
}

/**
 * Why a signed tree approval does not hold, or null when it does: a version 1 statement about the
 * baselines directory whose commit is an ancestor of `head` and holds the tree it signs, signed by
 * one of the base branch's keys. With `tree`, it must sign exactly that tree.
 * @param {any} statement the parsed approval file (untrusted)
 * @param {{ head: string, tree?: string, baselines: string, keys: object[] | null, cwd: string }} at
 *     the head, the tree it must sign (any when left out), the baselines directory, the base
 *     branch's keys (null: approvals are not enforced, so the signature is not checked) and the
 *     repository
 * @returns {string | null} why not, or null
 */
export function treeApprovalProblem(statement, { head, tree, baselines, keys, cwd }) {
    if (typeof statement !== "object" || statement === null || statement.version !== 1) {
        return "not a version 1 tree approval";
    }
    const { commit } = statement;
    if (statement.baselines !== baselines || (tree !== undefined && statement.tree !== tree)) {
        return `it signs ${statement.baselines}/ at tree ${statement.tree}, not ${baselines}/ at ${tree ?? "any tree"}`;
    }
    if (typeof commit !== "string" || !TREE.test(commit) || !haveCommit(commit, cwd)) {
        return `its commit ${commit} is not in this repository`;
    }
    try {
        gitOut(cwd, ["merge-base", "--is-ancestor", commit, head]);
    } catch {
        return `its commit ${commit} is not an ancestor of ${head}`;
    }
    if (treeAt(commit, baselines, cwd) !== statement.tree) {
        return `${baselines}/ at its commit ${commit} is not the tree it signs`;
    }
    return keys ? verifyApproval(statement, keys) : null;
}

/**
 * Why a review record does not count as the owner's decisions, or null when it does: once
 * approvals are enforced, a version 2 record carrying a valid passkey approval by one of the base
 * branch's keys; before that, any record.
 * @param {any} record the parsed record (untrusted)
 * @param {object[] | null} keys the base branch's keys, null while approvals are not enforced
 * @returns {string | null} why not, or null
 */
export function recordProblem(record, keys) {
    if (
        typeof record !== "object" ||
        record === null ||
        !Array.isArray(record.items) ||
        !Array.isArray(record.rejects)
    ) {
        return "not a review record";
    }
    return keys ? verifyRecord(record, keys, { pr: record.pr ?? null }) : null;
}

/**
 * The entries of `git diff --raw -z` or `git log --raw -z`: each file's path and its blob before
 * and after (null where there is none).
 * @param {Buffer} out git's output
 * @returns {{ path: string, oldBlob: string | null, blob: string | null }[]} the entries
 */
function rawEntries(out) {
    const parts = out.toString("utf8").split("\0");
    const blob = (s) => (/^0+$/.test(s) ? null : s);
    const entries = [];
    for (let i = 0; i < parts.length - 1; i++) {
        const meta = /:\d+ \d+ ([0-9a-f]+) ([0-9a-f]+) [A-Z]\d*$/.exec(parts[i]);
        if (meta) {
            i++;
            entries.push({ path: parts[i], oldBlob: blob(meta[1]), blob: blob(meta[2]) });
        }
    }
    return entries;
}

/**
 * Several blobs read with one git process.
 * @param {string} cwd the repository
 * @param {Iterable<string>} oids the blobs
 * @returns {Map<string, Buffer>} the bytes by blob; a missing one is left out
 */
function readBlobs(cwd, oids) {
    const unique = [...new Set(oids)];
    const out = new Map();
    if (unique.length === 0) {
        return out;
    }
    const buf = execFileSync("git", ["cat-file", "--batch"], {
        cwd,
        input: `${unique.join("\n")}\n`,
        maxBuffer: 1 << 28,
    });
    let at = 0;
    for (const oid of unique) {
        const nl = buf.indexOf(10, at);
        const [, type, size] = buf.subarray(at, nl).toString("utf8").split(" ");
        if (type === "missing") {
            at = nl + 1;
            continue;
        }
        out.set(oid, buf.subarray(nl + 1, nl + 1 + Number(size)));
        at = nl + 2 + Number(size);
    }
    return out;
}

const timeOf = (s) => {
    const t = Date.parse(String(s));
    return Number.isNaN(t) ? null : t;
};

/**
 * The owner's signed decisions that can approve the baselines at `head`: the tree statements and
 * review records added or changed by the commits from `base` to `head` that verify, and the
 * rejects of those records and of the base's records made since the oldest of them.
 * @param {object} input as in baselineCoverage
 * @returns {{ statements: object[], records: object[], rejected: Map<string, { time: number, where: string }>,
 *     refused: { where: string, why: string }[] }} the valid statements and records, each with its
 *     `where` and `time`, the newest reject of each `<path> <hash>`, and the files read that do not
 *     verify, with why
 */
function signedDecisions(input) {
    const { base, head, cwd, baselines, approvals, keys } = input;
    const reviews = `${baselines}/reviews/`;
    const logged = rawEntries(
        gitOut(cwd, [
            "log",
            "--raw",
            "-z",
            "--no-renames",
            "--no-abbrev",
            "--format=",
            `${base}..${head}`,
            "--",
            `${approvals}/`,
            reviews,
        ]),
    ).filter((e) => e.blob && e.path.endsWith(".json"));
    const blobs = readBlobs(
        cwd,
        logged.map((e) => e.blob),
    );
    const parsed = [...new Map(logged.map((e) => [e.blob, e])).values()].map((e) => ({
        where: e.path,
        doc: parseOr(blobs.get(e.blob) ?? Buffer.alloc(0)),
    }));
    const refused = [];
    const valid = (x, why) => {
        if (why !== null) {
            refused.push({ where: x.where, why });
        }
        return why === null;
    };
    const statements = parsed
        .filter((s) => s.where.startsWith(`${approvals}/`))
        .filter((s) => valid(s, treeApprovalProblem(s.doc, { head, baselines, keys, cwd })))
        .map((s) => ({ ...s, time: timeOf(s.doc.approvedAt) }))
        .filter((s) => valid(s, s.time === null ? "its approvedAt is not a time" : null));
    const records = parsed
        .filter((r) => r.where.startsWith(reviews) && valid(r, recordProblem(r.doc, keys)))
        .map((r) => ({ ...r, time: timeOf(r.doc.reviewedAt) }));
    const approvalTimes = [...statements, ...records].map((x) => x.time).filter((t) => t !== null);
    const since = approvalTimes.length > 0 ? Math.min(...approvalTimes) : null;
    const rejected = new Map();
    for (const r of [...records, ...baseRecordsSince(base, cwd, reviews, keys, since)]) {
        for (const x of r.doc.rejects) {
            // A reject whose time cannot be read is newer than any approval: it fails closed.
            const time = r.time ?? Infinity;
            const key = `${x?.path} ${x?.capture}`;
            if (!rejected.has(key) || rejected.get(key).time < time) {
                rejected.set(key, { time, where: r.where });
            }
        }
    }
    return { statements, records: records.filter((r) => r.time !== null), rejected, refused };
}

/**
 * The base's valid review records named at or after a time: records are named by their UTC time
 * (`20261020T045718Z-pr3234.json`), and any other name is read too.
 * @param {string} base the base
 * @param {string} cwd the repository
 * @param {string} reviews the records directory, with its slash
 * @param {object[] | null} keys as in recordProblem
 * @param {number | null} since the oldest approval; null reads none
 * @returns {{ where: string, doc: object, time: number | null }[]} the records
 */
function baseRecordsSince(base, cwd, reviews, keys, since) {
    if (since === null) {
        return [];
    }
    const stamp = `${new Date(since).toISOString().replaceAll(/[-:]/g, "").slice(0, 15)}Z`;
    const listed = gitOut(cwd, ["ls-tree", "-z", base, "--", reviews])
        .toString("utf8")
        .split("\0")
        .filter(Boolean)
        .map((line) => {
            const [meta, path] = line.split("\t");
            return { blob: meta.split(" ")[2], path };
        })
        .filter(({ path }) => {
            const name = path.slice(reviews.length);
            return !/^\d{8}T\d{6}Z/.test(name) || name >= stamp;
        });
    const blobs = readBlobs(
        cwd,
        listed.map((e) => e.blob),
    );
    return listed
        .map((e) => ({ where: e.path, doc: parseOr(blobs.get(e.blob) ?? Buffer.alloc(0)) }))
        .filter((r) => recordProblem(r.doc, keys) === null)
        .map((r) => ({ ...r, time: timeOf(r.doc.reviewedAt) }));
}

/**
 * Composed approvals: whether the owner's signatures approve each baselines file that differs
 * between `base` and `head` (a baseline image, a story settings file, a review record, or its
 * removal).
 *
 * A file is approved by a signed tree statement (treeApprovalProblem, any tree, made at an ancestor
 * of the head) whose tree holds exactly that file at that path, or that leaves it out where the
 * statement's fork point from the base held exactly the base's file (so a tree signed before the
 * base added a file never approves deleting it); or by an item of a signed review record that takes
 * that path to exactly that content (`to`, the image's SHA-256), or for a removal from exactly the
 * base's content (`from`) to nothing. A signed review record also approves its own file. An
 * approval counts only when no signed reject of the same path and content is newer: the newest
 * approval must be later than the newest reject.
 *
 * The statements and records read are those the commits from `base` to `head` add or change; the
 * rejects, those of the same records and of the base's records made since the oldest of them.
 * Every signature verifies as one statement does, by a key of the base branch.
 * @param {object} input the work
 * @param {string} input.base the base branch tip, or a merge-queue batch's base
 * @param {string} input.head the commit being merged
 * @param {string} input.cwd the repository
 * @param {string} input.baselines the baselines directory
 * @param {string} input.approvals the approvals directory
 * @param {object[] | null} input.keys the base branch's keys, null while approvals are not enforced
 * @returns {{ files: { path: string, removed: boolean, covered: boolean, by?: string, revokedBy?: string }[],
 *     refused: { where: string, why: string }[] }} one entry per differing file, `by` the signed file
 *     that approves it, `revokedBy` the record whose newer reject undoes the newest approval; and the
 *     statements and records read that do not verify, with why
 */
export function baselineCoverage(input) {
    const { base, head, cwd, baselines } = input;
    const changed = rawEntries(
        gitOut(cwd, ["diff", "--raw", "-z", "--no-renames", "--no-abbrev", base, head, "--", `${baselines}/`]),
    );
    if (changed.length === 0) {
        return { files: [], refused: [] };
    }
    const { statements, records, rejected, refused } = signedDecisions(input);
    const trees = new Map();
    const filesOf = (s) => {
        if (!trees.has(s)) {
            const listing = gitOut(cwd, ["ls-tree", "-r", "-z", s.doc.tree]).toString("utf8").split("\0");
            trees.set(
                s,
                new Map(
                    listing.filter(Boolean).map((line) => {
                        const [meta, path] = line.split("\t");
                        return [`${baselines}/${path}`, meta.split(" ")[2]];
                    }),
                ),
            );
        }
        return trees.get(s);
    };
    const forks = new Map();
    const forkBlob = (s, path) => {
        if (!forks.has(s)) {
            forks.set(s, gitOut(cwd, ["merge-base", s.doc.commit, base]).toString("utf8").trim());
        }
        return blobAt(forks.get(s), path, cwd);
    };
    const covers = (s, c) =>
        c.blob ? filesOf(s).get(c.path) === c.blob : !filesOf(s).has(c.path) && forkBlob(s, c.path) === c.oldBlob;
    // The newest statement whose tree approves the file.
    const firstPass = changed.map((c) => ({
        c,
        tree: statements.filter((s) => covers(s, c)).sort((a, b) => b.time - a.time)[0] ?? null,
    }));
    const rejectedPaths = new Set([...rejected.keys()].map((k) => k.slice(0, k.lastIndexOf(" "))));
    // Content hashes only where a record or a reject could decide: no blob is read for a file a
    // tree approves and nothing rejects.
    const needed = firstPass.filter(({ c, tree }) => tree === null || rejectedPaths.has(c.path));
    const bytes = readBlobs(
        cwd,
        needed.map(({ c }) => c.blob ?? c.oldBlob),
    );
    const hashOf = (blob) => (bytes.has(blob) ? contentHash(bytes.get(blob)) : null);
    const files = firstPass.map(({ c, tree }) =>
        decide(c, { tree, records, rejected, hashOf, bytes, baselines, keys: input.keys }),
    );
    return { files, refused };
}

/**
 * One file's verdict in baselineCoverage.
 * @param {{ path: string, blob: string | null, oldBlob: string | null }} c the file
 * @param {object} ctx the newest statement that approves it (or null), the records and rejects,
 *     the content hash of a read blob, the read blobs, the baselines directory and the keys
 * @returns {{ path: string, removed: boolean, covered: boolean, by?: string, revokedBy?: string }} the verdict
 */
function decide(c, ctx) {
    const { tree, records, rejected, hashOf, bytes, baselines, keys } = ctx;
    const removed = c.blob === null;
    const hash = hashOf(c.blob ?? c.oldBlob);
    const takes = (i) =>
        i?.path === c.path && (removed ? i.to === null && i.from === hash : typeof i.to === "string" && i.to === hash);
    const approvals = [
        ...(tree ? [{ time: tree.time, where: tree.where }] : []),
        ...records
            .filter((r) => hash !== null && r.doc.items.some(takes))
            .map((r) => ({ time: r.time, where: r.where })),
    ];
    const own =
        !removed &&
        c.path.startsWith(`${baselines}/reviews/`) &&
        bytes.has(c.blob) &&
        recordProblem(parseOr(bytes.get(c.blob)), keys) === null;
    if (own) {
        return { path: c.path, removed, covered: true, by: c.path };
    }
    const newest = approvals.sort((a, b) => b.time - a.time)[0];
    if (!newest) {
        return { path: c.path, removed, covered: false };
    }
    const reject = rejected.get(`${c.path} ${hash}`);
    if (reject && reject.time >= newest.time) {
        return { path: c.path, removed, covered: false, revokedBy: reject.where };
    }
    return { path: c.path, removed, covered: true, by: newest.where };
}

/**
 * The blob at a path of a commit, or null.
 * @param {string} ref the commit
 * @param {string} path the path
 * @param {string} cwd the repository
 * @returns {string | null} the blob
 */
function blobAt(ref, path, cwd) {
    try {
        return (
            gitOut(cwd, ["rev-parse", "--verify", "--quiet", `${ref}:${path}`])
                .toString("utf8")
                .trim() || null
        );
    } catch {
        return null;
    }
}

/** How many unapproved files the gate names; the rest are counted. */
const LISTED = 10;

/**
 * What blocks the baselines at `head`: nothing when the baselines directory's tree is the base's;
 * otherwise every file that differs must be approved by the owner's signatures (baselineCoverage).
 * Once approvals are enforced, a change to passkeys.json fails too: an administrator merges it.
 * @param {object} input the work, as in baselineCoverage
 * @returns {string[]} one line per problem; empty when the baselines are approved
 */
export function treeApprovalProblems(input) {
    const { base, head, cwd, baselines, keys } = input;
    const problems = [];
    if (keys && gitOut(cwd, ["diff", "--name-only", base, head, "--", PASSKEYS_FILE]).toString("utf8").trim()) {
        problems.push(
            `${PASSKEYS_FILE}: changed; once a key is registered, adding or replacing one is merged by an administrator (the README, "Replacing the passkey")`,
        );
    }
    const tree = treeAt(head, baselines, cwd);
    if (tree === treeAt(base, baselines, cwd)) {
        return problems;
    }
    if (tree === null) {
        return [...problems, `${baselines}/ is gone at ${head}, and no approval can sign that`];
    }
    const { files, refused } = baselineCoverage(input);
    const open = files.filter((c) => !c.covered);
    const how = "review the changes with `visual-review serve` and Finish, which signs them";
    const lines = open.slice(0, LISTED).map((c) => {
        if (c.revokedBy) {
            return `${c.path}: approved, then rejected by the newer ${c.revokedBy}; ${how}`;
        }
        return `${c.path}: no signature of the owner approves ${c.removed ? "removing it" : "this content"}; ${how}`;
    });
    if (open.length > LISTED) {
        lines.push(`and ${open.length - LISTED} more files of ${baselines}/ no signature of the owner approves`);
    }
    // Why a signed file that looks like an approval counts for nothing, once something is unapproved.
    const notCounted = open.length > 0 ? refused.map((x) => `${x.where}: not counted, ${x.why}`) : [];
    return [...problems, ...lines, ...notCounted];
}

/**
 * The files a pull request could loosen the gate with: passkeys.json, the tool's trusted code and
 * its capture, and the workflow that runs them. A change to one is a warning, never a failure (CI
 * runs the base branch's copy of the code, and work on the tool changes it), so code review looks
 * at it.
 * @param {string} base the base branch tip
 * @param {string} head the pull request's checkout
 * @param {string} workflow the workflow file that runs the gate
 * @param {string} [cwd] the repository
 * @returns {string[]} the changed ones
 */
export function trustFilesChanged(base, head, workflow, cwd = process.cwd()) {
    const files = [PASSKEYS_FILE, "visual-review/trusted/", "visual-review/capture/", `.github/workflows/${workflow}`];
    return gitOut(cwd, ["diff", "--name-only", base, head, "--", ...files])
        .toString("utf8")
        .split("\n")
        .filter(Boolean);
}

/**
 * The pull requests of a Mergify merge-queue batch, from its draft pull request's event: the body
 * ends with a fenced yaml block whose `pull_requests:` list names each one (`- number: 988`).
 * @param {any} event the parsed GITHUB_EVENT_PATH of the queue run
 * @returns {number[]} the batch's pull request numbers; empty when the block is missing
 */
export function queuePullRequests(event) {
    const list = /^pull_requests:\r?\n((?:[ \t-].*(?:\r?\n|$))*)/m.exec(queueYaml(event))?.[1] ?? "";
    return [...list.matchAll(/^[ \t]*- number: *(\d+)[ \t]*\r?$/gm)].map((m) => Number(m[1]));
}

/**
 * The commit a Mergify merge-queue batch sits on, from the same yaml block: `checking_base_sha:`.
 * It is the default branch for the first batch, and the previous batch's draft branch for a batch
 * stacked on it (Mergify checks two batches at once).
 * @param {any} event the parsed GITHUB_EVENT_PATH of the queue run
 * @returns {string | null} the full commit hash; null when it is missing or not a full hash
 */
export function queueBaseSha(event) {
    return /^checking_base_sha: *([0-9a-f]{40})[ \t]*\r?$/m.exec(queueYaml(event))?.[1] ?? null;
}

/**
 * The last fenced yaml block of a queue draft's body, where Mergify writes the batch.
 * @param {any} event the parsed event
 * @returns {string} the block's text; empty when there is none
 */
function queueYaml(event) {
    const body = String(event?.pull_request?.body ?? "");
    return [...body.matchAll(/```yaml\r?\n([\s\S]*?)```/g)].at(-1)?.[1] ?? "";
}

/**
 * Whether the repository holds a commit, fetching it from origin when it does not (a queue base
 * on a mergify/merge-queue/* branch is not in CI's shallow checkout).
 * @param {string} sha the full commit hash
 * @param {string} cwd the repository
 * @returns {boolean} whether the commit is there now
 */
function haveCommit(sha, cwd) {
    const git = (args) => {
        try {
            gitOut(cwd, args);
            return true;
        } catch {
            return false;
        }
    };
    const has = () => git(["cat-file", "-e", `${sha}^{commit}`]);
    return has() || (git(["fetch", "--quiet", "--no-tags", "--depth=1", "--filter=blob:none", "origin", sha]) && has());
}

/**
 * Reads a merge-queue draft's event: its batch's pull requests and the commit the batch sits on,
 * printing what the gate reports about them.
 * @param {string} file the event file
 * @returns {string | null} the batch's base commit; null when the gate fails on the event
 */
function queueBaseOf(file) {
    let event = null;
    try {
        event = JSON.parse(readFileSync(file, "utf8"));
    } catch {
        // Unreadable: no pull requests, which fails below.
    }
    const prs = queuePullRequests(event);
    if (prs.length === 0) {
        console.log("::error::merge queue -- the queue's draft pull request names no pull requests of the batch");
        return null;
    }
    console.log(`Merge-queue batch: #${prs.join(", #")}`);
    const base = queueBaseSha(event);
    if (base === null || !haveCommit(base, repoRoot())) {
        console.log(
            `::error::merge queue -- the queue's draft pull request names no checking_base_sha the gate can read (${base ?? "missing"})`,
        );
        return null;
    }
    console.log(`Baseline changes compared with the batch's base ${base}`);
    return base;
}

/**
 * Prints and returns what fails the gate about the owner's approval: the keys (approvalKeys), the
 * approvals directory, and the approval of each changed baselines file (treeApprovalProblems).
 * @param {object} at what to check
 * @param {string} at.base the base branch tip, where keys and config are read
 * @param {string} at.diffBase what baseline changes are measured from
 * @param {string} at.head the head
 * @param {string} at.root the repository
 * @param {{ baselines: string, approvals: string }} at.config the base branch's config
 * @param {{ approvals: string }} at.headConfig the head's config
 * @returns {string[]} the failing lines
 */
function approvalLines({ base, diffBase, head, root, config, headConfig }) {
    const { keys, problems } = approvalKeys(base, head, root);
    if (headConfig.approvals !== config.approvals) {
        problems.push(
            `this pull request moves the approvals directory from ${config.approvals} to ${headConfig.approvals}`,
        );
    }
    const lines = problems.map((line) => `::error::passkey approval -- ${line}`);
    const { baselines, approvals } = config;
    for (const line of treeApprovalProblems({ base: diffBase, head, cwd: root, baselines, approvals, keys })) {
        lines.push(`::error::baselines not approved -- ${line}`);
    }
    for (const line of lines) {
        console.log(line);
    }
    return lines;
}

export const GATE_USAGE = `usage: visual-review gate --captures <dir> --base <ref> [--head <ref>] [--pr <number> | --queue-event <file>]

Fails (exit 1) while a pull request holds visual changes nobody accepted, or baselines the owner
has not approved: every file of the baselines directory that differs from the base must be, in a
statement or review record its commits add, exactly the file (or removal) the owner approved, with
no newer reject of it. Once ${PASSKEYS_FILE} on the base branch holds a key, those approvals must
carry the owner's passkey signature. Run it in CI after the capture jobs, on the pull request's merge commit.

  --captures <dir>  the downloaded visual-<project>-<attempt> artifacts of this run
  --base <ref>      the base branch tip (HEAD^1 on a pull request's merge commit)
  --head <ref>      the pull request's checkout (default HEAD), with its history
  --pr <number>     the pull request's number, reported only
  --queue-event <file>  in a merge-queue run, the event file of the queue's draft pull request
                    (GITHUB_EVENT_PATH): baseline changes are compared with the batch's
                    checking_base_sha instead of --base`;

/**
 * The gate as a command.
 * @param {string[]} args the command line after "gate"
 * @returns {number} the exit code
 */
export function runGate(args) {
    const { values } = parseArgs({
        args,
        options: {
            captures: { type: "string" },
            base: { type: "string" },
            head: { type: "string", default: "HEAD" },
            pr: { type: "string" },
            "queue-event": { type: "string" },
            help: { type: "boolean", default: false },
        },
    });
    if (values.help) {
        console.log(GATE_USAGE);
        return 0;
    }
    const queueEvent = values["queue-event"];
    const pr = values.pr === undefined ? undefined : Number(values.pr);
    // A batch's changes are those since the commit it sits on, not since the base branch: a batch
    // stacked on another holds that batch's approved changes, which its own run gated. If that batch
    // fails, Mergify rebuilds this one on a new base. The config, the seeded projects and the keys
    // are still read from --base.
    let queueBase = null;
    if (
        !values.captures ||
        !values.base ||
        (pr !== undefined && !(Number.isInteger(pr) && pr > 0)) ||
        (pr !== undefined && queueEvent !== undefined)
    ) {
        console.error(GATE_USAGE);
        return 2;
    }
    if (queueEvent !== undefined) {
        queueBase = queueBaseOf(queueEvent);
        if (queueBase === null) {
            return 1;
        }
    }
    const root = repoRoot();
    const config = loadConfigAt(values.base, root);
    const seeded = seededAt(values.base, root, config.baselines);
    const headConfig = loadConfigAt(values.head, root);
    const captures = newestResults(values.captures);
    const queue = queueEvent !== undefined;
    const diffBase = queueBase ?? values.base;
    const baselinesChanged = baselinesChangedBetween(diffBase, values.head, root, config.baselines);
    const notAffected = [];
    const problems = gateProblems({ config, headConfig, seeded, captures, queue, baselinesChanged, notAffected });
    for (const p of notAffected) {
        console.log(`::notice::${p} was not captured: this pull request does not affect it`);
    }
    for (const line of problems) {
        console.log(`::error::visual changes not accepted -- ${line}`);
    }
    const unrecorded = approvalLines({ base: values.base, diffBase, head: values.head, root, config, headConfig });
    for (const file of trustFilesChanged(diffBase, values.head, config.workflow, root)) {
        console.log(
            `::warning::this pull request changes ${file}, which decides what the visual gate accepts: review that change with care`,
        );
    }
    if (problems.length + unrecorded.length > 0) {
        console.log("Review them with `visual-review serve` (the @graphty/visual-review README).");
        return 1;
    }
    console.log("No unaccepted visual changes, and the baselines are the base's or approved by the owner.");
    return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    process.exitCode = runGate(process.argv.slice(2));
}
