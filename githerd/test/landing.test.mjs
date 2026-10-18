import { describe, expect, it } from "vitest";

import { newJob } from "../lib/board.mjs";
import { renderBoard } from "../lib/board-text.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import { syncJobs } from "../lib/jobs.mjs";
import { jobText } from "../lib/job-text.mjs";
import { LANDING, QUEUE_NEXT, labelSlots, landingHolds, landingLines, landingSlots } from "../lib/landing.mjs";
import { mergeDecision } from "../lib/prs.mjs";
import { jobOrder, prWork } from "../lib/queue.mjs";

const OWNER = "owner";
const REPO = "graphty-org/graphty-monorepo";
const NOW = "2026-10-17T12:00:00.000Z";
const LANES = { ci: { workflow: "ci.yml", gating: "required" } };
/**
 * A normalized config.
 * @param {any} [over] settings to add
 * @returns {any} the config
 */
const configOf = (over = {}) => normalizeConfig({ repo: REPO, lanes: LANES, ...over });
const config = configOf();

/**
 * `count` baseline images of one project.
 * @param {string} project the project
 * @param {number} count how many
 * @returns {string[]} the paths
 */
const baselines = (project, count) =>
    Array.from({ length: count }, (_, i) => `visual-baselines/${project}/story-${i}.png`);

/**
 * A ready pull request record: the owner's, into master, green, images approved.
 * @param {any} [over] fields to replace
 * @returns {any} the record
 */
const rec = (over = {}) => ({
    author: OWNER,
    draft: false,
    baseRef: "master",
    headRef: "feat/x",
    headSha: "abc",
    labels: [],
    breaking: false,
    ownerRejected: false,
    ownerGate: false,
    captureFailed: [],
    required: { "All Checks Pass": "SUCCESS", "Lint PR Title": "SUCCESS" },
    queueFailing: [],
    mergeable: "MERGEABLE",
    conflictSightings: 0,
    createdAt: "2026-10-10T00:00:00Z",
    ...over,
});

/**
 * A daemon state over pull requests and their changed files.
 * @param {Record<string, any>} prs the records by number
 * @param {Record<string, string[]>} files the changed files by number
 * @param {any} [extra] more state
 * @returns {any} the state
 */
const stateOf = (prs, files, extra = {}) => ({
    trust: { login: OWNER, bots: [] },
    prs,
    mergeGate: { heads: Object.fromEntries(Object.entries(files).map(([n, f]) => [n, { files: f }])) },
    master: { branch: "master" },
    jobs: {},
    ...extra,
});

/**
 * One reconcile's slots, kept in the state as the daemon keeps them.
 * @param {any} state the state, changed in place
 * @returns {any} the slots
 */
const reconcile = (state) => {
    state.landing = {
        ...landingSlots(state, { config, branch: "master", now: NOW }),
        labelled: state.landing?.labelled ?? {},
    };
    return state.landing;
};

/**
 * A client stub that records its writes.
 * @param {boolean} acting whether the upkeep group acts
 * @returns {any} the client
 */
const client = (acting) => {
    const writes = /** @type {any[]} */ ([]);
    return {
        writes,
        acting: () => acting,
        write: async (
            /** @type {string} */ method,
            /** @type {string} */ path,
            /** @type {any} */ body,
            /** @type {any} */ opts,
        ) => {
            writes.push({ method, path, body, group: opts.group });
            return { performed: acting };
        },
    };
};

const BIG = [...baselines("graphty-element", 21), "graphty-element/src/a.ts"];

describe("landing slots", () => {
    it("gives a slot to a big ready pull request, and none to a small one", () => {
        const state = stateOf({ 2685: rec(), 3001: rec() }, { 2685: BIG, 3001: ["layout/src/b.ts"] });
        const landing = reconcile(state);
        expect(Object.keys(landing.holders)).toEqual(["2685"]);
        expect(landing.holders[2685].why).toBe("big: 22 files, 21 baseline images");
        expect(landing.held).toEqual({});
    });

    it("counts changed files too, with the configured threshold", () => {
        const many = Array.from({ length: 100 }, (_, i) => `graphty/src/f${i}.ts`);
        const state = stateOf({ 1535: rec() }, { 1535: many });
        expect(Object.keys(reconcile(state).holders)).toEqual(["1535"]);
        const strict = configOf({ landing: { minFiles: 101 } });
        expect(landingSlots(state, { config: strict, branch: "master", now: NOW }).holders).toEqual({});
    });

    it("holds the pull requests that share a file with the holder, and only those", () => {
        const state = stateOf(
            { 2685: rec(), 3139: rec(), 3200: rec() },
            { 2685: BIG, 3139: [BIG[0], BIG[1], "graphty/src/c.ts"], 3200: ["layout/src/d.ts"] },
        );
        const landing = reconcile(state);
        expect(landing.held).toEqual({ 3139: { holder: 2685, shared: 2 } });
        const holds = landingHolds(landing);
        const facts = {
            number: 3139,
            author: OWNER,
            title: "fix(graphty): c",
            labels: [],
            commits: ["fix(graphty): c"],
            files: state.mergeGate.heads[3139].files,
            dependencies: { added: [], unknownToNpm: [] },
            releaseBumps: [],
        };
        const ctx = { login: OWNER, redLanes: [], landingHolds: holds };
        expect(mergeDecision(facts, ctx)).toMatchObject({
            state: "failure",
            line: 2,
            description: "held: landing slot #2685 lands first; this pull request shares 2 files with it",
        });
        expect(mergeDecision({ ...facts, number: 3200 }, ctx).state).toBe("success");
        expect(mergeDecision({ ...facts, number: 2685 }, ctx).state).toBe("success");
    });

    it("never holds a red master's fix", () => {
        const state = stateOf(
            { 2685: rec(), 3139: rec({ labels: ["priority:critical"] }), 3140: rec() },
            { 2685: BIG, 3139: [BIG[0]], 3140: [BIG[1]] },
            { master: { branch: "master", fixPrs: [{ pr: 3140 }] } },
        );
        expect(reconcile(state).held).toEqual({});
    });

    it("releases the hold and takes queue:next off again once the holder merges", async () => {
        const state = stateOf({ 2685: rec(), 3139: rec() }, { 2685: BIG, 3139: [BIG[0]] });
        reconcile(state);
        const gh = client(true);
        expect(await labelSlots(gh, REPO, state)).toEqual([]);
        expect(gh.writes).toEqual([
            {
                method: "POST",
                path: `repos/${REPO}/issues/2685/labels`,
                body: { labels: [QUEUE_NEXT] },
                group: "upkeep",
            },
        ]);
        state.prs[2685].labels = [QUEUE_NEXT];
        await labelSlots(gh, REPO, state);
        expect(gh.writes).toHaveLength(1);

        // Merged: gone from the open pull requests.
        delete state.prs[2685];
        delete state.mergeGate.heads[2685];
        const landing = reconcile(state);
        expect(landing.holders).toEqual({});
        expect(landing.held).toEqual({});
        expect(landingHolds(landing)).toEqual({});
        await labelSlots(gh, REPO, state);
        expect(gh.writes).toHaveLength(1);
        expect(state.landing.labelled).toEqual({});
    });

    it("takes off a queue:next it put on when the slot ends on lost readiness, and never one it did not", async () => {
        const state = stateOf(
            { 2685: rec(), 2987: rec({ labels: [QUEUE_NEXT] }) },
            { 2685: BIG, 2987: baselines("layout", 12) },
        );
        reconcile(state);
        const gh = client(true);
        await labelSlots(gh, REPO, state);
        expect(gh.writes.map((w) => w.path)).toEqual([`repos/${REPO}/issues/2685/labels`]);
        state.prs[2685].labels = [QUEUE_NEXT];
        state.prs[2685].ownerRejected = true;
        state.prs[2987].draft = true;
        reconcile(state);
        expect(state.landing.holders).toEqual({});
        await labelSlots(gh, REPO, state);
        expect(gh.writes.map((w) => `${w.method} ${w.path}`)).toEqual([
            `POST repos/${REPO}/issues/2685/labels`,
            `DELETE repos/${REPO}/issues/2685/labels/queue%3Anext`,
        ]);
    });

    it("writes queue:next once as a would-do while the upkeep group does not act", async () => {
        const state = stateOf({ 2685: rec() }, { 2685: BIG });
        reconcile(state);
        const gh = client(false);
        await labelSlots(gh, REPO, state);
        await labelSlots(gh, REPO, state);
        expect(gh.writes).toHaveLength(1);
        expect(state.landing.labelled).toEqual({ 2685: "would-do" });
    });

    it("grants a slot at any size for the owner's githerd:landing label, and ignores anyone else's", () => {
        const granted = rec({ labels: [LANDING], ownerLabels: [LANDING] });
        const state = stateOf({ 900: granted }, { 900: ["layout/src/a.ts"] });
        expect(reconcile(state).holders[900].why).toBe(`the owner's ${LANDING} label`);
        const someone = stateOf({ 900: rec({ labels: [LANDING], ownerLabels: [] }) }, { 900: ["layout/src/a.ts"] });
        expect(reconcile(someone).holders).toEqual({});
    });

    it("gives no slot while the owner's rejects are open, the review waits, a check fails, or it is held", () => {
        for (const over of [
            { ownerRejected: true },
            { ownerGate: true },
            { required: { "All Checks Pass": "FAILURE" } },
            { labels: ["hold"] },
            { breaking: true },
            { draft: true },
            { author: "someone" },
            { baseRef: "feat/base" },
        ]) {
            const state = stateOf({ 2685: rec(over) }, { 2685: BIG });
            expect(reconcile(state).holders, JSON.stringify(over)).toEqual({});
        }
        // A conflict and pending checks are no reason: a conflicting head runs no CI.
        const conflicting = stateOf(
            { 2685: rec({ mergeable: "CONFLICTING", required: { "All Checks Pass": "PENDING" } }) },
            { 2685: BIG },
        );
        expect(Object.keys(reconcile(conflicting).holders)).toEqual(["2685"]);
    });

    it("keeps a holder's slot while its review waits again after master came in, until a reject", () => {
        const state = stateOf({ 2685: rec() }, { 2685: BIG });
        reconcile(state);
        state.prs[2685].ownerGate = true;
        state.prs[2685].required["All Checks Pass"] = "FAILURE";
        expect(Object.keys(reconcile(state).holders)).toEqual(["2685"]);
        state.prs[2685].ownerRejected = true;
        expect(reconcile(state).holders).toEqual({});
    });

    it("gives one slot per disjoint set of files, keeping the current holder first", () => {
        const state = stateOf(
            { 2987: rec({ createdAt: "2026-10-12T00:00:00Z" }), 3139: rec({ createdAt: "2026-10-11T00:00:00Z" }) },
            { 2987: baselines("graphty-element", 222), 3139: baselines("graphty-element", 222) },
        );
        expect(Object.keys(reconcile(state).holders)).toEqual(["3139"]);
        expect(state.landing.held).toEqual({ 2987: { holder: 3139, shared: 222 } });
        // An older big pull request that becomes ready later does not take the slot away.
        state.prs[1000] = rec({ createdAt: "2026-10-01T00:00:00Z" });
        state.mergeGate.heads[1000] = { files: baselines("graphty-element", 50) };
        expect(Object.keys(reconcile(state).holders)).toEqual(["3139"]);
        // A disjoint big one gets its own.
        state.prs[1001] = rec();
        state.mergeGate.heads[1001] = { files: baselines("layout", 30) };
        expect(Object.keys(reconcile(state).holders).sort()).toEqual(["1001", "3139"]);
    });
});

describe("the landing slot's job", () => {
    it("asks for master at the first conflict, ahead of every ordinary pull request job", () => {
        const state = stateOf(
            {
                2685: rec({ mergeable: "CONFLICTING", conflictSightings: 1 }),
                3001: rec({ required: { "All Checks Pass": "FAILURE" } }),
            },
            { 2685: BIG, 3001: ["layout/src/b.ts"] },
        );
        expect(prWork("2685", state.prs[2685], state)).toBeNull();
        reconcile(state);
        expect(prWork("2685", state.prs[2685], state)).toBe("landing slot: conflicting with master, merge it in now");
        syncJobs(state, { config, now: new Date(NOW) });
        expect(state.jobs["pr-2685"].facts.landing).toBe(true);
        const order = jobOrder(state.jobs).items;
        expect(order.map((i) => i.job)).toEqual(["pr-2685", "pr-3001"]);
        expect(order[0].reason).toContain("landing slot: conflicting with master");
        expect(jobText(state.jobs["pr-2685"])).toContain("node visual-review/trusted/cli.mjs update <pr>");
    });

    it("asks for master when GitHub says the holder is behind, and nothing when it is current", () => {
        const state = stateOf({ 2685: rec({ mergeState: "BEHIND" }) }, { 2685: BIG });
        reconcile(state);
        expect(prWork("2685", state.prs[2685], state)).toBe("landing slot: behind master, merge it in now");
        state.prs[2685].mergeState = "CLEAN";
        expect(prWork("2685", state.prs[2685], state)).toBeNull();
    });

    it("has no landing line for an ordinary pull request job", () => {
        const job = newJob({ id: "pr-1", kind: "pr", target: "#1", facts: {} }, new Date(NOW));
        expect(jobText(job)).not.toContain("LANDING SLOT");
    });
});

describe("the board", () => {
    it("shows each slot holder and what waits behind it", () => {
        const state = stateOf({ 2685: rec(), 3139: rec() }, { 2685: BIG, 3139: [BIG[0]] });
        reconcile(state);
        state.landing.holds = "(statuses dry-run: holds are recorded, not posted)";
        expect(landingLines(state)).toEqual([
            "LANDING SLOTS (1): (statuses dry-run: holds are recorded, not posted)",
            "  #2685 holds a slot since 2026-10-17 12:00 UTC -- big: 22 files, 21 baseline images",
            "    #3139 waits behind it -- shares 1 files",
        ]);
        const view = /** @type {any} */ ({
            state,
            liveness: {},
            prs: [{ number: 2685, title: "big", decision: { state: "success" } }],
        });
        expect(renderBoard(view, new Date(NOW), "prs")).toContain("LANDING SLOTS (1)");
        expect(landingLines(stateOf({}, {}))).toEqual([]);
    });
});

describe("config", () => {
    it("defaults the thresholds and refuses a bad one", () => {
        expect(config.landing).toEqual({ minFiles: 100, minBaselines: 10 });
        expect(() => configOf({ landing: { minFiles: 0 } })).toThrow(/landing.minFiles/);
        expect(() => configOf({ landing: { size: 3 } })).toThrow(/landing.size is not a setting/);
    });
});
