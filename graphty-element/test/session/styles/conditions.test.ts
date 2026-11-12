/**
 * @file The condition model: a selector read as per-field conditions and written back, so a filter
 * or a style-target editor never parses rules itself.
 */

import { assert, describe, it } from "vitest";

import type { RuleTree } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import {
    type Condition,
    conditionFields,
    conditionLeaf,
    conditionSelector,
    edgeConditions,
    newCondition,
    nodeConditionLeaves,
    nodeConditions,
} from "../../../src/session/styles";

/**
 * Three nodes with a number, a category and a yes-or-no column, and two weighted edges.
 * @returns The session.
 */
async function people(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", age: 30, team: "red", lead: true },
        { id: "b", age: 40, team: "blue", lead: false },
        { id: "c", age: 50, team: "red", lead: false },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b", weight: 1 },
        { source: "b", target: "c", weight: 2 },
    ]);
    return session;
}

describe("conditionFields", () => {
    it("lists the node id as a name field and each column by its kind", async () => {
        const session = await people();
        const fields = conditionFields(session, "node");
        const kinds = Object.fromEntries(fields.map((field) => [field.path, field.kind]));
        assert.strictEqual(kinds.id, "name");
        assert.strictEqual(kinds["data.age"], "number");
        assert.strictEqual(kinds["data.team"], "category");
        assert.strictEqual(kinds["data.lead"], "yes-no");
        const age = fields.find((field) => field.path === "data.age");
        assert.deepEqual(age?.range, { min: 30, max: 50 });
        assert.strictEqual(age?.from, "data");
        assert.notInclude(
            fields.map((field) => field.path),
            "@source",
            "one load offers no source field",
        );
    });

    it("lists edge fields apart from node fields", async () => {
        const session = await people();
        const paths = conditionFields(session, "edge").map((field) => field.path);
        assert.include(paths, "data.weight");
        assert.notInclude(paths, "data.age");
    });
});

describe("reading and writing conditions", () => {
    it("reads a rule's leaves as one condition per field and writes the same selector back", async () => {
        const session = await people();
        const fields = conditionFields(session, "node");
        const where: RuleTree = {
            kind: "all",
            of: [
                { kind: "range", attribute: "data.age", min: 35, max: 50 },
                { kind: "categories", attribute: "data.team", values: ["red"] },
                { kind: "text", reads: "data.lead", mode: "exact", text: "false", caseSensitive: true },
            ],
        };
        const conditions = nodeConditions({ match: "rule", where }, fields);
        assert.deepEqual(
            conditions.map((each) => [each.type, each.key]),
            [
                ["number", "node:data.age"],
                ["category", "node:data.team"],
                ["yes-no", "node:data.lead"],
            ],
        );
        assert.deepEqual(conditionSelector(conditions), { match: "rule", where });
    });

    it("keeps a leaf no condition edits, and a second leaf on one field, as fixed conditions", async () => {
        const session = await people();
        const fields = conditionFields(session, "node");
        const state: RuleTree = { kind: "state", state: "hovered" };
        const age = (min: number): RuleTree => ({ kind: "range", attribute: "data.age", min });
        const where: RuleTree = { kind: "all", of: [age(30), age(40), state] };
        const conditions = nodeConditions({ match: "rule", where }, fields);
        assert.deepEqual(
            conditions.map((each) => each.type),
            ["number", "fixed", "fixed"],
        );
        const repeat = conditions[1];
        assert.isTrue(repeat.type === "fixed" && repeat.repeat === true);
        assert.deepEqual(conditionSelector(conditions), { match: "rule", where });
    });

    it("holds edges picked by id whole, since they have no leaf form", async () => {
        const session = await people();
        const selector = { match: "ids", edges: ["a->b"] } as const;
        const conditions = nodeConditions(selector, conditionFields(session, "node"));
        assert.strictEqual(conditions.length, 1);
        assert.isNull(nodeConditionLeaves(selector));
        assert.deepEqual(conditionSelector(conditions), selector);
    });

    it("reads an edge rule's node leaves as an ends condition and writes them back from the node side", async () => {
        const session = await people();
        const nodeLeaf: RuleTree = { kind: "range", attribute: "data.age", min: 40 };
        const edgeLeaf: RuleTree = { kind: "range", attribute: "data.weight", max: 1 };
        const selector = {
            match: "rule",
            where: { kind: "all", of: [nodeLeaf, edgeLeaf] },
            edges: "incident",
        } as const;
        const conditions = edgeConditions(selector, conditionFields(session, "edge"));
        assert.deepEqual(
            conditions.map((each) => each.type),
            ["ends", "number"],
        );
        assert.isTrue(conditions[0].type === "ends" && conditions[0].reading === "incident");
        assert.deepEqual(conditionSelector(conditions, [nodeLeaf]), selector);
    });

    it("makes no leaf for an unfinished condition, and every element for none", async () => {
        const session = await people();
        const team = conditionFields(session, "node").find((field) => field.path === "data.team");
        assert.isDefined(team);
        const fresh: Condition = newCondition(team);
        assert.isNull(conditionLeaf(fresh));
        assert.deepEqual(conditionSelector([fresh]), { match: "everything" });
    });
});
