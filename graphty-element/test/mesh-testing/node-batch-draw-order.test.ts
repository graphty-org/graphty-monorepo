/**
 * A node batch keeps its slots in the order the objects path draws its rows: a source's rows after
 * the rows of every source drawn before it, each source's in row order. Draw order decides which of
 * two rows at one depth wins, so a batch in plain row order across sources draws another picture
 * wherever two rows of different sizes tie (#6287).
 */
import { MeshBuilder, NullEngine, RawTexture, Scene, StandardMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { NodeBatch } from "../../src/meshes/NodeBatch";

/** Babylon keeps a mesh's custom thin-instance buffers here; it has no public reader. */
interface ThinStorage {
    _userThinInstanceBuffersStorage?: { data: Record<string, Float32Array> };
}

describe("node batch draw order", () => {
    let scene: Scene;
    let batch: NodeBatch;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        const source = MeshBuilder.CreateBox("source", {}, scene);
        source.material = new StandardMaterial("look", scene);
        const positionTexture = RawTexture.CreateRGBATexture(new Float32Array(4), 1, 1, scene);
        batch = new NodeBatch(source, { positionTexture }, null);
    });

    afterEach(() => {
        scene.dispose();
    });

    /**
     * The rows in slot order, as the GPU reads them.
     * @returns The rows of the live slots.
     */
    function slots(): number[] {
        const rows = (batch.mesh as unknown as ThinStorage)._userThinInstanceBuffersStorage?.data.graphtyRow;
        return Array.from(rows ?? []).slice(0, batch.slots);
    }

    it("draw a later source's rows after an earlier source's, whatever their rows", () => {
        batch.put(0, null, 1, 1);
        batch.put(2, null, 1, 1);
        batch.put(5, null, 0.5, 0);
        batch.put(1, null, 0.5, 0);
        batch.flush();

        assert.deepEqual(slots(), [1, 5, 0, 2]);
    });

    it("keep the order through a compaction", () => {
        for (const [row, rank] of [
            [1, 0],
            [3, 0],
            [0, 1],
            [2, 1],
            [4, 1],
        ] as const) {
            batch.put(row, null, 1, rank);
        }

        batch.flush();
        batch.free(3);
        batch.free(4);
        batch.flush();

        assert.equal(batch.holes, 0, "two holes in five slots compact");
        assert.deepEqual(slots(), [1, 0, 2]);
    });
});
