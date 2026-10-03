/**
 * Every layout, algorithm, generator, bundled dataset and file format at once, one small Cytoscape per tile. These
 * are the pictures CI captures and compares, so each is deterministic: seeded graphs, fixed iteration counts, no
 * animation, no times. Each tile says which backend ran and why. The capture browser has no WebGPU (visual-review
 * removes navigator.gpu), so there every tile reports the CPU and the reason; on a machine with a GPU the
 * simulations and the GPU-capable algorithms may report the GPU instead. Run a large network on the GPU from the
 * Demo stories.
 */

import { DATASETS } from "@graphty/graph-samples";
import type { Meta, StoryObj } from "@storybook/html-vite";

import type { GeneratorName } from "../src/index.js";
import {
    ALGORITHM_GROUPS,
    type AlgorithmGroupName,
    FORMATS,
    GENERATOR_PRESETS,
    type Network,
    SIMULATION_LAYOUTS,
    STATIC_LAYOUTS,
} from "./catalog.js";
import { elementsOf, GENERATE, SIZES } from "./demo.js";
import { renderGallery, type Tile } from "./gallery.js";
import {
    BUNDLED_DATASETS,
    colorBy,
    counts,
    CPU_LAYOUT,
    placeForAlgorithm,
    roundTrip,
    runAlgorithm,
    runLayout,
} from "./run.js";

const SEED = 42;

/**
 * Adds a seeded 100-node network to the core.
 * @param network - the generator
 * @returns the loader
 */
function networkOf(network: Network): Tile["load"] {
    return (cy) => {
        cy.add(elementsOf(GENERATE[network](SIZES.small, SEED)));
    };
}

/** The layouts that need a particular kind of graph: planar needs a planar one, bipartite a bipartite one. */
const LAYOUT_NETWORK: Partial<Record<string, Network>> = { planar: "random-tree", bipartite: "grid" };

const meta: Meta = { title: "Gallery" };
export default meta;

type Story = StoryObj;

/**
 * Every layout on a 100-node Barabasi-Albert network (a random tree for planar, a grid for bipartite). Without a GPU,
 * spring-electrical (GPU only) does not run and its tile says why.
 */
export const Layouts: Story = {
    render: () =>
        renderGallery(
            "Every layout, seed 42; the force simulations run 100 iterations with backend auto.",
            [...SIMULATION_LAYOUTS, ...STATIC_LAYOUTS].map((layout) => ({
                title: `graphty-${layout}`,
                load: networkOf(LAYOUT_NETWORK[layout] ?? "barabasi-albert"),
                run: async (cy) => {
                    try {
                        return await runLayout(cy, layout, {
                            gpuMode: "auto",
                            seed: SEED,
                            iterations: 100,
                            animate: false,
                        });
                    } catch (e) {
                        // spring-electrical exists only on the GPU: without one it does not run, and the tile says why
                        if (layout === "spring-electrical" && /no CPU simulation/.test((e as Error).message)) {
                            cy.elements().remove(); // nothing was placed: an empty tile, not a heap of nodes in a corner
                            return { ran: "not run", detail: (e as Error).message };
                        }
                        throw e;
                    }
                },
            })),
        ),
};

/**
 * A gallery of one algorithm group on its network, laid out by ForceAtlas2 on the CPU first.
 * @param group - the group
 * @returns the story
 */
function algorithmGallery(group: AlgorithmGroupName): Story {
    const g = ALGORITHM_GROUPS[group];
    return {
        render: () =>
            renderGallery(
                `${group}: ${g.network}, 100 nodes, seed 42${g.directed ? ", directed" : ""}; backend auto.`,
                g.algorithms.map((algorithm) => ({
                    title: `graphty${algorithm.charAt(0).toUpperCase()}${algorithm.slice(1)}`,
                    load: networkOf(g.network),
                    run: async (cy) => {
                        await placeForAlgorithm(cy, SEED);
                        return runAlgorithm(cy, algorithm, { gpuMode: "auto", directed: g.directed });
                    },
                })),
            ),
    };
}

export const Centrality = algorithmGallery("Centrality");
export const Communities = algorithmGallery("Communities");
export const PathsAndTrees = algorithmGallery("PathsAndTrees");
export const Structure = algorithmGallery("Structure");
export const FlowsAndCuts = algorithmGallery("FlowsAndCuts");
export const LinkPrediction = algorithmGallery("LinkPrediction");

/** Every generator with its preset, seed 42, colored by its planted communities where it has them. */
export const Generators: Story = {
    render: () =>
        renderGallery(
            "Every generator of cy.graphtyGenerate, seed 42; laid out by ForceAtlas2 on the CPU.",
            (Object.keys(GENERATOR_PRESETS) as GeneratorName[]).map((name) => ({
                title: name,
                load: async (cy) => {
                    await cy.graphtyGenerate(name, { ...GENERATOR_PRESETS[name], seed: SEED } as never);
                },
                run: async (cy) => {
                    colorBy(cy, cy.nodes().some((n) => n.data("community") !== undefined) ? "community" : null);
                    await placeForAlgorithm(cy, SEED);
                    return { ...CPU_LAYOUT, detail: "layout held on the CPU", note: counts(cy) };
                },
            })),
        ),
};

/** Every bundled dataset, colored by its ground truth where it has one. */
export const Datasets: Story = {
    render: () =>
        renderGallery(
            "Every bundled dataset of cy.graphtyDataset; laid out by ForceAtlas2 on the CPU (a random layout above 2,000 nodes).",
            BUNDLED_DATASETS.map((name) => ({
                title: name,
                load: async (cy) => {
                    await cy.graphtyDataset(name);
                },
                run: async (cy) => {
                    const info = DATASETS.find((d) => d.name === name);
                    colorBy(cy, info?.groundTruth ?? null);
                    await placeForAlgorithm(cy, SEED);
                    return { ...CPU_LAYOUT, detail: "layout held on the CPU", note: counts(cy) };
                },
            })),
        ),
};

/** Karate club written in every format and read back. */
export const Formats: Story = {
    render: () =>
        renderGallery(
            "Zachary's karate club through cy.graphtyExport and back through cy.graphtyImport, in every format.",
            FORMATS.map((format) => ({
                title: `graphtyExport("${format}")`,
                load: async (cy) => {
                    await cy.graphtyDataset("karate");
                },
                run: async (cy) => {
                    colorBy(cy, "club");
                    await placeForAlgorithm(cy, SEED);
                    const note = await roundTrip(cy, format, SEED);
                    return { ...CPU_LAYOUT, detail: "layout held on the CPU", note };
                },
            })),
        ),
};
