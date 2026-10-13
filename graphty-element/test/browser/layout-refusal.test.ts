/**
 * @file A layout given a graph it cannot arrange (issue #2275), planar over K5 and bfs over a
 * disconnected graph: the refusal reaches the error event with its own code (`E_NOT_PLANAR`,
 * `E_NOT_CONNECTED`), not as an uncoded error or `E_INTERNAL`, and the refused layout places
 * nothing -- every node stays where it was. Then every other refusal of a layout or of its options
 * (issue #2335): each arrives with the element's code for it and its params, not as `E_INTERNAL`,
 * and moves no node.
 */
import "../../src/graphty-element";

import { bipartite, grid, multipartite, radial, shell } from "@graphty/layout";
import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import { type AuthoredLayoutDescriptor, registerSnapshotLayout, type SnapshotLayoutInput } from "../../extend";
import type { Graphty } from "../../index.js";
import { type GraphtyError, isGraphtyError } from "../../src/errors";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** Every edge of the complete graph on `ids`. */
const complete = (ids: number[]): { src: number; dst: number }[] =>
    ids.flatMap((src, i) => ids.slice(i + 1).map((dst) => ({ src, dst })));

/**
 * A 2D element on the page, recording the errors it reports.
 * @returns The element and its errors.
 */
function mount(): { element: Graphty; errors: Error[] } {
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    const errors: Error[] = [];
    element.addEventListener("error", (event) => {
        errors.push((event as CustomEvent<{ error: Error }>).detail.error);
    });
    element.viewMode = "2d";
    return { element, errors };
}

/**
 * Every node's coordinates in the position array, by id.
 * @param element - The element.
 * @returns `id: x,y,z`.
 */
function placed(element: Graphty): Record<string, string> {
    const { session } = element;
    const snapshot = session.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    const out: Record<string, string> = {};
    for (let row = 0; row < snapshot.nodeCount; row++) {
        session.positions.read(row, at);
        out[String(snapshot.ids.idOf(row))] = `${String(at.x)},${String(at.y)},${String(at.z)}`;
    }

    return out;
}

describe("planar layout refusing a graph", () => {
    it("reports K5 on the error event as E_NOT_PLANAR with the size it tested", async () => {
        const { element, errors } = mount();
        element.nodeData = [0, 1, 2, 3, 4].map((id) => ({ id }));
        element.edgeData = complete([0, 1, 2, 3, 4]);
        element.layout = "planar";

        await vi.waitFor(() => {
            assert.isAbove(errors.length, 0, "the refusal was reported");
        });
        for (const error of errors) {
            assert.isTrue(isGraphtyError(error), "a GraphtyError, which carries a code");
            if (isGraphtyError(error)) {
                assert.strictEqual(error.code, "E_NOT_PLANAR");
                assert.strictEqual(error.source, "layout");
                assert.strictEqual(error.details.nodeCount, 5);
                assert.strictEqual(error.details.edgeCount, 10);
                assert.include(error.message, "G is not planar.");
            }
        }
    });

    it("moves no node when the graph it refuses renumbered the rows it last drew", async () => {
        // Node 0 hangs off K5-minus-an-edge on 1..5, which is planar and gets drawn. Then, in one
        // step, node 0 goes (so 1..5 move up a row) and the missing edge arrives: K5, refused. The
        // answer for the earlier graph must not be published again over the new rows.
        const { element, errors } = mount();
        element.nodeData = [0, 1, 2, 3, 4, 5].map((id) => ({ id }));
        element.edgeData = [
            { src: 0, dst: 1 },
            ...complete([1, 2, 3, 4, 5]).filter((e) => !(e.src === 1 && e.dst === 2)),
        ];
        element.layout = "planar";
        await vi.waitFor(() => {
            assert.strictEqual(element.session.snapshot().edgeCount, 10);
        });
        await element.waitForStableFrame();
        assert.lengthOf(errors, 0, "the planar graph was drawn");
        const before = placed(element);

        await element.batchOperations(async (tx) => {
            await tx.data.removeNodes([0]);
            await tx.data.addEdges([{ src: 1, dst: 2 }]);
        });
        await vi.waitFor(() => {
            assert.isTrue(
                errors.some((error) => isGraphtyError(error) && error.code === "E_NOT_PLANAR"),
                "K5 was refused",
            );
        });
        await element.waitForStableFrame();

        const after = placed(element);
        for (const id of ["1", "2", "3", "4", "5"]) {
            assert.strictEqual(after[id], before[id], `node ${id} stays where it was drawn`);
        }
    });

    it("reports a bfs layout over a disconnected graph as E_NOT_CONNECTED", async () => {
        const { element, errors } = mount();
        element.nodeData = [0, 1, 2, 3].map((id) => ({ id }));
        element.edgeData = [{ src: 0, dst: 1 }];
        element.layoutConfig = { start: 0 };
        element.layout = "bfs";

        await vi.waitFor(() => {
            assert.isTrue(
                errors.some(
                    (error) =>
                        isGraphtyError(error) &&
                        error.code === "E_NOT_CONNECTED" &&
                        error.details.nodeCount === 4 &&
                        error.details.reached === 2,
                ),
                "the refusal was reported with its code",
            );
        });
    });
});

/**
 * A drawn path a - b - c - d, and its coordinates once the circular layout has settled.
 * @returns The element, its errors and where every node was drawn.
 */
async function drawn(): Promise<{ element: Graphty; errors: Error[]; before: Record<string, string> }> {
    const { element, errors } = mount();
    element.nodeData = ["a", "b", "c", "d"].map((id) => ({ id, weight: 1.5 }));
    element.edgeData = [
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
        { src: "c", dst: "d" },
    ];
    element.layout = "circular";
    await vi.waitFor(() => {
        assert.strictEqual(element.session.snapshot().edgeCount, 3);
    });
    await element.waitForStableFrame();
    assert.lengthOf(errors, 0, "the path was drawn");
    return { element, errors, before: placed(element) };
}

/**
 * Switch to a layout that refuses, and wait for its refusal.
 * @param element - The element.
 * @param errors - What it reported.
 * @param layout - The layout.
 * @param config - Its options.
 * @param code - The code the refusal must carry.
 * @returns The refusal.
 */
async function refused(
    element: Graphty,
    errors: Error[],
    layout: string,
    config: Record<string, unknown>,
    code: string,
): Promise<GraphtyError> {
    // One call names the layout and its options, so no other layout is ever run with them.
    const reported: unknown[] = [];
    await element.session.layout.set(layout, { options: config }).catch((error: unknown) => {
        reported.push(error);
    });
    let found: GraphtyError | undefined;
    await vi.waitFor(() => {
        found = [...reported, ...errors].find(
            (error): error is GraphtyError => isGraphtyError(error) && error.code === code,
        );
        const got = [...reported, ...errors].map((error) => String(error)).join("; ");
        assert.isDefined(found, `${layout} was refused with ${code}; got ${got}`);
    });
    await element.waitForStableFrame();
    assert.isDefined(found);
    return found;
}

/**
 * A single-pass layout over the snapshot whose run is one call into `@graphty/layout`.
 * @param id - The layout id.
 * @param run - The call.
 */
function registerRefusing(id: string, run: (input: SnapshotLayoutInput) => Float32Array): void {
    const descriptor: AuthoredLayoutDescriptor = {
        id,
        plainName: id,
        technicalName: id,
        description: "Calls @graphty/layout with input it refuses.",
        family: "geometric",
        kind: "batch",
        maxDimensions: 2,
        sizeRating: "any",
        structuralInputs: [],
        engine: id,
        options: [],
    };
    registerSnapshotLayout({ descriptor, compute: (input) => Float32Array.from(run(input)) });
}

/** The column the bipartite case names as its `top`. */
const notBool = { name: "" };

describe("a layout or its options refused by the element or by @graphty/layout", () => {
    beforeAll(() => {
        registerRefusing("test-refuse-multipartite", (input) => multipartite(input.graph).positions);
        registerRefusing("test-refuse-bipartite", (input) => {
            // A node column the element's snapshot holds that is not bool.
            const { nodes } = input.graph;
            notBool.name = nodes.names().find((name) => nodes.get(name)?.dtype !== "bool") ?? "";
            return bipartite(input.graph, { top: notBool.name }).positions;
        });
        registerRefusing("test-refuse-grid", (input) => grid(input.graph, { columns: 0 }).positions);
        registerRefusing("test-refuse-shell", (input) => shell(input.graph, { nlist: [[0], [1, 99]] }).positions);
        registerRefusing("test-refuse-radial", (input) => radial(input.graph, { root: { id: "nope" } }).positions);
    });

    const cases: readonly (readonly [string, string, Record<string, unknown>, string, Record<string, unknown>])[] = [
        [
            "bfs from a start that is not a node",
            "bfs",
            { start: "nope" },
            "E_UNKNOWN_ELEMENT",
            {
                kind: "node",
                id: "nope",
                option: "start",
                layout: "bfs",
            },
        ],
        [
            "radial around a root that is not a node",
            "radial",
            { root: "nope" },
            "E_UNKNOWN_ELEMENT",
            {
                kind: "node",
                id: "nope",
                option: "root",
                layout: "radial",
            },
        ],
        ["bfs with no start", "bfs", {}, "E_OPTION_RANGE", { kind: "layout", id: "bfs", option: "start" }],
        [
            "multipartite with no subset column",
            "test-refuse-multipartite",
            {},
            "E_UNKNOWN_ATTRIBUTE",
            {
                option: "subsets",
                column: "subset",
                sourceCode: "E_UNKNOWN_COLUMN",
            },
        ],
        [
            "bipartite with a top column that is not bool",
            "test-refuse-bipartite",
            {},
            "E_ATTRIBUTE_TYPE",
            {
                option: "top",
                expected: ["bool"],
                sourceCode: "E_COLUMN_TYPE",
            },
        ],
        [
            "grid with a columns of 0",
            "test-refuse-grid",
            {},
            "E_OPTION_RANGE",
            {
                option: "columns",
                value: 0,
                sourceCode: "E_BAD_OPTION",
            },
        ],
        [
            "shell with an index that is not a node",
            "test-refuse-shell",
            {},
            "E_UNKNOWN_ELEMENT",
            {
                kind: "node",
                option: "nlist",
                index: 99,
                sourceCode: "E_BAD_NODE",
            },
        ],
        [
            "radial around an id the graph does not hold",
            "test-refuse-radial",
            {},
            "E_UNKNOWN_ELEMENT",
            {
                kind: "node",
                id: "nope",
                sourceCode: "E_UNKNOWN_NODE",
            },
        ],
    ];

    for (const [name, layout, config, code, details] of cases) {
        it(`${name}: ${code} with its params, and no node moves`, async () => {
            const { element, errors, before } = await drawn();
            const error = await refused(element, errors, layout, config, code);
            for (const [key, value] of Object.entries(details)) {
                assert.deepEqual(error.details[key], value, `details.${key}`);
            }
            if (layout === "test-refuse-bipartite") {
                assert.notStrictEqual(notBool.name, "", "the snapshot holds a column that is not bool");
                assert.strictEqual(error.details.column, notBool.name);
            }
            assert.notInclude(error.message, "invalid_type", "no raw Zod issue dump");
            assert.deepEqual(placed(element), before, "every node stays where it was drawn");
        });
    }
});
