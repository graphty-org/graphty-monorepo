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
    title: "Extending/Custom algorithm",
    // The component id from before the section was retitled, so every story id (and its
    // approved screenshot) stays the same.
    id: "extending-simple-tier-algorithm",
    component: "graphty-element",
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component:
                    "An algorithm of your own, in five lines: `defineAlgorithm({ id, node })` from " +
                    "`@graphty/graphty-element/extend` registers a score computed for every node, and " +
                    '`element.run("acme-confidence-degree")` runs it like a built-in algorithm. The element colors ' +
                    "the nodes by the result with no style code. Here the score is each protein's summed " +
                    "interaction confidence: TP53 and MDM2 are drawn darkest, CDK2 and GAPDH lightest. For full " +
                    "control -- a result shape of your own, progress, a cost estimate -- extend `DeclaredAlgorithm`: " +
                    "see [Custom algorithms](https://graphty.app/docs/graphty-element/guide/extending/custom-algorithms).",
            },
            source: {
                language: "html",
                code: `<graphty-element id="graph" layout="circular" layout-config='{"scale": 0.08}' view-mode="2d"></graphty-element>

<script type="module">
    import { defineAlgorithm } from "@graphty/graphty-element/extend";

    // Confidence-weighted degree: the summed confidence of the edges touching a node.
    defineAlgorithm({
        id: "acme-confidence-degree",
        options: { confidence: { type: "attribute", on: "edge", default: "confidence" } },
        node: (node, { options }) => node.strength(options.confidence),
    });

    const graph = document.getElementById("graph");
    graph.nodeData = [{ id: "TP53" }, { id: "MDM2" }, { id: "CDKN1A" }, { id: "CDK2" },
        { id: "BRCA1" }, { id: "BARD1" }, { id: "GAPDH" }];
    graph.edgeData = [
        { source: "TP53", target: "MDM2", confidence: 0.9 },
        { source: "MDM2", target: "CDKN1A", confidence: 0.5 },
        { source: "CDKN1A", target: "TP53", confidence: 0.4 },
        { source: "CDKN1A", target: "CDK2" },
        { source: "BRCA1", target: "BARD1", confidence: 0.7 },
    ];
    // Show each protein's name on its node.
    graph.session.styles.add({
        name: "Names",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.label": { by: "data.id", scale: "passthrough" } },
    });
    graph.run("acme-confidence-degree", {}, { as: "strength" });
</script>`,
            },
        },
    },
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
        // The circle's default radius is 80 scene units, which shrinks seven unit-sized nodes and
        // their labels to specks once the camera frames it. A radius of 6.4 keeps them readable.
        layoutConfig: { scale: 0.08 },
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
    name: "Confidence-weighted degree",
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
