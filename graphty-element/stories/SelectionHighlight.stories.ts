/**
 * What a selected node looks like, and how a consumer changes it.
 *
 * In 1.x a host restyled the selection through `SelectionManager.setSelectionStyleLayer`. 2.0
 * drew a gold halo from three constants and published no door at all: the halo is deliberately
 * outside the layer stack, so it could not be reached by adding a layer either. These stories
 * pin the door that replaces it -- `element.selectionStyle`, merged over what is already set and
 * effective on a selection that is already on screen.
 *
 * Each story SELECTS a node in its play function, because a halo nobody has asked for is a halo
 * nobody can see. The picture is the point.
 */

import type { Meta, StoryContext, StoryObj } from "@storybook/web-components-vite";

import type { GraphSelectionStyleInput } from "../src/config";
// Importing the module is what defines the <graphty-element> custom element, so this line is
// load-bearing even though only the type is named.
import { assertGraphLoaded, type Drawn, drawn, holds, renderedElement } from "./assertions";
import { eventWaitingDecorator, setLayoutPreSteps, waitForGraphSettled } from "./helpers";
import { captionDecorator, consumerSource } from "./styling/story-docs";

/** Five nodes, far enough apart that a halo around one is a halo around one. */
const NODES = [{ id: "alpha" }, { id: "beta" }, { id: "gamma" }, { id: "delta" }, { id: "epsilon" }];

/** A path through them. */
const EDGES = [
    { src: "alpha", dst: "beta" },
    { src: "beta", dst: "gamma" },
    { src: "gamma", dst: "delta" },
    { src: "delta", dst: "epsilon" },
];

/** The node every story selects, so the pictures differ only in the halo. */
const SELECTED = "gamma";

/** How long to leave for the halo to reach the frame after a selection or a restyle. */
const SETTLE_MS = 400;

/** What a story's args carry: the element's properties plus the highlight to set. */
interface HighlightArgs {
    /** What a selected node should look like, or undefined to leave the element's own. */
    selectionStyle?: GraphSelectionStyleInput;
    /** The shape every node is drawn in, or undefined for the element's own. */
    shape?: "box";
}

/**
 * Build the element for one of these stories.
 *
 * Its own render rather than the shared one, because `selectionStyle` is a property of the
 * element rather than a style channel, and the shared render forwards channels.
 * @param args - What the story asked for.
 * @returns The element.
 */
function render(args: HighlightArgs): Element {
    const element = document.createElement("graphty-element");

    // Stepped before the first frame under visual capture, so the snapshot is the same picture twice.
    setLayoutPreSteps(element, 2000);

    if (args.selectionStyle) {
        element.selectionStyle = args.selectionStyle;
    }

    if (args.shape) {
        // Through a style layer, like any node appearance. Queued until the element is ready.
        void element.session.styles.add({
            name: `every node a ${args.shape}`,
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": args.shape },
        });
    }

    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "ngraph";
    element.layoutConfig = { seed: 42 };

    // SELECTED BY THE STORY ITSELF, not only by its play function. A halo nobody has asked for is
    // a halo nobody can see, so a story about what a selected node looks like that waits for an
    // interaction shows an unselected graph -- to a reader opening it, and to the visual
    // regression snapshot, which would then be a picture of nothing this story is about.
    element.addEventListener("graph-settled", () => {
        element.selectNode(SELECTED);
    });

    return element;
}

const DESCRIPTION = `
What a selected node looks like. The element draws a halo around the selected node: by default a
faint gold shell 1.45 times the node's size, in the node's own shape. Set the element's
\`selectionStyle\` property to change its \`color\`, \`opacity\` and \`scale\`; what you set is merged
over what is already set, and a selection already on screen changes at once.

The graph is a chain of five nodes, and every story selects the middle one, "gamma". Click any
node to select it instead.
`;

const meta: Meta = {
    title: "Styling/Selection highlight",
    // The component id this section had before it was retitled, so every story id (and its
    // approved screenshot) stays the same.
    id: "styles-selection-highlight",
    tags: ["autodocs"],
    component: "graphty-element",
    render: render,
    decorators: [eventWaitingDecorator, captionDecorator],
    parameters: {
        docs: {
            description: { component: DESCRIPTION },
            source: {
                language: "html",
                transform: (_code: string, context: StoryContext): string => {
                    const args = context.args as HighlightArgs;

                    return consumerSource({
                        selectionStyle: args.selectionStyle,
                        layers:
                            args.shape === undefined
                                ? []
                                : [
                                      {
                                          name: `every node a ${args.shape}`,
                                          target: "node",
                                          selector: { match: "everything" },
                                          set: { "node.shape": args.shape },
                                      },
                                  ],
                        nodeData: NODES,
                        edgeData: EDGES,
                        layoutConfig: { seed: 42 },
                        layout: "ngraph",
                        select: SELECTED,
                    });
                },
            },
        },
        chromatic: { delay: 800 },
    },
};
export default meta;

type Story = StoryObj<HighlightArgs>;

/**
 * Settle the story, select the node, and read back what the scene is drawing.
 * @param canvasElement - Where the story rendered.
 * @param story - The story's name, for the failure message.
 * @returns The scene, with the node selected.
 */
async function selected(canvasElement: HTMLElement, story: string): Promise<Drawn> {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Styles/Selection Highlight ${story}`);
    await assertGraphLoaded(scene, { nodes: 5, edges: 4 });

    scene.graph.selectNode(SELECTED);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

    return scene;
}

/**
 * The halo on screen: the visible instance, never the cached source mesh.
 *
 * The mesh cache keeps the source beside the instances, hidden and parked ten thousand units
 * below the graph, so a search by name alone finds the source and reports its unscaled size.
 * @param scene - The scene to read.
 * @returns The colour, opacity and drawn size of the halo, or null when none is drawn.
 */
function haloOnScreen(scene: Drawn): { color: string; alpha: number; clearance: number } | null {
    const mesh = scene.graph.scene.meshes.find(
        (candidate) =>
            candidate.name.startsWith("graphty-selection-halo") && candidate.isVisible && candidate.isEnabled(),
    );

    const material = mesh?.material;
    const node = scene.graph.getNode(SELECTED);

    if (!mesh || !material || !node || !("emissiveColor" in material)) {
        return null;
    }

    const lit = material as unknown as { emissiveColor: { toHexString: () => string }; alpha: number };
    const of = (target: {
        getBoundingInfo: () => { boundingBox: { extendSizeWorld: { x: number; y: number; z: number } } };
    }): number => {
        const extent = target.getBoundingInfo().boundingBox.extendSizeWorld;

        return Math.max(extent.x, extent.y, extent.z);
    };

    // MEASURED AGAINST THE NODE, never as a raw scaling number. The halo used to be drawn
    // smaller than the node it rings, so it was inside it and invisible -- and a scaling of 1.45
    // looked perfectly correct while that was true.
    return { color: lit.emissiveColor.toHexString(), alpha: lit.alpha, clearance: of(mesh) / of(node.mesh) };
}

/**
 * Assert the halo on screen looks the way the story says it does.
 * @param scene - The scene to read.
 * @param want - The colour, opacity and drawn size expected.
 */
async function assertHalo(scene: Drawn, want: { color: string; alpha: number; clearance: number }): Promise<void> {
    const halo = haloOnScreen(scene);

    await holds(halo !== null, `${scene.story}: a node is selected and no halo is drawn anywhere in the scene`);

    const drawnHalo = halo as { color: string; alpha: number; clearance: number };

    await holds(
        drawnHalo.color.toUpperCase() === want.color.toUpperCase(),
        `${scene.story}: the halo is drawn ${drawnHalo.color}, not ${want.color}`,
    );
    await holds(
        Math.abs(drawnHalo.alpha - want.alpha) < 0.001,
        `${scene.story}: the halo is drawn at opacity ${String(drawnHalo.alpha)}, not ${String(want.alpha)}`,
    );
    await holds(
        Math.abs(drawnHalo.clearance - want.clearance) < 0.001,
        `${scene.story}: the halo is drawn at ${String(drawnHalo.clearance)} times the node's own radius, ` +
            `not ${String(want.clearance)}`,
    );
    await holds(
        drawnHalo.clearance > 1,
        `${scene.story}: the halo is drawn inside the node it rings, so nobody can see it`,
    );
}

/** The gold halo an element nobody has configured draws. */
export const Default: Story = {
    parameters: { caption: { text: "No selectionStyle of your own: gamma is selected, in the default gold halo." } },
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "Default");

        await assertHalo(scene, { color: "#FFD700", alpha: 0.4, clearance: 1.45 });
    },
};

/** The halo in a colour of the consumer's own. */
export const Color: Story = {
    parameters: { caption: { text: 'selectionStyle: { color: "#00BCD4" }.' } },
    args: { selectionStyle: { color: "#00BCD4" } },
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "Color");

        // The scale and the opacity are untouched: the setting is merged, not replaced.
        await assertHalo(scene, { color: "#00BCD4", alpha: 0.4, clearance: 1.45 });
    },
};

/** A halo that stands much further clear of the node. */
export const Scale: Story = {
    parameters: { caption: { text: "selectionStyle: { scale: 2.6 }, a halo further clear of the node." } },
    args: { selectionStyle: { scale: 2.6 } },
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "Scale");

        await assertHalo(scene, { color: "#FFD700", alpha: 0.4, clearance: 2.6 });
    },
};

/** A solid halo rather than a faint one. */
export const Opacity: Story = {
    parameters: { caption: { text: 'selectionStyle: { color: "#E91E63", opacity: 0.85 }, a solid halo.' } },
    args: { selectionStyle: { color: "#E91E63", opacity: 0.85 } },
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "Opacity");

        await assertHalo(scene, { color: "#E91E63", alpha: 0.85, clearance: 1.45 });
    },
};

/** A selection already on screen, restyled where the reader can see it happen. */
export const RestyledWhileSelected: Story = {
    tags: ["regression", "!dev", "!autodocs"],
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "RestyledWhileSelected");

        await assertHalo(scene, { color: "#FFD700", alpha: 0.4, clearance: 1.45 });

        const element = await renderedElement(canvasElement, "RestyledWhileSelected: no <graphty-element> rendered");
        element.selectionStyle = { color: "#7CB342", scale: 2, opacity: 0.7 };
        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

        await assertHalo(scene, { color: "#7CB342", alpha: 0.7, clearance: 2 });
    },
};

/**
 * The halo around a box: a larger box around the selected node, never a sphere behind it. The
 * halo is the node's own shape scaled out, so a box's corners are ringed too (issue #2643).
 */
export const Box: Story = {
    name: "Around a box",
    parameters: { caption: { text: "The halo takes the node's own shape: a larger box around a box." } },
    args: { shape: "box" },
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "Box");

        await holds(scene.graph.getNode(SELECTED)?.shapeType === "box", "Box: the selected node is drawn as a box");

        await assertHalo(scene, { color: "#FFD700", alpha: 0.4, clearance: 1.45 });
    },
};
