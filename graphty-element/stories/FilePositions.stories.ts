import "../index.ts";
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import cxUrl from "../../graph-io/test/conformance/fixtures/cx/ndex/WP4742-ketogenesis.cx?url";
import cx2Url from "../../graph-io/test/conformance/fixtures/cx2/cytoscape-web/2496d8c5-5c74-11ec-b3be-0ac135e8bacf.valid.cx2?url";
import cysUrl from "../../graph-io/test/conformance/fixtures/cys/tutorials/STELZ.cys?url";
import dotUrl from "../../graph-io/test/conformance/fixtures/dot/pydot/parsing_test.dot?url";
import gexfUrl from "../../graph-io/test/conformance/fixtures/gexf/graphology/les_miserables.gexf?url";
import xgmmlUrl from "../../graph-io/test/conformance/fixtures/xgmml/ngscheckmate/test.out.xgmml?url";
import yedUrl from "../../graph-io/test/corpus/graphml/yfiles-sample.graphml?url";
import gmlUrl from "../../graph-io/test/positions/fixtures/germany50.gml?url";
import pajekUrl from "../../graph-io/test/positions/fixtures/pajek-shapes.net?url";
import pyramidUrl from "../../graph-io/test/positions/fixtures/pyramid-3d.net?url";
import { assertGraphLoaded, assertLayoutPlaced, drawn, holds } from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, waitForGraphSettled } from "./helpers";

/**
 * One real file per format that stores node positions, each loaded with `layout: "recommended"`,
 * so the element picks the `fixed` layout and draws every node where the file put it. Each story
 * checks the layout it picked and a few nodes' coordinates against the file's own numbers, converted
 * by hand: the node's center, y growing upward, times `positionScale`.
 *
 * `positionScale` is set per file. For the DOT, yEd, CX, CX2 and GEXF files it makes the element's
 * default node (1.5 scene units across) stand for the median node the file's own program draws:
 * 1.5 over that median size in the file's unit (`perNode`), so the drawing keeps the reference
 * drawing's proportions instead of crowding its nodes. The others keep a scale at which nodes of
 * size one are neither specks nor overlapping. The camera frames the drawing either way.
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

/**
 * The `positionScale` at which a default node is as wide as the file's median node.
 * @param size - The median node size the file's program draws, in the file's unit.
 * @returns The scale.
 */
const perNode = (size: number): number => 1.5 / size;

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

// The median node each file's program draws (graph-io's styles, the program's own defaults for a
// node the file does not size): Graphviz's 0.75 inch (54 points), the yEd sample's 60 x 30 boxes,
// WP4742's 25-pixel nodes in Cytoscape, WP5049's 61-pixel ones, Gephi's viz:size in Les Miserables.
const DOT_SCALE = perNode(54);
const YED_SCALE = perNode(60);
const CX_SCALE = perNode(25);
const CX2_SCALE = perNode(61);
const GEXF_SCALE = perNode(19.2857);

// GML (y grows downward, as the GML specification says): SNDlib's germany50 network from
// di-unipi-socc/dgLBF (MIT). Flensburg is at y 0, so the north of Germany is drawn at the top.
export const GML: Story = {
    args: {
        dataSource: "gml",
        dataSourceConfig: { url: gmlUrl, layout: "recommended" },
        positionScale: 0.01,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "GML", { nodes: 50, edges: 88 }, 0.01, {
            // "Aachen" graphics [ x 0.0 y 1279.66 ]
            "0": [0, -1279.66, 0],
            // "Muenchen" graphics [ x 1066.83 y 2054.49 ]
            "34": [1066.83, -2054.49, 0],
        });
    },
};

// Pajek: shapes and lines written for this project (MIT). Pajek's y grows downward, and a z of 0.5
// on every vertex is a flat drawing.
export const Pajek: Story = {
    args: {
        dataSource: "pajek",
        dataSourceConfig: { url: pajekUrl, layout: "recommended" },
        positionScale: 10,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "Pajek", { nodes: 6, edges: 5 }, 10, {
            // 1 "ring" 0.10 0.20 0.5
            "1": [0.1, -0.2, 0],
            // 6 "hidden" 0.20 0.90 0.5
            "6": [0.2, -0.9, 0],
        });
    },
};

// Pajek in 3D: a pyramid with a tail, written for this project (MIT). z is centered on 0.5 and
// turned with y, so the drawing is rotated, never mirrored.
export const Pajek3D: Story = {
    args: {
        dataSource: "pajek",
        dataSourceConfig: { url: pyramidUrl, layout: "recommended" },
        positionScale: 10,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "Pajek3D", { nodes: 6, edges: 9 }, 10, {
            // 1 "base-a" 0.20 0.80 0.20
            "1": [0.2, -0.8, 0.3],
            // 6 "tail" 0.95 0.10 0.95
            "6": [0.95, -0.1, -0.45],
        });
    },
};

// DOT laid out by Graphviz (the root graph has bb, so points, y up): pydot's parsing_test.dot (MIT)
export const DOT: Story = {
    args: {
        dataSource: "dot",
        dataSourceConfig: { url: dotUrl, layout: "recommended" },
        positionScale: DOT_SCALE,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "DOT", { nodes: 11, edges: 30 }, DOT_SCALE, {
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
        positionScale: GEXF_SCALE,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "GEXF", { nodes: 77, edges: 254 }, GEXF_SCALE, {
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
        positionScale: YED_SCALE,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "GraphMLYEd", { nodes: 4, edges: 4 }, YED_SCALE, {
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
        positionScale: CX_SCALE,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "CX", { nodes: 58, edges: 48 }, CX_SCALE, {
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
        positionScale: CX2_SCALE,
    },
    play: async ({ canvasElement }) => {
        await atFilePositions(canvasElement, "CX2", { nodes: 45, edges: 30 }, CX2_SCALE, {
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
