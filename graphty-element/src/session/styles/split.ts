/**
 * @file Split by value: a layer shown as one child per value of a category it paints by.
 *
 * A CHILD STORES ONLY ITS OVERRIDES, AND IT STORES THEM AS THE PARENT'S VALUE TABLE. A child's
 * change to a channel is an entry in the `map` of the parent's binding for that channel, keyed by
 * the child's value. The painter already paints a mapped value over the palette, so a scheme
 * change on the parent (a new palette, a reversed one) reaches every child without an override and
 * leaves every child with one -- with no second copy of the layer to keep in step. Unsplitting
 * removes only the split, and the overrides stay where they were: value-table entries.
 *
 * A RE-RUN RENUMBERS ARBITRARY LABELS. A community run calls its groups 0, 1, 2 in whatever order
 * it found them, so after a re-run "community 3" is a different set of nodes. When the run a split
 * reads publishes a partition (its `sizes` table), each old group is matched to the new group it
 * shares the most members with, and the overrides follow the match. Any other value is a name and
 * is matched by name. What cannot be matched is reported as codes on the layer's split.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type {
    Binding,
    Channel,
    ChannelValue,
    Encoding,
    LayerSpec,
    LayerSplit,
    Path,
    StaticStyle,
} from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { PreparedBinding } from "./encoding";
import type { Layer } from "./Layer";

/** One generated child of a split layer: the elements carrying one value of the split's path. */
export interface SplitChild {
    /** The value, spelled as the data spells it: the number `3`, not the text `"3"`. */
    readonly value: unknown;
    /** How many of the layer's elements carry it. */
    readonly count: number;
    /** Whether the parent's binding hides it (`styles.setValueHidden`): the child's eye is off. */
    readonly hidden: boolean;
    /** What the reader changed for this child, by channel. Empty when it follows the parent. */
    readonly overrides: StaticStyle;
}

/**
 * A split request the layer cannot satisfy.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values, with a stable `reason` code.
 * @returns The error to throw.
 */
function refused(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "style", details });
}

/**
 * The bindings of a layer that read one path, by channel.
 * @param encode - The layer's bindings.
 * @param by - The path.
 * @returns The channels and their rule bindings.
 */
function bindingsReading(encode: Encoding | undefined, by: Path): [Channel, Extract<Binding, { by: Path }>][] {
    return (Object.entries(encode ?? {}) as [Channel, Binding][]).filter(
        (entry): entry is [Channel, Extract<Binding, { by: Path }>] => "by" in entry[1] && entry[1].by === by,
    );
}

/**
 * The prepared binding a split reads its groups from: the first one over `by` that has categories.
 * @param prepared - What the last repaint prepared for the layer.
 * @param by - The path, or undefined for the layer's first categorical binding.
 * @returns The prepared binding, or undefined when none paints `by` by category.
 */
function categorical(prepared: readonly PreparedBinding[], by: Path | undefined): PreparedBinding | undefined {
    return prepared.find(
        (entry) => entry.categories.length > 0 && entry.path !== null && (by === undefined || entry.path === by),
    );
}

/**
 * The patch that splits a layer by one of its categorical derived properties.
 * @param layer - The layer, or undefined when the stack holds none with that id.
 * @param prepared - What the last repaint prepared for it.
 * @param by - The path to split by, or undefined for the first one it paints by category.
 * @returns The patch; nothing to change for a layer that is not there (the update refuses it).
 * @throws `E_BAD_COMMAND` when the layer paints nothing by category, or not by `by`.
 */
export function splitPatch(
    layer: Layer | undefined,
    prepared: readonly PreparedBinding[],
    by?: Path,
): Partial<LayerSpec> {
    if (layer === undefined) {
        return {};
    }

    const binding = categorical(prepared, by);
    if (
        binding?.path === undefined ||
        binding.path === null ||
        bindingsReading(layer.encode, binding.path).length === 0
    ) {
        throw refused(
            by === undefined
                ? `Layer ${layer.id} paints nothing by category, so it has no groups to split into.`
                : `Layer ${layer.id} paints nothing by the categories of ${by}.`,
            { id: layer.id, reason: "no-categories", ...(by === undefined ? {} : { by }) },
        );
    }

    return { split: { by: binding.path } };
}

/**
 * The patch that unsplits a layer. Its children's overrides are already value-table entries, so
 * they stay.
 * @param layer - The layer, or undefined when the stack holds none with that id.
 * @returns The patch.
 * @throws `E_BAD_COMMAND` when the layer is not split.
 */
export function unsplitPatch(layer: Layer | undefined): Partial<LayerSpec> {
    if (layer === undefined) {
        return {};
    }

    if (layer.split === undefined) {
        throw refused(`Layer ${layer.id} is not split.`, { id: layer.id, reason: "not-split" });
    }

    return { split: undefined };
}

/**
 * The patch that sets or clears one child's override of one channel.
 * @param layer - The split layer, or undefined when the stack holds none with that id.
 * @param value - The child's value.
 * @param channel - The channel.
 * @param override - What the child paints instead, or undefined to follow the parent again.
 * @returns The patch.
 * @throws `E_BAD_COMMAND` when the layer is not split, the channel is not one it paints by the
 *   split's path, or the override is not a text or a number.
 */
export function overridePatch(
    layer: Layer | undefined,
    value: string | number | boolean,
    channel: Channel,
    override: ChannelValue | undefined,
): Partial<LayerSpec> {
    if (layer === undefined) {
        return {};
    }

    const { split } = layer;
    if (split === undefined) {
        throw refused(`Layer ${layer.id} is not split, so it has no children to change.`, {
            id: layer.id,
            reason: "not-split",
        });
    }

    // ponytail: a child overrides only a channel the parent paints by the split's value, because
    // that override is one value-table entry. Overriding a fixed or unbound channel needs a
    // generated child layer in the stack; add it when the panel offers that.
    const binding = layer.encode?.[channel];
    if (binding === undefined || !("by" in binding) || binding.by !== split.by) {
        throw refused(`Layer ${layer.id} does not paint ${channel} by ${split.by}, so a child cannot change it.`, {
            id: layer.id,
            channel,
            reason: "channel-not-split",
        });
    }

    if (override !== undefined && typeof override !== "string" && typeof override !== "number") {
        throw refused(`A child's ${channel} is a text or a number.`, { id: layer.id, channel, reason: "bad-override" });
    }

    const { map: previous, ...rest } = binding;
    const key = String(value);
    const map: Record<string, string | number> = Object.fromEntries(
        Object.entries(previous ?? {}).filter(([name]) => name !== key),
    );
    if (override !== undefined) {
        map[key] = override;
    }

    return {
        encode: { ...layer.encode, [channel]: Object.keys(map).length === 0 ? rest : { ...rest, map } },
    };
}

/**
 * A split layer's children: one per value present, largest group first.
 * @param layer - The split layer.
 * @param prepared - What the last repaint prepared for it.
 * @returns The children, or none when the layer is not split or nothing is prepared.
 */
export function childrenOf(layer: Layer, prepared: readonly PreparedBinding[]): readonly SplitChild[] {
    const { split } = layer;
    const binding = split === undefined ? undefined : categorical(prepared, split.by);
    if (split === undefined || binding === undefined) {
        return [];
    }

    const reading = bindingsReading(layer.encode, split.by);

    return binding.categories.map((name) => {
        const overrides: StaticStyle = {};
        for (const [channel, rule] of reading) {
            const own = rule.map?.[name];
            if (own !== undefined) {
                overrides[channel] = own;
            }
        }

        return Object.freeze({
            value: binding.categoryValues.get(name) ?? name,
            count: binding.categoryCounts.get(name) ?? 0,
            hidden: binding.hidden.has(name),
            overrides: Object.freeze(overrides),
        });
    });
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
 * Match the groups elements fell in before a re-run to the groups they fall in after it.
 *
 * By overlap, each pair of an old and a new group is ranked by how many elements they share, and
 * the pairs are taken largest first while both sides are free: a renumbered community keeps its
 * overrides on the group holding most of its members. By name, a group matches the group of the
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

    const to = new Map<string, string>();
    if (byOverlap) {
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
    } else {
        for (const name of oldValues.keys()) {
            if (values.has(name)) {
                to.set(name, name);
            }
        }
    }

    const matched = new Set(to.values());

    return {
        to,
        values,
        added: [...values].filter(([name]) => !matched.has(name)).map(([, value]) => value),
        gone: new Map([...oldValues].filter(([name]) => !to.has(name))),
    };
}

/**
 * The patch that carries a split layer's overrides and hidden values across a re-run.
 * @param layer - The split layer.
 * @param match - How the groups matched.
 * @returns The patch, or null when nothing changes.
 */
export function realignPatch(layer: Layer, match: GroupMatch): Partial<LayerSpec> | null {
    const { split } = layer;
    if (split === undefined) {
        return null;
    }

    const rename = (name: string): string | null => (match.gone.has(name) ? null : (match.to.get(name) ?? name));
    const overridden = new Set<string>();
    const encode: Encoding = { ...layer.encode };
    for (const [channel, binding] of bindingsReading(layer.encode, split.by)) {
        const { map, hidden, ...rest } = binding;
        const nextMap: Record<string, string | number> = {};
        for (const [name, value] of Object.entries(map ?? {})) {
            const into = rename(name);
            if (into === null) {
                overridden.add(name);
            } else {
                nextMap[into] = value;
            }
        }
        const nextHidden = (hidden ?? []).flatMap((value) => {
            const into = rename(String(value));
            const spelled = into === null ? undefined : match.values.get(into);
            return spelled === undefined ? [] : [spelled as string | number | boolean];
        });
        encode[channel] = {
            ...rest,
            ...(Object.keys(nextMap).length === 0 ? {} : { map: nextMap }),
            ...(nextHidden.length === 0 ? {} : { hidden: nextHidden }),
        };
    }

    const unmatched = [
        ...match.added.map((value) => ({
            code: "split.group-new" as const,
            params: { value: value as string | number | boolean },
        })),
        ...[...match.gone].map(([name, value]) => ({
            code: "split.group-gone" as const,
            params: { value: value as string | number | boolean, overridden: overridden.has(name) },
        })),
    ];
    const nextSplit: LayerSplit = unmatched.length === 0 ? { by: split.by } : { by: split.by, unmatched };
    const renamed = [...match.to].some(([from, into]) => from !== into);
    if (!renamed && match.gone.size === 0 && unmatched.length === 0 && split.unmatched === undefined) {
        return null;
    }

    return { encode, split: nextSplit };
}
