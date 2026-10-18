// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { createWorkspaceStore, type WorkspaceState } from "../state/store";
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
    tags: ["autodocs"],
    component: Workspace,
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "Export (Ctrl+E or Cmd+E) saves the drawing as an image, with or without its legend, or a table of the data as a file.",
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A story that loads the ring, then opens Export as the reader would, on a loaded graph.
 * @param exportOn - where the dialog opens.
 * @returns the story.
 */
function exportStory(exportOn: WorkspaceState["exportOn"]): Story {
    const store = createWorkspaceStore({ project: { name: "Ring", id: 1 } });
    return {
        args: { store },
        play: async ({ canvasElement }) => {
            store.set({ dialog: null });
            await loadRing(canvasElement);
            store.set({ dialog: "export", exportOn });
        },
    };
}

/** Export > Image: the "To share" preset, the legend callout and the preview the element draws. */
export const Image: Story = { ...exportStory("image"), name: "An image" };

/** Export > Data, opened on the node table: CSV, what it cannot hold, and the first lines with the Degree columns. */
export const Data: Story = { ...exportStory("nodes"), name: "The data as a file" };
