/**
 * How graphty-element lights its 3D nodes, and how a consumer picks a different look.
 *
 * Lighting is a setting of the element, not a style channel: one value for the whole view, set
 * with the `lighting` attribute or property. It changes how every node's style colour is shaded,
 * never the colour itself, and 2D view is always drawn flat whatever it says.
 *
 * Every story draws the same sixteen nodes -- four shapes in four colours, a light one and a dark
 * one among them -- so the pictures differ only in the lighting.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { LayerSpec } from "../src/catalog/types";
import { type Lighting, LIGHTING_VALUES } from "../src/config/Lighting";
// Only the type is named; ./assertions and ./helpers import the module that defines the tag.
import type { Graphty } from "../src/graphty-element";
import {
    assertGraphLoaded,
    assertShapeVariety,
    type Drawn,
    drawn,
    holds,
    pixelsOfColour,
    renderedElement,
} from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "./helpers";

/** The four shapes, one per row: round, flat-faced, a cylinder and a ring. */
const SHAPES = ["sphere", "box", "cylinder", "torus"] as const;

/** The four colours, one per column: a strong red, a light yellow, a mid blue and a dark slate. */
const COLORS = { red: "#e53935", yellow: "#fdd835", blue: "#1e88e5", slate: "#37474f" } as const;

/** Space between two nodes in the grid, in scene units. */
const SPACING = 3;

/**
 * One node per shape and colour, laid out as a grid facing the camera.
 * @returns The sixteen nodes, each carrying its shape, its colour and a fixed position.
 */
function gridNodes(): { id: string; shape: string; color: string; position: { x: number; y: number; z: number } }[] {
    const colorNames = Object.keys(COLORS);

    return SHAPES.flatMap((shape, row) =>
        colorNames.map((color, col) => ({
            id: `${shape}-${color}`,
            shape,
            color,
            position: { x: (col - 1.5) * SPACING, y: (1.5 - row) * SPACING, z: 0 },
        })),
    );
}

/**
 * One layer per colour and one per shape, each naming the nodes whose data says so.
 * @returns The layers, colours first.
 */
function gridLayers(): LayerSpec[] {
    const byColor = Object.entries(COLORS).map(([name, hex]) => ({
        name: `Color - ${name}`,
        target: "node" as const,
        selector: { match: "expression" as const, where: `data.color == '${name}'` },
        set: { "node.color": hex },
    }));
    const byShape = SHAPES.map((shape) => ({
        name: `Shape - ${shape}`,
        target: "node" as const,
        selector: { match: "expression" as const, where: `data.shape == '${shape}'` },
        set: { "node.shape": shape, "node.size": 1.6 },
    }));

    return [...byColor, ...byShape];
}

/** The story's args: the usual ones, plus the lighting to draw with. */
type LightingArgs = StoryArgs & { lighting: Lighting };

const meta: Meta<LightingArgs> = {
    title: "Styles/Lighting",
    component: "graphty-element",
    render: (args, context) => {
        const element = renderFn(args, context) as Graphty;

        element.lighting = args.lighting;

        return element;
    },
    decorators: [eventWaitingDecorator],
    argTypes: {
        lighting: { control: "select", options: LIGHTING_VALUES, name: "lighting" },
    },
    parameters: {
        controls: { include: ["lighting"] },
        chromatic: { delay: 500 },
    },
    args: {
        lighting: "studio",
        setup: storySetup({ viewMode: "3d", layers: gridLayers() }),
        nodeData: gridNodes(),
        edgeData: [],
        layout: "fixed",
        layoutConfig: {},
    },
};
export default meta;

type Story = StoryObj<LightingArgs>;

/**
 * Wait for the story to settle, check the grid is drawn, and check the element reports the
 * lighting the story asked for.
 * @param canvasElement - Where the story rendered.
 * @param story - The story's name, for the failure message.
 * @param want - The lighting the story sets.
 * @returns The scene.
 */
async function lit(canvasElement: HTMLElement, story: string, want: Lighting): Promise<Drawn> {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Styles/Lighting ${story}`);
    await assertGraphLoaded(scene, { nodes: SHAPES.length * Object.keys(COLORS).length, edges: 0 });
    await assertShapeVariety(scene, SHAPES.length);

    const element = await renderedElement(canvasElement, `Styles/Lighting ${story}: no <graphty-element> rendered`);
    await holds(
        element.lighting === want && scene.graph.getLighting() === want,
        `Styles/Lighting ${story}: the story asks for "${want}" lighting and the element reports ` +
            `"${element.lighting}"`,
    );

    return scene;
}

/**
 * Sixteen nodes under the lighting every graph starts with. Pick another value in the `lighting`
 * control to switch modes, and drag the canvas to orbit and see how each mode shades the shapes.
 *
 * ```html
 * <graphty-element lighting="studio"></graphty-element>
 * ```
 */
export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "Four shapes in four colors under the default lighting. Use the `lighting` control to switch " +
                    "between `studio`, `headlight`, `matte` and `flat`, and drag the canvas to orbit. Set it on " +
                    'the element with the attribute (`<graphty-element lighting="matte">`) or the property ' +
                    '(`element.lighting = "matte"`).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await lit(canvasElement, "Default", "studio");
    },
};

/**
 * Studio, the default: a key light from above the camera, a soft fill, and a rim in each node's
 * own colour. Shapes read with depth, and no colour is washed out to white.
 *
 * ```typescript
 * element.lighting = "studio"; // or leave it unset
 * ```
 */
export const Studio: Story = {
    args: { lighting: "studio" },
    parameters: {
        docs: {
            description: {
                story:
                    "The default 3D look: a key light, a soft fill and a rim in each node's own color, so round " +
                    "shapes read as round and nothing is washed out to white. It is what every graph starts " +
                    'with; to set it explicitly, `<graphty-element lighting="studio">` or `element.lighting = ' +
                    '"studio"`.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await lit(canvasElement, "Studio", "studio");
    },
};

/**
 * Headlight: one light from beside the camera plus a soft fill. A face is never drawn brighter
 * than its style colour.
 *
 * ```typescript
 * element.lighting = "headlight";
 * ```
 */
export const Headlight: Story = {
    args: { lighting: "headlight" },
    parameters: {
        docs: {
            description: {
                story:
                    "One light from beside the camera and a soft fill. A face is never brighter than its style " +
                    "color, so light colors stay true while the shapes still read in 3D. " +
                    '`<graphty-element lighting="headlight">` or `element.lighting = "headlight"`.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await lit(canvasElement, "Headlight", "headlight");
    },
};

/**
 * Matte: one soft light from above and no highlight. Even shading; a lit face is at most the
 * style colour.
 *
 * ```typescript
 * element.lighting = "matte";
 * ```
 */
export const Matte: Story = {
    args: { lighting: "matte" },
    parameters: {
        docs: {
            description: {
                story:
                    "One soft light from above and no highlight: even shading, with a lit face exactly its style " +
                    "color at most. Shapes read flatter and a little darker than `studio`. " +
                    '`<graphty-element lighting="matte">` or `element.lighting = "matte"`.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await lit(canvasElement, "Matte", "matte");
    },
};

/**
 * Flat: no lighting. Every pixel of a node is exactly its style colour, with a thin dark outline
 * so overlapping nodes stay apart -- for colour-coded analysis, where a reader matches a node's
 * colour against a legend.
 *
 * ```typescript
 * element.lighting = "flat";
 * ```
 */
export const Unlit: Story = {
    // Exported as Unlit, shown as Flat: "flat" is also the word for the node.flat style channel
    // (flat-shaded facets), which this story does not set, so the story id must not claim it.
    name: "Flat",
    args: { lighting: "flat" },
    parameters: {
        docs: {
            description: {
                story:
                    "No lighting: every pixel of a node is exactly its style color, with a thin dark outline so " +
                    "overlapping nodes stay apart. Use it for color-coded analysis, where a reader matches a " +
                    'node\'s color against a legend. `<graphty-element lighting="flat">` or ' +
                    '`element.lighting = "flat"`.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await lit(canvasElement, "Unlit", "flat");

        // Unlit means the exact style colour, so a tight window around each one finds it on screen.
        for (const [name, hex] of Object.entries(COLORS)) {
            const count = await pixelsOfColour(scene, hex, 4);

            await holds(
                count > 0,
                `Styles/Lighting Unlit: no pixel is drawn in the ${name} style color ${hex} under flat lighting`,
            );
        }
    },
};
