/**
 * The root entry's lazy loader against an installed GPU package that throws while its module
 * evaluates: `E_ACCELERATOR_FAILED`, one console.error, and `required` refuses work.
 */

import "../../src/acceleration/autoload";

import { assert, describe, it, vi } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { isGraphtyError } from "../../src/errors";

vi.mock("@graphty/webgpu-graph-algorithms", () => {
    throw new Error("the GPU package threw while evaluating");
});

describe("an installed GPU package that fails to load", () => {
    it("is E_ACCELERATOR_FAILED with one console.error, and required work throws", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const controller = new AccelerationController({ policy: "required" });
        const status = await controller.start();

        assert.strictEqual(status.state, "unavailable");
        assert.strictEqual(status.code, "E_ACCELERATOR_FAILED");
        assert.strictEqual(status.params?.package, "@graphty/webgpu-graph-algorithms");
        assert.strictEqual(error.mock.calls.length, 1);

        let thrown: unknown;
        try {
            controller.plan({ capability: "forceAtlas2", nodeCount: 10 });
        } catch (failure) {
            thrown = failure;
        }

        assert.isTrue(isGraphtyError(thrown) && thrown.code === "E_NO_ACCELERATOR");
    });
});
