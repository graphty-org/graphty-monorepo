// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { fixWallClock } from "../../test/fixedWallClock";
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
    await userEvent.click(await within(inspector).findByRole("tab", { name: "Style" }));
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
    // As the toolbar opens a finished run: the row's kind and the run id.
    store.set({ inspected: { kind: "measure-row", id: runId } });
    // The tab is rebuilt for the new row, on Values again.
    await openStyleTab(canvasElement);
    await element.waitForStableFrame();
}

/** The Style tab. */
const tab = (canvasElement: HTMLElement): ReturnType<typeof within> =>
    within(within(canvasElement).getByTestId("style-tab"));
/**
 * A field's vary glyph, which shows while the field is hovered or holds focus.
 * @param canvasElement - the story's root.
 * @param field - the field's name, as "Node size".
 * @returns the glyph's button.
 */
async function varyGlyph(canvasElement: HTMLElement, field: string): Promise<HTMLElement> {
    const box = within(canvasElement)
        .getByTestId("style-tab")
        .querySelector<HTMLElement>(`[aria-label^="${field}, "]`)
        ?.closest<HTMLElement>(".ws-field");
    if (box === null || box === undefined) {
        throw new Error(`no ${field} field`);
    }
    // The glyph shows while the field holds focus (a story's pointer events move no CSS hover).
    box.querySelector<HTMLElement>("input")?.focus();
    return within(box).findByRole("button", { name: `${field} by attribute` });
}

/** The Style tab's Nodes group: both groups draw a label entry. */
const nodes = (canvasElement: HTMLElement): ReturnType<typeof within> => {
    const group = within(canvasElement).getByTestId("style-tab").querySelector<HTMLElement>('[data-group="node"]');
    if (group === null) {
        throw new Error("the Style tab draws no Nodes group");
    }
    return within(group);
};
/** The body, where popovers render. */
const body = (): ReturnType<typeof within> => within(document.body);

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Style tab",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // A run row's header shows when the run started, to the second: start runs on a fixed clock.
    beforeEach: fixWallClock,
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
            // The Everything row's Style tab, as Why this look opens it (the style tree lists the
            // starting rows only while the project draws them).
            store.set({ inspected: { kind: "everything-row" } });
            await openStyleTab(canvasElement);
            await play?.(canvasElement, element, store);
        },
    };
}

/** The Everything row: the element's base style as lines (`#/inspector-selection-and-everything/everything`). */
export const Everything: Story = styleStory();

/** A measure row, PageRank, its Color bound (`#/inspector-measure-row/style`). */
export const MeasureRow: Story = styleStory(async (canvasElement, element, store) => {
    await inspectPageRank(canvasElement, element, store);
});

/** Effects "+" on the measure row: the effects the row does not draw yet (`#/style-pickers/plus-menu`). */
export const PlusMenu: Story = styleStory(async (canvasElement, element, store) => {
    await inspectPageRank(canvasElement, element, store);
    await userEvent.click(await tab(canvasElement).findByRole("button", { name: "Add to node effects" }));
});

/** The Color popover on Everything's color (`#/style-pickers/color`). */
export const ColorPopover: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: "Pick Node color" }));
});

/** The Shape grid: every shape the element draws, by its picture and name (`#/style-pickers/shape`). */
export const ShapePopover: Story = styleStory(async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("combobox", { name: /^Node shape, / }));
});

/** The bind icon opens the From data list: attributes, a refused one last (`#/style-pickers/bind-prop`). */
export const BindSize: Story = styleStory(async (canvasElement) => {
    await userEvent.click(await varyGlyph(canvasElement, "Node size"));
});

/** Everything colored by department, the Binding popover open (`#/style-pickers/binding`). */
export const BindingPopover: Story = styleStory(async (canvasElement) => {
    await userEvent.click(await varyGlyph(canvasElement, "Node color"));
    await userEvent.click(await body().findByRole("option", { name: "dept" }));
    await waitFor(() => {
        expect(body().queryByRole("dialog", { name: "From data" })).toBeNull();
    });
    await userEvent.click(await tab(canvasElement).findByRole("button", { name: /^Node color: dept,/ }));
    await body().findByRole("group", { name: "Color binding" });
});

/** The Binding popover's palette list open, for the department colors (`#/style-pickers/palette`). */
export const Palette: Story = styleStory(async (canvasElement) => {
    await userEvent.click(await varyGlyph(canvasElement, "Node color"));
    await userEvent.click(await body().findByRole("option", { name: "dept" }));
    await userEvent.click(await tab(canvasElement).findByRole("button", { name: /^Node color: dept,/ }));
    const popover = await body().findByRole("group", { name: "Color binding" });
    await userEvent.click(within(popover).getByRole("combobox", { name: /^Palette/ }));
});

/** A binding whose attribute is not in the data: the line says it reads nothing (`#/style-pickers/binding-unknown-path`). */
export const BindingUnknownPath: Story = styleStory(async (canvasElement, element, store) => {
    const layer = await element.session.styles.add({
        name: "Missing",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.department", scale: "ordinal" } },
    });
    store.set({ inspected: { kind: "layer-row", id: layer.id } });
    await openStyleTab(canvasElement);
});

/** Text "+", then Label: the source list open, nothing written yet (`#/style-pickers/label-new-line`). */
export const LabelNewLine: Story = styleStory(async (canvasElement) => {
    await userEvent.click(nodes(canvasElement).getByRole("button", { name: "Add to node text" }));
    await userEvent.click(await body().findByRole("menuitem", { name: /^Label/ }));
    await body().findByRole("dialog", { name: "From data" });
});

/** Esc on the source list: no entry is left behind (`#/inspector-group-set-path-row/label-empty`). */
export const LabelEmpty: Story = styleStory(async (canvasElement) => {
    await userEvent.click(nodes(canvasElement).getByRole("button", { name: "Add to node text" }));
    await userEvent.click(await body().findByRole("menuitem", { name: /^Label/ }));
    await body().findByRole("dialog", { name: "From data" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        expect(body().queryByRole("dialog", { name: "From data" })).toBeNull();
    });
});

/** A label entry reading the name, with the element's count (`#/inspector-group-set-path-row/label-two`). */
export const LabelBound: Story = styleStory(async (canvasElement, element) => {
    await userEvent.click(nodes(canvasElement).getByRole("button", { name: "Add to node text" }));
    await userEvent.click(await body().findByRole("menuitem", { name: /^Label/ }));
    await userEvent.click(await body().findByRole("option", { name: "name" }));
    await nodes(canvasElement).findByRole("button", { name: /^Label source: / });
    await element.waitForStableFrame();
});
