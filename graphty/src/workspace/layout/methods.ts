/**
 * The Layout list and form's facts about each layout: the app's name for it, the notes beside it
 * and why it cannot run now, read from the element's catalog, its recommendation and its
 * estimate of `layout.set`.
 */

import {
    type LayoutDescriptor,
    layoutEntry,
    type LayoutImplementation,
    type OptionDescriptor,
} from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

import { isSlow } from "../analyze/words";
import { useSessionVersion } from "../toolbar/useSessionVersion";
import { layoutRefusalWords } from "./refusalWords";

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
    "location-map": "Map",
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
 * The engine that draws a descriptor, when it is not its layout's default: an engine row's.
 * @param descriptor - the layout, as a row of the list hands it to the form.
 * @returns the engine's catalog entry, or undefined for the default engine.
 */
function otherEngine(descriptor: LayoutDescriptor): LayoutImplementation | undefined {
    return layoutEntry(descriptor.id)?.implementations.find(
        (implementation) => implementation.engine === descriptor.engine && !implementation.isDefault,
    );
}

/**
 * A layout's name: an engine other than the default by the element's name for it, else the app's
 * name for the layout, else the element's.
 * @param descriptor - the element's layout descriptor.
 * @returns the name the app shows.
 */
export function layoutName(descriptor: LayoutDescriptor): string {
    return otherEngine(descriptor)?.plainName ?? LAYOUT_NAMES[descriptor.id] ?? descriptor.plainName;
}

/**
 * Whether a layout is drawn by Graphviz, which the list says beside its name.
 * @param descriptor - the layout.
 * @returns true for a Graphviz engine.
 */
export function isGraphviz(descriptor: LayoutDescriptor): boolean {
    return layoutEntry(descriptor.id)?.implementations[0]?.fact.code === "implementation.graphviz";
}

/**
 * A layout as drawn by one of its engines: the engine, its options and its dimensions in place of
 * the default engine's. The form opens on it and applies `{ engine }`.
 * @param descriptor - the layout.
 * @param implementation - the engine.
 * @returns the descriptor.
 */
export function withEngine(descriptor: LayoutDescriptor, implementation: LayoutImplementation): LayoutDescriptor {
    return {
        ...descriptor,
        engine: implementation.engine,
        options: implementation.options,
        maxDimensions: implementation.maxDimensions,
        description: implementation.description,
        ...(implementation.requires === undefined ? {} : { requires: implementation.requires }),
    };
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
 * The element's layouts, each layout with column options resolved for this graph by
 * `catalog.optionsFor`, so a partition option carries the columns that can group the nodes (a
 * run's community among them) and the map's location options the columns that fit them first. Resolved again whenever the project, the runs or the selection
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
            session.catalog.layouts().map(async (descriptor) =>
                // A layout whose column options the element lists for this graph: a grouping,
                // or the map's location columns.
                descriptor.options.some((o) => o.type === "partition" || o.type === "attribute")
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
 * Whether a layout is the one drawn now, by the same engine.
 * @param session - the element's session.
 * @param descriptor - the layout, with its engine.
 * @returns true when it is.
 */
export function isDrawn(session: GraphSession, descriptor: LayoutDescriptor): boolean {
    return descriptor.id === session.layout.id && descriptor.engine === session.layout.engine;
}

/**
 * The engine to ask `layout.set` for: an engine row's, else none (the layout's default).
 * @param descriptor - the layout, with its engine.
 * @returns the engine, or undefined.
 */
export function engineOf(descriptor: LayoutDescriptor): string | undefined {
    return otherEngine(descriptor)?.engine;
}

/**
 * The values the form opens a layout with: what it is drawn with when it is the current layout,
 * else the app's seed, the selected node for a center and the first grouping the element offers.
 * @param session - the element's session.
 * @param descriptor - the layout, its options resolved by {@link useLayouts}.
 * @returns the values.
 */
export function startingValues(session: GraphSession, descriptor: LayoutDescriptor): Record<string, unknown> {
    if (isDrawn(session, descriptor)) {
        return { ...session.layout.options };
    }
    // The row's own engine's options: an engine of a layout takes a seed or not of its own.
    const values: Record<string, unknown> = descriptor.options.some((option) => option.name === "seed")
        ? { seed: LAYOUT_SEED }
        : {};
    // On a map the app keeps nodes one size on screen, so zooming to a region pulls apart the nodes
    // a world view draws on top of one another (the element's own default scales them with zoom),
    // and draws the map, flat or globe, six times larger than the element's default under the same
    // nodes and edges, so a dense region (the United States, Europe) is not one grey patch.
    if (descriptor.id === "location-map") {
        values.nodeScale = "screen";
        values.mapScale = 6;
    }
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
 * none is selected, or the element's estimate says no (a missing grouping among its reasons).
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
    const estimate = session.estimate({
        op: "layout.set",
        id: descriptor.id,
        engine: engineOf(descriptor),
        options: values,
    });
    return estimate.available ? null : layoutRefusalWords(session, estimate);
}

/** One row of the Layout list. */
export interface LayoutChoice {
    /** The layout, with the engine the row applies. */
    readonly descriptor: LayoutDescriptor;
    /** The row's key: the layout's id, and the engine's for an engine row. */
    readonly key: string;
    readonly name: string;
    /** The dimmed second line. */
    readonly description: string;
    /** Whether it is a Graphviz engine, said by a dimmed suffix. */
    readonly graphviz: boolean;
    readonly current: boolean;
    readonly recommended: boolean;
    readonly slow: boolean;
    /** Why it cannot run now, or null. */
    readonly reason: string | null;
}

/**
 * The Layout list's sections, in the order the list draws them: the app's heading for each
 * `family` the element's layout catalog gives a layout. A family the app does not know (one a
 * plugin registers) reads under the last, "Other".
 */
export const LAYOUT_SECTIONS: readonly { readonly family: string; readonly title: string }[] = [
    { family: "force", title: "Force-directed" },
    { family: "geometric", title: "Shapes" },
    { family: "hierarchical", title: "Hierarchy" },
    { family: "special", title: "Other" },
];

/**
 * The section a layout's family reads under.
 * @param family - the layout's catalog family.
 * @returns the section's heading.
 */
export function sectionOf(family: string): string {
    const last = LAYOUT_SECTIONS[LAYOUT_SECTIONS.length - 1]; // NOSONAR(S7755): .at() would widen the type to undefined
    return (LAYOUT_SECTIONS.find((section) => section.family === family) ?? last).title;
}

/**
 * One row of the list for a layout, or for one of its other engines.
 * @param session - the element's session.
 * @param descriptor - the layout, with the engine the row applies.
 * @param recommended - whether the element recommends it for this graph.
 * @returns the row.
 */
function choiceOf(session: GraphSession, descriptor: LayoutDescriptor, recommended: boolean): LayoutChoice {
    const values = startingValues(session, descriptor);
    const reason = unavailable(session, descriptor, values);
    const engine = engineOf(descriptor);
    const estimate = session.estimate({ op: "layout.set", id: descriptor.id, engine, options: values });
    return {
        descriptor,
        key: engine === undefined ? descriptor.id : `${descriptor.id}:${engine}`,
        name: layoutName(descriptor),
        description: descriptor.description,
        graphviz: isGraphviz(descriptor),
        current: isDrawn(session, descriptor),
        recommended,
        slow: reason === null && isSlow(estimate.seconds),
        reason,
    };
}

/**
 * The Layout list: every layout in the element's catalog, in catalog order, each followed by a
 * row for every engine but its default; the one drawn now marked, "Recommended" on the one
 * the element recommends for this graph, "slow" on one the element's estimate puts over the app's
 * threshold, and why one cannot run now.
 * @param session - the element's session.
 * @param layouts - the layouts, from {@link useLayouts}.
 * @returns the rows.
 */
export function layoutChoices(session: GraphSession, layouts: readonly LayoutDescriptor[]): LayoutChoice[] {
    const recommended = session.recommendLayout()?.layout.id;
    return layouts.flatMap((descriptor) => [
        choiceOf(session, descriptor, descriptor.id === recommended),
        ...(layoutEntry(descriptor.id)?.implementations ?? [])
            .filter((implementation) => !implementation.isDefault)
            .map((implementation) => choiceOf(session, withEngine(descriptor, implementation), false)),
    ]);
}
