/**
 * The layout a DOT file asks for, read from its graph attributes.
 *
 * Other formats that store a layout could supply the same fact through their importer's `layout`
 * member: yEd's hierarchic layout settings in GraphML and Gephi's saved layout in GEXF. Neither
 * importer reads those settings today.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { FileLayout } from "../../types.js";

/** The graph attributes Graphviz's layout programs read, which a DOT file passes on to the one that draws it. */
const LAYOUT_SETTINGS = [
    "rankdir",
    "nodesep",
    "ranksep",
    "splines",
    "overlap",
    "sep",
    "esep",
    "start",
    "mode",
    "model",
    "K",
    "root",
    "mindist",
    "newrank",
    "clusterrank",
    "ordering",
    "ratio",
    "pack",
    "packmode",
    "concentrate",
    "maxiter",
    "epsilon",
    "defaultdist",
    "searchsize",
    "mclimit",
    "nslimit",
    "remincross",
    "levelsgap",
    "repulsiveforce",
    "smoothing",
    "quadtree",
    "beautify",
    "center",
    "forcelabels",
] as const;

/** Each `rankdir` and the way its ranks run. */
const DIRECTIONS: Readonly<Record<string, NonNullable<FileLayout["direction"]>>> = {
    TB: "down",
    BT: "up",
    LR: "right",
    RL: "left",
};

/** Points per inch: `nodesep` and `ranksep` are in inches. */
const POINTS_PER_INCH = 72;

/**
 * The layout a DOT file's graph attributes ask for. The program is the `layout` attribute, else
 * `"dot"`, which Graphviz draws a file with when the command names none.
 * @param attributes - the file's graph attributes by name
 * @returns the layout
 * @example
 * ```ts
 * dotFileLayout({ layout: "neato", overlap: "false" });
 * // { tool: "graphviz", program: "neato", ownFormat: true, settings: { overlap: "false" } }
 * ```
 */
export function dotFileLayout(attributes: Readonly<Record<string, unknown>>): FileLayout {
    const settings: Record<string, string> = {};
    for (const name of LAYOUT_SETTINGS) {
        const value = attributes[name];
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            settings[name] = String(value);
        }
    }

    const program = typeof attributes.layout === "string" && attributes.layout !== "" ? attributes.layout : "dot";
    const direction = DIRECTIONS[settings.rankdir?.toUpperCase() ?? ""];
    const nodeSpacing = points(settings.nodesep);
    const rankSpacing = points(settings.ranksep);
    return Object.freeze({
        tool: "graphviz",
        program,
        ownFormat: true,
        ...(direction === undefined ? {} : { direction }),
        ...(nodeSpacing === undefined ? {} : { nodeSpacing }),
        ...(rankSpacing === undefined ? {} : { rankSpacing }),
        settings: Object.freeze(settings),
    });
}

/**
 * The layout a DOT file asks for, for `dotImporter.layout`: every DOT file names one.
 * @param snapshot - the graph the DOT importer read
 * @returns the layout
 */
export function dotLayout(snapshot: GraphSnapshot): FileLayout {
    const attributes: Record<string, unknown> = {};
    for (const name of snapshot.graph.names()) {
        if (snapshot.graph.isSet(name, 0)) {
            attributes[name] = snapshot.graph.value(name, 0);
        }
    }

    return dotFileLayout(attributes);
}

/**
 * A Graphviz length in inches as points. `ranksep` may follow its number with `equally`.
 * @param text - the attribute's text
 * @returns the points, or undefined when it holds no number
 */
function points(text: string | undefined): number | undefined {
    const inches = Number.parseFloat(text ?? "");
    return Number.isFinite(inches) ? inches * POINTS_PER_INCH : undefined;
}
