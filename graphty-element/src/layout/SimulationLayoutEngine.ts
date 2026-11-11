/**
 * @file The layout bridge: one `LayoutEngine` driving `@graphty/layout`'s `LayoutSimulation`,
 * on the CPU or on whatever the element's acceleration controller has attached.
 *
 * WHERE THE DECISION IS TAKEN. "GPU or CPU" is asked of the controller ONCE per simulation, by
 * `plan({ capability, nodeCount })`, before any work starts -- at the first load, at every
 * reload (a freeze can cross the `acceleration.minNodes` threshold in either direction) and at
 * every swap. Nothing inside a running batch may change the answer: a rejected batch is
 * reported with its own code and stops the stepping, and only the controller's NEXT transition
 * -- a recovery, a detach, an injection -- rebuilds the simulation, through
 * {@link SimulationLayoutEngine.replaceSimulation}. That is the difference between capability
 * detection, which is required, and a silent CPU fallback after a GPU failure, which is not.
 *
 * TWO ARRAYS, TWO UNIT SYSTEMS. The simulations are the only layouts in this element that never
 * rescale what they compute: a ForceAtlas2 equilibrium grows with the graph, so a settled
 * hundred-node arrangement is a few hundred units across and a settled fifty-thousand-node one is
 * tens of thousands, while every visual size in the element -- node size, edge width, label size,
 * arrow size -- is an absolute scene unit tuned for the plus-or-minus-100 box the one-shot engines
 * publish into. So the simulation is given an array of ITS OWN, and `publishPositions()` maps it
 * into the element's: the widest radius about its own centre, over the rows that publish actually
 * writes, becomes `scalingFactor`, recomputed at every publish so a settling graph holds its
 * apparent size instead of flying out of frame. Everything written the other way -- a drag, a pin replay, a
 * `setNodePosition`, the seed -- arrives in scene units and is divided back out, so a dragged node
 * lands under the pointer. The simulation's own settle rule, trace and statistics never see any of
 * this: they are computed in its units, and its units do not move.
 *
 * WHAT THE SWAP PRESERVES. The bridge owns the simulation's array, so a swap keeps the arrangement
 * by handing the new simulation the same one. Pins are the STORE's: a byte per row in the position
 * lane, which a freeze remaps with the coordinates. The bridge packs that lane into the
 * simulation's `NodeMask` after every load, because the simulation would otherwise keep spending
 * force on a body the element refuses to move and its own copy of that row would wander away from
 * where the reader put it. A drag holds the same bit temporarily and is not a pin.
 *
 * A FIXED ROW IS THE ONE PLACE THE ELEMENT'S ARRAY IS THE AUTHORITY rather than the simulation's,
 * so it is not published over at all; see {@link SimulationLayoutEngine.publishPositions} for what
 * that costs and why the repair that suggests itself is worse.
 */

import { type F32, type GraphSnapshot, makeMask, maskSet, type NodeId, type NodeMask } from "@graphty/graph-format";
import {
    type CommonLayoutOptions,
    createSimulation,
    type ForceAtlas2Options,
    type FruchtermanReingoldOptions,
    type LayoutSimulation,
    NO_CLUSTER,
    resolveNodeVector,
    seedPositions,
    type SimulationOptions,
    type SimulationType,
    type SpringElectricalOptions,
} from "@graphty/layout";

import type { AccelerationController } from "../acceleration/AccelerationController";
import { narrowLayout } from "../acceleration/narrow";
import { type AccelerationPrecision, CPU_PRECISION, type GraphAccelerator } from "../acceleration/types";
import { asStrength } from "../algorithms/input/weight";
import { WRITABLE_LANE } from "../data/lane";
import type { ElementPositions } from "../data/positions";
import type { Edge } from "../Edge";
import { GraphtyError } from "../errors";
import type { DataManager } from "../managers/DataManager";
import type { Node } from "../Node";
import type { DrawnTarget } from "../render/RowTable";
import { readCommunities, readRowCommunities, sameCommunities } from "./clusterForce";
import { type EdgePosition, LayoutEngine, type Position } from "./LayoutEngine";

/**
 * Above this many nodes the automatic `iterationsPerStep` is raised, because a frame that
 * submits one iteration of a graph this size spends more time on the round trip than on the
 * arithmetic (design 13 row P12).
 */
const ITERATIONS_AUTO_RAISE_NODES = 250_000;

/** How much the automatic `iterationsPerStep` is raised by above {@link ITERATIONS_AUTO_RAISE_NODES}. */
const AUTO_RAISE_FACTOR = 4;

/**
 * How many iterations one `step()` submits.
 *
 * The explicit knob decides whenever a host set one. Otherwise the count is the frame loop's own
 * `stepMultiplier`, raised fourfold once the graph is large enough that reading a million
 * positions back costs more than a frame: above that size the element computes more per batch and
 * accepts a lower position refresh rate, which is the trade design 13 row P12 asks for.
 *
 * It is re-applied at EVERY load, because a freeze can carry a graph across the line in either
 * direction.
 * @param explicit - What a host asked for, or null to let the size decide.
 * @param stepMultiplier - `behavior.layout.stepMultiplier`, the automatic rule's starting point.
 * @param nodeCount - The graph this load is over.
 * @returns The iteration count.
 */
export function iterationsPerStepFor(explicit: number | null, stepMultiplier: number, nodeCount: number): number {
    if (explicit !== null) {
        return explicit;
    }

    return nodeCount > ITERATIONS_AUTO_RAISE_NODES ? stepMultiplier * AUTO_RAISE_FACTOR : stepMultiplier;
}

/**
 * Turns a reader's `nodeMass` record into one value per dense row, and leaves every other form to
 * the simulation.
 *
 * A reader may give `nodeMass` as a number per node ID, as the name of a numeric node column, or
 * not at all. Only the FIRST is resolved here, because it is the only one an accelerator refuses:
 * a GPU never sees a node ID. A node the record says nothing about gets one more than its degree,
 * which is what the simulations themselves apply, so a partial record leaves the rest of the graph
 * exactly as it would have been.
 *
 * Exported beside {@link iterationsPerStepFor} so both rules can be read off without a device, a
 * renderer or a running simulation.
 * @param spec - What the reader set, in any of its three forms.
 * @param undirected - The graph the simulation will be loaded with.
 * @returns The masses, or null when the simulation resolves them itself.
 */
export function resolveNodeMass(spec: unknown, undirected: GraphSnapshot): F32 | null {
    if (spec === null || spec === undefined || typeof spec === "string") {
        return null;
    }

    const degree = undirected.outDegree();
    return resolveNodeVector(spec as Readonly<Record<NodeId, number>>, undirected, (i) => degree[i] + 1);
}

/**
 * Below this radius an arrangement counts as a point, and no scale is derived from it.
 *
 * A one-node graph and a graph whose every node was seeded at the same coordinate both measure
 * zero, and a graph that has taken one step away from such a seed measures something a rounding
 * error away from zero. Dividing `scalingFactor` by any of those produces an enormous or infinite
 * multiplier, which would send the whole arrangement outside the float the position array stores.
 */
const POINT_RADIUS = 1e-6;

/**
 * How a simulation's arrangement maps into the element's scene units.
 *
 * See {@link measureEnvelope}.
 *
 * Exported only because {@link measureEnvelope} returns it and TypeScript's declaration emit
 * needs every named type in a published signature to be exported. Nothing outside this module
 * names the type -- the test destructures the value -- so it is no entry point's surface.
 * @internal
 */
export interface LayoutEnvelope {
    /** What a simulation-unit offset from {@link LayoutEnvelope.centre} is multiplied by. */
    readonly scale: number;
    /** The arrangement's centre, in the simulation's own units. */
    readonly centre: readonly [number, number, number];
    /**
     * How many rows the measurement actually saw.
     *
     * Zero is the one answer a caller must not act on: it means the arrangement has nothing in
     * it to fit, and the scale and centre beside it are the identity rather than a measurement.
     */
    readonly placed: number;
}

/**
 * Measures the arrangement a simulation currently holds, and says how to publish it.
 *
 * The centre is the mean of the placed rows and the scale is `scalingFactor` divided by the
 * furthest row's distance from that centre, so a published arrangement is exactly
 * `scalingFactor` units from its centre at its widest whatever the simulation's own equilibrium
 * turned out to be. A row that is not finite -- the element's "not laid out yet" -- counts for
 * neither, and an arrangement that measures as a point (see {@link POINT_RADIUS}) publishes at
 * its own size rather than being divided by nothing.
 *
 * A HELD ROW COUNTS FOR NEITHER EITHER, and that is what `held` is for. The publish does not
 * write a row a pin or a drag is holding -- its scene coordinate is the reader's -- so measuring
 * one would fit every OTHER row inside a radius set by a row that is not drawn there: a node
 * dragged past the envelope would shrink the whole graph under the pointer. The caller decides
 * which rows those are, because "held" is the element's business rather than this rule's.
 *
 * Exported beside {@link iterationsPerStepFor} and {@link resolveNodeMass} so the rule can be read
 * off without a device, a renderer or a running simulation.
 * @param positions - A stride-3 array in the simulation's own units, at least `3 * nodeCount` long.
 * @param nodeCount - How many rows of it to measure.
 * @param scalingFactor - The scene-unit radius the arrangement is to be published at.
 * @param held - Answers true for a row the caller will not publish, or null to measure them all.
 * @returns The centre to publish about, the multiplier to publish with, and how many rows were
 * measured.
 */
export function measureEnvelope(
    positions: ArrayLike<number>,
    nodeCount: number,
    scalingFactor: number,
    held: ((row: number) => boolean) | null = null,
): LayoutEnvelope {
    let placed = 0;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let row = 0; row < nodeCount; row += 1) {
        const x = positions[3 * row];
        const y = positions[3 * row + 1];
        const z = positions[3 * row + 2];
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) && held?.(row) !== true) {
            placed += 1;
            cx += x;
            cy += y;
            cz += z;
        }
    }

    if (placed === 0) {
        return { scale: 1, centre: [0, 0, 0], placed };
    }

    cx /= placed;
    cy /= placed;
    cz /= placed;

    let furthest = 0;
    for (let row = 0; row < nodeCount; row += 1) {
        if (held?.(row) === true) {
            continue;
        }

        const x = positions[3 * row] - cx;
        const y = positions[3 * row + 1] - cy;
        const z = positions[3 * row + 2] - cz;
        const squared = x * x + y * y + z * z;
        if (Number.isFinite(squared) && squared > furthest) {
            furthest = squared;
        }
    }

    const radius = Math.sqrt(furthest);
    return { scale: radius > POINT_RADIUS ? scalingFactor / radius : 1, centre: [cx, cy, cz], placed };
}

/**
 * How much of its published disc or ball an arrangement may fill with `nodeGap` nodes: an arrangement fitted to a fixed
 * radius cannot hold more nodes than fit in it, so a graph too big for `scalingFactor` is published wider instead.
 */
const NODE_GAP_FILL = 0.5;

/**
 * The radius a disc or ball needs to hold nodes of these radii at {@link NODE_GAP_FILL}.
 *
 * Left out, a collision in a graph too big for its radius is a runaway: it pushes the arrangement wider, the refit
 * shrinks the map to match, which grows every radius in simulation units, which pushes the arrangement wider.
 * @param radii - One radius per node, in scene units.
 * @param dimensions - 2 for a disc, 3 for a ball.
 * @returns The radius, in scene units.
 */
export function packedRadius(radii: F32, dimensions: 2 | 3): number {
    let volume = 0;
    for (const radius of radii) {
        volume += radius ** dimensions;
    }

    return (volume / NODE_GAP_FILL) ** (1 / dimensions);
}

/**
 * The scene-unit point an arrangement is published around.
 * @param centre - Whatever the options carry, in the layout package's `ArrayLike` form.
 * @returns The three components, defaulting to the origin.
 */
function resolveCentre(centre: ArrayLike<number> | null | undefined): [number, number, number] {
    if (centre === null || centre === undefined) {
        return [0, 0, 0];
    }

    return [centre.length > 0 ? centre[0] : 0, centre.length > 1 ? centre[1] : 0, centre.length > 2 ? centre[2] : 0];
}

/**
 * The accelerator member each simulation type needs, which is what the controller feature-tests.
 *
 * `"spring"` is the element's name for Fruchterman-Reingold, so the two share one capability.
 *
 * Exported because `LayoutManager` asks the controller the same question before it has a bridge to
 * ask it of: choosing which engine draws the default force arrangement is a plan over this
 * capability, and one spelling of the member name is what keeps the two decisions the same
 * decision.
 */
export const SIMULATION_CAPABILITY: Readonly<Record<SimulationType, string>> = {
    forceatlas2: "forceAtlas2",
    fruchtermanReingold: "fruchtermanReingold",
    spring: "fruchtermanReingold",
    "spring-electrical": "springElectrical",
};

/**
 * The resolved options a bridge runs on: the simulation's own knobs, plus the two the frame loop
 * needs.
 *
 * `model` carries whatever the chosen simulation type accepts and WINS over the common members
 * beside it, so one option is never spelled in two places with two answers.
 */
export interface SimulationEngineOptions extends CommonLayoutOptions, Omit<SimulationOptions, "iterationsPerStep"> {
    /** The type's own options, already mapped from what the consumer asked for. */
    readonly model: ForceAtlas2Options | FruchtermanReingoldOptions | SpringElectricalOptions;
    /**
     * The radius, in scene units, the published arrangement is fitted to.
     *
     * The element's own envelope, not the simulation's: see the file header. It is every size
     * control the layout publishes rolled into one number -- ForceAtlas2 and Spring publish
     * "Scaling Factor", Spring and spring-electrical publish "Scale" -- because the refit fits
     * the arrangement to exactly this radius, so a multiplier left out of it changes nothing a
     * reader can see. `LayoutManager` is what rolls them up.
     */
    readonly scalingFactor: number;
    /** The node attribute or result field naming each node's community; null or absent for no pull. */
    readonly clusterBy?: string | null;
    /** How hard a community is pulled together. */
    readonly clusterStrength?: number;
    /** The space kept between nodes' drawn surfaces, in scene units; null or absent keeps nodes as points. */
    readonly nodeGap?: number | null;
    /** Whether `nodeGap` is measured across x and y only. */
    readonly nodeGapFront?: boolean;
    /** Iterations each `step()` submits, or null for the automatic rule re-applied at every load. */
    readonly iterationsPerStep: number | null;
    /** `behavior.layout.stepMultiplier`, which the automatic rule starts from. */
    readonly stepMultiplier: number;
}

/**
 * Everything a bridge is built with: ONE constructor argument, because `LayoutEngine.register`
 * accepts only a class whose constructor takes one object and `LayoutEngine.get` calls it with
 * one.
 */
export interface SimulationEngineInit {
    /** Which simulation to drive. */
    readonly type: SimulationType;
    /**
     * The registered layout name this bridge is standing in for.
     *
     * Every other engine answers `type` from its class's `static type`, which cannot work here:
     * `LayoutManager` builds THIS class for each of the layouts that declare a
     * `static simulationType`, so the class is the same one for all of them and its own static
     * would name none of them.
     */
    readonly layoutType: string;
    /** The resolved options. */
    readonly options: SimulationEngineOptions;
    /** The controller that decides where each simulation runs and announces every transition. */
    readonly controller: AccelerationController;
    /** Where a failure goes: the element's error channel, with `source: "layout"`. */
    readonly report: (error: GraphtyError) => void;
    /** The data manager the snapshot, its undirected copy and the position array come from. */
    readonly dataManager: DataManager;
    /**
     * The edges that have an `Edge` (`dataManagerInternals.builtEdges`), which {@link SimulationLayoutEngine.edges}
     * hands out. Omitted, every edge of the data manager, building any `Edge` not yet built.
     */
    readonly builtEdges?: () => Iterable<Edge>;
    /**
     * Start the first load from the seed rather than from the arrangement the element holds: the
     * rebuild a seeded layout makes when new data arrives, so the frames that stepped the graph
     * as it stood before do not decide where it settles (issue #3379). Pinned rows are replayed
     * after `init()` as for any build.
     */
    readonly fromSeed?: boolean;
    /**
     * What the stored edge weights mean, asked at every load of a simulation that reads them:
     * a strength is read as it is, a distance inverted, and null leaves them unread. Absent reads
     * every weight as a strength.
     */
    readonly weightMeaning?: () => "strength" | "distance" | null;
    /**
     * Where an accelerated simulation on the drawing device fills the row table on the card,
     * asked at every load and publish; null, or absent, publishes through the upload path.
     */
    readonly drawnTarget?: () => DrawnTarget | null;
}

/** The derived edge column a distance weight is inverted into, for the simulation to read. */
const STRENGTH_COLUMN = "graphty.layoutStrength";

/**
 * Slots in the drawn ring. A landed slot is copied at the publish after the frame's step, so it must
 * outlive every batch in flight plus that one (the GPU layouts' default `maxInFlight` is 2).
 */
const DRAWN_SLOTS = 4;

/** drawn = (simulation - center) * scale + target: what the drawn ring and a publish apply. */
interface DrawnTransform {
    readonly center: readonly [number, number, number];
    readonly scale: number;
    readonly target: readonly [number, number, number];
}

/**
 * What an accelerated simulation offers to fill the row table on the card
 * (design/rendering/row-renderer.md 4.5); optional members of the GPU package's simulation.
 */
interface DrawnSimulation {
    readonly landedDrawn?: GPUBuffer | null;
    readonly landedDrawnTransform?: DrawnTransform | null;
    setDrawn(output: { slots: number; rows: Float32Array } | null): void;
    setDrawnTransform(transform: DrawnTransform): void;
    setDrawnSkip(mask: Uint32Array): void;
    writeDrawn(index: number, x: number, y: number, z: number, w: number): void;
}

/**
 * The drawn ring of a simulation that has one.
 * @param simulation - The simulation.
 * @returns It, as one that fills a drawn ring, or null.
 */
function drawnOf(simulation: LayoutSimulation): DrawnSimulation | null {
    const s = simulation as Partial<DrawnSimulation>;
    return typeof s.setDrawn === "function" &&
        typeof s.setDrawnTransform === "function" &&
        typeof s.setDrawnSkip === "function" &&
        typeof s.writeDrawn === "function"
        ? (simulation as unknown as DrawnSimulation)
        : null;
}

/** A simulation filling the row table on the card, for the rows it was loaded with. */
interface DrawnRun {
    readonly simulation: DrawnSimulation;
    readonly target: DrawnTarget;
    readonly n: number;
    skip: Uint32Array;
    /** As the target said at the last publish: no copy while a transition draws the rows. */
    suspended: boolean;
    /**
     * Rows the table told the ring, each with the batches submitted by then. The ring writes a told
     * row into every slot at once, so a batch already in flight lands holding the told row while its
     * readback moves the row on the CPU: its copy must not stand for those rows.
     */
    readonly told: Map<number, number>;
    /** The mirror this run gave the table, which only this run takes back. */
    readonly mirror: (row: number, x: number, y: number, z: number, w: number) => void;
}

/**
 * The refusal for a bridge built without a controller, which is what `LayoutEngine.get(type, {})`
 * would hand it.
 * @returns The error to throw.
 */
function missingController(): GraphtyError {
    return new GraphtyError({
        code: "E_INTERNAL",
        message:
            "a simulation layout is constructed by LayoutManager with the graph's acceleration controller, " +
            "not by LayoutEngine.get: this one was built without one",
        source: "layout",
    });
}

/**
 * A `LayoutEngine` that drives one `LayoutSimulation` from `@graphty/layout`.
 *
 * It is registered under no name by itself: `LayoutManager` constructs it for the layout types
 * that declare a `static simulationType`, which is how it receives the controller a registered
 * class could not be handed.
 */
export class SimulationLayoutEngine extends LayoutEngine {
    /**
     * Every simulation accepts a scope: a held row is OR-ed into the fixed-node mask, so the
     * simulation stops integrating it as well as publishing it. See `LayoutEngineStatics.scoped`.
     */
    static override readonly scoped: boolean = true;

    /** Which simulation this bridge drives. */
    readonly simulationType: SimulationType;

    /** The accelerator member this simulation needs, asked of the controller before every build. */
    readonly capability: string;

    readonly #layoutType: string;

    #precision: AccelerationPrecision = CPU_PRECISION;

    readonly #options: SimulationEngineOptions;
    readonly #controller: AccelerationController;
    readonly #report: (error: GraphtyError) => void;
    readonly #dataManager: DataManager;
    readonly #builtEdges: () => Iterable<Edge>;
    readonly #weightMeaning: () => "strength" | "distance" | null;
    readonly #drawnTarget: () => DrawnTarget | null;
    /** The simulation filling the row table on the card, or null on the upload path. */
    #drawn: DrawnRun | null = null;
    /**
     * The `weight` the running simulation was built with, or undefined for a simulation that reads
     * no weight: a load whose answer differs rebuilds it.
     */
    #weightSpec: boolean | string | undefined = undefined;
    /** See {@link SimulationEngineInit.fromSeed}; cleared by the first load. */
    #fromSeed: boolean;

    /**
     * One reused pair, valid until the next call. `Edge.update()` reads it and drops it, and a
     * fresh pair per edge per frame is the allocation this avoids.
     */
    readonly #edgePair = { src: { x: 0, y: 0, z: 0 }, dst: { x: 0, y: 0, z: 0 } };

    #simulation: LayoutSimulation | null = null;

    /**
     * What the controller had ATTACHED when the running simulation was built, which is not the
     * same as what that simulation runs on: below `acceleration.minNodes` the plan answers CPU
     * with an accelerator attached. Recording the attached one is what makes a transition that
     * would plan exactly the same way answer "unchanged", so a settled CPU layout is not rebuilt,
     * re-uploaded and reheated by every status change the controller publishes.
     */
    #builtWith: GraphAccelerator | null = null;
    #accelerated = false;
    #snapshot: GraphSnapshot | null = null;
    #positions: F32 | null = null;
    #mask: NodeMask | null = null;

    /**
     * The array the simulation actually runs in, in the simulation's own units.
     *
     * The bridge's, not the store's: see the file header. It is rebuilt from the element's array
     * at every load and every reload -- a freeze renumbers the rows -- and DELIBERATELY kept
     * across an accelerator swap, which is what makes the swap continue the layout rather than
     * restart it.
     */
    #simPositions: F32 | null = null;

    /** What a simulation-unit offset from {@link SimulationLayoutEngine.#simCentre} is multiplied by. */
    #envelopeScale = 1;

    /** The arrangement's centre at the last publish, in the simulation's own units. */
    readonly #simCentre: [number, number, number] = [0, 0, 0];

    /** Where the element expects the arrangement's centre to be, in scene units. */
    readonly #targetCentre: [number, number, number];

    /**
     * The rows the simulation is holding still, which are the rows the ELEMENT'S array is the
     * authority for. Rebuilt with the mask in `#applyPins` and edited with it in `#setFixed`.
     */
    #fixedRows = new Set<number>();

    // THE PIN LANE HAS NO ROW FOR A DRAG. `#applyPins` repacks the mask from the store's lane
    // after every load, so a freeze or an accelerator swap mid-drag would give the pointer's node
    // back to the forces; these nodes are OR-ed back in. They are held as nodes, not as indices,
    // because a freeze renumbers the rows underneath them.
    readonly #dragging = new Set<Node>();

    /**
     * The node masses this simulation was built with, when the reader gave them as a record keyed
     * by node id, and null for every other form. See {@link SimulationLayoutEngine.resolvedNodeMass}.
     */
    #nodeMass: F32 | null = null;

    /**
     * The stored record of a row with no `Node`, which the layout manager fills in; read for `clusterBy` under
     * renderPath "batched".
     * @internal
     */
    rowRecord: ((row: number) => unknown) | null = null;

    /** The last read of `clusterBy`: by `Node` under renderPath "objects", by row under "batched". */
    #communities: ReadonlyMap<Node | number, number> = new Map();

    /** One radius per row in scene units, gap included, while `nodeGap` is set; see `#collisionRadii`. */
    #radii: F32 | null = null;

    /** A node changed size, or a load renumbered the rows, since `#radii` was read. */
    #radiiStale = true;

    /** {@link packedRadius} of `#radii`. */
    #packedRadius = 0;

    /**
     * Every batch promise this bridge has already attached a handler to.
     *
     * A saturated simulation answers `step()` with the OLDEST promise still in flight rather than
     * submitting another, and with more than one batch allowed in flight that promise comes back
     * AFTER newer ones -- so "the same promise as last time" is not enough to keep the rule of one
     * handler per distinct promise. Weak, so a retired batch is collectable.
     */
    readonly #caught = new WeakSet<Promise<void>>();
    #failed = false;

    /** The simulation whose failure has already been reported; see `#onError`. */
    #reported: LayoutSimulation | null = null;

    /**
     * Ends the controller's work span while an accelerated simulation is being stepped, or null
     * when no span is open. See `#syncWork`.
     */
    #endWork: (() => void) | null = null;

    /** Batches submitted and not yet landed or rejected. See `#syncWork`. */
    #inFlight = 0;

    /** Frame batches that have landed, and how many of them the last publish included. */
    #landed = 0;
    #landedPublished = 0;

    /** Set by `LayoutManager` while it is not stepping this layout. See {@link paused}. */
    #paused = false;
    #iterations = 1;
    #iterationsDone = 0;

    /**
     * Moves at every {@link SimulationLayoutEngine.loadArrangement}. A batch submitted before the
     * last one computed from coordinates that were since restored over, so what it reads back is
     * dropped.
     */
    #arrangement = 0;

    /**
     * Builds a bridge. Nothing is planned and no simulation exists until {@link init} loads one.
     *
     * The parameter is declared as a bare `object` because `LayoutEngine.register` files a class
     * whose constructor takes the options a consumer passed to `setLayout`, and a bridge takes
     * more than that. A caller that means to build one declares its argument as a
     * {@link SimulationEngineInit}, which is what `LayoutManager` does; a caller that arrived
     * through `LayoutEngine.get` is refused on the next line.
     * @param init - A {@link SimulationEngineInit}: the type, the resolved options, the
     * controller, the error channel and the data.
     * @throws A `GraphtyError` with `E_INTERNAL` when no controller was passed.
     */
    constructor(init: object) {
        super();

        const built = init as Partial<SimulationEngineInit>;

        // `LayoutEngine.get(type, opts)` would reach this with a plain options object, which is
        // the one way a bridge can be built without the controller it cannot work without.
        if (built.controller === undefined || built.type === undefined) {
            throw missingController();
        }

        this.simulationType = built.type;
        this.#layoutType = built.layoutType ?? built.type;
        this.capability = SIMULATION_CAPABILITY[built.type];
        this.#options = built.options as SimulationEngineOptions;
        this.#controller = built.controller;
        this.#report = built.report as (error: GraphtyError) => void;
        this.#dataManager = built.dataManager as DataManager;
        this.#builtEdges = built.builtEdges ?? ((): Iterable<Edge> => this.#dataManager.edges.values());
        this.#fromSeed = built.fromSeed === true;
        this.#weightMeaning = built.weightMeaning ?? ((): "strength" => "strength");
        this.#drawnTarget = built.drawnTarget ?? ((): null => null);
        this.#targetCentre = resolveCentre(this.#options.model.center ?? this.#options.center);

        // THE FIRST ADOPTION IS THE IDENTITY. Nothing has been published yet, so an arrangement
        // already in the element's array -- a previous layout's, or a file's own coordinates --
        // has to reach the simulation unchanged, and `#adoptPositions` divides by these two.
        this.#simCentre[0] = this.#targetCentre[0];
        this.#simCentre[1] = this.#targetCentre[1];
        this.#simCentre[2] = this.#targetCentre[2];
    }

    /**
     * The registered layout name, which every other engine reads off its class's `static type`.
     *
     * Without this the manager's `layoutType`, `getStats().layoutType` and the details of every
     * error this bridge reports would all be undefined, and a 2D/3D switch would ask the element
     * to set a layout called "undefined".
     * @returns The name the consumer set.
     */
    override get type(): string {
        return this.#layoutType;
    }

    /**
     * The running simulation, or null before the first load and while the bridge is stopped.
     *
     * Exposed so a caller that has to wait for the device -- a screenshot after a pause -- can
     * reach an accelerated simulation's own `flush()`.
     * @returns The simulation.
     */
    get simulation(): LayoutSimulation | null {
        return this.#simulation;
    }

    /**
     * Whether the running simulation is the accelerator's rather than the CPU's.
     * @returns True when the accelerator built it.
     */
    get isAccelerated(): boolean {
        return this.#accelerated;
    }

    /**
     * The arithmetic the running simulation computes in, for a caller that labels its results.
     * @returns The precision, which is the CPU's whenever the CPU is running the layout.
     */
    get precision(): AccelerationPrecision {
        return this.#precision;
    }

    /**
     * How many iterations this bridge has submitted since the simulation was built. Submitted,
     * not retired: an accelerated batch is counted when it goes out, not when it lands.
     * @returns The count.
     */
    get iterationsDone(): number {
        return this.#iterationsDone;
    }

    /**
     * How many of the batches `step()` submitted had landed when the positions were last
     * published. An accelerated batch lands frames after the one that submitted it, so the
     * published positions move only when this does: a move measured across a frame in which it
     * did not is no move at all, not a settled layout (issue #4437).
     * @returns The count; it only grows.
     */
    get landedBatchesPublished(): number {
        return this.#landedPublished;
    }

    /**
     * The node masses the running simulation was handed, when the element resolved them itself.
     *
     * A reader may give `nodeMass` as a number per node ID, as the name of a numeric node column,
     * or not at all. Only the FIRST of those three is resolved here, into one value per dense row,
     * because it is the only one an accelerator refuses: a GPU never sees a node ID. The other two
     * are handed to the simulation as they stand and resolved by it at every load, on either path,
     * which is also what keeps them right when a freeze renumbers the graph.
     * @returns The masses, or null when the simulation resolves them itself.
     */
    get resolvedNodeMass(): F32 | null {
        // A COPY, like `pinnedMask`: the array is the simulation's own input, and a caller that
        // kept the live one could change what every force reads.
        return this.#nodeMass === null ? null : this.#nodeMass.slice();
    }

    /**
     * The fixed-node mask the simulation is running with, packed from the store's pin lane.
     * @returns The mask, or an empty one before the first load.
     */
    get pinnedMask(): NodeMask {
        // A COPY: `#setFixed` mutates the mask in place, so a caller that kept the live one would
        // watch it change under them.
        return this.#mask === null ? makeMask(0) : this.#mask.slice();
    }

    /**
     * Whether a different accelerator is attached now than when the simulation was built.
     *
     * What `LayoutManager` asks on every controller transition before it swaps: `null` is nothing
     * attached, so a detach, an injection, a device loss and a recovery all answer true, while a
     * transition that leaves the same accelerator attached answers false -- including for a
     * simulation the plan put on the CPU because the graph is below `acceleration.minNodes`.
     * Rebuilding that one on every status change would re-upload the graph and reheat a layout
     * that had settled, and it is a RELOAD that re-plans the threshold, which it does on its own.
     * @param accelerator - What the controller holds now.
     * @returns True when the simulation has to be rebuilt.
     */
    builtWithChanged(accelerator: GraphAccelerator | null): boolean {
        return accelerator !== this.#builtWith;
    }

    /**
     * The FIRST load, which is what makes this engine's `init()` different from every other's.
     *
     * `LayoutManager._setLayoutInternal` replays the pinned nodes between `init()` and
     * `setLayoutEngine`, through `setNodePosition` and `pin`, so a load deferred to any later
     * point would meet those calls with no simulation to tell.
     * @returns A promise that resolves once the simulation exists and holds the graph.
     */
    init(): Promise<void> {
        const snapshot = this.#dataManager.getSnapshot();
        this.load(snapshot, this.#dataManager[WRITABLE_LANE].view(snapshot.nodeCount));
        return Promise.resolve();
    }

    /**
     * Adopts a snapshot and builds the simulation the controller's plan chose for it.
     * @param snapshot - The graph, as `getSnapshot()` returns it; the bridge derives the
     * undirected copy the simulations require itself.
     * @param positions - The element's stride-3 array, written in place by every batch.
     * @throws A `GraphtyError` with `E_NO_ACCELERATOR` under the `required` policy with nothing
     * attached, or whatever `createSimulation` throws.
     */
    load(snapshot: GraphSnapshot, positions: F32): void {
        this.#detachDrawn();
        this.#simulation?.dispose();
        this.#simulation = null;
        this.#syncWork();
        this.#snapshot = snapshot;
        this.#positions = positions;
        const simPositions = this.#adoptPositions(snapshot.nodeCount, positions);
        if (this.#fromSeed) {
            // Every row unplaced, so `#seed` draws the whole graph from the seed alone.
            this.#fromSeed = false;
            simPositions.fill(Number.NaN);
        }

        this.#build();
    }

    /**
     * Hands the running simulation a new snapshot, rebuilding it first when the plan flipped.
     *
     * The re-plan is the point: a freeze can carry the graph across `acceleration.minNodes` in
     * either direction, and design 9.4 item 4 re-evaluates the threshold at every load.
     * @param snapshot - The snapshot that has just replaced the old one.
     * @param positions - The element's array, re-viewed at the new node count.
     * @throws A `GraphtyError` with `E_NO_ACCELERATOR` under the `required` policy with nothing
     * attached.
     */
    reload(snapshot: GraphSnapshot, positions: F32): void {
        if (this.#snapshot === null) {
            // NOTHING HAS BEEN LOADED YET, so this is `init()`'s own freeze coming back at us:
            // `getSnapshot()` emits `snapshot-replaced` synchronously, from inside the call
            // `init()` makes, and `LayoutManager` is already subscribed. Planning and building
            // here would be undone by the `load()` on the next line of `init()` -- two plans,
            // two simulations and two graph uploads for one `setLayout`.
            return;
        }

        const simulation = this.#simulation;
        this.#snapshot = snapshot;
        this.#positions = positions;
        const loadable = this.#loadable(snapshot);

        // BEFORE THE PLAN, and at every reload whether or not the simulation is rebuilt: a freeze
        // renumbers the rows, and the element's array is the copy it renumbered.
        const simPositions = this.#adoptPositions(snapshot.nodeCount, positions);

        const decision = this.#controller.plan({ capability: this.capability, nodeCount: snapshot.nodeCount });

        // A REBUILD IS THE ONLY WAY TO RE-RESOLVE A NODE-MASS RECORD. The masses the element
        // resolved itself were handed to the simulation when it was created, one per row of the
        // graph it was created over -- and a freeze renumbers the rows whether or not it changes
        // how many there are, so a load that drops one node and adds another would leave every
        // node pulled with some other node's mass. Every other form resolves itself at each load
        // and survives a freeze on its own, which is why this is the one option that can force a
        // rebuild, and why it forces one at EVERY reload.
        const massStale = this.#nodeMass !== null;
        if (
            simulation === null ||
            decision.accelerated !== this.#accelerated ||
            massStale ||
            loadable.weight !== this.#weightSpec
        ) {
            this.replaceSimulation();
            return;
        }

        this.#iterations = this.#resolveIterations(snapshot.nodeCount);
        this.#seed(snapshot, simPositions);
        simulation.load(loadable.graph, simPositions);
        this.#attachDrawn(snapshot.nodeCount);

        // THE STOP FLAG SURVIVES A RELOAD. A simulation whose batch rejected is not made well by
        // a new graph, and only a rebuild clears the flag -- which the controller's next
        // transition asks for. Clearing it here would resume stepping the simulation that just
        // failed and report the same failure again on its next batch.
        this.#applyPins();

        // NOTHING IS REHEATED AFTER A LOAD, because a load has already lit it: `load()` restarts
        // the run at iteration zero, not settled, and for Fruchterman-Reingold at full
        // temperature. A `reheat()` on top of that only ever takes heat AWAY -- that simulation's
        // iteration counter IS its temperature index, and reheat SETS it to 70% of the budget, so
        // a graph whose data arrived after its layout was set (a freeze over an untouched
        // simulation, which is the commonest graph there is) ran fifteen of its fifty iterations,
        // starting a third of the way down the cooling schedule, and came out a tangle. Measured
        // on Layout/2D Spring over data3.json, as rms radius over mean edge length: 1.387
        // reheated against 2.897 not. ForceAtlas2 never showed it because its `reheat()` sets the
        // counter to zero -- it gives budget back where Fruchterman-Reingold's takes it.
    }

    /**
     * Rebuilds the simulation on whatever the controller holds now, keeping the arrangement.
     *
     * The old simulation is disposed and the new one is loaded with the SAME positions view and
     * the same pins, so an accelerator arriving mid-run continues the layout rather than
     * restarting it, and one leaving hands it to the CPU where the policy allows a CPU.
     * @throws A `GraphtyError` with `E_NO_ACCELERATOR` when the policy is `"required"` and
     * nothing is attached. The bridge is then STOPPED -- no simulation, nothing submitted -- and
     * the next transition that attaches an accelerator brings it back through this same method.
     */
    replaceSimulation(): void {
        this.#detachDrawn();
        this.#simulation?.dispose();
        this.#simulation = null;
        this.#syncWork();

        if (this.#snapshot === null || this.#positions === null) {
            // Nothing has been loaded yet, so there is nothing to rebuild: `init()` will plan
            // against whatever the controller holds by then.
            this.#failed = false;
            return;
        }

        try {
            this.#build();
        } catch (error) {
            this.#failed = true;
            throw error;
        }

        // No reheat here either, and for the same reason: `#build()` loads the new simulation, and
        // a load is already a full run from the start of the schedule. See `reload`.
    }

    /**
     * Submits one batch, fire and forget.
     *
     * The abstract signature returns nothing, and a GPU simulation's `step()` returns a promise,
     * so the rejection is caught here instead of by a caller. A saturated simulation returns the
     * OLDEST promise already in flight rather than submitting another, which is how it keeps the
     * frame loop from queueing work faster than the device retires it -- so the handlers are
     * attached only when the promise is one this bridge has not seen. They are what closes the
     * controller's work span: a batch landing on a settled simulation is where a GPU layout
     * stops being work on the device.
     */
    step(): void {
        const simulation = this.#simulation;
        if (simulation === null || this.#failed) {
            return;
        }

        this.#iterationsDone += this.#iterations;
        const arrangement = this.#arrangement;
        const batch = simulation.step(this.#iterations);
        this.#syncWork();
        if (batch !== undefined && !this.#caught.has(batch)) {
            this.#caught.add(batch);
            this.#inFlight += 1;
            void batch.then(
                () => {
                    // The batch has landed, so the simulation knows by now whether it settled.
                    this.#inFlight -= 1;
                    this.#landed += 1;
                    this.#syncWork();
                    // Submitted before a restore, it read back coordinates the restore replaced:
                    // take the element's array again, which still holds the restored ones.
                    if (arrangement !== this.#arrangement && this.#snapshot !== null && this.#positions !== null) {
                        this.#adoptPositions(this.#snapshot.nodeCount, this.#positions);
                    }
                },
                (error: unknown) => {
                    this.#inFlight -= 1;
                    // The simulation this batch was SUBMITTED on, not whichever one is current
                    // when it lands: a swap does not cancel a readback already in flight.
                    this.#onError(error, simulation);
                },
            );
        }
    }

    /**
     * Submits one batch and waits for it, which the pre-step loop and the tests need.
     *
     * SIZES THAT CHANGED SINCE THE COLLISION WAS LAST SET ARE TAKEN IN FIRST. A frame's `step()` takes them at the
     * publish that follows it, but the pre-steps publish only once they are all spent, so they ran with whatever
     * radii were measured last -- part-way through the repaint when a frame had happened to measure them then. The
     * same seed then drew a different graph built before the nodes were drawn than after.
     * @param iterations - Iterations this batch computes.
     * @returns A promise that resolves when the batch has landed, or rejects with its failure.
     */
    async stepAsync(iterations: number): Promise<void> {
        if (this.#simulation === null || this.#failed) {
            return;
        }

        if (this.#radiiStale && this.#snapshot !== null) {
            this.#applyCollision(this.#snapshot.nodeCount);
        }

        this.#iterationsDone += iterations;
        this.#syncWork();
        try {
            await this.#simulation.step(iterations);
        } finally {
            this.#syncWork();
        }
    }

    /**
     * Whether the manager has stopped stepping this layout -- a consumer's pause, or any other
     * stop. A paused layout's work span closes once its in-flight batches land, because nothing
     * is being submitted after them.
     * @returns True while the layout is not being stepped.
     */
    get paused(): boolean {
        return this.#paused;
    }

    /**
     * Tells the bridge whether the manager is stepping it.
     * @param value - True when the manager has stopped stepping this layout.
     */
    set paused(value: boolean) {
        this.#paused = value;
        // Only a pause can close the span here. A resume opens it at the next submitted batch,
        // like any other start, so a layout nobody has stepped yet still reads "idle".
        if (value) {
            this.#syncWork();
        }
    }

    /**
     * Starts the settle count again, on a simulation that has one.
     *
     * `reheat()` is not on the `LayoutSimulation` interface -- both CPU simulations and the GPU
     * ones have it, and a third party's may not -- so it is feature-tested rather than assumed.
     */
    reheat(): void {
        const simulation: (LayoutSimulation & { reheat?: () => void }) | null = this.#simulation;
        if (typeof simulation?.reheat === "function") {
            simulation.reheat();
        }
    }

    /**
     * Takes the element's array as the simulation's coordinates, through a reload of the graph it
     * holds, and drops what batches already in flight read back.
     */
    override loadArrangement(): void {
        this.#arrangement++;
        if (this.#snapshot === null) {
            return;
        }

        const snapshot = this.#dataManager.getSnapshot();
        this.reload(snapshot, this.#dataManager[WRITABLE_LANE].view(snapshot.nodeCount));
    }

    /**
     * Holds a node still for the duration of a drag, without pinning it.
     *
     * The fixed bit is the same one a pin uses, because it is the only thing that stops a
     * simulation writing the row; what makes this temporary is that {@link endDrag} clears it
     * again unless the drag is about to become a pin.
     * @param n - The node the pointer has taken.
     */
    beginDrag(n: Node): void {
        this.#dragging.add(n);
        this.#setFixed(n.index, true);
    }

    /**
     * Gives the node back to the simulation, or leaves it fixed because it is being pinned.
     * A node that was ALREADY PINNED before the pointer took it keeps its bit whatever `pin`
     * says: the store's pin stops the row being published over, but only the fixed bit stops the
     * simulation's own copy of it drifting away from where the reader put it, which the next
     * refit would then have to drag back. Clearing it would leave a node the store still calls
     * pinned being pushed around inside the simulation every frame.
     * @param n - The node the pointer has let go of.
     * @param pin - True when the drag ends in a pin, so the bit stays set.
     */
    endDrag(n: Node, pin: boolean): void {
        this.#dragging.delete(n);
        this.#setFixed(n.index, pin || n.isPinned() || this.isHeld(n.index));
    }

    /**
     * Fixes a pinned node in the simulation. The store already holds the pin.
     * @param n - The node that was pinned.
     */
    protected pin(n: Node): void {
        this.#setFixed(n.index, true);
    }

    /**
     * Releases a node the simulation was holding fixed.
     * @param n - The node that was unpinned.
     */
    protected unpin(n: Node): void {
        // A node a scoped layout is holding stays fixed: the hold is not the reader's pin to lift.
        this.#setFixed(n.index, this.isHeld(n.index));
    }

    /**
     * Holds the rows a scoped layout may not move, in the simulation's own fixed-node mask too.
     * @param mask - One bit per row to hold, or null to hold nothing.
     * @param rows - How many rows the mask covers.
     */
    override setHoldMask(mask: NodeMask | null, rows: number): void {
        super.setHoldMask(mask, rows);
        this.#applyPins();
    }

    /**
     * Places one node now. A drag reaches this per pointer move, and `replayPins` once per pin.
     * @param n - The node that moved.
     * @param p - Where it moved to.
     */
    protected setNodePosition(n: Node, p: Position): void {
        const z = p.z ?? 0;

        // The simulations THROW for a row outside [0, nodeCount) or a coordinate that is not
        // finite, and this runs once per pointer move inside the frame loop, where a throw takes
        // the repaint with it. A node whose row a freeze has not created yet carries
        // `INVALID_INDEX`, and that is not an error -- it is a node with nowhere to be written.
        if (!this.#hasRow(n.index) || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(z)) {
            return;
        }

        // THE ELEMENT'S ROW FIRST, because the simulation no longer writes it: this is the whole
        // of what a dragged node renders at until the pointer lets go. `"placement"` so that it
        // lands on a pinned row too -- moving a pinned node is what a pin is for.
        this.writeNodePosition(n, p.x, p.y, z, "placement");

        // A GROUP FOLLOWING ITS MEMBERS IS INERT IN THE SIMULATION, so where the element puts it
        // is nothing the simulation reads: telling it would only reheat it, every frame the box
        // moves, and a Fruchterman-Reingold run would never cool past 70% of its budget.
        if (this.isFollower(n.index) && this.#simulation?.setInert !== undefined) {
            return;
        }

        const scale = this.#envelopeScale;
        this.#simulation?.setPosition(
            n.index,
            (p.x - this.#targetCentre[0]) / scale + this.#simCentre[0],
            (p.y - this.#targetCentre[1]) / scale + this.#simCentre[1],
            (z - this.#targetCentre[2]) / scale + this.#simCentre[2],
        );
    }

    /**
     * Reads a node's current coordinates, in scene units, out of the element's own position array.
     * @param n - The node to read.
     * @returns Its scene-unit position; the origin for a row nothing has placed.
     */
    getNodePosition(n: Node): Position {
        const out = { x: 0, y: 0, z: 0 };
        this.readNodePosition(n, out);
        return out;
    }

    /**
     * Reads both endpoints of an edge into the one pair this engine reuses.
     * @param e - The edge to read.
     * @returns The pair, valid until the next call; the origin for an endpoint nothing has placed.
     */
    getEdgePosition(e: Edge): EdgePosition {
        this.#readEnd(e, "source", this.#edgePair.src);
        this.#readEnd(e, "target", this.#edgePair.dst);
        return this.#edgePair;
    }

    /**
     * Reads one end of an edge into its half of the pair: by its row for an end drawn with no `Node`.
     * @param e - The edge.
     * @param end - Which end.
     * @param out - The half of the pair it goes in.
     * @param out.x - receives the scene-unit x.
     * @param out.y - receives the scene-unit y.
     * @param out.z - receives the scene-unit z.
     */
    #readEnd(e: Edge, end: "source" | "target", out: { x: number; y: number; z: number }): void {
        const row = e.columnEnd(end);
        if (row === undefined) {
            this.#readInto(end === "source" ? e.srcNode : e.dstNode, out);
        } else if (!this.readRowPosition(row.index, out)) {
            out.x = 0;
            out.y = 0;
            out.z = 0;
        }
    }

    /**
     * Reads one endpoint into the reused pair, or zeroes that half of it.
     *
     * `readNodePosition` leaves `out` UNTOUCHED for a row nothing has placed, which is right for a
     * caller holding one vector per node and wrong for one pair every edge reuses: the unplaced
     * endpoint would be drawn at the PREVIOUS edge's coordinates. The origin is what
     * `getNodePosition` answers for the same row.
     * @param n - The endpoint to read.
     * @param out - The half of the pair it goes in.
     * @param out.x - receives the scene-unit x.
     * @param out.y - receives the scene-unit y.
     * @param out.z - receives the scene-unit z.
     */
    #readInto(n: Node, out: { x: number; y: number; z: number }): void {
        if (!this.readNodePosition(n, out)) {
            out.x = 0;
            out.y = 0;
            out.z = 0;
        }
    }

    /**
     * Nothing: the snapshot IS the graph, and the simulation reads it rather than a node list.
     */
    addNode(): void {
        // The bridge lays out the store's snapshot, which already holds every node.
    }

    /**
     * Nothing, for the same reason as {@link addNode}.
     */
    addEdge(): void {
        // The bridge lays out the store's snapshot, which already holds every edge.
    }

    /**
     * Every node of the graph, which is the list the FRAME LOOP walks.
     *
     * The bridge keeps no list of its own -- the snapshot is the graph -- but these two getters
     * are not bookkeeping: `UpdateManager` moves a mesh only for a node this one yields, draws an
     * edge only for an edge the next one yields, and frames the camera on their count. An empty
     * iterable would let the simulation rewrite the position array every frame while not one mesh
     * moved. So they answer with the data manager's own collections, which hold exactly what
     * `LayoutManager` hands every other engine through `addNodes` / `addEdges`.
     * @returns The graph's live node collection.
     */
    get nodes(): Iterable<Node> {
        return this.#dataManager.nodes.values();
    }

    /**
     * Every edge of the graph that has an `Edge`; see {@link SimulationLayoutEngine.nodes}. An edge stored with no
     * `Edge` (only under renderPath "batched") is simulated by row and drawn by its row line, so it is left out, as
     * d3 and ngraph leave out their edge rows: reading the store's `values()` would build an `Edge` for every one of
     * them on every frame. On the objects path every edge has its `Edge`, so this is every edge, as before.
     * @returns The graph's built edges, live.
     */
    get edges(): Iterable<Edge> {
        return this.#builtEdges();
    }

    /**
     * Whether the simulation has stopped moving.
     *
     * A bridge with no simulation -- before the first load, or stopped after a swap the policy
     * refused -- reads settled, because nothing is going to move.
     * @returns True when the last completed batch settled.
     */
    get isSettled(): boolean {
        return this.#simulation?.settled ?? true;
    }

    /**
     * Maps the simulation's arrangement into the element's scene units, and writes it.
     *
     * This is the seam the file header describes. The mapping is remeasured here rather than
     * fixed once, because a ForceAtlas2 graph expands for hundreds of iterations before it
     * settles: a scale taken at the first step would let the arrangement grow out of the frame,
     * and one taken at the last would not exist until the reader had already watched it happen.
     * Remeasured, a settling graph holds its apparent size and only its shape changes.
     *
     * A FIXED ROW IS NEITHER PUBLISHED NOR MEASURED. Its scene-unit coordinate is the reader's --
     * the pointer's, or where a pin left it -- and `LayoutEngine.writeNodePosition` refuses a
     * layout-intent write to a pinned row for every engine in this element, so the skip is that
     * same rule reaching a row a drag is holding as well. It is left out of the measurement for
     * the same reason it is left out of the write: a radius taken over a row that is not drawn
     * there would resize every row that is. The two sides start in step, because
     * every path that fixes a row leaves them in step: a drag writes both through
     * {@link SimulationLayoutEngine.setNodePosition}, and a pin, a freeze and a rebuild all fix a
     * row whose simulation copy this mapping had just published from.
     *
     * THEY DRIFT APART AFTERWARDS, and deliberately. A refit rescales the arrangement around a
     * held row without moving the row, so the longer the arrangement keeps growing the further
     * the simulation's copy of that row sits from where it is drawn. The obvious repair -- write
     * the row back into the simulation whenever the mapping moves -- was tried and is worse than
     * the problem: a simulation treats a written position as a disturbance and reheats, so an
     * accelerated ForceAtlas2 with one pinned node cleared its settle window on every frame and
     * ran the full sixty-second test budget without once reporting itself at rest. Worse, the
     * write changes the arrangement, which changes the refit, which asks for another write. A pin
     * is a scene-unit promise and it is kept; how far the arrangement moves under it is not part
     * of that promise.
     *
     * WHAT A GRAPH OF NOTHING BUT HELD ROWS COSTS. Fitting only the published rows means that the
     * fewer of them there are the less there is to fit, and two free rows a hair apart are spread
     * to the full radius exactly as a two-node graph would be. That is this rule meeting a reader
     * who has pinned almost everything and taken the size out of the layout's hands; it is bounded
     * -- an arrangement that measures as a point publishes at its own size -- and a graph with no
     * free row left keeps the last map rather than falling back to the identity.
     */
    override publishPositions(): void {
        const snapshot = this.#snapshot;
        const simPositions = this.#simPositions;
        if (snapshot === null || simPositions === null) {
            return;
        }

        const store = this.#dataManager[WRITABLE_LANE];
        this.#landedPublished = this.#landed;
        // ON THE CARD, A LANDING IS PUBLISHED WITH THE TRANSFORM ITS BATCH DREW WITH, so the lane and the
        // texture the ring is copied into hold the same rows; the envelope measured now is the next batches'.
        const drawn = this.#drawnRun();
        const landed = drawn?.simulation.landedDrawn ?? null;
        const viaCard =
            landed !== null && drawn?.suspended === false && !(this.#simulation?.settled ?? true)
                ? (drawn?.simulation.landedDrawnTransform ?? null)
                : null;
        this.#fitEnvelope(snapshot, simPositions);

        const scale = viaCard?.scale ?? this.#envelopeScale;
        const centre = viaCard?.center ?? this.#simCentre;
        const target = viaCard?.target ?? this.#targetCentre;
        const { rows, coords } = this.publishScratch(snapshot.nodeCount);
        let count = 0;
        let first: Node | ElementPositions | undefined;
        const put = (row: number): void => {
            if (!this.#hasRow(row) || (this.#fixedRows.has(row) && store.isPlaced(row))) {
                return;
            }

            rows[count] = row;
            coords[3 * count] = (simPositions[3 * row] - centre[0]) * scale + target[0];
            coords[3 * count + 1] = (simPositions[3 * row + 1] - centre[1]) * scale + target[1];
            coords[3 * count + 2] = (simPositions[3 * row + 2] - centre[2]) * scale + target[2];
            count++;
        };
        if (this.#dataManager.renderLimits?.batched() ?? false) {
            // Under renderPath "batched" every row of the loaded snapshot is published, a row drawn
            // with no Node included; a removed node's row, live until the next freeze, is one the
            // batches draw nothing for.
            first = store;
            for (let row = 0; row < snapshot.nodeCount; row++) {
                put(row);
            }
        } else {
            // Under "objects", node by node, as before: a removed node's row lives until the next freeze.
            for (const node of this.nodes) {
                const before = count;
                put(node.index);
                if (count > before) {
                    first ??= node;
                }
            }
        }

        // A ROW WITH NO COORDINATE HAS NO PLACEMENT TO PROTECT. A node can be pinned before anything
        // has placed it: the pin is a byte in a lane, written from a pointer gesture, and it does
        // not wait for a layout. Refused by the pin guard, such a row would never receive a
        // coordinate at all and would render at the origin for the rest of its life. So its FIRST
        // coordinate lands as a placement, and every one after that is the reader's to keep.
        this.publishColumn(first, rows, coords, count, true);
        // A pinned or dragged row was left out of the publish above; it is still drawn, where it is kept.
        this.keepInPublishedBox(first, this.#fixedRows);
        if (drawn !== null) {
            this.#publishDrawn(drawn, viaCard === null ? null : landed);
        }
    }

    /**
     * The box the last publish left the rows in: one {@link LayoutEngine.publishColumn} per publish.
     * @returns The box, or null.
     * @internal
     */
    override publishedBounds(): Readonly<Float64Array> | null {
        return this.lastPublishedBox();
    }

    /**
     * Follows the drawn target: a simulation that has a ring fills the table on the card, while the
     * graph still offers one (renderPath "batched" on the shared device).
     * @param nodeCount - The rows the simulation was loaded with.
     */
    #attachDrawn(nodeCount: number): void {
        this.#detachDrawn();
        const simulation = this.#simulation;
        const drawn = simulation === null || !this.#accelerated ? null : drawnOf(simulation);
        const target = drawn === null ? null : this.#drawnTarget();
        if (simulation === null || drawn === null || target === null || target.table.rows < nodeCount) {
            return;
        }

        try {
            drawn.setDrawn({ slots: DRAWN_SLOTS, rows: target.table.rowPosition.subarray(0, 4 * nodeCount) });
        } catch (error) {
            this.#onError(error, simulation);
            return;
        }

        const run: DrawnRun = {
            simulation: drawn,
            target,
            n: nodeCount,
            skip: new Uint32Array(Math.ceil(nodeCount / 32)),
            suspended: false,
            told: new Map(),
            mirror: (row, x, y, z, w): void => {
                if (this.#drawn === run && row < nodeCount) {
                    drawn.writeDrawn(row, x, y, z, w);
                    run.told.set(row, this.#landed + this.#inFlight);
                }
            },
        };
        this.#drawn = run;
        target.table.drawnMirror = run.mirror;
        this.#sendDrawnTransform(run);
    }

    /** Back to the upload path: the ring stops, and the table tells no simulation of its writes. */
    #detachDrawn(): void {
        const run = this.#drawn;
        this.#drawn = null;
        if (run === null) {
            return;
        }

        // Only its own: a layout set over this one attaches its ring before this engine is disposed,
        // and clearing the table's mirror then left the new ring told of no write the table made.
        if (run.target.table.drawnMirror === run.mirror) {
            run.target.table.drawnMirror = null;
        }

        if (this.#simulation === (run.simulation as unknown)) {
            try {
                run.simulation.setDrawn(null);
            } catch {
                // a disposed or failed simulation has no ring left to stop
            }
        }
    }

    /**
     * The run filling the table on the card, while the graph still offers the same target.
     * @returns The run, or null.
     */
    #drawnRun(): DrawnRun | null {
        const run = this.#drawn;
        if (run === null) {
            return null;
        }

        const target = this.#drawnTarget();
        if (target?.table !== run.target.table || target.device !== run.target.device) {
            this.#detachDrawn();
            return null;
        }

        run.suspended = target.suspended === true;
        return run;
    }

    /**
     * After a publish on the card (with the transform the landed batch drew with, which a batch's
     * commands recorded across awaits make unknowable here): the rows the ring must leave as the element wrote them, the copy of
     * the landed slot, and the transform the next batches draw with.
     * @param run - The run.
     * @param landed - The landed slot to copy, or null when this publish goes up by upload.
     */
    #publishDrawn(run: DrawnRun, landed: GPUBuffer | null): void {
        const simulation = this.#simulation;
        try {
            this.#sendDrawnSkip(run);
            if (landed === null) {
                run.target.table.dropCopy();
            } else {
                run.target.table.copyLanded(run.target.device, landed, run.n);
                this.#resendTold(run);
            }

            this.#sendDrawnTransform(run);
        } catch (error) {
            if (simulation !== null) {
                this.#onError(error, simulation);
            }
        }
    }

    /**
     * After a copy of the newest landing: sends the rows told to the ring while that batch was in
     * flight, whose copied rows are the told ones and not what the publish wrote, and forgets the
     * rows told before it was submitted, which every later landing holds.
     * @param run - The run.
     */
    #resendTold(run: DrawnRun): void {
        for (const [row, submitted] of run.told) {
            if (submitted >= this.#landed) {
                run.target.table.resend(row);
            } else {
                run.told.delete(row);
            }
        }
    }

    /**
     * Sends the transform the next batches draw with: the envelope last measured.
     * @param run - The run.
     */
    #sendDrawnTransform(run: DrawnRun): void {
        const transform: DrawnTransform = {
            center: [this.#simCentre[0], this.#simCentre[1], this.#simCentre[2]],
            scale: this.#envelopeScale,
            target: [this.#targetCentre[0], this.#targetCentre[1], this.#targetCentre[2]],
        };
        run.simulation.setDrawnTransform(transform);
    }

    /**
     * Sends the rows the ring leaves as the element wrote them: no row, held, followers, and what the
     * table keeps of its own. A row that joins them is written into the ring as the table holds it.
     * @param run - The run.
     */
    #sendDrawnSkip(run: DrawnRun): void {
        // ponytail: one pass over the rows per publish; a dirty set when held rows churn at a million rows.
        const store = this.#dataManager[WRITABLE_LANE];
        const { table } = run.target;
        const next = new Uint32Array(run.skip.length);
        let changed = false;
        for (let row = 0; row < run.n; row++) {
            const skip =
                !this.#hasRow(row) ||
                (this.#fixedRows.has(row) && store.isPlaced(row)) ||
                this.isFollower(row) ||
                table.keepsOwnRow(row);
            if (!skip) {
                continue;
            }

            const word = row >>> 5;
            const bit = 1 << (row & 31);
            next[word] = (next[word] ?? 0) | bit;
            if (((run.skip[word] ?? 0) & bit) === 0) {
                changed = true;
                const at = 4 * row;
                const floats = table.rowPosition;
                run.simulation.writeDrawn(
                    row,
                    floats[at] ?? 0,
                    floats[at + 1] ?? 0,
                    floats[at + 2] ?? 0,
                    floats[at + 3] ?? 0,
                );
            }
        }

        if (changed || next.some((word, i) => word !== run.skip[i])) {
            run.simulation.setDrawnSkip(next);
            run.skip = next;
        }
    }

    /**
     * Measure the envelope over the rows a publish will write, and adopt it as the map from
     * simulation units to scene units -- unless nothing was left to measure.
     * @param snapshot - The snapshot being laid out.
     * @param simPositions - The simulation's coordinates, three per row.
     */
    #fitEnvelope(snapshot: GraphSnapshot, simPositions: F32): void {
        const store = this.#dataManager[WRITABLE_LANE];

        // MEASURED OVER THE ROWS THIS PUBLISH WILL WRITE, and over no others. A held row's
        // simulation coordinate is wherever the pointer last put it, divided back out, so a node
        // dragged outside the envelope would otherwise set the radius every other row is fitted
        // inside -- and since the held row is not published, the rest of the graph would shrink
        // under a pointer that stayed where it was. Measured, at 40 nodes and `scalingFactor`
        // 100: one node dragged to x 400 took the other 39 from a radius of 99.993 to 25.626.
        // A group following its members is placed by the element, never by this publish.
        const held =
            this.#fixedRows.size === 0
                ? null
                : (row: number): boolean => (this.#fixedRows.has(row) && store.isPlaced(row)) || this.isFollower(row);
        const radii = this.#collisionRadii(snapshot.nodeCount);
        const radius = Math.max(this.#options.scalingFactor, this.#packedRadius);
        const measured = measureEnvelope(simPositions, snapshot.nodeCount, radius, held);

        // NOTHING LEFT TO MEASURE KEEPS THE LAST MAP rather than resetting it to the identity. A
        // graph every row of which is held publishes nothing, but the next `setNodePosition` still
        // has to divide a scene-unit coordinate back into the simulation's units, and those units
        // did not move just because no row was published in them.
        if (measured.placed > 0) {
            this.#envelopeScale = measured.scale;
            this.#simCentre[0] = measured.centre[0];
            this.#simCentre[1] = measured.centre[1];
            this.#simCentre[2] = measured.centre[2];
        }

        if (radii !== null) {
            this.#setCollision(radii, this.#envelopeScale);
        }
    }

    /**
     * One radius per row: the node's reach plus half of `nodeGap`, so two of them add up to what a pair keeps.
     * A group following its members encloses them and is kept apart from nothing.
     * @param nodeCount - The loaded snapshot's node count.
     * @returns The radii, or null when `nodeGap` is unset.
     */
    #collisionRadii(nodeCount: number): F32 | null {
        const gap = this.#options.nodeGap ?? null;
        if (gap === null) {
            return null;
        }

        if (this.#radii?.length === nodeCount && !this.#radiiStale) {
            return this.#radii;
        }

        const dimensions =
            this.#options.nodeGapFront === true ? 2 : (this.#options.model.dim ?? this.#options.dim ?? 3);
        const radii = new Float32Array(nodeCount);
        for (const node of this.nodes) {
            if (this.#hasRow(node.index) && !this.isFollower(node.index)) {
                radii[node.index] = node.spacingRadius(dimensions === 2) + gap / 2;
            }
        }

        this.#radii = radii;
        this.#radiiStale = false;
        this.#packedRadius = packedRadius(radii, dimensions);
        return radii;
    }

    /**
     * Tells the simulation what to keep apart, in its own units: a scene unit is 1 / `envelopeScale` of them.
     * @param radii - The radii, in scene units.
     * @param envelopeScale - What a simulation unit is multiplied by to reach the scene.
     */
    #setCollision(radii: F32, envelopeScale: number): void {
        const simulation = this.#simulation;
        try {
            simulation?.setCollision?.({
                radii,
                scale: 1 / envelopeScale,
                flat: this.#options.nodeGapFront === true,
            });
        } catch (error) {
            if (simulation !== null) {
                this.#onError(error, simulation);
            }
        }
    }

    /**
     * Whether `nodeGap` is set.
     * @returns True when the engine spaces nodes by their drawn size.
     * @internal
     */
    override get spacesBySize(): boolean {
        return (this.#options.nodeGap ?? null) !== null;
    }

    /**
     * Start the layout again because a node's drawn size changed, when `nodeGap` keeps nodes apart by that size. A
     * running layout reads the new sizes at its next publish.
     * @returns True when the frame loop has to start stepping this layout again.
     */
    override wakeForResize(): boolean {
        if (!this.spacesBySize) {
            return false;
        }

        this.#radiiStale = true;
        const snapshot = this.#snapshot;
        if (snapshot === null || this.#simulation === null || !this.isSettled) {
            return false;
        }

        const radii = this.#collisionRadii(snapshot.nodeCount);
        if (radii !== null) {
            this.#setCollision(radii, this.#envelopeScale);
        }

        this.reheat();
        return !this.isSettled;
    }

    /**
     * Releases the simulation. The accelerator's residency for the snapshot is NOT released here:
     * it is per snapshot and shared with the algorithm runs, and `Graph` frees it at the next
     * freeze and at shutdown.
     */
    override dispose(): void {
        this.#detachDrawn();
        this.#simulation?.dispose();
        this.#simulation = null;
        this.#syncWork();
    }

    /**
     * Tells the controller whether the accelerator is being stepped right now.
     *
     * The controller counts the work it runs itself, and a simulation is none of it: the bridge
     * submits a batch per frame until the arrangement settles, so without this the state a
     * consumer reads would stay `"idle"` -- attached, nothing using it -- for the whole of a GPU
     * layout, and a status chip would say the device was asleep while it was busy.
     *
     * The span is one settle, not one batch: opening and closing it per batch would publish a
     * transition twice a frame, to every `onChange` listener and out to the DOM. It opens when an
     * accelerated batch is submitted and closes when one lands on a settled simulation, when the
     * simulation is replaced or disposed, and when a batch fails. A layout PAUSED mid-settle
     * keeps its span only until the batches it had in flight have landed: after them nothing is
     * submitted, so the device is idle until the layout resumes.
     */
    #syncWork(): void {
        const working =
            this.#accelerated &&
            this.#simulation !== null &&
            !this.#failed &&
            !this.isSettled &&
            !(this.#paused && this.#inFlight === 0);

        if (working === (this.#endWork !== null)) {
            return;
        }

        if (working) {
            this.#endWork = this.#controller.beginWork();
            return;
        }

        this.#endWork?.();
        this.#endWork = null;
    }

    /**
     * Packs the store's pin lane, the dragged nodes and the scope hold into the simulation's mask.
     *
     * A PACK, not a copy: the lane is one byte per node and the mask is one bit. It runs after
     * every load, because a freeze renumbers the rows and the lane is remapped with them. The
     * nodes a pointer is holding are OR-ed in afterwards: a drag is not a pin and has no row in
     * the lane, but it holds the node just as still.
     */
    #applyPins(): void {
        const snapshot = this.#snapshot;
        const simulation = this.#simulation;
        if (snapshot === null || simulation === null) {
            return;
        }

        const { nodeCount } = snapshot;
        const pins = this.#dataManager[WRITABLE_LANE].pinnedView(nodeCount);
        const mask = makeMask(nodeCount);
        const rows = new Set<number>();
        for (let i = 0; i < nodeCount; i += 1) {
            if (pins[i] === 1) {
                maskSet(mask, i, true);
                rows.add(i);
            }
        }

        for (const held of this.#dragging) {
            if (this.#hasRow(held.index)) {
                maskSet(mask, held.index, true);
                rows.add(held.index);
            }
        }

        // The rows a scoped layout holds, and the groups that follow their members, which the
        // lane never carries: a hold is not a pin.
        if (this.holdsAny) {
            for (let i = 0; i < nodeCount; i += 1) {
                if (this.isHeld(i)) {
                    maskSet(mask, i, true);
                    rows.add(i);
                }
            }
        }

        this.#mask = mask;
        this.#fixedRows = rows;
        simulation.setFixed(mask);

        this.#applyInert(simulation, nodeCount);
        this.#applyClusters(simulation, nodeCount);
        this.#applyCollision(nodeCount);
    }

    /**
     * Reads `clusterBy` over the loaded snapshot.
     * @returns Each member's community.
     */
    #readCommunities(): ReadonlyMap<Node | number, number> {
        const { clusterBy } = this.#options;
        if (clusterBy === undefined || clusterBy === null || this.#snapshot === null) {
            return new Map();
        }

        const skip = (row: number): boolean => !this.#hasRow(row) || this.isFollower(row);
        if (this.#dataManager.renderLimits?.batched() ?? false) {
            // Under renderPath "batched" by row, so a row with no Node is read without building one.
            const manager = this.#dataManager;
            return readRowCommunities(
                clusterBy,
                this.#snapshot.nodeCount,
                (row) => manager.nodesByIndex[row]?.data ?? this.rowRecord?.(row),
                this.clusterColumn,
                skip,
                this.#snapshot,
            );
        }

        return readCommunities(clusterBy, this.nodes, this.clusterColumn, skip, this.#snapshot);
    }

    /**
     * Tells a simulation that has just been loaded what to pull together. AFTER EVERY LOAD, because a freeze renumbers
     * the rows, and a run that has not finished yet leaves every node in none until its results land.
     * @param simulation - The running simulation.
     * @param nodeCount - The loaded snapshot's node count.
     */
    #applyClusters(simulation: LayoutSimulation, nodeCount: number): void {
        this.#communities = this.#readCommunities();
        if (this.#communities.size === 0) {
            simulation.setClusters?.(null);
            return;
        }

        const communities = new Uint32Array(nodeCount).fill(NO_CLUSTER);
        for (const [member, community] of this.#communities) {
            communities[typeof member === "number" ? member : member.index] = community;
        }

        simulation.setClusters?.({ communities, strength: this.#options.clusterStrength });
    }

    /**
     * Read `clusterBy` again, and rebuild the simulation when the communities changed: a full run from the arrangement
     * as it stands, because a late reheat of Fruchterman-Reingold leaves it too cold for the pull to move anything.
     * @returns True when the frame loop has to start stepping this layout again.
     */
    override wakeForClusters(): boolean {
        if (sameCommunities(this.#readCommunities(), this.#communities)) {
            return false;
        }

        this.replaceSimulation();
        return true;
    }

    /**
     * Tells a simulation that has just been loaded what to keep apart.
     *
     * AFTER EVERY LOAD, because a freeze renumbers the rows. Fitted to the arrangement as it stands: the map the last
     * publish left means nothing to a simulation that has not published yet, whose own units may be far from the
     * scene's.
     * @param nodeCount - The loaded snapshot's node count.
     */
    #applyCollision(nodeCount: number): void {
        this.#radiiStale = true;
        const radii = this.#collisionRadii(nodeCount);
        const simPositions = this.#simPositions;
        if (radii !== null && simPositions !== null) {
            const radius = Math.max(this.#options.scalingFactor, this.#packedRadius);
            const { placed, scale } = measureEnvelope(simPositions, nodeCount, radius);
            this.#setCollision(radii, placed > 0 ? scale : this.#envelopeScale);
        }
    }

    /**
     * Marks the groups that follow their members inert in the simulation.
     *
     * A group following its members is drawn round them, not laid out with them: inert in the
     * simulation, it neither repels them nor pulls on them, so they settle exactly where they
     * would without it (issue #3075; the ngraph engine gives it no mass for the same reason).
     * @param simulation - The running simulation.
     * @param nodeCount - The loaded snapshot's node count.
     */
    #applyInert(simulation: LayoutSimulation, nodeCount: number): void {
        const inert = makeMask(nodeCount);
        for (let i = 0; i < nodeCount && this.holdsAny; i += 1) {
            if (this.isFollower(i)) {
                maskSet(inert, i, true);
            }
        }
        simulation.setInert?.(inert);
    }

    /**
     * Plans, builds and loads a simulation over the snapshot this bridge is holding.
     * @throws Whatever `plan()` or `createSimulation` throws.
     */
    #build(): void {
        const snapshot = this.#snapshot;
        const positions = this.#positions;
        if (snapshot === null || positions === null) {
            return;
        }

        // A REBUILD KEEPS THE ARRANGEMENT, so the simulation's array is adopted only when there
        // is none to keep: `load` and `reload` adopt for themselves, and an accelerator swap
        // arrives here with the running layout's coordinates already in hand.
        const held = this.#simPositions;
        const simPositions =
            held !== null && held.length === 3 * snapshot.nodeCount
                ? held
                : this.#adoptPositions(snapshot.nodeCount, positions);

        // BEFORE THE PLAN, because `plan()` and `createSimulation` both refuse work: a bridge
        // whose build threw must read as what it is -- stopped, on nothing -- and not as still
        // holding the accelerator it was last built with, which would make the next transition
        // back to that same accelerator answer "unchanged" and never rebuild it.
        this.#builtWith = null;
        this.#accelerated = false;
        this.#precision = CPU_PRECISION;

        const decision = this.#controller.plan({ capability: this.capability, nodeCount: snapshot.nodeCount });
        const accelerator = decision.accelerated ? decision.accelerator : null;

        // SAY SO RATHER THAN ARRANGE THE GRAPH SOME OTHER WAY. `spring-electrical` has no CPU
        // implementation at all, so without an accelerator that computes it there is nothing to
        // run. `createSimulation` refuses too, with a plain `Error`; refusing here gives the
        // consumer the code they would switch on for any other missing accelerator, and the
        // layout catalogue says the engine needs one, so nobody has to try it to find out.
        if (!decision.accelerated && this.simulationType === "spring-electrical") {
            throw new GraphtyError({
                code: "E_NO_ACCELERATOR",
                message:
                    `the layout "${this.type}" is computed on a hardware accelerator and has no processor ` +
                    `implementation: ${decision.reason}`,
                source: "layout",
                details: {
                    layout: this.type,
                    reason: decision.reason,
                },
            });
        }

        const { graph: undirected, weight } = this.#loadable(snapshot);
        this.#weightSpec = weight;
        this.#seed(snapshot, simPositions);
        this.#nodeMass = this.#resolveNodeMass(undirected);
        this.#iterations = this.#resolveIterations(snapshot.nodeCount);
        this.#simulation = createSimulation(
            this.simulationType,
            this.#simulationOptions(),
            accelerator === null ? null : narrowLayout(accelerator),
        );
        // The ATTACHED accelerator, not the one this simulation was handed: see the field.
        this.#builtWith = this.#controller.accelerator;
        this.#accelerated = decision.accelerated;
        this.#precision = decision.accelerated ? decision.precision : CPU_PRECISION;
        this.#failed = false;
        this.#iterationsDone = 0;

        // The simulations require an undirected graph, and the bridge -- not its caller -- is
        // what knows that: callers pass the snapshot `getSnapshot()` handed them.
        this.#simulation.load(undirected, simPositions);
        this.#applyPins();
        this.#attachDrawn(snapshot.nodeCount);
    }

    /**
     * Turns a reader's `nodeMass` record into one value per dense row, and leaves every other form
     * alone. See {@link SimulationLayoutEngine.resolvedNodeMass}.
     * @param undirected - The graph the simulation will be loaded with.
     * @returns The masses, or null when the simulation resolves them itself.
     */
    #resolveNodeMass(undirected: GraphSnapshot): F32 | null {
        return resolveNodeMass((this.#options.model as { nodeMass?: unknown }).nodeMass, undirected);
    }

    /**
     * Gives a coordinate to every row that has none, before the simulation reads them.
     *
     * A row nothing has placed reads as NaN, which is the element's "not laid out yet" -- and a
     * force is an arithmetic operation, so a NaN row stays NaN through every iteration and its
     * node never appears. The CPU simulations say so outright ("the caller seeds the array with
     * seedPositions"), so the caller is this. Finite rows are never touched, which is what makes
     * this safe to run at every load: an existing arrangement survives and only the rows a freeze
     * added are placed, inside the box the rest of the graph already occupies. The array is the
     * SIMULATION'S, which `#adoptPositions` has just filled from the element's.
     * @param snapshot - The graph being loaded.
     * @param positions - The simulation's array, exactly `3 * nodeCount` long.
     */
    #seed(snapshot: GraphSnapshot, positions: F32): void {
        const { seed, dim, scale, center } = this.#options.model;
        seedPositions(
            snapshot,
            positions,
            seed ?? null,
            dim ?? this.#options.dim ?? 3,
            scale ?? this.#options.scale ?? 1,
            center ?? this.#options.center ?? null,
            this.simulationType === "forceatlas2" ? "fa2" : "fr",
        );
    }

    /**
     * Rebuilds the simulation's array from the element's, in the simulation's own units.
     *
     * The element's array is the one a freeze renumbers, a drag writes and a file's coordinates
     * arrive in, so it -- not the simulation's -- is what an arrangement is carried across a load
     * in. Each row travels through the inverse of the mapping the last publish used, which is the
     * identity before anything has been published; an unplaced row is NaN in both arrays, and
     * `#seededSimPositions` is what gives it a coordinate.
     * @param nodeCount - The graph being loaded.
     * @param positions - The element's array, exactly `3 * nodeCount` long.
     * @returns The simulation's array, holding the element's arrangement in simulation units.
     */
    #adoptPositions(nodeCount: number, positions: F32): F32 {
        const length = 3 * nodeCount;
        const simPositions =
            this.#simPositions !== null && this.#simPositions.length === length
                ? this.#simPositions
                : new Float32Array(length);

        const scale = this.#envelopeScale;
        for (let row = 0; row < nodeCount; row += 1) {
            for (let axis = 0; axis < 3; axis += 1) {
                simPositions[3 * row + axis] =
                    (positions[3 * row + axis] - this.#targetCentre[axis]) / scale + this.#simCentre[axis];
            }
        }

        this.#simPositions = simPositions;

        return simPositions;
    }

    /**
     * The options handed to `createSimulation`: the common knobs, then the type's own, then the
     * iteration count this load resolved.
     * @returns The options object.
     */
    #simulationOptions(): ForceAtlas2Options | FruchtermanReingoldOptions | SpringElectricalOptions {
        const {
            model,
            iterationsPerStep: _explicit,
            stepMultiplier: _base,
            clusterBy: _clusterBy,
            clusterStrength: _clusterStrength,
            nodeGap: _gap,
            nodeGapFront: _front,
            ...common
        } = this.#options;
        const resolved = this.#nodeMass === null ? {} : { nodeMass: this.#nodeMass };
        const weight = this.#weightSpec === undefined ? {} : { weight: this.#weightSpec };
        return { ...common, ...model, ...resolved, ...weight, iterationsPerStep: this.#iterations };
    }

    /**
     * The undirected graph a simulation is loaded with, and the `weight` it reads it by.
     *
     * Only a simulation asked to read weights (ForceAtlas2 with `weighted`) asks what they mean: a
     * strength is the snapshot's own weights, a distance is inverted into a derived column (same
     * core and serial, so an accelerator's residency for the snapshot is reused and released with
     * it), and null reads none. The CPU and the accelerator read the same answer.
     * @param snapshot - The graph, as `getSnapshot()` returns it.
     * @returns The graph to load, and the `weight` option, undefined when the model reads none.
     */
    #loadable(snapshot: GraphSnapshot): { graph: GraphSnapshot; weight: boolean | string | undefined } {
        const undirected = this.#dataManager.undirected(snapshot).snapshot;
        // An edge the filter hides between two shown nodes pulls nothing (see `LayoutEngine.setLeftOut`).
        const keptEdges = this.keptEdges(undirected);
        const graph = keptEdges === null ? undirected : undirected.filterEdges(keptEdges).snapshot;
        if ((this.#options.model as { weight?: unknown }).weight !== true) {
            return { graph, weight: undefined };
        }

        const meaning = this.#weightMeaning();
        const { weights } = graph.edgeList();
        if (meaning !== "distance" || weights === null) {
            return { graph, weight: meaning !== null };
        }

        const strengths = Float32Array.from(weights, (w) => asStrength(w, "distance"));
        return { graph: graph.withColumns(undefined, { [STRENGTH_COLUMN]: strengths }), weight: STRENGTH_COLUMN };
    }

    /**
     * How many iterations one `step()` submits over the graph this load holds.
     * @param nodeCount - The graph this load is over.
     * @returns The iteration count.
     */
    #resolveIterations(nodeCount: number): number {
        const { iterationsPerStep, stepMultiplier } = this.#options;
        return iterationsPerStepFor(iterationsPerStep, stepMultiplier, nodeCount);
    }

    /**
     * Sets or clears one bit of the fixed mask and tells the simulation.
     *
     * A no-op before the first load and while the bridge is stopped: there is no simulation to
     * tell, and the next load packs the whole lane anyway.
     * @param index - The node's dense row.
     * @param fixed - Whether the simulation must hold it still.
     */
    #setFixed(index: number, fixed: boolean): void {
        const mask = this.#mask;
        const simulation = this.#simulation;
        if (mask === null || simulation === null || !this.#hasRow(index)) {
            return;
        }

        maskSet(mask, index, fixed);
        if (fixed) {
            this.#fixedRows.add(index);
        } else {
            this.#fixedRows.delete(index);
        }

        simulation.setFixed(mask);
    }

    /**
     * Whether the loaded snapshot has a row at this index.
     *
     * The element's "this node has no row yet" is `INVALID_INDEX`, which is `0xffffffff` and so
     * passes any `index < 0` test; the simulations answer an index they have no row for with a
     * `RangeError`.
     * @param index - The node's dense row, or the sentinel.
     * @returns True when the index addresses a row of the loaded graph.
     */
    #hasRow(index: number): boolean {
        return Number.isInteger(index) && index >= 0 && index < (this.#snapshot?.nodeCount ?? 0);
    }

    /**
     * Reports a rejected batch and stops stepping the simulation it came from.
     *
     * ONCE PER SIMULATION: a lost device rejects every batch it had outstanding -- two by default
     * -- and the consumer is told about that device once.
     *
     * The stop flag belongs to the simulation the batch was SUBMITTED on, which is not always the
     * one running when it lands: the device loss that rejected it also transitions the controller,
     * and that transition can reach `LayoutManager` and swap the simulation while the rest of the
     * batches are still in flight. Setting the flag on whatever is current would stop the
     * simulation that just RECOVERED the layout, which would then submit nothing for the rest of
     * its life. Dropping a replaced simulation's rejection is the other wrong answer: which of
     * `device.lost` and an outstanding readback settles first is not ordered, so a report that
     * skipped it would arrive or not depending on that race. It is reported either way, and only
     * the simulation that failed is stopped.
     *
     * What happens after a live simulation's failure is the controller's: its own device-loss
     * watch transitions, and that transition reaches `LayoutManager`, which rebuilds the
     * simulation on whatever the policy now allows. The running layout reaches the CPU only AFTER
     * the failure was reported, and only under a policy that permits a CPU.
     * @param error - The rejection.
     * @param from - The simulation the batch was submitted on.
     */
    #onError(error: unknown, from: LayoutSimulation): void {
        if (this.#reported === from) {
            return;
        }

        this.#reported = from;
        if (from === this.#simulation) {
            this.#failed = true;
            this.#syncWork();
        }

        this.#report(
            GraphtyError.wrap(error, {
                code: "E_INTERNAL",
                source: "layout",
                details: { layoutType: this.type, simulation: this.simulationType },
            }),
        );
    }
}
