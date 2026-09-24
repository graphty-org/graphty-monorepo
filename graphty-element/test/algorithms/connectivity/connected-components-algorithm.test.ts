import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { ConnectedComponentsAlgorithm } from "../../../src/algorithms/ConnectedComponentsAlgorithm";

describe("ConnectedComponentsAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'connected-components'", () => {
            const ConnectedComponentsClass = Algorithm.getClass("graphty", "connected-components");
            assert.ok(ConnectedComponentsClass);
            assert.strictEqual(ConnectedComponentsClass, ConnectedComponentsAlgorithm);
            assert.strictEqual(ConnectedComponentsClass.namespace, "graphty");
            assert.strictEqual(ConnectedComponentsClass.type, "connected-components");
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(ConnectedComponentsAlgorithm.namespace, "graphty");
            assert.strictEqual(ConnectedComponentsAlgorithm.type, "connected-components");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "connected-components");
            assert.strictEqual(AlgClass, ConnectedComponentsAlgorithm);
        });

    });
});
