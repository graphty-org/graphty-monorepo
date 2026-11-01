/**
 * @file The layer stack as neutral styles, for an export: the inverse of the translation a load
 * runs. graph-io writes what this returns into the file -- each element's look in the format's own
 * style slots, the rules where the format has a style language, and graphty's style block -- so
 * importing the file back rebuilds the same layers.
 *
 * - One rule per layer above the element's own, in stack order. The element's two base layers
 *   are the defaults of the writing tool, `graphty`.
 * - A selector becomes a short predicate when it reads only what the file will hold; otherwise the
 *   elements the layer paints are written onto them as a membership value.
 * - A binding becomes a mapping (passthrough, table, two-point linear or stops) only when graph-io
 *   reads that mapping exactly as the element painted it, element by element. Anything else (a
 *   palette, another scale, a value the file will not hold) is written as the painted values, and
 *   reported as flattened with a reason: the picture stays exact, the rule loses its editable form.
 * - Each rule carries the layer itself in `ext["@graphty/graphty-element"]` when every path it
 *   reads will be in the file, so graphty rebuilds the identical layer.
 *
 * What the element draws is read through `explain()`, the same walk the repaint runs, so the
 * picture is what the canvas shows.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import {
    type ColumnRef,
    type ContinuousPoint,
    type ExtractedStyles,
    featuresOf,
    type Mapping,
    type Predicate,
    resolveStyles,
    type StyleColumn,
    styleFingerprint,
    type StyleProperty,
    type StyleRule,
    type StyleRuleReason,
    type StyleRuleRole,
    type StyleTarget,
    type StyleValue,
} from "@graphty/graph-io/styles";

import type { Binding, Channel, EdgeId, LayerSpec, NodeId, Path, Rgba } from "../../../catalog/types";
import { toColorValue } from "../channels";
import type { ExplainTarget, StyleExplanation } from "../explain";
import type { CompiledLayer } from "../Layer";
import { computedOf, parseFileStylePath } from "./path";
import {
    ARROW_SHAPES,
    ARROW_SHAPES_NEAREST,
    FILE_STYLE_SHAPES,
    LINE_STYLES,
    LINE_STYLES_NEAREST,
    TOOL_ARROW_SHAPES,
} from "./shapes";
import { fileStyleColumn, type FileStyleStore } from "./store";
import { LAYER_SPEC_EXT, SCENE_PER_UNIT } from "./translate";

/** What turning the stack into neutral styles needs. */
export interface LayersToStylesInput {
    /** The stack, bottom first. */
    readonly stack: readonly CompiledLayer[];
    /** The graph being written; its rows are the session's rows. */
    readonly snapshot: GraphSnapshot;
    /** The id of each node and edge row. */
    readonly ids: { readonly node: readonly NodeId[]; readonly edge: readonly EdgeId[] };
    /** Why one element looks as it does. */
    readonly explain: (target: ExplainTarget) => StyleExplanation;
    /** Per node row, and per edge row, whether the element is hidden. */
    readonly hidden: { readonly node: readonly boolean[]; readonly edge: readonly boolean[] };
    /** The session's file-style values. */
    readonly fileStyles: FileStyleStore;
    /** The format being written, for the styles' source. */
    readonly format: string;
    /**
     * Whether the file keeps graphty's style block, which rebuilds a layer's whole label style;
     * without it, a label style no rule carries is named as not written. Kept when unset.
     */
    readonly keepsBlock?: boolean;
}

/** One layer whose rule lost its editable form for other programs. */
export interface FlattenedLayer {
    /** The layer's name. */
    readonly layer: string;
    /** Nodes or edges. */
    readonly target: StyleTarget;
    /** The property written as values. */
    readonly property: string;
    /** Why. */
    readonly reason: StyleRuleReason;
    /** How many elements carry a value. */
    readonly count: number;
}

/** What the stack became. */
export interface LayersToStyles {
    /** The styles, for graph-io's writers. */
    readonly extracted: ExtractedStyles;
    /** The layers written as values. */
    readonly flattened: readonly FlattenedLayer[];
    /** Channels no rule could carry and no rebuilt layer will restore: `graphty:<channel>` per target. */
    readonly unwritten: readonly { readonly target: StyleTarget; readonly property: string; readonly count: number }[];
    /**
     * The rules the element's own base layers became, by target and id: loading the file into graphty draws them
     * again, so what only they draw is not lost.
     */
    readonly base: readonly { readonly target: StyleTarget; readonly id: string }[];
}

/** How a channel's value becomes a neutral property's value, and back. */
interface PropertyPlan {
    /** The neutral properties the channel is drawn from. */
    readonly properties: readonly string[];
    /** The neutral value of a channel value, or null when the property cannot hold it. */
    readonly toNeutral: (value: unknown) => StyleValue | null;
}

/**
 * The hex form of a color value as the element carries it, with its alpha.
 * @param value - A color string or a carried color.
 * @returns `#rrggbb` and the alpha, or null.
 */
function colorOf(value: unknown): { hex: string; alpha: number } | null {
    let found: Rgba | null = null;
    if (typeof value === "object" && value !== null && "r" in value && "g" in value && "b" in value) {
        found = toColorValue(value as Rgba);
    } else if (typeof value === "string") {
        found = toColorValue(value);
    }

    if (found === null) {
        return null;
    }

    const byte = (n: number): string => n.toString(16).padStart(2, "0");
    return { hex: `#${byte(found.r)}${byte(found.g)}${byte(found.b)}`, alpha: found.a };
}

/**
 * The inverse of a table: each value's first key.
 * @param table - Key to value.
 * @param skip - Keys never taken.
 * @returns Value to key.
 */
function inverse(
    table: Iterable<readonly [string, string]>,
    skip: ReadonlySet<string> = new Set(),
): Map<string, string> {
    const out = new Map<string, string>();
    for (const [from, to] of table) {
        if (!skip.has(from) && !out.has(to)) {
            out.set(to, from);
        }
    }

    return out;
}

const SHAPE_OF = inverse(Object.entries(FILE_STYLE_SHAPES));
const LINE_OF = inverse(LINE_STYLES, LINE_STYLES_NEAREST);
// a cap only one program's arrow is drawn as (Cytoscape's half barb, vis-network's crow) writes that arrow back
const ARROW_OF = inverse(
    [ARROW_SHAPES, ...TOOL_ARROW_SHAPES.values()].flatMap((table) => [...table]),
    ARROW_SHAPES_NEAREST,
);

const color: PropertyPlan["toNeutral"] = (value) => {
    const found = colorOf(value);
    return found !== null && found.alpha >= 1 ? found.hex : null;
};
const number: PropertyPlan["toNeutral"] = (value) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
const text: PropertyPlan["toNeutral"] = (value) => (typeof value === "string" ? value : null);
const scaled = (value: unknown, by: number): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value * by : null;
const flag: PropertyPlan["toNeutral"] = (value) => (typeof value === "boolean" ? value : null);
const opacity: PropertyPlan["toNeutral"] = (value) =>
    typeof value === "number" && value >= 0 && value <= 1 ? value : null;
const weight: PropertyPlan["toNeutral"] = (value) => (value === "normal" || value === "bold" ? value : null);
const table =
    (entries: ReadonlyMap<string, string>): PropertyPlan["toNeutral"] =>
    (value) =>
        typeof value === "string" ? (entries.get(value) ?? null) : null;
const plan = (toNeutral: PropertyPlan["toNeutral"], ...properties: string[]): PropertyPlan => ({
    properties,
    toNeutral,
});

/**
 * The neutral property of each channel that has one, so that a load reads it back to the same
 * channel and value. Every other channel is carried as `graphty:<channel>`, which only graphty
 * reads.
 */
const PLANS: Readonly<Record<StyleTarget, ReadonlyMap<string, PropertyPlan>>> = {
    node: new Map([
        ["node.color", plan(color, "fill")],
        ["node.outline", plan(color, "borderColor")],
        ["node.label", plan(text, "label")],
        ["node.tooltip", plan(text, "tooltip")],
        ["node.xlabel", plan(text, "xlabel")],
        ["node.labelColor", plan(color, "labelColor")],
        ["node.labelSize", plan(number, "labelSize")],
        ["node.labelFont", plan(text, "labelFont")],
        ["node.labelWeight", plan(weight, "labelWeight")],
        ["node.labelTextAlign", plan(text, "labelTextAlign")],
        ["node.labelLocation", plan(text, "labelPosition")],
        ["node.labelItalic", plan(flag, "labelItalic")],
        ["node.labelRotation", plan(number, "labelRotation")],
        // The scene's units, written in a node size's, which a file graphty wrote is read back in.
        ["node.labelWrapWidth", plan((value) => scaled(value, 1 / SCENE_PER_UNIT.node), "labelWrapWidth")],
        ["node.labelWrapTrailingSpace", plan(flag, "labelWrapTrailingSpace")],
        // Screen pixels: never scaled with the file's lengths.
        ["node.labelMinScreenSize", plan(number, "labelMinScreenSize")],
        ["node.labelOnTop", plan(flag, "labelOnTop")],
        ["node.labelMinNodeScreenSize", plan(number, "labelMinNodeScreenSize")],
        // Only the size order has a neutral spelling (Gephi's and sigma.js's).
        ["node.labelDeclutter", plan((value) => (value === "size" ? true : null), "labelAvoidOverlap")],
        ["node.shape", plan(table(SHAPE_OF), "shape")],
        ["node.size", plan(number, "width", "height")],
        ["node.opacity", plan(opacity, "opacity")],
    ]),
    edge: new Map([
        ["edge.color", plan(color, "color")],
        ["edge.opacity", plan(opacity, "opacity")],
        ["edge.width", plan(number, "width")],
        // Screen pixels: never scaled with the file's lengths.
        ["edge.minScreenWidth", plan(number, "minScreenWidth")],
        ["edge.style", plan(table(LINE_OF), "lineStyle")],
        ["edge.arrowHead", plan(table(ARROW_OF), "targetArrow")],
        ["edge.arrowTail", plan(table(ARROW_OF), "sourceArrow")],
        ["edge.bends", plan(text, "bends")],
        ["edge.fanSpacing", plan((value) => scaled(value, 1 / SCENE_PER_UNIT.node), "fanSpacing")],
        ["edge.sourcePort", plan(text, "sourcePort")],
        ["edge.targetPort", plan(text, "targetPort")],
        ["edge.arrowHeadColor", plan(color, "targetArrowColor")],
        ["edge.arrowTailColor", plan(color, "sourceArrowColor")],
        ["edge.label", plan(text, "label")],
        ["edge.arrowHeadText", plan(text, "targetLabel")],
        ["edge.arrowTailText", plan(text, "sourceLabel")],
        ["edge.xlabel", plan(text, "xlabel")],
        ["edge.labelColor", plan(color, "labelColor")],
        ["edge.labelSize", plan(number, "labelSize")],
        ["edge.labelFont", plan(text, "labelFont")],
        ["edge.labelWeight", plan(weight, "labelWeight")],
        ["edge.labelTextAlign", plan(text, "labelTextAlign")],
        ["edge.labelLocation", plan(text, "labelPosition")],
        ["edge.labelItalic", plan(flag, "labelItalic")],
        ["edge.labelMinScreenSize", plan(number, "labelMinScreenSize")],
        ["edge.labelOnTop", plan(flag, "labelOnTop")],
    ]),
};

/**
 * A channel value as a `graphty:<channel>` value: a color as `#rrggbb` or `#rrggbbaa`, any other
 * plain value as it is.
 * @param value - The value.
 * @returns The value, or null for one no scalar can hold (a whole label style).
 */
function graphtyValue(value: unknown): StyleValue | null {
    if (typeof value === "number" || typeof value === "boolean") {
        return Number.isFinite(value) || typeof value === "boolean" ? value : null;
    }

    const found = typeof value === "object" && value !== null ? colorOf(value) : null;
    if (found !== null) {
        const alpha = Math.round(found.alpha * 255);
        return alpha >= 255 ? found.hex : `${found.hex}${alpha.toString(16).padStart(2, "0")}`;
    }

    return typeof value === "string" ? value : null;
}

/**
 * Whether two values agree within what a writer and the element round: numbers to a relative
 * 1e-5, colors to 2 of 255 per channel.
 * @param a - One value.
 * @param b - The other.
 * @returns True when they agree.
 */
function agree(a: StyleValue | null, b: StyleValue | null): boolean {
    if (a === b) {
        return true;
    }

    if (typeof a === "number" && typeof b === "number") {
        return Math.abs(a - b) <= 1e-5 * Math.max(Math.abs(a), Math.abs(b), 1e-9);
    }

    const hex = /^#[0-9a-f]{6}$/;
    if (typeof a === "string" && typeof b === "string" && hex.test(a) && hex.test(b)) {
        return [1, 3, 5].every(
            (k) => Math.abs(Number.parseInt(a.slice(k, k + 2), 16) - Number.parseInt(b.slice(k, k + 2), 16)) <= 2,
        );
    }

    return false;
}

/** The prefix of a path that reads a record's attribute. */
const DATA_PREFIX = "data.";

/** Turns one kind's layers into rules. */
/**
 * A binding's stops as the points of a continuous mapping.
 * @param stops - The stops.
 * @param convert - How a channel value becomes the property's value.
 * @returns The points, or null when a value does not convert.
 */
function stopPoints(
    stops: NonNullable<Extract<Binding, { by: Path }>["stops"]>,
    convert: (value: unknown) => StyleValue | null,
): ContinuousPoint[] | null {
    const points: ContinuousPoint[] = [];
    for (const stop of stops) {
        const value = convert(stop.value);
        const below = convert(stop.below ?? stop.value);
        const above = convert(stop.above ?? stop.value);
        if (value === null || below === null || above === null) {
            return null;
        }

        points.push({ at: stop.at, below, value, above });
    }
    return points;
}

/** A channel's values as neutral properties. */
interface NeutralChannel {
    /** The properties it writes (a node size writes the width and the height). */
    readonly properties: readonly string[];
    /** Its values, converted, by row. */
    readonly values: (StyleValue | null)[];
    /** How one of its values becomes the properties' value. */
    readonly convert: (value: unknown) => StyleValue | null;
}

/** A rule being written from a layer. */
interface RuleBody {
    readonly set: Record<string, StyleValue>;
    readonly map: Record<string, Mapping>;
    /** Why a property was written as per-element values, when one was. */
    reason: StyleRuleReason | undefined;
}

class KindExport {
    readonly #input: LayersToStylesInput;
    readonly #kind: StyleTarget;
    readonly #n: number;
    /** Per layer id, per channel, what the layer painted each element. */
    readonly #painted = new Map<string, Map<string, unknown[]>>();
    readonly #columns = new Map<string, StyleColumn>();
    /** Per file-style path, the key it is written under. */
    readonly #fileKeys = new Map<string, string>();
    readonly #rules: StyleRule[] = [];
    readonly #ruleIds = new Set<string>();
    readonly flattened: FlattenedLayer[] = [];
    readonly unwritten: { target: StyleTarget; property: string; count: number }[] = [];
    /** The id of the rule the element's own base layers became, once run. */
    base: string | null = null;

    /**
     * Read what every element of the kind is painted.
     * @param input - The stack and the graph.
     * @param kind - Nodes or edges.
     */
    constructor(input: LayersToStylesInput, kind: StyleTarget) {
        this.#input = input;
        this.#kind = kind;
        const ids: readonly (NodeId | EdgeId)[] = input.ids[kind];
        this.#n = ids.length;
        ids.forEach((id, row) => {
            const target: ExplainTarget = kind === "node" ? { node: id } : { edge: id as EdgeId };
            for (const contribution of input.explain(target).contributions) {
                let channels = this.#painted.get(contribution.layerId);
                if (channels === undefined) {
                    channels = new Map();
                    this.#painted.set(contribution.layerId, channels);
                }

                for (const [channel, value] of Object.entries(contribution.values)) {
                    let values = channels.get(channel);
                    if (values === undefined) {
                        values = new Array<unknown>(this.#n).fill(null);
                        channels.set(channel, values);
                    }

                    values[row] = value;
                }
            }
        });
    }

    /**
     * The rules, bottom first, and the style columns they read.
     * @returns Them.
     */
    run(): { rules: StyleRule[]; ranks: number[]; columns: Map<string, StyleColumn> } {
        const { stack } = this.#input;
        const own = stack.filter((entry) => entry.layer.target === this.#kind);
        const base = own.filter(
            (entry) => entry.layer.source.by === "element" && entry.layer.source.reason === "default",
        );
        // Each rule's place in the whole stack, so the two kinds' rules interleave as their layers do.
        const ranks: number[] = [];
        const ranked = (rank: number): void => {
            while (ranks.length < this.#rules.length) {
                ranks.push(rank);
            }
        };
        if (base.length > 0) {
            this.#defaults(base);
        }

        ranked(-1);
        own.forEach((entry, at) => {
            const { layer } = entry;
            if (layer.source.by !== "element" && layer.enabled && !readsViewState(layer.selector)) {
                this.#layer(entry, at);
                ranked(stack.indexOf(entry));
            }
        });
        this.#hidden();
        ranked(stack.length);
        return { rules: this.#rules, ranks, columns: this.#columns };
    }

    /**
     * A rule id no rule of this kind holds yet.
     * @param base - The wanted id.
     * @returns It, with `#2`, `#3`... after it when taken.
     */
    #ruleId(base: string): string {
        let id = base;
        let n = 2;
        while (this.#ruleIds.has(id)) {
            id = `${base}#${String(n)}`;
            n++;
        }

        this.#ruleIds.add(id);
        return id;
    }

    /**
     * Keep a style column under a fresh key.
     * @param base - What the key says.
     * @param values - The values by row.
     * @returns The key.
     */
    #keep(base: string, values: StyleColumn): string {
        let key = base;
        let n = 2;
        while (this.#columns.has(key)) {
            key = `${base}.${String(n)}`;
            n++;
        }

        this.#columns.set(key, values);
        return key;
    }

    /**
     * The reference a path is read through in the file, or null when the file will not hold it.
     * @param path - The path a layer reads.
     * @returns The reference.
     */
    #refOf(path: Path): ColumnRef | null {
        const computed = computedOf(path);
        if (computed !== undefined) {
            return this.#kind === "node" ? { computed } : null;
        }

        const parts = parseFileStylePath(path);
        if (parts !== undefined) {
            return parts.kind === this.#kind ? this.#fileStyleRef(path, parts) : null;
        }

        if (!path.startsWith(DATA_PREFIX)) {
            return null;
        }

        const column = path.slice(DATA_PREFIX.length);
        const table = this.#kind === "node" ? this.#input.snapshot.nodes : this.#input.snapshot.edges;
        return table.has(column) && !column.startsWith("graphty.") ? { data: column } : null;
    }

    /**
     * The reference of a file-style value a layer reads: written under its own key, so a load of
     * the file finds it again under the same key.
     * @param path - The path.
     * @param parts - Its parts.
     * @param parts.namespace - The load's namespace.
     * @param parts.key - The column's key.
     * @returns The reference, or null when the store holds no such column or its key is taken.
     */
    #fileStyleRef(path: Path, parts: { namespace: string; key: string }): ColumnRef | null {
        const known = this.#fileKeys.get(path);
        if (known !== undefined) {
            return { style: known };
        }

        const held = fileStyleColumn(this.#input.fileStyles, parts.namespace, this.#kind, parts.key);
        // Two loads' columns of one key cannot both keep it: the second is not carried as itself.
        if (held === undefined || this.#columns.has(parts.key)) {
            return null;
        }

        const values = this.#input.ids[this.#kind].map((id) => held.get(id) ?? null);
        this.#columns.set(parts.key, values);
        this.#fileKeys.set(path, parts.key);
        return { style: parts.key };
    }

    /**
     * What one rule alone gives each element for one property, as graph-io reads it.
     * @param where - The rule's predicate.
     * @param property - The property.
     * @param write - How the rule writes it.
     * @returns The values by row.
     */
    #resolve(where: Predicate, property: string, write: { set: StyleValue } | { map: Mapping }): (StyleValue | null)[] {
        const rule: StyleRule = {
            id: "probe",
            target: this.#kind,
            role: "group",
            origin: "declared",
            where,
            ...("set" in write ? { set: { [property]: write.set } } : { map: { [property]: write.map } }),
        };
        return [...resolveStyles(this.#styles([rule]), this.#kind, property as StyleProperty, this.#input.snapshot)];
    }

    /**
     * Styles holding some rules over this kind's columns, for resolving them.
     * @param rules - The rules.
     * @returns The styles.
     */
    #styles(rules: readonly StyleRule[]): ExtractedStyles {
        const { snapshot } = this.#input;
        const empty = new Map<string, StyleColumn>();
        return {
            styles: {
                version: 1,
                source: { format: this.#input.format, dialect: "graphty", tool: "graphty" },
                units: { length: "px" },
                graph: {},
                rules,
                notes: [],
            },
            columns:
                this.#kind === "node" ? { node: this.#columns, edge: empty } : { node: empty, edge: this.#columns },
            features: { node: [], edge: [] },
            fingerprint: styleFingerprint(snapshot),
        };
    }

    /**
     * The element's base layers as the defaults of the writing tool.
     * @param base - The base layers.
     */
    #defaults(base: readonly CompiledLayer[]): void {
        const set: Record<string, StyleValue> = {};
        for (const { layer } of base) {
            for (const [channel, value] of Object.entries(layer.set ?? {})) {
                const written = this.#neutral(channel, [value]);
                if (written === null) {
                    continue;
                }

                for (const property of written.properties) {
                    set[property] = written.values[0] as StyleValue;
                }
            }
        }

        this.base = this.#ruleId(`${this.#kind}.defaults`);
        this.#rules.push({
            id: this.base,
            target: this.#kind,
            role: "defaults",
            origin: "tool",
            where: { all: true },
            set,
        });
    }

    /**
     * A channel's values as one property's: its neutral property when every value has one, else
     * `graphty:<channel>`.
     * @param channel - The channel.
     * @param values - The values.
     * @returns The properties and the values converted, or null when no scalar holds them.
     */
    #neutral(channel: string, values: readonly unknown[]): NeutralChannel | null {
        const known = PLANS[this.#kind].get(channel);
        if (known !== undefined) {
            const converted = values.map((value) => (value === null ? null : known.toNeutral(value)));
            if (converted.every((value, i) => value !== null || values[i] === null)) {
                return { properties: known.properties, values: converted, convert: known.toNeutral };
            }
        }

        const converted = values.map((value) => (value === null ? null : graphtyValue(value)));
        if (converted.some((value, i) => value === null && values[i] !== null)) {
            return null;
        }

        return { properties: [`graphty:${channel}`], values: converted, convert: graphtyValue };
    }

    /**
     * One layer as one rule.
     * @param entry - The layer.
     * @param at - Its place among this kind's layers.
     */
    #layer(entry: CompiledLayer, at: number): void {
        const { layer } = entry;
        const painted = this.#painted.get(layer.id) ?? new Map<string, unknown[]>();
        const id = this.#ruleId(layer.name);
        const paintedRows = Array.from({ length: this.#n }, (_unused, row) =>
            [...painted.values()].some((values) => values[row] !== null && values[row] !== undefined),
        );
        const where = this.#whereOf(layer.selector, paintedRows, at);
        const body: RuleBody = { set: {}, map: {}, reason: undefined };
        const channels = new Set<string>([...Object.keys(layer.set ?? {}), ...Object.keys(layer.encode ?? {})]);
        for (const channel of channels) {
            const drawn = painted.get(channel) ?? new Array<unknown>(this.#n).fill(null);
            const written = this.#neutral(channel, drawn);
            if (written === null) {
                // A whole label style: no scalar holds it; the layer itself carries it to graphty.
                this.#unwritten(entry, channel, drawn);
            } else {
                this.#channel({ entry, at, where, channel: channel as Channel }, written, body);
            }
        }
        const { set, map, reason } = body;

        const spec = this.#specOf(entry);
        this.#rules.push({
            id,
            target: this.#kind,
            role: roleOf(layer.kind, Object.keys(map).length > 0),
            origin: "declared",
            where,
            ...(Object.keys(set).length > 0 ? { set } : {}),
            ...(Object.keys(map).length > 0 ? { map } : {}),
            facts: {
                elements: paintedRows.filter(Boolean).length,
                ...(reason === undefined ? {} : { reason }),
            },
            ...(spec === null ? {} : { ext: { [LAYER_SPEC_EXT]: spec } }),
        });
    }

    /**
     * One channel of a layer into its rule: each of its properties as a constant or a mapping that gives exactly what
     * the layer painted, else its painted values as a style column the rule passes through.
     * @param at - The layer, its place, its rule's predicate and the channel.
     * @param at.entry - The layer.
     * @param at.at - Its place among this kind's layers.
     * @param at.where - The rule's predicate.
     * @param at.channel - The channel.
     * @param written - The channel's values as neutral properties.
     * @param body - The rule's constants, mappings and reason, added to.
     */
    #channel(
        at: {
            readonly entry: CompiledLayer;
            readonly at: number;
            readonly where: Predicate;
            readonly channel: Channel;
        },
        written: NeutralChannel,
        body: RuleBody,
    ): void {
        const { layer } = at.entry;
        const binding = layer.encode?.[at.channel];
        const literal =
            layer.set?.[at.channel] ?? (binding !== undefined && "value" in binding ? binding.value : undefined);
        // The properties of one channel drawn from one column (a node's width and height),
        // so the load that reads the file sees one value drawn twice, not two.
        let flat: string | null = null;
        for (const property of written.properties) {
            if (this.#exactly(at.where, property, { written, literal, binding }, body)) {
                continue;
            }

            const why: StyleRuleReason =
                binding !== undefined && "by" in binding && this.#refOf(binding.by) === null ? "RESULT_PATH" : "SCALE";
            body.reason ??= why;
            flat ??= this.#keep(`layer.${String(at.at)}.${property}`, written.values);
            body.map[property] = { kind: "passthrough", by: { style: flat } };
            const count = written.values.filter((value) => value !== null).length;
            if (count > 0) {
                this.flattened.push({ layer: layer.name, target: this.#kind, property, reason: why, count });
            }
        }
    }

    /**
     * Writes one property as the layer's constant, or as its mapping, when that gives exactly what the layer painted.
     * @param where - The rule's predicate.
     * @param property - The property.
     * @param from - The channel's neutral values, the layer's constant and its binding.
     * @param from.written - The channel's values as neutral properties.
     * @param from.literal - The layer's constant for the channel, or undefined.
     * @param from.binding - The layer's binding of the channel, or undefined.
     * @param body - The rule's constants and mappings, added to.
     * @returns True when it is written exactly.
     */
    #exactly(
        where: Predicate,
        property: string,
        from: { readonly written: NeutralChannel; readonly literal: unknown; readonly binding: Binding | undefined },
        body: RuleBody,
    ): boolean {
        const { written, literal, binding } = from;
        const fixed = literal === undefined ? null : written.convert(literal);
        if (fixed !== null && this.#exact(where, property, { set: fixed }, written.values)) {
            body.set[property] = fixed;
            return true;
        }

        const mapping = binding !== undefined && "by" in binding ? this.#mappingOf(binding, written.convert) : null;
        if (mapping !== null && "map" in mapping && this.#exact(where, property, mapping, written.values)) {
            body.map[property] = mapping.map;
            return true;
        }

        return false;
    }

    /**
     * Note a channel no rule carries, unless the layer itself goes into the file.
     * @param entry - The layer.
     * @param channel - The channel.
     * @param drawn - What it painted.
     */
    #unwritten(entry: CompiledLayer, channel: string, drawn: readonly unknown[]): void {
        if (this.#input.keepsBlock !== false && this.#specOf(entry) !== null) {
            return;
        }

        const count = drawn.filter((value) => value !== null && value !== undefined).length;
        const property = `graphty:${channel}`;
        const held = this.unwritten.find((note) => note.property === property);
        if (held === undefined) {
            this.unwritten.push({ target: this.#kind, property, count });
        } else {
            held.count += count;
        }
    }

    /**
     * Whether a rule writing one property gives exactly what the layer painted.
     * @param where - The rule's predicate.
     * @param property - The property.
     * @param write - How the rule writes it.
     * @param want - What the layer painted, converted, by row.
     * @returns True when every element agrees.
     */
    #exact(
        where: Predicate,
        property: string,
        write: { set: StyleValue } | { map: Mapping },
        want: readonly (StyleValue | null)[],
    ): boolean {
        const got = this.#resolve(where, property, write);
        return got.every((value, row) => agree(value, want[row]));
    }

    /**
     * The predicate of a layer's selector: short, matching at least every element the layer
     * paints, or a membership value written onto those elements.
     * @param scoped - The selector, with any scope a load put on it.
     * @param painted - Per row, whether the layer painted it.
     * @param at - The layer's place, for the membership key.
     * @returns The predicate.
     */
    #whereOf(scoped: LayerSpec["selector"], painted: readonly boolean[], at: number): Predicate {
        const selector = this.#unscoped(scoped);
        let where: Predicate | null = null;
        if (selector.match === "everything") {
            where = { all: true };
        } else if (selector.match === "has") {
            const ref = this.#refOf(selector.path);
            where = ref === null ? null : { has: ref };
        }

        if (where !== null) {
            const matched = this.#resolve(where, "graphty:member", { set: true });
            if (painted.every((paints, row) => !paints || matched[row] !== null)) {
                return where;
            }
        }

        const key = this.#keep(
            `layer.${String(at)}.member`,
            painted.map((paints) => (paints ? true : null)),
        );
        return { has: { style: key } };
    }

    /**
     * A binding as a mapping of graph-io's, when it has one.
     * @param binding - The binding.
     * @param binding.by - The path it reads.
     * @param convert - How a channel value becomes the property's value.
     * @returns The mapping, or null.
     */
    #mappingOf(
        binding: Extract<Binding, { by: Path }>,
        convert: (value: unknown) => StyleValue | null,
    ): { map: Mapping } | null {
        const by = this.#refOf(binding.by);
        if (by === null || binding.palette !== undefined) {
            return null;
        }

        if (binding.stops !== undefined) {
            const points = stopPoints(binding.stops, convert);
            return points === null ? null : { map: { kind: "continuous", by, points } };
        }

        const scale = binding.scale ?? "passthrough";
        if (scale === "passthrough") {
            if (binding.map === undefined) {
                return { map: { kind: "passthrough", by } };
            }

            const entries = Object.entries(binding.map).map(([key, value]): [string, StyleValue | null] => [
                key,
                convert(value),
            ]);
            return entries.some(([, value]) => value === null)
                ? null
                : { map: { kind: "discrete", by, table: entries as [string, StyleValue][] } };
        }

        const { domain, range } = binding;
        if (scale === "linear" && Array.isArray(domain) && Array.isArray(range) && domain[0] < domain[1]) {
            const ends = range.map((value) => convert(value));
            if (ends[0] === null || ends[1] === null) {
                return null;
            }

            const point = (x: number, value: StyleValue): ContinuousPoint => ({
                at: x,
                below: value,
                value,
                above: value,
            });
            return {
                map: { kind: "continuous", by, points: [point(domain[0], ends[0]), point(domain[1], ends[1])] },
            };
        }

        return null;
    }

    /**
     * The layer as `applyTemplate` takes it, when every path it reads will be in the file: its
     * file-style paths are written under the same keys, its data columns are written, and the live
     * degrees are graphty's own.
     * @param entry - The layer.
     * @returns The spec, or null.
     */
    #specOf(entry: CompiledLayer): LayerSpec | null {
        const { layer } = entry;
        const selector = this.#unscoped(layer.selector);
        const dropped = this.#scopeOf(layer.selector);
        if (
            !entry.reads.every(
                (path) => (selector !== layer.selector && path === dropped) || this.#refOf(path) !== null,
            )
        ) {
            return null;
        }

        // A selector by ids or by a set's members goes as it is: a load keeps a few node ids, and
        // sets the rest aside with a note, keeping the layer's name and kind.
        return {
            name: layer.name,
            target: layer.target,
            kind: layer.kind,
            selector,
            ...(layer.set === undefined ? {} : { set: layer.set }),
            ...(layer.encode === undefined ? {} : { encode: layer.encode }),
            ...(layer.userData === undefined ? {} : { userData: layer.userData }),
        };
    }

    /**
     * The file-style path a load scoped a layer to (`has <path>`, or `(...) && <path> != null`).
     * @param selector - The layer's selector.
     * @returns The path, or null for a selector no load scoped.
     */
    #scopeOf(selector: LayerSpec["selector"]): Path | null {
        let path: string | null = null;
        if (selector.match === "has") {
            ({ path } = selector);
        } else if (selector.match === "expression") {
            const quoted = SCOPED.exec(selector.where)?.[2];
            path = quoted === undefined ? null : unquotePath(quoted);
        }

        return path !== null && parseFileStylePath(path) !== undefined ? path : null;
    }

    /**
     * A layer's selector without the scope a load put on it, when that scope covers every element
     * this export writes: the scope is the load's own bookkeeping, and the load that reads the
     * file puts its own on. A scope that leaves elements out is kept, so the layer still paints
     * only its own load's elements.
     * @param selector - The layer's selector.
     * @returns The selector, unscoped when the scope selects everything.
     */
    #unscoped(selector: LayerSpec["selector"]): LayerSpec["selector"] {
        const path = this.#scopeOf(selector);
        const parts = path === null ? undefined : parseFileStylePath(path);
        if (parts?.kind !== this.#kind) {
            return selector;
        }

        const held = fileStyleColumn(this.#input.fileStyles, parts.namespace, this.#kind, parts.key);
        const ids = this.#input.ids[this.#kind];
        if (held === undefined || !ids.every((id) => held.get(id) !== null && held.get(id) !== undefined)) {
            return selector;
        }

        if (selector.match === "has") {
            return { match: "everything" };
        }

        const inner = SCOPED.exec((selector as { where: string }).where)?.[1] ?? "";
        return { match: "expression", where: inner };
    }

    /** The elements the session hides, as a rule the load gives back to the visibility filter. */
    #hidden(): void {
        const hidden = this.#input.hidden[this.#kind];
        if (!hidden.some(Boolean)) {
            return;
        }

        const key = this.#keep(
            "hidden",
            hidden.map((value) => (value ? true : null)),
        );
        this.#rules.push({
            id: this.#ruleId(`${this.#kind}.hidden`),
            target: this.#kind,
            role: "group",
            origin: "declared",
            where: { has: { style: key } },
            set: { visible: false },
            facts: { elements: hidden.filter(Boolean).length },
        });
    }
}

/** A selector a load scoped: `(<inner>) && <path> != \`null\``, the path a file-style path. */
const SCOPED = /^\((.*)\) && (graphty\.style\..+) != `null`$/s;

/**
 * A path as an expression writes it, each quoted segment read back as its text.
 * @param quoted - The path, with quoted segments.
 * @returns The path, or null when a quoted segment does not parse.
 */
function unquotePath(quoted: string): string | null {
    const segments: string[] = [];
    for (const match of quoted.matchAll(/"(?:[^"\\]|\\.)*"|[^."]+/g)) {
        try {
            segments.push(match[0].startsWith('"') ? (JSON.parse(match[0]) as string) : match[0]);
        } catch {
            return null;
        }
    }

    return segments.join(".");
}

/**
 * The role of the rule a layer makes.
 * @param kind - The layer's kind.
 * @param mapped - Whether the rule maps any value.
 * @returns The role.
 */
function roleOf(kind: string, mapped: boolean): StyleRuleRole {
    if (kind === "base") {
        return "defaults";
    }

    if (kind === "encoding") {
        return mapped ? "mapping" : "group";
    }

    return mapped ? "passthrough" : "group";
}

/**
 * The node and edge rules in the order of the layers they come from across both kinds.
 * @param nodes - The node rules and their places in the stack.
 * @param nodes.rules - The rules.
 * @param nodes.ranks - Each rule's place in the stack.
 * @param edges - The edge rules and their places in the stack.
 * @param edges.rules - The rules.
 * @param edges.ranks - Each rule's place in the stack.
 * @returns The rules, bottom first.
 */
function interleaved(
    nodes: { readonly rules: readonly StyleRule[]; readonly ranks: readonly number[] },
    edges: { readonly rules: readonly StyleRule[]; readonly ranks: readonly number[] },
): StyleRule[] {
    const out: StyleRule[] = [];
    let i = 0;
    let j = 0;
    while (i < nodes.rules.length || j < edges.rules.length) {
        if (j >= edges.rules.length || (i < nodes.rules.length && nodes.ranks[i] <= edges.ranks[j])) {
            out.push(nodes.rules[i++]);
        } else {
            out.push(edges.rules[j++]);
        }
    }

    return out;
}

/**
 * The layer stack as neutral styles, for graph-io to write.
 * @param input - The stack, the graph and what the element draws.
 * @returns The styles, and what lost its editable form.
 */
export function layersToStyles(input: LayersToStylesInput): LayersToStyles {
    const node = new KindExport(input, "node");
    const edge = new KindExport(input, "edge");
    const nodes = node.run();
    const edges = edge.run();
    const { snapshot } = input;
    return {
        extracted: {
            styles: {
                version: 1,
                source: { format: input.format, dialect: "graphty", tool: "graphty" },
                units: { length: "px" },
                graph: {},
                rules: interleaved(nodes, edges),
                notes: [],
            },
            columns: { node: nodes.columns, edge: edges.columns },
            features: { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
            fingerprint: styleFingerprint(snapshot),
        },
        flattened: [...node.flattened, ...edge.flattened],
        unwritten: [...node.unwritten, ...edge.unwritten],
        base: [node, edge].flatMap((kind, at) =>
            kind.base === null ? [] : [{ target: at === 0 ? ("node" as const) : ("edge" as const), id: kind.base }],
        ),
    };
}

/**
 * Whether a selector picks its elements by the reader's view of the graph -- what is selected or
 * on screen -- rather than by the graph. No file holds that state, so such a layer is about the
 * session, not the graph: written out, it would paint whatever was selected when the file was
 * saved, for good. It is left out of the file's styles.
 * @param selector - The layer's selector.
 * @returns True for a selector of the selection or the visible elements.
 */
function readsViewState(selector: LayerSpec["selector"]): boolean {
    return selector.match === "member" && (selector.of === "selection" || selector.of === "visible");
}
