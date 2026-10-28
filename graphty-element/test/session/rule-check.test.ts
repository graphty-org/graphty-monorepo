/**
 * @file A find rule over a name nothing answers says so before it is applied, with what it may
 * have meant (`selection.checkRule`), and a typed comparison reads as rule leaves an editor draws
 * (`selectorRule(selector, { comparisons: true })`).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError } from "../../session";
import { selectorRule } from "../../src/session/styles";
import { fixtureSession } from "./history/fixture-session";

/**
 * Three donors with a donations column.
 * @returns The session, loaded.
 */
async function donors(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", donations: 500 },
        { id: "b", donations: 12000 },
        { id: "c", donations: 10000 },
    ]);
    return session;
}

describe("selection.checkRule", () => {
    it("reports nothing unknown for a rule over a file column, by its bare name or its path", async () => {
        const session = await donors();

        assert.deepEqual(session.selection.checkRule("donations >= `10000`"), { unknown: [] });
        assert.deepEqual(session.selection.checkRule("data.donations >= `10000`"), { unknown: [] });
        session.dispose();
    });

    it("names a column the graph does not have, with no suggestion when nothing is called that", async () => {
        const session = await donors();

        const check = session.selection.checkRule("nosuch > `1`");

        assert.deepEqual(check, { unknown: [{ path: "nosuch", candidates: [] }] });
        session.dispose();
    });

    it("offers a run's field by its name, and the rewritten rule selects what the field says", async () => {
        const session = await fixtureSession();
        await session.runs.start("degree", {}, { as: "deg", style: false });

        const check = session.selection.checkRule("value > `2` && id != 'x'");

        assert.deepEqual(check.unknown, [{ path: "value", candidates: ["results.deg.value"] }]);
        assert.strictEqual(check.suggestion, "results.deg.value > `2` && id != 'x'");
        assert.deepEqual(session.selection.checkRule(check.suggestion ?? ""), { unknown: [] });
        const alone = session.selection.checkRule("value > `0`").suggestion ?? "";
        const { nodes } = await session.selection.count({ text: `=${alone}` });
        const { nodes: plain } = await session.selection.count({ text: "=value > `0`" });
        assert.isAbove(nodes, 0, "the rewritten rule matches the nodes with an edge");
        assert.strictEqual(plain, 0, "the rule as typed matched nothing");
        session.dispose();
    });

    it("refuses a rule apply refuses", async () => {
        const session = await donors();

        let code: unknown = "no error";
        try {
            session.selection.checkRule("donations >= 10");
        } catch (error) {
            code = isGraphtyError(error) ? error.code : error;
        }

        assert.strictEqual(code, "E_BAD_SELECTOR");
        session.dispose();
    });
});

describe("selectorRule with comparisons", () => {
    const rule = (where: string): unknown => selectorRule({ match: "expression", where }, { comparisons: true })?.where;

    it("reads >=, <= and > against a number over a bare column name or a path", () => {
        assert.deepEqual(rule("donations >= `10000`"), { kind: "range", attribute: "data.donations", min: 10000 });
        assert.deepEqual(rule("data.hours <= `20`"), { kind: "range", attribute: "data.hours", max: 20 });
        assert.deepEqual(rule("`5` <= shared_chapters"), { kind: "range", attribute: "data.shared_chapters", min: 5 });
        assert.deepEqual(rule("results.deg.value > `16`"), { kind: "threshold", path: "results.deg.value", above: 16 });
        assert.deepEqual(rule("hours >= `1` && hours <= `5`"), {
            kind: "all",
            of: [
                { kind: "range", attribute: "data.hours", min: 1 },
                { kind: "range", attribute: "data.hours", max: 5 },
            ],
        });
    });

    it("leaves what has no exact leaf as no rule: <, a text order, the node id, a lone name", () => {
        assert.isUndefined(rule("hours < `5`"));
        assert.isUndefined(rule("name >= 'M'"));
        assert.isUndefined(rule("id > `57`"));
        assert.isUndefined(rule("hours"));
    });

    it("reads as before without the option", () => {
        assert.isUndefined(selectorRule({ match: "expression", where: "data.hours >= `20`" }));
        assert.isUndefined(selectorRule({ match: "expression", where: "hours == `20`" }));
        assert.deepEqual(selectorRule({ match: "expression", where: "data.hours == `20`" })?.where, {
            kind: "range",
            attribute: "data.hours",
            min: 20,
            max: 20,
        });
    });
});
