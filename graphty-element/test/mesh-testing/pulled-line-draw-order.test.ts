/**
 * A pulled line batch draws its pieces in the order the objects path draws its lines: a batch per
 * width, one after another in the order they were made, each width's in the order its own batch
 * numbers its slots. Lines that cross blend in draw order, so one batch drawing every width in
 * plain piece order drew another picture wherever lines of two widths crossed (#6392).
 */
import { type IndicesArray, MeshBuilder, NullEngine, RawTexture, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { JOIN_TEMPLATE_INDICES, JOIN_TEMPLATE_VERTICES } from "../../src/meshes/edgeJoinShader";
import { PulledLineBatch } from "../../src/meshes/PulledLineBatch";

describe("pulled line batch draw order", () => {
    let scene: Scene;
    let batch: PulledLineBatch;
    /** The index list last uploaded: the batch keeps no CPU copy of it, so the upload is where it is read. */
    let uploaded: IndicesArray = [];

    beforeEach(() => {
        const engine = new NullEngine();
        // NullEngine has no GL to name a float texture's type for; the table's bytes are not what is read here.
        engine.updateTextureData = (): void => undefined;
        scene = new Scene(engine);
        const rows = RawTexture.CreateRGBATexture(new Float32Array(4), 1, 1, scene);
        const mesh = MeshBuilder.CreateBox("line", {}, scene);
        const setIndices = mesh.setIndices.bind(mesh);
        mesh.setIndices = (indices, ...rest) => {
            uploaded = indices;
            return setIndices(indices, ...rest);
        };
        batch = new PulledLineBatch(mesh, scene, () => rows);
    });

    afterEach(() => {
        scene.dispose();
    });

    /**
     * The pieces the draw covers, in the order it draws them.
     * @returns The pieces.
     */
    function drawn(): number[] {
        batch.flush();
        const indices = uploaded;
        return Array.from({ length: batch.drawnCount }, (_, at) =>
            Math.floor((indices[at * JOIN_TEMPLATE_INDICES.length] ?? 0) / JOIN_TEMPLATE_VERTICES),
        );
    }

    it("draws the pieces of the width met first before the pieces of a later one", () => {
        const pieces = [2, 1, 2, 1].map((width) => batch.acquire(width));

        assert.deepEqual(pieces, [0, 1, 2, 3]);
        assert.deepEqual(drawn(), [0, 2, 1, 3]);
    });

    it("draws a freed piece taken by another width in that width's place", () => {
        [2, 1, 2, 1].forEach((width) => batch.acquire(width));
        batch.release(0);

        assert.equal(batch.acquire(1), 0, "the freed piece is taken again");
        assert.deepEqual(drawn(), [2, 1, 3, 0]);
    });

    it("keeps plain piece order for one width, freed pieces included", () => {
        [3, 3, 3, 3].forEach((width) => batch.acquire(width));
        batch.release(1);
        batch.acquire(3);

        assert.deepEqual(drawn(), [0, 1, 2, 3]);
    });
});
