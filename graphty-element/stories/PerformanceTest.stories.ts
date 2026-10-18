// Registers the <graphty-element> custom element; the type is no longer referenced.
import "../src/graphty-element";
// Registers the WebGPU accelerator factory, the one line a consumer writes to get acceleration.
// Storybook loads story files on demand, so this file needs its own import: the one in
// LayoutGpu.stories.ts only runs when that file happens to have been loaded first.
import "../webgpu";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { storyGraph } from "../test/helpers/story-graph";
import { assertDrawnColour, assertDrawnShape, assertGraphLoaded, assertLayoutPlaced, drawn, holds } from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";
import { captionDecorator } from "./layout/reader-docs";

// The same 150 / 250 graph the real-GPU browser test lays out, so what a reader watches here and
// what the accelerator is measured on are one graph rather than two that look alike.
const { nodes: nodes150, edges: edges250 } = storyGraph(150, 250);

const meta: Meta = {
    title: "Performance/Large graph",
    // The id the stories had as "Performance/Large Graph", kept so no story id changes.
    id: "performance-large-graph",
    component: "graphty-element",
    tags: ["autodocs"],
    render: renderFn,
    decorators: [captionDecorator, eventWaitingDecorator],
    parameters: {
        docs: {
            description: {
                component:
                    "A generated graph in which every node has at least one link, laid out with ForceAtlas2. " +
                    "ForceAtlas2 runs on the GPU when `@graphty/webgpu-graph-algorithms` is installed, " +
                    '`import "@graphty/graphty-element/webgpu"` is on the page and the browser has WebGPU, and on ' +
                    "the CPU otherwise; nothing else in the page changes. Performance / Overview says what to turn " +
                    "on for a large graph.",
            },
        },
        chromatic: {
            disableSnapshot: true,
        },
    },
    args: {
        // ForceAtlas2 runs on the GPU when the page has a WebGPU adapter and on the CPU when it does
        // not. The ngraph layout this story used to pick has no GPU path at all.
        layout: "forceatlas2",
        layoutConfig: { seed: 42 },
        setup: storySetup({
            edge: { "edge.color": "#666666", "edge.arrowHead": "normal" },
            node: { "node.color": "#5A67D8", "node.shape": "sphere", "node.size": 2 },
            // The play function reads the scene once the element says the picture is final, which
            // for a force layout means converged. Ten iterations a frame reaches the same resting
            // picture in a tenth of the frames.
            stepMultiplier: 10,
        }),
        nodeData: nodes150,
        edgeData: edges250,
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * 250 edges with 150 nodes - ForceAtlas2 physics layout, WebGPU accelerated where available,
 * with normal arrowheads
 * Every node has at least one edge.
 */
export const Physics250: Story = {
    name: "150 nodes, 250 edges (ForceAtlas2)",
    parameters: {
        caption:
            "ForceAtlas2 on a generated graph of 150 nodes and 250 directed edges. It runs on the GPU where " +
            "WebGPU is available and on the CPU elsewhere, and draws the same layout either way.",
        docs: {
            source: {
                code: [
                    "// npm install @graphty/graphty-element @graphty/webgpu-graph-algorithms",
                    'import "@graphty/graphty-element";',
                    'import "@graphty/graphty-element/webgpu"; // optional: the GPU when there is one',
                    "",
                    'const element = document.querySelector("graphty-element");',
                    "element.nodeData = nodes; // 150 nodes",
                    "element.edgeData = edges; // 250 edges",
                    "element.layoutConfig = { seed: 42 };",
                    'element.layout = "forceatlas2";',
                    "await element.session.styles.add({",
                    '    target: "node",',
                    '    selector: { match: "everything" },',
                    '    set: { "node.color": "#5A67D8", "node.shape": "sphere", "node.size": 2 },',
                    "});",
                    "await element.session.styles.add({",
                    '    target: "edge",',
                    '    selector: { match: "everything" },',
                    '    set: { "edge.color": "#666666", "edge.arrowHead": "normal" },',
                    "});",
                ].join("\n"),
                language: "js",
            },
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Performance/Large Graph Physics250");

        await assertGraphLoaded(scene, { nodes: 150, edges: 250 });
        await assertLayoutPlaced(scene, {});
        await assertDrawnColour(scene, "#5a67d8");
        await assertDrawnShape(scene, Object.fromEntries(scene.nodes.map((node) => [node.id, "sphere"])));

        // The generator's whole promise is that no node is left out of the graph, and the session
        // measures that independently: the smallest degree in the graph is at least one.
        const [smallest] = scene.session.data.statistics().degreeRange;

        await holds(
            smallest >= 1,
            `Performance/Large Graph Physics250: every node is meant to carry at least one edge and the ` +
                `smallest degree in the graph is ${String(smallest)}`,
        );
    },
};
