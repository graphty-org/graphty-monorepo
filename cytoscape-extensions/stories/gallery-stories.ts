/**
 * The gallery stories: every layout, algorithm, generator, bundled dataset and file format, one small Cytoscape per
 * tile. Each page of stories/catalog.ts's GALLERY_PAGES is a folder of stories (stories/gallery/, written by
 * test/demo-catalog.test.ts): an Overview with every tile of the page, and one story per tile showing it full size.
 *
 * These are the pictures CI captures and compares, so each is deterministic: seeded graphs, fixed iteration counts, no
 * animation, no times. Each tile says which backend ran and why. The capture browser has no WebGPU (visual-review
 * removes navigator.gpu), so there every tile reports the CPU and the reason; on a machine with a GPU the
 * simulations and the GPU-capable algorithms may report the GPU instead. Run a large network on the GPU from the
 * Demo stories.
 */

import { DATASETS } from "@graphty/graph-samples";
import type { StoryObj } from "@storybook/html-vite";

import type { ExportFormat, GeneratorName } from "../src/index.js";
import { ALGORITHM_GROUPS, GALLERY_PAGES, type GalleryPage, type Network, presetWithSeed } from "./catalog.js";
import { elementsOf, GENERATE, SIZES } from "./demo.js";
import { renderGallery, type Tile } from "./gallery.js";
import { colorBy, counts, CPU_LAYOUT, placeForAlgorithm, roundTrip, runAlgorithm, runLayout } from "./run.js";

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

/** A gallery page: the line above its tiles (`every` is true on the Overview), and the tile for each of its names. */
interface Page {
    intro(every: boolean): string;
    tile(key: string): Tile;
}

/**
 * Every layout on a 100-node Barabasi-Albert network (a random tree for planar, a grid for bipartite). Without a GPU,
 * spring-electrical (GPU only) does not run and its tile says why.
 */
const layouts: Page = {
    intro: (every) =>
        `${every ? "Every layout, seed 42" : "Seed 42"}; the force simulations run 100 iterations with backend auto.`,
    tile: (layout) => ({
        title: `graphty-${layout}`,
        load: networkOf(LAYOUT_NETWORK[layout] ?? "barabasi-albert"),
        run: async (cy) => {
            try {
                return await runLayout(cy, layout, { gpuMode: "auto", seed: SEED, iterations: 100, animate: false });
            } catch (e) {
                // spring-electrical exists only on the GPU: without one it does not run, and the tile says why
                if (layout === "spring-electrical" && /no CPU simulation/.test((e as Error).message)) {
                    cy.elements().remove(); // nothing was placed: an empty tile, not a heap of nodes in a corner
                    return { ran: "not run", detail: (e as Error).message };
                }
                throw e;
            }
        },
    }),
};

/**
 * The page of one algorithm group on its network, laid out by ForceAtlas2 on the CPU first.
 * @param group - the group
 * @returns the page
 */
function algorithms(group: keyof typeof ALGORITHM_GROUPS): Page {
    const g = ALGORITHM_GROUPS[group];
    return {
        intro: (every) =>
            `${every ? `${group}: ` : ""}${g.network}, 100 nodes, seed 42${g.directed ? ", directed" : ""}; backend auto.`,
        tile: (algorithm) => ({
            title: `graphty${algorithm.charAt(0).toUpperCase()}${algorithm.slice(1)}`,
            load: networkOf(g.network),
            run: async (cy) => {
                await placeForAlgorithm(cy, SEED);
                return runAlgorithm(cy, algorithm, { gpuMode: "auto", directed: g.directed });
            },
        }),
    };
}

/** Every generator with its preset, seed 42, colored by its planted communities where it has them. */
const generators: Page = {
    intro: (every) =>
        `${every ? "Every generator of cy.graphtyGenerate, seed 42" : "Seed 42"}; laid out by ForceAtlas2 on the CPU.`,
    tile: (name) => ({
        title: name,
        load: async (cy) => {
            await cy.graphtyGenerate(name as GeneratorName, presetWithSeed(name as GeneratorName, SEED) as never);
        },
        run: async (cy) => {
            colorBy(cy, cy.nodes().some((n) => n.data("community") !== undefined) ? "community" : null);
            await placeForAlgorithm(cy, SEED);
            return { ...CPU_LAYOUT, detail: "layout held on the CPU", note: counts(cy) };
        },
    }),
};

/** Every bundled dataset, colored by its ground truth where it has one. */
const datasets: Page = {
    intro: (every) =>
        `${every ? "Every bundled dataset of cy.graphtyDataset; laid" : "Laid"} out by ForceAtlas2 on the CPU (a random layout above 2,000 nodes).`,
    tile: (name) => ({
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
    }),
};

/** Karate club written in every format and read back. */
const formats: Page = {
    intro: (every) =>
        `Zachary's karate club through cy.graphtyExport and back through cy.graphtyImport${every ? ", in every format" : ""}.`,
    tile: (format) => ({
        title: `graphtyExport("${format}")`,
        load: async (cy) => {
            await cy.graphtyDataset("karate");
        },
        run: async (cy) => {
            colorBy(cy, "club");
            await placeForAlgorithm(cy, SEED);
            const note = await roundTrip(cy, format as ExportFormat, SEED);
            return { ...CPU_LAYOUT, detail: "layout held on the CPU", note };
        },
    }),
};

const PAGES: Record<GalleryPage, Page> = {
    Layouts: layouts,
    ...(Object.fromEntries(Object.keys(ALGORITHM_GROUPS).map((group) => [group, algorithms(group as never)])) as Record<
        keyof typeof ALGORITHM_GROUPS,
        Page
    >),
    Generators: generators,
    Datasets: datasets,
    Formats: formats,
};

type Story = StoryObj;

/**
 * Every tile of a page, four to a row.
 * @param page - the page
 * @returns the story
 */
export function overview(page: GalleryPage): Story {
    const p = PAGES[page];
    return {
        render: () =>
            renderGallery(
                p.intro(true),
                GALLERY_PAGES[page].map((key) => p.tile(key)),
            ),
    };
}

/**
 * One tile of a page, filling the window.
 * @param page - the page
 * @param key - the tile: a layout, algorithm, generator, dataset or format name
 * @returns the story
 */
export function tile(page: GalleryPage, key: string): Story {
    const p = PAGES[page];
    return { render: () => renderGallery(p.intro(false), [p.tile(key)], true) };
}
