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
    "compound",
] as const;

/** Each `rankdir` and the way its ranks run. */
const DIRECTIONS: Readonly<Partial<Record<string, NonNullable<FileLayout["direction"]>>>> = {
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
    const given: Partial<Record<string, string>> = settings;
    const direction = DIRECTIONS[given.rankdir?.toUpperCase() ?? ""];
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

/** The Graphviz layout programs graphty draws a file with, each as layout `graphviz-<program>`. */
const GRAPHVIZ_ENGINES: ReadonlySet<string> = new Set([
    "dot",
    "neato",
    "fdp",
    "sfdp",
    "circo",
    "twopi",
    "osage",
    "patchwork",
]);

/** The layout settings Graphviz's routes between placed nodes follow: the kind of line and how far it keeps from the nodes. */
const ROUTE_SETTINGS = ["splines", "sep", "esep"] as const;

/**
 * The layout a file asks to be drawn with, as a graphty layout and its options: a fact about the
 * file that names no format, program or tool. Nothing is laid out.
 * @category Loading
 */
export interface RequestedLayout {
    /** The graphty layout id (`"graphviz-neato"`). */
    readonly layout: string;
    /** The layout's options: the file's layout settings as `attributes`, and `nodeSize` when the file sizes its nodes by their labels. */
    readonly options: Readonly<Record<string, unknown>>;
    /**
     * The options for the file's own coordinates instead, when it places every node: draw them where
     * they are and route the edges round them (`{ edgeRoutes: "graphviz", graphvizAttributes }`).
     * Absent when the file asks for no such routing.
     */
    readonly routedWhenPlaced?: Readonly<Record<string, unknown>>;
}

/**
 * The layout a loaded file asks for. A DOT file always asks for one: the Graphviz program its
 * `layout` attribute names (dot for none, or one graphty does not run), its nodes sized by their
 * labels, and its edges routed round the nodes when the file places them. A file of any other
 * format asks for one only when its graph-level `layout` attribute names a Graphviz program.
 * @param format - the format the file was read as
 * @param attributes - the file's graph-level attributes by name
 * @returns the request, or null when the file asks for none
 * @example
 * ```ts
 * requestedLayout("dot", { layout: "neato", overlap: "false" });
 * // { layout: "graphviz-neato", options: { attributes: { overlap: "false" }, nodeSize: "label" },
 * //   routedWhenPlaced: { edgeRoutes: "graphviz", graphvizAttributes: {} } }
 * ```
 * @category Loading
 */
export function requestedLayout(format: string, attributes: Readonly<Record<string, unknown>>): RequestedLayout | null {
    const own = format === "dot";
    if (!own && !(typeof attributes.layout === "string" && GRAPHVIZ_ENGINES.has(attributes.layout))) {
        return null;
    }

    const { program, settings } = dotFileLayout(attributes);
    const options = {
        ...(Object.keys(settings).length === 0 ? {} : { attributes: { ...settings } }),
        ...(own ? { nodeSize: "label" } : {}),
    };
    const routes: Record<string, string> = {};
    for (const name of ROUTE_SETTINGS) {
        const value = (settings as Partial<Record<string, string>>)[name];
        if (value !== undefined) {
            routes[name] = value;
        }
    }

    return Object.freeze({
        layout: `graphviz-${GRAPHVIZ_ENGINES.has(program) ? program : "dot"}`,
        options: Object.freeze(options),
        ...(own ? { routedWhenPlaced: Object.freeze({ edgeRoutes: "graphviz", graphvizAttributes: routes }) } : {}),
    });
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
