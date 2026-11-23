/**
 * @file session.data corners that only the source-steps experiment opens and that the
 * test/session/source-steps/ files leave out: a node read by key in an id space, the refusals of
 * settleEdit, resolveStep, replaceSource and reloadSource, renaming an older source, and a
 * role other than weight or time cleared from the steps. Every case drives the public session API.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { phase2, TRANSACTIONS } from "./source-steps/scenario";

/**
 * A session with the source-steps experiment on.
 * @returns The session.
 */
function stepsSession(): GraphSession {
    return createGraphSession({ features: ["source-steps"] });
}

/**
 * A CSV input.
 * @param data - The CSV text.
 * @param name - Its name.
 * @returns What `import`, `stage` and `replaceSource` take.
 */
function csv(data: string, name = "people.csv"): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/**
 * The refusal a promise settles with, failing the test when it resolves.
 * @param run - The call.
 * @returns The error's code and details.
 */
async function refusal(run: Promise<unknown>): Promise<{ code?: string; details?: Record<string, unknown> }> {
    return run.then(
        () => assert.fail("expected a refusal"),
        (error: unknown) => error as { code?: string; details?: Record<string, unknown> },
    );
}

/**
 * A session holding one person file, typed `person`.
 * @returns The session and the source's key.
 */
async function people(): Promise<{ session: GraphSession; key: string }> {
    const session = stepsSession();
    await session.data.import(csv("id,name\np1,Ann\np2,Bo\n"), { type: "person" });
    const [{ key }] = session.data.sources();
    return { session, key };
}

describe("session.data under source-steps: a node by key in an id space", () => {
    it("finds the node a space holds, and nothing for a key or a space that holds none", async () => {
        const { session } = await people();
        assert.strictEqual(session.data.node("p1", { space: "person" })?.name, "Ann");
        assert.isUndefined(session.data.node("p9", { space: "person" }), "no node of the space holds p9");
        assert.isUndefined(session.data.node("p1", { space: "nowhere" }), "no such space");
        session.dispose();
    });
});

describe("session.data under source-steps: refusals", () => {
    it("settleEdit refuses an edit id no edit has", async () => {
        const { session } = await people();
        const error = await refusal(session.data.settleEdit("no-such-edit", "keep"));
        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details?.reason, "unknown-edit");
        session.dispose();
    });

    it("resolveStep refuses a step that misses nothing, and a place no step has", async () => {
        const { session } = await people();
        for (const index of [0, 99]) {
            const error = await refusal(session.data.resolveStep(index, { column: "name" }));
            assert.strictEqual(error.code, "E_BAD_COMMAND");
            assert.strictEqual(error.details?.reason, "not-held");
        }
        session.dispose();
    });

    it("resolveStep refuses None for a missing column that is not a role", async () => {
        const { session, t } = await phase2();
        const report = await session.data.replaceSource(
            t,
            csv(TRANSACTIONS.replace("merchant_name", "shop_name"), "transactions.csv"),
        );
        const missing = report.issues?.find((each) => each.code === "E_COLUMN_MISSING");
        assert.isDefined(missing);
        const index = missing?.code === "E_COLUMN_MISSING" ? (missing.params.step ?? -1) : -1;
        const error = await refusal(session.data.resolveStep(index, { none: true }));
        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details?.reason, "not-a-role");
        assert.isTrue(session.data.steps()[index].held, "the step stays held");
        session.dispose();
    });

    it("replaceSource refuses a network source", async () => {
        const { session, key } = await people();
        const network = await refusal(session.data.replaceSource(key, { source: "anything", config: {} }));
        assert.strictEqual(network.code, "E_UNSUPPORTED");
        assert.strictEqual(network.details?.reason, "later");
        assert.strictEqual(session.data.node("p1", { space: "person" })?.name, "Ann", "the graph is unchanged");
        session.dispose();
    });

    it("reloadSource refuses changed choices for a source it could read again", async () => {
        const { session, key } = await people();
        assert.isTrue(session.data.sources()[0].reloadable);
        const error = await refusal(session.data.reloadSource(key, { type: "member" }));
        assert.strictEqual(error.code, "E_UNSUPPORTED");
        assert.strictEqual(error.details?.reason, "later");
        session.dispose();
    });
});

describe("session.data under source-steps: names and roles", () => {
    it("renaming the older of two sources names it and leaves the newer one's name", async () => {
        const session = stepsSession();
        await session.data.import(csv("id\nn1\n", "one.csv"));
        await session.data.import(csv("id\nn2\n", "two.csv"), { mode: "merge" });
        const [first, second] = session.data.sources();
        await session.data.renameSource("First", first.key);
        assert.deepStrictEqual(
            session.data.sources().map((each) => each.name),
            ["First", second.name],
        );
        session.dispose();
    });

    it("a role other than weight or time takes the column's time role away", async () => {
        const session = stepsSession();
        await session.data.import(csv("id,t\nn1,2020-01-01\nn2,2021-01-01\n"));
        await session.data.setRole({ kind: "node", name: "t" }, "time");
        assert.include(JSON.stringify(session.data.steps()), '"t"', "the steps name t as the time");
        await session.data.setRole({ kind: "node", name: "t" }, "label");
        assert.notInclude(JSON.stringify(session.data.steps()), '"t"', "the time role is gone");
        session.dispose();
    });

    it("staged() is empty while the experiment is off", async () => {
        const session = createGraphSession();
        await session.data.import(csv("id\nn1\n"));
        assert.lengthOf(session.data.staged(), 0);
        assert.lengthOf(session.data.sources({ staged: true }), 1);
        session.dispose();
    });
});
