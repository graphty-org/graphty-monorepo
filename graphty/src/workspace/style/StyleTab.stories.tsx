// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { createWorkspaceStore, type WorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";
import ring from "./__fixtures__/ring.json";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

/**
 * Loads the ring fixture (eight people with a name, a department and an age, on a circle with two
 * chords) into the story's element with the element's fixed layout, so every node sits at its
 * checked-in position and no layout runs, and waits for a stable frame.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadRing(canvasElement: HTMLElement): Promise<GraphtyElement> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(ring.nodes);
    await element.session.data.addEdges(ring.edges);
    await element.waitForStableFrame();
    return element;
}

/**
 * Runs PageRank and shows its row in the Style tab, as selecting the measure row would.
 * @param element - the story's element.
 * @param store - the story's store.
 */
async function inspectPageRank(element: GraphtyElement, store: WorkspaceStore): Promise<void> {
    const { runId } = await element.session.runs.start("pagerank");
    await element.session.styles.settled();
    // As the paint tree opens a run's row: the row's kind and the run id.
    store.set({ inspected: { kind: "measure-row", id: runId } });
    await element.waitForStableFrame();
}

/** The Style tab. */
const tab = (canvasElement: HTMLElement): ReturnType<typeof within> =>
    within(within(canvasElement).getByTestId("style-tab"));
/** The body, where popovers render. */
const body = (): ReturnType<typeof within> => within(document.body);

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Style tab",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A story on a fresh store with a project open.
 * @param play - what the reader does once the ring is loaded.
 * @returns the story.
 */
function styleStory(
    play?: (canvasElement: HTMLElement, element: GraphtyElement, store: WorkspaceStore) => Promise<void>,
): Story {
    const store = createWorkspaceStore({ project: { name: "Ring", id: 1 } });
    return {
        args: { store },
        play: async ({ canvasElement }) => {
            store.set({ inspected: null });
            const element = await loadRing(canvasElement);
            await play?.(canvasElement, element, store);
        },
    };
}

/** The Everything row: the element's base style as lines (`#/inspector-selection-and-everything/everything`). */
export const Everything: Story = styleStory();

/** The Edges side of the same row (`#/style-tab-same-panel/nodes`, switched to Edges). */
export const Edges: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("radio", { name: /Edges/ }));
});

/** A measure row, PageRank, its Color bound (`#/inspector-measure-row/style`). */
export const MeasureRow: Story = styleStory(async (_canvas, element, store) => {
    await inspectPageRank(element, store);
});

/** Shape "+" on the measure row: the menu of what the row does not set (`#/style-pickers/plus-menu`). */
export const PlusMenu: Story = styleStory(async (canvasElement, element, store) => {
    await inspectPageRank(element, store);
    await userEvent.click(await tab(canvasElement).findByRole("button", { name: "Add to Shape" }));
});

/** The Color popover on Everything's color (`#/style-pickers/color`). */
export const ColorPopover: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: /^Color #/ }));
});

/** The Shape popover: every shape by name, with a filter (`#/style-pickers/shape`). */
export const ShapePopover: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: /^Shape / }));
});

/** The bind icon opens the From data list: attributes, a refused one last (`#/style-pickers/bind-prop`). */
export const BindSize: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: "Size by attribute" }));
});

/** Everything colored by department, the Binding popover open (`#/style-pickers/binding`). */
export const BindingPopover: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: "Color by attribute" }));
    await userEvent.click(await body().findByRole("option", { name: "dept" }));
    await waitFor(() => {
        expect(body().queryByRole("dialog", { name: "From data" })).toBeNull();
    });
    await userEvent.click(await tab(canvasElement).findByRole("button", { name: /^dept,/ }));
    await body().findByRole("group", { name: "Color binding" });
});

/** The Binding popover's palette list open, for the department colors (`#/style-pickers/palette`). */
export const Palette: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: "Color by attribute" }));
    await userEvent.click(await body().findByRole("option", { name: "dept" }));
    await userEvent.click(await tab(canvasElement).findByRole("button", { name: /^dept,/ }));
    const popover = await body().findByRole("group", { name: "Color binding" });
    await userEvent.click(within(popover).getByRole("combobox", { name: "Palette" }));
});

/** A binding whose attribute is not in the data: the line says it reads nothing (`#/style-pickers/binding-unknown-path`). */
export const BindingUnknownPath: Story = styleStory(async (_canvas, element, store) => {
    const layer = await element.session.styles.add({
        name: "Missing",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.department", scale: "ordinal" } },
    });
    store.set({ inspected: { kind: "layer-row", id: layer.id } });
});

/** The Label "+": an empty line at Above, its attribute list open (`#/style-pickers/label-new-line`). */
export const LabelNewLine: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: "Add label line" }));
});

/** Esc on the list: the empty line reads "Pick an attribute" and draws nothing (`#/inspector-group-set-path-row/label-empty`). */
export const LabelEmpty: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: "Add label line" }));
    await body().findByRole("dialog", { name: "From data" });
    await userEvent.keyboard("{Escape}");
});

/** A label line bound to the name, with the element's count (`#/inspector-group-set-path-row/label-two`). */
export const LabelBound: Story = styleStory(async (canvasElement, element) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: "Add label line" }));
    await userEvent.click(await body().findByRole("option", { name: "name" }));
    await element.waitForStableFrame();
});
