/**
 * @file What `defineLayout` does for the author on a rendered graph, beyond the guide's examples
 * (design/extensions/simple-tier.md section 4.2): parity with a hand-written advanced layout, the
 * view's dimensions, unplaced and malformed positions, seeded randomness, a graph that changes
 * after the layout ran, and cancellation.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import {
    type AuthoredLayoutDescriptor,
    defineLayout,
    type GraphtyError,
    isGraphtyError,
    type LayoutDescriptor,
    LayoutEngine,
    type Point,
    SimpleLayoutEngine,
} from "../../../extend";
import { Graph } from "../../../index.js";
import { expandOptions } from "../../../src/simple/options";

const NODES = [
    { id: "a", tier: 0 },
    { id: "b", tier: 0 },
    { id: "c", tier: 1 },
    { id: "d", tier: 1 },
    { id: "e", tier: 1 },
];

const EDGES = [
    { src: "a", dst: "c" },
    { src: "b", dst: "d" },
    { src: "b", dst: "e" },
];

const FRAME_MS = 16;
const PATIENCE_MS = 5000;

/** The tiers layout's options, as both twins declare them. */
const TIER_OPTIONS = { tier: { type: "attribute", default: "tier" }, spacing: 2 } as const;

/**
 * Wait one frame.
 * @param ms - How long.
 * @returns A promise.
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Wait until a condition holds.
 * @param what - What is awaited, for the failure.
 * @param check - The condition.
 */
async function until(what: string, check: () => boolean): Promise<void> {
    const deadline = Date.now() + PATIENCE_MS;
    while (!check()) {
        if (Date.now() > deadline) {
            throw new Error(`timed out waiting for ${what}`);
        }

        await delay(FRAME_MS);
    }
}

/**
 * Run something that must fail, and hand back the failure.
 * @param act - What to try.
 * @returns The GraphtyError.
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

/** The advanced twin of the tiers layout, hand-written as layout.md section 10 writes one. */
class AdvancedTiers extends SimpleLayoutEngine {
    static type = "test-parity-advanced";
    static maxDimensions: 2 | 3 = 2;
    static scoped = true;
    static descriptor: AuthoredLayoutDescriptor = {
        id: "test-parity-advanced",
        plainName: "Test parity advanced",
        technicalName: "Test parity advanced",
        description: "",
        family: "custom",
        kind: "batch",
        maxDimensions: 2,
        sizeRating: "any",
        structuralInputs: [],
        options: expandOptions("defineLayout", "test-parity-advanced", TIER_OPTIONS),
        engine: "test-parity-advanced",
    };

    private readonly spacing: number;

    constructor(opts: { spacing?: number } = {}) {
        super(opts);
        this.scalingFactor = 1;
        this.spacing = opts.spacing ?? 2;
    }

    doLayout(): void {
        this.stale = false;
        this.positions = {};
        const used = new Map<number, number>();
        const nodes = [...this._nodes].sort((x, y) => String(x.id).localeCompare(String(y.id)));
        for (const node of nodes) {
            const { tier } = node.data as { tier?: unknown };
            if (typeof tier !== "number") {
                continue;
            }

            const column = used.get(tier) ?? 0;
            used.set(tier, column + 1);
            this.positions[node.id] = [column * this.spacing, tier * this.spacing, 0];
        }
    }
}

defineLayout({
    id: "test-parity-simple",
    dimensions: 2,
    options: TIER_OPTIONS,
    place(graph, { options }) {
        const positions = new Map<string | number, Point>();
        const used = new Map<number, number>();
        for (const node of graph.nodes()) {
            const tier = node.number(options.tier);
            if (tier === undefined) {
                continue;
            }

            const column = used.get(tier) ?? 0;
            used.set(tier, column + 1);
            positions.set(node.id, [column * options.spacing, tier * options.spacing]);
        }

        return positions;
    },
});

describe("defineLayout's defaults on a rendered graph", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    /**
     * Wait until the element has finished drawing with the current layout.
     * @param what - How to describe the wait if it fails.
     */
    async function settled(what: string): Promise<void> {
        await graph.operationQueue.waitForCompletion();
        const manager = graph.getLayoutManager();
        await until(what, () => (manager.layoutEngine?.isSettled ?? false) && !manager.running);
    }

    /**
     * Every node's drawn position.
     * @returns Positions by id.
     */
    function drawn(): Record<string, [number, number, number]> {
        const out: Record<string, [number, number, number]> = {};
        for (const { id } of NODES) {
            const node = graph.getNode(id);
            assert.isDefined(node, `node ${id}`);
            const { x, y, z } = node.getPosition();
            out[id] = [x, y, z];
        }

        return out;
    }

    /**
     * The catalogue entry a picker reads.
     * @param id - The layout's id.
     * @returns The descriptor.
     */
    function offered(id: string): LayoutDescriptor {
        const found = graph
            .getSession()
            .catalog.layouts()
            .find((candidate) => candidate.id === id);
        return found ?? assert.fail(`no layout "${id}" offered`);
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
        await graph.setLayout("circular");
        await settled("the circular layout");
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("places every node exactly where a hand-written advanced twin does, from the same catalogue shape", async () => {
        if (!LayoutEngine.getRegisteredTypes().includes("test-parity-advanced")) {
            LayoutEngine.register(AdvancedTiers);
        }

        await graph.setLayout("test-parity-advanced", { spacing: 3 });
        await settled("the advanced twin");
        const advanced = drawn();

        await graph.setLayout("test-parity-simple", { spacing: 3 });
        await settled("the simple twin");

        assert.deepEqual(drawn(), advanced, "the same positions");
        assert.deepEqual(advanced.e, [6, 3, 0], "the third node of tier 1 at spacing 3");

        const renamed = (entry: LayoutDescriptor): LayoutDescriptor => ({
            ...entry,
            id: "x",
            engine: "x",
            plainName: "x",
            technicalName: "x",
            options: entry.options.map((option) => ({ ...option })),
        });
        assert.deepEqual(renamed(offered("test-parity-simple")), renamed(offered("test-parity-advanced")));
    });

    it("tells place() the view's dimensions", async () => {
        const seen: number[] = [];
        defineLayout({
            id: "test-dimensions",
            place(_graph, context) {
                seen.push(context.dimensions);
                return new Map();
            },
        });

        await graph.setLayout("test-dimensions");
        await settled("the layout in 3D");
        await graph.setViewMode("2d");
        await settled("the switch to 2D");
        await graph.setLayout("test-dimensions");
        await settled("the layout in 2D");

        assert.deepEqual(seen.slice(0, 1), [3]);
        assert.strictEqual(seen.at(-1), 2);
    });

    it("leaves a node given null or a non-finite number unplaced", async () => {
        defineLayout({
            id: "test-unplaced",
            place: () =>
                new Map<string, Point | null>([
                    ["a", [1, 1]],
                    ["b", null],
                    ["c", [Number.NaN, 0]],
                    ["d", [0, Number.POSITIVE_INFINITY, 0]],
                ]),
        });
        const before = drawn();

        await graph.setLayout("test-unplaced");
        await settled("the layout");

        const after = drawn();
        assert.deepEqual(after.a, [1, 1, 0]);
        assert.deepEqual(after.b, before.b);
        assert.deepEqual(after.c, before.c);
        assert.deepEqual(after.d, before.d);
    });

    it("refuses a position that is not two or three numbers, naming the node", async () => {
        defineLayout({
            id: "test-malformed",
            place: () => new Map([["c", [1] as unknown as Point]]),
        });

        const failure = await failureOf(() => graph.setLayout("test-malformed", {}, { skipQueue: true }));

        assert.strictEqual(failure.code, "E_EXTENSION_FAILED");
        assert.strictEqual(
            failure.message,
            'test-malformed: place() returned [1] for node "c". A position is two or three numbers; leave the ' +
                "node out to leave it unplaced.",
        );
    });

    it("seeds context.random(): the same numbers every run, and a given seed repeats a random layout", async () => {
        const draws: number[][] = [];
        const place = (
            view: Parameters<Parameters<typeof defineLayout>[0]["place"]>[0],
            context: { random(): number },
        ): Map<string | number, Point> => {
            const run = view.nodes().map(() => context.random());
            draws.push(run);
            return new Map(view.nodes().map((node, index) => [node.id, [run[index] * 10, 0]]));
        };
        defineLayout({ id: "test-seeded", place });
        defineLayout({ id: "test-random-seeded", random: true, place: (view, context) => place(view, context) });

        await graph.setLayout("test-seeded");
        await settled("the first run");
        await graph.setLayout("test-seeded");
        await settled("the second run");
        await graph.setLayout("test-random-seeded", { seed: 7 });
        await settled("the random layout with seed 7");
        await graph.setLayout("test-random-seeded", { seed: 7 });
        await settled("seed 7 again");
        await graph.setLayout("test-random-seeded", { seed: 8 });
        await settled("seed 8");

        assert.lengthOf(draws, 5);
        assert.deepEqual(draws[1], draws[0], "deterministic without random: true");
        assert.deepEqual(draws[3], draws[2], "the same seed, the same numbers");
        assert.notDeepEqual(draws[4], draws[2], "another seed, other numbers");
        assert.isTrue(draws.flat().every((value) => value >= 0 && value < 1));
    });

    it("places a node added after the layout ran", async () => {
        let runs = 0;
        defineLayout({
            id: "test-follows-changes",
            place(view) {
                runs++;
                return new Map(view.nodes().map((node, index) => [node.id, [index, 0]]));
            },
        });

        await graph.setLayout("test-follows-changes");
        await settled("the first run");
        const firstRuns = runs;
        await graph.addNodes([{ id: "f", tier: 2 }]);

        await until("the layout to place the new node", () => {
            const node = graph.getNode("f");
            return node !== undefined && node.getPosition().x === 5 && node.getPosition().y === 0;
        });
        assert.isAbove(runs, firstRuns, "place ran again over the larger graph");
        assert.deepEqual(drawn().e, [4, 0, 0]);
    });

    it("aborts a run when its layout is replaced, and progress() rejects", async () => {
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        let runs = 0;
        let signal: AbortSignal | undefined;
        let outcome: unknown = "pending";
        defineLayout({
            id: "test-cancelled",
            async place(view, context) {
                runs++;
                if (runs > 1) {
                    ({ signal } = context);
                    await gate;
                    try {
                        await context.progress(0.5);
                        outcome = "resumed";
                    } catch (error) {
                        outcome = error;
                        throw error;
                    }
                }

                return new Map(view.nodes().map((node) => [node.id, [0, 0]]));
            },
        });

        await graph.setLayout("test-cancelled");
        await settled("the first run");
        await graph.addNodes([{ id: "f" }]);
        await until("a second run to start", () => signal !== undefined);

        await graph.setLayout("circular");
        release();
        await until("progress() to settle", () => outcome !== "pending");

        assert.isTrue(signal?.aborted, "the run's signal is aborted");
        assert.notStrictEqual(outcome, "resumed", "progress() rejected instead of resuming");
    });
});
