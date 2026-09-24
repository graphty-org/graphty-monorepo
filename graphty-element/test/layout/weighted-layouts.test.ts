/**
 * Edge weights reaching the two layouts that can read one, and what a weight MEANS once it gets
 * there.
 *
 * Before this, both engines built a bare two-element `[source, target]` tuple and handed it to
 * `@graphty/layout`, whose only weight channel is a third member on the graph object called
 * `getEdgeData`. Neither engine supplied one, so every edge arrived weighted 1 -- while both
 * engines still accepted and forwarded a weight OPTION, so a reader who set it saw nothing happen
 * and had nothing to tell them why.
 *
 * The convention this file exists to pin, because nothing on screen states it and getting it
 * backwards produces a plausible-looking wrong picture: A LARGER WEIGHT IS A STRONGER CONNECTION,
 * and a stronger connection is drawn SHORTER. That is one reading for the whole element -- it is
 * what a weighted centrality means by a weight, and what a style layer that thickens an edge by
 * its weight means. The two engines have to do OPPOSITE arithmetic to obey it, because the two
 * layout functions disagree about what the number is: ForceAtlas2 reads it as an attraction
 * strength and takes it as stored, while Kamada-Kawai feeds it to Floyd-Warshall as a graph
 * DISTANCE, so the element hands that one the reciprocal instead.
 *
 * THE FIXTURE IS A MIRROR, and deliberately so. Every graph here is the four-node path
 * a - b - c - e, whose two end edges a-b and c-e are structurally interchangeable: same degrees,
 * same distance to everything else. So the two are drawn the same length whenever they are
 * weighted the same, and any difference between them is the weight and nothing else. A three-node
 * path will not do this -- its two edges meet at a hub whose degree differs from its leaves', and
 * ForceAtlas2 scales every force by degree.
 *
 * The graphs are real frozen snapshots, because the weight the engines read is the one the store
 * holds, gathered through the same logical edge index `Edge.index` carries. The nodes and edges
 * are the bare shape a layout engine uses -- a real `Node` builds a Babylon mesh in its
 * constructor, and none of this has anything to do with a mesh.
 */
import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { kamadaKawaiLayout } from "@graphty/layout";
import { assert, describe, it } from "vitest";

import { LAYOUT_CATALOG } from "../../src/catalog/layouts";
import type { OptionDescriptor } from "../../src/catalog/types";
import { ElementPositions } from "../../src/data/positions";
import type { Edge } from "../../src/Edge";
import { CircularLayout } from "../../src/layout/CircularLayoutEngine";
import { ForceAtlas2Layout } from "../../src/layout/ForceAtlas2LayoutEngine";
import { KamadaKawaiLayout } from "../../src/layout/KamadaKawaiLayoutEngine";
import type { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import type { Node } from "../../src/Node";

/** One edge of a test graph: two node ids and the weight the store will hold for it. */
type WeightedEdge = readonly [source: string, target: string, weight: number];

/** Where every node of an arrangement ended up, in scene units, by node id. */
type Arrangement = Record<string, readonly [number, number, number]>;

/** A graph as the layout engines see one, plus the array they publish into. */
interface TestGraph {
    readonly nodes: Node[];
    readonly edges: Edge[];
    readonly positions: ElementPositions;
    readonly snapshot: GraphSnapshot;
}

/**
 * Freeze a real weighted snapshot and wrap it in the stand-ins a layout engine reads.
 *
 * The node and edge stand-ins are derived FROM THE SNAPSHOT rather than from the list that built
 * it, so an edge's `index` is the logical index the store actually assigned -- which is the index
 * its weight is read at. Deriving them from the input list instead would pass even if those two
 * index spaces had drifted apart, which is the only failure this lookup can have.
 * @param edges - the edges to build, in order
 * @returns the graph
 */
function graphOf(edges: readonly WeightedEdge[]): TestGraph {
    const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
    for (const [source, target, weight] of edges) {
        builder.addEdge(source, target, weight);
    }

    const snapshot = builder.freeze({ label: "weighted-layout-test" });
    const positions = new ElementPositions(0);
    positions.grow(snapshot.nodeCount);

    const parentGraph = {
        getDataManager: () => ({
            getSnapshot: () => snapshot,
            positions,
        }),
    };

    const nodes: Node[] = [];
    for (let index = 0; index < snapshot.nodeCount; index++) {
        nodes.push({ id: String(snapshot.ids.idOf(index)), index, parentGraph } as unknown as Node);
    }

    const list = snapshot.edgeList();
    const built: Edge[] = [];
    for (let index = 0; index < snapshot.edgeCount; index++) {
        const srcNode = nodes[list.src[index]];
        const dstNode = nodes[list.dst[index]];
        built.push({
            srcId: srcNode.id,
            dstId: dstNode.id,
            srcNode,
            dstNode,
            index,
            parentGraph,
        } as unknown as Edge);
    }

    return { nodes, edges: built, positions, snapshot };
}

/**
 * The mirror fixture: the path a - b - c - e, with the two end edges weighted as asked.
 * @param ab - the weight of the a-b edge
 * @param ce - the weight of the c-e edge
 * @returns the graph
 */
function mirrorPath(ab: number, ce: number): TestGraph {
    return graphOf([
        ["a", "b", ab],
        ["b", "c", 1],
        ["c", "e", ce],
    ]);
}

/**
 * Run one engine over one graph and hand back where every node ended up.
 * @param engine - the engine to drive
 * @param graph - the graph to arrange
 * @returns node id to its published coordinates, in scene units
 */
function arrange(engine: SimpleLayoutEngine, graph: TestGraph): Arrangement {
    engine.attachPositions(graph.positions);
    engine.addNodes(graph.nodes);
    engine.addEdges(graph.edges);
    engine.publishPositions();

    const out: Record<string, readonly [number, number, number]> = {};
    const read = { x: 0, y: 0, z: 0 };
    for (const node of graph.nodes) {
        graph.positions.read(node.index, read);
        out[String(node.id)] = [read.x, read.y, read.z];
    }

    return out;
}

/**
 * The drawn distance between two arranged nodes.
 * @param placed - the arrangement
 * @param a - one node id
 * @param b - the other node id
 * @returns the euclidean distance
 */
function distance(placed: Arrangement, a: string, b: string): number {
    const [ax, ay, az] = placed[a];
    const [bx, by, bz] = placed[b];
    return Math.hypot(ax - bx, ay - by, az - bz);
}

/** Kamada-Kawai, in two dimensions. */
function kamadaKawai(weighted = true): KamadaKawaiLayout {
    return new KamadaKawaiLayout({ dim: 2, scale: 1, weighted });
}

/** ForceAtlas2, in two dimensions, from one fixed seed so two runs can be compared. */
function forceAtlas2(weighted = true): ForceAtlas2Layout {
    return new ForceAtlas2Layout({ dim: 2, seed: 42, maxIter: 300, weighted });
}

/**
 * Whether two arrangements place every node in the same spot, allowing for the f32 the position
 * array rounds every coordinate to.
 * @param a - one arrangement
 * @param b - the other
 * @returns true when nothing moved
 */
function samePlaces(a: Arrangement, b: Arrangement): boolean {
    const ids = Object.keys(a);
    if (ids.length !== Object.keys(b).length) {
        return false;
    }

    return ids.every((id) => b[id] !== undefined && a[id].every((value, axis) => Math.abs(value - b[id][axis]) < 1e-3));
}

describe("edge weights and the two layouts that read them", () => {
    describe("ForceAtlas2", () => {
        it("draws the heavier of two otherwise identical edges shorter", () => {
            // ForceAtlas2 reads a weight as an attraction STRENGTH, which already matches what a
            // weight means in the element, so the element hands the stored number over as it
            // stands. Both halves are asserted: the heavy end is short, and moving the weight to
            // the other end moves the short edge with it -- so this cannot pass because of some
            // fixed asymmetry in the fixture.
            const heavyOnTheLeft = arrange(forceAtlas2(), mirrorPath(4, 1));
            assert.isBelow(
                distance(heavyOnTheLeft, "a", "b"),
                distance(heavyOnTheLeft, "c", "e"),
                "a-b carries four times the weight of its mirror image, so it is drawn shorter",
            );

            const heavyOnTheRight = arrange(forceAtlas2(), mirrorPath(1, 4));
            assert.isBelow(
                distance(heavyOnTheRight, "c", "e"),
                distance(heavyOnTheRight, "a", "b"),
                "move the weight to the other end and the short edge moves with it",
            );
        });

        it("does not turn an edge the author weighted zero into a full-strength edge", () => {
            // `@graphty/layout` reads a weight as `getEdgeData(...) || 1`, so a deliberate zero
            // would arrive as ONE -- "no connection at all" silently becoming "an ordinary
            // connection", with the graph drawn as though the author had never written the zero.
            // The element clamps to an epsilon first, so a zero reads as the weakest connection
            // the solver can express. The comparison against the all-ones graph is what makes this
            // fail rather than pass by accident: under `|| 1` the two are the same picture.
            const zeroed = arrange(forceAtlas2(), mirrorPath(0, 1));
            const ones = arrange(forceAtlas2(), mirrorPath(1, 1));

            assert.isFalse(
                samePlaces(zeroed, ones),
                "a weight of zero is not the same instruction as a weight of one",
            );
            assert.isAbove(
                distance(zeroed, "a", "b"),
                distance(zeroed, "c", "e"),
                "the edge weighted zero is the weakest pull in the graph, so its endpoints end furthest apart",
            );
        });

        it("arranges a graph whose every weight is 1 exactly as it arranges one with weights turned off", () => {
            // The callback is attached only when the weights carry information, and an all-ones
            // graph carries none. This is what makes the release's visual re-baseline reviewable:
            // an unweighted story that MOVED is a bug, not a new arrangement.
            const asked = arrange(forceAtlas2(true), mirrorPath(1, 1));
            const refused = arrange(forceAtlas2(false), mirrorPath(1, 1));

            assert.isTrue(samePlaces(asked, refused), "nothing moved");
        });

        it("lets a reader who has weights decline to be arranged by them", () => {
            const on = arrange(forceAtlas2(true), mirrorPath(8, 1));
            const off = arrange(forceAtlas2(false), mirrorPath(8, 1));

            assert.isFalse(samePlaces(on, off), "`weighted: false` is a real opt-out, not a control that does nothing");
        });
    });

    describe("Kamada-Kawai", () => {
        it("asks the solver for the RECIPROCAL of a weight, because that solver reads its number as a distance", () => {
            // THE ASSERTION IS MADE AT THE REQUEST, not at the picture, and that is a deliberate
            // choice rather than a convenience. `@graphty/layout`'s Kamada-Kawai solver does not
            // converge from its own default starting layout once the ideal distances stop being
            // uniform -- started at the exact optimum it stays there, started from its circular
            // seed it settles somewhere with a stress many times higher -- so the drawn lengths it
            // produces cannot be used to tell a correct request from a backwards one. What the
            // element is responsible for is asking for the right thing, and that is what is pinned
            // here: the arrangement the engine produces is the one the same layout function
            // produces when it is handed 1/weight by hand, and is NOT the one it produces when it
            // is handed the weight itself. Drop the inversion and the second assertion fires.
            const arranged = arrange(kamadaKawai(), mirrorPath(4, 1));

            const asDistances = directKamadaKawai({ "a|b": 1 / 4, "b|c": 1, "c|e": 1 });
            const asWeights = directKamadaKawai({ "a|b": 4, "b|c": 1, "c|e": 1 });

            assert.isTrue(
                samePlaces(arranged, asDistances),
                "the engine asked for 1/weight, which is a distance",
            );
            assert.isFalse(
                samePlaces(arranged, asWeights),
                "and not for the weight itself, which would draw a strong connection long",
            );
        });

        it("arranges a graph whose every weight is 1 exactly as it arranges one with weights turned off", () => {
            const asked = arrange(kamadaKawai(true), mirrorPath(1, 1));
            const refused = arrange(kamadaKawai(false), mirrorPath(1, 1));

            assert.isTrue(samePlaces(asked, refused), "nothing moved");
        });

        it("lets a reader who has weights decline to be arranged by them", () => {
            const on = arrange(kamadaKawai(true), mirrorPath(8, 1));
            const off = arrange(kamadaKawai(false), mirrorPath(8, 1));

            assert.isFalse(samePlaces(on, off), "`weighted: false` is a real opt-out, not a control that does nothing");
        });

        it("sums two parallel edges into one pair weight instead of letting the last one win", () => {
            // Both layout functions ask by ordered endpoint pair and write the answer into one
            // matrix cell, so there is nowhere to put a second edge between the same two nodes.
            // Left to last-writer-wins, the order the file happened to list its edges in would
            // decide the arrangement, and the same graph re-exported in another order would draw
            // differently.
            const parallel = arrange(kamadaKawai(), graphOf([["a", "b", 2], ["a", "b", 3], ["b", "c", 1]]));
            const reversed = arrange(kamadaKawai(), graphOf([["a", "b", 3], ["a", "b", 2], ["b", "c", 1]]));
            const summed = arrange(kamadaKawai(), graphOf([["a", "b", 5], ["b", "c", 1]]));

            assert.isTrue(samePlaces(parallel, reversed), "the order the parallel edges arrived in changes nothing");
            assert.isTrue(samePlaces(parallel, summed), "and edges of 2 and 3 arrange exactly as one edge of 5");
        });
    });

    it("advertises which engines read weights at all, so a picker offers the option on those two only", () => {
        assert.isTrue(KamadaKawaiLayout.honoursWeights, "Kamada-Kawai reads weights");
        assert.isTrue(ForceAtlas2Layout.honoursWeights, "ForceAtlas2 reads weights");
        assert.isFalse(
            CircularLayout.honoursWeights,
            "a circular arrangement has no weight channel, and offering the option would be a lie",
        );
    });

    it("publishes the weights option to the catalogue, which is what a reader's layout picker reads", () => {
        // The option it replaces never got this far. ForceAtlas2's `weightPath` was declared only
        // on the Zod config and not on the options schema, so no picker could reach it at all, and
        // Kamada-Kawai's `weightProperty` asked a reader to type an attribute name for a control
        // that did nothing. One boolean, declared where the catalogue reads it, for both engines.
        const named = (engine: string): readonly OptionDescriptor[] =>
            LAYOUT_CATALOG.flatMap((catalogued) => catalogued.implementations)
                .filter((implementation) => implementation.engine === engine)
                .flatMap((implementation) => implementation.options);

        for (const engine of ["kamada-kawai", "forceatlas2"]) {
            const options = named(engine);
            assert.isNotEmpty(options, `${engine} is in the catalogue`);
            assert.isTrue(
                options.some((option) => option.name === "weighted"),
                `${engine} offers the weights option to a picker`,
            );
            assert.isFalse(
                options.some((option) => option.name === "weightProperty" || option.name === "weightPath"),
                `${engine} no longer offers a control that names an attribute and does nothing`,
            );
        }
    });

    it("carries the same fact onto every descriptor a picker reads, taken from the engine class", () => {
        // The static existed and nothing read it, so a picker still could not tell a reader which
        // arrangements the weight control does anything for. The descriptor is where a picker
        // looks, and its value is copied off the DEFAULT engine's class rather than written out
        // by hand, so the catalogue cannot claim a weight channel an engine does not have.
        const byEngine = new Map(
            LAYOUT_CATALOG.flatMap((catalogued) => catalogued.implementations).map((implementation) => [
                implementation.engine,
                implementation.honoursWeights,
            ]),
        );

        assert.strictEqual(byEngine.get("kamada-kawai"), true);
        assert.strictEqual(byEngine.get("forceatlas2"), true);
        assert.strictEqual(byEngine.get("ngraph"), false);
        assert.strictEqual(byEngine.get("circular"), false);

        for (const catalogued of LAYOUT_CATALOG) {
            const primary = catalogued.implementations.find((implementation) => implementation.isDefault);
            assert.isDefined(primary, `${catalogued.descriptor.id} names a default engine`);
            assert.strictEqual(
                catalogued.descriptor.honoursWeights,
                primary?.honoursWeights,
                `${catalogued.descriptor.id} publishes what its default engine actually does`,
            );
        }
    });
});

/**
 * Run `@graphty/layout`'s Kamada-Kawai over the mirror path with a weight channel written by hand,
 * and scale the answer the way the engine scales it.
 *
 * This is the "what should the element have asked for?" side of the reciprocal test above.
 * @param table - what `getEdgeData` should answer, keyed `source|target`
 * @returns the arrangement in scene units
 */
function directKamadaKawai(table: Readonly<Record<string, number>>): Arrangement {
    const ids = ["a", "b", "c", "e"];
    const pairs: [string, string][] = [
        ["a", "b"],
        ["b", "c"],
        ["c", "e"],
    ];
    const placed = kamadaKawaiLayout(
        {
            nodes: () => ids,
            edges: () => pairs,
            getEdgeData: (source, target) => table[`${String(source)}|${String(target)}`],
        },
        null,
        null,
        "weight",
        1,
        null,
        2,
    );

    // The engine multiplies every coordinate by its scaling factor and stores it as an f32, so the
    // comparison has to be made against the same numbers rather than against the raw doubles.
    const scale = new KamadaKawaiLayout({ dim: 2, scale: 1 }).scalingFactor;
    const out: Record<string, readonly [number, number, number]> = {};
    for (const id of ids) {
        const position = placed[id];
        out[id] = [
            Math.fround(position[0] * scale),
            Math.fround(position[1] * scale),
            Math.fround((position[2] ?? 0) * scale),
        ];
    }

    return out;
}
