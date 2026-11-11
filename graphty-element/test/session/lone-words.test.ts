/**
 * @file A lone `true`, `false` or `null` in a rule is that value, in the one selector parser style
 * layers, Find, filters and the assistant all read through. A word inside a path stays a name.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, rulePath } from "../../session";
import { selectorRule } from "../../src/session/styles";

/** 24 volunteers, nine of them untrained, and 63 ties. */
const VOLUNTEERS = readFileSync(
    new URL("../../../design/ui/studio/tool/files/volunteers.graphml", import.meta.url),
    "utf8",
);

/**
 * A session holding the volunteers.
 * @returns the session
 */
async function volunteers(): Promise<GraphSession> {
    const session = createGraphSession();
    const draft = await session.data.prepare({
        config: { data: VOLUNTEERS, format: "graphml" },
        name: "volunteers.graphml",
    });
    await draft.load();
    return session;
}

/**
 * Three people whose columns are named like the value words.
 * @returns the session
 */
async function oddColumns(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", false: 1, flag: false },
        { id: "b", false: 2, flag: true },
        { id: "c", false: 2 },
    ]);
    return session;
}

/**
 * The node ids a rule selects.
 * @param session - the session
 * @param where - the rule
 * @returns the ids
 */
function nodes(session: GraphSession, where: string): string[] {
    return session.data.nodePage({ where, limit: 100 }).records.map((record) => String(record.id));
}

describe("a lone value word", () => {
    it("selects the nine untrained volunteers and no edge", async () => {
        const session = await volunteers();
        for (const where of ["data.trained == false", "false == data.trained", "(data.trained == false)"]) {
            assert.strictEqual(session.data.nodePage({ where, limit: 0 }).total, 9, where);
            assert.strictEqual(session.data.edgePage({ where, limit: 0 }).total, 0, where);
        }
    });

    it("reads as Find's rule does, by the column's bare name", async () => {
        const session = await volunteers();
        assert.deepEqual(session.selection.checkRule("trained == false").unknown, []);
        assert.deepEqual(await session.selection.count({ text: "=trained == false" }), { nodes: 9, edges: 0 });
    });

    it("reads true and null as those values", async () => {
        const session = await oddColumns();
        assert.deepEqual(nodes(session, "data.flag == true"), ["b"]);
        assert.deepEqual(nodes(session, "data.flag == null"), ["c"]);
        assert.deepEqual(nodes(session, "data.flag != null"), ["a", "b"]);
    });

    it("draws the same rule leaf as the backticked value", () => {
        const rule = (where: string): unknown => selectorRule({ match: "expression", where })?.where;
        assert.deepEqual(rule("data.flag == false"), rule("data.flag == `false`"));
        assert.isDefined(rule("data.flag == false"));
    });

    it("refuses a rule of nothing but a value word, which reads no attribute", async () => {
        const session = await volunteers();
        assert.throws(() => session.data.nodePage({ where: "false" }), /reads no attribute/);
    });
});

describe("a word inside a path", () => {
    it("still names a column", async () => {
        const session = await oddColumns();
        assert.deepEqual(nodes(session, "data.false == `1`"), ["a"]);
        assert.deepEqual(nodes(session, 'data."false" == `1`'), ["a"]);
    });

    it("is written back so the rule reads the column, never the value", async () => {
        const session = await oddColumns();
        assert.strictEqual(rulePath("data.false"), "data.false");
        assert.deepEqual(nodes(session, `${rulePath("data.false")} == \`2\``), ["b", "c"]);
    });
});
