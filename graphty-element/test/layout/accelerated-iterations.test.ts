/**
 * @file How many iterations a frame's batch computes on an accelerator when the host pinned no count (issue #9373):
 * it ramps from the size rule's count up to a cap, so a large graph is not settled at one iteration per frame.
 */
import { assert, describe, it } from "vitest";

import { acceleratedIterationsFor } from "../../src/layout/SimulationLayoutEngine";

describe("acceleratedIterationsFor", () => {
    it("ramps by the iterations already submitted: 1, 1, 2, 4, ... up to 128", () => {
        const batches: number[] = [];
        let submitted = 0;
        for (let i = 0; i < 11; i++) {
            const k = acceleratedIterationsFor(1, 20_000, submitted);
            batches.push(k);
            submitted += k;
        }

        assert.deepStrictEqual(batches, [1, 1, 2, 4, 8, 16, 32, 64, 128, 128, 128]);
    });

    it("caps a batch on a huge graph by nodes times iterations", () => {
        assert.strictEqual(acceleratedIterationsFor(1, 31_250, 1000), 128);
        assert.strictEqual(acceleratedIterationsFor(1, 100_000, 1000), 40);
        assert.strictEqual(acceleratedIterationsFor(4, 1_000_000, 1000), 4, "never fewer than the size rule gives");
    });

    it("caps a batch by the budget it is given, as renderPath batched does", () => {
        assert.strictEqual(acceleratedIterationsFor(1, 10_000, 1000, 160_000), 16);
        assert.strictEqual(acceleratedIterationsFor(1, 10_000, 4, 160_000), 4, "still ramps up to the cap");
        assert.strictEqual(acceleratedIterationsFor(1, 1_000_000, 1000, 160_000), 1, "never fewer than the size rule");
    });

    it("never computes fewer than the size rule's count", () => {
        assert.strictEqual(acceleratedIterationsFor(4, 20_000, 0), 4);
    });
});
