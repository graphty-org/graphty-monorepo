/**
 * The Formats gallery: one real file per format read by cy.graphtyImport, with a summary of what was read and the
 * whole file beside the graph it became, one file read with no format named (sniffed), and karate written by cy.graphtyExport in every
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
import dot from "../../graph-io/docs/samples/teams.gv?raw";
import cx from "../../graph-io/test/conformance/fixtures/cx/rcx/Direct-p53-effectors.cx?raw";
import cysUrl from "../../graph-io/test/conformance/fixtures/cys/tutorials/STELZ.cys?url";
import gexf from "../../graph-io/test/conformance/fixtures/gexf/graphology/les_miserables.gexf?raw";
import compound from "../../graph-io/test/conformance/fixtures/json/cytoscape/network-compound-nodes.json?raw";
import json from "../../graph-io/test/conformance/fixtures/json/jgf/les_miserables.json?raw";
import xgmml from "../../graph-io/test/conformance/fixtures/xgmml/efi-est/20920_3-oxoacyl_c_20_full_ssn.xgmml?raw";
import cx2 from "../../graph-io/test/corpus/cx2/emt-network.cx2?raw";
import obo from "../../graph-io/test/corpus/obo/taxrank.obo?raw";
import pajek from "../../graph-io/test/corpus/pajek/karate.net?raw";
import type { ImportedGraph, ImportFormat, LossNote } from "../src/index.js";
import { FORMATS } from "./catalog.js";
import { datasetOptions, PALETTE } from "./demo.js";
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
        file: "20920_3-oxoacyl_c_20_full_ssn.xgmml",
        text: xgmml,
        about: "A sequence similarity network from the EFI-EST web tool (MIT): 105 carrier proteins of natural-product pathways (each named in its Description list), joined where their sequences align, so related proteins gather in clusters (each cluster of two or more in its own color); edge width shows the alignment score.",
        label: null,
        color: (cy) =>
            cy
                .elements()
                .components()
                .filter((c) => c.nodes().length > 1)
                .forEach((c, i) => c.nodes().data("color", PALETTE[i % PALETTE.length])),
        edgeWidth: "alignment_score",
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
 * The whole file, for the source panel beside the graph: a JSON file written on one line is indented first.
 * @param s - the sample
 * @returns the text
 */
function fileSource(s: Sample): string {
    if (s.text === undefined) {
        return "(a zip archive, not text:\nthe networks as XGMML,\ntheir tables as CSV,\nthe styles as XML)";
    }
    if (/^\s*[[{]/.test(s.text) && s.text.split("\n", 1)[0].length > 200) {
        try {
            return JSON.stringify(JSON.parse(s.text), null, 1);
        } catch {
            // not JSON after all: show it as it is
        }
    }
    return s.text;
}

/**
 * The data fields of a collection and the kinds of value each holds, as the core holds them after the import.
 * @param eles - the nodes or the edges
 * @returns "name (kind)" per field, in first-seen order; a field holding several kinds lists them all
 */
function fieldKinds(eles: { forEach(f: (e: { data(): Record<string, unknown> }) => void): unknown }): string[] {
    const kinds = new Map<string, Set<string>>();
    eles.forEach((e) => {
        for (const [k, v] of Object.entries(e.data())) {
            if (k === "id" || k === "source" || k === "target" || k === "parent" || v === null || v === undefined) {
                continue;
            }
            const kind = Array.isArray(v) ? "list" : typeof v;
            kinds.set(k, (kinds.get(k) ?? new Set()).add(kind));
        }
    });
    return [...kinds].map(([k, v]) => `${k} (${[...v].join(" or ")})`);
}

/**
 * The short summary of what an import read, shown above the file's source: the file, its size, the counts graph-io
 * reports, every node and edge attribute with its kind, and the importer's issues and loss notes grouped by code.
 * Call it right after cy.graphtyImport, before anything else writes data fields.
 * @param file - the file name
 * @param bytes - the file's size in bytes
 * @param r - what graphtyImport returned
 * @param cy - the core it imported into
 * @returns the summary's lines
 */
export function parseSummary(file: string, bytes: number, r: ImportedGraph, cy: Core): string {
    const { counts: c, issues, lossy } = r.report;
    const skipped =
        c.skippedNodes + c.skippedEdges > 0 ? ` (skipped ${c.skippedNodes} nodes, ${c.skippedEdges} edges)` : "";
    const lines = [
        `${file}, ${bytes.toLocaleString("en-US")} bytes`,
        `read as ${r.format}: ${c.nodes.toLocaleString("en-US")} nodes, ${c.edges.toLocaleString("en-US")} edges${skipped}`,
        `node attributes: ${fieldKinds(cy.nodes()).join(", ") || "none"}`,
        `edge attributes: ${fieldKinds(cy.edges()).join(", ") || "none"}`,
    ];
    // one line per code, with how many times it came up and the first message
    const byCode = new Map<string, { message: string; n: number }>();
    for (const { code, message } of [...issues, ...lossy]) {
        const seen = byCode.get(code);
        byCode.set(code, { message: seen?.message ?? message, n: (seen?.n ?? 0) + 1 });
    }
    lines.push(byCode.size === 0 ? "import notes: none" : "import notes:");
    for (const [code, { message, n }] of byCode) {
        // a message can list dozens of names (a session's skipped entries): the start of it, marked as cut
        const short = message.length > 160 ? `${message.slice(0, 157)}...` : message;
        lines.push(`  ${code}${n > 1 ? ` (x${n})` : ""}: ${short}`);
    }
    return lines.join("\n");
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
            const bytes = typeof input === "string" ? new TextEncoder().encode(input).length : input.byteLength;
            const r = await cy.graphtyImport(input, format);
            // before the sample's colors are written into the data
            const summary = parseSummary(s.file, bytes, r, cy);
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
                note: read,
                summary,
                file: fileSource(s),
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
    // the core's stylesheet is the gallery's own look, not the karate club's: the dataset has no styles to lose
    W_STYLES_NOT_EXPORTED: null,
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
            await cy.graphtyDataset("karate", datasetOptions());
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
                note: "Zachary's karate club written in every format; beside it, what each one leaves out.",
                file: ["format    chars  left out", ...rows].join("\n"),
            };
        },
    };
}

/**
 * What a Formats gallery entry's file is and how to read its picture, for the story's description.
 * @param key - a format, "auto", or "export"
 * @returns the words
 */
export function formatAbout(key: string): string {
    if (key === "export") {
        return "Zachary's karate club (34 nodes, 78 edges, a club per node, positions from ForceAtlas2) written with cy.graphtyExport in every format. Beside it: each file's size in characters, and what onLoss reports the format cannot hold.";
    }
    return key === "auto" ? AUTO.about : SAMPLES[key as keyof typeof SAMPLES].about;
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
