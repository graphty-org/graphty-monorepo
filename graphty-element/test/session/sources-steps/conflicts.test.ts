// Conflicts between sources (design design/data/multiple-data-sources-design.md, 3.3, 3.10 and 4.4):
// rules per column, the conflict report, reader picks, clash columns and rename. Ported from the
// reference model's copy-reference-and-conflicts, clash-column-in-source-section and
// rename-keeps-clash-rule cases.
import { assert, describe, it } from "vitest";

import { conflictReport, conflicts, values } from "../../../src/session/sources/steps/provenance";
import { csv, Fixture, nodeIn } from "./helpers";

const S1 = csv("id,name,amt\np1,Ann,10\np2,Bo,20\n");
const S2 = csv("id,name,amt\np1,Anne,30\np2,Bo,40\n");
const S3 = csv("id,name,amt\np1,Anne,50\n");
const P1 = { space: "person", key: "p1" };
const P2 = { space: "person", key: "p2" };

// Each file imported with key id and type person, so they meet in the space person.
function sources(...tables: ReturnType<typeof csv>[]): { f: Fixture; ids: string[] } {
    const f = new Fixture();
    const ids = tables.map((nodes) => f.import({ nodes }, { key: "id", type: "person" }));
    return { f, ids };
}

describe("rules per column (3.10)", () => {
    it("keeps the held value by default and reports the other as { code, params }", () => {
        const {
            f,
            ids: [a, b],
        } = sources(S1, S2);
        const r = f.built();
        const v = values(r, P1, "name");
        assert.equal(v?.shown, "Ann");
        assert.deepEqual(
            v?.list.map((x) => x.value),
            ["Ann", "Anne"],
        );
        const rep = conflictReport(r);
        assert.deepEqual(
            rep.find((x) => x.params.column === "name"),
            {
                code: "W_VALUES_DIFFER",
                params: {
                    step: 1,
                    column: "name",
                    count: 1,
                    decided: 0,
                    rule: "keep",
                    rules: ["keep", "overwrite", "both", "vote"],
                },
            },
        );
        const amt = rep.find((x) => x.params.column === "amt");
        assert.equal(amt?.code === "W_VALUES_DIFFER" ? amt.params.count : -1, 2);
        assert.deepEqual(conflicts(r, { column: "name" })[0].values, [
            { source: a, value: "Ann" },
            { source: b, value: "Anne" },
        ]);
    });

    it("gives max and mean on numbers, vote on three sources, and keep for the rest", () => {
        const {
            f,
            ids: [, b, c],
        } = sources(S1, S2, S3);
        assert.isNull(f.setClash(f.stepOf(b), "amt", "max"));
        assert.isNull(f.setClash(f.stepOf(c), "amt", "max"));
        assert.isNull(f.setClash(f.stepOf(c), "name", "vote"));
        let r = f.built();
        assert.equal(values(r, P1, "amt")?.shown, "50");
        assert.equal(values(r, P1, "name")?.shown, "Anne", "two of three sources say Anne");
        assert.equal(values(r, P2, "name")?.shown, "Bo");
        f.setClash(f.stepOf(b), "amt", "mean");
        f.setClash(f.stepOf(c), "amt", "mean");
        r = f.built();
        const m = values(r, P1, "amt");
        assert.equal(m?.shown, 30);
        assert.equal(m?.origin, "rule:mean", "a computed value is marked computed");
        assert.deepEqual(
            f.steps[f.stepOf(b)].clash,
            { "*": "keep", amt: "mean" },
            "saved per column with * for the rest",
        );
    });

    it("refuses a numeric rule on a text column with E_CLASH_RULE_TYPE", () => {
        const {
            f,
            ids: [, b],
        } = sources(S1, S2);
        const i = f.stepOf(b);
        assert.deepEqual(f.setClash(i, "name", "max"), {
            code: "E_CLASH_RULE_TYPE",
            params: { step: i, column: "name", rule: "max" },
        });
        assert.isUndefined(f.steps[i].clash, "the step is unchanged");
        assert.deepEqual(f.setClash(i, "name", "mean")?.code, "E_CLASH_RULE_TYPE");
    });

    it("orders dates under min and max, but refuses mean on them", () => {
        const f = new Fixture();
        f.import({ nodes: csv("id,seen\np1,2026-03-01\n") }, { key: "id", type: "person" });
        const b = f.import({ nodes: csv("id,seen\np1,2026-05-20\n") }, { key: "id", type: "person" });
        assert.isNull(f.setClash(f.stepOf(b), "seen", "max"));
        assert.equal(values(f.built(), P1, "seen")?.shown, "2026-05-20");
        assert.equal(f.setClash(f.stepOf(b), "seen", "mean")?.code, "E_CLASH_RULE_TYPE");
    });
});

describe("reader picks (3.10)", () => {
    it("writes a committed pick as a reader edit naming its source; dropping it gives back the rule's value", () => {
        const {
            f,
            ids: [, b],
        } = sources(S1, S2);
        const before = f.fork();
        for (const ref of [P1, P2]) {
            assert.isString(f.use(ref, "amt", b));
        }
        const r = f.built();
        assert.equal(values(r, P1, "amt")?.shown, "30");
        assert.deepEqual(
            f.reader.map((o) => (o.op === "edit" ? o.picked : null)),
            [b, b],
        );
        assert.equal(conflicts(r, { column: "amt", only: "decided" }).length, 2);
        assert.equal(conflicts(r, { column: "amt", only: "open" }).length, 0);
        const amt = conflictReport(r).find((x) => x.params.column === "amt");
        assert.equal(amt?.code === "W_VALUES_DIFFER" ? amt.params.decided : -1, 2);
        assert.equal(values(before.built(), P1, "amt")?.shown, "10", "without the picks, keep shows the first value");
    });

    it("leaves the pick as the reader's value when the picked source is removed, and keeps the rules", () => {
        const {
            f,
            ids: [, b],
        } = sources(S1, S2);
        f.setClash(f.stepOf(b), "amt", "max");
        f.use(P1, "name", b);
        assert.equal(values(f.built(), P1, "amt")?.shown, "30");
        f.removeSource(b);
        const r = f.built();
        assert.equal(values(r, P1, "name")?.shown, "Anne");
        assert.equal(values(r, P1, "name")?.origin, "reader");
        assert.deepEqual(r.readerResults, [{ id: f.reader[0].id, applied: true }]);
    });
});

describe("clash columns (3.3, 3.8)", () => {
    it("lists the clash column under its own source with B's own value", () => {
        const {
            f,
            ids: [, b],
        } = sources(csv("id,amt\np1,10\np2,20\n"), csv("id,amt\np1,30\np2,40\n"));
        f.setClash(f.stepOf(b), "amt", "both");
        const clash = `amt (${b})`;
        const n = nodeIn(f.built(), "person", "p1");
        assert.equal(n?.values.amt, "10", "the held value stays");
        assert.equal(n?.values[clash], "30");
        assert.property(n?.own[b], clash, "B's section reads its clash column");
        assert.deepEqual(n?.clashColumns?.[clash], { column: clash, base: "amt", source: b });
        const v = values(f.built(), P1, clash);
        assert.isTrue(v?.list.some((x) => x.source === b && x.value === "30"));
    });
});

describe("rename (4.4)", () => {
    it("keeps a column's conflict rule when the column is renamed in every source", () => {
        const {
            f,
            ids: [a, b],
        } = sources(csv("id,amt\np1,10\n"), csv("id,amt\np1,30\n"));
        f.setClash(f.stepOf(b), "amt", "max");
        assert.equal(values(f.built(), P1, "amt")?.shown, "30", "max of 10 and 30");
        assert.isNull(f.renameColumn(a, "nodes", "amt", "amount"));
        assert.isNull(f.renameColumn(b, "nodes", "amt", "amount"));
        assert.equal(values(f.built(), P1, "amount")?.shown, "30", "the rule follows the rename");
        assert.deepEqual(f.steps[f.stepOf(b)].clash, { "*": "keep", amount: "max" });
    });

    it("refuses renaming a column a role reads, or onto a name the table has", () => {
        const {
            f,
            ids: [a],
        } = sources(S1);
        assert.deepEqual(f.renameColumn(a, "nodes", "id", "ident"), {
            code: "E_EDIT_ROLE_COLUMN",
            params: { column: "id" },
        });
        assert.deepEqual(f.renameColumn(a, "nodes", "amt", "name"), {
            code: "E_BAD_COMMAND",
            params: { reason: "name-taken", source: a, table: "nodes", column: "name" },
        });
    });

    it("moves a reader edit of a cell only the renamed source fills", () => {
        const {
            f,
            ids: [a],
        } = sources(S1);
        f.edit(P1, "amt", "11");
        f.renameColumn(a, "nodes", "amt", "amount");
        assert.equal(values(f.built(), P1, "amount")?.shown, "11");
    });
});
