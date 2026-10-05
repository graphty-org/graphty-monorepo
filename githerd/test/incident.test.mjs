import { describe, expect, it } from "vitest";

import { incidentOutcome } from "../lib/incident.mjs";
import { createReplay } from "./replay/replay.mjs";

const ONE = [{ sha: "c1", pr: 701 }];
const MANY = [
    { sha: "c4", pr: 701 },
    { sha: "c3", pr: 700 },
];

describe("incidentOutcome: the outcome table of design 4.5", () => {
    it("red head re-run passes: intermittent, whatever the parent and the merges", () => {
        for (const parent of ["success", "failure", null]) {
            for (const suspects of [[], ONE, MANY]) {
                expect(incidentOutcome({ redHead: "success", parent, suspects })).toEqual({
                    outcome: "intermittent",
                    revert: null,
                    mergesResume: true,
                });
            }
        }
    });

    it("red head and parent both fail: the world changed, fix forward, no revert", () => {
        for (const suspects of [[], ONE, MANY]) {
            expect(incidentOutcome({ redHead: "failure", parent: "failure", suspects })).toEqual({
                outcome: "world-changed",
                revert: null,
                fixForward: true,
            });
        }
    });

    it("red head fails, parent passes, exactly one merge: revert that merge and re-land it", () => {
        expect(incidentOutcome({ redHead: "failure", parent: "success", suspects: ONE })).toEqual({
            outcome: "revert",
            revert: { sha: "c1", pr: 701 },
            reland: 701,
        });
    });

    it("commits that merged no pull request do not count as merges", () => {
        const suspects = [{ sha: "r1", pr: null }, ...ONE];
        expect(incidentOutcome({ redHead: "failure", parent: "success", suspects })).toMatchObject({
            outcome: "revert",
            revert: { sha: "c1", pr: 701 },
        });
    });

    it("red head fails, parent passes, more than one merge: fix forward with the suspects", () => {
        expect(incidentOutcome({ redHead: "failure", parent: "success", suspects: MANY })).toEqual({
            outcome: "suspects",
            revert: null,
            fixForward: true,
            suspects: MANY,
        });
    });

    it("red head fails, parent passes, no merge at all: fix forward, never a revert", () => {
        const suspects = [{ sha: "r1", pr: null }];
        expect(incidentOutcome({ redHead: "failure", parent: "success", suspects })).toMatchObject({
            outcome: "suspects",
            revert: null,
            suspects,
        });
    });

    it("waits for the red head re-run, then for the parent; an unfinished or cancelled re-run is no answer", () => {
        for (const redHead of [null, undefined, "cancelled", "skipped"]) {
            expect(incidentOutcome({ redHead, parent: "success", suspects: ONE })).toEqual({
                outcome: "waiting",
                waitingFor: "red-head",
            });
        }
        for (const parent of [null, undefined, "cancelled"]) {
            expect(incidentOutcome({ redHead: "failure", parent, suspects: ONE })).toEqual({
                outcome: "waiting",
                waitingFor: "parent",
            });
        }
    });
});

describe("replay: the flaky benchmark of 2026-10-02", () => {
    it("the GPU lane red after #701 passes on re-run, so the incident is intermittent and nothing is reverted", () => {
        const { record } = createReplay();
        const gpu = record.master.filter((t) => t.run.name === "GPU" && t.run.event === "push");
        const red = gpu.find((t) => t.run.id === 36973764479);
        expect(red?.attempts.map((a) => a.conclusion)).toEqual(["failure", "success"]);
        const redRun = /** @type {NonNullable<typeof red>} */ (red);

        // The last GPU run green on its first attempt before the red one, and every push between.
        const older = gpu.filter((t) => t.created < redRun.created);
        const green = older.find((t) => t.attempts[0].conclusion === "success");
        const between = gpu.filter((t) => t.created > (green?.created ?? Infinity) && t.created <= redRun.created);
        const suspects = between.map((t) => ({
            sha: t.run.head_sha,
            pr: Number(/^Merge pull request #(\d+)/.exec(t.run.display_title)?.[1] ?? NaN) || null,
        }));
        expect(green?.run.display_title).toMatch(/^Merge pull request #693 /);
        expect(suspects.map((s) => s.pr)).toEqual([701, 700, 698, 699]);

        // The daemon's re-run of the red head is the run's second attempt. The parent re-run is not
        // recorded and is not needed: the red head's pass decides.
        const redHead = redRun.attempts[1].conclusion;
        for (const parent of [null, "success", "failure"]) {
            const out = incidentOutcome({ redHead, parent, suspects });
            expect(out).toMatchObject({ outcome: "intermittent", revert: null });
            // The same pass protects the merge even had it been the only suspect.
            expect(incidentOutcome({ redHead, parent, suspects: suspects.slice(0, 1) }).revert).toBeNull();
        }
    });
});
