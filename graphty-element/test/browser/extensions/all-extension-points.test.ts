/**
 * @file All six extension points at once, on one graph, in one page.
 *
 * WHY THIS FILE EXISTS BESIDE THE SIX. Each of the other files in this directory proves one
 * extension point in isolation: a palette suite registers palettes and nothing else, a layout
 * suite registers engines and nothing else. Isolation is the right way to prove a point works,
 * and it is the wrong way to find out whether the points INTERFERE -- whether a registered
 * format's records can be laid out by a registered engine, measured by a registered algorithm,
 * painted with a registered palette, framed by a registered view, with a registered log
 * destination listening to all of it. That is how a third party actually uses them, and it is
 * the one arrangement none of the six files can reach.
 *
 * WHAT IS BEING BOUGHT. Registration is global and there is one catalogue, so six extensions
 * share one table, one options validator, one error vocabulary and one repaint. Six things that
 * each work alone can still produce a page where the layout's options are validated against the
 * camera's descriptor, or where the last registration to load wins a key the others were using.
 * Every assertion below reads what the ELEMENT resolved -- the catalogue it publishes, the
 * coordinates it stored, the colour it says a node is painted, the state it moved the camera to
 * -- rather than the plugin's own bookkeeping.
 *
 * THE SHAPE OF THE SUITE. One graph is stood up once, in `beforeAll`, with all six extensions in
 * play: the data arrives through the registered FORMAT, is arranged by the registered LAYOUT,
 * measured by the registered ALGORITHM, painted through the registered PALETTE, framed by the
 * registered CAMERA view, while the registered LOG destination collects what the element says
 * about the work. Each `it` then reads one consequence off that single shared graph. A test that
 * needed its own graph would be back to proving the six one at a time.
 *
 * EVERY IMPORT IS ONE A CUSTOMER COULD WRITE. The relative paths are this repository reaching
 * its own published entry points: `../../../extend` is `@graphty/graphty-element/extend`,
 * `../../../catalog` is `@graphty/graphty-element/catalog`, `../../../session` is
 * `@graphty/graphty-element/session` and `../../../index.js` is `@graphty/graphty-element`.
 * Nothing here reaches into `src/`, nothing casts, and nothing re-declares a type the element
 * already has -- which is the sixth clause of the parity rule, checked by this file compiling.
 */

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import { cameraDescriptor, formatDescriptor, layoutDescriptor, logSinkDescriptor, paletteDescriptor } from "../../../catalog";
import {
    type AlgorithmDescriptor,
    type AlgorithmOutput,
    type AlgorithmRunContext,
    type AuthoredLayoutDescriptor,
    type BaseDataSourceConfig,
    type CameraState,
    type CameraViewInput,
    type CameraViewRegistration,
    clearRegisteredAlgorithmsForTesting,
    clearRegisteredCamerasForTesting,
    clearRegisteredFormatsForTesting,
    clearRegisteredLayoutsForTesting,
    clearRegisteredLogSinksForTesting,
    clearRegisteredPalettesForTesting,
    DataSource,
    type DataSourceChunk,
    DeclaredAlgorithm,
    declaredCaveats,
    type FormatDescriptor,
    type LogSinkDescriptor,
    metricFieldSpecs,
    type Node,
    nodeMetricFields,
    type PaletteDescriptor,
    registerCameraView,
    registerLogSink,
    registerPalette,
    type ResultElementValues,
    SimpleLayoutEngine,
} from "../../../extend";
import { Graph } from "../../../index.js";
/*
 * The logger's own vocabulary comes from `./logging` and the verb that registers a destination
 * under a name comes from `./extend`, which is the split the package publishes: two import lines
 * for one extension point, the same way every other point here reads its types from one entry
 * point and its registration from another.
 */
import { GraphtyLogger, LogLevel, type LogRecord, type Sink } from "../../../logging";
import type { GraphSession, LayerSpec, NodeId } from "../../../session";

// ---------------------------------------------------------------------------------------------
// 1. The palette
// ---------------------------------------------------------------------------------------------

/**
 * Two anchors and nothing in between, so every colour this file asserts is one of them.
 *
 * A ramp with two anchors answers the bottom of its domain with the first and the top with the
 * second, exactly, with no interpolation to argue about -- which is what makes "the element
 * painted this node with the plugin's palette" a fact a reader can check by eye.
 */
const SIGNAL_ANCHORS = ["#0A2E4F", "#F5C242"] as const;

/** The palette, declared the way a brand's design system would export one. */
const ATLAS_SIGNAL: PaletteDescriptor = {
    id: "atlas-signal",
    plainName: "Atlas Signal",
    kind: "sequential",
    colors: [...SIGNAL_ANCHORS],
    capacity: null,
    colorblindSafe: ["deuteranopia"],
};

// ---------------------------------------------------------------------------------------------
// 2. The file format
// ---------------------------------------------------------------------------------------------

/** The name a host asks for the format by, and the name the reader is filed under. */
const ATLAS_FORMAT = "atlas-roll";

/**
 * A roll call: five people carrying a score, and the links between them.
 *
 * The scores run 0 to 4 because the palette above has two anchors and the layer below reads this
 * column over the domain 0 to 4 -- so the first person lands exactly on the first anchor and the
 * last exactly on the second.
 */
const ROLL_FILE = [
    "# an Atlas roll call",
    "person ann 0",
    "person bo 1",
    "person cy 2",
    "person di 3",
    "person ed 4",
    "link ann bo",
    "link bo cy",
    "link cy di",
    "link di ed",
].join("\n");

/** Who is in the file, in the order the file lists them. */
const PEOPLE = ["ann", "bo", "cy", "di", "ed"] as const;

/** How many neighbours each person has, which is what the algorithm below measures. */
const NEIGHBOURS: Readonly<Record<string, number>> = { ann: 1, bo: 2, cy: 2, di: 2, ed: 1 };

/** What a host may pass this format beyond the members `BaseDataSourceConfig` declares. */
interface RollConfig extends BaseDataSourceConfig {
    /** Multiplies every score as it is read, standing in for any format-specific knob. */
    scoreScale?: number;
}

/** What the catalogue publishes about the format, and what an import dialog renders. */
const ATLAS_FORMAT_DESCRIPTOR: FormatDescriptor = {
    id: ATLAS_FORMAT,
    plainName: "Atlas Roll Call",
    extensions: [".atlasroll"],
    mimeTypes: ["text/vnd.atlas.roll"],
    canImport: true,
    canExport: false,
    options: [
        {
            name: "scoreScale",
            plainName: "Score multiplier",
            type: "number",
            default: 1,
            min: 0.1,
            max: 100,
            description: "Multiplies every score in the file as it is read.",
        },
    ],
};

/**
 * The reader.
 *
 * Fetching the bytes, retrying a failed fetch, chunking, validating each record, collecting the
 * rejects, publishing the description to the catalogue and checking the host's options against it
 * are all inherited. What this class adds is the parser.
 */
class AtlasRollSource extends DataSource {
    static type = ATLAS_FORMAT;

    static descriptor: FormatDescriptor = ATLAS_FORMAT_DESCRIPTOR;

    /**
     * Recognise a roll call by its first bytes, so a file whose name says nothing still loads.
     * @param sample - The first bytes of the file, as text.
     * @returns Whether this is a roll call.
     */
    static detect = (sample: string): boolean => /^(person|link)\s+\S+/m.test(sample);

    readonly #config: RollConfig;

    /** The multiplier after the element filled in the declared default and checked it. */
    readonly #scoreScale: number;

    /**
     * @param opts - What the host passed this format. Declared rather than cast: a subclass may
     *   narrow a constructor parameter, so a format author never writes `as` to read their own
     *   options.
     */
    constructor(opts: RollConfig) {
        super(opts.errorLimit ?? 100, opts.chunkSize ?? DataSource.DEFAULT_CHUNK_SIZE);
        this.#config = opts;

        const resolved = this.resolveOptions(opts);
        this.#scoreScale = typeof resolved.scoreScale === "number" ? resolved.scoreScale : 1;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.#config;
    }

    /**
     * Hand the element the roll call a chunk at a time.
     * @yields One chunk of records per call.
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const text = await this.getContent();
        const nodes = [];
        const edges = [];

        for (const raw of text.split("\n")) {
            const line = raw.trim();

            if (line === "" || line.startsWith("#")) {
                continue;
            }

            const [verb, first, second] = line.split(/\s+/);

            if (verb === "person") {
                nodes.push(DataSource.toRecord({ id: first, score: Number(second) * this.#scoreScale }));
            } else {
                edges.push(DataSource.toRecord({ src: first, dst: second }));
            }
        }

        // A roll call lists links that run both ways, and the element counts the graph as the
        // file says rather than as the element's own default would have it.
        this.declareDirection(false, "an Atlas roll call links people both ways");

        for (const chunk of this.chunkData(nodes, edges)) {
            yield chunk;
        }
    }
}

// ---------------------------------------------------------------------------------------------
// 3. The camera view
// ---------------------------------------------------------------------------------------------

/** How far out the view stands by default, as a multiple of the graph's longest side. */
const DEFAULT_STANDOFF = 3;

/** Every input the view was handed, newest last, so a test can see what the element measured. */
const viewInputs: CameraViewInput[] = [];

/**
 * A view that stands off one corner of whatever it is asked to frame and looks at the middle.
 *
 * Deliberately trivial arithmetic: a failure here names a real problem rather than starting an
 * argument about rounding.
 */
const ATLAS_OVERHEAD: CameraViewRegistration = {
    descriptor: {
        id: "atlas-overhead",
        plainName: "Atlas corner",
        description: "Stands off one corner of the graph and looks at the middle of it.",
        modes: ["3d"],
        options: [
            {
                name: "standoff",
                plainName: "Distance",
                type: "number",
                default: DEFAULT_STANDOFF,
                min: 1,
                max: 20,
                description: "How far out to stand, as a multiple of the longest side of the graph.",
            },
        ],
    },
    compute(input: CameraViewInput): CameraState {
        viewInputs.push(input);

        const { standoff } = input.options;

        if (typeof standoff !== "number") {
            // The element fills in whatever the descriptor declared a default for, so a view is
            // entitled to find its options already there. Saying so loudly is what makes the
            // assertion about defaults below mean something.
            throw new Error(`atlas-overhead was handed options it did not declare: ${JSON.stringify(input.options)}`);
        }

        const { center, maxDimension } = input.bounds;
        const offset = Math.max(maxDimension, 1) * standoff;

        return {
            type: "arcRotate",
            position: { x: center.x + offset, y: center.y + offset, z: center.z + offset },
            target: { x: center.x, y: center.y, z: center.z },
        };
    },
};

// ---------------------------------------------------------------------------------------------
// 4. The layout
// ---------------------------------------------------------------------------------------------

/** The key the layout registers under, which is also what its descriptor publishes. */
const ATLAS_LAYOUT = "atlas-column";

/**
 * A single-pass arrangement: everybody in one vertical line, in the order they arrived.
 *
 * The coordinates written into `positions` are LAYOUT units; the base class multiplies them by
 * `scalingFactor` on the way into the element's shared position array, which is why the
 * assertions below expect multiples of a hundred rather than of one.
 */
class AtlasColumnLayout extends SimpleLayoutEngine {
    static type = ATLAS_LAYOUT;

    static maxDimensions: 2 | 3 = 3;

    /**
     * What a picker reads, and the one place this layout's options are declared.
     *
     * `id` is the same string as `static type` on purpose: a layout has one key, so the name a
     * consumer types, the name a saved document records and the name the catalogue publishes
     * cannot drift apart.
     */
    static descriptor: AuthoredLayoutDescriptor = {
        id: ATLAS_LAYOUT,
        plainName: "Atlas column",
        technicalName: "single column placement",
        description: "Puts every node in one vertical line, in the order it arrived.",
        family: "geometric",
        kind: "batch",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: ATLAS_LAYOUT,
        options: [
            {
                name: "gap",
                plainName: "Spacing",
                type: "number",
                default: 1,
                min: 0.1,
                max: 10,
                description: "Vertical separation between neighbours, in layout units.",
            },
        ],
    };

    /** How many times the element has asked for the arrangement to be computed. */
    passes = 0;

    readonly #gap: number;

    /**
     * @param opts - The consumer's layout options, merged with the base class's dimension options.
     */
    constructor(opts: { gap?: number } = {}) {
        super(opts);
        this.#gap = opts.gap ?? 1;
    }

    /** Put everybody in a line. */
    doLayout(): void {
        this.passes++;
        this.positions = {};

        this._nodes.forEach((node: Node, index: number) => {
            this.positions[node.id] = [0, index * this.#gap, 0];
        });
    }
}

// ---------------------------------------------------------------------------------------------
// 5. The algorithm
// ---------------------------------------------------------------------------------------------

/** The key a consumer types to start a run of it, and the key its result is addressed under. */
const ATLAS_ALGORITHM = "atlas-links";

/** What the run publishes per node. The shape fixes the names; only `value` is computed here. */
const ATLAS_ALGORITHM_DESCRIPTOR: AlgorithmDescriptor = {
    key: ATLAS_ALGORITHM,
    plainName: "Direct links",
    technicalName: "neighbour count",
    description: "Counts how many other nodes each node is directly linked to.",
    category: "centrality",
    shape: "node-metric",
    fields: nodeMetricFields({
        plainName: "Direct links",
        technicalName: "neighbour count",
        type: "integer",
        unit: "links",
    }),
    options: [],
    costClass: "instant",
    complexity: "O(n + m)",
};

/**
 * A third party's node metric.
 *
 * `DeclaredAlgorithm` is the base the element's own algorithms use: a subclass implements
 * `compute` and RETURNS what it measured. It computes no ranking, no percentile and no
 * statistics, because those are the element's to derive.
 */
class AtlasLinks extends DeclaredAlgorithm {
    static override namespace = "atlas";

    static override type = ATLAS_ALGORITHM;

    static override descriptor = ATLAS_ALGORITHM_DESCRIPTOR;

    /** The version recorded on every run this algorithm produces. */
    static version = "1.4.0";

    /**
     * Count each node's direct links.
     * @param context - A signal to stop on, a channel to report progress down, and a yield.
     * @returns What was measured, or null when there was nothing to measure.
     */
    override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const graph = this.algorithmGraph("undirected");
        const ids = [...graph.nodes()].map((node) => node.id as NodeId);

        if (ids.length === 0) {
            return null;
        }

        const measured: ResultElementValues[] = [];

        context.report({ phase: "Counting links", completed: 0, total: ids.length });

        for (let index = 0; index < ids.length; index++) {
            context.signal.throwIfAborted();

            const id = ids[index];
            measured.push({ id, values: { value: [...graph.neighbors(id)].length } });

            context.report({ phase: "Counting links", completed: index + 1, total: ids.length });
            await context.yieldNow();
        }

        return {
            shape: "node-metric",
            fields: metricFieldSpecs("node", "integer"),
            nodes: measured,
            graph: { normalization: "none" },
            caveats: declaredCaveats({
                direction: "undirected",
                weight: null,
                method: "one pass over the neighbour lists",
            }),
        };
    }
}

// ---------------------------------------------------------------------------------------------
// 6. The log destination
// ---------------------------------------------------------------------------------------------

/** The name a configuration turns the destination on by. */
const ATLAS_SINK = "atlas-log";

/** A destination that keeps records in memory rather than printing or posting them. */
interface Collector extends Sink {
    /** What it is holding, oldest first. */
    readonly kept: readonly LogRecord[];
    /** The option values the element handed the factory, exactly as they arrived. */
    readonly built: Readonly<Record<string, unknown>>;
}

/** The one collector a configuration built, so the page can read back what it heard. */
let collector: Collector | null = null;

/** What the catalogue publishes about the destination, and what a settings panel renders. */
const ATLAS_SINK_DESCRIPTOR: LogSinkDescriptor = {
    id: ATLAS_SINK,
    plainName: "Atlas in-page collector",
    description: "Keeps the most recent records in memory so a page can show them without a log server.",
    options: [
        {
            name: "capacity",
            plainName: "Records kept",
            type: "integer",
            default: 500,
            min: 1,
            max: 5000,
            description: "How many of the most recent records to hold on to.",
        },
    ],
};

/**
 * Build a collector from option values the element has already checked and filled in.
 * @param options - The resolved option values.
 * @returns The destination.
 */
function createCollector(options: Readonly<Record<string, unknown>>): Collector {
    const kept: LogRecord[] = [];
    const capacity = typeof options.capacity === "number" ? options.capacity : 500;

    const built: Collector = {
        name: ATLAS_SINK,
        write(record: LogRecord): void {
            kept.push(record);

            if (kept.length > capacity) {
                kept.shift();
            }
        },
        get kept(): readonly LogRecord[] {
            return kept;
        },
        built: options,
    };

    collector = built;

    return built;
}

// ---------------------------------------------------------------------------------------------
// Six registrations, all at module scope, exactly as six plugin packages would do on import
// ---------------------------------------------------------------------------------------------

registerPalette(ATLAS_SIGNAL);
DataSource.register(AtlasRollSource);
registerCameraView(ATLAS_OVERHEAD);
SimpleLayoutEngine.register(AtlasColumnLayout);
DeclaredAlgorithm.register(AtlasLinks);
registerLogSink({ descriptor: ATLAS_SINK_DESCRIPTOR, create: createCollector });

// ---------------------------------------------------------------------------------------------
// The one graph everything below reads
// ---------------------------------------------------------------------------------------------

/** How far a reported camera position may sit from the computed one and still be the same place. */
const PLACE_TOLERANCE = 0.5;

/** The layer that paints the roll call's scores through the registered palette. */
const SIGNAL_LAYER: LayerSpec = {
    name: "By score",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.color": { by: "data.score", scale: "linear", domain: [0, 4], palette: "atlas-signal" } },
};

let container: HTMLDivElement;
let graph: Graph;
let session: GraphSession;
let runId = "";

/**
 * The colour the element says one node is painted, in the one spelling every anchor is stored in.
 * @param id - The node id.
 * @returns Six upper-case hex digits behind a hash, or null when nothing painted a colour.
 */
function paintedColor(id: string): string | null {
    const painted = session.styles.explain({ node: id }).merged["node.color"];

    // Alpha is a channel of its own; an anchor is a hue, so the comparison is of hues.
    return painted === undefined ? null : painted.hex.slice(0, 7).toUpperCase();
}

describe("six extensions, one graph", () => {
    beforeAll(async () => {
        // The element's console destination is real, so it prints while the graph works. Silence
        // it rather than filling the run's output with the element's own log lines.
        vi.spyOn(console, "debug").mockImplementation(() => undefined);
        vi.spyOn(console, "info").mockImplementation(() => undefined);
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        // LOGGING FIRST, because a destination attached after the work is done hears none of it.
        // The destination is named in a configuration rather than handed over as a live object,
        // which is the route a settings panel and a stored configuration take.
        await GraphtyLogger.configure({
            enabled: true,
            level: LogLevel.TRACE,
            modules: "*",
            sinks: [{ use: ATLAS_SINK, options: {} }],
        });

        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);

        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        // FORMAT: the data arrives by naming the registered reader. Nothing else in this file
        // adds a node, so every assertion below stands on the plugin's parser having worked.
        await graph.addDataFromSource(ATLAS_FORMAT, { data: ROLL_FILE });
        await graph.operationQueue.waitForCompletion();

        // LAYOUT: the registered engine decides where those nodes sit.
        await graph.setLayout(ATLAS_LAYOUT, {});
        await graph.operationQueue.waitForCompletion();

        // ALGORITHM: the registered algorithm measures them.
        const run = graph.run(ATLAS_ALGORITHM);
        await run;
        runId = run.id;
        await graph.operationQueue.waitForCompletion();

        // PALETTE: a layer paints them through the registered palette, on top of whatever the
        // element derived from the run.
        await session.styles.add(SIGNAL_LAYER);
        await graph.operationQueue.waitForCompletion();

        // CAMERA: the registered view decides where the viewer stands.
        await graph.applyCameraView("atlas-overhead", { animate: false });
        await graph.operationQueue.waitForCompletion();
    });

    afterAll(async () => {
        await graph.operationQueue.waitForCompletion();
        graph.dispose();
        container.remove();

        await GraphtyLogger.configure({ enabled: false });
        vi.restoreAllMocks();

        // The registries are global and there is no unregister, so a suite that registers
        // something owes the next suite the registries it found.
        clearRegisteredAlgorithmsForTesting();
        clearRegisteredCamerasForTesting();
        clearRegisteredFormatsForTesting();
        clearRegisteredLayoutsForTesting();
        clearRegisteredLogSinksForTesting();
        clearRegisteredPalettesForTesting();
    });

    // -----------------------------------------------------------------------------------------
    // Clause 1: every one of the six is in the catalogue a picker reads
    // -----------------------------------------------------------------------------------------

    it("offers all six in the one catalogue the session publishes, beside the element's own", () => {
        const { catalog } = session;

        assert.isDefined(
            catalog.palettes().find((entry) => entry.id === "atlas-signal"),
            "a palette picker is offered the registered palette",
        );
        assert.isDefined(
            catalog.formats().find((entry) => entry.id === ATLAS_FORMAT),
            "an import dialog is offered the registered format",
        );
        assert.isDefined(
            catalog.cameras().find((entry) => entry.id === "atlas-overhead"),
            "a camera menu is offered the registered view",
        );
        assert.isDefined(
            catalog.layouts().find((entry) => entry.id === ATLAS_LAYOUT),
            "a layout picker is offered the registered engine",
        );
        assert.isDefined(
            catalog.algorithms().find((entry) => entry.key === ATLAS_ALGORITHM),
            "a metrics panel is offered the registered algorithm",
        );
        assert.isDefined(
            catalog.logSinks().find((entry) => entry.id === ATLAS_SINK),
            "a settings panel is offered the registered log destination",
        );
    });

    it("leaves the element's own entries in every one of those tables untouched", () => {
        const { catalog } = session;

        // Registration ADDS. Six plugins in one page must not displace or reorder what the
        // element ships, because a saved document that named a built-in yesterday has to mean
        // the same thing today.
        assert.isDefined(catalog.palettes().find((entry) => entry.id === "viridis"));
        assert.isDefined(catalog.formats().find((entry) => entry.id === "json"));
        assert.isDefined(catalog.cameras().find((entry) => entry.id === "isometric"));
        assert.isDefined(catalog.layouts().find((entry) => entry.id === "circular"));
        assert.isDefined(catalog.algorithms().find((entry) => entry.key === "degree"));
        assert.isDefined(catalog.logSinks().find((entry) => entry.id === "console"));
    });

    it("survives a postMessage with all six in it, so a worker and a saved file read the same six", () => {
        // The catalogue's contract is plain JSON. One plugin that put a function on a descriptor
        // would break that for every consumer of the whole table, not just for itself.
        const tables = {
            palettes: session.catalog.palettes(),
            formats: session.catalog.formats(),
            cameras: session.catalog.cameras(),
            layouts: session.catalog.layouts(),
            algorithms: session.catalog.algorithms(),
            logSinks: session.catalog.logSinks(),
        };

        assert.deepEqual(JSON.parse(JSON.stringify(tables)) as typeof tables, tables);
    });

    // -----------------------------------------------------------------------------------------
    // Clause 2: each is addressable by the key a consumer types
    // -----------------------------------------------------------------------------------------

    it("finds all six by the key a consumer types, through the same lookups that find a built-in", () => {
        assert.strictEqual(paletteDescriptor("atlas-signal")?.plainName, "Atlas Signal");
        assert.strictEqual(formatDescriptor(ATLAS_FORMAT)?.plainName, "Atlas Roll Call");
        assert.strictEqual(cameraDescriptor("atlas-overhead")?.plainName, "Atlas corner");
        assert.strictEqual(layoutDescriptor(ATLAS_LAYOUT)?.plainName, "Atlas column");
        assert.strictEqual(logSinkDescriptor(ATLAS_SINK)?.plainName, "Atlas in-page collector");
        assert.strictEqual(
            session.catalog.algorithms().find((entry) => entry.key === ATLAS_ALGORITHM)?.plainName,
            "Direct links",
        );
    });

    // -----------------------------------------------------------------------------------------
    // Clause 3: each actually takes effect, on this graph, at the same time
    // -----------------------------------------------------------------------------------------

    it("read the graph with the registered format, and counted it the way the file said", () => {
        const ids = graph.getNodes().map((node) => String(node.id));

        assert.sameMembers(ids, [...PEOPLE], "every person in the file reached the element");
        assert.strictEqual(graph.getDataManager().edges.size, 4, "and every link did too");
        assert.isFalse(
            session.status.directed,
            "the file said its links run both ways, and the element counted the graph that way",
        );
    });

    it("arranged the graph with the registered layout, and stored the coordinates the engine chose", () => {
        const { positions } = session;
        const stored = { x: 0, y: 0, z: 0 };
        const heights: number[] = [];

        for (const node of graph.getNodes()) {
            assert.isTrue(positions.isPlaced(node.index), `the array holds a row for node ${String(node.id)}`);
            positions.read(node.index, stored);

            assert.closeTo(stored.x, 0, 0.01, `node ${String(node.id)} sits on the column`);
            assert.closeTo(stored.z, 0, 0.01, `node ${String(node.id)} sits on the column`);
            heights.push(Math.round(stored.y));
        }

        // The engine writes layout units and the base class scales them by a hundred, so a column
        // of five is five distinct multiples of a hundred. This engine never publishes into the
        // element's position array itself; the element does it on the engine's behalf.
        assert.sameMembers(heights, [0, 100, 200, 300, 400], "one node per rung, and no two on the same rung");
    });

    it("measured the graph with the registered algorithm, and published a result the session can read", () => {
        const result = session.runs.get(runId)?.result;

        assert.isDefined(result, "the run the consumer started produced a result");

        for (const id of PEOPLE) {
            assert.strictEqual(
                result?.node(id)?.value,
                NEIGHBOURS[id],
                `the extension's own number for ${id} reached the reader`,
            );
        }
    });

    it("records the version the registered algorithm declared, so a saved run says what produced it", () => {
        const record = session.runs.list().find((entry) => entry.id === runId);

        assert.isDefined(record, "the run is in the session's list of runs");
        assert.strictEqual(
            record?.engine.plugins?.[ATLAS_ALGORITHM],
            "1.4.0",
            "a run of a third party's algorithm carries something identifying that third party's code",
        );
        assert.isString(record?.engine.element, "beside the element's own version, which is unchanged");
    });

    it("painted the graph with the registered palette, landing on the anchors the palette declared", () => {
        // Two anchors and a domain of 0 to 4: the lowest score takes the first anchor and the
        // highest the last, exactly, with nothing to interpolate.
        assert.strictEqual(paintedColor("ann"), SIGNAL_ANCHORS[0].toUpperCase(), "the lowest score takes the first anchor");
        assert.strictEqual(paintedColor("ed"), SIGNAL_ANCHORS[1].toUpperCase(), "the highest score takes the last anchor");
    });

    it("reports the registered palette in the legend, under the kind it registered", () => {
        const block = session.styles.legend().find((entry) => entry.palette?.name === "atlas-signal");

        assert.isDefined(block, "a reader is told which palette the picture was painted with");
        assert.strictEqual(block?.kind, "sequential", "and what shape of legend to draw for it");
        assert.isNotEmpty(block?.swatches ?? [], "with rows a reader can read the colours off");
    });

    it("moved the camera to the state the registered view computed, over the box the element measured", () => {
        assert.isAbove(viewInputs.length, 0, "the element asked the view where the viewer should stand");

        const last = viewInputs[viewInputs.length - 1];

        assert.strictEqual(last.mode, "3d", "the view was told which way the element is drawing");
        assert.strictEqual(
            last.options.standoff,
            DEFAULT_STANDOFF,
            "and its options arrived filled in from the defaults its descriptor declared",
        );
        assert.strictEqual(last.bounds.measured, PEOPLE.length, "the box covered every node in the graph");

        // Asked of the view again with the very input the element handed it, so the expected
        // numbers are the plugin's own arithmetic rather than a second copy of it written here.
        const expected = ATLAS_OVERHEAD.compute(last);
        const landed = graph.getCameraState();

        assert.ok(landed.position, "the element reports where the camera ended up");
        assert.ok(expected.position);
        assert.closeTo(landed.position.x, expected.position.x, PLACE_TOLERANCE, "the viewer stands where the view said");
        assert.closeTo(landed.position.y, expected.position.y, PLACE_TOLERANCE);
        assert.closeTo(landed.position.z, expected.position.z, PLACE_TOLERANCE);

        assert.ok(landed.target, "and what it is looking at");
        assert.ok(expected.target);
        assert.closeTo(landed.target.x, expected.target.x, PLACE_TOLERANCE, "and looks where the view said");
        assert.closeTo(landed.target.y, expected.target.y, PLACE_TOLERANCE);
        assert.closeTo(landed.target.z, expected.target.z, PLACE_TOLERANCE);
    });

    it("delivered the element's own records to the registered log destination, built from a name", () => {
        assert.isNotNull(collector, "naming the destination in a configuration is what built it");
        assert.deepStrictEqual(
            collector?.built,
            { capacity: 500 },
            "the element filled in every declared default before the factory ran",
        );
        assert.isNotEmpty(collector?.kept ?? [], "the destination heard the element doing the work above");

        const categories = new Set((collector?.kept ?? []).map((record) => record.category.join(".")));

        assert.isAbove(categories.size, 1, "and heard from more than one part of the element");
        for (const category of categories) {
            assert.isTrue(category.startsWith("graphty"), `every record came from the element: ${category}`);
        }
    });

    // -----------------------------------------------------------------------------------------
    // The thing none of the six files alone can ask
    // -----------------------------------------------------------------------------------------

    it("keeps each of the six configured by its OWN option list, with six registrations in one page", () => {
        // One validator serves all six points. If it resolved a caller's values against the wrong
        // descriptor, every one of these would still be a registered extension and none of them
        // would be configurable -- which is the failure mode that only appears when more than one
        // point is in play at once.
        const optionNames = (list: readonly { name: string }[]): string[] => list.map((entry) => entry.name);

        assert.deepStrictEqual(optionNames(formatDescriptor(ATLAS_FORMAT)?.options ?? []), ["scoreScale"]);
        assert.deepStrictEqual(optionNames(cameraDescriptor("atlas-overhead")?.options ?? []), ["standoff"]);
        assert.deepStrictEqual(optionNames(layoutDescriptor(ATLAS_LAYOUT)?.options ?? []), ["gap"]);
        assert.deepStrictEqual(optionNames(logSinkDescriptor(ATLAS_SINK)?.options ?? []), ["capacity"]);
        assert.deepStrictEqual(
            optionNames(session.catalog.algorithms().find((entry) => entry.key === ATLAS_ALGORITHM)?.options ?? []),
            [],
            "an algorithm that takes no configuration declares an empty list rather than none",
        );
        assert.isUndefined(
            (paletteDescriptor("atlas-signal") as { options?: unknown }).options,
            "a palette is the one descriptor with no options, because every knob belongs to the binding",
        );
    });
});
