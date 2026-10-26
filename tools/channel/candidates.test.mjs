// Tests of the review page's candidate list (candidates.mjs) on recorded store answers.
// Run: node tools/channel/candidates.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { listCandidates } from "./candidates.mjs";

const answers = {
    "/v1/candidate": {
        candidate: { sha: "c".repeat(40), builtAt: 5 },
        judged: null,
        recent: [
            { sha: "c".repeat(40), state: "green-images", lane: null, issue: null, runId: 30, at: 3000 },
            { sha: "b".repeat(40), state: "approved", lane: null, issue: null, runId: 20, at: 2500 },
            { sha: "a".repeat(40), state: "green-clean", lane: null, issue: null, runId: 10, at: 1000 },
        ],
    },
    "/v1/release-state": { nightly: { sha: "a".repeat(40), movedAt: 1100 }, offered: null },
};
const get = async (path) => answers[path];

describe("listCandidates", () => {
    it("lists every judged commit with its run, verdict and whether it promoted", async () => {
        assert.deepEqual(await listCandidates(get), [
            { commit: "c".repeat(40), runId: 30, waiting: true, verdict: "green-images", promoted: false, at: 3000 },
            { commit: "b".repeat(40), runId: 20, waiting: false, verdict: "approved", promoted: true, at: 2500 },
            { commit: "a".repeat(40), runId: 10, waiting: false, verdict: "green-clean", promoted: true, at: 1000 },
        ]);
    });

    it("never calls an inherited verdict waiting: its run captured nothing", async () => {
        const inherited = {
            ...answers,
            "/v1/candidate": {
                recent: [
                    {
                        sha: "d".repeat(40),
                        state: "green-images",
                        lane: "inherited from cccccccccc",
                        runId: 40,
                        at: 4000,
                    },
                ],
            },
        };
        assert.equal((await listCandidates(async (path) => inherited[path]))[0].waiting, false);
    });

    it("offers only the held head while nightly is held, and nothing until that head is green-images", async () => {
        const recent = [
            { sha: "e".repeat(40), state: "green-images", runId: 50, at: 5000 },
            { sha: "d".repeat(40), state: "green-images", runId: 40, at: 4000 },
        ];
        const held = (head) => async (path) =>
            path === "/v1/candidate" ? { recent, hold: { head, issue: 9 } } : answers[path];
        const waiting = async (head) => (await listCandidates(held(head))).filter((c) => c.waiting).map((c) => c.runId);
        assert.deepEqual(await waiting("e".repeat(40)), [50], "the held head, not the older green-images run");
        assert.deepEqual(await waiting("f".repeat(40)), [], "a held head not judged yet offers nothing");
    });

    it("works before the first nightly", async () => {
        const none = async (path) => (path === "/v1/release-state" ? { nightly: null } : answers[path]);
        assert.equal((await listCandidates(none))[0].promoted, false);
    });

    it("fails when the store cannot answer", async () => {
        await assert.rejects(
            listCandidates(async () => {
                throw new Error("HTTP 503");
            }),
            /HTTP 503/,
        );
    });
});
