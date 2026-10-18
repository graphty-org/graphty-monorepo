// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { storyWaitOptions } from "../../stories/wait";
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
 * Clicks the inspector's Style tab: the inspector opens a row on Values.
 * @param canvasElement - the story's root.
 */
async function openStyleTab(canvasElement: HTMLElement): Promise<void> {
    const inspector = within(canvasElement).getByRole("complementary", { name: "Inspector" });
    await userEvent.click(await within(inspector).findByRole("tab", { name: "Style" }, storyWaitOptions(1000)));
}

/**
 * Runs PageRank and shows its row in the Style tab, as selecting the measure row would.
 * @param canvasElement - the story's root.
 * @param element - the story's element.
 * @param store - the story's store.
 */
async function inspectPageRank(
    canvasElement: HTMLElement,
    element: GraphtyElement,
    store: WorkspaceStore,
): Promise<void> {
    const { runId } = await element.session.runs.start("pagerank");
    await element.session.styles.settled();
    // As the paint tree opens a run's row: the row's kind and the run id.
    store.set({ inspected: { kind: "measure-row", id: runId } });
    // The tab is rebuilt for the new row, on Values again.
    await openStyleTab(canvasElement);
    await element.waitForStableFrame();
}

/** The Style tab. */
const tab = (canvasElement: HTMLElement): ReturnType<typeof within> =>
    within(within(canvasElement).getByTestId("style-tab"));
/** The body, where popovers render. */
const body = (): ReturnType<typeof within> => within(document.body);

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Style tab",
    tags: ["autodocs"],
    component: Workspace,
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "The inspector's Style tab. Each line sets how nodes or edges look -- color, size, shape, label -- either to one value or bound to an attribute in the data, with a palette for the attribute's values.",
            },
        },
    },
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
            // As the reader gets here: the Everything row in the paint tree, then the inspector's
            // Style tab (it opens on Values).
            await userEvent.click(await within(canvasElement).findByText("Everything", {}, storyWaitOptions(1000)));
            await openStyleTab(canvasElement);
            await play?.(canvasElement, element, store);
        },
    };
}

/** The Everything row: the element's base style as lines (`#/inspector-selection-and-everything/everything`). */
export const Everything: Story = { ...styleStory(), name: "The Everything row" };

/** The Edges side of the same row (`#/style-tab-same-panel/nodes`, switched to Edges). */
export const Edges: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("radio", { name: /Edges/ }));
});

/** A measure row, PageRank, its Color bound (`#/inspector-measure-row/style`). */
export const MeasureRow: Story = {
    ...styleStory(async (canvasElement, element, store) => {
        await inspectPageRank(canvasElement, element, store);
    }),
    name: "A measure row",
};

/** Shape "+" on the measure row: the menu of what the row does not set (`#/style-pickers/plus-menu`). */
export const PlusMenu: Story = {
    ...styleStory(async (canvasElement, element, store) => {
        await inspectPageRank(canvasElement, element, store);
        await userEvent.click(
            await tab(canvasElement).findByRole("button", { name: "Add to Shape" }, storyWaitOptions(1000)),
        );
    }),
    name: "The + menu",
};

/** The color picker on Everything's color, opened from the field's chit (`#/style-pickers/color`). */
export const ColorPopover: Story = {
    ...styleStory(async (canvasElement) => {
        await userEvent.click(tab(canvasElement).getByRole("button", { name: "Pick Color" }));
    }),
    name: "Color picker",
};

/** The Shape popover: every shape by name, with a filter (`#/style-pickers/shape`). */
export const ShapePopover: Story = {
    ...styleStory(async (canvasElement) => {
        await userEvent.click(tab(canvasElement).getByRole("button", { name: /^Shape / }));
    }),
    name: "Shape picker",
};

/** The bind icon opens the From data list: attributes, a refused one last (`#/style-pickers/bind-prop`). */
export const BindSize: Story = {
    ...styleStory(async (canvasElement) => {
        await userEvent.click(tab(canvasElement).getByRole("button", { name: "Size by attribute" }));
    }),
    name: "Binding size to data",
};

/** Everything colored by department, the Binding popover open (`#/style-pickers/binding`). */
export const BindingPopover: Story = {
    ...styleStory(async (canvasElement) => {
        await userEvent.click(tab(canvasElement).getByRole("button", { name: "Color by attribute" }));
        await userEvent.click(await body().findByRole("option", { name: "dept" }, storyWaitOptions(1000)));
        await waitFor(() => {
            expect(body().queryByRole("dialog", { name: "From data" })).toBeNull();
        }, storyWaitOptions(1000));
        await userEvent.click(
            await tab(canvasElement).findByRole("button", { name: /^dept,/ }, storyWaitOptions(1000)),
        );
        await body().findByRole("group", { name: "Color binding" }, storyWaitOptions(1000));
    }),
    name: "Colored by an attribute",
};

/** The Binding popover's palette list open, for the department colors (`#/style-pickers/palette`). */
export const Palette: Story = {
    ...styleStory(async (canvasElement) => {
        await userEvent.click(tab(canvasElement).getByRole("button", { name: "Color by attribute" }));
        await userEvent.click(await body().findByRole("option", { name: "dept" }, storyWaitOptions(1000)));
        await userEvent.click(
            await tab(canvasElement).findByRole("button", { name: /^dept,/ }, storyWaitOptions(1000)),
        );
        const popover = await body().findByRole("group", { name: "Color binding" }, storyWaitOptions(1000));
        await userEvent.click(within(popover).getByRole("combobox", { name: "Palette" }));
    }),
    name: "Palettes",
};

/** A binding whose attribute is not in the data: the line says it reads nothing (`#/style-pickers/binding-unknown-path`). */
export const BindingUnknownPath: Story = {
    ...styleStory(async (canvasElement, element, store) => {
        const layer = await element.session.styles.add({
            name: "Missing",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.department", scale: "ordinal" } },
        });
        store.set({ inspected: { kind: "layer-row", id: layer.id } });
        await openStyleTab(canvasElement);
    }),
    name: "Bound to a missing attribute",
};

/** The Label "+": an empty line at Above, its attribute list open (`#/style-pickers/label-new-line`). */
export const LabelNewLine: Story = {
    ...styleStory(async (canvasElement) => {
        await userEvent.click(tab(canvasElement).getByRole("button", { name: "Add label line" }));
    }),
    name: "A new label line",
};

/** Esc on the list: the empty line reads "Pick an attribute" and draws nothing (`#/inspector-group-set-path-row/label-empty`). */
export const LabelEmpty: Story = {
    ...styleStory(async (canvasElement) => {
        await userEvent.click(tab(canvasElement).getByRole("button", { name: "Add label line" }));
        await body().findByRole("dialog", { name: "From data" }, storyWaitOptions(1000));
        await userEvent.keyboard("{Escape}");
    }),
    name: "An empty label line",
};

/** A label line bound to the name, with the element's count (`#/inspector-group-set-path-row/label-two`). */
export const LabelBound: Story = {
    ...styleStory(async (canvasElement, element) => {
        await userEvent.click(tab(canvasElement).getByRole("button", { name: "Add label line" }));
        await userEvent.click(await body().findByRole("option", { name: "name" }, storyWaitOptions(1000)));
        await element.waitForStableFrame();
    }),
    name: "A label bound to the name",
};
