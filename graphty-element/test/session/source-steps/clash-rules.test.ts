/**
 * @file Clash rules per column through the session (design 3.10), ported from the reference
 * model's "rules per column" and "reader picks" cases: a numeric rule on a column it cannot order
 * is refused with E_CLASH_RULE_TYPE, and each step's rows report W_VALUES_DIFFER per column.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { refused } from "./scenario";

/**
 * crm.csv imported and erp.csv staged, both people keyed by id, so they meet in the space person.
 * @param crm - crm.csv's rows.
 * @param erp - erp.csv's rows.
 * @returns The session and erp.csv's source.
 */
async function people(crm: string, erp: string): Promise<{ session: GraphSession; b: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import({ type: "csv", config: { data: crm }, name: "crm.csv" }, { key: "id", type: "person" });
    const b = await session.data.stage(
        { type: "csv", config: { data: erp }, name: "erp.csv" },
        { key: "id", type: "person" },
    );
    return { session, b };
}

const CRM = "id,name,amt\np1,Ann,10\np2,Bo,20";
const ERP = "id,name,amt\np1,Anne,30\np2,Bo,40";

describe("source-steps: clash rules per column (3.10)", () => {
    it("refuses a numeric rule on a text column with E_CLASH_RULE_TYPE, and leaves the steps as they were", async () => {
        const { session, b } = await people(CRM, ERP);
        const steps = session.data.steps().length;
        const error = await refused(
            () =>
                session.data.merge({
                    from: { source: b, field: "id" },
                    into: { space: "person" },
                    clash: { name: "mean" },
                }),
            "E_CLASH_RULE_TYPE",
        );
        assert.strictEqual(error.column, "name");
        assert.strictEqual(error.rule, "mean");
        assert.isNumber(error.step);
        assert.strictEqual(session.data.steps().length, steps, "the refused merge adds no step");
        await refused(
            () => session.data.merge({ from: { source: b, field: "id" }, into: { space: "person" }, clash: "max" }),
            "E_CLASH_RULE_TYPE",
        );
        session.dispose();
    });

    it("takes a numeric rule on a number column", async () => {
        const { session, b } = await people(CRM, ERP);
        await session.data.merge({
            from: { source: b, field: "id" },
            into: { space: "person" },
            clash: { amt: "max" },
        });
        assert.strictEqual(String(session.data.values({ space: "person", key: "p1" }, "amt")?.shown), "30");
        session.dispose();
    });

    it("orders dates under max, but refuses mean on them", async () => {
        const crm = "id,seen\np1,2026-03-01";
        const erp = "id,seen\np1,2026-05-20";
        const refusedMean = await people(crm, erp);
        await refused(
            () =>
                refusedMean.session.data.merge({
                    from: { source: refusedMean.b, field: "id" },
                    into: { space: "person" },
                    clash: { seen: "mean" },
                }),
            "E_CLASH_RULE_TYPE",
        );
        refusedMean.session.dispose();
        const { session, b } = await people(crm, erp);
        await session.data.merge({
            from: { source: b, field: "id" },
            into: { space: "person" },
            clash: { seen: "max" },
        });
        assert.strictEqual(session.data.values({ space: "person", key: "p1" }, "seen")?.shown, "2026-05-20");
        session.dispose();
    });

    it("reports W_VALUES_DIFFER per step and column on the step rows, counting reader decisions", async () => {
        const { session, b } = await people(CRM, ERP);
        await session.data.merge({ from: { source: b, field: "id" }, into: { space: "person" } });
        const row = session.data.steps().find((each) => each.valuesDiffer.length > 0);
        assert.isDefined(row);
        const step = row?.index ?? -1;
        const name = row?.valuesDiffer.find((each) => each.params.column === "name");
        assert.deepStrictEqual(name, {
            code: "W_VALUES_DIFFER",
            params: { step, column: "name", count: 1, decided: 0, rule: "keep" },
        });
        assert.strictEqual(row?.valuesDiffer.find((each) => each.params.column === "amt")?.params.count, 2);
        for (const key of ["p1", "p2"]) {
            await session.data.pick({ space: "person", key }, "amt", b);
        }
        const amt = session.data.steps()[step]?.valuesDiffer.find((each) => each.params.column === "amt");
        assert.strictEqual(amt?.params.decided, 2);
        session.dispose();
    });

    it("the experiments guide's example: stage, merge with a rule, then pick every open conflict", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: CRM }, name: "crm.csv" },
            { key: "id", type: "person" },
        );
        const erp = await session.data.stage({ type: "csv", config: { data: ERP }, name: "erp.csv" }, { key: "id" });
        await session.data.merge({
            from: { source: erp, field: "id" },
            into: { space: "person" },
            clash: { amt: "max" },
        });
        const open = session.data.conflicts({ only: "open" });
        assert.isAbove(open.length, 0);
        for (const conflict of open) {
            await session.data.pick(conflict.ref, conflict.column, erp);
        }
        assert.lengthOf(session.data.conflicts({ only: "open" }), 0);
        assert.strictEqual(session.data.values({ space: "person", key: "p1" }, "name")?.shown, "Anne");
        session.dispose();
    });
});
