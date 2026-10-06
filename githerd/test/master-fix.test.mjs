import { describe, expect, it } from "vitest";

import { CRITICAL, isMasterFix, labelMasterFixes, linkMasterFix } from "../lib/master-fix.mjs";
import { statusData, statusText } from "../lib/tools.mjs";

const KEY = "CI / Test (webgpu-graph-algorithms-node) / Run tests";
const AUDIT = "CI / Build / Security audit";
const REPO = "graphty-org/graphty-monorepo";

/**
 * A state whose CI lane is red on two keys, the test key judged with the given verdict reason and
 * the audit key not judged.
 * @param {string} [reason] the test key's verdict reason
 * @returns {any} the state
 */
function redState(reason = "known Dawn race") {
    return {
        trust: { login: "owner" },
        jobs: {},
        incidents: {},
        issues: {
            byNumber: {
                952: { state: "open", text: "dense-loop-guard flakes\nbody" },
                990: { state: "open", text: "Red master: CI failed on 99c8a1e\nThe merge queue is frozen" },
            },
        },
        master: {
            branch: "master",
            verdict: "red",
            lanes: {
                ci: {
                    verdict: "red",
                    redJobs: [{ key: KEY }, { key: AUDIT }],
                    verdicts: { [KEY]: { verdict: "environment", reason } },
                },
            },
        },
    };
}

/**
 * An open pull request as the poll's query returns it.
 * @param {number} number its number
 * @param {object} [over] fields to change
 * @returns {any} the node
 */
function node(number, over = {}) {
    return {
        number,
        body: "",
        baseRefName: "master",
        author: { login: "owner" },
        labels: { nodes: [] },
        closingIssuesReferences: { nodes: [] },
        ...over,
    };
}

describe("linkMasterFix", () => {
    it("links the pull request that closes the red master's issue, names a judged key, or was reported as the fix", () => {
        const state = redState("Dawn race, fix in open PR #1107");
        const nodes = [
            node(1101, { closingIssuesReferences: { nodes: [{ number: 990 }] } }),
            node(1102, { body: `Stops ${KEY} failing on master.` }),
            node(1107),
            node(1108, { body: "touches webgpu-graph-algorithms too" }),
            node(1109, { body: `names ${AUDIT}, which has no verdict` }),
            node(1110, { body: "Refs #952" }),
            node(1111, { body: `Fixes #990 and ${KEY}`, author: { login: "someone-else" } }),
        ];
        expect(linkMasterFix(state, nodes)).toEqual([
            { pr: 1101, why: "names #990, the red master's issue" },
            { pr: 1102, why: `names ${KEY}` },
            { pr: 1107, why: "reported as the fix" },
        ]);
        expect(state.master.fixPrs.map((/** @type {any} */ f) => f.pr)).toEqual([1101, 1102, 1107]);
        // A second poll reports nothing new.
        expect(linkMasterFix(state, nodes)).toEqual([]);
    });

    it("links an incident job's pull request, and nothing once master is green", () => {
        const state = redState();
        state.jobs["incident-x"] = { kind: "incident", state: "working", pr: 1120 };
        expect(linkMasterFix(state, [node(1120)])).toEqual([{ pr: 1120, why: "reported as the fix" }]);
        state.master.lanes.ci = { verdict: "green" };
        expect(linkMasterFix(state, [node(1120)])).toEqual([]);
        expect(state.master.fixPrs).toEqual([]);
    });
});

describe("labelMasterFixes", () => {
    /**
     * A client stub that records its writes.
     * @param {boolean} acting whether the incidents group acts
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

    it("labels each linked fix priority:critical once, through the incidents group", async () => {
        const state = redState("fix in #1107");
        linkMasterFix(state, [node(1107), node(1101, { body: "Fixes #990", labels: { nodes: [{ name: CRITICAL }] } })]);
        const gh = client(true);
        await labelMasterFixes(gh, REPO, state);
        await labelMasterFixes(gh, REPO, state);
        expect(gh.writes).toEqual([
            {
                method: "POST",
                path: `repos/${REPO}/issues/1107/labels`,
                body: { labels: [CRITICAL] },
                group: "incidents",
            },
        ]);
        expect(linkMasterFix(state, [node(1107)])).toEqual([]);
        expect(state.master.fixPrs[0].labelled).toBe("sent");
    });

    it("dry-run: one would-do write and no repeats, then the label once the group acts", async () => {
        const state = redState("fix in #1107");
        linkMasterFix(state, [node(1107)]);
        const dry = client(false);
        await labelMasterFixes(dry, REPO, state);
        await labelMasterFixes(dry, REPO, state);
        expect(dry.writes).toHaveLength(1);
        expect(state.master.fixPrs[0].labelled).toBe("would-do");
        const acting = client(true);
        await labelMasterFixes(acting, REPO, state);
        expect(acting.writes).toHaveLength(1);
        expect(state.master.fixPrs[0].labelled).toBe("sent");
    });
});

describe("isMasterFix", () => {
    it("is true for an incident job and a job whose pull request is a linked fix", () => {
        const state = redState("fix in #1107");
        linkMasterFix(state, [node(1107)]);
        expect(isMasterFix(state, { kind: "incident" })).toBe(true);
        expect(isMasterFix(state, { kind: "issue", pr: 1107 })).toBe(true);
        expect(isMasterFix(state, { kind: "issue", pr: 1108 })).toBe(false);
        expect(isMasterFix(state, { kind: "issue" })).toBe(false);
    });
});

describe("the board", () => {
    it("shows the linked fix beside the red master", () => {
        const state = redState("fix in #1107");
        linkMasterFix(state, [node(1107)]);
        const now = new Date("2026-10-06T02:00:00Z");
        const data = statusData(
            state,
            { config: { repo: REPO, lanes: {} }, now, startedAt: now.toISOString(), version: "0", mode: "dry-run" },
            { section: "master" },
        );
        expect(statusText(data, now)).toContain(
            "Fix: #1107 (reported as the fix), labelled priority:critical so it merges through the freeze.",
        );
    });
});
