// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    assertDistinctPicture,
    assertDrawnColour,
    assertDrawnOpacity,
    assertDrawnShape,
    assertGraphLoaded,
    assertLabelsDrawn,
    assertNoLabelsDrawn,
    assertShapeVariety,
    assertWireframes,
    type Drawn,
    drawn,
    holds,
} from "./assertions";
import { catSocialNetwork2Url } from "./datasets";
import {
    eventWaitingDecorator,
    nodeShapes,
    renderFn,
    type StoryArgs,
    storySetup,
    waitForGraphSettled,
} from "./helpers";

const meta: Meta = {
    title: "Styles/Node",
    component: "graphty-element",
    // XXX: https://github.com/storybookjs/storybook/issues/23343
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        nodeColor: { control: "color", table: { category: "Colour" }, name: "node.color" },
        nodeShape: { control: "select", options: nodeShapes, table: { category: "Shape" }, name: "node.shape" },
        nodeSize: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Shape" },
            name: "node.size",
        },
        nodeWireframe: { control: "boolean", table: { category: "Effect" }, name: "node.wireframe" },
        nodeLabel: { control: "text", table: { category: "Label" }, name: "node.label" },
        nodeOpacity: {
            control: { type: "range", min: 0.1, max: 1, step: 0.1 },
            table: { category: "Colour" },
            name: "node.opacity",
        },
    },
    parameters: {
        // controls: {exclude: /^(#|_)/},
        controls: {
            include: ["node.color", "node.shape", "node.size", "node.wireframe", "node.label"],
        },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete (30 frames at 60fps)
        },
    },
    args: {
        setup: storySetup({
            preSteps: 8000, // Extra preSteps for ngraph physics layout
        }),
        dataSource: "json",
        dataSourceConfig: {
            data: catSocialNetwork2Url,
        },
        layout: "ngraph",
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests
        },
    },
};
export default meta;

/**
 * Wait for the story to settle and read what it drew.
 *
 * The cat social network is twenty nodes and twenty-nine edges, and it is fetched over the
 * network at render time, so the count is also the check that the fetch arrived.
 */
const settled = async (canvasElement: HTMLElement, story: string): Promise<Drawn> => {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Styles/Node ${story}`);

    await assertGraphLoaded(scene, { nodes: 20, edges: 29 });

    return scene;
};

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Default");

        // The element's own appearance, with no layer of the story's own: one shape, one size,
        // one colour, and no label anywhere.
        await assertDrawnColour(scene, "#6366f1");
        await assertDrawnShape(scene, Object.fromEntries(scene.nodes.map((node) => [node.id, "icosphere"])));
        await assertNoLabelsDrawn(scene);
        await assertDistinctPicture(scene, "Styles/Node");
    },
};

export const Color: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Color");

        await assertDrawnColour(scene, "#ff0000");
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            node: { "node.color": "red" },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.color"],
        },
    },
};

export const Shape: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Shape");

        await assertDrawnShape(scene, Object.fromEntries(scene.nodes.map((node) => [node.id, "box"])));
        await assertShapeVariety(scene, 1);
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            node: { "node.shape": "box" },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.shape"],
        },
    },
};

export const Size: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Size");

        // Size is baked into the source mesh rather than written to mesh.scaling, so the reading
        // that says a node got bigger is its drawn bounding box. The element's default icosphere
        // is 0.75 across at size 1, so size 3 is 2.25.
        const wrong = scene.nodes.filter((node) => Math.abs(node.radius - 2.25) > 0.01).map((node) => node.id);

        await holds(
            wrong.length === 0,
            `Styles/Node Size: this story asks for size 3 and ${String(wrong.length)} nodes are drawn at a ` +
                `different size -- first is ${String(scene.nodes[0].radius)}`,
        );

        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({ node: { "node.size": 3 }, preSteps: 8000 }),
    },
    parameters: {
        controls: {
            include: ["node.size"],
        },
    },
};

export const Wireframe: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Wireframe");

        await assertWireframes(
            scene,
            scene.nodes.map((node) => node.id),
        );
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            node: { "node.wireframe": true },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.wireframe"],
        },
    },
};

/**
 * A flat-shaded sphere beside a smooth one. Two large spheres, so the facets are big enough to
 * see: the left one has `node.flat` on and is lit one triangle at a time, the right one is the
 * same sphere with its normals smoothed across the surface. At the size of a node in a busy graph
 * the facets of a sphere are only a few pixels across, so this story draws two nodes, not the cat
 * network the rest of this file uses.
 */
export const Flat: Story = {
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const scene = await drawn(canvasElement, "Styles/Node Flat");

        await assertGraphLoaded(scene, { nodes: 2, edges: 0 });

        const flat = scene.nodes.find((node) => node.id === "flat");
        const smooth = scene.nodes.find((node) => node.id === "smooth");

        await holds(
            flat !== undefined && smooth !== undefined && flat.geometryDigest !== smooth.geometryDigest,
            "Styles/Node Flat: the flat sphere and the smooth sphere are drawn from two different geometries",
        );
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        dataSource: undefined,
        dataSourceConfig: undefined,
        nodeData: [
            { id: "flat", position: { x: -2, y: 0, z: 0 } },
            { id: "smooth", position: { x: 2, y: 0, z: 0 } },
        ],
        edgeData: [],
        layout: "fixed",
        layoutConfig: {},
        setup: storySetup({
            node: { "node.shape": "sphere", "node.size": 3, "node.color": "#f59e0b" },
            layers: [
                {
                    name: "flat sphere",
                    target: "node",
                    selector: { match: "ids", nodes: ["flat"] },
                    set: { "node.flat": true },
                },
            ],
        }),
    },
    parameters: {
        controls: {
            include: [],
        },
    },
};

/**
 * A label on every node, reading each node's own id.
 *
 * `label: {enabled: true}` used to switch labels on and leave the words to the renderer's
 * default. A layer says what a label SAYS: writing `node.label` is what switches one on, and
 * binding it to a column is how the words come from the data.
 */
export const Label: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Label");

        await assertLabelsDrawn(scene);
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.label"],
        },
    },
};

export const Opacity: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Opacity");

        await assertDrawnColour(scene, "#0000ff");
        await assertDrawnOpacity(scene, Object.fromEntries(scene.nodes.map((node) => [node.id, 0.5])));
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            node: { "node.color": "#0000FF", "node.opacity": 0.5 },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.color", "node.opacity"],
        },
    },
};

/**
 * The highlight: the selection's halo, in each node's own shape, drawn on the nodes a layer
 * picks. The box and the left sphere set `node.halo` alone and are drawn in the selection's
 * look; the right sphere sets its own colour, scale and opacity. The middle node has none.
 */
export const Halo: Story = {
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const scene = await drawn(canvasElement, "Styles/Node Halo");

        await assertGraphLoaded(scene, { nodes: 4, edges: 0 });

        const halos = scene.graph.scene.meshes.filter(
            (mesh) => mesh.name.startsWith("graphty-selection-halo") && mesh.isVisible && mesh.isEnabled(),
        );

        await holds(halos.length === 3, "Styles/Node Halo: three of the four nodes are highlighted");
        await holds(
            halos.some((mesh) => mesh.name.toLowerCase().includes("#00bcd4")),
            "Styles/Node Halo: one highlight is drawn in the layer's own colour",
        );
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        dataSource: undefined,
        dataSourceConfig: undefined,
        nodeData: [
            { id: "box", position: { x: -6, y: 0, z: 0 } },
            { id: "plain", position: { x: -2, y: 0, z: 0 } },
            { id: "gold", position: { x: 2, y: 0, z: 0 } },
            { id: "teal", position: { x: 6, y: 0, z: 0 } },
        ],
        edgeData: [],
        layout: "fixed",
        layoutConfig: {},
        setup: storySetup({
            node: { "node.shape": "sphere", "node.size": 2 },
            layers: [
                {
                    name: "a box",
                    target: "node",
                    selector: { match: "ids", nodes: ["box"] },
                    set: { "node.shape": "box" },
                },
                {
                    name: "highlighted in the selection's look",
                    target: "node",
                    selector: { match: "ids", nodes: ["box", "gold"] },
                    set: { "node.halo": true },
                },
                {
                    name: "highlighted in a look of its own",
                    target: "node",
                    selector: { match: "ids", nodes: ["teal"] },
                    set: {
                        "node.haloColor": "#00BCD4",
                        "node.haloScale": 1.8,
                        "node.haloOpacity": 0.6,
                    },
                },
            ],
        }),
    },
    parameters: {
        controls: {
            include: [],
        },
    },
};

/**
 * A picture for each node, chosen from what the element calculates: `node.image` is encoded from
 * `graphty.degree`, so the hub (four edges) draws a wide orange star badge, every leaf (one edge)
 * a round blue person and the node with two edges a tall green server. The three pictures have
 * different proportions, so each is told apart by the box it is contained in.
 */
const svgPicture = (width: number, height: number, body: string): string =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}">${body}</svg>`,
    )}`;
const HUB_PICTURE = svgPicture(
    40,
    20,
    '<rect width="40" height="20" rx="4" fill="#DD6B20"/><path d="M20 2l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.5-4 6-.6z" fill="#fff"/>',
);
const LEAF_PICTURE = svgPicture(
    20,
    20,
    '<circle cx="10" cy="10" r="10" fill="#3182CE"/><circle cx="10" cy="7" r="3.5" fill="#fff"/><path d="M3.5 17a6.5 5 0 0 1 13 0z" fill="#fff"/>',
);
const MID_PICTURE = svgPicture(
    20,
    40,
    '<rect width="20" height="40" rx="3" fill="#38A169"/><rect x="4" y="6" width="12" height="4" fill="#fff"/><rect x="4" y="18" width="12" height="4" fill="#fff"/><rect x="4" y="30" width="12" height="4" fill="#fff"/>',
);

export const ImageByDegree: Story = {
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const scene = await drawn(canvasElement, "Styles/Node ImageByDegree");

        await assertGraphLoaded(scene, { nodes: 6, edges: 5 });

        // width over height of the box each node's picture is contained in
        const proportions = Object.fromEntries(
            scene.nodes.map(({ id }) => {
                const [piece] = scene.graph.getDataManager().nodes.get(id)?.decorationPieces ?? [];
                return [
                    id,
                    piece?.kind === "image" ? (piece.box.x1 - piece.box.x0) / (piece.box.y1 - piece.box.y0) : 0,
                ];
            }),
        );
        const expected: Record<string, number> = { hub: 2, a: 1, b: 1, d: 1, e: 1, c: 0.5 };
        for (const [id, ratio] of Object.entries(expected)) {
            await holds(
                Math.abs((proportions[id] ?? 0) - ratio) < 0.01,
                `Styles/Node ImageByDegree: node ${id} draws the picture for its degree (${JSON.stringify(proportions)})`,
            );
        }
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        dataSource: undefined,
        dataSourceConfig: undefined,
        nodeData: [
            { id: "hub", position: { x: 0, y: 0, z: 0 } },
            { id: "a", position: { x: -6, y: 4, z: 0 } },
            { id: "b", position: { x: 6, y: 4, z: 0 } },
            { id: "c", position: { x: 6, y: -4, z: 0 } },
            { id: "d", position: { x: -6, y: -4, z: 0 } },
            { id: "e", position: { x: 12, y: -4, z: 0 } },
        ],
        edgeData: [
            { source: "hub", target: "a" },
            { source: "hub", target: "b" },
            { source: "hub", target: "c" },
            { source: "hub", target: "d" },
            { source: "c", target: "e" },
        ],
        layout: "fixed",
        layoutConfig: {},
        setup: storySetup({
            viewMode: "2d",
            node: { "node.shape": "none", "node.width": 3, "node.height": 3 },
            layers: [
                {
                    name: "a picture by degree",
                    target: "node",
                    selector: { match: "everything" },
                    encode: {
                        "node.image": {
                            by: "graphty.degree",
                            scale: "passthrough",
                            map: { "4": HUB_PICTURE, "1": LEAF_PICTURE },
                            otherwise: MID_PICTURE,
                        },
                    },
                },
            ],
        }),
    },
    parameters: {
        controls: {
            include: [],
        },
    },
};
