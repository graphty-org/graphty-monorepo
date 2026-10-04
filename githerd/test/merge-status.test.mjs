import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createGitHub } from "../lib/github.mjs";
import {
    addedDependencies,
    CONTEXT,
    foldHead,
    mergeGateChecks,
    mergifyRequires,
    npmLookup,
    openPr,
    postMergeStatuses,
    readDependencies,
} from "../lib/merge-status.mjs";
import { createFakeGh, httpOutput } from "./helpers/fake-gh.mjs";

const REPO = "graphty-org/graphty-monorepo";
const OWNER = "apowers313";
const SINCE = "2026-10-01T15:37:12Z";
const NOW = 1790958000_000;
const rate = (remaining) => ({
    "X-Ratelimit-Limit": "5000",
    "X-Ratelimit-Remaining": String(remaining),
    "X-Ratelimit-Reset": "1790959002",
    "X-Ratelimit-Resource": "core",
});

/**
 * A fake GitHub that keeps commit statuses and auto-merge per pull request, so read-backs see
 * what was written.
 * @param {{remaining?: number}} [options] the core calls left, reported on every answer
 * @returns {{gh: ReturnType<typeof createFakeGh>, posts: () => any[], mutations: () => any[]}} the
 *   fake, the status bodies posted (with their sha), and the mutations sent
 */
function fakeGitHub({ remaining = 4000 } = {}) {
    /** @type {Record<string, any[]>} */
    const statuses = {};
    const gh = createFakeGh(({ args, input }) => {
        const path = args.find((a) => a.startsWith("repos/") || a === "graphql");
        if (path === "graphql") return httpOutput({ status: 200, headers: rate(remaining), body: { data: {} } });
        const post = /statuses\/(\w+)$/.exec(path);
        if (post) {
            const body = JSON.parse(input);
            statuses[post[1]] = [body, ...(statuses[post[1]] ?? []).filter((s) => s.context !== body.context)];
            return httpOutput({ status: 201, headers: rate(remaining), body: { id: 1, ...body } });
        }
        const read = /commits\/(\w+)\/status/.exec(path);
        if (read)
            return httpOutput({ status: 200, headers: rate(remaining), body: { statuses: statuses[read[1]] ?? [] } });
        if (/pulls\/\d+$/.test(path))
            return httpOutput({ status: 200, headers: rate(remaining), body: { auto_merge: null } });
        throw new Error(`unexpected call ${args.join(" ")}`);
    });
    return {
        gh,
        posts: () =>
            gh.writes().flatMap((c) => {
                const sha = /statuses\/(\w+)$/.exec(c.args.find((a) => a.startsWith("repos/")) ?? "")?.[1];
                return sha ? [{ sha, ...JSON.parse(c.input) }] : [];
            }),
        mutations: () => gh.writes().filter((c) => c.args.includes("graphql")),
    };
}

/**
 * A client over the fake, acting or in dry-run, with an array for a ledger.
 * @param {ReturnType<typeof createFakeGh>} gh the fake
 * @param {string} mode the `statuses` group's mode
 * @returns {{github: ReturnType<typeof createGitHub>, ledger: any[]}} the client and its ledger
 */
function client(gh, mode = "acting") {
    const ledger = [];
    const github = createGitHub({
        repo: REPO,
        exec: gh.exec,
        mode: (group) => (group === "statuses" ? mode : "dry-run"),
        ledger: (e) => ledger.push(e),
        env: {},
        now: () => NOW,
    });
    return { github, ledger };
}

/**
 * An open pull request into master that every line passes on.
 * @param {number} number its number
 * @param {Partial<import("../lib/merge-status.mjs").OpenPr>} [over] fields to replace
 * @returns {import("../lib/merge-status.mjs").OpenPr} the facts
 */
const pr = (number, over = {}) => ({
    number,
    author: OWNER,
    title: "fix(layout): seed rows",
    labels: [],
    commits: ["fix(layout): seed rows"],
    files: ["docs/a.md"],
    dependencies: { added: [], unknownToNpm: [] },
    job: null,
    releaseBumps: null,
    head: `h${number}a`,
    base: "master",
    nodeId: `PR_${number}`,
    autoMergeAt: null,
    ...over,
});

const ctx = (over = {}) => ({ login: OWNER, redLanes: [], ...over });

/**
 * One reconcile's posting.
 * @param {ReturnType<typeof createGitHub>} github the client
 * @param {any[]} prs the open pull requests
 * @param {any} record the persisted record
 * @param {any} [context] the repository facts
 * @returns {ReturnType<typeof postMergeStatuses>} the result
 */
const reconcile = (github, prs, record, context = ctx()) =>
    postMergeStatuses({ github, repo: REPO, branch: "master", prs, ctx: context, record });

describe("posting githerd/merge", () => {
    it("gives a new head a status in one reconcile, Mergify's update merge included, and nothing when unchanged", async () => {
        const fake = fakeGitHub();
        const { github } = client(fake.gh);
        const record = {};
        await reconcile(github, [pr(1)], record);
        expect(fake.posts()).toEqual([
            { sha: "h1a", state: "success", description: "githerd: safe to merge", context: CONTEXT },
        ]);
        await reconcile(github, [pr(1)], record);
        expect(fake.posts()).toHaveLength(1);
        // Mergify merged master into it: a new head with the same decision still gets a status.
        await reconcile(github, [pr(1, { head: "h1b" })], record);
        expect(fake.posts().map((p) => p.sha)).toEqual(["h1a", "h1b"]);
        expect(record.posted[1]).toMatchObject({ sha: "h1b", state: "success" });
    });

    it("turns every affected pull request to failure when a lane goes red and back with one write each", async () => {
        const fake = fakeGitHub();
        const { github } = client(fake.gh);
        const record = {};
        const prs = [
            pr(1),
            pr(2, {
                files: ["webgpu-graph-algorithms/src/a.ts"],
                releaseBumps: [{ project: "webgpu-graph-algorithms", from: "0.6.12", to: "0.6.13" }],
            }),
            pr(3),
        ];
        await reconcile(github, prs, record);
        expect(fake.posts()).toHaveLength(3);

        await reconcile(github, prs, record, ctx({ redLanes: [{ workflow: "GPU", since: SINCE }] }));
        expect(fake.posts().slice(3)).toEqual([
            expect.objectContaining({
                sha: "h2a",
                state: "failure",
                description: expect.stringMatching(/^held: GPU lane red/),
            }),
        ]);

        const ciRed = ctx({ redLanes: [{ workflow: "CI", since: SINCE }] });
        await reconcile(github, prs, record, ciRed);
        await reconcile(github, prs, record, ciRed);
        const red = fake.posts().slice(4);
        expect(red.map((p) => [p.sha, p.state])).toEqual([
            ["h1a", "failure"],
            ["h2a", "failure"],
            ["h3a", "failure"],
        ]);

        await reconcile(github, prs, record);
        await reconcile(github, prs, record);
        expect(
            fake
                .posts()
                .slice(7)
                .map((p) => [p.sha, p.state]),
        ).toEqual([
            ["h1a", "success"],
            ["h2a", "success"],
            ["h3a", "success"],
        ]);
    });

    it("never lets a pending outlive one reconcile", async () => {
        const fake = fakeGitHub();
        const { github } = client(fake.gh);
        const record = {};
        const unread = pr(1, { commits: null, dependencies: null });
        await reconcile(github, [unread], record);
        await reconcile(github, [unread], record);
        await reconcile(github, [unread], record);
        expect(fake.posts().map((p) => [p.state, p.description])).toEqual([
            ["pending", "githerd is evaluating"],
            ["failure", "held: githerd could not read its commits, npm's answer for the packages it adds"],
        ]);
        // Once read, the head gets its real status.
        await reconcile(github, [pr(1)], record);
        expect(fake.posts().at(-1)).toMatchObject({ state: "success" });
        // A failing line wins over an unread fact, and the release dry-run is named when nothing else is unread.
        const release = pr(2, { files: ["layout/src/a.ts"] });
        await reconcile(github, [release], record);
        await reconcile(github, [release], record);
        expect(fake.posts().at(-1)).toMatchObject({
            state: "failure",
            description: "held: githerd could not read the release dry-run",
        });
        const noLogin = pr(3);
        await reconcile(github, [noLogin], record, ctx({ login: null }));
        await reconcile(github, [noLogin], record, ctx({ login: null }));
        expect(fake.posts().at(-1)).toMatchObject({ description: "held: githerd could not read the owner's login" });
        const job = pr(4, { files: null, job: { kind: "pr", patchId: null, reviewed: [], securityReviewed: [] } });
        await reconcile(github, [job], record);
        await reconcile(github, [job], record);
        expect(fake.posts().at(-1)).toMatchObject({
            description: "held: githerd could not read its files, its patch id",
        });
    });

    it("posts holds before successes and keeps a refused success for the next reconcile", async () => {
        const fake = fakeGitHub({ remaining: 400 });
        const { github } = client(fake.gh);
        const record = {};
        // A first answer sets the counter below the no-success tier.
        await github.get(`repos/${REPO}/commits/x/status`);
        const result = await reconcile(github, [pr(1), pr(2, { author: "someone" })], record);
        expect(fake.posts().map((p) => [p.sha, p.state])).toEqual([["h2a", "failure"]]);
        expect(result.written).toBe(1);
        expect(result.errors).toEqual([expect.stringMatching(/success call held back/)]);
        expect(record.posted[1]).toBeUndefined();
    });

    it("posts nothing on a pull request based on another branch, and forgets closed ones", async () => {
        const fake = fakeGitHub();
        const { github } = client(fake.gh);
        const record = {};
        await reconcile(github, [pr(1), pr(2, { base: "feat/x" })], record);
        expect(fake.posts().map((p) => p.sha)).toEqual(["h1a"]);
        await reconcile(github, [], record);
        expect(record.posted).toEqual({});
    });

    it("makes zero writes in dry-run, records one would-do per change, and keeps the record", async () => {
        const fake = fakeGitHub();
        const { github, ledger } = client(fake.gh, "dry-run");
        const record = {};
        const prs = [pr(1), pr(2, { autoMergeAt: "2026-10-03T10:00:00Z" })];
        await reconcile(github, prs, record);
        await reconcile(github, prs, record);
        await reconcile(github, prs, record, ctx({ redLanes: [{ workflow: "CI", since: SINCE }] }));
        expect(fake.gh.writes()).toEqual([]);
        const would = ledger.filter((e) => e.kind === "would-do");
        expect(would.map((e) => [e.op, e.situation])).toEqual([
            ["graphql mutation DisarmAutoMerge", "native auto-merge armed"],
            ["POST statuses/h1a", "success"],
            ["POST statuses/h2a", "success"],
            ["POST statuses/h1a", "failure line 2"],
            ["POST statuses/h2a", "failure line 2"],
        ]);
        expect(would.every((e) => e.group === "statuses")).toBe(true);
        expect(record.posted[1]).toMatchObject({ sha: "h1a", state: "failure", line: 2 });
    });
});

describe("native auto-merge", () => {
    it("is disarmed once per arming, read back on the pull request", async () => {
        const fake = fakeGitHub();
        const { github, ledger } = client(fake.gh);
        const record = {};
        const armed = pr(1, { autoMergeAt: "2026-10-03T10:00:00Z" });
        await reconcile(github, [armed], record);
        await reconcile(github, [armed], record);
        expect(fake.mutations()).toHaveLength(1);
        expect(JSON.parse(fake.mutations()[0].input).variables).toEqual({ id: "PR_1" });
        expect(fake.gh.calls.some((c) => c.args.includes(`repos/${REPO}/pulls/1`))).toBe(true);
        expect(ledger.filter((e) => e.kind === "write-mismatch")).toEqual([]);
        // Armed again later: disarmed again.
        await reconcile(github, [pr(1, { autoMergeAt: "2026-10-03T12:00:00Z" })], record);
        expect(fake.mutations()).toHaveLength(2);
        await reconcile(github, [], record);
        expect(record.disarmed).toEqual({});
    });
});

describe("head facts", () => {
    const patch = [
        "@@ -10,6 +10,8 @@",
        '     "dependencies": {',
        '-        "lodash": "^4.17.20",',
        '+        "lodash": "^4.17.21",',
        '+        "left-padd": "^1.0.0",',
        '+        "@graphty/layout": "workspace:*",',
        '+        "@scope/thing": "~2.1.0",',
        '-    "version": "1.0.0",',
        '+    "version": "1.1.0",',
        '+    "node": ">=22",',
        '+    "test": "vitest run",',
    ].join("\n");

    it("reads added packages from package.json patches, leaving out bumps, workspace specs and non-packages", () => {
        expect(addedDependencies([patch])).toEqual(["@scope/thing", "left-padd"]);
        expect(addedDependencies([])).toEqual([]);
    });

    it("keeps what was read for a head and starts over on a new one", () => {
        const node = (sha, detail) => ({ headRefOid: sha, detail });
        const first = foldHead(undefined, node("a", { commits: { messages: ["fix: x"] }, files: ["docs/a.md"] }));
        expect(first).toMatchObject({ sha: "a", commits: ["fix: x"], files: ["docs/a.md"], added: [] });
        expect(foldHead(first, node("a", {}))).toEqual(first);
        expect(foldHead(first, node("b", {}))).toMatchObject({ sha: "b", commits: null, files: null, added: null });
        const manifest = foldHead(undefined, node("c", { files: ["x/package.json"], packagePatches: [patch] }));
        expect(manifest.added).toEqual(["@scope/thing", "left-padd"]);
        expect(foldHead(undefined, node("d", { files: ["x/package.json"], packagePatches: [null] })).added).toBeNull();
        expect(
            foldHead(
                undefined,
                node("e", { files: ["a"], filesTruncated: true, commits: { messages: [], truncated: true } }),
            ),
        ).toMatchObject({
            added: null,
            filesTruncated: true,
            commitsTruncated: true,
        });
    });

    it("asks npm once per head and waits while the registry does not answer", async () => {
        const asked = [];
        let answer = null;
        const lookup = async (name) => {
            asked.push(name);
            return name === "left-padd" ? false : answer;
        };
        const head = { sha: "a", added: ["@scope/thing", "left-padd"], dependencies: null };
        await readDependencies(/** @type {any} */ (head), lookup);
        expect(head.dependencies).toBeNull();
        answer = true;
        await readDependencies(/** @type {any} */ (head), lookup);
        expect(head.dependencies).toEqual({ added: ["@scope/thing", "left-padd"], unknownToNpm: ["left-padd"] });
        await readDependencies(/** @type {any} */ (head), lookup);
        expect(asked).toHaveLength(4);
        const unread = { added: null, dependencies: null };
        await readDependencies(/** @type {any} */ (unread), lookup);
        expect(unread.dependencies).toBeNull();
    });

    it("reads npm's answer: 200 known, 404 unknown, anything else unanswered", async () => {
        const urls = [];
        const reply = (status) => async (url) => {
            urls.push(url);
            if (status === 0) throw new Error("offline");
            return new Response(null, { status });
        };
        expect(await npmLookup(reply(200))("@scope/thing")).toBe(true);
        expect(urls[0]).toBe("https://registry.npmjs.org/@scope%2fthing");
        expect(await npmLookup(reply(404))("left-padd")).toBe(false);
        expect(await npmLookup(reply(503))("x")).toBeNull();
        expect(await npmLookup(reply(0))("x")).toBeNull();
    });

    it("builds the decision's facts from the GraphQL node and the head record", () => {
        const node = {
            id: "PR_7",
            number: 7,
            title: "fix: x",
            author: { login: OWNER },
            labels: { nodes: [{ name: "hold" }] },
            headRefOid: "a",
            baseRefName: "master",
            autoMergeRequest: { enabledAt: "2026-10-03T10:00:00Z" },
        };
        const head = foldHead(undefined, { headRefOid: "a", detail: { commits: { messages: ["fix: x"] }, files: [] } });
        expect(openPr(node, head, { ownerItemOpen: true })).toMatchObject({
            number: 7,
            author: OWNER,
            labels: ["hold"],
            commits: ["fix: x"],
            files: [],
            dependencies: null,
            ownerItemOpen: true,
            head: "a",
            base: "master",
            nodeId: "PR_7",
            autoMergeAt: "2026-10-03T10:00:00Z",
        });
        expect(openPr({ number: 8, headRefOid: "b", baseRefName: "master" }, head)).toMatchObject({
            author: null,
            labels: [],
            nodeId: null,
            autoMergeAt: null,
        });
    });
});

describe("the merge gate's invariants", () => {
    const mergify = readFileSync(new URL("../../.mergify.yml", import.meta.url), "utf8");
    const withC1 = mergify
        .replace(
            "- check-success=Lint PR Title",
            "- check-success=Lint PR Title\n          - check-success=githerd/merge",
        )
        .replace(
            '"-title~=^[a-z]+(\\\\([^)]*\\\\))?!:"\n      actions:',
            '"-title~=^[a-z]+(\\\\([^)]*\\\\))?!:"\n          - -check-failure=githerd/merge\n      actions:',
        );

    it("shows the banner until master's .mergify.yml requires githerd/merge both ways", () => {
        expect(mergifyRequires(mergify)).toBe(false);
        expect(withC1).not.toBe(mergify);
        expect(mergifyRequires(withC1)).toBe(true);
        expect(mergifyRequires(mergify.replace("- check-success=Lint PR Title", "- check-success=githerd/merge"))).toBe(
            false,
        );
        expect(mergifyRequires(null)).toBe(false);
    });

    it("faults a head without a current status and an armed auto-merge", () => {
        const record = { posted: { 1: { sha: "h1a" }, 2: { sha: "old" } } };
        const prs = [pr(1), pr(2), pr(3, { base: "feat/x", autoMergeAt: "2026-10-03T10:00:00Z" })];
        expect(mergeGateChecks({ prs, branch: "master", record, mergify: withC1 })).toEqual({
            faults: [
                { record: "pr 2", problem: "no current githerd/merge status on its head" },
                { record: "pr 3", problem: "native auto-merge is armed; it bypasses githerd/merge" },
            ],
            banners: [],
        });
        expect(mergeGateChecks({ prs: [], branch: "master", record: {}, mergify }).banners).toEqual([
            "Mergify does not wait for githerd/merge",
        ]);
    });
});
