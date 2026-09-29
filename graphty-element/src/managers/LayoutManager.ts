import { INVALID_INDEX, makeMask, maskSet, type NodeMask } from "@graphty/graph-format";
import type {
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    SimulationType,
    SpringElectricalOptions,
} from "@graphty/layout";

import type { AccelerationController } from "../acceleration/AccelerationController";
import { LAYOUT_DESCRIPTORS, layoutDescriptor } from "../catalog/layouts";
import { resolveOptionValues } from "../catalog/options";
import type { AuthoredLayoutDescriptor, Scope, ScopeInput } from "../catalog/types";
import type { GraphLayoutBehavior } from "../config/GraphBehavior";
import { type OptionsSchema, toZodSchema } from "../config/OptionsSchema";
import { WRITABLE_LANE } from "../data/lane";
import type { Edge } from "../Edge";
import { GraphtyError, isGraphtyError } from "../errors";
import type { GraphSnapshotReplacedEvent } from "../events";
import { ForceAtlas2Layout } from "../layout/ForceAtlas2LayoutEngine";
import { LayoutEngine, layoutEngineInternals, StaticLayoutEngine } from "../layout/LayoutEngine";
import {
    type SimulationEngineInit,
    type SimulationEngineOptions,
    SimulationLayoutEngine,
} from "../layout/SimulationLayoutEngine";
import { SnapshotLayoutEngine, snapshotLayoutInternals } from "../layout/SnapshotLayoutEngine";
import { SpringElectricalLayout } from "../layout/SpringElectricalLayoutEngine";
import { SpringLayout } from "../layout/SpringLayoutEngine";
import { GraphtyLogger, type Logger } from "../logging/GraphtyLogger.js";
import type { Node, NodeIdType } from "../Node";
import type { LayoutChoice } from "../session/project/state";
import { reportCaught, strictStateEnabled, strictViolation } from "../session/project/strict";
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
 * The element's own nineteen engines declare no descriptor -- their arrangements are authored in
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
        details: {
            layout: type,
            available: [
                ...new Set([...LayoutEngine.getRegisteredTypes(), ...LAYOUT_DESCRIPTORS.map((entry) => entry.id)]),
            ],
        },
    });
}

/** How one engine build is carried out. */
interface BuildOptions {
    /** 2 or 3: the dimension options the engine is built with. */
    readonly dimension: 2 | 3;
    /**
     * Undo, redo, a restore or a rollback: no pre-steps, nothing published, and the layout left
     * at rest, because the `arrangement` hook writes the coordinates next.
     */
    readonly restoring: boolean;
    /** Asked after every await: false once the build is cancelled or overtaken. */
    readonly live: () => boolean;
    /**
     * Whether the scope was named by the call or command asking for this build, the only case in
     * which a scope the engine cannot use, or cannot resolve, is refused. A carried scope that
     * cannot be laid out is inactive instead.
     */
    readonly explicitScope?: boolean;
}

/**
 * The error a build that was cancelled or overtaken stops with. Nothing reports it: whoever
 * cancelled the build already knows.
 * @returns The error.
 */
function cancelledBuild(): Error {
    const error = new Error("The layout was cancelled or replaced before it finished building.");
    error.name = "AbortError";
    return error;
}

/**
 * The element's own reach into a layout manager, past its public surface: `Graph` registers the
 * `layout` hook, and a standalone manager test builds or installs an engine outside the `layout`
 * slice. No entry point exports it; a consumer chooses a layout with `session.layout.set`.
 */
export const layoutManagerInternals = {} as {
    /** The `layout` hook; see `LayoutManager.apply`. */
    apply(
        manager: LayoutManager,
        choice: LayoutChoice,
        options: { readonly restoring: boolean; readonly signal?: AbortSignal; readonly explicitScope?: boolean },
    ): Promise<void>;
    /** Build an engine outside the `layout` slice; see `LayoutManager.setLayout`. */
    setLayout(manager: LayoutManager, type: string, opts?: object, scope?: ScopeInput): Promise<void>;
    /** Take the members a scoped layout built over an empty graph owes; see `LayoutManager.takeOwedMembers`. */
    takeOwedMembers(manager: LayoutManager): void;
    /** Install an engine, or none, as a standalone test's stand-in for a build. */
    setEngine(manager: LayoutManager, engine: LayoutEngine | undefined): void;
};

/**
 * The registered engine a layout name runs on.
 *
 * `setLayout` takes either spelling: a registered engine name ("ngraph") runs that engine, and a
 * catalogue id ("force", from `catalog.layouts()`) runs its default engine. An engine name wins,
 * so a third party's engine keeps its own name even if it matches a catalogue id.
 * @param type - An engine name or a catalogue id.
 * @returns The engine name; the input unchanged when it is neither.
 */
function engineForLayout(type: string): string {
    if (LayoutEngine.getClass(type)) {
        return type;
    }

    return layoutDescriptor(type)?.engine ?? type;
}

/**
 * What a layout manager reads of the session to scope a layout. `Graph` hands its session's in.
 */
interface LayoutScopeSource {
    /**
     * A write position's scope in canonical form.
     * @param input - The scope as a consumer gave it.
     * @returns The canonical scope.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when it is not a scope.
     */
    canonical(input: ScopeInput): Scope;
    /**
     * The ids of the nodes a scope covers now.
     * @param scope - The scope.
     * @returns The ids.
     * @throws A `GraphtyError` when the scope cannot be resolved, such as a removed set.
     */
    members(scope: Scope): readonly NodeIdType[];
    /**
     * Whether something the scope names was removed, so it can no longer mean what it meant.
     * @param scope - The scope.
     * @returns True when it is detached.
     */
    detached(scope: Scope): boolean;
}

/**
 * The refusal for an explicit scope on a layout whose engine cannot hold nodes still.
 * @param type - The engine name.
 * @returns The error to throw.
 */
function unscopedLayout(type: string): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message:
            `the layout "${type}" cannot lay out a scope: it computes every position from scratch, so it has ` +
            'no way to hold the nodes outside the scope still. Use a live simulation such as "ngraph", ' +
            '"d3" or "forceatlas2", whose catalogue entry reads `scoped: true`',
        source: "layout",
        details: { layout: type, field: "scope" },
    });
}

/**
 * Manages layout engines and their lifecycle
 * Coordinates layout updates and transitions
 */
export class LayoutManager implements Manager {
    /** The engine drawing the graph, built by the `layout` hook. */
    private engine?: LayoutEngine;

    static {
        layoutManagerInternals.apply = (manager, choice, options) => manager.apply(choice, options);
        layoutManagerInternals.setLayout = (manager, type, opts, scope) => manager.setLayout(type, opts, scope);
        layoutManagerInternals.takeOwedMembers = (manager) => {
            manager.takeOwedMembers();
        };
        layoutManagerInternals.setEngine = (manager, engine) => {
            manager.engine = engine;
        };
    }

    /**
     * The engine drawing the graph, read-only: choose a layout with `session.layout.set`.
     * @returns The engine, or undefined before the first build.
     */
    get layoutEngine(): LayoutEngine | undefined {
        return this.engine;
    }
    private _running = false;

    /** The `layout` slice value the current engine was built for; null until one is. */
    #built: LayoutChoice | null = null;
    /** The value being built now, from the moment it was asked for; null when none is. */
    #wanted: LayoutChoice | null = null;
    /** The build in progress; builds run one at a time, in the order they were asked for. */
    #applying: Promise<void> = Promise.resolve();
    /** How many builds are in progress: the frame loop does not step an engine being built. */
    #building = 0;
    /** Moves at every restore of the arrangement; pre-steps computed before one are dropped. */
    #generation = 0;

    /**
     * Set while a CONSUMER has paused the layout, through {@link LayoutManager.setPaused}. Nothing
     * inside the element clears it: a load, a freeze, an accelerator attaching, a new layout or a
     * drag may rebuild or place nodes, but their `running = true` is refused until the consumer
     * resumes.
     */
    private _paused = false;

    /**
     * Set when a layout was built over a graph with nothing in it, and the pre-steps it is
     * configured with have therefore not been spent. See
     * {@link LayoutManager.runPreStepsOnceThereIsSomethingToStep}.
     */
    private preStepsOwed = false;

    /**
     * Set when a scoped layout was built over a graph with nothing in it: its members are taken
     * again when the first node arrives, which is when the layout really starts. A scope captured
     * over an empty graph holds nothing it names, so it would hold every node that arrives.
     */
    private membersOwed = false;

    /**
     * The dimension the running engine was built for, so a view mode that already matches it
     * does not rebuild the layout. See {@link LayoutManager.apply}.
     */
    private engineDimension?: 2 | 3;

    private logger: Logger = GraphtyLogger.getLogger(["graphty", "layout"]);

    /** Told when the layout comes to rest: it settled, was paused, or finished placing. */
    onRest: (() => void) | null = null;

    /**
     * Whether undo, redo or a restore is on its way to the position array. While it is, a new
     * snapshot or accelerator reloads the engine without starting it, so nothing moves the
     * arrangement being restored.
     * @returns True while one is.
     */
    restoring: () => boolean = () => false;

    /** Where a scope is canonicalised and resolved, once `Graph` has a session to hand in. */
    private scopeSource: LayoutScopeSource | null = null;

    /**
     * The scope layouts run over, CARRIED from one `setLayout` to the next: an explicit scope sets
     * it, `"graph"` clears it, and a call that names none keeps it, so changing one force
     * parameter never un-scopes the layout. Undefined is the whole graph.
     */
    private carriedScope: Scope | undefined;

    /**
     * The members the running layout captured when it started, or null when it holds nothing:
     * no scope, an engine that is not scoped, or a scope that could not be resolved. Every node
     * outside it is held, including one that arrives later.
     */
    private members: ReadonlySet<NodeIdType> | null = null;

    /**
     * Strict state: something asked to step the layout while the lane was restoring, which only a
     * forward change may. Refused either way; strict state reports it, because the caller is
     * running outside the derivation lane's order.
     * @param what - What asked.
     */
    private reportRestoringStep(what: string): void {
        if (this.#strict) {
            reportCaught(strictViolation(`${what} while the lane was restoring`));
        }
    }

    readonly #strict = strictStateEnabled();

    /**
     * Whether a layout is being built now, spending its own pre-steps.
     * @returns True while one is.
     */
    get building(): boolean {
        return this.#building > 0;
    }

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
     *
     * While the consumer has paused the layout (see {@link LayoutManager.setPaused}) a `true` is
     * ignored, so the element's own restarts cannot undo the pause.
     */
    set running(value: boolean) {
        const next = value && !this._paused;
        const resuming = next && !this._running;
        const resting = !next && this._running;
        this._running = next;
        if (resting) {
            this.onRest?.();
        }

        // The bridge closes its work span once a stopped layout's batches have landed, so a status
        // chip does not read "active" while nothing is being submitted.
        if (this.layoutEngine instanceof SimulationLayoutEngine) {
            this.layoutEngine.paused = !next;
        }

        // ONLY THE BRIDGE HAS A SETTLE COUNT TO RESTART. The one-shot engines are finished when
        // they are finished, and `ngraph` never reports settled, so neither has anything a
        // reheat could mean.
        if (resuming && this.layoutEngine instanceof SimulationLayoutEngine && this.layoutEngine.isSettled) {
            this.layoutEngine.reheat();
        }
    }

    /**
     * Pause or resume the layout on a consumer's behalf.
     *
     * A pause holds until the consumer resumes it: internal restarts are refused while it is set.
     * Resuming runs the layout, and reheats a simulation that had settled.
     * @param paused - True to pause, false to resume.
     */
    setPaused(paused: boolean): void {
        this._paused = paused;
        this.running = !paused;
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
            this.running = !this.restoring();
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

        // A FREEZE RENUMBERS THE ROWS the hold mask indexes, so it is rebuilt from the captured
        // members -- before a simulation reloads, so that its reload packs the new mask.
        if (engine !== undefined && this.members !== null) {
            engine.setHoldMask(...this.holdMaskOf(this.members));
        }

        if (engine instanceof StaticLayoutEngine) {
            engine.reload(event, this.dataManager.isLoading);
            return;
        }

        if (!(engine instanceof SimulationLayoutEngine)) {
            return;
        }

        try {
            engine.reload(event.next, this.dataManager[WRITABLE_LANE].view(event.next.nodeCount));
            if (!this.restoring()) {
                this.running = true;
            }
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

        this.engine = undefined;
        this.onRest = null;
        this.running = false;
    }

    /**
     * Internal method for setting layout - bypasses queue
     * Used by operations that are already queued to prevent nested queueing
     * @param layout - A registered engine name, or a catalogue layout id
     * @param opts - Layout-specific options
     * @param how - The dimension, whether this is a restore, and whether the build is still wanted.
     */
    private async _setLayoutInternal(layout: string, opts: object, how: BuildOptions): Promise<void> {
        this.logger.info("Setting layout", { type: layout, options: opts });

        // Everything below -- option validation, dimension options, the stored layout type --
        // sees the ENGINE name, so a catalogue id behaves exactly like the engine it names.
        const type = engineForLayout(layout);

        const engineClass = LayoutEngine.getClass(type);
        if (!engineClass) {
            throw unknownLayout(type);
        }

        // Which engines accept a scope is a fact of the class. Only a scope named in THIS call is
        // refused; a carried one is inactive under an engine that cannot hold nodes still.
        const scoped = engineClass.scoped === true;
        const explicitScope = how.explicitScope === true;
        if (explicitScope && !scoped) {
            throw unscopedLayout(type);
        }

        // THE MEMBERS ARE FROZEN HERE, when the layout starts, as a run freezes its scope: a later
        // click, filter change or attribute edit does not move what the running layout holds.
        const members = this.captureMembers(scoped, explicitScope);

        // The CONSUMER'S options are checked on their own, before the element adds anything: the
        // dimension options below are the element's to add and are not the layout's to declare,
        // so validating after the merge would refuse the element's own key.
        const callerOpts = resolveLayoutOptions(type, engineClass.descriptor, opts);
        const layoutOpts: Record<string, unknown> = { ...callerOpts };

        // The layout's dimension options follow the graph's 2D/3D mode unless the caller set them.
        const { dimension } = how;
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
                if (!how.live()) {
                    throw cancelledBuild();
                }

                const init: SimulationEngineInit = {
                    type: simulationType,
                    layoutType: type,
                    options: resolveSimulationOptions(simulationType, layoutOpts, this.styles.config.behavior.layout),
                    controller: this.acceleration,
                    report: (error) => {
                        this.reportLayoutFailure(type, error, "stepped");
                    },
                    dataManager: this.dataManager,
                };
                engine = new SimulationLayoutEngine(init);
            }
        } catch (error) {
            if (!how.live()) {
                throw cancelledBuild();
            }

            throw this.reportLayoutFailure(type, error, "built");
        }

        if (engine instanceof SnapshotLayoutEngine) {
            const built = engine;
            snapshotLayoutInternals.connect(built, {
                progress: (progress) => {
                    this.eventManager.emitGraphEvent("layout-progress", { layoutType: type, ...progress });
                },
                fail: (error) => {
                    if (this.layoutEngine === built) {
                        this.running = false;
                    }

                    this.reportLayoutFailure(type, error, "stepped");
                },
                arrived: () => {
                    // The answer is published by the next frame's step, which runs only while the
                    // layout does.
                    if (this.layoutEngine === built && !this.restoring()) {
                        this.running = true;
                    }
                },
            });
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
        const previousDimension = this.engineDimension;
        const previousMembers = this.members;

        try {
            // Add all existing nodes and edges to the new engine
            const nodeArray = [...this.dataManager.nodes.values()];
            const edgeArray = [...this.dataManager.edges.values()];
            layoutEngineInternals.addNodes(engine, nodeArray);
            layoutEngineInternals.addEdges(engine, edgeArray);

            this.engine = engine;
            this.engineDimension = dimension;
            await engine.init();
            if (!how.live()) {
                throw cancelledBuild();
            }

            // WHAT ARRIVED WHILE `init()` WAS AWAITED went to the previous engine, which the
            // DataManager still holds until the swap below. A load that replaces the dataset
            // clears (which rebuilds the layout) and adds its records in the same turn, so without
            // this the new engine would start empty and lay out nothing.
            const known = new Set(nodeArray);
            const knownEdges = new Set(edgeArray);
            layoutEngineInternals.addNodes(
                engine,
                [...this.dataManager.nodes.values()].filter((n) => !known.has(n)),
            );
            layoutEngineInternals.addEdges(
                engine,
                [...this.dataManager.edges.values()].filter((e) => !knownEdges.has(e)),
            );

            // AFTER init(), and before any step runs. See `replayPins`.
            this.replayPins(engine, nodeArray);
            this.members = members;
            this.membersOwed = members !== null && nodeArray.length === 0;
            if (members !== null) {
                this.applyHold(engine, members, nodeArray);
            }

            // Update DataManager with new layout engine
            this.dataManager.setLayoutEngine(engine);

            if (how.restoring) {
                // A restore: the `arrangement` hook writes the coordinates into the array and
                // hands them to this engine next, so it publishes nothing and stays at rest.
                this.preStepsOwed = false;
                this.running = false;
            } else {
                // Run layout pre-steps -- unless there is nothing to step yet, in which case they
                // are owed to the first frame that has something. See `preStepsOwed`.
                if (nodeArray.length === 0) {
                    this.preStepsOwed = true;
                } else if (!(await this.spendPreSteps(engine, how.live))) {
                    throw cancelledBuild();
                }

                // PUBLISHING IS THE ELEMENT'S JOB. An engine's coordinates reach
                // `session.positions` -- the array a drag writes, a re-freeze preserves and an
                // accelerator reads -- only through this call, and an engine that never made it
                // rendered perfectly while leaving every node unplaced.
                engine.publishPositions();

                this.running = true;

                this.logger.debug("Layout initialized", {
                    type,
                    nodeCount: nodeArray.length,
                    edgeCount: edgeArray.length,
                });

                // Request zoom to fit when layout changes
                this.eventManager.emitLayoutInitialized(type, true);
            }

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
            // this is its only moment. The element's own nineteen hold nothing and do nothing
            // with the call; a plugin that opened a worker, a socket or a GPU buffer in its
            // constructor would otherwise leak one per failed attempt.
            engine.dispose();

            // Restore previous layout engine if initialization failed
            this.engine = previousEngine;
            this.engineDimension = previousDimension;
            this.members = previousMembers;
            this.dataManager.setLayoutEngine(previousEngine);

            // Cancelled or overtaken is not a failure: nothing is reported.
            if (!how.live()) {
                throw cancelledBuild();
            }

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
     *
     * A 2D ENGINE GETS THE PIN ON THE PLANE. A node pinned in 3D keeps its Z in the position
     * array, and a 2D engine handed that Z keeps it: the node is drawn where the orthographic
     * camera hides the Z, but each of its edges is a flat quad whose length is the 3D distance, so
     * every edge of the pinned node ran past it into empty space. Clicking a node pins it
     * (`pinOnDrag`), so selecting a node and switching to 2D was enough. The X and Y are kept.
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
                layoutEngineInternals.setNodePosition(engine, node, this.onEnginePlane(placed));
            }

            layoutEngineInternals.pin(engine, node);
        }
    }

    /**
     * A stored position as the current engine can hold it: on the Z = 0 plane for a 2D engine.
     * See `replayPins`; a node held out of a scoped layout carries its Z into 2D the same way.
     * @param at - The position read from the array.
     * @param at.x - Its X, kept.
     * @param at.y - Its Y, kept.
     * @param at.z - Its Z, kept by a 3D engine only.
     * @returns The position to hand the engine.
     */
    private onEnginePlane(at: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
        return { x: at.x, y: at.y, z: this.engineDimension === 2 ? 0 : at.z };
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
    private reportLayoutFailure(
        type: string,
        error: unknown,
        phase: "built" | "initialised" | "stepped",
    ): GraphtyError {
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
     * @param scope - What the layout runs over. Absent keeps the carried scope, `"graph"` clears
     * it, and anything else becomes the carried scope for this and later layouts. Internal: a
     * consumer scopes a layout through `Graph.setLayout`'s `options.scope`.
     * @returns Promise that resolves when layout is set
     * @throws A `GraphtyError` with `E_UNSUPPORTED` for a scope on an engine that is not scoped,
     * or `E_BAD_COMMAND` for a scope that is malformed or names a removed set.
     */
    private async setLayout(type: string, opts: object = {}, scope?: ScopeInput): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- the old spelling still means 2D
        const twoD = this.styles.config.graph.viewMode === "2d" || this.styles.config.graph.twoD;
        // Built outside the `layout` slice, so no slice value describes it any more.
        this.#built = null;
        this.#building++;
        const previous = this.carriedScope;
        if (scope !== undefined) {
            this.carriedScope = scope === "graph" ? undefined : this.requireScopeSource().canonical(scope);
        }

        try {
            await this._setLayoutInternal(type, opts, {
                dimension: twoD ? 2 : 3,
                restoring: false,
                live: () => true,
                explicitScope: scope !== undefined && this.carriedScope !== undefined,
            });
        } catch (error) {
            this.carriedScope = previous;
            throw error;
        } finally {
            this.#building--;
        }
    }

    /**
     * Whether the engine is built, or being built, for exactly this value of the `layout` slice.
     * Compared by identity: a `layout.set` writes a new value even for the same layout, which is
     * how asking for the same layout again runs it again.
     * @param choice - The value.
     * @returns True when nothing needs building for it.
     */
    isCurrent(choice: LayoutChoice): boolean {
        return (this.#wanted ?? this.#built) === choice;
    }

    /**
     * The `layout` hook: bring the engine to a value of the `layout` slice. A new layout or new
     * options build a new engine; a new dimension rebuilds the engine only when the layout draws
     * differently in two dimensions than in three. Builds run one at a time.
     * @param choice - The value.
     * @param options - How: `restoring` for undo, redo, a restore or a rollback (no pre-steps,
     *     nothing published, left at rest); `signal` stops the build, publishing nothing, when
     *     the command that asked for it is cancelled or overtaken.
     * @param options.restoring - Whether this is a restore.
     * @param options.signal - The asking command's signal.
     * @param options.explicitScope - Whether the asking command named the scope.
     * @returns Settles once the engine is built and its pre-steps have landed.
     */
    private apply(
        choice: LayoutChoice,
        options: { readonly restoring: boolean; readonly signal?: AbortSignal; readonly explicitScope?: boolean },
    ): Promise<void> {
        this.#wanted = choice;
        const generation = this.#generation;
        const build = this.#applying.then(async () => {
            this.#building++;
            try {
                await this.build(choice, options, generation);
            } finally {
                this.#building--;
                if (this.#wanted === choice) {
                    this.#wanted = null;
                }
            }
        });
        this.#applying = build.catch(() => undefined);
        return build;
    }

    /**
     * Build what {@link LayoutManager.apply} asked for, when it differs from what is built.
     * @param choice - The value.
     * @param options - How.
     * @param options.restoring - Whether this is a restore.
     * @param options.signal - The asking command's signal.
     * @param options.explicitScope - Whether the asking command named the scope.
     * @param generation - The arrangement generation it was asked for under.
     */
    private async build(
        choice: LayoutChoice,
        options: { readonly restoring: boolean; readonly signal?: AbortSignal; readonly explicitScope?: boolean },
        generation: number,
    ): Promise<void> {
        const { signal, restoring } = options;
        const live = (): boolean => signal?.aborted !== true && (restoring || this.#generation === generation);
        if (!live()) {
            throw cancelledBuild();
        }

        const built = this.#built;
        const dimension = choice.dimension === "2d" ? 2 : 3;
        const sameLayout =
            built !== null &&
            this.layoutEngine !== undefined &&
            built.engine === choice.engine &&
            built.options === choice.options &&
            built.scope === choice.scope;
        if (sameLayout) {
            const dimensionOpts = LayoutEngine.getOptionsForDimensionByType(choice.engine, dimension);
            const redraws = dimensionOpts !== null && Object.keys(dimensionOpts).length > 0;
            if (this.engineDimension === dimension || !redraws) {
                this.#built = choice;
                return;
            }
        }

        const previous = this.carriedScope;
        this.carriedScope = choice.scope;
        try {
            await this._setLayoutInternal(choice.engine, choice.options, {
                dimension,
                restoring,
                live,
                explicitScope: options.explicitScope === true,
            });
        } catch (error) {
            this.carriedScope = previous;
            throw error;
        }

        this.#built = choice;
    }

    /**
     * Hand the engine the coordinates the `arrangement` hook has just written. After a restore,
     * the pre-steps of any build still computing from the coordinates it held before are dropped.
     * @param restoring - Whether undo, redo, a restore or a rollback wrote them.
     */
    loadArrangement(restoring: boolean): void {
        if (restoring) {
            this.#generation++;
        }

        this.layoutEngine?.loadArrangement();
    }

    /**
     * The dimension the current engine was built for.
     * @returns 2 or 3, or undefined before any engine is built.
     */
    get dimension(): 2 | 3 | undefined {
        return this.engineDimension;
    }

    /**
     * Hand the manager the session it resolves scopes through.
     * @param source - The session's canonicaliser and resolver.
     * @internal
     */
    setScopeSource(source: LayoutScopeSource): void {
        this.scopeSource = source;
    }

    /**
     * The scope layouts run over, as the consumer last set it; undefined for the whole graph.
     * @returns The canonical scope.
     * @internal
     */
    get scope(): Scope | undefined {
        return this.carriedScope;
    }

    /**
     * The layout as a user of the sets it names, for "Used by": present only while a layout
     * is actually holding nodes for its scope.
     * @returns The user and the scope, or undefined.
     * @internal
     */
    scopeUser():
        | {
              readonly user: { readonly kind: "layout"; readonly id?: string; readonly label: string };
              readonly scope: Scope;
          }
        | undefined {
        const scope = this.carriedScope;
        const type = this.layoutType;
        if (this.members === null || scope === undefined || type === undefined) {
            return undefined;
        }

        return { user: { kind: "layout", id: type, label: `Layout (${type})` }, scope };
    }

    /**
     * Let go of every held node when the scope the running layout captured names something that was
     * removed, so the layout runs over the whole graph instead. Nothing throws.
     * @internal
     */
    releaseDetachedScope(): void {
        const scope = this.carriedScope;
        const source = this.scopeSource;
        if (this.members === null || scope === undefined || source === null || !source.detached(scope)) {
            return;
        }

        this.members = null;
        this.layoutEngine?.setHoldMask(null, 0);
        this.running = true;
    }

    /**
     * The source, or the refusal a manager built without a graph gives for a scope.
     * @returns The source.
     */
    private requireScopeSource(): LayoutScopeSource {
        if (this.scopeSource === null) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "a scope is resolved through the graph's session, and this layout manager has none",
                source: "layout",
                details: { field: "scope" },
            });
        }

        return this.scopeSource;
    }

    /**
     * Capture the members the next layout runs over, or null when it holds nothing.
     * @param scoped - Whether the engine about to be built accepts a scope.
     * @param explicit - Whether the scope came in this call, which is the only case that refuses.
     * @returns The members.
     * @throws The resolver's `GraphtyError` for an explicit scope that cannot be resolved.
     */
    private captureMembers(scoped: boolean, explicit: boolean): ReadonlySet<NodeIdType> | null {
        const scope = this.carriedScope;
        const source = this.scopeSource;
        if (scope === undefined || source === null || !scoped) {
            return null;
        }

        try {
            if (source.detached(scope)) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message:
                        "the scope names a set that was removed or cannot be resolved, so there is nothing to lay out",
                    source: "layout",
                    details: { field: "scope", reason: "detached" },
                });
            }

            const members = new Set(source.members(scope));
            if (members.size === 0 && explicit) {
                // Holding every node would make the layout silently do nothing; a run over the
                // same scope is refused the same way. A carried scope keeps its hold: the members
                // it names may not be loaded yet.
                throw new GraphtyError({
                    code: "E_SCOPE_EMPTY",
                    message: "the scope holds no nodes, so there is nothing to lay out",
                    source: "layout",
                    details: { field: "scope" },
                });
            }

            return members;
        } catch (error) {
            // A CARRIED SCOPE NEVER THROWS: a property setter or the assistant's layout command
            // restarts a layout with it, and a refusal there would reach nobody.
            if (explicit || !isGraphtyError(error)) {
                throw error;
            }

            this.logger.debug("The carried layout scope is inactive", { reason: error.message });
            return null;
        }
    }

    /**
     * The hold mask for the graph as it stands: every row whose node is not a member.
     * @param members - The captured members.
     * @returns The mask and the rows it covers.
     */
    private holdMaskOf(members: ReadonlySet<NodeIdType>): [NodeMask, number] {
        let rows = 0;
        for (const node of this.dataManager.nodes.values()) {
            if (validRow(node.index)) {
                rows = Math.max(rows, node.index + 1);
            }
        }

        const mask = makeMask(rows);
        for (const node of this.dataManager.nodes.values()) {
            if (validRow(node.index) && !members.has(node.id)) {
                maskSet(mask, node.index, true);
            }
        }

        return [mask, rows];
    }

    /**
     * Tell a freshly built scoped engine where every held node is, and then hold them.
     *
     * Placed first for the reason `replayPins` places before it pins: a live simulation's own idea
     * of where a node is starts wherever its initialisation put it, and d3 fixes a node at that.
     * @param engine - The engine about to become current.
     * @param members - The members it lays out.
     * @param nodes - Every node in the graph.
     */
    private applyHold(engine: LayoutEngine, members: ReadonlySet<NodeIdType>, nodes: readonly Node[]): void {
        const { positions } = this.dataManager;
        const placed = { x: 0, y: 0, z: 0 };
        for (const node of nodes) {
            if (!members.has(node.id) && positions.isPlaced(node.index)) {
                positions.read(node.index, placed);
                layoutEngineInternals.setNodePosition(engine, node, this.onEnginePlane(placed));
            }
        }

        engine.setHoldMask(...this.holdMaskOf(members));
    }

    /**
     * Run the configured number of simulation steps, stopping early if the layout arrives.
     *
     * `preSteps` is what makes a screenshot of a physics layout the same picture twice: an
     * unstepped force layout is a graph in mid-flight, and how far it has flown depends on when
     * the picture was taken.
     *
     * A SIMULATION CANNOT BE STEPPED IN A TIGHT SYNCHRONOUS LOOP, which is why this is
     * asynchronous and why both the path that spends the pre-steps when a layout is built and the
     * path that pays owed ones later come through here rather than each writing their own loop. A
     * simulation's step is a BATCH: an accelerated one is fire-and-forget, and a simulation that
     * already has a few batches in flight returns the oldest of them instead of submitting
     * another, so a loop that calls `step()` a thousand times without waiting has all but the
     * first couple coalesced away and draws a graph the consumer asked to be far more arranged
     * than it is -- silently, because a coalesced batch is not an error. So a simulation is
     * awaited one chunk at a time, the chunk being the largest batch the GPU package takes, and
     * every other engine keeps the plain loop, whose `step()` returns having done the work.
     * @param engine - the engine to settle.
     * @param live - Asked after every await: false once the build that spends them is cancelled or
     *     overtaken, or the arrangement was restored since, and then nothing is published.
     * @returns True once every pre-step has been taken and published; false when stopped.
     */
    private async spendPreSteps(engine: LayoutEngine, live: () => boolean): Promise<boolean> {
        const { preSteps } = this.styles.config.behavior.layout;

        // Cleared before the first await, so a frame that arrives while the chunks are still in
        // flight does not order the same count a second time.
        this.preStepsOwed = false;

        if (engine instanceof SimulationLayoutEngine) {
            for (let remaining = preSteps; remaining > 0 && !engine.isSettled; ) {
                const chunk = Math.min(remaining, MAX_ITERATIONS_PER_STEP_CHUNK);
                await engine.stepAsync(chunk);
                if (!live()) {
                    return false;
                }

                remaining -= chunk;
            }
        } else {
            for (let i = 0; i < preSteps; i++) {
                // Stop if layout has settled
                if (engine.isSettled) {
                    break;
                }

                engine.step();
            }
        }

        // Published HERE rather than by each caller, because this is the only place that knows
        // when the steps have actually landed: a caller that published after the call would
        // publish the arrangement of the frame before for an accelerated simulation, and one that
        // published in a `then` would publish a frame late for every other engine.
        engine.publishPositions();
        return true;
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
     * `scene.render()`, so an engine that steps on the spot really is stepped before the frame is
     * drawn -- and because it waits for a node rather than for a particular call, it does not
     * matter whether the data arrived in one batch, in ten, or from a fetch that finished a
     * second later. A simulation's batches land over the next few frames instead, because no
     * caller inside a render loop can wait for a device; what {@link LayoutManager.spendPreSteps}
     * guarantees for one is that every owed iteration is computed rather than coalesced away.
     */
    private runPreStepsOnceThereIsSomethingToStep(): void {
        const engine = this.layoutEngine;
        if (!this.preStepsOwed || !engine) {
            return;
        }

        // The DataManager adds every node to the engine as it creates it, so this is the same
        // question as "does the engine have anything to move" without walking an iterable on
        // every frame of an empty graph.
        if (this.dataManager.nodes.size === 0) {
            return;
        }

        const generation = this.#generation;
        const live = (): boolean => this.layoutEngine === engine && this.#generation === generation;
        void this.spendPreSteps(engine, live).catch((error: unknown) => {
            // A rejected batch has to be reported from here: nothing awaits this call, and an
            // unhandled rejection is the one failure shape a consumer cannot see.
            this.reportLayoutFailure(engine.type, error, "stepped");
        });
    }

    /**
     * Take the members a scoped layout built over an empty graph owes, once nodes have arrived:
     * the layout starts now, over the nodes its scope names among them.
     */
    private takeOwedMembers(): void {
        const engine = this.layoutEngine;
        if (!this.membersOwed || engine === undefined || this.dataManager.nodes.size === 0) {
            return;
        }

        this.membersOwed = false;
        this.members = this.captureMembers(true, false);
        if (this.members === null) {
            engine.setHoldMask(null, 0);
        } else {
            this.applyHold(engine, this.members, [...this.dataManager.nodes.values()]);
        }
    }

    /**
     * Step the layout engine forward
     */
    step(): void {
        // An engine being built spends its own pre-steps; a frame stepping it meanwhile would
        // publish what a cancelled build computed.
        //
        // Nothing steps while undo, redo, a restore or a rollback is on its way to the position
        // array either: the `arrangement` hook places the restored coordinates, and a step before
        // it has run would move the arrangement being restored. The frames after it step again.
        if (this.#building > 0 || this.restoring()) {
            return;
        }

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
     * Whether the layout engine has converged: the positions are final.
     *
     * A layout that was stopped part-way is NOT settled; it is {@link LayoutManager.isPaused}. A
     * reader that only needs "positions are not moving right now" asks `!running || isSettled`.
     * @returns True when the engine has converged, or when there is no engine.
     */
    get isSettled(): boolean {
        return this.layoutEngine?.isSettled ?? true;
    }

    /**
     * Whether the layout was stopped before it converged, so its positions are not final.
     * @returns True when the layout is not running and has not settled.
     */
    get isPaused(): boolean {
        return !this.running && !this.isSettled;
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
     * Get layout statistics
     * @returns Object containing layout statistics
     */
    getStats(): {
        layoutType: string | undefined;
        isRunning: boolean;
        isSettled: boolean;
        isPaused: boolean;
        nodeCount: number;
        edgeCount: number;
    } {
        const nodeCount = this.layoutEngine ? Array.from(this.layoutEngine.nodes).length : 0;
        const edgeCount = this.layoutEngine ? Array.from(this.layoutEngine.edges).length : 0;

        return {
            layoutType: this.layoutType,
            isRunning: this.running,
            isSettled: this.isSettled,
            isPaused: this.isPaused,
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
        // An engine being built takes every node there is and spends its own pre-steps.
        if (!this.layoutEngine || nodes.length === 0 || this.#building > 0) {
            return Promise.resolve();
        }

        // Only a forward add places newcomers; while a restore is on its way, the rows it brings
        // back are placed by the `arrangement` hook, where they were.
        if (this.restoring()) {
            this.reportRestoringStep("newcomers were placed");
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
        // Reported, not thrown. This runs inside the derivation pass of the add, and a throw there
        // would abort the rest of that pass -- its repaint -- over a layout that cannot place the
        // graph as it stands: bfs over nodes whose edges have not arrived yet is disconnected
        // until they do. A frame that cannot step is reported the same way.
        try {
            this.layoutEngine.updatePositions(nodes);
            this.layoutEngine.publishPositions();
        } catch (error) {
            this.reportLayoutFailure(this.layoutEngine.type, error, "stepped");
            return Promise.resolve();
        }

        // Emit event that layout was updated
        this.eventManager.emitGraphEvent("layout-updated", {
            nodeCount: nodes.length,
            type: "incremental",
        });

        return Promise.resolve();
    }
}

/**
 * Whether a node index is a row of the graph.
 * @param index - `Node.index`, which is `INVALID_INDEX` for a node with no row.
 * @returns True for a row.
 */
function validRow(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index !== INVALID_INDEX;
}
