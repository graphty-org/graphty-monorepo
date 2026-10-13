/**
 * @file Rows: one entry of the style list that may paint nodes AND edges.
 *
 * A layer paints one kind, and `Layer.target` keeps saying which. A row that paints both kinds is
 * two layers, a node part and an edge part, sharing one selector and one id: the node part's id,
 * which both parts carry as `row`. The two parts sit next to each other in the stack, and
 * remove, move and the insertion places of the styles API treat the pair as one block, so the two
 * never drift apart and one undo step brings both back.
 *
 * A write to a row names a channel (`edge.width`) or a bare property (`color`), and goes to every
 * part whose kind has that channel: `color` paints both, `width` only the edges.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type {
    Binding,
    ChannelValue,
    LayerId,
    LayerSpec,
    Path,
    RuleTree,
    Selector,
    StaticStyle,
} from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { channelDescriptor } from "./channels";
import type { CompiledLayer, PathDirectory } from "./Layer";
import type { SelectorTarget } from "./predicate";
import { selectorRule } from "./selector";

/** What a row paints: nodes, edges, or both. */
export type RowTarget = SelectorTarget | "both";

/**
 * A row's literal values, keyed by a channel (`"edge.width"`) or by a bare property (`"color"`)
 * that reaches every part whose kind has `<kind>.<property>`.
 */
export type RowStyle = Readonly<Record<string, ChannelValue | undefined>>;

/** A row's bindings, keyed as {@link RowStyle} is. */
export type RowEncoding = Readonly<Record<string, Binding | undefined>>;

/** A row as `styles.addRow` takes it: a layer specification whose target may be `"both"`. */
export interface RowSpec extends Omit<LayerSpec, "target" | "set" | "encode" | "row"> {
    /** What it paints. `"both"` adds a node part and an edge part sharing the selector. */
    readonly target: RowTarget;
    /** Its literal values, routed to the parts whose kind has each channel. */
    readonly set?: RowStyle;
    /** Its bindings, routed the same way. */
    readonly encode?: RowEncoding;
}

/**
 * One write to every part of a row. `set` and `encode` merge one key deep into each part's own;
 * `undefined` clears a key. `name` and `enabled` (the row's eye) reach every part.
 */
export interface RowWrite {
    /**
     * What the row paints from now on: a missing part is added (sharing the row's name, rule and
     * eye, writing nothing until its first value) and a part no longer wanted is dropped, in the
     * same step as the rest of the write. The row keeps its id and its place.
     * @since 3.26.0
     */
    readonly target?: RowTarget;
    /** A new name for every part. */
    readonly name?: string;
    /** Whether every part paints. */
    readonly enabled?: boolean;
    /** Literal values, each to the parts whose kind has the channel. */
    readonly set?: RowStyle;
    /** Bindings, each to the parts whose kind has the channel. */
    readonly encode?: RowEncoding;
}

/** A row as the styles API reads it back. */
export interface RowParts {
    /** The row's id: its node part's id, or the one layer's id for a row of one kind. */
    readonly id: LayerId;
    /** The row's name, which every part carries. */
    readonly name: string;
    /** Whether it paints, which is every part's `enabled`. */
    readonly enabled: boolean;
    /** What it paints, from the parts it has. */
    readonly target: RowTarget;
    /** The layer painting its nodes, when it paints nodes. */
    readonly node?: LayerId;
    /** The layer painting its edges, when it paints edges. */
    readonly edge?: LayerId;
}

/**
 * The key a layer's row is known by.
 * @param entry - A layer in the stack.
 * @returns Its row id.
 */
function rowKey(entry: CompiledLayer): LayerId {
    return entry.layer.row ?? entry.layer.id;
}

/**
 * The parts of the row holding a layer, bottom first, as the stack holds them.
 * @param stack - The stack, bottom first.
 * @param id - Any part's id.
 * @returns The parts; empty when the stack holds no such layer.
 */
export function rowParts(stack: readonly CompiledLayer[], id: LayerId): CompiledLayer[] {
    const found = stack.find((entry) => entry.layer.id === id);
    if (found === undefined) {
        return [];
    }

    const key = rowKey(found);

    return stack.filter((entry) => rowKey(entry) === key);
}

/**
 * Read a row back.
 * @param parts - Its parts, from {@link rowParts}.
 * @returns The row, or undefined for no parts.
 */
export function rowOf(parts: readonly CompiledLayer[]): RowParts | undefined {
    const [first] = parts;
    if (first === undefined) {
        return undefined;
    }

    const node = parts.find((entry) => entry.layer.target === "node")?.layer.id;
    const edge = parts.find((entry) => entry.layer.target === "edge")?.layer.id;

    return Object.freeze({
        id: rowKey(first),
        name: first.layer.name,
        enabled: parts.every((entry) => entry.layer.enabled),
        target: node !== undefined && edge !== undefined ? "both" : first.layer.target,
        ...(node === undefined ? {} : { node }),
        ...(edge === undefined ? {} : { edge }),
    });
}

/**
 * The keys of a row write that reach one kind, as that kind's channels.
 * @param keyed - The row's values or bindings.
 * @param kind - The part's kind.
 * @returns The channel-keyed entries for that part.
 */
function routed<T>(keyed: Readonly<Record<string, T>>, kind: SelectorTarget): Record<string, T> {
    const out: Record<string, T> = {};
    for (const [key, value] of Object.entries(keyed)) {
        const channel = key.includes(".") ? key : `${kind}.${key}`;
        if (channel.startsWith(`${kind}.`) && channelDescriptor(channel) !== undefined) {
            out[channel] = value;
        }
    }

    return out;
}

/**
 * Refuse a write key that reaches no part of the row.
 * @param keyed - The row's values or bindings.
 * @param kinds - The row's kinds.
 * @param field - `set` or `encode`, for the refusal.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, reason `row-channel-unknown`.
 */
export function assertRouted(
    keyed: Readonly<Record<string, unknown>> | undefined,
    kinds: readonly SelectorTarget[],
    field: "set" | "encode",
): void {
    for (const key of Object.keys(keyed ?? {})) {
        if (!kinds.some((kind) => Object.keys(routed({ [key]: true }, kind)).length > 0)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `"${key}" is not a channel of the ${kinds.join(" or ")} this row paints.`,
                source: "style",
                details: { reason: "row-channel-unknown", field, key, kinds },
            });
        }
    }
}

/**
 * Merge one key deep, `undefined` clearing a key.
 * @param before - The part's own entries.
 * @param write - The routed write.
 * @returns The merged entries, or undefined when none remain.
 */
function merged<T>(
    before: Readonly<Record<string, T>> | undefined,
    write: Readonly<Record<string, T | undefined>>,
): Record<string, T> | undefined {
    const entries = Object.entries({ ...before, ...write }).filter(
        (entry): entry is [string, T] => entry[1] !== undefined,
    );

    return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

/**
 * The patch one part of a row takes from a row write.
 * @param part - The part's layer.
 * @param part.target - Its kind.
 * @param part.set - Its literal values.
 * @param part.encode - Its bindings.
 * @param write - The row write.
 * @returns The patch, or null when the write reaches nothing of this part.
 */
export function partPatch(
    part: { readonly target: SelectorTarget; readonly set?: StaticStyle; readonly encode?: LayerSpec["encode"] },
    write: RowWrite,
): Partial<LayerSpec> | null {
    const patch: { -readonly [K in keyof LayerSpec]?: LayerSpec[K] } = {};
    if (write.name !== undefined) {
        patch.name = write.name;
    }

    if (write.enabled !== undefined) {
        patch.enabled = write.enabled;
    }

    const set = routed(write.set ?? {}, part.target);
    if (Object.keys(set).length > 0) {
        patch.set = merged(part.set, set);
    }

    const encode = routed(write.encode ?? {}, part.target);
    if (Object.keys(encode).length > 0) {
        patch.encode = merged(part.encode, encode);
    }

    return Object.keys(patch).length === 0 ? null : patch;
}

/** The template id a starting row's layers carry, which is how the element finds one again. */
export type StartingRowId = "graphty:starting-everything" | "graphty:starting-selected" | "graphty:starting-hovered";

/** One starting row: what it is, and where it is pinned. */
export interface StartingRow {
    readonly templateId: StartingRowId;
    readonly pin: "top" | "bottom";
    readonly spec: RowSpec;
}

/**
 * The ring a Selected row starts with: a solid mid-gray halo, with a near-black glow between it
 * and the node.
 *
 * The halo meets the background on its outside and, on a black node, the node on its inside, so
 * it must stand 3:1 off both default backgrounds (whitesmoke and the dark #101010 and #202020)
 * and off black. Only a mid gray does all three: #868686 is 3.3:1 or better against each. It is
 * close to most palette colors, so the near-black glow carries the ring against those (4:1 or
 * better against every color of the default categorical palette and the default node color).
 * No single color can stand 3:1 off black and off every palette color, which is why there are
 * two tones. `test/session/style-panel-facts.test.ts` measures both. The selection settings' own
 * default look (a pale gold halo) is unchanged; a Selected row takes only their sizes.
 */
export const STARTING_SELECTED_LOOK = { ring: "#868686", glow: "#111111" } as const;

/**
 * The starting rows, with the Selected row's sizes from the selection settings.
 * @param look - The selection settings' node halo and edge band.
 * @param look.scale - The halo's size, as a multiple of the node's drawn radius.
 * @param look.edgeScale - The band's width, as a multiple of twice the line's width.
 * @returns The three rows, in the order they are added: Everything, Selected, Hovered.
 */
export function startingRows(look: { readonly scale: number; readonly edgeScale: number }): readonly StartingRow[] {
    const source = (templateId: StartingRowId): RowSpec["source"] => ({ by: "template", templateId });

    return [
        {
            templateId: "graphty:starting-everything",
            pin: "bottom",
            spec: {
                name: "Everything",
                target: "both",
                selector: { match: "everything" },
                source: source("graphty:starting-everything"),
            },
        },
        {
            templateId: "graphty:starting-selected",
            pin: "top",
            spec: {
                name: "Selected",
                target: "both",
                selector: { match: "state", state: "selected" },
                set: {
                    "node.haloColor": STARTING_SELECTED_LOOK.ring,
                    "node.haloSize": look.scale,
                    "node.haloOpacity": 1,
                    "node.glow": STARTING_SELECTED_LOOK.glow,
                    "edge.bandColor": STARTING_SELECTED_LOOK.ring,
                    "edge.bandWidth": look.edgeScale,
                    "edge.bandOpacity": 1,
                },
                source: source("graphty:starting-selected"),
            },
        },
        {
            templateId: "graphty:starting-hovered",
            pin: "top",
            spec: {
                name: "Hovered",
                target: "node",
                selector: { match: "state", state: "hovered" },
                source: source("graphty:starting-hovered"),
            },
        },
    ];
}

/**
 * Which starting row a layer is a part of.
 * @param entry - A layer in the stack.
 * @returns Its starting row's template id, or undefined.
 */
export function startingRowOf(entry: CompiledLayer): StartingRowId | undefined {
    const { source } = entry.layer;
    return source.by === "template" && source.templateId.startsWith("graphty:starting-")
        ? (source.templateId as StartingRowId)
        : undefined;
}

/** Rule leaves that always read nodes: their degree, component, neighborhood or isolation. */
const NODE_LEAVES: ReadonlySet<string> = new Set(["degree", "component", "neighborhood", "isolated"]);

/**
 * The value a leaf reads, when it reads one: the id is no kind's value.
 * @param leaf - The leaf.
 * @returns The path, or undefined.
 */
function leafPath(leaf: RuleTree): Path | undefined {
    switch (leaf.kind) {
        case "range":
        case "categories":
            return leaf.attribute;
        case "text":
            return leaf.reads === "id" ? undefined : leaf.reads;
        case "threshold":
            return leaf.path;
        default:
            return undefined;
    }
}

/**
 * A rule with every leaf passed through a change.
 * @param rule - The rule.
 * @param change - The change to one leaf.
 * @returns The rule.
 */
function mapLeaves(rule: RuleTree, change: (leaf: RuleTree) => RuleTree): RuleTree {
    switch (rule.kind) {
        case "all":
        case "any":
            return { kind: rule.kind, of: rule.of.map((child) => mapLeaves(child, change)) };
        case "not":
            return { kind: "not", of: mapLeaves(rule.of, change) };
        default:
            return change(rule);
    }
}

/**
 * A row's rule, written for one kind, as it reads for the kinds the row paints from now on. A rule
 * that reads node values reaches edges as the edges touching those nodes; a rule that reads edge
 * values reaches nodes as the nodes at the ends of those edges. A rule that reads nothing
 * kind-specific (everything, a state, the id), or that the session cannot place, is kept.
 * @param selector - The rule as the row has it.
 * @param from - The kind it was written for.
 * @param wanted - The kinds the row paints from now on.
 * @param paths - Which kinds carry a value; absent, nothing is changed.
 * @returns The rule, the same object when it needs no change.
 */
export function retargetSelector(
    selector: Selector,
    from: SelectorTarget,
    wanted: readonly SelectorTarget[],
    paths: PathDirectory | undefined,
): Selector {
    const rule = selectorRule(selector);
    const to = wanted.find((kind) => kind !== from);
    if (rule === undefined || to === undefined || paths === undefined) {
        return selector;
    }

    const onlyOn = (path: Path | undefined, kind: SelectorTarget): boolean =>
        path !== undefined && paths.answers(path, kind) && !paths.answers(path, kind === "node" ? "edge" : "node");
    let changed = false;

    if (to === "edge") {
        mapLeaves(rule.where, (leaf) => {
            changed ||= NODE_LEAVES.has(leaf.kind) || onlyOn(leafPath(leaf), "node");
            return leaf;
        });
        return changed ? { ...rule, edges: "incident" } : selector;
    }

    // ponytail: a threshold leaf on edge values has no "ends" reading and stays as it is.
    const where = mapLeaves(rule.where, (leaf) => {
        const ends =
            (leaf.kind === "range" || leaf.kind === "categories" || leaf.kind === "text") &&
            onlyOn(leafPath(leaf), "edge");
        changed ||= ends;
        return ends ? { ...leaf, nodes: "ends" } : leaf;
    });
    return changed ? { ...rule, where } : selector;
}
