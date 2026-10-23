/**
 * The root entry's lazy loader against an installed GPU package that loads but lacks the exports
 * the element calls (an older version, or a bundler alias to an empty module).
 */

import "../../src/acceleration/autoload";

import { assert, describe, it, vi } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";

// The keys are present and undefined because a vitest mock throws on reading a key it lacks; a
// real module without the export reads as undefined, which is what this stands for.
vi.mock("@graphty/webgpu-graph-algorithms", () => ({ EXACT_MAX_NODES: undefined, default: undefined }));
vi.mock("@graphty/webgpu-graph-algorithms/browser", () => ({ acquireAccelerator: undefined, default: undefined }));

describe("an installed GPU package without the exports the element calls", () => {
    it("is E_ACCELERATOR_INCOMPATIBLE naming them, with one console.error", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const status = await new AccelerationController().start();

        assert.strictEqual(status.code, "E_ACCELERATOR_INCOMPATIBLE");
        assert.deepEqual(status.params?.missing, ["EXACT_MAX_NODES", "acquireAccelerator"]);
        assert.strictEqual(error.mock.calls.length, 1);
    });
});
