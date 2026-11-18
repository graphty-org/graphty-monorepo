import { readFileSync } from "fs";
import { assert, describe, it } from "vitest";

import { classMembers, docOf } from "./class-members";

/**
 * The tags on the doc comments attached to a member's own declarations (a getter and its setter,
 * or a method's overloads), read by the TypeScript parser so no other member's comment counts.
 * @param members - the class's members
 * @param name - the member
 * @returns whether it has a commented declaration, and the tags those comments carry
 */
function documentation(
    members: ReturnType<typeof classMembers>,
    name: string,
): { documented: boolean; tags: Set<string> } {
    const declarations = members.get(name) ?? [];
    assert.isNotEmpty(declarations, `the class declares no ${name}`);
    assert.isTrue(
        declarations.some((member) => member.isPublic),
        `${name} is not public`,
    );
    const docs = declarations.map((member) => docOf(member.node));

    return {
        documented: docs.some((doc) => doc.text.length > 0),
        tags: new Set(docs.flatMap((doc) => [...doc.tags])),
    };
}

describe("JSDoc Coverage", () => {
    describe("Graph.ts public methods", () => {
        const members = classMembers("src/Graph.ts", "Graph");

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
                assert.isTrue(
                    documentation(members, method).tags.has("example"),
                    `${method} should have JSDoc with @example`,
                );
            });

            it(`${method} has @since tag`, () => {
                assert.isTrue(documentation(members, method).tags.has("since"), `${method} should have @since tag`);
            });
        }
    });

    describe("graphty-element.ts properties", () => {
        const members = classMembers("src/graphty-element.ts", "Graphty");

        const properties = ["nodeData", "edgeData", "layout", "viewMode", "background", "startingCameraDistance"];

        for (const prop of properties) {
            it(`${prop} property has JSDoc with @example and @since`, () => {
                const { documented, tags } = documentation(members, prop);
                assert.isTrue(documented, `${prop} property should have JSDoc documentation`);
                assert.isTrue(tags.has("example"), `${prop} property should have an @example`);
                assert.isTrue(tags.has("since"), `${prop} property should have a @since tag`);
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
