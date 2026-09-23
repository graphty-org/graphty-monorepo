// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    assertArrowCapsDrawn,
    assertDistinctPicture,
    assertDrawnColour,
    assertDrawnOpacity,
    assertDrawnShape,
    assertEdgeVariety,
    assertGraphLoaded,
    assertGroupsDrawnDifferently,
    assertLabelsDrawn,
    assertLayerPainted,
    assertWireframes,
    canvasArea,
    drawn,
    holds,
    pixelsOfColour,
} from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

// Simple test data: 5 nodes, 6 edges - positioned close together in 3D space
const simpleNodeData = [
    { id: "A", type: "primary", position: { x: 0, y: 2, z: 0 } },
    { id: "B", type: "secondary", position: { x: -2, y: 0, z: 0 } },
    { id: "C", type: "primary", position: { x: 2, y: 0, z: 0 } },
    { id: "D", type: "secondary", position: { x: 0, y: -2, z: 0 } },
    { id: "E", type: "tertiary", position: { x: 0, y: 0, z: 2 } },
];

/**
 * Six weighted edges, each carrying a copy of its own source id.
 *
 * `origin` IS A WORKAROUND AND SHOULD NOT BE NEEDED. A layer selects edges with a JMESPath
 * expression over `data.*`, and `data.*` reaches the attribute columns the importer kept -- which
 * are the record's own fields MINUS its two endpoints. `src` and `dst` are consumed as structure
 * and published as nothing, so `data.src == 'A'`, `data.source == 'A'` and even
 * `has data.source` all match zero edges, and the stack reports no problem while they do it.
 * This column exists so the layer below has something it is allowed to read. See the handover
 * note: a style layer cannot select an edge by either of its endpoints.
 */
const simpleEdgeData = [
    { src: "A", dst: "B", weight: 1, origin: "A" },
    { src: "A", dst: "C", weight: 2, origin: "A" },
    { src: "B", dst: "D", weight: 1, origin: "B" },
    { src: "C", dst: "D", weight: 2, origin: "C" },
    { src: "D", dst: "E", weight: 1, origin: "D" },
    { src: "E", dst: "A", weight: 2, origin: "E" },
];

const meta: Meta = {
    title: "Styles/Layered",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        chromatic: {
            delay: 500,
        },
    },
    args: {
        nodeData: simpleNodeData,
        edgeData: simpleEdgeData,
        layout: "fixed",
        layoutConfig: {
            dim: 3,
        },
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Two layers setting different node colors based on node type.
 * Layer 1: primary nodes -> red
 * Layer 2: secondary nodes -> blue
 */
export const TwoLayerNodeColors: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered TwoLayerNodeColors");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "nodes where data.type == 'primary'", { nodes: 2 });
        await assertLayerPainted(scene, "nodes where data.type == 'secondary'", { nodes: 2 });
        await assertDrawnColour(scene, { A: "#ff0000", C: "#ff0000", B: "#0000ff", D: "#0000ff", E: "#6366f1" });
        await assertGroupsDrawnDifferently(scene, "hex", {
            primary: ["A", "C"],
            secondary: ["B", "D"],
            untouched: ["E"],
        });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red" },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "blue" },
                },
            ],
        }),
    },
};

/**
 * Two layers: one sets shape, another sets color.
 * Layer 1: primary nodes -> box shape
 * Layer 2: secondary nodes -> green color
 */
export const ShapeAndColorLayers: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered ShapeAndColorLayers");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "nodes where data.type == 'primary'", { nodes: 2 });
        await assertLayerPainted(scene, "nodes where data.type == 'secondary'", { nodes: 2 });
        await assertDrawnShape(scene, { A: "box", C: "box", B: "icosphere", D: "icosphere", E: "icosphere" });
        await assertDrawnColour(scene, { B: "#008000", D: "#008000", A: "#6366f1", C: "#6366f1", E: "#6366f1" });
        await assertGroupsDrawnDifferently(scene, "geometryKey", { boxes: ["A", "C"], greenSpheres: ["B", "D"] });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.shape": "box" },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "green" },
                },
            ],
        }),
    },
};

/**
 * Three layers setting different node sizes.
 * Layer 1: node A -> large (size 2)
 * Layer 2: node B and C -> medium (size 1.5)
 * Layer 3: node E -> small (size 0.5)
 */
export const ThreeLayerSizes: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered ThreeLayerSizes");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "nodes where data.id == 'A'", { nodes: 1 });
        await assertLayerPainted(scene, "nodes where data.id == 'B' || data.id == 'C'", { nodes: 2 });
        await assertLayerPainted(scene, "nodes where data.id == 'E'", { nodes: 1 });
        await assertGroupsDrawnDifferently(scene, "radius", {
            "size 2": ["A"],
            "size 1.5": ["B", "C"],
            "size 0.5": ["E"],
            untouched: ["D"],
        });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.id == 'A'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'A'" },
                    set: { "node.size": 2 },
                },
                {
                    name: "nodes where data.id == 'B' || data.id == 'C'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'B' || data.id == 'C'" },
                    set: { "node.size": 1.5 },
                },
                {
                    name: "nodes where data.id == 'E'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'E'" },
                    set: { "node.size": 0.5 },
                },
            ],
        }),
    },
};

/**
 * Two layers setting different edge widths based on weight.
 * Layer 1: weight == 1 -> thin (0.1)
 * Layer 2: weight == 2 -> thick (0.5)
 */
export const EdgeWidthLayers: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered EdgeWidthLayers");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "edges where data.weight == `1`", { edges: 3 });
        await assertLayerPainted(scene, "edges where data.weight == `2`", { edges: 3 });
        await assertEdgeVariety(scene, 2);
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "edges where data.weight == `1`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `1`" },
                    set: { "edge.width": 0.1 },
                },
                {
                    name: "edges where data.weight == `2`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `2`" },
                    set: { "edge.width": 0.5 },
                },
            ],
        }),
    },
};

/**
 * Three layers setting different arrow head types.
 * Layer 1: weight == 1 -> sphere-dot arrows
 * Layer 2: weight == 2 -> diamond arrows
 * Layer 3: all edges -> normal yellow arrows at size 1, over both layers beneath it
 */
export const ArrowHeadStyles: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered ArrowHeadStyles");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "edges where data.weight == `1`", { edges: 3 });
        await assertLayerPainted(scene, "edges where data.weight == `2`", { edges: 3 });
        // The top layer paints every edge, and a layer later in the stack wins every channel it writes,
        // so all six edges end up with the normal cap -- not the sphere-dot and diamond beneath it.
        await assertLayerPainted(scene, "every edge", { edges: 6 });
        await assertArrowCapsDrawn(scene, ["filled-triangle-arrow"]);

        // THE CAPS ARE YELLOW. A cap's colour is a shader uniform, on neither the mesh nor its name,
        // so it is counted in pixels. Measured on a 1168x584 canvas: 5111 yellow pixels (0.75% of
        // the canvas) with the top layer's colour, none without it.
        const yellow = await pixelsOfColour(scene, "#ffff00");

        await holds(
            yellow > canvasArea(scene) * 0.002,
            `Styles/Layered ArrowHeadStyles: the top layer paints every cap yellow and the canvas holds ` +
                `${String(yellow)} yellow pixels`,
        );
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "edges where data.weight == `1`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `1`" },
                    set: { "edge.arrowHead": "sphere-dot", "edge.arrowHeadSize": 1.5, "edge.arrowHeadColor": "white" },
                },
                {
                    name: "edges where data.weight == `2`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `2`" },
                    set: { "edge.arrowHead": "diamond", "edge.arrowHeadSize": 1.5, "edge.arrowHeadColor": "white" },
                },
                {
                    name: "every edge",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.arrowHead": "normal", "edge.arrowHeadSize": 1, "edge.arrowHeadColor": "yellow" },
                },
            ],
        }),
    },
};

/**
 * Four layers combining node shape, size, and color.
 * Layer 1: primary -> red
 * Layer 2: secondary -> blue
 * Layer 3: tertiary -> yellow + cylinder shape
 * Layer 4: node A -> extra large
 */
export const MixedNodeProperties: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered MixedNodeProperties");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "nodes where data.type == 'tertiary'", { nodes: 1 });
        await assertLayerPainted(scene, "nodes where data.id == 'A'", { nodes: 1 });
        await assertDrawnColour(scene, { A: "#ff0000", C: "#ff0000", B: "#0000ff", D: "#0000ff", E: "#ffff00" });
        await assertDrawnShape(scene, { E: "cylinder" });
        await assertGroupsDrawnDifferently(scene, "radius", { "the big one": ["A"], "the rest": ["B", "C", "D"] });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red" },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "blue" },
                },
                {
                    name: "nodes where data.type == 'tertiary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'tertiary'" },
                    set: { "node.color": "yellow", "node.shape": "cylinder" },
                },
                {
                    name: "nodes where data.id == 'A'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'A'" },
                    set: { "node.size": 2.5 },
                },
            ],
        }),
    },
};

/**
 * Two layers setting edge colors based on weight.
 * Layer 1: weight == 1 -> green edges
 * Layer 2: weight == 2 -> red edges
 */
export const EdgeColorVariations: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered EdgeColorVariations");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "edges where data.weight == `1`", { edges: 3 });
        await assertLayerPainted(scene, "edges where data.weight == `2`", { edges: 3 });
        await assertEdgeVariety(scene, 2);
        await assertArrowCapsDrawn(scene, ["filled-triangle-arrow"]);
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "edges where data.weight == `1`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `1`" },
                    set: { "edge.color": "green", "edge.arrowHead": "normal" },
                },
                {
                    name: "edges where data.weight == `2`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `2`" },
                    set: { "edge.color": "red", "edge.arrowHead": "normal" },
                },
            ],
        }),
    },
};

/**
 * Three layers setting different opacity levels.
 * Layer 1: node A -> 30% opacity
 * Layer 2: nodes B and C -> 60% opacity
 * Layer 3: nodes D and E -> 90% opacity
 */
export const OpacityLayers: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered OpacityLayers");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertDrawnColour(scene, { A: "#ff0000", B: "#00ff00", C: "#00ff00", D: "#0000ff", E: "#0000ff" });
        await assertDrawnOpacity(scene, { A: 0.3, B: 0.6, C: 0.6, D: 0.9, E: 0.9 });
        await assertGroupsDrawnDifferently(scene, "opacity", { faint: ["A"], middling: ["B", "C"], solid: ["D", "E"] });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.id == 'A'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'A'" },
                    set: { "node.color": "#FF0000", "node.opacity": 0.3 },
                },
                {
                    name: "nodes where data.id == 'B' || data.id == 'C'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'B' || data.id == 'C'" },
                    set: { "node.color": "#00FF00", "node.opacity": 0.6 },
                },
                {
                    name: "nodes where data.id == 'D' || data.id == 'E'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'D' || data.id == 'E'" },
                    set: { "node.color": "#0000FF", "node.opacity": 0.9 },
                },
            ],
        }),
    },
};

/**
 * Two layers with wireframe effect on some nodes.
 * Layer 1: primary nodes -> wireframe enabled + red
 * Layer 2: secondary nodes -> solid blue
 */
export const WireframeEffectLayers: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered WireframeEffectLayers");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertWireframes(scene, ["A", "C"]);
        await assertDrawnColour(scene, { A: "#ff0000", C: "#ff0000", B: "#0000ff", D: "#0000ff" });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red", "node.wireframe": true },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "blue" },
                },
            ],
        }),
    },
};

/**
 * Complex multi-property layers testing precedence.
 * Layer 1: All nodes -> green, size 1
 * Layer 2: primary -> red (overrides green)
 * Layer 3: node A -> box shape + size 2 (overrides size 1)
 * Layer 4: secondary -> sphere shape
 */
export const ComplexMultiProperty: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered ComplexMultiProperty");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "every node", { nodes: 5 });
        await assertDrawnShape(scene, { A: "box", B: "sphere", D: "sphere", C: "icosphere", E: "icosphere" });
        await assertDrawnColour(scene, { A: "#ff0000", C: "#ff0000", B: "#008000", D: "#008000", E: "#008000" });
        await assertGroupsDrawnDifferently(scene, "radius", {
            "A is size 2": ["A"],
            "everything else is size 1": ["C", "E"],
        });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "every node",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.color": "green", "node.size": 1 },
                },
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red" },
                },
                {
                    name: "nodes where data.id == 'A'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'A'" },
                    set: { "node.shape": "box", "node.size": 2 },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.shape": "sphere" },
                },
            ],
        }),
    },
};

/**
 * Two layers enabling labels on specific nodes.
 * Layer 1: primary nodes -> labels enabled showing node ID
 * Layer 2: node E -> label enabled showing "E" in RED color
 */
export const LabelEnabledLayers: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered LabelEnabledLayers");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "nodes where data.type == 'primary'", { nodes: 2 });
        await assertLayerPainted(scene, "nodes where data.id == 'E'", { nodes: 1 });
        await assertLabelsDrawn(scene, { ids: ["A", "C", "E"] });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    encode: { "node.label": { by: "data.id", scale: "passthrough" } },
                },
                {
                    name: "nodes where data.id == 'E'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'E'" },
                    set: { "node.labelStyle": { color: "red" } },
                    encode: { "node.label": { by: "data.id", scale: "passthrough" } },
                },
            ],
        }),
    },
};

/**
 * Three layers, the first two sizing an arrow by the weight of the edge it caps.
 *
 * Light edges get a small white cap, heavy ones a large white cap, and a third layer paints the
 * edges leaving A purple with a cap of the element's own size 1, over whichever size was beneath
 * it. So three sizes are on screen: 0.5 and 2 on the four edges that do not leave A, and 1 on the
 * two that do.
 */
export const ArrowSizeVariations: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered ArrowSizeVariations");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertLayerPainted(scene, "edges where data.origin == 'A'", { edges: 2 });
        await assertArrowCapsDrawn(scene, ["filled-triangle-arrow"]);
        await assertEdgeVariety(scene, 2);

        // THREE SIZES ON SCREEN, measured off the caps themselves: an arrow's size is geometry and
        // the mesh's name carries only its shape, so nothing else in the scene can see it. Measured:
        // 0.466, 0.933 and 1.865 across. Without the top layer's size the edges leaving A keep 0.5
        // and 2 and only two sizes are drawn.
        const spans = scene.graph.scene.meshes
            .filter((mesh) => mesh.name.includes("arrow"))
            .map((mesh) => mesh.getBoundingInfo().boundingBox.extendSizeWorld.length())
            .sort((first, second) => second - first);
        const sizes = new Set(spans.map((span) => span.toFixed(2)));

        await holds(
            sizes.size === 3 && spans[0] > spans[spans.length - 1] * 2,
            `Styles/Layered ArrowSizeVariations: the layers ask for caps at 0.5, 1 and 2 and the scene ` +
                `draws them ${spans.map((span) => span.toFixed(3)).join(", ")} across`,
        );

        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "edges where data.weight == `1`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `1`" },
                    set: { "edge.arrowHead": "normal", "edge.arrowHeadSize": 0.5, "edge.arrowHeadColor": "white" },
                },
                {
                    name: "edges where data.weight == `2`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `2`" },
                    set: { "edge.arrowHead": "normal", "edge.arrowHeadSize": 2, "edge.arrowHeadColor": "white" },
                },
                {
                    name: "edges where data.origin == 'A'",
                    target: "edge",
                    selector: { match: "expression", where: "data.origin == 'A'" },
                    set: {
                        "edge.color": "purple",
                        "edge.arrowHead": "normal",
                        "edge.arrowHeadSize": 1,
                        "edge.arrowHeadColor": "purple",
                    },
                },
            ],
        }),
    },
};

/**
 * Two layers combining node shapes with multiple properties.
 * Layer 1: primary -> tetrahedron + red
 * Layer 2: secondary -> octahedron + blue
 */
export const ShapeVariationsWithColor: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered ShapeVariationsWithColor");
        await assertGraphLoaded(scene, { nodes: 5, edges: 6 });
        await assertDrawnColour(scene, { A: "#ff0000", C: "#ff0000", B: "#0000ff", D: "#0000ff", E: "#6366f1" });
        // Every polyhedron is built by one MeshBuilder call and named "polyhedron", so a tetrahedron and
        // an octahedron are told apart by the source mesh they are instanced from, not by its name.
        await assertGroupsDrawnDifferently(scene, "geometryKey", {
            tetrahedra: ["A", "C"],
            octahedra: ["B", "D"],
            untouched: ["E"],
        });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red", "node.shape": "tetrahedron" },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "blue", "node.shape": "octahedron" },
                },
            ],
        }),
    },
};

/**
 * Axis-aligned colored spheres demonstrating 3D coordinate system.
 * This is useful for debugging 3D positioning and camera angles.
 * - Origin (0,0,0): Tiny black sphere
 * - X-axis (5,0,0): Large red sphere
 * - Y-axis (0,5,0): Large green sphere
 * - Z-axis (0,0,5): Large blue sphere
 *
 * Edges connect origin to each axis node.
 * Colors match BabylonJS AxesViewer convention (Red=X, Green=Y, Blue=Z).
 */
export const AxisAlignedColoredSpheres: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Layered AxisAlignedColoredSpheres");
        await assertGraphLoaded(scene, { nodes: 4, edges: 3 });
        await assertDrawnColour(scene, {
            origin: "#000000",
            "x-axis": "#ff0000",
            "y-axis": "#008000",
            "z-axis": "#0000ff",
        });
        await assertGroupsDrawnDifferently(scene, "radius", {
            "the small origin": ["origin"],
            "the three axis markers": ["x-axis", "y-axis", "z-axis"],
        });
        await assertDistinctPicture(scene, "Styles/Layered");
    },
    args: {
        nodeData: [
            { id: "origin", position: { x: 0, y: 0, z: 0 } },
            { id: "x-axis", position: { x: 5, y: 0, z: 0 } },
            { id: "y-axis", position: { x: 0, y: 5, z: 0 } },
            { id: "z-axis", position: { x: 0, y: 0, z: 5 } },
        ],
        edgeData: [
            { src: "origin", dst: "x-axis" },
            { src: "origin", dst: "y-axis" },
            { src: "origin", dst: "z-axis" },
        ],
        layout: "fixed",
        layoutConfig: {
            dim: 3,
        },
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.id == 'origin'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'origin'" },
                    set: { "node.color": "black", "node.size": 0.5 },
                },
                {
                    name: "nodes where data.id == 'x-axis'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'x-axis'" },
                    set: { "node.color": "red", "node.size": 1.5 },
                },
                {
                    name: "nodes where data.id == 'y-axis'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'y-axis'" },
                    set: { "node.color": "green", "node.size": 1.5 },
                },
                {
                    name: "nodes where data.id == 'z-axis'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'z-axis'" },
                    set: { "node.color": "blue", "node.size": 1.5 },
                },
            ],
        }),
    },
};
