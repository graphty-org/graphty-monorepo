/**
 * The Layout list and form's facts about each layout: the app's name for it, the notes beside it
 * and why it cannot run now, read from the element's catalog, its recommendation and its
 * estimate of `layout.set`.
 */

import type { LayoutDescriptor, OptionDescriptor } from "@graphty/graphty-element/catalog";
import { type GraphSession, recommendLayout } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

import { isSlow } from "../analyze/words";
import { useSessionVersion } from "../toolbar/useSessionVersion";

/**
 * The app's name for each of the element's layouts, by catalog id. A layout a third party
 * registered reads under its technical name, the element's fact about it.
 */
const LAYOUT_NAMES: Readonly<Record<string, string>> = {
    force: "Force",
    circular: "Circle",
    radial: "Rings around a node",
    grid: "Grid",
    shell: "Rings by group",
    spiral: "Spiral",
    spectral: "Spectral",
    planar: "No crossings",
    random: "Random",
    hierarchical: "Tree",
    bipartite: "Two columns",
    layers: "Columns by group",
    fixed: "Keep positions",
};

/**
 * The seed the app lays every graph out from, so one file draws the same way each time it is
 * opened. graphty-element imposes no seed of its own; the app passes this one with the layout it
 * asks for, and Reshuffle replaces it.
 */
export const LAYOUT_SEED = 1;

/**
 * A new random layout seed.
 * @returns a non-negative 31-bit integer.
 */
export function randomSeed(): number {
    return Math.floor(Math.random() * 2 ** 31); // NOSONAR(S2245): a layout seed, not a security value
}

/**
 * Whether a layout takes a seed, from its catalog entry.
 * @param session - the element's session.
 * @param id - the layout's catalog id.
 * @returns true when its options include `seed`.
 */
export function takesSeed(session: GraphSession, id: string): boolean {
    const descriptor = session.catalog.layouts().find((layout) => layout.id === id);
    return descriptor?.options.some((option) => option.name === "seed") ?? false;
}

/**
 * A layout's name.
 * @param descriptor - the element's layout descriptor.
 * @returns the name the app shows.
 */
export function layoutName(descriptor: LayoutDescriptor): string {
    return LAYOUT_NAMES[descriptor.id] ?? descriptor.technicalName;
}

/**
 * A layout's key option of one type (one the form draws outside the Advanced fold).
 * @param descriptor - the layout.
 * @param type - the option type.
 * @returns the option, or undefined.
 */
function keyOption(descriptor: LayoutDescriptor, type: "node-id" | "partition"): OptionDescriptor | undefined {
    return descriptor.options.find((o) => o.type === type && o.advanced !== true && o.internal !== true);
}

/**
 * The element's layouts, each grouping layout's options resolved for this graph by
 * `catalog.optionsFor`, so a partition option carries the columns that can group the nodes (a
 * run's community among them). Resolved again whenever the project, the runs or the selection
 * change; the catalog's own descriptors stand in until the first answer.
 * @param session - the element's session, or null.
 * @returns the layouts.
 */
export function useLayouts(session: GraphSession | null): readonly LayoutDescriptor[] {
    const version = useSessionVersion(session);
    const [resolved, setResolved] = useState<{
        session: GraphSession;
        layouts: readonly LayoutDescriptor[];
    } | null>(null);
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        let live = true;
        void Promise.all(
            session.catalog
                .layouts()
                .map(async (descriptor) =>
                    descriptor.options.some((o) => o.type === "partition")
                        ? { ...descriptor, options: await session.catalog.optionsFor(descriptor.id) }
                        : descriptor,
                ),
        ).then(
            (layouts) => {
                if (live) {
                    setResolved({ session, layouts });
                }
            },
            () => undefined,
        );
        return () => {
            live = false;
        };
    }, [session, version]);
    if (session === null) {
        return [];
    }
    return resolved?.session === session ? resolved.layouts : session.catalog.layouts();
}

/**
 * The values the form opens a layout with: what it is drawn with when it is the current layout,
 * else the app's seed, the selected node for a center and the first grouping the element offers.
 * @param session - the element's session.
 * @param descriptor - the layout, its options resolved by {@link useLayouts}.
 * @returns the values.
 */
export function startingValues(session: GraphSession, descriptor: LayoutDescriptor): Record<string, unknown> {
    if (descriptor.id === session.layout.id) {
        return { ...session.layout.options };
    }
    const values: Record<string, unknown> = takesSeed(session, descriptor.id) ? { seed: LAYOUT_SEED } : {};
    const node = keyOption(descriptor, "node-id")?.name;
    const selected = session.selection.nodes.at(0);
    if (node !== undefined && selected !== undefined) {
        values[node] = selected;
    }
    const partition = keyOption(descriptor, "partition");
    const first = partition?.values?.at(0)?.value;
    if (partition !== undefined && first !== undefined) {
        values[partition.name] = first;
    }
    return values;
}

/**
 * Why a layout cannot run now with the values it would open with, or null: it needs a node and
 * none is selected, it needs a grouping and the graph has none, or the element's estimate says no.
 * @param session - the element's session.
 * @param descriptor - the layout.
 * @param values - the values it would run with.
 * @returns the reason, or null.
 */
export function unavailable(
    session: GraphSession,
    descriptor: LayoutDescriptor,
    values: Readonly<Record<string, unknown>>,
): string | null {
    const node = keyOption(descriptor, "node-id")?.name;
    if (node !== undefined && (values[node] === undefined || values[node] === null)) {
        return "Select a node first";
    }
    const partition = keyOption(descriptor, "partition")?.name;
    if (partition !== undefined && values[partition] === undefined) {
        return "Needs a node attribute to group by";
    }
    const estimate = session.estimate({ op: "layout.set", id: descriptor.id, options: values });
    // ponytail: the element's reason is English prose; it becomes a code the app words once the
    // element reports one (the same gap as Analyze's).
    return estimate.available ? null : (estimate.reason ?? "Cannot run on this graph");
}

/** One row of the Layout list. */
export interface LayoutChoice {
    readonly descriptor: LayoutDescriptor;
    readonly name: string;
    readonly current: boolean;
    readonly recommended: boolean;
    readonly slow: boolean;
    /** Why it cannot run now, or null. */
    readonly reason: string | null;
}

/**
 * The Layout list: every layout in the element's catalog, in catalog order, the current one
 * marked, "Recommended" on the one the element recommends for this graph, "slow" on one the
 * element's estimate puts over the app's threshold, and why one cannot run now.
 * @param session - the element's session.
 * @param layouts - the layouts, from {@link useLayouts}.
 * @returns the rows.
 */
export function layoutChoices(session: GraphSession, layouts: readonly LayoutDescriptor[]): LayoutChoice[] {
    const statistics = session.data.statistics();
    const recommended = recommendLayout(statistics, { placedNodes: session.seededNodeCount })?.layout.id;
    return layouts.map((descriptor) => {
        const values = startingValues(session, descriptor);
        const reason = unavailable(session, descriptor, values);
        const estimate = session.estimate({ op: "layout.set", id: descriptor.id, options: values });
        return {
            descriptor,
            name: layoutName(descriptor),
            current: descriptor.id === session.layout.id,
            recommended: descriptor.id === recommended,
            slow: reason === null && isSlow(estimate.seconds),
            reason,
        };
    });
}
