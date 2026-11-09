/**
 * @file The layout filling the row table on the GPU (design/rendering/row-renderer.md 4.5) through a
 * device loss and a layout transition: after the shared device is lost the copy resumes on the new
 * device, and while a transition moves the rows the copy is suspended and positions go up by upload.
 * These are apart from shared-device-drawn.test.ts so each file stays within one CI test bin.
 */

import { assert, describe, it } from "vitest";

import { transitionsOf } from "../../src/transitions/LayoutTransitionRunner";
import { copied, deviceOf, landed, nextFrame, running, textureDiff } from "./shared-device";

describe("the layout filling the row table through a loss and a transition", () => {
    it("fills the table on the new device after the shared device is lost", async () => {
        const graph = await running("batched");
        const before = graph.acceleration.accelerator;
        await copied(graph);
        const old = await deviceOf(graph);
        old.destroy();
        while (graph.acceleration.accelerator === before || graph.acceleration.accelerator === null) {
            await nextFrame();
        }

        // the ring is attached again a batch after the rebuild's load
        await copied(graph);
        const table = graph.getRowTable();
        assert.isNotNull(table);
        assert.notStrictEqual(graph.getDrawnTarget()?.device, old);
        const { copies } = table;
        const uploads = table.positionUploads;
        await landed(graph);
        await landed(graph);

        assert.isAtLeast(table.copies - copies, 2);
        assert.strictEqual(table.positionUploads - uploads, 0);
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
    });

    it("suspends the copy while a layout transition moves the rows, and resumes it after", async () => {
        const graph = await running("batched");
        const table = graph.getRowTable();
        assert.isNotNull(table);
        await copied(graph);
        const session = graph.getSession();
        await session.config.set({ layoutTransition: { transition: "glide", seconds: 30, hold: 0.5 } });
        const runner = transitionsOf(graph.getLayoutManager());
        assert.isDefined(runner);
        await graph.setLayout("forceatlas2", { maxIter: 1_000_000, scalingRatio: 4 });
        // held halfway, the rows stay off their lanes until a layout with no transition ends the move
        await landed(graph);
        const { copies } = table;
        const uploads = table.positionUploads;
        await landed(graph);
        await landed(graph);

        assert.isTrue(runner.active);
        assert.strictEqual(table.copies - copies, 0);
        assert.isAbove(table.positionUploads - uploads, 0);

        // a layout set with no transition ends the move
        await session.config.set({ layoutTransition: undefined });
        await graph.setLayout("forceatlas2", { maxIter: 1_000_000 });
        assert.isFalse(runner.active);
        // the copy resumes; the texture is compared at the second copy, since at the first one after the
        // layout is replaced it still differs from the CPU copy (design/rendering/row-renderer.md 4.5)
        await copied(graph);
        await copied(graph);

        assert.isAbove(table.copies - copies, 0);
        assert.isBelow((await textureDiff(graph)).worst, 1e-5);
    });
});
