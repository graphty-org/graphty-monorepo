/**
 * @file What a run produces, and the field contract every result shape keeps.
 *
 * A result is addressed at `results.<runId>.<field>`. That path is public API: it is what a
 * style selector matches on, what a filter reads, what an expression editor completes and what
 * an export writes. Because it is public, the field NAMES cannot be an algorithm's private
 * choice -- `results.<run>.value` has to mean the same thing for every metric, forever, or a
 * consumer has to open the catalogue before it can read a number.
 *
 * So the names are fixed by the result's SHAPE rather than by the algorithm, and the table that
 * fixes them is data in this file: {@link RESULT_FIELD_CONTRACT} says what each name means and
 * what type it may carry, and {@link RESULT_SHAPE_CONTRACTS} says which names each of the ten
 * shapes must publish. {@link checkShapeContract} turns that table into an answer about one
 * algorithm's declared fields, which is what lets a test assert that every algorithm fills what
 * its shape promises instead of a reviewer checking by eye.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the whole vocabulary is plain data and
 * interfaces, published from the Node-safe `./session` entry point.
 */

import type { EdgeId, FieldDescriptor, NodeId, Path, Query, ResultShape, RunId } from "../../catalog/types";
import type { Caveats, Run } from "../runs/types";

// ---------------------------------------------------------------------------------------------
// The published path
// ---------------------------------------------------------------------------------------------

/** The root every run's result hangs from in the published expression namespace. */
export const RESULT_ROOT = "results";

/**
 * What a static field path writes where a run id will go.
 *
 * A catalogue descriptor is written before any run exists, so it publishes `results.$.value`.
 * {@link bindResultPath} swaps the placeholder for a real id once a run has one.
 */
export const RESULT_PATH_RUN_PLACEHOLDER = "$";

/**
 * The published path of one run's field.
 *
 * This is the PATH form, which is what the `path` member of a selector takes:
 *
 * ```ts
 * { match: "has", path: resultPath(run.id, "value") }
 * ```
 *
 * **Inside an expression it must be quoted first.** A run id carries its algorithm's name, a
 * great many algorithm names carry a hyphen -- "shortest-path", "min-cut" -- and the expression
 * lexer reads a bare hyphen as arithmetic, so the whole selector is refused. Wrap it once and
 * the problem cannot arise:
 *
 * ```ts
 * import { quotePath, resultPath } from "@graphty/graphty-element/session";
 *
 * const where = `${quotePath(resultPath(run.id, "value"))} >= \`3\``;
 * ```
 * @param runId - The run that produced the value.
 * @param field - The field name; omit it to address the run's whole result object.
 * @returns The path, such as "results.louvain.group".
 */
export function resultPath(runId: RunId, field?: string): Path {
    return field === undefined ? `${RESULT_ROOT}.${runId}` : `${RESULT_ROOT}.${runId}.${field}`;
}

/**
 * Replace the run-id placeholder in a catalogue descriptor's static path with a real run id.
 * @param path - The path as a descriptor declares it, such as "results.$.value".
 * @param runId - The run to bind it to.
 * @returns The bound path, unchanged when it carried no placeholder.
 */
export function bindResultPath(path: Path, runId: RunId): Path {
    return path.replace(`${RESULT_ROOT}.${RESULT_PATH_RUN_PLACEHOLDER}`, `${RESULT_ROOT}.${runId}`);
}

// ---------------------------------------------------------------------------------------------
// The field contract: one name, one meaning
// ---------------------------------------------------------------------------------------------

/** Whether a field is published once per element or once for the whole graph. */
type ResultFieldScope = "element" | "graph";

/** Which half of a result a field belongs to, as a descriptor spells it. */
type ResultFieldKind = FieldDescriptor["kind"];

/** The value types a published field is allowed to carry. */
type ResultFieldType = FieldDescriptor["type"];

/**
 * What one shape-declared field name means, wherever it appears.
 *
 * A name appears in this table exactly once, which is the rule that keeps the uniform naming
 * worth having: `rank` cannot mean position-by-score in one shape and position-by-size in
 * another, because there is only one entry to read.
 */
interface ResultFieldContract {
    /** What the value says, in one sentence a stranger can act on. */
    readonly meaning: string;
    /** Whether the field is published per element or once for the graph. */
    readonly scope: ResultFieldScope;
    /** The value types this field may carry. More than one where algorithms honestly differ. */
    readonly types: readonly ResultFieldType[];
}

/**
 * Every field name the ten shapes declare, with its one meaning.
 *
 * The per-element entries are published on nodes, on edges, or on both, depending on the shape
 * that declares them -- `in` is an edge field in `edge-set` and a node field in `node-set`, and
 * it means the same thing in both.
 */
export const RESULT_FIELD_CONTRACT = {
    // -- per element ---------------------------------------------------------------------
    value: {
        meaning: "The number this metric measured for this element.",
        scope: "element",
        types: ["number", "integer"],
    },
    rank: {
        meaning: "Where this element sits when every measured element is ordered best first, starting at 1.",
        scope: "element",
        types: ["integer"],
    },
    percentile: {
        meaning: "The share of measured elements this one ranks at or above, from 0 to 1.",
        scope: "element",
        types: ["number"],
    },
    group: {
        meaning: "Which group this node was placed in.",
        scope: "element",
        types: ["integer", "string"],
    },
    groupSize: {
        meaning: "How many nodes share this node's group.",
        scope: "element",
        types: ["integer"],
    },
    level: {
        meaning: "How many levels out from the start this node sits, counting the start as 0.",
        scope: "element",
        types: ["integer"],
    },
    levelSize: {
        meaning: "How many nodes share this node's level.",
        scope: "element",
        types: ["integer"],
    },
    category: {
        meaning: "The category this node was sorted into.",
        scope: "element",
        types: ["string"],
    },
    score: {
        meaning: "How strongly this node belongs to its category.",
        scope: "element",
        types: ["number"],
    },
    onPath: {
        meaning: "Whether this element is on the route the run found.",
        scope: "element",
        types: ["boolean"],
    },
    order: {
        meaning: "This node's position along the route, counting the source as 0.",
        scope: "element",
        types: ["integer"],
    },
    in: {
        meaning: "Whether this element is in the set the run selected.",
        scope: "element",
        types: ["boolean"],
    },

    // -- per graph -----------------------------------------------------------------------
    min: {
        meaning: "The lowest value any measured element carries.",
        scope: "graph",
        types: ["number"],
    },
    max: {
        meaning: "The highest value any measured element carries.",
        scope: "graph",
        types: ["number"],
    },
    median: {
        meaning: "The middle value once the measured elements are ordered.",
        scope: "graph",
        types: ["number"],
    },
    mean: {
        meaning: "The average value across the measured elements.",
        scope: "graph",
        types: ["number"],
    },
    measured: {
        meaning:
            "How many elements the run produced a value for. Smaller than the scope when some " +
            "elements have nothing to measure. Distinct from RunResult.measured, which counts " +
            "the nodes and edges the run looked at.",
        scope: "graph",
        types: ["integer"],
    },
    normalization: {
        meaning: "How the values were scaled before publication: \"max\", \"min-max\" or \"none\".",
        scope: "graph",
        types: ["string"],
    },
    tiedAtMin: {
        meaning:
            "How many measured elements sit at the lowest value, which is what says whether a " +
            "colour ramp is about to paint most of the graph one colour.",
        scope: "graph",
        types: ["integer"],
    },
    groupCount: {
        meaning: "How many groups the partition has.",
        scope: "graph",
        types: ["integer"],
    },
    modularity: {
        meaning: "How much better this partition is than a random one, from -0.5 to 1.",
        scope: "graph",
        types: ["number"],
    },
    sizes: {
        meaning: "The size of each group or level, largest first.",
        scope: "graph",
        types: ["table"],
    },
    levelCount: {
        meaning: "How many levels the walk reached.",
        scope: "graph",
        types: ["integer"],
    },
    categories: {
        meaning: "One row per category, with its name and how many elements fell into it.",
        scope: "graph",
        types: ["table"],
    },
    length: {
        meaning: "How many nodes are on the route.",
        scope: "graph",
        types: ["integer"],
    },
    cost: {
        meaning: "What the route costs in total, summing the weight of every edge on it.",
        scope: "graph",
        types: ["number"],
    },
    hops: {
        meaning: "How many edges are on the route.",
        scope: "graph",
        types: ["integer"],
    },
    count: {
        meaning: "How many elements are in the set.",
        scope: "graph",
        types: ["integer"],
    },
    pairs: {
        meaning: "One row per scored pair of elements, best first.",
        scope: "graph",
        types: ["table"],
    },
    steps: {
        meaning: "One row per time step, with the step's window and what was visible in it.",
        scope: "graph",
        types: ["table"],
    },
    series: {
        meaning: "One row per tracked quantity, carrying its value at every step.",
        scope: "graph",
        types: ["table"],
    },
    rates: {
        meaning: "One row per tracked quantity, carrying how fast it changed between steps.",
        scope: "graph",
        types: ["table"],
    },
    changeThreshold: {
        meaning: "The rate of change above which a step counts as a change rather than drift.",
        scope: "graph",
        types: ["number"],
    },
} as const satisfies Record<string, ResultFieldContract>;

/**
 * Every field name the shape table may name.
 *
 * Deriving the union from the table is what makes a typo in a shape contract a compile error
 * rather than a field nothing ever fills.
 */
export type ResultFieldName = keyof typeof RESULT_FIELD_CONTRACT;

/** Every declared field name, for a test or a documentation generator to walk. */
export const RESULT_FIELD_NAMES = Object.keys(RESULT_FIELD_CONTRACT) as readonly ResultFieldName[];

// ---------------------------------------------------------------------------------------------
// The shape contract: which names each shape must publish
// ---------------------------------------------------------------------------------------------

/**
 * What a shape's result offers a consumer once it lands.
 *
 * "encoding" shapes carry a value per element that a colour, a size or a width can be bound to.
 * "highlight" shapes name a subset rather than measuring everything, so they paint a selection
 * and are mutually exclusive: a second highlight result replaces the first. "none" shapes are
 * read as tables and numbers and drive no layer at all.
 */
export type ResultLayerRole = "encoding" | "highlight" | "none";

/**
 * What one result shape must publish.
 *
 * The lists are REQUIRED fields: an algorithm of this shape declares at least these, and may
 * declare more. That is what makes a path guessable without the catalogue while still letting
 * degree publish `inDegree` and shortest-path publish `diameter`.
 */
export interface ResultShapeContract {
    /** The shape this contract belongs to. */
    readonly shape: ResultShape;
    /**
     * The field `results.path(run)` and an encoding with no `field` resolve to.
     *
     * Null for `fact`, whose scalars are the algorithm's own and have no shape-fixed name.
     */
    readonly primaryField: ResultFieldName | null;
    /** Field names every node must carry. */
    readonly nodeFields: readonly ResultFieldName[];
    /** Field names every edge must carry. */
    readonly edgeFields: readonly ResultFieldName[];
    /** Field names the graph half must carry. */
    readonly graphFields: readonly ResultFieldName[];
    /** Graph field names the shape defines but not every algorithm can honestly fill. */
    readonly optionalGraphFields: readonly ResultFieldName[];
    /**
     * Whether the shape also asks for one graph-level scalar of the algorithm's own naming --
     * the headline number a set result is actually read for, such as a spanning tree's total
     * weight or a cut's cost. The shape fixes that there IS one, not what it is called.
     */
    readonly headlineScalar: boolean;
    /** What a consumer can draw from this shape. */
    readonly layer: ResultLayerRole;
}

/**
 * The ten result shapes and the fields each one publishes.
 *
 * `satisfies Record<ResultShape, ...>` is what keeps this table and the shape union from
 * drifting: a shape with no entry fails to compile, and so does an entry for a shape that does
 * not exist.
 */
export const RESULT_SHAPE_CONTRACTS = {
    "node-metric": {
        shape: "node-metric",
        primaryField: "value",
        nodeFields: ["value", "rank", "percentile"],
        edgeFields: [],
        graphFields: ["min", "max", "median", "mean", "measured", "normalization", "tiedAtMin"],
        optionalGraphFields: [],
        headlineScalar: false,
        layer: "encoding",
    },
    "edge-metric": {
        shape: "edge-metric",
        primaryField: "value",
        nodeFields: [],
        edgeFields: ["value", "rank", "percentile"],
        graphFields: ["min", "max", "median", "mean", "measured", "normalization", "tiedAtMin"],
        optionalGraphFields: [],
        headlineScalar: false,
        layer: "encoding",
    },
    community: {
        shape: "community",
        primaryField: "group",
        nodeFields: ["group", "groupSize"],
        edgeFields: [],
        graphFields: ["groupCount", "sizes"],
        // Only an algorithm that scores its own partition can publish modularity. Label
        // propagation and connected components do not, and a required field they cannot fill
        // would be a number invented to satisfy a table.
        optionalGraphFields: ["modularity"],
        headlineScalar: false,
        layer: "encoding",
    },
    "layered-grouping": {
        shape: "layered-grouping",
        primaryField: "level",
        nodeFields: ["level", "levelSize"],
        edgeFields: [],
        graphFields: ["levelCount", "sizes"],
        optionalGraphFields: [],
        headlineScalar: false,
        layer: "encoding",
    },
    "category-table": {
        shape: "category-table",
        primaryField: "category",
        nodeFields: ["category", "score", "rank"],
        edgeFields: [],
        graphFields: ["categories"],
        optionalGraphFields: [],
        headlineScalar: false,
        layer: "encoding",
    },
    path: {
        shape: "path",
        primaryField: "onPath",
        nodeFields: ["onPath", "order"],
        // The edges of the route carry membership but not a position: an edge's place in the
        // route is the order of the node it leaves.
        edgeFields: ["onPath"],
        graphFields: ["length", "cost", "hops"],
        optionalGraphFields: [],
        headlineScalar: false,
        layer: "highlight",
    },
    "node-set": {
        shape: "node-set",
        primaryField: "in",
        nodeFields: ["in"],
        edgeFields: [],
        graphFields: ["count"],
        optionalGraphFields: [],
        headlineScalar: true,
        layer: "highlight",
    },
    "edge-set": {
        shape: "edge-set",
        primaryField: "in",
        nodeFields: [],
        edgeFields: ["in"],
        graphFields: ["count"],
        optionalGraphFields: [],
        headlineScalar: true,
        layer: "highlight",
    },
    "pair-list": {
        shape: "pair-list",
        primaryField: "pairs",
        nodeFields: [],
        edgeFields: [],
        graphFields: ["pairs"],
        optionalGraphFields: [],
        headlineScalar: false,
        layer: "none",
    },
    temporal: {
        shape: "temporal",
        primaryField: "series",
        nodeFields: [],
        edgeFields: [],
        graphFields: ["steps", "series", "rates", "changeThreshold"],
        optionalGraphFields: [],
        headlineScalar: false,
        layer: "none",
    },
    fact: {
        shape: "fact",
        primaryField: null,
        nodeFields: [],
        edgeFields: [],
        graphFields: [],
        optionalGraphFields: [],
        headlineScalar: false,
        layer: "none",
    },
} as const satisfies Record<ResultShape, ResultShapeContract>;

/**
 * The contract for one shape.
 * @param shape - The shape to look up.
 * @returns What that shape must publish.
 */
export function resultShapeContract(shape: ResultShape): ResultShapeContract {
    return RESULT_SHAPE_CONTRACTS[shape];
}

/**
 * Tell whether a shape's results paint an exclusive highlight layer.
 *
 * A second path, node-set or edge-set result replaces the first rather than stacking on it,
 * and the session enforces that from the shape rather than from the algorithm's name.
 * @param shape - The shape to test.
 * @returns True when a result of this shape drives a highlight layer.
 */
export function isHighlightShape(shape: ResultShape): boolean {
    return RESULT_SHAPE_CONTRACTS[shape].layer === "highlight";
}

/** One way a field list fails the contract its shape declares. */
interface ShapeContractViolation {
    /** The field name at fault, or null when the shape asks for a field it does not name. */
    readonly field: string | null;
    /** Which half of the result the field belongs to. */
    readonly kind: ResultFieldKind;
    /** What is wrong, in a sentence a failing test can print unedited. */
    readonly reason: string;
}

/**
 * Check one algorithm's declared fields against the contract its shape publishes.
 *
 * This is the machine-checkable half of "uniform field names": a shape is only worth having if
 * something fails when an algorithm skips a field it promised, and that is this function. It
 * reads a field list -- a catalogue descriptor's `fields`, or a finished `RunResult.fields` --
 * and never the values behind it.
 * @param shape - The shape the result claims.
 * @param fields - The fields it declares.
 * @returns Every violation, in declaration order; empty when the contract is kept.
 */
export function checkShapeContract(
    shape: ResultShape,
    fields: readonly FieldDescriptor[],
): readonly ShapeContractViolation[] {
    const contract = RESULT_SHAPE_CONTRACTS[shape];
    const violations: ShapeContractViolation[] = [];
    const required: { names: readonly ResultFieldName[]; kind: ResultFieldKind }[] = [
        { names: contract.nodeFields, kind: "node" },
        { names: contract.edgeFields, kind: "edge" },
        { names: contract.graphFields, kind: "graph" },
    ];

    for (const { names, kind } of required) {
        for (const name of names) {
            const declared = fields.find((candidate) => candidate.name === name && candidate.kind === kind);

            if (declared === undefined) {
                violations.push({
                    field: name,
                    kind,
                    reason: `shape "${shape}" requires a ${kind} field named "${name}"`,
                });
                continue;
            }

            const allowed: readonly ResultFieldType[] = RESULT_FIELD_CONTRACT[name].types;

            if (!allowed.includes(declared.type)) {
                violations.push({
                    field: name,
                    kind,
                    reason: `${kind} field "${name}" is typed "${declared.type}", not ${allowed.map((type) => `"${type}"`).join(" or ")}`,
                });
            }
        }
    }

    if (contract.headlineScalar && !hasHeadlineScalar(contract, fields)) {
        violations.push({
            field: null,
            kind: "graph",
            reason: `shape "${shape}" requires one graph-level scalar of its own beside "count"`,
        });
    }

    return violations;
}

/**
 * Tell whether a field list carries the one graph scalar a set shape is read for.
 * @param contract - The shape's contract.
 * @param fields - The declared fields.
 * @returns True when at least one graph field is the algorithm's own rather than the shape's.
 */
function hasHeadlineScalar(contract: ResultShapeContract, fields: readonly FieldDescriptor[]): boolean {
    const fixed: readonly string[] = [...contract.graphFields, ...contract.optionalGraphFields];

    return fields.some((field) => field.kind === "graph" && !fixed.includes(field.name));
}

// ---------------------------------------------------------------------------------------------
// Reading a result
// ---------------------------------------------------------------------------------------------

/**
 * One numeric field of a result, read without materialising an object per element.
 *
 * A histogram, a colour ramp's domain and a summary all walk the same column, and a graph big
 * enough to be interesting cannot afford a row object per node for each of them.
 */
export interface NumericColumnView {
    /** How many entries the column has. */
    readonly length: number;
    /**
     * One entry, by position.
     * @param index - The position, from 0 to `length - 1`.
     * @returns The value, or NaN where the element carries none.
     */
    get(index: number): number;
    /** The lowest value in the column. */
    readonly min: number;
    /** The highest value in the column. */
    readonly max: number;
    /** The average across the column. */
    readonly mean: number;
    /** The middle value once the column is ordered. */
    readonly median: number;
}

/** One element's place in a ranking. */
export interface RankingEntry {
    /**
     * The element's id. An edge-shaped result ranks edge ids, which are always strings; both id
     * types are `string | number`, so one type covers both.
     */
    readonly id: NodeId;
    /** The value the element was ranked on. */
    readonly value: number;
    /** Its position, best first, starting at 1. */
    readonly rank: number;
    /** The share of measured elements it ranks at or above, from 0 to 1. */
    readonly percentile: number;
}

/**
 * The top of a ranking, cut only between tie groups.
 *
 * THE TIE POLICY: a group of elements that share a value is taken whole or not at all, and it is
 * taken only when the whole group fits inside the limit. With ranks that share a place (1, 2, 2,
 * 4), a group of size `s` at rank `r` is in exactly when `r + s - 1 <= n`. So the top never holds
 * more than `n` elements and never splits a tie by an arbitrary order -- and it can hold FEWER
 * than `n`, or none at all on a graph whose top value is shared by more than `n` elements.
 * {@link TopRanking.leftOut} and {@link TopRanking.reason} say when that happened.
 */
export interface TopRanking {
    /** The elements taken, best first: whole tie groups only, never more than the limit. */
    readonly entries: readonly RankingEntry[];
    /**
     * The tie group that stopped the top short: the first group that did not fit, with its
     * value and its size. Null when nothing was left out on account of a tie.
     */
    readonly leftOut: { readonly value: number; readonly count: number } | null;
    /** Why fewer elements were taken than the limit allowed, in a sentence; null when none were left out. */
    readonly reason: string | null;
}

/** One bar of a histogram. */
export interface HistogramBin {
    /** The lowest value the bin holds, inclusive. */
    readonly from: number;
    /** The highest value the bin holds, exclusive except in the last bin. */
    readonly to: number;
    /** How many elements fell into the bin. */
    readonly count: number;
}

/** How a column's bars were laid out, which is not always how a caller asked for them. */
export type HistogramBinning = "per-value" | "banded" | "empty";

/**
 * A field's distribution, and how it was actually drawn.
 *
 * THE LAYOUT IS REPORTED BECAUSE IT IS NOT ALWAYS THE ONE ASKED FOR. A column with no positive
 * values, or whose positive values all sit at one magnitude, has no logarithmic layout -- so a
 * request for `"log"` is laid out linearly rather than refused, because refusing to draw a
 * distribution is worse than drawing it on the other axis. A caption written from the REQUEST
 * then says "log scale" over a linear chart, which is a false claim about the data, and it is
 * a claim a consumer cannot check without recomputing the column. So {@link Histogram.scale}
 * says what was applied, and a caption reads that.
 */
export interface Histogram {
    /** The bars, in ascending order. */
    readonly bins: readonly HistogramBin[];
    /** The scale the bars are really on. */
    readonly scale: "linear" | "log";
    /**
     * The scale this column's spread argues for, whatever was asked for.
     *
     * A recommendation and nothing acts on it: which axis to draw is the reader's choice, and a
     * chart that silently changed scale would be claiming a shape nobody asked for. It is
     * "linear" whenever a logarithmic layout could not be applied anyway, so passing it straight
     * back in {@link HistogramOptions.scale} always yields the scale it named.
     */
    readonly suggestedScale: "linear" | "log";
    /**
     * Whether every distinct value got a bar of its own, bands were laid out, or nothing was
     * measured. A per-value histogram ignores the scale, because it has no bands to space.
     */
    readonly binning: HistogramBinning;
}

/** How a histogram is cut. */
export interface HistogramOptions {
    /** How many bins to produce. The element picks a sensible number when this is absent. */
    readonly bins?: number;
    /**
     * Whether the bin edges are evenly spaced or logarithmic.
     *
     * `"auto"` takes whichever the column's own spread argues for, which is what a chart drawn
     * without a reader's instruction should do. Whatever is asked for,
     * {@link Histogram.scale} reports what was applied.
     */
    readonly scale?: "linear" | "log" | "auto";
}

/** How the plain-language reading is written. */
export interface ReadingOptions {
    /** The BCP 47 locale to write in. */
    readonly locale?: string;
    /** Whether to name things the way a reader would or the way a paper would. */
    readonly audience?: "plain" | "technical";
}

/** How a metric's values were scaled before publication. */
export type Normalization = "max" | "min-max" | "none";

/** One of the highest-ranked elements, with enough to render a row without a second lookup. */
export interface SummaryEntry {
    /** The element's id. */
    readonly id: NodeId;
    /** What to call it: the element's label attribute, falling back to its id. */
    readonly label: string;
    /** The value it was ranked on. */
    readonly value: number;
    /** Its position, best first, starting at 1. */
    readonly rank: number;
    /** The share of measured elements it ranks at or above, from 0 to 1. */
    readonly percentile: number;
}

/** One group in a summary, for a result that partitions rather than measures. */
export interface SummaryGroup {
    /** The group's identity, as the result publishes it. */
    readonly group: string | number;
    /** How many elements are in it. */
    readonly size: number;
}

/**
 * A result, small enough to hand to anything.
 *
 * This is the bounded form: a result card reads it, an export embeds it, an AI tool returns it
 * and the plain-language reading is generated from it. It never grows with the graph, which is
 * the rule that keeps a summary a summary -- a tool result is never a list with one entry per
 * node.
 */
export interface ResultSummary {
    /** How many elements were in scope. */
    readonly count: number;
    /** How many of them the run produced a value for. */
    readonly measured: number;
    /** The lowest value, or null when nothing numeric was measured. */
    readonly min: number | null;
    /** The highest value, or null when nothing numeric was measured. */
    readonly max: number | null;
    /** The middle value, or null when nothing numeric was measured. */
    readonly median: number | null;
    /** The average value, or null when nothing numeric was measured. */
    readonly mean: number | null;
    /** How many measured elements sit at the lowest value. */
    readonly tiedAtMin: number;
    /** How the values were scaled. */
    readonly normalization: Normalization;
    /** The highest-ranked elements, best first. Bounded however large the graph is. */
    readonly top: readonly SummaryEntry[];
    /** The groups, largest first, for a result that partitions. */
    readonly groups?: readonly SummaryGroup[];
    /** What qualifies these numbers. */
    readonly caveats: Caveats;
    /** How long the run took, in milliseconds. */
    readonly durationMs: number;
}

/**
 * What a run produced.
 *
 * The statistics are ON this object rather than left to the consumer, because a consumer that
 * reconstructs a ranking or a histogram from per-node values is reimplementing work the element
 * already did while walking the result, and does it with less information: it cannot see which
 * elements were in scope, which were measured, or what the run's caveats were.
 */
export interface RunResult {
    /** The run that produced this. */
    readonly runId: RunId;
    /** The shape, which fixes the field names below. */
    readonly shape: ResultShape;
    /** Every field this result actually published, with its path and its plain name. */
    readonly fields: readonly FieldDescriptor[];
    /** How many nodes and edges the run looked at. */
    readonly measured: {
        /** Nodes in the run's scope. */
        readonly nodes: number;
        /** Edges in the run's scope. */
        readonly edges: number;
    };
    /** The graph-level fields, keyed by field name. */
    readonly graph: Readonly<Record<string, unknown>>;
    /**
     * One node's fields.
     * @param id - The node id.
     * @returns The fields, or undefined when the run produced nothing for that node.
     */
    node(id: NodeId): Readonly<Record<string, unknown>> | undefined;
    /**
     * One edge's fields.
     * @param id - The edge id.
     * @returns The fields, or undefined when the run produced nothing for that edge.
     */
    edge(id: EdgeId): Readonly<Record<string, unknown>> | undefined;
    /**
     * One numeric field as a column.
     * @param field - The field name.
     * @returns A view over the values, without an object per element.
     */
    column(field: string): NumericColumnView;
    /**
     * The highest-ranked elements on one field.
     * @param field - The field to rank on.
     * @param limit - How many entries to return; the whole ranking when absent.
     * @returns The entries, best first.
     */
    ranking(field: string, limit?: number): readonly RankingEntry[];
    /**
     * The top `n` elements on one field, cut only between tie groups. See {@link TopRanking}
     * for the tie policy. A `{ match: "top" }` style selector and a `{ top }` selection target
     * both read this, so the two can never disagree about which elements are the top `n`.
     * @param field - The field to rank on.
     * @param n - The most elements the top may hold.
     * @returns The elements taken, and the tie group left out when there was one.
     */
    top(field: string, n: number): TopRanking;
    /**
     * The distribution of one numeric field.
     * @param field - The field to bin.
     * @param options - How to cut the bins.
     * @returns The bins, in ascending order.
     */
    histogram(field: string, options?: HistogramOptions): Histogram;
    /**
     * The bounded form of this result.
     * @returns The summary.
     */
    summary(): ResultSummary;
    /**
     * What this result means, in one sentence of plain language.
     *
     * Generated from the result's own statistics by templates, never by a language model, and
     * never asserting something the run did not compute.
     * @param options - The locale and how technical to be.
     * @returns The sentence.
     */
    reading(options?: ReadingOptions): string;
}

// ---------------------------------------------------------------------------------------------
// Addressing results
// ---------------------------------------------------------------------------------------------

/**
 * How a caller names a run when it is asking about that run's result.
 *
 * All three spellings are accepted everywhere, because all three are what a caller has in hand:
 * the `Run` from `runs.start`, the `RunResult` it resolved to, or a bare id read back out of a
 * saved document.
 */
export type RunRef = Run | RunResult | RunId;

/** One run's entry in the published expression namespace. */
export interface ResultRoot {
    /** The run id, which is the path segment under `results`. */
    readonly runId: RunId;
    /** What to call the run in a completion list. */
    readonly label: string;
    /** Every field the run published. */
    readonly fields: readonly FieldDescriptor[];
}

/**
 * Addressing results.
 *
 * Nobody types a run id by hand: `path()` builds the string, and every encoding helper takes a
 * run rather than a path. `roots` is what an expression editor's autocomplete reads, and it is
 * why an unknown `results.*` path can be reported with the nearest candidates instead of
 * matching nothing in silence.
 */
export interface ResultsApi {
    /**
     * The published path of a run's field.
     * @param run - The run, its result, or its id.
     * @param field - The field name; the shape's primary field when absent.
     * @returns The path.
     */
    path(run: RunRef, field?: string): Path;
    /**
     * The same field, written so a selector expression can read it.
     *
     * USE THIS ONE INSIDE AN EXPRESSION, and {@link ResultsApi.path} for a selector's `path`
     * member. The difference is not cosmetic. A run id carries its algorithm's name, and ten of
     * the element's twenty-four catalogue algorithms are hyphenated -- `shortest-path`,
     * `min-cut`, `bipartite-matching` -- while the expression grammar reads a bare hyphen as
     * subtraction. So `` `${results.path(run)} >= \`3\`` `` is not a comparison at all on those
     * runs: it parses as one column minus another, and the layer is refused outright. Degree has
     * no hyphen, which is why writing it by hand appears to work right up until the metric
     * changes.
     * @param run - The run, its result, or its id.
     * @param field - The field name; the shape's primary field when absent.
     * @returns The path with every segment quoted that needs it, ready to interpolate.
     */
    term(run: RunRef, field?: string): Query;
    /**
     * One run's result.
     * @param run - The run, its result, or its id.
     * @returns The result, or undefined when the session holds no such run or it has not
     *   finished.
     */
    get(run: RunRef): RunResult | undefined;
    /**
     * Whether a run, or one of its fields, is available to read.
     * @param run - The run, its result, or its id.
     * @param field - The field name; asks only about the run itself when absent.
     * @returns True when the path would resolve.
     */
    has(run: RunRef, field?: string): boolean;
    /** Every run that has published a result, as an expression editor reads them. */
    readonly roots: readonly ResultRoot[];
}
