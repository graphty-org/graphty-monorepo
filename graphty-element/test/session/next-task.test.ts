/**
 * @file Work kept for an idle turn never runs in a turn a pass handed the host mid-way: a draft build's
 * copies for the next build used to run inside a repaint that yielded under load and be counted as its work.
 */

import { assert, describe, it } from "vitest";

import { nextTask, whenIdle } from "../../src/session/nextTask";

describe("nextTask and whenIdle", () => {
    it("runs idle work only once no pass waits on a turn it handed the host", async () => {
        const order: string[] = [];
        whenIdle(() => order.push("idle"));
        // A pass that yields three times in a row, as a repaint does when each slice runs out.
        for (const slice of [1, 2, 3]) {
            await nextTask();
            order.push(`slice ${String(slice)}`);
        }
        await new Promise<void>((done) => {
            whenIdle(done);
        });
        assert.deepStrictEqual(order, ["slice 1", "slice 2", "slice 3", "idle"]);
    });

    it("runs idle work on the next task when nothing yielded", async () => {
        let ran = false;
        whenIdle(() => {
            ran = true;
        });
        assert.isFalse(ran, "not in the task that asked for it");
        await new Promise<void>((done) => {
            whenIdle(done);
        });
        assert.isTrue(ran);
    });
});
