import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import {
    createConfigGate,
    LAST_GOOD,
    openConfigRevert,
    readLastGood,
    redStretches,
    refusals,
    workflowName,
    writeLastGood,
} from "../lib/config-adopt.mjs";
import { CONFIG_FILE, normalizeConfig } from "../lib/config.mjs";
import { createReplay } from "./replay/replay.mjs";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const BASE = {
    repo: "graphty-org/graphty-monorepo",
    lanes: {
        ci: { workflow: "ci.yml", gating: "required" },
        gpu: { workflow: "gpu.yml", gating: "required" },
        release: { workflow: "release.yml", gating: "watch" },
    },
};
const HARMLESS = normalizeConfig(BASE);
/** Switches the statuses write group to acting. */
const STATUSES_ACTING = normalizeConfig({ ...BASE, mode: "acting", actions: { statuses: true } });
/** Stops the GPU lane from gating. */
const GPU_WATCHED = normalizeConfig({
    ...BASE,
    lanes: { ...BASE.lanes, gpu: { workflow: "gpu.yml", gating: "watch" } },
});
const none = () => [];

describe("refusals", () => {
    it("refuses a write group switched to acting without ledger coverage, with or without a last good config", () => {
        expect(refusals(STATUSES_ACTING, HARMLESS, [], none)).toEqual([
            "it switches statuses to acting, and the ledger has no line of statuses yet",
        ]);
        expect(refusals(STATUSES_ACTING, null, [], none)).toHaveLength(1);
        // Another group's lines are not coverage.
        expect(refusals(STATUSES_ACTING, HARMLESS, [{ kind: "would-do", group: "upkeep" }], none)).toHaveLength(1);
    });

    it("accepts the group once the ledger has a would-do or action line of it, or when it already acted", () => {
        expect(refusals(STATUSES_ACTING, HARMLESS, [{ kind: "would-do", group: "statuses" }], none)).toEqual([]);
        expect(refusals(STATUSES_ACTING, HARMLESS, [{ kind: "action", group: "statuses" }], none)).toEqual([]);
        expect(refusals(STATUSES_ACTING, STATUSES_ACTING, [], none)).toEqual([]);
    });

    it("refuses a lane that stops gating only when the record holds a red stretch of it", () => {
        expect(refusals(GPU_WATCHED, HARMLESS, [], (f) => (f === "gpu.yml" ? [11, 12] : []))).toEqual([
            "it stops gpu.yml gating, and the recorded month has 2 red stretches of it (first run 11) " +
                "that would no longer hold merges or open incidents",
        ]);
        expect(refusals(GPU_WATCHED, HARMLESS, [], none)).toEqual([]);
        // Gating more, or the same, never needs the record.
        const ask = () => {
            throw new Error("not asked");
        };
        expect(refusals(HARMLESS, GPU_WATCHED, [], ask)).toEqual([]);
        expect(refusals(HARMLESS, HARMLESS, [], ask)).toEqual([]);
    });
});

describe("redStretches over the recorded month", () => {
    const record = /** @type {any} */ (createReplay());

    it("finds the GPU red stretches the 10-02 replay saw, CI ones, and none for a workflow the record lacks", () => {
        expect(redStretches(record, "GPU")).toContain(36962785245);
        expect(redStretches(record, "GPU")).toContain(37078532134);
        expect(redStretches(record, "CI").length).toBeGreaterThan(0);
        expect(redStretches(record, "No such workflow")).toEqual([]);
    });
});

describe("workflowName", () => {
    it("reads the top-level name of a workflow file, and null without one", () => {
        expect(workflowName(REPO_ROOT, "gpu.yml")).toBe("GPU");
        expect(workflowName(REPO_ROOT, "ci.yml")).toBe("CI");
        expect(workflowName(REPO_ROOT, "missing.yml")).toBeNull();
    });
});

describe("the last good file", () => {
    let dir;
    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "githerd-adopt-"));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it("round-trips, and a file that is not one is no last good config", () => {
        expect(readLastGood(dir)).toBeNull();
        writeLastGood(dir, { config: HARMLESS, source: "s", adoptedAt: "2026-10-04T00:00:00.000Z" });
        expect(readLastGood(dir)).toEqual({ config: HARMLESS, source: "s", adoptedAt: "2026-10-04T00:00:00.000Z" });
        writeFileSync(join(dir, LAST_GOOD), JSON.stringify({ config: { repo: "x" }, source: "s" }));
        expect(readLastGood(dir)).toBeNull();
        writeFileSync(join(dir, LAST_GOOD), "{");
        expect(readLastGood(dir)).toBeNull();
    });
});

describe("createConfigGate", () => {
    let dir;
    let ledger;
    let file;
    const write = (raw) => writeFileSync(file, typeof raw === "string" ? raw : JSON.stringify(raw));
    const gate = (options = {}) =>
        createConfigGate({
            root: REPO_ROOT,
            stateDir: dir,
            env: { GITHERD_CONFIG: file },
            readLedger: async () => ledger,
            now: () => new Date("2026-10-04T12:00:00Z"),
            ...options,
        });

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "githerd-adopt-"));
        file = join(dir, "candidate.json");
        ledger = [];
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it("adopts a harmless config and saves it as the last good one", async () => {
        write(BASE);
        const r = await gate().check();
        expect(r).toMatchObject({ config: HARMLESS, source: file, banner: null, revert: null, fatal: null });
        expect(readLastGood(dir)).toEqual({ config: HARMLESS, source: file, adoptedAt: "2026-10-04T12:00:00.000Z" });
    });

    it("refuses a write group to acting without coverage: the last good config stays, with a banner, and the revert reasons come once", async () => {
        writeLastGood(dir, { config: HARMLESS, source: "before", adoptedAt: "2026-10-01T09:30:00.000Z" });
        write({ ...BASE, mode: "acting", actions: { statuses: true } });
        const g = gate();
        const first = await g.check();
        expect(first.config).toEqual(HARMLESS);
        expect(first.fatal).toBeNull();
        expect(first.revert).toEqual(["it switches statuses to acting, and the ledger has no line of statuses yet"]);
        expect(first.banner).toBe(
            `${CONFIG_FILE} on ${file} is refused: it switches statuses to acting, and the ledger has no line of ` +
                "statuses yet; githerd runs the last good config, adopted 2026-10-01T09:30 UTC",
        );
        // Coverage arriving later does not change a refused text's answer, and no second revert.
        ledger = [{ kind: "would-do", group: "statuses" }];
        const second = await g.check();
        expect(second).toMatchObject({ config: HARMLESS, revert: null, banner: first.banner });
        expect(readLastGood(dir)?.source).toBe("before");
    });

    it("enters fatal mode only with no good config ever", async () => {
        write({ ...BASE, mode: "acting", actions: { statuses: true } });
        const refused = await gate().check();
        expect(refused).toMatchObject({ config: null, banner: null });
        expect(refused.fatal).toMatch(
            /^no good githerd.config.json was ever loaded: .* is refused: it switches statuses/,
        );

        write("{ not json");
        expect((await gate().check()).fatal).toMatch(/^no good githerd.config.json was ever loaded: .*not valid JSON/);

        writeLastGood(dir, { config: HARMLESS, source: "before", adoptedAt: "2026-10-01T09:30:00.000Z" });
        const kept = await gate().check();
        expect(kept).toMatchObject({ config: HARMLESS, source: "before", revert: null, fatal: null });
        expect(kept.banner).toMatch(/not valid JSON: .*; githerd runs the last good config/);
    });

    it("says why when the default branch has no config, and keeps the last good one", async () => {
        const g = gate({ env: {}, root: mkdirSync(join(dir, "plain"), { recursive: true }) });
        expect((await g.check()).fatal).toMatch(
            /no good githerd.config.json was ever loaded: githerd is not configured/,
        );
        writeLastGood(dir, { config: HARMLESS, source: "before", adoptedAt: "2026-10-01T09:30:00.000Z" });
        expect((await g.check()).config).toEqual(HARMLESS);
    });

    it("replays the recorded month: GPU stops gating and is refused, a lane the month never saw red is not", async () => {
        writeLastGood(dir, { config: HARMLESS, source: "before", adoptedAt: "2026-10-01T09:30:00.000Z" });
        write({ ...BASE, lanes: { ...BASE.lanes, gpu: { workflow: "gpu.yml", gating: "watch" } } });
        const r = await gate().check();
        expect(r.config).toEqual(HARMLESS);
        expect(r.revert?.[0]).toMatch(
            /^it stops gpu.yml gating, and the recorded month has \d+ red stretches of it \(first run \d+\)/,
        );

        const quiet = gate({ nameOf: () => "No such workflow" });
        expect((await quiet.check()).config).toEqual(GPU_WATCHED);
    });

    it("refuses a lane whose workflow it cannot name, since the record cannot be read for it", async () => {
        writeLastGood(dir, { config: HARMLESS, source: "before", adoptedAt: "2026-10-01T09:30:00.000Z" });
        write({ ...BASE, lanes: { ...BASE.lanes, gpu: { workflow: "gpu.yml", gating: "watch" } } });
        const r = await gate({ nameOf: () => null, record: async () => ({}) }).check();
        expect(r.revert?.[0]).toMatch(
            /^it stops gpu.yml gating, and the recorded month has 1 red stretches of it \(first run -1\)/,
        );
    });

    it("answers an unchanged config without reading the ledger", async () => {
        writeLastGood(dir, { config: HARMLESS, source: "before", adoptedAt: "2026-10-01T09:30:00.000Z" });
        write(BASE);
        const r = await gate({
            readLedger: async () => {
                throw new Error("not read");
            },
        }).check();
        expect(r).toMatchObject({ config: HARMLESS, banner: null, fatal: null });
        expect(JSON.parse(readFileSync(join(dir, LAST_GOOD), "utf8")).source).toBe("before");
    });
});

describe("openConfigRevert", () => {
    let dir;
    let clone;
    let sha;

    beforeAll(() => {
        isolateGit();
        dir = mkdtempSync(join(tmpdir(), "githerd-adopt-git-"));
        const remote = join(dir, "remote.git");
        const seed = join(dir, "seed");
        git(dir, "init", "--bare", "-b", "main", remote);
        mkdirSync(seed);
        git(seed, "init", "-b", "main");
        writeFileSync(join(seed, CONFIG_FILE), JSON.stringify(BASE));
        git(seed, "add", ".");
        git(seed, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "config");
        writeFileSync(join(seed, "other.txt"), "later\n");
        git(seed, "add", ".");
        git(seed, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "other");
        git(seed, "push", remote, "main");
        sha = git(seed, "log", "-1", "--format=%H", "--", CONFIG_FILE);
        clone = join(dir, "clone");
        git(dir, "clone", remote, clone);
    });
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    /**
     * A GitHub client stub that answers the two reads and records the mutation.
     * @param {{pulls?: any[], open?: any[], number?: number}} answers what GitHub holds
     * @returns {any} the stub, with `gets` and `mutations`
     */
    const client = ({ pulls = [], open = [], number = 0 }) => {
        const stub = {
            gets: /** @type {string[]} */ ([]),
            mutations: /** @type {any[]} */ ([]),
            async get(/** @type {string} */ path) {
                stub.gets.push(path);
                return { body: path.includes("/commits/") ? pulls : open };
            },
            async mutate(/** @type {string} */ query, /** @type {any} */ variables, /** @type {any} */ options) {
                stub.mutations.push({ query, variables, options });
                return {
                    performed: number > 0,
                    body: number ? { data: { revertPullRequest: { revertPullRequest: { number } } } } : null,
                };
            },
        };
        return stub;
    };
    const args = (github) => ({ github, repo: "o/r", root: clone, branch: "main", reasons: ["r1", "r2"] });
    const merged = { number: 41, title: "chore: githerd acts", node_id: "PR_41", merged_at: "2026-10-04T00:00:00Z" };

    it("reverts the pull request that brought the config commit, through the incidents group", async () => {
        const github = client({ pulls: [merged], number: 42 });
        expect(await openConfigRevert(args(github))).toBe(42);
        expect(github.gets[0]).toBe(`repos/o/r/commits/${sha}/pulls`);
        expect(github.mutations).toHaveLength(1);
        const m = github.mutations[0];
        expect(m.query).toMatch(/revertPullRequest/);
        expect(m.variables).toEqual({
            id: "PR_41",
            title: 'Revert "chore: githerd acts"',
            body: `Reverts #41. githerd refused the ${CONFIG_FILE} it brought and keeps running the last good config: r1; r2.`,
        });
        expect(m.options).toMatchObject({ group: "incidents", fields: { situation: "config-refused", pr: 41, sha } });
    });

    it("records a would-do and names no revert while the group does not act", async () => {
        const github = client({ pulls: [merged] });
        expect(await openConfigRevert(args(github))).toBeNull();
        expect(github.mutations).toHaveLength(1);
    });

    it("takes an open revert with GitHub's title instead of opening another", async () => {
        const github = client({ pulls: [merged], open: [{ number: 50, title: 'Revert "chore: githerd acts"' }] });
        expect(await openConfigRevert(args(github))).toBe(50);
        expect(github.mutations).toEqual([]);
    });

    it("does nothing without a merged pull request or a config commit", async () => {
        const github = client({ pulls: [{ ...merged, merged_at: null }] });
        expect(await openConfigRevert(args(github))).toBeNull();
        expect(await openConfigRevert({ ...args(github), branch: "gone" })).toBeNull();
        expect(github.mutations).toEqual([]);
    });
});
