/**
 * A pulled line batch sends the pieces written since the last frame, not every table line between the first and the
 * last of them: a time window hides and shows pieces scattered over the whole table, and one first-to-last range
 * sent all of it each frame (#6025).
 */
import { MeshBuilder, NullEngine, RawTexture, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { NO_ROW, PulledLineBatch } from "../../src/meshes/PulledLineBatch";

/** One `updateTextureData` call: the rectangle it sends, in texels. */
interface Sent {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Pieces in one line of the edge table: 1,024 texels, two a piece. */
const PER_LINE = 512;

describe("pulled line batch uploads", () => {
    let scene: Scene;
    let batch: PulledLineBatch;
    let sent: Sent[] = [];

    beforeEach(() => {
        const engine = new NullEngine();
        engine.updateTextureData = (_texture, _data, x, y, width, height): void => {
            sent.push({ x, y, width, height });
        };
        scene = new Scene(engine);
        const rows = RawTexture.CreateRGBATexture(new Float32Array(4), 1, 1, scene);
        batch = new PulledLineBatch(MeshBuilder.CreateBox("line", {}, scene), scene, () => rows);
        for (let piece = 0; piece < 8 * PER_LINE; piece++) {
            batch.setRows(batch.acquire(), piece, piece + 1);
        }

        batch.flush();
        sent = [];
    });

    afterEach(() => {
        scene.dispose();
    });

    it("sends only the pieces a frame wrote, far apart", () => {
        const bytes = batch.uploadedBytes;
        batch.setRows(3, NO_ROW, NO_ROW);
        batch.setRows(3 * PER_LINE + 7, NO_ROW, NO_ROW);
        batch.flush();

        assert.deepEqual(sent, [
            { x: 6, y: 0, width: 2, height: 1 },
            { x: 14, y: 3, width: 2, height: 1 },
        ]);
        assert.strictEqual(batch.uploadedBytes - bytes, 2 * 2 * 16, "two pieces of two float texels");
    });

    // Eight lines, so the run below writes under half the pieces: past half, `DirtyRuns` sends the table whole.
    it("sends a run over whole lines in one call, with a part line on either side", () => {
        for (let piece = PER_LINE - 1; piece <= 3 * PER_LINE; piece++) {
            batch.setRows(piece, NO_ROW, NO_ROW);
        }

        batch.flush();

        assert.deepEqual(sent, [
            { x: 1022, y: 0, width: 2, height: 1 },
            { x: 0, y: 1, width: 1024, height: 2 },
            { x: 0, y: 3, width: 2, height: 1 },
        ]);
    });

    it("sends nothing on a frame that wrote nothing", () => {
        batch.flush();

        assert.deepEqual(sent, []);
    });
});
