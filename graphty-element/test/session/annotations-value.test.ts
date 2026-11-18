/**
 * The annotations graph value, read defensively: a scale with a list of annotations, and anything else as none.
 */
import { assert, describe, it } from "vitest";

import { drawnAnnotationsOf } from "../../src/session/annotations";

describe("the annotations graph value", () => {
    it("reads a scale with a list of annotations, and anything else as none", () => {
        const value: unknown = { scale: 2, annotations: [{ kind: "text", text: "x" }] };
        assert.strictEqual(drawnAnnotationsOf(value), value);
        for (const other of [null, undefined, 3, {}, { scale: "2", annotations: [] }, { scale: 2, annotations: {} }]) {
            assert.isNull(drawnAnnotationsOf(other), JSON.stringify(other));
        }
    });
});
