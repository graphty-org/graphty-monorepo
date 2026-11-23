/**
 * API Parity Tests for Graphty Web Component.
 *
 * Verifies that graphty-element publishes, on the `<graphty-element>` class, the methods a consumer
 * of Graph.ts needs. Methods are read from the committed api-extractor reports in `api/*.api.md`,
 * so a method only counts when it is public and published; properties are read from the class's
 * own public accessors.
 *
 * @module test/graphty-element/api-parity.test
 */

import ts from "typescript";
import { assert, describe, it } from "vitest";

import { publicMethods } from "../cost-coverage/api-methods";
import { classMembers } from "../documentation/class-members";

describe("Graphty API Parity", () => {
    const published = new Set(publicMethods());
    const elementMembers = classMembers("src/graphty-element.ts", "Graphty");

    /**
     * Whether a published class declares a public method.
     * @param owner - the class, as the API report names it
     * @param methodName - the method
     * @returns true when the report lists `owner.methodName`
     */
    function hasMethod(owner: string, methodName: string): boolean {
        return published.has(`${owner}.${methodName}`);
    }

    /**
     * Whether the element has a public getter for a property.
     * @param property - the property
     * @returns true when a public `get property()` is declared
     */
    function hasPublicGetter(property: string): boolean {
        return (elementMembers.get(property) ?? []).some(
            (member) => member.isPublic && member.node.kind === ts.SyntaxKind.GetAccessor,
        );
    }

    describe("High priority methods", () => {
        describe("Data Methods", () => {
            const dataMethods = [
                "addNode",
                "addNodes",
                "addEdge",
                "addEdges",
                "removeNodes",
                "updateNodes",
                "getNode",
                "getNodes",
                "getNodeCount",
                "getEdgeCount",
            ];

            for (const method of dataMethods) {
                it(`has ${method} method`, () => {
                    assert.ok(hasMethod("Graphty", method), `Graphty should have ${method} method`);
                });
            }
        });

        describe("Data Loading Methods", () => {
            const loadingMethods = ["addDataFromSource", "loadFromUrl", "loadFromFile"];

            for (const method of loadingMethods) {
                it(`has ${method} method`, () => {
                    assert.ok(hasMethod("Graphty", method), `Graphty should have ${method} method`);
                });
            }
        });

        describe("Selection Methods", () => {
            const selectionMethods = ["selectNode", "deselectNode", "getSelectedNode", "isNodeSelected"];

            for (const method of selectionMethods) {
                it(`has ${method} method`, () => {
                    assert.ok(hasMethod("Graphty", method), `Graphty should have ${method} method`);
                });
            }
        });

        describe("Algorithm Methods", () => {
            const algorithmMethods = ["runAlgorithm", "applySuggestedStyles", "getSuggestedStyles"];

            for (const method of algorithmMethods) {
                it(`has ${method} method`, () => {
                    assert.ok(hasMethod("Graphty", method), `Graphty should have ${method} method`);
                });
            }
        });

        describe("Style Methods", () => {
            it("has getStyles method", () => {
                assert.ok(hasMethod("Graphty", "getStyles"), "Graphty should have getStyles method");
            });

            /**
             * The style template is gone, and what it carried has to be reachable without it.
             *
             * `setStyleTemplate` was one door onto a dozen unrelated settings -- the id paths,
             * the view mode, the background, the layout, the run-on-load algorithms -- and a
             * caller who wanted one of them rewrote all of them. Each is its own property now,
             * and style layers are `session.styles`.
             */
            it("has a property for everything the style template used to carry", () => {
                assert.notOk(elementMembers.has("setStyleTemplate"), "setStyleTemplate is gone, not deprecated");

                for (const property of [
                    "viewMode",
                    "background",
                    "startingCameraDistance",
                    "layout",
                    "layoutConfig",
                    "nodeIdPath",
                    "edgeSrcIdPath",
                    "edgeDstIdPath",
                    "runAlgorithmsOnLoad",
                ]) {
                    assert.ok(hasPublicGetter(property), `Graphty should have a ${property} property`);
                }
            });
        });

        describe("Layout Methods", () => {
            it("has setLayout method", () => {
                assert.ok(hasMethod("Graphty", "setLayout"), "Graphty should have setLayout method");
            });
        });

        describe("Utility Methods", () => {
            const utilityMethods = ["zoomToFit", "waitForSettled", "waitForStableFrame", "batchOperations"];

            for (const method of utilityMethods) {
                it(`has ${method} method`, () => {
                    assert.ok(hasMethod("Graphty", method), `Graphty should have ${method} method`);
                });
            }
        });

        describe("Event Methods", () => {
            const eventMethods = ["on", "addListener", "listenerCount"];

            for (const method of eventMethods) {
                it(`has ${method} method`, () => {
                    assert.ok(hasMethod("Graphty", method), `Graphty should have ${method} method`);
                });
            }
        });
    });

    describe("Medium priority methods", () => {
        describe("View Methods", () => {
            it("has is2D method", () => {
                assert.ok(hasMethod("Graphty", "is2D"), "Graphty should have is2D method");
            });
        });

        describe("XR Methods", () => {
            const xrMethods = ["setXRConfig", "getXRConfig", "exitXR"];

            for (const method of xrMethods) {
                it(`has ${method} method`, () => {
                    assert.ok(hasMethod("Graphty", method), `Graphty should have ${method} method`);
                });
            }
        });

        describe("Camera Methods", () => {
            it("has resolveCameraPreset method", () => {
                assert.ok(
                    hasMethod("Graphty", "resolveCameraPreset"),
                    "Graphty should have resolveCameraPreset method",
                );
            });
        });

        describe("Input Methods", () => {
            it("has setInputEnabled method", () => {
                assert.ok(hasMethod("Graphty", "setInputEnabled"), "Graphty should have setInputEnabled method");
            });
        });

        describe("Lifecycle Methods", () => {
            const lifecycleMethods = ["shutdown", "isRunning", "setRunning"];

            for (const method of lifecycleMethods) {
                it(`has ${method} method`, () => {
                    assert.ok(hasMethod("Graphty", method), `Graphty should have ${method} method`);
                });
            }
        });

        describe("Coordinate Methods", () => {
            const coordinateMethods = ["worldToScreen", "screenToWorld"];

            for (const method of coordinateMethods) {
                it(`has ${method} method`, () => {
                    assert.ok(hasMethod("Graphty", method), `Graphty should have ${method} method`);
                });
            }
        });
    });

    describe("Extension API consistency", () => {
        it("Algorithm has getRegisteredTypes static method", () => {
            assert.ok(
                hasMethod("Algorithm", "getRegisteredTypes"),
                "Algorithm should have getRegisteredTypes static method",
            );
        });

        it("DataSource has getRegisteredTypes static method", () => {
            assert.ok(
                hasMethod("DataSource", "getRegisteredTypes"),
                "DataSource should have getRegisteredTypes static method",
            );
        });
    });
});
