// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { Workspace } from "../Workspace";
import { GRAPH_FILE_GML, PLAIN_JSON, WIDE_JSON } from "./fixtures";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

const OPEN = { project: { name: "Les Miserables", id: 1 }, place: "data" } as const;

/**
 * Loads a file through the element's own import, laid out on a flat circle, which places the
 * nodes the same way every time, and waits for a stable frame.
 * @param canvasElement - the story's root.
 * @param source - what to import.
 * @returns the element.
 */
async function load(
    canvasElement: HTMLElement,
    source: Parameters<GraphtyElement["session"]["data"]["import"]>[0],
): Promise<GraphtyElement> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular", { options: { scale: 0.2 } });
    await element.session.data.import(source);
    await element.waitForStableFrame();
    return element;
}

/** The small graph file, as a reader would open it. */
const GRAPH_FILE = { type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } } as const;

/**
 * Opens a Data place row's menu (Shift+F10, the context menu's keyboard door) and waits for it.
 * @param canvasElement - the story's root.
 * @param name - the row's name.
 */
async function openMenu(canvasElement: HTMLElement, name: string): Promise<void> {
    const place = within(canvasElement).getByRole("region", { name: "Data place" });
    const row = await within(place).findByRole("treeitem", { name });
    row.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await within(document.body).findByRole("menu");
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Data place",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A new project with nothing loaded: Sources and Attributes are empty. */
export const NothingLoaded: Story = { args: { initialState: OPEN } };

/** A graph file: one source that holds a node table and an edge table (`#/data-place/graph-file`). */
export const GraphFile: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await load(canvasElement, GRAPH_FILE);
    },
};

/** A plain JSON file (`#/data-place/plain-json`). */
export const PlainJson: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await load(canvasElement, { type: "json", name: "people.json", config: { data: PLAIN_JSON } });
    },
};

/** An attribute picked: its row lit, its inspector open (`#/data-place/attributes`). */
export const AttributePicked: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await load(canvasElement, GRAPH_FILE);
        await userEvent.click(await within(canvasElement).findByRole("treeitem", { name: "group" }));
    },
};

/** A source's menu: Edit source... (Rename waits for graphty-element, #894). */
export const SourceMenu: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await load(canvasElement, GRAPH_FILE);
        await openMenu(canvasElement, "les-miserables.gml");
    },
};

/** A node attribute's menu: Add label line (Show in table appears with the table dock). */
export const AttributeMenu: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await load(canvasElement, GRAPH_FILE);
        await openMenu(canvasElement, "label");
    },
};

/** Past 15 attributes, Find appears above the list. */
export const ManyAttributes: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await load(canvasElement, { type: "json", name: "wide.json", config: { data: WIDE_JSON } });
    },
};
