/**
 * Posting the `githerd/merge` commit status (design section 4.6) and the merge gate's part of the
 * invariant check (design section 9.5).
 *
 * Each reconcile, the daemon folds what it read about every open pull request's head into a
 * per-head record (`foldHead`, then `readDependencies` for npm's answer), builds the facts the
 * decision reads (`openPr`), and calls `postMergeStatuses`. That posts the decision of
 * `mergeDecision` on every open pull request into the default branch: always on a head it has not
 * posted on (so a merge commit from Mergify's update gets a status within one reconcile), and
 * otherwise only when the state or the description changed. A `pending` lasts at most one
 * reconcile: a fact still unread on the next one turns it into a `failure` naming the fact, because
 * a pending pull request at the front of Mergify's queue blocks every one behind it. It also
 * disarms GitHub's native auto-merge wherever it is armed, since that merges on the ruleset's two
 * checks alone and bypasses `githerd/merge`. Every write goes through the write gate as group
 * `statuses`, so in dry-run each is a `would-do` ledger line.
 *
 * The posted record (`record.posted`, by pull request number) is kept in dry-run too, so the ledger
 * shows one would-do per change, as acting mode would write it. Each entry says whether its write
 * was `performed`; once the group acts, an entry that was only a would-do counts as not posted, so
 * the real status goes out on the next reconcile. The disarm record works the same way.
 */

import { GitHubError } from "./github.mjs";
import { mergeDecision } from "./prs.mjs";

/** The commit status context. */
export const CONTEXT = "githerd/merge";
/** The write group every write here belongs to. */
const GROUP = "statuses";
/** How long one npm registry answer may take. */
const NPM_TIMEOUT_MS = 10_000;
/** Holds are posted before successes, so a low rate budget spends itself on holds first. */
const ORDER = { failure: 0, pending: 1, success: 2 };

const DISARM = `mutation DisarmAutoMerge($id: ID!) {
  disablePullRequestAutoMerge(input: {pullRequestId: $id}) { pullRequest { number } }
}`;

/**
 * @typedef {import("./prs.mjs").MergeFacts} MergeFacts
 * @typedef {import("./prs.mjs").MergeContext} MergeContext
 * @typedef {import("./prs.mjs").MergeStatus} MergeStatus
 * @typedef {{
 *   sha: string, commits: string[] | null, commitsTruncated: boolean, files: string[] | null,
 *   filesTruncated: boolean, added: string[] | null,
 *   dependencies: {added: string[], unknownToNpm: string[]} | null,
 * }} HeadFacts what githerd read about one head: its commit messages, its changed files, the
 *   packages its manifests add (null while a manifest's patch is unread), and npm's answer for them
 * @typedef {MergeFacts & {head: string, base: string, nodeId: string | null, autoMergeAt: string | null}}
 *   OpenPr an open pull request: the decision's facts, its head commit, its base branch, its
 *   GraphQL node id, and when native auto-merge was armed on it (null when it is not)
 * @typedef {{sha: string, state: string, description: string, line: number | null, evaluated: boolean,
 *   performed?: boolean}} Posted the status last posted (or recorded as a would-do) on a pull
 *   request; `evaluated` is set once a reconcile has posted `pending` on this head, `performed` when
 *   the write was sent rather than recorded
 * @typedef {{at: string, performed: boolean}} Disarmed the auto-merge arming a disarm answered, and
 *   whether it was sent
 * @typedef {{posted?: Record<string, Posted>, disarmed?: Record<string, Disarmed | string>}}
 *   StatusRecord the persisted record: what was posted, and the disarms (a bare string is an entry
 *   from before `performed` was kept, read as not sent)
 * @typedef {(name: string) => Promise<boolean | null>} NpmLookup whether npm knows a package:
 *   true, false (404), or null when the registry did not answer
 */

/**
 * The packages a set of `package.json` patches adds: a `"name": "spec"` line added with a
 * version-like spec whose name no removed line has (a version bump removes and adds the same
 * name). Workspace, catalog, file and link specs are this repository's own and are left out.
 * ponytail: reads unified-diff lines, not JSON; an added `"x": "^1"` outside a dependency block is
 * also checked against npm, which costs one registry call and never passes a bad package.
 * @param {string[]} patches the unified-diff patch of each changed `package.json`
 * @returns {string[]} the names npm must know, sorted
 */
export function addedDependencies(patches) {
    const line = /^([+-])\s*"(@?[a-z0-9][\w.-]*(?:\/[\w.-]+)?)":\s*"([^"]*)"/;
    const versionLike = /^(?:[\^~<>=*\d]|x\b|latest$|npm:|github:|git|https?:)/;
    const notPackages = new Set(["version", "node", "npm", "pnpm", "yarn"]);
    const added = new Set();
    const removed = new Set();
    for (const patch of patches) {
        for (const text of patch.split("\n")) {
            const m = line.exec(text);
            if (!m || notPackages.has(m[2]) || !versionLike.test(m[3])) continue;
            (m[1] === "+" ? added : removed).add(m[2]);
        }
    }
    return [...added].filter((n) => !removed.has(n)).sort((a, b) => a.localeCompare(b));
}

/**
 * Whether npm's registry knows a package, through `fetch`.
 * @param {typeof fetch} [fetchFn] the fetch to use
 * @returns {NpmLookup} the lookup
 */
export function npmLookup(fetchFn = fetch) {
    return async (name) => {
        try {
            const res = await fetchFn(`https://registry.npmjs.org/${name.replace("/", "%2f")}`, {
                headers: { accept: "application/vnd.npm.install-v1+json" },
                signal: AbortSignal.timeout(NPM_TIMEOUT_MS),
            });
            await res.body?.cancel();
            if (res.status === 404) return false;
            return res.ok ? true : null;
        } catch {
            return null;
        }
    };
}

/**
 * Folds one poll's read of a pull request into its head's record. A new head starts empty; the
 * same head keeps what was read for it. `node.detail` holds what the poll read for this head:
 * `commits` (`{messages, truncated}`), `files` (paths), `filesTruncated`, and `packagePatches`,
 * the patch of each changed `package.json` in `files` order (null for one GitHub left out).
 * @param {HeadFacts | undefined} prev the record from the last poll
 * @param {any} node the GraphQL pull request node, with `detail`
 * @returns {HeadFacts} the record for its current head
 */
export function foldHead(prev, node) {
    const d = node.detail ?? {};
    /** @type {HeadFacts} */
    const head =
        prev?.sha === node.headRefOid
            ? { ...prev }
            : {
                  sha: node.headRefOid,
                  commits: null,
                  commitsTruncated: false,
                  files: null,
                  filesTruncated: false,
                  added: null,
                  dependencies: null,
              };
    if (d.commits) {
        head.commits = d.commits.messages;
        head.commitsTruncated = d.commits.truncated === true;
    }
    if (d.files) {
        head.files = d.files;
        head.filesTruncated = d.filesTruncated === true;
        head.dependencies = null;
        const manifests = d.files.filter(
            (/** @type {string} */ f) => f === "package.json" || f.endsWith("/package.json"),
        );
        const patches = d.packagePatches ?? [];
        const readable =
            !head.filesTruncated &&
            patches.length === manifests.length &&
            patches.every((/** @type {unknown} */ p) => typeof p === "string");
        // A truncated listing may hide a manifest, so what it adds stays unread.
        head.added = readable ? addedDependencies(patches) : null;
    }
    return head;
}

/**
 * Asks npm about the packages a head adds, once per head: sets `dependencies` when every answer
 * came, and leaves it null otherwise, to ask again next reconcile.
 * @param {HeadFacts} head the head's record, changed in place
 * @param {NpmLookup} lookup the registry lookup
 * @returns {Promise<HeadFacts>} the same record
 */
export async function readDependencies(head, lookup) {
    if (head.dependencies || head.added === null) return head;
    const added = head.added;
    const answers = await Promise.all(added.map((name) => lookup(name)));
    if (answers.includes(null)) return head;
    head.dependencies = { added, unknownToNpm: added.filter((_, i) => answers[i] === false) };
    return head;
}

/**
 * The facts the decision and the poster read about one open pull request.
 * @param {any} node the GraphQL pull request node (`id`, `number`, `title`, `author`, `labels`,
 *   `headRefOid`, `baseRefName`, `autoMergeRequest`)
 * @param {HeadFacts} head its head's record
 * @param {Partial<MergeFacts>} [extra] what other parts of githerd know: `ownerItemOpen`, `job`,
 *   `releaseBumps`
 * @returns {OpenPr} the facts
 */
export function openPr(node, head, extra = {}) {
    return {
        number: node.number,
        author: node.author?.login ?? null,
        title: node.title,
        labels: (node.labels?.nodes ?? []).map((/** @type {any} */ l) => l.name),
        commits: head.commits,
        commitsTruncated: head.commitsTruncated,
        files: head.files,
        filesTruncated: head.filesTruncated,
        dependencies: head.dependencies,
        ownerItemOpen: false,
        job: null,
        releaseBumps: null,
        ...extra,
        head: node.headRefOid,
        base: node.baseRefName,
        nodeId: node.id ?? null,
        autoMergeAt: node.autoMergeRequest?.enabledAt ?? null,
    };
}

/**
 * The facts the decision still waits for, in words. When every other fact is read, the only one
 * left is the release dry-run (the decision waits on nothing else).
 * @param {MergeFacts} pr the pull request
 * @param {MergeContext} ctx the repository facts
 * @returns {string[]} the unread facts
 */
function unreadFacts(pr, ctx) {
    const unread = [];
    if (!ctx.login) unread.push("the owner's login");
    if (pr.commits === null) unread.push("its commits");
    if (pr.files === null) unread.push("its files");
    if (pr.dependencies === null) unread.push("npm's answer for the packages it adds");
    if (pr.job?.patchId === null) unread.push("its patch id");
    return unread.length ? unread : ["the release dry-run"];
}

/**
 * The status to post: the decision, except that a head already posted `pending` once gets a
 * `failure` naming what is still unread, so no `pending` outlives one reconcile.
 * @param {MergeFacts} pr the pull request
 * @param {MergeContext} ctx the repository facts
 * @param {Posted | undefined} prev what was last posted on it
 * @param {string} head its head commit
 * @returns {MergeStatus} the status
 */
function statusFor(pr, ctx, prev, head) {
    const status = mergeDecision(pr, ctx);
    if (status.state !== "pending" || prev?.sha !== head || !prev.evaluated) return status;
    const description = `held: githerd could not read ${unreadFacts(pr, ctx).join(", ")}`.slice(0, 140);
    return { state: "failure", description, line: null };
}

/**
 * Posts `githerd/merge` on every open pull request into the default branch whose head is new or
 * whose status changed, holds first, and disarms native auto-merge wherever it is armed. A write
 * the gate or GitHub refuses is left unrecorded, so the next reconcile tries it again.
 * @param {{
 *   github: ReturnType<typeof import("./github.mjs").createGitHub>, repo: string, branch: string,
 *   prs: OpenPr[], ctx: MergeContext, record: StatusRecord,
 * }} options the client, `owner/name`, the default branch, every open pull request, the
 *   repository facts, and the persisted record (changed in place)
 * @returns {Promise<{written: number, errors: string[]}>} how many statuses were posted or recorded
 *   as would-dos, and the refusals
 */
export async function postMergeStatuses({ github, repo, branch, prs, ctx, record }) {
    const posted = (record.posted ??= {});
    const disarmed = (record.disarmed ??= {});
    const open = new Set(prs.map((p) => String(p.number)));
    for (const n of Object.keys(posted)) if (!open.has(n)) delete posted[n];
    for (const n of Object.keys(disarmed)) if (!open.has(n)) delete disarmed[n];
    /** @type {string[]} */
    const errors = [];
    /**
     * Runs one write, collecting a refusal instead of throwing it.
     * @param {() => Promise<void>} write the write
     */
    const attempt = async (write) => {
        try {
            await write();
        } catch (err) {
            if (!(err instanceof GitHubError)) throw err;
            errors.push(err.message);
        }
    };

    const acting = github.acting(GROUP);
    /**
     * Whether a record entry stands for a write that needs no repeat: one that was sent, or any
     * entry while the group does not act.
     * @param {{performed?: boolean} | undefined} entry the entry
     * @returns {boolean} true when it counts as done
     */
    const done = (entry) => Boolean(entry) && (entry?.performed === true || !acting);
    for (const p of prs) {
        const d = disarmed[p.number];
        if (!p.autoMergeAt || !p.nodeId || (typeof d === "object" && d.at === p.autoMergeAt && done(d))) continue;
        await attempt(async () => {
            const res = await github.mutate(
                DISARM,
                { id: p.nodeId },
                {
                    group: GROUP,
                    check: { path: `repos/${repo}/pulls/${p.number}`, expect: { auto_merge: null } },
                    retry: true,
                    fields: { situation: "native auto-merge armed", pr: p.number },
                },
            );
            disarmed[p.number] = { at: /** @type {string} */ (p.autoMergeAt), performed: res.performed };
        });
    }

    const due = prs
        .filter((p) => p.base === branch)
        .map((p) => ({ p, status: statusFor(p, ctx, posted[p.number], p.head) }))
        .filter(({ p, status }) => {
            const prev = posted[p.number];
            if (!done(prev)) return true;
            return prev?.sha !== p.head || prev.state !== status.state || prev.description !== status.description;
        })
        .sort((a, b) => ORDER[a.status.state] - ORDER[b.status.state] || a.p.number - b.p.number);
    let written = 0;
    for (const { p, status } of due) {
        await attempt(async () => {
            const body = { state: status.state, description: status.description, context: CONTEXT };
            const res = await github.write("POST", `repos/${repo}/statuses/${p.head}`, body, {
                group: GROUP,
                check: {
                    path: `repos/${repo}/commits/${p.head}/status?per_page=100`,
                    expect: { statuses: [{ context: CONTEXT, state: status.state, description: status.description }] },
                },
                retry: true,
                fields: { situation: status.line ? `${status.state} line ${status.line}` : status.state, pr: p.number },
            });
            const prev = posted[p.number];
            const evaluated = status.state === "pending" || (prev?.sha === p.head && prev.evaluated);
            posted[p.number] = { sha: p.head, ...status, evaluated, performed: res.performed };
            written++;
        });
    }
    return { written, errors };
}

/**
 * Whether a `.mergify.yml` makes Mergify wait for `githerd/merge`: a `check-success` and a
 * `-check-failure` condition on it (design 4.6, coordination task C1).
 * ponytail: looks for the two list lines anywhere in the file, not under their exact keys.
 * @param {string | null} text the file on the default branch, or null when it could not be read
 * @returns {boolean} true when both lines are there
 */
export function mergifyRequires(text) {
    if (!text) return false;
    const has = (/** @type {string} */ cond) =>
        new RegExp(String.raw`^\s*-\s*["']?${cond}=githerd/merge["']?\s*(#.*)?$`, "m").test(text);
    return has("check-success") && has("-check-failure");
}

/**
 * The merge gate's part of the invariant check (design 9.5): every open pull request into the
 * default branch has a current `githerd/merge`, and no native auto-merge is armed (faults); and
 * the banner while master's `.mergify.yml` does not wait for `githerd/merge`. While the `statuses`
 * group acts, only a status that was sent covers a head; a would-do does not.
 * @param {{prs: OpenPr[], branch: string, record: StatusRecord, mergify: string | null,
 *   acting?: boolean}} options every open pull request, the default branch, the persisted record,
 *   `.mergify.yml` on the default branch, and whether the `statuses` group acts
 * @returns {{faults: {record: string, problem: string}[], banners: string[]}} the violations
 */
export function mergeGateChecks({ prs, branch, record, mergify, acting = false }) {
    const faults = [];
    for (const p of prs) {
        const posted = record.posted?.[p.number];
        if (p.base === branch && (posted?.sha !== p.head || (acting && !posted.performed))) {
            faults.push({ record: `pr ${p.number}`, problem: `no current ${CONTEXT} status on its head` });
        }
        if (p.autoMergeAt) {
            faults.push({ record: `pr ${p.number}`, problem: `native auto-merge is armed; it bypasses ${CONTEXT}` });
        }
    }
    const banners = mergifyRequires(mergify) ? [] : [`Mergify does not wait for ${CONTEXT}`];
    return { faults, banners };
}
