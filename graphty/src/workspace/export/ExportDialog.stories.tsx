// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, waitFor, within } from "storybook/test";

import { freshStore, storeOf } from "../../stories/freshStore";
import type { WorkspaceState } from "../state/store";
import { Workspace } from "../Workspace";

/** Eight nodes on a ring with two chords, laid out on a flat circle, which places them the same way every time. */
const NODES = Array.from({ length: 8 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = [
    ...NODES.map((node, i) => ({ source: node.id, target: NODES[(i + 1) % NODES.length].id })),
    { source: "n0", target: "n4" },
    { source: "n2", target: "n6" },
];

/**
 * Loads the ring into the story's element, runs Degree, and waits for a stable frame.
 * @param canvasElement - the story's root.
 */
async function loadRing(canvasElement: HTMLElement): Promise<void> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.ownerDocument.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular", { options: { scale: 0.2 } });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.session.runs.start("degree");
    await element.waitForStableFrame();
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Export",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A story that loads the ring, then opens Export as the reader would, on a loaded graph.
 * @param exportOn - where the dialog opens.
 * @returns the story.
 */
function exportStory(exportOn: WorkspaceState["exportOn"]): Story {
    return {
        ...freshStore({ project: { name: "Ring", id: 1 } }),
        play: async (context) => {
            const { canvasElement } = context;
            const store = storeOf(context);
            store.set({ dialog: null });
            await loadRing(canvasElement);
            store.set({ dialog: "export", exportOn });
            if (exportOn === "image") {
                // The preview is captured after the dialog opens; until it is drawn the dialog
                // shows "Drawing the preview...", so a picture taken before then is a different one.
                const doc = canvasElement.ownerDocument;
                const preview = await waitFor(() => {
                    const img = doc.querySelector<HTMLImageElement>(".ws-export-preview img");
                    if (img === null) {
                        throw new Error("the preview is not drawn yet");
                    }
                    return img;
                });
                await preview.decode();
            }
        },
    };
}

/** Export > Image: the "To share" preset, the legend callout and the preview the element draws. */
export const Image: Story = exportStory("image");

/** Export > Image with a saved view chosen in View: the picture is taken from that view. */
export const ImageSavedView: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        const { canvasElement } = context;
        const store = storeOf(context);
        store.set({ dialog: null });
        await loadRing(canvasElement);
        const element = canvasElement.ownerDocument.querySelector("graphty-element");
        await element?.session.views.save([{ name: "Overview" }]);
        store.set({ dialog: "export", exportOn: "image" });
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByRole("dialog", { name: "Export" });
        const preview = (): HTMLImageElement | null =>
            canvasElement.ownerDocument.querySelector<HTMLImageElement>(".ws-export-preview img");
        // The first preview, from the current camera, then the one from the chosen view.
        const first = await waitFor(() => preview()?.src ?? Promise.reject(new Error("no preview yet")));
        await userEvent.click(within(dialog).getByRole("combobox", { name: "View" }));
        await userEvent.click(await body.findByRole("option", { name: "Overview" }));
        const img = await waitFor(() => {
            const found = preview();
            if (found === null || found.src === first) {
                throw new Error("the preview from the saved view is not drawn yet");
            }
            return found;
        });
        await img.decode();
    },
};

/** Export > Data, opened on the node table: CSV, what it cannot hold, and the first lines with the Degree columns. */
export const Data: Story = exportStory("nodes");
