/**
 * @file A malformed argument to a session data door is refused with a `GraphtyError` coded
 * `E_BAD_COMMAND`, never a plain TypeError from deep inside the write, and a well-formed one still
 * works (issue #5504). The element-level twins are in `test/browser/data-door-arguments.test.ts`.
 */

import { assert, describe, it } from "vitest";

import { GraphtyError } from "../../src/errors/GraphtyError";
import { createGraphSession, type GraphSession } from "../../src/session";

/**
 * A session holding a, b and the edge "0" between them.
 * @returns The session.
 */
async function seeded(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }]);
    await session.data.addEdges([{ source: "a", target: "b" }]);
    return session;
}

/**
 * Assert a call is refused with `E_BAD_COMMAND`, and that the graph is unchanged.
 * @param session - The session.
 * @param call - The malformed call.
 */
async function refused(session: GraphSession, call: () => Promise<unknown>): Promise<void> {
    const steps = session.history.steps.length;
    const error: unknown = await call().then(
        () => null,
        (thrown: unknown) => thrown,
    );
    assert.instanceOf(error, GraphtyError);
    assert.strictEqual(error.code, "E_BAD_COMMAND");
    assert.strictEqual(session.history.steps.length, steps, "nothing was recorded");
    assert.strictEqual(session.status.counts.nodes, 2);
    assert.strictEqual(session.status.counts.edges, 1);
}

/**
 * Hand a door the wrong shape on purpose.
 * @param value - The malformed value.
 * @returns The value, typed to fit any argument.
 */
const BAD = (value: unknown): never => value as never;

describe("a malformed argument to a session data door", () => {
    it("updateNodes: a row without values, a null row, or no array", async () => {
        const session = await seeded();
        await refused(session, () => session.data.updateNodes([BAD({ id: "a", group: 1 })]));
        await refused(session, () => session.data.updateNodes([BAD(null)]));
        await refused(session, () => session.data.updateNodes(BAD({})));
        await refused(session, () => session.data.updateNodes([BAD({ values: { x: 1 } })]));
        await session.data.updateNodes([{ id: "a", values: { group: 1 } }]);
        assert.strictEqual(session.data.node("a")?.group, 1);
        session.dispose();
    });

    it("updateEdges: a row without values", async () => {
        const session = await seeded();
        await refused(session, () => session.data.updateEdges([BAD({ id: "0", kind: "x" })]));
        await session.data.updateEdges([{ id: "0", values: { kind: "x" } }]);
        assert.strictEqual(session.data.edge("0")?.kind, "x");
        session.dispose();
    });

    it("addNodes: a record that is not an object, or no array", async () => {
        const session = await seeded();
        await refused(session, () => session.data.addNodes([BAD(null)]));
        await refused(session, () => session.data.addNodes([BAD(5)]));
        await refused(session, () => session.data.addNodes(BAD({ id: "c" })));
        await session.data.addNodes([{ id: "c" }]);
        assert.strictEqual(session.status.counts.nodes, 3);
        session.dispose();
    });

    it("addEdges: a record that is not an object", async () => {
        const session = await seeded();
        await refused(session, () => session.data.addEdges([BAD(null)]));
        await session.data.addEdges([{ source: "b", target: "a" }]);
        assert.strictEqual(session.status.counts.edges, 2);
        session.dispose();
    });

    it("removeNodes and removeEdges: an id that is not a string or a number, or no array", async () => {
        const session = await seeded();
        await refused(session, () => session.data.removeNodes([BAD({})]));
        await refused(session, () => session.data.removeNodes(BAD("a")));
        await refused(session, () => session.data.removeEdges([BAD({})]));
        await refused(session, () => session.data.removeEdges(BAD(null)));
        await session.data.removeEdges(["0"]);
        assert.strictEqual(session.status.counts.edges, 0);
        await session.data.removeNodes(["b"]);
        assert.strictEqual(session.status.counts.nodes, 1);
        session.dispose();
    });
});
