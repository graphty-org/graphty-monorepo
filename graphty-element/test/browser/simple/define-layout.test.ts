/**
 * @file The simple tier's layout verb, `defineLayout`, on a real rendered graph.
 *
 * WHAT IS UNDER TEST. The custom layouts guide opens with three toy layouts a newcomer copies:
 * rows by a tier attribute, rows by a text category, and coordinates the data already carries.
 * Each lives in docs/examples/simple-tier/ and the guide includes it verbatim, so these tests run
 * exactly the code a reader copies -- its `defineLayout` call and its "use it" line -- and assert
 * what the reader would see: where every node is drawn.
 *
 * WHAT THE ELEMENT PROMISES FOR THEM (design/extensions/simple-tier.md section 4.2):
 * - a node goes where `place` put it, in scene units, with no hidden multiplier;
 * - a 2D position in a 3D view gets z = 0, and a 3D position in a 2D view loses its z;
 * - a node `place` left out is not placed by the layout;
 * - a pinned node stays where the reader pinned it, and `context.fixed(id)` says where that is;
 * - a malformed definition and a plugin's own mistakes are refused with an error a beginner can
 *   act on;
 * - a simple layout shows up exactly as an advanced one does: same catalogue entry shape, same
 *   option checks, same registry.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { layoutDescriptor, layoutIdForEngine } from "../../../catalog";
import {
    type AuthoredLayoutDescriptor,
    defineLayout,
    type GraphtyError,
    isGraphtyError,
    type LayoutDescriptor,
    LayoutEngine,
    type Node,
    type Point,
    SimpleLayoutEngine,
} from "../../../extend";
import { Graph } from "../../../index.js";
import { GraphtyLogger } from "../../../logging";
import { expandOptions } from "../../../src/simple/options";

/**
 * Six nodes carrying every attribute the three toy layouts read. "f" carries none of them, so
 * every layout leaves it unplaced. No node carries "category", which is the attribute the
 * category layout reads when the reader binds nothing.
 */
const NODES = [
    { id: "a", tier: 0, department: "sales", x: 1, y: 2, z: 3 },
    { id: "b", tier: 0, department: "eng", x: -1, y: 0.5, z: 0 },
    { id: "c", tier: 1, department: "eng", x: 4, y: 4 },
    { id: "d", tier: 1, department: "sales", x: 0, y: -2, z: 5 },
    { id: "e", tier: 1, department: "ops", x: 2, y: 2, z: -1 },
    { id: "f", name: "no attributes" },
];

const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "e" },
    { src: "e", dst: "f" },
];

/** Roughly one animation frame. */
const FRAME_MS = 16;

/** How long a wait may take before it is called a failure. */
const PATIENCE_MS = 5000;

/** A position as the element reports it. */
interface Coords {
    x: number;
    y: number;
    z: number;
}

/**
 * Wait one frame.
 * @param ms - How long.
 * @returns A promise that resolves after it.
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Run something that must fail, and hand back the failure.
 * @param act - What to try.
 * @returns The GraphtyError it produced.
 */
async function failureOf(act: () => unknown): Promise<GraphtyError> {
    try {
        await act();
    } catch (error) {
        if (isGraphtyError(error)) {
            return error;
        }

        throw error;
    }

    return assert.fail("the call succeeded when it should have failed");
}

describe("defineLayout on a rendered graph", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    /**
     * Wait until the element has finished drawing with the current layout.
     * @param what - How to describe the wait if it fails.
     */
    async function settled(what: string): Promise<void> {
        await graph.operationQueue.waitForCompletion();
        const manager = graph.getLayoutManager();
        const deadline = Date.now() + PATIENCE_MS;
        while (Date.now() < deadline) {
            if ((manager.layoutEngine?.isSettled ?? false) && !manager.running) {
                return;
            }

            await delay(FRAME_MS);
        }

        throw new Error(`timed out waiting for ${what}`);
    }

    /**
     * A node by id.
     * @param id - The node's id.
     * @returns The node.
     */
    function nodeById(id: string): Node {
        const found = graph.getNode(id);
        if (!found) {
            return assert.fail(`the graph has no node "${id}"`);
        }

        return found;
    }

    /**
     * Where a node is drawn now.
     * @param id - The node's id.
     * @returns Its position, copied.
     */
    function drawnAt(id: string): Coords {
        const { x, y, z } = nodeById(id).getPosition();
        return { x, y, z };
    }

    /**
     * Assert a node is drawn at a point.
     * @param id - The node's id.
     * @param expected - Where it should be, in scene units.
     */
    function assertAt(id: string, expected: readonly [number, number, number]): void {
        const at = drawnAt(id);
        assert.closeTo(at.x, expected[0], 1e-4, `node ${id} x`);
        assert.closeTo(at.y, expected[1], 1e-4, `node ${id} y`);
        assert.closeTo(at.z, expected[2], 1e-4, `node ${id} z`);
    }

    /**
     * The layout the session's catalogue offers under an id -- what a picker reads.
     * @param id - The layout's id.
     * @returns Its descriptor.
     */
    function offered(id: string): LayoutDescriptor {
        const found = graph
            .getSession()
            .catalog.layouts()
            .find((candidate) => candidate.id === id);
        if (!found) {
            return assert.fail(`the session's catalogue offers no layout "${id}"`);
        }

        return found;
    }

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();

        // Park on a one-pass built-in first, so every node has a position before the layout under
        // test runs, and the element's opening force simulation is not what a test sees settle.
        await graph.setLayout("circular");
        await settled("the circular layout");
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    describe("the guide's first example: rows by a tier attribute", () => {
        it("draws every node with a tier where place() put it, in scene units", async () => {
            const { useTiers } = await import("../../../docs/examples/simple-tier/layout-tiers");
            const unplacedBefore = drawnAt("f");

            await useTiers(graph);
            await settled("the tiers layout");

            // spacing 3 from the "use it" line; columns count up within each tier, in id order.
            assertAt("a", [0, 0, 0]);
            assertAt("b", [3, 0, 0]);
            assertAt("c", [0, 3, 0]);
            assertAt("d", [3, 3, 0]);
            assertAt("e", [6, 3, 0]);
            assert.deepEqual(drawnAt("f"), unplacedBefore, "the node with no tier was not placed by the layout");
        });

        it("draws a 2D layout flat in a 3D view: z = 0", async () => {
            await import("../../../docs/examples/simple-tier/layout-tiers");

            await graph.setLayout("acme-tiers");
            await settled("the tiers layout at its default spacing");

            for (const id of ["a", "b", "c", "d", "e"]) {
                assert.strictEqual(drawnAt(id).z, 0, `node ${id} is on the plane`);
            }

            assertAt("e", [4, 2, 0]);
        });
    });

    describe("the guide's second example: rows by a text category", () => {
        it("puts each category on its own row, in readable order, with the reader's own column", async () => {
            const { useCategoryRows } = await import("../../../docs/examples/simple-tier/layout-category-rows");
            const unplacedBefore = drawnAt("f");

            await useCategoryRows(graph);
            await settled("the category rows layout");

            // Groups in readable order: eng, ops, sales. Spacing 2, the default.
            assertAt("b", [0, 0, 0]);
            assertAt("c", [2, 0, 0]);
            assertAt("e", [0, 2, 0]);
            assertAt("a", [0, 4, 0]);
            assertAt("d", [2, 4, 0]);
            assert.deepEqual(drawnAt("f"), unplacedBefore, "the node with no department was not placed");
        });

        it("refuses an attribute no node carries, naming it and what the nodes do carry", async () => {
            await import("../../../docs/examples/simple-tier/layout-category-rows");

            // No binding: the layout reads its default, "category", which this graph lacks.
            const failure = await failureOf(() => graph.setLayout("acme-category-rows", {}, { skipQueue: true }));

            assert.strictEqual(failure.code, "E_OPTION_RANGE");
            assert.include(failure.message, "acme-category-rows");
            assert.include(failure.message, '"category"');
            assert.include(failure.message, "department", "the message lists an attribute the nodes do carry");
        });
    });

    describe("the guide's third example: coordinates the data carries", () => {
        it("places each node at its own x, y and z in a 3D view", async () => {
            const { usePrecomputed } = await import("../../../docs/examples/simple-tier/layout-precomputed");
            const unplacedBefore = drawnAt("f");

            await usePrecomputed(graph);
            await settled("the precomputed layout");

            assertAt("a", [1, 2, 3]);
            assertAt("b", [-1, 0.5, 0]);
            assertAt("c", [4, 4, 0]);
            assertAt("d", [0, -2, 5]);
            assertAt("e", [2, 2, -1]);
            assert.deepEqual(drawnAt("f"), unplacedBefore, "the node with no coordinates was not placed");
        });

        it("drops z in a 2D view", async () => {
            const { usePrecomputed } = await import("../../../docs/examples/simple-tier/layout-precomputed");
            await graph.setViewMode("2d");
            await settled("the switch to 2D");

            await usePrecomputed(graph);
            await settled("the precomputed layout in 2D");

            assertAt("a", [1, 2, 0]);
            assertAt("d", [0, -2, 0]);
            assertAt("e", [2, 2, 0]);
        });
    });

    describe("what place() returns that the layout cannot fully use", () => {
        it("places a node in a 2D view whatever its dropped z is", async () => {
            await graph.setViewMode("2d");
            await settled("the switch to 2D");
            defineLayout({
                id: "acme-bad-z",
                place: () =>
                    new Map<string, Point>([
                        ["a", [5, 6, Number.NaN]],
                        ["b", [7, 8]],
                    ]),
            });

            await graph.setLayout("acme-bad-z");
            await settled("the bad-z layout");

            assertAt("a", [5, 6, 0]);
            assertAt("b", [7, 8, 0]);
        });

        it("says so on the console with logging off: missing numbers and keys that are not nodes", async () => {
            await GraphtyLogger.configure({ enabled: false });
            const warned: string[] = [];
            const original = console.warn;
            console.warn = (...args: unknown[]) => warned.push(args.map(String).join(" "));
            try {
                defineLayout({
                    id: "acme-noisy",
                    place: (view) => {
                        const positions = new Map<string | number, Point>([["zz", [0, 0]]]);
                        for (const node of view.nodes()) {
                            const tier = node.number("tier");
                            if (tier !== undefined) {
                                positions.set(node.id, [0, tier]);
                            }
                        }
                        return positions;
                    },
                });

                await graph.setLayout("acme-noisy");
                await settled("the noisy layout");
            } finally {
                console.warn = original;
            }

            assert.include(warned, '[graphty] acme-noisy: 1 of 6 nodes has no number at "tier"; they were left out.');
            assert.include(
                warned,
                '[graphty] acme-noisy: place() returned positions for 1 keys that are not nodes ("zz"); they were left out.',
            );
        });
    });

    describe("defining a layout again", () => {
        it("takes the new options when the place function is the same", () => {
            const place = (): Map<string, Point> => new Map();
            defineLayout({ id: "acme-again", options: { spacing: 1 }, place });
            defineLayout({ id: "acme-again", options: { spacing: 5 }, dimensions: 2, place });

            const descriptor = layoutDescriptor("acme-again");
            assert.strictEqual(descriptor?.options.find((option) => option.name === "spacing")?.default, 5);
            assert.strictEqual(descriptor?.maxDimensions, 2);
        });
    });

    describe("pinned nodes", () => {
        it("leaves a pinned node where the reader put it", async () => {
            const { useTiers } = await import("../../../docs/examples/simple-tier/layout-tiers");
            nodeById("b").pin();
            const pinnedAt = drawnAt("b");

            await useTiers(graph);
            await settled("the tiers layout around a pin");

            assert.deepEqual(drawnAt("b"), pinnedAt, "the pinned node did not move");
            assertAt("a", [0, 0, 0]);
            assertAt("e", [6, 3, 0]);
        });

        it("tells place() where a pinned node is, so a layout can arrange around it", async () => {
            let seen: Point | null | undefined;
            let seenFree: Point | null | undefined;
            defineLayout({
                id: "acme-reads-pins",
                place(view, context) {
                    seen = context.fixed("b");
                    seenFree = context.fixed("a");
                    return new Map(view.nodes().map((node) => [node.id, [0, 0, 0] as const]));
                },
            });
            nodeById("b").pin();
            const pinnedAt = drawnAt("b");

            await graph.setLayout("acme-reads-pins");
            await settled("the layout that reads pins");

            assert.deepEqual(seen, [pinnedAt.x, pinnedAt.y, pinnedAt.z], "the pinned node's own position");
            assert.isNull(seenFree, "a free node has none");
        });
    });

    describe("the errors a beginner reads", () => {
        it("refuses a definition with no place function, at once and before anything is registered", () => {
            let error: unknown;
            try {
                defineLayout({ id: "acme-no-place" } as unknown as Parameters<typeof defineLayout>[0]);
            } catch (thrown) {
                error = thrown;
            }

            assert.isTrue(isGraphtyError(error), "a GraphtyError");
            const failure = error as GraphtyError;
            assert.strictEqual(failure.code, "E_BAD_COMMAND");
            assert.strictEqual(
                failure.message,
                'defineLayout("acme-no-place"): "place" must be a function; got undefined.',
            );
            assert.strictEqual(failure.details.field, "place");
            assert.notInclude(LayoutEngine.getRegisteredTypes(), "acme-no-place");
            assert.isUndefined(layoutDescriptor("acme-no-place"));
        });

        it("names the mistake when place() keys its map by something that is not a node id", async () => {
            defineLayout({
                id: "acme-wrong-keys",
                place(view) {
                    const positions = new Map<number, Point>();
                    view.nodes().forEach((_node, index) => positions.set(index, [index, 0]));
                    return positions;
                },
            });

            const failure = await failureOf(() => graph.setLayout("acme-wrong-keys", {}, { skipQueue: true }));

            assert.strictEqual(failure.code, "E_EXTENSION_FAILED");
            assert.include(
                failure.message,
                "acme-wrong-keys: place() returned 6 positions but no key matches a node id",
            );
            assert.include(failure.message, "node ids here are strings");
            assert.strictEqual(failure.details.extension, "acme-wrong-keys");
        });

        it("reports a throw from place() as the plugin's own failure, keeping the original", async () => {
            const original = new TypeError("Cannot read properties of undefined (reading 'tier')");
            defineLayout({
                id: "acme-broken",
                place() {
                    throw original;
                },
            });

            const failure = await failureOf(() => graph.setLayout("acme-broken", {}, { skipQueue: true }));

            assert.strictEqual(failure.code, "E_EXTENSION_FAILED");
            assert.strictEqual(
                failure.message,
                "acme-broken: place() threw (TypeError: Cannot read properties of undefined (reading 'tier')).",
            );
            assert.strictEqual(failure.details.member, "place");
            assert.strictEqual(failure.cause, original);
        });
    });

    describe("a simple layout is an ordinary layout", () => {
        /** The advanced twin of the tiers example, written the way layout.md section 10 writes one. */
        class AdvancedTiers extends SimpleLayoutEngine {
            static type = "test-advanced-tiers";
            static maxDimensions: 2 | 3 = 2;
            static descriptor: AuthoredLayoutDescriptor = {
                id: "test-advanced-tiers",
                plainName: "Advanced tiers",
                technicalName: "Advanced tiers",
                description: "",
                family: "custom",
                kind: "batch",
                maxDimensions: 2,
                sizeRating: "any",
                structuralInputs: [],
                engine: "test-advanced-tiers",
                options: [],
            };

            doLayout(): void {
                this.positions = {};
            }
        }

        it("publishes the catalogue entry the element fills in, in the advanced tier's own shape", async () => {
            await import("../../../docs/examples/simple-tier/layout-tiers");
            if (!LayoutEngine.getRegisteredTypes().includes("test-advanced-tiers")) {
                LayoutEngine.register(AdvancedTiers);
            }

            const simple = offered("acme-tiers");
            const advanced = offered("test-advanced-tiers");

            assert.sameMembers(Object.keys(simple), Object.keys(advanced), "the same members as an advanced layout");
            assert.deepEqual(simple, {
                id: "acme-tiers",
                plainName: "Acme tiers",
                technicalName: "Acme tiers",
                description: "",
                family: "custom",
                kind: "batch",
                maxDimensions: 2,
                sizeRating: "any",
                structuralInputs: [],
                options: expandOptions("defineLayout", "acme-tiers", {
                    tier: { type: "attribute", default: "tier" },
                    spacing: 2,
                }),
                engine: "acme-tiers",
                honoursWeights: false,
                scoped: true,
            });
            assert.deepEqual(layoutDescriptor("acme-tiers"), simple, "the catalogue entry point says the same");
            assert.strictEqual(layoutIdForEngine("acme-tiers"), "acme-tiers", "one key, not two");
            assert.include(LayoutEngine.getRegisteredTypes(), "acme-tiers", "filed in the one layout registry");
        });

        it("refuses a misspelt option exactly as it refuses one for an advanced layout", async () => {
            await import("../../../docs/examples/simple-tier/layout-tiers");

            const failure = await failureOf(() => graph.setLayout("acme-tiers", { spacng: 3 }, { skipQueue: true }));

            assert.strictEqual(failure.code, "E_UNKNOWN_OPTION");
            assert.include(failure.details.candidates as readonly string[], "spacing");
        });
    });
});
