/**
 * The element's simulation bridge against the Fruchterman-Reingold reference, one iteration at a
 * time.
 *
 * WHAT WAS MISSING. `@graphty/layout`'s `FruchtermanReingoldSimulation` is held to an independent
 * f64 transcription of the same force model -- `webgpu-graph-algorithms/test/oracle/fruchterman-reingold.ts`,
 * driven by that package's `test/layouts/fr-layout-oracle.test.ts` -- and so is the GPU
 * simulation. `SimulationLayoutEngine` is the third driver of that model and the only one nothing
 * held to it, which is how a regression that cost Spring nine tenths of its cooling schedule
 * reached a pull request: every story still rendered, every counter still reported its full
 * budget, and the picture was simply a tangle.
 *
 * WHAT THIS PROVES, and it is not the force model -- that is proven elsewhere, three times over.
 * It is the SHELL the element wraps around it: which options reach the simulation, what it is
 * stepped FROM, what temperature it is on at each step, what units it publishes in, and that
 * nothing writes back into the simulation between steps. Those are exactly the ways a driver can
 * be wrong while the model is right, and the regression this file was written for was one of
 * them: a `reheat()` after a `load()`, which on this model moves the temperature index to 70% of
 * the budget, so a graph whose data arrived after its layout was set ran fifteen of its fifty
 * iterations starting a third of the way down the schedule.
 *
 * THE ORDER IS THE POINT. Every case sets the layout over an EMPTY graph and lets the data arrive
 * afterwards, because that is the commonest graph there is -- an element constructed, then
 * filled -- and it is the order that put a freeze between the layout and its first step. The
 * layout is set through `Graph.setLayout`, so the bridge is the one `LayoutManager` built from
 * the element's own configuration rather than one constructed here; and the last case spends its
 * iterations through `behavior.layout.preSteps`, which is `LayoutManager`'s budget rather than
 * the bridge's, so the shell ABOVE the bridge is walked too.
 *
 * HOW THE TWO ARE COMPARED. The bridge runs the simulation in an array of its own and refits the
 * arrangement into the element's scene envelope on the way out (see `SimulationLayoutEngine`'s
 * file header), and that refit is a similarity: a common centre and a common multiplier. So the
 * oracle's layout-unit positions are published through the very same rule, `measureEnvelope` at
 * the same radius, and the two are compared as published coordinates. A relative error is
 * invariant under a common multiplier, so the number this file prints is in the oracle's own
 * units and is directly comparable to the cap below.
 *
 * THE TOLERANCE AND THE HORIZONS are the ones `fr-layout-oracle.test.ts` established, not new
 * ones: the `fr-layout-oracle` cap of 1e-3 from that package's `P5_TOLERANCE_CAPS`, the floored
 * per-node metric of spec 11.4 at a floor fraction of 1e-3 (`fa2-parity.ts`'s `FLOOR_FRACTION`),
 * and its admission rule -- a horizon is asserted only where the trajectory's own
 * eight-perturbation spread and the f32 oracle's distance from the f64 one both sit under a
 * third of the cap. Neither the caps table nor the admission helper can be imported here: both
 * sit behind `test/helpers/noise-floor.ts`, which reads the recorded floors with `node:fs`, and
 * the element's bridge cannot be driven outside a browser. The two values are therefore named
 * below with a pointer to where they are kept, and the admission itself is measured with the
 * oracle on every run and printed beside the parity error.
 *
 * Measured 2026-09-24 on the 10-by-10 grid below, seed 12, k at its default, a budget of 50
 * (spread / f32 distance, against a third of the cap, 3.333e-4): 3D horizon 1 1.743e-7 /
 * 2.225e-7, 5 4.250e-7 / 2.553e-6, 10 2.802e-7 / 2.761e-6, 20 5.739e-7 / 5.379e-6, 50 4.269e-6 /
 * 8.910e-5 -- every one admitted, which is why the 3D case asserts all the way to the budget. 2D
 * horizon 1 3.837e-7 / 7.916e-6, 5 2.490e-5 / 3.659e-5, both admitted; 10 1.378e-3 / 4.363e-3 is
 * not, and is printed instead. The grid is well conditioned on purpose: the 77-node story graph
 * this regression was found on goes chaotic by its fifth iteration in 2D, where the spread is
 * already 1.880e-3, and would admit nothing past the first.
 */
import type { F32, GraphSnapshot } from "@graphty/graph-format";
import { type LayoutSimulation, seedPositions } from "@graphty/layout";
import { afterEach, assert, describe, it, vi } from "vitest";

// The reference and its metric, from the package that owns them. Nothing else in that test tree
// can be reached from a browser: see the file header.
import { flooredRelError } from "../../../webgpu-graph-algorithms/test/helpers/matchers.js";
import { FruchtermanReingoldOracle } from "../../../webgpu-graph-algorithms/test/oracle/fruchterman-reingold.js";
import type { Graph } from "../../src/Graph";
import { measureEnvelope, SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { cleanupE2EGraph, createE2EGraph } from "../helpers/e2e-graph-setup";

/** `P5_TOLERANCE_CAPS["fr-layout-oracle"]` of `webgpu-graph-algorithms/test/helpers/fr-parity.ts`. */
const CAP = 1e-3;
/** `FLOOR_FRACTION` of `webgpu-graph-algorithms/test/helpers/fa2-parity.ts` (spec 11.4). */
const FLOOR_FRACTION = 1e-3;
/** The admission rule's threshold: a third of the cap (G3-F3 / G3-F4). */
const ADMISSION = CAP / 3;
/** The perturbation count of the admission rule. */
const PERTURBATIONS = 8;

/** The layout's iteration budget, which is also the length of its cooling schedule. */
const ITERATIONS = 50;
/** The seed both sides start from. */
const SEED = 12;
/** The scene-unit radius the bridge refits the arrangement to: `scalingFactor` times `scale`. */
const RADIUS = 100;
/** The simulation's own `scale`, which is the same product -- see `LayoutManager.publishedRadius`. */
const SIM_SCALE = 100;
/** The start temperature and its per-iteration drop (`@graphty/layout`'s Fruchterman-Reingold). */
const START_TEMPERATURE = 0.1;

/** One side of the 10-by-10 grid. */
const WIDTH = 10;

/** The graph: a 10-by-10 grid, which the admission rule admits to the full budget in 3D. */
const NODES = Array.from({ length: WIDTH * WIDTH }, (_value, index) => ({
    id: `n-${String(Math.floor(index / WIDTH))}-${String(index % WIDTH)}`,
}));
const EDGES = ((): { src: string; dst: string }[] => {
    const out: { src: string; dst: string }[] = [];
    for (let row = 0; row < WIDTH; row += 1) {
        for (let column = 0; column < WIDTH; column += 1) {
            const here = `n-${String(row)}-${String(column)}`;
            if (column + 1 < WIDTH) {
                out.push({ src: here, dst: `n-${String(row)}-${String(column + 1)}` });
            }

            if (row + 1 < WIDTH) {
                out.push({ src: here, dst: `n-${String(row + 1)}-${String(column)}` });
            }
        }
    }

    return out;
})();

/** Graphs a case built, shut down after it whether it passed or not. */
const graphs: Graph[] = [];

afterEach(() => {
    for (const graph of graphs.splice(0)) {
        graph.shutdown();
    }

    cleanupE2EGraph();
});

/** A simulation that reports the cooling schedule it is on, which both CPU simulations do. */
type WithTemperature = LayoutSimulation & { temperature?: number };

/**
 * The seeded start, in the oracle's layout units.
 *
 * The same call the bridge makes -- `seedPositions` over an all-unplaced array at the
 * simulation's own `scale` -- divided back out. The bridge's array is unplaced at its first load,
 * so this is what it seeded; that it really is is what the horizon-zero comparison checks.
 * @param snapshot - The undirected snapshot the simulation was loaded with.
 * @param dim - The layout's dimensionality.
 * @returns `3 * nodeCount` layout-unit coordinates.
 */
function seededStart(snapshot: GraphSnapshot, dim: 2 | 3): Float64Array {
    const scene: F32 = new Float32Array(3 * snapshot.nodeCount).fill(Number.NaN);
    seedPositions(snapshot, scene, SEED, dim, SIM_SCALE, null, "fr");

    const layout = new Float64Array(scene.length);
    for (let at = 0; at < scene.length; at += 1) {
        layout[at] = scene[at] / SIM_SCALE;
    }

    return layout;
}

/**
 * The start with one coordinate moved by a single f32 ulp, which is what the admission rule
 * perturbs by.
 * @param start - The seeded start, in layout units.
 * @param nodeCount - How many rows it holds.
 * @param dim - The layout's dimensionality.
 * @param index - Which perturbation, 0 to {@link PERTURBATIONS} - 1.
 * @returns A copy with one coordinate nudged.
 */
function perturbed(start: Float64Array, nodeCount: number, dim: 2 | 3, index: number): Float64Array {
    const out = Float64Array.from(start);
    const at = 3 * Math.floor((index * nodeCount) / PERTURBATIONS) + (index % dim);
    const one = new Float32Array([out[at]]);
    const bits = new Uint32Array(one.buffer);
    bits[0] += 1;
    out[at] = one[0];

    return out;
}

/**
 * The oracle over a snapshot, at a precision.
 * @param snapshot - The undirected snapshot.
 * @param start - Layout-unit coordinates.
 * @param dim - The layout's dimensionality.
 * @param precision - "f64" for the reference, "f32" for the rounding model the admission rule uses.
 * @returns The reference, ready to step.
 */
function oracleOver(
    snapshot: GraphSnapshot,
    start: ArrayLike<number>,
    dim: 2 | 3,
    precision: "f64" | "f32",
): FruchtermanReingoldOracle {
    return new FruchtermanReingoldOracle(snapshot, start, {
        precision,
        dim,
        k: null,
        iterations: ITERATIONS,
        settleThreshold: 0,
    });
}

/**
 * An arrangement as the bridge publishes it: refitted about its own centre to {@link RADIUS}.
 *
 * The bridge's own rule, run over the oracle's coordinates, so the comparison is between two
 * published arrangements rather than between two unit systems.
 * @param positions - Layout-unit coordinates, stride 3.
 * @param nodeCount - How many rows to publish.
 * @returns The scene-unit coordinates.
 */
function published(positions: ArrayLike<number>, nodeCount: number): Float64Array {
    const { scale, centre } = measureEnvelope(positions, nodeCount, RADIUS);
    const out = new Float64Array(3 * nodeCount);
    for (let row = 0; row < nodeCount; row += 1) {
        for (let axis = 0; axis < 3; axis += 1) {
            out[3 * row + axis] = (positions[3 * row + axis] - centre[axis]) * scale;
        }
    }

    return out;
}

/** What a case needs: the graph, its bridge, the undirected snapshot and the seeded start. */
interface Rig {
    graph: Graph;
    engine: SimulationLayoutEngine;
    snapshot: GraphSnapshot;
    start: Float64Array;
    nodeCount: number;
}

/**
 * A graph whose Spring layout was set BEFORE its data arrived, with the frame loop stopped.
 * @param dim - The layout's dimensionality.
 * @param preSteps - What `behavior.layout.preSteps` is set to before the layout is built.
 * @returns The rig.
 */
async function springOverArrivingData(dim: 2 | 3, preSteps = 0): Promise<Rig> {
    const { graph } = await createE2EGraph({ nodes: [], edges: [], enableAi: false });
    graphs.push(graph);

    // DETERMINISM: every step in this file is one this file asked for.
    graph.engine.stopRenderLoop();

    graph.setLayoutBehavior({ layout: { preSteps } });

    await graph.setLayout("spring", {
        dim,
        k: null,
        iterations: ITERATIONS,
        scale: 1,
        seed: SEED,
        // Settling is switched off the way the reference switches it off, so both sides run the
        // whole budget and a horizon is never compared against a simulation that stopped early.
        settleThreshold: 0,
        settleWindow: ITERATIONS + 1,
    });

    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);

    const engine = graph.getLayoutManager().layoutEngine;
    assert.instanceOf(engine, SimulationLayoutEngine, "Spring resolves to the simulation bridge");

    const data = graph.getDataManager();
    const { snapshot } = data.undirected(data.getSnapshot());
    assert.strictEqual(snapshot.nodeCount, NODES.length, "the simulation holds the whole graph");

    return { graph, engine, snapshot, start: seededStart(snapshot, dim), nodeCount: snapshot.nodeCount };
}

/**
 * The element's published arrangement right now.
 * @param rig - The graph to read.
 * @returns The scene-unit coordinates, dense row order.
 */
function elementArrangement(rig: Rig): F32 {
    rig.engine.publishPositions();

    return rig.graph.getDataManager().positions.view(rig.nodeCount).slice();
}

/**
 * Steps the bridge and the reference together, and reports where they part.
 *
 * @param rig - The graph and its bridge.
 * @param dim - The layout's dimensionality.
 * @param asserted - The horizons the admission rule admits, which are the ones held to the cap.
 * @param printed - Horizons reported but not asserted.
 */
async function compareStepByStep(
    rig: Rig,
    dim: 2 | 3,
    asserted: readonly number[],
    printed: readonly number[],
): Promise<void> {
    const { nodeCount } = rig;
    const reference = oracleOver(rig.snapshot, rig.start, dim, "f64");
    const rounded = oracleOver(rig.snapshot, rig.start, dim, "f32");
    const nudged = Array.from({ length: PERTURBATIONS }, (_value, index) =>
        oracleOver(rig.snapshot, perturbed(rig.start, nodeCount, dim, index), dim, "f64"),
    );

    // HORIZON ZERO IS THE START ITSELF: the arrangement the element is about to step from is the
    // seeded one, which is what makes every horizon after it a statement about the stepping
    // rather than about where the two runs happened to begin.
    assert.isBelow(
        flooredRelError(elementArrangement(rig), published(rig.start, nodeCount), FLOOR_FRACTION).max,
        CAP,
        `${String(dim)}D: the bridge steps from the seeded start`,
    );

    const dt = START_TEMPERATURE / (ITERATIONS + 1);
    const last = Math.max(...asserted, ...printed);
    for (let horizon = 1; horizon <= last; horizon += 1) {
        // THE COOLING SCHEDULE, BEFORE THE STEP THAT USES IT. This is the one fact a trajectory
        // comparison reports only as "wrong somewhere": the temperature an iteration is capped
        // by is set at load and spent linearly, and a driver that reheats a simulation it has
        // just loaded starts it part-way down the schedule with the rest of the budget gone.
        const { temperature } = rig.engine.simulation as WithTemperature;
        assert.closeTo(
            temperature ?? Number.NaN,
            START_TEMPERATURE - dt * (horizon - 1),
            1e-12,
            `${String(dim)}D: the temperature before iteration ${String(horizon)} is the one the schedule is at`,
        );

        await rig.engine.stepAsync(1);
        reference.step();
        rounded.step();
        for (const oracle of nudged) {
            oracle.step();
        }

        if (!asserted.includes(horizon) && !printed.includes(horizon)) {
            continue;
        }

        const expected = published(reference.positions, nodeCount);
        const error = flooredRelError(elementArrangement(rig), expected, FLOOR_FRACTION).max;
        const spread = Math.max(
            ...nudged.map((oracle) => flooredRelError(published(oracle.positions, nodeCount), expected, FLOOR_FRACTION).max),
        );
        const f32 = flooredRelError(published(rounded.positions, nodeCount), expected, FLOOR_FRACTION).max;
        const admitted = spread < ADMISSION && f32 < ADMISSION;
        console.log(
            `fr-layout-oracle/element ${String(dim)}D horizon=${String(horizon)} error=${error.toExponential(3)} ` +
                `spread=${spread.toExponential(3)} f32=${f32.toExponential(3)} ${ 
                admitted ? "admitted" : "not admitted"}`,
        );

        if (asserted.includes(horizon)) {
            assert.isTrue(
                admitted,
                `${String(dim)}D horizon ${String(horizon)}: the admission this file records no longer holds ` +
                    `(spread ${spread.toExponential(3)}, f32 ${f32.toExponential(3)}, a third of the cap ${ADMISSION.toExponential(3)})`,
            );
            assert.isBelow(
                error,
                CAP,
                `${String(dim)}D horizon ${String(horizon)}: the bridge's arrangement is the reference's`,
            );
        }
    }
}

describe("the simulation bridge against the Fruchterman-Reingold reference", () => {
    it(
        "runs the whole cooling schedule in 3D, iteration by iteration, over a graph that arrived after its layout",
        async () => {
            const rig = await springOverArrivingData(3);

            await compareStepByStep(rig, 3, [1, 5, 10, 20, 50], []);
        },
        180_000,
    );

    it("runs the admitted horizons in 2D, where the third axis is held at the centre", async () => {
        const rig = await springOverArrivingData(2);

        await compareStepByStep(rig, 2, [1, 5], [10]);
    }, 180_000);

    it("spends the whole pre-step budget on the first frame, and lands where the reference does", async () => {
        // THE PRE-STEP BUDGET IS NOT THE BRIDGE'S. `LayoutManager` owns it, spends it in chunks
        // it decides, and knows nothing about which layout it is stepping -- so the two cases
        // above, which submit one iteration at a time, never touch it. This is the route a story
        // takes: a layout configured with `preSteps`, built over an empty graph, and paid on the
        // first frame at which there is a node to move.
        const rig = await springOverArrivingData(3, ITERATIONS);
        const reference = oracleOver(rig.snapshot, rig.start, 3, "f64");
        for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
            reference.step();
        }

        // The frame that pays what the empty graph could not. It returns before the chunks have
        // landed -- nothing inside a render loop can await a device -- so the wait is for the
        // budget to be spent rather than for the call.
        rig.graph.getLayoutManager().step();
        await vi.waitUntil(() => rig.engine.isSettled, { timeout: 60_000, interval: 50 });

        const { temperature } = rig.engine.simulation as WithTemperature;
        assert.closeTo(
            temperature ?? Number.NaN,
            START_TEMPERATURE - (START_TEMPERATURE / (ITERATIONS + 1)) * ITERATIONS,
            1e-12,
            "the schedule was spent from its start to its end, not from part-way down it",
        );
        assert.isBelow(
            flooredRelError(elementArrangement(rig), published(reference.positions, rig.nodeCount), FLOOR_FRACTION)
                .max,
            CAP,
            "the arrangement the first frame draws is the reference's after the same budget",
        );
    }, 180_000);
});
