/**
 * A pulled line batch draws its pieces in the order the objects path draws its lines: a batch per
 * width, one after another in the order they were made, each width's in the order its own batch
 * numbers its slots. Lines that cross blend in draw order, so one batch drawing every width in
 * plain piece order drew another picture wherever lines of two widths crossed (#6392).
 *
 * It draws them with no index buffer: `gl_VertexID` names the draw slot and the corner, and a draw
 * order table names the piece a slot draws once two widths interleave. The index list it once kept
 * cost 4 bytes an index, 120 bytes an edge, built and uploaded whole at every growth (#6389).
 */
import { Mesh, MeshBuilder, NullEngine, RawTexture, Scene, VertexData } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { JOIN_TEMPLATE_INDICES, JOIN_TEMPLATE_POSITIONS } from "../../src/meshes/edgeJoinShader";
import { ANIMATED_TEMPLATE, createPulledAnimatedLineMesh } from "../../src/meshes/pulledAnimatedLine";
import { LEAN_TEMPLATE, PulledLineBatch } from "../../src/meshes/PulledLineBatch";

describe("pulled line batch draw order", () => {
    let scene: Scene;
    let rows: RawTexture;
    let batch: PulledLineBatch;

    beforeEach(() => {
        const engine = new NullEngine();
        // NullEngine has no GL to name a float texture's type for; the table's bytes are not what is read here.
        engine.updateTextureData = (): void => undefined;
        scene = new Scene(engine);
        rows = RawTexture.CreateRGBATexture(new Float32Array(4), 1, 1, scene);
        batch = new PulledLineBatch(MeshBuilder.CreateBox("line", {}, scene), scene, () => rows);
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
        const order = batch.drawOrder;
        return Array.from({ length: batch.drawnCount }, (_, slot) => (order === null ? slot : (order[slot] ?? -1)));
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

    it("draws a piece handed out after a sort even when no new sort follows", () => {
        batch.acquire(2);
        batch.acquire(1);
        drawn();
        batch.release(1);
        assert.equal(batch.acquire(2), 1, "the freed piece is taken again");
        drawn();
        // its key is its own number, the key its slot already held, so nothing asks for another sort
        assert.equal(batch.acquire(2), 2);
        assert.deepEqual(drawn(), [0, 1, 2]);
    });

    it("keeps no draw keys for one width, and keys every piece once a second width arrives", () => {
        [3, 3, 3, 3, 3].forEach((width) => batch.acquire(width));
        batch.release(1);
        batch.release(3);
        assert.equal(batch.acquire(3), 3, "the last freed piece is taken first");
        drawn();
        assert.equal(batch.keyCount, 0, "one width: a piece's key is its own number");

        assert.equal(batch.acquire(5), 1, "the other freed piece, now of a second width");
        // a new piece, in the slot the first width's batch freed: drawn where piece 1 was
        assert.equal(batch.acquire(3), 5);
        assert.isAtLeast(batch.keyCount, 6, "a key for every piece from here on");
        assert.deepEqual(drawn(), [0, 5, 2, 3, 4, 1]);
        batch.release(2);
        assert.equal(batch.acquire(5), 2);
        assert.deepEqual(drawn(), [0, 5, 3, 4, 1, 2]);
    });

    it("keeps plain piece order for one width, freed pieces included, with no order table", () => {
        [3, 3, 3, 3].forEach((width) => batch.acquire(width));
        batch.release(1);
        batch.acquire(3);

        assert.deepEqual(drawn(), [0, 1, 2, 3]);
        assert.equal(batch.drawOrder, null);
    });

    it("draws each kind of pulled mesh with no index buffer, a template's worth of vertices a piece", () => {
        const kinds = [
            {
                mesh: CustomLineRenderer.createJoinedLineMesh({ width: 1, color: "#ffffff", pulled: true }, scene),
                template: undefined,
            },
            {
                mesh: CustomLineRenderer.createJoinedLineMesh(
                    { width: 1, color: "#ffffff", pulled: true, pulledLean: true },
                    scene,
                ),
                template: LEAN_TEMPLATE,
            },
            { mesh: createPulledAnimatedLineMesh(scene), template: ANIMATED_TEMPLATE },
        ];
        for (const { mesh, template } of kinds) {
            const pulled = new PulledLineBatch(mesh, scene, () => rows, false, template);
            // past the first table, so the batch grows
            for (let i = 0; i < 5000; i++) {
                pulled.acquire(i % 2);
            }
            pulled.flush();

            assert.isTrue(mesh.isUnIndexed, mesh.name);
            // Babylon gives every geometry an index list; a pulled mesh's stays empty however many pieces it draws
            assert.equal(mesh.getTotalIndices(), 0, mesh.name);
            const corners = (template ?? { indices: JOIN_TEMPLATE_INDICES }).indices.length;
            assert.equal(mesh.subMeshes[0]?.verticesCount, 5000 * corners, mesh.name);
            pulled.dispose();
        }
    });

    it("needs no index list on a mesh it is handed", () => {
        const mesh = new Mesh("bare", scene);
        const data = new VertexData();
        data.positions = [...JOIN_TEMPLATE_POSITIONS];
        data.applyToMesh(mesh);
        const pulled = new PulledLineBatch(mesh, scene, () => rows);
        pulled.acquire();

        assert.equal(mesh.getTotalIndices(), 0);
        assert.equal(mesh.subMeshes[0]?.verticesCount, JOIN_TEMPLATE_INDICES.length);
    });
});
