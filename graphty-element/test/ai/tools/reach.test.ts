/**
 * @file `assistantReach`: a plugin author learns from their own test whether what they
 * registered reaches graphty-element's assistant.
 */

import { afterEach, assert, describe, it } from "vitest";

import { assistantReach, defineAlgorithm, registerSnapshotLayout } from "../../../extend";
import { clearRegisteredLayoutsForTesting } from "../../../src/catalog/layoutRegistry";
import { clearRegisteredAlgorithmsForTesting } from "../../../src/catalog/registry";

describe("assistantReach", () => {
    afterEach(() => {
        clearRegisteredAlgorithmsForTesting();
        clearRegisteredLayoutsForTesting();
    });

    it("is empty for the built-in catalog and a described plugin", () => {
        assert.deepStrictEqual(assistantReach(), []);
        defineAlgorithm({ id: "acme-tie", description: "How tied each node is.", node: (node) => node.degree });
        assert.deepStrictEqual(assistantReach(), []);
    });

    it("names an option no schema can carry, and a command that takes a tool's name", () => {
        registerSnapshotLayout({
            descriptor: {
                id: "acme-odd",
                plainName: "Odd",
                technicalName: "Odd layout",
                description: "Places nodes oddly.",
                family: "geometric",
                kind: "batch",
                maxDimensions: 2,
                sizeRating: "any",
                structuralInputs: [],
                options: [{ name: "shape", plainName: "Shape", type: "unknown", unsupportedReason: "a nested object" }],
                engine: "acme-odd",
            },
            compute: () => ({ positions: new Float32Array(0), dim: 2 }) as never,
        });
        assert.deepStrictEqual(assistantReach([{ name: "query" }, { name: "tag_nodes" }]), [
            { code: "ai.option-unoffered", params: { entry: "acme-odd", option: "shape", type: "unknown" } },
            { code: "ai.name-reserved", params: { command: "query", tool: "query" } },
        ]);
    });
});
