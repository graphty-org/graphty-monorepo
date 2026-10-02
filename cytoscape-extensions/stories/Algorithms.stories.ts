import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Collection, NodeCollection } from "cytoscape";

import { ASYNC_ALGORITHM_NAMES, type Backend } from "../src/index.js";
import {
    colorByValue,
    networkArgs,
    networkArgTypes,
    type Outcome,
    PALETTE,
    placeForAlgorithm,
    renderDemo,
    type RunArgs,
} from "./demo.js";

interface AlgorithmArgs extends RunArgs {
    algorithm: string;
    directed: boolean;
}

/** The parts of every result shape the demo reads. */
type AnyResult = Partial<{
    backend: Backend;
    score(n: string): number | undefined;
    distanceTo(n: string): number;
    depth(n: string): number | undefined;
    modularity: number;
    totalWeight: number;
}>;

type Method = (o: Record<string, unknown>) => unknown;

/** Algorithms that start from one node: they get root "#n0". */
const ROOTED = new Set([
    "dijkstra",
    "bellmanFord",
    "breadthFirstSearch",
    "directionOptimizedBfs",
    "personalizedPageRank",
]);

/**
 * Story render: lays the network out, runs the algorithm and colors the result.
 * @param args - the story args
 * @returns the story root
 */
function render(args: AlgorithmArgs): HTMLElement {
    const method = `graphty${args.algorithm.charAt(0).toUpperCase()}${args.algorithm.slice(1)}`;
    const hasGpu = ASYNC_ALGORITHM_NAMES.includes(`${method}Async`);
    return renderDemo(args, method, async ({ cy, gpuMode, extra, setStatus }): Promise<Outcome> => {
        await placeForAlgorithm(cy, args.seed);
        setStatus(`${method}: running...`);
        const options: Record<string, unknown> = { directed: args.directed, ...extra };
        if (ROOTED.has(args.algorithm)) {
            options[args.algorithm === "personalizedPageRank" ? "personalization" : "root"] ??= "#n0";
        }
        const eles = cy.elements() as unknown as Record<string, Method>;
        let r: AnyResult;
        const t0 = performance.now();
        if (hasGpu) {
            r = (await eles[`${method}Async`]({ ...options, gpu: gpuMode })) as AnyResult;
        } else if (args.backend === "gpu") {
            throw new Error(`${method} has no GPU implementation; pick auto or cpu`);
        } else {
            r = eles[method](options) as AnyResult;
        }
        const ms = performance.now() - t0;
        let note = "";
        if (Array.isArray(r)) {
            const parts = r as NodeCollection[];
            cy.batch(() => parts.forEach((c, i) => c.data("color", PALETTE[i % PALETTE.length])));
            note = `${parts.length.toLocaleString()} clusters${r.modularity !== undefined ? `, modularity ${r.modularity.toFixed(4)}` : ""}`;
        } else if (r.score) {
            colorByValue(cy, (id) => r.score?.(`#${id}`));
            note = "darker red = higher score";
        } else if (r.distanceTo) {
            colorByValue(cy, (id) => r.distanceTo?.(`#${id}`));
            note = "distance from n0: darker red = farther";
        } else if (r.depth) {
            colorByValue(cy, (id) => r.depth?.(`#${id}`));
            note = "hops from n0: darker red = deeper";
        } else if (r.totalWeight !== undefined) {
            (r as unknown as Collection).data("color", "#e15759");
            note = `the tree in red, total weight ${r.totalWeight}`;
        }
        const b = r.backend;
        if (!b) {
            return { ran: "cpu", detail: "no GPU implementation of this algorithm", note, ms };
        }
        return { ran: b.ran, detail: b.ran === "gpu" ? b.device : b.reason, note, ms };
    });
}

const meta: Meta<AlgorithmArgs> = {
    title: "Demo/Algorithms",
    render,
    argTypes: { ...networkArgTypes, directed: { control: "boolean" } },
};
export default meta;

type Story = StoryObj<AlgorithmArgs>;

/** Scores per node, colored pale (low) to dark red (high). */
export const Centrality: Story = {
    args: { ...networkArgs, algorithm: "pageRank", directed: false },
    argTypes: {
        algorithm: {
            control: "select",
            options: [
                "pageRank",
                "personalizedPageRank",
                "eigenvectorCentrality",
                "katzCentrality",
                "hits",
                "closenessCentrality",
                "betweennessCentrality",
                "degreeCentrality",
                "kCoreDecomposition",
                "triangleCount",
            ],
        },
    },
};

/** Partitions, one color per cluster. */
export const Communities: Story = {
    args: { ...networkArgs, network: "planted-partition", algorithm: "louvain", directed: false },
    argTypes: {
        algorithm: {
            control: "select",
            options: [
                "louvain",
                "leiden",
                "labelPropagation",
                "labelPropagationSynchronous",
                "connectedComponents",
                "weaklyConnectedComponents",
                "markovClustering",
                "girvanNewman",
            ],
        },
    },
};

/** Paths and walks from node n0, and spanning trees. */
export const PathsAndTrees: Story = {
    args: { ...networkArgs, algorithm: "dijkstra", directed: false },
    argTypes: {
        algorithm: {
            control: "select",
            options: [
                "dijkstra",
                "bellmanFord",
                "breadthFirstSearch",
                "directionOptimizedBfs",
                "kruskalMST",
                "primMST",
            ],
        },
    },
};
