#!/usr/bin/env node
/**
 * pr-integrity.mjs -- the "PR Integrity" check (.github/workflows/pr-integrity.yml), the rules of
 * design/ci/channels-pipeline.md section 6.4 and budgets-and-trust.md section 4. On a pull request's
 * head, measured from its merge base with master:
 *
 *   - test integrity (tools/check-test-integrity.mjs): no test, assertion, timeout, retry or threshold
 *     weakened; a code owner's approval of the head clears it;
 *   - no breaking change: a `!` in the title or a commit subject, or a `BREAKING CHANGE:` footer, fails
 *     unless a code owner approved the head;
 *   - baselines signed: a change to a PNG or story settings file under visual-baselines/ (review
 *     records aside) needs the owner's signed approval of the head's tree, checked with master's own
 *     visual-review/trusted/gate.mjs (`git archive`, never the pull request's copy);
 *   - Proof: a pull request by the agent account has a non-empty `## Proof` section;
 *   - fresh review: a pull request by the agent account has a review, by that account or a code owner,
 *     marked `<!-- fresh-review <patch id> -->` with the patch id of its own diff (`patchId` below), so a
 *     merge of master keeps the review and a change to the branch's own diff needs a new one.
 *
 * Exemptions, each decided from git, never from the author's say-so: a revert (the head's tree equals
 * `git revert -m 1 <m>` on the merge base, for a first-parent merge <m> of master the title, the
 * description or a commit names) skips Proof, review, test integrity and the baselines signature; an
 * accept-only pull request (only visual-baselines/ and visual-review-approvals/) skips Proof, review
 * and test integrity, and its signature is checked; dependabot[bot] skips Proof and review only while
 * every commit on the pull request is Dependabot's own (GitHub's commit list: author dependabot[bot],
 * committed and signed by GitHub, `onlyDependabot` below). A commit anyone else pushed to its branch (a
 * merge of master included) makes it an agent pull request: Proof and the fresh review apply.
 *
 * Usage (in Actions, with GH_TOKEN, GITHUB_REPOSITORY and GITHUB_EVENT_PATH):
 *   node tools/pr-integrity.mjs [--base origin/master]
 * or, before a pull request exists (tools/check-quick.sh), on HEAD with no GitHub call:
 *   node tools/pr-integrity.mjs --local [--base origin/master]
 * exit 1 with one `::error` line per problem.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { check as testIntegrity } from "./check-test-integrity.mjs";

export const AGENT = "graphty-agent";
/** The repository owner: the only account whose approval counts as a code owner's. */
export const OWNER = "apowers313";
export const DEPENDABOT = "dependabot[bot]";
const BASELINES = "visual-baselines";
const APPROVALS = "visual-review-approvals";

const git = (cwd, args, input) =>
    execFileSync("git", args, { cwd, input, encoding: "utf8", maxBuffer: 1 << 30, stdio: ["pipe", "pipe", "pipe"] });
const tryGit = (cwd, args) => {
    try {
        return git(cwd, args).trim();
    } catch {
        return null;
    }
};

/**
 * The patch id of a branch's own change: `git patch-id --stable` of `git diff -U0 <merge base> <head>`.
 * A merge of master moves the merge base with the branch's diff unchanged, so the id stays; no context
 * lines, so a master change next to the branch's lines does not move it either. tools/pr-review.sh
 * marks its review with this id.
 * @param cwd the repository
 * @param mergeBase the merge base with master
 * @param head the pull request's head
 * @returns the id, or null when the branch changes nothing
 */
export function patchId(cwd, mergeBase, head) {
    // the same options as tools/pr-review.sh: --binary, so a changed PNG or .wasm moves the id; the algorithm and
    // renames pinned, so a local diff setting never gives another id than CI's
    // bytes, not text: a non-UTF-8 file decoded to U+FFFD would give another id than pr-review.sh's pipe
    const bytes = (args, input) => execFileSync("git", args, { cwd, input, maxBuffer: 1 << 30, stdio: "pipe" });
    const diff = bytes([
        "diff",
        "-U0",
        "--binary",
        "--no-color",
        "--no-ext-diff",
        "--no-renames",
        "--diff-algorithm=myers",
        mergeBase,
        head,
    ]);
    return diff.length ? bytes(["patch-id", "--stable"], diff).toString("utf8").split(" ")[0] || null : null;
}

/**
 * Whether a conventional-commit subject or a commit message marks a breaking change.
 * @param message a title, or a whole commit message
 * @returns true for `type!:`, `type(scope)!:` or a `BREAKING CHANGE:` / `BREAKING-CHANGE:` footer
 */
export function isBreaking(message) {
    return /^\w+(?:\([^)]*\))?!:/u.test(message) || /^BREAKING[ -]CHANGE:/mu.test(message);
}

/**
 * Whether a pull request description has a non-empty `## Proof` section (HTML comments, such as the
 * template's hints, do not count).
 * @param body the description
 * @returns boolean
 */
export function hasProof(body = "") {
    const text = body.replaceAll(/<!--[\s\S]*?-->/gu, "");
    const m = /^##[ \t]+Proof[ \t]*$([\s\S]*?)(?=^##[ \t]|(?![\s\S]))/imu.exec(text);
    return Boolean(m && m[1].trim());
}

/**
 * Whether a code owner's latest deciding review approves the head commit.
 * @param reviews the pull request's reviews, oldest first (`{ user: { login }, state, commit_id }`)
 * @param owners the logins whose approval counts (`new Set([OWNER])`)
 * @param head the head sha
 * @returns boolean
 */
export function ownerApproved(reviews, owners, head) {
    const latest = new Map();
    for (const r of reviews) {
        if (owners.has(r.user?.login) && r.state !== "COMMENTED" && r.state !== "PENDING") {
            latest.set(r.user.login, r);
        }
    }
    return [...latest.values()].some((r) => r.state === "APPROVED" && r.commit_id === head);
}

/**
 * The first-parent merge of master this pull request reverts, when its head's tree is exactly that
 * revert applied to the merge base.
 * @param cwd the repository
 * @param opts the refs and the text to look for named commits in
 * @param opts.base master
 * @param opts.mergeBase the merge base
 * @param opts.head the head
 * @param opts.text the title, description and commit messages
 * @returns the reverted merge's sha, or null
 */
export function revertedMerge(cwd, { base, mergeBase, head, text }) {
    const named = new Set(
        [...text.matchAll(/\b[0-9a-f]{7,40}\b/gu)].map((m) =>
            tryGit(cwd, ["rev-parse", "--verify", "--quiet", `${m[0]}^{commit}`]),
        ),
    );
    named.delete(null);
    if (named.size === 0) return null;
    const firstParent = new Set(git(cwd, ["rev-list", "--first-parent", "--merges", base]).split("\n"));
    const tree = git(cwd, ["rev-parse", `${head}^{tree}`]).trim();
    for (const m of named) {
        if (!firstParent.has(m)) continue;
        const reverted = tryGit(cwd, ["merge-tree", "--write-tree", `--merge-base=${m}`, mergeBase, `${m}^1`]);
        if (reverted === tree) return m;
    }
    return null;
}

/**
 * What kind of pull request this is, for the exemptions.
 * @param cwd the repository
 * @param pr `{ base, mergeBase, head, author, byDependabot, text, files }`; byDependabot false when a
 *   commit on it is not Dependabot's own
 * @returns `{ revert, acceptOnly, dependabot, agent }`
 */
export function classify(cwd, pr) {
    const accept = (f) => f.startsWith(`${BASELINES}/`) || f.startsWith(`${APPROVALS}/`);
    return {
        revert: revertedMerge(cwd, pr),
        acceptOnly: pr.files.length > 0 && pr.files.every(accept),
        dependabot: pr.author === DEPENDABOT && pr.byDependabot !== false,
        agent: pr.author === AGENT || (pr.author === DEPENDABOT && pr.byDependabot === false),
    };
}

/**
 * Whether the pull request's own diff touches a baseline or story settings file (records aside).
 * @param files the changed paths
 * @returns boolean
 */
const changesBaselines = (files) =>
    files.some((f) => f.startsWith(`${BASELINES}/`) && !f.startsWith(`${BASELINES}/reviews/`));

/**
 * The problems of the agent-only rules: Proof and the fresh review.
 * @param cwd the repository
 * @param pr the pull request
 * @returns problems
 */
function agentProblems(cwd, pr) {
    const problems = [];
    if (!hasProof(pr.body)) {
        problems.push(
            "Proof: the description has no non-empty `## Proof` section (the command and its output, the test that failed before the fix, or a capture)",
        );
    }
    // Only the agent's own review (pr-open.sh) or a code owner's counts: anyone can review a public pull request.
    // One review per pull request (owner, 2026-10-26): any fresh-review marker counts, whatever the branch changed
    // after it, so a fix no longer needs a whole new review.
    const trusted = (r) => r.user?.login === AGENT || pr.owners.has(r.user?.login);
    if (!pr.reviews.some((r) => trusted(r) && (r.body ?? "").includes("<!-- fresh-review "))) {
        problems.push(
            "Fresh review: the pull request has no review marked <!-- fresh-review ... -->; run tools/pr-review.sh",
        );
    }
    return problems;
}

/**
 * Every problem PR Integrity finds.
 * @param cwd the repository, checked out at the head
 * @param pr `{ base, head, title, body, author, reviews, owners, baselineProblems }`;
 *     baselineProblems(mergeBase) runs master's gate on the baselines
 * @returns `{ kind, problems }`
 */
export function prIntegrity(cwd, pr) {
    const mergeBase = git(cwd, ["merge-base", pr.base, pr.head]).trim();
    const files = git(cwd, ["diff", "--name-only", "--no-renames", mergeBase, pr.head]).split("\n").filter(Boolean);
    const messages = git(cwd, ["log", "--format=%B%x00", `${mergeBase}..${pr.head}`])
        .split("\0")
        .map((m) => m.trim())
        .filter(Boolean);
    const full = { ...pr, mergeBase, files, text: [pr.title, pr.body ?? "", ...messages].join("\n") };
    const kind = classify(cwd, full);
    const approved = ownerApproved(pr.reviews, pr.owners, pr.head);
    const problems = [];
    const exempt = kind.revert || kind.acceptOnly;
    if (!exempt && !approved) {
        problems.push(
            ...testIntegrity({ base: mergeBase, head: pr.head, cwd }).map(
                (f) => `Test integrity: ${f} (a code owner's approval of the head clears it)`,
            ),
        );
    }
    if (!approved && [pr.title, ...messages].some(isBreaking)) {
        problems.push(
            "Breaking change: the title or a commit is marked `!` or has a BREAKING CHANGE footer; it needs a code owner's approval of the head",
        );
    }
    if (!kind.revert && changesBaselines(files)) {
        problems.push(...pr.baselineProblems(mergeBase).map((p) => `Baselines signed: ${p}`));
    }
    if (kind.agent && !exempt) problems.push(...agentProblems(cwd, full));
    return { kind, problems };
}

/**
 * The baselines check, with master's own gate code: `git archive <base> visual-review/trusted` into a
 * temporary directory, then its treeApprovalProblems with the keys of master's passkeys.json.
 * @param cwd the repository
 * @param base master
 * @param head the head
 * @returns (mergeBase) => problems
 */
export async function masterBaselineCheck(cwd, base, head) {
    const dir = mkdtempSync(join(tmpdir(), "pr-integrity-gate-"));
    const tar = execFileSync("git", ["archive", "--format=tar", base, "visual-review/trusted"], {
        cwd,
        maxBuffer: 1 << 28,
    });
    execFileSync("tar", ["-x", "-C", dir], { input: tar });
    const gate = await import(pathToFileURL(join(dir, "visual-review/trusted/gate.mjs")).href);
    const { keys, problems } = gate.approvalKeys(base, head, cwd);
    return (mergeBase) => [
        ...problems,
        ...gate.treeApprovalProblems({ base: mergeBase, head, cwd, baselines: BASELINES, approvals: APPROVALS, keys }),
    ];
}

const describe = (kind) =>
    [
        kind.revert && `a revert of ${kind.revert.slice(0, 10)}`,
        kind.acceptOnly && "accept-only",
        kind.dependabot && "Dependabot",
        kind.agent && "by the agent account",
    ]
        .filter(Boolean)
        .join(", ") || "an ordinary pull request";

/**
 * Whether every commit of a pull request is Dependabot's own, from GitHub's commit list (pulls/N/commits):
 * the author account dependabot[bot], committed by GitHub (web-flow) with a verified signature. A git
 * author name is free text; the account and GitHub's signature are not.
 * ponytail: GitHub maps the author account from the commit's email; the web-flow signature is what an
 * agent cannot produce for a commit it wrote locally.
 * @param commits the API's commits
 * @returns boolean
 */
export function onlyDependabot(commits) {
    return commits.every(
        (c) => c.author?.login === DEPENDABOT && c.committer?.login === "web-flow" && c.commit?.verification?.verified,
    );
}

async function main(argv) {
    const i = argv.indexOf("--base");
    const base = i === -1 ? "origin/master" : argv[i + 1];
    const cwd = process.cwd();
    // --local (tools/check-quick.sh): the branch's HEAD before it has a pull request. No title, body,
    // author or reviews, so Proof and the fresh review are not checked and nothing is approved.
    const local = argv.includes("--local");
    const event = local
        ? { head: { sha: git(cwd, ["rev-parse", "HEAD"]).trim() }, title: "", body: "", user: { login: "local" } }
        : JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")).pull_request;
    const reviews = local
        ? []
        : JSON.parse(
              execFileSync(
                  "gh",
                  [
                      "api",
                      "--paginate",
                      "--slurp",
                      `repos/${process.env.GITHUB_REPOSITORY}/pulls/${event.number}/reviews`,
                  ],
                  { encoding: "utf8", maxBuffer: 1 << 28 },
              ),
          ).flat();
    const head = event.head.sha;
    const byDependabot =
        event.user.login === DEPENDABOT
            ? onlyDependabot(
                  JSON.parse(
                      execFileSync(
                          "gh",
                          [
                              "api",
                              "--paginate",
                              "--slurp",
                              `repos/${process.env.GITHUB_REPOSITORY}/pulls/${event.number}/commits`,
                          ],
                          { encoding: "utf8", maxBuffer: 1 << 28 },
                      ),
                  ).flat(),
              )
            : undefined;
    const { kind, problems } = prIntegrity(cwd, {
        base,
        head,
        title: event.title,
        body: event.body ?? "",
        author: event.user.login,
        byDependabot,
        reviews,
        owners: new Set([OWNER]),
        baselineProblems: await masterBaselineCheck(cwd, base, head),
    });
    console.log(`PR Integrity on ${head.slice(0, 10)}: ${describe(kind)}`);
    for (const p of problems) console.log(`::error title=PR Integrity::${p.replaceAll("\n", " ")}`);
    console.log(problems.length ? `${problems.length} problem(s)` : "every rule passes");
    return problems.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
