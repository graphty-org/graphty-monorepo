import type { DuplicatePolicy } from "@graphty/graph-format";
import { registry as sourceRegistry, SOURCE_FORMAT_PREFIX } from "@graphty/graph-io";
import { css, LitElement, type PropertyValues, ReactiveElement } from "lit";
import { property } from "lit/decorators.js";

import {
    type AccelerationController,
    type AccelerationPolicy,
    type Capabilities,
    isAccelerationPolicy,
} from "./acceleration";
import { type AutosaveAtRisk, ElementAutosave, resolveAutosaveKey } from "./autosave/elementAutosave";
import { type PageSource, sourceSlot } from "./autosave/recovery";
import type {
    AutosaveApi,
    AutosaveAvailable,
    AutosaveOptions,
    AutosaveRestored,
    AutosaveStatus,
} from "./autosave/types";
import type { ViewInsets } from "./camera/types";
import { layoutDescriptor, layoutIdForEngine } from "./catalog/layouts";
import type { AlgorithmKey, ElementAtResult, FormatId, Scope, ScopeInput } from "./catalog/types";
import type {
    FitInsets,
    GraphBackgroundConfig,
    GraphBehaviorConfig,
    GraphSelectionStyleInput,
    ViewMode,
} from "./config";
import type { BasemapStatus, MapFrameFact } from "./config/Basemap";
import { type AlgorithmOnLoad, parseAlgorithmsOnLoad, REPEATED_EDGE_POLICIES } from "./config/DataConfig";
import { DEFAULT_LIGHTING, type Lighting } from "./config/Lighting";
import type { PartialXRConfig } from "./config/xr-config-schema";
import { CredentialStore } from "./credentials/CredentialStore";
import { DataSource } from "./data/DataSource";
import type { ExportGraphOptions, ExportResult } from "./data/export";
import { ensureGraphSamplesSource } from "./data/graphSamplesSource";
import { isGraphtyError } from "./errors/GraphtyError";
import {
    type GraphtyForwardedEventMap,
    isDomForwardableEvent,
    NODE_EVENT_DOM_NAMES,
    type NodeEventDetail,
    nodeEventDetail,
} from "./events";
import type { EnabledFeatures } from "./features/resolve";
import { featuresFrom, Graph, loadSourcePair, type NodeScreenPosition, operationQueueOf, waitFirstFor } from "./Graph";
import type { EdgeLabelCounts, NodeLabel, NodeLabelCounts } from "./managers/LabelDeclutter";
import type { PixelRatio, RendererRequest, RendererStatus } from "./managers/RenderManager";
import type { NodeThumbnailOptions } from "./meshes/NodeThumbnail";
import type { ScreenshotOptions, ScreenshotResult } from "./screenshot/types.js";
import type { GraphSession } from "./session";
import {
    describeSource,
    type ImportSource,
    replaceEdgesCommand,
    replaceNodesCommand,
    SOURCE_VALUE,
} from "./session/commands/data";
import type { BatchCommand } from "./session/commands/index";
import { DEFAULT_LAYOUT, type LayoutSetCommand } from "./session/commands/layout";
import { recordsInRowOrder } from "./session/data";
import { dispatcherOf, DISPOSED_STATUS } from "./session/GraphSession";
import { loadLineOf } from "./session/loadLine";
import type { NoteChange } from "./session/notes/types";
import type { GraphSlice } from "./session/project/state";
import {
    PROJECT_FILE,
    projectFileName,
    type ProjectSaveOptions,
    type ProjectSaveReport,
    type ProjectStatus,
} from "./session/projectFile";
import type { Run, RunChange, StartOptions } from "./session/runs";
import type { SelectionDelta, SelectionOp, SelectionTarget } from "./session/selection";
import type { ProgressChange } from "./session/shared";
import { attachCredentials } from "./session/sources/credentialLookup";
import { SOURCE_EVENT_DOM_NAMES } from "./session/sources/ids";
import type { SourceExpanded, SourceExpandFailed, SourceExpandStart, SourceLoadOptions } from "./session/sources/types";
import type { DefaultPalettes } from "./session/styles";
import type { FileStyleOptions } from "./session/styles/fileStyles/translate";
import type { ModelChange, ProjectConfigPatch, SessionEventMap, TransactionScope } from "./session/types";
import type { VisibilityChange } from "./session/visibility";
import { downloadBlob } from "./utils/download";

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

/** The queued coalesce key of the `dataSource` / `dataSourceConfig` pair: one tick, one load. */
const ELEMENT_SOURCE = "element-source";

/**
 * The queued coalesce key of the `layout` / `layoutConfig` pair: two assignments in one tick are
 * one `layout.set`, one build and one step.
 */
const ELEMENT_LAYOUT = "element-layout";

/**
 * The properties that take an object or an array, and so cannot survive being written as an
 * attribute. React 19 writes a prop as an attribute when the element is not yet defined at commit
 * time, which turns `nodeData={[...]}` into `nodedata="[object Object]"`.
 */
const RICH_PROPERTIES = [
    "nodeData",
    "edgeData",
    "dataSourceConfig",
    "layoutConfig",
    "layoutScope",
    "layoutBehavior",
    "selectionStyle",
    "algorithmsOnLoad",
    "background",
    "xr",
] as const;

/**
 * A file name for an export in a format other than a project file: the project's name, or
 * "project" when it has none, and the format's extension.
 * @param name - the project's name.
 * @param extension - the format's first extension, such as ".graphml".
 * @returns the file name.
 */
function formatFileName(name: string | null | undefined, extension: string | undefined): string {
    return `${name?.trim() ? name : "project"}${extension ?? ""}`;
}

/**
 * Graphty creates a graph
 */
export class Graphty extends LitElement {
    /**
     * The host is a block that fills its parent's width. Its height is the parent's when the
     * parent has a definite height, the element's own when the page sets one, and otherwise half
     * its width: `aspect-ratio` only applies while the used height is `auto`, so a bare tag keeps
     * the 2:1 canvas it always had. Every rule here can be overridden from the page.
     */
    static styles = css`
        :host {
            display: block;
            position: relative;
            width: 100%;
            height: 100%;
            aspect-ratio: 2 / 1;
        }

        /* The browser's own focus ring, drawn just inside the canvas: outside it, the ring is cut
           off whenever the page clips the box the element fills. */
        canvas:focus-visible {
            outline-offset: -2px;
        }

        /* The ring is for keyboard focus. A press focuses the canvas from script (its pointerdown
           default is prevented), and Chrome then draws the ring whenever a key was the last input
           anywhere on the page; see the constructor. */
        [data-pointer-focus] canvas:focus-visible {
            outline: none;
        }
    `;

    /**
     * Focusing the host focuses the canvas inside it, so a page can hand keyboard focus to the
     * drawing with `element.focus()`, and a dialog opened from the drawing returns focus to it.
     */
    static override readonly shadowRootOptions: ShadowRootInit = {
        ...LitElement.shadowRootOptions,
        delegatesFocus: true,
    };

    /**
     * The host's standard `aria-label` is also watched, so it names the canvas that takes keyboard
     * focus: the drawing is announced by the page's own words rather than as an unnamed canvas.
     * @returns The attributes this element observes.
     */
    static override get observedAttributes(): string[] {
        return [...super.observedAttributes, "aria-label"];
    }

    #builtGraph: Graph | undefined;
    readonly #element: Element;
    #resizeObserver: ResizeObserver | null = null;
    #capabilitiesMirrored = false;
    #unwatchRuns: (() => void) | null = null;
    #unwatchSelection: (() => void) | null = null;
    #unwatchVisibility: (() => void) | null = null;
    #unwatchHistory: (() => void) | null = null;
    #unwatchProjectStatus: (() => void) | null = null;
    /** Unsubscribes the three network-source expansion mirrors. */
    #unwatchSource: (() => void) | null = null;
    #unwatchNotes: (() => void) | null = null;
    #unwatchModels: (() => void) | null = null;
    #unwatchProgress: (() => void) | null = null;
    readonly #progressAt = new Map<string, number>();
    readonly #runProgressAt = new Map<string, number>();
    #reportedStrayAttributes = false;

    /**
     * Creates a new Graphty element instance.
     */
    constructor() {
        super();

        this.#element = document.createElement("div");
        // The container fills the host exactly. It is absolutely positioned so its size comes from
        // the host's box, never from the canvas's intrinsic 2:1 ratio; being positioned also
        // anchors the absolutely positioned XR UI overlay.
        this.#element.setAttribute("style", "position: absolute; inset: 0; display: block;");
        // A press on the drawing hides the keyboard focus ring until a key is pressed in it or
        // focus leaves it. On the container, so a replaced canvas is covered too.
        const pointerFocus = (on: boolean) => (): void => {
            this.#element.toggleAttribute("data-pointer-focus", on);
        };
        this.#element.addEventListener("pointerdown", pointerFocus(true), { capture: true });
        this.#element.addEventListener("keydown", pointerFocus(false), { capture: true });
        this.#element.addEventListener("focusout", pointerFocus(false));
    }

    /**
     * The graph this element draws, built the first time anything needs it: being attached, or a
     * property, attribute, method or `session` reached before that. Building it opens a Babylon
     * engine and so a WebGL context, and a browser keeps only about 16 of those per page, evicting
     * the oldest live one -- so an element that is created and never used opens none.
     * @returns The graph.
     */
    get #graph(): Graph {
        if (this.#builtGraph === undefined) {
            const graph = new Graph(this.#element);
            this.#builtGraph = graph;
            waitFirstFor(graph, () => this.#pageLoadsQueued());
            featuresFrom(graph, () => this.#featuresValue);
            // The graph is never rebuilt, so this subscription lives as long as the element.
            graph.onNodeLabelCounts.add((counts) => {
                this.dispatchEvent(
                    new CustomEvent("graphty-label-change", { detail: counts, bubbles: true, composed: true }),
                );
            });
        }

        return this.#builtGraph;
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

    /** Backing field of {@link credentials}; made on first use. */
    #credentials: CredentialStore | null = null;

    /**
     * The credentials this element remembers for the reader: AI provider keys (`credentials.ai`)
     * and network-source credentials, keyed by source and origin. A source load, a waiting load of
     * an opened project and a probe that are given no credential look here, by the origin about to
     * be contacted. Remembered only in memory unless the AI key manager's persistence is on.
     * Experimental.
     * @returns The store.
     * @example
     * ```ts
     * import { credentials } from "@graphty/graphty-element";
     * await element.credentials.remember({ source: "neo4j", endpoint }, credentials.basic("neo4j", password));
     * await element.session.data.import({ source: "neo4j", config: { query } }, { endpoint });
     * ```
     */
    get credentials(): CredentialStore {
        this.#credentials ??= new CredentialStore(Graph.createApiKeyManager());
        return this.#credentials;
    }

    /**
     * Load a graph from a network source (`sourceDescriptors()` in `./catalog` lists them), as one
     * undoable step: the source is read with the credential, which is never recorded, and the rows
     * are handed to the graph. The same as `session.data.import({ source, config: params }, options)`.
     * Experimental.
     * @param source - The source id.
     * @param params - The source's params.
     * @param options - The endpoint, the credential, caps, `mode` and the other load choices.
     * @returns The load's key in `session.data.loads()`.
     * @example
     * ```ts
     * await element.loadFromSource("ndex", { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" });
     * ```
     */
    async loadFromSource(
        source: string,
        params: Readonly<Record<string, unknown>>,
        options: SourceLoadOptions = {},
    ): Promise<{ key: string }> {
        const { data } = this.session;
        await data.import({ source, config: params }, options);
        return { key: data.loads().at(-1)?.key ?? "" };
    }

    /**
     * The network source a `data-source` value names, or null for a data source: `source:<id>`
     * always names a source; a bare name is a source only when no data source has it.
     * @param type - The `data-source` value.
     * @returns The source id, or null.
     */
    static #sourceIdOf(type: string): string | null {
        if (type.startsWith(SOURCE_FORMAT_PREFIX)) {
            return type.slice(SOURCE_FORMAT_PREFIX.length);
        }

        ensureGraphSamplesSource();
        return !DataSource.getRegisteredTypes().includes(type) && sourceRegistry.hasSource(type) ? type : null;
    }

    /**
     * Save the project (`session.project.save`) and hand it to the reader as a download named
     * `<project name>.graphty.json`. Lives on the element, not the session, because the session
     * also runs in Node, where there is nothing to download to.
     * @param options - What to leave out, your own extensions, and the file's name.
     * @returns What the file holds.
     * @example
     * ```typescript
     * saveButton.onclick = () => element.downloadProject();
     * ```
     */
    async downloadProject(
        options: Omit<ProjectSaveOptions, "markSaved"> & { readonly fileName?: string } = {},
    ): Promise<ProjectSaveReport> {
        // The download is the write, and the caller never sees a SavedProject to mark, so this
        // save always clears `dirty`.
        const { text, report } = await this.session.project.save({ ...options, markSaved: true });
        downloadBlob(
            new Blob([text], { type: PROJECT_FILE.mediaType }),
            options.fileName ?? projectFileName(this.session.project.name),
        );
        return report;
    }

    /**
     * Write the graph in a file format (`exportGraph`) and hand it to the reader as a download
     * named `<project name><the format's first extension>`, such as `Pioneers.graphml`; an unnamed
     * project downloads as `project.graphml`. `"graphty"` downloads the project file
     * (`<project name>.graphty.json`) without marking the project saved: it is a copy, and
     * `project.dirty` is left as it was. To save, use `downloadProject`. The file is assembled from
     * the export's UTF-8 chunks, never as one string.
     * @param format - The format id, as `session.catalog.formats()` lists it.
     * @param options - The writer's options, as `exportGraph` takes them, and the file's name.
     * @returns The export, whose `lossNotes` list everything the format could not hold.
     * @throws A `GraphtyError` (as a rejection), as `exportGraph` rejects.
     * @since 3.0.0
     * @example
     * ```typescript
     * const { lossNotes } = await element.downloadGraph("graphml");
     * for (const note of lossNotes) console.warn(note.message);
     * ```
     */
    async downloadGraph(
        format: FormatId,
        options: ExportGraphOptions & { readonly fileName?: string } = {},
    ): Promise<ExportResult> {
        const { fileName, ...exportOptions } = options;
        const result = await this.exportGraph(format, exportOptions);
        const chunks: BlobPart[] = [];
        for await (const chunk of result.bytes) {
            chunks.push(chunk.slice());
        }
        const { name } = this.session.project;
        const descriptor = this.session.catalog.formats().find((entry) => entry.id === format);
        downloadBlob(
            new Blob(chunks, { type: descriptor?.mimeTypes[0] ?? "application/octet-stream" }),
            fileName ??
                (format === "graphty" ? projectFileName(name) : formatFileName(name, descriptor?.extensions[0])),
        );
        return result;
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
    select(target: SelectionTarget, op?: SelectionOp): Promise<SelectionDelta> {
        return this.#graph.select(target, op);
    }

    /**
     * Choose the palette a colour binding uses when it names none, one per palette kind.
     *
     * Forwarded from `session.styles.setDefaultPalettes`. A default is resolved when a style
     * layer is written, so a saved document always names a concrete palette: call it before
     * loading data or adding layers. A later call warns and names the layers that keep the
     * previous default, or with `reapply: true` repaints them with the new one.
     * @param palettes - A palette id per kind: `categorical`, `sequential` and `diverging`.
     * @param options - How a late call treats the layers already written.
     * @param options.reapply - True re-resolves the layers that took the previous default.
     * @since 2.7.0
     * @example
     * ```ts
     * import { definePalette } from "@graphty/graphty-element/extend";
     *
     * definePalette({ id: "acme-brand", kind: "categorical", colors: ["#0B1D51", "#1B7F79"] });
     * element.setDefaultPalettes({ categorical: "acme-brand" });
     * ```
     */
    setDefaultPalettes(palettes: DefaultPalettes, options?: { readonly reapply?: boolean }): void {
        this.session.styles.setDefaultPalettes(palettes, options);
    }

    /**
     * Mirror the session's click-to-expand events onto the DOM under their `graphty-source-*` names.
     * @param session - The session to watch.
     * @param session.on - Its event subscription.
     * @returns Unsubscribes all three.
     */
    #mirrorSourceEvents(session: { on: GraphSession["on"] }): () => void {
        const events = Object.keys(SOURCE_EVENT_DOM_NAMES) as (keyof typeof SOURCE_EVENT_DOM_NAMES)[];
        const offs = events.map((event) =>
            session.on(event, (detail) => {
                this.dispatchEvent(
                    new CustomEvent(SOURCE_EVENT_DOM_NAMES[event], { detail, bubbles: true, composed: true }),
                );
            }),
        );
        return () => {
            for (const off of offs) {
                off();
            }
        };
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
                detail: { run: change.run, phase: change.phase } satisfies GraphtyRunChangeDetail,
                bubbles: true,
                composed: true,
            }),
        );
    }

    /**
     * Mirror one progress report onto the DOM as `graphty-progress-change`.
     *
     * Steps are coalesced per task, at the run mirror's interval, so a fast load does not flood
     * the page; the end of a task always arrives.
     * @param change - What moved on, or stopped.
     */
    #mirrorProgressChange(change: ProgressChange): void {
        const key = `${change.task}:${change.run ?? ""}`;
        if (change.phase === "end") {
            this.#progressAt.delete(key);
        } else {
            // The first change of a task is never held back (nothing was sent before it); only
            // the steps after it are.
            const now = Date.now();
            if (now - (this.#progressAt.get(key) ?? 0) < RUN_PROGRESS_INTERVAL_MS) {
                return;
            }

            this.#progressAt.set(key, now);
        }

        this.dispatchEvent(
            new CustomEvent("graphty-progress-change", { detail: change, bubbles: true, composed: true }),
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
     * Mirror one history change onto the DOM, so an Undo button beside the tag can follow it.
     *
     * The detail is the cursor and what the next undo and redo would do, all plain values; a
     * history panel reads `session.history` for the steps themselves.
     * @param reason - Why the history changed.
     */
    #mirrorHistoryChange(reason: SessionEventMap["history:changed"]["reason"]): void {
        const session = this.#graph.getSession();
        const { history } = session;
        this.dispatchEvent(
            new CustomEvent("graphty-history-change", {
                detail: {
                    reason,
                    version: history.version,
                    position: history.position,
                    // The count alone: the step list is rebuilt after every change.
                    steps: dispatcherOf(session).history.length,
                    canUndo: session.canUndo,
                    canRedo: session.canRedo,
                } satisfies GraphtyHistoryChangeDetail,
                bubbles: true,
                composed: true,
            }),
        );
    }

    /**
     * Reports rich props that reached the element as "[object Object]" attributes.
     *
     * React 19 sets a custom-element prop as a property only when the element is already defined;
     * otherwise it writes `String(value)` as an attribute and never retries. When this module is
     * loaded lazily, `nodeData={[...]}` arrives as `nodedata="[object Object]"` and the graph comes
     * up empty. The value is gone, so the element cannot recover it, but it can say why.
     */
    #reportStrayObjectAttributes(): void {
        if (this.#reportedStrayAttributes) {
            return;
        }

        this.#reportedStrayAttributes = true;
        for (const name of RICH_PROPERTIES) {
            // HTML attribute names are case-insensitive, so this also finds `nodedata`.
            if (this.getAttribute(name) === "[object Object]") {
                console.error(
                    `<graphty-element> received ${name} as the attribute ${name.toLowerCase()}="[object Object]", ` +
                        "so the value was lost. This happens when a framework renders the tag before " +
                        "@graphty/graphty-element is loaded. Import the element before rendering, or await " +
                        'customElements.whenDefined("graphty-element"). See ' +
                        "https://graphty.app/docs/graphty-element/guide/frameworks/react#load-the-element-before-react-renders-it",
                );
            }
        }
    }

    /**
     * Copies the host's `aria-label` onto the canvas; every other attribute goes to Lit.
     * @param name - The attribute's name
     * @param old - Its previous value
     * @param value - Its new value, or null when removed
     */
    override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
        if (name === "aria-label") {
            if (value === null) {
                this.#graph.canvas.removeAttribute(name);
            } else {
                this.#graph.canvas.setAttribute(name, value);
            }

            return;
        }

        super.attributeChangedCallback(name, old, value);
    }

    /**
     * Called when the element is added to the DOM. Sets up the graph container and resize observer.
     */
    connectedCallback(): void {
        super.connectedCallback();
        this.renderRoot.appendChild(this.#element);
        this.#reportStrayObjectAttributes();

        // Autosave reads its key and options in the task after connecting, so a script that sets
        // them right after appending the tag is in time; data inputs wait for its restore.
        if (this.#autosaveOn()) {
            this.#autosaveControl.connect();
        }

        if (this.#autosaveTimer === undefined) {
            this.#autosaveTimer = setTimeout(() => {
                void this.#startAutosave();
            }, 0);
        }

        // Watch for container size changes and resize the canvas accordingly
        this.#resizeObserver = new ResizeObserver(() => {
            this.#graph.resize();
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
        // A note written from a panel, a console or an undo: plain values, as the other mirrors.
        this.#unwatchNotes ??= session.on("note:changed", ({ id, change, fields, cause }) => {
            this.dispatchEvent(
                new CustomEvent("graphty-note-change", {
                    detail: { id, change, fields, cause } satisfies GraphtyNoteChangeDetail,
                    bubbles: true,
                    composed: true,
                }),
            );
        });
        // A model a layer names moved on: requested, checked, drawn, refused or failed.
        this.#unwatchModels ??= session.on("model:changed", (change) => {
            this.dispatchEvent(
                new CustomEvent("graphty-model-change", {
                    detail: change satisfies GraphtyModelChangeDetail,
                    bubbles: true,
                    composed: true,
                }),
            );
        });
        this.#unwatchProgress ??= session.on("progress:changed", (change) => {
            this.#mirrorProgressChange(change);
        });
        // The project's name and unsaved state, for a title bar or a Save button beside the tag.
        this.#unwatchProjectStatus ??= session.on("project:status", (change) => {
            this.dispatchEvent(
                new CustomEvent("graphty-project-status", { detail: change, bubbles: true, composed: true }),
            );
        });
        // Click-to-expand from a network source (experimental): plain codes and values, as the other mirrors.
        this.#unwatchSource ??= this.#mirrorSourceEvents(session);
        // A source load given no credential asks this element's store, by source and origin.
        attachCredentials(session.data, (source, origin) => this.credentials.lookup(source, origin));
        this.#unwatchHistory ??= session.on("history:changed", ({ reason }) => {
            if (reason === "undo" || reason === "redo" || reason === "restore") {
                this.#loadedPair = undefined;
            }

            this.#mirrorHistoryChange(reason);
        });
    }

    /**
     * Called after the first update of the element. Initializes async graph setup.
     * @param changedProperties - Map of changed property names to their previous values
     */
    firstUpdated(changedProperties: Map<string, unknown>): void {
        // What the page declared is in: data assigned from here on is the reader's, and undoable.
        this.#settingUp = false;
        super.firstUpdated(changedProperties);
        // Every attribute the page declared is in, so this is when the session settles its features.
        this.dispatchEvent(
            new CustomEvent("graphty-features", { detail: this.session.features, bubbles: true, composed: true }),
        );

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
     * The graph container element. Lit never renders it: `connectedCallback` places it in the
     * shadow root before the first update, and `update` leaves it there (see there).
     * @returns The graph container element
     */
    render(): Element {
        return this.#element;
    }

    /**
     * Applies property changes without Lit's template render. The graph container is already in
     * the shadow root (`connectedCallback`); Lit rendering it would move it on the first update,
     * and moving a node takes focus off whatever inside it had focus, so a page that focused the
     * drawing as it mounted the element lost that focus to the page.
     * @param changedProperties - The properties that changed.
     */
    protected override update(changedProperties: PropertyValues): void {
        // ReactiveElement's update, the one LitElement's wraps: it records the update and reflects
        // attributes, and renders nothing. Read by name, since it is protected on the base class.
        const reactiveUpdate: unknown = Reflect.get(ReactiveElement.prototype, "update");
        if (typeof reactiveUpdate === "function") {
            Reflect.apply(reactiveUpdate, this, [changedProperties]);
        }
    }

    /**
     * Listen for an event. The unprefixed graph events the element forwards (`style-changed`,
     * `data-loaded`, `error` and the rest of {@link GraphtyForwardedEventMap}) reach the listener
     * as a `CustomEvent` with a typed `detail`; the `graphty-*` events are typed through
     * `HTMLElementEventMap`, and every other name behaves as on any element.
     * @param type - The event name.
     * @param listener - What to call.
     * @param options - As for any element.
     */
    override addEventListener<K extends keyof GraphtyForwardedEventMap>(
        type: K,
        listener: (this: Graphty, ev: GraphtyForwardedEventMap[K]) => unknown,
        options?: boolean | AddEventListenerOptions,
    ): void;
    /**
     * An event of `HTMLElementEventMap`, typed as on any element, `graphty-*` events included.
     * @param type - The event name.
     * @param listener - The listener.
     * @param options - As for any element.
     */
    override addEventListener<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown,
        options?: boolean | AddEventListenerOptions,
    ): void;
    /**
     * Any other event name, as on any element.
     * @param type - The event name.
     * @param listener - The listener.
     * @param options - As for any element.
     */
    override addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    /**
     * Hands every overload to the element's own `EventTarget`.
     * @param type - The event name.
     * @param listener - The listener.
     * @param options - As for any element.
     */
    override addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void {
        super.addEventListener(type, listener, options);
    }

    /**
     * Stop listening for an event, typed the same way as {@link Graphty.addEventListener}.
     * @param type - The event name.
     * @param listener - The listener that was added.
     * @param options - As for any element.
     */
    override removeEventListener<K extends keyof GraphtyForwardedEventMap>(
        type: K,
        listener: (this: Graphty, ev: GraphtyForwardedEventMap[K]) => unknown,
        options?: boolean | EventListenerOptions,
    ): void;
    /**
     * An event of `HTMLElementEventMap`, typed as on any element, `graphty-*` events included.
     * @param type - The event name.
     * @param listener - The listener.
     * @param options - As for any element.
     */
    override removeEventListener<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown,
        options?: boolean | EventListenerOptions,
    ): void;
    /**
     * Any other event name, as on any element.
     * @param type - The event name.
     * @param listener - The listener.
     * @param options - As for any element.
     */
    override removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
    /**
     * Hands every overload to the element's own `EventTarget`.
     * @param type - The event name.
     * @param listener - The listener.
     * @param options - As for any element.
     */
    override removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void {
        super.removeEventListener(type, listener, options);
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
        this.#unwatchHistory?.();
        this.#unwatchHistory = null;
        this.#unwatchProjectStatus?.();
        this.#unwatchProjectStatus = null;
        this.#unwatchSource?.();
        this.#unwatchSource = null;
        this.#unwatchNotes?.();
        this.#unwatchNotes = null;
        this.#unwatchModels?.();
        this.#unwatchModels = null;
        this.#unwatchProgress?.();
        this.#unwatchProgress = null;

        // The final autosave write is built now, while the session is still alive; only its
        // commit finishes after the shutdown below.
        clearTimeout(this.#autosaveTimer);
        this.#autosaveControl.depart();

        this.#graph.shutdown();
        super.disconnectedCallback();
    }

    /** Autosave for this element: off until the `autosave` attribute or property turns it on. */
    readonly #autosaveControl = new ElementAutosave((type, detail) => {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    });
    #autosaveTimer: ReturnType<typeof setTimeout> | undefined;
    #autosaveValue: string | null = null;
    #featuresValue: readonly string[] | undefined;

    /**
     * The experiments to switch on, space separated (`features="timeline location-map"`); `all`
     * switches on every one this build declares. Absent takes the page default
     * (`setDefaultFeatures`). Read once, when the element first renders; see `enabledFeatures`.
     * Features marked `@experimental` may change or disappear in a minor release.
     * @returns The ids as set, or `undefined` when none were.
     * @since 3.31.0
     * @example
     * ```html
     * <graphty-element features="timeline"></graphty-element>
     * ```
     */
    @property({ attribute: "features" })
    get features(): readonly string[] | undefined {
        return this.#featuresValue;
    }
    /**
     * Sets the ids: an array, or a space-separated string as the attribute carries them.
     */
    set features(value: readonly string[] | string | null | undefined) {
        const oldValue = this.#featuresValue;
        if (typeof value === "string") {
            this.#featuresValue = value.split(/\s+/).filter((id) => id !== "");
        } else {
            // A copy, so the caller changing its array afterwards does not change what was set.
            this.#featuresValue = Array.isArray(value) ? Object.freeze([...value]) : undefined;
        }
        this.requestUpdate("features", oldValue);
    }

    /**
     * What the element switched on, and the requested ids this build does not know. The same
     * object the `graphty-features` event carries.
     * @returns The enabled and unknown ids.
     * @since 3.31.0
     */
    get enabledFeatures(): EnabledFeatures {
        return this.session.features;
    }
    #autosaveRestoreValue: "auto" | "manual" = "auto";
    #autosaveOptionsValue: Partial<AutosaveOptions> = {};
    /** Page-supplied loads, one after another, after the restore. */
    #pageGate: Promise<unknown> = Promise.resolve();
    /** A data-source pair is waiting its turn on the gate. */
    #pairQueued = false;
    /** The last page-supplied load of each kind, run again by `autosaver.discard()`. */
    readonly #pageLoads = new Map<string, { readonly source: PageSource; readonly load: () => Promise<void> }>();

    /**
     * Keep the reader's work in this browser as it changes, and bring it back after a reload, a
     * closed tab, a discarded tab or a crash. Present means on; a string value is the key (a
     * namespaced one, such as `acme.org-chart`, since the key is shared across the whole site). A
     * bare `autosave` keys by the page's address and the element's `id`.
     *
     * Off by default. Read in the task after the element connects; `autosaveOptions.key` wins
     * over it. See the autosave guide.
     * @returns The key, `""` for a bare attribute, or null when autosave is off.
     * @since 3.29.0
     * @example
     * ```html
     * <graphty-element autosave="acme.org-chart"></graphty-element>
     * ```
     */
    @property({ attribute: "autosave" })
    get autosave(): string | null {
        return this.#autosaveValue;
    }
    /**
     * Turns autosave on (a key, `""` or `true`) or off (`null`, `false`).
     */
    set autosave(value: string | boolean | null | undefined) {
        const oldValue = this.#autosaveValue;
        if (value === true) {
            this.#autosaveValue = "";
        } else if (typeof value === "string") {
            this.#autosaveValue = value;
        } else {
            this.#autosaveValue = null;
        }

        this.requestUpdate("autosave", oldValue);
    }

    /**
     * Whether autosave restores this tab's work by itself on load (`"auto"`, the default) or only
     * reports it with `graphty-autosave-available` (`"manual"`), for the page to call
     * `autosaver.restore(id)`.
     * @returns The mode.
     * @since 3.29.0
     */
    @property({ attribute: "autosave-restore" })
    get autosaveRestore(): "auto" | "manual" {
        return this.#autosaveRestoreValue;
    }
    /**
     * Sets the restore mode; anything but `"manual"` is `"auto"`.
     */
    set autosaveRestore(value: "auto" | "manual" | null | undefined) {
        const oldValue = this.#autosaveRestoreValue;
        this.#autosaveRestoreValue = value === "manual" ? "manual" : "auto";
        this.requestUpdate("autosaveRestore", oldValue);
    }

    /**
     * How autosave writes: its key, schedule, retention, the unload guard, persistent storage and
     * the store. Read when autosave starts (the guard, when it is first needed).
     * @returns The options as set.
     * @since 3.29.0
     */
    @property({ attribute: false })
    get autosaveOptions(): Partial<AutosaveOptions> {
        return this.#autosaveOptionsValue;
    }
    /**
     * Sets the options.
     */
    set autosaveOptions(value: Partial<AutosaveOptions> | null | undefined) {
        const oldValue = this.#autosaveOptionsValue;
        this.#autosaveOptionsValue = value ?? {};
        this.requestUpdate("autosaveOptions", oldValue);
    }

    /**
     * Autosave's state and its saved entries: `status`, `ready`, `restored`, `flush()`, `list()`,
     * `restore(id)`, `remove(id)`, `removeAll()`, `discard()`, `stash()`, `stashed()` and
     * `requestPersistence()`. Present whether autosave is on or not; off, its status is `"off"`
     * and `ready` resolves null.
     * @returns The API.
     * @since 3.29.0
     */
    get autosaver(): AutosaveApi {
        return this.#autosaveControl.api;
    }

    /**
     * Whether autosave is on: the property, or the attribute for an assignment that reaches the
     * element before the attribute's own callback has run.
     * @returns True when on.
     */
    #autosaveOn(): boolean {
        return this.#autosaveValue !== null || this.hasAttribute("autosave");
    }

    /**
     * Whether this element autosaves under a bare attribute and has no `id`, so its key is the
     * page's address alone.
     * @returns True when it does.
     */
    #bareWithoutId(): boolean {
        return (
            this.#autosaveOn() &&
            (this.#autosaveValue ?? this.getAttribute("autosave") ?? "") === "" &&
            (this.#autosaveOptionsValue.key ?? "") === "" &&
            this.id === ""
        );
    }

    /**
     * Run a load the page supplied (declared attributes, assigned rows). With autosave on it waits
     * for the restore and goes through it, which skips a load of the data the restored work was
     * built from; off, it runs now, as it always has.
     * @param source - What it came from.
     * @param apply - Runs it; `setup` says whether the page declared it before the first update.
     */
    #pageLoad(source: PageSource, apply: (setup: boolean) => Promise<void>): void {
        const setup = this.#settingUp;
        if (!this.#autosaveOn()) {
            void apply(setup);
            return;
        }

        const load = (): Promise<void> => apply(setup);
        this.#pageLoads.set(sourceSlot(source), { source, load });
        this.#pageGate = this.#pageGate
            .then(() => this.#autosaveControl.ready)
            .then(() => this.#autosaveControl.admit(source, load))
            .catch(() => undefined);
    }

    /**
     * A data call waits while autosave decides its restore, and after the page's own loads.
     * Nothing to wait for returns undefined, so a call that does not wait keeps its place in line.
     * @returns Settles when the call may run, or undefined when it may run now.
     */
    #afterRestore(): Promise<void> | undefined {
        if (!this.#autosaveOn() || !this.#autosaveControl.holding) {
            return undefined;
        }

        return this.#autosaveControl.ready.then(() => this.#pageGate).then(() => undefined);
    }

    /**
     * Settles once the restore is decided and every page load held behind it has run its turn,
     * so its work is on the graph's queue; a page load added meanwhile is waited for too.
     */
    async #pageLoadsQueued(): Promise<void> {
        // Not connected, autosave never starts and nothing held runs: there is nothing to wait for.
        if (!this.#autosaveOn() || !this.isConnected) {
            return;
        }

        let gate: Promise<unknown>;
        do {
            gate = this.#pageGate;
            await this.#autosaveControl.ready;
            await gate;
        } while (gate !== this.#pageGate);
    }

    /** Start autosave, in the task after connecting: resolve the key, then restore. */
    async #startAutosave(): Promise<void> {
        if (!this.isConnected || !this.#autosaveOn()) {
            this.#autosaveControl.off();
            return;
        }

        const graphs = [...document.querySelectorAll("graphty-element")];
        const key = resolveAutosaveKey({
            optionKey: this.#autosaveOptionsValue.key,
            attribute: this.#autosaveValue ?? this.getAttribute("autosave") ?? "",
            id: this.id,
            location: `${location.pathname}${location.search}${location.hash}`,
            bareWithoutId: graphs.filter((each) => each instanceof Graphty && each.#bareWithoutId()).length,
        });
        const session = this.#graph.getSession();
        let pristine: string | undefined;
        try {
            // What a fresh element holds before any data: `discard()` goes back to it.
            pristine = (await session.project.save({ markSaved: false })).text;
        } catch {
            pristine = undefined;
        }

        const skip = new Set([
            "autosave",
            "autosave-restore",
            "node-data",
            "edge-data",
            "data-source",
            "data-source-config",
            "id",
            "class",
            "style",
        ]);
        const pageConfig = Object.fromEntries(
            [...this.attributes].filter((each) => !skip.has(each.name)).map((each) => [each.name, each.value]),
        );
        await this.#autosaveControl.start({
            session,
            key,
            options: this.#autosaveOptionsValue,
            restore: this.#autosaveRestoreValue,
            pageConfig,
            reloadPage: async () => {
                if (pristine !== undefined) {
                    await session.project.open(pristine, { discard: true });
                }

                for (const { source, load } of this.#pageLoads.values()) {
                    await this.#autosaveControl.admit(source, load);
                }
            },
        });
    }

    // Private backing fields for reactive properties
    #startingCameraDistance?: number;
    #xr?: PartialXRConfig;

    /**
     * A project setting: the value as it was set on this element, or the value in effect when it
     * has not been set. The project settings live in the session's `config` slice, so undo and redo
     * move what these properties read. Assigning a setting its default records no step and leaves
     * the key unset, so the value in effect is what makes that assignment read back.
     * @param path - The setting's key, such as `data.knownFields.nodeIdPath`.
     * @returns The value as it was set, else the value in effect (undefined for a setting whose
     *     default is null, such as the edge endpoint paths).
     */
    #setting(path: string): unknown {
        const session = this.#graph.getSession();
        const { config } = dispatcherOf(session).state;
        if (config.has(path)) {
            return config.get(path);
        }

        // A setting whose default is null, such as the edge endpoint paths, reads as undefined.
        return (
            path
                .split(".")
                .reduce<unknown>(
                    (at, name) => (at as Readonly<Record<string, unknown>> | undefined)?.[name],
                    session.config,
                ) ?? undefined
        );
    }

    /**
     * Change project settings as one step, reporting a refusal rather than throwing it: these
     * setters are reached from `attributeChangedCallback`, where a throw escapes as an unhandled
     * rejection that reaches nobody.
     * @param name - The property, for the report and for Lit.
     * @param oldValue - What the property read before, for Lit.
     * @param values - The settings.
     */
    #setSetting(name: string, oldValue: unknown, values: ProjectConfigPatch): void {
        this.#graph
            .getSession()
            .config.set(values)
            .catch((error: unknown) => {
                console.error(`<graphty-element>: ${name} was refused. Keeping the one already set.`, error);
            });
        this.requestUpdate(name, oldValue);
    }

    /**
     * Set one known field of the data configuration. Null, empty or undefined returns it to its
     * default.
     * @param name - The field, which is also the property's name.
     * @param value - The value.
     */
    #setKnownField(name: string, value: string | number | null | undefined): void {
        const oldValue = this.#setting(`data.knownFields.${name}`);
        this.#setSetting(name, oldValue, {
            data: { knownFields: { [name]: value === null || value === "" ? undefined : value } },
        });
    }

    /**
     * Array of node data objects to visualize.
     * @remarks
     * Setting this property REPLACES all existing nodes: a node whose id is
     * not in the new array is removed, with the edges attached to it. For
     * incremental updates, use the `addNodes()` method instead.
     *
     * Each node object should have an ID field (default: "id"). Additional
     * properties can be used in style selectors and accessed via `node.data`.
     * @since 1.0.0
     * @see {@link edgeData} for edge data
     * @see {@link https://graphty.app/storybook/graphty-element/?path=/story/graphty--graphty | Basic Examples}
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
        const records = this.#records("node");
        return records.length === 0 ? undefined : (records as Record<string, unknown>[]);
    }
    /**
     * Replaces the graph's nodes with these, as one undoable step: a node the array names again
     * keeps its row, its position and its edges and takes its new record, and one it no longer
     * names goes, with its edges.
     */
    set nodeData(value: Record<string, unknown>[] | undefined) {
        const oldValue = this.nodeData;
        if (value && Array.isArray(value)) {
            const { nodeIdPath } = this.#graph.getStyles().config.data.knownFields;
            this.#pageLoad({ kind: "rows", nodes: value }, (setup) =>
                this.#replaceData(
                    (state, asSetup) => replaceNodesCommand(state.nodes, value, nodeIdPath, asSetup),
                    setup,
                ),
            );
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
        const records = this.#records("edge");
        return records.length === 0 ? undefined : (records as Record<string, unknown>[]);
    }
    /**
     * Replaces the graph's edges with these, as one undoable step.
     */
    set edgeData(value: Record<string, unknown>[] | undefined) {
        const oldValue = this.edgeData;

        // REPLACE, not append. Two edges between one pair are now two edges, so an additive
        // setter would double every edge each time a host re-assigned the property.
        if (value && Array.isArray(value)) {
            this.#pageLoad({ kind: "rows", edges: value }, (setup) =>
                this.#replaceData(
                    (state, asSetup) => replaceEdgesCommand([...state.edges.keys()], value, {}, asSetup),
                    setup,
                ),
            );
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
        return this.#source().type;
    }
    /**
     * Sets the data source type. Loads the graph from it, replacing what the graph held, once the
     * configuration is set too.
     */
    set dataSource(value: string | undefined) {
        const oldValue = this.dataSource;
        if (typeof value === "string" && value !== "") {
            // Once the pair's load is recorded, the graph keeps only a description of its
            // configuration (no `data`, no `file`); the pair this element loaded is the
            // configuration as assigned, so re-assigning the same type re-assigns that pair.
            const loaded = this.#loadedPair;
            const config =
                loaded?.type === value && this.#source().type === value
                    ? loaded.config
                    : (this.#source().config ?? this.#assigned.config);
            this.#importSource({ type: value, config });
        }

        this.requestUpdate("dataSource", oldValue);
    }

    /**
     * The configuration for the data source. See documentation for
     * data sources for more information.
     * @returns Data source configuration object or undefined if not set
     */
    // `type: Object`: the attribute holds JSON (`data-source-config='{"team":"core"}'`), parsed once.
    @property({ attribute: "data-source-config", type: Object })
    get dataSourceConfig(): Record<string, unknown> | undefined {
        const { config } = this.#source();
        // Reported without the inline text or the file: the graph keeps where it came from, not
        // a second copy of what it holds.
        return config === undefined ? undefined : describeSource({ config }).config;
    }
    /**
     * Sets the data source configuration. Loads the graph from it, replacing what the graph
     * held, once the type is set too.
     */
    set dataSourceConfig(value: Record<string, unknown> | undefined) {
        const oldValue = this.dataSourceConfig;
        if (value !== undefined && value !== null) {
            this.#importSource({ type: this.#source().type ?? this.#assigned.type, config: value });
        }

        this.requestUpdate("dataSourceConfig", oldValue);
    }

    /**
     * Removes every node and edge, as one undoable step. The data source goes with them, so the
     * next `dataSource` / `dataSourceConfig` assignment loads afresh. A load still in flight is
     * abandoned: it rejects with `E_SUPERSEDED` and adds nothing.
     */
    clearData(): void {
        const oldDataSource = this.dataSource;
        const oldDataSourceConfig = this.dataSourceConfig;

        this.#graph.clearData();
        this.#loadedPair = undefined;
        this.#assigned = {};
        this.#pairNext = undefined;

        this.requestUpdate("dataSource", oldDataSource);
        this.requestUpdate("dataSourceConfig", oldDataSourceConfig);
    }

    /** Until the first update: what is assigned now was declared by the page, and is baseline. */
    #settingUp = true;

    /**
     * The pair the last pair load started with. The same type and the same config object (`===`)
     * again start no load. Forgotten by `clearData` and by a history call, which move the source.
     */
    #loadedPair: { type: string; config: Record<string, unknown> } | undefined;

    /**
     * The pair as last assigned, whether or not its load arrived: the half a later assignment
     * pairs with when a failed load left the graph without a source.
     */
    #assigned: ImportSource = {};

    /** The records `nodeData` and `edgeData` last read, for the graph they were read from. */
    #rowRecords: { token: number; node?: readonly unknown[]; edge?: readonly unknown[] } | null = null;

    /**
     * The graph's records in row order, built once per graph.
     * @param target - Nodes or edges.
     * @returns The records.
     */
    #records(target: "node" | "edge"): readonly unknown[] {
        const session = this.#graph.getSession();
        // A removed element's session is disposed, and Lit can still run an update it had already
        // scheduled -- one that reads this property. The getter answers with nothing then, rather
        // than an unhandled rejection from inside Lit that reaches nobody.
        if (session.status === DISPOSED_STATUS) {
            return [];
        }

        const { graph } = dispatcherOf(session).state;
        if (this.#rowRecords?.token !== graph.token) {
            this.#rowRecords = { token: graph.token };
        }

        this.#rowRecords[target] ??= recordsInRowOrder(graph, session.snapshot(), target);
        return this.#rowRecords[target];
    }

    /**
     * The data source as assigned: the import waiting its turn, or the one the graph was loaded
     * from.
     * @returns The source; empty when neither is set.
     */
    #source(): ImportSource {
        // A pair whose load has not settled -- waiting behind autosave or behind a load asked for
        // earlier that is still reading, or still reading itself -- is not in the graph yet, and
        // may not even be dispatched: the pair as assigned is the one a half assigned now pairs with.
        if (this.#pairQueued || this.#pairLoads > 0) {
            return this.#assigned;
        }

        const dispatcher = dispatcherOf(this.#graph.getSession());
        const pending = dispatcher.pendingCommand(ELEMENT_SOURCE) as { source: ImportSource } | undefined;
        return pending?.source ?? (dispatcher.state.graph.values.get(SOURCE_VALUE) as ImportSource | undefined) ?? {};
    }

    /**
     * Load from the pair as it now stands, replacing the graph. Two assignments in one tick
     * coalesce into one load and one step while the first waits its turn.
     * @param source - The pair.
     */
    #importSource(source: ImportSource): void {
        this.#assigned = source;
        if (this.#autosaveOn()) {
            // Autosave decides whether the page's pair replaces restored work, once both halves
            // are in: the pair is read when its turn comes, not as each half is assigned.
            if (!this.#pairQueued) {
                this.#pairQueued = true;
                const setup = this.#settingUp;
                this.#pageGate = this.#pageGate
                    .then(() => this.#autosaveControl.ready)
                    .then(() => {
                        this.#pairQueued = false;
                        const { type, config } = this.#assigned;
                        if (type === undefined || config === undefined) {
                            return undefined;
                        }

                        const pair = { type, config };
                        const load = (): Promise<void> => this.#runImport(pair, setup);
                        const page: PageSource = {
                            kind: "attributes",
                            values: { type, config: JSON.stringify(config) },
                        };
                        this.#pageLoads.set("whole", { source: page, load });
                        this.#pageLoads.delete("nodes");
                        this.#pageLoads.delete("edges");
                        return this.#autosaveControl.admit(page, load);
                    })
                    .catch(() => undefined);
            }

            return;
        }

        void this.#runImport(source, this.#settingUp);
    }

    /**
     * Load from a pair now.
     * @param source - The pair.
     * @param setup - Whether the page declared it before the first update.
     * @returns Settles once the load ran or failed (a failure is reported on the data-loading channel).
     */
    #runImport(source: ImportSource, setup: boolean): Promise<void> {
        const { type, config } = source;
        // The pair already loaded, assigned again by a host that re-renders: no load.
        const last = this.#loadedPair;
        if (type !== undefined && config !== undefined && last?.type === type && last.config === config) {
            return Promise.resolve();
        }

        const line = loadLineOf(dispatcherOf(this.#graph.getSession()));
        this.#pairNext = { source, setup, clears: line.clears };
        if (this.#pairWaiting !== undefined) {
            // A pair load still waits for its turn: it loads the pair as now assigned, as one load.
            return this.#pairWaiting;
        }

        // Its place in the session's load line is taken now, so it lands after a load asked for
        // earlier, however long that one reads, and before one asked for later (issue #3382).
        const turn = line.join();
        const go = (): Promise<void> => {
            this.#pairWaiting = undefined;
            const next = this.#pairNext;
            this.#pairNext = undefined;
            // Nothing to load when clearData dropped the pair while it waited.
            return next === undefined
                ? Promise.resolve()
                : line.within(turn, () => this.#startImport(next.source, next.setup));
        };
        const ahead = turn.wait();
        this.#pairLoads++;
        let run: Promise<void>;
        if (ahead === undefined) {
            run = go();
        } else {
            // A clear asked for while it waited cancelled its place. A pair assigned after the
            // clear is still waiting to load: it takes a place of its own. One assigned before it
            // is what the clear cancelled, whichever door the clear came through.
            run = ahead.then(go, () => {
                this.#pairWaiting = undefined;
                const next = this.#pairNext;
                this.#pairNext = undefined;
                return next?.clears === line.clears ? this.#runImport(next.source, next.setup) : undefined;
            });
            this.#pairWaiting = run;
        }
        return run.finally(() => {
            turn.leave();
            this.#pairLoads--;
        });
    }

    /** How many pair loads {@link #runImport} started that have not settled. */
    #pairLoads = 0;

    /** The pair load waiting for its turn in the load line, which later assignments join. */
    #pairWaiting: Promise<void> | undefined;

    /** The pair, as last handed to {@link #runImport}: what a waiting pair load loads. */
    #pairNext:
        | {
              readonly source: ImportSource;
              readonly setup: boolean;
              /** The line's clears when assigned. */ readonly clears: number;
          }
        | undefined;

    /**
     * The body of {@link #runImport}: start the pair's load.
     * @param source - The pair.
     * @param setup - Whether the page declared it before the first update.
     * @returns Settles once the load ran or failed.
     */
    #startImport(source: ImportSource, setup: boolean): Promise<void> {
        const { type, config } = source;
        if (type !== undefined && config !== undefined) {
            const pair = { type, config };
            this.#loadedPair = pair;
            const sourceId = Graphty.#sourceIdOf(type);
            if (sourceId !== null) {
                // A network source: read with the element's remembered credential, outside the
                // command, like session.data.import, so redo never fetches.
                return this.session.data.import({ source: sourceId, config }).then(
                    () => undefined,
                    (error: unknown) => {
                        if (this.#loadedPair === pair) {
                            this.#loadedPair = undefined;
                        }

                        this.#reportLoadFailure(error);
                    },
                );
            }

            return loadSourcePair(this.#graph, type, config, {
                coalesce: ELEMENT_SOURCE,
                setup,
            }).then(
                () => undefined,
                () => {
                    // A failed pair was not loaded, so assigning it again retries it. The load
                    // reported the failure on the data-loading channel before it rejected.
                    if (this.#loadedPair === pair) {
                        this.#loadedPair = undefined;
                    }
                },
            );
        }

        const dispatcher = dispatcherOf(this.#graph.getSession());
        return (
            // In the place in the load line #runImport took for it (issue #3382).
            loadLineOf(dispatcher)
                .run(() =>
                    dispatcher.dispatch({
                        op: "data.import",
                        source: {
                            ...(source.type === undefined ? {} : { type: source.type }),
                            ...(source.config === undefined ? {} : { config: source.config }),
                        },
                        mode: "replace",
                        coalesce: ELEMENT_SOURCE,
                        ...(setup ? { setup: true } : {}),
                    }),
                )
                // A failed load is published on the data-loading channel by the load itself, before
                // it rejects; a caller who wants the throw calls `loadFromUrl` and awaits it.
                .then(
                    () => undefined,
                    () => undefined,
                )
        );
    }

    /**
     * Replace nodes or edges as one step: once the graph is up, in the session's load line, so at
     * once when no load asked for earlier is still reading (the getter then reads the new records
     * as soon as the assignment returns) and after that load otherwise; before the graph is up, on
     * the operation queue's turn, after the layout the graph starts with, which the new nodes join.
     * @param build - The step, built from the graph as it stands when it runs.
     * @param setup - Whether the page declared it before the first update, so it is baseline.
     * @returns Settles once the step is recorded, or failed and was reported.
     */
    #replaceData(build: (state: GraphSlice, setup: boolean) => BatchCommand, setup = this.#settingUp): Promise<void> {
        const dispatcher = dispatcherOf(this.#graph.getSession());
        const dispatch = (): Promise<unknown> => dispatcher.dispatch(build(dispatcher.state.graph, setup));
        // Its place in the session's load line is taken now, so records assigned after a load
        // that is still reading land after it instead of being replaced by it (issue #3382). With
        // no load ahead it dispatches at once, so the getter reads the new records on return.
        // Before the graph is up, and behind a load that was dispatched before it, the step is
        // built once the queue reaches this turn, and dispatched after it: the load's own step is
        // queued, and this one is not, so dispatched at once it would land first. Its members take
        // turns of their own, which they could not while this one held the queue.
        const queueTurn = (): Promise<void> =>
            operationQueueOf(this.#graph).queueOperationAsync("data-add", (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }
            });
        // An edit, not a load: inside a transaction it dispatches at once.
        const turn = loadLineOf(dispatcher).join(undefined, "edit");
        const inTurn = (): Promise<unknown> => {
            const ahead = turn.wait();
            return ahead === undefined ? turn.issue(dispatch) : ahead.then(queueTurn).then(() => turn.issue(dispatch));
        };
        const done = (this.#graph.initialized ? inTurn() : queueTurn().then(inTurn)).finally(() => {
            turn.leave();
        });
        return done.then(
            () => undefined,
            (error: unknown) => {
                this.#reportLoadFailure(error);
            },
        );
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
        // A load a clearData cancelled did what the caller asked for: it is no failure.
        if (isGraphtyError(error) && error.code === "E_SUPERSEDED") {
            return;
        }
        this.#graph.eventManager.emitDataLoadingError(
            error instanceof Error ? error : new Error(String(error)),
            "validation",
            "records",
            { canContinue: false },
        );
    }

    /**
     * A jmespath string that can be used to select the unique node identifier
     * for each node. Defaults to "id", as in `{id: 42}` is the identifier of
     * the node.
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "node-id-path" })
    get nodeIdPath(): string | undefined {
        return this.#setting("data.knownFields.nodeIdPath") as string | undefined;
    }
    /**
     * Sets the JMESPath for node ID extraction. Updates graph configuration.
     */
    set nodeIdPath(value: string | undefined) {
        this.#setKnownField("nodeIdPath", value);
    }

    /**
     * Similar to the nodeIdPath property / node-id-path attribute, this is a
     * jmespath that describes where to find the source node identifier for this edge.
     *
     * Unset by default, which means PROBE: the element reads `source`/`target`, then `src`/`dst`,
     * then `from`/`to`, deciding once per batch of edge records. Setting this settles the question
     * and turns the probe off, and a record that does not answer it is then a rejected record
     * rather than a reason to guess again.
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "edge-src-id-path" })
    get edgeSrcIdPath(): string | undefined {
        return this.#setting("data.knownFields.edgeSrcIdPath") as string | undefined;
    }
    /**
     * Sets the JMESPath for edge source ID extraction. Updates graph configuration.
     */
    set edgeSrcIdPath(value: string | undefined) {
        this.#setKnownField("edgeSrcIdPath", value);
    }

    /**
     * Similar to the nodeIdPath property / node-id-path attribute, this is a
     * jmespath that describes where to find the destination node identifier for this edge.
     *
     * Unset by default, which means PROBE; see {@link edgeSrcIdPath}.
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "edge-dst-id-path" })
    get edgeDstIdPath(): string | undefined {
        return this.#setting("data.knownFields.edgeDstIdPath") as string | undefined;
    }
    /**
     * Sets the JMESPath for edge destination ID extraction. Updates graph configuration.
     */
    set edgeDstIdPath(value: string | undefined) {
        this.#setKnownField("edgeDstIdPath", value);
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
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "edge-id-path" })
    get edgeIdPath(): string | undefined {
        return this.#setting("data.knownFields.edgeIdPath") as string | undefined;
    }
    /**
     * Sets the JMESPath for edge identity. Updates graph configuration.
     */
    set edgeIdPath(value: string | undefined) {
        this.#setKnownField("edgeIdPath", value);
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
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "repeated-edges" })
    get repeatedEdges(): DuplicatePolicy | undefined {
        return this.#setting("data.knownFields.repeatedEdges") as DuplicatePolicy | undefined;
    }
    /**
     * Sets the repeat policy. Updates graph configuration.
     */
    set repeatedEdges(value: DuplicatePolicy | undefined) {
        if (value !== undefined && value !== null && !(REPEATED_EDGE_POLICIES as readonly string[]).includes(value)) {
            console.error(
                `<graphty-element>: repeated-edges must be one of ` +
                    `${REPEATED_EDGE_POLICIES.join(", ")}, not "${value}". ` +
                    `Keeping "${this.repeatedEdges ?? "keep"}". ` +
                    "See https://graphty.app/docs/graphty-element/attributes#repeated-edges",
            );

            return;
        }

        this.#setKnownField("repeatedEdges", value);
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
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "node-label-path" })
    get nodeLabelPath(): string | undefined {
        return this.#setting("data.knownFields.nodeLabelPath") as string | undefined;
    }
    /**
     * Sets the JMESPath for a node's display name. Updates graph configuration.
     */
    set nodeLabelPath(value: string | undefined) {
        this.#setKnownField("nodeLabelPath", value);
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
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "edge-weight-path" })
    get edgeWeightPath(): string | undefined {
        return this.#setting("data.knownFields.edgeWeightPath") as string | undefined;
    }
    /**
     * Sets the JMESPath for an edge's weight. Updates graph configuration.
     */
    set edgeWeightPath(value: string | undefined) {
        this.#setKnownField("edgeWeightPath", value);
    }

    /**
     * The edge column that says when each edge happened: the designated time field, which
     * `session.time` indexes and moves a time window along. The column's measurement becomes
     * time. Nodes follow their edges: a window keeps the nodes at the ends of the edges inside it.
     * @since 3.31.0
     * @example
     * ```html
     * <graphty-element edge-time-path="sent"></graphty-element>
     * ```
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "edge-time-path" })
    get edgeTimePath(): string | undefined {
        return this.#setting("data.knownFields.edgeTimePath") as string | undefined;
    }
    /**
     * Sets the edge time column. Updates graph configuration.
     */
    set edgeTimePath(value: string | undefined) {
        this.#setKnownField("edgeTimePath", value);
    }

    /**
     * The node column that says when each node exists: the designated time field on nodes.
     * @since 3.31.0
     * @example
     * ```html
     * <graphty-element node-time-path="published"></graphty-element>
     * ```
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "node-time-path" })
    get nodeTimePath(): string | undefined {
        return this.#setting("data.knownFields.nodeTimePath") as string | undefined;
    }
    /**
     * Sets the node time column. Updates graph configuration.
     */
    set nodeTimePath(value: string | undefined) {
        this.#setKnownField("nodeTimePath", value);
    }

    /**
     * How numbers in the edge time column are read: `ms` (epoch milliseconds), `s` (epoch seconds),
     * `year` (calendar years) or `ordinal` (plain ordered numbers such as steps). Left unset, the
     * values decide. Text dates ignore it.
     * @since 3.31.0
     * @example
     * ```html
     * <graphty-element edge-time-path="ts" edge-time-unit="s"></graphty-element>
     * ```
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "edge-time-unit" })
    get edgeTimeUnit(): string | undefined {
        return this.#setting("data.knownFields.edgeTimeUnit") as string | undefined;
    }
    /**
     * Sets how the edge time column's numbers are read. Updates graph configuration.
     */
    set edgeTimeUnit(value: string | undefined) {
        if (value !== undefined && value !== null && value !== "" && !["ms", "s", "year", "ordinal"].includes(value)) {
            console.error(`<graphty-element>: edge-time-unit must be ms, s, year or ordinal, not "${value}".`);

            return;
        }

        this.#setKnownField("edgeTimeUnit", value);
    }

    /**
     * How numbers in the node time column are read: `ms`, `s`, `year` or `ordinal`; left unset, the
     * values decide.
     * @since 3.31.0
     * @example
     * ```html
     * <graphty-element node-time-path="year" node-time-unit="ordinal"></graphty-element>
     * ```
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "node-time-unit" })
    get nodeTimeUnit(): string | undefined {
        return this.#setting("data.knownFields.nodeTimeUnit") as string | undefined;
    }
    /**
     * Sets how the node time column's numbers are read. Updates graph configuration.
     */
    set nodeTimeUnit(value: string | undefined) {
        if (value !== undefined && value !== null && value !== "" && !["ms", "s", "year", "ordinal"].includes(value)) {
            console.error(`<graphty-element>: node-time-unit must be ms, s, year or ordinal, not "${value}".`);

            return;
        }

        this.#setKnownField("nodeTimeUnit", value);
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
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "position-scale", type: Number })
    get positionScale(): number | undefined {
        return this.#setting("data.knownFields.positionScale") as number | undefined;
    }
    /**
     * Sets the record-units-to-scene-units multiplier. Updates graph configuration.
     */
    set positionScale(value: number | undefined) {
        if (value !== undefined && value !== null && !(Number.isFinite(value) && value > 0)) {
            console.error(
                `<graphty-element>: position-scale must be a number greater than zero, not "${String(value)}". ` +
                    `Keeping ${String(this.positionScale ?? 1)}. ` +
                    "See https://graphty.app/docs/graphty-element/attributes#position-scale",
            );

            return;
        }

        this.#setKnownField("positionScale", value);
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
     * @returns The value set on this element, else the value in effect ("auto" by default)
     */
    @property({
        attribute: "directed",
        /*
         * Three values, one of which is a word, so neither Lit's Boolean converter (which reads
         * PRESENCE, making `directed="auto"` mean true) nor its String converter (which would
         * hand the setter "true" and "false" as text) is right on its own.
         */
        converter: {
            fromAttribute: (value: string | null): Graphty["directed"] => {
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
        return this.#setting("data.directed") as boolean | "auto" | undefined;
    }
    /**
     * Sets whether the graph is read as directed. Updates graph configuration.
     */
    set directed(value: boolean | "auto" | undefined) {
        const oldValue = this.directed;

        if (value !== undefined && value !== null && value !== "auto" && typeof value !== "boolean") {
            console.error(
                `<graphty-element>: directed must be true, false or "auto", not "${String(value)}". ` +
                    `Keeping "${String(oldValue ?? "auto")}". ` +
                    "See https://graphty.app/docs/graphty-element/attributes#directed",
            );

            return;
        }

        // Undefined is also what the attribute converter hands over for a value it refused, so
        // it keeps the setting in place rather than returning it to "auto".
        if (value === undefined || value === null) {
            return;
        }

        this.#setSetting("directed", oldValue, { data: { directed: value } });
    }

    /**
     * Layout algorithm to use for positioning nodes.
     * @remarks
     * A catalog id from `catalog.layouts()` (such as `force`, drawn by its default engine) or a
     * registered engine name (such as `ngraph`). Reading it back gives the engine. Some layouts:
     * - `force`: Force-directed, drawn by `ngraph` (3D optimized, recommended)
     * - `d3`: Force-directed, the d3 engine
     * - `circular`: Nodes arranged in a circle
     * - `grid`: Nodes arranged in a grid
     * - `hierarchical`: Tree/DAG layout
     * - `random`: Random positions
     * - `fixed`: Pre-defined positions from node data
     * @since 1.0.0
     * @see {@link layoutConfig} for layout-specific options
     * @see {@link https://graphty.app/storybook/graphty-element/?path=/story/layout-3d--circular | Layout Examples}
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
        return this.#layoutPair().engine;
    }
    /**
     * Sets the layout algorithm: one undoable step, which undo takes back to the layout, the
     * engine and the options before it. Assigned with `layoutConfig` in the same tick, the two are
     * one step.
     */
    set layout(value: string | undefined) {
        const oldValue = this.layout;

        if (value) {
            // The options go with the layout they were set for: those still waiting beside it, or
            // those it is drawn with already when the same layout is assigned again.
            const pair = this.#layoutPair();
            this.#setLayoutPair(value, pair.pending || pair.engine === value ? pair.options : {});
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
        return this.#layoutPair().options;
    }
    /**
     * Sets layout-specific configuration: the layout is drawn again with it, as one undoable step.
     */
    set layoutConfig(value: Record<string, unknown> | undefined) {
        const oldValue = this.layoutConfig;
        this.#setLayoutPair(this.#layoutPair().engine ?? DEFAULT_LAYOUT.engine, value ?? {});
        this.requestUpdate("layoutConfig", oldValue);
    }

    /**
     * The layout as assigned: the choice waiting its turn, or the one the graph is drawn with.
     * @returns The engine and its options, and whether they are still waiting.
     */
    #layoutPair(): { engine?: string; options: Readonly<Record<string, unknown>>; pending: boolean } {
        const dispatcher = dispatcherOf(this.#graph.getSession());
        const waiting = dispatcher.pendingCommand(ELEMENT_LAYOUT) as LayoutSetCommand | undefined;
        if (waiting !== undefined) {
            return { engine: waiting.engine, options: waiting.options ?? {}, pending: true };
        }

        const choice = dispatcher.state.layout;
        return { engine: choice?.engine, options: choice?.options ?? {}, pending: false };
    }

    /**
     * Choose a layout from the property pair, as one step. A catalog id ("force") is drawn by
     * its default engine; an engine name maps to the catalogue id it serves, and the slice keeps
     * the engine itself.
     * @param name - The catalog id or the engine name.
     * @param options - Its options.
     */
    #setLayoutPair(name: string, options: Readonly<Record<string, unknown>>): void {
        const descriptor = layoutDescriptor(name);
        void dispatcherOf(this.#graph.getSession())
            .dispatch({
                op: "layout.set",
                id: descriptor?.id ?? layoutIdForEngine(name) ?? name,
                engine: descriptor?.engine ?? name,
                options: { ...options },
                coalesce: ELEMENT_LAYOUT,
                ...(this.#settingUp ? { setup: true } : {}),
            })
            // A layout that cannot be built is reported on the error event by the layout itself.
            .catch(() => undefined);
    }

    /**
     * What the layout runs over: a set, a query, a list of nodes -- any scope.
     * @remarks
     * The scope's nodes move and every other node is held where it is. The members are the ones
     * the scope had when the layout started, so a later click, filter change or attribute edit
     * does not move what the layout holds, and a node added afterwards is held too.
     *
     * CARRIED across `layout` and `layoutConfig` changes, so changing one force setting never
     * un-scopes the layout. Setting it restarts the running layout. Only a live simulation --
     * whose catalogue entry reads `scoped: true` -- lays out a scope; under any other layout, or
     * when the set it names is removed, the scope is inactive and the whole graph is laid out.
     * Nothing here throws: a value that is not a scope is reported and dropped.
     *
     * Reads `undefined` when layouts run over the whole graph, never `"graph"`.
     * @since 2.5.0
     * @example JavaScript property
     * ```typescript
     * const id = element.session.sets.create({ kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" });
     * element.layout = "ngraph";
     * element.layoutScope = { set: id };
     * ```
     * @example HTML attribute (JSON)
     * ```html
     * <graphty-element layout="ngraph" layout-scope='{"nodes":["a","b","c"]}'></graphty-element>
     * ```
     * @returns The scope, or undefined for the whole graph
     */
    @property({
        attribute: "layout-scope",
        // JSON, because a scope is an object or a keyword and Lit's default converter hands the
        // setter the attribute's raw text.
        converter: {
            fromAttribute: (value: string | null): ScopeInput | undefined => {
                if (value === null) {
                    return undefined;
                }

                try {
                    return JSON.parse(value) as ScopeInput;
                } catch {
                    console.error(
                        `<graphty-element>: the layout-scope attribute must be JSON, such as '"graph"' or ` +
                            `'{"set":"s1"}', not "${value}". Laying out the whole graph.`,
                    );

                    return undefined;
                }
            },
            toAttribute: (value: Scope | undefined): string | null =>
                value === undefined ? null : JSON.stringify(value),
        },
    })
    get layoutScope(): Scope | undefined {
        return this.#graph.getLayoutScope();
    }
    /**
     * Sets what the layout runs over, and restarts the running layout over it. A value that is
     * not a scope is reported and dropped, never thrown: this setter is reached from
     * `attributeChangedCallback`, where a throw would reach nobody.
     */
    set layoutScope(value: ScopeInput | undefined) {
        const oldValue = this.#graph.getLayoutScope();
        void this.#graph.setLayoutScope(value).catch((error: unknown) => {
            console.error("<graphty-element>: the layout scope was refused. Keeping the one already set.", error);
        });
        this.requestUpdate("layoutScope", oldValue);
    }

    /**
     * How many node labels the element is drawing, and why the rest are not, as of the last drawn
     * frame. All zeros before data loads. Reading it never forces a frame.
     *
     * The `graphty-label-change` DOM event (detail: the same counts) fires when a count changes,
     * once the view has stopped changing: never during a camera gesture or while a layout is
     * still moving nodes. It also fires once after the first frame that has labels.
     * @since 3.7.0
     * @example
     * ```typescript
     * element.addEventListener("graphty-label-change", () => {
     *     const { labeled, hiddenByOverlap } = element.nodeLabelCounts;
     * });
     * ```
     * @returns The counts.
     */
    get nodeLabelCounts(): NodeLabelCounts {
        return this.#graph.nodeLabelCounts;
    }

    /**
     * How many edge texts the element is drawing -- an edge's label and each end caption count
     * once -- and why the rest are not, as of the last drawn frame. With
     * `layoutBehavior.labels.declutter` on, node labels are kept first and an edge text that would
     * overlap a kept label is hidden and counted in `hiddenByOverlap`. Reading it never forces a
     * frame, so wait for {@link Graphty.waitForStableFrame} first.
     * @since 3.26.0
     * @example
     * ```typescript
     * element.layoutBehavior = { labels: { declutter: true } };
     * await element.waitForStableFrame();
     * const { labeled, hiddenByOverlap } = element.edgeLabelCounts;
     * ```
     * @returns The counts.
     */
    get edgeLabelCounts(): EdgeLabelCounts {
        return this.#graph.edgeLabelCounts;
    }

    /**
     * A node's label as it is drawn: the words on screen, and whether the label is shown at all.
     *
     * `text` is what the reader sees, after the label was bound to the node's data and its markup
     * (`<bold>`, `<color='...'>`) was applied. `drawn` is false when the label is not on screen:
     * its node is hidden, or `layoutBehavior.labels.declutter` hid it to avoid an overlap. A
     * label outside the current view still reads `drawn: true`. Reads the last drawn frame and
     * never forces one, so wait for {@link Graphty.waitForStableFrame} first.
     * @param nodeId - The node's id.
     * @returns The label, or undefined when there is no such node or it has no label.
     * @since 3.15.0
     * @example
     * ```typescript
     * await element.waitForStableFrame();
     * const label = element.labelOf("Valjean"); // { text: "Valjean", drawn: true }
     * ```
     */
    labelOf(nodeId: string | number): NodeLabel | undefined {
        return this.#graph.labelOf(nodeId);
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
     * a reader drags stays where they put it. `labels.declutter` (off by default) hides a node
     * label whose words would be drawn over another label's, keeping a selected node's label
     * first and then the label of the node with more edges; it takes effect on the next frame.
     * {@link Graphty.nodeLabelCounts} says how many it hid. `node.depthIndependentSize` (off by
     * default) draws every node in the 3D view as if it stood at the depth the camera turns about,
     * so a node with a larger size is never drawn smaller because it is farther away -- turn it on
     * when node size shows a value readers compare. `node.outlineWidth` (unset by default) draws
     * every outline's band at that multiple of its own width. `camera.pivotOnSelection` (off by
     * default) makes the selection the camera's pivot: one selected node, or the average position
     * of several, is what the camera turns and zooms about, in 2D, 3D, VR and AR.
     *
     * Merged over what is already set, so naming one field leaves the others alone.
     * @since 2.0.0
     * @example
     * ```typescript
     * element.layoutBehavior = { layout: { preSteps: 1000 } };
     * element.layoutBehavior = { labels: { declutter: true } };
     * element.layoutBehavior = { node: { depthIndependentSize: true } };
     * element.layoutBehavior = { camera: { pivotOnSelection: true } };
     * ```
     * @returns The view preferences set on this element, with the pacing settings saved in the
     *     project (`preSteps`, `stepMultiplier`, `minDelta`) as they are in effect
     */
    @property({ attribute: false })
    get layoutBehavior(): GraphBehaviorConfig | undefined {
        return this.#graph.getLayoutBehavior();
    }
    /**
     * Sets how the element drives the layout.
     *
     * A value the schema refuses is reported and dropped rather than thrown, on the same terms
     * as `background` and `acceleration`.
     */
    set layoutBehavior(value: GraphBehaviorConfig | undefined) {
        const oldValue = this.layoutBehavior;

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

        this.requestUpdate("layoutBehavior", oldValue);
    }

    /**
     * Whether a node label that would be drawn over another label is hidden until the reader
     * zooms in.
     * @remarks
     * A preference of this view, not part of the project: switching it records no undo step and
     * is not saved in a project file. Off (the default), every label is drawn. It takes effect on
     * the next frame. The same switch as `layoutBehavior.labels.declutter`, with a door of its
     * own so a consumer can flip it without assigning `layoutBehavior`, which also carries the
     * project's layout pacing.
     * @since 3.10.0
     * @example
     * ```typescript
     * showAllLabels.onchange = () => {
     *     element.labelDeclutter = !showAllLabels.checked;
     * };
     * ```
     * ```html
     * <graphty-element label-declutter></graphty-element>
     * ```
     * @returns True when overlapping labels are hidden
     */
    @property({ attribute: "label-declutter", type: Boolean })
    get labelDeclutter(): boolean {
        return this.#graph.getLayoutBehavior()?.labels?.declutter === true;
    }
    /**
     * Switches label decluttering on or off.
     */
    set labelDeclutter(value: boolean) {
        const oldValue = this.labelDeclutter;
        this.#graph.setLayoutBehavior({ labels: { declutter: value } });
        this.requestUpdate("labelDeclutter", oldValue);
    }

    /**
     * How fast the 3D view turns on its own, in radians per second.
     * @remarks
     * A preference of this view, not part of the project: setting it records no undo step and is
     * not saved in a project file. 0 (the default) never turns. Above 0 the 3D camera turns about
     * the graph's vertical axis at that speed, and waits while the reader drags, pinches, holds a
     * camera key or drags a node; the 2D view and a VR or AR session never turn. The same setting
     * as `layoutBehavior.camera.autoRotate`, with a door of its own.
     * @since 3.29.0
     * @example
     * ```typescript
     * const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
     * element.autoRotate = still ? 0 : 0.15;
     * ```
     * ```html
     * <graphty-element auto-rotate="0.15"></graphty-element>
     * ```
     * @returns The speed, in radians per second
     */
    @property({ attribute: "auto-rotate", type: Number })
    get autoRotate(): number {
        return this.#graph.getLayoutBehavior()?.camera?.autoRotate ?? 0;
    }
    /**
     * Sets how fast the 3D view turns on its own; a negative or non-finite speed is read as 0.
     */
    set autoRotate(value: number) {
        const oldValue = this.autoRotate;
        this.#graph.setLayoutBehavior({ camera: { autoRotate: Number.isFinite(value) ? Math.max(0, value) : 0 } });
        this.requestUpdate("autoRotate", oldValue);
    }

    /**
     * How many pixels the canvas is drawn with per CSS pixel: a positive number, or `"device"` for
     * the screen's own `devicePixelRatio`, followed as the browser zoom or the screen changes.
     * @remarks
     * 1 (the default) draws one pixel per CSS pixel, which is soft on a high-resolution screen.
     * `"device"` is sharp there, and each frame costs about the square of the ratio more to draw.
     * Every size the element measures on screen stays in CSS pixels whatever this is: fit insets,
     * screen-sized labels, line widths, `nodeScreenPosition`. A preference of this view, not part
     * of the project.
     * @since 3.29.0
     * @example
     * ```html
     * <graphty-element pixel-ratio="device"></graphty-element>
     * ```
     * @returns The ratio
     */
    @property({
        attribute: "pixel-ratio",
        converter: {
            fromAttribute: (value: string | null): PixelRatio => {
                if (value === "device") {
                    return "device";
                }
                return value === null ? 1 : Number(value);
            },
        },
    })
    get pixelRatio(): PixelRatio {
        return this.#graph.pixelRatio;
    }
    /**
     * Sets how many pixels the canvas is drawn with per CSS pixel.
     */
    set pixelRatio(value: PixelRatio) {
        const oldValue = this.pixelRatio;
        this.#graph.setPixelRatio(value);
        this.requestUpdate("pixelRatio", oldValue);
    }

    /**
     * Room, in CSS pixels, that framing the graph keeps clear at each edge of the canvas.
     * @remarks
     * For a page that draws its own panels over part of the canvas. A preference of this view,
     * not part of the project. Every side is 0 by default, so the graph is framed in the whole
     * canvas. Set, zoom-to-fit (on a load, a layout change, a 2D/3D switch and `zoomToFit()`)
     * fits the graph inside what is left and centers it there, and the 3D camera keeps that
     * center while it turns and zooms. Changing it frames the graph again. The canvas still draws
     * everywhere. The same setting as `layoutBehavior.camera.fitInsets`, with a door of its own;
     * a side left out is 0.
     * @since 3.29.0
     * @example
     * ```typescript
     * element.fitInsets = { left: panel.offsetWidth, top: toolbar.offsetHeight };
     * ```
     * @returns The insets
     */
    @property({ attribute: false })
    get fitInsets(): FitInsets {
        return { top: 0, right: 0, bottom: 0, left: 0, ...this.#graph.getLayoutBehavior()?.camera?.fitInsets };
    }
    /**
     * Sets the room framing keeps clear. A value the schema refuses is reported and dropped.
     */
    set fitInsets(value: Partial<FitInsets>) {
        const oldValue = this.fitInsets;
        try {
            this.#graph.setLayoutBehavior({ camera: { fitInsets: value } });
        } catch (error: unknown) {
            console.error("<graphty-element>: the fit insets were refused. Keeping the ones already set.", error);
            return;
        }

        this.requestUpdate("fitInsets", oldValue);
    }

    /**
     * Whether a frame is drawn only when the picture can have changed.
     * @remarks
     * Off (the default), the graph is drawn on every animation frame, still or not. On, it stops
     * drawing once the layout has settled, the styles are painted and the camera is at rest, and
     * draws again as soon as anything changes the picture: data, styles, the layout, the camera,
     * the selection, an animation, or the reader's pointer, wheel or keys on the canvas. A still
     * graph then costs the page nothing per frame -- on a software GPU (a virtual machine, a CI
     * runner, a headless browser) that is tens to hundreds of milliseconds of every frame, and
     * the page's own controls answer that much faster.
     *
     * If your code changes the Babylon.js scene directly (through `graph.scene`), adding or
     * removing a mesh, material, texture, light or camera is drawn, but changing a property of
     * something already there (a material's color, a mesh's position) is not drawn until something
     * else asks for a frame. Leave it off in that case.
     *
     * A preference of this view, not part of the project: switching it records no undo step and
     * is not saved in a project file. The same switch as `layoutBehavior.rendering.onDemand`.
     * @since 3.22.0
     * @example
     * ```html
     * <graphty-element render-on-demand></graphty-element>
     * ```
     * ```typescript
     * element.renderOnDemand = true;
     * ```
     * @returns True when frames are drawn only when the picture can have changed
     */
    @property({ attribute: "render-on-demand", type: Boolean })
    get renderOnDemand(): boolean {
        return this.#graph.getLayoutBehavior()?.rendering?.onDemand === true;
    }
    /**
     * Switches drawing on demand on or off.
     */
    set renderOnDemand(value: boolean) {
        const oldValue = this.renderOnDemand;
        this.#graph.setLayoutBehavior({ rendering: { onDemand: value } });
        this.requestUpdate("renderOnDemand", oldValue);
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
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: false })
    get selectionStyle(): GraphSelectionStyleInput | undefined {
        return this.#setting("selectionStyle") as GraphSelectionStyleInput | undefined;
    }
    /**
     * Sets what a selected node looks like.
     */
    set selectionStyle(value: GraphSelectionStyleInput | undefined) {
        const oldValue = this.selectionStyle;

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

        this.requestUpdate("selectionStyle", oldValue);
    }

    /**
     * Which algorithms to run once data has finished loading, and how.
     * @remarks
     * Run in the order given. Each entry is an algorithm -- a catalogue key such as "pagerank" or
     * a 1.x address such as "graphty:pagerank" -- or an object carrying the algorithm and the
     * run options that make sense on load: `{ algorithm, params?, style?, seed?, as? }`, the same
     * options `session.runs.start` takes. `style: { size: [1, 5] }` colours AND sizes the nodes
     * by the result, exactly as it does there.
     *
     * This is the LIST; `runAlgorithmsOnLoad` is the switch that decides whether the list is
     * honoured, and a switch with an empty list beside it does nothing.
     *
     * A malformed entry is refused with a `GraphtyError` coded `E_BAD_COMMAND` naming the entry
     * and its index, and the list already set is kept.
     *
     * A property only, with no HTML attribute: how markup should declare load-time runs is left
     * to a declarative child-element design rather than a JSON string in an attribute.
     * @since 2.0.0
     * @example
     * ```typescript
     * element.algorithmsOnLoad = ["degree", { algorithm: "pagerank", style: { size: [1, 5] } }];
     * element.runAlgorithmsOnLoad = true;
     * ```
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: false })
    get algorithmsOnLoad(): readonly AlgorithmOnLoad[] | undefined {
        return this.#setting("data.algorithms") as readonly AlgorithmOnLoad[] | undefined;
    }
    /**
     * Sets which algorithms run once data has finished loading.
     * @throws A `GraphtyError` coded `E_BAD_COMMAND` naming the first malformed entry.
     */
    set algorithmsOnLoad(value: readonly AlgorithmOnLoad[] | undefined) {
        if (value !== undefined) {
            parseAlgorithmsOnLoad(value);
        }

        this.#setSetting("algorithmsOnLoad", this.algorithmsOnLoad, {
            data: { algorithms: value as AlgorithmOnLoad[] | undefined },
        });
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
     * @see {@link https://graphty.app/storybook/graphty-element/?path=/story/viewmode--switch-view-modes | View Mode Examples}
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
        return this.#graph.getViewMode();
    }
    /**
     * Sets the view mode. Switching between 2D and 3D is one undoable step; entering VR or AR is
     * not a step, and from 2D it switches to 3D first in the same step.
     */
    set viewMode(value: ViewMode | undefined) {
        const oldValue = this.viewMode;

        if (value !== undefined) {
            void this.#graph.setViewMode(value).catch(() => undefined);
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
        const mode = this.viewMode;
        if (mode === "2d") {
            return true;
        }

        if (mode === "3d") {
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
     * @returns The background set on this element, else the one in effect
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
        return this.#setting("background") as GraphBackgroundConfig | undefined;
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
        const oldValue = this.background;

        if (value !== undefined) {
            try {
                this.#graph.setBackground(value);
            } catch (error: unknown) {
                console.error("<graphty-element>: the background was refused. Keeping the one already set.", error);

                return;
            }
        }

        this.requestUpdate("background", oldValue);
    }

    /**
     * What the map under the `location-map` layout is doing: its source, `state` (`off`, `loading`,
     * `ready`, or `fallback` when its pictures failed and the bundled world image shows instead), and
     * `attribution`, the credits of everything drawn, which must be visible whenever the map is.
     * @since 3.31.0
     * @returns The status
     */
    get basemapStatus(): BasemapStatus {
        return this.#graph.basemapStatus;
    }

    /**
     * How the active `location-map` layout lays out its map: the surface, the box a flat map
     * shows or a globe's radius, where it read the locations (the columns it used, the half of a
     * pair it found itself, or the column and its format), and the ids of the nodes it could not
     * place. Null while no map layout has drawn.
     * @since 3.31.0
     * @returns The facts, or null
     */
    get mapFrame(): MapFrameFact | null {
        return this.#graph.mapFrame;
    }

    /**
     * How far above the canvas's bottom edge the map's credits sit, in CSS pixels.
     * @remarks
     * The element draws the credits of the map under the `location-map` layout in the canvas's
     * bottom-right corner, as every map source's terms require. A page that draws its own controls
     * over that edge sets this to their height, so the credits stay in sight. 0 (the default) is
     * the corner. A preference of this view, not saved with the project.
     * @since 3.31.0
     * @example
     * ```html
     * <graphty-element attribution-offset="56"></graphty-element>
     * ```
     * @returns The offset
     */
    @property({ attribute: "attribution-offset", type: Number })
    get attributionOffset(): number {
        return this.#attributionOffset;
    }
    /**
     * Moves the map's credits up from the corner.
     */
    set attributionOffset(value: number) {
        const oldValue = this.#attributionOffset;
        this.#attributionOffset = Number.isFinite(value) ? Math.max(0, value) : 0;
        this.#graph.setAttributionOffset(this.#attributionOffset);
        this.requestUpdate("attributionOffset", oldValue);
    }

    /** See {@link attributionOffset}. */
    #attributionOffset = 0;

    /**
     * How long every animated camera move takes, in milliseconds.
     * @remarks
     * Fitting the graph, a preset view and the glide to a picked node each animate over their own
     * time. Set, every one takes this long instead; 0 moves the camera at once, which a page sets
     * when its reader prefers reduced motion (`matchMedia("(prefers-reduced-motion: reduce)")`).
     * Unset (the default), each move keeps its own. A preference of this view, not saved with the
     * project.
     * @since 3.31.0
     * @example
     * ```typescript
     * element.cameraTransitionDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : undefined;
     * ```
     * @returns The duration, or undefined
     */
    @property({ attribute: "camera-transition-duration", type: Number })
    get cameraTransitionDuration(): number | undefined {
        return this.#graph.getCameraTransitionDuration();
    }
    /**
     * Sets how long camera moves take.
     */
    set cameraTransitionDuration(value: number | undefined) {
        const oldValue = this.cameraTransitionDuration;
        this.#graph.setCameraTransitionDuration(
            value === undefined || value === null || !Number.isFinite(value) ? undefined : value,
        );
        this.requestUpdate("cameraTransitionDuration", oldValue);
    }

    /**
     * How far the camera starts from the graph, in scene units.
     * @remarks
     * Set, it places the 3D camera at this distance from the orbit center (never closer than the
     * minimum zoom distance) and gives the 2D camera the same view height, and the element stops
     * framing the graph on its own after a data load or a layout change. `zoomToFit()` still
     * frames it when called. Unset (the default), every load is framed to fit. Setting it on a
     * running graph moves the camera.
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

        try {
            // A removed attribute arrives as null, and means "no distance": frame to fit again.
            this.#graph.setStartingCameraDistance(value ?? undefined);
        } catch (error: unknown) {
            console.error(
                "<graphty-element>: the starting camera distance was refused. Keeping the one already set.",
                error,
            );

            return;
        }

        this.#startingCameraDistance = value;
        this.requestUpdate("startingCameraDistance", oldValue);
    }

    /**
     * Whether the camera frames the graph on its own after a data load or a layout change.
     * @remarks
     * On (the default), every load and layout change is framed to fit, as long as no
     * `startingCameraDistance` is set. Off, a load or a layout change leaves the camera where it
     * is, and a re-frame already following a moving layout stops. `zoomToFit()` frames the graph
     * either way. A preference of this view, not part of the project: switching it records no
     * undo step and is not saved in a project file. Independent of `startingCameraDistance`, so
     * turning framing off needs no invented distance.
     *
     * The attribute is on unless it reads `"false"`: `auto-frame="false"` turns framing off, and
     * removing the attribute turns it back on.
     * @since 3.10.0
     * @example
     * ```typescript
     * reframe.onchange = () => {
     *     element.autoFrame = reframe.checked;
     * };
     * ```
     * ```html
     * <graphty-element auto-frame="false"></graphty-element>
     * ```
     * @returns True when the camera frames each load and layout change
     */
    @property({
        attribute: "auto-frame",
        converter: {
            fromAttribute: (value: string | null): boolean => value !== "false",
        },
    })
    get autoFrame(): boolean {
        return this.#graph.getAutoFrame();
    }
    /**
     * Switches the camera's own framing on or off.
     */
    set autoFrame(value: boolean) {
        const oldValue = this.autoFrame;
        this.#graph.setAutoFrame(value);
        this.requestUpdate("autoFrame", oldValue);
    }

    /**
     * Whether the mouse wheel zooms toward the point under the pointer.
     * @remarks
     * Off (the default), the wheel zooms toward the center of the view. On, it zooms toward the
     * point under the pointer, so a node under the pointer stays under it while the view grows or
     * shrinks around it; in 3D the point is taken on the plane through the point the camera turns
     * about. A preference of this view, not part of the project: switching it records no undo step
     * and is not saved in a project file.
     *
     * The attribute is off unless it is present and not `"false"`.
     * @since 3.32.0
     * @example
     * ```typescript
     * element.zoomToPointer = true;
     * ```
     * ```html
     * <graphty-element zoom-to-pointer></graphty-element>
     * ```
     * @returns True when the wheel zooms toward the pointer
     */
    @property({
        attribute: "zoom-to-pointer",
        converter: {
            fromAttribute: (value: string | null): boolean => value !== null && value !== "false",
        },
    })
    get zoomToPointer(): boolean {
        return this.#graph.getZoomToPointer();
    }
    /**
     * Switches zooming toward the pointer on or off.
     */
    set zoomToPointer(value: boolean) {
        const oldValue = this.zoomToPointer;
        this.#graph.setZoomToPointer(value);
        this.requestUpdate("zoomToPointer", oldValue);
    }

    /**
     * Whether the camera was placed since the element last framed the graph on its own.
     * @remarks
     * True once the reader zooms, turns or pans the view with the mouse, a touch or a key, or the
     * camera state is set, until the next data load or layout change asks for framing again.
     * While it is true the element's own framing leaves the camera alone. A consumer that frames
     * the graph on its own initiative -- when a key laid over the canvas grows over a node, say --
     * checks it too, so it never takes the reader's zoom away. `zoomToFit()` frames the graph
     * either way.
     * @since 3.26.0
     * @example
     * ```typescript
     * if (element.autoFrame && !element.cameraPlaced && element.nodesInRect(keyBox).length > 0) {
     *     element.zoomToFit();
     * }
     * ```
     * @returns True while the camera stands where somebody placed it
     */
    get cameraPlaced(): boolean {
        return this.#graph.isCameraPlaced();
    }

    /**
     * How the 3D nodes are lit.
     * @remarks
     * - `"studio"` (the default): a light that follows the camera, a soft fill with a light ground,
     *   and a rim that lifts each node's own color toward its edge. No side of a node goes dark from
     *   any angle, and no pixel is lifted to white: the brightest is about 1.07 times the style
     *   color's lightness.
     * - `"headlight"`: the same lights without the rim. Never brighter than the style color.
     * - `"matte"`: one soft light from above, no highlight. A lit face is exactly the style color
     *   at most; shapes read flatter and darker than `"studio"`.
     * - `"flat"`: unlit. Every pixel of a node is exactly its style color, with a thin dark
     *   outline.
     *
     * 2D view is always drawn flat. Switching takes effect on the next frame. A preference of
     * this view, not part of the project: switching it records no undo step and is not saved in a
     * project file. A value that is not one of the four is reported and ignored.
     * @since 3.25.0
     * @example
     * ```html
     * <graphty-element lighting="flat"></graphty-element>
     * ```
     * ```typescript
     * element.lighting = "matte";
     * ```
     * @returns The lighting in effect
     */
    @property({ attribute: "lighting" })
    get lighting(): Lighting {
        return this.#graph.getLighting();
    }
    /**
     * Sets how the 3D nodes are lit.
     */
    set lighting(value: Lighting) {
        const oldValue = this.lighting;

        try {
            // A removed attribute arrives as null, and means the default.
            this.#graph.setLighting(value ?? DEFAULT_LIGHTING);
        } catch (error: unknown) {
            console.error("<graphty-element>: the lighting was refused. Keeping the one already set.", error);

            return;
        }

        this.requestUpdate("lighting", oldValue);
    }

    /**
     * Margins of the canvas that something laid over it covers, such as a key or a toolbar, in CSS
     * pixels per side.
     * @remarks
     * Every fit keeps the graph out of them: the framing after a load or a layout change,
     * `zoomToFit()`, and the `fitToGraph` camera view. In 3D the camera also centers what it looks
     * at on the part left free. Changing them moves nothing: what is drawn stays where it is, and
     * the next fit keeps clear of the new margins. To frame the graph at once only when the
     * overlay now hides a node, ask {@link nodesInRect} for its rectangle and call `zoomToFit()`,
     * unless {@link cameraPlaced} says the reader has placed the camera since the last framing.
     * A preference of this view, not part of the project: not saved in a project file. A side
     * left out is 0.
     * @since 3.17.0
     * @example
     * ```typescript
     * // A key 260 pixels wide sits over the canvas's left edge.
     * element.viewInsets = { left: 260 };
     * ```
     * @returns The insets in force, every side filled in
     */
    @property({ attribute: false })
    get viewInsets(): ViewInsets {
        return this.#graph.getViewInsets();
    }
    /**
     * Sets the view insets.
     */
    set viewInsets(value: ViewInsets | undefined) {
        const oldValue = this.viewInsets;
        this.#graph.setViewInsets(value);
        this.requestUpdate("viewInsets", oldValue);
    }

    /**
     * Whether to run the algorithms listed in `algorithmsOnLoad` once data has loaded.
     * @remarks
     * A boolean attribute: its presence turns it on, as `hidden` does. It was read as a string,
     * so `<graphty-element run-algorithms-on-load>` handed the setter "" -- which is false -- and
     * the documented HTML form ran nothing.
     * @returns The value set on this element, else the value in effect (undefined when that is none)
     */
    @property({ attribute: "run-algorithms-on-load", type: Boolean })
    get runAlgorithmsOnLoad(): boolean | undefined {
        return this.#setting("runAlgorithmsOnLoad") as boolean | undefined;
    }
    /**
     * Sets whether to run algorithms when a style template loads. Updates graph configuration.
     */
    set runAlgorithmsOnLoad(value: boolean | undefined) {
        this.#setSetting("runAlgorithmsOnLoad", this.runAlgorithmsOnLoad, { runAlgorithmsOnLoad: value ?? undefined });
    }

    #historyKeys = true;

    /**
     * Whether the element handles the undo keys itself: Ctrl+Z (Cmd+Z on macOS) undoes one step
     * and Ctrl+Shift+Z or Ctrl+Y redoes it, while the graph's canvas has keyboard focus. On by
     * default. A handled key has its default prevented, so a host page binding the same keys
     * skips a keydown whose `defaultPrevented` is set; or turns this off with
     * `history-keys="false"` and calls `session.undo()` itself.
     * @returns Whether the undo keys are handled.
     * @since 3.0.0
     */
    @property({
        attribute: "history-keys",
        converter: { fromAttribute: (value: string | null) => value !== "false" },
    })
    get historyKeys(): boolean {
        return this.#historyKeys;
    }
    /**
     * Turns the element's own undo keys on or off.
     */
    set historyKeys(value: boolean) {
        const oldValue = this.#historyKeys;
        this.#historyKeys = value;
        this.#graph.input.updateConfig({ historyKeys: value });
        this.requestUpdate("historyKeys", oldValue);
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
     * One node of a shape and color drawn alone, exactly as the graph draws its nodes (the same
     * mesh, material and lighting), on a transparent background: a picture of a 3D shape for a
     * key, a legend or a picker. Each picture is drawn once and kept, by shape, color, size, 2D or
     * 3D and lighting.
     * @param options - The shape (`node.shape`'s values), its color (a mid gray when left out) and
     *     the picture's size in pixels (32 when left out).
     * @returns The picture as a PNG data URL.
     * @example
     * ```typescript
     * const img = document.createElement("img");
     * img.src = await element.nodeThumbnail({ shape: "icosahedron", color: "#0072B2" });
     * ```
     */
    async nodeThumbnail(options: NodeThumbnailOptions): Promise<string> {
        return this.#graph.nodeThumbnail(options);
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
     * Move the camera one step nearer or further, the way a Zoom in or Zoom out button does.
     * One step is a factor of 1.25 on the 3D camera's distance or the 2D camera's zoom. Not an
     * undoable step: the camera is view state.
     * @param direction - `"in"` to approach, `"out"` to withdraw.
     * @param options - Animation options
     * @returns Promise that resolves when the camera has moved
     * @since 3.0.0
     * @example
     * ```typescript
     * await element.zoomStep("out");
     * ```
     */
    async zoomStep(
        direction: "in" | "out",
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.#graph.zoomStep(direction, options);
    }

    /**
     * Center the camera on the selection -- its nodes and the ends of its edges -- keeping where
     * it stands. With nothing selected
     * the camera does not move. Not an undoable step: the camera is view state.
     * @param options - Animation options
     * @returns Promise that resolves when the camera has moved
     * @since 3.0.0
     * @example
     * ```typescript
     * await element.session.selection.apply({ nodes: ["n1"] });
     * await element.zoomToSelection();
     * ```
     */
    async zoomToSelection(options?: import("./screenshot/types.js").CameraAnimationOptions): Promise<void> {
        return this.#graph.zoomToSelection(options);
    }

    /**
     * Frame the given nodes: the camera moves so the box around them fills the view.
     *
     * Works the same in 2D and 3D. Ids that name no node are skipped; when none of them names a
     * node the camera does not move. The camera is view state, so this is not an undoable step.
     * @param nodeIds - One node id, or several.
     * @param options - Optional animation configuration.
     * @returns Promise that resolves when the camera has moved.
     * @since 3.3.0
     * @example
     * ```typescript
     * await element.zoomToNodes(["n1", "n2"], { animate: true });
     * ```
     */
    async zoomToNodes(
        nodeIds: (string | number) | readonly (string | number)[],
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.#graph.zoomToNodes(nodeIds, options);
    }

    /**
     * Save the current camera state as a named preset. One undoable step.
     * @param name - Name for the preset
     * @param camera - The camera state to save instead of where the camera is now
     * @throws A `GraphtyError` with `E_PROTECTED` when a camera view already answers to the name.
     */
    saveCameraPreset(name: string, camera?: import("./screenshot/types.js").CameraState): void {
        this.#graph.saveCameraPreset(name, camera);
    }

    /**
     * Forget a preset saved with `saveCameraPreset` or `importCameraPresets`. One undoable step.
     * @param name - The name it was saved under
     * @returns Settles once the step is recorded; rejects with `E_BAD_COMMAND` when nothing is
     *   saved under the name
     */
    removeCameraPreset(name: string): Promise<void> {
        return this.#graph.removeCameraPreset(name);
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
     * Import user-defined presets from JSON, as one undoable step
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
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

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
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

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
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

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
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

        return this.#graph.addEdges(edges, options);
    }

    /**
     * Remove nodes from the graph, and every edge attached to one, as one undoable step.
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
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

        return this.#graph.removeNodes(nodeIds, options);
    }

    /**
     * Remove edges from the graph, as one undoable step.
     * @param edgeIds - The element-assigned edge ids
     * @param options - Queue options for operation ordering
     * @returns Promise that resolves when the edges are removed
     * @example
     * ```typescript
     * await element.removeEdges(['0', '3']);
     * ```
     */
    async removeEdges(edgeIds: string[], options?: import("./utils/queue-migration").QueueableOptions): Promise<void> {
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

        return this.#graph.removeEdges(edgeIds, options);
    }

    /**
     * Update node data, as one undoable step.
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
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

        return this.#graph.updateNodes(updates, options);
    }

    /**
     * Update edge data, as one undoable step. Keys not named are kept; an id the graph does not
     * hold is skipped.
     * @param updates - The edge id and the new values of each edge
     * @param options - Queue options for operation ordering
     * @returns Promise that resolves when the edges are updated
     * @example
     * ```typescript
     * await element.updateEdges([{ id: "0", label: "knows" }]);
     * ```
     */
    async updateEdges(
        updates: { id: string; [key: string]: unknown }[],
        options?: import("./utils/queue-migration").QueueableOptions,
    ): Promise<void> {
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

        return this.#graph.updateEdges(updates, options);
    }

    /**
     * Add data from a data source.
     *
     * Every load has an id: the promise resolves to it, and every load event about this load
     * (`data-loading-progress`, `data-loading-complete`, `data-loading-error`, `data-loaded`)
     * carries it as `loadId`. A source with no nodes and no edges rejects with `E_EMPTY_LOAD`.
     * @param type - Data source type (e.g., "json", "csv", "graphml")
     * @param opts - Data source configuration options
     * @param options - How to load
     * @param options.replace - Replace the graph with this data, but only once it has all parsed:
     *     a malformed or empty source rejects and leaves the current graph untouched
     * @returns Promise that resolves to `{ loadId }` when data is loaded
     * @since 1.5.0
     * @example
     * ```typescript
     * const { loadId } = await element.addDataFromSource('json', { url: 'https://example.com/data.json' });
     * ```
     */
    async addDataFromSource(type: string, opts?: object, options?: { replace?: boolean }): Promise<{ loadId: number }> {
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

        return this.#graph.addDataFromSource(type, opts ?? {}, options);
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
     * @param options.replace - Replace the graph with this data, but only once it has all parsed:
     *     a malformed or empty file rejects and leaves the current graph untouched
     * @param options.graphIndex - Which graph to read, by position, from a file that holds several
     *     (`listGraphs` from `@graphty/graphty-element/catalog` lists them); the first by default
     * @param options.graphName - Which graph to read, by name, from a file that holds several
     * @param options.styles - `"file"` also draws the file's own styles (colors, sizes, shapes,
     *     labels) as style layers, so the graph looks as it does in the program that wrote it;
     *     `"none"` (the default) loads the data alone
     * @param options.styleOptions - How the file's styles are turned into layers
     * @param options.layout - `"recommended"` chooses a layout for what was loaded once it is loaded:
     *     `fixed`, which draws each node where the file put it, when every node arrived with a position,
     *     and a computed one otherwise. `"keep"` (the default) leaves the layout as it is
     * @returns Promise that resolves to `{ loadId }`, the id every event about this load carries
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
            replace?: boolean;
            graphIndex?: number;
            graphName?: string;
            styles?: "file" | "none";
            styleOptions?: FileStyleOptions;
            layout?: "recommended" | "keep";
        },
    ): Promise<{ loadId: number }> {
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

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
     * @param options.replace - Replace the graph with this data, but only once it has all parsed:
     *     a malformed or empty file rejects and leaves the current graph untouched
     * @param options.graphIndex - Which graph to read, by position, from a file that holds several
     *     (`listGraphs` from `@graphty/graphty-element/catalog` lists them); the first by default
     * @param options.graphName - Which graph to read, by name, from a file that holds several
     * @param options.styles - `"file"` also draws the file's own styles (colors, sizes, shapes,
     *     labels) as style layers, so the graph looks as it does in the program that wrote it;
     *     `"none"` (the default) loads the data alone
     * @param options.styleOptions - How the file's styles are turned into layers
     * @param options.layout - `"recommended"` chooses a layout for what was loaded once it is loaded:
     *     `fixed`, which draws each node where the file put it, when every node arrived with a position,
     *     and a computed one otherwise. `"keep"` (the default) leaves the layout as it is
     * @returns Promise that resolves to `{ loadId }`, the id every event about this load carries
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
            replace?: boolean;
            graphIndex?: number;
            graphName?: string;
            styles?: "file" | "none";
            styleOptions?: FileStyleOptions;
            layout?: "recommended" | "keep";
        },
    ): Promise<{ loadId: number }> {
        const held = this.#afterRestore();
        if (held !== undefined) {
            await held;
        }

        return this.#graph.loadFromFile(file, options);
    }

    /**
     * Write the graph in a file format: data, current positions, algorithm results and the drawn
     * colours and sizes, wherever the format has a place for them. `losses` lists everything the
     * format could not hold, as codes with the columns and counts they are about.
     * @param format - The format id, as `session.catalog.formats()` lists it ("graphml", "gexf",
     *     "json", "csv", "gml", "dot", "pajek", "graphty" for the project file, or a registered
     *     writer's id)
     * @param options - The writer's options; `{ variant: "neo4j" }` with "csv" writes a Neo4j
     *     admin-import file; `{ notes: true }` adds the `graphty.notes.count` and
     *     `graphty.notes.text` columns (notes are left out by default, and reported as
     *     `W_GRAPHTY_NOTES`)
     * @returns What the export loses, and the document as `text()` or as UTF-8 `bytes`
     * @since 3.0.0
     * @example
     * ```typescript
     * const result = await element.exportGraph("graphml");
     * for (const loss of result.losses) console.warn(loss.code, loss.params.columns, loss.params.count);
     * download(await result.text());
     * ```
     */
    async exportGraph(format: FormatId, options?: ExportGraphOptions): Promise<ExportResult> {
        return this.#graph.exportGraph(format, options);
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
        this.#pin(ids, true);
    }

    /**
     * Release nodes a reader or a drag pinned, so the layout arranges them again.
     * @param ids - one node id, or several
     * @since 2.0.0
     */
    unpin(ids: (string | number) | readonly (string | number)[]): void {
        this.#pin(ids, false);
    }

    /**
     * Pin or release the nodes that answer to these ids, in either spelling, as one step. An id
     * nothing answers to is skipped, as it always has been; `session.positions.pin` is the verb
     * that reports one.
     * @param ids - One node id, or several.
     * @param pinned - Pin, or release.
     */
    #pin(ids: (string | number) | readonly (string | number)[], pinned: boolean): void {
        const nodes = (Array.isArray(ids) ? ids : [ids as string | number]).flatMap(
            (id) => this.#graph.getNode(id)?.id ?? [],
        );
        void dispatcherOf(this.#graph.getSession()).dispatchNow({ op: "positions.pin", ids: nodes, pinned });
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
     *
     * It starts the style edits and returns at once. To wait for the picture -- for a
     * screenshot, an export or a test -- await `waitForStableFrame()` after the call: it
     * settles only once every suggested layer is added, stacked in the order named and painted.
     * @param algorithmKey - A catalogue key such as "degree", a 1.10 address such as
     *     "graphty:degree", or an array of either.
     * @returns True if anything was applied, false when no finished run of that algorithm has
     *     anything per element to paint.
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.run('degree', undefined, { style: false });
     * element.applySuggestedStyles('degree');
     * await element.waitForStableFrame();
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
     *
     * Takes a layout id from `catalog.layouts()` (such as `"force"`), which runs that layout's
     * default engine, or a registered engine name (such as `"ngraph"`).
     * @param type - Layout id or engine name
     * @param opts - Layout-specific options
     * @param options - Queue options, and `scope`: what the layout runs over. A live simulation
     *   moves the scope's nodes and holds the rest; absent keeps the scope already set, and
     *   `"graph"` clears it. See {@link Graphty.layoutScope}.
     * @returns Promise that resolves when layout is initialized
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.setLayout('circular', { scale: 2 });
     * await element.setLayout('force'); // the catalogue id; runs the "ngraph" engine
     * await element.setLayout('ngraph', { springLength: 100 });
     * ```
     */
    async setLayout(
        type: string,
        opts?: object,
        options?: import("./utils/queue-migration").SetLayoutOptions,
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
     *
     * It does not wait for a frame either, and only a frame moves a new node's mesh to its layout
     * position: {@link Graphty.nodeScreenPosition} read right after this can still report a new
     * node at its mesh template's position, off screen. Wait for
     * {@link Graphty.waitForStableFrame} before reading where nodes are drawn.
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
     * finished framing what it arrived at, a frame has been drawn showing that, and that frame's
     * {@link Graphty.nodeLabelCounts} have been announced (`graphty-label-change`, when they
     * changed), so a page that shows the counts shows the final ones. This is what a screenshot, a video frame or a visual regression snapshot needs: the `graph-settled`
     * event fires one update pass earlier, before the final framing has even been requested, so
     * a picture taken on that event is a picture of a camera still in motion.
     *
     * With `autosave` on, it also waits for the restore to be decided and for the data the page
     * declared, which waits behind it, so it never resolves on the empty canvas before either.
     *
     * It rejects, naming what was still moving, rather than handing back a moving picture. When
     * the element is removed from the page during the wait, or already had been when the wait
     * started, it rejects at once with `E_DISPOSED`: a removed element never draws again.
     * @param options - How the wait is bounded.
     * @param options.timeoutMs - How long to wait before giving up; 30 seconds by default.
     * @returns Promise that resolves once a frame of the finished picture has been drawn.
     * @throws Error when the picture is still changing when the timeout expires.
     * @throws A `GraphtyError` with `E_DISPOSED` when the element leaves the page before or during
     *   the wait.
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
     * Make several changes one undoable step.
     *
     * `fn` receives `tx`, the session as seen from inside the step: what it does through `tx` is
     * recorded as one step once `fn` settles, and a throw rolls all of it back. A call on the
     * element itself while `fn` runs is a step of its own, and logs a warning naming the `tx`
     * verb to use instead. The same as `session.transaction`, with a default label.
     * @param fn - The changes, made through `tx`.
     * @param label - The step's label in the history.
     * @returns Once the step is recorded and drawn.
     * @since 1.5.0
     * @example
     * ```typescript
     * await element.batchOperations(async (tx) => {
     *   await tx.data.addNodes(nodes);
     *   await tx.data.addEdges(edges);
     *   await tx.layout.set("circular");
     * });
     * ```
     */
    async batchOperations(fn: (tx: TransactionScope) => Promise<void> | void, label?: string): Promise<void> {
        return this.#graph.batchOperations(fn, label);
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
     * @param options.scope - What to frame. Absent frames the whole graph. `"selection"` frames the
     *   selected nodes and both ends of every selected edge.
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
            scope?: ScopeInput;
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
     * A pause holds until `setRunning(true)`. Loading more nodes, a freeze, an accelerator
     * attaching, setting another layout and dragging a node all still happen -- new nodes are
     * placed and a dragged node moves -- but none of them resumes the layout. To tell a paused,
     * half-finished arrangement from a converged one, read `getLayoutManager().isPaused` and
     * `isSettled`.
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
     * Where a node is drawn on screen, and whether it can be seen there.
     *
     * `x` and `y` are the node's centre in CSS pixels from the element's top-left corner, the
     * same pixels {@link worldToScreen} returns: a click there selects the node. `visible` is
     * false when the centre is outside the element, behind the camera, or the node is hidden by
     * a filter. `radius` is how big the node is drawn, in pixels; `bounds` is the rectangle it
     * covers, which follows a box's corners or a tall node's height. Read it again after the camera
     * or the layout moves; it is not a live value. It reads where a frame drew the node, so a node
     * no frame has drawn yet reports its mesh template's position, off screen and not visible:
     * wait for {@link Graphty.waitForStableFrame} first.
     * @param nodeId - The node's id.
     * @returns The position, or undefined for an id the graph does not hold.
     * @since 3.15.0
     * @example
     * ```typescript
     * await element.waitForStableFrame();
     * const at = element.nodeScreenPosition("Valjean");
     * if (at?.visible) {
     *     marker.style.left = `${at.x - at.radius}px`;
     *     marker.style.top = `${at.y - at.radius}px`;
     * }
     * ```
     */
    nodeScreenPosition(nodeId: string | number): NodeScreenPosition | undefined {
        return this.#graph.nodeScreenPosition(nodeId);
    }

    /**
     * The nodes drawn, even in part, inside a rectangle of the element -- what something laid over
     * that part of the canvas hides. A node counts when {@link nodeScreenPosition} calls it visible
     * and its drawn disc reaches into the rectangle. Read it again after the camera or the layout
     * moves; it is not a live value.
     * @param rect - The rectangle, CSS pixels from the element's top-left corner.
     * @param rect.x - Its left edge.
     * @param rect.y - Its top edge.
     * @param rect.width - Its width.
     * @param rect.height - Its height.
     * @returns The ids of the nodes inside, in the graph's order; empty when none is.
     * @since 3.17.0
     * @example
     * ```typescript
     * // A key over the canvas grew: frame the graph again only when it now hides a node, and the
     * // reader has not placed the camera since the last framing.
     * element.viewInsets = { top: key.offsetTop + key.offsetHeight };
     * const box = { x: key.offsetLeft, y: key.offsetTop, width: key.offsetWidth, height: key.offsetHeight };
     * if (!element.cameraPlaced && element.nodesInRect(box).length > 0) {
     *     element.zoomToFit();
     * }
     * ```
     */
    nodesInRect(rect: { x: number; y: number; width: number; height: number }): (string | number)[] {
        const inside: (string | number)[] = [];
        for (const node of this.#graph.getNodes()) {
            const at = this.#graph.nodeScreenPosition(node.id);
            if (
                at?.visible === true &&
                at.x + at.radius > rect.x &&
                at.x - at.radius < rect.x + rect.width &&
                at.y + at.radius > rect.y &&
                at.y - at.radius < rect.y + rect.height
            ) {
                inside.push(node.id);
            }
        }

        return inside;
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

    /**
     * The node under a point on the element: the node a click at that point would select.
     * @remarks
     * The point is in CSS pixels from the element's top-left corner, as `worldToScreen` returns.
     * For a pointer event, that is `event.clientX - rect.left` and `event.clientY - rect.top`
     * with `rect = element.getBoundingClientRect()`. A point on empty canvas gives `null`.
     *
     * Only nodes are found today: a point on an edge gives what is behind it, usually `null`.
     * The result's `kind` already allows `"edge"`, so handle it; edges will be returned there
     * once they can be clicked.
     * @param point - The point, in CSS pixels from the element's top-left corner.
     * @param point.x - X coordinate
     * @param point.y - Y coordinate
     * @returns `{ kind: "node", id }`, or `null` when no node is there.
     * @since 3.15.0
     * @example
     * ```typescript
     * element.addEventListener("contextmenu", (e) => {
     *   const rect = element.getBoundingClientRect();
     *   const hit = element.elementAt({ x: e.clientX - rect.left, y: e.clientY - rect.top });
     *   if (hit?.kind === "node") {
     *     console.log("right-clicked node", hit.id);
     *   }
     * });
     * ```
     */
    elementAt(point: { x: number; y: number }): ElementAtResult | null {
        return this.#graph.elementAt(point);
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
     * Activate the camera of the current view mode: `"orbit"` in 3D, `"2d"` in 2D.
     * @remarks
     * A camera from the other view mode is refused; change view mode with `viewMode` or
     * `setViewMode`, which switches the camera with it.
     * @param mode - Camera mode key
     * @param options - Queue options
     * @returns Promise that resolves when camera mode is set
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when the camera belongs to another view mode
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
     * Set render settings: the `layoutBehavior.rendering` group.
     * @remarks
     * `onDemand` is the one setting, the same switch as `renderOnDemand`: whether a frame is
     * drawn only when the picture can have changed. A field left out keeps its value. A
     * preference of this view: it records no undo step and is not saved in a project file.
     * @example
     * ```typescript
     * await element.setRenderSettings({ onDemand: true });
     * ```
     * @param settings - The fields to change
     * @param options - Queue options; with `skipQueue` the settings apply at once
     * @returns Promise that resolves when settings are applied
     * @throws A `GraphtyError` with `E_UNKNOWN_OPTION` for a field that is not a render setting
     * (`details.available` lists them), or `E_OPTION_RANGE` for a value the setting does not take
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
     *
     * `provider: "webllm"` runs a model in the browser: install the optional package
     * `@mlc-ai/web-llm`; the model downloads on the first command.
     * @param config - AI manager configuration
     * @returns Promise that resolves when AI is enabled
     * @throws A `GraphtyError` with `E_MISSING_PACKAGE` when `provider` is `"webllm"` and
     * `@mlc-ai/web-llm` is not installed.
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
     * Which renderer draws the graph: `"webgl"` (the default), `"webgpu"`, or `"auto"` for WebGPU
     * where the browser has it.
     *
     * Read once, when the element is first drawn; set it in markup or before the element is
     * connected. Where WebGPU is asked for and the browser cannot open it, the graph is drawn
     * with WebGL and {@link rendererStatus} says why -- the choice is made before the first
     * frame, never by switching mid-run.
     * @remarks
     * WebGL stays the default because WebXR has no WebGPU binding in any shipping browser: under
     * WebGPU the VR and AR buttons report the mode unavailable. See the renderer guide for what
     * else differs and the measured frame times.
     * @returns What the consumer asked for. `"webgl"` unless it was set.
     * @since 3.3.0
     * @example HTML attribute
     * ```html
     * <graphty-element renderer="auto"></graphty-element>
     * ```
     */
    @property({ attribute: "renderer", reflect: true })
    get renderer(): RendererRequest {
        return this.#graph.rendererRequest;
    }
    /**
     * Sets the renderer the element opens when it is first drawn.
     *
     * An unrecognised value, or a change once the element is drawing, is reported and ignored
     * rather than thrown, for the reason given on `acceleration`: Lit drives this setter from
     * `attributeChangedCallback`, and a throw there would leave the element unrendered.
     */
    set renderer(value: RendererRequest) {
        const oldValue = this.#graph.rendererRequest;

        try {
            this.#graph.setRenderer(value);
        } catch (error) {
            console.error(
                `<graphty-element>: ${error instanceof Error ? error.message : String(error)}. Keeping "${oldValue}".`,
            );
            return;
        }

        this.requestUpdate("renderer", oldValue);
    }

    /**
     * Which renderer is drawing, and why when it is not the one asked for.
     *
     * `active` is `"webgl"` or `"webgpu"`; `reason` is set only when WebGPU was asked for and
     * WebGL is drawing instead (no `navigator.gpu`, or no adapter or device could be opened).
     * Null until the element has initialised its renderer, which it does once connected; the
     * `render-initialized` event fires after.
     * @returns The status, or null before the renderer has been chosen.
     * @since 3.3.0
     * @example
     * ```typescript
     * await element.updateComplete;
     * const { active, reason } = element.rendererStatus ?? {};
     * ```
     */
    get rendererStatus(): RendererStatus | null {
        return this.#graph.rendererStatus;
    }

    /**
     * The node count at or above which accelerated work uses the accelerator.
     *
     * Below it the element takes the CPU path even with an accelerator attached, and
     * `capabilities.acceleration.state` reads `"idle"`. Unset, layouts use the accelerator
     * whenever there is one and each algorithm keeps a built-in floor measured on one card (see
     * the acceleration guide). Any value you set, including 0, replaces those floors for every
     * layout and algorithm; set it when you have measured the machine your graphs are drawn on.
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
     * Every transition the session publishes (acceleration and XR) is mirrored as a
     * `graphty-capabilities-change` DOM event, so a page with a tag and six lines of script can
     * show whether the GPU is in use, whether VR can be entered, say why not, and update itself
     * when a device is lost -- without importing a module or naming a single GPU type. The
     * mirror carries the same object `element.session.capabilities` returns, so the two channels
     * cannot disagree.
     * @returns The controller.
     */
    #ensureAcceleration(): AccelerationController {
        const controller = this.#graph.acceleration;

        if (!this.#capabilitiesMirrored) {
            this.#graph.getSession().on("capabilities:changed", ({ capabilities }) => {
                // The status carries the policy, so a policy written through
                // `element.session.acceleration` lands here too, and the attribute reflects it.
                this.requestUpdate("acceleration");
                this.dispatchEvent(
                    new CustomEvent("graphty-capabilities-change", {
                        detail: { capabilities } satisfies GraphtyCapabilitiesChangeDetail,
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
 * Registration is guarded rather than done by Lit's `@customElement`, which throws when the tag is
 * taken. A page can evaluate this module twice (two bundles that each carry a copy, or a page that
 * registered its own element first), and a throw here would abort every script that imported it.
 * The first definition wins; a different class under the tag is reported, because elements the
 * second copy creates will not be instances of its own class.
 */
const registered = customElements.get("graphty-element");
if (registered === undefined) {
    customElements.define("graphty-element", Graphty);
} else if (registered !== Graphty) {
    console.warn(
        "<graphty-element> is already defined by another class, so this copy of " +
            "@graphty/graphty-element was not registered. Two copies of the package are loaded; " +
            "make every import resolve to one.",
    );
}

/** The detail of `graphty-run-change`: the run as it stands now, and which phase it reached. */
export type GraphtyRunChangeDetail = Pick<RunChange, "run" | "phase">;

/**
 * The detail of `graphty-history-change`: the undo cursor and what the next undo and redo would do,
 * enough for an Undo and a Redo button. A history panel reads `session.history` for the steps.
 */
export interface GraphtyHistoryChangeDetail {
    /** Why the history changed. */
    readonly reason: SessionEventMap["history:changed"]["reason"];
    /** `session.history.version`: bumps on every change. */
    readonly version: number;
    /** `session.history.position`: how many steps are applied. */
    readonly position: number;
    /** How many steps the history holds. */
    readonly steps: number;
    /** Whether an undo would do anything. */
    readonly canUndo: boolean;
    /** Whether a redo would do anything. */
    readonly canRedo: boolean;
}

/** The detail of `graphty-note-change`: which note, what happened to it, and what caused it. */
export type GraphtyNoteChangeDetail = Pick<NoteChange, "id" | "change" | "fields" | "cause">;

/**
 * The detail of `graphty-model-change`: what happened to one model a style layer names, by what the
 * layer named (`ref`, the URL or asset id as written), with the layers that name it, its state and
 * its coded problems. Fires once per model and state, never once per node.
 */
export type GraphtyModelChangeDetail = ModelChange;

/** The detail of `graphty-capabilities-change`: the same document as `session.capabilities`. */
export interface GraphtyCapabilitiesChangeDetail {
    /** The acceleration and XR capabilities after the change. */
    readonly capabilities: Pick<Capabilities, "acceleration" | "xr">;
}

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
 * It lives beside the `customElements.define` call on purpose: the tag name is written twice in this
 * file and nowhere else, so the two cannot drift apart unnoticed.
 */
declare global {
    interface HTMLElementTagNameMap {
        "graphty-element": Graphty;
    }

    // The DOM events the element dispatches about itself. Every one is prefixed, so declaring them
    // on every element names nothing a page could already be using, and
    // `element.addEventListener("graphty-run-change", (e) => e.detail)` type-checks without a cast.
    interface HTMLElementEventMap {
        "graphty-run-change": CustomEvent<GraphtyRunChangeDetail>;
        "graphty-progress-change": CustomEvent<ProgressChange>;
        "graphty-selection-change": CustomEvent<SelectionDelta>;
        "graphty-visibility-change": CustomEvent<VisibilityChange>;
        "graphty-history-change": CustomEvent<GraphtyHistoryChangeDetail>;
        "graphty-note-change": CustomEvent<GraphtyNoteChangeDetail>;
        "graphty-model-change": CustomEvent<GraphtyModelChangeDetail>;
        "graphty-project-status": CustomEvent<ProjectStatus>;
        "graphty-capabilities-change": CustomEvent<GraphtyCapabilitiesChangeDetail>;
        "graphty-node-click": CustomEvent<NodeEventDetail>;
        "graphty-node-hover": CustomEvent<NodeEventDetail>;
        "graphty-node-drag-start": CustomEvent<NodeEventDetail>;
        "graphty-node-drag-end": CustomEvent<NodeEventDetail>;
        "graphty-label-change": CustomEvent<NodeLabelCounts>;
        "graphty-features": CustomEvent<EnabledFeatures>;
        "graphty-source-expand-start": CustomEvent<SourceExpandStart>;
        "graphty-source-expanded": CustomEvent<SourceExpanded>;
        "graphty-source-expand-failed": CustomEvent<SourceExpandFailed>;
        "graphty-autosave-status": CustomEvent<AutosaveStatus>;
        "graphty-autosave-restored": CustomEvent<AutosaveRestored>;
        "graphty-autosave-available": CustomEvent<AutosaveAvailable>;
        "graphty-autosave-at-risk": CustomEvent<AutosaveAtRisk>;
    }

    // Every one bubbles and is composed, so a listener on the document is typed the same way.
    interface DocumentEventMap {
        "graphty-run-change": CustomEvent<GraphtyRunChangeDetail>;
        "graphty-progress-change": CustomEvent<ProgressChange>;
        "graphty-selection-change": CustomEvent<SelectionDelta>;
        "graphty-visibility-change": CustomEvent<VisibilityChange>;
        "graphty-history-change": CustomEvent<GraphtyHistoryChangeDetail>;
        "graphty-note-change": CustomEvent<GraphtyNoteChangeDetail>;
        "graphty-model-change": CustomEvent<GraphtyModelChangeDetail>;
        "graphty-project-status": CustomEvent<ProjectStatus>;
        "graphty-capabilities-change": CustomEvent<GraphtyCapabilitiesChangeDetail>;
        "graphty-node-click": CustomEvent<NodeEventDetail>;
        "graphty-node-hover": CustomEvent<NodeEventDetail>;
        "graphty-node-drag-start": CustomEvent<NodeEventDetail>;
        "graphty-node-drag-end": CustomEvent<NodeEventDetail>;
        "graphty-label-change": CustomEvent<NodeLabelCounts>;
        "graphty-features": CustomEvent<EnabledFeatures>;
        "graphty-source-expand-start": CustomEvent<SourceExpandStart>;
        "graphty-source-expanded": CustomEvent<SourceExpanded>;
        "graphty-source-expand-failed": CustomEvent<SourceExpandFailed>;
        "graphty-autosave-status": CustomEvent<AutosaveStatus>;
        "graphty-autosave-restored": CustomEvent<AutosaveRestored>;
        "graphty-autosave-available": CustomEvent<AutosaveAvailable>;
        "graphty-autosave-at-risk": CustomEvent<AutosaveAtRisk>;
    }
}

/**
 * The DOM events `<graphty-element>` dispatches about itself, by name. Each one bubbles, crosses
 * shadow roots, and carries plain values as its `detail`.
 */
export type GraphtyElementEventMap = {
    [K in keyof HTMLElementEventMap as K extends `graphty-${string}` ? K : never]: HTMLElementEventMap[K];
};
