/**
 * @file `session.data.groupTable` and `exportGraph(format, { groupTable })`: one row per group with
 * its size and the summaries the caller asks for, written as CSV or JSON rows.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { exportSession } from "../../src/data/export";

/**
 * Five nodes: group A holds three (ages 10, 20, 60), group B two (age 5 and one with none).
 * @returns the session
 */
async function fixture(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a1", team: "A", age: 10 },
        { id: "a2", team: "A", age: 20 },
        { id: "a3", team: "A", age: 60 },
        { id: "b1", team: "B", age: 5 },
        { id: "b2", team: "B" },
    ]);
    return session;
}

describe("group table", () => {
    it("writes only the group and its size by default, largest group first", async () => {
        const session = await fixture();
        const table = session.data.groupTable("data.team");

        assert.deepStrictEqual(table.columns, ["group", "size"]);
        assert.deepStrictEqual(table.rows, [
            { group: "A", size: 3 },
            { group: "B", size: 2 },
        ]);
    });

    it("writes the summaries the caller asks for, null where a group measured nothing", async () => {
        const session = await fixture();
        await session.data.addNodes([{ id: "c1", team: "C" }]);
        const table = session.data.groupTable("data.team", {
            summaries: { "data.age": ["count", "sum", "min", "max", "mean", "median"] },
        });

        assert.deepStrictEqual(table.columns, [
            "group",
            "size",
            "data.age.count",
            "data.age.sum",
            "data.age.min",
            "data.age.max",
            "data.age.mean",
            "data.age.median",
        ]);
        assert.deepStrictEqual(table.rows[0], {
            group: "A",
            size: 3,
            "data.age.count": 3,
            "data.age.sum": 90,
            "data.age.min": 10,
            "data.age.max": 60,
            "data.age.mean": 30,
            "data.age.median": 20,
        });
        assert.strictEqual(table.rows[1]["data.age.count"], 1);
        assert.strictEqual(table.rows[1]["data.age.mean"], 5);
        assert.strictEqual(table.rows[2]["data.age.count"], 0);
        assert.strictEqual(table.rows[2]["data.age.mean"], null);
    });

    it("adds the label column when a group is named", async () => {
        const session = await fixture();
        await session.data.setValueLabel("data.team", "B", "Blues");
        const table = session.data.groupTable("data.team");

        assert.deepStrictEqual(table.columns, ["group", "label", "size"]);
        assert.deepStrictEqual(table.rows, [
            { group: "A", label: null, size: 3 },
            { group: "B", label: "Blues", size: 2 },
        ]);
    });

    it("refuses an unknown summary", async () => {
        const session = await fixture();
        assert.throws(
            () => session.data.groupTable("data.team", { summaries: { "data.age": ["mode" as "mean"] } }),
            /summaries/,
        );
    });

    it("exports the table as CSV, guarding formula cells, and as JSON rows", async () => {
        const session = await fixture();
        await session.data.addNodes([{ id: "x1", team: "=SUM(A1)", age: 1 }]);
        const groupTable = { groupBy: "data.team", summaries: { "data.age": ["mean" as const] } };

        const csv = exportSession(session, "csv", { groupTable });
        assert.strictEqual(
            await csv.text(),
            ["group,size,data.age.mean", "A,3,30", "B,2,5", "'=SUM(A1),1,1"].join("\n"),
        );
        assert.deepStrictEqual(
            csv.losses.map((loss) => loss.code),
            ["W_GRAPHTY_CSV_NEUTRALIZED"],
        );

        const json = exportSession(session, "json", { groupTable });
        assert.deepStrictEqual(JSON.parse(await json.text()), session.data.groupTable("data.team", groupTable).rows);
    });

    it("refuses another format, or a scope beside it", async () => {
        const session = await fixture();
        assert.throws(() => exportSession(session, "graphml", { groupTable: { groupBy: "data.team" } }), /groupTable/);
        assert.throws(
            () => exportSession(session, "csv", { groupTable: { groupBy: "data.team" }, scope: "selection" }),
            /groupTable/,
        );
    });
});
