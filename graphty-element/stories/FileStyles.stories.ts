/**
 * A file's own styles drawn as style layers: each story loads a styled file with
 * `dataSourceConfig: { styles: "file" }`, the same choice `loadFromUrl(url, { styles: "file" })`
 * makes, and the element turns the file's styling into layers above its own defaults. What the
 * file leaves unstyled gets the default of the program that wrote it (Gephi for GEXF, yEd for its
 * GraphML and GML, Graphviz for DOT, Pajek, Cytoscape for XGMML, CX, CX2 and sessions, Cytoscape.js
 * for its JSON), so the graph looks as it does there.
 *
 * Every story but one loads one real file, as the program named in its description wrote it, from
 * graph-io's style corpus (`graph-io/test/corpus/styles/<format>/SOURCES.md` gives each file's
 * source and license). The Cytoscape.js JSON story with a hand-written document stays because it
 * shows a `mapData()` size and colors read from each edge's data, which the real file does not use.
 *
 * Each story's play function reads back, through the element's session, that the file's layers
 * exist and that a few nodes are drawn in the colors the file gives them.
 */
import "../index.ts";
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import cxUrl from "../../graph-io/test/corpus/styles/cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx?url";
import cx2Url from "../../graph-io/test/corpus/styles/cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2?url";
import annotationSessionUrl from "../../graph-io/test/corpus/styles/cys/cytoscape-tutorials-AnnotationExample.cys?url";
import dotColorsUrl from "../../graph-io/test/corpus/styles/dot/graphviz-gallery-neato-colors.gv?url";
import miserablesUrl from "../../graph-io/test/corpus/styles/gexf/gexfjs-miserables.gexf?url";
import need4stacksUrl from "../../graph-io/test/corpus/styles/gml/spupyrev_bob__need4stacks261.gml?url";
import voctomixUrl from "../../graph-io/test/corpus/styles/graphml/yed-shapenode/voc__voctomix__schema.graphml?url";
import glycolysisUrl from "../../graph-io/test/corpus/styles/json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json?url";
import catarUrl from "../../graph-io/test/corpus/styles/pajek/SamTseng_CATAR__Pajek_format.net?url";
import ngsCheckMateUrl from "../../graph-io/test/corpus/styles/xgmml/parklab_NGSCheckMate__luad.out.xgmml?url";
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
 * The nodes and edges a file declares. Named, so the helper below has no braces in its signature:
 * the determinism check finds a helper's body at the first brace after its name.
 */
interface FileCounts {
    readonly nodes: number;
    readonly edges: number;
}

/**
 * Wait for the story's graph, and check the file's styles were drawn as layers.
 * @param canvasElement - Where the story rendered.
 * @param story - The story, for failure messages.
 * @param counts - The nodes and edges the file declares.
 * @param counts.nodes - The nodes.
 * @param counts.edges - The edges.
 * @param colors - Some node ids and the color the file gives each.
 * @param larger - Pairs of node ids, the first of which the file draws larger than the second.
 * @param labels - Some node ids and the label the file gives each, drawn on a label plane with ink.
 */
async function drewFileStyles(
    canvasElement: HTMLElement,
    story: string,
    counts: FileCounts,
    colors: Readonly<Record<string, string>>,
    larger: readonly (readonly [string, string])[] = [],
    labels?: Readonly<Record<string, string>>,
): Promise<void> {
    await waitForGraphSettled(canvasElement);
    const element = await renderedElement(canvasElement, `${story}: no <graphty-element> rendered`);
    const layers = element.session.styles.list().filter((layer) => fileStyleOf(layer) !== null);
    await holds(layers.length > 0, `${story}: the load drew no layers from the file's styles`);

    const scene = await drawn(canvasElement, `Data/File Styles ${story}`);
    await assertGraphLoaded(scene, counts);
    await assertDrawnColour(scene, colors);

    const radius = new Map(scene.nodes.map((node) => [node.id, node.radius]));
    const smaller = larger
        .filter(([big, small]) => !((radius.get(big) ?? 0) > (radius.get(small) ?? Infinity)))
        .map(([big, small]) => `${big} (${String(radius.get(big))}) vs ${small} (${String(radius.get(small))})`);
    await holds(
        smaller.length === 0,
        `${story}: the file draws the first node of each pair larger, the element does not -- ${smaller.join(", ")}`,
    );

    const unlabeled = Object.entries(labels ?? {})
        .filter(([id, text]) => {
            const painted = (element.session.styles.explain({ node: id }).merged as Record<string, unknown>)[
                "node.label"
            ];
            const node = scene.nodes.find((entry) => entry.id === id);
            return painted !== text || node?.hasLabelMesh !== true || node.labelInk < 1;
        })
        .map(([id, text]) => `${id} (${JSON.stringify(text)})`);
    await holds(
        unlabeled.length === 0,
        `${story}: the file labels these nodes and the element draws no such label -- ${unlabeled.join(", ")}`,
    );
}

/**
 * A story's arguments for one file, drawn with the file's styles by a seeded force layout, or for
 * a file of a few hundred nodes, which a force layout would still be moving when the story is
 * captured, on a circle, which places every node at once.
 * @param dataSource - The data source that reads the file.
 * @param source - Where the file comes from.
 * @param placedOnce - Lay the file out on a circle rather than with a force layout.
 * @returns The story's arguments.
 */
function fileArgs(dataSource: string, source: { readonly url: string }, placedOnce = false): Story["args"] {
    return {
        dataSource,
        dataSourceConfig: { ...source, styles: "file" },
        ...(placedOnce ? { layout: "circular" } : { layout: "ngraph", layoutConfig: { seed: 42 } }),
        setup: storySetup({ preSteps: 1000 }),
    };
}

/**
 * `gexfjs-miserables.gexf`, Les Miserables as Gephi saved it (from the gexf-js project, MIT).
 * Look for: every node colored by its modularity class, and sized by its degree, so Valjean and
 * Myriel are large and the characters with one scene are small.
 */
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

/**
 * A hand-written Cytoscape.js document with a stylesheet, kept beside the real file because it uses
 * what that file does not: a size mapped with `mapData()` and edge colors read from each edge's
 * data. Look for: the red diamond hub, grey nodes growing with their weight, and blue, green and
 * purple edges.
 */
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

/**
 * `graphviz-gallery-neato-colors.gv`, from the Graphviz gallery (EPL-2.0), written for Graphviz.
 * Look for: every node filled with the color it is named for, and edges in colors of their own.
 */
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
            [],
            { red: "red", blue: "blue" },
        );
    },
};

/**
 * `voc__voctomix__schema.graphml`, the voctomix video mixer's architecture drawn in yEd 3.18 (MIT).
 * Look for: yEd's group boxes drawn as large pale nodes, and the nodes inside them in yEd's
 * yellow, cyan, light blue, green and orange fills, as boxes, rounded boxes and ellipses.
 */
export const GraphmlYed: Story = {
    args: fileArgs("graphml", { url: absolute(voctomixUrl) }),
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "GraphmlYed",
            { nodes: 43, edges: 48 },
            {
                "n0::n0": "#ffcc00",
                "n2::n1": "#ccffff",
                "n2::n3": "#00ccff",
                "n2::n5": "#99cc00",
                "n2::n9": "#ff6600",
            },
            [],
            { "n0::n0": "Source\nView", "n2::n1": "Recording\nCompositor" },
        );
    },
};

/**
 * `spupyrev_bob__need4stacks261.gml`, a book-embedding test graph saved as GML by yEd (its
 * `Creator "yFiles"` line), from the spupyrev/bob project (MIT). Look for: four fills the file
 * states per node, pink, light blue, silver and yellow, on yEd's ellipses.
 */
export const GmlYed: Story = {
    args: fileArgs("gml", { url: absolute(need4stacksUrl) }, true),
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "GmlYed",
            { nodes: 261, edges: 777 },
            { "0": "#ff99cc", "2": "#99ccff", "7": "#c0c0c0", "68": "#ffcc00" },
        );
    },
};

/**
 * `SamTseng_CATAR__Pajek_format.net`, the Pajek sample of the CATAR project (MIT), written in
 * Pajek's own format. Look for: three documents in red, yellow and green, sized by their `x_fact`
 * (Doc3 largest, Doc2 smallest), joined by green, black and red lines.
 */
export const Pajek: Story = {
    args: fileArgs("pajek", { url: absolute(catarUrl) }),
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "Pajek",
            { nodes: 3, edges: 5 },
            { "1": "#ff0000", "2": "#ffff00", "3": "#00ff00" },
            [
                ["3", "1"],
                ["1", "2"],
            ],
            { "1": "Doc1", "3": "Doc3" },
        );
    },
};

/**
 * `parklab_NGSCheckMate__luad.out.xgmml`, NGSCheckMate's sample-matching network saved by
 * Cytoscape as XGMML (MIT). Look for: every pair of matching samples sharing a fill of its own,
 * so the picture is a scatter of two-colored pairs in many colors.
 */
export const Xgmml: Story = {
    args: fileArgs("xgmml", { url: absolute(ngsCheckMateUrl) }),
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "Xgmml",
            { nodes: 45, edges: 62 },
            { "1": "#f3f60e", "3": "#6ac94b", "5": "#0234bf", "7": "#a95d32" },
            [],
            { "1": "05-4424.TP(1)", "2": "05-4424.NB(2)" },
        );
    },
};

/**
 * `ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx`, "Schizophrenia risk gene subnetwork with
 * AOP-Wiki" from NDEx (CC BY 4.0, owner pklemmer), its style made in Cytoscape and saved as CX.
 * Look for: nodes colored by their type (red, cyan, pink, green, purple, orange, pale blue) and
 * sized by a mapping, the largest about three times the smallest.
 */
export const Cx: Story = {
    args: fileArgs("cx", { url: absolute(cxUrl) }),
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "Cx",
            { nodes: 75, edges: 108 },
            { "303462": "#b48fff", "303592": "#1deff2", "305002": "#fb6a4a", "311007": "#74c476" },
            [["305007", "308957"]],
        );
    },
};

/**
 * `ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2`, the same NDEx network as the CX story (CC BY
 * 4.0, owner pklemmer), saved as CX2, the format's second version. Look for: the same picture as
 * the CX story, read through CX2's own style vocabulary.
 */
export const Cx2: Story = {
    args: fileArgs("cx2", { url: absolute(cx2Url) }),
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "Cx2",
            { nodes: 75, edges: 108 },
            { "303442": "#b48fff", "303527": "#1deff2", "304537": "#fb6a4a", "308722": "#74c476" },
            [["627299", "308957"]],
        );
    },
};

/**
 * `cytoscape-tutorials-AnnotationExample.cys`, a Cytoscape session from the Cytoscape tutorials
 * (CC0): the galactose yeast network. Look for: a continuous fill from blue through white to
 * yellow by each gene's expression, and nodes sized by their degree, so the hubs are the largest.
 */
export const CytoscapeSession: Story = {
    // No setup: its render is its own, and a circular layout takes no pre-steps.
    args: { ...fileArgs("cys", { url: absolute(annotationSessionUrl) }, true), setup: undefined },
    render: (args, context) => {
        const element = renderFn(args, context) as Awaited<ReturnType<typeof renderedElement>>;
        // TEMPORARY, graphty-element defect #2249: 359 curved edges take over 15 s to settle, so a
        // layer on top draws them straight. Delete this render when #2249 is fixed.
        element.addEventListener("data-loaded", () => {
            element.session.styles.add({
                name: "Straight edges (until #2249)",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.curvature": false },
            });
        });
        return element;
    },
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "CytoscapeSession",
            { nodes: 330, edges: 359 },
            { "169331": "#0066cc", "169365": "#ffff00" },
            [["169331", "169365"]],
        );
    },
};

/**
 * `iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json`, the glycolysis pathway as a Cytoscape.js
 * document with its stylesheet, from the cytoscape.js-cosep project (MIT). Look for: white nodes
 * drawn as boxes, rounded boxes and ellipses by their class, and blue edges ending in triangles
 * or circles.
 */
export const CytoscapeJs: Story = {
    args: fileArgs("json", { url: absolute(glycolysisUrl) }),
    play: async ({ canvasElement }) => {
        await drewFileStyles(
            canvasElement,
            "CytoscapeJs",
            { nodes: 44, edges: 44 },
            { glyph0: "#ffffff", glyph9: "#ffffff" },
        );
    },
};
