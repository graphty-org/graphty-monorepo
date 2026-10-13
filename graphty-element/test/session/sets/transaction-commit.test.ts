/**
 * @file A set door that resolves its source before it commits (createFrom, combine, createPath)
 * commits into the transaction it was called inside: one step with the transaction's other
 * writes, taken back with them when the transaction fails. The routing that puts a dispatch into a
 * transaction lasts only for the synchronous part of a call, so a commit after the resolve's await
 * used to land outside it, as a step of its own the transaction could not roll back.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";

/**
 * A session over a path a-b-c-d with two rule sets, "ab" and "bc".
 * @returns The session.
 */
async function sessionWithSets(): Promise<GraphSession> {
    const session = createGraphSession({ config: { data: { directed: false } } });
    await session.data.addNodes(["a", "b", "c", "d"].map((id, index) => ({ id, rank: index })));
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "d" },
    ]);
    session.sets.create({ kind: "rule", where: "data.rank < `2`", reading: "induced" }, { name: "ab" });
    session.sets.create(
        { kind: "rule", where: "data.rank > `0` && data.rank < `3`", reading: "induced" },
        { name: "bc" },
    );
    return session;
}

/**
 * A set's id by name.
 * @param session - The session.
 * @param name - The name.
 * @returns The id.
 */
function idOf(session: GraphSession, name: string): string {
    const set = session.sets.list().find((each) => each.name === name);
    assert.isDefined(set, `no set "${name}"`);
    return set.id;
}

describe("a set door that resolves first, inside a transaction", () => {
    it("commits a combination into the transaction's one step", async () => {
        const session = await sessionWithSets();
        const before = session.history.position;
        await session.transaction("combine", async (tx) => {
            tx.sets.create({ kind: "rule", where: "data.rank == `3`", reading: "induced" }, { name: "d" });
            await tx.sets.combine("intersection", [{ set: idOf(session, "ab") }, { set: idOf(session, "bc") }], {
                name: "b",
            });
        });

        assert.strictEqual(session.history.position, before + 1, "the combination recorded a step of its own");
        assert.deepEqual(session.history.steps.at(-1)?.ops, ["set.create", "set.create"]);
    });

    it("commits createFrom into the transaction, and a failure takes it back", async () => {
        const session = await sessionWithSets();
        const before = session.history.position;
        let threw = false;
        try {
            await session.transaction("from", async (tx) => {
                await tx.sets.createFrom({ where: "data.rank > `1`" }, { name: "cd" });
                throw new Error("the batch failed");
            });
        } catch {
            threw = true;
        }

        assert.isTrue(threw);
        assert.strictEqual(session.history.position, before, "a step survived the failed transaction");
        assert.isUndefined(
            session.sets.list().find((set) => set.name === "cd"),
            "the set survived the failed transaction",
        );
    });

    it("still records its own step when called outside a transaction", async () => {
        const session = await sessionWithSets();
        const before = session.history.position;
        await session.sets.combine("union", [{ set: idOf(session, "ab") }, { set: idOf(session, "bc") }], {
            name: "abc",
        });
        assert.strictEqual(session.history.position, before + 1);
    });
});
