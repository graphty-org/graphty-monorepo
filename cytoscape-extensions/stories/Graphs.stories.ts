/**
 * Getting graphs in and out: cy.graphtyGenerate, cy.graphtyDataset, cy.graphtyImport and cy.graphtyExport.
 *
 * Every picture is deterministic: the generators are seeded, the datasets are bundled (no download), and the
 * layout is ForceAtlas2 with a fixed seed and iteration count, held on the CPU so the picture is the same on every
 * machine. The status line says so.
 */

import { DATASETS } from "@graphty/graph-samples";
import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Core } from "cytoscape";

import type { ExportFormat, GeneratorName, GeneratorOptions } from "../src/index.js";
import { networkArgs, type Outcome, PALETTE, placeForAlgorithm, renderDemo, type RunArgs } from "./demo.js";

/** A generator with options that make a readable picture of a few hundred nodes. */
const PRESETS: { [N in GeneratorName]?: GeneratorOptions<N> } = {
    "barabasi-albert": { n: 300, m: 2 },
    "planted-partition": { groups: 5, groupSize: 40, pIn: 0.15, pOut: 0.004 },
    "stochastic-block-model": {
        sizes: [60, 60, 60],
        probabilities: [
            [0.1, 0.005, 0.005],
            [0.005, 0.1, 0.005],
            [0.005, 0.005, 0.1],
        ],
    },
    lfr: {
        n: 250,
        minDegree: 4,
        maxDegree: 30,
        degreeExponent: 2.5,
        minCommunity: 20,
        maxCommunity: 60,
        communityExponent: 1.5,
        mixing: 0.1,
    },
    "watts-strogatz": { n: 200, k: 4, beta: 0.1 },
    "erdos-renyi-gnm": { n: 200, m: 400 },
    "random-geometric": { n: 300, radius: 0.1 },
    "random-tree": { n: 200 },
    grid: { rows: 15, cols: 15 },
    "connected-caveman": { cliques: 8, size: 6 },
    named: { name: "frucht" },
};

/** The bundled datasets, smallest first; the hosted ones are downloads and stay out of the snapshots. */
const BUNDLED = DATASETS.filter((d) => d.hosting !== "remote")
    .sort((a, b) => a.nodes - b.nodes)
    .map((d) => d.name);

const IMPORT_FORMATS: readonly ExportFormat[] = ["graphml", "gexf", "gml", "dot", "pajek", "csv", "json", "neo4j", "cx2"];

const CPU_LAYOUT: Pick<Outcome, "ran" | "detail"> = {
    ran: "cpu",
    detail: "the layout is held on the CPU (gpu: \"off\") so the picture is the same on every machine",
};

/** Hides the network controls the frame defines but these stories do not use. */
const HIDDEN = Object.fromEntries(
    ["network", "size", "backend", "acceptSoftware", "options"].map((k) => [k, { table: { disable: true } }]),
);

/**
 * Colors nodes by a ground-truth field (community, club, conference, ...).
 * @param cy - the core
 * @param field - the node data field, or null for none
 */
function colorBy(cy: Core, field: string | null): void {
    if (field === null) {
        return;
    }
    const groups = new Map<unknown, number>();
    cy.batch(() => {
        cy.nodes().forEach((n) => {
            const v: unknown = n.data(field);
            if (v !== undefined) {
                if (!groups.has(v)) {
                    groups.set(v, groups.size);
                }
                n.data("color", PALETTE[(groups.get(v) ?? 0) % PALETTE.length]);
            }
        });
    });
}

/**
 * Counts, for the status line.
 * @param cy - the core
 * @returns "n nodes, m edges"
 */
function counts(cy: Core): string {
    return `${cy.nodes().length.toLocaleString()} nodes, ${cy.edges().length.toLocaleString()} edges`;
}

interface GenerateArgs extends RunArgs {
    generator: GeneratorName;
    /** Generator options as JSON, merged over the preset. */
    generatorOptions: string;
}

interface DatasetArgs extends RunArgs {
    dataset: string;
}

interface ExportArgs extends RunArgs {
    format: ExportFormat;
}

const meta: Meta<RunArgs> = {
    title: "Demo/Graphs",
    argTypes: { ...HIDDEN, seed: { control: { type: "number", min: 0, step: 1 } } },
};
export default meta;

/** cy.graphtyGenerate: a seeded generator from @graphty/graph-samples, colored by its ground truth. */
export const Generate: StoryObj<GenerateArgs> = {
    args: { ...networkArgs, generator: "planted-partition", generatorOptions: "{}" },
    argTypes: {
        generator: { control: "select", options: Object.keys(PRESETS) },
        generatorOptions: { control: "text" },
    },
    render: (args) => {
        const call = { title: "" };
        return renderDemo(
            args,
            "cy.graphtyGenerate",
            async ({ cy }) => {
                colorBy(cy, cy.nodes().some((n) => n.data("community") !== undefined) ? "community" : null);
                await placeForAlgorithm(cy, args.seed);
                return { ...CPU_LAYOUT, note: call.title };
            },
            async (cy) => {
                const options = {
                    ...PRESETS[args.generator],
                    seed: args.seed,
                    ...(JSON.parse(args.generatorOptions || "{}") as Record<string, unknown>),
                };
                call.title = `cy.graphtyGenerate(${JSON.stringify(args.generator)}, ${JSON.stringify(options)})`;
                const r = await cy.graphtyGenerate(args.generator, options as never);
                return `${args.generator}, ${counts(cy)}${r.directed ? ", directed" : ""}`;
            },
        );
    },
};

/** cy.graphtyDataset: a bundled sample dataset, colored by its ground truth where it has one. */
export const Dataset: StoryObj<DatasetArgs> = {
    args: { ...networkArgs, dataset: "karate" },
    argTypes: { dataset: { control: "select", options: BUNDLED } },
    render: (args) => {
        const info = DATASETS.find((d) => d.name === args.dataset);
        return renderDemo(
            args,
            "cy.graphtyDataset",
            async ({ cy }) => {
                colorBy(cy, info?.groundTruth ?? null);
                await placeForAlgorithm(cy, args.seed);
                return { ...CPU_LAYOUT, note: info ? `${info.title}; license: ${info.license}` : undefined };
            },
            async (cy) => {
                const r = await cy.graphtyDataset(args.dataset);
                return `${args.dataset}, ${counts(cy)}${r.directed ? ", directed" : ""}`;
            },
        );
    },
};

/**
 * cy.graphtyExport then cy.graphtyImport: lays out a dataset, writes it in the chosen format (the text is shown
 * under the graph), clears the core and reads the text back. Formats that carry positions keep the picture; the
 * others are laid out again.
 */
export const ExportAndImport: StoryObj<ExportArgs> = {
    args: { ...networkArgs, format: "graphml" },
    argTypes: { format: { control: "select", options: IMPORT_FORMATS } },
    render: (args) => {
        const pre = document.createElement("pre");
        pre.dataset.testid = "file";
        pre.style.cssText =
            "flex:none;height:180px;margin:0;padding:8px 12px;overflow:hidden;border-top:1px solid #ddd;font:11px ui-monospace,monospace;background:#fafafa;";
        const root = renderDemo(
            args,
            `cy.graphtyExport(${JSON.stringify(args.format)}) then cy.graphtyImport`,
            async ({ cy, setStatus }) => {
                colorBy(cy, "club");
                await placeForAlgorithm(cy, args.seed);
                setStatus(`writing ${args.format}...`);
                const text = await cy.graphtyExport(args.format);
                pre.textContent = text.split("\n").slice(0, 14).join("\n");
                cy.elements().remove();
                const r = await cy.graphtyImport(text, args.format);
                colorBy(cy, "club");
                const placed = cy.nodes().filter((n) => n.position().x !== 0 || n.position().y !== 0).length > 0;
                if (!placed) {
                    await placeForAlgorithm(cy, args.seed);
                }
                const warnings = r.report.warningCount > 0 ? `, ${r.report.warningCount} warning${r.report.warningCount === 1 ? "" : "s"}` : "";
                return {
                    ...CPU_LAYOUT,
                    note: `${text.length.toLocaleString()} characters of ${r.format}, read back as ${counts(cy)}${warnings}; positions ${placed ? "from the file" : "not in the format: laid out again"}`,
                };
            },
            async (cy) => {
                await cy.graphtyDataset("karate");
                return `karate, ${counts(cy)}`;
            },
        );
        root.append(pre);
        return root;
    },
};
