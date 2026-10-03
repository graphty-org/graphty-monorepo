import type { Meta, StoryObj } from "@storybook/html-vite";

import { ALGORITHM_GROUPS, type AlgorithmGroupName } from "./catalog.js";
import { networkArgs, networkArgTypes, renderDemo, type RunArgs } from "./demo.js";
import { placeForAlgorithm, runAlgorithm } from "./run.js";

interface AlgorithmArgs extends RunArgs {
    algorithm: string;
    directed: boolean;
}

/**
 * Story render: lays the network out, runs the algorithm and colors the result.
 * @param args - the story args
 * @returns the story root
 */
function render(args: AlgorithmArgs): HTMLElement {
    const method = `graphty${args.algorithm.charAt(0).toUpperCase()}${args.algorithm.slice(1)}`;
    return renderDemo(args, method, async ({ cy, gpuMode, extra, setStatus }) => {
        await placeForAlgorithm(cy, args.seed);
        setStatus(`${method}: running...`);
        return runAlgorithm(cy, args.algorithm, { gpuMode, directed: args.directed, extra });
    });
}

const meta: Meta<AlgorithmArgs> = {
    title: "Demo/Algorithms",
    render,
    argTypes: { ...networkArgTypes, directed: { control: "boolean" } },
};
export default meta;

type Story = StoryObj<AlgorithmArgs>;

/**
 * A story for one group: its first algorithm on the group's network, any of the others from the control.
 * @param group - the group
 * @returns the story
 */
function storyOf(group: AlgorithmGroupName): Story {
    const g = ALGORITHM_GROUPS[group];
    return {
        args: { ...networkArgs, network: g.network, directed: g.directed, algorithm: g.algorithms[0] },
        argTypes: { algorithm: { control: "select", options: g.algorithms } },
    };
}

/** Scores per node (or per edge), colored pale (low) to dark red (high). */
export const Centrality = storyOf("Centrality");

/** Partitions, one color per cluster. */
export const Communities = storyOf("Communities");

/** Paths and walks from the first node, and spanning trees. */
export const PathsAndTrees = storyOf("PathsAndTrees");

/** Components, cycles, orderings, bipartiteness, matchings and isomorphism, on a directed random tree. */
export const Structure = storyOf("Structure");

/** Maximum flow and minimum cuts: the two sides and the cut edges. */
export const FlowsAndCuts = storyOf("FlowsAndCuts");

/** Link prediction: scores of node pairs, predicted links, and the evaluations against held-out edges. */
export const LinkPrediction = storyOf("LinkPrediction");
