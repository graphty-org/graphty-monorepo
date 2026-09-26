import type { Graphty } from "../../../src/graphty-element";
import { assertGraphLoaded, drawn, holds } from "../../assertions";
import { algorithmMetaBase, createAlgorithmStory, type Story, storySetup, waitForGraphSettled } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Community",
};
export default meta;

/**
 * Louvain - categorical colors by detected community
 * Uses the default categorical palette, Okabe-Ito, for community membership
 */
export const Louvain: Story = createAlgorithmStory("graphty:louvain", { varies: "hex", atLeast: 2 });

/**
 * Girvan-Newman - community detection via edge betweenness removal
 * Draws with the default categorical palette, Okabe-Ito, like every community story here
 */
export const GirvanNewman: Story = createAlgorithmStory("graphty:girvan-newman", { varies: "hex", atLeast: 2 });

/**
 * Leiden - improved community detection (guarantees connected communities)
 * Draws with the default categorical palette, Okabe-Ito, like every community story here
 */
export const Leiden: Story = createAlgorithmStory("graphty:leiden", { varies: "hex", atLeast: 2 });

/**
 * Label Propagation - fast community detection via label spreading
 * Draws with the default categorical palette, Okabe-Ito, like every community story here
 */
export const LabelPropagation: Story = createAlgorithmStory("graphty:label-propagation", { varies: "hex", atLeast: 2 });

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
const OTHER_GREY = "#505050";

/**
 * More communities than the default palette has colours.
 *
 * Louvain finds eleven communities and Okabe-Ito has eight colours. The default overflow policy,
 * "other", keeps the palette's eight colours for the eight largest communities and paints the
 * three smallest one dark grey, which the legend names "other: 3 groups".
 */
export const LouvainMoreCommunitiesThanColours: Story = {
    args: {
        dataSource: undefined,
        nodeData: cliqueNodes,
        edgeData: cliqueEdges,
        setup: storySetup({ preSteps: 8000 }),
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const element = canvasElement.querySelector("graphty-element");

        await holds(element !== null, "LouvainMoreCommunitiesThanColours: no <graphty-element> rendered");

        const graphtyElement = element as Graphty;
        const { session } = graphtyElement;

        // Started here rather than on load: inline data arrives as nodes and then edges, and a run
        // started on load can see the nodes before the edges.
        const run = session.runs.start("louvain", {}, { style: false });

        await run;
        await session.styles.encode({ run: run.id, channel: "node.color" });

        const scene = await drawn(canvasElement, "Algorithms/Community LouvainMoreCommunitiesThanColours");

        await assertGraphLoaded(scene, { nodes: cliqueNodes.length, edges: cliqueEdges.length });

        const colours = new Set(scene.nodes.map((node) => node.hex?.toLowerCase()));
        const greyed = new Set(
            scene.nodes.filter((node) => node.hex?.toLowerCase() === OTHER_GREY).map((node) => node.id.split("-")[0]),
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

        await holds(last?.label === "other: 3 groups", `the legend's last row reads "${String(last?.label)}"`);
    },
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
    args: {
        dataSource: undefined,
        nodeData: coreNodes,
        edgeData: coreEdges,
        setup: storySetup({ preSteps: 8000 }),
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const element = canvasElement.querySelector("graphty-element");

        await holds(element !== null, "KCore: no <graphty-element> rendered");

        const { session } = element as Graphty;

        // Started here rather than on load, for the reason LouvainMoreCommunitiesThanColours gives.
        const run = session.runs.start("k-core", {}, { style: false });
        const result = await run;

        for (const [id, core] of Object.entries(EXPECTED_CORE)) {
            await holds(result.node(id)?.value === core, `${id} has core number ${String(result.node(id)?.value)}, not ${String(core)}`);
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
            [...byCore.values()].every((colours) => colours.size === 1) && new Set([...byCore.values()].map((c) => [...c][0])).size === 3,
            `expected one colour per core number and three different colours, drew ${JSON.stringify([...byCore].map(([core, c]) => [core, [...c]]))}`,
        );
    },
};
