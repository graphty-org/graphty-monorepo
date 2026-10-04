import { rmSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { mergeDecision, patchId, stackChains, stackSteps } from "../lib/prs.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

const OWNER = "apowers313";

/**
 * A pull request every line passes on.
 * @param {Partial<import("../lib/prs.mjs").MergeFacts>} [over] fields to replace
 * @returns {import("../lib/prs.mjs").MergeFacts} the facts
 */
const pr = (over = {}) => ({
    number: 700,
    author: OWNER,
    title: "fix(layout): seed rows",
    labels: [],
    commits: ["fix(layout): seed rows"],
    files: ["layout/src/a.ts"],
    dependencies: { added: [], unknownToNpm: [] },
    ownerItemOpen: false,
    job: null,
    releaseBumps: [{ project: "layout", from: "1.10.5", to: "1.10.6" }],
    ...over,
});

/**
 * Repository facts with nothing red.
 * @param {Partial<import("../lib/prs.mjs").MergeContext>} [over] fields to replace
 * @returns {import("../lib/prs.mjs").MergeContext} the context
 */
const ctx = (over = {}) => ({ login: OWNER, redLanes: [], ...over });

const SINCE = "2026-10-01T15:37:12Z";

/**
 * A githerd job whose reviews passed on patch `p1`.
 * @param {Partial<import("../lib/prs.mjs").JobFacts>} [over] fields to replace
 * @returns {import("../lib/prs.mjs").JobFacts} the job
 */
const job = (over = {}) => ({ kind: "pr", patchId: "p1", reviewed: ["p1"], securityReviewed: [], ...over });

describe("githerd/merge decision", () => {
    it("posts success when every line holds", () => {
        expect(mergeDecision(pr(), ctx())).toEqual({
            state: "success",
            description: "githerd: safe to merge",
            line: null,
        });
    });

    it("line 1: only the owner's pull requests, and nothing until the login is known", () => {
        expect(mergeDecision(pr({ author: "someone" }), ctx())).toMatchObject({
            state: "failure",
            line: 1,
            description: "held: the author someone is not the owner",
        });
        expect(mergeDecision(pr({ author: null }), ctx()).description).toContain("(unknown)");
        expect(mergeDecision(pr(), ctx({ login: null })).state).toBe("pending");
    });

    describe("line 2: holds", () => {
        it("a red CI lane holds every pull request but its incident's fix", () => {
            const red = ctx({ redLanes: [{ workflow: "CI", since: SINCE, fixPrs: [701] }] });
            expect(mergeDecision(pr({ files: ["design/x.md"] }), red)).toEqual({
                state: "failure",
                line: 2,
                description: "held: CI lane red since 10-01 15:37 UTC",
            });
            // Even before the files are read: CI can be broken by anything.
            expect(mergeDecision(pr({ files: null }), red).state).toBe("failure");
            expect(mergeDecision(pr({ number: 701 }), red).state).toBe("success");
        });

        it("a red GPU lane holds only what touches a benchmark group or the lane's scripts", () => {
            const red = ctx({ redLanes: [{ workflow: "GPU", since: SINCE }] });
            expect(mergeDecision(pr({ files: ["webgpu-graph-algorithms/src/kernel/x.ts"] }), red).description).toBe(
                "held: GPU lane red since 10-01 15:37 UTC and this pull request touches a benchmark group or the lane's scripts",
            );
            expect(mergeDecision(pr({ files: [".github/workflows/gpu.yml"] }), red).state).toBe("failure");
            expect(mergeDecision(pr({ files: ["webgpu-graph-algorithms/test/x.test.ts"] }), red).state).toBe("success");
            expect(mergeDecision(pr({ files: null }), red).state).toBe("pending");
        });

        it("a red Hosts lane holds what its paths filter selects", () => {
            const red = ctx({ redLanes: [{ workflow: "Hosts", since: SINCE }] });
            expect(mergeDecision(pr({ files: ["pnpm-lock.yaml"] }), red).description).toContain("host matrix");
            expect(mergeDecision(pr({ files: ["algorithms/src/a.ts"] }), red).state).toBe("success");
        });

        it("a lane githerd has no paths for holds everything", () => {
            const red = ctx({ redLanes: [{ workflow: "Nightly", since: SINCE }] });
            expect(mergeDecision(pr(), red).description).toBe("held: Nightly lane red since 10-01 15:37 UTC");
        });

        it("a running release holds only what changes release inputs", () => {
            const running = ctx({ releaseRunning: true });
            expect(mergeDecision(pr(), running).description).toBe(
                "held: the release job is running and this pull request changes release inputs",
            );
            expect(mergeDecision(pr({ files: ["design/x.md"] }), running).state).toBe("success");
            expect(mergeDecision(pr({ files: null }), running).state).toBe("pending");
        });

        it("hold-package holds only what changes the held package, named by directory or npm name", () => {
            const held = ctx({ heldPackages: ["@graphty/layout"] });
            expect(mergeDecision(pr(), held)).toMatchObject({
                state: "failure",
                line: 2,
                description: "held: package @graphty/layout is held by the owner",
            });
            expect(mergeDecision(pr({ files: ["algorithms/src/a.ts"] }), ctx({ heldPackages: ["layout"] })).state).toBe(
                "success",
            );
            expect(mergeDecision(pr({ files: null }), held).state).toBe("pending");
        });

        it("freeze-merges and the starvation hold hold everything", () => {
            expect(mergeDecision(pr(), ctx({ freezeMerges: true })).description).toBe("held: the owner froze merges");
            expect(mergeDecision(pr(), ctx({ starvation: "no green commit for 7 hours" })).description).toBe(
                "held: starvation hold (no green commit for 7 hours)",
            );
        });
    });

    it("line 3: a breaking commit needs ! in the title too, and an unreadable list counts as breaking", () => {
        const footer = ["fix(layout): seed rows\n\nBREAKING CHANGE: rows move"];
        expect(mergeDecision(pr({ commits: footer }), ctx())).toMatchObject({ state: "failure", line: 3 });
        expect(mergeDecision(pr({ commits: ["feat(layout)!: rows"] }), ctx()).line).toBe(3);
        expect(mergeDecision(pr({ commits: footer, title: "feat(layout)!: rows" }), ctx()).state).toBe("success");
        expect(mergeDecision(pr({ commitsTruncated: true }), ctx()).description).toContain("too long to read");
        expect(mergeDecision(pr({ commits: null }), ctx()).state).toBe("pending");
    });

    it("line 4: no added package unknown to npm", () => {
        const deps = { added: ["left-padd"], unknownToNpm: ["left-padd"] };
        expect(mergeDecision(pr({ dependencies: deps }), ctx())).toMatchObject({
            line: 4,
            description: "held: npm does not know left-padd",
        });
        expect(mergeDecision(pr({ dependencies: null }), ctx()).state).toBe("pending");
    });

    it("line 5: no needs-decision label and no open owner item", () => {
        expect(mergeDecision(pr({ labels: ["needs-decision"] }), ctx()).description).toBe("held: needs-decision label");
        expect(mergeDecision(pr({ ownerItemOpen: true }), ctx())).toMatchObject({
            line: 5,
            description: "held: waiting on the owner",
        });
    });

    describe("line 6: reviews of a githerd job's pull request", () => {
        it("needs a passed review on the current patch id", () => {
            expect(mergeDecision(pr({ job: job() }), ctx()).state).toBe("success");
            expect(mergeDecision(pr({ job: job({ patchId: "p2" }) }), ctx())).toMatchObject({
                line: 6,
                description: "held: no review has passed on this patch",
            });
            expect(mergeDecision(pr({ job: job({ patchId: null }) }), ctx()).state).toBe("pending");
        });

        it("needs a security review for sensitive paths or an added dependency", () => {
            const sensitive = pr({ files: [".husky/pre-push"], job: job() });
            expect(mergeDecision(sensitive, ctx()).description).toBe(
                "held: no security review has passed on this patch",
            );
            expect(mergeDecision({ ...sensitive, job: job({ securityReviewed: ["p1"] }) }, ctx()).state).toBe(
                "success",
            );
            const dep = pr({ dependencies: { added: ["tiny"], unknownToNpm: [] }, job: job() });
            expect(mergeDecision(dep, ctx()).line).toBe(6);
            expect(mergeDecision(pr({ files: null, job: job() }), ctx()).state).toBe("pending");
        });

        it("needs an owner session when a worker changed githerd/ or .claude/", () => {
            const owner = pr({ job: job({ workerPushedOwnerPaths: true, securityReviewed: ["p1"] }) });
            expect(mergeDecision(owner, ctx()).description).toBe(
                "held: needs owner session (a worker changed githerd/ or .claude/)",
            );
        });
    });

    describe("line 7: the release dry-run", () => {
        it("refuses a 0.x package going to 1.0.0 and a major outside an approved group", () => {
            const zero = pr({ releaseBumps: [{ project: "graph-io", from: "0.3.9", to: "1.0.0" }] });
            expect(mergeDecision(zero, ctx())).toMatchObject({
                line: 7,
                description: "held: graph-io would go from 0.3.9 to 1.0.0",
            });
            const major = pr({ releaseBumps: [{ project: "layout", from: "1.10.5", to: "2.0.0" }] });
            expect(mergeDecision(major, ctx()).description).toBe(
                "held: layout would publish major 2.0.0 outside an approved group",
            );
            expect(mergeDecision(major, ctx({ approvedMajors: ["layout"] })).state).toBe("success");
            // A 0.x breaking change bumps the minor, which is fine.
            const minor = pr({ releaseBumps: [{ project: "graph-io", from: "0.3.9", to: "0.4.0" }] });
            expect(mergeDecision(minor, ctx()).state).toBe("success");
        });

        it("treats a truncated file list as touching every path, so it never passes on what it did not see", () => {
            // Only design/ shows, but the listing stopped early: the hidden files may change release inputs.
            const cut = { files: ["design/x.md"], filesTruncated: true };
            expect(mergeDecision(pr({ ...cut, releaseBumps: null }), ctx()).state).toBe("pending");
            const major = [{ project: "layout", from: "1.10.5", to: "2.0.0" }];
            expect(mergeDecision(pr({ ...cut, releaseBumps: major }), ctx())).toMatchObject({
                state: "failure",
                line: 7,
            });
            const gpu = ctx({ redLanes: [{ workflow: "GPU", since: SINCE }] });
            expect(mergeDecision(pr(cut), gpu)).toMatchObject({ state: "failure", line: 2 });
            const sec = pr({ ...cut, job: job() });
            expect(mergeDecision(sec, ctx())).toMatchObject({ state: "failure", line: 6 });
        });

        it("waits for the dry-run only when release inputs change", () => {
            expect(mergeDecision(pr({ releaseBumps: null }), ctx()).state).toBe("pending");
            expect(mergeDecision(pr({ releaseBumps: null, files: ["design/x.md"] }), ctx()).state).toBe("success");
        });
    });

    it("line 8: an issue job acknowledged the issue's current revision", () => {
        const issue = job({ kind: "issue", issueRevision: "r2", acknowledgedRevision: "r1" });
        expect(mergeDecision(pr({ job: issue }), ctx())).toMatchObject({
            line: 8,
            description: "held: the job has not acknowledged the issue's latest edit",
        });
        expect(mergeDecision(pr({ job: { ...issue, acknowledgedRevision: "r2" } }), ctx()).state).toBe("success");
    });

    it("names the first failing line, prefers a failure to pending, and fits GitHub's 140 characters", () => {
        const both = pr({ author: "x", labels: ["needs-decision"], commits: null });
        expect(mergeDecision(both, ctx())).toMatchObject({ state: "failure", line: 1 });
        expect(mergeDecision(pr({ commits: null, labels: ["needs-decision"] }), ctx()).state).toBe("failure");
        const long = pr({
            dependencies: { added: [], unknownToNpm: Array.from({ length: 30 }, (_, i) => `package-${i}`) },
        });
        expect(mergeDecision(long, ctx()).description).toHaveLength(140);
    });
});

describe("stacks", () => {
    /**
     * An open pull request.
     * @param {number} number its number
     * @param {string} base its base branch
     * @param {string} [head] its head commit
     * @returns {import("../lib/prs.mjs").StackPr} the pull request
     */
    const open = (number, base, head = `h${number}`) => ({ number, base, headRef: `b${number}`, head });

    it("builds chains from each base branch", () => {
        const prs = [
            open(1, "master"),
            open(2, "b1"),
            open(3, "b2"),
            open(4, "b1"),
            open(5, "master"),
            open(6, "gone"),
        ];
        expect(stackChains(prs)).toEqual([
            [1, 2, 3],
            [1, 4],
        ]);
    });

    it("survives a cycle of bases", () => {
        expect(stackChains([open(1, "b2"), open(2, "b1")])).toEqual([]);
        expect(stackSteps([open(1, "b2"), open(2, "b1")], {}, [], "master")).toEqual([]);
    });

    it("retargets the children of a merged base and updates the children of a moved one, parents first", () => {
        const prs = [open(3, "b2"), open(2, "b1"), open(4, "b9"), open(5, "master")];
        const steps = stackSteps(prs, { 2: "old", 3: "h3" }, ["b1"], "master");
        expect(steps).toEqual([
            { action: "retarget", pr: 2, to: "master" },
            { action: "update", pr: 3, base: 2 },
        ]);
        // A base seen for the first time is not a move.
        expect(stackSteps(prs, {}, [], "master")).toEqual([]);
    });
});

describe("patch id", () => {
    beforeAll(() => isolateGit());
    /** @type {{tmp: string, root: string} | undefined} */
    let repo;
    afterEach(() => repo && rmSync(repo.tmp, { recursive: true, force: true }));

    it("ignores a merge from master and a baseline-only commit, and changes with the code", () => {
        repo = makeRepo();
        const { root } = repo;
        git(root, "switch", "-q", "-c", "feature");
        put(join(root, "src.txt"), "one\n");
        const head1 = commitAll(root, "feat: one", { sign: false });
        const id1 = patchId(root, "master", head1);
        expect(id1).toMatch(/^[0-9a-f]{40}$/);

        git(root, "switch", "-q", "master");
        put(join(root, "other.txt"), "master moved\n");
        commitAll(root, "chore: master", { sign: false });
        git(root, "switch", "-q", "feature");
        git(root, "merge", "-q", "--no-edit", "master");
        put(join(root, "visual-baselines/a.png"), "baseline-2\n");
        const head2 = commitAll(root, "test: accept baselines", { sign: false });
        expect(patchId(root, "master", head2)).toBe(id1);

        put(join(root, "src.txt"), "two\n");
        const head3 = commitAll(root, "feat: two", { sign: false });
        expect(patchId(root, "master", head3)).not.toBe(id1);
    });

    it("is `empty` when only baselines changed", () => {
        repo = makeRepo();
        const { root } = repo;
        git(root, "switch", "-q", "-c", "baselines");
        put(join(root, "visual-baselines/a.png"), "baseline-2\n");
        expect(patchId(root, "master", commitAll(root, "test: baselines", { sign: false }))).toBe("empty");
    });
});
