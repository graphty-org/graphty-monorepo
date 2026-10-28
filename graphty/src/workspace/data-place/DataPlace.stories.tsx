// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../Workspace";
import { AUTH_LOG_CSV, GRAPH_FILE_GML, HOSTS_CSV, PLAIN_JSON } from "./fixtures";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

const OPEN = { project: { name: "Les Miserables", id: 1 }, place: "data" } as const;

/**
 * The story's element, laid out on a flat circle, which places the nodes the same way every time.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function ready(canvasElement: HTMLElement): Promise<GraphtyElement> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular", { options: { scale: 0.2 } });
    return element;
}

/**
 * Loads a file through the element's own import and waits for a stable frame.
 * @param canvasElement - the story's root.
 * @param source - what to import.
 * @returns the element.
 */
async function load(
    canvasElement: HTMLElement,
    source: Parameters<GraphtyElement["session"]["data"]["import"]>[0],
): Promise<GraphtyElement> {
    const element = await ready(canvasElement);
    await element.session.data.import(source);
    await element.waitForStableFrame();
    return element;
}

/** The small graph file, as a reader would open it. */
const GRAPH_FILE = { type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } } as const;

/**
 * Loads the auth log as edges from user to host, through a draft as a load screen does, so the
 * load keeps its roles and Fields can change them.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadLog(canvasElement: HTMLElement): Promise<GraphtyElement> {
    const element = await ready(canvasElement);
    const draft = await element.session.data.prepare({ config: { file: new File([AUTH_LOG_CSV], "auth-log.csv") } });
    await draft.load({ mapping: { rowsAre: "edges", source: "user", target: "host" } });
    await element.waitForStableFrame();
    return element;
}

/**
 * Opens a Sources row's menu (Shift+F10, the context menu's keyboard door) and waits for it.
 * @param canvasElement - the story's root.
 * @param name - the row's name.
 */
async function openMenu(canvasElement: HTMLElement, name: string): Promise<void> {
    const place = within(canvasElement).getByRole("region", { name: "Data place" });
    const row = await within(place).findByRole("listitem", { name });
    row.querySelector("button")?.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await within(document.body).findByRole("menu", {});
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Data place",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A new project with nothing loaded: Sources, Fields and Filters are empty. */
export const NothingLoaded: Story = { args: { initialState: OPEN } };

/** A graph file: one source with its node and edge chips (`#/data-place/graph-file`). */
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

/** An event table: Fields shows its fixed rows (Source, Target, Direction) and an empty list of fields. */
export const EventTable: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadLog(canvasElement);
    },
};

/**
 * Adds a field from a side's "+" as a reader does: "+", the kind, then a column from its list.
 * @param canvasElement - the story's root.
 * @param side - node or edge.
 * @param kind - the kind, as "+" lists it.
 * @param column - the column.
 */
async function addField(
    canvasElement: HTMLElement,
    side: "node" | "edge",
    kind: string,
    column: string,
): Promise<void> {
    const place = within(within(canvasElement).getByRole("region", { name: "Data place" }));
    await userEvent.click(await place.findByRole("button", { name: `Add to ${side} fields` }));
    await userEvent.click(await within(document.body).findByRole("menuitem", { name: kind }));
    await userEvent.click(await within(document.body).findByRole("option", { name: column }));
}

/** The edge "+" open on an event table: the kinds of field not listed yet. */
export const AddFieldMenu: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadLog(canvasElement);
        const place = within(within(canvasElement).getByRole("region", { name: "Data place" }));
        await userEvent.click(await place.findByRole("button", { name: "Add to edge fields" }));
        await within(document.body).findByRole("menuitem", { name: "Weight" });
    },
};

/** Fields added from "+": a weight with what a higher one means, and the kind of the source. */
export const FieldEntries: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadLog(canvasElement);
        // The kind first: it reads the load again.
        await addField(canvasElement, "edge", "Kind of source", "user");
        await addField(canvasElement, "edge", "Weight", "bytes");
        const place = within(within(canvasElement).getByRole("region", { name: "Data place" }));
        await userEvent.click(await place.findByRole("combobox", { name: "Higher weight means" }));
        await userEvent.click(await within(document.body).findByRole("option", { name: "farther" }));
        await waitFor(() => {
            if (element.session.config.data.knownFields.edgeWeightMeaning !== "distance") {
                throw new Error("the meaning is not written yet");
            }
        });
        await element.waitForStableFrame();
    },
};

/** A source's menu: the registered row commands and Rename. */
export const SourceMenu: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadLog(canvasElement);
        await openMenu(canvasElement, "auth-log.csv");
    },
};

/** Two sources: a filter step's Add a condition offers Data source. */
export const TwoSources: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadLog(canvasElement);
        await element.session.data.import({ config: { file: new File([HOSTS_CSV], "hosts.csv") } }, { mode: "merge" });
        await element.waitForStableFrame();
        await userEvent.click(await within(canvasElement).findByRole("button", { name: "Add filter step" }));
        await userEvent.click(await within(document.body).findByRole("button", { name: "Add a condition" }));
        await within(document.body).findByRole("option", { name: /^Data source(,|$)/ });
    },
};
