import { readFileSync } from "fs";
import { assert, describe, it } from "vitest";

describe("JSDoc Coverage", () => {
    describe("Graph.ts public methods", () => {
        const content = readFileSync("src/Graph.ts", "utf8");

        const publicMethods = [
            "addNodes",
            "addEdges",
            "setLayout",
            "runAlgorithm",
            "selectNode",
            "deselectNode",
            "zoomToFit",
            "waitForSettled",
        ];

        for (const method of publicMethods) {
            it(`${method} has JSDoc with @example`, () => {
                // Look for JSDoc comment immediately preceding the method
                // The regex looks for:
                // 1. A JSDoc comment block (/** ... */)
                // 2. That contains @example
                // 3. Followed by (optional whitespace, async keyword, and) the method name
                const regex = new RegExp(
                    `/\\*\\*[\\s\\S]*?@example[\\s\\S]*?\\*/\\s*(async\\s+)?${method}\\s*\\(`,
                    "m",
                );
                assert.match(content, regex, `${method} should have JSDoc with @example`);
            });

            it(`${method} has @since tag`, () => {
                // Look for @since tag in the JSDoc preceding the method
                const regex = new RegExp(`/\\*\\*[\\s\\S]*?@since[\\s\\S]*?\\*/\\s*(async\\s+)?${method}\\s*\\(`, "m");
                assert.match(content, regex, `${method} should have @since tag`);
            });
        }
    });

    describe("graphty-element.ts properties", () => {
        const content = readFileSync("src/graphty-element.ts", "utf8");

        it("has @example blocks", () => {
            assert.include(content, "@example", "Should have @example blocks");
        });

        it("has @since tags", () => {
            assert.include(content, "@since", "Should have @since tags");
        });

        // Check specific properties have JSDoc
        const properties = ["nodeData", "edgeData", "layout", "viewMode", "background", "startingCameraDistance"];

        for (const prop of properties) {
            it(`${prop} property has JSDoc`, () => {
                // Look for JSDoc block before property getter/setter or @property decorator
                const hasJSDoc =
                    content.includes("@property") &&
                    // Check for JSDoc preceding the getter
                    (new RegExp(`/\\*\\*[\\s\\S]*?\\*/\\s*(?:@property[^]*?)?get\\s+${prop}\\s*\\(`).test(content) ||
                        // Or JSDoc in the format used in the file
                        new RegExp("/\\*\\*[\\s\\S]*?\\*/\\s*@property").test(content));
                assert.isTrue(
                    hasJSDoc || content.includes(`get ${prop}`),
                    `${prop} property should have JSDoc documentation`,
                );
            });
        }
    });

    describe("colorblind simulation exports", () => {
        // The seven simulators are published from `./schema`, beside the palettes they exist to
        // check, and from there only. They used to be published from the root barrel as well,
        // which meant a consumer met two import lines for one function with nothing to say they
        // were the same function -- and the root barrel defines the custom element, so checking
        // a palette for colour-vision safety cost a 3D engine.
        const schemaContent = readFileSync("schema.ts", "utf8");
        const indexContent = readFileSync("index.ts", "utf8");

        const expectedExports = [
            "simulateProtanopia",
            "simulateDeuteranopia",
            "simulateTritanopia",
            "toGrayscale",
            "colorDifference",
            "isPaletteSafe",
            "areDistinguishableInGrayscale",
        ];

        it("exports colorblind simulation utilities from ./schema", () => {
            for (const exportName of expectedExports) {
                assert.include(schemaContent, exportName, `schema.ts should export ${exportName}`);
            }
        });

        it("publishes each of them from exactly one address, so the root barrel carries none", () => {
            for (const exportName of expectedExports) {
                assert.notInclude(
                    indexContent,
                    exportName,
                    `index.ts should not also export ${exportName}: ./schema is where it lives`,
                );
            }
        });
    });
});
