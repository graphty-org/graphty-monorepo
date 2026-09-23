// WORKAROUND: Import InstancedMesh side-effect first
// See: https://github.com/graphty-org/graphty-element/issues/54
import "@babylonjs/core/Meshes/instancedMesh";

import type { DuplicatePolicy } from "@graphty/graph-format";
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { set as setDeep } from "lodash";

import { type AccelerationController, type AccelerationPolicy, isAccelerationPolicy } from "./acceleration";
import type { AlgorithmKey, Scope } from "./catalog/types";
import type { GraphBackgroundConfig, GraphBehaviorConfig, GraphSelectionStyleInput, ViewMode } from "./config";
import { REPEATED_EDGE_POLICIES } from "./config/DataConfig";
import type { PartialXRConfig } from "./config/xr-config-schema";
import { isDomForwardableEvent, NODE_EVENT_DOM_NAMES, nodeEventDetail } from "./events";
import { Graph } from "./Graph";
import type { ScreenshotOptions, ScreenshotResult } from "./screenshot/types.js";
import type { GraphSession } from "./session";
import type { Run, RunChange, StartOptions } from "./session/runs";
import type { SelectionDelta, SelectionTarget, SetOp } from "./session/selection";
import type { VisibilityChange } from "./session/visibility";

/**
 * How often a run's progress may reach a DOM listener, in milliseconds.
 *
 * A long run reports progress far more often than anything needs to be redrawn, and a mirror
 * event is the cheapest place in the element to say so: ten a second is well under a frame and is
 * what a progress bar and a percentage both need. The three moments that are not progress --
 * queued, started, finished -- are never dropped, because each is a state change a consumer acts
 * on rather than a number it displays.
 */
const RUN_PROGRESS_INTERVAL_MS = 100;

/**
 * Graphty creates a graph
 */
@customElement("graphty-element")
export class Graphty extends LitElement {
    #graph: Graph;
    #element: Element;
    #resizeObserver: ResizeObserver | null = null;
    #capabilitiesMirrored = false;
    #unwatchRuns: (() => void) | null = null;
    #unwatchSelection: (() => void) | null = null;
    #unwatchVisibility: (() => void) | null = null;
    #runProgressAt = new Map<string, number>();

    /**
     * Creates a new Graphty element instance.
     */
    constructor() {
        super();

        this.#element = document.createElement("div");
        // Ensure the container div fills the graphty-element
        // position: relative is needed for absolute positioning of XR UI overlay
        this.#element.setAttribute("style", "width: 100%; height: 100%; display: block; position: relative;");
        this.#graph = new Graph(this.#element);
    }

    /**
     * The headless model this element draws.
     *
     * Everything about the graph that needs no screen is here: the data, the coordinates, the
     * statistics, the catalogue, the runs and their results, which elements a piece of work may
     * look at (`scope`), what is selected (`selection`) and what is visible (`visibility`). The
     * camera, the canvas and the scene stay on the element, because two synchronised views of one
     * dataset disagree about those and agree about everything above.
     *
     * Read-only for now: a session built elsewhere cannot yet be attached to an element.
     * @returns The session.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element id="g" sample="karate"></graphty-element>
     * <script type="module">
     *   const { session } = document.getElementById("g");
     *   await session.visibility.set({ kind: "degree", min: 3 });
     *   showing.textContent = `${session.status.counts.visibleNodes} of ${session.status.counts.nodes}`;
     * </script>
     * ```
     */
    get session(): GraphSession {
        return this.#graph.getSession();
    }

    /**
     * Start an algorithm and get back something a caller can watch, stop and read.
     *
     * Forwarded from the session, so the first graph needs no session: a page with a tag and
     * three lines of script can run an analysis, await the result and read its ranking without
     * importing a module or learning what a session is.
     * @param algorithm - Which algorithm to run, by its catalogue key such as "betweenness".
     * @param params - Its parameters, as the catalogue declares them.
     * @param options - The scope, the seed, the id, the signal and the progress handler.
     * @returns The run. Awaiting it gives the result; every encoding helper takes the run itself.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element id="g" sample="karate"></graphty-element>
     * <script type="module">
     *   const g = document.getElementById("g");
     *   const run = g.run("betweenness");
     *   g.addEventListener("graphty-run-change", (e) => bar.value = e.detail.run.status);
     *   console.log((await run).summary().top);
     * </script>
     * ```
     */
    run(algorithm: AlgorithmKey, params?: Record<string, unknown>, options?: StartOptions): Run {
        return this.#graph.run(algorithm, params, options);
    }

    /**
     * Change what is selected.
     *
     * Forwarded from the session, so the first graph needs no session: a page with a tag and two
     * lines of script can select a list of ids, add to that selection, invert it or take the top
     * twenty of a finished run, without importing a module.
     *
     * One selection per graph, shared by every surface reading it. The five operations are
     * `"replace"` (the default, and what a click does), `"add"`, `"remove"`, `"toggle"` and
     * `"intersect"`.
     * @param target - What to select: ids, a pasted list, a neighbourhood, a scope, a run's top n.
     * @param op - What to do with it; replaces the selection when absent.
     * @returns What changed: what joined, what left, and what the selection holds now.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element id="g" sample="karate"></graphty-element>
     * <script type="module">
     *   const g = document.getElementById("g");
     *   await g.select({ nodes: [1, 2, 3] });
     *   g.addEventListener("graphty-selection-change", (e) => count.textContent = e.detail.nodes);
     * </script>
     * ```
     */
    select(target: SelectionTarget, op?: SetOp): Promise<SelectionDelta> {
        return this.#graph.select(target, op);
    }

    /**
     * Mirror one run notification onto the DOM, so a consumer holding only the tag can follow it.
     *
     * The detail carries the run's RECORD rather than the run: a `CustomEvent` detail crosses to
     * listeners that may structure-clone it, and a live object with a `cancel()` on it cannot go
     * there. A consumer that wants to cancel looks the run up by `detail.run.id`.
     * @param change - The run's record, and which moment it reached.
     */
    #mirrorRunChange(change: RunChange): void {
        if (change.phase === "progress") {
            const now = Date.now();
            // Per run, not per element: two runs coalesced against one clock would take turns
            // suppressing each other, and a consumer would see one bar move and the other freeze.
            const last = this.#runProgressAt.get(change.run.id) ?? 0;

            if (now - last < RUN_PROGRESS_INTERVAL_MS) {
                return;
            }

            this.#runProgressAt.set(change.run.id, now);
        }

        if (change.phase === "end") {
            this.#runProgressAt.delete(change.run.id);
        }

        this.dispatchEvent(
            new CustomEvent("graphty-run-change", {
                detail: { run: change.run, phase: change.phase },
                bubbles: true,
                composed: true,
            }),
        );
    }

    /**
     * Mirror one selection change onto the DOM.
     *
     * The detail carries IDS, never node or edge objects. A `CustomEvent` detail crosses to
     * listeners that may structure-clone it or post it to a worker, and a render object holding a
     * mesh, a material and a scene cannot go there -- it would throw on the way out, or, worse,
     * hand a listener a live handle on something the renderer is about to dispose. A consumer
     * that wants the record looks the id up.
     * @param delta - What joined, what left, and what the selection holds now.
     */
    #mirrorSelectionChange(delta: SelectionDelta): void {
        this.dispatchEvent(
            new CustomEvent("graphty-selection-change", {
                detail: delta,
                bubbles: true,
                composed: true,
            }),
        );
    }

    /**
     * Mirror one visibility change onto the DOM.
     *
     * Four counts, the paths nothing answered and what produced the change: everything "showing
     * 1,204 of 50,000" needs, and nothing that cannot be serialised. Every producer arrives here
     * -- a filter, the time window and the context flag -- because a status bar has to update for
     * all three and must not learn about them in three different ways.
     * @param change - The counts, the unresolved paths and what produced them.
     */
    #mirrorVisibilityChange(change: VisibilityChange): void {
        this.dispatchEvent(
            new CustomEvent("graphty-visibility-change", {
                detail: change,
                bubbles: true,
                composed: true,
            }),
        );
    }

    /**
     * Called when the element is added to the DOM. Sets up the graph container and resize observer.
     */
    connectedCallback(): void {
        super.connectedCallback();
        this.renderRoot.appendChild(this.#element);

        // Watch for container size changes and resize the canvas accordingly
        this.#resizeObserver = new ResizeObserver(() => {
            // Resize the Babylon.js engine when the container size changes
            this.#graph.engine.resize();
            // Update camera projection to match new aspect ratio (prevents visual shifts)
            this.#graph.camera.onResize();
        });
        this.#resizeObserver.observe(this);

        // NOTHING IS READ OFF THE PAGE'S QUERY STRING. Mounting the element used to reconfigure
        // GLOBAL logging and switch on detailed profiling because of parameters in the URL of the
        // page the element happens to be on -- so an element embedded in a host application
        // changed that application's logging whenever a reader's link carried the parameter, and
        // two elements on one page raced to configure it. Logging is configured through
        // `GraphtyLogger.configure`, and profiling through `enableDetailedProfiling`.

        // Look for an accelerator. Nothing is registered unless the consumer imported
        // "@graphty/graphty-element/webgpu", in which case this probes, attaches and reports.
        //
        // A Graph is built once, in this element's constructor, and never rebuilt, so an element
        // that has been disconnected is a shut-down element: its controller was disposed with the
        // rest of the graph and re-attaching probes nothing.
        const controller = this.#ensureAcceleration();

        if (!controller.disposed) {
            void controller.start();
        }

        // Mirror every run onto the DOM, whoever started it. A run started from a console, an
        // agent or a panel has no `onProgress` this element could have attached, so the session's
        // own notification is the only thing that sees all of them.
        const session = this.#graph.getSession();

        this.#unwatchRuns ??= session.on("run:changed", (change) => {
            this.#mirrorRunChange(change);
        });

        // The same reason as the run mirror: a selection made from a console, an agent, a data
        // table or a gesture all arrive here, and the session's own notification is the only
        // thing that sees every one of them.
        this.#unwatchSelection ??= session.on("selection:changed", (delta) => {
            this.#mirrorSelectionChange(delta);
        });
        this.#unwatchVisibility ??= session.on("visibility:changed", (change) => {
            this.#mirrorVisibilityChange(change);
        });
    }

    /**
     * Called after the first update of the element. Initializes async graph setup.
     * @param changedProperties - Map of changed property names to their previous values
     */
    firstUpdated(changedProperties: Map<string, unknown>): void {
        super.firstUpdated(changedProperties);

        this.asyncFirstUpdated().catch((e: unknown) => {
            throw e;
        });
    }

    /**
     * Performs async initialization tasks for the graph, including event forwarding and graph initialization.
     */
    async asyncFirstUpdated(): Promise<void> {
        // Forward internal graph events as DOM CustomEvents
        // This allows external code (e.g., React) to listen for any graph event
        // using standard DOM addEventListener (e.g., "style-changed", "graph-settled", etc.)
        //
        // Everything except an element-internal event goes out, so the exclusion is a list rather
        // than a comparison written here: see INTERNAL_EVENT_TYPES in events.ts for why an event
        // belongs on it and how to add one.
        this.#graph.eventManager.onGraphEvent.add((event) => {
            if (!isDomForwardableEvent(event)) {
                return;
            }

            this.dispatchEvent(
                new CustomEvent(event.type, {
                    detail: event,
                    bubbles: true,
                    composed: true,
                }),
            );
        });

        // Node events reach the DOM too, and under a prefixed name with a reduced detail.
        //
        // They used to reach nobody at all: the node observable was private, the element forwarded
        // only the graph observable, and `addListener` had no case for a click, a hover or a drag
        // -- so four events the guide documents were emitted into a closed room. They cannot be
        // forwarded verbatim the way graph events are, because the internal event carries a live
        // `Node`; `nodeEventDetail` reduces each one to ids and numbers a listener can clone.
        this.#graph.eventManager.onNodeEvent.add((event) => {
            const name = NODE_EVENT_DOM_NAMES[event.type];
            const detail = nodeEventDetail(event);

            if (name === undefined || detail === null) {
                return;
            }

            this.dispatchEvent(
                new CustomEvent(name, {
                    detail,
                    bubbles: true,
                    composed: true,
                }),
            );
        });

        // Note: Property setters now forward to Graph methods automatically,
        // so we don't need to check changedProperties here. The setters have
        // already been called by the time we reach this lifecycle method.

        // Initialize the graph (only needs to happen once)
        await this.#graph.init();

        // Wait for first render frame to ensure graph is visible
        await new Promise((resolve) =>
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            }),
        );

        this.#graph.engine.resize();
    }

    /**
     * Renders the graph container element.
     * @returns The graph container element
     */
    render(): Element {
        return this.#element;
    }

    /**
     * Called when the element is removed from the DOM. Cleans up resources and shuts down the graph.
     */
    disconnectedCallback(): void {
        // Disconnect the resize observer
        if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
            this.#resizeObserver = null;
        }

        this.#unwatchRuns?.();
        this.#unwatchRuns = null;
        this.#unwatchSelection?.();
        this.#unwatchSelection = null;
        this.#unwatchVisibility?.();
        this.#unwatchVisibility = null;

        this.#graph.shutdown();
        super.disconnectedCallback();
    }

    // Private backing fields for reactive properties
    #nodeData?: Record<string, unknown>[];
    #edgeData?: Record<string, unknown>[];
    #dataSource?: string;
    #dataSourceConfig?: Record<string, unknown>;
    #nodeIdPath?: string;
    #edgeSrcIdPath?: string;
    #edgeDstIdPath?: string;
    #edgeIdPath?: string;
    #repeatedEdges?: DuplicatePolicy;
    #nodeLabelPath?: string;
    #edgeWeightPath?: string;
    #positionScale?: number;
    #directed?: boolean | "auto";
    #layout?: string;
    #layoutConfig?: Record<string, unknown>;
    #viewMode?: ViewMode;
    #background?: GraphBackgroundConfig;
    #startingCameraDistance?: number;

    #layoutBehavior?: GraphBehaviorConfig;

    #selectionStyle?: GraphSelectionStyleInput;

    #algorithmsOnLoad?: readonly string[];
    #runAlgorithmsOnLoad?: boolean;
    #xr?: PartialXRConfig;

    /**
     * Array of node data objects to visualize.
     * @remarks
     * Setting this property replaces all existing nodes. For incremental
     * updates, use the `graph.addNodes()` method instead.
     *
     * Each node object should have an ID field (default: "id"). Additional
     * properties can be used in style selectors and accessed via `node.data`.
     * @since 1.0.0
     * @see {@link edgeData} for edge data
     * @see {@link https://graphty.app/storybook/element/?path=/story/graphty--default | Basic Examples}
     * @example HTML attribute (JSON string)
     * ```html
     * <graphty-element
     *   node-data='[{"id": "1", "label": "Node 1"}, {"id": "2", "label": "Node 2"}]'>
     * </graphty-element>
     * ```
     * @example JavaScript property
     * ```typescript
     * const element = document.querySelector('graphty-element');
     * element.nodeData = [
     *   { id: 'a', label: 'Node A', category: 'primary' },
     *   { id: 'b', label: 'Node B', category: 'secondary' }
     * ];
     * ```
     * @returns Array of node data objects or undefined if not set
     */
    @property({
        /*
         * A JSON converter, because the documented HTML form above is a JSON array and Lit's
         * default converter hands a setter the raw attribute TEXT. Without this the setter
         * received a string, `Array.isArray` was false, and every row was dropped with no error
         * -- so the element's own getting-started example drew an empty graph. The same reason
         * the `background` property below carries one.
         */
        attribute: "node-data",
        converter: {
            fromAttribute: (value: string | null): Record<string, unknown>[] | undefined => {
                if (value === null) {
                    return undefined;
                }

                let parsed: unknown;
                try {
                    parsed = JSON.parse(value);
                } catch {
                    console.error(
                        `<graphty-element>: the node-data attribute must be a JSON array, not ` +
                            `"${value}". Keeping the nodes already set.`,
                    );

                    return undefined;
                }

                if (!Array.isArray(parsed)) {
                    console.error(
                        `<graphty-element>: the node-data attribute must be a JSON ARRAY of records. ` +
                            `Keeping the nodes already set.`,
                    );

                    return undefined;
                }

                return parsed as Record<string, unknown>[];
            },
            toAttribute: (value: Record<string, unknown>[] | undefined): string | null =>
                value === undefined ? null : JSON.stringify(value),
        },
    })
    get nodeData(): Record<string, unknown>[] | undefined {
        return this.#nodeData;
    }
    /**
     * Sets the node data array. Triggers addition of nodes to the graph.
     */
    set nodeData(value: Record<string, unknown>[] | undefined) {
        const oldValue = this.#nodeData;
        this.#nodeData = value;

        // Forward to Graph method (which queues operation)
        if (value && Array.isArray(value)) {
            this.#graph.addNodes(value).catch((error: unknown) => {
                this.#reportLoadFailure(error);
            });
        }

        this.requestUpdate("nodeData", oldValue);
    }

    /**
     * Array of edge data objects defining connections between nodes.
     * @remarks
     * Setting this property REPLACES all existing edges. For incremental
     * updates, use the `graph.addEdges()` method instead.
     *
     * Each edge object should have source and target fields (default: "source", "target").
     * Additional properties can be used for styling (e.g., weight, label).
     * @since 1.0.0
     * @see {@link nodeData} for node data
     * @see {@link edgeSrcIdPath} to customize source field
     * @see {@link edgeDstIdPath} to customize target field
     * @example HTML attribute
     * ```html
     * <graphty-element
     *   edge-data='[{"source": "1", "target": "2"}, {"source": "2", "target": "3"}]'>
     * </graphty-element>
     * ```
     * @example JavaScript property
     * ```typescript
     * element.edgeData = [
     *   { source: 'a', target: 'b', weight: 1.5 },
     *   { source: 'b', target: 'c', weight: 2.0 }
     * ];
     * ```
     * @returns Array of edge data objects or undefined if not set
     */
    @property({
        /*
         * A JSON converter, because the documented HTML form above is a JSON array and Lit's
         * default converter hands a setter the raw attribute TEXT. Without this the setter
         * received a string, `Array.isArray` was false, and every row was dropped with no error
         * -- so the element's own getting-started example drew an empty graph. The same reason
         * the `background` property below carries one.
         */
        attribute: "edge-data",
        converter: {
            fromAttribute: (value: string | null): Record<string, unknown>[] | undefined => {
                if (value === null) {
                    return undefined;
                }

                let parsed: unknown;
                try {
                    parsed = JSON.parse(value);
                } catch {
                    console.error(
                        `<graphty-element>: the edge-data attribute must be a JSON array, not ` +
                            `"${value}". Keeping the edges already set.`,
                    );

                    return undefined;
                }

                if (!Array.isArray(parsed)) {
                    console.error(
                        `<graphty-element>: the edge-data attribute must be a JSON ARRAY of records. ` +
                            `Keeping the edges already set.`,
                    );

                    return undefined;
                }

                return parsed as Record<string, unknown>[];
            },
            toAttribute: (value: Record<string, unknown>[] | undefined): string | null =>
                value === undefined ? null : JSON.stringify(value),
        },
    })
    get edgeData(): Record<string, unknown>[] | undefined {
        return this.#edgeData;
    }
    /**
     * Sets the edge data array. Triggers addition of edges to the graph.
     */
    set edgeData(value: Record<string, unknown>[] | undefined) {
        const oldValue = this.#edgeData;
        this.#edgeData = value;

        // REPLACE, not append. Two edges between one pair are now two edges, so an additive
        // setter would double every edge each time a host re-assigned the property.
        if (value && Array.isArray(value)) {
            this.#graph.setEdges(value).catch((error: unknown) => {
                this.#reportLoadFailure(error);
            });
        }

        this.requestUpdate("edgeData", oldValue);
    }

    /**
     * The type of data source (e.g. "json"). See documentation for
     * data sources for more information.
     * @returns Data source type string or undefined if not set
     */
    @property({ attribute: "data-source" })
    get dataSource(): string | undefined {
        return this.#dataSource;
    }
    /**
     * Sets the data source type. Initializes data loading when combined with dataSourceConfig.
     */
    set dataSource(value: string | undefined) {
        const oldValue = this.#dataSource;
        this.#dataSource = value;

        // Try to initialize data source if both dataSource and dataSourceConfig are set
        this.#tryInitializeDataSource();

        this.requestUpdate("dataSource", oldValue);
    }

    /**
     * The configuration for the data source. See documentation for
     * data sources for more information.
     * @returns Data source configuration object or undefined if not set
     */
    @property({ attribute: "data-source-config" })
    get dataSourceConfig(): Record<string, unknown> | undefined {
        return this.#dataSourceConfig;
    }
    /**
     * Sets the data source configuration. Initializes data loading when combined with dataSource.
     */
    set dataSourceConfig(value: Record<string, unknown> | undefined) {
        const oldValue = this.#dataSourceConfig;
        this.#dataSourceConfig = value;

        // Try to initialize data source if both dataSource and dataSourceConfig are set
        this.#tryInitializeDataSource();

        this.requestUpdate("dataSourceConfig", oldValue);
    }

    /**
     * Removes every node and edge, and lets a later data source load.
     *
     * The guard below is per LOAD, not per element lifetime. Latching it for the
     * element's whole life refused every dataset after the first: a second
     * `dataSource` / `dataSourceConfig` assignment set both properties and started no
     * load, so a host that loaded a second file saw the element report the new source
     * while the old graph stayed on screen. Clearing the data is the statement that the
     * previous load is over, so it is where the guard resets.
     *
     * The two properties are reset with it, and deliberately through the private fields
     * rather than the setters: a setter would call `#tryInitializeDataSource` again, and
     * leaving the old pair in place would let the next half-assignment load the NEW
     * source against the OLD config.
     */
    clearData(): void {
        const oldDataSource = this.#dataSource;
        const oldDataSourceConfig = this.#dataSourceConfig;

        this.#graph.getDataManager().clear();
        this.#dataSourceInitialized = false;
        this.#dataSource = undefined;
        this.#dataSourceConfig = undefined;

        this.requestUpdate("dataSource", oldDataSource);
        this.requestUpdate("dataSourceConfig", oldDataSourceConfig);
    }

    /**
     * Publish a failure from work that a property or an attribute assignment started.
     *
     * Assigning `node-data`, `edge-data` or the data-source pair hands the caller no promise, so a
     * rejection from the load it starts reaches the page as an UNHANDLED rejection: it trips the
     * host's global error handler and puts a dev server's error overlay over the whole
     * application. That is reachable now that a file naming no endpoint column FAILS rather than
     * quietly loading zero edges, which is the point of this release -- and on the record setters
     * it used to be the only sign anything had gone wrong at all, because nothing else reported.
     *
     * So the element says it on the channel it already publishes loading failures on, and a
     * consumer has one place to listen whichever way the data arrived. A caller who wants the
     * throw calls the method -- `addNodes`, `setEdges`, `addDataFromSource` -- and awaits it.
     * @param error - whatever the load rejected with
     */
    #reportLoadFailure(error: unknown): void {
        this.#graph.eventManager.emitDataLoadingError(
            error instanceof Error ? error : new Error(String(error)),
            "validation",
            "records",
            { canContinue: false },
        );
    }

    /**
     * Helper method to initialize data source only when both properties are set
     */
    #dataSourceInitialized = false;
    #tryInitializeDataSource(): void {
        // Only initialize once per load -- see `clearData` -- and only if both
        // dataSource and dataSourceConfig are set. Both setters call this, so the guard
        // is what stops one assignment of the pair from starting two loads.
        if (!this.#dataSourceInitialized && this.#dataSource && this.#dataSourceConfig) {
            this.#dataSourceInitialized = true;
            // A load started by an attribute or a property assignment hands the caller no promise,
            // so a rejection here reaches the page as an UNHANDLED rejection: it trips the host's
            // global error handler, and a Vite dev server puts its error overlay over the whole
            // application, for a file the element has already reported through its own channel.
            // That became reachable the moment a file naming no endpoint column started failing
            // instead of quietly loading zero edges, which is the point of this release.
            //
            // The failure is not swallowed. `addDataFromSource` emits `data-loading-error`
            // carrying the coded error and a `graph-error` beside it, and logs the whole thing,
            // all before it throws; those are the channels the declarative path publishes on. A
            // caller who wants the promise calls `element.addDataFromSource` and gets the throw.
            this.#graph.addDataFromSource(this.#dataSource, this.#dataSourceConfig).catch(() => undefined);
        }
    }

    /**
     * A jmespath string that can be used to select the unique node identifier
     * for each node. Defaults to "id", as in `{id: 42}` is the identifier of
     * the node.
     * @returns JMESPath string or undefined if not set
     */
    @property({ attribute: "node-id-path" })
    get nodeIdPath(): string | undefined {
        return this.#nodeIdPath;
    }
    /**
     * Sets the JMESPath for node ID extraction. Updates graph configuration.
     */
    set nodeIdPath(value: string | undefined) {
        const oldValue = this.#nodeIdPath;
        this.#nodeIdPath = value;

        if (value) {
            setDeep(this.#graph.styles.config, "data.knownFields.nodeIdPath", value);
        }

        this.requestUpdate("nodeIdPath", oldValue);
    }

    /**
     * Similar to the nodeIdPath property / node-id-path attribute, this is a
     * jmespath that describes where to find the source node identifier for this edge.
     *
     * Unset by default, which means PROBE: the element reads `source`/`target`, then `src`/`dst`,
     * then `from`/`to`, deciding once per batch of edge records. Setting this settles the question
     * and turns the probe off, and a record that does not answer it is then a rejected record
     * rather than a reason to guess again.
     * @returns JMESPath string or undefined if not set
     */
    @property({ attribute: "edge-src-id-path" })
    get edgeSrcIdPath(): string | undefined {
        return this.#edgeSrcIdPath;
    }
    /**
     * Sets the JMESPath for edge source ID extraction. Updates graph configuration.
     */
    set edgeSrcIdPath(value: string | undefined) {
        const oldValue = this.#edgeSrcIdPath;
        this.#edgeSrcIdPath = value;

        if (value) {
            setDeep(this.#graph.styles.config, "data.knownFields.edgeSrcIdPath", value);
        }

        this.requestUpdate("edgeSrcIdPath", oldValue);
    }

    /**
     * Similar to the nodeIdPath property / node-id-path attribute, this is a
     * jmespath that describes where to find the destination node identifier for this edge.
     *
     * Unset by default, which means PROBE; see {@link edgeSrcIdPath}.
     * @returns JMESPath string or undefined if not set
     */
    @property({ attribute: "edge-dst-id-path" })
    get edgeDstIdPath(): string | undefined {
        return this.#edgeDstIdPath;
    }
    /**
     * Sets the JMESPath for edge destination ID extraction. Updates graph configuration.
     */
    set edgeDstIdPath(value: string | undefined) {
        const oldValue = this.#edgeDstIdPath;
        this.#edgeDstIdPath = value;

        if (value) {
            setDeep(this.#graph.styles.config, "data.knownFields.edgeDstIdPath", value);
        }

        this.requestUpdate("edgeDstIdPath", oldValue);
    }

    /**
     * A JMESPath naming the record key that identifies an edge, for data whose edges carry
     * genuine identifiers of their own.
     *
     * Two records sharing one value are then the SAME edge rather than two edges between the same
     * pair, and the repeat policy decides what happens to the second. Unset -- the default --
     * means the records carry no edge identity and a repeat is decided by its ordered endpoint
     * pair alone.
     *
     * This does not name the edge: `Edge.id` is always the element's own counter.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element edge-id-path="edgeId"></graphty-element>
     * ```
     * @returns JMESPath string or undefined if not set
     */
    @property({ attribute: "edge-id-path" })
    get edgeIdPath(): string | undefined {
        return this.#edgeIdPath;
    }
    /**
     * Sets the JMESPath for edge identity. Updates graph configuration.
     */
    set edgeIdPath(value: string | undefined) {
        const oldValue = this.#edgeIdPath;
        this.#edgeIdPath = value;

        if (value) {
            setDeep(this.#graph.styles.config, "data.knownFields.edgeIdPath", value);
        }

        this.requestUpdate("edgeIdPath", oldValue);
    }

    /**
     * What happens to a second edge record naming an ordered pair the graph already holds.
     *
     * `"keep"` -- the default -- makes it a second edge with its own id, weight and attributes.
     * `"first"` discards it, `"last"` lets it replace what is there, `"sum"`, `"min"` and `"max"`
     * fold its weight into the edge already present, and `"error"` throws `E_DUPLICATE_EDGE`
     * naming both endpoints.
     *
     * A value the schema refuses is REPORTED AND DROPPED rather than thrown, on the same terms as
     * `background` and `acceleration`: this setter is reached from `attributeChangedCallback`,
     * where a throw escapes as an unhandled rejection that reaches nobody.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element repeated-edges="sum"></graphty-element>
     * ```
     * @returns The policy, or undefined when none has been set on this element
     */
    @property({ attribute: "repeated-edges" })
    get repeatedEdges(): DuplicatePolicy | undefined {
        return this.#repeatedEdges;
    }
    /**
     * Sets the repeat policy. Updates graph configuration.
     */
    set repeatedEdges(value: DuplicatePolicy | undefined) {
        const oldValue = this.#repeatedEdges;

        if (value !== undefined && !(REPEATED_EDGE_POLICIES as readonly string[]).includes(value)) {
            console.error(
                `<graphty-element>: repeated-edges must be one of ` +
                    `${REPEATED_EDGE_POLICIES.join(", ")}, not "${value}". ` +
                    `Keeping "${oldValue ?? "keep"}". ` +
                    "See https://graphty.app/docs/graphty-element/attributes#repeated-edges",
            );

            return;
        }

        this.#repeatedEdges = value;

        if (value) {
            setDeep(this.#graph.styles.config, "data.knownFields.repeatedEdges", value);
        }

        this.requestUpdate("repeatedEdges", oldValue);
    }

    /**
     * A jmespath naming what to CALL a node, as distinct from how to address it.
     *
     * A result card naming the busiest node, a legend row and a ranked list all want a name a
     * reader recognises, and an id is only sometimes one -- a GML file keys its nodes by integer
     * while carrying the name beside it. Unset, every one of those falls back to the printed id.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element node-label-path="name"></graphty-element>
     * ```
     * @returns JMESPath string or undefined if not set
     */
    @property({ attribute: "node-label-path" })
    get nodeLabelPath(): string | undefined {
        return this.#nodeLabelPath;
    }
    /**
     * Sets the JMESPath for a node's display name. Updates graph configuration.
     */
    set nodeLabelPath(value: string | undefined) {
        const oldValue = this.#nodeLabelPath;
        this.#nodeLabelPath = value;

        if (value) {
            setDeep(this.#graph.styles.config, "data.knownFields.nodeLabelPath", value);
        }

        this.requestUpdate("nodeLabelPath", oldValue);
    }

    /**
     * A jmespath naming the record key that carries an edge's weight.
     *
     * Every weighted algorithm -- shortest path, weighted centrality, flow -- reads the weight
     * through this. It defaults to `"weight"`, which is what the importers write, with a
     * fallback to a literal `value` key for the datasets that use that spelling.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element edge-weight-path="cost"></graphty-element>
     * ```
     * @returns JMESPath string or undefined if not set
     */
    @property({ attribute: "edge-weight-path" })
    get edgeWeightPath(): string | undefined {
        return this.#edgeWeightPath;
    }
    /**
     * Sets the JMESPath for an edge's weight. Updates graph configuration.
     */
    set edgeWeightPath(value: string | undefined) {
        const oldValue = this.#edgeWeightPath;
        this.#edgeWeightPath = value;

        if (value) {
            setDeep(this.#graph.styles.config, "data.knownFields.edgeWeightPath", value);
        }

        this.requestUpdate("edgeWeightPath", oldValue);
    }

    /**
     * What a record's own coordinates are measured in, as a multiplier into scene units.
     *
     * A file that places its nodes -- a GraphML with `x`/`y`, a saved layout -- is read in the
     * file's units, and this converts them. It must be greater than zero: zero collapses every
     * placed node onto the origin, which is indistinguishable from "unplaced", and a negative
     * factor point-reflects the whole layout.
     *
     * A value the schema refuses is REPORTED AND DROPPED rather than thrown, on the same terms
     * as `background` and `repeated-edges`: this setter is reached from
     * `attributeChangedCallback`, where a throw escapes as an unhandled rejection that reaches
     * nobody.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element position-scale="0.01"></graphty-element>
     * ```
     * @returns The multiplier, or undefined when none has been set on this element
     */
    @property({ attribute: "position-scale", type: Number })
    get positionScale(): number | undefined {
        return this.#positionScale;
    }
    /**
     * Sets the record-units-to-scene-units multiplier. Updates graph configuration.
     */
    set positionScale(value: number | undefined) {
        const oldValue = this.#positionScale;

        if (value !== undefined && !(Number.isFinite(value) && value > 0)) {
            console.error(
                `<graphty-element>: position-scale must be a number greater than zero, not "${String(value)}". ` +
                    `Keeping ${String(oldValue ?? 1)}. ` +
                    "See https://graphty.app/docs/graphty-element/attributes#position-scale",
            );

            return;
        }

        this.#positionScale = value;

        if (value !== undefined) {
            setDeep(this.#graph.styles.config, "data.knownFields.positionScale", value);
        }

        this.requestUpdate("positionScale", oldValue);
    }

    /**
     * Whether the graph is a digraph, overruling whatever a loaded file says.
     *
     * `"auto"` -- the default -- lets a file header settle it, which is what a GML, GraphML or
     * DOT file carries. A boolean settles it here instead and no file can argue: a consumer who
     * knows their edge list is symmetric says so once, rather than per file.
     *
     * A value the schema refuses is reported and dropped rather than thrown.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element directed="true"></graphty-element>
     * ```
     * @returns The setting, or undefined when none has been set on this element
     */
    @property({
        attribute: "directed",
        /*
         * Three values, one of which is a word, so neither Lit's Boolean converter (which reads
         * PRESENCE, making `directed="auto"` mean true) nor its String converter (which would
         * hand the setter "true" and "false" as text) is right on its own.
         */
        converter: {
            fromAttribute: (value: string | null): boolean | "auto" | undefined => {
                if (value === null) {
                    return undefined;
                }

                if (value === "auto") {
                    return "auto";
                }

                if (value === "true" || value === "") {
                    return true;
                }

                if (value === "false") {
                    return false;
                }

                console.error(
                    `<graphty-element>: the directed attribute must be "true", "false" or "auto", ` +
                        `not "${value}". Keeping the setting already in place.`,
                );

                return undefined;
            },
            toAttribute: (value: boolean | "auto" | undefined): string | null =>
                value === undefined ? null : String(value),
        },
    })
    get directed(): boolean | "auto" | undefined {
        return this.#directed;
    }
    /**
     * Sets whether the graph is read as directed. Updates graph configuration.
     */
    set directed(value: boolean | "auto" | undefined) {
        const oldValue = this.#directed;

        if (value !== undefined && value !== "auto" && typeof value !== "boolean") {
            console.error(
                `<graphty-element>: directed must be true, false or "auto", not "${String(value)}". ` +
                    `Keeping "${String(oldValue ?? "auto")}". ` +
                    "See https://graphty.app/docs/graphty-element/attributes#directed",
            );

            return;
        }

        this.#directed = value;

        if (value !== undefined) {
            setDeep(this.#graph.styles.config, "data.directed", value);
        }

        this.requestUpdate("directed", oldValue);
    }

    /**
     * Layout algorithm to use for positioning nodes.
     * @remarks
     * Available layouts:
     * - `ngraph`: Force-directed (3D optimized, recommended)
     * - `d3-force`: Force-directed (2D)
     * - `circular`: Nodes arranged in a circle
     * - `grid`: Nodes arranged in a grid
     * - `hierarchical`: Tree/DAG layout
     * - `random`: Random positions
     * - `fixed`: Pre-defined positions from node data
     * @since 1.0.0
     * @see {@link layoutConfig} for layout-specific options
     * @see {@link https://graphty.app/storybook/element/?path=/story/layout--default | Layout Examples}
     * @example
     * ```typescript
     * // Set force-directed layout
     * element.layout = 'ngraph';
     *
     * // Set circular layout with config
     * element.layout = 'circular';
     * element.layoutConfig = { radius: 5 };
     * ```
     * @returns Layout algorithm name or undefined if not set
     */
    @property()
    get layout(): string | undefined {
        return this.#layout;
    }
    /**
     * Sets the layout algorithm. Triggers layout recalculation with merged config.
     */
    set layout(value: string | undefined) {
        const oldValue = this.#layout;
        this.#layout = value;

        // Forward to Graph method (which queues operation)
        if (value) {
            const templateLayoutOptions = this.#graph.styles.config.graph.layoutOptions ?? {};
            const mergedConfig = { ...templateLayoutOptions, ...(this.#layoutConfig ?? {}) };
            void this.#graph.setLayout(value, mergedConfig);
        }

        this.requestUpdate("layout", oldValue);
    }

    /**
     * Specifies which type of layout to use. See the layout documentation for
     * more information.
     * @returns Layout configuration object or undefined if not set
     */
    @property({ attribute: "layout-config" })
    get layoutConfig(): Record<string, unknown> | undefined {
        return this.#layoutConfig;
    }
    /**
     * Sets layout-specific configuration. Updates active layout if one is set.
     */
    set layoutConfig(value: Record<string, unknown> | undefined) {
        const oldValue = this.#layoutConfig;
        this.#layoutConfig = value;

        // If layout is already set, update it with new config
        if (this.#layout) {
            const templateLayoutOptions = this.#graph.styles.config.graph.layoutOptions ?? {};
            const mergedConfig = { ...templateLayoutOptions, ...(value ?? {}) };
            void this.#graph.setLayout(this.#layout, mergedConfig);
        }

        this.requestUpdate("layoutConfig", oldValue);
    }

    /**
     * How the element DRIVES the layout, as distinct from what the layout engine is configured
     * with.
     * @remarks
     * `layoutConfig` is the engine's own options; this is the element's handling of it.
     * `layout.preSteps` runs the simulation that many times before the first frame is drawn,
     * which is what makes a screenshot of a physics layout the same picture twice -- an
     * unstepped force layout is a graph in mid-flight, and how far it has flown depends on when
     * the picture was taken. `layout.stepMultiplier`, `layout.minDelta` and
     * `layout.zoomStepInterval` pace the rest of it, and `node.pinOnDrag` decides whether a node
     * a reader drags stays where they put it.
     *
     * Merged over what is already set, so naming one field leaves the others alone.
     * @since 2.0.0
     * @example
     * ```typescript
     * element.layoutBehavior = { layout: { preSteps: 1000 } };
     * ```
     * @returns The behaviour settings, or undefined when none have been set on this element
     */
    @property({ attribute: false })
    get layoutBehavior(): GraphBehaviorConfig | undefined {
        return this.#layoutBehavior;
    }
    /**
     * Sets how the element drives the layout.
     *
     * A value the schema refuses is reported and dropped rather than thrown, on the same terms
     * as `background` and `acceleration`.
     */
    set layoutBehavior(value: GraphBehaviorConfig | undefined) {
        const oldValue = this.#layoutBehavior;

        if (value !== undefined) {
            try {
                this.#graph.setLayoutBehavior(value);
            } catch (error: unknown) {
                console.error(
                    "<graphty-element>: the layout behaviour was refused. Keeping the one already set.",
                    error,
                );

                return;
            }
        }

        this.#layoutBehavior = value;
        this.requestUpdate("layoutBehavior", oldValue);
    }

    /**
     * What a selected node looks like: the halo's colour, how far it stands out past the node,
     * and how solid it is.
     * @remarks
     * Merged over what is already set, so naming one field leaves the others alone, and it takes
     * effect on a selection that is already on screen.
     *
     * The highlight is deliberately NOT a style layer. A selection is what a reader is pointing
     * at rather than a property of the data, so a layer drawing it would be reorderable,
     * persistable and lost at a dataset boundary along with every other layer.
     *
     * A value the schema refuses is reported and dropped rather than thrown, on the same terms
     * as `background` and `layoutBehavior`.
     * @since 2.0.0
     * @example
     * ```typescript
     * element.selectionStyle = { color: "#00BCD4", scale: 1.8 };
     * ```
     * @returns The highlight settings, or undefined when none have been set on this element
     */
    @property({ attribute: false })
    get selectionStyle(): GraphSelectionStyleInput | undefined {
        return this.#selectionStyle;
    }
    /**
     * Sets what a selected node looks like.
     */
    set selectionStyle(value: GraphSelectionStyleInput | undefined) {
        const oldValue = this.#selectionStyle;

        if (value !== undefined) {
            try {
                this.#graph.setSelectionStyle(value);
            } catch (error: unknown) {
                console.error(
                    "<graphty-element>: the selection style was refused. Keeping the one already set.",
                    error,
                );

                return;
            }
        }

        this.#selectionStyle = value;
        this.requestUpdate("selectionStyle", oldValue);
    }

    /**
     * Which algorithms to run once data has finished loading.
     * @remarks
     * Catalogue keys, run in the order given. This is the LIST; `runAlgorithmsOnLoad` is the
     * switch that decides whether the list is honoured, and a switch with an empty list beside
     * it does nothing -- which is what happened when the style template that used to carry the
     * list was removed and nothing replaced it.
     * @since 2.0.0
     * @example
     * ```typescript
     * element.algorithmsOnLoad = ["degree"];
     * element.runAlgorithmsOnLoad = true;
     * ```
     * @returns The keys, or undefined when none have been set on this element
     */
    @property({ attribute: false })
    get algorithmsOnLoad(): readonly string[] | undefined {
        return this.#algorithmsOnLoad;
    }
    /**
     * Sets which algorithms run once data has finished loading.
     */
    set algorithmsOnLoad(value: readonly string[] | undefined) {
        const oldValue = this.#algorithmsOnLoad;
        this.#algorithmsOnLoad = value;
        this.#graph.styles.config.data.algorithms = value === undefined ? undefined : [...value];
        this.requestUpdate("algorithmsOnLoad", oldValue);
    }

    /**
     * View mode controls how the graph is rendered and displayed.
     * @remarks
     * - `"2d"`: Orthographic camera, fixed top-down view
     * - `"3d"`: Perspective camera with orbit controls (default)
     * - `"ar"`: Augmented reality mode using WebXR
     * - `"vr"`: Virtual reality mode using WebXR
     *
     * VR and AR modes require WebXR support in the browser.
     * @since 1.0.0
     * @see {@link https://graphty.app/storybook/element/?path=/story/viewmode--default | View Mode Examples}
     * @example
     * ```typescript
     * element.viewMode = "2d";  // Switch to 2D orthographic view
     * element.viewMode = "3d";  // Switch to 3D perspective view
     * element.viewMode = "vr";  // Enter VR mode (requires WebXR support)
     * ```
     * @returns Current view mode or undefined if not set
     */
    @property({ attribute: "view-mode" })
    get viewMode(): ViewMode | undefined {
        return this.#viewMode;
    }
    /**
     * Sets the view mode. Switches camera and rendering mode accordingly.
     */
    set viewMode(value: ViewMode | undefined) {
        const oldValue = this.#viewMode;
        this.#viewMode = value;

        // Forward to Graph method (which handles all mode switching logic)
        if (value !== undefined) {
            void this.#graph.setViewMode(value);
        }

        this.requestUpdate("viewMode", oldValue);
    }

    /**
     * Gets 2D layout mode (deprecated - use viewMode instead).
     * @deprecated Use viewMode instead. layout2d: true is equivalent to viewMode: "2d"
     * Specifies that the layout should be rendered in two dimensions (as
     * opposed to 3D)
     * @returns True if in 2D mode, false if 3D, undefined otherwise
     */
    @property({ attribute: "layout-2d" })
    get layout2d(): boolean | undefined {
        // Return true if viewMode is "2d", false if "3d", undefined otherwise
        if (this.#viewMode === "2d") {
            return true;
        }

        if (this.#viewMode === "3d") {
            return false;
        }

        return undefined;
    }
    /**
     * Sets 2D mode (deprecated). Converts boolean to viewMode internally.
     */
    set layout2d(value: boolean | undefined) {
        console.warn(
            "[graphty-element] layout2d is deprecated. Use viewMode instead. " +
                'layout2d: true → viewMode: "2d", layout2d: false → viewMode: "3d"',
        );

        if (value !== undefined) {
            // Convert boolean to viewMode
            this.viewMode = value ? "2d" : "3d";
        }
    }

    /**
     * What the graph is drawn against: a flat colour, or a photo-dome skybox.
     * @remarks
     * A colour accepts anything CSS does -- a hex string, `rgb(...)`, or a name such as
     * `whitesmoke` -- and is normalised to hex. A skybox wraps the graph in a photo dome built
     * from an image, given as a URL or a base64 PNG, and the element emits
     * `graphty-skybox-loaded` once its texture has arrived.
     * @since 2.0.0
     * @example JavaScript property
     * ```typescript
     * element.background = { backgroundType: 'color', color: '#101014' };
     * element.background = { backgroundType: 'skybox', data: 'https://example.com/sky.jpg' };
     * ```
     * @example HTML attribute (JSON string)
     * ```html
     * <graphty-element background='{"backgroundType":"color","color":"black"}'></graphty-element>
     * ```
     * @returns The background, or undefined when none has been set on this element
     */
    @property({
        /*
         * A JSON converter, because the documented HTML form above is a JSON object and Lit's
         * default converter hands a setter the raw attribute TEXT. Without this the attribute
         * form threw a schema error out of `attributeChangedCallback`, where it escaped as an
         * unhandled rejection rather than reaching anybody who could act on it -- the element's
         * own example for this property did not work.
         */
        converter: {
            fromAttribute: (value: string | null): GraphBackgroundConfig | undefined => {
                if (value === null) {
                    return undefined;
                }

                try {
                    return JSON.parse(value) as GraphBackgroundConfig;
                } catch {
                    console.error(
                        `<graphty-element>: the background attribute must be a JSON object, not ` +
                            `"${value}". Keeping the background already set. ` +
                            "See https://graphty.app/docs/graphty-element/attributes#background",
                    );

                    return undefined;
                }
            },
            toAttribute: (value: GraphBackgroundConfig | undefined): string | null =>
                value === undefined ? null : JSON.stringify(value),
        },
    })
    get background(): GraphBackgroundConfig | undefined {
        return this.#background;
    }
    /**
     * Sets the graph background. Applies it to the scene immediately.
     *
     * A value the schema refuses is REPORTED AND DROPPED rather than thrown, on the same terms
     * as `acceleration`: this setter is reached from `attributeChangedCallback`, and a throw
     * there escapes as an unhandled rejection that reaches nobody, leaving the page with an
     * element that never rendered. A wrong colour in markup must not take the graph down.
     */
    set background(value: GraphBackgroundConfig | undefined) {
        const oldValue = this.#background;

        if (value !== undefined) {
            try {
                this.#graph.setBackground(value);
            } catch (error: unknown) {
                console.error(
                    "<graphty-element>: the background was refused. Keeping the one already set.",
                    error,
                );

                return;
            }
        }

        this.#background = value;
        this.requestUpdate("background", oldValue);
    }

    /**
     * How far the camera starts from the graph.
     * @remarks
     * It is carried in the element's configuration document. NOTHING READS IT YET -- no camera
     * is placed from it today, and that was true before this property existed; the property
     * makes the setting reachable again rather than newly effective. A graph that has settled is
     * framed by `zoomToFit()`.
     * @since 2.0.0
     * @example
     * ```typescript
     * element.startingCameraDistance = 60;
     * ```
     * @returns The distance, or undefined when none has been set on this element
     */
    @property({ attribute: "starting-camera-distance", type: Number })
    get startingCameraDistance(): number | undefined {
        return this.#startingCameraDistance;
    }
    /**
     * Sets the starting camera distance.
     */
    set startingCameraDistance(value: number | undefined) {
        const oldValue = this.#startingCameraDistance;
        this.#startingCameraDistance = value;

        if (value !== undefined) {
            setDeep(this.#graph.styles.config, "graph.startingCameraDistance", value);
        }

        this.requestUpdate("startingCameraDistance", oldValue);
    }

    /**
     * Whether or not to run all algorithims in a style template when the
     * template is loaded.
     * @returns Boolean flag or undefined if not set
     */
    @property({ attribute: "run-algorithms-on-load" })
    get runAlgorithmsOnLoad(): boolean | undefined {
        return this.#runAlgorithmsOnLoad;
    }
    /**
     * Sets whether to run algorithms when a style template loads. Updates graph configuration.
     */
    set runAlgorithmsOnLoad(value: boolean | undefined) {
        const oldValue = this.#runAlgorithmsOnLoad;
        this.#runAlgorithmsOnLoad = value;

        if (value !== undefined) {
            this.#graph.runAlgorithmsOnLoad = value;
        }

        this.requestUpdate("runAlgorithmsOnLoad", oldValue);
    }

    #enableDetailedProfiling?: boolean;

    /**
     * Enable detailed performance profiling.
     * When enabled, hierarchical timing and advanced statistics will be collected.
     * Access profiling data via graph.getStatsManager().getSnapshot() or
     * graph.getStatsManager().reportDetailed().
     * @returns Boolean flag or undefined if not set
     */
    @property({ attribute: "enable-detailed-profiling", type: Boolean })
    get enableDetailedProfiling(): boolean | undefined {
        return this.#enableDetailedProfiling;
    }
    /**
     * Sets detailed profiling mode. Enables hierarchical timing and advanced stats collection.
     */
    set enableDetailedProfiling(value: boolean | undefined) {
        const oldValue = this.#enableDetailedProfiling;
        this.#enableDetailedProfiling = value;

        if (value !== undefined) {
            this.#graph.enableDetailedProfiling = value;
        }

        this.requestUpdate("enableDetailedProfiling", oldValue);
    }

    /**
     * XR (VR/AR) configuration.
     * Controls XR UI buttons, VR/AR mode settings, and input handling.
     * @example
     * ```typescript
     * element.xr = {
     *   enabled: true,
     *   ui: {
     *     enabled: true,
     *     position: 'bottom-right',
     *     showAvailabilityWarning: true  // Show warning if XR unavailable
     *   },
     *   input: {
     *     handTracking: true,
     *     controllers: true
     *   }
     * };
     * ```
     * @returns XR configuration object or undefined if not set
     */
    @property({ attribute: false })
    get xr(): PartialXRConfig | undefined {
        return this.#xr;
    }
    /**
     * Sets XR configuration. Updates VR/AR settings and UI options.
     */
    set xr(value: PartialXRConfig | undefined) {
        const oldValue = this.#xr;
        this.#xr = value;

        // Forward to Graph method
        if (value !== undefined) {
            this.#graph.setXRConfig(value);
        }

        this.requestUpdate("xr", oldValue);
    }

    /**
     * Capture a screenshot of the current graph visualization.
     * @param options - Screenshot options (format, resolution, destinations, etc.)
     * @returns Promise resolving to ScreenshotResult with blob and metadata
     * @example
     * ```typescript
     * const el = document.querySelector('graphty-element');
     *
     * // Basic PNG screenshot
     * const result = await el.captureScreenshot();
     *
     * // High-res JPEG with download
     * const result = await el.captureScreenshot({
     *   format: 'jpeg',
     *   multiplier: 2,
     *   destination: { download: true }
     * });
     *
     * // Copy to clipboard
     * const result = await el.captureScreenshot({
     *   destination: { clipboard: true }
     * });
     * ```
     */
    async captureScreenshot(options?: ScreenshotOptions): Promise<ScreenshotResult> {
        return this.#graph.captureScreenshot(options);
    }

    /**
     * Phase 6: Capability Check API
     * Check if screenshot can be captured with given options.
     * Available from Phase 6 onwards.
     * @param options - Screenshot options to validate
     * @returns Promise<CapabilityCheck> - Result indicating whether screenshot is supported
     * @example
     * ```typescript
     * const el = document.querySelector('graphty-element');
     *
     * // Check if 4x multiplier is supported
     * const check = await el.canCaptureScreenshot({ multiplier: 4 });
     * if (!check.supported) {
     *   alert(`Cannot capture: ${check.reason}`);
     * } else if (check.warnings) {
     *   console.warn('Warnings:', check.warnings);
     * }
     * ```
     */
    async canCaptureScreenshot(
        options?: ScreenshotOptions,
    ): Promise<import("./screenshot/capability-check.js").CapabilityCheck> {
        return this.#graph.canCaptureScreenshot(options);
    }

    /**
     * Phase 7: Video Capture API
     * Capture an animation as a video (stationary or animated camera)
     * Available from Phase 7 onwards.
     * @param options - Animation capture options
     * @returns Promise<AnimationResult> - Result with video blob and metadata
     * @example
     * ```typescript
     * const el = document.querySelector('graphty-element');
     *
     * // Basic 5-second video
     * const result = await el.captureAnimation({
     *   duration: 5000,
     *   fps: 30,
     *   cameraMode: 'stationary'
     * });
     *
     * // With download
     * const result = await el.captureAnimation({
     *   duration: 10000,
     *   fps: 60,
     *   cameraMode: 'stationary',
     *   download: true,
     *   downloadFilename: 'my-video.webm'
     * });
     * ```
     */
    async captureAnimation(
        options: import("./video/VideoCapture.js").AnimationOptions,
    ): Promise<import("./video/VideoCapture.js").AnimationResult> {
        return this.#graph.captureAnimation(options);
    }

    /**
     * Phase 7: Cancel Animation Capture
     * Cancel an ongoing animation capture
     * Available from Phase 7 onwards.
     * @returns true if a capture was cancelled, false if no capture was in progress
     * @example
     * ```typescript
     * const el = document.querySelector("graphty-element");
     *
     * // Start a 10-second capture
     * const capturePromise = el.captureAnimation({
     *   duration: 10000,
     *   fps: 30,
     *   cameraMode: 'stationary'
     * });
     *
     * // Cancel after 2 seconds
     * setTimeout(() => {
     *   const wasCancelled = el.cancelAnimationCapture();
     *   console.log('Cancelled:', wasCancelled);
     * }, 2000);
     *
     * // Handle the cancellation
     * try {
     *   await capturePromise;
     * } catch (error) {
     *   if (error.name === 'AnimationCancelledError') {
     *     console.log('Capture was cancelled by user');
     *   }
     * }
     * ```
     */
    cancelAnimationCapture(): boolean {
        return this.#graph.cancelAnimationCapture();
    }

    /**
     * Phase 7: Check if animation capture is in progress
     * Available from Phase 7 onwards.
     * @returns true if a capture is currently running
     */
    isAnimationCapturing(): boolean {
        return this.#graph.isAnimationCapturing();
    }

    /**
     * Phase 7: Animation Capture Estimation
     * Estimate performance and potential issues for animation capture
     * Available from Phase 7 onwards.
     * @param options - Animation options to estimate
     * @returns Promise<CaptureEstimate> - Estimation result
     * @example
     * ```typescript
     * const el = document.querySelector("graphty-element");
     *
     * const estimate = await el.estimateAnimationCapture({
     *   duration: 5000,
     *   fps: 60,
     *   width: 3840,
     *   height: 2160
     * });
     *
     * if (estimate.likelyToDropFrames) {
     *   console.warn(`May drop frames. Try ${estimate.recommendedFps}fps instead.`);
     * }
     * ```
     */
    async estimateAnimationCapture(
        options: Pick<import("./video/VideoCapture.js").AnimationOptions, "duration" | "fps" | "width" | "height">,
    ): Promise<import("./video/estimation.js").CaptureEstimate> {
        return this.#graph.estimateAnimationCapture(options);
    }

    /**
     * View Mode API
     */

    /**
     * Get the current view mode.
     * @returns The current view mode ("2d", "3d", "ar", or "vr")
     * @example
     * ```typescript
     * const mode = element.getViewMode();
     * console.log(`Current mode: ${mode}`); // "3d"
     * ```
     */
    getViewMode(): ViewMode {
        return this.#graph.getViewMode();
    }

    /**
     * Set the view mode.
     * Changes the rendering dimension and camera system.
     * @param mode - The view mode to set ("2d", "3d", "ar", or "vr")
     * @returns Promise that resolves when the mode switch is complete
     * @example
     * ```typescript
     * // Switch to 2D orthographic view
     * await element.setViewMode("2d");
     *
     * // Switch to VR mode
     * await element.setViewMode("vr");
     * ```
     */
    async setViewMode(mode: ViewMode): Promise<void> {
        return this.#graph.setViewMode(mode);
    }

    /**
     * Check if VR mode is supported on this device/browser.
     * Returns true if WebXR is available and VR sessions are supported.
     *
     * Use this to conditionally show/hide VR controls or display
     * appropriate messaging to users.
     * @returns Promise resolving to true if VR is supported
     * @example
     * ```typescript
     * const vrButton = document.querySelector('#vr-button');
     * const vrSupported = await element.isVRSupported();
     * if (!vrSupported) {
     *   vrButton.disabled = true;
     *   vrButton.title = "VR not available on this device";
     * }
     * ```
     */
    async isVRSupported(): Promise<boolean> {
        return this.#graph.isVRSupported();
    }

    /**
     * Check if AR mode is supported on this device/browser.
     * Returns true if WebXR is available and AR sessions are supported.
     *
     * Use this to conditionally show/hide AR controls or display
     * appropriate messaging to users.
     * @returns Promise resolving to true if AR is supported
     * @example
     * ```typescript
     * const arButton = document.querySelector('#ar-button');
     * const arSupported = await element.isARSupported();
     * if (!arSupported) {
     *   arButton.disabled = true;
     *   arButton.title = "AR not available on this device";
     * }
     * ```
     */
    async isARSupported(): Promise<boolean> {
        return this.#graph.isARSupported();
    }

    /**
     * Phase 4: Camera State API
     */

    /**
     * Get current camera state (supports both 2D and 3D)
     * @returns Current camera state including position, target, zoom, etc.
     */
    getCameraState(): import("./screenshot/types.js").CameraState {
        return this.#graph.getCameraState();
    }

    /**
     * Set camera state (supports both 2D and 3D)
     * @param state - Camera state to apply or preset name
     * @param options - Animation options
     * @returns Promise that resolves when the camera state is applied (or animation completes)
     */
    async setCameraState(
        state: import("./screenshot/types.js").CameraState | { preset: string },
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.#graph.setCameraState(state, options);
    }

    /**
     * Set camera position (3D)
     * @param position - Target position {x, y, z}
     * @param position.x - X coordinate
     * @param position.y - Y coordinate
     * @param position.z - Z coordinate
     * @param options - Animation options
     * @returns Promise that resolves when the position is applied (or animation completes)
     */
    async setCameraPosition(
        position: { x: number; y: number; z: number },
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.#graph.setCameraPosition(position, options);
    }

    /**
     * Set camera target (3D)
     * @param target - Target point to look at {x, y, z}
     * @param target.x - X coordinate
     * @param target.y - Y coordinate
     * @param target.z - Z coordinate
     * @param options - Animation options
     * @returns Promise that resolves when the target is applied (or animation completes)
     */
    async setCameraTarget(
        target: { x: number; y: number; z: number },
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.#graph.setCameraTarget(target, options);
    }

    /**
     * Set camera zoom (2D)
     * @param zoom - Zoom level
     * @param options - Animation options
     * @returns Promise that resolves when the zoom is applied (or animation completes)
     */
    async setCameraZoom(zoom: number, options?: import("./screenshot/types.js").CameraAnimationOptions): Promise<void> {
        return this.#graph.setCameraZoom(zoom, options);
    }

    /**
     * Set camera pan (2D)
     * @param pan - Pan position {x, y}
     * @param pan.x - X offset
     * @param pan.y - Y offset
     * @param options - Animation options
     * @returns Promise that resolves when the pan is applied (or animation completes)
     */
    async setCameraPan(
        pan: { x: number; y: number },
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.#graph.setCameraPan(pan, options);
    }

    /**
     * Reset camera to default position
     * @param options - Animation options
     * @returns Promise that resolves when the reset is applied (or animation completes)
     */
    async resetCamera(options?: import("./screenshot/types.js").CameraAnimationOptions): Promise<void> {
        return this.#graph.resetCamera(options);
    }

    /**
     * Save current camera state as a named preset.
     * Available from Phase 5 onwards.
     * @param name - Name for the preset
     */
    saveCameraPreset(name: string): void {
        this.#graph.saveCameraPreset(name);
    }

    /**
     * Load a camera preset (built-in or user-defined).
     * Available from Phase 5 onwards.
     * @param name - Name of the preset to load
     * @param options - Animation options
     * @returns Promise that resolves when preset is loaded
     */
    async loadCameraPreset(
        name: string,
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.#graph.loadCameraPreset(name, options);
    }

    /**
     * Get all camera presets (built-in + user-defined).
     * Available from Phase 5 onwards.
     * @returns Record of preset names to their state (built-in presets are marked)
     */
    getCameraPresets(): Record<string, import("./screenshot/types.js").CameraState | { builtin: true }> {
        return this.#graph.getCameraPresets();
    }

    /**
     * Export user-defined presets as JSON
     * Available from Phase 5 onwards
     * @returns Record of user-defined preset names to their state
     */
    exportCameraPresets(): Record<string, import("./screenshot/types.js").CameraState> {
        return this.#graph.exportCameraPresets();
    }

    /**
     * Import user-defined presets from JSON
     * Available from Phase 5 onwards
     * @param presets - Record of preset names to their state
     */
    importCameraPresets(presets: Record<string, import("./screenshot/types.js").CameraState>): void {
        this.#graph.importCameraPresets(presets);
    }

    /**
     * Get the underlying Graph instance for debugging purposes.
     * @returns The Graph instance
     */
    get graph(): Graph {
        return this.#graph;
    }

    // ============================================================================
    // Phase 7a: High Priority Methods - Data Management
    // ============================================================================

    /**
     * Add a single node to the graph.
     * @param node - Node data object to add
     * @param idPath - Key to use for node ID (default: "id")
     * @param options - Queue options for operation ordering
     * @returns Promise that resolves when node is added
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.addNode({ id: 'node-1', label: 'First Node' });
     * ```
     */
    async addNode(
        node: import("./config").AdHocData,
        idPath?: string,
        options?: import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        return this.#graph.addNode(node, idPath, options);
    }

    /**
     * Add multiple nodes to the graph.
     * @param nodes - Array of node data objects to add
     * @param idPath - Key to use for node IDs (default: "id")
     * @param options - Queue options for operation ordering
     * @returns Promise that resolves when nodes are added
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.addNodes([
     *   { id: 'a', label: 'Node A' },
     *   { id: 'b', label: 'Node B' }
     * ]);
     * ```
     */
    async addNodes(
        nodes: import("./config").AdHocData[],
        idPath?: string,
        options?: import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        return this.#graph.addNodes(nodes, idPath, options);
    }

    /**
     * Add a single edge to the graph.
     * @param edge - Edge data object to add
     * @param options - The endpoint expressions, the repeat policy, and queue ordering
     * @returns Promise that resolves when edge is added
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.addEdge({ source: 'a', target: 'b', weight: 1.5 });
     * ```
     */
    async addEdge(
        edge: import("./config").AdHocData,
        options?: import("./managers").AddEdgesOptions & import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        return this.#graph.addEdge(edge, options);
    }

    /**
     * Add multiple edges to the graph.
     * @remarks
     * With no `source` and `target` named, the element reads `source`/`target`, then `src`/`dst`,
     * then `from`/`to`, deciding once for the whole batch. A batch that answers none of them
     * throws `E_EDGE_ENDPOINTS_UNRESOLVED` rather than adding a graph with no edges.
     * @param edges - Array of edge data objects to add
     * @param options - The endpoint expressions, the repeat policy, and queue ordering
     * @returns Promise that resolves when edges are added
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.addEdges([
     *   { source: 'a', target: 'b' },
     *   { source: 'b', target: 'c' }
     * ]);
     * ```
     */
    async addEdges(
        edges: import("./config").AdHocData[],
        options?: import("./managers").AddEdgesOptions & import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        return this.#graph.addEdges(edges, options);
    }

    /**
     * Remove nodes from the graph.
     * @param nodeIds - Array of node IDs to remove
     * @param options - Queue options for operation ordering
     * @returns Promise that resolves when nodes are removed
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.removeNodes(['node-1', 'node-2']);
     * ```
     */
    async removeNodes(
        nodeIds: (string | number)[],
        options?: import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        return this.#graph.removeNodes(nodeIds, options);
    }

    /**
     * Update node data.
     * @param updates - Array of update objects with id and properties to update
     * @param options - Queue options for operation ordering
     * @returns Promise that resolves when nodes are updated
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.updateNodes([
     *   { id: 'node-1', label: 'Updated Label' }
     * ]);
     * ```
     */
    async updateNodes(
        updates: { id: string | number; [key: string]: unknown }[],
        options?: import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        return this.#graph.updateNodes(updates, options);
    }

    /**
     * Add data from a data source.
     * @param type - Data source type (e.g., "json", "csv", "graphml")
     * @param opts - Data source configuration options
     * @returns Promise that resolves when data is loaded
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.addDataFromSource('json', { url: 'https://example.com/data.json' });
     * ```
     */
    async addDataFromSource(type: string, opts?: object): Promise<void> {
        return this.#graph.addDataFromSource(type, opts ?? {});
    }

    /**
     * Load graph data from a URL.
     * @param url - URL to fetch graph data from
     * @param options - Loading options
     * @param options.format - Data format (e.g., "json", "csv", "graphml")
     * @param options.nodeIdPath - JMESPath for node ID field
     * @param options.edgeSource - Where the node an edge starts at is named in the record. Left
     *     unset, the element reads `source`, then `src`, then `from`
     * @param options.edgeTarget - Where the node an edge ends at is named in the record
     * @returns Promise that resolves when data is loaded
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.loadFromUrl('https://example.com/graph.json');
     * ```
     */
    async loadFromUrl(
        url: string,
        options?: {
            format?: string;
            nodeIdPath?: string;
            edgeSource?: string;
            edgeTarget?: string;
        },
    ): Promise<void> {
        return this.#graph.loadFromUrl(url, options);
    }

    /**
     * Load graph data from a File object.
     * @param file - File object from file input
     * @param options - Loading options
     * @param options.format - Data format (e.g., "json", "csv", "graphml")
     * @param options.nodeIdPath - JMESPath for node ID field
     * @param options.edgeSource - Where the node an edge starts at is named in the record. Left
     *     unset, the element reads `source`, then `src`, then `from`
     * @param options.edgeTarget - Where the node an edge ends at is named in the record
     * @returns Promise that resolves when data is loaded
     * @since 1.5.0
     * @example
     * ```typescript
     * const input = document.querySelector('input[type="file"]');
     * const file = input.files[0];
     * await element.loadFromFile(file);
     * ```
     */
    async loadFromFile(
        file: File,
        options?: {
            format?: string;
            nodeIdPath?: string;
            edgeSource?: string;
            edgeTarget?: string;
        },
    ): Promise<void> {
        return this.#graph.loadFromFile(file, options);
    }

    /**
     * Pin nodes where they are, so no layout moves them again.
     *
     * A pin survives a layout change, a 2D/3D switch and a template apply, which is what makes it
     * worth having a door for: `pinOnDrag` is on by default, so every node a reader has ever
     * dragged is pinned, and until now the only way back out was through `element.graph`.
     * @param ids - one node id, or several
     * @since 2.0.0
     * @example
     * ```typescript
     * element.pin("alice");
     * element.pin(["bob", "carol"]);
     * ```
     */
    pin(ids: (string | number) | readonly (string | number)[]): void {
        for (const id of Array.isArray(ids) ? ids : [ids as string | number]) {
            this.#graph.getNode(id)?.pin();
        }
    }

    /**
     * Release nodes a reader or a drag pinned, so the layout arranges them again.
     * @param ids - one node id, or several
     * @since 2.0.0
     */
    unpin(ids: (string | number) | readonly (string | number)[]): void {
        for (const id of Array.isArray(ids) ? ids : [ids as string | number]) {
            this.#graph.getNode(id)?.unpin();
        }
    }

    /**
     * Whether one node is pinned.
     *
     * One lookup, for the question a node inspector actually asks. Reading
     * {@link Graphty.pinnedNodes} to answer it walks every node in the graph, which on a large
     * one is a full pass per selection change.
     * @param id - the node id, in either spelling an integer id may be written in
     * @returns true when that node is pinned, false when it is not or when nothing answers to
     *     that id
     * @since 2.0.0
     */
    isPinned(id: string | number): boolean {
        return this.#graph.getNode(id)?.isPinned() ?? false;
    }

    /**
     * Which nodes are pinned right now.
     *
     * Ids as the graph holds them, which is the form its own data carried: a sample whose file
     * spelled its ids as integers answers with numbers. {@link Graphty.isPinned} takes either
     * spelling, so a consumer comparing against an id it has printed should ask that instead of
     * testing this set for membership.
     * @returns the pinned node ids
     * @since 2.0.0
     */
    get pinnedNodes(): ReadonlySet<string | number> {
        const pinned = new Set<string | number>();
        for (const node of this.#graph.getDataManager().nodes.values()) {
            if (node.isPinned()) {
                pinned.add(node.id);
            }
        }

        return pinned;
    }

    /**
     * Get a node by its ID.
     * @param nodeId - The ID of the node to get
     * @returns The node, or undefined if not found
     * @since 1.5.0
     * @example
     * ```typescript
     * const node = element.getNode('node-1');
     * if (node) {
     *   console.log('Node data:', node.data);
     * }
     * ```
     */
    getNode(nodeId: string | number): import("./Node").Node | undefined {
        return this.#graph.getNode(nodeId);
    }

    /**
     * Get all nodes in the graph.
     * @returns Array of all nodes
     * @since 1.5.0
     * @example
     * ```typescript
     * const nodes = element.getNodes();
     * console.log('Total nodes:', nodes.length);
     * ```
     */
    getNodes(): import("./Node").Node[] {
        return this.#graph.getNodes();
    }

    /**
     * Get the number of nodes in the graph.
     * @returns Number of nodes
     * @since 1.5.0
     * @example
     * ```typescript
     * console.log('Node count:', element.getNodeCount());
     * ```
     */
    getNodeCount(): number {
        return this.#graph.getNodeCount();
    }

    /**
     * Get the number of edges in the graph.
     * @returns Number of edges
     * @since 1.5.0
     * @example
     * ```typescript
     * console.log('Edge count:', element.getEdgeCount());
     * ```
     */
    getEdgeCount(): number {
        return this.#graph.getEdgeCount();
    }

    // ============================================================================
    // Phase 7a: High Priority Methods - Selection
    // ============================================================================

    /**
     * Select a node by its ID, replacing whatever was selected before.
     *
     * Superseded by {@link Graphty.select}, which takes the same five set operations over every
     * way of naming elements. This is `select({ nodes: [nodeId] })` with a lookup in front of
     * it, and it keeps working because it is what a click has always done.
     * @param nodeId - The ID of the node to select
     * @returns True if the node was found and selected, false otherwise
     * @since 1.5.0
     * @example
     * ```typescript
     * if (element.selectNode('node-1')) {
     *   console.log('Node selected');
     * }
     * ```
     */
    selectNode(nodeId: string | number): boolean {
        return this.#graph.selectNode(nodeId);
    }

    /**
     * Deselect the currently selected node.
     *
     * Superseded by `session.selection.clear()`, which empties both sets. This clears the node
     * half through the same model and keeps working.
     * @since 1.5.0
     * @see {@link Graphty.select} for the verb that replaces this one
     * @example
     * ```typescript
     * element.deselectNode();
     * ```
     */
    deselectNode(): void {
        this.#graph.deselectNode();
    }

    /**
     * Get the currently selected node.
     *
     * Superseded by `session.selection.nodes`, which is the whole selection rather than the
     * first node of it: this answers with one render object, and a selection now holds any
     * number of nodes and edges.
     * @returns The first selected node, or null if no node is selected
     * @since 1.5.0
     * @see {@link Graphty.select} for the verb that replaces this one
     * @example
     * ```typescript
     * const selected = element.getSelectedNode();
     * if (selected) {
     *   console.log('Selected node:', selected.id);
     * }
     * ```
     */
    getSelectedNode(): import("./Node").Node | null {
        return this.#graph.getSelectedNode();
    }

    /**
     * Check if a specific node is selected.
     *
     * Answered from the selection masks, so it is true for EVERY selected node rather than only
     * the first one. Superseded by `session.selection.has`, which answers for an edge too.
     * @param nodeId - The ID of the node to check
     * @returns True if the node is selected, false otherwise
     * @since 1.5.0
     * @example
     * ```typescript
     * if (element.isNodeSelected('node-1')) {
     *   console.log('Node 1 is selected');
     * }
     * ```
     */
    isNodeSelected(nodeId: string | number): boolean {
        return this.#graph.isNodeSelected(nodeId);
    }

    // ============================================================================
    // Phase 7a: High Priority Methods - Algorithm
    // ============================================================================

    /**
     * Run a graph algorithm.
     * @deprecated Since 2.0. Use `run()`, which returns a `Run`: the result is on the object the
     *   call hands back, the work reports progress and can be cancelled, and
     *   `graphty-run-change` follows it from the DOM. This method still works and is expressed in
     *   terms of `run`. (An inline link cannot appear in this tag: the custom-elements-manifest
     *   build serialises a raw compiler node for one and fails on the cycle inside it.)
     * @param namespace - Algorithm namespace (e.g., "graphty")
     * @param type - Algorithm type (e.g., "degree", "pagerank")
     * @param options - Algorithm options
     * @returns Promise that resolves when algorithm completes
     * @since 1.5.0
     * @see {@link Graphty.run} for the verb that replaces this one
     * @example
     * ```typescript
     * await element.runAlgorithm('graphty', 'degree');
     * await element.runAlgorithm('graphty', 'pagerank', { applySuggestedStyles: true });
     * ```
     */
    async runAlgorithm(
        namespace: string,
        type: string,
        options?: import("./utils/queue-migration").RunAlgorithmOptions,
    ): Promise<void> {
        // A forwarder for a deprecated verb has to call it; both go together.
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        return this.#graph.runAlgorithm(namespace, type, options);
    }

    /**
     * Paint what an algorithm's finished runs suggest be drawn from them.
     *
     * Rarely needed: a run paints itself on its first completion, from the encoding its own
     * result shape derives. This is the verb for a run started with `{ style: false }`, or for
     * putting a picture back after a reader cleared it. Applying twice replaces the layer bound
     * to that run and channel rather than stacking a second one on it.
     * @param algorithmKey - A catalogue key such as "degree", a 1.10 address such as
     *     "graphty:degree", or an array of either.
     * @returns True if anything was applied, false when no finished run of that algorithm has
     *     anything per element to paint.
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.run('degree', undefined, { style: false });
     * element.applySuggestedStyles('degree');
     * ```
     */
    applySuggestedStyles(algorithmKey: string | string[]): boolean {
        return this.#graph.applySuggestedStyles(algorithmKey);
    }

    /**
     * What an algorithm's finished runs suggest be drawn from them, without painting any of it.
     * @param algorithmKey - A catalogue key such as "degree", or a 1.10 address such as
     *     "graphty:degree".
     * @returns One suggestion per channel a run of that algorithm would paint, empty when it has
     *     finished no run or its result is read rather than painted.
     * @since 1.5.0
     * @example
     * ```typescript
     * const suggested = element.getSuggestedStyles('degree');
     * console.log(suggested.map((one) => one.channels).flat());
     * ```
     */
    getSuggestedStyles(algorithmKey: string): readonly import("./session/styles").StyleSuggestion[] {
        return this.#graph.getSuggestedStyles(algorithmKey);
    }

    // ============================================================================
    // Phase 7a: High Priority Methods - Layout
    // ============================================================================

    /**
     * Set the layout algorithm.
     * @param type - Layout algorithm name
     * @param opts - Layout-specific options
     * @param options - Queue options
     * @returns Promise that resolves when layout is initialized
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.setLayout('circular', { radius: 5 });
     * await element.setLayout('ngraph', { springLength: 100 });
     * ```
     */
    async setLayout(
        type: string,
        opts?: object,
        options?: import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        return this.#graph.setLayout(type, opts ?? {}, options);
    }

    // ============================================================================
    // Phase 7a: High Priority Methods - Utility
    // ============================================================================

    /**
     * Zoom the camera to fit all nodes in view.
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.waitForSettled();
     * element.zoomToFit();
     * ```
     */
    zoomToFit(): void {
        this.#graph.zoomToFit();
    }

    /**
     * Wait for every queued operation to finish.
     *
     * The QUEUE only -- data loading, layout changes, algorithm runs. The layout may still be
     * running and the camera may still be moving when this resolves. For a picture that will not
     * change again, wait for {@link Graphty.waitForStableFrame}.
     * @returns Promise that resolves when all operations are complete
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.addNodes(nodes);
     * await element.waitForSettled();
     * console.log('Graph is ready');
     * ```
     */
    async waitForSettled(): Promise<void> {
        return this.#graph.waitForSettled();
    }

    /**
     * Wait until the picture is final.
     *
     * Resolves once every queued operation has run, the layout has converged, the camera has
     * finished framing what it arrived at, and a frame has been drawn showing that. This is what
     * a screenshot, a video frame or a visual regression snapshot needs: the `graph-settled`
     * event fires one update pass earlier, before the final framing has even been requested, so
     * a picture taken on that event is a picture of a camera still in motion.
     *
     * It rejects, naming what was still moving, rather than handing back a moving picture.
     * @param options - How the wait is bounded.
     * @param options.timeoutMs - How long to wait before giving up; 30 seconds by default.
     * @returns Promise that resolves once a frame of the finished picture has been drawn.
     * @throws Error when the picture is still changing when the timeout expires.
     * @since 2.0.0
     * @example
     * ```typescript
     * await element.waitForStableFrame();
     * const shot = await element.captureScreenshot();
     * ```
     */
    async waitForStableFrame(options?: { timeoutMs?: number }): Promise<void> {
        return this.#graph.waitForStableFrame(options);
    }

    /**
     * Whether the picture on screen is the finished one.
     *
     * True only when the layout has converged, the camera has finished framing the graph, and a
     * frame has been drawn in that state. The `graph-frame-stable` event announces the moment it
     * becomes true.
     * @returns True when the last frame drawn is the last frame that will change.
     * @since 2.0.0
     */
    get isFrameStable(): boolean {
        return this.#graph.isFrameStable;
    }

    /**
     * Execute multiple operations as a batch.
     * @param fn - Function containing batch operations
     * @returns Promise that resolves when batch completes
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.batchOperations(async () => {
     *   await element.addNodes(nodes);
     *   await element.addEdges(edges);
     *   await element.setLayout('circular');
     * });
     * ```
     */
    async batchOperations(fn: () => Promise<void> | void): Promise<void> {
        return this.#graph.batchOperations(fn);
    }

    // ============================================================================
    // Phase 7a: High Priority Methods - Events
    // ============================================================================

    /**
     * Subscribe to graph events.
     * @param type - Event type to listen for
     * @param callback - Callback function
     * @since 1.5.0
     * @example
     * ```typescript
     * element.on('graph-settled', () => {
     *   console.log('Graph layout has settled');
     * });
     * ```
     */
    on(type: import("./events").EventType, callback: import("./events").EventCallbackType): void {
        this.#graph.on(type, callback);
    }

    /**
     * Subscribe to graph events (alias for on).
     * @param type - Event type to listen for
     * @param callback - Callback function
     * @since 1.5.0
     */
    addListener(type: import("./events").EventType, callback: import("./events").EventCallbackType): void {
        this.#graph.addListener(type, callback);
    }

    /**
     * Get the total number of registered event listeners.
     * @returns Number of registered listeners
     * @since 1.5.0
     * @example
     * ```typescript
     * console.log('Active listeners:', element.listenerCount());
     * ```
     */
    listenerCount(): number {
        return this.#graph.listenerCount();
    }

    // ============================================================================
    // Phase 7b: Medium Priority Methods - View
    // ============================================================================

    /**
     * Check if the graph is in 2D mode.
     * @returns True if in 2D mode, false otherwise
     * @since 1.5.0
     * @example
     * ```typescript
     * if (element.is2D()) {
     *   console.log('Graph is in 2D mode');
     * }
     * ```
     */
    is2D(): boolean {
        return this.getViewMode() === "2d";
    }

    // ============================================================================
    // Phase 7b: Medium Priority Methods - XR
    // ============================================================================

    /**
     * Set XR (VR/AR) configuration.
     * @param config - XR configuration
     * @since 1.5.0
     * @example
     * ```typescript
     * element.setXRConfig({
     *   enabled: true,
     *   ui: { enabled: true, position: 'bottom-right' }
     * });
     * ```
     */
    setXRConfig(config: PartialXRConfig): void {
        this.#graph.setXRConfig(config);
    }

    /**
     * Get the current XR configuration.
     * @returns The current XR configuration, or undefined if not set
     * @since 1.5.0
     */
    getXRConfig(): import("./config/XRConfig").XRConfig | undefined {
        return this.#graph.getXRConfig();
    }

    /**
     * Exit XR (VR/AR) mode.
     * @returns Promise that resolves when XR session ends
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.exitXR();
     * ```
     */
    async exitXR(): Promise<void> {
        return this.#graph.exitXR();
    }

    // ============================================================================
    // Phase 7b: Medium Priority Methods - Camera
    // ============================================================================

    /**
     * Work out where a named camera view would put the viewer, without moving anything.
     *
     * The name may be one the element ships, one a third party registered with
     * `registerCameraView`, or a snapshot saved with `saveCameraPreset`.
     * @param preset - The view's name, for example "fitToGraph" or "topView".
     * @param options - What to frame and how to configure the view.
     * @param options.nodes - The nodes to measure the box over. Absent frames the whole graph.
     * @param options.params - The view's own options, filled in from its declared defaults.
     * @returns The resolved camera state.
     * @since 1.5.0
     * @example
     * ```typescript
     * const state = element.resolveCameraPreset('topView');
     * await element.setCameraState(state, { animate: true });
     * ```
     */
    resolveCameraPreset(
        preset: string,
        options?: { nodes?: Iterable<string | number>; params?: Readonly<Record<string, unknown>> },
    ): import("./screenshot/types.js").CameraState {
        return this.#graph.resolveCameraPreset(preset, options);
    }

    /**
     * Put the viewer where a named camera view says they should stand.
     *
     * The route that frames a SUBSET: the element measures the box over whatever the scope covers
     * and hands the smaller box to the view, so a view frames a selection with no code of its own.
     * @param id - The view's name.
     * @param options - The scope to frame, the view's own options, and how to get there.
     * @param options.scope - What to frame. Absent frames the whole graph.
     * @param options.params - The view's own options, filled in from its declared defaults.
     * @returns A promise that resolves once the camera has arrived.
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.applyCameraView('isometric', { scope: 'selection', animate: true });
     * ```
     */
    async applyCameraView(
        id: string,
        options?: {
            scope?: Scope;
            params?: Readonly<Record<string, unknown>>;
        } & import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.#graph.applyCameraView(id, options);
    }

    // ============================================================================
    // Phase 7b: Medium Priority Methods - Input
    // ============================================================================

    /**
     * Enable or disable user input.
     * @param enabled - Whether input should be enabled
     * @since 1.5.0
     * @example
     * ```typescript
     * element.setInputEnabled(false); // Disable interaction
     * ```
     */
    setInputEnabled(enabled: boolean): void {
        this.#graph.setInputEnabled(enabled);
    }

    // ============================================================================
    // Phase 7b: Medium Priority Methods - Lifecycle
    // ============================================================================

    /**
     * Shut down the graph and release resources.
     * @since 1.5.0
     * @example
     * ```typescript
     * element.shutdown();
     * ```
     */
    shutdown(): void {
        this.#graph.shutdown();
    }

    /**
     * Check if the graph is running.
     * @returns True if the graph is running, false otherwise
     * @since 1.5.0
     * @example
     * ```typescript
     * if (element.isRunning()) {
     *   console.log('Graph is active');
     * }
     * ```
     */
    isRunning(): boolean {
        return this.#graph.isRunning();
    }

    /**
     * Play or pause the layout.
     *
     * `setRunning(true)` on a layout that has already settled restarts it, so "play" is
     * something the reader can see; `setRunning(false)` stops the per-frame stepping and nothing
     * else -- work already handed to an accelerator lands, the scene keeps rendering, and the
     * camera, picking and styling stay live. There is no event for this: `isRunning()` reports
     * the state and `graph-settled` reports the arrangement coming to rest.
     *
     * A pause is not a mode the element remembers: anything that (re)starts a layout -- loading
     * more nodes, an accelerator attaching, setting another layout, dropping a dragged node --
     * runs it again, so pause it after those, not before.
     * @param running - True to run the layout, false to pause it.
     * @since 2.0.0
     * @example
     * ```typescript
     * element.setRunning(false); // pause
     * element.setRunning(true); // play again, from where it stopped
     * ```
     */
    setRunning(running: boolean): void {
        this.#graph.setRunning(running);
    }

    // ============================================================================
    // Phase 7b: Medium Priority Methods - Coordinate Transform
    // ============================================================================

    /**
     * Convert world coordinates to screen coordinates.
     * @param worldPos - Position in world space
     * @param worldPos.x - X coordinate in world space
     * @param worldPos.y - Y coordinate in world space
     * @param worldPos.z - Z coordinate in world space
     * @returns Position in screen space
     * @since 1.5.0
     * @example
     * ```typescript
     * const node = element.getNode('node-1');
     * const screenPos = element.worldToScreen({
     *   x: node.mesh.position.x,
     *   y: node.mesh.position.y,
     *   z: node.mesh.position.z
     * });
     * // Position a tooltip at screenPos
     * ```
     */
    worldToScreen(worldPos: { x: number; y: number; z: number }): { x: number; y: number } {
        return this.#graph.worldToScreen(worldPos);
    }

    /**
     * Convert screen coordinates to world coordinates.
     * @param screenPos - Position in screen space
     * @param screenPos.x - X pixel coordinate
     * @param screenPos.y - Y pixel coordinate
     * @returns Position in world space, or null if not found
     * @since 1.5.0
     * @example
     * ```typescript
     * const worldPos = element.screenToWorld({ x: 100, y: 200 });
     * if (worldPos) {
     *   console.log('World position:', worldPos);
     * }
     * ```
     */
    screenToWorld(screenPos: { x: number; y: number }): { x: number; y: number; z: number } | null {
        return this.#graph.screenToWorld(screenPos);
    }

    // ============================================================================
    // Additional Data Methods
    // ============================================================================

    /**
     * Set graph data (both nodes and edges) at once.
     * @param data - Object containing nodes and edges arrays
     * @param data.nodes - Array of node data objects
     * @param data.edges - Array of edge data objects
     * @since 1.5.0
     * @example
     * ```typescript
     * element.setData({
     *   nodes: [{ id: 'a' }, { id: 'b' }],
     *   edges: [{ source: 'a', target: 'b' }]
     * });
     * ```
     */
    setData(data: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }): void {
        this.#graph.setData(data);
    }

    // ============================================================================
    // Manager Accessors
    // ============================================================================

    /**
     * Get the Styles object for direct style access.
     * @returns The Styles object
     * @since 1.5.0
     * @example
     * ```typescript
     * const styles = element.getStyles();
     * console.log('Background color:', styles.config.graph.background.color);
     * ```
     */
    getStyles(): import("./Styles").Styles {
        return this.#graph.getStyles();
    }

    /**
     * Get the DataManager for advanced data operations.
     * @returns The DataManager instance
     * @since 1.5.0
     */
    getDataManager(): import("./managers/DataManager").DataManager {
        return this.#graph.getDataManager();
    }

    /**
     * Get the LayoutManager for advanced layout operations.
     * @returns The LayoutManager instance
     * @since 1.5.0
     */
    getLayoutManager(): import("./managers/LayoutManager").LayoutManager {
        return this.#graph.getLayoutManager();
    }

    /**
     * Get the UpdateManager for update scheduling.
     * @returns The UpdateManager instance
     * @since 1.5.0
     */
    getUpdateManager(): import("./managers/UpdateManager").UpdateManager {
        return this.#graph.getUpdateManager();
    }

    /**
     * Get the StatsManager for performance statistics.
     * @returns The StatsManager instance
     * @since 1.5.0
     * @example
     * ```typescript
     * const stats = element.getStatsManager();
     * console.log('FPS:', stats.getSnapshot().fps);
     * ```
     */
    getStatsManager(): import("./managers/StatsManager").StatsManager {
        return this.#graph.getStatsManager();
    }

    /**
     * Get the SelectionManager for selection operations.
     * @returns The SelectionManager instance
     * @since 1.5.0
     */
    getSelectionManager(): import("./managers/SelectionManager").SelectionManager {
        return this.#graph.getSelectionManager();
    }

    /**
     * Get the EventManager for event operations.
     * @returns The EventManager instance
     * @since 1.5.0
     */
    getEventManager(): import("./managers/EventManager").EventManager {
        return this.#graph.getEventManager();
    }

    /**
     * Get the Babylon.js Scene for advanced rendering operations.
     * @returns The Babylon.js Scene
     * @since 1.5.0
     */
    getScene(): import("@babylonjs/core").Scene {
        return this.#graph.getScene();
    }

    /**
     * Get the MeshCache for mesh management.
     * @returns The MeshCache instance
     * @since 1.5.0
     */
    getMeshCache(): import("./meshes/MeshCache").MeshCache {
        return this.#graph.getMeshCache();
    }

    // ============================================================================
    // Camera and Rendering
    // ============================================================================

    /**
     * Set the camera mode.
     * @param mode - Camera mode key
     * @param options - Queue options
     * @returns Promise that resolves when camera mode is set
     * @since 1.5.0
     */
    async setCameraMode(
        mode: import("./cameras/CameraManager").CameraKey,
        options?: import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        return this.#graph.setCameraMode(mode, options);
    }

    /**
     * Get the current camera controller.
     * @returns The camera controller, or null if not available
     * @since 1.5.0
     */
    getCameraController(): import("./cameras/CameraManager").CameraController | null {
        return this.#graph.getCameraController();
    }

    /**
     * Set render settings for advanced rendering control.
     * @param settings - Render settings object
     * @param options - Queue options
     * @returns Promise that resolves when settings are applied
     * @since 1.5.0
     */
    async setRenderSettings(
        settings: Record<string, unknown>,
        options?: import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        return this.#graph.setRenderSettings(settings, options);
    }

    /**
     * Get a node's mesh by its ID.
     * @param nodeId - The ID of the node
     * @returns The node's mesh, or null if not found
     * @since 1.5.0
     * @example
     * ```typescript
     * const mesh = element.getNodeMesh('node-1');
     * if (mesh) {
     *   console.log('Node position:', mesh.position);
     * }
     * ```
     */
    getNodeMesh(nodeId: string): import("@babylonjs/core").AbstractMesh | null {
        return this.#graph.getNodeMesh(nodeId);
    }

    /**
     * Get the XR session manager.
     * @returns The XR session manager, or undefined if not initialized
     * @since 1.5.0
     */
    getXRSessionManager(): import("./xr/XRSessionManager").XRSessionManager | undefined {
        return this.#graph.getXRSessionManager();
    }

    // ============================================================================
    // AI Control Methods
    // ============================================================================

    /**
     * Enable AI control for the graph.
     * @param config - AI manager configuration
     * @returns Promise that resolves when AI is enabled
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.enableAiControl({
     *   provider: { type: 'openai', apiKey: 'your-api-key' }
     * });
     * ```
     */
    async enableAiControl(config: import("./ai/AiManager").AiManagerConfig): Promise<void> {
        return this.#graph.enableAiControl(config);
    }

    /**
     * Disable AI control for the graph.
     * @since 1.5.0
     */
    disableAiControl(): void {
        this.#graph.disableAiControl();
    }

    /**
     * Send a command to the AI assistant.
     * @param message - The command message
     * @returns Promise with the execution result
     * @since 1.5.0
     * @example
     * ```typescript
     * const result = await element.aiCommand('Show me the most connected nodes');
     * console.log('AI response:', result.message);
     * ```
     */
    async aiCommand(message: string): Promise<import("./ai/AiController").ExecutionResult> {
        return this.#graph.aiCommand(message);
    }

    /**
     * Get the current AI status.
     * @returns The AI status, or null if AI is not enabled
     * @since 1.5.0
     */
    getAiStatus(): import("./ai/AiStatus").AiStatus | null {
        return this.#graph.getAiStatus();
    }

    /**
     * Subscribe to AI status changes.
     * @param callback - Callback function for status changes
     * @returns Unsubscribe function
     * @since 1.5.0
     * @example
     * ```typescript
     * const unsubscribe = element.onAiStatusChange((status) => {
     *   console.log('AI state:', status.state);
     * });
     * // Later: unsubscribe();
     * ```
     */
    onAiStatusChange(callback: import("./ai/AiStatus").StatusChangeCallback): () => void {
        return this.#graph.onAiStatusChange(callback);
    }

    /**
     * Cancel the current AI command.
     * @since 1.5.0
     */
    cancelAiCommand(): void {
        this.#graph.cancelAiCommand();
    }

    /**
     * Get the AI manager.
     * @returns The AI manager, or null if not enabled
     * @since 1.5.0
     */
    getAiManager(): import("./ai/AiManager").AiManager | null {
        return this.#graph.getAiManager();
    }

    /**
     * Check if AI control is enabled.
     * @returns True if AI is enabled
     * @since 1.5.0
     */
    isAiEnabled(): boolean {
        return this.#graph.isAiEnabled();
    }

    /**
     * Retry the last AI command that failed.
     * @returns Promise with the execution result
     * @since 1.5.0
     */
    async retryLastAiCommand(): Promise<import("./ai/AiController").ExecutionResult> {
        return this.#graph.retryLastAiCommand();
    }

    /**
     * Get the API key manager.
     * @returns The API key manager, or null if not created
     * @since 1.5.0
     */
    getApiKeyManager(): import("./ai/keys/ApiKeyManager").ApiKeyManager | null {
        return this.#graph.getApiKeyManager();
    }

    /**
     * Create an API key manager for persistent key storage.
     * This is a static method - the manager is not tied to any specific graph instance.
     * @returns The created API key manager
     * @since 1.5.0
     * @example
     * ```typescript
     * const keyManager = await Graphty.createApiKeyManager();
     * await keyManager.setKey('openai', 'your-api-key');
     * ```
     */
    static createApiKeyManager(): Promise<import("./ai/keys/ApiKeyManager").ApiKeyManager> {
        return Graph.createApiKeyManager();
    }

    /**
     * Get the voice input adapter.
     * @returns The voice input adapter
     * @since 1.5.0
     */
    getVoiceAdapter(): import("./ai/input/VoiceInputAdapter").VoiceInputAdapter {
        return this.#graph.getVoiceAdapter();
    }

    /**
     * Start voice input for AI commands.
     * @param options - Voice input options
     * @param options.continuous - Whether to continue listening after results
     * @param options.interimResults - Whether to report interim (non-final) results
     * @param options.language - Language code (e.g., "en-US")
     * @param options.onTranscript - Callback for transcript results
     * @param options.onStart - Callback when voice input starts
     * @returns True if voice input started successfully
     * @since 1.5.0
     * @example
     * ```typescript
     * const started = element.startVoiceInput({
     *   onTranscript: (text, isFinal) => {
     *     if (isFinal) element.aiCommand(text);
     *   },
     *   onStart: (started) => console.log('Voice started:', started)
     * });
     * ```
     */
    startVoiceInput(options?: {
        continuous?: boolean;
        interimResults?: boolean;
        language?: string;
        onTranscript?: (text: string, isFinal: boolean) => void;
        onStart?: (started: boolean, error?: string) => void;
    }): boolean {
        return this.#graph.startVoiceInput(options);
    }

    /**
     * Stop voice input.
     * @since 1.5.0
     */
    stopVoiceInput(): void {
        this.#graph.stopVoiceInput();
    }

    /**
     * Check if voice input is active.
     * @returns True if voice input is active
     * @since 1.5.0
     */
    isVoiceActive(): boolean {
        return this.#graph.isVoiceActive();
    }

    /**
     * Whether this graph may use hardware acceleration.
     *
     * `"auto"` uses an accelerator when one can be attached and runs on the CPU when one
     * cannot; `"off"` never looks; `"required"` turns absence into a thrown `E_NO_ACCELERATOR`
     * rather than a quiet CPU result. Acceleration itself is one import away:
     * `import "@graphty/graphty-element/webgpu"`, and nothing else.
     * @remarks
     * This is a session setting and the element never persists it. Remembering that a reader
     * switched acceleration off, and restoring the choice on their next visit, is the host
     * application's storage: an element that wrote to a host page's storage uninvited would be
     * a surprise the host cannot anticipate, and a restored preference would fight the
     * attribute the host page wrote in its own markup.
     * @returns What the consumer asked for. `"auto"` unless it was set.
     * @since 2.0.0
     * @example HTML attribute
     * ```html
     * <graphty-element acceleration="required"></graphty-element>
     * ```
     */
    @property({ attribute: "acceleration", reflect: true })
    get acceleration(): AccelerationPolicy {
        return this.#graph.acceleration.policy;
    }
    /**
     * Sets the acceleration policy and applies it immediately.
     *
     * An unrecognised value is reported and then ignored, leaving the previous policy in
     * force. It is not thrown. Lit drives this setter from `attributeChangedCallback`, so a
     * throw here would abort attribute processing and leave the element unrendered -- a typo
     * in markup would take the whole graph down. HTML has never behaved that way about an
     * attribute value, and an embedded component must not be the first thing that does.
     *
     * The report is deliberately loud, because the quiet failure is the dangerous one: a page
     * that meant `required` and wrote `requried` would otherwise run on the CPU and look
     * healthy.
     */
    set acceleration(value: AccelerationPolicy) {
        const oldValue = this.#graph.acceleration.policy;

        if (!isAccelerationPolicy(value)) {
            console.error(
                `<graphty-element>: acceleration must be "auto", "off" or "required", not ` +
                    `"${String(value)}". Keeping "${oldValue}". ` +
                    "See https://graphty.app/docs/graphty-element/guide/acceleration",
            );
            return;
        }

        // Written through the session, and read back off the one controller behind both, so the
        // attribute, `session.acceleration` and the hardware cannot disagree about the policy.
        this.#graph.getSession().acceleration = value;
        this.requestUpdate("acceleration", oldValue);
    }

    /**
     * The node count at or above which accelerated work uses the accelerator.
     *
     * Below it the element takes the CPU path even with an accelerator attached, and
     * `capabilities.acceleration.state` reads `"idle"`. Default 0: use the accelerator whenever
     * there is one. Raise it when the graphs you show are small enough that uploading costs more
     * than computing; the number is machine-specific, which is why the element does not guess.
     * @since 2.0.0
     * @example
     * ```html
     * <graphty-element acceleration-min-nodes="5000"></graphty-element>
     * ```
     * @returns The threshold in force.
     */
    @property({ attribute: "acceleration-min-nodes", type: Number, reflect: true })
    get accelerationMinNodes(): number {
        return this.#graph.acceleration.minNodes;
    }
    /**
     * Sets the threshold and applies it immediately.
     *
     * A value that is not a whole number of 0 or more is reported and then ignored, leaving the
     * previous threshold in force, for the reason the `acceleration` setter states: Lit drives
     * this from `attributeChangedCallback`, and a throw there would leave the element unrendered.
     * @param value - The node count at or above which accelerated work uses the accelerator.
     */
    set accelerationMinNodes(value: number) {
        const oldValue = this.#graph.acceleration.minNodes;

        try {
            this.#graph.acceleration.setMinNodes(value);
        } catch (error: unknown) {
            // NaN is the one case the markup reads better than the value: Lit's `type: Number`
            // converter runs before this setter, so `acceleration-min-nodes="many"` arrives here
            // as NaN and an author told `not "NaN"` would have to work out which of their
            // attributes that was. Every other bad value names itself, including a property write
            // that never went near the attribute.
            const written = Number.isNaN(value)
                ? (this.getAttribute("acceleration-min-nodes") ?? "NaN")
                : String(value);

            console.error(
                `<graphty-element>: acceleration-min-nodes must be a whole number of 0 or more, ` +
                    `not "${written}". Keeping ${String(oldValue)}. ` +
                    "See https://graphty.app/docs/graphty-element/guide/acceleration",
                error,
            );
            return;
        }

        this.requestUpdate("accelerationMinNodes", oldValue);
    }

    /**
     * The acceleration controller, which is the Graph's -- the element does not build one.
     *
     * Every transition it publishes is mirrored as a `graphty-capabilities-change` DOM event,
     * so a page with a tag and six lines of script can show whether the GPU is in use, say why
     * it is not, and update itself when a device is lost -- without importing a module or
     * naming a single GPU type. The mirror carries the controller's own capability document, the
     * same object `element.session.capabilities` returns, so the two channels cannot disagree.
     * @returns The controller.
     */
    #ensureAcceleration(): AccelerationController {
        const controller = this.#graph.acceleration;

        if (!this.#capabilitiesMirrored) {
            controller.onChange(() => {
                this.dispatchEvent(
                    new CustomEvent("graphty-capabilities-change", {
                        detail: { capabilities: controller.capabilities },
                        bubbles: true,
                        composed: true,
                    }),
                );
            });
            this.#capabilitiesMirrored = true;
        }

        return controller;
    }
}

// Type alias for easier importing
export type GraphtyElement = Graphty;

/*
 * The tag, declared to TypeScript.
 *
 * `document.createElement("graphty-element")` and `document.querySelector("graphty-element")` are
 * how a page reaches a custom element, and without this block TypeScript answers both with a bare
 * `HTMLElement` -- so a consumer who wants `nodeData`, `layout` or `session` has to cast, and the
 * cast is the thing that goes stale when a property is renamed. The package's own extension
 * contract says a third party must be able to write against it "without casting or re-declaring a
 * type the element already has", and this is the declaration that makes the ordinary two lines of
 * DOM code obey it.
 *
 * It lives beside the `@customElement` call on purpose: the tag name is written twice in this
 * file and nowhere else, so the two cannot drift apart unnoticed.
 */
declare global {
    interface HTMLElementTagNameMap {
        "graphty-element": Graphty;
    }
}
