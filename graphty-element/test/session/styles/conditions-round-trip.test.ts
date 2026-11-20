/**
 * @file The condition model leaf by leaf: every kind of condition a field makes, every rule leaf a
 * selector can hold read back as the condition an editor draws (or kept fixed when no condition
 * edits it), and the selector written back unchanged. Also the fields a session with two loads, a
 * time column and whole-number columns offers.
 */

import { assert, describe, it } from "vitest";

import type { RuleTree } from "../../../src/catalog/types";
import { createGraphSession } from "../../../src/session";
import {
    type Condition,
    type ConditionField,
    conditionFields,
    conditionLeaf,
    conditionOf,
    conditionSelector,
    edgeConditions,
    isConditionFinished,
    newCondition,
    nodeConditions,
} from "../../../src/session/styles";
import type { Selector } from "../../../src/session/styles/selector";

/** A field of each kind, on nodes. */
const AGE: ConditionField = { path: "data.age", on: "node", kind: "number", range: { min: 1, max: 9 } };
const TEAM: ConditionField = { path: "data.team", on: "node", kind: "category" };
const LEAD: ConditionField = { path: "data.lead", on: "node", kind: "yes-no" };
const BORN: ConditionField = { path: "data.born", on: "node", kind: "date" };
const SOURCE: ConditionField = { path: "@source", on: "node", kind: "source" };
const NAME: ConditionField = { path: "id", on: "node", kind: "name" };
const NOTE: ConditionField = { path: "data.note", on: "node", kind: "text" };
const FIELDS = [AGE, TEAM, LEAD, BORN, SOURCE, NAME, NOTE];

/** An edge field. */
const WEIGHT: ConditionField = { path: "data.weight", on: "edge", kind: "number" };

/** "Has a value" on a path. */
const has = (path: string): RuleTree => ({ kind: "text", reads: path, mode: "regex", text: "" });

/**
 * A new condition on a field, checked to be of the expected type.
 * @param field - The field.
 * @param type - The type it must be.
 * @returns The condition, typed.
 */
function fresh<T extends Condition["type"]>(field: ConditionField, type: T): Extract<Condition, { type: T }> {
    const condition = newCondition(field);
    assert.strictEqual<string>(condition.type, type);
    return condition as Extract<Condition, { type: T }>;
}

/**
 * Read one leaf as a node condition.
 * @param leaf - The leaf.
 * @returns The condition.
 */
const read = (leaf: RuleTree): Condition => conditionOf(leaf, FIELDS, 0);

/**
 * Read a selector holding one leaf, and write it back.
 * @param leaf - The leaf.
 * @returns The selector written back.
 */
const roundTrip = (leaf: RuleTree): Selector =>
    conditionSelector(nodeConditions({ match: "rule", where: leaf }, FIELDS));

describe("newCondition", () => {
    it("starts each kind of field at its own empty state", () => {
        assert.deepInclude(newCondition(AGE), { type: "number", match: "range", min: 1, max: 9 });
        assert.deepInclude(newCondition(LEAD), { type: "yes-no", match: "yes" });
        assert.deepInclude(newCondition(BORN), { type: "date", match: "before" });
        assert.deepInclude(newCondition(SOURCE), { type: "source", sources: [] });
        assert.deepInclude(newCondition(NAME), { type: "text", match: "substring", text: "", caseSensitive: false });
        assert.strictEqual(newCondition(NOTE).type, "text");
    });

    it("finishes a yes-or-no condition at once, and the others only once something is chosen", () => {
        assert.isTrue(isConditionFinished(newCondition(LEAD)));
        assert.isTrue(isConditionFinished(newCondition(AGE)), "a range over the whole span is a leaf");
        for (const field of [TEAM, BORN, SOURCE, NAME]) {
            assert.isFalse(isConditionFinished(newCondition(field)), field.path);
        }
        assert.isTrue(isConditionFinished({ type: "ends", key: "ends", reading: "clipped" }));
        assert.isTrue(
            isConditionFinished({ type: "fixed", key: "fixed:whole", leaf: null, selector: { match: "everything" } }),
        );
        assert.isFalse(isConditionFinished({ type: "fixed", key: "fixed:0", leaf: null }));
    });
});

describe("conditionLeaf", () => {
    it("makes presence leaves for any value condition", () => {
        assert.deepEqual(conditionLeaf({ ...fresh(TEAM, "category"), match: "present" }), has("data.team"));
        assert.deepEqual(conditionLeaf({ ...fresh(TEAM, "category"), match: "absent" }), {
            kind: "not",
            of: has("data.team"),
        });
    });

    it("makes a top-N or top-percent threshold, and none for an out-of-range count", () => {
        const top = { ...fresh(AGE, "number"), match: "top" as const };
        assert.deepEqual(conditionLeaf({ ...top, top: 3 }), {
            kind: "threshold",
            path: "data.age",
            top: 3,
            ties: "all",
        });
        assert.deepEqual(conditionLeaf({ ...top, top: 3, from: "low" }), {
            kind: "threshold",
            path: "data.age",
            top: 3,
            ties: "all",
            from: "low",
        });
        assert.isNull(conditionLeaf({ ...top, top: 0 }));
        assert.isNull(conditionLeaf(top));
        assert.deepEqual(conditionLeaf({ ...top, top: 10, percent: true }), {
            kind: "threshold",
            path: "data.age",
            percentile: 10,
        });
        for (const bad of [undefined, 0, 101]) {
            assert.isNull(conditionLeaf({ ...top, top: bad, percent: true }), String(bad));
        }
    });

    it("leaves an open end out of a range", () => {
        assert.deepEqual(conditionLeaf({ ...fresh(AGE, "number"), min: undefined, max: 5 }), {
            kind: "range",
            attribute: "data.age",
            max: 5,
        });
        assert.deepEqual(conditionLeaf({ ...fresh(AGE, "number"), min: 2, max: undefined }), {
            kind: "range",
            attribute: "data.age",
            min: 2,
        });
    });

    it("compares a date range as times", () => {
        const date = fresh(BORN, "date");
        assert.isNull(conditionLeaf(date));
        assert.deepEqual(conditionLeaf({ ...date, max: 100 }), {
            kind: "range",
            attribute: "data.born",
            max: 100,
            as: "time",
        });
        assert.deepEqual(conditionLeaf({ ...date, match: "between", min: 1, max: 2 }), {
            kind: "range",
            attribute: "data.born",
            min: 1,
            max: 2,
            as: "time",
        });
    });

    it("ors chosen categories with no value when gaps is set", () => {
        const team = fresh(TEAM, "category");
        assert.deepEqual(conditionLeaf({ ...team, gaps: true }), { kind: "not", of: has("data.team") });
        assert.deepEqual(conditionLeaf({ ...team, values: ["red"], gaps: true }), {
            kind: "any",
            of: [
                { kind: "categories", attribute: "data.team", values: ["red"] },
                { kind: "not", of: has("data.team") },
            ],
        });
    });

    it("writes yes or no as exact text, and nothing while unset", () => {
        assert.deepEqual(conditionLeaf({ ...fresh(LEAD, "yes-no"), match: "no" }), {
            kind: "text",
            reads: "data.lead",
            mode: "exact",
            text: "false",
            caseSensitive: true,
        });
        assert.isNull(conditionLeaf({ ...fresh(LEAD, "yes-no"), match: "unset" }));
    });

    it("trims typed text, keeps case sensitivity, and lists picked node ids", () => {
        const name = fresh(NAME, "text");
        assert.isNull(conditionLeaf({ ...name, text: "   " }));
        assert.deepEqual(conditionLeaf({ ...name, match: "starts-with", text: " Al ", caseSensitive: true }), {
            kind: "text",
            reads: "id",
            mode: "starts-with",
            text: "Al",
            caseSensitive: true,
        });
        assert.isNull(conditionLeaf({ ...name, match: "list" }));
        assert.deepEqual(conditionLeaf({ ...name, match: "list", ids: ["a", "b"] }), {
            kind: "member",
            of: { nodes: ["a", "b"] },
        });
    });

    it("lists the chosen loads", () => {
        assert.deepEqual(conditionLeaf({ ...fresh(SOURCE, "source"), sources: ["s2"] }), {
            kind: "source",
            sources: ["s2"],
        });
    });
});

describe("conditionOf: a leaf read back as the condition an editor draws", () => {
    it("reads presence and absence on a known field", () => {
        assert.deepInclude(read(has("data.team")), { type: "category", match: "present" });
        assert.deepInclude(read({ kind: "not", of: has("data.age") }), { type: "number", match: "absent" });
        assert.strictEqual(read({ kind: "not", of: has("data.unknown") }).type, "fixed");
        assert.strictEqual(read({ kind: "not", of: { kind: "isolated" } }).type, "fixed");
    });

    it("reads a time range as a date condition before, after or between", () => {
        const at = (min?: number, max?: number): RuleTree => ({
            kind: "range",
            attribute: "data.born",
            min,
            max,
            as: "time",
        });
        assert.deepInclude(read(at(undefined, 5)), { type: "date", match: "before", max: 5 });
        assert.deepInclude(read(at(5, undefined)), { type: "date", match: "after", min: 5 });
        assert.deepInclude(read(at(1, 5)), { type: "date", match: "between", min: 1, max: 5 });
        assert.strictEqual(read({ kind: "range", attribute: "data.age", min: 1, as: "time" }).type, "fixed");
        assert.strictEqual(read({ kind: "range", attribute: "data.team", min: 1 }).type, "fixed");
    });

    it("reads a top-N or top-percent threshold, and keeps one above a value fixed", () => {
        assert.deepInclude(read({ kind: "threshold", path: "data.age", top: 2, from: "low" }), {
            type: "number",
            match: "top",
            top: 2,
            from: "low",
        });
        assert.deepInclude(read({ kind: "threshold", path: "data.age", percentile: 25 }), {
            match: "top",
            top: 25,
            percent: true,
        });
        assert.strictEqual(read({ kind: "threshold", path: "data.age", above: 3 }).type, "fixed");
        assert.strictEqual(read({ kind: "threshold", path: "data.team", top: 2 }).type, "fixed");
        assert.strictEqual(read({ kind: "threshold", path: "data.age" }).type, "fixed");
    });

    it("reads a bare column expression as presence, or yes for a yes-or-no column", () => {
        assert.deepInclude(read({ kind: "expression", where: "data.note" }), { type: "text", match: "present" });
        assert.deepInclude(read({ kind: "expression", where: "data.lead" }), { type: "yes-no", match: "yes" });
        assert.strictEqual(read({ kind: "expression", where: "data.age > `3`" }).type, "fixed");
    });

    it("reads an empty category list on a yes-or-no column as unset", () => {
        assert.deepInclude(read({ kind: "categories", attribute: "data.lead", values: [] }), {
            type: "yes-no",
            match: "unset",
        });
        assert.strictEqual(read({ kind: "categories", attribute: "data.none", values: ["x"] }).type, "fixed");
    });

    it("reads categories or no value as a category condition with gaps", () => {
        const values: RuleTree = { kind: "categories", attribute: "data.team", values: ["red"] };
        assert.deepInclude(read({ kind: "any", of: [values, { kind: "not", of: has("data.team") }] }), {
            type: "category",
            gaps: true,
        });
        assert.strictEqual(read({ kind: "any", of: [values, { kind: "not", of: has("data.age") }] }).type, "fixed");
        assert.strictEqual(read({ kind: "any", of: [values] }).type, "fixed");
        assert.strictEqual(read({ kind: "any", of: [] }).type, "fixed");
    });

    it("reads text by its mode, yes-or-no text as yes or no, and keeps a regex fixed", () => {
        assert.deepInclude(read({ kind: "text", reads: "data.note", mode: "ends-with", text: "x" }), {
            type: "text",
            match: "ends-with",
            caseSensitive: false,
        });
        assert.deepInclude(read({ kind: "text", reads: "data.lead", mode: "exact", text: "true" }), {
            type: "yes-no",
            match: "yes",
        });
        assert.deepInclude(read({ kind: "text", reads: "data.lead", mode: "exact", text: "maybe" }), {
            type: "text",
        });
        assert.strictEqual(read({ kind: "text", reads: "data.note", mode: "regex", text: "a+" }).type, "fixed");
        assert.strictEqual(read({ kind: "text", reads: "data.none", mode: "exact", text: "a" }).type, "fixed");
    });

    it("reads a source leaf only when the side offers the data source field", () => {
        assert.deepInclude(read({ kind: "source", sources: ["s1"] }), { type: "source", sources: ["s1"] });
        assert.strictEqual(conditionOf({ kind: "source", sources: ["s1"] }, [AGE], 0).type, "fixed");
        assert.strictEqual(read({ kind: "isolated" }).type, "fixed");
    });
});

describe("selectors written back unchanged", () => {
    const leaves: RuleTree[] = [
        has("data.team"),
        { kind: "not", of: has("data.age") },
        { kind: "threshold", path: "data.age", top: 2, ties: "all", from: "low" },
        { kind: "threshold", path: "data.age", percentile: 25 },
        { kind: "range", attribute: "data.born", min: 1, max: 9, as: "time" },
        {
            kind: "any",
            of: [
                { kind: "categories", attribute: "data.team", values: ["red"] },
                { kind: "not", of: has("data.team") },
            ],
        },
        { kind: "text", reads: "data.note", mode: "substring", text: "x", caseSensitive: true },
        { kind: "source", sources: ["s1", "s2"] },
    ];
    for (const leaf of leaves) {
        it(`keeps ${JSON.stringify(leaf)}`, () => {
            assert.deepEqual(roundTrip(leaf), { match: "rule", where: leaf });
        });
    }

    it("reads everything as no conditions and writes it back", () => {
        assert.deepEqual(nodeConditions({ match: "everything" }, FIELDS), []);
        assert.deepEqual(conditionSelector([]), { match: "everything" });
    });

    it("reads picked node ids and a saved selection as member leaves", () => {
        assert.deepEqual(conditionSelector(nodeConditions({ match: "ids", nodes: ["a"] }, FIELDS)), {
            match: "rule",
            where: { kind: "member", of: { nodes: ["a"] } },
        });
        assert.deepEqual(nodeConditions({ match: "ids" }, FIELDS).length, 1);
        const member = nodeConditions({ match: "member", of: "selection" }, FIELDS);
        assert.deepEqual(conditionSelector(member), {
            match: "rule",
            where: { kind: "member", of: "selection" },
        });
    });

    it("writes a lone state back as a state selector", () => {
        const conditions = nodeConditions({ match: "state", state: "hovered" }, FIELDS);
        assert.deepEqual(conditionSelector(conditions), { match: "state", state: "hovered" });
    });
});

describe("edgeConditions", () => {
    it("reads node leaves of every kind as one clipped ends condition, leaving edge leaves", () => {
        const nodeLeaves: RuleTree[] = [
            { kind: "text", reads: "id", mode: "exact", text: "a" },
            { kind: "threshold", path: "data.age", top: 1, ties: "all" },
            { kind: "categories", attribute: "data.team", values: ["red"] },
            { kind: "not", of: { kind: "isolated" } },
            { kind: "any", of: [{ kind: "isolated" }] },
        ];
        const edgeLeaf: RuleTree = { kind: "threshold", path: "data.weight", top: 1, ties: "all" };
        const selector: Selector = { match: "rule", where: { kind: "all", of: [...nodeLeaves, edgeLeaf] } };
        const conditions = edgeConditions(selector, [WEIGHT]);
        assert.deepEqual(
            conditions.map((each) => each.type),
            ["ends", "number"],
        );
        assert.isTrue(conditions[0].type === "ends" && conditions[0].reading === "clipped");
        assert.deepEqual(conditionSelector(conditions, nodeLeaves), selector);
    });

    it("keeps an edge-only rule with no ends condition, and an empty any as the edge's own", () => {
        const own: RuleTree = { kind: "any", of: [] };
        const conditions = edgeConditions({ match: "rule", where: own }, [WEIGHT]);
        assert.deepEqual(
            conditions.map((each) => each.type),
            ["fixed"],
        );
        assert.deepEqual(conditionSelector(conditions), { match: "rule", where: own });
    });

    it("holds edges picked by id whole", () => {
        const selector: Selector = { match: "ids", edges: ["a->b"] };
        assert.deepEqual(conditionSelector(edgeConditions(selector, [WEIGHT])), selector);
    });
});

describe("conditionFields on a session", () => {
    it("offers the data source with two loads, a time column as a date, and marks whole numbers", async () => {
        const session = createGraphSession();
        const rows = (ids: string[]): string =>
            JSON.stringify({
                nodes: ids.map((id, at) => ({ id, rank: at + 1, score: at + 0.5, born: `2020-0${String(at + 1)}-01` })),
                edges: [{ src: ids[0], dst: ids[1] }],
            });
        await session.data.import({ type: "json", config: { data: rows(["a", "b"]) }, name: "one.json" });
        await session.data.import(
            { type: "json", config: { data: rows(["c", "d"]) }, name: "two.json" },
            { mode: "merge" },
        );
        const born = session.data.attributes().find((each) => each.kind === "node" && each.name === "born");
        assert.isDefined(born);
        await session.data.declare(born, { measurement: "time" });

        const fields = conditionFields(session, "node");
        const byPath = new Map(fields.map((field) => [field.path, field]));
        assert.strictEqual(byPath.get("@source")?.kind, "source");
        assert.strictEqual(byPath.get("@source")?.from, "source");
        assert.strictEqual(byPath.get("data.born")?.kind, "date");
        assert.strictEqual(byPath.get("data.rank")?.integer, true);
        assert.isUndefined(byPath.get("data.score")?.integer);
        assert.strictEqual(conditionFields(session, "edge").at(-1)?.path, "@source");
        session.dispose();
    });
});
