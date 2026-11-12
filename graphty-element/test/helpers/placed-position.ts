/**
 * @file Reject a node mesh position that no frame has written yet.
 *
 * A new node mesh starts where `MeshCache` parks the hidden instance template, y = -10000, and
 * only a frame's update pass (`Node.update()`) moves it to the node's layout position.
 * `graph.waitForSettled()` waits for the operation queue and the style lane, not for a frame, so a
 * mesh read right after it is usually still the template's: two such reads compare that
 * placeholder with itself and pass whatever the element did. Wait for
 * `graph.waitForStableFrame()` (or step the update pass) before reading, and check the read with
 * {@link assertPlaced}.
 */
import { assert } from "vitest";

/** The y of the instance template a new node mesh is created at (`src/meshes/MeshCache.ts`). */
const TEMPLATE_Y = -10000;

/**
 * Assert a node mesh position was written by a frame, not left at the template's position.
 * @param position - The position read off the mesh (`node.mesh.position`, `node.getPosition()`).
 * @param what - What was read, for the failure message.
 */
export function assertPlaced(position: { x: number; y: number; z: number }, what = "the node"): void {
    assert.notStrictEqual(
        position.y,
        TEMPLATE_Y,
        `${what} is still at the new mesh's template position ` +
            `(${String(position.x)}, ${String(position.y)}, ${String(position.z)}): ` +
            "no frame had placed it when it was read; wait for graph.waitForStableFrame() first",
    );
}
