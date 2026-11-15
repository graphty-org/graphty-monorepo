/**
 * How graphty-element lights its 3D nodes, and how a consumer picks a different look.
 *
 * Lighting is a setting of the element, not a style channel: one value for the whole view, set
 * with the `lighting` attribute or property. It changes how every node's style colour is shaded,
 * never the colour itself, and 2D view is always drawn flat whatever it says.
 *
 * Every story draws the same sixteen nodes -- four shapes in four colours, a light one and a dark
 * one among them -- so the pictures differ only in the lighting. The grid is tilted back 45
 * degrees, so it is seen face-on from none of the fixed angles and edge-on from none of them.
 *
 * Default is the interactive one: a `lighting` control, and the reader orbits. Every other story is
 * one mode seen from one fixed camera position -- front, back, top, bottom and two oblique angles
 * -- because a lighting that only looks right from the front is broken, and a fixed camera is what
 * lets a screenshot catch it from every side. One element per story, because several elements on
 * one page do not yet draw every shape (see the note on `fixedView`).
 */
import type { Decorator, Meta, StoryObj } from "@storybook/web-components-vite";

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
    pixelsOfColours,
    renderedElement,
} from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "./helpers";

/** The four shapes, one per row: round, flat-faced, a cylinder and a ring. */
const SHAPES = ["sphere", "box", "cylinder", "torus"] as const;

/** The four colours, one per column: a strong red, a light yellow, a mid blue and a dark slate. */
const COLORS = { red: "#e53935", yellow: "#fdd835", blue: "#1e88e5", slate: "#37474f" } as const;

/** Space between two nodes in the grid, in scene units. */
const SPACING = 4;

/** How the grid's rows lean back: each row is as far behind the one below it as it is above it. */
const TILT = Math.SQRT1_2;

/** How far each fixed view's camera stands from the middle of the grid, in scene units. */
const VIEW_DISTANCE = 24;

/**
 * The fixed camera positions every mode story is drawn from, each a direction from the middle of
 * the grid. The element's own camera starts on -z looking toward +z, so that is the front. The
 * overhead and bottom views lean a hair toward the front so the camera never looks exactly along its own up.
 */
const VIEWS = {
    Front: { name: "the front", from: { x: 0, y: 0, z: -1 } },
    Back: { name: "the back", from: { x: 0, y: 0, z: 1 } },
    Overhead: { name: "the top", from: { x: 0, y: 1, z: -0.02 } },
    Bottom: { name: "the bottom", from: { x: 0, y: -1, z: -0.02 } },
    AboveLeftFront: { name: "above left, in front", from: { x: -0.6, y: 0.7, z: -0.7 } },
    BelowRightBehind: { name: "below right, behind", from: { x: 0.6, y: -0.6, z: 0.6 } },
} as const;

/** One of the fixed camera positions. */
type View = keyof typeof VIEWS;

/**
 * Where a view's camera stands.
 * @param from - The direction from the middle of the grid.
 * @returns The point VIEW_DISTANCE along it.
 */
function cameraAt(from: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const length = Math.hypot(from.x, from.y, from.z);

    return {
        x: (from.x / length) * VIEW_DISTANCE,
        y: (from.y / length) * VIEW_DISTANCE,
        z: (from.z / length) * VIEW_DISTANCE,
    };
}

/**
 * One node per shape and colour, laid out as a grid tilted back from the front camera.
 * @returns The sixteen nodes, each carrying its shape, its colour and a fixed position.
 */
function gridNodes(): { id: string; shape: string; color: string; position: { x: number; y: number; z: number } }[] {
    const colorNames = Object.keys(COLORS);

    return SHAPES.flatMap((shape, row) =>
        colorNames.map((color, col) => ({
            id: `${shape}-${color}`,
            shape,
            color,
            position: {
                x: (col - 1.5) * SPACING,
                y: (1.5 - row) * SPACING * TILT,
                z: (1.5 - row) * SPACING * TILT,
            },
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

/**
 * Hand the story's lighting to the element, and for a fixed-angle story set its camera and name
 * the angle under it.
 *
 * A decorator rather than a render function, so the element is still built by `renderFn` -- the
 * only thing that reads a story's `setup` -- and these two element properties are set on what it
 * built.
 *
 * ONE ELEMENT PER STORY. Six elements side by side on one page was the first shape of this, and
 * every one of them drew only the cylinders and the rings: the spheres and boxes were loaded,
 * placed and reported visible, and never reached the screen. One element draws all four rows.
 * Until that is understood, each angle is its own story.
 */
const lightingDecorator: Decorator<LightingArgs> = (story, context) => {
    const element = story() as Graphty;
    element.lighting = context.args.lighting ?? "studio";

    const view = (context.parameters as { lightingView?: View }).lightingView;

    if (view === undefined) {
        return element;
    }

    // The camera is the story's: no reframing after the data loads, no animation.
    element.autoFrame = false;
    element.style.cssText = "display:block;width:100%;height:820px;";
    void element.setCameraState(
        { position: cameraAt(VIEWS[view].from), target: { x: 0, y: 0, z: 0 } },
        { animate: false },
    );

    const caption = document.createElement("div");
    caption.textContent = `${element.lighting} lighting, seen from ${VIEWS[view].name}`;
    caption.style.cssText = "font:16px Verdana,sans-serif;text-align:center;padding:6px 0;";

    const figure = document.createElement("div");
    figure.append(element, caption);

    return figure;
};

const meta: Meta<LightingArgs> = {
    title: "Styles/Lighting",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator, lightingDecorator],
    argTypes: {
        lighting: { control: "select", options: LIGHTING_VALUES, name: "lighting" },
    },
    parameters: {
        controls: { include: ["lighting"] },
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
 * Check a fixed view: the grid is drawn, under the story's lighting, from the story's camera.
 * @param canvasElement - Where the story rendered.
 * @param story - The story's name, for the failure message.
 * @param want - The lighting the story sets.
 * @param view - The camera position the story sets.
 * @returns The scene.
 */
async function litFrom(canvasElement: HTMLElement, story: string, want: Lighting, view: View): Promise<Drawn> {
    const scene = await lit(canvasElement, story, want);
    const at = cameraAt(VIEWS[view].from);
    const { position } = scene.graph.getCameraState();
    const off = position ? Math.hypot(position.x - at.x, position.y - at.y, position.z - at.z) : Infinity;

    await holds(
        off < 0.5,
        `Styles/Lighting ${story}: the camera is ${off.toFixed(2)} units from where the story puts it`,
    );

    return scene;
}

/** What each mode is for, and how to set it, for the story descriptions. */
const MODE_TEXT: Record<Lighting, string> = {
    studio:
        "Studio, the default 3D look: a light that follows the camera, a soft fill with a light ground and a " +
        "rim in each node's own color, so no side of a node goes dark from any angle and nothing is washed " +
        "out to white. It is what every graph starts with; to set " +
        'it explicitly, `<graphty-element lighting="studio">` or `element.lighting = "studio"`.',
    headlight:
        "Headlight: the studio lights without the rim -- one light from beside the camera and a soft fill. A face is never brighter than its style " +
        "color, so light colors stay true while the shapes still read in 3D. " +
        '`<graphty-element lighting="headlight">` or `element.lighting = "headlight"`.',
    matte:
        "Matte: one soft light from above and no highlight -- even shading, with a lit face exactly its style " +
        "color at most. Shapes read flatter and a little darker than `studio`. " +
        '`<graphty-element lighting="matte">` or `element.lighting = "matte"`.',
    flat:
        "Flat: no lighting. Every pixel of a node is exactly its style color, with a thin dark outline so " +
        "overlapping nodes stay apart. Use it for color-coded analysis, where a reader matches a node's color " +
        'against a legend. `<graphty-element lighting="flat">` or `element.lighting = "flat"`.',
};

/** What to call a mode in a story's name. */
const MODE_LABEL: Record<Lighting, string> = { studio: "Studio", headlight: "Headlight", matte: "Matte", flat: "Flat" };

/**
 * One mode seen from one fixed camera position.
 * @param mode - The lighting.
 * @param view - The camera position.
 * @returns The story.
 */
function modeFrom(mode: Lighting, view: View): Story {
    const story = `${MODE_LABEL[mode]} - ${view}`;

    return {
        name: `${MODE_LABEL[mode]}, from ${VIEWS[view].name}`,
        args: { lighting: mode },
        parameters: {
            lightingView: view,
            docs: { description: { story: `${MODE_TEXT[mode]} Seen from ${VIEWS[view].name}.` } },
        },
        play: async ({ canvasElement }) => {
            const scene = await litFrom(canvasElement, story, mode, view);

            if (mode !== "flat" || view !== "Front") {
                return;
            }

            // Unlit means the exact style colour, so a tight window around each one finds it on
            // screen. Read once, from the front: each read renders and copies the whole canvas,
            // and the angle does not change what an unlit pixel is.
            const entries = Object.entries(COLORS);
            const counts = await pixelsOfColours(
                scene,
                entries.map(([, hex]) => hex),
                4,
            );

            for (const [index, [name, hex]] of entries.entries()) {
                await holds(
                    counts[index] > 0,
                    `Styles/Lighting ${story}: no pixel is drawn in the ${name} style color ${hex}`,
                );
            }
        },
    };
}

/**
 * Studio, the default: a light that follows the camera, a soft fill and a rim in each node's own
 * colour.
 */
export const StudioFront: Story = modeFrom("studio", "Front");
export const StudioBack: Story = modeFrom("studio", "Back");
export const StudioOverhead: Story = modeFrom("studio", "Overhead");
export const StudioBottom: Story = modeFrom("studio", "Bottom");
export const StudioAboveLeftFront: Story = modeFrom("studio", "AboveLeftFront");
export const StudioBelowRightBehind: Story = modeFrom("studio", "BelowRightBehind");

/**
 * Headlight: one light from beside the camera plus a soft fill; never brighter than the style colour.
 */
export const HeadlightFront: Story = modeFrom("headlight", "Front");
export const HeadlightBack: Story = modeFrom("headlight", "Back");
export const HeadlightOverhead: Story = modeFrom("headlight", "Overhead");
export const HeadlightBottom: Story = modeFrom("headlight", "Bottom");
export const HeadlightAboveLeftFront: Story = modeFrom("headlight", "AboveLeftFront");
export const HeadlightBelowRightBehind: Story = modeFrom("headlight", "BelowRightBehind");

/**
 * Matte: one soft light from above and no highlight.
 */
export const MatteFront: Story = modeFrom("matte", "Front");
export const MatteBack: Story = modeFrom("matte", "Back");
export const MatteOverhead: Story = modeFrom("matte", "Overhead");
export const MatteBottom: Story = modeFrom("matte", "Bottom");
export const MatteAboveLeftFront: Story = modeFrom("matte", "AboveLeftFront");
export const MatteBelowRightBehind: Story = modeFrom("matte", "BelowRightBehind");

/**
 * Flat: no lighting; exactly the style colour with a thin outline. Exported as Unshaded, because
 * "flat" and "unlit" are also words of style channels (node.flat, node.unlit), which these stories
 * do not set.
 */
export const UnshadedFront: Story = modeFrom("flat", "Front");
export const UnshadedBack: Story = modeFrom("flat", "Back");
export const UnshadedOverhead: Story = modeFrom("flat", "Overhead");
export const UnshadedBottom: Story = modeFrom("flat", "Bottom");
export const UnshadedAboveLeftFront: Story = modeFrom("flat", "AboveLeftFront");
export const UnshadedBelowRightBehind: Story = modeFrom("flat", "BelowRightBehind");
