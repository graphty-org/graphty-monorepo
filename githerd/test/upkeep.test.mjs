import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { createGitHub } from "../lib/github.mjs";
import {
    mergeTree,
    nextStackRecord,
    recoverInherited,
    updateDequeued,
    updatePr,
    upkeepStacks,
} from "../lib/upkeep.mjs";
import { createFakeGh, httpOutput } from "./helpers/fake-gh.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

const REPO = "o/r";

/** @type {{tmp: string, root: string, remote: string}} */
let repo;
/** @type {any[]} */
let ledger;

beforeAll(() => isolateGit());
beforeEach(() => {
    repo = makeRepo();
    ledger = [];
});
afterEach(() => rmSync(repo.tmp, { recursive: true, force: true }));

/**
 * Makes a branch from `from` with one commit writing `path`, and pushes it.
 * @param {string} name the branch
 * @param {string} from where it starts
 * @param {string} path the file it writes
 * @param {string} data the file's contents
 * @returns {string} its head
 */
function branch(name, from, path, data) {
    git(repo.root, "checkout", "-q", "-B", name, from);
    put(join(repo.root, path), data);
    const head = commitAll(repo.root, `feat: ${name}`);
    git(repo.root, "push", "-q", "-f", "origin", `${name}:refs/heads/${name}`);
    git(repo.root, "checkout", "-q", "master");
    return head;
}

/**
 * Adds a commit to master writing `path`, and pushes it.
 * @param {string} path the file
 * @param {string} data its contents
 * @returns {string} master's new head
 */
function masterCommit(path, data) {
    put(join(repo.root, path), data);
    const head = commitAll(repo.root, `fix: ${path}`);
    git(repo.root, "push", "-q", "origin", "master");
    return head;
}

/**
 * The remote's head of a branch.
 * @param {string} name the branch
 * @returns {string} its SHA
 */
const remoteHead = (name) => git(repo.remote, "rev-parse", `refs/heads/${name}`);

/**
 * A fake GitHub that accepts update-branch and retarget and reads the pull request back changed.
 * @param {{updateStatus?: number}} [o] the status update-branch answers
 * @returns {ReturnType<typeof createFakeGh>} the fake
 */
function fakeGitHub({ updateStatus = 202 } = {}) {
    return createFakeGh(({ args }) => {
        const path = args.at(-1) === "-" ? args.at(-3) : args.at(-1);
        if (path?.endsWith("/update-branch")) {
            return httpOutput({ status: updateStatus, body: { message: updateStatus === 202 ? "Updating" : "stale" } });
        }
        if (args.includes("PATCH")) return httpOutput({ status: 200, body: { base: { ref: "master" } } });
        return httpOutput({ status: 200, body: { head: { sha: "moved" }, base: { ref: "master" } } });
    });
}

/**
 * The context of one reconcile.
 * @param {ReturnType<typeof createFakeGh>} fake the fake GitHub
 * @param {string} mode the upkeep group's mode
 * @param {Record<string, unknown>} [over] other context fields
 * @returns {any} the context
 */
function context(fake, mode, over = {}) {
    const record = (/** @type {any} */ e) => ledger.push(e);
    const gh = createGitHub({ repo: REPO, fetch: fake.fetch, token: fake.token, mode: () => mode, ledger: record });
    return { gh, repo: REPO, root: repo.root, mode: () => mode, ledger: record, ...over };
}

/**
 * Lists the worktrees of the main checkout.
 * @returns {string[]} their paths
 */
const worktrees = () =>
    git(repo.root, "worktree", "list", "--porcelain")
        .split("\n")
        .filter((l) => l.startsWith("worktree "));

describe("mergeTree", () => {
    it("lists the paths that conflict, and none for a clean merge", async () => {
        const base = git(repo.root, "rev-parse", "HEAD");
        const head = branch("c", base, "README.md", "theirs\n");
        const clean = branch("d", base, "other.txt", "x\n");
        const master = masterCommit("README.md", "ours\n");
        const ctx = context(fakeGitHub(), "acting");
        expect((await mergeTree(ctx, head, master)).conflicts).toEqual(["README.md"]);
        expect((await mergeTree(ctx, clean, master)).conflicts).toEqual([]);
        await expect(mergeTree(ctx, "nope", master)).rejects.toThrow(/merge-tree/);
    });
});

describe("updatePr", () => {
    /** @type {string} */
    let base;
    beforeEach(() => {
        base = git(repo.root, "rev-parse", "HEAD");
    });

    it("does nothing for a pull request that already has the commit", async () => {
        const head = branch("c", base, "a.txt", "a\n");
        const fake = fakeGitHub();
        const pr = { number: 7, base: "master", headRef: "c", head };
        expect(await updatePr(context(fake, "acting"), { pr, onto: base, tip: base, reason: "unparked" })).toEqual({
            path: "none",
            result: "current",
        });
        expect(fake.calls).toHaveLength(0);
    });

    it("uses update-branch when the commit to merge is master's tip, and only records it in dry-run", async () => {
        const head = branch("c", base, "a.txt", "a\n");
        const green = masterCommit("b.txt", "b\n");
        const pr = { number: 7, base: "master", headRef: "c", head };
        const update = { pr, onto: green, tip: green, reason: "failing key fixed on master" };

        const dry = fakeGitHub();
        expect(await updatePr(context(dry, "dry-run"), update)).toEqual({ path: "update-branch", result: "would-do" });
        expect(dry.calls).toHaveLength(0);
        expect(ledger).toEqual([
            {
                kind: "would-do",
                op: "PUT pulls/7/update-branch",
                group: "upkeep",
                body: { expected_head_sha: head },
                situation: "failing key fixed on master",
                target: "pr:7",
            },
        ]);

        const fake = fakeGitHub();
        expect(await updatePr(context(fake, "acting"), update)).toEqual({ path: "update-branch", result: "updated" });
        expect(fake.writes().map((c) => c.args.slice(2, 5))).toEqual([
            ["-X", "PUT", `repos/${REPO}/pulls/7/update-branch`],
        ]);
        expect(JSON.parse(fake.writes()[0].input ?? "")).toEqual({ expected_head_sha: head });
    });

    it("answers stale when GitHub refuses the expected head", async () => {
        const head = branch("c", base, "a.txt", "a\n");
        const green = masterCommit("b.txt", "b\n");
        const pr = { number: 7, base: "master", headRef: "c", head };
        const ctx = context(fakeGitHub({ updateStatus: 422 }), "acting");
        expect(await updatePr(ctx, { pr, onto: green, tip: green, reason: "unparked" })).toMatchObject({
            path: "update-branch",
            result: "stale",
        });
        const broken = context(fakeGitHub({ updateStatus: 404 }), "acting");
        await expect(updatePr(broken, { pr, onto: green, tip: green, reason: "unparked" })).rejects.toMatchObject({
            status: 404,
        });
    });

    it("merges the CI-green commit locally, signed, and pushes it when master's tip is past it", async () => {
        const head = branch("c", base, "a.txt", "a\n");
        const green = masterCommit("b.txt", "b\n");
        const tip = masterCommit("c.txt", "red\n");
        const pr = { number: 7, base: "master", headRef: "c", head };
        const update = { pr, onto: green, tip, reason: "failing key fixed on master" };

        const dry = fakeGitHub();
        expect(await updatePr(context(dry, "dry-run"), update)).toEqual({ path: "local", result: "would-do" });
        expect(remoteHead("c")).toBe(head);
        expect(dry.calls).toHaveLength(0);

        /** @type {string[]} */
        const queued = [];
        const queue = (/** @type {string} */ label, /** @type {() => Promise<any>} */ task) => {
            queued.push(label);
            return task();
        };
        const fake = fakeGitHub();
        expect(await updatePr(context(fake, "acting", { queue }), update)).toEqual({
            path: "local",
            result: "updated",
        });
        const pushed = remoteHead("c");
        expect(git(repo.root, "rev-list", "--parents", "-n", "1", pushed).split(" ").slice(1)).toEqual([head, green]);
        expect(git(repo.root, "log", "-1", "--format=%G?", pushed)).toBe("G");
        expect(() => git(repo.root, "merge-base", "--is-ancestor", tip, pushed)).toThrow();
        expect(queued).toEqual([`merge ${green.slice(0, 12)} into c and push`]);
        expect(fake.calls).toHaveLength(0);
        expect(worktrees()).toHaveLength(1);
        expect(ledger.at(-1)).toMatchObject({ kind: "action", result: "pushed", head: pushed, group: "upkeep" });
    });

    it("refuses to push over a branch that moved, and removes its worktree", async () => {
        const head = branch("c", base, "a.txt", "a\n");
        const green = masterCommit("b.txt", "b\n");
        const tip = masterCommit("c.txt", "red\n");
        const moved = branch("c", head, "d.txt", "someone else\n");
        const pr = { number: 7, base: "master", headRef: "c", head };
        const ctx = context(fakeGitHub(), "acting");
        expect(await updatePr(ctx, { pr, onto: green, tip, reason: "unparked" })).toMatchObject({
            path: "local",
            result: "failed",
        });
        expect(remoteHead("c")).toBe(moved);
        expect(worktrees()).toHaveLength(1);
        expect(existsSync(join(repo.root, ".worktrees", "githerd-update-7"))).toBe(false);
        expect(ledger.at(-1)).toMatchObject({ kind: "action", result: "failed" });
    });

    it("leaves a code conflict to a pr job", async () => {
        const head = branch("c", base, "README.md", "theirs\n");
        const green = masterCommit("README.md", "ours\n");
        const fake = fakeGitHub();
        const pr = { number: 7, base: "master", headRef: "c", head };
        expect(await updatePr(context(fake, "acting"), { pr, onto: green, tip: green, reason: "unparked" })).toEqual({
            path: "none",
            result: "conflict",
            conflicts: ["README.md"],
        });
        expect(fake.calls).toHaveLength(0);
        expect(remoteHead("c")).toBe(head);
    });

    describe("a conflict only in visual baselines", () => {
        /** @type {string} */
        let head;
        /** @type {string} */
        let green;
        /** @type {any} */
        let pr;
        beforeEach(() => {
            head = branch("c", base, "visual-baselines/a.png", "branch\n");
            green = masterCommit("visual-baselines/a.png", "master\n");
            pr = { number: 7, base: "master", headRef: "c", head };
        });

        /**
         * A review tool that pushes master's side as the update, the way `visual-review update` does.
         * @returns {string[]} the command
         */
        function fakeTool() {
            git(repo.root, "checkout", "-q", "-B", "resolved", head);
            git(repo.root, "merge", "-q", "-s", "ours", "--no-edit", green);
            put(join(repo.root, "visual-baselines/a.png"), "master\n");
            const resolved = commitAll(repo.root, "test: take master's baselines");
            git(repo.root, "checkout", "-q", "master");
            return ["git", "push", "-q", "origin", `${resolved}:refs/heads/c`];
        }

        it("runs the review tool through the push queue, and only records it in dry-run", async () => {
            const tool = fakeTool();
            const dry = fakeGitHub();
            const update = { pr, onto: green, tip: green, reason: "stack base moved" };
            expect(await updatePr(context(dry, "dry-run", { reviewTool: tool }), update)).toEqual({
                path: "review-tool",
                result: "would-do",
                conflicts: ["visual-baselines/a.png"],
            });
            expect(remoteHead("c")).toBe(head);
            expect(ledger).toEqual([
                {
                    kind: "would-do",
                    op: "visual-review update 7",
                    group: "upkeep",
                    situation: "stack base moved, baseline-only conflict",
                    target: "pr:7",
                },
            ]);

            // Under sh -c the appended pull request number is only $0.
            const wrapped = ["sh", "-c", tool.join(" ")];
            expect(await updatePr(context(dry, "acting", { reviewTool: wrapped }), update)).toMatchObject({
                path: "review-tool",
                result: "updated",
            });
            expect(remoteHead("c")).not.toBe(head);
            expect(dry.calls).toHaveLength(0);
        });

        it("hands a refusal of the review tool to a pr job", async () => {
            const ctx = context(fakeGitHub(), "acting", { reviewTool: ["sh", "-c", "echo refused >&2; exit 1", "x"] });
            expect(await updatePr(ctx, { pr, onto: green, tip: green, reason: "unparked" })).toMatchObject({
                path: "review-tool",
                result: "conflict",
                why: "refused",
            });
            expect(ledger.map((e) => e.result)).toEqual(["failed"]);
        });

        it("hands a stacked child's baseline conflict to a pr job, since the tool merges master", async () => {
            const child = { ...pr, base: "a" };
            const ctx = context(fakeGitHub(), "acting", { reviewTool: ["false"] });
            expect(await updatePr(ctx, { pr: child, onto: green, tip: green, reason: "stack base moved" })).toEqual({
                path: "none",
                result: "conflict",
                conflicts: ["visual-baselines/a.png"],
            });
        });

        it("waits while master's tip is not the commit to merge, because the tool merges the tip", async () => {
            const tip = masterCommit("c.txt", "red\n");
            const ctx = context(fakeGitHub(), "acting", { reviewTool: ["false"] });
            expect(await updatePr(ctx, { pr, onto: green, tip, reason: "unparked" })).toMatchObject({
                path: "none",
                result: "wait",
            });
            expect(ledger).toEqual([]);
        });
    });
});

describe("upkeepStacks", () => {
    /**
     * A stack of b on a on master, with a's head moved since the last poll.
     * @returns {{prs: any[], before: string}} the open pull requests and a's previous head
     */
    function stack() {
        const base = git(repo.root, "rev-parse", "HEAD");
        const before = branch("a", base, "a.txt", "a\n");
        const b = branch("b", before, "b.txt", "b\n");
        const a = branch("a", before, "a2.txt", "a2\n");
        return {
            before,
            prs: [
                { number: 1, base: "master", headRef: "a", head: a },
                { number: 2, base: "a", headRef: "b", head: b },
            ],
        };
    }

    it("updates a child from its base's moved head with GitHub's update, parents first", async () => {
        const { prs, before } = stack();
        const fake = fakeGitHub();
        const poll = { prs, lastHeads: { 1: before }, mergedHeads: [] };
        const out = await upkeepStacks(context(fake, "acting"), poll);
        expect(out).toEqual([
            { pr: 2, action: "update", base: 1, result: { path: "update-branch", result: "updated" } },
        ]);
        expect(fake.writes().map((c) => c.args[4])).toEqual([`repos/${REPO}/pulls/2/update-branch`]);

        ledger = [];
        const dry = fakeGitHub();
        await upkeepStacks(context(dry, "dry-run"), poll);
        expect(dry.calls).toHaveLength(0);
        expect(ledger).toMatchObject([{ kind: "would-do", situation: "stack base moved", target: "pr:2" }]);
    });

    it("retargets a child whose base merged, and writes nothing in dry-run", async () => {
        const { prs } = stack();
        const open = [prs[1]];

        const dry = fakeGitHub();
        const out = await upkeepStacks(context(dry, "dry-run"), { prs: open, lastHeads: {}, mergedHeads: ["a"] });
        expect(out).toEqual([{ pr: 2, action: "retarget", result: { performed: false, op: "PATCH pulls/2" } }]);
        expect(dry.calls).toHaveLength(0);
        expect(ledger[0]).toMatchObject({ kind: "would-do", body: { base: "master" }, situation: "stack base merged" });

        const fake = fakeGitHub();
        const acted = await upkeepStacks(context(fake, "acting"), { prs: open, lastHeads: {}, mergedHeads: ["a"] });
        expect(acted[0].result).toMatchObject({ performed: true, stuck: true });
        expect(fake.writes().map((c) => c.args.slice(2, 5))).toEqual([["-X", "PATCH", `repos/${REPO}/pulls/2`]]);
        expect(JSON.parse(fake.writes()[0].input ?? "")).toEqual({ base: "master" });
    });

    it("updates the child on the next reconcile when update-branch refused it once", async () => {
        const { prs, before } = stack();
        let refuse = 1;
        const fake = createFakeGh(({ args }) => {
            const path = args.at(-1) === "-" ? args.at(-3) : args.at(-1);
            if (path?.endsWith("/update-branch")) {
                if (refuse-- > 0) return httpOutput({ status: 422, body: { message: "expected head sha differed" } });
                return httpOutput({ status: 202, body: { message: "Updating" } });
            }
            return httpOutput({ status: 200, body: { head: { sha: "moved" } } });
        });
        let poll = { prs, lastHeads: { 1: before, 2: prs[1].head }, mergedHeads: [] };
        const first = await upkeepStacks(context(fake, "acting"), poll);
        expect(first[0].result).toMatchObject({ result: "stale" });
        poll = { prs, ...nextStackRecord(poll, first) };
        expect(poll.lastHeads[1]).toBe(before);

        const second = await upkeepStacks(context(fake, "acting"), poll);
        expect(second[0].result).toEqual({ path: "update-branch", result: "updated" });
        poll = { prs, ...nextStackRecord(poll, second) };
        expect(poll.lastHeads[1]).toBe(prs[0].head);
        expect(await upkeepStacks(context(fake, "acting"), poll)).toEqual([]);
        expect(fake.writes().filter((c) => c.args.some((a) => a.endsWith("/update-branch")))).toHaveLength(2);
    });

    it("keeps going after a step that throws, and keeps the merged branch of a retarget that threw", async () => {
        const { prs } = stack();
        const fake = createFakeGh(() => httpOutput({ status: 500, body: "boom" }));
        const poll = { prs: [prs[1]], lastHeads: {}, mergedHeads: ["a"] };
        const out = await upkeepStacks(context(fake, "acting"), poll);
        expect(out).toEqual([{ pr: 2, action: "retarget", error: expect.stringContaining("500") }]);
        expect(ledger.at(-1)).toMatchObject({ kind: "error", where: "stacks", target: "pr:2" });
        expect(nextStackRecord(poll, out).mergedHeads).toEqual(["a"]);
        expect(nextStackRecord(poll, []).mergedHeads).toEqual([]);
    });

    it("does nothing when no base moved or merged", async () => {
        const { prs } = stack();
        const fake = fakeGitHub();
        expect(
            await upkeepStacks(context(fake, "acting"), {
                prs,
                lastHeads: { 1: prs[0].head, 2: prs[1].head },
                mergedHeads: [],
            }),
        ).toEqual([]);
        expect(fake.calls).toHaveLength(0);
    });
});

describe("recoverInherited", () => {
    const KEY = "CI / Test / unit";
    const TRAIN = "^chore\\(release\\): publish";
    /**
     * Five pull requests failing All Checks Pass: #7 only on master's red key, #8 on its own, and
     * #9 (a draft), #10 (the release train) and #11 (from a fork) only on master's red key.
     * @param {boolean} red whether master's CI lane is still red on the key
     * @param {Record<number, string>} heads each pull request's head
     * @returns {{prs: Record<string, any>, lanes: Record<string, any>}} the poll
     */
    function poll(red, heads) {
        const rec = (/** @type {number} */ n, /** @type {any} */ over = {}) => ({
            headSha: heads[n],
            headRef: `b${n}`,
            baseRef: "master",
            draft: false,
            author: "owner",
            title: `fix: ${n}`,
            required: { "All Checks Pass": "FAILURE", "Lint PR Title": "SUCCESS" },
            inherited: red ? [KEY] : null,
            ...over,
        });
        return {
            prs: {
                7: rec(7),
                8: rec(8, { inherited: null }),
                9: rec(9, { draft: true }),
                10: rec(10, { author: "github-actions", headRef: "release/train-1", title: "chore(release): publish" }),
                11: rec(11, { fork: true }),
            },
            lanes: { CI: red ? { verdict: "red", redJobs: [{ key: KEY }] } : { verdict: "green" } },
        };
    }

    /**
     * Pushes a branch per pull request and a master fix after them.
     * @returns {{heads: Record<number, string>, tip: string}} the heads and master's new tip
     */
    function setup() {
        const base = git(repo.root, "rev-parse", "HEAD");
        /** @type {Record<number, string>} */
        const heads = {};
        for (const n of [7, 8, 9, 10, 11]) heads[n] = branch(`b${n}`, base, `f${n}.txt`, `${n}\n`);
        return { heads, tip: masterCommit("fix.txt", "fixed\n") };
    }

    it("updates each pull request failing only on the recovered key, once per head", async () => {
        const { heads, tip } = setup();
        const fake = fakeGitHub();
        /** @type {[number, string][]} */
        const moved = [];
        const ctx = context(fake, "acting", {
            moved: (/** @type {number} */ n, /** @type {string} */ from) => moved.push([n, from]),
        });
        const wait = {};
        // Master is still red on the key: nothing to update yet, only remembered.
        expect(await recoverInherited(ctx, { ...poll(true, heads), wait, tip, releasePattern: TRAIN })).toEqual([]);
        expect(Object.keys(wait).sort()).toEqual(["10", "11", "7", "9"]);
        expect(fake.calls).toHaveLength(0);

        // Master is green on it again: one update-branch, for #7 alone.
        const out = await recoverInherited(ctx, { ...poll(false, heads), wait, tip, releasePattern: TRAIN });
        expect(out).toEqual([
            { pr: 7, result: { path: "update-branch", result: "updated" } },
            { pr: 9, skipped: "draft" },
            { pr: 10, skipped: "release train" },
            { pr: 11, skipped: "from a fork" },
        ]);
        expect(fake.writes().map((c) => c.args[4])).toEqual([`repos/${REPO}/pulls/7/update-branch`]);
        expect(JSON.parse(fake.writes()[0].input ?? "")).toEqual({ expected_head_sha: heads[7] });
        expect(moved).toEqual([[7, heads[7]]]);
        expect(ledger.filter((l) => l.kind === "inherited-update")).toEqual([
            {
                kind: "inherited-update",
                target: "pr:7",
                head: heads[7],
                keys: [KEY],
                result: "updated",
                path: "update-branch",
            },
            { kind: "inherited-update", target: "pr:9", head: heads[9], keys: [KEY], skipped: "draft" },
            { kind: "inherited-update", target: "pr:10", head: heads[10], keys: [KEY], skipped: "release train" },
            { kind: "inherited-update", target: "pr:11", head: heads[11], keys: [KEY], skipped: "from a fork" },
        ]);

        // The next poll, at the same heads, updates nothing again.
        expect(await recoverInherited(ctx, { ...poll(false, heads), wait, tip, releasePattern: TRAIN })).toEqual([]);
        expect(fake.writes()).toHaveLength(1);
    });

    it("records a would-do and writes nothing in dry-run", async () => {
        const { heads, tip } = setup();
        const fake = fakeGitHub();
        const moved = [];
        const ctx = context(fake, "dry-run", { moved: () => moved.push(1) });
        const wait = {};
        await recoverInherited(ctx, { ...poll(true, heads), wait, tip, releasePattern: TRAIN });
        const out = await recoverInherited(ctx, { ...poll(false, heads), wait, tip, releasePattern: TRAIN });
        expect(out[0]).toEqual({ pr: 7, result: { path: "update-branch", result: "would-do" } });
        expect(fake.calls).toHaveLength(0);
        expect(moved).toEqual([]);
        expect(ledger.filter((l) => l.kind === "would-do")).toMatchObject([
            { op: "PUT pulls/7/update-branch", group: "upkeep", target: "pr:7" },
        ]);
    });

    it("forgets a pull request whose head moved, and records GitHub's refusal", async () => {
        const { heads, tip } = setup();
        const ctx = context(fakeGitHub({ updateStatus: 403 }), "acting");
        const wait = {};
        await recoverInherited(ctx, { ...poll(true, heads), wait, tip, releasePattern: TRAIN });
        const pushed = { ...heads, 9: heads[7] };
        const next = poll(false, pushed);
        next.prs[9].draft = false;
        const out = await recoverInherited(ctx, { ...next, wait, tip, releasePattern: TRAIN });
        expect(out.map((o) => o.pr)).toEqual([7, 10, 11]);
        expect(out[0]).toMatchObject({ pr: 7, error: expect.any(String) });
        expect(wait).toEqual({});
    });
});

describe("updateDequeued", () => {
    /**
     * Pull requests failing only the visual gate: #7 and #9 (a draft) dequeued, #8 not dequeued.
     * @param {Record<number, string>} heads each pull request's head
     * @returns {Record<string, any>} the records
     */
    function prs(heads) {
        const rec = (/** @type {number} */ n, /** @type {any} */ over = {}) => ({
            headSha: heads[n],
            headRef: `b${n}`,
            baseRef: "master",
            draft: false,
            author: "owner",
            title: `fix: ${n}`,
            labels: ["dequeued"],
            ownerGate: true,
            required: { "All Checks Pass": "FAILURE" },
            ...over,
        });
        return { 7: rec(7), 8: rec(8, { labels: [] }), 9: rec(9, { draft: true }) };
    }

    /**
     * Pushes a branch per pull request and a master commit after them.
     * @returns {{heads: Record<number, string>, tip: string}} the heads and master's tip
     */
    function setup() {
        const base = git(repo.root, "rev-parse", "HEAD");
        /** @type {Record<number, string>} */
        const heads = {};
        for (const n of [7, 8, 9]) heads[n] = branch(`b${n}`, base, `f${n}.txt`, `${n}\n`);
        return { heads, tip: masterCommit("m.txt", "m\n") };
    }

    it("updates a pull request dequeued on the visual gate once per head", async () => {
        const { heads, tip } = setup();
        const fake = fakeGitHub();
        const ctx = context(fake, "acting");
        const done = {};
        expect(await updateDequeued(ctx, { prs: prs(heads), done, tip })).toEqual([
            { pr: 7, result: { path: "update-branch", result: "updated" } },
            { pr: 9, skipped: "draft" },
        ]);
        expect(fake.writes().map((c) => c.args[4])).toEqual([`repos/${REPO}/pulls/7/update-branch`]);
        expect(ledger.filter((l) => l.kind === "dequeued-update")).toMatchObject([
            { target: "pr:7", head: heads[7], result: "updated" },
            { target: "pr:9", skipped: "draft" },
        ]);
        // The same heads again: nothing more.
        expect(await updateDequeued(ctx, { prs: prs(heads), done, tip })).toEqual([]);
        expect(fake.writes()).toHaveLength(1);
    });

    it("brings back a dequeued pull request whose own checks are green and which has no conflict, once per dequeue", async () => {
        const { heads, tip } = setup();
        const fake = fakeGitHub();
        const ctx = context(fake, "acting");
        const green = { ownerGate: false, required: { "All Checks Pass": "SUCCESS" }, mergeable: "MERGEABLE" };
        const recs = () => {
            const r = prs(heads);
            Object.assign(r[7], green);
            Object.assign(r[8], green, { labels: ["dequeued"], mergeable: "CONFLICTING" });
            Object.assign(r[9], { labels: ["dequeued"], draft: false, ownerGate: false });
            return r;
        };
        const done = {};
        expect(await updateDequeued(ctx, { prs: recs(), done, tip })).toEqual([
            { pr: 7, result: { path: "update-branch", result: "updated" } },
        ]);
        // Its new head goes green while still labelled: the same dequeue, so nothing more.
        const later = recs();
        later[7].headSha = "f".repeat(40);
        expect(await updateDequeued(ctx, { prs: later, done, tip })).toEqual([]);
        // Requeued (label gone), then dequeued again: a new event.
        const requeued = recs();
        requeued[7].labels = [];
        await updateDequeued(ctx, { prs: requeued, done, tip });
        expect(done).toEqual({});
        expect(fake.writes()).toHaveLength(1);
    });

    it("while master is red updates only a dequeued fix, and the rest once master is green", async () => {
        const { heads, tip } = setup();
        const fake = fakeGitHub();
        const ctx = context(fake, "acting");
        const recs = prs(heads);
        Object.assign(recs[8], { labels: ["dequeued"] });
        const done = {};
        expect(await updateDequeued(ctx, { prs: recs, done, tip, masterRed: true, fixes: [8] })).toEqual([
            { pr: 8, result: { path: "update-branch", result: "updated" } },
        ]);
        expect(await updateDequeued(ctx, { prs: recs, done, tip })).toEqual([
            { pr: 7, result: { path: "update-branch", result: "updated" } },
            { pr: 9, skipped: "draft" },
        ]);
        expect(fake.writes()).toHaveLength(2);
    });

    it("records a would-do and writes nothing in dry-run", async () => {
        const { heads, tip } = setup();
        const fake = fakeGitHub();
        const out = await updateDequeued(context(fake, "dry-run"), { prs: prs(heads), done: {}, tip });
        expect(out[0]).toEqual({ pr: 7, result: { path: "update-branch", result: "would-do" } });
        expect(fake.calls).toHaveLength(0);
    });
});
