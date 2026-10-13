/**
 * The gallery stories: every layout, algorithm, generator, bundled dataset and file format, one small Cytoscape per
 * tile. Each page of stories/catalog.ts's GALLERY_PAGES is a folder of stories (stories/gallery/, written by
 * test/demo-catalog.test.ts): an Overview with every tile of the page, and one story per tile showing it full size.
 *
 * These are the pictures CI captures and compares, so each is deterministic: seeded graphs, layouts run to a fixed
 * count or until they settle, no animation, no times. Each tile says what its picture shows, and a tile that could run
 * on the GPU says which backend ran and why. The capture browser has no WebGPU (visual-review removes navigator.gpu),
 * so there those tiles report the CPU and the reason; on a machine with a GPU the simulations and the GPU-capable
 * algorithms may report the GPU instead.
 *
 * A one-tile story has Storybook controls: another network and size, the seed, the backend, more options, and a
 * round trip through a file format. Its default controls draw the tile's own example, the picture CI captures. The
 * large networks on the GPU are the Large graphs stories.
 */

import { DATASETS } from "@graphty/graph-samples";
import type { StoryObj } from "@storybook/html-vite";
import type { Core } from "cytoscape";

import { configureWebGpu, type ExportFormat, type GeneratorName } from "../src/index.js";
import {
    ALGORITHM_GROUPS,
    FORMATS,
    GALLERY_PAGES,
    type GalleryPage,
    galleryTitle,
    type Network,
    NETWORKS,
    presetWithSeed,
    SIMULATION_LAYOUTS,
} from "./catalog.js";
import { elementsOf, failureWords, GENERATE, markDirected, type Outcome, SIZES } from "./demo.js";
import { EXAMPLES, spread } from "./examples.js";
import { formatTile } from "./formats.js";
import { renderGallery, type Tile } from "./gallery.js";
import { layOutNetwork } from "./layout-story.js";
import { placeByGroup, placeForAlgorithm, plainReason, roundTrip, runAlgorithm } from "./run.js";
import { arrangeGenerated, LAYOUT_SHOWCASE, showDataset, showLayout } from "./showcase.js";

/** The backend control: "auto" lets the extension decide, "cpu" passes gpu: "off", "gpu" passes gpu: "require". */
const GPU_MODE = { auto: "auto", cpu: "off", gpu: "require" } as const;

/** The controls of a one-tile story; each page offers the ones that apply to it. */
interface TileArgs {
    /** "example": the tile's own graph; otherwise a seeded network of `size` nodes. */
    network: "example" | Network;
    size: keyof typeof SIZES;
    seed: number;
    backend: keyof typeof GPU_MODE;
    /** Accept a software WebGPU adapter (SwiftShader, llvmpipe); refused by default as usually slower than the CPU. */
    acceptSoftware: boolean;
    /** More layout or algorithm options as JSON, merged over the tile's own. */
    options: string;
    /** After the run, write the graph in this format and read it back. */
    roundTrip: "none" | ExportFormat;
    directed: boolean;
    /** Simulations: 0 runs until the layout settles; a number fixes the iterations. */
    iterations: number;
    animate: boolean;
    /** Generator options as JSON, merged over the tile's preset. */
    generatorOptions: string;
}

/** Every control at the value that draws the tile as the gallery does. */
const DEFAULTS: TileArgs = {
    network: "example",
    size: "small",
    seed: 42,
    backend: "auto",
    acceptSoftware: false,
    options: "{}",
    roundTrip: "none",
    directed: false,
    iterations: 0,
    animate: false,
    generatorOptions: "{}",
};

const ARG_TYPES: Record<keyof TileArgs, Record<string, unknown>> = {
    network: {
        control: { type: "select", labels: { example: "the tile's example graph" } },
        options: ["example", ...NETWORKS],
        description: "The graph: the tile's own example, or a seeded network of the size below",
    },
    size: {
        control: {
            type: "select",
            labels: { small: "100 nodes", medium: "2,000 nodes", large: "10,000 nodes", huge: "50,000 nodes" },
        },
        options: Object.keys(SIZES),
        if: { arg: "network", neq: "example" },
    },
    seed: {
        control: { type: "number", min: 0, step: 1 },
        description: "The seed of the network and of the layout; a hand-built example graph stays as it is",
    },
    backend: {
        control: "inline-radio",
        options: Object.keys(GPU_MODE),
        description: 'auto lets the extension choose; cpu passes gpu: "off"; gpu passes gpu: "require"',
    },
    acceptSoftware: { control: "boolean", description: "Accept a software WebGPU adapter (SwiftShader, llvmpipe)" },
    options: { control: "text", description: "More options as JSON, merged over the tile's own" },
    roundTrip: {
        control: "select",
        options: ["none", ...FORMATS],
        description:
            "After the run, write the graph with cy.graphtyExport in this format, read it back with cy.graphtyImport, and show the start of the file",
    },
    directed: { control: "boolean", description: "Run the algorithm on the graph as directed" },
    iterations: { control: { type: "number", min: 0, step: 10 }, description: "0: until the layout settles" },
    animate: { control: "boolean", description: "Draw the layout as it runs" },
    generatorOptions: { control: "text", description: "Generator options as JSON, merged over the tile's preset" },
};

/**
 * Parses a JSON control.
 * @param name - the control, for the error
 * @param text - its text
 * @returns the options
 */
function parseJson(name: string, text: string): Record<string, unknown> {
    try {
        return JSON.parse(text || "{}") as Record<string, unknown>;
    } catch (e) {
        throw new Error(`the ${name} control is not valid JSON: ${(e as Error).message}`);
    }
}

/**
 * Adds a seeded network to the core.
 * @param network - the generator
 * @param size - the size
 * @param seed - the seed
 * @returns the loader
 */
function networkOf(network: Network, size: keyof typeof SIZES, seed: number): Tile["load"] {
    return (cy) => {
        cy.add(elementsOf(GENERATE[network](SIZES[size], seed)));
    };
}

/**
 * A network control's graph in words.
 * @param a - the controls
 * @returns "erdos-renyi, 2,000 nodes, seed 7"
 */
const networkWords = (a: TileArgs): string => `${a.network}, ${SIZES[a.size].toLocaleString()} nodes, seed ${a.seed}`;

/**
 * Puts a sentence about the chosen network above what the run shows.
 * @param out - the outcome
 * @param caveat - the sentence, or undefined
 * @returns the outcome
 */
function withCaveat(out: Outcome, caveat: string | undefined): Outcome {
    return caveat === undefined ? out : { ...out, note: [caveat, out.note].filter(Boolean).join("\n") };
}

/** What a chosen network hides of a layout, in a sentence; checked before the run. */
const LAYOUT_CAVEATS: Partial<Record<string, (cy: Core) => string | undefined>> = {
    bipartite: (cy) =>
        cy.elements().graphtyIsBipartite().bipartite
            ? "This network has no marked sides, so the layout infers two sides from its edges."
            : "This network is not bipartite, so some edges join nodes in the same column. The example graph has two sides.",
    multipartite: () =>
        "This network has no layers of its own, so its nodes are split into three columns by node order. The example graph is a layered DAG.",
    planar: () =>
        "A planar layout needs a network it can draw without crossing edges; a network with too many edges for that is refused.",
};

/** What a chosen network hides of an algorithm, in a sentence; checked before the run. */
const ALGORITHM_CAVEATS: Partial<Record<string, (cy: Core, directed: boolean) => string | undefined>> = {};
{
    const onePiece = (cy: Core): string | undefined =>
        cy.elements().components().length === 1
            ? "This network is connected, so the whole graph is one component. The example graph has several separate pieces."
            : undefined;
    const rings = (cy: Core, directed: boolean): string | undefined => {
        if (!directed) {
            return "With directed off, every edge runs both ways, so each connected piece is one strongly connected component. Turn directed on to follow the edges one way.";
        }
        return cy.elements().graphtyHasCycle({ directed: true })
            ? undefined
            : "This network has no directed cycle, so every node is a strongly connected component of its own. The example graph has directed rings.";
    };
    const sides = (cy: Core): string | undefined =>
        cy.elements().graphtyIsBipartite().bipartite
            ? undefined
            : "This network is not bipartite (it has a cycle of odd length), so a bipartite matching does not apply to it. The example graph has two sides.";
    const capacities = (cy: Core): string | undefined =>
        cy.edges().some((e) => typeof e.data("weight") === "number")
            ? undefined
            : "This network has no edge capacities, so every edge carries at most one unit, and the source and sink are its first and last node. The example graph has capacities and a marked source and sink.";
    const groups = (what: string) => (cy: Core) =>
        cy.nodes().some((n) => n.data("community") !== undefined)
            ? undefined
            : `This network has no planted groups, so ${what}. The planted-partition network has them.`;
    const noTriangles = (cy: Core): string | undefined =>
        cy.elements().graphtyTriangleCount().total === 0
            ? "This network has no triangles, so every node scores 0. The example graph has many."
            : undefined;
    Object.assign(ALGORITHM_CAVEATS, {
        connectedComponents: onePiece,
        weaklyConnectedComponents: onePiece,
        stronglyConnectedComponents: rings,
        condensation: rings,
        topologicalSort: (cy: Core, directed: boolean) => {
            if (!directed) {
                return "With directed off, the edges have no direction, so the order follows no arrows. Turn directed on to order the nodes along their edges.";
            }
            return cy.elements().graphtyHasCycle({ directed: true })
                ? "This network has a directed cycle, so it has no topological order. The example graph has none."
                : undefined;
        },
        maximumBipartiteMatching: sides,
        greedyBipartiteMatching: sides,
        isGraphIsomorphic: () =>
            "This network is one graph, so the algorithm compares a small piece of it (8 nodes) with itself, and the answer is always yes. The example graph compares two drawings of one graph.",
        findAllIsomorphisms: () =>
            "This network is one graph, so the algorithm maps a small piece of it (8 nodes) onto itself: the mappings are that piece's symmetries. The example graph compares two drawings of one graph.",
        maxFlow: capacities,
        minSTCut: capacities,
        modularity: groups("the modularity is that of Louvain's clusters"),
        labelPropagationSemiSupervised: groups("the labels spread from its first and last node only"),
        triangleCount: noTriangles,
    });
}

/**
 * A gallery page: the line above its tiles (`every` is true on the Overview; `key` names the tile of a one-tile
 * story), the tile for each of its names, and the controls a one-tile story offers, at their defaults.
 */
interface Page {
    intro(every: boolean, key?: string, a?: TileArgs): string;
    tile(key: string, a: TileArgs): Tile;
    controls(key: string): Partial<TileArgs>;
}

/**
 * The given controls at their defaults.
 * @param keys - the controls
 * @returns their defaults
 */
const pick = (...keys: (keyof TileArgs)[]): Partial<TileArgs> =>
    Object.fromEntries(keys.map((k) => [k, DEFAULTS[k]])) as Partial<TileArgs>;

/** The words a run that could not happen here gives, when spring-electrical (GPU only) finds no GPU. */
const SPRING_ELECTRICAL_NOT_RUN =
    "graphty-spring-electrical runs only on a GPU, and WebGPU is not available in this browser. The nodes are drawn by group, each group in its own place: a quick placement, not the layout.";

/**
 * Every layout, each on a graph that shows what it does. Without a GPU, spring-electrical (GPU only) does not run and
 * its tile says so.
 */
const layouts: Page = {
    controls: (layout) =>
        (SIMULATION_LAYOUTS as readonly string[]).includes(layout)
            ? pick(
                  "network",
                  "size",
                  "seed",
                  "backend",
                  "acceptSoftware",
                  "iterations",
                  "animate",
                  "options",
                  "roundTrip",
              )
            : pick("network", "size", "seed", "animate", "options", "roundTrip"),
    intro: (every, _key, a = DEFAULTS) => {
        const graph = a.network === "example" ? `Seed ${a.seed}` : networkWords(a);
        const run = a.iterations > 0 ? `run ${a.iterations} iterations` : "run until they settle";
        return `${every ? "Every layout, each on a graph that shows what it does" : graph}; the force simulations ${run}, with backend ${a.backend}.`;
    },
    tile: (layout, a) => {
        const title = `graphty-${layout}`;
        const gpuMode = GPU_MODE[a.backend];
        const show = LAYOUT_SHOWCASE[layout];
        if (a.network !== "example") {
            const { network } = a;
            return {
                title,
                load: networkOf(network, a.size, a.seed),
                run: async (cy) => {
                    const caveat = LAYOUT_CAVEATS[layout]?.(cy);
                    // nlist by degree fits any network: the hubs in the middle
                    const own = layout === "shell" ? (show.options?.(cy) ?? {}) : {};
                    try {
                        const out = await layOutNetwork(
                            cy,
                            { layout, size: a.size, seed: a.seed, iterations: a.iterations, animate: a.animate },
                            gpuMode,
                            { ...own, ...parseJson("options", a.options) },
                        );
                        if (layout === "shell") {
                            show.paint?.(cy);
                        }
                        return withCaveat(out, caveat);
                    } catch (e) {
                        if (caveat === undefined) {
                            throw e;
                        }
                        return { ran: "not run", detail: `${caveat}\n${failureWords(e)}` };
                    }
                },
            };
        }
        return {
            title,
            load: (cy) => show.load(cy, a.seed),
            run: async (cy) => {
                try {
                    return await showLayout(cy, layout, a.seed, gpuMode, {
                        iterations: a.iterations,
                        animate: a.animate,
                        extra: parseJson("options", a.options),
                    });
                } catch (e) {
                    const { message } = e as Error;
                    // a simulation the runtime cannot run (spring-electrical exists only on the GPU; gpu: "require"
                    // without WebGPU): nothing was placed, so the network with each group in its own place, not a
                    // heap in a corner, and the tile says why
                    if (/no CPU simulation|gpu: "require"/.test(message)) {
                        placeByGroup(cy, "community");
                        show.paint?.(cy);
                        const gpuOnly = layout === "spring-electrical" && /no CPU simulation/.test(message);
                        return {
                            ran: "not run",
                            detail: gpuOnly
                                ? SPRING_ELECTRICAL_NOT_RUN
                                : `${plainReason(message)}. The nodes are drawn by group, each group in its own place: a quick placement, not the layout.`,
                        };
                    }
                    throw e;
                }
            },
        };
    },
};

/**
 * The page of one algorithm group: each algorithm on its example graph (stories/examples.ts) or, without one, on the
 * group's network laid out by ForceAtlas2 on the CPU.
 * @param group - the group
 * @returns the page
 */
function algorithms(group: keyof typeof ALGORITHM_GROUPS): Page {
    const g = ALGORITHM_GROUPS[group];
    // "Flows And Cuts" as a heading reads "Flows and cuts"
    const words = galleryTitle(group).replace("Gallery/", "");
    const name = words.charAt(0) + words.slice(1).toLowerCase();
    const controls = (algorithm: string): Partial<TileArgs> => ({
        ...pick("network", "size", "seed", "backend", "acceptSoftware", "directed", "options", "roundTrip"),
        directed: EXAMPLES[algorithm]?.directed ?? g.directed,
    });
    return {
        controls,
        intro: (every, key, given) => {
            if (every || key === undefined) {
                return `${name}: each algorithm on a seeded graph that shows what it does; backend auto.`;
            }
            const a = given ?? { ...DEFAULTS, ...controls(key) };
            const directed = a.directed ? ", directed" : "";
            const graph =
                a.network === "example"
                    ? (EXAMPLES[key]?.graph ?? `${g.network}, 100 nodes, seed ${a.seed}${directed}`)
                    : `${networkWords(a)}${directed}`;
            return `${graph}; backend ${a.backend}.`;
        },
        tile: (algorithm, a) => {
            const example = a.network === "example" ? EXAMPLES[algorithm] : undefined;
            const network = a.network === "example" ? g.network : a.network;
            const size = a.network === "example" ? "small" : a.size;
            return {
                title: `graphty${algorithm.charAt(0).toUpperCase()}${algorithm.slice(1)}`,
                load: example?.load ?? networkOf(network, size, a.seed),
                run: async (cy) => {
                    const caveat = a.network === "example" ? undefined : ALGORITHM_CAVEATS[algorithm]?.(cy, a.directed);
                    const settings = { gpuMode: GPU_MODE[a.backend], extra: parseJson("options", a.options) };
                    if (example?.place) {
                        await example.place(cy);
                        spread(cy);
                    } else {
                        await placeForAlgorithm(cy, a.seed);
                    }
                    try {
                        const out = example?.run
                            ? await example.run(cy, settings)
                            : await runAlgorithm(cy, algorithm, { ...settings, directed: a.directed });
                        return withCaveat(out, caveat);
                    } catch (e) {
                        // the network the reader picked does not suit the algorithm: say why, in place of the error
                        if (caveat === undefined) {
                            throw e;
                        }
                        return { ran: "not run", detail: `${caveat}\n${failureWords(e)}` };
                    }
                },
            };
        },
    };
}

/** Every generator with its preset, laid out and colored to show its model. */
const generators: Page = {
    controls: () => pick("seed", "generatorOptions", "roundTrip"),
    intro: (every, _key, a = DEFAULTS) =>
        `${every ? "Every generator of cy.graphtyGenerate, seed 42" : `Seed ${a.seed}`}; each laid out and colored to show its model.`,
    tile: (name, a) => ({
        title: name,
        load: () => undefined,
        run: async (cy) => {
            const own = parseJson("generator options", a.generatorOptions);
            const options = { ...presetWithSeed(name as GeneratorName, a.seed), ...own };
            // the call that made the graph; long option arrays cut short
            const text = JSON.stringify(options);
            const call = `cy.graphtyGenerate(${JSON.stringify(name)}, ${text.length > 120 ? `${text.slice(0, 117)}...` : text})`;
            const { directed } = await cy.graphtyGenerate(name as GeneratorName, options as never);
            const shown = await arrangeGenerated(cy, name as GeneratorName, a.seed, directed);
            const changed =
                Object.keys(own).length > 0
                    ? "\nThese options differ from the tile's preset, so the drawing may show less of the generator's model."
                    : "";
            return { ran: "", detail: null, note: `${call}\n${shown}${changed}` };
        },
    }),
};

/** Every bundled dataset, laid out and colored to show what it holds; a one-tile story names its source and license. */
const datasets: Page = {
    controls: () => pick("seed", "roundTrip"),
    intro: (every, key) => {
        const info = DATASETS.find((d) => d.name === key);
        return every || info === undefined
            ? "Every bundled dataset of cy.graphtyDataset, laid out and colored to show what it holds."
            : `${info.title}; license: ${info.license}`;
    },
    tile: (name, a) => ({
        title: name,
        load: async (cy) => {
            const { directed } = await cy.graphtyDataset(name);
            markDirected(cy, directed);
        },
        run: async (cy) => ({ ran: "", detail: null, note: await showDataset(cy, name, a.seed) }),
    }),
};

/** A real file read in every format graphtyImport takes, and karate written in every format graphtyExport writes. */
const formats: Page = {
    controls: () => pick("roundTrip"),
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

/**
 * After the tile's run, writes its graph in `a.roundTrip` and reads it back, showing the start of the file.
 * @param t - the tile
 * @param a - the controls
 * @returns the tile
 */
function withRoundTrip(t: Tile, a: TileArgs): Tile {
    const format = a.roundTrip;
    if (format === "none") {
        return t;
    }
    return {
        ...t,
        panel: true,
        run: async (cy) => {
            const out = await t.run(cy);
            let file = "";
            const back = await roundTrip(cy, format, a.seed, (text) => {
                file = text.split("\n").slice(0, 80).join("\n");
            });
            return {
                ...out,
                note: [out.note, `Written as ${format} and read back: ${back}.`].filter(Boolean).join("\n"),
                file,
            };
        },
    };
}

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
                GALLERY_PAGES[page].map((key) => p.tile(key, { ...DEFAULTS, ...p.controls(key) })),
            ),
    };
}

/**
 * One tile of a page, filling the window, with the controls that apply to it.
 * @param page - the page
 * @param key - the tile: a layout, algorithm, generator, dataset or format name
 * @returns the story
 */
export function tile(page: GalleryPage, key: string): Story {
    const p = PAGES[page];
    const args = p.controls(key);
    return {
        args,
        argTypes: Object.fromEntries(
            (Object.keys(ARG_TYPES) as (keyof TileArgs)[]).filter((k) => k in args).map((k) => [k, ARG_TYPES[k]]),
        ),
        render: (story) => {
            const a = { ...DEFAULTS, ...args, ...story } as TileArgs;
            if ("acceptSoftware" in args) {
                configureWebGpu({ acceptSoftware: a.acceptSoftware });
            }
            return renderGallery(p.intro(false, key, a), [withRoundTrip(p.tile(key, a), a)], true);
        },
    };
}
