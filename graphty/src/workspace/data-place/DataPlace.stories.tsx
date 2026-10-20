// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { storyWaitOptions } from "../../stories/wait";
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
    const row = await within(place).findByRole("listitem", { name }, storyWaitOptions(1000));
    row.querySelector("button")?.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await within(document.body).findByRole("menu", {}, storyWaitOptions(1000));
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

/** An event table: Fields shows its Source and Target, the kinds of its ends and the weight. */
export const EventTable: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadLog(canvasElement);
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

/** Two sources: the Filters "+" offers Data source. */
export const TwoSources: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadLog(canvasElement);
        await element.session.data.import({ config: { file: new File([HOSTS_CSV], "hosts.csv") } }, { mode: "merge" });
        await element.waitForStableFrame();
        await userEvent.click(
            await within(canvasElement).findByRole("button", { name: "Add filter" }, storyWaitOptions(1000)),
        );
        await within(document.body).findByRole("menuitem", { name: "Data source" }, storyWaitOptions(1000));
    },
};
