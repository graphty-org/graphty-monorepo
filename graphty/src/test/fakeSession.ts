/**
 * A stand-in for the element's session: the style stack, the run list, and the one policy
 * that turns a finished run into a picture.
 *
 * WHAT IT MODELS, and why each part is here rather than stubbed flat:
 *
 * - **Layers addressed by a minted id, read bottom first.** A stack that handed positions
 *   back would let a board pass while the shell still did index arithmetic, which is the
 *   whole class of defect this migration removes.
 * - **`removeBySource`, with element-owned layers never swept.** The element's own base and
 *   selection layers are seeded here and are `locked`, so a board catches a sweep that would
 *   take the layer carrying every node's shape type -- the failure that left the next load
 *   dying in mesh building with "shape with type required to create mesh".
 * - **Auto-apply on a run's FIRST completion, and a hand-written layer winning.** A run that
 *   publishes a value per element derives one colour encoding; a run that already painted
 *   does not paint twice; and a suggestion is dropped when a layer somebody wrote by hand
 *   already drives that channel.
 * - **A legend derived from the layers**, because that is where the shell reads back what a
 *   run painted.
 *
 * - **The graph's shape and what a run would cost.** Both are things the shell READS off
 *   the element rather than working out -- the statistics feed every Counts row, the
 *   graph-summary reading and the Insights rule table, and the estimate is what the size
 *   gate in front of a metric Run decides on. A board states the shape it means and the
 *   cost model below turns it into seconds the way the element does.
 * - **What the graph can support, as a listing.** `catalog.metrics()` is the same cost model
 *   again, one entry per algorithm, which is what the Insights strip reads to decide whether
 *   a card is worth offering at all. It is the same numbers as `estimate`, deliberately: a
 *   stand-in whose listing disagreed with its own estimate would let a board pass over a strip
 *   and a Run button quoting different figures.
 *
 * What it does NOT model is anything about drawing: there is no repaint, no canvas and no
 * element. A board that needs those is a browser board against the real element.
 */

import type { MetricAvailability } from "@graphty/graphty-element/catalog";
import type {
    Channel,
    CostEstimate,
    GraphSession,
    GraphStatistics,
    Layer,
    LayerSpec,
    LegendBlock,
    RunId,
    RunResult,
    SessionCommand,
} from "@graphty/graphty-element/session";

/** One run, as the fake session records it. */
interface FakeRun {
    /**
     * The run id, derived from what the run IS rather than from how many came before it.
     *
     * graphty-element derives its ids the same way, and for the same reason: a style layer
     * names the run whose column it reads, so a run that is re-executed over changed data has
     * to keep its id or every layer bound to it would dangle.
     */
    readonly id: RunId;
    /** The catalogue key. */
    readonly algorithm: string;
    /** Where it got to. Every run this fake records has finished. */
    readonly status: "succeeded";
    /**
     * What it published.
     *
     * A fixed, tiny result unless the caller supplies one. The boards that use this fake
     * assert on what the shell DRAWS from a result, never on the arithmetic behind it -- that
     * belongs to graphty-element and is tested there, against its own columns. A fake that
     * recomputed the ranking and the summary would be a second implementation for these boards
     * to agree with, which is how a suite comes to pass while the product is broken.
     *
     * Not readonly, because a re-execution replaces it in place under the same id.
     */
    result: RunResult;
    /**
     * A digest of what the run measured, as it stood when the run produced these numbers.
     *
     * This is the whole of the re-run rule: starting the same algorithm again hands back this
     * run untouched while the digest still matches, and re-executes it when the graph has moved
     * under it. Not readonly, for the same reason {@link FakeRun.result} is not.
     */
    scope: string;
}

/**
 * The result every run in this fake publishes: three nodes, three descending values.
 *
 * Enough for a card to draw a top row, a median and a distribution, and small enough that a
 * board asserting on a number can point at where it came from.
 */
function fakeRunResult(): RunResult {
    const ranking = [
        { id: "n1", value: 3, rank: 1, percentile: 1 },
        { id: "n2", value: 2, rank: 2, percentile: 2 / 3 },
        { id: "n3", value: 1, rank: 3, percentile: 1 / 3 },
    ];

    return {
        ranking: () => ranking,
        summary: () => ({
            count: 3,
            measured: 3,
            min: 1,
            max: 3,
            median: 2,
            mean: 2,
            tiedAtMin: 1,
            normalization: "none",
            top: [],
            groups: [{ group: 0, size: 3 }],
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
        histogram: () => ({
            bins: [
                { from: 1, to: 1, count: 1 },
                { from: 2, to: 2, count: 1 },
                { from: 3, to: 3, count: 1 },
            ],
            scale: "linear",
            suggestedScale: "linear",
            binning: "per-value",
        }),
        graph: {},
    } as unknown as RunResult;
}

/** The doors a board reaches past the session to assert on. */
export interface FakeSession {
    /** The session itself, as the shell sees it. */
    readonly session: GraphSession;
    /** The stack, bottom first, including the element's own locked layers. */
    readonly layers: () => readonly Layer[];
    /** Records a finished run and applies what its shape suggests. */
    readonly finishRun: (algorithm: string, style?: boolean) => RunId;
    /** Adds a layer as a template or a plugin would, bypassing the shell. */
    readonly seed: (spec: LayerSpec) => Layer;
    /**
     * Called with the algorithm key whenever the session really EXECUTES one.
     *
     * A run the session re-serves does not call it, because nothing ran: that is the whole
     * difference a board asserts when it says the element decided not to compute again.
     */
    readonly onStart: (handler: (algorithm: string) => void) => void;
    /**
     * Forgets every run, as a dataset boundary does.
     *
     * The runs described data that has gone, so they go with it: a result read back after a
     * boundary would be measurements of a file nobody is looking at any more.
     */
    readonly forgetRuns: () => void;
}

/** What a caller wants this session to publish, beyond its own tiny default. */
interface FakeSessionOptions {
    /**
     * What one algorithm's run publishes, for a caller whose fixture has real numbers.
     *
     * Absent -- or answering undefined for an algorithm it does not know -- leaves the tiny
     * three-node default, which is all a board asserting on layers and legends needs.
     * @param algorithm - the catalogue key that ran.
     * @returns what the run published, or undefined to take the default.
     */
    readonly result?: (algorithm: string) => RunResult | undefined;
    /**
     * A digest of the graph the runs measure, as it stands right now.
     *
     * graphty-element re-serves a run whose scope has not moved and re-executes it in place
     * when it has, comparing the scope's own membership digest. This is that digest, and a
     * caller that supplies none gets one constant string -- so every run is re-served, which is
     * the right answer for a stand-in whose graph never changes.
     * @returns the digest.
     */
    readonly scope?: () => string;
    /**
     * The graph's shape, as the element would publish it, read fresh on every call.
     *
     * A function rather than a value because a board can change the graph under the
     * session -- adding a node is what makes a held run stale -- and the statistics have
     * to move with it. A caller that supplies none gets a graph of no size.
     * @returns the statistics.
     */
    readonly statistics?: () => GraphStatistics;
}

/**
 * The algorithms whose result shape publishes a value per node, and so derives an encoding,
 * with the field the encoding reads in the words the element's catalogue gives it.
 *
 * The words matter because the legend prints them: a block's `field.plainName` is what the
 * canvas draws beside "Color:", and a fake that invented its own would let a board pass over a
 * legend the element would never produce.
 */
const ENCODING_FIELDS: Readonly<Record<string, { readonly plainName: string; readonly technicalName: string }>> = {
    degree: { plainName: "Connections", technicalName: "degree" },
    pagerank: { plainName: "Influence", technicalName: "PageRank score" },
    betweenness: { plainName: "Bridging", technicalName: "betweenness" },
    louvain: { plainName: "Community", technicalName: "group" },
};

/** The channel every derived encoding in this fake paints. */
const COLOUR: Channel = "node.color";

/**
 * The algorithms this fake lists when the shell asks what the graph can support.
 *
 * The element's own catalogue keys, and the five the Insights rule table maps its cards onto:
 * a key spelled differently here would let a board pass over a card the real element would
 * never offer.
 */
const METRIC_KEYS = ["degree", "pagerank", "betweenness", "louvain", "components"] as const;

/**
 * The shape of a graph that is not there: every count zero, and nothing claimed about
 * direction. It is what the element answers for a graph it has been told nothing about,
 * and it is what a board that never states a shape gets.
 */
const NO_STATISTICS: GraphStatistics = {
    nodeCount: 0,
    edgeCount: 0,
    density: 0,
    directedness: "unknown",
    directednessSource: { by: "unsettled", statedBy: null },
    weighted: false,
    selfLoopCount: 0,
    repeatedEdgeCount: 0,
    degreeRange: [0, 0],
    meanDegree: 0,
    components: {
        count: 0,
        sizes: [],
        largestSize: 0,
        isolatedCount: 0,
        truncatedSizes: false,
        componentOf: () => undefined,
    },
};

/**
 * What one algorithm would cost on a graph this size, in seconds.
 *
 * The three shapes and the three rates are the element's own: a linear pass over elements
 * for degree, a bounded number of iterations over them for PageRank, and the product of
 * nodes and edges for betweenness. They are here so that a board can reach the gate's ask
 * band by standing a big enough graph in front of it, exactly as it would against the
 * real element. They are NOT a claim about the element's arithmetic -- that is the
 * element's and is tested there, and any board that asserts a number of seconds rather
 * than what the reader is shown is asserting this stand-in.
 * @param algorithm - the catalogue key that would run.
 * @param statistics - the graph it would run over.
 * @returns the estimate in seconds.
 */
function fakeSeconds(algorithm: string, statistics: GraphStatistics): number {
    const elements = statistics.nodeCount + statistics.edgeCount;

    switch (algorithm) {
        case "betweenness":
            return (statistics.nodeCount * statistics.edgeCount) / 5_000_000;
        case "pagerank":
            return (100 * elements) / 3_000_000;
        default:
            return elements / 20_000_000;
    }
}

/**
 * A session holding a style stack, a run list and the auto-apply policy between them.
 * @param options - what this caller's fixture publishes, and how its graph is digested.
 * @returns the session and the doors a board asserts through.
 */
export function createFakeSession(options: FakeSessionOptions = {}): FakeSession {
    const watchers = new Set<() => void>();
    const runs: FakeRun[] = [];
    let minted = 0;

    /** What the graph a run would measure looks like now. @returns the digest. */
    const scopeNow = (): string => options.scope?.() ?? "one-graph";

    /**
     * What a run of this algorithm publishes.
     * @param algorithm - the catalogue key.
     * @returns the caller's result, or the tiny default.
     */
    const resultFor = (algorithm: string): RunResult => options.result?.(algorithm) ?? fakeRunResult();

    const layers: Layer[] = [
        {
            id: "element-base",
            name: "default",
            kind: "base",
            source: { by: "element", reason: "default" },
            locked: true,
            enabled: true,
            target: "node",
            selector: { match: "everything" },
            set: { [COLOUR]: "#6366F1" },
        },
        {
            id: "element-selection",
            name: "selection",
            kind: "base",
            source: { by: "element", reason: "selection" },
            locked: true,
            enabled: true,
            target: "node",
            selector: { match: "everything" },
            set: { [COLOUR]: "#FFD700" },
        },
    ];

    const publish = (): void => {
        for (const watcher of watchers) {
            watcher();
        }
    };

    const build = (spec: LayerSpec): Layer => {
        minted += 1;

        return {
            id: `layer-${String(minted)}`,
            name: spec.name,
            kind: spec.kind ?? "custom",
            source: spec.source ?? { by: "user" },
            locked: spec.source?.by === "element",
            enabled: spec.enabled ?? true,
            target: spec.target ?? "node",
            selector: spec.selector,
            ...(spec.set === undefined ? {} : { set: spec.set }),
            ...(spec.encode === undefined ? {} : { encode: spec.encode }),
        };
    };

    const seed = (spec: LayerSpec): Layer => {
        const layer = build(spec);

        layers.push(layer);
        publish();

        return layer;
    };

    const indexOf = (id: string): number => layers.findIndex((layer) => layer.id === id);

    /** Whether a layer somebody wrote by hand already drives the colour channel. */
    const handHolds = (): boolean =>
        layers.some(
            (layer) =>
                layer.source.by === "user" && (layer.set?.[COLOUR] !== undefined || layer.encode?.[COLOUR] !== undefined),
        );

    const styles = {
        list: (): readonly Layer[] => [...layers],
        get: (id: string): Layer | undefined => layers.find((layer) => layer.id === id),
        add: (spec: LayerSpec): Promise<Layer> => Promise.resolve(seed(spec)),
        update: (id: string, patch: Partial<LayerSpec>): Promise<Layer> => {
            const at = indexOf(id);

            if (at === -1) {
                return Promise.reject(new Error(`no layer ${id}`));
            }

            if (layers[at].locked) {
                return Promise.reject(new Error("E_PROTECTED"));
            }

            const merged = { ...layers[at], ...patch };

            if ("set" in patch && patch.set === undefined) {
                delete (merged as { set?: unknown }).set;
            }

            layers[at] = merged as Layer;
            publish();

            return Promise.resolve(layers[at]);
        },
        remove: (id: string): Promise<void> => {
            const at = indexOf(id);

            if (at === -1 || layers[at].locked) {
                return Promise.reject(new Error("E_PROTECTED"));
            }

            layers.splice(at, 1);
            publish();

            return Promise.resolve();
        },
        move: (id: string, before: string | null): Promise<void> => {
            const at = indexOf(id);

            if (at === -1) {
                return Promise.reject(new Error(`no layer ${id}`));
            }

            const [moved] = layers.splice(at, 1);
            const target = before === null ? layers.length : indexOf(before);

            layers.splice(target === -1 ? layers.length : target, 0, moved);
            publish();

            return Promise.resolve();
        },
        removeBySource: (predicate: (source: Layer["source"]) => boolean): Promise<readonly string[]> => {
            const removed: string[] = [];

            for (let at = layers.length - 1; at >= 0; at--) {
                if (!layers[at].locked && predicate(layers[at].source)) {
                    removed.unshift(layers[at].id);
                    layers.splice(at, 1);
                }
            }

            if (removed.length > 0) {
                publish();
            }

            return Promise.resolve(removed);
        },
        /* `encode` REPLACES rather than stacks: a layer already painting this channel from
           this run is taken over in place, so a run encoded twice leaves one layer and one
           legend block rather than two. */
        encode: (spec: { readonly run: string; readonly channel?: Channel }): Promise<Layer> => {
            const runId = spec.run;
            const channel = spec.channel ?? COLOUR;
            const at = layers.findIndex(
                (layer) =>
                    layer.source.by === "run" && layer.source.runId === runId && layer.encode?.[channel] !== undefined,
            );
            const algorithm = runs.find((run) => run.id === runId)?.algorithm ?? runId;
            const built = build({
                name: algorithm,
                target: "node",
                kind: "encoding",
                source: { by: "run", runId, algorithm, params: {} },
                selector: { match: "has", path: `results.${runId}.value` },
                encode: { [channel]: { by: `results.${runId}.value`, scale: "linear", palette: "viridis" } },
            });

            if (at === -1) {
                layers.push(built);
            } else {
                layers[at] = { ...built, id: layers[at].id };
            }

            publish();

            return Promise.resolve(layers[at === -1 ? layers.length - 1 : at]);
        },
        resolveToStatic: (id: string): Promise<Layer | undefined> => Promise.resolve(styles.get(id)),
        legend: (): readonly LegendBlock[] =>
            layers
                .filter((layer) => layer.encode?.[COLOUR] !== undefined)
                .map((layer): LegendBlock => {
                    const runId = layer.source.by === "run" ? layer.source.runId : undefined;
                    const algorithm = layer.source.by === "run" ? layer.source.algorithm : undefined;
                    const words = ENCODING_FIELDS[algorithm ?? ""] ?? {
                        plainName: layer.name,
                        technicalName: layer.name,
                    };

                    return {
                        channel: COLOUR,
                        layerId: layer.id,
                        ...(runId === undefined ? {} : { runId }),
                        kind: algorithm === "louvain" ? "categorical" : "sequential",
                        field: { ...words, path: `results.${runId ?? ""}.value` },
                        scale: { kind: "linear", label: "linear" },
                        swatches: [
                            { label: "low", value: 0, color: "#440154" },
                            { label: "high", value: 1, color: "#FDE725" },
                        ],
                        departures: [],
                    };
                }),
    };

    let started: (algorithm: string) => void = () => undefined;

    /** The graph's shape as it stands now. @returns the statistics. */
    const statisticsNow = (): GraphStatistics => options.statistics?.() ?? NO_STATISTICS;

    /**
     * What the element says this graph can support, one entry per algorithm this fake knows
     * how to run.
     *
     * The shell reads it to decide which Insights cards to offer and to hold each one to the
     * 60 s ceiling, so a board that stands a big graph in front of the strip reaches the same
     * gate it would against the real element. Availability is unconditional here: a refusal is
     * a sentence the element writes out of a requirement the graph does not meet, and this
     * stand-in has no requirements table to write one from. A board that needs a refused metric
     * states its own session.
     * @returns one entry per algorithm.
     */
    const metricsNow = (): readonly MetricAvailability[] => {
        const statistics = statisticsNow();

        return METRIC_KEYS.map((key): MetricAvailability => {
            const runIds = runs.filter((run) => run.algorithm === key).map((run) => run.id);

            return {
                key,
                plainName: key,
                technicalName: key,
                available: true,
                costClass: "heavy",
                estimateSeconds: fakeSeconds(key, statistics),
                hasRun: runIds.length > 0,
                runIds,
            };
        });
    };

    const session = {
        styles,
        /* What a host reads before the element has spoken; a board that wants another state
           dispatches the event. */
        capabilities: { acceleration: { state: "probing" } },
        data: {
            statistics: statisticsNow,
        },
        catalog: {
            metrics: metricsNow,
        },
        /* Nothing this fake holds ever places a node: there is no loader, no layout and no
           drag, so every row is unplaced and the arrangement that keeps the data's own
           coordinates never wins. A board that wants the placed case states its own session. */
        positions: { placedCount: 0 },
        /* Synchronous, and available, exactly as the element's is: a button has to decide
           how it behaves before the click happens. A board that wants the refused form
           states it through its own session rather than here, because a refusal is a
           sentence the element wrote and this stand-in has none to write. */
        estimate: (command: SessionCommand): CostEstimate => {
            const statistics = statisticsNow();
            const seconds = fakeSeconds(command.algorithm, statistics);

            return {
                seconds,
                confidence: "modelled",
                costClass: "heavy",
                blocksFrame: true,
                cancellable: false,
                available: true,
                basis: `n=${String(statistics.nodeCount)} m=${String(statistics.edgeCount)}`,
            };
        },
        runs: {
            list: (): readonly FakeRun[] => [...runs],
            /* `start` is what the shell calls now, so the fake has to be the thing that runs
               the algorithm AND records the run. It resolves on a microtask, as a queued run
               does, and its `style` option decides whether the element paints it.

               STARTING THE SAME ALGORITHM TWICE DOES NOT MAKE TWO RUNS. graphty-element hands
               back the run it already holds when nothing that run measured has moved, and
               re-executes it in place -- under the same id, so every layer bound to it survives
               -- when the graph has. The shell relies on exactly that: it no longer keeps its
               own flag saying whether the degree pass it holds still covers the graph, because
               the element can compare what the run measured against the graph as it stands and
               the shell cannot. */
            start: (algorithm: string, _params?: unknown, startOptions?: { readonly style?: boolean }) => {
                const held = runs.find((candidate) => candidate.algorithm === algorithm);

                /* Resolves with the RESULT, as a real run does: `await session.runs.start(...)`
                   hands back what the run published, and the shell reads its ranking and its
                   summary off that. Resolving with the run object instead is what let a board
                   pass while every metric card drew nothing. */
                if (held !== undefined && held.scope === scopeNow()) {
                    return Object.assign(Promise.resolve(held.result), { id: held.id });
                }

                started(algorithm);

                if (held !== undefined) {
                    /* Re-executed IN PLACE. Nothing is painted here: a run derives its encoding
                       on its FIRST completion, and a second set of numbers under the same id is
                       painted by the layer that is already reading it. */
                    held.result = resultFor(algorithm);
                    held.scope = scopeNow();

                    return Object.assign(Promise.resolve(held.result), { id: held.id });
                }

                const id = finishRun(algorithm, startOptions?.style ?? true);
                const run = runs.find((candidate) => candidate.id === id);

                return Object.assign(Promise.resolve(run?.result), { id });
            },
        },
        on: (_event: string, handler: () => void): (() => void) => {
            watchers.add(handler);

            return () => {
                watchers.delete(handler);
            };
        },
    } as unknown as GraphSession;

    function finishRun(algorithm: string, style = true): RunId {
        const id = `run-${algorithm}`;

        runs.push({ id, algorithm, status: "succeeded", result: resultFor(algorithm), scope: scopeNow() });

        if (style && ENCODING_FIELDS[algorithm] !== undefined && !handHolds()) {
            seed({
                name: algorithm,
                target: "node",
                kind: "encoding",
                source: { by: "run", runId: id, algorithm, params: {} },
                selector: { match: "has", path: `results.${id}.value` },
                encode: { [COLOUR]: { by: `results.${id}.value`, scale: "linear", palette: "viridis" } },
            });
        }

        return id;
    }

    return {
        session,
        layers: () => [...layers],
        finishRun,
        seed,
        onStart: (handler) => {
            started = handler;
        },
        forgetRuns: () => {
            runs.length = 0;
        },
    };
}
