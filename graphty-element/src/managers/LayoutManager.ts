import type {
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    SimulationType,
    SpringElectricalOptions,
} from "@graphty/layout";

import type { AccelerationController } from "../acceleration/AccelerationController";
import { resolveOptionValues } from "../catalog/options";
import type { AuthoredLayoutDescriptor } from "../catalog/types";
import type { GraphLayoutBehavior } from "../config/GraphBehavior";
import { type OptionsSchema, toZodSchema } from "../config/OptionsSchema";
import type { Edge } from "../Edge";
import { GraphtyError, isGraphtyError } from "../errors";
import type { GraphSnapshotReplacedEvent } from "../events";
import { ForceAtlas2Layout } from "../layout/ForceAtlas2LayoutEngine";
import { LayoutEngine } from "../layout/LayoutEngine";
import {
    type SimulationEngineInit,
    type SimulationEngineOptions,
    SimulationLayoutEngine,
} from "../layout/SimulationLayoutEngine";
import { SpringElectricalLayout } from "../layout/SpringElectricalLayoutEngine";
import { SpringLayout } from "../layout/SpringLayoutEngine";
import { GraphtyLogger, type Logger } from "../logging/GraphtyLogger.js";
import type { Node } from "../Node";
import type { Styles } from "../Styles";
import type { DataManager } from "./DataManager";
import type { EventManager } from "./EventManager";
import type { GraphContext } from "./GraphContext";
import type { Manager } from "./interfaces";

/**
 * The largest batch a pre-step chunk submits.
 *
 * It is the GPU package's own `MAX_ITERATIONS_PER_STEP` (`src/constants.ts`), declared here
 * rather than imported: the peer is optional, and the core may not reach it.
 */
const MAX_ITERATIONS_PER_STEP_CHUNK = 256;

/**
 * The published option schema each simulation type is configured through.
 *
 * ONE DECLARATION, not two. Each of the three engines used to carry a second, stricter Zod object
 * beside the schema the catalogue publishes, and the two could disagree -- ForceAtlas2's `gravity`
 * was positive in one and positive in the other while the Storybook slider offered zero. What a
 * reader is offered, what a picker renders and what the element validates are now the same
 * declaration. `"fruchtermanReingold"` is the layout package's own spelling of the simulation the
 * element registers as `"spring"`, so the two share one schema.
 */
const SIMULATION_OPTION_SCHEMAS: Readonly<Record<SimulationType, OptionsSchema>> = {
    forceatlas2: ForceAtlas2Layout.zodOptionsSchema,
    fruchtermanReingold: SpringLayout.zodOptionsSchema,
    spring: SpringLayout.zodOptionsSchema,
    "spring-electrical": SpringElectricalLayout.zodOptionsSchema,
};

/**
 * The scene-unit radius a simulation's arrangement is published at when its layout publishes no
 * control for it.
 *
 * ForceAtlas2 and Spring both declare `scalingFactor` with this default and spring-electrical
 * declares none, so all three land in the same envelope as the element's fourteen one-shot
 * layouts, which publish a unit ball times their own `scalingFactor` of 100.
 */
const DEFAULT_SCALING_FACTOR = 100;

/**
 * Every option any of the three simulation layouts publishes, once Zod has applied its defaults.
 *
 * One shape rather than three, because the mapping below is one function: a key a given type does
 * not publish is simply absent after that type's schema has parsed.
 */
interface ParsedSimulationOptions {
    scalingFactor?: number;
    maxIter?: number;
    jitterTolerance?: number;
    scalingRatio?: number;
    gravity?: number;
    strongGravity?: boolean;
    distributedAction?: boolean;
    linlog?: boolean;
    dissuadeHubs?: boolean;
    weighted?: boolean;
    nodeMass?: Readonly<Record<string, number>> | string | null;
    k?: number | null;
    iterations?: number;
    springLength?: number;
    springCoefficient?: number;
    dragCoefficient?: number;
    timeStep?: number;
    scale?: number;
    dim?: 2 | 3;
    seed?: number | null;
}

/**
 * Turn the options a reader set into the options the chosen simulation takes.
 *
 * The names differ in three places, and each difference is a name the element published before the
 * simulation seam existed: ForceAtlas2's `scalingFactor` is the simulation's `scale` (both are the
 * multiplier the arrangement is published in scene units at), its `weighted` boolean is the
 * simulation's `weight`, which reads `true` as the snapshot's own weight column, and `nodeSize` is
 * not offered at all -- the published schema never carried it, and an accelerator refuses any
 * value but null, so a layout that took one would build on the CPU and fail on the GPU.
 * @param type - Which simulation is being configured.
 * @param options - The published options as the consumer set them.
 * @returns The type's own options, ready for `createSimulation`.
 */
function simulationModel(
    type: SimulationType,
    options: ParsedSimulationOptions,
): ForceAtlas2Options | FruchtermanReingoldOptions | SpringElectricalOptions {
    const common = { dim: options.dim, seed: options.seed };

    switch (type) {
        case "forceatlas2":
            return {
                ...common,
                scale: options.scalingFactor,
                maxIter: options.maxIter,
                jitterTolerance: options.jitterTolerance,
                scalingRatio: options.scalingRatio,
                gravity: options.gravity,
                strongGravity: options.strongGravity,
                distributedAction: options.distributedAction,
                linlog: options.linlog,
                dissuadeHubs: options.dissuadeHubs,
                weight: options.weighted,
                nodeMass: options.nodeMass,
                nodeSize: null,
            };
        case "fruchtermanReingold":
        case "spring":
            // BOTH of Spring's published multipliers, because both were live and they multiplied:
            // the one-shot layout fitted its arrangement into a box of `scale`, and the element
            // then published every coordinate multiplied by `scalingFactor`. The simulation has
            // one, so it is handed their product -- and so is the bridge, as the radius it
            // publishes at: see {@link publishedRadius}, without which the refit would swallow
            // `scale` whole and a published control would do nothing a reader could see.
            return {
                ...common,
                scale: (options.scalingFactor ?? 1) * (options.scale ?? 1),
                k: options.k,
                iterations: options.iterations,
            };
        case "spring-electrical":
            return {
                ...common,
                scale: options.scale,
                springLength: options.springLength,
                springCoefficient: options.springCoefficient,
                gravity: options.gravity,
                dragCoefficient: options.dragCoefficient,
                timeStep: options.timeStep,
            };
        default: {
            const never: never = type;
            throw new Error(`no option mapping for simulation type ${String(never)}`);
        }
    }
}

/**
 * The scene-unit radius a simulation layout's arrangement is published at.
 *
 * THE PRODUCT OF EVERY MULTIPLIER THE LAYOUT PUBLISHES, because the bridge's refit fits the
 * arrangement to exactly this radius and nothing else a reader sets can change the size after
 * that. Spring and spring-electrical both publish a `scale` -- "Scale factor for the layout",
 * with a slider behind it -- which reaches the simulation and sizes the arrangement it computes
 * in its own units; left out here, the refit would divide that size straight back out and the
 * control would move nothing on screen. Multiplied in, it means what it says, and it means the
 * same thing it meant when these layouts were one-shot engines: `scale` sized the arrangement
 * and `scalingFactor` scaled it into the scene.
 * @param declared - The published options, once Zod has applied the layout's defaults.
 * @returns The radius, in scene units.
 */
function publishedRadius(declared: ParsedSimulationOptions): number {
    return (declared.scalingFactor ?? DEFAULT_SCALING_FACTOR) * (declared.scale ?? 1);
}

/**
 * Turn what the consumer asked a simulation layout for into what the bridge runs on.
 *
 * `scalingFactor` travels twice over, and deliberately. The simulation gets it as `scale`, where
 * it sizes the seed and, in ForceAtlas2, the units the arrangement is computed in; the BRIDGE gets
 * it as the radius it publishes that arrangement at, which is the only one of the two a reader
 * sees in the picture. A layout that publishes no such control takes
 * {@link DEFAULT_SCALING_FACTOR}. What the bridge is given is {@link publishedRadius}, every
 * size multiplier the layout publishes rolled into one, because the refit fits the arrangement to
 * that radius and leaves no other way for a reader to change how big the graph comes out.
 *
 * The four knobs the frame loop needs -- `iterationsPerStep`, `maxInFlight`, `settleThreshold` and
 * `settleWindow` -- are NOT in any layout's published schema, because they are the same four for
 * every simulation and belong to how the element drives one rather than to the arrangement it
 * draws. They are read from the options a caller passed, where a per-layout value overrides the
 * behaviour configuration, and `behavior.layout` is where a host sets them once for every layout.
 * @param type - Which simulation is being configured.
 * @param options - The merged layout options, as the consumer set them.
 * @param behavior - `behavior.layout`, which the frame-loop knobs default from.
 * @returns The resolved options.
 * @throws A `ZodError` when an option is outside the range its published schema declares.
 */
export function resolveSimulationOptions(
    type: SimulationType,
    options: Record<string, unknown>,
    behavior: GraphLayoutBehavior,
): SimulationEngineOptions {
    const declared = toZodSchema(SIMULATION_OPTION_SCHEMAS[type]).parse(options) as ParsedSimulationOptions;
    const explicit = typeof options.iterationsPerStep === "number" ? options.iterationsPerStep : undefined;
    const inFlight = typeof options.maxInFlight === "number" ? options.maxInFlight : undefined;

    return {
        model: simulationModel(type, declared),
        scalingFactor: publishedRadius(declared),
        iterationsPerStep: explicit ?? behavior.iterationsPerStep ?? null,
        maxInFlight: inFlight ?? behavior.maxInFlight,
        settleThreshold: typeof options.settleThreshold === "number" ? options.settleThreshold : undefined,
        settleWindow: typeof options.settleWindow === "number" ? options.settleWindow : undefined,
        stepMultiplier: behavior.stepMultiplier,
    };
}

/**
 * Check the consumer's layout options against what the layout declares, and fill in its defaults.
 *
 * ONE OPTIONS MECHANISM. A layout that declares a descriptor declares its options as the same
 * plain `OptionDescriptor[]` the catalogue publishes and a picker renders, so the form a reader
 * fills in, the list the catalogue hands out and the values the element validates are one
 * declaration rather than three that can disagree. An unknown name is `E_UNKNOWN_OPTION` with the
 * declared names and the nearest few; a value outside the declared range is `E_OPTION_RANGE`.
 *
 * The element's own seventeen engines declare no descriptor -- their arrangements are authored in
 * the layout catalogue -- and keep validating with their own Zod schemas, so their options pass
 * through untouched.
 * @param type - The layout name, for the failure message.
 * @param descriptor - What the class declares about itself, when it declares anything.
 * @param passed - The options the consumer asked for.
 * @returns The options to build the engine with.
 * @throws A `GraphtyError` with `E_UNKNOWN_OPTION` or `E_OPTION_RANGE`.
 */
function resolveLayoutOptions(
    type: string,
    descriptor: AuthoredLayoutDescriptor | undefined,
    passed: object,
): Record<string, unknown> {
    if (descriptor === undefined) {
        return { ...(passed as Record<string, unknown>) };
    }

    return resolveOptionValues(descriptor.options, passed as Record<string, unknown>, { kind: "layout", id: type });
}

/**
 * The refusal for a layout name nothing answers to.
 *
 * It used to be a bare `TypeError` whose message a consumer had to read to find out what had gone
 * wrong, and which said nothing about what could have been asked for instead.
 * @param type - The name that was asked for.
 * @returns The error to throw.
 */
function unknownLayout(type: string): GraphtyError {
    return new GraphtyError({
        code: "E_UNKNOWN_LAYOUT",
        message: `no layout named "${type}" is registered`,
        source: "layout",
        details: { layout: type, available: LayoutEngine.getRegisteredTypes() },
    });
}

/**
 * Manages layout engines and their lifecycle
 * Coordinates layout updates and transitions
 */
export class LayoutManager implements Manager {
    layoutEngine?: LayoutEngine;
    private _running = false;

    /**
     * Set when a layout was built over a graph with nothing in it, and the pre-steps it is
     * configured with have therefore not been spent. See
     * {@link LayoutManager.runPreStepsOnceThereIsSomethingToStep}.
     */
    private preStepsOwed = false;

    /**
     * The dimension the running engine was built for, so a view mode that already matches it
     * does not rebuild the layout. See {@link LayoutManager.updateLayoutDimension}.
     */
    private engineDimension?: 2 | 3;

    private logger: Logger = GraphtyLogger.getLogger(["graphty", "layout"]);

    /**
     * Gets the running state of the layout
     * @returns True if layout is running, false otherwise
     */
    get running(): boolean {
        return this._running;
    }

    /**
     * Sets the running state of the layout.
     *
     * Going false -> true is "play", and a simulation that had SETTLED does nothing when it is
     * stepped, so a reader who pressed play -- or let go of a node they dragged -- would watch a
     * still graph. Resuming therefore reheats a settled simulation: the settle count starts
     * again and the next frame moves nodes. Going true -> false only stops `step()` being
     * called; batches already in flight land in the position array by themselves, nothing is
     * disposed and nothing is released.
     */
    set running(value: boolean) {
        const resuming = value && !this._running;
        this._running = value;

        // ONLY THE BRIDGE HAS A SETTLE COUNT TO RESTART. The one-shot engines are finished when
        // they are finished, and `ngraph` never reports settled, so neither has anything a
        // reheat could mean.
        if (resuming && this.layoutEngine instanceof SimulationLayoutEngine && this.layoutEngine.isSettled) {
            this.layoutEngine.reheat();
        }
    }

    // GraphContext for error reporting
    private graphContext: GraphContext | null = null;

    /**
     * The graph's acceleration controller, once a context has arrived. A manager built without a
     * graph -- which is what the manager's own unit tests build -- never gets one, and a
     * simulation layout refuses to start on one.
     */
    private acceleration: AccelerationController | null = null;

    /** How to stop listening to the controller. */
    private unsubscribeAcceleration: (() => void) | null = null;

    /** How to stop listening for a new snapshot. */
    private unsubscribeSnapshot: (() => void) | null = null;

    /**
     * Creates an instance of LayoutManager
     * @param eventManager - Event manager for emitting layout events
     * @param dataManager - Data manager for accessing nodes and edges
     * @param styles - Styles instance for layout configuration
     */
    constructor(
        private eventManager: EventManager,
        private dataManager: DataManager,
        private styles: Styles,
    ) {
        // A FREEZE IS A NEW GRAPH FOR THE SIMULATION. A simulation layout runs over the snapshot
        // rather than over a node list, so the only way it hears that nodes or edges arrived is
        // this event -- and it has to hear it BEFORE the release list frees the previous
        // snapshot's device buffers, which is why `Graph` subscribes after this constructor has
        // run. Observers fire in subscription order.
        const observer = this.eventManager.onGraphEvent.add((event) => {
            if (event.type === "snapshot-replaced") {
                this.onSnapshotReplaced(event);
            }
        });
        this.unsubscribeSnapshot = (): void => {
            this.eventManager.onGraphEvent.remove(observer);
        };
    }

    /**
     * Set the GraphContext for error reporting
     *
     * This is also where the acceleration controller first becomes reachable: the manager is
     * built before the graph finishes constructing itself, so it cannot be handed one.
     * @param context - GraphContext instance
     */
    setGraphContext(context: GraphContext): void {
        this.graphContext = context;
        this.acceleration = context.getAcceleration?.() ?? null;

        this.unsubscribeAcceleration?.();
        this.unsubscribeAcceleration =
            this.acceleration?.onChange(() => {
                this.onAccelerationChange();
            }) ?? null;
    }

    /**
     * Rebuild a running simulation on whatever the controller holds now.
     *
     * Every transition reaches here: an accelerator attached, detached, lost or recovered. The
     * try is load-bearing. Under the `required` policy a detach cannot reach a CPU simulation --
     * the controller's `plan()` throws `E_NO_ACCELERATOR` instead, which is the point of the
     * policy -- and the throw has to be REPORTED here rather than escaping into the controller's
     * listener loop, whose own catch would log it and continue. The layout then stops, and the
     * next transition that attaches an accelerator brings it back.
     */
    private onAccelerationChange(): void {
        const controller = this.acceleration;
        const engine = this.layoutEngine;
        if (
            controller === null ||
            !(engine instanceof SimulationLayoutEngine) ||
            !engine.builtWithChanged(controller.accelerator)
        ) {
            return;
        }

        try {
            engine.replaceSimulation();
            this.running = true;
        } catch (error) {
            this.running = false;
            this.reportSimulationFailure(error);
        }
    }

    /**
     * Hand a running simulation the snapshot that has just replaced the one it was laying out.
     * @param event - The freeze, carrying the snapshot every consumer must switch to.
     */
    private onSnapshotReplaced(event: GraphSnapshotReplacedEvent): void {
        const engine = this.layoutEngine;
        if (!(engine instanceof SimulationLayoutEngine)) {
            return;
        }

        try {
            engine.reload(event.next, this.dataManager.positions.view(event.next.nodeCount));
            this.running = true;
        } catch (error) {
            // Same channel and the same reason as `onAccelerationChange`: the reload re-plans, so
            // under `required` with nothing attached it throws -- and this runs inside the
            // freeze's observer loop, where a throw would take the data load with it.
            this.running = false;
            this.reportSimulationFailure(error);
        }
    }

    /**
     * Report a failure that happened to a layout already running, on the element's error channel.
     * @param error - Whatever was thrown.
     */
    private reportSimulationFailure(error: unknown): void {
        const wrapped = GraphtyError.wrap(error, { code: "E_INTERNAL", source: "layout" });
        this.logger.error("The running layout could not be rebuilt", wrapped, {
            layoutType: this.layoutType,
        });
        this.eventManager.emitGraphError(this.graphContext, wrapped, "layout", { layoutType: this.layoutType });
    }

    /**
     * Update the styles reference when a new style template is loaded
     * @param styles - New styles instance
     */
    updateStyles(styles: Styles): void {
        this.styles = styles;
    }

    /**
     * Initializes the layout manager
     * @returns Promise that resolves when initialization is complete
     */
    async init(): Promise<void> {
        // LayoutManager doesn't need async initialization
        return Promise.resolve();
    }

    /**
     * Disposes of the layout manager and cleans up resources
     */
    dispose(): void {
        this.unsubscribeAcceleration?.();
        this.unsubscribeAcceleration = null;
        this.unsubscribeSnapshot?.();
        this.unsubscribeSnapshot = null;

        // `dispose` is declared on the base class with a do-nothing default, so every engine has
        // one and the element no longer has to duck-type for it.
        this.layoutEngine?.dispose();

        this.layoutEngine = undefined;
        this.running = false;
    }

    /**
     * Internal method for setting layout - bypasses queue
     * Used by operations that are already queued to prevent nested queueing
     * @param type - Layout type identifier
     * @param opts - Layout-specific options
     */
    private async _setLayoutInternal(type: string, opts: object = {}): Promise<void> {
        this.logger.info("Setting layout", { type, options: opts });

        const engineClass = LayoutEngine.getClass(type);
        if (!engineClass) {
            throw unknownLayout(type);
        }

        // The CONSUMER'S options are checked on their own, before the element adds anything: the
        // dimension options below are the element's to add and are not the layout's to declare,
        // so validating after the merge would refuse the element's own key.
        const callerOpts = resolveLayoutOptions(type, engineClass.descriptor, opts);
        const layoutOpts: Record<string, unknown> = { ...callerOpts };

        // Auto-sync layout dimension with graph's 2D/3D mode if not explicitly set.
        // Support both new viewMode and deprecated twoD for backward compatibility
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const is2D = this.styles.config.graph.viewMode === "2d" || this.styles.config.graph.twoD;
        const dimension = is2D ? 2 : 3;
        const dimensionOpts = LayoutEngine.getOptionsForDimensionByType(type, dimension);

        if (dimensionOpts) {
            // Merge dimension options, but don't override user-provided options
            for (const [key, value] of Object.entries(dimensionOpts)) {
                if (!(key in layoutOpts)) {
                    layoutOpts[key] = value;
                }
            }
        }

        // A layout the element drives through `@graphty/layout`'s simulation seam declares which
        // simulation it is, and is the one kind of engine `LayoutEngine.get` cannot build: it
        // needs the graph's acceleration controller, which a registered class is never handed.
        const { simulationType } = engineClass as { simulationType?: SimulationType };

        let engine: LayoutEngine | null;
        try {
            if (simulationType === undefined) {
                engine = LayoutEngine.get(type, layoutOpts);
            } else {
                if (this.acceleration === null) {
                    throw new GraphtyError({
                        code: "E_INTERNAL",
                        message:
                            `the layout "${type}" runs on the graph's acceleration controller, and this layout ` +
                            "manager has no graph context to read one from",
                        source: "layout",
                        details: { layoutType: type },
                    });
                }

                // `plan()` answers from the CURRENT status and does not wait for the probe, so
                // without this a layout set from the element's attribute would decide "CPU"
                // while a GPU was a microtask away from attaching. `ready()` is also where the
                // `required` policy refuses to continue with nothing attached -- before an
                // engine exists, which is why it belongs in this try and not the next one.
                await this.acceleration.ready();

                const init: SimulationEngineInit = {
                    type: simulationType,
                    layoutType: type,
                    options: resolveSimulationOptions(
                        simulationType,
                        layoutOpts,
                        this.styles.config.behavior.layout,
                    ),
                    controller: this.acceleration,
                    report: (error) => {
                        this.reportLayoutFailure(type, error, "stepped");
                    },
                    dataManager: this.dataManager,
                };
                engine = new SimulationLayoutEngine(init);
            }
        } catch (error) {
            throw this.reportLayoutFailure(type, error, "built");
        }

        if (!engine) {
            // The class was in the registry a moment ago and building it produced nothing, which
            // only a host that has replaced `LayoutEngine.get` can arrange. Treated as the name
            // not answering, because from the caller's side that is what happened.
            throw unknownLayout(type);
        }

        // Kept so that a failure during set-up leaves the element exactly as it found it: the
        // engine that was working is still the one working, and it is still configured the way the
        // consumer configured it.
        const previousEngine = this.layoutEngine;
        const previousOptions = this.currentLayoutOptions;
        const previousDimension = this.engineDimension;

        // THE CONSUMER'S OPTIONS, not the merged ones: a 2D/3D switch rebuilds the engine from
        // these, and the element re-derives the dimension options for the new mode itself.
        this.currentLayoutOptions = callerOpts;

        try {
            // Add all existing nodes and edges to the new engine
            const nodeArray = [...this.dataManager.nodes.values()];
            const edgeArray = [...this.dataManager.edges.values()];
            engine.addNodes(nodeArray);
            engine.addEdges(edgeArray);

            this.layoutEngine = engine;
            this.engineDimension = dimension;
            await engine.init();

            // AFTER init(), and before any step runs. See `replayPins`.
            this.replayPins(engine, nodeArray);

            // Update DataManager with new layout engine
            this.dataManager.setLayoutEngine(engine);

            // Run layout pre-steps -- unless there is nothing to step yet, in which case they
            // are owed to the first frame that has something. See `preStepsOwed`.
            if (nodeArray.length === 0) {
                this.preStepsOwed = true;
            } else if (engine instanceof SimulationLayoutEngine) {
                // An accelerated simulation's step is a batch that has to land before the next
                // one is worth submitting, so the pre-steps are awaited in chunks rather than
                // fired one per loop turn; the chunk is the largest batch the GPU package takes.
                const { preSteps } = this.styles.config.behavior.layout;

                this.preStepsOwed = false;
                for (let remaining = preSteps; remaining > 0 && !engine.isSettled; ) {
                    const chunk = Math.min(remaining, MAX_ITERATIONS_PER_STEP_CHUNK);
                    await engine.stepAsync(chunk);
                    remaining -= chunk;
                }
            } else {
                this.spendPreSteps(engine);
            }

            // PUBLISHING IS THE ELEMENT'S JOB. An engine's coordinates reach `session.positions`
            // -- the array a drag writes, a re-freeze preserves and an accelerator reads -- only
            // through this call, and an engine that never made it rendered perfectly while
            // leaving every node unplaced. Making it the element's makes it unforgettable.
            engine.publishPositions();

            this.running = true;

            this.logger.debug("Layout initialized", {
                type,
                nodeCount: nodeArray.length,
                edgeCount: edgeArray.length,
            });

            // Request zoom to fit when layout changes
            this.eventManager.emitLayoutInitialized(type, true);

            // Dispose previous engine after successful init
            previousEngine?.dispose();

            // Emit layout changed event
            this.eventManager.emitGraphEvent("layout-changed", {
                layoutType: type,
                options: layoutOpts,
            });
        } catch (error) {
            // THE ENGINE THAT FAILED IS TOLD TO LET GO. It is discarded here and never used
            // again, and it never became the running layout, so no later switch will reach it --
            // this is its only moment. The element's own seventeen hold nothing and do nothing
            // with the call; a plugin that opened a worker, a socket or a GPU buffer in its
            // constructor would otherwise leak one per failed attempt.
            engine.dispose();

            // Restore previous layout engine if initialization failed
            this.layoutEngine = previousEngine;
            this.currentLayoutOptions = previousOptions;
            this.engineDimension = previousDimension;
            this.dataManager.setLayoutEngine(previousEngine);

            throw this.reportLayoutFailure(type, error, "initialised");
        }
    }

    /**
     * Tell a freshly built engine where every pinned node is, and that it is pinned.
     *
     * THIS IS WHY A PIN SURVIVES A LAYOUT CHANGE. The element owns the pin -- it is a byte beside
     * the node's coordinates -- but a live simulation also has to know, or it keeps spending force
     * on a body the element will then refuse to move, and d3 in particular would fix the node at
     * whatever coordinates its own initialisation happened to invent.
     *
     * This one method covers all three rebuild paths, because `_setLayoutInternal` is the single
     * funnel for `setLayout`, the 2D/3D view-mode switch and a style template's layout.
     *
     * BOTH HALVES OF THE ORDERING ARE LOAD-BEARING. It runs after `addNodes` and after `init()`,
     * because `NGraphLayoutEngine` throws for a node it has not been told about. And it PLACES
     * BEFORE IT PINS, because `D3GraphLayoutEngine.pin` copies the node's CURRENT simulated
     * position into the fixed-position fields: a bare pin replayed into a fresh engine would nail
     * the node to d3's arbitrary starting coordinates instead of where the reader put it.
     * @param engine - the engine that is about to become current
     * @param nodes - every node in the graph, which is what was just added to that engine
     */
    private replayPins(engine: LayoutEngine, nodes: readonly Node[]): void {
        const { positions } = this.dataManager;
        const placed = { x: 0, y: 0, z: 0 };

        for (const node of nodes) {
            if (!positions.isPinned(node.index)) {
                continue;
            }

            if (positions.isPlaced(node.index)) {
                positions.read(node.index, placed);
                engine.setNodePosition(node, { x: placed.x, y: placed.y, z: placed.z });
            }

            engine.pin(node);
        }
    }

    /**
     * Log a layout failure, tell the consumer about it, and say what to throw.
     *
     * A `GraphtyError` COMES BACK UNCHANGED, which is the whole point: an engine that refused an
     * option or a graph it cannot arrange says so with a code, and that code has to survive the
     * trip to the caller. The element used to wrap every failure in a plain `Error` and then
     * decide whether to wrap it a second time by looking for a phrase in the message, so a
     * plugin's code was lost either way and a failure in the constructor never reached the error
     * event at all.
     * @param type - The layout that failed.
     * @param error - Whatever was thrown.
     * @param phase - What the element was doing, in a word that fits "the layout could not be ...".
     * `"stepped"` is the one that happens to a layout already running: a simulation's batch
     * rejected minutes after set-up finished, and calling that "initialised" reads as a failure
     * to start.
     * @returns The error to throw.
     */
    private reportLayoutFailure(type: string, error: unknown, phase: "built" | "initialised" | "stepped"): GraphtyError {
        const thrown = error instanceof Error ? error : new Error(String(error));

        this.logger.error(`Layout could not be ${phase}`, thrown, { layoutType: type });

        if (this.graphContext) {
            this.eventManager.emitGraphError(this.graphContext, thrown, "layout", { layoutType: type, phase });
        }

        if (isGraphtyError(thrown)) {
            return thrown;
        }

        // An uncoded throw from an engine has no better code in the union than this one, and
        // inventing a code is not allowed. An engine that wants a consumer to be able to switch on
        // its failure throws a `GraphtyError`, and the branch above hands that back untouched.
        return new GraphtyError({
            code: "E_INTERNAL",
            message: `the layout "${type}" could not be ${phase}: ${thrown.message}`,
            source: "layout",
            details: { layout: type, phase },
            cause: thrown,
        });
    }

    /**
     * Public method for setting layout
     * This goes through the queue when called from Graph
     * @param type - Layout type identifier
     * @param opts - Layout-specific options
     * @returns Promise that resolves when layout is set
     */
    async setLayout(type: string, opts: object = {}): Promise<void> {
        return this._setLayoutInternal(type, opts);
    }

    /**
     * Run the configured number of simulation steps, stopping early if the layout arrives.
     *
     * `preSteps` is what makes a screenshot of a physics layout the same picture twice: an
     * unstepped force layout is a graph in mid-flight, and how far it has flown depends on when
     * the picture was taken.
     * @param engine - the engine to settle.
     */
    private spendPreSteps(engine: LayoutEngine): void {
        const { preSteps } = this.styles.config.behavior.layout;

        this.preStepsOwed = false;

        for (let i = 0; i < preSteps; i++) {
            // Stop if layout has settled
            if (engine.isSettled) {
                return;
            }

            engine.step();
        }
    }

    /**
     * Spend the pre-steps a layout built over an empty graph could not spend at the time.
     *
     * WHY THIS EXISTS. `preSteps` promises the simulation is run that many times BEFORE THE FIRST
     * FRAME IS DRAWN, and for the commonest graph there is -- one whose data arrives after it is
     * constructed -- it never ran at all. The element's constructor queues its default layout
     * immediately, so `_setLayoutInternal` reached the pre-step loop holding zero nodes, where an
     * engine's `isSettled` is still its initial `true`; the loop broke on iteration zero and the
     * configured count was simply lost. The graph then arrived in front of the reader over the
     * following seconds instead, and a screenshot taken during them was a graph in mid-flight.
     *
     * So the count is owed rather than spent, and paid here: on the first frame at which there is
     * a node to move. This runs inside the render loop's update, which is called before
     * `scene.render()`, so the steps really are taken before the frame is drawn -- and because it
     * waits for a node rather than for a particular call, it does not matter whether the data
     * arrived in one batch, in ten, or from a fetch that finished a second later.
     */
    private runPreStepsOnceThereIsSomethingToStep(): void {
        if (!this.preStepsOwed || !this.layoutEngine) {
            return;
        }

        // The DataManager adds every node to the engine as it creates it, so this is the same
        // question as "does the engine have anything to move" without walking an iterable on
        // every frame of an empty graph.
        if (this.dataManager.nodes.size === 0) {
            return;
        }

        this.spendPreSteps(this.layoutEngine);
        this.layoutEngine.publishPositions();
    }

    /**
     * Step the layout engine forward
     */
    step(): void {
        this.runPreStepsOnceThereIsSomethingToStep();

        if (this.layoutEngine && this.running && !this.layoutEngine.isSettled) {
            this.layoutEngine.step();
            // See the note in `_setLayoutInternal`: the element publishes, not the engine.
            this.layoutEngine.publishPositions();
        }
    }

    /**
     * Step the layout ONCE, whatever the frame loop's multiplier is.
     *
     * The name is the difference a reader of `UpdateManager` needs: a simulation layout does its
     * whole frame's work in one call -- the batch it submits computes `iterationsPerStep`
     * iterations -- so stepping it `stepMultiplier` times a frame would queue work the device
     * cannot retire.
     */
    stepBatch(): void {
        this.step();
    }

    /**
     * Get node position from layout engine
     * @param node - Node to get position for
     * @returns Node position as [x, y, z] or undefined if not available
     */
    getNodePosition(node: Node): [number, number, number] | undefined {
        const position = this.layoutEngine?.getNodePosition(node);
        if (!position) {
            return undefined;
        }

        return [position.x, position.y, position.z ?? 0];
    }

    /**
     * Check if layout has settled
     * @returns True if layout has settled, false otherwise
     */
    get isSettled(): boolean {
        // If not running, consider it settled
        if (!this.running) {
            return true;
        }

        // If no layout engine, consider it settled
        if (!this.layoutEngine) {
            return true;
        }

        // Otherwise check layout engine's settled state
        return this.layoutEngine.isSettled;
    }

    /**
     * Get nodes from layout engine
     * @returns Iterable of nodes managed by the layout engine
     */
    get nodes(): Iterable<Node> {
        return this.layoutEngine?.nodes ?? [];
    }

    /**
     * Get edges from layout engine
     * @returns Iterable of edges managed by the layout engine
     */
    get edges(): Iterable<Edge> {
        return this.layoutEngine?.edges ?? [];
    }

    /**
     * Get current layout type
     * @returns Current layout type identifier or undefined if no layout is set
     */
    get layoutType(): string | undefined {
        return this.layoutEngine?.type;
    }

    /**
     * Update layout dimension when 2D/3D mode changes
     * @param twoD - Whether to use 2D mode
     */
    async updateLayoutDimension(twoD: boolean): Promise<void> {
        // Already built for this dimension: rebuilding would only restart a settled layout.
        if (!this.layoutEngine || this.engineDimension === (twoD ? 2 : 3)) {
            return;
        }

        const layoutType = this.layoutEngine.type;
        const dimensionOpts = LayoutEngine.getOptionsForDimensionByType(layoutType, twoD ? 2 : 3);

        // Only rebuild for a layout that draws differently in two dimensions than in three. One
        // that answers with nothing to merge draws the same picture either way.
        if (!dimensionOpts || Object.keys(dimensionOpts).length === 0) {
            return;
        }

        // REBUILT FROM THE CONSUMER'S OWN OPTIONS. The element used to rebuild from
        // `engine.config`, a slot nothing declared and nothing required an engine to assign -- so
        // a view-mode switch silently threw away every option on any engine that did not, which
        // included the element's own two force engines. The manager already holds what the
        // consumer asked for, and it is the only copy that is always right.
        try {
            await this._setLayoutInternal(layoutType, this.currentLayoutOptions ?? {});
        } catch (error) {
            // A view-mode switch must not leave the element half-changed, so the rebuild's
            // failure is reported rather than thrown: `_setLayoutInternal` has already restored
            // the engine that was running and told the consumer through the error event.
            this.logger.error(
                "Layout could not be rebuilt for the new view mode",
                error instanceof Error ? error : new Error(String(error)),
                { layoutType, twoD },
            );
        }
    }

    /**
     * Apply layout from style template if specified
     * @param layoutType - Layout type identifier from template
     * @param layoutOptions - Layout options from template
     */
    async applyTemplateLayout(layoutType?: string, layoutOptions?: object): Promise<void> {
        if (layoutType) {
            const options = (layoutOptions ?? {}) as Record<string, unknown>;

            // Check if we need to update the layout
            const needsUpdate = this.layoutEngine?.type !== layoutType || this.hasOptionsChanged(options);

            if (needsUpdate) {
                await this._setLayoutInternal(layoutType, options);
            }
        }
    }

    /**
     * What the consumer last asked this layout for, with the element's own dimension options left
     * out. It is what a 2D/3D rebuild starts from, and what a template's options are compared to.
     */
    private currentLayoutOptions?: Record<string, unknown>;

    /**
     * Check if layout options have changed
     * @param newOptions - New layout options to compare
     * @returns True if options have changed, false otherwise
     */
    private hasOptionsChanged(newOptions: Record<string, unknown>): boolean {
        // If no previous options, consider it changed
        if (!this.currentLayoutOptions) {
            this.currentLayoutOptions = newOptions;
            return true;
        }

        // Deep compare options
        const oldStr = JSON.stringify(this.currentLayoutOptions);
        const newStr = JSON.stringify(newOptions);

        if (oldStr !== newStr) {
            this.currentLayoutOptions = newOptions;
            return true;
        }

        return false;
    }

    /**
     * Get layout statistics
     * @returns Object containing layout statistics
     */
    getStats(): {
        layoutType: string | undefined;
        isRunning: boolean;
        isSettled: boolean;
        nodeCount: number;
        edgeCount: number;
    } {
        const nodeCount = this.layoutEngine ? Array.from(this.layoutEngine.nodes).length : 0;
        const edgeCount = this.layoutEngine ? Array.from(this.layoutEngine.edges).length : 0;

        return {
            layoutType: this.layoutType,
            isRunning: this.running,
            isSettled: this.isSettled,
            nodeCount,
            edgeCount,
        };
    }

    /**
     * Check if layout engine is currently set
     * @returns True if layout engine is set, false otherwise
     */
    hasLayoutEngine(): boolean {
        return this.layoutEngine !== undefined;
    }

    /**
     * Settle nodes that reached the graph after this layout was already running.
     *
     * Still hands back a promise, because a plugin that has to fetch or recompute something to
     * place a newcomer will need one and the element's callers already await it; the work the
     * engines here do is synchronous.
     * @param nodes - The nodes that have just arrived.
     * @returns A promise that resolves once the newcomers have been placed.
     */
    updatePositions(nodes: Node[]): Promise<void> {
        if (!this.layoutEngine || nodes.length === 0) {
            return Promise.resolve();
        }

        // Mark layout as running again (it may have been settled with no nodes)
        this.running = true;

        // A SIMULATION LAYOUT IS TOLD BY THE FREEZE, NOT BY THIS LIST. It runs over the snapshot,
        // so what it needs is for the snapshot to exist: `getSnapshot()` is lazy and is the only
        // place the store freezes, and the freeze emits `snapshot-replaced` synchronously, so the
        // reload above has already happened by the time this returns and the new rows are seeded
        // before the next frame. When nothing changed, the cached snapshot comes back and nothing
        // happens.
        if (this.layoutEngine instanceof SimulationLayoutEngine) {
            this.dataManager.getSnapshot();

            this.eventManager.emitGraphEvent("layout-updated", {
                nodeCount: nodes.length,
                type: "incremental",
            });

            return Promise.resolve();
        }

        // `updatePositions` is declared on the base class and the element's ten blind steps are
        // its default, so the manager no longer has to tell "did not implement it" from
        // "implemented it as a deliberate no-op" by looking for a property.
        this.layoutEngine.updatePositions(nodes);
        this.layoutEngine.publishPositions();

        // Emit event that layout was updated
        this.eventManager.emitGraphEvent("layout-updated", {
            nodeCount: nodes.length,
            type: "incremental",
        });

        return Promise.resolve();
    }
}
