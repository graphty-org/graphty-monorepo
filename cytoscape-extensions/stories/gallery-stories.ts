/**
 * The gallery stories: every layout, algorithm, generator, bundled dataset and file format, one small Cytoscape per
 * tile. Each page of stories/catalog.ts's GALLERY_PAGES is a folder of stories (stories/gallery/, written by
 * test/demo-catalog.test.ts): an Overview with every tile of the page, and one story per tile showing it full size.
 *
 * These are the pictures CI captures and compares, so each is deterministic: seeded graphs, layouts run to a fixed
 * count or until they settle, no animation, no times. Each tile says what its picture shows, and a tile that could run
 * on the GPU says which backend ran and why. The capture browser has no WebGPU (visual-review removes navigator.gpu),
 * so there those tiles report the CPU and the reason; on a machine with a GPU the simulations and the GPU-capable
 * algorithms may report the GPU instead. Run a large network on the GPU from the Demo stories.
 */

import { DATASETS } from "@graphty/graph-samples";
import type { StoryObj } from "@storybook/html-vite";

import type { GeneratorName } from "../src/index.js";
import { ALGORITHM_GROUPS, GALLERY_PAGES, type GalleryPage, galleryTitle, type Network, presetWithSeed } from "./catalog.js";
import { elementsOf, GENERATE, markDirected, SIZES } from "./demo.js";
import { EXAMPLES, spread } from "./examples.js";
import { formatTile } from "./formats.js";
import { renderGallery, type Tile } from "./gallery.js";
import { placeForAlgorithm, runAlgorithm } from "./run.js";
import { LAYOUT_SHOWCASE, showDataset, showGenerator, showLayout } from "./showcase.js";

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

/**
 * A gallery page: the line above its tiles (`every` is true on the Overview; `key` names the tile of a one-tile
 * story), and the tile for each of its names.
 */
interface Page {
    intro(every: boolean, key?: string): string;
    tile(key: string): Tile;
}

/**
 * Every layout, each on a graph that shows what it does. Without a GPU, spring-electrical (GPU only) does not run and
 * its tile says so.
 */
const layouts: Page = {
    intro: (every) =>
        `${every ? "Every layout, each on a graph that shows what it does" : "Seed 42"}; the force simulations run until they settle, with backend auto.`,
    tile: (layout) => ({
        title: `graphty-${layout}`,
        load: (cy) => LAYOUT_SHOWCASE[layout].load(cy, SEED),
        run: async (cy) => {
            try {
                return await showLayout(cy, layout, SEED, "auto");
            } catch (e) {
                // spring-electrical exists only on the GPU: without one it does not run, and the tile says why
                if (layout === "spring-electrical" && /no CPU simulation/.test((e as Error).message)) {
                    cy.elements().remove(); // nothing was placed: an empty tile, not a heap of nodes in a corner
                    return {
                        ran: "not run",
                        detail: "graphty-spring-electrical runs only on a GPU, and this browser has no WebGPU. On a machine with one, this tile shows the layout.",
                    };
                }
                throw e;
            }
        },
    }),
};

/**
 * The page of one algorithm group: each algorithm on its example graph (stories/examples.ts) or, without one, on the
 * group's network laid out by ForceAtlas2 on the CPU.
 * @param group - the group
 * @returns the page
 */
function algorithms(group: keyof typeof ALGORITHM_GROUPS): Page {
    const g = ALGORITHM_GROUPS[group];
    const network = `${g.network}, 100 nodes, seed 42${g.directed ? ", directed" : ""}`;
    // "Flows And Cuts" as a heading reads "Flows and cuts"
    const words = galleryTitle(group).replace("Gallery/", "");
    const name = words.charAt(0) + words.slice(1).toLowerCase();
    return {
        intro: (every, key) =>
            every
                ? `${name}: each algorithm on a seeded graph that shows what it does; backend auto.`
                : `${(key === undefined ? undefined : EXAMPLES[key]?.graph) ?? network}; backend auto.`,
        tile: (algorithm) => {
            const example = EXAMPLES[algorithm];
            const directed = example?.directed ?? g.directed;
            return {
                title: `graphty${algorithm.charAt(0).toUpperCase()}${algorithm.slice(1)}`,
                load: example?.load ?? networkOf(g.network),
                run: async (cy) => {
                    if (example?.place) {
                        await example.place(cy);
                        spread(cy);
                    } else {
                        await placeForAlgorithm(cy, SEED);
                    }
                    if (example?.run) {
                        return example.run(cy);
                    }
                    return runAlgorithm(cy, algorithm, { gpuMode: "auto", directed });
                },
            };
        },
    };
}

/** Every generator with its preset, laid out and colored to show its model. */
const generators: Page = {
    intro: (every) =>
        `${every ? "Every generator of cy.graphtyGenerate, seed 42" : "Seed 42"}; each laid out and colored to show its model.`,
    tile: (name) => ({
        title: name,
        load: () => undefined,
        run: async (cy) => {
            // the call that made the graph, as the Demo's Generate story prints it; long option arrays cut short
            const options = JSON.stringify(presetWithSeed(name as GeneratorName, SEED));
            const call = `cy.graphtyGenerate(${JSON.stringify(name)}, ${options.length > 120 ? `${options.slice(0, 117)}...` : options})`;
            return { ran: "", detail: null, note: `${call}\n${await showGenerator(cy, name as GeneratorName, SEED)}` };
        },
    }),
};

/** Every bundled dataset, laid out and colored to show what it holds. */
const datasets: Page = {
    intro: (every) =>
        `${every ? "Every bundled dataset of cy.graphtyDataset" : "A bundled dataset"}, laid out and colored to show what it holds.`,
    tile: (name) => ({
        title: name,
        load: async (cy) => {
            const { directed } = await cy.graphtyDataset(name);
            markDirected(cy, directed);
        },
        run: async (cy) => {
            const info = DATASETS.find((d) => d.name === name);
            const note = await showDataset(cy, name, SEED);
            // as the Demo's Dataset story prints it
            return { ran: "", detail: null, note: info ? `${note}\n${info.title}; license: ${info.license}` : note };
        },
    }),
};

/** A real file read in every format graphtyImport takes, and karate written in every format graphtyExport writes. */
const formats: Page = {
    intro: (every) =>
        every
            ? "cy.graphtyImport reading a file in each format it takes (the start of the file beside the graph), and cy.graphtyExport writing karate in each format."
            : "The start of the file is beside the graph it became.",
    tile: formatTile,
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
    return { render: () => renderGallery(p.intro(false, key), [p.tile(key)], true) };
}
