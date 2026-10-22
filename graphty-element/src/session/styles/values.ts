/**
 * @file Per-value entries: the values a categorical binding paints, one entry per value, and how
 * entries, hidden values and rule conditions naming a run's groups follow those groups across a
 * re-run.
 *
 * AN ENTRY IS THE BINDING'S VALUE TABLE. Changing one value's color is an entry in the `map` of
 * the binding that paints it. The painter already paints a mapped value over the palette, so a
 * palette change reaches every value without an entry and leaves every value with one, with no
 * second copy of the layer to keep in step.
 *
 * A RE-RUN RENUMBERS ARBITRARY LABELS. A community run calls its groups 0, 1, 2 in whatever order
 * it found them, so after a re-run "community 3" is a different set of nodes. When a run publishes
 * a partition (its `sizes` table), each old group is matched to the new group it shares the most
 * members with, and every layer's entries, hidden values and rule conditions naming the old group
 * move to the new one. Any other value is a name and is matched by name. What cannot be matched is
 * reported on the layer as codes.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type {
    Binding,
    Channel,
    ChannelValue,
    Encoding,
    LayerId,
    LayerSpec,
    LayerUnmatchedGroup,
    Path,
    RuleTree,
    RunId,
    Selector,
} from "../../catalog/types";
import { OTHER_GROUP_COLOR } from "../../config/palettes/categorical";
import { GraphtyError } from "../../errors";
import { channelDescriptor } from "./channels";
import type { EncodedValue, PreparedBinding } from "./encoding";
import type { Layer } from "./Layer";

/**
 * One value of a category path with everything one layer paints it, across every channel: what
 * `styles.groups` answers.
 * @since 3.26.0
 */
export interface ValueGroup {
    /** The value, spelled as the data spells it. */
    readonly value: unknown;
    /** How many of the layer's elements carry it. */
    readonly count: number;
    /** Whether the layer hides it (`styles.setValueHidden`), which it does in every channel at once. */
    readonly hidden: boolean;
    /** The name a reader gave the value (`session.data.setValueLabel`), when it has one. */
    readonly name?: string;
    /** Each channel's value-table entry for it, for the channels that have one. */
    readonly entries: Readonly<Partial<Record<Channel, string | number>>>;
    /**
     * True when the group is folded into the layer's Other group (`styles.setFoldBelow`, or a
     * colour palette that ran out under `overflow: "other"`), so it paints what Other paints.
     * Folded groups come after the rest, largest first.
     * @since 3.27.0
     */
    readonly folded?: true;
}

/**
 * One layer of several read as one group of a binding across them, item i being the i-th layer
 * from the top: what `styles.layerGroups` answers. The same fields as a {@link ValueGroup} of a
 * data value, so one group editor lists both.
 * @since 3.30.0
 */
export interface LayerGroup extends ValueGroup {
    /** The layer's id: the group's value, and the key of its entry in the binding's `map`. */
    readonly value: LayerId;
    /** The name the layer list shows: its row's, else the layer's own. */
    readonly name: string;
    /** The style row that holds the layer (`styles.hideRow`, `styles.renameRow` take it). */
    readonly row: LayerId;
    /** How many elements the layer matches. */
    readonly count: number;
    /** Whether the layer or its row is hidden. */
    readonly hidden: boolean;
    /** What the binding paints this layer: its channel's value, and the overflow's second cue's. */
    readonly paints: Readonly<Partial<Record<Channel, EncodedValue>>>;
}

/**
 * One value-table write of `styles.setValueEntries`: what one value paints on one channel, or
 * undefined to clear its entry.
 * @since 3.26.0
 */
export interface ValueEntryWrite {
    /** The channel, such as `"node.shape"`. */
    readonly channel: Channel;
    /** The value, as {@link ValueGroup.value} spells it. */
    readonly value: string | number | boolean;
    /** What it paints, or undefined to clear the entry. */
    readonly entry: ChannelValue | undefined;
}

/** One value a categorical binding paints: its group of the layer's elements. */
export interface ValueCategory {
    /** The value, spelled as the data spells it: the number `3`, not the text `"3"`. */
    readonly value: unknown;
    /** How many of the layer's elements carry it. */
    readonly count: number;
    /** Whether the binding hides it (`styles.setValueHidden`). */
    readonly hidden: boolean;
    /** The binding's value-table entry for it, or undefined when it follows the palette. */
    readonly entry?: string | number;
    /** The name a reader gave the value (`session.data.setValueLabel`), when it has one. @since 3.26.0 */
    readonly name?: string;
}

/**
 * A value-entry request the layer cannot satisfy.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values, with a stable `reason` code.
 * @returns The error to throw.
 */
function refused(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "style", details });
}

/**
 * The values one channel of a layer paints by category, largest group first.
 * @param layer - The layer.
 * @param channel - The channel.
 * @param prepared - What the last repaint prepared for the layer.
 * @param names - The names given to the binding's values, by value as the legend spells it.
 * @returns The values; none when the channel is not painted by category.
 */
export function categoriesOf(
    layer: Layer,
    channel: Channel,
    prepared: readonly PreparedBinding[],
    names: (path: Path) => ReadonlyMap<string, string> = () => new Map(),
): readonly ValueCategory[] {
    const binding = layer.encode?.[channel];
    const ready = prepared.find(
        (entry) =>
            entry.channel === channel &&
            entry.categories.length + entry.lumped.length > 0 &&
            binding !== undefined &&
            "by" in binding &&
            entry.path === binding.by,
    );
    if (binding === undefined || !("by" in binding) || ready === undefined) {
        return [];
    }

    const named = names(binding.by);
    return ready.categories.map((name) => {
        const entry = binding.map?.[name];
        const label = named.get(name);

        return Object.freeze({
            value: ready.categoryValues.get(name) ?? name,
            count: ready.categoryCounts.get(name) ?? 0,
            hidden: ready.hidden.has(name),
            ...(entry === undefined ? {} : { entry }),
            ...(label === undefined ? {} : { name: label }),
        });
    });
}

/**
 * Every value one layer paints by a category path, with each channel's entry for it.
 * @param layer - The layer.
 * @param path - The category path, such as `results.louvain.group`.
 * @param prepared - What the last repaint prepared for the layer.
 * @param names - The names given to the path's values.
 * @returns The values, largest first; none when no channel of the layer reads the path.
 */
export function groupsOf(
    layer: Layer,
    path: Path,
    prepared: readonly PreparedBinding[],
    names: (path: Path) => ReadonlyMap<string, string>,
): readonly ValueGroup[] {
    const channels = (Object.entries(layer.encode ?? {}) as [Channel, Binding | undefined][]).flatMap(
        ([channel, binding]) => (binding !== undefined && "by" in binding && binding.by === path ? [channel] : []),
    );
    const first = channels.find((channel) => categoriesOf(layer, channel, prepared).length > 0);
    if (first === undefined) {
        return [];
    }

    const entriesOf = (key: string): Readonly<Partial<Record<Channel, string | number>>> =>
        Object.freeze(
            Object.fromEntries(
                channels.flatMap((channel) => {
                    const binding = layer.encode?.[channel];
                    const entry = binding !== undefined && "by" in binding ? binding.map?.[key] : undefined;
                    return entry === undefined ? [] : [[channel, entry]];
                }),
            ),
        );
    const kept = categoriesOf(layer, first, prepared, names).map((category) => {
        const { entry: _entry, ...group } = category;
        return Object.freeze({ ...group, entries: entriesOf(String(category.value)) });
    });
    const ready = prepared.find((entry) => entry.channel === first && entry.path === path);
    const named = names(path);
    const folded = (ready?.lumped ?? []).map((key) => {
        const label = named.get(key);
        return Object.freeze({
            value: ready?.categoryValues.get(key) ?? key,
            count: ready?.categoryCounts.get(key) ?? 0,
            hidden: ready?.hidden.has(key) ?? false,
            ...(label === undefined ? {} : { name: label }),
            entries: entriesOf(key),
            folded: true as const,
        });
    });
    return [...kept, ...folded];
}

/**
 * The patch that writes several value-table entries of one category path at once: see
 * `styles.setValueEntries`. A channel the layer does not yet paint by the path is bound to it,
 * every other value keeping the one value the layer painted before (its set value, else the
 * channel's default) as the binding's `otherwise`.
 * @param layer - The layer, or undefined when the stack holds none with that id.
 * @param by - The category path every write is a value of.
 * @param writes - The writes, applied in order.
 * @returns The patch.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when a channel already varies by another
 *   path (`details.reason` `"bound-to-other-path"`) or an entry is not a text or a number.
 */
export function valueEntriesPatch(
    layer: Layer | undefined,
    by: Path,
    writes: readonly ValueEntryWrite[],
): Partial<LayerSpec> {
    if (layer === undefined) {
        return {};
    }

    let current: Layer = layer;
    for (const { channel, value, entry } of writes) {
        const binding = current.encode?.[channel];
        if (binding !== undefined && "by" in binding && binding.by !== by) {
            throw refused(`Layer ${layer.id} already varies ${channel} by ${binding.by}, so it is not replaced.`, {
                id: layer.id,
                channel,
                path: binding.by,
                reason: "bound-to-other-path",
            });
        }

        if (binding === undefined || !("by" in binding)) {
            current = boundTo(current, channel, by);
        }

        current = { ...current, ...valueEntryPatch(current, channel, value, entry) };
    }

    return { encode: current.encode, ...(current.set === layer.set ? {} : { set: current.set }) };
}

/**
 * A layer with one more channel bound to a category path, the rest of its values keeping the one
 * value the layer painted the channel before.
 * @param layer - The layer.
 * @param channel - The channel.
 * @param by - The path.
 * @returns The layer.
 */
function boundTo(layer: Layer, channel: Channel, by: Path): Layer {
    const { [channel]: single, ...set } = layer.set ?? {};
    const before = single ?? channelDescriptor(channel)?.default;
    const otherwise = typeof before === "string" || typeof before === "number" ? before : undefined;
    // A sibling reading the same path already hides some groups or folds the small ones into
    // Other: the new channel does the same, so a group is hidden or folded in every property.
    const sibling = bindingsBy(layer, by).find(
        ([, each]) => each.hidden !== undefined || each.other !== undefined,
    )?.[1];
    const fold = sibling?.other === undefined ? undefined : foldOf(channel, otherwise, sibling.other.threshold);
    const binding: Binding = {
        by,
        scale: "ordinal",
        ...(otherwise === undefined ? {} : { otherwise }),
        ...(sibling?.hidden === undefined ? {} : { hidden: [...sibling.hidden] }),
        ...(fold === undefined ? {} : { other: fold }),
    };

    return {
        ...layer,
        encode: { ...layer.encode, [channel]: binding },
        ...(single === undefined ? {} : { set }),
    };
}

/** A binding that reads a value. */
type ValueBinding = Extract<Binding, { by: Path }>;

/**
 * The bindings of a layer that read one path.
 * @param layer - The layer.
 * @param by - The path.
 * @returns Each channel with its binding.
 */
function bindingsBy(layer: Layer, by: Path): [Channel, ValueBinding][] {
    return (Object.entries(layer.encode ?? {}) as [Channel, Binding | undefined][]).flatMap(([channel, binding]) =>
        binding !== undefined && "by" in binding && binding.by === by
            ? [[channel, binding] as [Channel, ValueBinding]]
            : [],
    );
}

/**
 * What one channel paints the groups folded into Other: the grey of the Other bucket for a color,
 * else the one value the channel paints every group without an entry.
 * @param channel - The channel.
 * @param otherwise - The binding's `otherwise`, if it has one.
 * @param threshold - Groups with fewer elements than this are folded.
 * @returns The fold, or undefined when the channel has no single value to fold into.
 */
function foldOf(
    channel: Channel,
    otherwise: string | number | undefined,
    threshold: number,
): { threshold: number; value: string | number } | undefined {
    const descriptor = channelDescriptor(channel);
    if (descriptor?.accepts === "color") {
        return { threshold, value: OTHER_GROUP_COLOR };
    }
    const fallback = descriptor?.default;
    const value = otherwise ?? (typeof fallback === "string" || typeof fallback === "number" ? fallback : undefined);
    return value === undefined ? undefined : { threshold, value };
}

/**
 * The patch that folds the small groups of a category path into one Other group in every channel
 * of the layer that reads it, or unfolds them: see `styles.setFoldBelow`.
 * @param layer - The layer, or undefined when the stack holds none with that id.
 * @param by - The category path.
 * @param below - Groups with fewer elements than this are folded; undefined unfolds them.
 * @returns The patch.
 * @throws `E_BAD_COMMAND` (`reason` `"not-bound"`) when no channel of the layer reads the path,
 *   and (`reason` `"bad-threshold"`) for a threshold that is not a whole number of 1 or more.
 */
export function foldPatch(layer: Layer | undefined, by: Path, below: number | undefined): Partial<LayerSpec> {
    if (layer === undefined) {
        return {};
    }
    const bound = bindingsBy(layer, by);
    if (bound.length === 0) {
        throw refused(`Layer ${layer.id} does not paint anything from ${by}, so it has no groups to fold.`, {
            id: layer.id,
            path: by,
            reason: "not-bound",
        });
    }
    if (below !== undefined && (!Number.isInteger(below) || below < 1)) {
        throw refused(`Groups are folded below a whole number of elements, 1 or more, not ${String(below)}.`, {
            id: layer.id,
            path: by,
            below,
            reason: "bad-threshold",
        });
    }

    const encode: Encoding = { ...layer.encode };
    for (const [channel, binding] of bound) {
        const { other: _other, ...rest } = binding;
        const fold = below === undefined ? undefined : foldOf(channel, binding.otherwise, below);
        encode[channel] = fold === undefined ? rest : { ...rest, other: fold };
    }

    return { encode };
}

/**
 * The patch that sets or clears one value's entry in one channel's value table.
 * @param layer - The layer, or undefined when the stack holds none with that id.
 * @param channel - The channel.
 * @param value - The value.
 * @param entry - What the value paints instead, or undefined to follow the palette again.
 * @returns The patch.
 * @throws `E_BAD_COMMAND` when the layer does not paint the channel from a value
 *   (`reason` `"not-bound"`), or the entry is not a text or a number (`"bad-entry"`).
 */
export function valueEntryPatch(
    layer: Layer | undefined,
    channel: Channel,
    value: string | number | boolean,
    entry: ChannelValue | undefined,
): Partial<LayerSpec> {
    if (layer === undefined) {
        return {};
    }

    const binding = layer.encode?.[channel];
    if (binding === undefined || !("by" in binding)) {
        throw refused(`Layer ${layer.id} does not paint ${channel} from a value, so it has no value table.`, {
            id: layer.id,
            channel,
            reason: "not-bound",
        });
    }

    if (entry !== undefined && typeof entry !== "string" && typeof entry !== "number") {
        throw refused(`A value's ${channel} entry is a text or a number.`, {
            id: layer.id,
            channel,
            reason: "bad-entry",
        });
    }

    const { map: previous, ...rest } = binding;
    const key = String(value);
    const map: Record<string, string | number> = Object.fromEntries(
        Object.entries(previous ?? {}).filter(([name]) => name !== key),
    );
    if (entry !== undefined) {
        map[key] = entry;
    }

    return {
        encode: { ...layer.encode, [channel]: Object.keys(map).length === 0 ? rest : { ...rest, map } },
    };
}

/**
 * A group label as the legend spells a category, so the group `0` and the text `"0"` are one.
 * @param value - The value an element carries.
 * @returns The name, or null when the element carries none.
 */
function nameOf(value: unknown): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);
}

/** How one set of group labels matched another. */
export interface GroupMatch {
    /** True when the labels were made up by the run and matched by shared members. */
    readonly byOverlap: boolean;
    /** Each old group's new name, for every old group that matched one. */
    readonly to: ReadonlyMap<string, string>;
    /** Each new group as the data spells it, by name. */
    readonly values: ReadonlyMap<string, unknown>;
    /** The new groups no old group matched, as the data spells them. */
    readonly added: readonly unknown[];
    /** The old groups that matched no new group, as the data spells them, by name. */
    readonly gone: ReadonlyMap<string, unknown>;
}

/**
 * Match old groups to new ones by shared members, largest overlap first, each side once.
 * @param shared - For each old group, how many members it shares with each new group.
 * @returns Each matched old group's new name.
 */
function matchByOverlap(shared: ReadonlyMap<string, ReadonlyMap<string, number>>): Map<string, string> {
    const to = new Map<string, string>();
    const pairs = [...shared].flatMap(([from, row]) => [...row].map(([into, count]) => ({ from, into, count })));
    // Largest overlap first; ties by name so the match never depends on iteration order.
    pairs.sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.into.localeCompare(b.into));
    const taken = new Set<string>();
    for (const { from, into } of pairs) {
        if (!to.has(from) && !taken.has(into)) {
            to.set(from, into);
            taken.add(into);
        }
    }

    return to;
}

/**
 * Match old groups to the new groups of the same name.
 * @param oldValues - The old groups, by name.
 * @param values - The new groups, by name.
 * @returns Each matched old group's new name (its own).
 */
function matchByName(
    oldValues: ReadonlyMap<string, unknown>,
    values: ReadonlyMap<string, unknown>,
): Map<string, string> {
    const to = new Map<string, string>();
    for (const name of oldValues.keys()) {
        if (values.has(name)) {
            to.set(name, name);
        }
    }

    return to;
}

/**
 * Match the groups elements fell in before a re-run to the groups they fall in after it.
 *
 * By overlap, each pair of an old and a new group is ranked by how many elements they share, and
 * the pairs are taken largest first while both sides are free: a renumbered community keeps its
 * entries on the group holding most of its members. By name, a group matches the group of the
 * same name.
 * @param ids - The elements.
 * @param before - Each element's group before, or undefined when it had none.
 * @param after - Each element's group after.
 * @param byOverlap - True for labels the run made up, false for labels that are names.
 * @returns The match.
 */
export function matchGroups<Id>(
    ids: Iterable<Id>,
    before: (id: Id) => unknown,
    after: (id: Id) => unknown,
    byOverlap: boolean,
): GroupMatch {
    const shared = new Map<string, Map<string, number>>();
    const oldValues = new Map<string, unknown>();
    const values = new Map<string, unknown>();
    for (const id of ids) {
        const was = nameOf(before(id));
        const now = nameOf(after(id));
        if (was !== null) {
            oldValues.set(was, before(id));
        }
        if (now !== null) {
            values.set(now, after(id));
        }
        if (was !== null && now !== null) {
            const row = shared.get(was) ?? new Map<string, number>();
            row.set(now, (row.get(now) ?? 0) + 1);
            shared.set(was, row);
        }
    }

    const to = byOverlap ? matchByOverlap(shared) : matchByName(oldValues, values);
    const matched = new Set(to.values());

    return {
        byOverlap,
        to,
        values,
        added: [...values].filter(([name]) => !matched.has(name)).map(([, value]) => value),
        gone: new Map([...oldValues].filter(([name]) => !to.has(name))),
    };
}

/** A value as a binding's hidden list and a group code spell it. */
type Scalar = string | number | boolean;

/** What realigning one layer collects as it goes. */
interface Realign {
    /** The run's result paths start with this. */
    readonly root: string;
    /** The run's id, which an item leaf names. */
    readonly runId: RunId;
    /** How one path's groups matched, or undefined when it does not take part. */
    readonly matchOf: (path: Path, named: boolean) => GroupMatch | undefined;
    /** What could not be matched, keyed so one value reported twice is one code. */
    readonly unmatched: Map<string, LayerUnmatchedGroup>;
}

/**
 * Record a code once.
 * @param state - The realignment.
 * @param code - The code.
 */
function note(state: Realign, code: LayerUnmatchedGroup): void {
    const key = `${code.code}|${code.params.path}|${String(code.params.value)}`;
    const seen = state.unmatched.get(key);
    // A value something named and lost outranks the same value reported bare.
    if (seen === undefined || (code.params.dropped === true && seen.params.dropped !== true)) {
        state.unmatched.set(key, code);
    }
}

/**
 * An old label's new name: matched by overlap it moves, by name it stays.
 * @param match - The match.
 * @param name - The old label.
 * @returns The new label, or null when the run's made-up label has no successor.
 */
function renamed(match: GroupMatch, name: string): string | null {
    if (!match.byOverlap) {
        return name;
    }

    return match.to.get(name) ?? null;
}

/**
 * Carry one binding's value table and hidden values across the match.
 * @param state - The realignment.
 * @param path - The binding's path.
 * @param binding - The binding.
 * @param match - How the path's groups matched.
 * @returns The binding after.
 */
function realignBinding(
    state: Realign,
    path: Path,
    binding: Extract<Binding, { by: Path }>,
    match: GroupMatch,
): Binding {
    const { map, hidden, ...rest } = binding;
    const named = new Set<string>();
    const nextMap: Record<string, string | number> = {};
    for (const [name, value] of Object.entries(map ?? {})) {
        named.add(name);
        const into = renamed(match, name);
        if (into !== null) {
            nextMap[into] = value;
        }
    }
    const nextHidden = (hidden ?? []).flatMap((value) => {
        named.add(String(value));
        const into = renamed(match, String(value));
        if (into === null) {
            return [];
        }
        // By name an absent value stays as it was spelled; a moved one is spelled as the data spells it.
        return [(match.values.get(into) ?? value) as Scalar];
    });

    for (const value of match.added) {
        note(state, { code: "group.new", params: { path, value: value as Scalar } });
    }
    for (const [name, value] of match.gone) {
        note(state, {
            code: "group.gone",
            params: { path, value: value as Scalar, ...(named.has(name) ? { dropped: true } : {}) },
        });
    }

    return {
        ...rest,
        ...(Object.keys(nextMap).length === 0 ? {} : { map: nextMap }),
        ...(nextHidden.length === 0 ? {} : { hidden: nextHidden }),
    };
}

/**
 * Carry a rule's conditions naming a run's groups across the match: a `categories` leaf over one
 * of the run's paths, and an `item` leaf that follows the run's current values.
 * @param state - The realignment.
 * @param tree - The rule.
 * @returns The rule after.
 */
function realignRule(state: Realign, tree: RuleTree): RuleTree {
    switch (tree.kind) {
        case "all":
        case "any":
            return { kind: tree.kind, of: tree.of.map((each) => realignRule(state, each)) };
        case "not":
            return { kind: "not", of: realignRule(state, tree.of) };
        case "categories": {
            const match = tree.attribute.startsWith(state.root) ? state.matchOf(tree.attribute, true) : undefined;
            if (match === undefined) {
                return tree;
            }
            const values = tree.values.flatMap((name) => {
                const into = renamed(match, name);
                if (match.gone.has(name)) {
                    note(state, {
                        code: "group.gone",
                        params: { path: tree.attribute, value: match.gone.get(name) as Scalar, dropped: true },
                    });
                }
                return into === null ? [] : [into];
            });
            return { ...tree, values };
        }
        case "item": {
            const { item } = tree;
            const path = `${state.root}${item.key.field}`;
            const match = item.result === state.runId && item.run === undefined ? state.matchOf(path, true) : undefined;
            const name = String(item.key.value);
            if (match === undefined) {
                return tree;
            }
            const into = renamed(match, name);
            if (match.gone.has(name)) {
                note(state, { code: "group.gone", params: { path, value: item.key.value, dropped: true } });
            }
            if (into === null || into === name) {
                return tree;
            }
            return {
                kind: "item",
                item: { ...item, key: { ...item.key, value: (match.values.get(into) ?? into) as Scalar } },
            };
        }
        default:
            return tree;
    }
}

/**
 * The patch that carries a layer's value-table entries, hidden values and rule conditions across
 * a re-run of one run, and reports what could not be matched.
 * @param layer - The layer.
 * @param runId - The run that re-ran.
 * @param root - The prefix of that run's value paths, `results.<run>.`.
 * @param matchOf - How one of the run's paths matched; `named` says the layer names a value of it.
 *   Undefined when the path does not take part.
 * @returns The patch, or null when nothing changes.
 */
export function realignPatch(
    layer: Layer,
    runId: RunId,
    root: string,
    matchOf: (path: Path, named: boolean) => GroupMatch | undefined,
): Partial<LayerSpec> | null {
    const state: Realign = { root, runId, matchOf, unmatched: new Map() };

    const encode: Encoding = { ...layer.encode };
    for (const [channel, binding] of Object.entries(layer.encode ?? {}) as [Channel, Binding][]) {
        if (!("by" in binding) || !binding.by.startsWith(root)) {
            continue;
        }
        const named = binding.map !== undefined || binding.hidden !== undefined;
        const match = matchOf(binding.by, named);
        if (match !== undefined) {
            encode[channel] = realignBinding(state, binding.by, binding, match);
        }
    }

    const selector: Selector =
        layer.selector.match === "rule"
            ? { ...layer.selector, where: realignRule(state, layer.selector.where) }
            : layer.selector;

    // Codes about another run's paths stay; this run's are replaced by what it reports now.
    const unmatched = [
        ...(layer.unmatched ?? []).filter((code) => !code.params.path.startsWith(root)),
        ...state.unmatched.values(),
    ];
    const after = {
        encode: layer.encode === undefined ? undefined : encode,
        selector,
        unmatched: unmatched.length === 0 ? undefined : unmatched,
    };
    const before = { encode: layer.encode, selector: layer.selector, unmatched: layer.unmatched };

    return JSON.stringify(after) === JSON.stringify(before) ? null : after;
}
