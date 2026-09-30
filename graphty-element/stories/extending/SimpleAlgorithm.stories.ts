/**
 * @file The simple tier's first algorithm plugin, registered live: the guide's own example file
 * (docs/examples/simple-tier/confidence-degree.ts) is loaded before the element renders, and the
 * story runs it with the guide's "use it" line. The picture is the colour ramp the element derives
 * from the run, with no style code in the plugin or here.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    assertAlgorithmPainted,
    assertDrawnVariety,
    assertGraphLoaded,
    drawn,
    holds,
    renderedElement,
} from "../assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "../helpers";

/**
 * A small protein interaction network. Every interaction carries a confidence except
 * CDKN1A-CDK2, which the plugin leaves out and the run's record counts; GAPDH has no partner.
 */
const NODES = [
    { id: "TP53", label: "TP53" },
    { id: "MDM2", label: "MDM2" },
    { id: "CDKN1A", label: "CDKN1A" },
    { id: "CDK2", label: "CDK2" },
    { id: "BRCA1", label: "BRCA1" },
    { id: "BARD1", label: "BARD1" },
    { id: "GAPDH", label: "GAPDH" },
];
const EDGES = [
    { source: "TP53", target: "MDM2", confidence: 0.9 },
    { source: "MDM2", target: "CDKN1A", confidence: 0.5 },
    { source: "CDKN1A", target: "TP53", confidence: 0.4 },
    { source: "CDKN1A", target: "CDK2" },
    { source: "BRCA1", target: "BARD1", confidence: 0.7 },
];

const meta: Meta<StoryArgs> = {
    title: "Extending/Simple tier/Algorithm",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    // The plugin registers when its module is evaluated, which is what a page does with a
    // plugin's <script>. A loader runs before the element renders.
    loaders: [
        async () => {
            await import("../../docs/examples/simple-tier/confidence-degree");
            return {};
        },
    ],
    args: {
        dataSource: undefined,
        nodeData: NODES,
        edgeData: EDGES,
        layout: "circular",
        setup: storySetup({
            viewMode: "2d",
            nodeEncode: { "node.label": { by: "data.label", scale: "passthrough" } },
        }),
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Confidence-weighted degree, defined with `defineAlgorithm` in five lines and run by its id.
 * TP53 and MDM2 are drawn darkest; CDK2 and GAPDH, whose summed confidence is 0, lightest.
 */
export const ConfidenceDegree: Story = {
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const element = await renderedElement(canvasElement, "the story rendered no <graphty-element>");

        // The guide's "use it" line.
        const run = element.run("acme-confidence-degree", {}, { as: "strength" });
        await run;
        await holds(run.status === "succeeded", `the run ended "${run.status}"`);

        const scene = await drawn(canvasElement, "Extending/Simple tier/Algorithm ConfidenceDegree");
        await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
        await assertAlgorithmPainted(scene, "acme-confidence-degree", { paints: "node", atLeast: NODES.length });
        await assertDrawnVariety(scene, "hex", 4);
    },
};
