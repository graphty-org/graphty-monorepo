/**
 * @file A file reader of your own: a graph-io importer turned into a reader with
 * `DataSource.fromImporter` and registered with `DataSource.register`, then chosen by name through
 * the element's `data-source` attribute, exactly as a built-in format is chosen.
 *
 * The file is tab-separated, but not an edge list: each row is one family, and its
 * `married_into` column holds every family it married into, separated by commas. The built-in CSV
 * reader can be told which columns hold an edge's two ends (its `edgeSource` and `edgeTarget`
 * options), but it cannot split one cell into several edges, so this file needs a reader of its
 * own. The data is the Florentine families marriage network (Padgett and Ansell, 1993), the same
 * 15 families and 20 marriages as graph-samples' `florentine-families` dataset.
 */

import type { Decorator, Meta, StoryObj } from "@storybook/web-components-vite";

import { DataSource, type FormatDescriptor, type GraphImporter, type ImporterReport, ImportError } from "../../extend";
import { assertGraphLoaded, drawn } from "../assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "../helpers";
import marriagesPath from "./florentine-marriages.tsv?url";

/** The file, served by Storybook itself and made absolute against the page, as the element wants a URL. */
const marriagesUrl = new URL(marriagesPath, document.baseURI).href;

/** The format's name: what `data-source` names and what the catalogue lists. */
const FORMAT = "acme-marriages";

/** How many families and marriages the file holds, for the hidden twin's check. */
const FAMILIES = 15;
const MARRIAGES = 20;

/**
 * Reads `family<TAB>married_into` rows, where `married_into` is a comma-separated list. Every
 * marriage is listed under both families, so each pair becomes one edge.
 */
const marriagesImporter: GraphImporter = {
    format: FORMAT,
    extensions: [".tsv"],
    mimeTypes: ["text/tab-separated-values"],

    import(input, sink) {
        if (typeof input !== "string" && !(input instanceof Uint8Array)) {
            return Promise.reject(new TypeError("the marriages reader reads text or bytes"));
        }

        const text = typeof input === "string" ? input : new TextDecoder().decode(input);
        const [header = "", ...rows] = text.trim().split(/\r?\n/);
        const columns = header.split("\t");
        const familyColumn = columns.indexOf("family");
        const partnersColumn = columns.indexOf("married_into");

        const report = (): ImporterReport => ({
            format: FORMAT,
            counts: { nodes: 0, edges: sink.edgeCount, skippedNodes: 0, skippedEdges: 0, expandedMixed: 0 },
            issues: [],
            errorCount: 0,
            warningCount: 0,
            truncated: false,
            lossy: [],
            durationMs: 0,
        });

        if (familyColumn < 0 || partnersColumn < 0) {
            return Promise.reject(
                new ImportError('the header row needs "family" and "married_into" columns', report()),
            );
        }

        // A marriage joins two families; it has no direction.
        sink.setDirected(false);

        const seen = new Set<string>();
        for (const row of rows) {
            const cells = row.split("\t");
            const family = cells[familyColumn]?.trim() ?? "";
            const partners = (cells[partnersColumn] ?? "").split(",").map((name) => name.trim());
            // Every family has a row of its own, so each row declares its family as a node.
            sink.addNode(family);

            for (const partner of partners.filter((name) => name !== "")) {
                const pair = [family, partner].sort().join("\t");
                if (!seen.has(pair)) {
                    seen.add(pair);
                    sink.addEdgeRecord(family, partner, {});
                }
            }
        }

        return Promise.resolve(report());
    },
};

/** What the catalogue publishes about the format. */
const MARRIAGES_FORMAT: FormatDescriptor = {
    id: FORMAT,
    plainName: "Family marriages (TSV)",
    extensions: [".tsv"],
    mimeTypes: ["text/tab-separated-values"],
    canImport: true,
    canExport: false,
    options: [],
};

DataSource.register(
    DataSource.fromImporter(marriagesImporter, MARRIAGES_FORMAT, {
        statedBy: () => "a marriage joins two families",
    }),
);

/** What a reader writes to get this picture: the reader, its registration and the element. */
const CONSUMER_SOURCE = `<graphty-element
    data-source="acme-marriages"
    data-source-config='{"url": "florentine-marriages.tsv"}'
    layout="ngraph"
    layout-config='{"seed": 42}'
    view-mode="2d"
></graphty-element>

<script type="module">
    import { DataSource, ImportError } from "@graphty/graphty-element/extend";

    // family<TAB>married_into, where married_into lists every family it married into.
    const marriagesImporter = {
        format: "acme-marriages",
        extensions: [".tsv"],
        mimeTypes: ["text/tab-separated-values"],
        import(input, sink) {
            const text = typeof input === "string" ? input : new TextDecoder().decode(input);
            const [header, ...rows] = text.trim().split(/\\r?\\n/);
            const columns = header.split("\\t");
            const family = columns.indexOf("family");
            const partners = columns.indexOf("married_into");
            const report = () => ({
                format: "acme-marriages",
                counts: { nodes: 0, edges: sink.edgeCount, skippedNodes: 0, skippedEdges: 0, expandedMixed: 0 },
                issues: [], errorCount: 0, warningCount: 0, truncated: false, lossy: [], durationMs: 0,
            });
            if (family < 0 || partners < 0) {
                return Promise.reject(new ImportError('needs "family" and "married_into" columns', report()));
            }

            sink.setDirected(false);
            const seen = new Set();
            for (const row of rows) {
                const cells = row.split("\\t");
                sink.addNode(cells[family]);
                for (const partner of cells[partners].split(",").map((name) => name.trim())) {
                    const pair = [cells[family], partner].sort().join("\\t");
                    if (partner && !seen.has(pair)) {
                        seen.add(pair);
                        sink.addEdgeRecord(cells[family], partner, {});
                    }
                }
            }
            return Promise.resolve(report());
        },
    };

    DataSource.register(
        DataSource.fromImporter(marriagesImporter, {
            id: "acme-marriages",
            plainName: "Family marriages (TSV)",
            extensions: [".tsv"],
            mimeTypes: ["text/tab-separated-values"],
            canImport: true,
            canExport: false,
            options: [],
        }, { statedBy: () => "a marriage joins two families" }),
    );

    // Show each family's name on its node.
    document.querySelector("graphty-element").session.styles.add({
        name: "Family names",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.label": { by: "data.id", scale: "passthrough" } },
    });
    // A marriage has no direction, so no arrow heads.
    document.querySelector("graphty-element").session.styles.add({
        name: "Marriages",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none" },
    });
</script>`;

/** The line above the canvas: what is drawn, and how it was read. */
const CAPTION =
    "Read by a reader of your own: a tab-separated file whose married_into column lists several families " +
    "in one cell, turned into edges by a graph-io importer registered with DataSource.fromImporter. " +
    "Data: marriages between 15 Florentine families around 1430 (Padgett and Ansell, 1993).";

/**
 * Puts the caption above the element.
 * @param story - The story.
 * @returns The caption and the element.
 */
const withCaption: Decorator<StoryArgs> = (story) => {
    const root = document.createElement("div");
    const caption = document.createElement("p");
    caption.textContent = CAPTION;
    caption.style.cssText = "margin: 0 0 12px; font: 16px/1.5 sans-serif; color: #1f2933; max-width: 1100px;";
    root.append(caption, story() as Node);
    return root;
};

const meta: Meta<StoryArgs> = {
    title: "Extending/Custom file reader",
    component: "graphty-element",
    tags: ["autodocs"],
    render: renderFn,
    decorators: [eventWaitingDecorator, withCaption],
    parameters: {
        docs: {
            description: {
                component:
                    "Teach the element a file format it does not ship. Write a graph-io importer -- an object whose " +
                    "`import(input, sink)` adds the file's edges to `sink` -- turn it into a reader with " +
                    "`DataSource.fromImporter(importer, descriptor)`, and register it with `DataSource.register`. " +
                    "From then on the format is chosen by name, like a built-in one: " +
                    '`<graphty-element data-source="acme-marriages">`.\n\n' +
                    "The file here is tab-separated, but each row is one family and its `married_into` column lists " +
                    "every family it married into. The built-in CSV reader reads a file whose two end columns have " +
                    "names of their own (its `edgeSource` and `edgeTarget` options), but it cannot split one cell " +
                    "into several edges, which is when a reader of your own is the answer. For full control -- " +
                    "options, per-record validation, content detection -- extend `DataSource` instead: see " +
                    "[Custom file formats](https://graphty.app/docs/graphty-element/guide/extending/custom-data-sources).",
            },
            source: { code: CONSUMER_SOURCE, language: "html" },
        },
    },
    args: {
        dataSource: FORMAT,
        dataSourceConfig: { url: marriagesUrl },
        layout: "ngraph",
        layoutConfig: { seed: 42 },
        setup: storySetup({
            viewMode: "2d",
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
            // A marriage has no direction, so no arrow heads.
            edge: { "edge.arrowHead": "none" },
        }),
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/** The marriages file, read by the reader registered above. */
export const TabSeparatedFile: Story = {
    name: "Tab-separated file with a list column",
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

/** The same story with its checks: every family and every marriage arrived, each marriage once. */
export const TabSeparatedFileInteractions: Story = {
    name: "Tab-separated file with a list column (checks)",
    tags: ["regression", "!dev", "!autodocs"],
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, "Extending/Custom file reader TabSeparatedFileInteractions");
        await assertGraphLoaded(scene, { nodes: FAMILIES, edges: MARRIAGES });
    },
};
