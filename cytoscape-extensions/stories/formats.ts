/**
 * The Formats gallery: one real file per format read by cy.graphtyImport, with the start of the file beside the
 * graph it became, one file read with no format named (sniffed), and karate written by cy.graphtyExport in every
 * format with what each one leaves out.
 *
 * Every file is MIT or CC0 licensed and ships in this repository: graph-io's published samples, its test corpus,
 * and its conformance fixtures (each fixture's license is in its directory's manifest.json).
 */

import type { Core, StylesheetJson } from "cytoscape";

import gml from "../../graph-io/docs/samples/got.gml?raw";
import csv from "../../graph-io/docs/samples/got-edges.csv?raw";
import graphml from "../../graph-io/docs/samples/got-network.graphml?raw";
import movies from "../../graph-io/docs/samples/movies-nodes.csv?raw";
import movieRels from "../../graph-io/docs/samples/movies-rels.csv?raw";
import xgmml from "../../graph-io/docs/samples/proteins.xgmml?raw";
import dot from "../../graph-io/docs/samples/teams.gv?raw";
import cx from "../../graph-io/test/conformance/fixtures/cx/rcx/Direct-p53-effectors.cx?raw";
import cysUrl from "../../graph-io/test/conformance/fixtures/cys/tutorials/STELZ.cys?url";
import gexf from "../../graph-io/test/conformance/fixtures/gexf/graphology/les_miserables.gexf?raw";
import compound from "../../graph-io/test/conformance/fixtures/json/cytoscape/network-compound-nodes.json?raw";
import json from "../../graph-io/test/conformance/fixtures/json/jgf/les_miserables.json?raw";
import cx2 from "../../graph-io/test/corpus/cx2/emt-network.cx2?raw";
import obo from "../../graph-io/test/corpus/obo/taxrank.obo?raw";
import pajek from "../../graph-io/test/corpus/pajek/karate.net?raw";
import type { ImportFormat, LossNote } from "../src/index.js";
import { FORMATS } from "./catalog.js";
import { PALETTE } from "./demo.js";
import type { Tile } from "./gallery.js";
import { colorBy, counts, placeForAlgorithm } from "./run.js";

const SEED = 42;

/** A sample file and how its tile draws what the file holds. */
interface Sample {
    /** The file name. */
    file: string;
    /** The file's text, or for a binary file its URL. */
    text?: string;
    url?: string;
    /** One sentence: what the file is and what the reader sees of it. */
    about: string;
    /** The data field shown as each node's label: default the id, null for none. */
    label?: string | null;
    /** The data field shown as each edge's label. */
    edgeLabel?: string;
    /** Draws an arrow at each edge's target. */
    arrows?: boolean;
    /** The edge field shown as the edge's width. */
    edgeWidth?: string;
    /** Turns attributes the file holds into colors (data.color, which the demo's stylesheet draws). */
    color?(cy: Core): void;
    /** Lays out a file without positions; default ForceAtlas2, seed 42. */
    layout?(cy: Core): Promise<void>;
    /** The name of `layout`, for the caption. */
    layoutName?: string;
    /** More style rules, given the factor that turns screen pixels into model units. */
    style?(k: number): StylesheetJson;
}

/**
 * Colors each edge by a field, one palette color per value.
 * @param cy - the core
 * @param field - the edge field
 */
function colorEdgesBy(cy: Core, field: string): void {
    const seen = new Map<unknown, string>();
    cy.edges().forEach((e) => {
        const v: unknown = e.data(field);
        if (!seen.has(v)) {
            seen.set(v, PALETTE[seen.size % PALETTE.length]);
        }
        e.data("color", seen.get(v));
    });
}

/**
 * Runs a Cytoscape layout and waits for it.
 * @param cy - the core
 * @param options - the layout options
 * @returns when the layout stops
 */
function layout(cy: Core, options: Record<string, unknown>): Promise<void> {
    return new Promise((resolve) => {
        const l = cy.layout(options as never);
        l.one("layoutstop", () => resolve());
        l.run();
    });
}

/** The file read for each format. */
const SAMPLES: Record<Exclude<ImportFormat, "auto">, Sample> = {
    graphml: {
        file: "got-network.graphml",
        text: graphml,
        about: "Game of Thrones characters (CC0). Each character's label and each edge's weight are typed GraphML attributes; edge width shows the weight.",
        label: "label",
        edgeWidth: "weight",
    },
    gexf: {
        file: "les_miserables.gexf",
        text: gexf,
        about: "Les Miserables as drawn in Gephi (MIT). The positions, sizes and colors are the file's viz attributes; data.color arrives as [r, g, b, a] from 0 to 1.",
        label: "label",
        color: (cy) =>
            cy.nodes().forEach((n) => {
                const c = n.data("color") as number[] | undefined;
                if (Array.isArray(c)) {
                    n.data(
                        "color",
                        `rgb(${c
                            .slice(0, 3)
                            .map((x) => Math.round(255 * x))
                            .join(",")})`,
                    );
                }
            }),
        // Gephi's sizes are in the same units as its positions
        style: () => [{ selector: "node[size]", style: { width: "data(size)", height: "data(size)" } }],
    },
    gml: {
        file: "got.gml",
        text: gml,
        about: "The same Game of Thrones network as GML (CC0): a label on each node and a weight on each edge, shown as its width.",
        label: "label",
        edgeWidth: "weight",
    },
    dot: {
        file: "teams.gv",
        text: dot,
        about: "A Graphviz digraph (MIT). Each cluster subgraph becomes a compound parent node (Design, Build); the feedback edge keeps its label and its dashed style attribute.",
        label: "label",
        edgeLabel: "label",
        arrows: true,
        // Cytoscape's cose keeps each cluster's members together inside their parent
        layoutName: "Cytoscape's cose layout",
        layout: async (cy) => {
            await placeForAlgorithm(cy, SEED);
            await layout(cy, { name: "cose", randomize: false, animate: false, padding: 30 });
        },
        style: () => [{ selector: 'edge[style = "dashed"]', style: { "line-style": "dashed" } }],
    },
    pajek: {
        file: "karate.net",
        text: pajek,
        about: "Zachary's karate club as a Pajek network (MIT): a *Vertices list with a label per actor, then the *Edges.",
        label: "label",
    },
    csv: {
        file: "got-edges.csv",
        text: csv,
        about: "An edge table with Source, Target and Weight columns (CC0). The nodes are made from the edges' ends; edge width shows the weight.",
        label: "id",
        edgeWidth: "weight",
    },
    json: {
        file: "les_miserables.json",
        text: json,
        about: "Les Miserables in JSON Graph Format (MIT): nodes keyed by id, each with a metadata group, which colors it.",
        label: "label",
        color: (cy) => colorBy(cy, "group"),
    },
    neo4j: {
        file: "movies-nodes.csv + movies-rels.csv",
        text: movies + movieRels,
        arrows: true,
        about: "A Neo4j bulk-import bundle (MIT): Movie and Person rows, then relationship rows. Node color shows the id space (Movie or Person); each edge is labeled with its :TYPE.",
        edgeLabel: "type",
        color: (cy) => colorBy(cy, "idSpace"),
        // a movie has a title, a person a name
        label: "title",
    },
    xgmml: {
        file: "proteins.xgmml",
        text: xgmml,
        about: "A network saved by Cytoscape desktop as XGMML (MIT), at its saved positions, with each edge's interaction.",
        label: "label",
        edgeLabel: "interaction",
    },
    cx2: {
        file: "emt-network.cx2",
        text: cx2,
        about: "An NDEx network of the EMT pathway (MIT), at its saved positions; edge color shows the Type attribute. The file's own style rules are not applied: the page's stylesheet draws it.",
        label: "name",
        color: (cy) => colorEdgesBy(cy, "Type"),
    },
    cx: {
        file: "Direct-p53-effectors.cx",
        text: cx,
        about: "The NCI direct p53 effectors network in CX (MIT), at its saved positions. Edge color shows the interaction attribute: controls-expression-of in blue, in-complex-with in orange.",
        label: "name",
        color: (cy) => colorEdgesBy(cy, "interaction"),
    },
    obo: {
        file: "taxrank.obo",
        text: obo,
        about: "The taxonomic rank ontology (CC0). Each [Term] becomes a node named by its name tag, and each is_a an edge to its parent term, at the center.",
        label: "name",
        layoutName: "Cytoscape's concentric layout",
        layout: (cy) =>
            layout(cy, {
                name: "concentric",
                concentric: (n: { degree(): number }) => n.degree(),
                levelWidth: () => 2,
                padding: 30,
            }),
    },
    cys: {
        file: "STELZ.cys",
        url: cysUrl,
        about: "A Cytoscape desktop session (CC0) from the Cytoscape tutorials: the Stelzl human protein interaction network, read at the positions it was saved with.",
        label: null,
    },
};

/** The file read with no format named: graphtyImport sniffs it. */
const AUTO: Sample = {
    file: "network-compound-nodes.json",
    text: compound,
    about: "No format named: the content is sniffed. The Cytoscape.js compound-nodes demo (MIT), with its parents and saved positions; the file's own style block is not applied.",
    arrows: true,
};

/**
 * The start of a file, for the panel beside the graph: a JSON file written on one line is indented first.
 * @param s - the sample
 * @param size - the file's size
 * @returns the text
 */
function filePanel(s: Sample, size: number): string {
    const head = `${s.file}, ${size.toLocaleString()} ${s.text === undefined ? "bytes" : "characters"}\n\n`;
    if (s.text === undefined) {
        return `${head}(a zip archive: the networks as XGMML, their tables as CSV, the styles as XML)`;
    }
    let text = s.text.slice(0, 20_000);
    if (/^\s*[[{]/.test(text) && text.split("\n", 1)[0].length > 200) {
        try {
            text = JSON.stringify(JSON.parse(s.text), null, 1);
        } catch {
            // not JSON after all: show it as it is
        }
    }
    return head + text.split("\n").slice(0, 80).join("\n");
}

/**
 * Sizes everything in screen pixels, whatever the units of the file's positions, and adds the sample's labels and
 * widths. Run after the graph is fitted to its canvas.
 * @param cy - the core
 * @param s - the sample
 */
function styleFor(cy: Core, s: Sample): void {
    const k = 1 / cy.zoom();
    // a tile of the Overview is too small for labels
    const small = cy.width() < 400;
    // smaller nodes on a large network, so its structure shows instead of a solid mass
    const node = (small ? 4 : 8) * Math.min(1, Math.sqrt(300 / cy.nodes().length));
    const rules: StylesheetJson = [
        { selector: "node", style: { width: node * k, height: node * k, "font-size": 10 * k, color: "#333" } },
        { selector: "edge", style: { width: 0.8 * k, "font-size": 9 * k, color: "#555" } },
        { selector: "edge[color]", style: { width: 1.5 * k } },
        {
            selector: ":parent",
            style: { "background-opacity": 0.08, "border-width": k, "border-color": "#9aa4b5", "text-valign": "top" },
        },
    ];
    if (s.label !== null && !small) {
        const field = s.label ?? "id";
        rules.push({
            selector: "node",
            style: {
                label: (n: { data(f: string): unknown }) => String(n.data(field) ?? n.data("name") ?? n.data("id")),
                "text-margin-y": -2 * k,
            },
        });
    }
    if (s.arrows === true) {
        // Cytoscape's arrow is about 7 model units at arrow-scale 1 on a thin edge: scaled to about 8 screen pixels
        rules.push({
            selector: "edge",
            style: {
                "target-arrow-shape": "triangle",
                "arrow-scale": (small ? 0.6 : 1.1) * k,
                "curve-style": "bezier",
            },
        });
    }
    if (s.edgeLabel !== undefined && !small) {
        const field = s.edgeLabel;
        rules.push({
            selector: "edge",
            style: { label: (e: { data(f: string): unknown }) => String(e.data(field) ?? "") },
        });
    }
    if (s.edgeWidth !== undefined) {
        const field = s.edgeWidth;
        const values = cy.edges().map((e) => Number(e.data(field)));
        const hi = Math.max(...values.filter(Number.isFinite), 1);
        rules.push({
            selector: "edge",
            style: { width: (e: { data(f: string): unknown }) => (0.5 + (4 * Number(e.data(field) ?? 0)) / hi) * k },
        });
    }
    rules.push(...(s.style?.(k) ?? []));
    // appended to the demo's stylesheet, so these win
    const sheet = cy.style();
    for (const rule of rules as { selector: string; style: Record<string, unknown> }[]) {
        sheet.selector(rule.selector).style(rule.style);
    }
    sheet.update();
}

/**
 * The tile that reads one sample file.
 * @param format - the format passed to graphtyImport
 * @param s - the sample
 * @returns the tile
 */
function importTile(format: ImportFormat, s: Sample): Tile {
    return {
        title: format === "auto" ? "cy.graphtyImport(file)" : `cy.graphtyImport(file, "${format}")`,
        panel: true,
        load: () => undefined,
        run: async (cy) => {
            const input = s.text ?? (await (await fetch(s.url ?? "")).arrayBuffer());
            const size = typeof input === "string" ? input.length : input.byteLength;
            const r = await cy.graphtyImport(input, format);
            s.color?.(cy);
            const placed = cy.nodes().filter((n) => n.position().x !== 0 || n.position().y !== 0).length > 0;
            if (placed) {
                cy.fit(undefined, 30);
            } else {
                await (s.layout ?? ((c: Core) => placeForAlgorithm(c, SEED)))(cy);
            }
            styleFor(cy, s);
            // the labels are part of the drawing now: fit them in too
            cy.fit(undefined, 30);
            const grouped = cy.nodes(":child").length;
            const where = placed
                ? "positions from the file"
                : `no positions in the file: laid out by ${s.layoutName ?? "ForceAtlas2, seed 42"}`;
            const read = `${format === "auto" ? "detected" : "read"} as ${r.format}: ${counts(cy)}${grouped > 0 ? ` (${grouped} inside groups)` : ""}; ${where}`;
            return {
                ran: "",
                detail: null,
                note: cy.width() < 400 ? read : `${read}\n${s.about}`,
                file: filePanel(s, size),
            };
        },
    };
}

/** What a loss note means for a Cytoscape graph, in words; null for a note about nothing the reader would miss. */
const LOST: Partial<Record<string, string | null>> = {
    W_POSITIONS_DROPPED: "positions",
    W_EDGE_IDS_DROPPED: "edge ids",
    W_EDGE_IDS_GENERATED: "edge ids (renumbered)",
    W_CSV_NODE_TABLE: 'node attributes (export them with table: "nodes")',
    W_DIRECTION_DROPPED: "undirected (reads back directed)",
    W_NEO4J_UNDIRECTED_AS_DIRECTED: "undirected (reads back directed)",
    W_CX2_UNDIRECTED_AS_DIRECTED: "undirected (reads back directed)",
    // the position comes back as a property of its own, or with a z of 0
    W_COMPONENTS_FLATTENED: null,
    W_XGMML_POSITION: null,
    // a label is added, not lost
    W_PAJEK_LABEL_GAINED: null,
    // the edge ids are already listed as renumbered
    W_DTYPE_UNSUPPORTED: null,
};

/**
 * What a format leaves out, in words.
 * @param notes - what onLoss heard
 * @returns the words, or "nothing"
 */
function leftOut(notes: readonly LossNote[]): string {
    const words = new Set<string>();
    for (const n of notes) {
        const word = n.code in LOST ? LOST[n.code] : n.code;
        if (typeof word === "string") {
            words.add(word);
        }
    }
    return words.size === 0 ? "nothing" : [...words].join("; ");
}

/** The tile that writes karate in every format graphtyExport writes. */
function exportTile(): Tile {
    return {
        title: "cy.graphtyExport(format, { onLoss })",
        panel: true,
        load: async (cy) => {
            await cy.graphtyDataset("karate");
        },
        run: async (cy) => {
            await placeForAlgorithm(cy, SEED);
            const rows = [];
            for (const format of FORMATS) {
                let notes: readonly LossNote[] = [];
                const text = await cy.graphtyExport(format, {
                    onLoss: (n) => {
                        notes = n;
                    },
                });
                rows.push(`${format.padEnd(8)}${text.length.toLocaleString().padStart(7)}  ${leftOut(notes)}`);
            }
            // colored after writing, so the color is not one of the written attributes
            colorBy(cy, "club");
            return {
                ran: "",
                detail: null,
                note:
                    cy.width() < 400
                        ? "Zachary's karate club written in every format; beside it, what each one leaves out."
                        : `Zachary's karate club (${counts(cy)}, a club per node, positions from ForceAtlas2) written in every format.\nBeside it: each file's size in characters, and what onLoss reports the format cannot hold.`,
                file: ["format    chars  left out", ...rows].join("\n"),
            };
        },
    };
}

/**
 * The tile of one Formats gallery entry.
 * @param key - a format, "auto", or "export"
 * @returns the tile
 */
export function formatTile(key: string): Tile {
    if (key === "export") {
        return exportTile();
    }
    return key === "auto"
        ? importTile("auto", AUTO)
        : importTile(key as ImportFormat, SAMPLES[key as keyof typeof SAMPLES]);
}
