/**
 * Getting graphs in and out: cy.graphtyGenerate, cy.graphtyDataset, cy.graphtyImport and cy.graphtyExport.
 *
 * Every picture is deterministic: the generators are seeded, the datasets are bundled (no download), and the
 * layout is ForceAtlas2 with a fixed seed and iteration count, held on the CPU so the picture is the same on every
 * machine. The status line says so.
 */

import { DATASETS } from "@graphty/graph-samples";
import type { Meta, StoryObj } from "@storybook/html-vite";

import type { ExportFormat, GeneratorName } from "../src/index.js";
import { FORMATS, GENERATOR_PRESETS } from "./catalog.js";
import { networkArgs, renderDemo, type RunArgs } from "./demo.js";
import { BUNDLED_DATASETS, colorBy, counts, CPU_LAYOUT, placeForAlgorithm, roundTrip } from "./run.js";

/** Hides the network controls the frame defines but these stories do not use. */
const HIDDEN = Object.fromEntries(
    ["network", "size", "backend", "acceptSoftware", "options"].map((k) => [k, { table: { disable: true } }]),
);

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
        generator: { control: "select", options: Object.keys(GENERATOR_PRESETS) },
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
                    ...GENERATOR_PRESETS[args.generator],
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
    argTypes: { dataset: { control: "select", options: BUNDLED_DATASETS } },
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
    argTypes: { format: { control: "select", options: FORMATS } },
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
                const note = await roundTrip(cy, args.format, args.seed, (text) => {
                    pre.textContent = text.split("\n").slice(0, 14).join("\n");
                });
                return { ...CPU_LAYOUT, note };
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
