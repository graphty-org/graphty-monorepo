import { OTHER_GROUP_COLOR } from "../../../src/config/palettes/categorical";
import { assertGraphLoaded, drawn, holds, renderedElement } from "../../assertions";
import {
    algorithmMetaBase,
    CAT_NETWORK,
    createAlgorithmStory,
    documented,
    onLoadSource,
    page,
    type Story,
    storySetup,
    waitForGraphSettled,
} from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Communities",
    id: "algorithms-community",
    tags: ["autodocs"],
    parameters: {
        ...algorithmMetaBase.parameters,
        docs: {
            description: {
                component:
                    `Community detection splits the graph into groups that are densely connected inside and ` +
                    `sparsely connected to each other. graphty-element colors each node by its group with the ` +
                    `default categorical palette, Okabe-Ito, which stays readable for color-blind readers. When ` +
                    `there are more groups than colors, the smallest groups share one gray, named "other" in the ` +
                    `legend. K-core is here too: it finds the dense cores of the graph and colors each node by how ` +
                    `deep a core it belongs to. The first four stories draw ${CAT_NETWORK}.`,
            },
        },
    },
};
export default meta;

/** Louvain: communities found by greedily maximizing modularity. */
export const Louvain: Story = documented(createAlgorithmStory("graphty:louvain", { varies: "hex", atLeast: 2 }), {
    caption: 'Each node is colored by the community Louvain put it in. Set algorithmsOnLoad = ["louvain"].',
    code: onLoadSource('["louvain"]'),
});

/** Girvan-Newman: communities found by removing the edges that carry the most shortest routes. */
export const GirvanNewman: Story = {
    name: "Girvan-Newman",
    ...documented(createAlgorithmStory("graphty:girvan-newman", { varies: "hex", atLeast: 2 }), {
        caption:
            "Each node is colored by the community Girvan-Newman found by cutting the busiest bridges. " +
            'Set algorithmsOnLoad = ["girvan-newman"].',
        code: onLoadSource('["girvan-newman"]'),
    }),
};

/**
 * Leiden: a refinement of Louvain that guarantees every community is connected.
 *
 * Not held distinct from Louvain. Both maximize modularity, and on the cat network both reach the
 * same four communities. The same answer from two methods that optimize the same quantity is
 * correct, as Kruskal and Prim drawing one tree is; the picture each draws is still held to its
 * own baseline.
 */
export const Leiden: Story = documented(
    createAlgorithmStory("graphty:leiden", { varies: "hex", atLeast: 2, distinct: false }),
    {
        caption:
            "Each node is colored by its Leiden community; Leiden refines Louvain and here finds the same four " +
            'groups. Set algorithmsOnLoad = ["leiden"].',
        code: onLoadSource('["leiden"]'),
    },
);

/** Label propagation: fast communities found by letting each node adopt its neighbors' most common label. */
export const LabelPropagation: Story = {
    name: "Label propagation",
    ...documented(createAlgorithmStory("graphty:label-propagation", { varies: "hex", atLeast: 2 }), {
        caption:
            "Each node is colored by the label it settled on after repeatedly taking its neighbors' most common " +
            'one. Set algorithmsOnLoad = ["label-propagation"].',
        code: onLoadSource('["label-propagation"]'),
    }),
};

/**
 * Eleven separate cliques, so Louvain finds exactly eleven communities. The eight largest have 5
 * or 6 nodes and the three smallest 3, 2 and 2, so which three fold into "other" has one answer.
 */
const CLIQUE_SIZES = [6, 6, 5, 5, 5, 5, 5, 5, 3, 2, 2];
const SMALLEST_CLIQUES = ["q10", "q8", "q9"];
const cliqueNodes = CLIQUE_SIZES.flatMap((size, clique) =>
    Array.from({ length: size }, (_, at) => ({ id: `q${String(clique)}-${String(at)}` })),
);
const cliqueEdges = CLIQUE_SIZES.flatMap((size, clique) =>
    Array.from({ length: size }, (_, from) =>
        Array.from({ length: size - from - 1 }, (__, step) => ({
            src: `q${String(clique)}-${String(from)}`,
            dst: `q${String(clique)}-${String(from + step + 1)}`,
        })),
    ).flat(),
);

/** The colour an overflowing group encoding paints every group past the palette. */
const OTHER_GREY = OTHER_GROUP_COLOR;

/**
 * More communities than the default palette has colours.
 *
 * Louvain finds eleven communities and Okabe-Ito has eight colours. The default overflow policy,
 * "other", keeps the palette's eight colours for the eight largest communities and paints the
 * three smallest one dark grey, which the legend names "other: 3 groups".
 */
export const LouvainMoreCommunitiesThanColours: Story = {
    name: "More communities than colors",
    ...documented(
        {
            args: {
                dataSource: undefined,
                nodeData: cliqueNodes,
                edgeData: cliqueEdges,
                setup: storySetup({ preSteps: 8000 }),
            },
            play: async ({ canvasElement }) => {
                await waitForGraphSettled(canvasElement);

                const { session } = await renderedElement(
                    canvasElement,
                    "LouvainMoreCommunitiesThanColours: no <graphty-element> rendered",
                );

                // Started here rather than on load: inline data arrives as nodes and then edges, and a run
                // started on load can see the nodes before the edges.
                const run = session.runs.start("louvain", {}, { style: false });

                await run;
                await session.styles.encode({ run: run.id, channel: "node.color" });

                const scene = await drawn(canvasElement, "Algorithms/Community LouvainMoreCommunitiesThanColours");

                await assertGraphLoaded(scene, { nodes: cliqueNodes.length, edges: cliqueEdges.length });

                const colours = new Set(scene.nodes.map((node) => node.hex?.toLowerCase()));
                const greyed = new Set(
                    scene.nodes
                        .filter((node) => node.hex?.toLowerCase() === OTHER_GREY)
                        .map((node) => node.id.split("-")[0]),
                );

                await holds(
                    colours.size === 9 && colours.has(OTHER_GREY),
                    `expected the 8 palette colours plus the grey, drew ${[...colours].join(", ")}`,
                );
                await holds(
                    [...greyed].sort().join(",") === SMALLEST_CLIQUES.join(","),
                    `expected the grey on exactly the three smallest communities, drew it on ${[...greyed].join(", ")}`,
                );

                const block = session.styles.legend().find((entry) => entry.channel === "node.color");
                const last = block?.swatches[block.swatches.length - 1];

                const folded = last?.role === "other" && Array.isArray(last.value) ? last.value.length : 0;
                await holds(folded === 3, `the legend's last row folds ${String(folded)} groups, not 3`);
            },
        },
        {
            caption:
                "Eleven separate cliques, so Louvain finds eleven communities, but the default palette has eight " +
                "colors: the eight largest get one each and the three smallest share one gray, listed as other.",
            code: page([
                "    graph.nodeData = nodes; // eleven cliques of 2 to 6 nodes",
                "    graph.edgeData = edges;",
                "",
                '    graph.addEventListener("graph-settled", async () => {',
                '        const run = graph.session.runs.start("louvain", {}, { style: false });',
                "        await run;",
                '        await graph.session.styles.encode({ run: run.id, channel: "node.color" });',
                "    }, { once: true });",
            ]),
        },
    ),
};

/**
 * Nested cores: a five-node clique (core 4), a triangle and a square hanging off it (core 2), and
 * two single nodes on a stalk (core 1). The cat network every other story here draws is one 2-core
 * from end to end, so it would paint every node the same colour.
 */
const coreNodes = [
    ...["k0", "k1", "k2", "k3", "k4"],
    ...["t0", "t1", "t2"],
    ...["s0", "s1", "s2", "s3"],
    ...["p0", "p1"],
].map((id) => ({ id }));
const coreEdges = [
    ...[0, 1, 2, 3, 4].flatMap((from) =>
        [0, 1, 2, 3, 4].filter((to) => to > from).map((to) => ({ src: `k${String(from)}`, dst: `k${String(to)}` })),
    ),
    { src: "t0", dst: "t1" },
    { src: "t1", dst: "t2" },
    { src: "t2", dst: "t0" },
    { src: "t0", dst: "k0" },
    { src: "s0", dst: "s1" },
    { src: "s1", dst: "s2" },
    { src: "s2", dst: "s3" },
    { src: "s3", dst: "s0" },
    { src: "s0", dst: "k2" },
    { src: "p0", dst: "t1" },
    { src: "p1", dst: "k3" },
];

/** The core number each node must be drawn by. */
const EXPECTED_CORE: Readonly<Record<string, number>> = {
    k0: 4,
    k1: 4,
    k2: 4,
    k3: 4,
    k4: 4,
    t0: 2,
    t1: 2,
    t2: 2,
    s0: 2,
    s1: 2,
    s2: 2,
    s3: 2,
    p0: 1,
    p1: 1,
};

/**
 * K-core - colours every node by the depth of the most tightly knit core it belongs to.
 *
 * A core number is a measurement every node has, so it draws on the same orange-to-brown ramp as
 * the centrality stories: orange for the loosely attached nodes on a stalk, dark brown for the
 * clique at the centre, and one colour between them for the triangle and the square.
 */
export const KCore: Story = {
    name: "K-core (dense cores)",
    ...documented(
        {
            args: {
                dataSource: undefined,
                nodeData: coreNodes,
                edgeData: coreEdges,
                setup: storySetup({ preSteps: 8000 }),
            },
            play: async ({ canvasElement }) => {
                await waitForGraphSettled(canvasElement);

                const { session } = await renderedElement(canvasElement, "KCore: no <graphty-element> rendered");

                // Started here rather than on load, for the reason LouvainMoreCommunitiesThanColours gives.
                const run = session.runs.start("k-core", {}, { style: false });
                const result = await run;

                for (const [id, core] of Object.entries(EXPECTED_CORE)) {
                    await holds(
                        result.node(id)?.value === core,
                        `${id} has core number ${String(result.node(id)?.value)}, not ${String(core)}`,
                    );
                }

                await session.styles.encode({ run: run.id, channel: "node.color" });

                const scene = await drawn(canvasElement, "Algorithms/Community KCore");

                await assertGraphLoaded(scene, { nodes: coreNodes.length, edges: coreEdges.length });

                const colourOf = new Map(scene.nodes.map((node) => [node.id, node.hex?.toLowerCase()]));
                const byCore = new Map<number, Set<string | undefined>>();

                for (const [id, core] of Object.entries(EXPECTED_CORE)) {
                    byCore.set(core, (byCore.get(core) ?? new Set()).add(colourOf.get(id)));
                }

                await holds(
                    [...byCore.values()].every((colours) => colours.size === 1) &&
                        new Set([...byCore.values()].map((c) => [...c][0])).size === 3,
                    `expected one colour per core number and three different colours, drew ${JSON.stringify([...byCore].map(([core, c]) => [core, [...c]]))}`,
                );
            },
        },
        {
            caption:
                "K-core colors each node by the deepest core it belongs to: dark brown for the five-node clique " +
                "(core 4), a middle shade for the triangle and the square (core 2), light orange for the two nodes on " +
                "stalks (core 1).",
            code: page([
                "    graph.nodeData = nodes;",
                "    graph.edgeData = edges;",
                "",
                '    graph.addEventListener("graph-settled", async () => {',
                '        const run = graph.session.runs.start("k-core", {}, { style: false });',
                "        await run;",
                '        await graph.session.styles.encode({ run: run.id, channel: "node.color" });',
                "    }, { once: true });",
            ]),
        },
    ),
};
