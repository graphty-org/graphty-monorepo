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

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { GraphSelectionStyleInput } from "../src/config";
// Importing the module is what defines the <graphty-element> custom element, so this line is
// load-bearing even though only the type is named.
import { type Graphty } from "../src/graphty-element";
import { assertGraphLoaded, type Drawn, drawn, holds } from "./assertions";
import { eventWaitingDecorator, waitForGraphSettled } from "./helpers";

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
    const element = document.createElement("graphty-element") as Graphty;

    // Stepped before the first frame, so the snapshot is the same picture twice.
    element.layoutBehavior = { layout: { preSteps: 2000 } };

    if (args.selectionStyle) {
        element.selectionStyle = args.selectionStyle;
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

const meta: Meta = {
    title: "Styles/Selection Highlight",
    component: "graphty-element",
    render: render as Meta["render"],
    decorators: [eventWaitingDecorator],
    parameters: {
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
        (candidate) => candidate.name.startsWith("graphty-selection-halo") && candidate.isVisible && candidate.isEnabled(),
    );

    const material = mesh?.material;
    const node = scene.graph.getNode(SELECTED);

    if (!mesh || !material || !node || !("emissiveColor" in material)) {
        return null;
    }

    const lit = material as unknown as { emissiveColor: { toHexString: () => string }; alpha: number };
    const of = (target: { getBoundingInfo: () => { boundingBox: { extendSizeWorld: { x: number; y: number; z: number } } } }): number => {
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
async function assertHalo(
    scene: Drawn,
    want: { color: string; alpha: number; clearance: number },
): Promise<void> {
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
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "Default");

        await assertHalo(scene, { color: "#FFD700", alpha: 0.4, clearance: 1.45 });
    },
};

/** The halo in a colour of the consumer's own. */
export const Color: Story = {
    args: { selectionStyle: { color: "#00BCD4" } },
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "Color");

        // The scale and the opacity are untouched: the setting is merged, not replaced.
        await assertHalo(scene, { color: "#00BCD4", alpha: 0.4, clearance: 1.45 });
    },
};

/** A halo that stands much further clear of the node. */
export const Scale: Story = {
    args: { selectionStyle: { scale: 2.6 } },
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "Scale");

        await assertHalo(scene, { color: "#FFD700", alpha: 0.4, clearance: 2.6 });
    },
};

/** A solid halo rather than a faint one. */
export const Opacity: Story = {
    args: { selectionStyle: { color: "#E91E63", opacity: 0.85 } },
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "Opacity");

        await assertHalo(scene, { color: "#E91E63", alpha: 0.85, clearance: 1.45 });
    },
};

/** A selection already on screen, restyled where the reader can see it happen. */
export const RestyledWhileSelected: Story = {
    play: async ({ canvasElement }) => {
        const scene = await selected(canvasElement, "RestyledWhileSelected");

        await assertHalo(scene, { color: "#FFD700", alpha: 0.4, clearance: 1.45 });

        const element = canvasElement.querySelector("graphty-element") as Graphty;
        element.selectionStyle = { color: "#7CB342", scale: 2, opacity: 0.7 };
        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

        await assertHalo(scene, { color: "#7CB342", alpha: 0.7, clearance: 2 });
    },
};
