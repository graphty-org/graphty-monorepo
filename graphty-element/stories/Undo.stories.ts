import "../index.ts";
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { dispatcherOf } from "../src/session/GraphSession";
import { stateDigest } from "../src/session/project/digest";
import { assertBackgroundColour, assertSkyboxDrawn, assertViewMode, type Drawn, drawn, holds } from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

/**
 * The graph every story here starts from: twenty cats and who they know, in a circle, which
 * places every node from the node set alone and so draws the same picture every time.
 */
const CATS =
    "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json";

/** A second, larger graph the import story merges in. */
const DATA3 = "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/data3.json";

/** The image the skybox story puts behind the graph. */
const SKYBOX =
    "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/rolling_hills_equirectangular_skybox.png";

/** The background every story is drawn against, so the skybox story's undo has a colour to return to. */
const PAPER = "#f5f5f5";

/**
 * Undo, redo and the picture.
 *
 * Every story except the baseline does one thing a reader does -- an import, a run, a style edit,
 * a filter, a drag, a layout or dimension switch, a background, a saved view -- and then undoes it,
 * so its snapshot is the picture after pressing Undo. Each play function checks that the undo
 * returned the project to exactly the state it started from, and that the canvas after the undo is,
 * pixel for pixel, the canvas the story drew before the action. Two things on screen are the
 * reader's and not the project's, and are put back by hand before that comparison: the camera,
 * which an import or a layout switch frames and an undo leaves where it is, and the selection,
 * which an undo sets to what it changed (undoing a drag selects the dragged node, drawn gold). So
 * every snapshot here is the Baseline picture -- except the 2D-to-3D story's, which starts in 2D
 * and so returns to the flat circle rather than the 3D one.
 */
const meta: Meta = {
    title: "Undo",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        controls: { exclude: /^(#|_)/ },
        chromatic: {
            delay: 500,
        },
    },
    args: {
        dataSource: "json",
        dataSourceConfig: { data: CATS },
        layout: "circular",
        setup: storySetup({ background: { backgroundType: "color", color: PAPER } }),
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * The project's state as one comparable value: everything a project file saves.
 * @param scene - What the story drew.
 * @returns Its digest.
 */
function projectState(scene: Drawn): string {
    return stateDigest(dispatcherOf(scene.session).state);
}

/** How far a colour channel may move before a pixel counts as changed: rounding, not a repaint. */
const CHANNEL_TOLERANCE = 2;

/**
 * The finished picture on the canvas.
 * @param scene - What the story drew.
 * @returns Its pixels, four bytes each.
 */
async function picture(scene: Drawn): Promise<Uint8Array> {
    const { graph } = scene;
    await scene.session.styles.settled();
    await graph.waitForStableFrame();
    graph.getUpdateManager().renderFrames(1);
    const { engine } = graph;
    return (await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight())) as unknown as Uint8Array;
}

/**
 * How many pixels differ between two pictures by more than rounding.
 * @param one - One picture.
 * @param other - The other.
 * @returns The changed pixels.
 */
function changedPixels(one: Uint8Array, other: Uint8Array): number {
    if (one.length !== other.length) {
        return Math.max(one.length, other.length) / 4;
    }

    let count = 0;
    for (let at = 0; at < one.length; at += 4) {
        for (let channel = 0; channel < 3; channel++) {
            if (Math.abs(one[at + channel] - other[at + channel]) > CHANNEL_TOLERANCE) {
                count++;
                break;
            }
        }
    }

    return count;
}

/**
 * Draw the graph, do something, undo it, and check the project and the picture are back where they
 * started.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name the story in a failure message.
 * @param act - The thing a reader does; it records `steps` steps.
 * @param steps - How many undoable steps `act` records, and so how many undos take it back.
 * @returns What is on screen after the undo.
 */
async function actThenUndo(
    canvasElement: HTMLElement,
    story: string,
    act: (scene: Drawn) => Promise<void>,
    steps = 1,
): Promise<Drawn> {
    const scene = await drawn(canvasElement, story);
    const { session } = scene;
    const before = projectState(scene);
    const depth = session.history.steps.length;
    const camera = scene.graph.getCameraState();
    const untouched = await picture(scene);

    await act(scene);
    await holds(
        session.history.steps.length === depth + steps,
        `${story}: the action should record ${String(steps)} step(s) and recorded ${String(session.history.steps.length - depth)}`,
    );
    await holds(projectState(scene) !== before, `${story}: the action changed nothing in the project`);

    for (let step = 0; step < steps; step++) {
        const outcome = await session.undo();
        await holds(outcome.kind === "undone", `${story}: undo answered "${outcome.kind}"`);
    }

    await holds(
        projectState(scene) === before,
        `${story}: after the undo the project is not the one the story started from`,
    );
    await holds(session.canRedo, `${story}: after the undo there is nothing to redo`);

    // The camera and the selection are the reader's, not the project's: put them back by hand.
    await scene.graph.setCameraState(camera);
    session.selection.clear();
    const changed = changedPixels(untouched, await picture(scene));
    await holds(changed === 0, `${story}: after the undo ${String(changed)} pixel(s) differ from the picture before`);
    return scene;
}

/**
 * Drag one node by the handler the pointer drives, and drop it: one step that places and pins it.
 * @param scene - What the story drew.
 * @param id - The node.
 */
async function drag(scene: Drawn, id: string): Promise<void> {
    const node = scene.graph.getNode(id);
    const handler = node?.dragHandler;
    await holds(node !== undefined && handler !== undefined, `Undo PinAndDrag: node "${id}" has no drag handler`);
    if (node === undefined || handler === undefined) {
        return;
    }

    const steps = scene.session.history.steps.length;
    const start = node.mesh.position.clone();
    handler.onDragStart(start);
    handler.onDragUpdate(start.add(new Vector3(40, 30, 0)));
    handler.onDragEnd();
    // The drop records its step once the drag's transaction closes, a moment after the pointer.
    for (let wait = 0; wait < 500 && scene.session.history.steps.length === steps; wait++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

/** The graph as it loads, untouched: the picture every story below should return to. */
export const Baseline: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Undo Baseline");
        await holds(
            scene.nodeCount === 20,
            `Undo Baseline: the cats graph has 20 nodes, drew ${String(scene.nodeCount)}`,
        );
        await scene.graph.waitForStableFrame();
    },
};

/** A second graph merged in from a URL, then undone: only the cats are left. */
export const ImportThenUndo: Story = {
    play: async ({ canvasElement }) => {
        const scene = await actThenUndo(canvasElement, "Undo ImportThenUndo", async ({ session }) => {
            await session.execute({
                op: "data.import",
                source: { type: "json", config: { data: DATA3 } },
                mode: "merge",
            });
        });
        await holds(
            scene.session.status.counts.nodes === 20,
            "Undo ImportThenUndo: the imported nodes are still there",
        );
    },
};

/** Degree centrality run with its colour and size applied, then undone: the run and its paint go together. */
export const RunThenUndo: Story = {
    play: async ({ canvasElement }) => {
        const scene = await actThenUndo(canvasElement, "Undo RunThenUndo", async ({ session }) => {
            await session.runs.start("degree", {}, { style: { size: true } });
        });
        await holds(scene.session.runs.list().length === 0, "Undo RunThenUndo: the run is still listed");
    },
};

/** Every node painted red by a layer, then undone. */
export const StyleEditThenUndo: Story = {
    play: async ({ canvasElement }) => {
        await actThenUndo(canvasElement, "Undo StyleEditThenUndo", async ({ session }) => {
            await session.styles.add({
                name: "Red nodes",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#ff0000" },
            });
        });
    },
};

/** Only the well-connected cats shown, then undone: every cat is back. */
export const FilterThenUndo: Story = {
    play: async ({ canvasElement }) => {
        await actThenUndo(canvasElement, "Undo FilterThenUndo", async ({ session }) => {
            await session.visibility.set({ kind: "degree", min: 4 });
        });
    },
};

/** One cat pinned and another dragged away, then both undone. */
export const PinAndDragThenUndo: Story = {
    play: async ({ canvasElement }) => {
        await actThenUndo(
            canvasElement,
            "Undo PinAndDragThenUndo",
            async (scene) => {
                const [first, second] = scene.nodes;
                await scene.session.positions.pin([first.id]);
                await drag(scene, second.id);
            },
            2,
        );
    },
};

/** The circle swapped for a spiral, then undone: the circle comes back without the layout rerunning. */
export const LayoutSwitchThenUndo: Story = {
    play: async ({ canvasElement }) => {
        await actThenUndo(canvasElement, "Undo LayoutSwitchThenUndo", async ({ session }) => {
            await session.execute({ op: "layout.set", id: "spiral" });
        });
    },
};

/** A 2D graph switched to 3D, then undone: flat again. */
export const TwoDToThreeDThenUndo: Story = {
    args: {
        setup: storySetup({ background: { backgroundType: "color", color: PAPER }, viewMode: "2d" }),
    },
    play: async ({ canvasElement }) => {
        const scene = await actThenUndo(canvasElement, "Undo TwoDToThreeDThenUndo", async ({ session }) => {
            await session.layout.setDimension("3d");
        });
        await assertViewMode(scene, "2d");
    },
};

/** A 3D graph flattened to 2D, then undone: back in 3D. */
export const ThreeDToTwoDThenUndo: Story = {
    play: async ({ canvasElement }) => {
        const scene = await actThenUndo(canvasElement, "Undo ThreeDToTwoDThenUndo", async ({ session }) => {
            await session.layout.setDimension("2d");
        });
        await assertViewMode(scene, "3d");
    },
};

/** A plain background swapped for a photo skybox, then undone: the dome is gone and the colour is back. */
export const SkyboxThenUndo: Story = {
    play: async ({ canvasElement }) => {
        const scene = await actThenUndo(canvasElement, "Undo SkyboxThenUndo", async (acted) => {
            await acted.session.config.set({ background: { backgroundType: "skybox", data: SKYBOX } });
            await assertSkyboxDrawn(acted);
        });
        const domes = scene.graph.scene.meshes.filter((mesh) => mesh.name.toLowerCase().includes("dome"));
        await holds(domes.length === 0, "Undo SkyboxThenUndo: the skybox dome is still in the scene");
        await assertBackgroundColour(scene, PAPER);
    },
};

/** A camera view saved by name, then undone: the view is forgotten and the picture never moved. */
export const SavedViewThenUndo: Story = {
    play: async ({ canvasElement }) => {
        const scene = await actThenUndo(canvasElement, "Undo SavedViewThenUndo", async ({ session }) => {
            await session.views.save([{ name: "Close up", camera: { zoom: 2, pan: { x: 1, y: 2 } } }]);
        });
        await holds(!scene.session.views.has("Close up"), "Undo SavedViewThenUndo: the saved view is still there");
    },
};
