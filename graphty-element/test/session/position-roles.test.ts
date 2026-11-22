/**
 * The x, y and z column roles (issue #9281): `data.setRole` gives a node column one, the element
 * places every node at the position its x and y (and z) columns give, as one undo step, a load
 * with the roles set seeds each node there as a record's `position` does, and a project file
 * keeps them.
 */
import { assert, describe, it, vi } from "vitest";

import { COLUMN_ROLES, createGraphSession, type GraphSession } from "../../src/session";

const POINTS = "id,px,py,pz\na,0,0,1\nb,10,0,2\nc,0,20,3\n";

/**
 * A session holding the points as nodes.
 * @returns The session.
 */
async function points(): Promise<GraphSession> {
    const session = createGraphSession();
    const draft = await session.data.prepare({ type: "csv", config: { data: POINTS }, name: "points.csv" });
    await draft.load({ mapping: { rowsAre: "nodes", key: "id" } });
    return session;
}

/**
 * Where the session holds a node.
 * @param session - the session
 * @param id - the node
 * @returns its x, y and z
 */
function at(session: GraphSession, id: string): readonly [number, number, number] {
    const out = { x: 0, y: 0, z: 0 };
    session.positions.read(session.snapshot().ids.indexOf(id), out);
    return [out.x, out.y, out.z];
}

/**
 * The position fields of `data.knownFields`.
 * @param session - The session.
 * @returns The fields.
 */
function axes(session: GraphSession): Record<string, unknown> {
    const known = session.config.data.knownFields as Record<string, unknown>;
    return { x: known.nodeXPath ?? null, y: known.nodeYPath ?? null, z: known.nodeZPath ?? null };
}

describe("the x, y and z column roles", () => {
    it("are roles a node column takes in place", () => {
        assert.includeMembers([...COLUMN_ROLES.node.inPlace], ["x", "y", "z"]);
        assert.notInclude([...COLUMN_ROLES.edge.inPlace], "x");
    });

    it("place every node from its columns, each role one undo step", async () => {
        const session = await points();
        await session.data.setRole({ kind: "node", name: "px" }, "x");
        await session.data.setRole({ kind: "node", name: "py" }, "y");
        assert.deepStrictEqual(axes(session), { x: "px", y: "py", z: null });
        const roles = Object.fromEntries(
            session.data.attributes().flatMap((a) => (a.kind === "node" && a.roles ? [[a.name, a.roles]] : [])),
        );
        assert.deepStrictEqual(roles.px, ["x"]);
        assert.deepStrictEqual(roles.py, ["y"]);
        await vi.waitFor(() => {
            assert.deepStrictEqual(at(session, "b"), [10, 0, 0]);
        });
        assert.deepStrictEqual(at(session, "c"), [0, 20, 0]);

        await session.data.setRole({ kind: "node", name: "pz" }, "z");
        assert.deepStrictEqual(at(session, "c"), [0, 20, 3]);
        await session.undo();
        assert.deepStrictEqual(axes(session), { x: "px", y: "py", z: null });
        assert.deepStrictEqual(at(session, "c"), [0, 20, 0], "undo takes the z role and its move back together");
        session.dispose();
    });

    it("seed the nodes a later load adds, and a project file keeps them", async () => {
        const session = createGraphSession();
        await session.config.set({ data: { knownFields: { nodeXPath: "px", nodeYPath: "py" } } });
        await session.data.addNodes([
            { id: "a", px: 1, py: 2 },
            { id: "b", px: 3, py: 4 },
        ]);
        await vi.waitFor(() => {
            assert.deepStrictEqual(at(session, "b"), [3, 4, 0]);
        });

        const saved = await session.project.save();
        const opened = createGraphSession();
        const report = await opened.project.open(saved.text);
        assert.deepEqual(report.problems, []);
        assert.deepStrictEqual(axes(opened), { x: "px", y: "py", z: null });
        session.dispose();
        opened.dispose();
    });
});
