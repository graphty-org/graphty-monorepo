/**
 * @file "Why is this node red?", answered in one call -- and the verb that makes the answer
 * editable.
 *
 * WHAT THIS REPLACES. A consumer holding a selected node and a stack of layers has to answer
 * three questions at once: what is this element painted, which layer painted each part of it, and
 * can a person change any of it here. Without a door for that, the consumer reconstructs it from
 * the outside: `graphty/src/components/shell/inspector/calculatedChannels.ts` spends 311 lines
 * prefix-matching the element's own dotted style paths back to five channel names, and its header
 * records the real reason it exists -- the element's internal merge order means a rule beats a
 * hand edit ON THE SAME REPAINT, so a control offered for a calculated channel would take a
 * value, write it, and be overwritten before the frame was drawn. That is a fact about the
 * element's merge, so the element is what should state it. {@link explainStyle} does, in
 * {@link ChannelExplanation.editable} and its `reason`.
 *
 * THE ANSWER IS COMPUTED THE WAY THE PICTURE WAS. The stack is walked bottom first, each layer's
 * selector is asked about this one element, and each of its prepared bindings is asked for this
 * one element's value -- the same order, the same closures and the same bindings the repaint
 * used. It is therefore not a second implementation of the merge that can drift from the first:
 * a change to how layers stack changes both readings, because there is one reading.
 *
 * THIS IS THE ONE CASE THE COLUMNAR REPAINT LEAVES TO A CALLER. Building a 23-key resolved style
 * costs 47 ms at fifty thousand nodes, so the repaint keeps columns and materialises a style only
 * where something asks about ONE element. This is that ask. It is O(the stack's depth), it
 * allocates one object, and it is a synchronous read like every other question about state the
 * session already holds.
 *
 * RESOLVING TO A FIXED VALUE IS A READ TOO. {@link resolveToStatic} works out the value a rule
 * reduces to and the patch that writes it, and changes nothing: applying the patch is
 * `styles.update()`, which is a command, takes its turn in the queue and repaints. Computing the
 * patch here and committing it there keeps the law that a write is a `Run` and a read is a
 * property, and it lets a consumer show a person the value before it is applied.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel, ChannelValue, EdgeId, Encoding, LayerId, LayerSpec, NodeId, Path } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { CHANNELS, type ChannelValues, isChannel } from "./channels";
import { type PreparedBinding, requireChannel } from "./encoding";
import type { CompiledLayer, Layer, PathDirectory } from "./Layer";
import type { EncodingLookup } from "./legend";
import { columnsFor, type ElementColumns, type SelectorSource, type SelectorTarget } from "./predicate";
import type { ResolvedStyle } from "./repaint";

// ---------------------------------------------------------------------------------------------
// What an explanation is
// ---------------------------------------------------------------------------------------------

/** The element being asked about: one node, or one edge. */
export type ExplainTarget = { readonly node: NodeId } | { readonly edge: EdgeId };

/** One layer's share of what an element is painted. */
export interface StyleContribution {
    /** The layer. */
    readonly layerId: LayerId;
    /** What it is called, so a list reads without a second lookup. */
    readonly name: string;
    /** The channels it painted on this element, in the order it painted them. */
    readonly properties: readonly Channel[];
    /** What it painted each of them. A later layer may have painted over any of these. */
    readonly values: Readonly<Record<string, unknown>>;
}

/** One channel of the merged style: who won it, and whether a person can change it here. */
export interface ChannelExplanation {
    /** The channel. */
    readonly channel: Channel;
    /** The topmost layer that painted it, which is the one a reader is looking at. */
    readonly layerId: LayerId;
    /** Whether that layer wrote a fixed value or worked one out from the data. */
    readonly mode: "static" | "encoded";
    /** Whether a consumer may offer a control that writes this channel on that layer. */
    readonly editable: boolean;
    /** Why not, when it is not. A sentence, written for the person who would have edited it. */
    readonly reason?: string;
}

/** Everything there is to say about why one element looks the way it does. */
export interface StyleExplanation {
    /** Everything the element is painted, with the topmost writer of each channel standing. */
    readonly merged: ResolvedStyle;
    /** Every layer that painted any of it, BOTTOM FIRST, which is the order they painted in. */
    readonly contributions: readonly StyleContribution[];
    /**
     * One entry per channel something painted, in the order the channel table lists them.
     *
     * The table's order rather than the paint order, because a properties panel draws one row per
     * channel and its rows must not move when a layer is added.
     */
    readonly channels: readonly ChannelExplanation[];
}

/** One value a channel is painted across several elements, and the layer that decided it. */
export interface ChannelShare {
    /** The value, as {@link StyleExplanation.merged} reports it for one element. */
    readonly value: unknown;
    /** The topmost layer that painted it. */
    readonly layerId: LayerId;
    /** How many of the elements are painted this value by this layer. */
    readonly count: number;
}

/**
 * One channel across several elements: whether every element painted on it agrees, and on what.
 *
 * Two elements agree only when they carry the same value AND the same layer decided it, so a
 * layer that writes the value the layer beneath already wrote is a second answer, not the same
 * one. Elements nothing painted on the channel are left out of the comparison and counted in
 * `unpainted`.
 */
export type ChannelAgreement =
    | {
          /** The channel. */
          readonly channel: Channel;
          /** Every painted element carries the same value from the same layer. */
          readonly state: "agree";
          /** The value they all carry. */
          readonly value: unknown;
          /** The layer that decided it for all of them. */
          readonly layerId: LayerId;
          /** How many elements of this channel's kind nothing painted on it. */
          readonly unpainted: number;
      }
    | {
          /** The channel. */
          readonly channel: Channel;
          /** The painted elements carry more than one value, or one value from more than one layer. */
          readonly state: "mixed";
          /** Each value and deciding layer, most elements first. */
          readonly breakdown: readonly ChannelShare[];
          /** How many elements of this channel's kind nothing painted on it. */
          readonly unpainted: number;
      };

/** How several elements look, channel by channel. */
export interface StyleAgreement {
    /**
     * One entry per channel something painted on at least one element, in the order the channel
     * table lists them.
     */
    readonly channels: readonly ChannelAgreement[];
}

/**
 * How many elements one layer covers, and on how many it decides each channel it writes.
 *
 * Counts only, never ids, so it stays small at any graph size.
 * @since 3.16.0
 */
export interface StyleCounts {
    /**
     * How many elements the layer's selector selects, whether or not the layer is shown. A hidden
     * layer still matches its elements; it decides none of them.
     */
    readonly matched: number;
    /**
     * For each channel the layer writes, on how many of the matched elements it is the layer the
     * picture shows: the topmost layer that painted that channel there, worked out by the same walk
     * as `explain` and `agreement`. Every channel the layer writes has a key, 0 when a layer above
     * paints over all of it or the layer is hidden.
     */
    readonly painted: Readonly<Partial<Record<Channel, number>>>;
    /** How many matched elements carry no value (absent or null) for a field the layer reads. */
    readonly noValue: number;
    /**
     * How many matched elements carry a value the layer's scale has no place for, such as a zero
     * or a negative number under a logarithmic scale, or a number outside an explicit domain the
     * scale does not clamp.
     */
    readonly outsideScale: number;
    /**
     * Changes whenever these counts may have changed: on every `style:changed`, and on every change
     * to the data or the run results the layers read. Equal revisions mean equal counts.
     */
    readonly revision: string;
}

/** The elements an agreement is read over, as dense indices. */
export interface AgreementElements {
    /** The nodes. */
    readonly nodes: Iterable<number>;
    /** The edges. */
    readonly edges: Iterable<number>;
}

/** A layer that cannot paint because this session answers none of what it reads. */
export interface UnboundLayer {
    /** The layer. */
    readonly layerId: LayerId;
    /** Why it paints nothing, in a sentence. */
    readonly reason: string;
    /** The paths it reads that nothing in this session answers. */
    readonly needs: readonly Path[];
}

/** What converting a rule to a fixed value comes to. */
export interface StaticResolution {
    /** The layer the rule is on. */
    readonly layerId: LayerId;
    /** The channel it paints. */
    readonly channel: Channel;
    /** The fixed value the rule reduces to, in the form a layer is authored with. */
    readonly value: ChannelValue;
    /**
     * The patch that makes the channel a fixed value, for `styles.update(layerId, patch)`.
     *
     * `encode` is present and `undefined` when this was the layer's last rule, which is how an
     * update CLEARS a key rather than leaving it as it was.
     */
    readonly patch: Partial<LayerSpec>;
}

/** Everything an explanation is read from. */
export interface ExplainSources {
    /**
     * The stack with every selector compiled, BOTTOM FIRST, as `styles.compiled()` returns it.
     * @returns The compiled layers.
     */
    stack(): readonly CompiledLayer[];
    /** Where the prepared encodings are read from, in the order the repaint applies them. */
    readonly encoding: EncodingLookup;
    /** What the session can answer about one element, which the selectors were compiled against. */
    readonly elements: SelectorSource;
    /**
     * The dense index of one node.
     * @param id - The node id.
     * @returns Its index, or undefined when the session holds no node with that id.
     */
    nodeIndex(id: NodeId): number | undefined;
    /**
     * The dense index of one edge.
     * @param id - The edge id.
     * @returns Its index, or undefined when the session holds no edge with that id.
     */
    edgeIndex(id: EdgeId): number | undefined;
    /**
     * Which paths this session answers. Absent means it cannot say, and no layer is called
     * unbound -- claiming a path is wrong when nothing was asked would turn every correct layer
     * into a warning.
     */
    readonly paths?: PathDirectory;
}

// ---------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------

/** What an element nothing painted is explained as. */
const NOTHING_PAINTED: StyleExplanation = Object.freeze({
    merged: Object.freeze({}),
    contributions: Object.freeze([]),
    channels: Object.freeze([]),
});

/** Nothing was unbound. */
const NONE_UNBOUND: readonly UnboundLayer[] = Object.freeze([]);

/** A detached layer needs no path. */
const NO_NEEDS: readonly Path[] = Object.freeze([]);

// ---------------------------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------------------------

/**
 * The refusal a call naming an element this session does not hold gets.
 * @param target - What was asked about.
 * @returns The error to throw.
 */
function unknownElement(target: ExplainTarget): GraphtyError {
    const kind = "node" in target ? "node" : "edge";
    const id = "node" in target ? target.node : target.edge;

    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `There is no ${kind} with the id "${String(id)}" in this session.`,
        source: "style",
        details: { kind, id },
    });
}

/**
 * The refusal a call that cannot resolve a rule gets.
 * @param message - What is wrong, in a sentence.
 * @param layerId - The layer it named.
 * @param details - The offending values.
 * @returns The error to throw.
 */
function cannotResolve(message: string, layerId: LayerId, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message,
        source: "style",
        target: { kind: "layer", id: layerId },
        details,
    });
}

// ---------------------------------------------------------------------------------------------
// Walking the stack over one element
// ---------------------------------------------------------------------------------------------

/** Where one element sits, and what the session can read about it. */
interface Located {
    /** Whether it is a node or an edge. */
    readonly target: SelectorTarget;
    /** Its dense index. */
    readonly index: number;
}

/**
 * Find the element an explanation is about.
 * @param target - The node or edge it names.
 * @param sources - Where ids are resolved.
 * @returns Where it sits.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when this session holds no such element.
 */
function locate(target: ExplainTarget, sources: ExplainSources): Located {
    if ("node" in target) {
        const index = sources.nodeIndex(target.node);

        if (index === undefined) {
            throw unknownElement(target);
        }

        return { target: "node", index };
    }

    const index = sources.edgeIndex(target.edge);

    if (index === undefined) {
        throw unknownElement(target);
    }

    return { target: "edge", index };
}

/** What one layer painted on the element, while the walk is still in progress. */
interface Painting {
    /** The layer that painted it. */
    readonly layer: Layer;
    /** The channels it painted, in the order it painted them. */
    readonly properties: Channel[];
    /** What it painted each of them. */
    readonly values: Record<string, unknown>;
}

/** Who won one channel, and how. */
interface Winner {
    /** The layer. */
    readonly layer: Layer;
    /** Whether it wrote a fixed value or worked one out from the data. */
    readonly mode: "static" | "encoded";
    /** The path the rule reads, when it is a rule. */
    readonly path: Path | null;
}

/**
 * Whether a layer has anything to say about this element.
 * @param entry - The compiled layer.
 * @param at - Where the element sits.
 * @returns True when the layer is enabled, paints this kind of element, and matches it.
 */
function applies(entry: CompiledLayer, at: Located): boolean {
    const { layer, selector } = entry;

    if (!layer.enabled || layer.target !== at.target) {
        return false;
    }

    return selector.test === null || selector.test(at.index);
}

/** One layer of the stack with the bindings it paints from, looked up once per read. */
interface StackEntry {
    /** The compiled layer. */
    readonly entry: CompiledLayer;
    /** Its prepared bindings, in the order the repaint applies them. */
    readonly bindings: readonly PreparedBinding[];
}

/**
 * The stack, bottom first, with each layer's bindings looked up once.
 * @param sources - Where the stack and the bindings are read.
 * @returns The stack a walk reads.
 */
function prepareStack(sources: ExplainSources): readonly StackEntry[] {
    return sources.stack().map((entry) => ({ entry, bindings: sources.encoding(entry.layer.id) }));
}

/**
 * Walk the stack over one element, bottom first, and report every value a layer paints on it.
 *
 * THE ONE WALK. {@link explainStyle} and {@link styleAgreement} both read through this, so the
 * answer about one element and the answer about many cannot drift apart.
 * @param stack - The stack with its bindings.
 * @param at - Where the element sits.
 * @param columns - What the session can read about elements of its kind.
 * @param paint - Called once per value painted, in paint order; a later call for the same channel
 *     paints over an earlier one.
 */
function paintOne(
    stack: readonly StackEntry[],
    at: Located,
    columns: ElementColumns,
    paint: (layer: Layer, prepared: PreparedBinding, result: unknown) => void,
): void {
    for (const { entry, bindings } of stack) {
        if (!applies(entry, at)) {
            continue;
        }

        for (const prepared of bindings) {
            const value = prepared.path === null ? undefined : columns.value(at.index, prepared.path);
            const result = prepared.paint(value);

            if (result !== undefined) {
                paint(entry.layer, prepared, result);
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Whether a channel can be edited where it is
// ---------------------------------------------------------------------------------------------

/**
 * Why a channel cannot be edited on the layer that won it, or undefined when it can.
 *
 * TWO REFUSALS, IN THIS ORDER, because the first is the stronger one: an element-owned layer
 * refuses every edit whatever the channel is, so saying "convert the rule first" about one would
 * send a person down a road that also ends in `E_PROTECTED`.
 * @param winner - The layer that won the channel and how.
 * @param channel - The channel.
 * @returns The sentence, or undefined when a control may be offered.
 */
function refusal(winner: Winner, channel: Channel): string | undefined {
    const { layer, mode, path } = winner;

    if (layer.locked) {
        return (
            `"${layer.name}" belongs to the element, so it cannot be edited. ` +
            "Add a layer of your own above it instead."
        );
    }

    if (mode === "encoded") {
        return (
            `"${layer.name}" works ${channel} out from "${String(path)}", so a fixed value written here ` +
            "would be replaced the next time the layer paints. Resolve the rule to a fixed value first."
        );
    }

    return undefined;
}

// ---------------------------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------------------------

/**
 * Answer why one element looks the way it does.
 *
 * SYNCHRONOUS. It walks the stack once for one element, asks each layer's compiled selector about
 * it, and asks each prepared binding for its value -- the same closures the repaint ran. Nothing
 * is parsed, nothing is measured and no column is walked.
 * @param target - The node or the edge to explain.
 * @param sources - The stack, the prepared encodings, the element columns and the id map.
 * @returns The merged style, who contributed what, and which channels a person may edit here.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when the session holds no such element.
 */
export function explainStyle(target: ExplainTarget, sources: ExplainSources): StyleExplanation {
    const at = locate(target, sources);
    const style: Partial<ChannelValues> = {};
    const merged = style as Record<string, unknown>;
    const winners = new Map<Channel, Winner>();
    const painted = new Map<LayerId, Painting>();
    const order: Painting[] = [];

    paintOne(prepareStack(sources), at, columnsFor(sources.elements, at.target), (layer, prepared, result) => {
        const { channel } = prepared;
        merged[channel] = result;
        winners.set(channel, { layer, mode: prepared.path === null ? "static" : "encoded", path: prepared.path });

        let painting = painted.get(layer.id);
        if (painting === undefined) {
            painting = { layer, properties: [], values: {} };
            painted.set(layer.id, painting);
            order.push(painting);
        }

        if (!painting.properties.includes(channel)) {
            painting.properties.push(channel);
        }

        painting.values[channel] = result;
    });

    if (order.length === 0) {
        return NOTHING_PAINTED;
    }

    const contributions = order.map((painting): StyleContribution => ({
        layerId: painting.layer.id,
        name: painting.layer.name,
        properties: Object.freeze([...painting.properties]),
        values: Object.freeze({ ...painting.values }),
    }));

    const channels: ChannelExplanation[] = [];
    for (const channel of CHANNELS) {
        const winner = winners.get(channel);

        if (winner === undefined) {
            continue;
        }

        const reason = refusal(winner, channel);
        channels.push({
            channel,
            layerId: winner.layer.id,
            mode: winner.mode,
            editable: reason === undefined,
            ...(reason === undefined ? {} : { reason }),
        });
    }

    return {
        merged: Object.freeze(style),
        contributions: Object.freeze(contributions),
        channels: Object.freeze(channels),
    };
}

/** A tally of one channel across the elements read so far. */
interface Tally {
    /** Each value and deciding layer, keyed so equal answers fold together. */
    readonly shares: Map<string, { value: unknown; layerId: LayerId; count: number }>;
    /** How many elements something painted on this channel. */
    painted: number;
}

/**
 * The key two answers fold together under: the deciding layer and the value, compared by content.
 * @param layerId - The deciding layer.
 * @param value - The painted value.
 * @returns The key.
 */
function shareKey(layerId: LayerId, value: unknown): string {
    return JSON.stringify([layerId, typeof value, value]);
}

/**
 * Answer how several elements look, channel by channel.
 *
 * ONE PASS over the elements, and each one is read through the same walk {@link explainStyle}
 * takes, so what this says about an element is what an explanation of it says.
 * @param elements - The nodes and edges to read, as dense indices.
 * @param sources - The stack, the prepared encodings and the element columns.
 * @param only - One channel to restrict the answer to. Absent, every channel is answered.
 * @returns Per channel, the value they agree on or how they split, and how many nothing painted.
 * @throws A `GraphtyError` with code `E_UNKNOWN_CHANNEL` when `only` names no channel.
 */
export function styleAgreement(elements: AgreementElements, sources: ExplainSources, only?: Channel): StyleAgreement {
    if (only !== undefined) {
        requireChannel(only);
    }

    const stack = prepareStack(sources);
    const tallies = new Map<Channel, Tally>();
    const totals = { node: 0, edge: 0 };
    const winners = new Map<Channel, { layerId: LayerId; value: unknown }>();

    const read = (target: SelectorTarget, indices: Iterable<number>): void => {
        const columns = columnsFor(sources.elements, target);

        for (const index of indices) {
            totals[target]++;
            winners.clear();
            paintOne(stack, { target, index }, columns, (layer, prepared, result) => {
                if (only === undefined || prepared.channel === only) {
                    winners.set(prepared.channel, { layerId: layer.id, value: result });
                }
            });

            for (const [channel, { layerId, value }] of winners) {
                let tally = tallies.get(channel);
                if (tally === undefined) {
                    tally = { shares: new Map(), painted: 0 };
                    tallies.set(channel, tally);
                }

                tally.painted++;
                const key = shareKey(layerId, value);
                const share = tally.shares.get(key);
                if (share === undefined) {
                    tally.shares.set(key, { value, layerId, count: 1 });
                } else {
                    share.count++;
                }
            }
        }
    };

    read("node", elements.nodes);
    read("edge", elements.edges);

    const channels: ChannelAgreement[] = [];
    for (const channel of CHANNELS) {
        const tally = tallies.get(channel);

        if (tally === undefined) {
            continue;
        }

        const unpainted = totals[channel.startsWith("node.") ? "node" : "edge"] - tally.painted;
        const shares = [...tally.shares.values()];
        const [first] = shares;

        if (shares.length === 1 && first !== undefined) {
            channels.push({ channel, state: "agree", value: first.value, layerId: first.layerId, unpainted });
            continue;
        }

        // A stable sort: equal counts keep the order they were first met in.
        shares.sort((a, b) => b.count - a.count);
        const breakdown = shares.map((share): ChannelShare => Object.freeze({ ...share }));
        channels.push({ channel, state: "mixed", breakdown: Object.freeze(breakdown), unpainted });
    }

    return { channels: Object.freeze(channels) };
}

/**
 * Every channel a layer writes, each counted at 0.
 * @param layer - The layer.
 * @returns A tally with one key per channel the layer sets or encodes.
 */
function zeroPerChannel(layer: Layer): Partial<Record<Channel, number>> {
    const painted: Partial<Record<Channel, number>> = {};
    for (const channel of [...Object.keys(layer.set ?? {}), ...Object.keys(layer.encode ?? {})]) {
        if (isChannel(channel)) {
            painted[channel] = 0;
        }
    }

    return painted;
}

/**
 * What one element carries for the fields a layer reads.
 * @param own - The layer's prepared bindings.
 * @param columns - What the session can read about elements of the layer's kind.
 * @param index - The element.
 * @returns Whether it lacks a value for some field, and whether some value has no place on its scale.
 */
function readValues(
    own: readonly PreparedBinding[],
    columns: ElementColumns,
    index: number,
): { readonly missing: boolean; readonly outside: boolean } {
    let missing = false;
    let outside = false;
    for (const prepared of own) {
        if (prepared.path === null) {
            continue;
        }

        const value = columns.value(index, prepared.path);
        if (value === undefined || value === null) {
            missing = true;
        } else if (prepared.paintIgnoringHidden(value) === undefined) {
            outside = true;
        }
    }

    return { missing, outside };
}

/**
 * Count the channels one layer wins on one element, through the same walk `explain` takes.
 * @param stack - The stack with its bindings.
 * @param at - Where the element sits.
 * @param columns - What the session can read about elements of its kind.
 * @param layerId - The layer.
 * @param painted - The tally to add to.
 */
function countWins(
    stack: readonly StackEntry[],
    at: Located,
    columns: ElementColumns,
    layerId: LayerId,
    painted: Partial<Record<Channel, number>>,
): void {
    const winners = new Map<Channel, LayerId>();
    paintOne(stack, at, columns, (winner, prepared) => {
        winners.set(prepared.channel, winner.id);
    });
    for (const [channel, winner] of winners) {
        if (winner === layerId) {
            painted[channel] = (painted[channel] ?? 0) + 1;
        }
    }
}

/**
 * Count what one layer covers and where it wins.
 *
 * ONE PASS over the elements of the layer's kind. Each matched element is read through the same
 * walk {@link explainStyle} takes, so "this layer decides the colour of 77 nodes" agrees with an
 * explanation of each of those 77.
 * @param layerId - The layer.
 * @param elements - Every node and edge in the session, as dense indices.
 * @param sources - The stack, the prepared encodings and the element columns.
 * @param revision - What the caller says the counts are a reading of.
 * @returns The counts.
 * @throws A `GraphtyError` with code `E_UNKNOWN_LAYER` when the stack holds no layer with that id.
 */
export function styleCounts(
    layerId: LayerId,
    elements: AgreementElements,
    sources: ExplainSources,
    revision: string,
): StyleCounts {
    const { layer, selector } = requireLayer(layerId, sources);
    const own = sources.encoding(layerId);
    const painted = zeroPerChannel(layer);
    const stack = prepareStack(sources);
    const columns = columnsFor(sources.elements, layer.target);
    let matched = 0;
    let noValue = 0;
    let outsideScale = 0;

    for (const index of layer.target === "node" ? elements.nodes : elements.edges) {
        if (selector.test !== null && !selector.test(index)) {
            continue;
        }

        matched++;
        const { missing, outside } = readValues(own, columns, index);
        noValue += missing ? 1 : 0;
        outsideScale += outside ? 1 : 0;

        if (layer.enabled) {
            countWins(stack, { target: layer.target, index }, columns, layerId, painted);
        }
    }

    return { matched, painted: Object.freeze(painted), noValue, outsideScale, revision };
}

/**
 * The layers that paint nothing because this session answers none of what they read.
 *
 * NOT A FAILURE, and that is why it is reported rather than thrown: a layer naming a run that has
 * not been started yet is a correct layer over a session that will answer it later, and a layer
 * imported with a style document may name a column the next dataset does have. What it must never
 * be is invisible -- a confident empty screen reads exactly like a correct answer of zero.
 * A `{match:"member"}` layer whose scope cannot be resolved -- a set this project does not hold --
 * is reported as detached, whatever the directory says.
 * @param sources - The stack and the path directory. With no directory only detached layers are
 *     reported.
 * @returns One entry per layer that reads only paths nothing answers or is detached, bottom first.
 */
export function unboundLayers(sources: ExplainSources): readonly UnboundLayer[] {
    const directory = sources.paths;
    const unbound: UnboundLayer[] = [];

    for (const entry of sources.stack()) {
        const { layer, selector } = entry;
        // A scope that cannot be resolved (a set this project does not hold) is detached: kept,
        // reported, and painting nothing.
        const detached = selector.problem?.();

        if (detached !== undefined) {
            unbound.push({
                layerId: layer.id,
                reason: `"${layer.name}" names a scope that cannot be resolved, so it is detached and paints nothing. ${detached}`,
                needs: NO_NEEDS,
            });
            continue;
        }

        if (directory === undefined) {
            continue;
        }

        const wanted = new Set<Path>(selector.paths);

        for (const binding of Object.values(layer.encode ?? {})) {
            if (binding !== undefined && "by" in binding) {
                wanted.add(binding.by);
            }
        }

        if (wanted.size === 0) {
            continue;
        }

        const needs = [...wanted].filter((path) => !directory.answers(path, layer.target));

        if (needs.length === wanted.size) {
            unbound.push({
                layerId: layer.id,
                reason:
                    `"${layer.name}" reads ${needs.map((path) => `"${path}"`).join(", ")}, ` +
                    "which nothing in this session answers, so it paints nothing.",
                needs: Object.freeze(needs),
            });
        }
    }

    return unbound.length === 0 ? NONE_UNBOUND : Object.freeze(unbound);
}

// ---------------------------------------------------------------------------------------------
// Turning a rule into a fixed value
// ---------------------------------------------------------------------------------------------

/**
 * The value the rule is asked about when the caller named no element.
 *
 * The largest group for an encoding that names categories, and the middle of the extent for one
 * that reads numbers. Both are a value the rule actually measured, which is what makes the fixed
 * value a colour from this picture rather than an invented one.
 * @param prepared - The prepared binding.
 * @returns The value to ask it about, or undefined when it has nothing to be asked about.
 */
function representative(prepared: PreparedBinding): unknown {
    const [first] = prepared.categories;

    if (first !== undefined) {
        return first;
    }

    if (prepared.domain === null) {
        return undefined;
    }

    const [low, high] = prepared.domain;

    return low + (high - low) / 2;
}

/**
 * Turn what a channel is painted into what a layer is authored with.
 *
 * A colour comes back from the encoding as parsed components with its hex string alongside, and a
 * layer is written with the string: a document that says `"#4b0082"` explains itself, and one
 * that says four numbers does not.
 * @param painted - What the encoding painted.
 * @returns The authored form.
 */
function authored(painted: unknown): ChannelValue {
    if (typeof painted === "object" && painted !== null && "hex" in painted && typeof painted.hex === "string") {
        return painted.hex;
    }

    return painted as ChannelValue;
}

/**
 * What one element carries for a path.
 * @param path - The column path.
 * @param target - The node or edge to read.
 * @param sources - Where the element columns and the id map are.
 * @returns The value, or undefined when the element carries none.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when the session holds no such element.
 */
function read(path: Path, target: ExplainTarget, sources: ExplainSources): unknown {
    const at = locate(target, sources);

    return columnsFor(sources.elements, at.target).value(at.index, path);
}

/**
 * Find one layer in the stack.
 * @param layerId - The layer.
 * @param sources - Where the stack is read.
 * @returns The layer with its compiled selector.
 * @throws A `GraphtyError` with code `E_UNKNOWN_LAYER` when the stack holds no layer with that id.
 */
function requireLayer(layerId: LayerId, sources: ExplainSources): CompiledLayer {
    const stack = sources.stack();
    const found = stack.find((entry) => entry.layer.id === layerId);

    if (found === undefined) {
        throw new GraphtyError({
            code: "E_UNKNOWN_LAYER",
            message: `There is no style layer with the id "${layerId}".`,
            source: "style",
            target: { kind: "layer", id: layerId },
            details: { id: layerId, known: stack.map((entry) => entry.layer.id) },
        });
    }

    return found;
}

/**
 * Work out the fixed value a rule reduces to, and the patch that writes it.
 *
 * THE PAIRED VERB OF {@link explainStyle}. A channel a layer works out from the data cannot carry
 * an editable control, because the rule beats the edit on the same repaint. This is what a "make
 * this a fixed value" button calls: it answers the value and the patch, and CHANGES NOTHING --
 * the caller applies the patch with `styles.update()`, which is a command, takes its turn in the
 * queue and repaints.
 * @param layerId - The layer carrying the rule.
 * @param channel - The channel the rule paints.
 * @param sources - The stack, the prepared encodings and the element columns.
 * @param at - The element whose painted value to fix on. Absent, the rule is asked about the
 *     largest group it found, or the middle of the extent it measured.
 * @returns The fixed value and the patch that writes it.
 * @throws A `GraphtyError`: `E_PROTECTED` for an element-owned layer, `E_UNKNOWN_LAYER` when the
 *     stack holds no such layer, and `E_BAD_COMMAND` when that layer works the channel out from
 *     nothing or when the rule paints nothing at the value it was asked about.
 */
export function resolveToStatic(
    layerId: LayerId,
    channel: Channel,
    sources: ExplainSources,
    at?: ExplainTarget,
): StaticResolution {
    const { layer } = requireLayer(layerId, sources);

    if (layer.locked) {
        throw new GraphtyError({
            code: "E_PROTECTED",
            message:
                `"${layer.name}" belongs to the element, so it cannot be edited. ` +
                "Add a layer of your own above it instead.",
            source: "style",
            target: { kind: "layer", id: layer.id },
            details: { id: layer.id, source: layer.source, channel },
        });
    }

    const prepared = sources.encoding(layerId).find((binding) => binding.channel === channel && binding.path !== null);
    const path = prepared?.path;

    if (prepared === undefined || path === null || path === undefined) {
        throw cannotResolve(
            `"${layer.name}" does not work ${channel} out from the data, so there is no rule to resolve.`,
            layerId,
            { id: layerId, channel },
        );
    }

    const asked = at === undefined ? representative(prepared) : read(path, at, sources);
    const result = prepared.paint(asked);

    if (result === undefined) {
        throw cannotResolve(
            `"${layer.name}" paints nothing for ${channel} at the value it was asked about, so there is no fixed value to take.`,
            layerId,
            { id: layerId, channel, value: asked },
        );
    }

    const value = authored(result);
    const rest: Encoding = {};

    for (const [name, binding] of Object.entries(layer.encode ?? {})) {
        if (name !== channel && binding !== undefined && isChannel(name)) {
            rest[name] = binding;
        }
    }

    return {
        layerId,
        channel,
        value,
        patch: {
            set: { ...layer.set, [channel]: value },
            encode: Object.keys(rest).length === 0 ? undefined : rest,
        },
    };
}
