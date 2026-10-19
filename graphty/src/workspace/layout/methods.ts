/**
 * The Layout group's Method list: the app's name for each of the element's layouts and the notes
 * beside it, read from the element's catalog, its recommendation and the graph's size.
 */

import type { LayoutDescriptor } from "@graphty/graphty-element/catalog";
import { type GraphSession, recommendLayout } from "@graphty/graphty-element/session";

/**
 * The app's name for each of the element's layouts, by catalog id. A layout a third party
 * registered reads under its technical name, the element's fact about it.
 */
const LAYOUT_NAMES: Readonly<Record<string, string>> = {
    force: "Force",
    "force-2d": "Force, flat",
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
 * A layout's name.
 * @param descriptor - the element's layout descriptor.
 * @returns the name the app shows.
 */
function layoutName(descriptor: LayoutDescriptor): string {
    return LAYOUT_NAMES[descriptor.id] ?? descriptor.technicalName;
}

/**
 * Whether the Method list offers a layout: one that needs nothing picked first (a start node, a
 * grouping), since tier 1 has no control to pick those.
 * @param descriptor - the layout.
 * @returns true when it is offered.
 */
function offered(descriptor: LayoutDescriptor): boolean {
    return (
        descriptor.structuralInputs.length === 0 &&
        !descriptor.options.some((o) => o.type === "node-id" && o.advanced !== true && o.internal !== true)
    );
}

/**
 * The Method list's choices: each offered layout by name, "Recommended" on the one the element
 * recommends for this graph, and "slow" on one rated for fewer nodes than the graph holds.
 * @param session - the element's session.
 * @returns the choices in catalog order, the current layout always among them.
 */
export function methodChoices(session: GraphSession): { value: string; label: string }[] {
    const statistics = session.data.statistics();
    const recommended = recommendLayout(statistics, { placedNodes: session.seededNodeCount })?.layout.id;
    return session.catalog
        .layouts()
        .filter((d) => offered(d) || d.id === session.layout.id)
        .map((d) => {
            const notes = [
                d.id === recommended ? "Recommended" : null,
                typeof d.sizeRating === "number" && d.sizeRating < statistics.nodeCount ? "slow" : null,
            ].filter((note) => note !== null);
            return { value: d.id, label: [layoutName(d), ...notes].join(" - ") };
        });
}
