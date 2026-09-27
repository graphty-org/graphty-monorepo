/**
 * @file No result field is named `runs` (design/sets/sets-design.md section 15.3, item 36):
 * `results.<result>.runs` is reserved for naming one run under a result, so a field of that name
 * would change meaning when it arrives. Checked over the built-in catalogue and refused when a
 * plugin registers one.
 */

import { afterEach, assert, describe, it } from "vitest";

import { BUILT_IN_ALGORITHMS } from "../../src/catalog/algorithms";
import { clearRegisteredAlgorithmsForTesting, publishAlgorithmDescriptor } from "../../src/catalog/registry";
import { isGraphtyError } from "../../src/errors";

describe("the reserved result field runs", () => {
    afterEach(() => {
        clearRegisteredAlgorithmsForTesting();
    });

    it("is published by no built-in algorithm", () => {
        const offenders = BUILT_IN_ALGORITHMS.filter((descriptor) =>
            descriptor.fields.some((field) => field.name === "runs"),
        );

        assert.deepStrictEqual(
            offenders.map((descriptor) => descriptor.key),
            [],
        );
    });

    it("is refused when a plugin publishes it", () => {
        const [first] = BUILT_IN_ALGORITHMS;
        const descriptor = { ...first, key: "counts", fields: [{ ...first.fields[0], name: "runs" }] };
        let refusal: unknown = null;
        try {
            publishAlgorithmDescriptor({ descriptor, namespace: "acme", type: "counts" });
        } catch (error) {
            refusal = error;
        }

        assert.isTrue(isGraphtyError(refusal));
        assert.strictEqual((refusal as { details: { reason: string } }).details.reason, "reserved-field");
    });
});
