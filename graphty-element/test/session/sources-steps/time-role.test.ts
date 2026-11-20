// A node's time follows the value its time column shows (design
// design/data/multiple-data-sources-design.md, 3.9 and 3.10): when two sources read time from one
// column, the source whose value the conflict rule keeps gives the time.
import { assert, describe, it } from "vitest";

import type { ClashRule, Row } from "../../../src/session/sources/steps/types";
import { Fixture, nodeIn } from "./helpers";

const COL = "last_seen";
const ms = (day: string): number => Date.parse(`${day}T00:00:00Z`);

const timed = (clash: ClashRule, cell: (day: string) => string | number = (d) => d) => {
    const f = new Fixture();
    const rows = (p1: string, p2: string): Row[] => [
        { id: "p1", [COL]: cell(p1) },
        { id: "p2", [COL]: cell(p2) },
    ];
    const mapping = { nodes: { time: "last_seen" } };
    const a = f.import({ nodes: rows("2026-03-01", "2026-01-10") }, { key: "id", type: "person", mapping });
    const b = f.stage(
        { nodes: rows("2026-05-20", "2025-12-31") },
        { nodes: { key: "id", space: "person", time: "last_seen" } },
    );
    f.steps.push({ op: "join.add", source: b, clash: { [COL]: clash } });
    return { built: f.built(), a, b };
};

describe("the time role follows the conflict rule", () => {
    it("3.9 / 3.10: the timeline reads the value the conflict rule shows (overwrite)", () => {
        const { built, b } = timed("overwrite");
        const n = nodeIn(built, "person", "p1");
        assert.equal(n?.values.last_seen, "2026-05-20");
        assert.equal(n?.time, Date.parse("2026-05-20T00:00:00Z"));
        assert.equal(n?.timeFrom, b);
    });

    it("max picks the later time, and the time comes from that source", () => {
        const { built, a, b } = timed("max", ms);
        const p1 = nodeIn(built, "person", "p1");
        const p2 = nodeIn(built, "person", "p2");
        assert.equal(p1?.values.last_seen, ms("2026-05-20"));
        assert.equal(p1?.timeFrom, b);
        assert.equal(p1?.time, Date.parse("2026-05-20T00:00:00Z"));
        assert.equal(p2?.values.last_seen, ms("2026-01-10"));
        assert.equal(p2?.timeFrom, a);
        assert.equal(p2?.time, Date.parse("2026-01-10T00:00:00Z"));
    });

    it("keep leaves the first source's time", () => {
        const { built, a } = timed("keep");
        const n = nodeIn(built, "person", "p1");
        assert.equal(n?.timeFrom, a);
        assert.equal(n?.time, Date.parse("2026-03-01T00:00:00Z"));
    });
});
