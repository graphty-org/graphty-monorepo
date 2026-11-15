// Tests of the review page's rolling target list (rolling.mjs).
// Run: node tools/channel/rolling.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rollingOffers } from "./rolling.mjs";

const X = "a".repeat(40);
const Y = "b".repeat(40);
const M = "c".repeat(40);
const TREE = "1".repeat(40);
const row = (o) => ({
    project: "layout",
    story: "s--one",
    mode: "",
    sha: X,
    baselinesTree: TREE,
    runId: 7,
    attempt: 1,
    artifact: "visual-slice-layout-1-1",
    status: "changed",
    at: 100,
    ...o,
});
const none = () => [];

describe("rollingOffers", () => {
    it("offers each render commit's changed, new and unseeded renders, newest commit first", () => {
        const offers = rollingOffers(
            [
                row({}),
                row({ story: "s--two", status: "unchanged" }),
                row({ story: "s--three", status: "unstable" }),
                row({ story: "s--four", status: "new", mode: "dark" }),
                row({ story: "s--five", sha: Y, status: "unseeded", runId: 9, at: 200 }),
            ],
            { tree: TREE },
            none,
            new Map(),
        );
        assert.deepEqual(
            offers.map((o) => [o.commit, o.items.map((i) => [i.id, i.mode, i.runId])]),
            [
                [Y, [["s--five", null, 9]]],
                [
                    X,
                    [
                        ["s--one", null, 7],
                        ["s--four", "dark", 7],
                    ],
                ],
            ],
        );
    });

    it("holds back a render whose baselines are no longer master's", () => {
        const [o] = rollingOffers([row({ baselinesTree: "2".repeat(40) })], { tree: TREE }, none, new Map());
        assert.equal(o.items.length, 0);
        assert.match(o.pending[0].why, /approval changed master's baselines/);
    });

    it("holds back a render whose project a later merge reaches, and only that project", () => {
        const reach = new Map([[M, new Set(["layout:stories/a.stories.ts"])]]);
        const [o] = rollingOffers(
            [row({}), row({ project: "algorithms", story: "a--b" })],
            { tree: TREE },
            () => [M],
            reach,
        );
        assert.deepEqual(
            o.items.map((i) => i.project),
            ["algorithms"],
        );
        assert.match(o.pending[0].why, /re-render pending: 1 merges since reach layout/);
    });

    it("holds back a render too far behind master to check", () => {
        const [o] = rollingOffers([row({})], { tree: TREE }, () => null, new Map());
        assert.equal(o.items.length, 0);
        assert.match(o.pending[0].why, /merges ago, or not on master/);
    });
});
