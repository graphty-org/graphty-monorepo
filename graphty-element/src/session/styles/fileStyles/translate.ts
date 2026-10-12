/**
 * @file A file's styles as graphty-element layers: the rules graph-io read or recovered from the
 * file, turned into layers in rule order, with the per-element values those layers read.
 *
 * The translation is exact by construction wherever the element can draw what the file says.
 * Every binding it emits is checked, element by element, against graph-io's own reading of the
 * rule (`resolveStyles`); a binding that would paint anything else is replaced by the rule's
 * values kept per element, so a difference between the two vocabularies never reaches the
 * picture. What the element cannot draw is noted with a code, never drawn as something else.
 *
 * - One layer per rule, in rule order: every layer made from rule i sits below every layer made
 *   from rule i+1, whichever pass made it.
 * - Selectors are short (at most 8 terms). A wider group, or one the element's expression
 *   language would read differently, is written onto the elements as a membership value and
 *   selected with `has`.
 * - Values the layers read live in the load's file-style namespace,
 *   `graphty.style.<namespace>.<kind>.<key>`, never in the data records.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import {
    type ColumnRef,
    type ExtractedStyles,
    type Mapping,
    planStyles,
    type Predicate,
    resolveStyles,
    type StyleNote,
    type StyleProperty,
    type StyleRule,
    type StyleTarget,
    type StyleValue,
} from "@graphty/graph-io/styles";

import type { LabelLocation } from "../../../catalog/label-style";
import type { Binding, BindingStop, Channel, LayerKind, LayerSpec, Path, Selector } from "../../../catalog/types";
import type { CodedFactParam } from "../../shared";
import { channelDescriptor, labelFieldOf, labelPatchOf, mergeLabelStyle, toColorValue } from "../channels";
import { quotePath } from "../predicate";
import { FILE_STYLE_TRANSLATION_ISSUE, type FileStyleNoteCode } from "./codes";
import { type FoldableLayer, foldToCap } from "./fold";
import { type FileStyleMeaning, type FileStyleOrigin, fileStyleUserData } from "./origin";
import { computedPath, fileStylePath, isFileStylePath, parseFileStylePath } from "./path";
import { ARROW_SHAPES, FILE_STYLE_SHAPES, type FileStyleShapeTable, LINE_STYLES, LINE_STYLES_NEAREST } from "./shapes";
import type { FileStyleScalar } from "./store";

/** The most terms a selector made from a file holds; a wider group is written onto the elements. */
const MAX_TERMS = 8;
/** A mapping table with more keys present than this is kept as values per element. */
const MAX_TABLE_KEYS = 256;
/** The label budget when the load does not set one, and the most it may be. */
const LABEL_LAYERS = { default: 8, max: 16 } as const;
/** The key `ext` carries graphty-element's own layer under, in a file graphty wrote. */
export const LAYER_SPEC_EXT = "@graphty/graphty-element";

/** How a file's styles are turned into layers: choices another consumer may make differently. */
export interface FileStyleOptions {
    /**
     * How lengths are scaled: `"median"` (the default) makes the file's median node size the
     * element's default node size and its median edge width the default edge width; `"file"`
     * keeps the file's numbers as they are.
     */
    readonly lengths?: "median" | "file";
    /**
     * The element shape each 2D node shape of the file is drawn as; `FILE_STYLE_SHAPES` by default.
     * A shape the table leaves out is not drawn from the file, and the load notes it.
     */
    readonly shapes?: FileStyleShapeTable;
    /**
     * How many layers label positions may take when the file sets them per element, at most 16;
     * 8 by default. Further positions are drawn as the most common kept one, and noted.
     */
    readonly labelLayers?: number;
    /**
     * Whether a property the file leaves to the program that wrote it gets that program's default
     * (Cytoscape's for CX and sessions, Graphviz's for DOT, Gephi's for GEXF ...), so the graph
     * looks as it does there. True by default.
     */
    readonly toolDefaults?: boolean;
}

/** One note of a translation: a code and the facts it is about. */
export interface FileStyleNote {
    /** What happened. */
    readonly code: FileStyleNoteCode;
    /**
     * The facts: `property` (the file's property or construct, or null), `target` (`node`,
     * `edge`, `graph`, or null), `count` (how many times) and `samples` (up to 8 examples).
     */
    readonly params: Readonly<Record<string, CodedFactParam>>;
}

/** What the translation needs. */
export interface TranslateInput {
    /** The file's styles, as graph-io read them. */
    readonly extracted: ExtractedStyles;
    /** The graph the import built, which the styles' element indexes refer to. */
    readonly snapshot: GraphSnapshot;
    /** The load's file-style namespace. */
    readonly namespace: string;
    /** The graph-io format id or JSON dialect the file was read as. */
    readonly format: string;
    /** The load, as its layers' facts name it. */
    readonly importId: string;
    /** The load's choices. */
    readonly options: FileStyleOptions;
    /** What the element's own base layers paint, per kind, for a file graphty wrote. */
    readonly base: Readonly<Record<StyleTarget, Readonly<Partial<Record<Channel, unknown>>>>>;
    /** The path a layer reads one of the file's data columns at, or null when it cannot. */
    readonly dataPath: (kind: StyleTarget, column: string) => Path | null;
}

/** One layer the translation made. */
export interface TranslatedLayer {
    /** The layer. */
    readonly spec: LayerSpec;
    /**
     * The neutral layers to use instead when the element refuses this one: set for a layer
     * rebuilt from a layer graphty wrote into the file.
     */
    readonly fallback?: readonly LayerSpec[];
}

/** What a translation made. */
export interface Translation {
    /** The layers, bottom first, in the order of the rules they stand for. */
    readonly layers: readonly TranslatedLayer[];
    /** The values the layers read, per kind and key, by the import's element index. */
    readonly columns: Readonly<Record<StyleTarget, ReadonlyMap<string, readonly (FileStyleScalar | null)[]>>>;
    /** Per kind, the key of the column marking the elements the file hides, and how many; null when it hides none. */
    readonly hidden: Readonly<Record<StyleTarget, { readonly key: string; readonly count: number } | null>>;
    /** The graph's background color, or null. */
    readonly background: string | null;
    /** What the file's reading and its translation met. */
    readonly notes: readonly FileStyleNote[];
    /**
     * What the layers paint, per kind and channel, by the import's element index (null where they
     * paint nothing), as the translation computed it from graph-io's own reading of the file: what
     * `styles.explain()` gives each element once the layers apply. A label's fields are merged into
     * `<kind>.labelStyle`, field by field. Null for a kind with a layer rebuilt from one graphty
     * wrote, whose painting the translation does not compute.
     */
    readonly predicted: Readonly<Record<StyleTarget, ReadonlyMap<Channel, readonly unknown[]> | null>>;
}

/** How a neutral value becomes a channel value; null where the channel has no counterpart. */
type Convert = (value: StyleValue) => unknown;

/** One channel a neutral property is drawn on. */
interface ChannelPlan {
    readonly channel: Channel;
    readonly convert: Convert;
    /** True when the channel takes the neutral value unchanged. */
    readonly identity: boolean;
    /** Whether a value is drawn as the nearest one rather than exactly. */
    readonly nearest?: (value: StyleValue) => boolean;
}

/** A layer being built, with what it paints. */
interface Building extends FoldableLayer {
    readonly bucket: number;
    readonly spec: LayerSpec & { set: Record<string, unknown>; encode: Record<string, Binding> };
    readonly paint: Map<Channel, unknown[]> | null;
    /** What it paints per channel, kept even where `paint` is null to stop the fold; absent for a rebuilt layer. */
    drawn?: Map<Channel, unknown[]>;
    worth: number;
    fallback?: readonly LayerSpec[];
}

/** Notes, one per code, kind and property. */
class Notes {
    readonly #held = new Map<
        string,
        { code: FileStyleNoteCode; property: string | null; target: string | null; count: number; samples: string[] }
    >();

    /**
     * Note something.
     * @param code - What happened.
     * @param target - The kind, or null.
     * @param property - The property, or null.
     * @param count - How many times.
     * @param sample - An example.
     */
    add(code: FileStyleNoteCode, target: string | null, property: string | null, count = 1, sample?: string): void {
        const key = `${code}\u0000${target ?? ""}\u0000${property ?? ""}`;
        let held = this.#held.get(key);
        if (held === undefined) {
            held = { code, property, target, count: 0, samples: [] };
            this.#held.set(key, held);
        }

        held.count += count;
        if (sample !== undefined && held.samples.length < 8 && !held.samples.includes(sample.slice(0, 80))) {
            held.samples.push(sample.slice(0, 80));
        }
    }

    /**
     * A note graph-io made while reading the file, as it stands.
     * @param note - The note.
     */
    keep(note: StyleNote): void {
        this.add(note.code, note.params.target, note.params.property, note.params.count, undefined);
        const held = [...this.#held.values()].at(-1);
        for (const sample of note.params.samples) {
            if (held !== undefined && held.samples.length < 8) {
                held.samples.push(sample);
            }
        }
    }

    /**
     * The notes, one per code, kind and property.
     * @returns The notes.
     */
    list(): FileStyleNote[] {
        return [...this.#held.values()].map((held) =>
            Object.freeze({
                code: held.code,
                params: Object.freeze({
                    property: held.property,
                    target: held.target,
                    count: held.count,
                    samples: Object.freeze([...held.samples]),
                }),
            }),
        );
    }
}

/**
 * A plain value of a snapshot cell: 64-bit integers as numbers, list cells as arrays, unset as null.
 * @param value - The cell.
 * @returns The value.
 */
function plain(value: unknown): unknown {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value === "bigint") {
        return Number(value);
    }

    if (ArrayBuffer.isView(value)) {
        return Array.from(value as unknown as ArrayLike<number>);
    }

    return value;
}

/**
 * What the element draws for a value on a channel, as the translation compares it: a color as
 * `#rrggbb`, and anything the channel would not take as null.
 * @param channel - The channel.
 * @param value - The value the layer reads.
 * @returns The drawn value, or null.
 */
function drawnAs(channel: Channel, value: unknown): unknown {
    const descriptor = channelDescriptor(channel);
    if (descriptor === undefined || value === null || value === undefined) {
        return null;
    }

    switch (descriptor.accepts) {
        case "color":
            return typeof value === "string" ? (toColorValue(value)?.hex.slice(0, 7).toLowerCase() ?? null) : null;
        case "number":
            return typeof value === "number" && Number.isFinite(value) ? value : null;
        case "text":
            return typeof value === "string" ? value : null;
        case "boolean":
            return typeof value === "boolean" ? value : null;
        case "enum":
            return typeof value === "string" && (descriptor.values ?? []).includes(value) ? value : null;
        default:
            return null;
    }
}

/**
 * Whether two drawn values are the same: numbers within a relative 1e-9.
 * @param a - One value.
 * @param b - The other.
 * @returns True when equal.
 */
function same(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }

    return (
        typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b))
    );
}

/**
 * The text an element's binding map is keyed by for a value: how the element spells a category.
 * @param value - The value.
 * @returns The key, or null for a value that is no category.
 */
function categoryOf(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
        return String(value);
    }

    return null;
}

/**
 * A literal of the element's expression language.
 * @param value - A string, number or boolean.
 * @returns The literal.
 */
function literal(value: unknown): string {
    if (typeof value === "string") {
        return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
    }

    return `\`${JSON.stringify(value)}\``;
}

/**
 * The terms of a predicate: how many comparisons its selector would hold.
 * @param where - The predicate.
 * @returns The count, or Infinity for a predicate of a kind this version does not know.
 */
function termsOf(where: Predicate): number {
    if ("all" in where) {
        return 0;
    }

    if ("has" in where || "eq" in where) {
        return 1;
    }

    if ("in" in where) {
        return Array.isArray(where.in[1]) ? where.in[1].length : Infinity;
    }

    if ("not" in where) {
        return termsOf(where.not);
    }

    const list = listOf(where);
    if (!Array.isArray(list)) {
        return Infinity;
    }

    return list.reduce((sum: number, inner: Predicate) => sum + termsOf(inner), 0);
}

/**
 * How many comparisons an expression selector holds, outside its literals.
 * @param where - The expression.
 * @returns The count.
 */
export function expressionTerms(where: string): number {
    let terms = 0;
    for (let at = 0; at < where.length; at++) {
        const character = where[at];
        if (character === "'" || character === "`" || character === '"') {
            // Skip the literal or the quoted name, honouring its backslash escapes.
            at++;
            while (at < where.length && where[at] !== character) {
                at += where[at] === "\\" ? 2 : 1;
            }

            continue;
        }

        const two = where.slice(at, at + 2);
        if (two === "==" || two === "!=" || two === "<=" || two === ">=") {
            terms++;
            at++;
        } else if (character === "<" || character === ">") {
            terms++;
        }
    }

    return terms;
}

/**
 * The neutral property each channel of a kind is drawn from, and how.
 * @param kind - Nodes or edges.
 * @param factor - What a length of the file is multiplied by.
 * @param shapes - The 2D-to-3D shape table.
 * @returns The plans per property.
 */
function channelPlans(
    kind: StyleTarget,
    factor: number,
    shapes: FileStyleShapeTable,
): ReadonlyMap<string, readonly ChannelPlan[]> {
    const id = (channel: Channel): ChannelPlan => ({ channel, convert: (value) => value, identity: true });
    const table = (
        channel: Channel,
        entries: ReadonlyMap<string, string>,
        nearest?: ReadonlySet<string>,
    ): ChannelPlan => ({
        channel,
        convert: (value) => (typeof value === "string" ? (entries.get(value) ?? null) : null),
        identity: false,
        ...(nearest === undefined
            ? {}
            : { nearest: (value: StyleValue) => typeof value === "string" && nearest.has(value) }),
    });
    const label = (field: string): ChannelPlan => id(`${kind}.${field}` as Channel);
    if (kind === "node") {
        const shapeTable = new Map(Object.entries(shapes));
        return new Map<string, readonly ChannelPlan[]>([
            ["fill", [id("node.color")]],
            ["borderColor", [id("node.outline")]],
            ["label", [id("node.label")]],
            ["tooltip", [id("node.tooltip")]],
            ["shape", [table("node.shape", shapeTable, new Set(shapeTable.keys()))]],
            ["labelColor", [label("labelColor")]],
            ["labelSize", [label("labelSize")]],
            ["labelFont", [label("labelFont")]],
            ["labelWeight", [label("labelWeight")]],
            ["labelItalic", [label("labelItalic")]],
        ]);
    }

    return new Map<string, readonly ChannelPlan[]>([
        ["color", [id("edge.color")]],
        ["opacity", [id("edge.opacity")]],
        [
            "width",
            [
                {
                    channel: "edge.width",
                    convert: (value) => (typeof value === "number" ? round(value * factor) : null),
                    identity: factor === 1,
                },
            ],
        ],
        ["lineStyle", [table("edge.style", LINE_STYLES, LINE_STYLES_NEAREST)]],
        ["targetArrow", [table("edge.arrowHead", ARROW_SHAPES)]],
        ["sourceArrow", [table("edge.arrowTail", ARROW_SHAPES)]],
        ["targetArrowColor", [id("edge.arrowHeadColor")]],
        ["sourceArrowColor", [id("edge.arrowTailColor")]],
        ["arrowSize", [id("edge.arrowHeadSize"), id("edge.arrowTailSize")]],
        ["curved", [id("edge.curvature")]],
        ["label", [id("edge.label")]],
        ["targetLabel", [id("edge.arrowHeadText")]],
        ["sourceLabel", [id("edge.arrowTailText")]],
        ["labelColor", [label("labelColor")]],
        ["labelSize", [label("labelSize")]],
        ["labelFont", [label("labelFont")]],
        ["labelWeight", [label("labelWeight")]],
        ["labelItalic", [label("labelItalic")]],
    ]);
}

/** The properties the element draws nothing for, per kind. */
const NOT_DRAWN: Readonly<Record<StyleTarget, ReadonlySet<string>>> = {
    node: new Set(["borderWidth", "borderStyle", "image"]),
    edge: new Set(["tooltip"]),
};

/** The properties the translation draws in passes of their own, per kind. */
const COMPOSITE: Readonly<Record<StyleTarget, ReadonlySet<string>>> = {
    node: new Set(["width", "height", "fillOpacity", "opacity", "labelPosition", "visible"]),
    edge: new Set(["visible"]),
};

/**
 * A number at 12 significant digits, so a length scaled by a factor compares as the same value
 * however it was computed.
 * @param value - The number.
 * @returns It, rounded.
 */
function round(value: number): number {
    return Number(value.toPrecision(12));
}

/**
 * The median of positive numbers.
 * @param values - The numbers, nulls among them.
 * @returns The median, or null when there is none.
 */
function median(values: readonly unknown[]): number | null {
    const kept = values
        .filter((value): value is number => typeof value === "number" && value > 0)
        .sort((a, b) => a - b);
    if (kept.length === 0) {
        return null;
    }

    const middle = Math.floor(kept.length / 2);
    return kept.length % 2 === 1 ? kept[middle] : (kept[middle - 1] + kept[middle]) / 2;
}

/**
 * Turn a file's styles into layers.
 * @param input - The styles, the graph and the load's choices.
 * @returns The layers, the values they read and what the translation met.
 */
export function translateFileStyles(input: TranslateInput): Translation {
    const { extracted } = input;
    const notes = new Notes();
    for (const note of extracted.styles.notes) {
        notes.keep(note);
    }

    const columns: Record<StyleTarget, Map<string, (FileStyleScalar | null)[]>> = { node: new Map(), edge: new Map() };
    const hidden: Record<StyleTarget, { key: string; count: number } | null> = { node: null, edge: null };
    const byKind: Record<StyleTarget, TranslatedLayer[]> = { node: [], edge: [] };
    const predicted: Record<StyleTarget, ReadonlyMap<Channel, readonly unknown[]> | null> = { node: null, edge: null };
    const factors = lengthFactors(input);
    for (const kind of ["node", "edge"] as const) {
        const translation = new KindTranslation(input, kind, factors[kind], notes, columns[kind]);
        byKind[kind].push(...translation.run());
        hidden[kind] = translation.hidden;
        predicted[kind] = translation.predicted;
    }

    const layers = inRuleOrder(byKind, extracted.styles.rules);

    const { background } = extracted.styles.graph;
    return {
        layers,
        columns,
        hidden,
        background: typeof background === "string" ? background : null,
        notes: notes.list(),
        predicted,
    };
}

/**
 * The layers of both kinds in the order of the rules they stand for, across both kinds: an edge rule
 * below a node rule stays below it. Each kind keeps its own order.
 * @param byKind - The layers of each kind, in their order.
 * @param rules - The file's rules, bottom first.
 * @returns The layers, bottom first.
 */
function inRuleOrder(
    byKind: Record<StyleTarget, readonly TranslatedLayer[]>,
    rules: readonly StyleRule[],
): TranslatedLayer[] {
    const at = new Map(rules.map((rule, index) => [`${rule.target}\u0000${rule.id}`, index]));
    // A layer made from no one rule sits where the layer before it does.
    const ranks = (kind: StyleTarget): number[] => {
        let last = -1;
        return byKind[kind].map((layer) => {
            const key = layer.spec.userData?.ruleKey;
            last = (typeof key === "string" ? at.get(`${kind}\u0000${key}`) : undefined) ?? last;
            return last;
        });
    };
    const node = ranks("node");
    const edge = ranks("edge");
    const out: TranslatedLayer[] = [];
    let i = 0;
    let j = 0;
    while (i < node.length || j < edge.length) {
        if (j >= edge.length || (i < node.length && node[i] <= edge[j])) {
            out.push(byKind.node[i++]);
        } else {
            out.push(byKind.edge[j++]);
        }
    }

    return out;
}

/**
 * What a length of the file is multiplied by, per kind.
 * @param input - The translation's input.
 * @returns The factors: 1 when lengths are kept as the file has them.
 */
function lengthFactors(input: TranslateInput): Record<StyleTarget, number> {
    // A file graphty wrote is in graphty's own units already.
    if (input.options.lengths === "file" || input.extracted.styles.source.tool === "graphty") {
        return { node: 1, edge: 1 };
    }

    const { extracted, snapshot, base } = input;
    const resolved = (kind: StyleTarget, property: StyleProperty): readonly unknown[] =>
        extracted.styles.rules.some(
            (rule) =>
                rule.target === kind && (rule.set?.[property] !== undefined || rule.map?.[property] !== undefined),
        )
            ? resolveStyles(extracted, kind, property, snapshot)
            : [];
    const nodeMedian = median([...resolved("node", "width"), ...resolved("node", "height")]);
    const edgeMedian = median(resolved("edge", "width"));
    const nodeBase = typeof base.node["node.size"] === "number" ? base.node["node.size"] : 1;
    const edgeBase = typeof base.edge["edge.width"] === "number" ? base.edge["edge.width"] : 1;
    const factor = (target: number, middle: number | null): number => {
        const value = middle === null ? 1 : target / middle;
        // A degenerate median (1e-320, 1e308) keeps the file's units.
        return Number.isFinite(value) && value > 0 ? value : 1;
    };

    return { node: factor(nodeBase, nodeMedian), edge: factor(edgeBase, edgeMedian) };
}

/** The translation of one kind's rules. */
class KindTranslation {
    readonly #input: TranslateInput;
    readonly #kind: StyleTarget;
    readonly #notes: Notes;
    /** Per code and property, the elements a conversion note already counted, so an element counts once. */
    readonly #counted = new Map<string, Set<number>>();
    readonly #columns: Map<string, (FileStyleScalar | null)[]>;
    readonly #factor: number;
    readonly #n: number;
    readonly #rules: readonly StyleRule[];
    readonly #plans: ReadonlyMap<string, readonly ChannelPlan[]>;
    readonly #built: Building[] = [];
    readonly #keys: Set<string>;
    readonly #matchCache = new Map<string, readonly boolean[]>();
    /** The layers rebuilt from layers graphty wrote, by the rule they stand for. */
    readonly #rebuilt = new Map<StyleRule, Building>();
    #scopeKey: string | null = null;
    /** The column marking the elements the file hides, once the visibility pass has run. */
    hidden: { key: string; count: number } | null = null;
    /** The `data.` paths the reader put a column of the file at; undefined until first asked. */
    #heldPaths: ReadonlySet<string> | undefined = undefined;
    /** Per node, whether its border is zero wide; undefined until first asked. */
    #zeroBorders: readonly boolean[] | null | undefined = undefined;
    /** What the layers paint, once `run()` has run; null when a rebuilt layer's painting is unknown. */
    predicted: ReadonlyMap<Channel, readonly unknown[]> | null = null;

    /**
     * Set up the translation of one kind.
     * @param input - The translation's input.
     * @param kind - The kind translated.
     * @param factor - What a length is multiplied by.
     * @param notes - Where notes go.
     * @param columns - Where the values the layers read go.
     */
    constructor(
        input: TranslateInput,
        kind: StyleTarget,
        factor: number,
        notes: Notes,
        columns: Map<string, (FileStyleScalar | null)[]>,
    ) {
        this.#input = input;
        this.#kind = kind;
        this.#factor = factor;
        this.#notes = notes;
        this.#columns = columns;
        this.#n = kind === "node" ? input.snapshot.nodeCount : input.snapshot.edgeCount;
        this.#plans = channelPlans(kind, factor, input.options.shapes ?? FILE_STYLE_SHAPES);
        this.#keys = new Set(input.extracted.columns[kind].keys());
        this.#rules = input.extracted.styles.rules.filter(
            (rule) => rule.target === kind && (input.options.toolDefaults !== false || rule.origin !== "tool"),
        );
    }

    /**
     * Translate, fold to the bound and return the layers.
     * @returns The layers, bottom first.
     */
    run(): TranslatedLayer[] {
        this.#rules.forEach((rule, bucket) => {
            this.#rule(rule, bucket);
        });
        this.#composites();
        this.#visibility();

        const ordered = [...this.#built].filter(
            (layer) => Object.keys(layer.spec.set).length + Object.keys(layer.spec.encode).length > 0,
        );
        // Stable by bucket: a later pass's layer of rule i still sits below every layer of rule i+1.
        ordered.sort((a, b) => a.bucket - b.bucket);
        const { layers, folded } = foldToCap(ordered, this.#n, (run, paint) => this.#folded(run, paint));
        if (folded > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.LAYERS_FOLDED, this.#kind, null, folded);
        }

        this.predicted = this.#predict(layers as readonly Building[]);
        return layers.map((layer) => {
            const { spec } = layer;
            const out: Record<string, unknown> = { ...spec };
            if (spec.set !== undefined && Object.keys(spec.set).length === 0) {
                delete out.set;
            }

            if (spec.encode !== undefined && Object.keys(spec.encode).length === 0) {
                delete out.encode;
            }

            const { fallback } = layer as Building;
            return { spec: out as unknown as LayerSpec, ...(fallback === undefined ? {} : { fallback }) };
        });
    }

    /**
     * What a stack of layers paints per channel and element: the topmost layer that paints wins,
     * and a label's fields merge into its label style, field by field, as the repaint stacks them.
     * @param layers - The layers, bottom first.
     * @returns The values, or null when a layer's painting is unknown.
     */
    #predict(layers: readonly Building[]): Map<Channel, unknown[]> | null {
        const out = new Map<Channel, unknown[]>();
        const column = (channel: Channel): unknown[] => {
            let held = out.get(channel);
            if (held === undefined) {
                held = new Array<unknown>(this.#n).fill(null);
                out.set(channel, held);
            }

            return held;
        };
        for (const layer of layers) {
            const drawn = layer.drawn ?? layer.paint;
            if (drawn === null || drawn === undefined) {
                return null;
            }

            for (const [channel, values] of drawn) {
                const field = labelFieldOf(channel);
                const into = field?.into ?? channel;
                const whole = field === undefined && channelDescriptor(channel)?.accepts === "labelStyle";
                const held = column(into);
                values.forEach((value, i) => {
                    if (value === null || value === undefined) {
                        return;
                    }

                    if (field !== undefined) {
                        held[i] = mergeLabelStyle(held[i], labelPatchOf(field.field, value));
                    } else if (whole) {
                        held[i] = mergeLabelStyle(held[i], value);
                    } else {
                        held[i] = value;
                    }
                });
            }
        }

        return out;
    }

    // -----------------------------------------------------------------------------------------
    // Columns and paths
    // -----------------------------------------------------------------------------------------

    /**
     * A key no column of the load holds yet.
     * @param base - What the key says.
     * @returns The key, `el.<base>` with a number after it when that is taken.
     */
    #freshKey(base: string): string {
        let key = `el.${base}`;
        for (let n = 2; this.#keys.has(key); n++) {
            key = `el.${base}.${String(n)}`;
        }

        this.#keys.add(key);
        return key;
    }

    /**
     * Keep a column of values and give the path a layer reads it at.
     * @param key - The key.
     * @param values - The values by element index.
     * @returns The path.
     */
    #keep(key: string, values: readonly unknown[]): Path {
        if (!this.#columns.has(key)) {
            this.#columns.set(
                key,
                Array.from({ length: this.#n }, (_unused, i) => {
                    const value = values[i];
                    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                        ? value
                        : null;
                }),
            );
        }

        return fileStylePath(this.#input.namespace, this.#kind, key);
    }

    /**
     * Keep values under a new key.
     * @param base - What the key says.
     * @param values - The values by element index.
     * @returns The path.
     */
    #keepNew(base: string, values: readonly unknown[]): Path {
        return this.#keep(this.#freshKey(base), values);
    }

    /**
     * The values of a column reference, by element index, as graph-io reads them.
     * @param ref - The reference.
     * @param source - The styles the reference belongs to.
     * @returns The values, or null when nothing holds the column.
     */
    #values(ref: ColumnRef, source: ExtractedStyles): readonly unknown[] | null {
        const { snapshot } = this.#input;
        if ("style" in ref) {
            return source.columns[this.#kind].get(ref.style) ?? null;
        }

        if ("computed" in ref) {
            if (this.#kind !== "node") {
                return null;
            }

            if (ref.computed === "indegree") {
                return Array.from(snapshot.inDegree());
            }

            return Array.from(ref.computed === "outdegree" ? snapshot.outDegree() : snapshot.degree());
        }

        if (!("data" in ref)) {
            return null;
        }

        const table = this.#kind === "node" ? snapshot.nodes : snapshot.edges;
        if (!table.has(ref.data)) {
            return null;
        }

        return Array.from({ length: this.#n }, (_unused, i) => plain(table.value(ref.data, i)));
    }

    /**
     * The path a layer reads a column reference at, exactly as graph-io reads it.
     * @param ref - The reference.
     * @param source - The styles the reference belongs to.
     * @param tag - What a copied column's key says.
     * @returns The path, or null when the column holds nothing.
     */
    #pathOf(ref: ColumnRef, source: ExtractedStyles, tag: string): Path | null {
        if ("style" in ref) {
            const values = source.columns[this.#kind].get(ref.style);
            if (values === undefined) {
                return null;
            }

            return source === this.#input.extracted
                ? this.#keep(ref.style, values)
                : this.#keepNew(`${tag}.${ref.style}`, values);
        }

        if ("computed" in ref) {
            return this.#kind === "node" ? computedPath(ref.computed) : null;
        }

        if (!("data" in ref)) {
            return null;
        }

        const path = this.#input.dataPath(this.#kind, ref.data);
        if (path !== null) {
            return path;
        }

        // The reader left the column out, nested it or changed it: its values, kept per element.
        const values = this.#values(ref, source);
        return values === null ? null : this.#keepNew(`data.${String(this.#columns.size)}`, values);
    }

    // -----------------------------------------------------------------------------------------
    // Selectors
    // -----------------------------------------------------------------------------------------

    /**
     * Which elements a predicate matches, as graph-io reads it.
     * @param where - The predicate.
     * @param source - The styles it belongs to.
     * @returns Per element, whether it matches.
     */
    #matches(where: Predicate, source: ExtractedStyles): readonly boolean[] {
        const key = `${source === this.#input.extracted ? "" : "sub:"}${JSON.stringify(where)}`;
        const held = this.#matchCache.get(key);
        if (held !== undefined) {
            return held;
        }

        const probe: StyleRule = {
            id: "match",
            target: this.#kind,
            role: "group",
            origin: "inferred",
            where,
            set: { label: "1" },
        };
        const values = resolveStyles(
            { ...source, styles: { ...source.styles, rules: [probe] } },
            this.#kind,
            "label",
            this.#input.snapshot,
        );
        const out = values.map((value) => value !== null);
        this.#matchCache.set(key, out);
        return out;
    }

    /**
     * The selector of a predicate: short, and exactly what graph-io matches, or a membership
     * value written onto the elements.
     * @param where - The predicate.
     * @param source - The styles it belongs to.
     * @param id - The rule, for the membership key.
     * @returns The selector.
     */
    #selectorOf(where: Predicate, source: ExtractedStyles, id: string): Selector {
        if ("all" in where && where.all) {
            return this.#scoped({ match: "everything" });
        }

        const match = this.#matches(where, source);
        if (termsOf(where) <= MAX_TERMS) {
            const built = this.#expression(where, source);
            if (built !== null && built.test.every((value, i) => value === match[i])) {
                return this.#scoped(built.selector);
            }
        }

        const path = this.#keepNew(
            `where.${id}`,
            match.map((value) => (value ? true : null)),
        );
        return this.#scoped({ match: "has", path });
    }

    /**
     * A predicate as the element's expression language, with what that expression matches.
     * @param where - The predicate.
     * @param source - The styles it belongs to.
     * @returns The selector and its matches, or null when the predicate cannot be written.
     */
    #expression(where: Predicate, source: ExtractedStyles): { selector: Selector; test: boolean[] } | null {
        if ("has" in where && !("data" in where.has)) {
            const path = this.#pathOf(where.has, source, "has");
            const values = this.#values(where.has, source);
            if (path === null || values === null) {
                return null;
            }

            return {
                selector: { match: "has", path },
                test: values.map((value) => value !== null && value !== undefined),
            };
        }

        const built = this.#clause(where, source);
        return built === null ? null : { selector: { match: "expression", where: built.text }, test: built.test };
    }

    /**
     * One clause of an expression and what it matches per element.
     * @param where - The predicate.
     * @param source - The styles it belongs to.
     * @returns The text and the matches, or null.
     */
    #clause(where: Predicate, source: ExtractedStyles): { text: string; test: boolean[] } | null {
        const read = (ref: ColumnRef): { path: string; values: readonly unknown[] } | null => {
            const path = this.#pathOf(ref, source, "where");
            const values = this.#values(ref, source);
            return path === null || values === null ? null : { path: quotePath(path), values };
        };

        if ("has" in where) {
            const column = read(where.has);
            return column === null
                ? null
                : {
                      text: `(${column.path} != \`null\` && ${column.path} != \`false\`)`,
                      test: column.values.map((value) => value !== null && value !== undefined && value !== false),
                  };
        }

        if ("eq" in where) {
            const column = read(where.eq[0]);
            const wanted = where.eq[1];
            return column === null
                ? null
                : {
                      text: `${column.path} == ${literal(wanted)}`,
                      test: column.values.map((value) => value === wanted),
                  };
        }

        if ("in" in where) {
            const column = read(where.in[0]);
            const wanted = where.in[1];
            if (column === null || wanted.length === 0) {
                return null;
            }

            return {
                text: `(${wanted.map((value) => `${column.path} == ${literal(value)}`).join(" || ")})`,
                test: column.values.map((value) => wanted.some((one) => one === value)),
            };
        }

        if ("not" in where) {
            const inner = this.#clause(where.not, source);
            return inner === null ? null : { text: `!(${inner.text})`, test: inner.test.map((value) => !value) };
        }

        const list = listOf(where);
        if (!Array.isArray(list) || list.length === 0) {
            return null;
        }

        const parts = list.map((inner: Predicate) => this.#clause(inner, source));
        if (parts.some((part) => part === null)) {
            return null;
        }

        const kept = parts as { text: string; test: boolean[] }[];
        const all = "and" in where;
        return {
            text: `(${kept.map((part) => part.text).join(all ? " && " : " || ")})`,
            test: Array.from({ length: this.#n }, (_unused, i) =>
                all ? kept.every((part) => part.test[i]) : kept.some((part) => part.test[i]),
            ),
        };
    }

    /**
     * A selector narrowed to the load's own elements, so a file's layers never paint the elements
     * of another file loaded beside it, or ones added by hand.
     * @param selector - The selector.
     * @returns It and the load's membership.
     */
    #scoped(selector: Selector): Selector {
        this.#scopeKey ??= this.#freshKey("load");
        const scope = this.#keep(this.#scopeKey, new Array<boolean>(this.#n).fill(true));
        if (selector.match === "everything") {
            return { match: "has", path: scope };
        }

        let inner: string;
        if (selector.match === "has") {
            inner = `${quotePath(selector.path)} != \`null\``;
        } else if (selector.match === "expression") {
            inner = selector.where;
        } else {
            return selector;
        }

        return { match: "expression", where: `(${inner}) && ${quotePath(scope)} != \`null\`` };
    }

    // -----------------------------------------------------------------------------------------
    // Rules
    // -----------------------------------------------------------------------------------------

    /**
     * The layer of a rule in a bucket, made on first use.
     * @param rule - The rule.
     * @param bucket - Its place in rule order.
     * @param selector - What the layer selects.
     * @returns The layer.
     */
    #layerFor(rule: StyleRule, bucket: number, selector: Selector): Building {
        const key = JSON.stringify(selector);
        // A layer rebuilt from one graphty wrote is never painted into by a later pass.
        const same = this.#built.filter(
            (layer) =>
                layer.bucket === bucket &&
                (layer.spec.userData?.ruleKey as string | undefined) === rule.id &&
                this.#rebuilt.get(rule) !== layer,
        );
        const found = same.find((layer) => JSON.stringify(layer.spec.selector) === key);
        if (found !== undefined) {
            return found;
        }

        const kind = layerKindOf(rule);
        const origin: FileStyleOrigin = {
            format: this.#input.format,
            importId: this.#input.importId,
            ruleId: rule.id,
            role: rule.role,
            origin: rule.origin,
            ...factsOf(rule),
        };
        const layer: Building = {
            bucket,
            spec: {
                name: same.length === 0 ? rule.id : `${rule.id}#${String(same.length + 1)}`,
                target: this.#kind,
                kind,
                selector,
                set: {},
                encode: {},
                userData: { ...fileStyleUserData(origin), ruleKey: rule.id },
            },
            paint: new Map(),
            worth: kind === "custom" ? 0 : 1000,
        };
        this.#built.push(layer);
        return layer;
    }

    /**
     * Translate one rule of the file.
     * @param rule - The rule.
     * @param bucket - Its place in rule order.
     */
    #rule(rule: StyleRule, bucket: number): void {
        const spec = this.#rebuiltSpec(rule);
        const neutral = (): void => {
            this.#neutralRule(rule, bucket, this.#input.extracted);
        };
        if (spec === null) {
            neutral();
            return;
        }

        // The neutral layers of the rule, kept beside the rebuilt one for when the element refuses it.
        const before = this.#built.length;
        neutral();
        const made = this.#built.splice(before);
        const origin: FileStyleOrigin = {
            format: this.#input.format,
            importId: this.#input.importId,
            ruleId: rule.id,
            role: rule.role,
            origin: rule.origin,
            ...factsOf(rule),
        };
        const rebuilt: Building = {
            bucket,
            spec: {
                ...spec,
                set: { ...spec.set },
                encode: { ...spec.encode },
                userData: { ...spec.userData, ...fileStyleUserData(origin), ruleKey: rule.id },
            },
            paint: null,
            worth: 1000,
            fallback: made.map((layer) => layer.spec),
        };
        this.#built.push(rebuilt);
        this.#rebuilt.set(rule, rebuilt);
    }

    /**
     * Emit a rule's layers in a later pass. For a rule rebuilt from a layer graphty wrote, they are
     * kept as that layer's fallback, never drawn beside it.
     * @param rule - The rule.
     * @param emit - What emits them.
     */
    #emitFor(rule: StyleRule, emit: () => void): void {
        const rebuilt = this.#rebuilt.get(rule);
        const before = this.#built.length;
        emit();
        if (rebuilt !== undefined) {
            const made = this.#built.splice(before);
            rebuilt.fallback = [...(rebuilt.fallback ?? []), ...made.map((layer) => layer.spec)];
        }
    }

    /**
     * The layer graphty wrote into the file for a rule, rebuilt into this load: its file-style
     * paths moved into this load's namespace and its selector scoped to the load. Null, with a
     * note, when there is none or it cannot be used as it stands.
     * @param rule - The rule.
     * @returns The layer, or null for the neutral rule.
     */
    #rebuiltSpec(rule: StyleRule): LayerSpec | null {
        const raw = rule.ext?.[LAYER_SPEC_EXT];
        if (raw === undefined) {
            return null;
        }

        const ignored = (reason: string): null => {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.LAYER_SPEC_IGNORED, this.#kind, rule.id, 1, reason);
            return null;
        };
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            return ignored("INVALID");
        }

        const given = raw as Partial<LayerSpec>;
        const { selector } = given;
        if (
            typeof selector !== "object" ||
            selector === null ||
            (given.target !== undefined && given.target !== this.#kind)
        ) {
            return ignored("INVALID");
        }

        const held = this.#input.extracted.columns[this.#kind];
        let missing = false;
        const move = (path: unknown): unknown => {
            if (typeof path !== "string" || !isFileStylePath(path)) {
                return path;
            }

            const parts = parseFileStylePath(path);
            const values = parts === undefined || parts.kind !== this.#kind ? undefined : held.get(parts.key);
            if (parts === undefined || values === undefined) {
                missing = true;
                return path;
            }

            return this.#keep(parts.key, values);
        };
        let moved: Selector = selector;
        if (selector.match === "has" || selector.match === "top") {
            moved = { ...selector, path: move(selector.path) as Path };
        } else if (selector.match === "expression") {
            if (typeof selector.where !== "string" || expressionTerms(selector.where) > MAX_TERMS) {
                return ignored("SELECTOR_TERMS");
            }

            moved = { match: "expression", where: this.#moveExpression(selector.where, () => (missing = true)) };
        } else if (selector.match !== "everything") {
            return ignored("SELECTOR");
        }

        const encode: Record<string, unknown> = {};
        for (const [channel, binding] of Object.entries(given.encode ?? {})) {
            encode[channel] =
                typeof binding === "object" && binding !== null && "by" in binding
                    ? { ...binding, by: move(binding.by) }
                    : binding;
        }

        if (missing || !this.#readsHeldData(given)) {
            return ignored("PATH");
        }

        return {
            name: typeof given.name === "string" ? given.name : rule.id,
            target: this.#kind,
            ...(given.kind === undefined ? {} : { kind: given.kind }),
            selector: this.#scoped(moved),
            ...(given.set === undefined ? {} : { set: given.set }),
            ...(given.encode === undefined ? {} : { encode: encode }),
            ...(given.userData === undefined ? {} : { userData: given.userData }),
        };
    }

    /**
     * Whether every data column a layer graphty wrote reads is where this load's reader put it: a
     * reader that nests a column (a graphology attribute arrives under `attributes`) or leaves it
     * out gives the layer nothing at the path it names, so the neutral rule is drawn instead.
     * @param spec - The layer.
     * @returns True when each `data.` path it reads is where the reader put a column of the file.
     */
    #readsHeldData(spec: Partial<LayerSpec>): boolean {
        const paths: string[] = [];
        const { selector } = spec;
        if (selector?.match === "has" || selector?.match === "top") {
            paths.push(selector.path);
        } else if (selector?.match === "expression" && typeof selector.where === "string") {
            for (const match of selector.where.matchAll(DATA_SEGMENT)) {
                paths.push(`data.${match[1].startsWith('"') ? String(JSON.parse(match[1])) : match[1]}`);
            }
        }

        for (const binding of Object.values(spec.encode ?? {})) {
            if (typeof binding === "object" && binding !== null && "by" in binding && typeof binding.by === "string") {
                paths.push(binding.by);
            }
        }

        if (this.#heldPaths === undefined) {
            const table = this.#kind === "node" ? this.#input.snapshot.nodes : this.#input.snapshot.edges;
            this.#heldPaths = new Set(
                table.names().flatMap((column) => this.#input.dataPath(this.#kind, column) ?? []),
            );
        }

        const held = this.#heldPaths;
        return paths.filter((path) => path.startsWith("data.")).every((path) => held.has(path));
    }

    /**
     * An expression with every file-style path moved into this load's namespace.
     * @param where - The expression.
     * @param missing - Called for a path naming a value the file does not hold.
     * @returns The expression.
     */
    #moveExpression(where: string, missing: () => void): string {
        const held = this.#input.extracted.columns[this.#kind];
        // A path is `graphty.style.<namespace>.<kind>.<key>`, each segment bare or a quoted name.
        const segment = String.raw`(?:"(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_]*|\d+)`;
        const pattern = new RegExp(String.raw`graphty\.style\.${segment}\.(node|edge)((?:\.${segment})+)`, "g");
        return where.replace(pattern, (whole: string, kind: string, rest: string) => {
            const key = splitSegments(rest.slice(1)).join(".");
            const values = kind === this.#kind ? held.get(key) : undefined;
            if (values === undefined) {
                missing();
                return whole;
            }

            return quotePath(this.#keep(key, values));
        });
    }

    /**
     * Translate a rule into neutral layers.
     * @param rule - The rule.
     * @param bucket - Its place in rule order.
     * @param source - The styles it belongs to.
     * @param only - The properties to translate, every one when absent.
     */
    #neutralRule(rule: StyleRule, bucket: number, source: ExtractedStyles, only?: ReadonlySet<string>): void {
        const props = [...Object.keys(rule.set ?? {}), ...Object.keys(rule.map ?? {})];
        for (const property of props) {
            if (only !== undefined ? !only.has(property) : COMPOSITE[this.#kind].has(property)) {
                continue;
            }

            if (NOT_DRAWN[this.#kind].has(property)) {
                this.#noteNotDrawn(rule, property, source);
                continue;
            }

            for (const plan of this.#plansOf(property)) {
                if (!this.#drawnByBase(rule, property, plan)) {
                    this.#emit(rule, bucket, property, plan, source);
                }
            }
        }
    }

    /**
     * Whether a default graphty recorded in a file it wrote is what the element's own base layers
     * already draw, so it needs no layer.
     * @param rule - The rule.
     * @param property - The property.
     * @param plan - The channel it is drawn on.
     * @returns True for a graphty default the base layers draw.
     */
    #drawnByBase(rule: StyleRule, property: string, plan: ChannelPlan): boolean {
        const set = rule.set?.[property as StyleProperty];
        return (
            rule.origin === "tool" &&
            this.#input.extracted.styles.source.tool === "graphty" &&
            set !== undefined &&
            same(
                drawnAs(plan.channel, plan.convert(set)),
                drawnAs(plan.channel, this.#input.base[this.#kind][plan.channel]),
            )
        );
    }

    /**
     * The channels a property is drawn on: its plan, or the channel a `graphty:` property names.
     * @param property - The property.
     * @returns The plans; empty for a property the element has no channel for.
     */
    #plansOf(property: string): readonly ChannelPlan[] {
        const plans = this.#plans.get(property);
        if (plans !== undefined) {
            return plans;
        }

        if (property.startsWith("graphty:")) {
            const channel = property.slice("graphty:".length) as Channel;
            const descriptor = channelDescriptor(channel);
            if (
                descriptor?.target === this.#kind &&
                descriptor.accepts !== "labelStyle" &&
                descriptor.accepts !== "nothing"
            ) {
                return [{ channel, convert: (value) => value, identity: true }];
            }
        }

        this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.NOT_UNDERSTOOD, this.#kind, property, 1);
        return [];
    }

    /**
     * Note a property the element does not draw, with how many elements the file gives it on.
     * @param rule - The rule.
     * @param property - The property.
     * @param source - The styles the rule belongs to.
     */
    #noteNotDrawn(rule: StyleRule, property: string, source: ExtractedStyles): void {
        const values = this.#evaluate(rule, property, source);
        const count = values.filter((value) => value !== null).length;
        if (count > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.NOT_DRAWN, this.#kind, property, count);
        }
    }

    /**
     * What one rule gives each element for one property, as graph-io reads it: the rule's value
     * where its predicate matches and its mapping gives one, null elsewhere.
     * @param rule - The rule.
     * @param property - The property.
     * @param source - The styles the rule belongs to.
     * @returns The values by element index.
     */
    #evaluate(rule: StyleRule, property: string, source: ExtractedStyles): readonly (StyleValue | null)[] {
        const one: StyleRule = {
            id: rule.id,
            target: this.#kind,
            role: rule.role,
            origin: rule.origin,
            where: rule.where,
            ...(rule.set?.[property as StyleProperty] === undefined
                ? {}
                : { set: { [property]: rule.set[property as StyleProperty] } }),
            ...(rule.map?.[property as StyleProperty] === undefined
                ? {}
                : { map: { [property]: rule.map[property as StyleProperty] } }),
        };
        return resolveStyles(
            { ...source, styles: { ...source.styles, rules: [one] } },
            this.#kind,
            property as StyleProperty,
            this.#input.snapshot,
        );
    }

    /**
     * Emit one property of one rule on one channel.
     * @param rule - The rule.
     * @param bucket - Its place in rule order.
     * @param property - The property.
     * @param plan - The channel and how values become its values.
     * @param source - The styles the rule belongs to.
     */
    #emit(rule: StyleRule, bucket: number, property: string, plan: ChannelPlan, source: ExtractedStyles): void {
        const evaluated = this.#evaluate(rule, property, source);
        // A border the file draws zero wide is not drawn at all.
        const unbordered = property === "borderColor" && this.#kind === "node" ? this.#zeroBorder() : null;
        const truth = unbordered === null ? evaluated : evaluated.map((value, i) => (unbordered[i] ? null : value));
        const masked = truth.some((value, i) => value === null && evaluated[i] !== null);
        const drawn = truth.map((value) => (value === null ? null : plan.convert(value)));
        this.#noteConversion(property, plan, truth, drawn);
        if (!drawn.some((value) => value !== null)) {
            if (!truth.some((value) => value !== null) && !this.#matches(rule.where, source).some(Boolean)) {
                // The rule selects nothing in this graph.
                return;
            }

            if (!truth.some((value) => value !== null)) {
                this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.COLUMN_ABSENT, this.#kind, rule.id, 1, property);
            }

            return;
        }

        const selector = this.#selectorOf(rule.where, source, rule.id);
        const layer = this.#layerFor(rule, bucket, selector);
        const whole = channelDescriptor(plan.channel)?.accepts === "labelStyle";
        const paint = whole
            ? drawn.map((value) => (typeof value === "object" && value !== null ? value : null))
            : drawn.map((value) => drawnAs(plan.channel, value));
        layer.drawn ??= new Map(layer.paint ?? []);
        layer.drawn.set(plan.channel, paint);
        if (whole) {
            // A whole label style is no scalar: its layers are never folded.
            (layer as { paint: Building["paint"] }).paint = null;
        } else {
            layer.paint?.set(plan.channel, paint);
        }
        const set = rule.set?.[property as StyleProperty];
        if (set !== undefined && !masked) {
            const value = plan.convert(set);
            if (value !== null) {
                layer.spec.set[plan.channel] = value;
                return;
            }
        }

        const mapping = rule.map?.[property as StyleProperty];
        const binding =
            mapping === undefined || masked ? null : this.#binding(mapping, plan, truth, drawn, source, rule);
        if (binding !== null) {
            layer.spec.encode[plan.channel] = binding.binding;
            layer.worth += binding.worth;
            setFacts(layer, binding.facts);
            return;
        }

        // Nothing shorter is exact: the rule's values, kept per element.
        const path = this.#keepNew(`${property}.${rule.id}`, drawn);
        layer.spec.encode[plan.channel] = { by: path, scale: "passthrough" };
        layer.worth = 0;
        setFacts(layer, {
            column: path,
            mapping: "passthrough",
            distinctValues: new Set(drawn.filter((value) => value !== null)).size,
        });
    }

    /**
     * Per node, whether the file draws its border zero wide.
     * @returns The marks, or null when no node's border is zero wide.
     */
    #zeroBorder(): readonly boolean[] | null {
        if (this.#zeroBorders === undefined) {
            const widths = resolveStyles(this.#input.extracted, "node", "borderWidth", this.#input.snapshot);
            const marks = widths.map((width) => typeof width === "number" && width <= 0);
            this.#zeroBorders = marks.some(Boolean) ? marks : null;
        }

        return this.#zeroBorders;
    }

    /**
     * Note what a channel draws differently from the file: values with no counterpart, and
     * values drawn as the nearest one.
     * @param property - The property.
     * @param plan - The channel.
     * @param truth - The file's values.
     * @param drawn - The channel's values.
     */
    #noteConversion(
        property: string,
        plan: ChannelPlan,
        truth: readonly (StyleValue | null)[],
        drawn: readonly unknown[],
    ): void {
        let none = 0;
        let nearest = 0;
        let sample: string | undefined;
        // Several rules can give one element a value for the property; the element counts once.
        const first = (code: string, i: number): boolean => {
            const key = `${code}\u0000${property}`;
            let seen = this.#counted.get(key);
            if (seen === undefined) {
                seen = new Set();
                this.#counted.set(key, seen);
            }

            if (seen.has(i)) {
                return false;
            }

            seen.add(i);
            return true;
        };
        truth.forEach((value, i) => {
            if (value === null) {
                return;
            }

            if (drawn[i] === null || drawnAs(plan.channel, drawn[i]) === null) {
                if (first("none", i)) {
                    none++;
                }

                sample ??= String(value);
            } else if (plan.nearest?.(value) === true && first("nearest", i)) {
                nearest++;
            }
        });
        if (none > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.NO_COUNTERPART, this.#kind, property, none, sample);
        }

        if (nearest > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.DRAWN_NEAREST, this.#kind, property, nearest);
        }
    }

    /**
     * The binding of a mapping, when one draws exactly what the rule gives every element.
     * @param mapping - The mapping.
     * @param plan - The channel.
     * @param truth - The rule's values per element.
     * @param drawn - The channel's values per element.
     * @param source - The styles the rule belongs to.
     * @param rule - The rule, for its facts.
     * @returns The binding, how readable it is and its facts, or null.
     */
    #binding(
        mapping: Mapping,
        plan: ChannelPlan,
        truth: readonly (StyleValue | null)[],
        drawn: readonly unknown[],
        source: ExtractedStyles,
        rule: StyleRule,
    ): { binding: Binding; worth: number; facts: Partial<FileStyleOrigin> } | null {
        const raw = this.#values(mapping.by, source);
        if (raw === null) {
            return null;
        }

        const match = this.#matches(rule.where, source);
        const path = (): Path | null => this.#pathOf(mapping.by, source, "by");
        if (mapping.kind === "passthrough") {
            // The column, read as the channel reads it, must give what the file gives.
            const exact = raw.every(
                (value, i) => !match[i] || same(drawnAs(plan.channel, value), drawnAs(plan.channel, drawn[i])),
            );
            const at = exact ? path() : null;
            return at === null
                ? null
                : {
                      binding: { by: at, scale: "passthrough" },
                      worth: 0,
                      facts: {
                          column: at,
                          mapping: "passthrough",
                          distinctValues: new Set(raw.filter((value) => value !== null)).size,
                      },
                  };
        }

        if (mapping.kind === "discrete") {
            return this.#discrete(plan, raw, drawn, match, path, mapping.table.length);
        }

        if (mapping.kind === "continuous") {
            return this.#continuous(mapping, plan, path);
        }

        return null;
    }

    /**
     * A discrete mapping as a table keyed by the values present, the rest left to the layers
     * beneath, when that draws exactly what the file gives.
     * @param plan - The channel.
     * @param raw - The column's values.
     * @param drawn - The channel's values.
     * @param match - Which elements the rule selects.
     * @param path - Gives the column's path.
     * @param entries - How many entries the file's table holds.
     * @returns The binding, or null.
     */
    #discrete(
        plan: ChannelPlan,
        raw: readonly unknown[],
        drawn: readonly unknown[],
        match: readonly boolean[],
        path: () => Path | null,
        entries: number,
    ): { binding: Binding; worth: number; facts: Partial<FileStyleOrigin> } | null {
        const map = new Map<string, unknown>();
        const unmapped = new Set<string>();
        for (let i = 0; i < raw.length; i++) {
            if (!match[i] || raw[i] === null || raw[i] === undefined) {
                if (match[i] && drawn[i] !== null) {
                    return null;
                }

                continue;
            }

            const key = categoryOf(raw[i]);
            if (key === null) {
                return null;
            }

            const value = drawn[i];
            if (value === null) {
                unmapped.add(key);
                continue;
            }

            // A map value is a string or a number: a boolean channel keeps its values per element.
            if (typeof value !== "string" && typeof value !== "number") {
                return null;
            }

            if (map.has(key) && !same(map.get(key), value)) {
                return null;
            }

            map.set(key, value);
        }

        if (map.size === 0 || map.size > MAX_TABLE_KEYS || [...unmapped].some((key) => map.has(key))) {
            if (map.size > MAX_TABLE_KEYS) {
                this.#notes.add(
                    FILE_STYLE_TRANSLATION_ISSUE.TABLE_AS_VALUES,
                    this.#kind,
                    plan.channel,
                    1,
                    `${String(map.size)} keys`,
                );
            }

            return null;
        }

        const at = path();
        if (at === null) {
            return null;
        }

        const table: Record<string, string | number> = {};
        for (const [key, value] of map) {
            Object.defineProperty(table, key, { value, enumerable: true, writable: true, configurable: true });
        }

        return {
            binding: { by: at, scale: "passthrough", map: table, unmapped: "skip" },
            worth: map.size,
            facts: { column: at, mapping: "discrete", entries: Math.max(entries, map.size) },
        };
    }

    /**
     * A continuous mapping as a `stops` binding: the file's points, its values converted.
     * @param mapping - The mapping.
     * @param mapping.points - Its points.
     * @param plan - The channel.
     * @param path - Gives the column's path.
     * @returns The binding, or null when a value has no counterpart.
     */
    #continuous(
        mapping: Extract<Mapping, { kind: "continuous" }>,
        plan: ChannelPlan,
        path: () => Path | null,
    ): { binding: Binding; worth: number; facts: Partial<FileStyleOrigin> } | null {
        const descriptor = channelDescriptor(plan.channel);
        if (descriptor?.accepts !== "number" && descriptor?.accepts !== "color") {
            return null;
        }

        const stops: BindingStop[] = [];
        for (const point of mapping.points) {
            const [below, value, above] = [point.below, point.value, point.above].map((one) => plan.convert(one));
            const ok = (one: unknown): one is string | number => typeof one === "string" || typeof one === "number";
            if (!ok(below) || !ok(value) || !ok(above) || !Number.isFinite(point.at)) {
                return null;
            }

            stops.push({
                at: point.at,
                value,
                ...(below === value ? {} : { below }),
                ...(above === value ? {} : { above }),
            });
        }

        const at = path();
        return at === null || stops.length === 0
            ? null
            : {
                  binding: { by: at, stops },
                  worth: stops.length,
                  facts: { column: at, mapping: "continuous", entries: stops.length },
              };
    }

    // -----------------------------------------------------------------------------------------
    // Passes of their own
    // -----------------------------------------------------------------------------------------

    /** Node size from width and height, node opacity from two opacities, and label positions. */
    #composites(): void {
        if (this.#kind !== "node") {
            return;
        }

        this.#composite(
            ["width", "height"],
            "width",
            (w, h) => {
                const a = typeof w === "number" ? w : null;
                const b = typeof h === "number" ? h : null;
                if (a === null && b === null) {
                    return null;
                }

                return round(Math.max(a ?? (b as number), b ?? (a as number)) * this.#factor);
            },
            "node.size",
        );
        this.#composite(
            ["fillOpacity", "opacity"],
            "opacity",
            (fill, whole) => {
                if (typeof fill !== "number" && typeof whole !== "number") {
                    return null;
                }

                return round((typeof fill === "number" ? fill : 1) * (typeof whole === "number" ? whole : 1));
            },
            "node.opacity",
        );
        this.#labelPositions();
    }

    /**
     * One channel drawn from two properties. When the rules write only one of them, or write both
     * the same way, each rule is translated on its own; otherwise the combined values are planned
     * again with graph-io's planner and drawn above the topmost rule that writes either.
     * @param props - The two properties.
     * @param planned - The property name the combined values are planned under.
     * @param combine - The combined value of an element.
     * @param channel - The channel drawn.
     */
    #composite(
        props: readonly [string, string],
        planned: string,
        combine: (a: StyleValue | null, b: StyleValue | null) => number | null,
        channel: Channel,
    ): void {
        const { extracted, snapshot } = this.#input;
        const writes = (rule: StyleRule, property: string): boolean =>
            rule.set?.[property as StyleProperty] !== undefined || rule.map?.[property as StyleProperty] !== undefined;
        const writers = this.#rules
            .map((rule, bucket) => ({ rule, bucket }))
            .filter(({ rule }) => props.some((p) => writes(rule, p)));
        if (writers.length === 0) {
            return;
        }

        const scale = channel === "node.size" ? this.#factor : 1;
        const convert: Convert = (value) => (typeof value === "number" ? round(value * scale) : null);
        const plan: ChannelPlan = { channel, convert, identity: channel !== "node.size" || this.#factor === 1 };
        const [first, second] = props;
        const used = props.filter((p) => writers.some(({ rule }) => writes(rule, p)));
        const signature = (rule: StyleRule, property: string): string =>
            JSON.stringify([
                rule.set?.[property as StyleProperty] ?? null,
                rule.map?.[property as StyleProperty] ?? null,
            ]);
        const twin =
            used.length === 2 &&
            channel === "node.size" &&
            writers.every(({ rule }) => signature(rule, first) === signature(rule, second));
        if (used.length === 1 || twin) {
            for (const { rule, bucket } of writers) {
                if (writes(rule, used[0]) && !this.#drawnByBase(rule, used[0], plan)) {
                    this.#emitFor(rule, () => {
                        this.#emit(rule, bucket, used[0], plan, extracted);
                    });
                }
            }

            if (used[0] === "fillOpacity") {
                this.#noteFadedFill();
            }

            return;
        }

        if (writers.every(({ rule }) => this.#rebuilt.has(rule))) {
            // Every rule is drawn by the layer graphty wrote for it.
            return;
        }

        const a = resolveStyles(extracted, this.#kind, first as StyleProperty, snapshot);
        const b = resolveStyles(extracted, this.#kind, second as StyleProperty, snapshot);
        const values = a.map((value, i) => combine(value, b[i]));
        const differ = a.filter((value, i) => value !== null && b[i] !== null && value !== b[i]).length;
        if (differ > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.DRAWN_NEAREST, this.#kind, `${first},${second}`, differ);
        }

        if (channel === "node.opacity") {
            this.#noteFadedFill();
        }

        // Planned in the element's own units, so each rule of the plan is drawn as it is.
        const sub = planStyles(
            {
                format: extracted.styles.source.format,
                units: "px",
                node: { values: { [planned]: values } },
                fingerprint: extracted.fingerprint,
            },
            { node: extracted.features.node, edge: [] },
            { toolDefaults: false },
        );
        const top = writers.at(-1)?.bucket ?? 0;
        const identity: ChannelPlan = { channel, convert: (value) => value, identity: true };
        for (const rule of sub.styles.rules) {
            if (rule.target === "node") {
                this.#emitWith(rule, top, planned, identity, sub);
            }
        }
    }

    /**
     * Emit one property of a planned rule in a bucket of another rule.
     * @param rule - The planned rule.
     * @param bucket - The bucket.
     * @param property - The property.
     * @param plan - The channel.
     * @param source - The planned styles.
     */
    #emitWith(rule: StyleRule, bucket: number, property: string, plan: ChannelPlan, source: ExtractedStyles): void {
        if (
            rule.set?.[property as StyleProperty] !== undefined ||
            rule.map?.[property as StyleProperty] !== undefined
        ) {
            this.#emit(rule, bucket, property, plan, source);
        }
    }

    /** Note that a translucent fill fades the whole node, label and outline with it. */
    #noteFadedFill(): void {
        const { extracted, snapshot } = this.#input;
        const fill = resolveStyles(extracted, "node", "fillOpacity", snapshot);
        const faded = fill.filter((value) => typeof value === "number" && value < 1).length;
        if (faded > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.DRAWN_NEAREST, this.#kind, "fillOpacity", faded);
        }
    }

    /**
     * Label positions. The element sets a label's position as part of its whole label style, so a
     * position set by a rule is drawn by that rule's layer; a position per element takes one
     * layer per distinct value, within the label budget, above the topmost rule that sets one.
     */
    #labelPositions(): void {
        const property = "labelPosition";
        const writers = this.#rules
            .map((rule, bucket) => ({ rule, bucket }))
            .filter(({ rule }) => rule.set?.labelPosition !== undefined || rule.map?.labelPosition !== undefined);
        if (writers.length === 0) {
            return;
        }

        const channel = `${this.#kind}.labelStyle` as Channel;
        const location = (value: StyleValue): unknown =>
            typeof value === "string" && LOCATIONS.has(value) ? { location: value } : null;
        if (writers.every(({ rule }) => rule.map?.labelPosition === undefined)) {
            for (const { rule, bucket } of writers) {
                this.#emitFor(rule, () => {
                    this.#emit(
                        rule,
                        bucket,
                        property,
                        { channel, convert: location, identity: false },
                        this.#input.extracted,
                    );
                });
            }

            return;
        }

        if (writers.every(({ rule }) => this.#rebuilt.has(rule))) {
            return;
        }

        const values = resolveStyles(this.#input.extracted, this.#kind, property, this.#input.snapshot);
        const counts = new Map<string, number>();
        for (const value of values) {
            if (typeof value === "string" && LOCATIONS.has(value)) {
                counts.set(value, (counts.get(value) ?? 0) + 1);
            }
        }

        const budget = Math.max(
            1,
            Math.min(LABEL_LAYERS.max, Math.floor(this.#input.options.labelLayers ?? LABEL_LAYERS.default)),
        );
        const kept = [...counts.keys()]
            .sort((x, y) => (counts.get(y) ?? 0) - (counts.get(x) ?? 0) || (x < y ? -1 : 1))
            .slice(0, budget);
        const keptSet = new Set(kept);
        let capped = 0;
        const column = values.map((value) => {
            if (typeof value !== "string" || !LOCATIONS.has(value)) {
                return null;
            }

            if (keptSet.has(value)) {
                return value;
            }

            capped++;
            return kept[0];
        });
        if (capped > 0) {
            this.#notes.add(FILE_STYLE_TRANSLATION_ISSUE.LABEL_CAPPED, this.#kind, property, capped);
        }

        const path = this.#keepNew("labelPosition", column);
        const top = writers.at(-1)?.bucket ?? 0;
        const rule = writers.at(-1)?.rule as StyleRule;
        for (const value of kept) {
            const selector = this.#scoped({ match: "expression", where: `${quotePath(path)} == ${literal(value)}` });
            const layer = this.#layerFor(rule, top, selector);
            layer.spec.set[channel] = { location: value as LabelLocation };
            layer.drawn ??= new Map(layer.paint ?? []);
            layer.drawn.set(
                channel,
                column.map((held) => (held === value ? { location: value } : null)),
            );
            // A whole label style is no scalar: its layers are never folded.
            (layer as { paint: Building["paint"] }).paint = null;
            layer.spec.name = `${rule.id}.labelPosition=${value}`;
        }
    }

    /** The elements the file hides, for the session's visibility. */
    #visibility(): void {
        if (!this.#rules.some((rule) => rule.set?.visible !== undefined || rule.map?.visible !== undefined)) {
            return;
        }

        const values = resolveStyles(this.#input.extracted, this.#kind, "visible", this.#input.snapshot);
        const marks = values.map((value) => (value === false ? true : null));
        const count = marks.filter(Boolean).length;
        if (count > 0) {
            const key = this.#freshKey("hidden");
            this.#keep(key, marks);
            this.hidden = { key, count };
        }
    }

    /**
     * The layer standing for a folded run: what the run painted, kept per element.
     * @param run - The run.
     * @param paint - What it painted per channel.
     * @returns The layer.
     */
    #folded(run: readonly FoldableLayer[], paint: ReadonlyMap<Channel, readonly unknown[]>): Building {
        const encode: Record<string, Binding> = {};
        for (const [channel, values] of paint) {
            encode[channel] = { by: this.#keepNew(`fold.${channel}`, values), scale: "passthrough" };
        }

        const origin: FileStyleOrigin = {
            format: this.#input.format,
            importId: this.#input.importId,
            ruleId: `${this.#kind}.folded`,
            role: "passthrough",
            origin: "inferred",
            reason: "LAYER_CAP",
            elements: this.#n,
        };
        return {
            bucket: 0,
            spec: {
                name: `${this.#kind}.folded`,
                target: this.#kind,
                kind: "custom",
                selector: this.#scoped({ match: "everything" }),
                set: {},
                encode,
                userData: { ...fileStyleUserData(origin), folded: run.map((layer) => layer.spec.name) },
            },
            paint: new Map(paint as Map<Channel, unknown[]>),
            worth: 0,
        };
    }
}

/** The first segment after `data.` in an expression, bare or quoted. */
const DATA_SEGMENT = /(?<![\w."])data\.("(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_]*)/g;

/** The label positions the element draws. */
const LOCATIONS: ReadonlySet<string> = new Set([
    "top",
    "top-right",
    "top-left",
    "left",
    "center",
    "right",
    "bottom",
    "bottom-left",
    "bottom-right",
]);

/**
 * The segments of a dotted path, each quoted name read back as its text.
 * @param text - The path's segments, joined with dots.
 * @returns The segments.
 */
function splitSegments(text: string): string[] {
    const out: string[] = [];
    let at = 0;
    while (at < text.length) {
        if (text[at] === '"') {
            let end = at + 1;
            while (end < text.length && text[end] !== '"') {
                end += text[end] === "\\" ? 2 : 1;
            }

            out.push(JSON.parse(text.slice(at, end + 1)) as string);
            at = end + 2;
        } else {
            const end = text.indexOf(".", at);
            out.push(text.slice(at, end === -1 ? undefined : end));
            at = end === -1 ? text.length : end + 1;
        }
    }

    return out;
}

/**
 * The predicates an `and` or an `or` combines.
 * @param where - The predicate.
 * @returns Them, or null for any other predicate.
 */
function listOf(where: Predicate): readonly Predicate[] | null {
    if ("and" in where) {
        return where.and;
    }

    return "or" in where ? where.or : null;
}

/**
 * The kind of layer a rule makes: its defaults are a base, a mapping or a group an encoding, and
 * per-element copies custom.
 * @param rule - The rule.
 * @returns The kind.
 */
function layerKindOf(rule: StyleRule): LayerKind {
    if (rule.role === "defaults") {
        return "base";
    }

    return rule.role === "mapping" || rule.role === "group" ? "encoding" : "custom";
}

/**
 * The facts of a rule a layer carries.
 * @param rule - The rule.
 * @returns The facts.
 */
function factsOf(rule: StyleRule): Partial<FileStyleOrigin> {
    const facts = rule.facts ?? {};
    const meanings: FileStyleMeaning[] | undefined = facts.names?.map(([value, name]) => ({ value, name }));
    return {
        ...(facts.elements === undefined ? {} : { elements: facts.elements }),
        ...(facts.classes === undefined ? {} : { classes: facts.classes }),
        ...(facts.distinctValues === undefined ? {} : { distinctValues: facts.distinctValues }),
        ...(facts.reason === undefined ? {} : { reason: facts.reason }),
        ...(meanings === undefined ? {} : { meanings }),
    };
}

/**
 * Add facts to a layer's origin.
 * @param layer - The layer.
 * @param facts - The facts.
 */
function setFacts(layer: Building, facts: Partial<FileStyleOrigin>): void {
    const data = layer.spec.userData as Record<string, unknown>;
    const key = Object.keys(fileStyleUserData({} as FileStyleOrigin))[0];
    data[key] = { ...(data[key] as object), ...facts };
}
