import "../index.ts";
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import cxUrl from "../../graph-io/test/conformance/fixtures/cx/ndex/WP4742-ketogenesis.cx?url";
import cx2Url from "../../graph-io/test/conformance/fixtures/cx2/cytoscape-web/2496d8c5-5c74-11ec-b3be-0ac135e8bacf.valid.cx2?url";
import cysUrl from "../../graph-io/test/conformance/fixtures/cys/tutorials/STELZ.cys?url";
import dotUrl from "../../graph-io/test/conformance/fixtures/dot/pydot/parsing_test.dot?url";
import gexfUrl from "../../graph-io/test/conformance/fixtures/gexf/graphology/les_miserables.gexf?url";
import gmlUrl from "../../graph-io/test/conformance/fixtures/gml/igraph/fuzzing_test_inputs_graph1.gml?url";
import usAirUrl from "../../graph-io/test/conformance/fixtures/pajek/batagelj/USAir97.net?url";
import a97Url from "../../graph-io/test/conformance/fixtures/pajek/bavla/A97.NET?url";
import xgmmlUrl from "../../graph-io/test/conformance/fixtures/xgmml/ngscheckmate/test.out.xgmml?url";
import yedUrl from "../../graph-io/test/corpus/graphml/yfiles-sample.graphml?url";
import { assertGraphLoaded, assertLayoutPlaced, drawn, holds } from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, waitForGraphSettled } from "./helpers";

/**
 * One real file per format that stores node positions, each loaded with `layout: "recommended"`,
 * so the element picks the `fixed` layout and draws every node where the file put it. Each story
 * checks the layout it picked and a few nodes' coordinates against the file's own numbers, converted
 * by hand: the node's center, y growing upward, times `positionScale`.
 *
 * `positionScale` is set per file only so nodes of size one are neither specks nor overlapping;
 * the camera frames the drawing either way.
 */
const meta: Meta = {
    title: "Data/File positions",
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

/** A node's coordinates as the file stores them, converted to its center with y up. */
type Expected = Readonly<Record<string, readonly [number, number, number]>>;

/**
 * The load picked the fixed layout, and each listed node is drawn at its file coordinate.
 * @param canvasElement - Where the story was rendered.
 * @param story - The story, for the failure message.
 * @param counts - The nodes and edges the file declares.
 * @param counts.nodes - Its nodes.
 * @param counts.edges - Its edges.
 * @param scale - The story's `positionScale`.
 * @param expected - Some nodes' coordinates in file units, center and y up.
 */
const atFilePositions = async (
    canvasElement: HTMLElement,
    story: string,
    counts: { nodes: number; edges: number },
    scale: number,
    expected: Expected,
): Promise<void> => {
    await waitForGraphSettled(canvasElement);
    const scene = await drawn(canvasElement, `File positions ${story}`);

    await assertGraphLoaded(scene, counts);
    await assertLayoutPlaced(scene);
    await holds(
        scene.element.layout === "fixed",
        `${story}: the load picked ${String(scene.element.layout)}, not fixed`,
    );

    const off: string[] = [];
    for (const [id, want] of Object.entries(expected)) {
        const node = scene.nodes.find((candidate) => candidate.id === id);
        const wrong = node?.position.some((value, axis) => Math.abs(value - want[axis] * scale) > 1e-3 * scale) ?? true;
        if (wrong) {
            off.push(`${id} at ${node?.position.join(",") ?? "nowhere"}, file says ${want.join(",")}`);
        }
    }

    await holds(off.length === 0, `${story}: nodes not where the file put them -- ${off.join("; ")}`);
};

// GML from yFiles (y grows downward, pixels): igraph's fuzzing input graph1.gml (GPL-2.0-or-later)
export const GML: Story = {
    args: {
        dataSource: "gml",
        dataSourceConfig: { url: gmlUrl, layout: "recommended" },
        positionScale: 0.03,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "GML", { nodes: 3, edges: 3 }, 0.03, {
            // graphics [ x 15.0 y 125.48405928593465 ]
            "0": [15, -125.48405928593465, 0],
            "2": [104.94041508180403, -15, 0],
        });
    },
};

// Pajek: US air routes in 1997, by Vladimir Batagelj and Andrej Mrvar (CC BY-NC-SA 2.5). Pajek's
// y grows downward, so Deadhorse, Alaska is drawn above Miami.
export const Pajek: Story = {
    args: {
        dataSource: "pajek",
        dataSourceConfig: { url: usAirUrl, layout: "recommended" },
        positionScale: 40,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "Pajek", { nodes: 332, edges: 2126 }, 40, {
            // 2 "Deadhorse" 0.4830 0.1014 0.5000
            "2": [0.483, -0.1014, 0],
            "332": [0.1473, -0.6288, 0],
        });
    },
};

// Pajek in 3D: A97.NET from Batagelj's Pajek examples (CC BY-NC-SA 2.5). z is centered on 0.5 and
// turned with y, so the drawing is rotated, never mirrored.
export const Pajek3D: Story = {
    args: {
        dataSource: "pajek",
        dataSourceConfig: { url: a97Url, layout: "recommended" },
        positionScale: 15,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "Pajek3D", { nodes: 84, edges: 332 }, 15, {
            // 1 "1" 0.8464 0.8341 0.1164
            "1": [0.8464, -0.8341, 0.3836],
            "2": [0.7463, -0.3394, -0.3077],
        });
    },
};

// DOT laid out by Graphviz (the root graph has bb, so points, y up): pydot's parsing_test.dot (MIT)
export const DOT: Story = {
    args: {
        dataSource: "dot",
        dataSourceConfig: { url: dotUrl, layout: "recommended" },
        positionScale: 0.025,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "DOT", { nodes: 11, edges: 30 }, 0.025, {
            // 1 [pos="99,162"]
            "1": [99, 162, 0],
            "11": [243, 18, 0],
        });
    },
};

// GEXF saved by Gephi (viz:position, y up): Les Miserables from graphology's tests (MIT)
export const GEXF: Story = {
    args: {
        dataSource: "gexf",
        dataSourceConfig: { url: gexfUrl, layout: "recommended" },
        positionScale: 0.025,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "GEXF", { nodes: 77, edges: 254 }, 0.025, {
            // <viz:position x="268.72385" y="91.18155" z="0.0"/>
            "0.0": [268.72385, 91.18155, 0],
            "76.0": [-382.06223, 47.045475, 0],
        });
    },
};

// yEd GraphML (a box's top-left corner, y down, pixels): graph-io's yfiles-sample.graphml (MIT)
export const GraphMLYEd: Story = {
    args: {
        dataSource: "graphml",
        dataSourceConfig: { url: yedUrl, layout: "recommended" },
        positionScale: 0.02,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "GraphMLYEd", { nodes: 4, edges: 4 }, 0.02, {
            // <y:Geometry x="0.0" y="0.0" width="60.0" height="30.0"/>: its center is (30, 15)
            n0: [30, -15, 0],
            n1: [130, -15, 0],
        });
    },
};

// XGMML written by Cytoscape (y down): NGSCheckMate's test.out.xgmml (MIT)
export const XGMML: Story = {
    args: {
        dataSource: "xgmml",
        dataSourceConfig: { url: xgmmlUrl, layout: "recommended" },
        positionScale: 0.15,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "XGMML", { nodes: 3, edges: 2 }, 0.15, {
            // <graphics x="-10" y="-10"/>
            "1": [-10, 10, 0],
            "3": [10, -10, 0],
        });
    },
};

// CX: WikiPathways WP4742, ketogenesis and ketolysis (CC0, NDEx cc593864), cartesianLayout y down
export const CX: Story = {
    args: {
        dataSource: "cx",
        dataSourceConfig: { url: cxUrl, layout: "recommended" },
        positionScale: 0.015,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "CX", { nodes: 58, edges: 48 }, 0.015, {
            // "node":748082,"x":1013.0647554680585,"y":245.38436346058725
            "748082": [1013.0647554680585, -245.38436346058725, 0],
        });
    },
};

// CX2: WikiPathways WP5049 from cytoscape-web's tests (MIT, network CC0)
export const CX2: Story = {
    args: {
        dataSource: "cx2",
        dataSourceConfig: { url: cx2Url, layout: "recommended" },
        positionScale: 0.015,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "CX2", { nodes: 45, edges: 30 }, 0.015, {
            "513879": [431.373463714484, -365.9920745407425, 0],
            "513923": [550.44875, -60.030000000000086, 0],
        });
    },
};

// A Cytoscape session: STELZ.cys from the Cytoscape tutorials (CC0), 1,691 nodes
export const CytoscapeSession: Story = {
    args: {
        dataSource: "cys",
        dataSourceConfig: { url: cysUrl, layout: "recommended" },
        positionScale: 0.02,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "CytoscapeSession", { nodes: 1691, edges: 3360 }, 0.02, {
            "5111": [-1022.9527348976458, 18.794881621385684, 0],
            "62": [-278.7382878761614, -411.8183157052745, 0],
        });
    },
};
