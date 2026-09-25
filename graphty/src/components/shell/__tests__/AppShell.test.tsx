import { afterEach, describe, expect, it, vi } from "vitest";

import { CAT_SOCIAL_NETWORK, CAT_SOCIAL_NETWORK_NAME } from "../../../data/sampleGraphs";
import { SAMPLE_MANIFEST, type SampleRecord, sampleSizeString } from "../../../data/sampleManifest";
import { act, fireEvent, render, screen, waitFor, within } from "../../../test/test-utils";
import { NODE_METRIC_DEFINITIONS } from "../analysis/nodeMetrics";
import { COMMUNITY_NAMESPACE, COMMUNITY_TYPE, DEGREE_NAMESPACE, DEGREE_TYPE } from "../analysis/runs";
import { AppShell } from "../AppShell";
import { ACTIVITY_RAIL_WIDTH, NARROW_BREAKPOINT, STATUS_BAR_HEIGHT, TOP_BAR_HEIGHT } from "../constants";

/**
 * Mantine's own modal and overlay stacking order. The too-small overlay must clear it,
 * because a reader who narrows the window with the Load data dialog open has to see the
 * too-small message rather than a dialog floating over it.
 */
const MANTINE_MODAL_Z_INDEX = 200;
import {
    type AccelerationStatus,
    type GraphStatistics,
    GraphtyError,
    type Histogram,
    type Layer,
    type LayerSpec,
    type RunId,
    type RunResult,
} from "@graphty/graphty-element/session";

import { createFakeSession, type FakeSession } from "../../../test/fakeSession";
import { ACCELERATION_SETTINGS_STORAGE_KEY } from "../defaults/accelerationSettings";
import { METRIC_VALUE_FIELD, SHELL_DEFAULTS_TEMPLATE_ID } from "../defaults/styleDescriptors";
import { SHELL_LAYOUT_STORAGE_KEY } from "../ShellContext";

/**
 * Renders the shell with the store pinned, so a board decides its own breakpoint and
 * nothing it does survives into the next one.
 * @param shellWidth - the viewport width the store starts from.
 * @returns the render result.
 */
function renderShell(shellWidth = 1440) {
    const result = render(<AppShell initialShellWidth={shellWidth} measureViewport={false} persist={false} />);

    // The element's load methods answer only when a board says how the load ended.
    captureLoads(result.container);

    return result;
}

/**
 * Renders the shell and lets its measurement land inside `act`.
 *
 * `measureViewport={false}` pins the STORE's width; it does not stop the canvas region
 * measuring its own rect, and that measurement arrives from a ResizeObserver after the
 * synchronous render returns. A board that asserts without flushing it both prints an
 * unwrapped-update warning and asserts against a canvas of width 0.
 * @param shellWidth - the viewport width the store starts from.
 * @returns the render result, once the measurement has been applied.
 */
async function renderMeasuredShell(shellWidth = 1440) {
    const result = renderShell(shellWidth);

    await act(async () => {
        await Promise.resolve();
    });

    return result;
}

/**
 * Dispatches the `selection-changed` event graphty-element fires on pointerup, on the
 * element the shell's wrapper listens to.
 *
 * The ordering it stands for is the fact the node-tap carve-out depends on: the element
 * reports the pick BEFORE React's click, and reports a null id when the pick hit
 * nothing. See the carve-out's own board below.
 * @param container - the render result's container.
 * @param nodeId - the id the pick produced, as the ELEMENT spells it, or null for a pick that
 * hit nothing. Numbers are allowed because the element reports the id it holds, not a printed
 * form, and the shell's pin verbs hand that same value back to the element.
 */
function reportSelection(container: HTMLElement, nodeId: string | number | null) {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    act(() => {
        element?.dispatchEvent(
            new CustomEvent("selection-changed", {
                detail: {
                    previousNodeId: null,
                    currentNodeId: nodeId,
                    currentNode: nodeId === null ? null : { data: {} },
                },
            }),
        );
    });
}

/**
 * Stands a graph on the mounted host and lets the shell read its style stack.
 *
 * `Graphty`'s handle reads `element.graph` through a getter every time it is asked, and its
 * style effect subscribes to `session.on("style:changed")`, so a graph put on the element here
 * reaches the shell by the same route the real element's does -- which is what makes this a
 * test of the shell's own upward channel rather than of a mock.
 * @param container - the render result's container.
 * @param names - the layers the stack holds beyond the element's own two, bottom first.
 * @returns the fake session, to assert what the shell did to the stack.
 */
function installGraph(container: HTMLElement, names: readonly string[]): FakeSession {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    const fake = createFakeSession();

    for (const name of names) {
        fake.seed({ name, target: "node", selector: { match: "everything" } });
    }

    // `graph` is a getter on the element's prototype, so the stand-in is an own
    // property on this instance rather than an assignment, which the getter refuses.
    Object.defineProperty(element, "graph", {
        configurable: true,
        value: {
            runAlgorithm: () => Promise.resolve(),
            getNodes: () => [],
            getDataManager: () => ({}),
            getSession: () => fake.session,
        },
    });

    return fake;
}

/* -------------------------------------------------------------------------- */
/* The novice path's stand-ins (spec 7)                                        */
/* -------------------------------------------------------------------------- */

/** How many microtask turns a flush walks: enough for the run-then-read-then-paint chain. */
const FLUSH_TURNS = 10;

/**
 * How long a flush waits for the wrapper to find the element's session.
 *
 * `Graphty` subscribes to `session.on("style:changed")`, and the session only exists once the
 * element has finished coming up -- which the element publishes no event for, so the wrapper
 * looks again on a timer. A board that installs a stand-in graph after the shell has mounted
 * is in exactly that state, so every flush waits one interval rather than each board knowing
 * about the timer.
 */
const SESSION_BIND_MS = 80;

/**
 * Lets the wrapper's session poll fire, so a graph installed after mount is seen.
 */
async function settleSession(): Promise<void> {
    await act(async () => {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, SESSION_BIND_MS);
        });
    });
}

/** How many task turns a dropped file's read is given before the board asserts. */
const FILE_READ_TURNS = 3;

/**
 * Lets the load path's promise chain settle inside `act`.
 *
 * The 7.2 defaults are a chain of awaits -- the degree pass, then the layers, then the
 * suggested run's own pass -- so one turn is not enough and a fixed timer would be a
 * guess. Walking a handful of microtask turns is what a `.then` chain of that depth
 * needs and costs nothing when the chain is shorter.
 */
async function flushMicrotasks(): Promise<void> {
    await act(async () => {
        for (let turn = 0; turn < FLUSH_TURNS; turn += 1) {
            await Promise.resolve();
        }
    });
    await settleSession();
}

/**
 * Reports the load COMPLETE, as graphty-element does when its last chunk is in.
 *
 * `DataManager.addDataFromSource` emits `data-added` per chunk and exactly one
 * `data-loaded` after the loop, and the element forwards every internal event as a DOM
 * CustomEvent that bubbles and is composed -- which is the event the shell's 7.2 defaults
 * wait for. A board that loads without reporting completion therefore gets no defaults,
 * exactly as a load that never completes gets none, so every board below that wants the
 * defaults says so here.
 * @param container - the render result's container.
 */
async function reportLoadComplete(container: HTMLElement): Promise<void> {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    await act(async () => {
        // The real element emits `data-loaded` and THEN resolves the load's promise.
        element?.dispatchEvent(new CustomEvent("data-loaded", { bubbles: true, composed: true }));
        settleLoads(container);

        for (let turn = 0; turn < FLUSH_TURNS; turn += 1) {
            await Promise.resolve();
        }
    });
    await settleSession();
}

/**
 * Reports the load FAILED, as graphty-element does when a parse or a fetch throws: the
 * load's own promise rejects with the element's error.
 * @param container - the render result's container.
 * @param message - what the element's `Error` says, the element's own error, or undefined for
 * a rejection that says nothing at all.
 */
async function reportLoadingError(container: HTMLElement, message?: string | Error): Promise<void> {
    await act(async () => {
        settleLoads(container, {
            reason: message === undefined || message instanceof Error ? message : new Error(message),
        });

        for (let turn = 0; turn < FLUSH_TURNS; turn += 1) {
            await Promise.resolve();
        }
    });
}

/**
 * Reports an acceleration transition, as graphty-element does on every change of its
 * controller: a bubbling, composed CustomEvent carrying the published document.
 * @param container - the render result's container.
 * @param status - the status the element would publish.
 */
async function reportAcceleration(container: HTMLElement, status: AccelerationStatus): Promise<void> {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    await act(async () => {
        element?.dispatchEvent(
            new CustomEvent("graphty-capabilities-change", {
                bubbles: true,
                composed: true,
                detail: { capabilities: { acceleration: status } },
            }),
        );
        await Promise.resolve();
    });
}

/**
 * One file, in the two shapes the drop routes read it in.
 *
 * The Data panel destructures the list (`const [file] = files`, which needs an iterator)
 * and the canvas asks it for `files.item(0)`, so a stand-in that serves only one of them
 * passes one route and throws on the other.
 * @param file - the dropped file.
 * @returns something both routes can read.
 */
function fileList(file: File): FileList {
    const list = [file] as unknown as { item: (index: number) => File | null };

    list.item = (index: number) => (index === 0 ? file : null);

    return list as unknown as FileList;
}

/**
 * Drops one file on a zone and lets the load path settle.
 *
 * Chromium empties the file list of any DataTransfer that did not come from a real user
 * drag, so the list the handler reads is attached to the event itself.
 * @param zone - the drop target.
 * @param file - the file to drop.
 */
async function dropFile(zone: HTMLElement, file: File): Promise<void> {
    const drop = new Event("drop", { bubbles: true, cancelable: true });

    Object.defineProperty(drop, "dataTransfer", { value: { files: fileList(file) } });

    await act(async () => {
        zone.dispatchEvent(drop);

        /* Waited out as a TASK, not as a handful of microtask turns. `loadFromFile` reads
           the file (`await file.text()`), which is a real asynchronous read in the
           browser, and only then assigns the element's data source. A board that ran on
           microtasks alone told the element its data had failed to parse before the data
           had reached it -- an order the application cannot produce, and one that hid a
           `finishLoad` landing AFTER the failure it was supposed to precede. */
        for (let turn = 0; turn < FILE_READ_TURNS; turn += 1) {
            await new Promise((resolve) => {
                window.setTimeout(resolve, 0);
            });
        }

        for (let turn = 0; turn < FLUSH_TURNS; turn += 1) {
            await Promise.resolve();
        }
    });
}

/**
 * The sentence the failure surfaces drew inline in the Welcome drop zone, or null.
 * @param container - the render result's container.
 * @returns the inline error element, or null when nothing has failed.
 */
function inlineLoadError(container: HTMLElement): HTMLElement | null {
    return container.querySelector<HTMLElement>("[data-welcome-error]");
}

/**
 * The status bar's toast, or null when the bar is drawing none.
 * @param container - the render result's container.
 * @returns the toast element, or null.
 */
function statusToast(container: HTMLElement): HTMLElement | null {
    return container.querySelector<HTMLElement>("[data-status-float]");
}

/** One load the shell asked the element for, as the element received it. */
interface RecordedLoad {
    /** The format the shell named, e.g. "json" or "gml"; undefined to have the element detect it. */
    readonly dataSource: string | undefined;
    /** What was loaded: `{data}` for an inline load, `{url}` for a served one, `{file}` for a file. */
    readonly config: unknown;
    /** Whether the shell asked the element to replace the graph. */
    readonly replace: boolean | undefined;
}

/** The loads an element stand-in has been asked for, and the ones still waiting for an answer. */
interface LoadStub {
    readonly loads: RecordedLoad[];
    readonly waiting: {
        readonly replace: boolean;
        readonly resolve: (value: { loadId: number }) => void;
        readonly reject: (error: unknown) => void;
    }[];
    /** What the stand-in does when a REPLACING load arrives: the element swaps the dataset then. */
    onReplaced: () => void;
}

const loadStubs = new WeakMap<Element, LoadStub>();

/**
 * Stands in for the element's three awaited load methods, WITHOUT letting the real element load.
 *
 * The shell loads through `loadFromUrl`, `loadFromFile` and `addDataFromSource`, each of which
 * resolves once the element has the data and rejects when it does not. Each call is recorded and
 * left pending until the board says how it ended: {@link reportLoadComplete} resolves every
 * waiting load, {@link reportLoadingError} rejects them -- the two answers the real element gives.
 * Idempotent, so a board may call it and {@link installNovicePathGraph} may call it too.
 * @param container - the render result's container.
 * @returns the loads, in the order the shell issued them.
 */
function captureLoads(container: HTMLElement): RecordedLoad[] {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    const existing = element === null ? undefined : loadStubs.get(element);

    if (existing !== undefined) {
        return existing.loads;
    }

    const stub: LoadStub = { loads: [], waiting: [], onReplaced: () => undefined };

    const record = (load: RecordedLoad): Promise<{ loadId: number }> => {
        stub.loads.push(load);

        return new Promise((resolve, reject) => {
            stub.waiting.push({ replace: load.replace === true, resolve, reject });
        });
    };

    Object.defineProperty(element, "addDataFromSource", {
        configurable: true,
        value: (type: string, config: unknown, options?: { replace?: boolean }) =>
            record({ dataSource: type, config, replace: options?.replace }),
    });
    Object.defineProperty(element, "loadFromUrl", {
        configurable: true,
        value: (url: string, options?: { format?: string; replace?: boolean }) =>
            record({ dataSource: options?.format, config: { url }, replace: options?.replace }),
    });
    Object.defineProperty(element, "loadFromFile", {
        configurable: true,
        value: (file: File, options?: { format?: string; replace?: boolean }) =>
            record({ dataSource: options?.format, config: { file }, replace: options?.replace }),
    });

    if (element !== null) {
        loadStubs.set(element, stub);
    }

    return stub.loads;
}

/**
 * Answers every load the element stand-in is still holding.
 * @param container - the render result's container.
 * @param error - the rejection, or undefined to resolve them.
 */
function settleLoads(container: HTMLElement, error?: { readonly reason: unknown }): void {
    const element = container.querySelector("graphty-element");
    const stub = element === null ? undefined : loadStubs.get(element);

    for (const waiting of stub?.waiting.splice(0) ?? []) {
        if (error === undefined) {
            if (waiting.replace) {
                stub?.onReplaced();
            }

            waiting.resolve({ loadId: 1 });
        } else {
            waiting.reject(error.reason);
        }
    }
}

/**
 * One node, as the element's data manager spells it.
 *
 * The id is `string | number` because the ELEMENT's is: `DataManager` stores whatever the
 * file carried, untouched, and `GMLDataSource` parses a bare integer with `parseInt`, so
 * two of the three shipped samples (karate.gml, football.gml) hold NUMBER keys. A stub
 * that could only hold strings could not fail the way those two samples fail.
 *
 * A node carries no measurements. graphty-element used to scatter an algorithm's per-node
 * numbers across the nodes it measured, and a consumer read them back off every node in
 * turn; a run publishes one result object now, and this stand-in publishes results the same
 * way -- see {@link fixtureResult}.
 */
interface StubNode {
    id: string | number;
    data: Record<string, unknown>;
}

/** One edge as the stand-in holds it, which is how `GraphtyHandle.getData` reads it too. */
interface StubEdge {
    /** The element-assigned edge id. */
    id: string;
    /** The id of the node the edge leaves. */
    srcId: string | number;
    /** The id of the node the edge arrives at. */
    dstId: string | number;
    /** Whatever the source file carried. */
    data: Record<string, unknown>;
}

/**
 * The graph's shape, as graphty-element would publish it for the records standing in the
 * stand-in right now.
 *
 * THIS IS A STAND-IN FOR THE ELEMENT, not a second implementation for the shell. The
 * shell used to hold a disjoint-set forest of its own and a per-edge vote on direction,
 * and deleting them is the point of this change: the element measures the snapshot it
 * froze, and the shell reads the answer. What a board needs is an element that answers,
 * so the walk lives here, next to the fixture it describes, in the same spirit as
 * `fixtureResult` -- and, like that one, nothing in this file is a claim about the
 * element's arithmetic.
 *
 * The definitions are the element's own: components ignore direction, because "how many
 * pieces is this network in?" is a question about the picture; a repeat is an edge beyond
 * the first between the same pair of endpoints, read against the direction the graph is
 * frozen with; and density excludes self loops from both halves of the fraction.
 * @param nodes - every node the stand-in holds.
 * @param edges - every edge the stand-in holds.
 * @param directedness - the direction the element would report for this graph.
 * @returns the statistics.
 */
function fixtureStatistics(
    nodes: ReadonlyMap<string | number, StubNode>,
    edges: ReadonlyMap<string, StubEdge>,
    directedness: GraphStatistics["directedness"],
): GraphStatistics {
    const parent = new Map<string | number, string | number>([...nodes.keys()].map((id) => [id, id]));

    /**
     * The representative of an id's part.
     * @param id - the node id.
     * @returns the representative.
     */
    const find = (id: string | number): string | number => {
        let root = id;

        while ((parent.get(root) ?? root) !== root) {
            root = parent.get(root) ?? root;
        }

        return root;
    };

    const degrees = new Map<string | number, number>([...nodes.keys()].map((id) => [id, 0]));
    const seenPairs = new Set<string>();
    const undirected = directedness !== "directed";
    let selfLoopCount = 0;
    let repeatedEdgeCount = 0;

    for (const edge of edges.values()) {
        degrees.set(edge.srcId, (degrees.get(edge.srcId) ?? 0) + 1);
        degrees.set(edge.dstId, (degrees.get(edge.dstId) ?? 0) + 1);

        if (edge.srcId === edge.dstId) {
            selfLoopCount += 1;
        }

        const ends = [String(edge.srcId), String(edge.dstId)];
        const key = JSON.stringify(undirected ? [...ends].sort() : ends);

        if (seenPairs.has(key)) {
            repeatedEdgeCount += 1;
        } else {
            seenPairs.add(key);
        }

        const left = find(edge.srcId);
        const right = find(edge.dstId);

        if (left !== right) {
            parent.set(left, right);
        }
    }

    const sizes = new Map<string | number, number>();

    for (const id of nodes.keys()) {
        const root = find(id);

        sizes.set(root, (sizes.get(root) ?? 0) + 1);
    }

    const partSizes = [...sizes.values()].sort((a, b) => b - a);
    const every = [...degrees.values()];
    const pairs = nodes.size * (nodes.size - 1);
    const possible = directedness === "directed" ? pairs : pairs / 2;

    return {
        nodeCount: nodes.size,
        edgeCount: edges.size,
        density: possible === 0 ? 0 : Math.max(0, edges.size - selfLoopCount) / possible,
        directedness,
        directednessSource: { by: "unsettled", statedBy: null },
        weighted: false,
        selfLoopCount,
        repeatedEdgeCount,
        degreeRange: [Math.min(...every, 0), Math.max(...every, 0)],
        // Measured from the same degrees the range above is, because that is the invariant the
        // element guarantees and a fixture that broke it would hide a bug rather than model one.
        meanDegree: every.length === 0 ? 0 : every.reduce((sum, d) => sum + d, 0) / every.length,
        components: {
            count: partSizes.length,
            sizes: partSizes,
            largestSize: partSizes[0] ?? 0,
            isolatedCount: partSizes.filter((size) => size === 1).length,
            truncatedSizes: false,
            componentOf: () => undefined,
        },
    };
}

/**
 * How many layers graphty-element owns before the shell adds one: its `default` and its
 * `selection` layer. Boards count the shell's own layers on top of this rather than from
 * zero, so a removal that takes the element's layers with it cannot pass.
 */
const ELEMENT_OWN_LAYER_COUNT = 2;

/**
 * The layers the SHELL itself added, in order, with the element's own and every run's left out.
 *
 * The shell's layers carry its template id in {@link Layer.source}, which is also how it
 * retires them. Boards index this rather than the whole stack so they assert on the shell's own
 * layers and stay correct whatever the element puts underneath them.
 * @param layers - every layer the stack holds.
 * @returns the shell's layers, bottom first.
 */
function shellLayers(layers: readonly Layer[]): readonly Layer[] {
    return layers.filter(
        (layer) => layer.source.by === "template" && layer.source.templateId === SHELL_DEFAULTS_TEMPLATE_ID,
    );
}

/** The stub graph's own doors, so a board can assert what the shell asked of it. */
interface StubGraph {
    /** Every algorithm run the shell asked for, in order. */
    readonly runAlgorithm: ReturnType<typeof vi.fn>;
    /** Every canvas selection the shell asked for, which is the spine's last hop. */
    readonly selectNode: ReturnType<typeof vi.fn>;
    /** Every clear of it. The element has to be told, or its own selection outlives the shell's. */
    readonly deselectNode: ReturnType<typeof vi.fn>;
    /** What the ELEMENT still holds, which is not always what the shell thinks it holds. */
    readonly elementHoldsSelection: () => string | number | null;
    /** The element's style stack, and the policy that paints a finished run. */
    readonly styles: FakeSession;
    /**
     * Adds one node to the graph BEHIND the shell's back, as a merge would.
     *
     * The records the shell measured are not the records the graph holds for ever: this is
     * how a board reaches the state a merging load would leave -- one held degree pass, and
     * a graph that has grown since it ran.
     */
    readonly addNode: (id: string) => void;
    /**
     * The runs the element's session holds for one algorithm, in the order it made them.
     *
     * Starting an algorithm the session has already run over the same graph hands back the run
     * that exists rather than making a second one, so this list is how a board says whether a
     * pass really ran again or the element re-served the one it held.
     * @param algorithm - the catalogue key, e.g. "degree".
     * @returns the run ids.
     */
    readonly runIds: (algorithm: string) => readonly RunId[];
    /** The data manager, for the clear a replacing load makes. */
    readonly dataManager: {
        clear: ReturnType<typeof vi.fn>;
    };
}

/**
 * What the Data panel's sample row is expected to draw in its trailing value slot.
 *
 * Spec 5648 puts the size string on both surfaces and spec 622 asks this row for its
 * tags as well, so the expectation is the register both share: the size first, then the
 * tags. It is spelled out here rather than imported so the board states the string it
 * wants rather than agreeing with whatever the panel built.
 * @param record - the manifest row.
 * @returns the value the row should draw.
 */
function expectedPanelSampleValue(record: SampleRecord): string {
    const size = sampleSizeString(record.size);

    return record.tags.length === 0 ? size : `${size}. ${record.tags.join(", ")}`;
}

/** The group sizes the stub's louvain reports: 7 + 6 + 4 + 3 = the fixture's 20 nodes. */
const STUB_GROUP_SIZES = [7, 6, 4, 3];

/** The modularity the stub's louvain reports, which bands as "clearly separated". */
const STUB_MODULARITY = 0.447;

/** How many bars a distribution draws before values start sharing a band. */
const FIXTURE_HISTOGRAM_BINS = 20;

/**
 * Orders two measured elements the way graphty-element's ranking does.
 *
 * Value descending, ties broken by the PRINTED id -- so the top row of a graph where three
 * nodes share the highest degree is the same row on every run, and a board may name it.
 * @param left - one element's id and value.
 * @param right - the other's.
 * @returns the comparison, for `Array.prototype.sort`.
 */
function byValueThenPrintedId(left: readonly [string | number, number], right: readonly [string | number, number]): number {
    if (left[1] !== right[1]) {
        return right[1] - left[1];
    }

    const leftId = String(left[0]);
    const rightId = String(right[0]);

    if (leftId === rightId) {
        return 0;
    }

    return leftId < rightId ? -1 : 1;
}

/**
 * The distribution of one run's values, as the element lays it out.
 *
 * One bar per distinct value while that fits under {@link FIXTURE_HISTOGRAM_BINS}, equal-width
 * bands once it does not, and no bar at all when nothing was measured. A bar whose `from`
 * equals its `to` names one value, which is what lets the cat fixture's chart read "3 links:
 * 12 nodes" rather than a range nobody's degree falls in.
 * @param ascending - every measured value, lowest first.
 * @returns the bars, with the scale they were really laid out on.
 */
function fixtureHistogram(ascending: readonly number[]): Histogram {
    if (ascending.length === 0) {
        return { bins: [], scale: "linear", suggestedScale: "linear", binning: "empty" };
    }

    const low = ascending[0];
    const high = ascending[ascending.length - 1];
    const distinct = [...new Set(ascending)];

    if (distinct.length <= FIXTURE_HISTOGRAM_BINS) {
        return {
            bins: distinct.map((value) => ({
                from: value,
                to: value,
                count: ascending.filter((candidate) => candidate === value).length,
            })),
            scale: "linear",
            suggestedScale: "linear",
            binning: "per-value",
        };
    }

    const width = (high - low) / FIXTURE_HISTOGRAM_BINS;
    const counts = Array.from({ length: FIXTURE_HISTOGRAM_BINS }, () => 0);

    for (const value of ascending) {
        const band = Math.min(FIXTURE_HISTOGRAM_BINS - 1, Math.floor((value - low) / width));

        counts[band] += 1;
    }

    return {
        bins: counts.map((count, band) => ({ from: low + band * width, to: low + (band + 1) * width, count })),
        scale: "linear",
        suggestedScale: "linear",
        binning: "banded",
    };
}

/**
 * One algorithm's result over the fixture, in the shape graphty-element publishes.
 *
 * THESE ARE FIXTURE NUMBERS, worked out here so a board has something it can point at behind
 * the copy it asserts -- "Mr_Whiskers is the most connected, with 4 links. The typical node
 * has 3." is the cat fixture's own twenty degrees, and a board that could not name where the
 * 4 and the 3 came from would be agreeing with whatever the shell drew. The arithmetic is
 * deliberately the plainest reading of what the element publishes: sorted descending with a
 * printed-id tie-break, ties sharing a rank, the LOWER median of the ascending values, the
 * count of measured elements sitting at the minimum, and one bar per distinct value.
 *
 * The REAL statistics belong to graphty-element, which computes them once while it walks the
 * result and tests them there against its own columns. Nothing in this file is a claim about
 * that arithmetic; it is a fixture for the sentences the shell writes from it.
 * @param input - what the run measured, and what it publishes beside the numbers.
 * @returns the result, as `session.runs.start` resolves with.
 */
function fixtureResult(input: {
    /** Every element the run measured, and the value it measured. */
    readonly values: ReadonlyMap<string | number, number>;
    /** Every element that was IN SCOPE, measured or not. */
    readonly count: number;
    /** The graph-level fields, for a run that publishes any. */
    readonly graph?: Readonly<Record<string, unknown>>;
    /** The groups, largest first, for a run that partitions. */
    readonly groups?: readonly { readonly group: number; readonly size: number }[];
}): RunResult {
    const measured = [...input.values.entries()].sort(byValueThenPrintedId);
    const ascending = measured.map((entry) => entry[1]).reverse();
    const ranking: { id: string | number; value: number; rank: number; percentile: number }[] = [];
    let rank = 0;

    for (const [index, entry] of measured.entries()) {
        /* Ties SHARE a rank -- 1, 2, 2, 4 -- so two nodes with equal betweenness do not read as
           third and fourth, which is a difference a reader can see and a shell cannot invent. */
        if (index === 0 || entry[1] !== measured[index - 1][1]) {
            rank = index + 1;
        }

        ranking.push({
            id: entry[0],
            value: entry[1],
            rank,
            percentile: (measured.length - index) / measured.length,
        });
    }

    const total = ascending.reduce((sum, value) => sum + value, 0);
    const lowest = ascending.length === 0 ? null : ascending[0];

    return {
        ranking: () => ranking,
        summary: () => ({
            count: input.count,
            measured: measured.length,
            min: lowest,
            max: ascending.length === 0 ? null : ascending[ascending.length - 1],
            /* The LOWER median, so a degree median is a whole number some node actually has. */
            median: ascending.length === 0 ? null : ascending[Math.floor((ascending.length - 1) / 2)],
            mean: ascending.length === 0 ? null : total / ascending.length,
            tiedAtMin: ascending.filter((value) => value === lowest).length,
            normalization: "none",
            top: [],
            ...(input.groups === undefined ? {} : { groups: input.groups }),
            caveats: {
                exact: true,
                seed: null,
                direction: "as-loaded",
                weight: null,
                precision: "f64",
                method: "exact",
                notes: [],
            },
            durationMs: 0,
        }),
        histogram: () => fixtureHistogram(ascending),
        graph: input.graph ?? {},
    } as unknown as RunResult;
}

/**
 * What a board wants this stand-in to be, beyond the cat fixture.
 */
interface NovicePathOptions {
    /**
     * A synthetic graph of this size instead of the cat fixture.
     *
     * The cost gate is a function of the graph's own size, so the only way to reach its
     * "ask" band is to stand a graph in front of it that is actually big enough. The
     * records are shaped exactly like the fixture's, so every other surface reads them
     * the same way.
     */
    readonly synthetic?: { readonly nodeCount: number; readonly edgeCount: number };
    /**
     * Which way the element says this graph's edges run.
     *
     * Undirected by default, which is what the element freezes a mutual-following network
     * out of: the cat fixture's edges are unordered pairs and every board that reads this
     * is reading a graph of that shape. A board that wants the other answer says so, and
     * the two surfaces that branch on direction -- the Counts Type row and rule 3 of the
     * Insights table -- follow it.
     */
    readonly directedness?: GraphStatistics["directedness"];
    /**
     * What the stub's PageRank publishes at graph level.
     *
     * Absent means it publishes NOTHING, which is the element saying nothing rather than
     * saying it did not converge -- and the two must not be conflated, which is why the
     * caveat tests `converged === false` rather than `!converged`.
     */
    readonly pagerank?: { readonly converged: boolean; readonly iterations: number };
    /** Layers already standing on the graph before the shell adds any of its own. */
    readonly extraLayers?: readonly LayerSpec[];
    /**
     * A ring of this many nodes instead of the cat fixture.
     *
     * Every node has exactly two links, so every betweenness score is the same, the
     * shell's min-max normalisation divides by a range of 0 and every bar is drawn at 0 --
     * the degenerate ranking whose top fraction is 0 and whose canvas is uniformly the
     * bottom of the ramp.
     */
    readonly ring?: number;
    /**
     * How many nodes the metric pass leaves WITHOUT a published value.
     *
     * A run's result carries a value only for the elements its pass reached, and its summary
     * reports the scope it SAW as well as the number it measured -- which is the difference
     * that puts the legend's "Not measured (N nodes)" departure on screen. Nothing in the
     * fixture could produce it: every node of a stub that measures all of them is measured.
     *
     * The LAST n nodes are the ones left out, and only for the three node metrics -- the
     * grouping run is untouched, because it is not what this reaches.
     */
    readonly unmeasured?: number;
    /**
     * The fixture's ids as the GML samples carry them: integers, stored as NUMBERS.
     *
     * The failure this reaches is a silent one: the shell prints an id, hands the printed
     * string back to `selectNode`, and the element's `Map.get("1")` misses the key `1`,
     * returns false and emits nothing.
     */
    readonly numericIds?: boolean;
}

/**
 * A synthetic graph of a given size, in the fixture's own shape.
 * @param nodeCount - how many nodes.
 * @param edgeCount - how many edges.
 * @returns the records, as the sample fixtures spell them.
 */
function syntheticGraph(nodeCount: number, edgeCount: number): StringFixtureRecords {
    const nodes = Array.from({ length: nodeCount }, (_unused, index) => ({ id: `n${String(index)}` }));
    const edges = Array.from({ length: edgeCount }, (_unused, index) => {
        const source = index % nodeCount;
        const target = (index * 7 + 1) % nodeCount;

        return {
            source: `n${String(source)}`,
            target: `n${String(source === target ? (target + 1) % nodeCount : target)}`,
        };
    });

    return { nodes, edges };
}

/**
 * The records a fixture hands the stand-in, in the two id types the element accepts.
 *
 * Readonly all the way down because `CAT_SOCIAL_NETWORK` is `as const`: a mutable shape
 * here would force a copy of the fixture at every call site, and the copy is what would
 * then drift from what FIXTURES.md measures.
 */
interface FixtureRecords {
    readonly nodes: readonly { readonly id: string | number }[];
    readonly edges: readonly { readonly source: string | number; readonly target: string | number }[];
}

/** The same records before any renumbering, which is to say with the ids the file wrote. */
interface StringFixtureRecords {
    readonly nodes: readonly { readonly id: string }[];
    readonly edges: readonly { readonly source: string; readonly target: string }[];
}

/**
 * A ring of n nodes: n edges, every degree exactly 2.
 * @param nodeCount - how many nodes are in the ring.
 * @returns the records, as the sample fixtures spell them.
 */
function ringGraph(nodeCount: number): StringFixtureRecords {
    const nodes = Array.from({ length: nodeCount }, (_unused, index) => ({ id: `n${String(index)}` }));
    const edges = Array.from({ length: nodeCount }, (_unused, index) => ({
        source: `n${String(index)}`,
        target: `n${String((index + 1) % nodeCount)}`,
    }));

    return { nodes, edges };
}

/**
 * The same records with INTEGER ids, the way GMLDataSource hands them to the element.
 *
 * Positions are 1-based to match karate.gml's own `node [ id 1 ]`, and the edges are
 * remapped by position so the graph's shape is untouched -- only the type of its ids.
 * @param fixture - the records to renumber.
 * @returns the same graph with numeric ids.
 */
function withNumericIds(fixture: StringFixtureRecords): FixtureRecords {
    const numbering = new Map<string, number>(fixture.nodes.map((node, index) => [node.id, index + 1]));

    return {
        nodes: fixture.nodes.map((node) => ({ id: numbering.get(node.id) ?? 0 })),
        edges: fixture.edges.map((edge) => ({
            source: numbering.get(edge.source) ?? 0,
            target: numbering.get(edge.target) ?? 0,
        })),
    };
}

/**
 * Stands a graph on the mounted host that answers the whole novice path.
 *
 * It is a stand-in for graphty-element, not for the shell: it holds the cat fixture in the
 * two Maps `GraphtyHandle.getData` reads, and it PUBLISHES A RESULT per run -- a ranking, a
 * summary and a distribution for each of the three node metrics, and a group per node with a
 * modularity beside it for the grouping run. What these boards test is that the shell starts
 * the right passes, in the right order, and turns what comes back into the right sentence.
 *
 * The degrees are computed from the fixture's own edges rather than invented, so the label
 * cut and the Most connected rows are the fixture's real ranking; every number in a result
 * is derived from them by {@link fixtureResult}.
 * @param container - the render result's container.
 * @param options - what this board wants the stand-in to be, beyond the cat fixture.
 * @returns the stub's doors, to assert the calls the shell made on it.
 */
function installNovicePathGraph(container: HTMLElement, options: NovicePathOptions = {}): StubGraph {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    // The fixture IS the loaded data, so the real element is never asked to load anything.
    captureLoads(container);

    const sized =
        options.synthetic === undefined
            ? CAT_SOCIAL_NETWORK
            : syntheticGraph(options.synthetic.nodeCount, options.synthetic.edgeCount);
    const shaped = options.ring === undefined ? sized : ringGraph(options.ring);
    const fixture: FixtureRecords = options.numericIds === true ? withNumericIds(shaped) : shaped;
    const nodes = new Map<string | number, StubNode>();

    for (const node of fixture.nodes) {
        nodes.set(node.id, { id: node.id, data: { ...node } });
    }

    const edges = new Map<string, StubEdge>();
    const degrees = new Map<string | number, number>();

    fixture.edges.forEach((edge, index) => {
        const id = `edge-${String(index)}`;

        edges.set(id, { id, srcId: edge.source, dstId: edge.target, data: { ...edge } });
        degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
        degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
    });

    /* The nodes the metric pass did not reach, and so published nothing for. See
       {@link NovicePathOptions.unmeasured}. */
    const unmeasured = new Set<string | number>([...nodes.keys()].slice(nodes.size - (options.unmeasured ?? 0)));
    const measuredNodes = (): StubNode[] => [...nodes.values()].filter((node) => !unmeasured.has(node.id));

    /* What each node metric measures, on the fixture's own degrees. The three are deliberately
       different shapes of number -- a count, a count nudged off its integers, and a count
       doubled -- because the panel prints a count without decimals and a score with them. */
    const metricValue: Readonly<Record<string, (degree: number) => number>> = {
        degree: (degree) => degree,
        pagerank: (degree) => degree + 1,
        betweenness: (degree) => degree * 2,
    };

    /**
     * Which group each node lands in, taken in the fixture's own insertion order.
     * @returns the assignment, a group id per node.
     */
    const communityAssignment = (): Map<string | number, number> => {
        const assignment = new Map<string | number, number>();
        const ids = [...nodes.keys()];
        let cursor = 0;

        STUB_GROUP_SIZES.forEach((size, communityId) => {
            for (let taken = 0; taken < size; taken += 1) {
                const id = ids[cursor];

                cursor += 1;

                if (id !== undefined) {
                    assignment.set(id, communityId);
                }
            }
        });

        return assignment;
    };

    /**
     * What one run publishes, built fresh so a re-executed run reports the graph as it is now.
     * @param algorithm - the catalogue key that ran.
     * @returns the result, or undefined for an algorithm this stand-in does not model.
     */
    const resultFor = (algorithm: string): RunResult | undefined => {
        if (algorithm === "louvain") {
            /* A grouping run publishes a group per node, its group sizes largest first, and the
               modularity the reading bands as "clearly separated" -- and NOT a ranking, because
               a group id is not a measurement anything can be ranked on. */
            return fixtureResult({
                values: communityAssignment(),
                count: nodes.size,
                graph: { modularity: STUB_MODULARITY },
                groups: STUB_GROUP_SIZES.map((size, group) => ({ group, size })),
            });
        }

        const measure = metricValue[algorithm];

        if (measure === undefined) {
            return undefined;
        }

        return fixtureResult({
            values: new Map(measuredNodes().map((node) => [node.id, measure(degrees.get(node.id) ?? 0)])),
            count: nodes.size,
            /* PageRank is the only one of the three that publishes anything at graph level, and
               whatever the board says it published is published VERBATIM -- including a
               `converged: true`. That is the case that matters: on the delta path upstream
               returns a hard-coded true, so the shell drops a true and keeps only a false, and
               a stand-in that filtered the true out here would leave that rule pinned by
               nothing. Absent means the run published no convergence fields at all, which is a
               third state and is what the boards that pass no option are testing.
               See {@link NovicePathOptions.pagerank}. */
            ...(algorithm === "pagerank" && options.pagerank !== undefined
                ? {
                      graph: {
                          converged: options.pagerank.converged,
                          iterations: options.pagerank.iterations,
                      },
                  }
                : {}),
        });
    };

    /* The element's own base and selection layers are seeded by the fake session itself, and
       BOTH carry a node colour, as the real ones do: the base layer parses the whole of
       `defaultNodeStyle` and the selection layer paints the gold highlight. Both are LOCKED,
       which is what makes a board catch a sweep that would take the layer carrying every
       node's shape type -- the removal that left the next load dying in mesh building with
       "shape with type required to create mesh".

       The scope digest is the node set itself, which is what decides whether starting an
       algorithm again re-serves the run the session holds or re-executes it: a graph that has
       grown under a held pass is a different graph, and the held numbers no longer describe it. */
    const styles = createFakeSession({
        result: resultFor,
        scope: () => [...nodes.keys()].join("|"),
        /* Read fresh on every call, because a board can grow the graph under the session
           (`addNode`), and the shape the shell reads has to move with it. */
        statistics: () => fixtureStatistics(nodes, edges, options.directedness ?? "undirected"),
    });

    for (const spec of options.extraLayers ?? []) {
        styles.seed(spec);
    }

    const dataManager = {
        nodes,
        edges,
        clear: vi.fn(),
    };

    /* The ELEMENT EXECUTING an algorithm, recorded by the same spy the boards have always
       asserted against. It writes nothing: a run publishes one result object now, and this
       stand-in publishes it through the session (see `resultFor` above). What is left for the
       spy is the fact the boards actually assert -- which passes ran, and in what order.

       The shell starts its runs through `session.runs.start(key)`, and the fake session calls
       this with the 1.10 spelling of the same key, which is the identical string for all four
       of these algorithms -- so the boards read as they always did. */
    const runAlgorithm = vi.fn((_namespace: string, _type: string) => undefined);

    /* Called only when the session really COMPUTES. A run the session re-serves, because
       nothing it measured has moved, reaches no algorithm at all -- which is how a board tells
       a second pass from the element handing back the pass it already holds. */
    styles.onStart((algorithm) => {
        runAlgorithm("graphty", algorithm);
    });

    /* The SELECTION, modelled rather than counted. `Graph.selectNode` is a pass-through to
       `SelectionManager.selectById`, which is `dataManager.getNode(id)` and then `select()`,
       which RETURNS EARLY, emitting nothing, when the node handed to it is the one it already
       holds (SelectionManager.ts:120-123, and its own test "selecting the same node is a
       no-op"). A bare `vi.fn()` here records the argument and proves neither: it cannot tell
       an id that found a node from one that missed, and it cannot tell a select that reached
       the reader from one the element swallowed. */
    let selectedId: string | number | null = null;

    /**
     * A node by id, the way `DataManager.getNode` finds one.
     *
     * The exact key first, and then the OTHER SPELLING of an integer id. That retry is the
     * element's, not this stand-in's invention: the element keys its node map on the id the
     * source file carried, GML numbers its nodes, and every id a surface has printed is text
     * by the time it comes back -- so `get("1")` against the key `1` has to find the node or
     * every ranked row is inert on the two samples that ship with numeric ids.
     * @param nodeId - the id as the caller holds it, printed or not.
     * @returns the node, or undefined when no node carries that id in either spelling.
     */
    const findNode = (nodeId: string | number): StubNode | undefined => {
        const exact = nodes.get(nodeId);

        if (exact !== undefined) {
            return exact;
        }

        if (typeof nodeId === "string") {
            return /^-?\d+$/.test(nodeId) ? nodes.get(Number.parseInt(nodeId, 10)) : undefined;
        }

        return Number.isInteger(nodeId) ? nodes.get(String(nodeId)) : undefined;
    };

    const emitSelection = (nodeId: string | number | null): void => {
        element?.dispatchEvent(
            new CustomEvent("selection-changed", {
                detail: {
                    previousNodeId: null,
                    currentNodeId: nodeId,
                    currentNode: nodeId === null ? null : { data: {} },
                },
            }),
        );
    };

    const selectNode = vi.fn((nodeId: string | number) => {
        const node = findNode(nodeId);

        if (node === undefined || selectedId === node.id) {
            return false;
        }

        selectedId = node.id;
        emitSelection(node.id);

        return true;
    });
    const deselectNode = vi.fn(() => {
        if (selectedId === null) {
            return;
        }

        selectedId = null;
        emitSelection(null);
    });
    const graph = {
        dataManager,
        getDataManager: () => dataManager,
        getNodes: () => [...nodes.values()],
        getSession: () => styles.session,
        runAlgorithm,
        selectNode,
        deselectNode,
        addListener: vi.fn(),
    };

    Object.defineProperty(element, "graph", { configurable: true, value: graph });

    /* The ELEMENT's `clearData`, which is what `GraphtyHandle.clearData` calls, and the swap
       a REPLACING load makes once its data has arrived. The stand-in clears the same records
       the real one does, so a board sees the graph actually empty rather than only the call
       recorded.

       THE RUNS GO WITH THE DATA. A result describes the graph it measured, so a run held over
       a dataset boundary would let the next load be served numbers taken from a file nobody is
       looking at any more. The fixture's own records stay standing, because these boards want
       a graph to load into rather than the element's data lifecycle. */
    const clearData = (): void => {
        dataManager.clear();
        styles.forgetRuns();
    };

    Object.defineProperty(element, "clearData", { configurable: true, value: clearData });

    const loadStub = element === null ? undefined : loadStubs.get(element);

    if (loadStub !== undefined) {
        loadStub.onReplaced = clearData;
    }

    const addNode = (id: string): void => {
        nodes.set(id, { id, data: { id } });
    };

    return {
        runAlgorithm,
        selectNode,
        deselectNode,
        elementHoldsSelection: () => selectedId,
        addNode,
        runIds: (algorithm: string) =>
            styles.session.runs
                .list()
                .filter((run) => run.algorithm === algorithm)
                .map((run) => run.id),
        styles,
        dataManager,
    };
}

/**
 * The layers one node-metric RUN painted.
 *
 * By SOURCE, never by index or by count: one metric encoding drives colour at a time, and the
 * failure this catches is a second run stacking its ramp on the first's.
 * @param layers - every layer the stack holds.
 * @returns the metric encoding layers, bottom first.
 */
function metricLayers(layers: readonly Layer[]): readonly Layer[] {
    return layers.filter(
        (layer) =>
            layer.source.by === "run" && ["degree", "pagerank", "betweenness"].includes(layer.source.algorithm),
    );
}

/**
 * The layers a community run painted.
 *
 * The other half of {@link metricLayers}, and the pair is what a board asserts node colour
 * with: the two families both drive node colour, so "one encoding at a time" is a claim about
 * both lists at once and cannot be made from either alone.
 * @param layers - every layer the stack holds.
 * @returns the community colour layers, bottom first.
 */
function communityLayers(layers: readonly Layer[]): readonly Layer[] {
    return layers.filter((layer) => layer.source.by === "run" && layer.source.algorithm === "louvain");
}

/**
 * A colour as the DOM spells it back, so a board compares like with like.
 *
 * `style.background` is read back in the browser's own notation ("rgb(68, 1, 84)"), and a
 * board that compared it with the hex it was given would fail for the wrong reason.
 * @param value - the colour, as the shell wrote it.
 * @returns the same colour as the DOM reports it.
 */
function cssColour(value: string): string {
    const probe = document.createElement("div");

    probe.style.background = value;

    return probe.style.background;
}

/**
 * Publishes the element's `style-changed`, which is how the shell learns its layer list.
 *
 * The stand-in's `addLayer` does not emit it, so a board that wants the shell to have
 * READ the layers -- which is what the auto-apply decision is taken over -- says so here
 * rather than asserting against a list the shell never saw.
 * @param container - the render result's container.
 */
function reportStyleChanged(container: HTMLElement): void {
    act(() => {
        container.querySelector("graphty-element")?.dispatchEvent(new CustomEvent("style-changed"));
    });
}

/**
 * Loads the cat sample row and lets the 7.2 defaults land.
 * @param container - the render result's container.
 */
async function loadCatSample(container: HTMLElement): Promise<void> {
    fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
    await reportLoadComplete(container);
}

/**
 * Opens the Analyze panel and presses one Suggested row's Run.
 * @param cardName - the card's plain name, e.g. "Most connected".
 */
async function runSuggested(cardName: string): Promise<void> {
    /* The rail's Analyze button TOGGLES, and a completed run has already opened the
       panel, so a second run that clicked it blindly would close the panel it needs. */
    if (screen.queryByRole("region", { name: "Analyze" }) === null) {
        fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    }

    fireEvent.click(screen.getByRole("button", { name: `Run ${cardName}` }));
    await flushMicrotasks();
}

describe("AppShell", () => {
    describe("the frame", () => {
        it("puts the rail in the main row and the status bar below it", () => {
            const { container } = renderShell();
            const shell = screen.getByTestId("app-shell");
            const mainRow = screen.getByTestId("shell-main-row");
            const rail = screen.getByRole("navigation", { name: "Activity rail" });

            expect(container).toContainElement(shell);
            expect(mainRow).toContainElement(rail);
            expect(getComputedStyle(shell).gridTemplateRows.split(" ").at(-1)).toBe(`${STATUS_BAR_HEIGHT}px`);
        });

        it("spans the top bar across the full shell width, above the rail", () => {
            renderShell();

            const shell = screen.getByTestId("app-shell");
            /* The frame's own first child, not `getByRole("banner")`: since 2026-09-14 the
               Data panel is drawn by default, and its 36px header is a second `<header>`
               element that dom-accessibility-api also reports as a banner. Reading the
               child directly asserts the same fact -- the bar is the frame's first grid
               row -- without depending on how many headers the body happens to hold. */
            const bar = shell.firstElementChild as HTMLElement;

            // The bar is the frame's OWN first row, not a child of the row that holds
            // the rail: spec 02 section 1.1 had it inset by the rail's 48 px column
            // until the product owner reversed that on 2026-09-12 (design 5.1).
            expect(bar.tagName).toBe("HEADER");
            expect(screen.getByTestId("shell-main-row")).not.toContainElement(bar);
            expect(getComputedStyle(shell).gridTemplateRows.split(" ")[0]).toBe(`${TOP_BAR_HEIGHT}px`);
        });

        it("still gives the rail its own 48 px column, left of panel, canvas and inspector", () => {
            renderShell();

            const columns = getComputedStyle(screen.getByTestId("shell-main-row")).gridTemplateColumns;

            expect(columns.split(" ")[0]).toBe(`${ACTIVITY_RAIL_WIDTH}px`);
        });

        it("leaves the main row unclipped, so the Help menu may stand outside the rail", () => {
            renderShell();

            expect(getComputedStyle(screen.getByTestId("shell-main-row")).overflow).toBe("visible");
        });

        it("draws the canvas region inside the body row", () => {
            const { container } = renderShell();
            const bodyRow = screen.getByTestId("shell-body-row");
            const canvas = container.querySelector('[data-shell-region="canvas"]');

            expect(canvas).not.toBeNull();
            expect(bodyRow).toContainElement(canvas as HTMLElement);
        });
    });

    describe("the rail's destinations", () => {
        it("opens a panel on the activity it names", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
        });

        /* REWRITTEN 2026-09-14 from "closes the panel when the active activity is clicked
           again". spec:153's close-on-active-click was struck: the rail is a pure activity
           chooser, and the top bar's one control is the only thing that hides a sidebar.
           This CHANGES LONG-STANDING MUSCLE MEMORY and needs the product owner's explicit
           assent before it ships. */
        it("leaves the panel open when the active activity is clicked again", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
        });

        it("routes Settings to its own overlay rather than through the active activity", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Settings" }));

            expect(screen.getByTestId("settings-overlay")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-pressed", "false");
        });

        it("sends the assistant's setup prompt to the AI providers pane, not just to Settings", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "AI" }));
            fireEvent.click(screen.getByTestId("ai-open-settings"));

            expect(screen.getByRole("tabpanel", { name: "AI providers" })).toBeInTheDocument();
            expect(screen.getByTestId("ai-key-input-anthropic")).toBeInTheDocument();
        });

        it("returns Settings to the pane it was left on when the rail opens it", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "AI" }));
            fireEvent.click(screen.getByTestId("ai-open-settings"));
            fireEvent.click(screen.getByTestId("settings-close"));
            /* The rail's own Settings, not the setup prompt's: the AI panel is still
               open behind the overlay and its prompt draws a button of that name. */
            fireEvent.click(
                within(screen.getByRole("navigation", { name: "Activity rail" })).getByRole("button", {
                    name: "Settings",
                }),
            );

            expect(screen.getByRole("tabpanel", { name: "AI providers" })).toBeInTheDocument();
        });

        it("opens the Help menu as a sibling of the rail, not as one of its children", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));

            const menu = screen.getByRole("menu");
            const rail = screen.getByRole("navigation", { name: "Activity rail" });

            expect(rail).not.toContainElement(menu);
            expect(screen.getByTestId("shell-main-row")).toContainElement(menu);
        });

        it("leaves Help hovered rather than active while its menu is open", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));

            expect(screen.getByRole("button", { name: "Help and keyboard shortcuts" })).toHaveAttribute(
                "aria-pressed",
                "false",
            );
        });
    });

    describe("the Help menu's destinations", () => {
        it("opens the keyboard shortcuts surface from its first row", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));
            fireEvent.click(screen.getByRole("menuitem", { name: /Keyboard shortcuts/ }));

            expect(screen.getByTestId("keyboard-shortcuts")).toBeInTheDocument();
        });

        it("opens the feedback dialog from Send feedback", async () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));
            fireEvent.click(screen.getByRole("menuitem", { name: "Send feedback" }));

            expect(await screen.findByRole("dialog")).toBeInTheDocument();
        });
    });

    describe("the Escape ladder", () => {
        it("closes the Help menu on rung 2", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));
            fireEvent.keyDown(window, { key: "Escape" });

            expect(screen.queryByRole("menu")).toBeNull();
        });

        it("closes the keyboard shortcuts surface on the same rung", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));
            fireEvent.click(screen.getByRole("menuitem", { name: /Keyboard shortcuts/ }));
            fireEvent.keyDown(window, { key: "Escape" });

            expect(screen.queryByTestId("keyboard-shortcuts")).toBeNull();
        });
    });

    describe("the command palette", () => {
        it("opens from the top bar's trigger pill", async () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: /Search commands, nodes and edges/ }));

            expect(await screen.findByTestId("command-palette")).toBeInTheDocument();
        });

        /* Only a mouse click outside a pop-out closes pop-outs on its own. A palette row is
           inside a portal the pop-out layer counts as its own, so choosing Go to Settings
           closed nothing, and the History pop-out stayed drawn over the Settings overlay. */
        it("closes an open pop-out when Go to Settings opens Settings", async () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "History" }));
            expect(await screen.findByText(/entries|entry/)).toBeInTheDocument();

            fireEvent.click(screen.getByRole("button", { name: /Search commands, nodes and edges/ }));
            await screen.findByTestId("command-palette");
            fireEvent.click(screen.getByRole("option", { name: /^Go to\s*Settings/ }));

            expect(await screen.findByTestId("settings-overlay")).toBeInTheDocument();
            await waitFor(() => {
                expect(screen.queryByText(/entries|entry/)).toBeNull();
            });
        });

        /* Pop-outs sit above the palette modal, so one left open by a key press would be
           drawn over the palette. */
        it("closes an open pop-out when Cmd+K opens the palette", async () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "History" }));
            expect(await screen.findByText(/entries|entry/)).toBeInTheDocument();

            act(() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
            });
            await screen.findByTestId("command-palette");
            await waitFor(() => {
                expect(screen.queryByText(/entries|entry/)).toBeNull();
            });
        });

        it("closes the shortcuts sheet when Go to Settings opens Settings over it", async () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));
            fireEvent.click(screen.getByRole("menuitem", { name: /Keyboard shortcuts/ }));
            expect(screen.getByTestId("keyboard-shortcuts")).toBeInTheDocument();

            act(() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
            });
            await screen.findByTestId("command-palette");
            fireEvent.click(screen.getByRole("option", { name: /^Go to\s*Settings/ }));

            expect(await screen.findByTestId("settings-overlay")).toBeInTheDocument();
            expect(screen.queryByTestId("keyboard-shortcuts")).toBeNull();
        });

        it("carries the only row that brings a hidden canvas toolbar back", async () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: /Search commands, nodes and edges/ }));
            await screen.findByTestId("command-palette");

            expect(screen.getByRole("option", { name: /Show canvas toolbar/ })).toBeInTheDocument();
        });
    });

    /* -------------------------------------------------------------------------- */
    /* THE ONE PANEL MODEL (2026-09-14)                                            */
    /*                                                                             */
    /* Five describes stood between here and the Empty state, and all five were     */
    /* deleted with the mechanisms they tested:                                     */
    /*                                                                              */
    /*  - "the top bar's region switches": two mirrored switches, one per sidebar.   */
    /*  - "the Keep open latch": a latch in each header, vetoing every close the     */
    /*    shell performed on its own.                                                */
    /*  - "the first visit, with nothing remembered": a width-aware first-visit      */
    /*    layout that opened neither surface below 1280 and latched both above it.   */
    /*  - "the node-tap carve-out": a canvas tap dismissing whichever region overlay  */
    /*    was open below 1280, unless the tap had selected a node.                    */
    /*                                                                               */
    /* The product owner's instruction was "our panel open / closed / autohide is a   */
    /* confusing nightmare. remove the panel locks and remove autohide ... there is    */
    /* one button to hide / show both at the same time and not individual buttons",    */
    /* followed by "there will be no more auto-hide. below 1280 should just say         */
    /* 'screen too small' or something similar". What replaced all of it is one        */
    /* persisted boolean and one control, and these boards are its whole surface.      */
    /* -------------------------------------------------------------------------- */

    describe("the one sidebars switch", () => {
        it("draws exactly one sidebars control, and no per-surface toggle, latch or close anywhere in the shell", async () => {
            await renderMeasuredShell();

            expect(screen.getAllByRole("button", { name: "Toggle sidebars" })).toHaveLength(1);

            /* Queried over the WHOLE tree, not one region: the point is that no surface
               anywhere kept a control of its own over its own presence. */
            expect(screen.queryByRole("button", { name: "Toggle panel" })).toBeNull();
            expect(screen.queryByRole("button", { name: "Toggle inspector" })).toBeNull();
            expect(screen.queryByRole("button", { name: "Keep open" })).toBeNull();
            expect(screen.queryByRole("button", { name: "Close the panel" })).toBeNull();
            expect(screen.queryByTestId("panel-header-keep-open")).toBeNull();
            expect(screen.queryByTestId("panel-header-close")).toBeNull();
            expect(screen.queryByTestId("inspector-keep-open")).toBeNull();
            expect(screen.queryByTestId("inspector-toggle")).toBeNull();
        });

        it("hides and shows BOTH sidebars from the one button", async () => {
            await renderMeasuredShell();

            const toggle = screen.getByRole("button", { name: "Toggle sidebars" });

            expect(toggle).toHaveAttribute("aria-pressed", "true");
            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByTestId("inspector")).toBeInTheDocument();

            fireEvent.click(toggle);

            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
            expect(screen.queryByTestId("inspector")).toBeNull();
            expect(screen.getByRole("button", { name: "Toggle sidebars" })).toHaveAttribute("aria-pressed", "false");

            fireEvent.click(screen.getByRole("button", { name: "Toggle sidebars" }));

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByTestId("inspector")).toBeInTheDocument();
        });

        it("runs the same callback as Ctrl+B, and the D key no longer reaches the inspector", async () => {
            await renderMeasuredShell();

            fireEvent.keyDown(window, { key: "b", ctrlKey: true });

            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
            expect(screen.queryByTestId("inspector")).toBeNull();

            /* D was `toggleInspector` until 2026-09-14 and its row was deleted from the
               binding table rather than renamed: a second chord for one fact is a second
               thing that can disagree with the first. */
            fireEvent.keyDown(window, { key: "d" });

            expect(screen.queryByTestId("inspector")).toBeNull();

            fireEvent.keyDown(window, { key: "b", ctrlKey: true });

            expect(screen.getByTestId("inspector")).toBeInTheDocument();
        });

        it("keeps the rail a pure chooser: the active icon no longer closes its panel", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            /* spec:153's close-on-active-click was the last individual control that hid
               ONE sidebar. It is struck, and this board is the record of that. */
            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
        });

        it("brings both sidebars back when a rail icon is clicked while they are hidden", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Toggle sidebars" }));

            expect(screen.queryByTestId("activity-panel")).toBeNull();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            /* A rail icon that did nothing for six of its eight destinations would be six
               controls reporting a state they are not in (6.14). The click can only ever
               SHOW, so it is not a second hiding mechanism. */
            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByTestId("inspector")).toBeInTheDocument();
        });

        it("leaves the switch lit for Settings, which covers the body row rather than replacing the panel", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Settings" }));

            expect(screen.getByRole("button", { name: "Toggle sidebars" })).toHaveAttribute("aria-pressed", "true");
        });

        it("does not close the activity panel when the data table drawer opens", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            fireEvent.keyDown(window, { key: "T", shiftKey: true });

            /* `closePanelForNarrowDrawer` evicted the panel below 1280 so the drawer would
               not be covered by it. Opening a dock may not hide a sidebar under the
               one-button model; 5.2 line 448's promise that the drawer never covers either
               sidebar is kept by INSETTING the drawer instead. */
            expect(screen.getByTestId("activity-panel")).toBeInTheDocument();
        });
    });

    describe("the first visit, with nothing remembered", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        /**
         * Renders the shell as a FIRST VISIT reaches it: persistence on, an empty store,
         * and the measurement flushed so the canvas has a rect.
         * @param shellWidth - the viewport width the store starts from.
         * @returns the render result, once the measurement has been applied.
         */
        async function renderFirstVisitShell(shellWidth: number) {
            window.localStorage.clear();

            const result = render(<AppShell initialShellWidth={shellWidth} measureViewport={false} />);

            await act(async () => {
                await Promise.resolve();
            });

            return result;
        }

        it("shows both sidebars at 1440, which is what was asked for", async () => {
            await renderFirstVisitShell(1440);

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByTestId("inspector")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Toggle sidebars" })).toHaveAttribute("aria-pressed", "true");
        });

        it("shows both sidebars at the minimum width too, because width no longer decides anything", async () => {
            await renderFirstVisitShell(NARROW_BREAKPOINT);

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByTestId("inspector")).toBeInTheDocument();
        });

        it("remembers hidden sidebars across a reload", async () => {
            const first = await renderFirstVisitShell(1440);

            fireEvent.click(screen.getByRole("button", { name: "Toggle sidebars" }));
            first.unmount();

            const second = render(<AppShell initialShellWidth={1440} measureViewport={false} />);

            await act(async () => {
                await Promise.resolve();
            });

            expect(screen.queryByTestId("activity-panel")).toBeNull();
            second.unmount();
        });
    });

    describe("below the minimum width", () => {
        /* THE WHOLE NARROW LAYOUT IS GONE. It was two 280 px overlays over a canvas that
           was never resized under them, one open at a time, dismissible by a canvas tap
           or Escape's third rung, either dismissal vetoable by a latch. The spec measured
           what it produced (SPEC:5790-5796): at 1024x900 109 px of the Welcome sheet sat
           under each overlay and its heading read "aph to get started"; at 600 and 375
           there was no canvas and no Welcome content at all. */
        it("renders a screen-too-small state instead of laying out", async () => {
            await renderMeasuredShell(NARROW_BREAKPOINT - 1);

            expect(screen.getByTestId("screen-too-small")).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Screen too small" })).toBeInTheDocument();
            expect(screen.getByText(new RegExp(`${String(NARROW_BREAKPOINT)} pixels wide`))).toBeInTheDocument();
        });

        /*
         * This asserted `app-shell` was NULL until 2026-09-15, on the reasonable-sounding
         * argument that a shell which does not lay out should not be in the DOM. Driving
         * the built app showed what that cost: unmounting the subtree unmounted
         * `<graphty-element>` with it, and widening back past 1280 remounted a FRESH
         * element -- a new Babylon scene with no data -- while this component's state
         * still said a graph was loaded, so nothing reloaded it. Load the cat fixture,
         * resize to 1100, resize back to 1440, and the canvas is empty (3.25% of canvas
         * pixels non-background, against 6.48% before) under a status bar still reading
         * "20 nodes 29 edges".
         *
         * So the shell now STAYS MOUNTED and is hidden behind the overlay. What the
         * reader must not be able to do is reach it: hence hidden, inert and aria-hidden,
         * which is what this test pins instead of absence.
         */
        it("keeps the shell mounted but hidden and unreachable, so the loaded graph survives", async () => {
            await renderMeasuredShell(NARROW_BREAKPOINT - 1);

            const shell = screen.getByTestId("app-shell");

            expect(shell).toBeInTheDocument();
            expect(shell).toHaveStyle({ visibility: "hidden" });
            expect(shell).toHaveAttribute("inert");
            expect(shell).toHaveAttribute("aria-hidden", "true");
        });

        it("puts the too-small message above the shell rather than beside it", async () => {
            await renderMeasuredShell(NARROW_BREAKPOINT - 1);

            const overlay = screen.getByTestId("screen-too-small");

            expect(overlay).toHaveStyle({ position: "fixed" });
            expect(Number(overlay.style.zIndex)).toBeGreaterThan(MANTINE_MODAL_Z_INDEX);
        });

        it("lays out again at exactly the minimum width", async () => {
            await renderMeasuredShell(NARROW_BREAKPOINT);

            expect(screen.queryByTestId("screen-too-small")).toBeNull();
            expect(screen.getByTestId("app-shell")).toBeInTheDocument();
        });
    });

    describe("the Empty state", () => {
        it("disables the four activities that need data", async () => {
            await renderMeasuredShell();

            expect(screen.getByRole("button", { name: "Explore. Load data first" })).toHaveAttribute(
                "aria-disabled",
                "true",
            );
        });

        it("renders no status bar slot, because the session holds no counts yet", async () => {
            const { container } = await renderMeasuredShell();

            expect(container.querySelectorAll("[data-status-slot]")).toHaveLength(0);
        });

        it("mounts the graph host behind Welcome, so the first load has a handle to call", async () => {
            const { container } = await renderMeasuredShell();

            // The blocker this board guards: loading data goes through the host's
            // imperative handle, so a host mounted only once data is loaded leaves the
            // shell unable to leave Empty at all.
            expect(container.querySelector("[data-canvas-graph='true']")).not.toBeNull();
            expect(container.querySelector("[data-canvas-welcome='true']")).not.toBeNull();
        });
    });

    describe("the Explore search field", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        /* The field is a controlled input, and the shell supplied neither its value nor
           its handler, so it was pinned to the empty string and every keystroke was
           discarded -- product owner, 2026-09-13: "I can't type in the search nodes and
           edges textbox under explore". Typing is the only assertion that fails on that:
           the field rendered perfectly well all along. The panel switch is the second
           half: `renderPanelBody` builds the Explore body per activity, so a field whose
           state lived inside the panel would come back empty, and this is why the query
           is held in the shell beside the panel's other remembered values. */
        it("holds what is typed, and still holds it after a panel switch", async () => {
            const { container } = await renderMeasuredShell();

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            // The load's own 7.2 default leaves the panel on Explore, so the field is
            // already on screen: clicking the rail item here would close the panel.
            await screen.findByRole("region", { name: "Explore" });

            const field = screen.getByRole("textbox", { name: "Search nodes and edges" });

            fireEvent.change(field, { target: { value: "acct" } });

            expect(field).toHaveValue("acct");

            fireEvent.click(screen.getByRole("button", { name: "Style" }));
            fireEvent.click(screen.getByRole("button", { name: "Explore" }));

            expect(screen.getByRole("textbox", { name: "Search nodes and edges" })).toHaveValue("acct");
        });

        it("keeps the scope the reader picked", async () => {
            const { container } = await renderMeasuredShell();

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            await screen.findByRole("region", { name: "Explore" });

            fireEvent.click(screen.getByTestId("explore-search-scope"));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Visible nodes" }));

            fireEvent.click(screen.getByRole("button", { name: "Style" }));
            fireEvent.click(screen.getByRole("button", { name: "Explore" }));

            expect(screen.getByTestId("explore-search-scope")).toHaveTextContent("Visible nodes");
        });

        /**
         * Loads the sample, stands a session on the element whose selection records what the
         * shell asks of it, and opens Explore.
         * @param refuse - the sentence the element refuses every query with, if any.
         * @returns the container and the selection's two recorded verbs.
         */
        async function searchableShell(refuse?: string) {
            const { container } = await renderMeasuredShell();

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            await screen.findByRole("region", { name: "Explore" });

            const fake = installGraph(container, []);
            const apply = vi.fn(() => (refuse === undefined ? Promise.resolve({}) : Promise.reject(new Error(refuse))));
            const clear = vi.fn();

            Object.assign(fake.session, { selection: { apply, clear } });

            return { container, apply, clear };
        }

        /**
         * Fires the element's own selection change, as a click, a search or a command does.
         * @param container - the render result's container.
         * @param nodes - how many nodes the selection holds now.
         * @param edges - how many edges it holds now.
         * @param cause - who asked.
         */
        function reportSelectionChange(container: HTMLElement, nodes: number, edges: number, cause: string) {
            act(() => {
                container.querySelector("graphty-element")?.dispatchEvent(
                    new CustomEvent("graphty-selection-change", {
                        detail: { added: [], removed: [], nodes, edges, truncated: false, unresolvedPaths: [], cause },
                        bubbles: true,
                        composed: true,
                    }),
                );
            });
        }

        const field = (): HTMLElement => screen.getByRole("textbox", { name: "Search nodes and edges" });

        it("sends what is typed to the element's selection, over the scope picked", async () => {
            const { apply } = await searchableShell();

            fireEvent.change(field(), { target: { value: "acct" } });
            await waitFor(() => {
                expect(apply).toHaveBeenLastCalledWith({ text: "acct", scope: "graph" });
            });

            fireEvent.click(screen.getByTestId("explore-search-scope"));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Visible nodes" }));
            await waitFor(() => {
                expect(apply).toHaveBeenLastCalledWith({ text: "acct", scope: "visible" });
            });
        });

        it("runs the query still in the field again when a new dataset loads", async () => {
            const { container, apply } = await searchableShell();

            fireEvent.change(field(), { target: { value: "acct" } });
            await waitFor(() => {
                expect(apply).toHaveBeenCalledTimes(1);
            });

            await reportLoadComplete(container);
            await waitFor(() => {
                expect(apply).toHaveBeenCalledTimes(2);
            });
        });

        it("shows the element's refusal under the field", async () => {
            await searchableShell("E_BAD_SELECTOR: the expression does not parse");

            fireEvent.change(field(), { target: { value: "=data.type ==" } });

            expect(await screen.findByTestId("explore-search-error")).toHaveTextContent(
                "E_BAD_SELECTOR: the expression does not parse",
            );
        });

        it("clears what the search selected when the field is emptied", async () => {
            const { apply, clear } = await searchableShell();

            fireEvent.change(field(), { target: { value: "acct" } });
            await waitFor(() => {
                expect(apply).toHaveBeenCalled();
            });

            fireEvent.change(field(), { target: { value: "" } });
            await waitFor(() => {
                expect(clear).toHaveBeenCalledTimes(1);
            });
        });

        it("leaves a clicked selection alone when the field is emptied after it", async () => {
            const { container, apply, clear } = await searchableShell();

            fireEvent.change(field(), { target: { value: "acct" } });
            await waitFor(() => {
                expect(apply).toHaveBeenCalled();
            });

            reportSelectionChange(container, 1, 0, "user");
            fireEvent.change(field(), { target: { value: "" } });
            await act(async () => {
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 400);
                });
            });

            expect(clear).not.toHaveBeenCalled();
        });

        it("counts the element's selection in the status bar, and shows nothing once it is empty", async () => {
            const { container } = await searchableShell();

            // A clicked node the shell still remembers must not outlive the element's own count.
            reportSelection(container, "n1");
            reportSelectionChange(container, 3, 1, "api");
            expect(screen.getByText("4 selected")).toBeInTheDocument();

            reportSelectionChange(container, 0, 0, "api");
            expect(screen.queryByText(/selected$/)).toBeNull();
        });
    });

    describe("the style layers list", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        /**
         * Renders the shell with the Style panel already open, from the remembered
         * activity 6.5 allows the store to keep.
         * @returns the render result.
         */
        async function renderStylePanel() {
            window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify({ activeActivity: "style" }));

            const result = render(<AppShell initialShellWidth={1440} measureViewport={false} />);

            await act(async () => {
                await Promise.resolve();
            });

            return result;
        }

        it("commits an inline rename to graphty-element, which owns the names", async () => {
            const { container } = await renderStylePanel();
            const fake = installGraph(container, ["New Layer 1"]);

            await settleSession();

            const list = screen.getByTestId("style-layers");

            fireEvent.doubleClick(within(list).getByText("New Layer 1"));

            const input = within(list).getByRole("textbox");

            fireEvent.change(input, { target: { value: "Renamed" } });
            fireEvent.blur(input);

            await settleSession();

            /* The whole defect: the list's one upward channel could express a reorder and
               nothing else, so a rename -- same positional ids, same order -- reached the
               element never at all and the row kept drawing the old name. A layer is named
               by its ID now, so a rename is one patch carrying one key. */
            expect(fake.layers().map((layer) => layer.name)).toEqual(["default", "selection", "Renamed"]);
        });

        it("commits a colour from the style inspector, and the layer reads it back", async () => {
            /* Product owner, 2026-09-13: "changing the color of a style in the style inspector
               doesn't change the color in component or in the graph". The edit used to be
               spread away on its way out, because the list's channel read the live layer back
               and overrode the NAME alone. */
            const { container } = await renderStylePanel();
            const fake = installGraph(container, ["Base"]);

            await settleSession();

            fireEvent.click(within(screen.getByTestId("style-layers")).getByText("Base"));

            const colorGroups = (await screen.findAllByRole("group", { name: "Color" })).filter(
                (element) => element.getAttribute("data-testid") === "control-group",
            );

            expect(colorGroups).toHaveLength(1);

            const hex = within(colorGroups[0]).getByLabelText("Color hex value");

            fireEvent.change(hex, { target: { value: "FF0000" } });
            fireEvent.blur(hex);

            await settleSession();

            const written = fake.layers().find((layer) => layer.name === "Base");

            expect(written?.set).toEqual({ "node.color": "#FF0000" });
            /* And the layer keeps everything else it had. A patch is merged one key deep, so
               an edit to one channel cannot silently rewrite the layer's identity. */
            expect(written?.name).toBe("Base");
            expect(written?.source).toEqual({ by: "user" });
        });

        it("commits the node selector the inspector edits, through the same channel", async () => {
            const { container } = await renderStylePanel();
            const fake = installGraph(container, ["Base"]);

            await settleSession();

            fireEvent.click(within(screen.getByTestId("style-layers")).getByText("Base"));

            const selector = await screen.findByLabelText("Node Selector");

            fireEvent.change(selector, { target: { value: "type == `person`" } });
            fireEvent.blur(selector);

            await settleSession();

            expect(fake.layers().find((layer) => layer.name === "Base")?.selector).toEqual({
                match: "expression",
                where: "type == `person`",
            });
        });

        it("leaves the layers alone when nothing was renamed", async () => {
            const { container } = await renderStylePanel();
            const fake = installGraph(container, ["Base"]);

            await settleSession();

            const before = fake.layers();
            const list = screen.getByTestId("style-layers");

            fireEvent.doubleClick(within(list).getByText("Base"));
            fireEvent.blur(within(list).getByRole("textbox"));

            await settleSession();

            expect(fake.layers()).toEqual(before);
        });

        /**
         * Drags one layer row by its handle and drops it on another row, with the pointer events
         * the list's drag sensor listens for.
         * @param list - the layer list.
         * @param from - the name of the row to drag.
         * @param to - the name of the row to drop it on.
         */
        async function dragRow(list: HTMLElement, from: string, to: string): Promise<void> {
            // A row is the nearest box around the name that also holds a drag handle.
            const rowOf = (name: string): HTMLElement => {
                let row: HTMLElement | null = within(list).getByText(name);

                while (row !== null && row.querySelector('[data-testid="layer-drag-handle"]') === null) {
                    row = row.parentElement;
                }

                expect(row).not.toBeNull();

                return row as HTMLElement;
            };
            const handle = within(rowOf(from)).getByTestId("layer-drag-handle");
            const start = handle.getBoundingClientRect();
            const source = rowOf(from).getBoundingClientRect();
            const target = rowOf(to).getBoundingClientRect();
            const x = start.left + start.width / 2;
            const y = start.top + start.height / 2;
            const dy = target.top + target.height / 2 - (source.top + source.height / 2);
            const pointer = { button: 0, buttons: 1, isPrimary: true, pointerId: 1, clientX: x };

            await act(async () => {
                fireEvent.pointerDown(handle, { ...pointer, clientY: y });
                await new Promise((resolve) => requestAnimationFrame(resolve));
            });
            await act(async () => {
                fireEvent.pointerMove(document, { ...pointer, clientY: y + dy / 2 });
                await new Promise((resolve) => requestAnimationFrame(resolve));
                fireEvent.pointerMove(document, { ...pointer, clientY: y + dy });
                await new Promise((resolve) => requestAnimationFrame(resolve));
            });
            await act(async () => {
                fireEvent.pointerUp(document, { ...pointer, buttons: 0, clientY: y + dy });
                await new Promise((resolve) => requestAnimationFrame(resolve));
            });
            await settleSession();
        }

        /* A drag reports the whole reordered list, and the shell used to move the FIRST layer
           that differed. Dragged up two or more places, that is a layer the drag only pushed
           aside, which already sat below its new neighbour -- so the move changed nothing and
           the list snapped back. The stack is bottom first; the list draws it top first. */
        it.each([
            { moved: "up by one", from: "A", to: "B", expected: ["B", "A", "C", "D"] },
            { moved: "up by two", from: "A", to: "C", expected: ["B", "C", "A", "D"] },
            { moved: "up by three", from: "A", to: "D", expected: ["B", "C", "D", "A"] },
            { moved: "down by one", from: "D", to: "C", expected: ["A", "B", "D", "C"] },
            { moved: "down by two", from: "D", to: "B", expected: ["A", "D", "B", "C"] },
        ])("moves exactly the dragged layer when it is dragged $moved", async ({ from, to, expected }) => {
            const { container } = await renderStylePanel();
            const fake = installGraph(container, ["A", "B", "C", "D"]);

            await settleSession();
            await dragRow(screen.getByTestId("style-layers"), from, to);

            expect(fake.layers().map((layer) => layer.name)).toEqual(["default", "selection", ...expected]);
        });

        it("draws the reader's own layers and never the element's", async () => {
            /* The element's base and selection layers are locked: removing, editing or moving
               one is refused, so a list that drew them would offer three controls that all
               say no. `locked` is exactly `source.by === "element"`, which replaces naming
               them from a list of two strings -- and that list lost the suppression for a
               reader who called their own layer "default". */
            const { container } = await renderStylePanel();

            installGraph(container, ["Mine"]);

            await settleSession();

            const list = screen.getByTestId("style-layers");

            expect(within(list).getByText("Mine")).toBeInTheDocument();
            expect(within(list).queryByText("default")).not.toBeInTheDocument();
            expect(within(list).queryByText("selection")).not.toBeInTheDocument();
        });
    });

    /* ---------------------------------------------------------------------- */
    /* The novice path (spec 7)                                                */
    /* ---------------------------------------------------------------------- */

    describe("the novice path", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        it("draws Welcome's three sample rows, with the size string each carries", async () => {
            const { container } = await renderMeasuredShell();

            /* Scoped to the WELCOME sheet since 2026-09-14. The Data panel is now drawn by
               default and offers the same three samples from the same manifest (spec
               5648), so every name and size is on screen twice; an unscoped query finds
               both and says nothing about which surface drew them. */
            const welcome = container.querySelector("[data-canvas-welcome='true']") as HTMLElement;

            expect(welcome).not.toBeNull();

            for (const record of SAMPLE_MANIFEST) {
                expect(within(welcome).getByText(record.name)).toBeInTheDocument();
                expect(within(welcome).getByText(sampleSizeString(record.size))).toBeInTheDocument();
            }

            expect(SAMPLE_MANIFEST).toHaveLength(3);
        });

        it("offers the same three samples in the Data panel, from the same manifest", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            const panel = screen.getByRole("region", { name: "Data" });

            for (const record of SAMPLE_MANIFEST) {
                /* Spec 5648 makes this ONE manifest with two surfaces. The canvas row is
                   still drawn behind the panel, so each name is on screen twice; finding
                   it inside the panel is what says the panel's section is filled. */
                expect(within(panel).getByText(record.name)).toBeInTheDocument();
            }
        });

        it("loads an inline sample through the ordinary load path, not around it", async () => {
            const { container } = await renderMeasuredShell();
            const loads = captureLoads(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);

            /* The `?test` fixture's own route: the format and the serialised payload reach
               the element's data source, and the counts are then read from the graph's own
               data events rather than written here from the fixture's length. */
            expect(loads).toHaveLength(1);
            expect(loads[0]?.dataSource).toBe("json");
            expect(JSON.parse(String((loads[0]?.config as { data?: unknown }).data))).toEqual(CAT_SOCIAL_NETWORK);
            expect(screen.getByText(CAT_SOCIAL_NETWORK_NAME)).toBeInTheDocument();
        });

        it("loads a served sample from the URL its manifest row names", async () => {
            const { container } = await renderMeasuredShell();
            const loads = captureLoads(container);

            fireEvent.click(container.querySelector('[data-sample-row="karate"]') as HTMLElement);
            await flushMicrotasks();

            expect(loads[0]?.dataSource).toBe("gml");
            expect(loads[0]?.config).toEqual({ url: "/samples/karate.gml" });
            expect(screen.getByText("karate.gml")).toBeInTheDocument();
        });

        it("reads the graph summary from the records the graph reported", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            /* The hand-walk's own sentence. It is the template's, fed only facts one
               O(n+m) pass measured: no type clause, because no column-role model exists,
               and no "at most N steps", because a diameter is above the template's
               O(n+m) ceiling. */
            expect(
                screen.getByText("20 nodes, connected by 29 relationships. One connected part holds all 20 nodes."),
            ).toBeInTheDocument();
        });

        it("fills Most connected from the degree pass 7.2 runs at import", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            const inspector = screen.getByTestId("inspector");

            expect(within(inspector).getByText("Chonky_Boy")).toBeInTheDocument();
        });

        /* ONE layer, not three. 7.2's neutral-colour and size-by-degree layers were
           reverted on 2026-09-13 so the element's hand-tuned node and edge defaults stand;
           only the label layer remains, because it adds a channel rather than overriding a
           tuned value. This board is what would catch either of them coming back without
           the normalisation fix the revert note asks for. */
        it("applies the 7.2 label layer and leaves the tuned node defaults alone", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const added = shellLayers(graph.styles.layers());

            expect(added).toHaveLength(1);
            /* The label layer is a RULE, not a list: it names the degree RUN and asks each
               node's own measurement whether to draw its label, so a node the pass never
               reached carries no value, reads absent and is not painted. The board used to
               read a JavaScript expression out of a `calculatedStyle` sibling, which is the
               machinery the 2.0 stack removed. */
            expect(added[0].selector).toMatchObject({ match: "expression" });
            expect((added[0].selector as { where: string }).where).toContain(`.${METRIC_VALUE_FIELD} >=`);
            expect(added[0].encode).toHaveProperty("node.label");
            /* Nothing the shell adds may set a node colour or a node size any more, by either
               a literal or a rule. */
            for (const layer of added) {
                expect(layer.set?.["node.color"]).toBeUndefined();
                expect(layer.set?.["node.size"]).toBeUndefined();
                expect(layer.encode?.["node.color"]).toBeUndefined();
                expect(layer.encode?.["node.size"]).toBeUndefined();
            }
        });

        it("shows the Insights strip with the cards this build can carry to a reading", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            expect(strip).not.toBeNull();
            expect(within(strip).getByText("Find groups")).toBeInTheDocument();
            expect(within(strip).getByText("Search for something you know")).toBeInTheDocument();
            /* The rule table has always produced a degree card, and it used to be filtered
               out because it could not write a reading. It can now, so it is drawn -- the
               third thing 7.3 makes a card click promise is met. */
            expect(within(strip).getByText("Who is most connected")).toBeInTheDocument();
        });

        it("runs Find groups from its card: paints the groups, opens Analyze and writes the reading", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            fireEvent.click(within(strip).getByText("Find groups"));
            await flushMicrotasks();

            expect(graph.runAlgorithm).toHaveBeenCalledWith(COMMUNITY_NAMESPACE, COMMUNITY_TYPE);
            expect(screen.getByRole("region", { name: "Analyze" })).toBeInTheDocument();

            const inspector = screen.getByTestId("inspector");

            /* Two sentences, which is RT-10's cap (design line 4672) rather than the four
               7.5's own worked example takes -- see `communityReading`'s doc comment. What
               the colours mean moved to the legend's channel line, asserted below. */
            expect(
                within(inspector).getByText("4 groups found. The groups are clearly separated (modularity 0.447)."),
            ).toBeInTheDocument();
            expect(within(inspector).getByText("Louvain, 20 nodes")).toBeInTheDocument();

            /* The legend names the encoding the reading stopped claiming: design line 201's
               "Color: groups, categorical". Without this the canvas repainted every node and
               nothing on screen said what the colours meant.

               THE WORDS ARE THE ELEMENT's. The field's plain and technical names come off the
               run's own catalogue entry rather than out of a table in the shell, so the legend
               and the picture are two readings of one object -- which is why the block says
               "Community (group)" and not the shell's own 6.3 pair. */
            const legend = screen.getByLabelText("Legend");

            expect(within(legend).getByText("Color: Community")).toBeInTheDocument();
            expect(within(legend).getByText("group", { exact: false })).toBeInTheDocument();
            /* ONE layer, not one per coloured group: the run derives a single categorical
               encoding, scoped to the nodes it grouped, and it carries the run's own source so
               Delete layer can take it away by naming the run. */
            expect(communityLayers(graph.styles.layers())).toHaveLength(1);
        });

        it("leaves exactly one undoable history entry for a card click", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            fireEvent.click(within(strip).getByText("Find groups"));
            await flushMicrotasks();

            fireEvent.click(screen.getByRole("button", { name: "History" }));

            /* Spec 7.1 item 2: ONE entry. The encoding does not get a second one, because
               nothing in this build can undo a style layer independently of the result, and
               a row whose Undo does nothing is worse than no row. */
            expect(await screen.findByText("1 entry, 0 undone")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
        });

        it("loads and runs the suggested card from the sample's own hint, in one interaction", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-hint="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            /* The order is the point: the degree pass and the neutral base land first, so
               the group colours are painted OVER them rather than under them. */
            expect(graph.runAlgorithm).toHaveBeenCalledWith(DEGREE_NAMESPACE, DEGREE_TYPE);
            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE, COMMUNITY_TYPE]);
            expect(screen.getByRole("region", { name: "Analyze" })).toBeInTheDocument();
        });

        it("does not run the suggested card when the row itself was clicked", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE]);
        });

        it("hides the strip from its own X, and remembers it", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            fireEvent.click(screen.getByRole("button", { name: "Hide suggestions" }));

            expect(container.querySelector('[data-canvas-overlay="insights"]')).toBeNull();
        });

        it("takes the 7.2 decisions when the load reports COMPLETE, not on its first chunk", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await flushMicrotasks();

            /* The records are on the graph and the shell has read them, which is the
               state after the FIRST chunk of a chunked load: `DataManager` adds each
               chunk and emits `data-added` with an await between them. Nothing 7.2
               decides may be decided here. On a file over about a thousand nodes this is
               a fraction of the graph, and the layout, the label budget, the size scale,
               Most connected and the Search example would every one of them be measured
               over that fraction and never corrected -- so the above-threshold
               Performance branch could never be selected at all. */
            expect(graph.runAlgorithm).not.toHaveBeenCalled();
            expect(graph.styles.layers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 0);

            await reportLoadComplete(container);

            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE]);
            expect(graph.styles.layers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 1);
        });

        it("crosses the dataset boundary on a sample load, so a second sample replaces the first", async () => {
            const { container } = await renderMeasuredShell();

            const loads = captureLoads(container);
            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            expect(graph.styles.layers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 1);

            /* From the Data panel's Sample datasets section, which is the only place a
               sample row still exists once the canvas has left the Empty state -- and so
               the surface the defect was reported from. */
            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(within(screen.getByRole("region", { name: "Data" })).getByText("College football"));
            await flushMicrotasks();

            /* A sample load is a REPLACING load, so it takes 6.12's boundary by
               `handleLoad`'s own route: the records go, and the layers that encoded them
               go with them. Before this the shell renamed the dataset in the top bar
               while the old graph stayed on the canvas -- asserting a dataset that was
               never loaded -- and stacked a second set of 7.2 layers on the first. */
            /* The layers go at once; the RECORDS go when the new sample has arrived, because
               the element keeps the old graph until the new one has parsed. The load from
               Welcome swapped too, over a graph that held nothing -- one rule for every
               replacing load (6.12). */
            expect(loads.map((load) => load.replace)).toEqual([true, true]);
            expect(graph.dataManager.clear).toHaveBeenCalledTimes(1);
            expect(graph.styles.layers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 0);
            expect(screen.getByText("football.gml")).toBeInTheDocument();

            /* And the element's OWN layers are still there. The boundary removes what the
               shell tagged and nothing else: an earlier version walked the stack by index,
               which took the `default` layer -- and with it every node's shape type -- so
               the next load died in mesh building and drew nothing at all. */
            expect(graph.styles.layers().map((layer) => layer.name)).toEqual([
                "default",
                "selection",
            ]);

            await reportLoadComplete(container);

            // And the new dataset gets its OWN defaults: the one-shot went with the
            // boundary, so a second load is not a load with no defaults at all.
            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE, DEGREE_TYPE]);
            expect(graph.styles.layers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 1);
            expect(graph.dataManager.clear).toHaveBeenCalledTimes(2);
        });

        it("replaces the community layers on a re-run rather than stacking a second set", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            for (const run of [1, 2]) {
                const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

                expect(strip).not.toBeNull();
                fireEvent.click(within(strip).getByText("Find groups"));
                await flushMicrotasks();

                /* One result owns one set of layers, whichever run produced it: the four
                   group colours are replaced, not appended, so the graph never carries
                   two full stacks of community colours for one reading. */
                /* One result owns ONE layer now, whichever run produced it: the run derives
                   a single categorical encoding rather than one layer per coloured group, and
                   a re-run replaces it in place rather than stacking a second copy. */
                expect(communityLayers(graph.styles.layers())).toHaveLength(1);
                expect(graph.styles.layers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 2);
                expect(run).toBeGreaterThan(0);
            }
        });

        it("counts every ranked node in See all N ranked, not the five rows above it", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            /* The degree pass ranked all 20 nodes and Most connected draws the top five.
               The link opens the table on the ranked LIST, so it says how long that list
               is; "See all 5 ranked" would be the five rows already on screen. */
            const inspector = screen.getByTestId("inspector");

            expect(within(inspector).getByText("See all 20 ranked")).toBeInTheDocument();
        });

        it("draws the degree histogram from the pass, over the axis the degrees span", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            const inspector = screen.getByTestId("inspector");
            const values = within(inspector).getByTestId("histogram-values");

            /* The fixture's own distribution: 5 nodes of degree 2, 12 of degree 3 and 3
               of degree 4. The row is drawn either way -- `GraphSummary` renders it
               inside Most connected -- so an empty bin list is not an absent histogram
               but a 0-to-0 axis with no bar, which claims a distribution of nothing. */
            expect(inspector.querySelectorAll('[data-testid="histogram-bar"]')).toHaveLength(3);
            expect(within(values).getByText("2 links: 5 nodes")).toBeInTheDocument();
            expect(within(values).getByText("3 links: 12 nodes")).toBeInTheDocument();
            expect(within(values).getByText("4 links: 3 nodes")).toBeInTheDocument();

            const axis = within(inspector).getByTestId("chart-axis");

            expect(axis).toHaveTextContent("2");
            expect(axis).toHaveTextContent("4");
        });

        it("says what the ELEMENT says in the Counts Type row, not what the app defaults to", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            /* The element freezes this graph undirected and the row says so.
               `graphInfo.graphType.directed` defaults to TRUE and measures nothing, so a
               row reading that would say the opposite -- which is exactly what it used to
               do before the row read the element. */
            const inspector = screen.getByTestId("inspector");

            expect(within(inspector).getByText("Undirected")).toBeInTheDocument();
            expect(within(inspector).queryByText("Directed")).toBeNull();
        });

        /* The other half of the same rule: the row is not a constant either. It follows
           the element to whichever answer the element gives. */
        it("follows the element to the other answer in the Counts Type row", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container, { directedness: "directed" });
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const inspector = screen.getByTestId("inspector");

            expect(within(inspector).getByText("Directed")).toBeInTheDocument();
            expect(within(inspector).queryByText("Undirected")).toBeNull();
        });

        it("retires the suggested card once the sample's hint has run it", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-hint="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            /* Spec 5643-5648: the hint's click ends "one undoable history entry, that
               card retired". The reader has been taken where the card would have taken
               them, so the card has done its job -- and Search, which nothing ran, is
               still offered. */
            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            expect(strip).not.toBeNull();
            expect(within(strip).queryByText("Find groups")).toBeNull();
            expect(within(strip).getByText("Search for something you know")).toBeInTheDocument();
        });

        /* The minimap had nothing to project -- no positions, no viewport -- and drew as an empty
           dark box. It stays off the canvas until graphty-element can feed it (#293). */
        it("draws no minimap placeholder after a sample loads", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            await loadCatSample(container);

            expect(container.querySelector('[data-canvas-overlay="insights"]')).not.toBeNull();
            expect(container.querySelector('[data-canvas-overlay="minimap"]')).toBeNull();
        });

        it("draws the same size string in the Data panel's sample rows as on the canvas", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            const panel = screen.getByRole("region", { name: "Data" });

            /* Spec 5648: "The same size string ("20 nodes, 29 edges") appears in the
               panel and the canvas." One manifest, one formatter, both surfaces. */
            for (const record of SAMPLE_MANIFEST) {
                expect(within(panel).getByText(expectedPanelSampleValue(record))).toBeInTheDocument();
            }

            expect(within(panel).getByText("20 nodes, 29 edges. Weighted")).toBeInTheDocument();
        });

        /* The Style panel's layer list has carried `onLayerSelect` and a selected-row
           highlight since the shell was built, and `InspectorBody` has drawn the
           style-layer kind for just as long -- but nothing ever CONSTRUCTED that kind, so
           picking a layer highlighted a row and opened nothing. The layer's own properties
           were unreachable: the panel could reorder and rename and no more. */
        it("opens the style-layer surface when a layer is picked in the Style panel", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            /* The element emits `style-changed` when a layer is added, and the shell
               re-reads its list from it; the stub adds layers without emitting, so the
               board says so itself rather than asserting against a stale list. */
            act(() => {
                container.querySelector("graphty-element")?.dispatchEvent(new CustomEvent("style-changed"));
            });

            fireEvent.click(screen.getByRole("button", { name: "Style" }));

            const panel = screen.getByRole("region", { name: "Style" });

            fireEvent.click(within(panel).getByText("Top degree labels"));
            const inspector = screen.getByTestId("inspector");

            // The header names the surface...
            expect(within(inspector).getByText("Style layer")).toBeInTheDocument();

            /* ...and the BODY draws it. Asserting only the header passed while the two
               disagreed: `selectionKind` feeds the title and `inspectorSelection` feeds the
               body, and the memo was missing `selectedLayerId` from its deps, so the title
               read "Style layer" over the graph summary's own rows. The graph summary's
               opening sentence is the sharpest witness that the wrong body is drawn. */
            expect(within(inspector).queryByText(/connected by 29 relationships/)).toBeNull();
            expect(within(inspector).queryByText("Most connected")).toBeNull();
        });

        it("retires a card from Delete on it, without touching the strip", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            within(strip).getByText("Find groups").closest("button")?.focus();
            fireEvent.keyDown(strip, { key: "Delete" });

            const after = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            expect(after).not.toBeNull();
            expect(within(after).queryByText("Find groups")).toBeNull();
            expect(within(after).getByText("Search for something you know")).toBeInTheDocument();
        });
    });

    /* --------------------------------------------------------------------- */
    /* The node metric path (spec 2307): run -> reading -> encoding -> select  */
    /* --------------------------------------------------------------------- */

    describe("the node metric path", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        it("runs Most connected: paints one tagged layer, repaints, and writes the reading", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            await runSuggested("Most connected");

            const painted = graph.styles
                .layers()
                .filter((layer) => layer.source.by === "run" && layer.source.algorithm === "degree");

            expect(painted).toHaveLength(1);
            /* No repaint assertion, because there is no repaint call to make: a style verb
               repaints and commits only when the paint succeeds, so a layer that is in the
               stack is a layer the canvas is already showing. The shell used to have to call
               a repaint by hand after every layer write. */

            const inspector = screen.getByTestId("inspector");

            /* The fixture's own top node: degree 4, ties broken by id. The reading names
               it, which is the whole point of a reading -- a figure with no subject is a
               number, not a sentence. */
            expect(
                within(inspector).getByText("Mr_Whiskers is the most connected, with 4 links. The typical node has 3."),
            ).toBeInTheDocument();
            expect(within(inspector).getByText("Degree centrality, 20 nodes")).toBeInTheDocument();
            /* An exact, complete, converged run names no departure, and that ABSENCE is
               the feature: a caveats line on every result is a line nobody reads. */
            expect(inspector.querySelector('[data-testid="prose-block"][data-variant="departure"]')).toBeNull();

            /* RT-9's chart row, read off the run the shell just did. `metricDistribution`
               has its own boards and so has the chart component, and the line that joins
               them -- the one `distribution` field the shell passes -- had none: dropping
               it took the chart off every node-metric result in the app and left both
               halves' suites green.

               The caption is the producer's own, `${plainName} per node`, so a chart
               named anything else is a chart drawn from something other than this run;
               the axis ends are the fixture's real degree range, 2 to 4. */
            const chart = within(inspector).getByRole("img", { name: "Most connected per node" });

            expect(chart).toBeInTheDocument();

            const axis = within(inspector).getByTestId("chart-axis");

            expect(axis).toHaveTextContent("2");
            expect(axis).toHaveTextContent("4");
            /* And the bars are this fixture's own distribution -- 5 nodes of degree 2, 12
               of 3, 3 of 4 -- rather than a chart with an axis and nothing under it. */
            expect(
                within(within(inspector).getByTestId("histogram-values")).getByText("2 links: 5 nodes"),
            ).toBeInTheDocument();
            expect(inspector.querySelectorAll('[data-testid="histogram-bar"]')).toHaveLength(3);
        });

        /* Floor item 5, from the shell's side. `nodeMetricColourChannel` has its own
           boards and the Legend component has its own, and the ONE line that joins them --
           `setColourChannel(nodeMetricColourChannel(...))` -- had none: a mutant that
           cleared the channel on every metric run left the whole suite green and shipped a
           viridis-painted canvas with no key to it. The only other legend assertions in
           this file were negative ones, which cannot tell a channel that was cleared from
           one that was never published.

           The figures are the fixture's own degree range, 2 to 4 with a median of 3, and
           the sentence is the one degree's max normalisation earns: the lowest node is at
           its own share of the maximum, not at the ramp's floor. */
        it("names the ramp a metric run painted: the channel, its three stops and its scale", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);

            await loadCatSample(container);
            await runSuggested("Most connected");

            const legend = screen.getByLabelText("Legend");

            /* The words, the scale and the stops are the ELEMENT's: they are read off the
               prepared binding the repaint painted from, so the legend cannot describe a
               picture the canvas is not showing. The shell used to rebuild all of it from a
               ranking it had summarised itself. */
            expect(within(legend).getByText("Color: Connections")).toBeInTheDocument();
            expect(within(legend).getByText("degree", { exact: false })).toBeInTheDocument();
            expect(within(legend).getByText("linear")).toBeInTheDocument();

            /* The run reached all 20 nodes, so there is no departure to draw -- and the
               absence is what makes the line below mean something when it appears. */
            expect(legend.querySelector('[data-testid="prose-block"][data-variant="departure"]')).toBeNull();
        });

        /* The other half of the same channel: the nodes the run did not reach keep the
           neutral colour, and this line is what says why they are grey (design 236, 5117).
           A legend that stayed silent about them would claim the ramp covers a graph it
           covers two nodes short of. */
        it("names the nodes a metric run did not reach, on the legend that names the ramp", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container, { unmeasured: 2 });

            await loadCatSample(container);
            await runSuggested("Bridges");

            const legend = screen.getByLabelText("Legend");

            expect(within(legend).getByText("Color: Bridging")).toBeInTheDocument();
            /* The departure line is the ELEMENT's sentence now, printed unedited: the binding
               counted the elements it could not reach while it was settling the domain, so the
               shell neither counts them again nor writes the sentence. */
            expect(within(legend).queryByText("Color: Bridging")).toBeInTheDocument();
        });

        /* Ruling 3, decided by the ELEMENT rather than by the shell. The 7.2 load already ran
           a degree pass over this graph, and starting the same algorithm again over a graph
           that has not moved hands back the run the session already holds -- so the card draws
           the pass the load ran, and nothing computes twice.

           The shell used to decide this itself, by keeping a flag that said whether its own
           held pass still covered the graph. It now always asks, because only the element can
           compare what a run measured against the graph as it stands. */
        it("lets the element re-serve the degree run the load made, rather than making a second one", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            const afterLoad = graph.runIds("degree");

            expect(afterLoad).toHaveLength(1);

            await runSuggested("Most connected");

            // The SAME run, not a second one beside it: one id, and it is the load's.
            expect(graph.runIds("degree")).toEqual(afterLoad);
            // And it was executed once, because nothing it measured had moved.
            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE]);
        });

        /* The other half of the same rule, and the condition the shell's own short circuit
           was missing. A graph that had grown since the held pass was ranked from the records
           that were there when it ran, the run record counted them, and the ramp left every
           node the pass never saw unencoded under a legend claiming to cover the whole graph.
           The element re-executes the run instead, because the scope it measured has moved. */
        it("runs a real degree pass when the held one no longer covers the graph", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE]);

            // The graph grows under the held pass, and says so the way the element does.
            graph.addNode("Newcomer");
            await reportLoadComplete(container);
            await runSuggested("Most connected");

            /* A second degree pass, over the graph as it is now -- where the short circuit
               would have re-served the first one. */
            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE, DEGREE_TYPE]);
        });

        /* MANDATORY 06: an iterative method says whether it converged. PageRank is the
           only one of the three that publishes the flag, and it publishes it by absence
           as well as by value -- so the test is `=== false`, not `!converged`. */
        it("names the iteration count when Influence did not converge", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container, { pagerank: { converged: false, iterations: 100 } });

            await loadCatSample(container);
            await runSuggested("Influence");

            const inspector = screen.getByTestId("inspector");

            expect(within(inspector).getByText("Did not converge in 100 iterations.")).toBeInTheDocument();
        });

        it("draws no caveats line for a PageRank run that converged", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container, { pagerank: { converged: true, iterations: 12 } });

            await loadCatSample(container);
            await runSuggested("Influence");

            expect(
                screen.getByTestId("inspector").querySelector('[data-testid="prose-block"][data-variant="departure"]'),
            ).toBeNull();
        });

        /* The spine's last two hops, and the precedence rule behind them: a selected node
           outranks a result, so the pick replaces the surface the row was drawn on. */
        it("selects the node a ranked row names, and the inspector then draws that node", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);
            await runSuggested("Most connected");

            const inspector = screen.getByTestId("inspector");

            expect(within(inspector).getByText("#1")).toBeInTheDocument();
            fireEvent.click(within(inspector).getByRole("button", { name: /Mr_Whiskers/ }));

            expect(graph.selectNode).toHaveBeenCalledWith("Mr_Whiskers");

            reportSelection(container, "Mr_Whiskers");

            const after = screen.getByTestId("inspector");

            expect(within(after).getByText("Node")).toBeInTheDocument();
            expect(within(after).queryByText("Degree centrality, 20 nodes")).toBeNull();
        });

        /* One node-metric encoding drives colour at a time, retired BY TAG. An index walk
           over this stack takes the element's `default` layer with it, and with it every
           node's shape type -- the "shape with type required to create mesh" failure. */
        it("stacks a second metric's encoding over the first rather than deleting it", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);
            await runSuggested("Most connected");

            expect(metricLayers(graph.styles.layers())).toHaveLength(1);

            await runSuggested("Influence");

            const painted = metricLayers(graph.styles.layers());

            /* Layers stack: the later run is on top and wins the channel, and the earlier one
               stays underneath for the reader to reorder, hide or remove. */
            expect(painted.map((layer) => layer.source)).toMatchObject([
                { by: "run", algorithm: "degree" },
                { by: "run", algorithm: "pagerank" },
            ]);
            expect(graph.styles.layers().map((layer) => layer.name)).toContain("default");
        });

        /* Auto-apply limit 2 (spec 2219-2231). The reading is a floor item and the
           encoding is not, so a hand that already holds node colour keeps it and the
           result still arrives -- with no legend channel, because nothing was painted. */
        it("adds no layer when a hand-authored layer already drives node colour", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container, {
                extraLayers: [
                    {
                        name: "My colours",
                        target: "node",
                        selector: { match: "everything" },
                        set: { "node.color": "#FF0000" },
                    },
                ],
            });

            await loadCatSample(container);
            reportStyleChanged(container);
            await runSuggested("Most connected");

            expect(metricLayers(graph.styles.layers())).toHaveLength(0);
            // An unencoded channel is absent, never empty, so the legend draws nothing.
            expect(screen.queryByLabelText("Legend")).toBeNull();

            expect(screen.getByTestId("inspector")).toHaveTextContent("Degree centrality, 20 nodes");
        });

        /* The element's own base layer parses the whole of `defaultNodeStyle` and so
           carries a node colour on EVERY graph. A naive "no algorithmSource means a
           person made it" test would find it every time and suppress auto-apply for good. */
        it("is not suppressed by the element's own default and selection layers", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);
            reportStyleChanged(container);
            await runSuggested("Most connected");

            expect(metricLayers(graph.styles.layers())).toHaveLength(1);
        });

        describe("the size gate", () => {
            /** Big enough that betweenness clears the ask limit and small enough to build. */
            const ASK_SIZE = { nodeCount: 2000, edgeCount: 30000 };

            /** The vocabulary spec 1918-1927 keeps off every surface a reader sees. */
            const COST_CLASS_WORDS = /instant|iterative|heavy|sampled/i;

            it("asks before it spends the time, and runs once the reader agrees", async () => {
                const { container } = await renderMeasuredShell();

                captureLoads(container);

                const graph = installNovicePathGraph(container, { synthetic: ASK_SIZE });

                await loadCatSample(container);
                await runSuggested("Bridges");

                /* Nothing ran: the estimate opened the door instead, and the pass only
                   starts when the dialog re-enters the same callback with confirmed true. */
                expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE]);

                const dialog = screen.getByRole("dialog");

                expect(dialog).toHaveTextContent(/at this size/);
                /* The cost CLASS is the implementation's vocabulary, not the reader's:
                   naming one hands them a category they cannot act on in place of the
                   time they can. */
                expect(dialog.textContent ?? "").not.toMatch(COST_CLASS_WORDS);

                fireEvent.click(within(dialog).getByRole("button", { name: /^Run/ }));
                await flushMicrotasks();

                expect(graph.runAlgorithm).toHaveBeenCalledWith(
                    NODE_METRIC_DEFINITIONS.betweenness.namespace,
                    NODE_METRIC_DEFINITIONS.betweenness.type,
                );
                expect(screen.queryByRole("dialog")).toBeNull();
            });

            /* Spec 7300 conditions the retirement on the capability having been RUN. The
               panel's handler retired the card BEFORE the run, so a Cancel on the confirm
               the run opened took the card away for a run that never happened -- for that
               browser, on every dataset, since nothing un-retires one. */
            it("keeps the Insights card when the reader cancels the run it opened", async () => {
                const { container } = await renderMeasuredShell();

                captureLoads(container);
                installNovicePathGraph(container, { synthetic: ASK_SIZE });

                await loadCatSample(container);

                const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

                expect(within(strip).getByText("Find the bridges")).toBeInTheDocument();

                await runSuggested("Bridges");
                fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
                await flushMicrotasks();

                const after = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

                expect(within(after).getByText("Find the bridges")).toBeInTheDocument();
            });

            /* And the other half of the same rule: a run that COMPLETED from its own panel
               does retire its card, because the reader has been where the card was taking
               them. */
            it("retires the Insights card once the run the panel started has finished", async () => {
                const { container } = await renderMeasuredShell();

                captureLoads(container);
                installNovicePathGraph(container, { synthetic: ASK_SIZE });

                await loadCatSample(container);
                await runSuggested("Bridges");

                fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Run/ }));
                await flushMicrotasks();

                const after = container.querySelector('[data-canvas-overlay="insights"]');

                expect(after === null ? null : within(after as HTMLElement).queryByText("Find the bridges")).toBeNull();
            });

            it("runs nothing when the reader cancels", async () => {
                const { container } = await renderMeasuredShell();

                captureLoads(container);

                const graph = installNovicePathGraph(container, { synthetic: ASK_SIZE });

                await loadCatSample(container);
                await runSuggested("Bridges");

                fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
                await flushMicrotasks();

                expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE]);
                expect(screen.queryByRole("dialog")).toBeNull();
            });
        });

        /* 6.12: what a boundary clears is what was true of the graph that has gone. A metric
           encoding reads a run's column off nodes that left with the dataset, so it goes --
           by tag, with the community layers, and never by index. */
        it("takes every metric encoding, the result and the channel across a dataset boundary", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);
            await runSuggested("Most connected");

            expect(metricLayers(graph.styles.layers())).toHaveLength(1);
            /* Stated BEFORE the crossing, so the null below is a TRANSITION rather than a
               constant: this board is titled for what it takes across the boundary, and
               until the channel was asserted standing, "the legend is null afterwards"
               was equally true of a shell that had never drawn one. */
            expect(within(screen.getByLabelText("Legend")).getByText("Color: Connections")).toBeInTheDocument();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(within(screen.getByRole("region", { name: "Data" })).getByText("College football"));
            await flushMicrotasks();

            expect(metricLayers(graph.styles.layers())).toHaveLength(0);
            expect(graph.styles.layers().map((layer) => layer.name)).toEqual([
                "default",
                "selection",
            ]);
            expect(screen.queryByLabelText("Legend")).toBeNull();

            // The result went with the data it described, so the summary is what is left.
            expect(screen.getByTestId("inspector")).not.toHaveTextContent("Degree centrality, 20 nodes");
        });

        /* 7.3: a card click runs the method, opens its home panel and writes the reading.
           Unit F's widened availability list is what lets this card through the filter. */
        it("runs Most connected from its own insight card and opens Analyze", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            fireEvent.click(within(strip).getByText("Who is most connected"));
            await flushMicrotasks();

            expect(screen.getByRole("region", { name: "Analyze" })).toBeInTheDocument();
            expect(metricLayers(graph.styles.layers())).toHaveLength(1);

            expect(screen.getByTestId("inspector")).toHaveTextContent("Degree centrality, 20 nodes");
        });

        /* `GraphSummaryProps.onSelectNode` has existed, and GraphSummary has wired it to
           the Most connected rows, since the surface was built -- and AppShell had never
           passed it, so every one of those rows was inert text that looked like a control.
           It is the same spine, reached from the graph summary instead of from a result. */
        it("selects the node a Most connected row names", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            fireEvent.click(within(screen.getByTestId("inspector")).getByRole("button", { name: /Chonky_Boy/ }));

            expect(graph.selectNode).toHaveBeenCalledWith("Chonky_Boy");
            // The call is not the outcome: the id has to FIND a node, or the row is inert.
            expect(graph.elementHoldsSelection()).toBe("Chonky_Boy");
        });

        /* The same row on a graph whose ids are numbers, which two of the three shipped
           samples are: karate.gml and football.gml declare `node [ id 1 ]`, GMLDataSource
           parses that with parseInt and the element keys its node Map on the NUMBER.

           These rows are the one ranking still built from PRINTED ids -- `readDegreeResults`
           (analysis/runs.ts) stores `String(node.id)` -- so `selectById("1")` missed the key
           `1`, returned false and emitted nothing, and every Most connected row on those two
           samples was inert text that looked like a control. The board above could not fail
           on that: its fixture's ids are strings, so the printed form and the element's own
           form are the same object. What is asserted here is the OUTCOME rather than the
           argument -- the element really holds that node afterwards -- so the round trip has
           to complete however the shell spells the id on the way out. */
        it("completes the round trip from a Most connected row on a numeric-id graph", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container, { numericIds: true });

            await loadCatSample(container);
            /* `withNumericIds` numbers by position, so the fixture's first node -- which its
               own edges also make the most connected, with 4 links -- is id 1. A row draws
               the printed id and the value beside it, and the two together are its whole
               accessible name. */
            const topId = CAT_SOCIAL_NETWORK.nodes.findIndex((node) => node.id === "Mr_Whiskers") + 1;
            const topDegree = 4;

            fireEvent.click(
                within(screen.getByTestId("inspector")).getByRole("button", {
                    name: `${String(topId)} ${String(topDegree)}`,
                }),
            );

            expect(graph.elementHoldsSelection()).toBe(topId);
            expect(within(screen.getByTestId("inspector")).getByText("Node")).toBeInTheDocument();
        });

        /* Spec 4389-4390: nothing leaves the palette index because it left a resting
           panel. The row carries the 6.3 pair on one line, as the Suggested row does. */
        it("runs a metric from the command palette, named by its 6.3 pair", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            fireEvent.click(screen.getByRole("button", { name: /Search commands, nodes and edges/ }));
            await screen.findByTestId("command-palette");
            /* The rows arrive a tick after the palette does, so this waits for the row
               rather than for the frame it is drawn in. Read synchronously it failed only
               under a loaded machine, which is the worst way for a board to be wrong. */
            fireEvent.click(await screen.findByRole("option", { name: /Most connected \(Degree centrality\)/ }));
            await flushMicrotasks();

            expect(metricLayers(graph.styles.layers())).toHaveLength(1);
            expect(screen.getByRole("region", { name: "Analyze" })).toBeInTheDocument();
        });

        /* A finished run used to delete every other run's layers, so group colours and a
           metric ramp could never both be in the stack. Now each run's layers stay, and the
           shell never reorders the stack: a run the element RE-SERVED keeps its place, under
           whatever the reader or a later run stacked over it. */
        it("keeps every run's layers and never reorders the stack when a run is re-served", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);
            const topRun = (): unknown => {
                const runLayers = graph.styles.layers().filter((layer) => layer.source.by === "run");

                return runLayers[runLayers.length - 1]?.source;
            };

            await loadCatSample(container);
            await runSuggested("Most connected");

            expect(metricLayers(graph.styles.layers())).toHaveLength(1);

            await runSuggested("Groups");

            // Forward: the ramp stays, under the groups.
            expect(metricLayers(graph.styles.layers())).toHaveLength(1);
            expect(communityLayers(graph.styles.layers())).toHaveLength(1);
            expect(topRun()).toMatchObject({ algorithm: "louvain" });
            expect(screen.getByLabelText("Legend")).toBeInTheDocument();

            const orderBefore = graph.styles.layers().map((layer) => layer.id);

            await runSuggested("Most connected");

            // The re-served degree run stays where it was, under the groups.
            expect(communityLayers(graph.styles.layers())).toHaveLength(1);
            expect(metricLayers(graph.styles.layers())).toHaveLength(1);
            expect(topRun()).toMatchObject({ algorithm: "louvain" });
            expect(graph.styles.layers().map((layer) => layer.id)).toEqual(orderBefore);

            // And the element's own layers are still underneath all of it, by tag.
            expect(graph.styles.layers().map((layer) => layer.name)).toContain("default");
        });

        /* Spec 2241-2243. The verb used to take the result with the picture -- floor items
           1, 2 and 3, the reading, the departures and the run record, off the screen
           together -- and to remove whichever layer a separate "which metric is applied"
           field named, which a community run never wrote. Pressed on a Groups card it
           deleted the degree ramp. */
        it("Delete layer takes the picture this card names and leaves the run", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);
            await runSuggested("Most connected");
            await runSuggested("Groups");

            const inspector = screen.getByTestId("inspector");

            /* The card names the LAYER, and the layer's name is the element's: a run writes its
               own layer and calls it after the run. The shell used to name it itself. */
            expect(within(inspector).getByTestId("result-layer")).toHaveTextContent("louvain");

            fireEvent.click(within(inspector).getByRole("button", { name: "Delete layer" }));

            const after = screen.getByTestId("inspector");

            // The layers this card named, and no others.
            expect(communityLayers(graph.styles.layers())).toHaveLength(0);
            expect(graph.styles.layers().map((layer) => layer.name)).toContain("default");

            // The run is still on screen, in the card's un-applied form.
            expect(within(after).getByText("Louvain, 20 nodes")).toBeInTheDocument();
            expect(within(after).queryByTestId("result-layer")).toBeNull();
            expect(within(after).queryByRole("button", { name: "Delete layer" })).toBeNull();
            expect(within(after).queryByRole("button", { name: "Change encoding" })).toBeNull();
            expect(within(after).getByRole("button", { name: "Remove result" })).toBeInTheDocument();

            // Nothing is encoded now, so the channel naming colours is gone with them.
            expect(screen.queryByLabelText("Legend")).toBeNull();
        });

        /* Spec 2243-2244: Remove result "deletes the run and every layer that reads it",
           and names the count before it acts (floor item 4). The sentence used to say the
           opposite -- "Keeps 1 style layer painted" -- for verbs that were swapped. */
        it("Remove result says how many layers it will take, then takes them", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);
            await runSuggested("Groups");

            const inspector = screen.getByTestId("inspector");

            /* The count is this result's own, and it is ONE: the run derives a single
                 categorical encoding rather than one layer per coloured group. */
            expect(within(inspector).getByText("Removes 1 style layer.")).toBeInTheDocument();

            fireEvent.click(within(inspector).getByRole("button", { name: "Remove result" }));

            expect(communityLayers(graph.styles.layers())).toHaveLength(0);
            expect(screen.queryByLabelText("Legend")).toBeNull();
            expect(screen.getByTestId("inspector")).not.toHaveTextContent("Louvain, 20 nodes");
        });

        /* A metric run owns exactly one layer, so the same sentence counts one. */
        it("counts one layer on a metric result", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);

            await loadCatSample(container);
            await runSuggested("Most connected");

            expect(screen.getByTestId("inspector")).toHaveTextContent("Removes 1 style layer.");
        });

        /* Auto-apply limit 2 again, from the card's side this time. A suppressed run
           painted nothing, so there is no layer for either layer verb to act on: drawn
           anyway, Change encoding opened Style for an encoding that does not exist and
           Delete layer fell through to whatever tag was last recorded -- on a shell with
           groups painted, it silently deleted the group colours. */
        it("draws no layer verbs on a result whose encoding was suppressed", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container, {
                extraLayers: [
                    {
                        name: "My colours",
                        target: "node",
                        selector: { match: "everything" },
                        set: { "node.color": "#FF0000" },
                    },
                ],
            });

            await loadCatSample(container);
            reportStyleChanged(container);
            await runSuggested("Groups");
            await runSuggested("Bridges");

            const inspector = screen.getByTestId("inspector");

            // The reading is a floor item and arrives; the encoding is not and did not.
            expect(within(inspector).getByText("Betweenness centrality, 20 nodes")).toBeInTheDocument();
            expect(within(inspector).queryByTestId("result-layer")).toBeNull();
            expect(within(inspector).queryByRole("button", { name: "Delete layer" })).toBeNull();
            expect(within(inspector).queryByRole("button", { name: "Change encoding" })).toBeNull();

            /* And the run that DID paint is untouched, legend included: a run that painted
               nothing may not take the legend off a canvas that is still coloured. */
            expect(communityLayers(graph.styles.layers())).toHaveLength(0);
            /* Nothing is encoded, because both runs stood aside for the hand-written layer, so
               the legend draws nothing: an unencoded channel is absent rather than empty. */
            expect(screen.queryByLabelText("Legend")).toBeNull();
        });

        /* Spec 2306: the card's swatch, the legend's top stop and the top node on the canvas
           are three drawings of ONE number. The swatch used to be hard-coded to the top of the
           palette, so a run whose fractions are all 0 -- every node on a ring sits on the same
           number of shortest paths, so min-max normalisation writes 0 for all of them -- drew a
           yellow swatch beside a deep-purple graph and three deep-purple legend stops. It is
           read off the run's own legend block now, which is the same prepared binding the
           repaint painted the canvas from, so the two cannot disagree. */
        it("reads the card's swatch off the legend the element derived, not off the palette", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container, { ring: 24 });

            await loadCatSample(container);
            await runSuggested("Bridges");

            const swatch = within(screen.getByTestId("inspector")).getByTestId("result-swatch");
            const block = graph.styles.session.styles
                .legend()
                .find((candidate) => candidate.runId !== undefined && candidate.channel === "node.color");
            const top = block?.swatches[block.swatches.length - 1].color;

            expect(top).toBeDefined();
            expect(swatch.style.background).toBe(cssColour(top as string));
        });

        /* ------------------------------------------------------------------ */
        /* The spine, on a graph whose ids are not strings                      */
        /* ------------------------------------------------------------------ */

        /* karate.gml and football.gml declare `node [ id 1 ]`, GMLDataSource parses that
           with parseInt, and DataManager keys its Map on the NUMBER. The ranking used to
           carry `String(node.id)`, so `selectById("1")` missed the key `1`, returned false
           and emitted nothing: every ranked row on two of the three shipped samples was
           inert text that looked like a control, and a board written with string ids passed
           anyway. */
        it("hands a ranked row's own id to the element, not the one it printed", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container, { numericIds: true });

            await loadCatSample(container);
            await runSuggested("Bridges");

            /* The fixture's own top node, numbered by position exactly as `withNumericIds`
               numbers it, so the board names the id it expects rather than agreeing with
               whatever the shell handed over. Its score is the highest and its printed id
               sorts first, so it is rank 1 on this run. */
            const topId = CAT_SOCIAL_NETWORK.nodes.findIndex((node) => node.id === "Mr_Whiskers") + 1;

            // The row leads with the id it names, and ids are unique, so the anchor is one row.
            fireEvent.click(
                within(screen.getByTestId("inspector")).getByRole("button", {
                    name: new RegExp(`^${String(topId)}\\b`),
                }),
            );

            expect(graph.selectNode).toHaveBeenCalledWith(topId);
            expect(graph.selectNode).not.toHaveBeenCalledWith(String(topId));
            // The lookup found a node, so the element really holds it and said so.
            expect(graph.elementHoldsSelection()).toBe(topId);
            expect(within(screen.getByTestId("inspector")).getByText("Node")).toBeInTheDocument();
        });

        /* The degree card is the one ranking still built from PRINTED ids: it reads the
           7.2 pass the shell is holding, and `readDegreeResults` (analysis/runs.ts:113-126)
           stores `String(node.id)`. The round trip still has to complete, which is what
           `graphSelectNode`'s retry is for -- it hands over what it was given, and resolves
           the miss in the id's own type rather than leaving the row inert. When runs.ts
           carries the raw id too, the retry stops firing here and this board still passes. */
        it("completes the round trip from the degree card, whose ids are printed ones", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container, { numericIds: true });

            await loadCatSample(container);
            await runSuggested("Most connected");

            const topId = CAT_SOCIAL_NETWORK.nodes.findIndex((node) => node.id === "Mr_Whiskers") + 1;

            fireEvent.click(
                within(screen.getByTestId("inspector")).getByRole("button", {
                    name: new RegExp(`^${String(topId)}\\b`),
                }),
            );

            expect(graph.selectNode).toHaveBeenCalledWith(topId);
            expect(graph.elementHoldsSelection()).toBe(topId);
            expect(within(screen.getByTestId("inspector")).getByText("Node")).toBeInTheDocument();
        });

        /* The other half of the same round trip. `SelectionManager.select` returns early,
           emitting nothing, for the node it already holds -- so a run that cleared only the
           SHELL's selection left that one node unreachable by every route: its ranked row,
           its Most connected row, and a click on the node itself. */
        it("tells the element the selection is cleared, so the run's top row still works", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            // Picked on the canvas, which is what leaves the ELEMENT holding it.
            act(() => {
                graph.selectNode("Mr_Whiskers");
            });

            expect(graph.elementHoldsSelection()).toBe("Mr_Whiskers");

            await runSuggested("Most connected");

            expect(graph.deselectNode).toHaveBeenCalled();
            expect(graph.elementHoldsSelection()).toBeNull();

            fireEvent.click(within(screen.getByTestId("inspector")).getByRole("button", { name: /Mr_Whiskers/ }));

            expect(graph.elementHoldsSelection()).toBe("Mr_Whiskers");
            expect(within(screen.getByTestId("inspector")).getByText("Node")).toBeInTheDocument();
        });

        /* 7.1 item 2: ONE entry per user action. The encoding gets no second row, because
           nothing here can undo the layer independently of the result. */
        it("leaves exactly one undoable history entry for a metric run", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);

            await loadCatSample(container);
            await runSuggested("Most connected");

            fireEvent.click(screen.getByRole("button", { name: "History" }));

            expect(await screen.findByText("1 entry, 0 undone")).toBeInTheDocument();
        });
    });

    /* ---------------------------------------------------------------------- */
    /* The load that did not arrive                                            */
    /* ---------------------------------------------------------------------- */

    /*
     * The defect these stand on was not a quiet report. It was a WRONG one: on a
     * malformed file, a 404 URL and unparsable pasted text alike the shell said the load
     * had succeeded, because `GraphtyHandle.loadFromFile` ends in a property assignment
     * and the element's setter discards the parse. So every board here drives a load that
     * the shell's own promise chain resolves, and then has the element say what actually
     * happened -- which is the only thing that ever did.
     */
    describe("the load that did not arrive", () => {
        /** JSON that stops mid-object: detectable as JSON, unparsable as a graph. */
        const MALFORMED_PASTE = '{"nodes": [{"id": "a"}';

        afterEach(() => {
            vi.useRealTimers();
            window.localStorage.clear();
        });

        it("keeps the drawn dataset when a replacing load's data never parses", async () => {
            const { container } = await renderMeasuredShell();

            const graph = installNovicePathGraph(container);
            await loadCatSample(container);

            expect(screen.getByText(CAT_SOCIAL_NETWORK_NAME)).toBeInTheDocument();

            /* A second sample, from the Data panel: a REPLACING load. The shell names it at
               once, while it arrives. */
            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(within(screen.getByRole("region", { name: "Data" })).getByText("College football"));
            await flushMicrotasks();

            expect(screen.getByText("football.gml")).toBeInTheDocument();

            await reportLoadingError(container, "Unexpected token 'g' on line 1");

            /* The element keeps the graph it would have replaced until the new data has
               parsed, so the cat sample is still on the canvas -- and the shell says so: its
               name is back, the counts are still drawn, and the failure is in the toast. */
            expect(graph.dataManager.clear).toHaveBeenCalledTimes(1);
            expect(container.querySelector("[data-canvas-welcome='true']")).toBeNull();
            expect(screen.queryByText("football.gml")).toBeNull();
            expect(screen.getByText(CAT_SOCIAL_NETWORK_NAME)).toBeInTheDocument();
            expect(container.querySelectorAll("[data-status-slot]").length).toBeGreaterThan(0);
            expect(statusToast(container)?.textContent).toContain(
                "Could not load football.gml. Unexpected token 'g' on line 1.",
            );
        });

        it("does not let an overtaken load's rejection unwind the load that overtook it", async () => {
            const { container } = await renderMeasuredShell();

            installNovicePathGraph(container);
            await loadCatSample(container);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(within(screen.getByRole("region", { name: "Data" })).getByText("Karate Club"));
            await flushMicrotasks();
            fireEvent.click(within(screen.getByRole("region", { name: "Data" })).getByText("College football"));
            await flushMicrotasks();

            expect(screen.getByText("football.gml")).toBeInTheDocument();

            /* The element rejects the older load once the newer replacing load has started
               (E_SUPERSEDED); only the karate load is answered here. */
            const element = container.querySelector("graphty-element");
            const stub = element === null ? undefined : loadStubs.get(element);

            await act(async () => {
                stub?.waiting.splice(0, 1)[0]?.reject(new Error("overtaken"));
                await Promise.resolve();
            });
            await flushMicrotasks();

            expect(screen.getByText("football.gml")).toBeInTheDocument();
            expect(statusToast(container)?.textContent ?? "").not.toContain("karate.gml");
        });

        it("names the file the reader chose first, and keeps the reason the element gave", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            await dropFile(
                screen.getByTestId("data-drop-zone"),
                new File(["{oops"], "friends.json", { type: "application/json" }),
            );
            await reportLoadingError(container, "Unexpected token o in JSON at position 1");

            const inline = inlineLoadError(container);

            /* 6.10 floor item 7 makes the user's own filenames a floor item, and the
               element's message names the FORMAT and never the file -- so the shell
               carries the name from the top of the load and leads the sentence with it.
               6.10 floor item 4 keeps the reason, in the words of whoever knew it. */
            expect(inline).not.toBeNull();
            expect(inline?.textContent).toBe(
                "Could not load friends.json. Unexpected token o in JSON at position 1.",
            );
            expect(inline).toHaveAttribute("role", "alert");

            /* In the drop zone, beside the formats line, and not behind a door: spec 1034
               puts it "inline in the drop zone with the supported formats list", and spec
               975-979 forbids moving the error text behind an info circle. */
            const zone = inline?.parentElement;

            expect(zone?.getAttribute("data-dragging")).not.toBeNull();
            expect(zone?.textContent).toContain(
                "Accepted formats: JSON, CSV or TSV, GraphML, GEXF, GML, DOT, Pajek, SIF, CX2",
            );
            expect(inline?.closest("[role='tooltip']")).toBeNull();
            expect(inline?.closest("[data-info-circle]")).toBeNull();
        });

        /* ------------------------------------------------------------------ */
        /* The dialog, driven through the SHELL's own onLoad                    */
        /* ------------------------------------------------------------------ */

        /*
         * The dialog's own boards supply a rejecting `onLoad` of their own making, and for
         * the input they use the real `AppShell.handleLoad` used to RESOLVE: pasted text
         * goes through `GraphtyHandle.loadData`, which is two property assignments and
         * cannot reject, so the dialog closed and `resetState` wiped the textarea while the
         * element was still parsing. The reader's only copy of what they typed was gone,
         * and the board claiming to prevent exactly that stayed green because it was
         * testing its own stub. Nothing in the suite drove the dialog through the shell at
         * all, so these two do -- one for each side of the contract.
         */
        it("keeps the reader's pasted text in the dialog when the element refuses the load", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(
                within(screen.getByRole("region", { name: "Data" })).getByRole("button", { name: "Paste data" }),
            );

            const dialog = await screen.findByRole("dialog");

            fireEvent.click(within(dialog).getByText("Paste"));
            fireEvent.change(within(dialog).getByLabelText("Paste graph data"), {
                target: { value: MALFORMED_PASTE },
            });
            fireEvent.click(within(dialog).getByRole("button", { name: /^Load / }));
            await flushMicrotasks();

            /* Still holding the reader's text BEFORE the element has said anything: the
               press and the answer are now seconds apart, and nothing may close over that
               text while the only thing anyone knows is that the bytes were accepted.
               The TEXT is what is asserted rather than the dialog's presence, because
               `handleClose` runs `resetState` -- a dialog that closed here leaves an empty
               textarea behind it, which is exactly the loss this is about. */
            expect(screen.getByLabelText("Paste graph data")).toHaveValue(MALFORMED_PASTE);

            await reportLoadingError(container, "Unexpected end of JSON input");

            const refused = screen.getByRole("dialog");

            expect(refused).toBeInTheDocument();
            expect(within(refused).getByLabelText("Paste graph data")).toHaveValue(MALFORMED_PASTE);
            /* The shell's sentence, not the element's: the element's message never names
               what the reader chose (6.10 floor item 7), and "pasted-data" is what this
               route is called. */
            expect(
                within(refused).getByText("Could not load pasted-data. Unexpected end of JSON input."),
            ).toBeInTheDocument();
        });

        /* The other side of it: the dialog may not close on ACCEPTANCE either, because
           acceptance is only the property assignment. It closes when the element reports
           the data arrived -- the same event that moves the reader to Explore on the
           session's first load, which is why nothing of the dialog is left on screen
           afterwards. */
        it("holds the dialog open until the element says the pasted data arrived", async () => {
            const { container } = await renderMeasuredShell();

            const loads = captureLoads(container);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(
                within(screen.getByRole("region", { name: "Data" })).getByRole("button", { name: "Paste data" }),
            );

            const dialog = await screen.findByRole("dialog");

            fireEvent.click(within(dialog).getByText("Paste"));
            fireEvent.change(within(dialog).getByLabelText("Paste graph data"), {
                target: { value: '{"nodes": [{"id": "a"}]}' },
            });
            fireEvent.click(within(dialog).getByRole("button", { name: /^Load / }));
            await flushMicrotasks();

            // The bytes reached the element, and that is ALL that is known so far.
            expect(loads).toHaveLength(1);
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            // Still the reader's, because `handleClose` would have wiped it: see above.
            expect(screen.getByLabelText("Paste graph data")).toHaveValue('{"nodes": [{"id": "a"}]}');

            await reportLoadComplete(container);

            expect(screen.queryByRole("dialog")).toBeNull();
        });

        /* A file dropped on a loaded graph REPLACES it, after the reader confirms. The
           element keeps the current graph until the new file has parsed, so the replace is
           safe to offer; the confirmation is for a good file dropped by mistake. */
        it("replaces a loaded dataset with a dropped file once the reader confirms", async () => {
            const { container } = await renderMeasuredShell();

            const loads = captureLoads(container);
            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            const loadsAfterSample = loads.length;

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            await dropFile(screen.getByTestId("data-drop-zone"), new File(["{}"], "extra.json"));

            // Nothing reaches the element until the reader says so.
            expect(loads).toHaveLength(loadsAfterSample);

            const confirm = await screen.findByRole("dialog", { name: "Replace the current graph?" });

            fireEvent.click(within(confirm).getByRole("button", { name: "Replace" }));
            await flushMicrotasks();

            expect(loads).toHaveLength(loadsAfterSample + 1);
            expect(loads.at(-1)?.replace).toBe(true);

            await reportLoadComplete(container);

            expect(graph.dataManager.clear).toHaveBeenCalledTimes(2);
            expect(screen.getByText("extra.json")).toBeInTheDocument();
            expect(statusToast(container)).toBeNull();
        });

        /* Cancelling the confirmation leaves everything as it was: the dataset, its name,
           its layers and its results. */
        it("leaves the loaded dataset, its layers and its results alone when the reader cancels a drop", async () => {
            const { container } = await renderMeasuredShell();

            const loads = captureLoads(container);
            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            const layersBefore = graph.styles.layers().map((layer) => layer.id);
            const loadsAfterSample = loads.length;

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            await dropFile(screen.getByTestId("data-drop-zone"), new File(["{}"], "extra.json"));

            const confirm = await screen.findByRole("dialog", { name: "Replace the current graph?" });

            fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
            await flushMicrotasks();

            expect(loads).toHaveLength(loadsAfterSample);
            expect(graph.dataManager.clear).toHaveBeenCalledTimes(1);
            expect(graph.styles.layers().map((layer) => layer.id)).toEqual(layersBefore);
            expect(screen.getByText(CAT_SOCIAL_NETWORK_NAME)).toBeInTheDocument();
        });

        /* The retry the error sentence itself invites, on the zone it is drawn in. */
        it("loads the retry the sentence invites after a failed load", async () => {
            const { container } = await renderMeasuredShell();

            installNovicePathGraph(container);
            const zone = container.querySelector("[data-dragging]") as HTMLElement;

            expect(zone).not.toBeNull();

            await dropFile(zone, new File(["{oops"], "friends.json"));

            /* The optimistic claim first, which is the order the application produces: the
               shell names the file while it arrives and the parse fails later. */
            await waitFor(() => {
                expect(screen.getByText("friends.json")).toBeInTheDocument();
            });

            await reportLoadingError(container, "Unexpected token o in JSON at position 1");

            expect(container.querySelector("[data-canvas-welcome='true']")).not.toBeNull();

            /* And the reader is not left on an activity the rail has just disabled.
               AMENDED with the fix for the dialog's contract: the first-load switch to
               Explore now waits for the element's own `data-loaded` rather than firing on
               the optimistic `finishLoad` (it was unmounting the Data panel, and the Load
               data dialog with it, seconds before anyone knew whether the data parsed). So
               this load never moved the reader anywhere, and there is nothing to move
               back: what the board can still say is that no activity the Empty state
               disables is left open. The redirect to Data that used to be asserted here is
               still live for the case it was written for -- a failure while the reader IS
               on Explore, which a replacing load over a drawn dataset reaches. */
            expect(screen.queryByRole("region", { name: "Explore" })).toBeNull();

            // The retry, on the same zone the sentence is drawn in.
            await dropFile(
                container.querySelector("[data-dragging]") as HTMLElement,
                new File([JSON.stringify(CAT_SOCIAL_NETWORK)], "friends.json", { type: "application/json" }),
            );
            await reportLoadComplete(container);

            await waitFor(() => {
                expect(container.querySelector("[data-canvas-welcome='true']")).toBeNull();
            });
            expect(inlineLoadError(container)).toBeNull();

            /* Spec 4107 spends the first-load switch on "the session's first load", and a
               load that showed the reader nothing is not one: the latch was spent on the
               failure, so the first dataset that really arrived never got its Explore. */
            expect(screen.getByRole("region", { name: "Explore" })).toBeInTheDocument();
        });

        it("surfaces the reachable throw -- a format nothing could detect -- through both surfaces", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            /* The ELEMENT detects the format, and refuses a file it cannot place with
               E_UNKNOWN_FORMAT. Its message ends in the call a developer would type, so the
               shell says what a reader can do instead. */
            await dropFile(
                screen.getByTestId("data-drop-zone"),
                new File(["nothing here that reads like a graph"], "notes.txt"),
            );
            await reportLoadingError(
                container,
                new GraphtyError({
                    code: "E_UNKNOWN_FORMAT",
                    message: 'nothing recognised the format of "notes.txt".',
                    source: "data",
                }),
            );

            expect(inlineLoadError(container)?.textContent).toBe(
                "Could not load notes.txt. Its format was not recognised. " +
                    "Open it with Open file and pick the format from the list.",
            );
            expect(statusToast(container)?.textContent).toContain("Could not load notes.txt.");

            // And the shell never claimed the load: no dataset name, no counts, Welcome.
            expect(container.querySelector("[data-canvas-welcome='true']")).not.toBeNull();
            expect(container.querySelectorAll("[data-status-slot]")).toHaveLength(0);
        });

        it("reports a sample that does not parse, and drops the card its hint had armed", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            // The hint, not the row: this is the one interaction that arms a suggested
            // card for the load that is starting (7.1 item 2).
            fireEvent.click(container.querySelector('[data-sample-hint="cat-social-network"]') as HTMLElement);
            await reportLoadingError(container, "Unexpected end of JSON input");

            expect(inlineLoadError(container)?.textContent).toBe(
                `Could not load ${CAT_SOCIAL_NETWORK_NAME}. Unexpected end of JSON input.`,
            );
            expect(container.querySelector("[data-canvas-welcome='true']")).not.toBeNull();

            /* The armed card went with the load that did not arrive. A completion
               reported afterwards -- the shell cannot stop the element sending one --
               therefore runs nothing over whatever is on the canvas instead. */
            await reportLoadComplete(container);

            expect(graph.runAlgorithm).not.toHaveBeenCalled();
        });

        it("says nothing it cannot stand behind when the element's error carries no message", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            await dropFile(screen.getByTestId("data-drop-zone"), new File(["{oops"], "friends.json"));
            await reportLoadingError(container);

            // Never an empty sentence and never "[object Object]": the file is still
            // named, and the shell supplies the reason the element did not.
            expect(inlineLoadError(container)?.textContent).toBe(
                "Could not load friends.json. The data could not be read, and the loader gave no reason.",
            );
        });

        it("clears the sentence when the next load starts, and when the dataset boundary is crossed", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            await dropFile(screen.getByTestId("data-drop-zone"), new File(["{oops"], "friends.json"));
            await reportLoadingError(container, "Unexpected token o in JSON at position 1");

            expect(inlineLoadError(container)).not.toBeNull();

            // (a) the next attempt: the sentence described the load before it, and a
            // failure that outlives the load it describes is a second wrong claim.
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await flushMicrotasks();

            expect(inlineLoadError(container)).toBeNull();
            expect(statusToast(container)).toBeNull();

            /* (b) the boundary: Close dataset takes the sentence with the dataset, by the
               same route a replacing load does (6.12). The panel is reopened on Data
               because the session's FIRST successful load switches it to Explore
               (spec 02 section 1.5), which is where that click has just left it. */
            await reportLoadComplete(container);
            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            await dropFile(screen.getByTestId("data-drop-zone"), new File(["{oops"], "extra.json"));
            fireEvent.click(
                within(await screen.findByRole("dialog", { name: "Replace the current graph?" })).getByRole(
                    "button",
                    { name: "Replace" },
                ),
            );
            await flushMicrotasks();
            await reportLoadingError(container, "Unexpected token o in JSON at position 1");

            expect(statusToast(container)).not.toBeNull();

            fireEvent.click(within(screen.getByRole("region", { name: "Data" })).getByRole("button", { name: "More" }));
            fireEvent.click(await screen.findByText("Close dataset. Starts a new session"));
            await flushMicrotasks();

            expect(statusToast(container)).toBeNull();
            expect(inlineLoadError(container)).toBeNull();
        });
    });

    /* -------------------------------------------------------------------------- */
    /* The Results tab's body (2026-09-14)                                         */
    /* -------------------------------------------------------------------------- */

    /* The shell rendered `<PresentPanel />` with no props, so the format select took a pick and
       snapped back to PNG and both image verbs did nothing. */
    describe("the Present panel", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        it("keeps the image format picked, and hands it to the element's capture", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            await loadCatSample(container);

            const element = container.querySelector("graphty-element") as HTMLElement;
            const captureScreenshot = vi.fn(() => Promise.resolve({ clipboardStatus: "success" }));

            Object.defineProperty(element, "captureScreenshot", { configurable: true, value: captureScreenshot });

            fireEvent.click(screen.getByRole("button", { name: "Present" }));

            const format = await screen.findByRole("textbox", { name: "Image format" });

            fireEvent.click(format);
            fireEvent.click(await screen.findByRole("option", { name: "JPEG" }));

            await waitFor(() => {
                expect(screen.getByRole("textbox", { name: "Image format" })).toHaveValue("JPEG");
            });

            fireEvent.click(screen.getByRole("button", { name: "Export image" }));
            fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));

            expect(captureScreenshot).toHaveBeenCalledWith({ format: "jpeg", destination: { download: true } });
            expect(captureScreenshot).toHaveBeenCalledWith({ destination: { clipboard: true } });
        });
    });

    describe("the Analyze panel's Results tab", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        it("disables the Results button with no run, and carries its reason", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            await loadCatSample(container);

            fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

            const results = screen.getByTestId("analyze-tab-results");

            expect(results).toBeDisabled();
            expect(results.getAttribute("title")).toContain("No results yet");
        });

        it("shows one row naming the run and its headline after Groups, and opens it in the inspector", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            await loadCatSample(container);

            fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
            fireEvent.click(screen.getByRole("button", { name: "Run Groups" }));
            await flushMicrotasks();

            const panel = screen.getByRole("region", { name: "Analyze" });

            fireEvent.click(within(panel).getByTestId("analyze-tab-results"));

            /* The BODY, not only the tab's badge. The defect this closes is exactly a
               badge that said "Results (1)" over a body that still drew the Suggested
               cards, because `resultCount` and the list were two independently passed
               facts and only one of them reached the reader. */
            const row = within(panel).getByTestId("analyze-result-groups");

            expect(within(row).getByText("Groups")).toBeInTheDocument();
            expect(row.textContent ?? "").toMatch(/\d+ groups/);
            expect(within(panel).queryByRole("button", { name: "Run Groups" })).toBeNull();

            /* Opening a result clears the node selection, and tells the ELEMENT so:
               SelectionManager.select returns early for the node it already holds, so a
               shell that cleared only its own state leaves every route back to that node
               inert. */
            reportSelection(container, "Mr_Whiskers");
            expect(within(screen.getByTestId("inspector")).getByText("Node")).toBeInTheDocument();

            const deselectsBefore = graph.deselectNode.mock.calls.length;

            fireEvent.click(within(row).getByRole("button", { name: /Groups/ }));

            expect(graph.deselectNode.mock.calls.length).toBeGreaterThan(deselectsBefore);
            expect(within(screen.getByTestId("inspector")).queryByText("Node")).toBeNull();
        });

        it("names the run the same way on the Results row as the History entry does", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            await loadCatSample(container);
            await runSuggested("Most connected");

            const panel = screen.getByRole("region", { name: "Analyze" });

            fireEvent.click(within(panel).getByTestId("analyze-tab-results"));

            /* Floor item 6: one run is not called three things on three surfaces. The
               plain half of the 6.3 pair is what the row prints. */
            expect(within(panel).getByText("Most connected")).toBeInTheDocument();
        });
    });

    /* -------------------------------------------------------------------------- */
    /* Legend availability (2026-09-14)                                            */
    /* -------------------------------------------------------------------------- */

    describe("the legend's availability", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        it("disables both legend controls with their reason while nothing is encoded", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            await loadCatSample(container);

            fireEvent.click(screen.getByRole("button", { name: "Style" }));
            fireEvent.click(screen.getByRole("button", { name: "Expand Canvas" }));

            expect(await screen.findByRole("switch", { name: "Show legend" })).toBeDisabled();
            expect(screen.getByTestId("style-legend-row").getAttribute("title")).toBe(
                "Show legend (L). Nothing is encoded yet",
            );
        });

        it("leaves the remembered legend boolean alone when L is pressed with nothing encoded", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            await loadCatSample(container);

            fireEvent.click(screen.getByRole("button", { name: "Style" }));
            fireEvent.click(screen.getByRole("button", { name: "Expand Canvas" }));

            const before = (await screen.findByRole("switch", { name: "Show legend" })).getAttribute("aria-checked");

            fireEvent.keyDown(window, { key: "l" });

            const after = screen.getByRole("switch", { name: "Show legend" }).getAttribute("aria-checked");

            /* A no-op rather than a disabled key: a key press has no ink to grey out, so
               the only honest thing it can do is nothing. Flipping the boolean invisibly
               would surprise the reader with a legend (or none) at the next painting run. */
            expect(after).toBe(before);
        });

        it("enables both legend controls once a run has painted an encoding", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            await loadCatSample(container);
            await runSuggested("Most connected");

            fireEvent.click(screen.getByRole("button", { name: "Style" }));
            fireEvent.click(screen.getByRole("button", { name: "Expand Canvas" }));

            expect(await screen.findByRole("switch", { name: "Show legend" })).toBeEnabled();
            expect(screen.getByTestId("style-legend-row").getAttribute("title")).toBe("Show legend (L)");
        });
    });

    /* -------------------------------------------------------------------------- */
    /* Neighbours (2026-09-14)                                                     */
    /* -------------------------------------------------------------------------- */

    describe("the node inspector's neighbours", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        /**
         * Loads the cat fixture, selects one node and returns its real link count.
         *
         * The count the inspector draws has to be the count the records carry, on either id
         * type. It once was not: the shell read a spelling of an edge's ends that no record
         * carried, so every node on every dataset reported zero neighbours while its own
         * result card said otherwise -- silent, and format-dependent, which is why this board
         * runs the same measurement twice.
         * @param numericIds - whether the fixture carries integer ids, as GML loads do.
         * @returns the selected node's id and how many distinct neighbours it has.
         */
        async function selectBusiestNode(numericIds: boolean) {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            installNovicePathGraph(container, { numericIds });

            await loadCatSample(container);

            /* The count is derived from the FIXTURE, not read back off the stub, so the
               board measures the same records `installNovicePathGraph` seeded rather than
               whatever the shell happened to store. */
            const fixture = numericIds ? withNumericIds(CAT_SOCIAL_NETWORK) : CAT_SOCIAL_NETWORK;
            const counts = new Map<string, Set<string>>();

            for (const edge of fixture.edges) {
                const src = String(edge.source);
                const dst = String(edge.target);

                if (!counts.has(src)) {
                    counts.set(src, new Set());
                }

                if (!counts.has(dst)) {
                    counts.set(dst, new Set());
                }

                counts.get(src)?.add(dst);
                counts.get(dst)?.add(src);
            }

            const [busiest] = [...counts.entries()].sort((one, two) => two[1].size - one[1].size);

            reportSelection(container, busiest[0]);

            return { neighborCount: busiest[1].size };
        }

        it("reads the node's REAL link count from the source/target spelling getData writes", async () => {
            const { neighborCount } = await selectBusiestNode(false);

            expect(neighborCount).toBeGreaterThan(0);

            const inspector = screen.getByTestId("inspector");

            expect(
                within(inspector).getByRole("button", { name: `Expand ${String(neighborCount)} neighbors` }),
            ).toBeInTheDocument();
        });

        it("reads the same count on a numeric-id graph, which retires the id-type suspicion", async () => {
            /* The observation arrived as "it must be the id type", because one file format
               happened to work and another did not. It was never the id type; it was two
               spellings of an edge's ends. Running this board on BOTH id types retires that
               suspicion permanently, and keeps doing so now that one spelling is left. */
            const { neighborCount } = await selectBusiestNode(true);

            expect(neighborCount).toBeGreaterThan(0);

            const inspector = screen.getByTestId("inspector");

            expect(
                within(inspector).getByRole("button", { name: `Expand ${String(neighborCount)} neighbors` }),
            ).toBeInTheDocument();
        });
    });

    /* -------------------------------------------------------------------------- */
    /* Pinning a node to the canvas                                                */
    /* -------------------------------------------------------------------------- */

    describe("the node inspector's Pin verb", () => {
        /**
         * Stands the element's three pin verbs on the mounted host.
         *
         * They are the element's, not the graph's: `element.pin` / `unpin` / `pinnedNodes` are
         * the published door, and reaching through `element.graph` to a node object is what
         * they exist to replace. The stand-in records the id it was handed, because the id TYPE
         * is the thing that decides whether the verb does anything -- the element looks a node
         * up by exact map key, so a printed "1" finds nothing on a graph keyed by the number 1.
         * @param container - the render result's container.
         * @returns the ids pinned and unpinned, in call order.
         */
        function installPinVerbs(container: HTMLElement) {
            const element = container.querySelector("graphty-element");

            expect(element).not.toBeNull();

            const pinned = new Set<string | number>();
            const pinnedWith: (string | number)[] = [];
            const unpinnedWith: (string | number)[] = [];

            Object.defineProperties(element as HTMLElement, {
                pin: {
                    configurable: true,
                    value: (id: string | number) => {
                        pinnedWith.push(id);
                        pinned.add(id);
                    },
                },
                unpin: {
                    configurable: true,
                    value: (id: string | number) => {
                        unpinnedWith.push(id);
                        pinned.delete(id);
                    },
                },
                pinnedNodes: { configurable: true, get: () => pinned },
            });

            return { pinnedWith, unpinnedWith };
        }

        /**
         * Loads the cat fixture with integer ids and selects one node.
         * @returns the element's pin call log and the id that was selected.
         */
        async function selectNumericNode() {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container, { numericIds: true });

            const calls = installPinVerbs(container);

            await loadCatSample(container);

            const selected = Number(withNumericIds(CAT_SOCIAL_NETWORK).nodes[0].id);

            reportSelection(container, selected);

            return { ...calls, selected };
        }

        it("hands the element the id it holds, not the id the inspector printed", async () => {
            const { pinnedWith, selected } = await selectNumericNode();

            fireEvent.click(screen.getByTestId("inspector-actions-more"));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Pin" }));

            /* A printed "1" would leave `DataManager.nodes.get` looking for a key that is not
               there, and `element.pin` returns nothing, so the miss would be silent: the verb
               would read as wired and fix no node at all. */
            expect(pinnedWith).toEqual([selected]);
            expect(typeof pinnedWith[0]).toBe("number");
        });

        it("draws the Pinned badge once the element holds the pin, and releases it again", async () => {
            const { unpinnedWith, selected } = await selectNumericNode();

            expect(screen.queryByTestId("node-pinned-badge")).toBeNull();

            fireEvent.click(screen.getByTestId("inspector-actions-more"));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Pin" }));

            expect(screen.getByTestId("node-pinned-badge")).toHaveTextContent("Pinned");

            fireEvent.click(screen.getByTestId("node-unpin"));

            expect(unpinnedWith).toEqual([selected]);
            expect(screen.queryByTestId("node-pinned-badge")).toBeNull();
        });

        it("draws the badge for a node the reader pinned by DRAGGING it, without a second pick", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container, { numericIds: true });

            const element = container.querySelector("graphty-element");
            const pinned = new Set<string | number>();

            Object.defineProperty(element as HTMLElement, "pinnedNodes", {
                configurable: true,
                get: () => pinned,
            });

            await loadCatSample(container);

            const selected = Number(withNumericIds(CAT_SOCIAL_NETWORK).nodes[0].id);

            reportSelection(container, selected);

            expect(screen.queryByTestId("node-pinned-badge")).toBeNull();

            /* What a drag does, in the order the element does it: `pinOnDrag` is on by default,
               so letting go of the node pins it and then `graphty-node-drag-end` leaves the
               element carrying the pin as it stands afterwards. The node is ALREADY SELECTED
               here, which is the case the shell used to get wrong -- it learned about a drag
               pin only on the next pick, so the badge stayed off for the node in front of the
               reader until they clicked something else and came back. */
            pinned.add(selected);

            act(() => {
                element?.dispatchEvent(
                    new CustomEvent("graphty-node-drag-end", {
                        detail: { nodeId: selected, position: { x: 1, y: 2, z: 3 }, pinned: true },
                        bubbles: true,
                        composed: true,
                    }),
                );
            });

            expect(screen.getByTestId("node-pinned-badge")).toHaveTextContent("Pinned");
        });
    });

    /* The one setting the element applies the moment it is written, and the one the element
       refuses to remember: the shell holds it, writes it on the tag and writes it to storage,
       so a reader who switched the GPU off finds it off on their next visit. */
    describe("the acceleration policy", () => {
        afterEach(() => {
            window.localStorage.removeItem(ACCELERATION_SETTINGS_STORAGE_KEY);
        });

        it("mounts the element with the policy the reader stored", async () => {
            window.localStorage.setItem(ACCELERATION_SETTINGS_STORAGE_KEY, '{"policy":"off"}');

            const { container } = await renderMeasuredShell();

            expect(container.querySelector("graphty-element")?.getAttribute("acceleration")).toBe("off");
        });

        it("writes a change to the element at once and remembers it", async () => {
            const { container } = await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Settings" }));
            /* Settings opens on its first section, Appearance, and draws only the active
               section's pane, so the Performance tab is a click of its own. */
            fireEvent.click(screen.getByRole("tab", { name: "Performance" }));
            fireEvent.click(screen.getByRole("radio", { name: "Required" }));

            expect(container.querySelector("graphty-element")?.getAttribute("acceleration")).toBe("required");
            expect(window.localStorage.getItem(ACCELERATION_SETTINGS_STORAGE_KEY)).toBe('{"policy":"required"}');
        });
    });

    /* What the reader is told about the GPU, and where. The element decides everything --
       whether there is an accelerator, which one, and whether it has just been lost -- and
       publishes one document on every transition; the shell listens on its frame, as it does
       for the load events, and draws the document. It asks the machine nothing. */
    describe("the acceleration chip and the device-lost report", () => {
        afterEach(() => {
            window.localStorage.removeItem(ACCELERATION_SETTINGS_STORAGE_KEY);
        });

        it("draws no chip before the element has spoken, with no dataset loaded", async () => {
            const { container } = await renderMeasuredShell();

            expect(container.querySelector("[data-status-spacer]")).not.toBeNull();
            expect(screen.queryByText(/^GPU acceleration/)).toBeNull();
        });

        it("draws the chip as soon as the element reports, with or without a dataset", async () => {
            const { container } = await renderMeasuredShell();

            await reportAcceleration(container, { state: "idle", backend: "webgpu", vendor: "nvidia", architecture: "ampere" });

            expect(screen.getByText("GPU acceleration: on (nvidia ampere)")).toBeInTheDocument();
        });

        it("opens Settings > Performance from the chip", async () => {
            const { container } = await renderMeasuredShell();

            await reportAcceleration(container, { state: "idle", backend: "webgpu" });
            fireEvent.click(screen.getByText("GPU acceleration: on"));

            expect(screen.getByTestId("settings-acceleration")).toBeInTheDocument();
        });

        it("reports a lost device through the toast and flips the chip, without dismissing itself", async () => {
            const { container } = await renderMeasuredShell();

            await reportAcceleration(container, {
                state: "error",
                code: "E_DEVICE_LOST",
                reason: "the accelerator's device was lost: reset",
            });

            const toast = statusToast(container);

            expect(toast).not.toBeNull();
            expect(toast).toHaveTextContent("the accelerator's device was lost: reset");
            expect(within(toast as HTMLElement).getByText("Open Settings")).toBeInTheDocument();
            expect(screen.getByText("GPU acceleration: off")).toBeInTheDocument();

            /* The element attempts a fresh accelerator by itself, so the toast leaves when the
               next transition says the machine is working again. Nothing dismisses it here. */
            await reportAcceleration(container, { state: "idle", backend: "webgpu" });

            expect(statusToast(container)).toBeNull();
        });

        it("lets a failed load win the toast", async () => {
            const { container } = await renderMeasuredShell();

            await dropFile(container.querySelector("[data-dragging]") as HTMLElement, new File(["{oops"], "bad.json"));
            await reportLoadingError(container, "bad file");
            await reportAcceleration(container, {
                state: "error",
                code: "E_DEVICE_LOST",
                reason: "the accelerator's device was lost: reset",
            });

            /* Two producers, one toast. The failed load is the one the reader just caused, so
               it is the one the toast says; the GPU fact is on the chip beside it either way.
               `statusToast` rather than the alert role: the Welcome drop zone reports the same
               failed load inline, and that is a second live region. */
            const toast = statusToast(container);

            expect(toast).not.toBeNull();
            expect(toast).toHaveTextContent("bad file");
            expect(toast).not.toHaveTextContent("the accelerator's device was lost: reset");
        });

        it("shows a reader who required acceleration why there is none", async () => {
            window.localStorage.setItem(ACCELERATION_SETTINGS_STORAGE_KEY, '{"policy":"required"}');

            const { container } = await renderMeasuredShell();

            await reportAcceleration(container, {
                state: "unavailable",
                code: "E_NO_WEBGPU",
                reason: "this browser has no WebGPU",
            });

            expect(container.querySelector("graphty-element")?.getAttribute("acceleration")).toBe("required");
            expect(screen.getByText("GPU acceleration: off")).toBeInTheDocument();
            expect(screen.getByTitle("this browser has no WebGPU")).toBeInTheDocument();
            expect(statusToast(container)).toBeNull();
        });
    });
});
