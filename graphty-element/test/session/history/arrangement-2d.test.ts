/**
 * @file In 2D the lane holds every node on the Z = 0 plane, on a session with a fake layout
 * (issue #1488). The history keeps the Z it recorded, so returning to a 3D position brings it
 * back: switching to 2D flattens the lane, a placement's Z is ignored and recorded as the 0 the
 * lane holds, and a restore into a 2D position writes the history's X and Y at Z = 0.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../../src/session/types";
import { fakeLayout } from "./fakes";
import { fixtureSession } from "./fixture-session";

/**
 * Every node's coordinates, by id.
 * @param session - The session.
 * @returns `id: x,y,z` for every row.
 */
function lane(session: GraphSession): Record<string, string> {
    const snapshot = session.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    const out: Record<string, string> = {};
    for (let row = 0; row < snapshot.nodeCount; row++) {
        session.positions.read(row, at);
        out[String(snapshot.ids.idOf(row))] = `${String(at.x)},${String(at.y)},${String(at.z)}`;
    }

    return out;
}

/**
 * The same coordinates on the Z = 0 plane.
 * @param coords - `id: x,y,z`.
 * @returns `id: x,y,0`.
 */
function flat(coords: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(coords).map(([id, v]) => [id, v.replace(/,[^,]*$/, ",0")]));
}

/**
 * A session laid out in 3D, at rest, every node off the plane.
 * @returns The session.
 */
async function laidOut(): Promise<GraphSession> {
    const session = await fixtureSession();
    const layout = fakeLayout(session);
    layout.play();
    layout.step();
    layout.settle();
    session.history.clear();
    return session;
}

describe("the arrangement in 2D", () => {
    it("puts every node on the plane when the layout turns 2D, and undo brings the Z back", async () => {
        const session = await laidOut();
        const spatial = lane(session);
        assert.notDeepEqual(spatial, flat(spatial), "laid out in 3D");

        await session.layout.setDimension("2d");
        assert.deepEqual(lane(session), flat(spatial), "every node on the plane");
        await session.undo();
        assert.deepEqual(lane(session), spatial, "undone, the Z the history kept");
        session.dispose();
    });

    it("ignores the Z a placement gives in 2D and records the 0 the lane holds", async () => {
        const session = await laidOut();
        await session.layout.setDimension("2d");
        const plane = lane(session);

        await session.positions.set([{ id: "n1", x: 5, y: 5, z: -5 }]);
        assert.deepEqual(lane(session), { ...plane, n1: "5,5,0" }, "placed on the plane");
        await session.undo();
        assert.deepEqual(lane(session), plane, "undone");
        await session.redo();
        assert.deepEqual(lane(session), { ...plane, n1: "5,5,0" }, "redone where it landed");
        session.dispose();
    });

    it("writes the arrangement a restore into 2D brings back on the plane", async () => {
        const session = await laidOut();
        const spatial = lane(session);
        await session.layout.setDimension("2d");
        await session.data.addNodes([{ id: "n4" }]);

        // The step the undo lands on has no arrangement of its own: the history holds the 3D one
        // below it, Z and all.
        await session.undo();
        assert.deepEqual(lane(session), flat(spatial), "the history's X and Y, at Z = 0");
        await session.history.restoreTo(null);
        assert.deepEqual(lane(session), spatial, "and back in 3D, its Z");
        session.dispose();
    });
});
