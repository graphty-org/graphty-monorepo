/**
 * The oracle scorecard's floors, on hand-made records: one element newly failing fails its sample whatever the pass
 * rate, a fixed element is dropped from the known failures and never let back, a stand-in's and the specification's
 * floors are kept apart,
 * and an allowed drop needs an issue, an expiry and a least rate, and lapses on each.
 */
import { assert, describe, it } from "vitest";

import type { OracleReport } from "./compare-oracle";
import { checkScored, dropLapsed, mergeRecords, type OracleFloors, type OracleScored } from "./floors";

const empty = (): OracleFloors => ({
    about: "",
    floors: {},
    standInFloors: {},
    specificationFloors: {},
    allowedDrops: {},
    lowered: {},
    known: {},
});

const scored = (rate: number, failures: OracleReport["failures"]): OracleScored => ({
    report: { properties: {}, failures } as unknown as OracleReport,
    scores: { "node.fill": rate },
});

describe("oracle floors", () => {
    it("fails a sample for one element newly failing, though its pass rate holds the floor", () => {
        const stored = empty();
        stored.floors.s = { "node.fill": 0.5 };
        stored.known.s = { "node.fill": ["a"] };
        // a fixed, b broken: the rate is the same
        const check = checkScored("s", scored(0.5, { "node.fill": ["b"] }), "floors", stored, "2026-10-18");
        assert.deepEqual(check.dropped, []);
        assert.deepEqual(check.newlyFailing, ["s node.fill: 1 newly failing: b"]);
        assert.deepEqual(
            checkScored("s", scored(0.5, { "node.fill": ["a"] }), "floors", stored, "2026-10-18").newlyFailing,
            [],
        );
    });

    it("lets a property at a floor of 0, or a stray property, go unjudged, and fails another that is no longer judged", () => {
        const stored = empty();
        stored.floors.s = { "node.fill": 0.5, "stray.present": 0 };
        const check = checkScored("s", scored(0.5, {}), "floors", stored, "2026-10-18");
        assert.deepEqual(check.dropped, []);
        // a stray property with no stray left to judge is at its best, whatever its floor
        stored.floors.s["stray.present"] = 0.9;
        assert.deepEqual(checkScored("s", scored(0.5, {}), "floors", stored, "2026-10-18").dropped, []);
        stored.floors.s["edge.label"] = 0.2;
        assert.lengthOf(checkScored("s", scored(0.5, {}), "floors", stored, "2026-10-18").dropped, 1);
    });

    it("asks for a record of a property whose failures were never recorded", () => {
        const stored = empty();
        stored.floors.s = { "node.fill": 1 };
        assert.deepEqual(checkScored("s", scored(1, {}), "floors", stored, "2026-10-18").unfloored, ["s node.fill"]);
    });

    it("drops a fixed element from the known failures and never adds one to a recorded property", () => {
        const fresh = empty();
        fresh.floors.s = { "node.fill": 0.5 };
        fresh.known.s = { "node.fill": ["a", "b"] };
        const out = mergeRecords(fresh, {
            s: {
                scores: { "node.fill": 0.4, "edge.color": 0.5 },
                failures: { "node.fill": ["b", "c"], "edge.color": ["e"] },
                section: "floors",
            },
        });
        assert.deepEqual(out.known.s, { "node.fill": ["b"], "edge.color": ["e"] });
        // and the floor is not lowered
        assert.deepEqual(out.floors.s, { "node.fill": 0.5, "edge.color": 0.5 });
    });

    it("keeps a stand-in oracle's floors apart from the real programs'", () => {
        const fresh = empty();
        fresh.floors.s = { "node.fill": 0.5 };
        const out = mergeRecords(fresh, {
            s: { scores: { "node.fill": 0.6 }, failures: {}, section: "standInFloors" },
        });
        assert.deepEqual(out.floors, {});
        assert.deepEqual(out.standInFloors, { s: { "node.fill": 0.6 } });
        const stored = { ...empty(), standInFloors: out.standInFloors, known: out.known };
        assert.deepEqual(checkScored("s", scored(0.5, {}), "standInFloors", stored, "2026-10-18").dropped.length, 1);
    });

    it("keeps the specification's floors apart from the programs' and the stand-ins'", () => {
        const fresh = empty();
        fresh.standInFloors["s~specification"] = { "node.fill": 0.5 };
        const out = mergeRecords(fresh, {
            "s~specification": { scores: { "node.fill": 0.4 }, failures: {}, section: "specificationFloors" },
        });
        assert.deepEqual(out.standInFloors, {});
        assert.deepEqual(out.specificationFloors, { "s~specification": { "node.fill": 0.5 } });
    });

    it("excuses a floor only with an issue, an expiry and a least rate, and not after it lapses", () => {
        const drop = { reason: "r", issue: "#12", expires: "2026-11-01", atLeast: 0.4 };
        assert.isNull(dropLapsed(drop, 0.45, "2026-10-18"));
        assert.isNull(dropLapsed({ ...drop, issue: "ISSUES.md I7" }, 0.45, "2026-10-18"));
        assert.include(dropLapsed(drop, 0.45, "2026-11-02") ?? "", "expired");
        assert.include(dropLapsed(drop, 0.3, "2026-10-18") ?? "", "at least");
        assert.include(dropLapsed("a reason with no issue", 0.45, "2026-10-18") ?? "", "needs");
        assert.include(dropLapsed({ ...drop, issue: "soon" }, 0.45, "2026-10-18") ?? "", "needs");
        const stored = empty();
        stored.floors.s = { "node.fill": 0.5 };
        stored.known.s = { "node.fill": [] };
        stored.allowedDrops["s/node.fill"] = drop;
        assert.deepEqual(checkScored("s", scored(0.45, {}), "floors", stored, "2026-10-18").dropped, []);
        assert.lengthOf(checkScored("s", scored(0.45, {}), "floors", stored, "2026-11-02").dropped, 1);
    });
});
