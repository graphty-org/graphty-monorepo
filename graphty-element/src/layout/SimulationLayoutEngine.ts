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
    resolveNodeVector,
    seedPositions,
    type SimulationOptions,
    type SimulationType,
    type SpringElectricalOptions,
} from "@graphty/layout";

import type { AccelerationController } from "../acceleration/AccelerationController";
import { narrowLayout } from "../acceleration/narrow";
import { type AccelerationPrecision, CPU_PRECISION, type GraphAccelerator } from "../acceleration/types";
import type { Edge } from "../Edge";
import { GraphtyError } from "../errors";
import type { DataManager } from "../managers/DataManager";
import type { Node } from "../Node";
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
 * The scene-unit point an arrangement is published around.
 * @param centre - Whatever the options carry, in the layout package's `ArrayLike` form.
 * @returns The three components, defaulting to the origin.
 */
function resolveCentre(centre: ArrayLike<number> | null | undefined): [number, number, number] {
    if (centre === null || centre === undefined) {
        return [0, 0, 0];
    }

    return [
        centre.length > 0 ? centre[0] : 0,
        centre.length > 1 ? centre[1] : 0,
        centre.length > 2 ? centre[2] : 0,
    ];
}

/**
 * The accelerator member each simulation type needs, which is what the controller feature-tests.
 *
 * `"spring"` is the element's name for Fruchterman-Reingold, so the two share one capability.
 */
const CAPABILITY: Readonly<Record<SimulationType, string>> = {
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
    #dragging = new Set<Node>();

    /**
     * The node masses this simulation was built with, when the reader gave them as a record keyed
     * by node id, and null for every other form. See {@link SimulationLayoutEngine.resolvedNodeMass}.
     */
    #nodeMass: F32 | null = null;

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

    /** Set by `LayoutManager` while it is not stepping this layout. See {@link paused}. */
    #paused = false;
    #iterations = 1;
    #iterationsDone = 0;

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
        this.capability = CAPABILITY[built.type];
        this.#options = built.options as SimulationEngineOptions;
        this.#controller = built.controller;
        this.#report = built.report as (error: GraphtyError) => void;
        this.#dataManager = built.dataManager as DataManager;
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
        this.load(snapshot, this.#dataManager.positions.view(snapshot.nodeCount));
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
        this.#simulation?.dispose();
        this.#simulation = null;
        this.#syncWork();
        this.#snapshot = snapshot;
        this.#positions = positions;
        this.#adoptPositions(snapshot.nodeCount, positions);
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
        if (simulation === null || decision.accelerated !== this.#accelerated || massStale) {
            this.replaceSimulation();
            return;
        }

        this.#iterations = this.#resolveIterations(snapshot.nodeCount);
        this.#seed(snapshot, simPositions);
        simulation.load(this.#dataManager.undirected(snapshot).snapshot, simPositions);

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
        const batch = simulation.step(this.#iterations);
        this.#syncWork();
        if (batch !== undefined && !this.#caught.has(batch)) {
            this.#caught.add(batch);
            this.#inFlight += 1;
            void batch.then(
                () => {
                    // The batch has landed, so the simulation knows by now whether it settled.
                    this.#inFlight -= 1;
                    this.#syncWork();
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
     * @param iterations - Iterations this batch computes.
     * @returns A promise that resolves when the batch has landed, or rejects with its failure.
     */
    async stepAsync(iterations: number): Promise<void> {
        if (this.#simulation === null || this.#failed) {
            return;
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
        const simulation = this.#simulation as (LayoutSimulation & { reheat?: () => void }) | null;
        if (typeof simulation?.reheat === "function") {
            simulation.reheat();
        }
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
        this.#setFixed(n.index, pin || n.isPinned());
    }

    /**
     * Fixes a pinned node in the simulation. The store already holds the pin.
     * @param n - The node that was pinned.
     */
    pin(n: Node): void {
        this.#setFixed(n.index, true);
    }

    /**
     * Releases a node the simulation was holding fixed.
     * @param n - The node that was unpinned.
     */
    unpin(n: Node): void {
        this.#setFixed(n.index, false);
    }

    /**
     * Places one node now. A drag reaches this per pointer move, and `replayPins` once per pin.
     * @param n - The node that moved.
     * @param p - Where it moved to.
     */
    setNodePosition(n: Node, p: Position): void {
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
        this.#readInto(e.srcNode, this.#edgePair.src);
        this.#readInto(e.dstNode, this.#edgePair.dst);
        return this.#edgePair;
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
     * Every edge of the graph; see {@link SimulationLayoutEngine.nodes}.
     * @returns The graph's live edge collection.
     */
    get edges(): Iterable<Edge> {
        return this.#dataManager.edges.values();
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

        const store = this.#dataManager.positions;

        // MEASURED OVER THE ROWS THIS PUBLISH WILL WRITE, and over no others. A held row's
        // simulation coordinate is wherever the pointer last put it, divided back out, so a node
        // dragged outside the envelope would otherwise set the radius every other row is fitted
        // inside -- and since the held row is not published, the rest of the graph would shrink
        // under a pointer that stayed where it was. Measured, at 40 nodes and `scalingFactor`
        // 100: one node dragged to x 400 took the other 39 from a radius of 99.993 to 25.626.
        const held =
            this.#fixedRows.size === 0
                ? null
                : (row: number): boolean => this.#fixedRows.has(row) && store.isPlaced(row);
        const measured = measureEnvelope(simPositions, snapshot.nodeCount, this.#options.scalingFactor, held);

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

        const scale = this.#envelopeScale;
        const centre = this.#simCentre;
        for (const node of this.nodes) {
            const row = node.index;
            if (!this.#hasRow(row)) {
                continue;
            }

            // A ROW WITH NO COORDINATE HAS NO PLACEMENT TO PROTECT. A node can be pinned before
            // anything has placed it: the pin is a byte in a lane, written from a pointer
            // gesture, and it does not wait for a layout. Skipped here and refused by the pin
            // guard below, such a row would never receive a coordinate at all and would render
            // at the origin for the rest of its life. So its FIRST coordinate lands as a
            // placement, and every one after that is the reader's to keep.
            const placed = store.isPlaced(row);
            if (placed && this.#fixedRows.has(row)) {
                continue;
            }

            this.writeNodePosition(
                node,
                (simPositions[3 * row] - centre[0]) * scale + this.#targetCentre[0],
                (simPositions[3 * row + 1] - centre[1]) * scale + this.#targetCentre[1],
                (simPositions[3 * row + 2] - centre[2]) * scale + this.#targetCentre[2],
                placed ? "layout" : "placement",
            );
        }
    }

    /**
     * Releases the simulation. The accelerator's residency for the snapshot is NOT released here:
     * it is per snapshot and shared with the algorithm runs, and `Graph` frees it at the next
     * freeze and at shutdown.
     */
    override dispose(): void {
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
     * Packs the store's pin lane into the simulation's mask.
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
        const pins = this.#dataManager.positions.pinnedView(nodeCount);
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

        this.#mask = mask;
        this.#fixedRows = rows;
        simulation.setFixed(mask);
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

        const undirected = this.#dataManager.undirected(snapshot).snapshot;
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
        const { model, iterationsPerStep: _explicit, stepMultiplier: _base, ...common } = this.#options;
        const resolved = this.#nodeMass === null ? {} : { nodeMass: this.#nodeMass };
        return { ...common, ...model, ...resolved, iterationsPerStep: this.#iterations };
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
