/**
 * A file's own styles drawn as style layers: each story loads a styled file with
 * `dataSourceConfig: { styles: "file" }`, the same choice `loadFromUrl(url, { styles: "file" })`
 * makes, and the element turns the file's styling into layers above its own defaults. What the
 * file leaves unstyled gets the default of the program that wrote it (Gephi for GEXF, Cytoscape.js
 * for its JSON, Graphviz for DOT), so the graph looks as it does there.
 *
 * Each story's play function reads back, through the element's session, that the file's layers
 * exist and that a few nodes are drawn in the colors the file gives them.
 */
import "../index.ts";
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import dotColorsUrl from "../../graph-io/test/corpus/styles/dot/graphviz-gallery-neato-colors.gv?url";
import miserablesUrl from "../../graph-io/test/corpus/styles/gexf/gexfjs-miserables.gexf?url";
import { fileStyleOf } from "../session";
import { assertDrawnColour, assertGraphLoaded, drawn, holds, renderedElement } from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "./helpers";

/** Resolves a served path against the page, so the element receives an absolute URL. */
const absolute = (path: string): string => new URL(path, document.baseURI).href;

/**
 * A Cytoscape.js document with its stylesheet: a grey default, a class colored red and drawn as a
 * diamond, sizes mapped from a weight, and edge colors read from each edge's data.
 */
const CYTOSCAPE_JSON = JSON.stringify({
    elements: [
        { data: { id: "hub", weight: 10 }, classes: "core" },
        { data: { id: "a", weight: 2 } },
        { data: { id: "b", weight: 4 } },
        { data: { id: "c", weight: 6 } },
        { data: { id: "d", weight: 8 } },
        { data: { id: "e", weight: 0 } },
        { data: { id: "hub-a", source: "hub", target: "a", color: "#1e88e5" } },
        { data: { id: "hub-b", source: "hub", target: "b", color: "#1e88e5" } },
        { data: { id: "hub-c", source: "hub", target: "c", color: "#43a047" } },
        { data: { id: "hub-d", source: "hub", target: "d", color: "#43a047" } },
        { data: { id: "d-e", source: "d", target: "e", color: "#8e24aa" } },
    ],
    style: [
        { selector: "node", style: { "background-color": "#9e9e9e", label: "data(id)" } },
        { selector: ".core", style: { "background-color": "#e53935", shape: "diamond" } },
        {
            selector: "node[weight]",
            style: { width: "mapData(weight, 0, 10, 20, 60)", height: "mapData(weight, 0, 10, 20, 60)" },
        },
        { selector: "edge", style: { "line-color": "data(color)", width: 3 } },
    ],
});

const meta: Meta = {
    title: "Data/File Styles",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        controls: { exclude: /^(#|_)/ },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete (30 frames at 60fps)
        },
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Wait for the story's graph, and check the file's styles were drawn as layers.
 * @param canvasElement - Where the story rendered.
 * @param story - The story, for failure messages.
 * @param counts - The nodes and edges the file declares.
 * @param counts.nodes - The nodes.
 * @param counts.edges - The edges.
 * @param colors - Some node ids and the color the file gives each.
 */
async function drewFileStyles(
    canvasElement: HTMLElement,
    story: string,
    counts: { readonly nodes: number; readonly edges: number },
    colors: Readonly<Record<string, string>>,
): Promise<void> {
    await waitForGraphSettled(canvasElement);
    const element = await renderedElement(canvasElement, `${story}: no <graphty-element> rendered`);
    const layers = element.session.styles.list().filter((layer) => fileStyleOf(layer) !== null);
    await holds(layers.length > 0, `${story}: the load drew no layers from the file's styles`);

    const scene = await drawn(canvasElement, `Data/File Styles ${story}`);
    await assertGraphLoaded(scene, counts);
    await assertDrawnColour(scene, colors);
}

/** Les Miserables as Gephi saved it: every node colored by its modularity class. */
export const Gexf: Story = {
    args: {
        dataSource: "gexf",
        dataSourceConfig: { url: absolute(miserablesUrl), styles: "file" },
        layout: "ngraph",
        layoutConfig: { seed: 42 },
        setup: storySetup({ preSteps: 1000 }),
    },
    play: async ({ canvasElement }) => {
        // Myriel and Valjean, in the viz colors the file gives them.
        await drewFileStyles(canvasElement, "Gexf", { nodes: 77, edges: 254 }, { "0.0": "#a8a81d", "11.0": "#1da8a8" });
    },
};

/** A Cytoscape.js document with a stylesheet: classes, a mapped size and edge colors from data. */
export const CytoscapeJson: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: { data: CYTOSCAPE_JSON, styles: "file" },
        layout: "ngraph",
        layoutConfig: { seed: 42 },
        setup: storySetup({ preSteps: 1000 }),
    },
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "CytoscapeJson",
            { nodes: 6, edges: 5 },
            { hub: "#e53935", a: "#9e9e9e", e: "#9e9e9e" },
        );
    },
};

/** Graphviz's twelve colors: every node filled with the color it is named for. */
export const Dot: Story = {
    args: {
        dataSource: "dot",
        dataSourceConfig: { url: absolute(dotColorsUrl), styles: "file" },
        layout: "ngraph",
        layoutConfig: { seed: 42 },
        setup: storySetup({ preSteps: 1000 }),
    },
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "Dot",
            { nodes: 13, edges: 21 },
            { red: "#ff0000", blue: "#0000ff", green: "#00ff00", yellow: "#ffff00" },
        );
    },
};
