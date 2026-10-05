// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, waitFor, within } from "storybook/test";

import { createWorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";
import { type DataPageRequest, openDataPage } from "./request";

/** Les Miserables, cut to its first five characters. */
const GML = `graph [
  directed 0
  node [ id 0 label "Myriel" ]
  node [ id 1 label "Napoleon" ]
  node [ id 2 label "Mlle Baptistine" ]
  node [ id 3 label "Mme Magloire" ]
  node [ id 4 label "Valjean" ]
  edge [ source 1 target 0 value 1 ]
  edge [ source 2 target 0 value 8 ]
  edge [ source 3 target 0 value 10 ]
  edge [ source 3 target 2 value 6 ]
  edge [ source 4 target 0 value 5 ]
]`;
const ACCOUNTS = "id,owner,branch\nA1,Ann,North\nA2,Bo,South\nA3,Cy,North\nA4,Di,East\n";
/** One transfer names A9, which the account file does not hold. */
const TRANSFERS = "from,to,amount\nA1,A2,120\nA2,A3,75\nA3,A1,40\nA4,A9,300\n";
/** Trips between stations, under linking columns the element does not recognize. */
const TRIPS = "from_station,to_station,trips\nx,y,10\ny,z,3\nz,x,7\n";
/** A plain JSON graph: a node list and an edge list. */
const JSON_PLAIN = JSON.stringify({
    nodes: [
        { id: "a", name: "Ann" },
        { id: "b", name: "Bo" },
        { id: "c", name: "Cy" },
    ],
    edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ],
});

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Data page",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The project open when a door inside a project opens the page. */
const OPEN_PROJECT = { name: "Les Miserables", id: 1 };

/**
 * Waits until the page has read its source: the sample grid, or the problem block.
 * @param canvasElement - the story's root.
 */
async function read(canvasElement: HTMLElement): Promise<void> {
    await waitFor(
        () => {
            if (canvasElement.querySelector('[role="grid"] [role="gridcell"], [role="alert"]') === null) {
                throw new Error("still reading");
            }
        },
        { timeout: 10_000 },
    );
}

/**
 * A story that opens the Data page as a data door does, once the element is up. A new graph
 * opens from the start screen, with no project; an add opens inside a project.
 * @param request - what the door hands over.
 * @param after - what the reader does next, if anything.
 * @returns the story.
 */
function pageStory(request: DataPageRequest, after?: (canvas: ReturnType<typeof within>) => Promise<void>): Story {
    const store = createWorkspaceStore(request.intent === "add" ? { project: OPEN_PROJECT } : {});
    return {
        args: { store },
        play: async ({ canvasElement }) => {
            await customElements.whenDefined("graphty-element");
            store.set({ page: "panels" });
            openDataPage(store, request);
            if (request.files !== undefined && request.files.length > 0) {
                await read(canvasElement);
            }
            await after?.(within(canvasElement));
        },
    };
}

/**
 * Reads an address typed into From a URL... under Tables "+".
 * @param canvas - the story's canvas.
 * @param address - the address.
 * @param submit - whether to press Read.
 */
async function enterUrl(canvas: ReturnType<typeof within>, address: string, submit: boolean): Promise<void> {
    await userEvent.click(await canvas.findByRole("button", { name: "Add a table" }));
    await userEvent.click(await within(document.body).findByRole("menuitem", { name: "From a URL..." }));
    await userEvent.type(await within(document.body).findByRole("textbox", { name: "Address" }), address);
    if (submit) {
        await userEvent.click(within(document.body).getByRole("button", { name: "Read" }));
    }
}

/** New from data... with nothing chosen yet: one gray line with the way in (`#/data-page/empty`). */
export const Empty: Story = pageStory({ intent: "new" });

/** A graph file: one row that expands to its tables, every check green, focus on Load (`#/data-page/graph-file`). */
export const GraphFile: Story = pageStory({ intent: "new", files: [new File([GML], "les-miserables.gml")] });

/** A plain JSON graph file (`#/data-page/json-plain`). */
export const JsonPlain: Story = pageStory({ intent: "new", files: [new File([JSON_PLAIN], "friends.json")] });

/** One plain edge list: From and To on its two linking columns, the weight line (`#/data-page/edge-list`). */
export const EdgeList: Story = pageStory({ intent: "new", files: [new File([TRANSFERS], "transfers.csv")] });

/** A node table and an edge table, with the match report (`#/data-page/transfers`). */
export const Transfers: Story = pageStory({
    intent: "new",
    files: [new File([ACCOUNTS], "account.csv"), new File([TRANSFERS], "transfers.csv")],
});

/** A column's role menu open on the node table (`#/data-page/role-menu`). */
export const RoleMenu: Story = pageStory(
    { intent: "new", files: [new File([ACCOUNTS], "account.csv"), new File([TRANSFERS], "transfers.csv")] },
    async (canvas) => {
        await userEvent.click(await canvas.findByRole("combobox", { name: "owner" }));
        await within(document.body).findByRole("option", { name: "Name" });
    },
);

/** The match report's unmatched rows, all of them, in the grid (`#/data-page/unmatched-rows`). */
export const UnmatchedRows: Story = pageStory(
    { intent: "new", files: [new File([ACCOUNTS], "account.csv"), new File([TRANSFERS], "transfers.csv")] },
    async (canvas) => {
        await userEvent.click(await canvas.findByRole("button", { name: "Show the 1 unmatched row" }));
        await canvas.findByText("1 unmatched row");
    },
);

/** File settings open: the format, a CSV's separator and the error limit (`#/data-page/file-settings`). */
export const FileSettings: Story = pageStory(
    { intent: "new", files: [new File([TRANSFERS], "transfers.csv")] },
    async (canvas) => {
        await userEvent.click(await canvas.findByRole("button", { name: /^File settings/ }));
        await within(document.body).findByRole("combobox", { name: "Format" });
    },
);

/** From a URL... under Tables "+", an address typed in (`#/data-page/url`). */
export const Url: Story = pageStory({ intent: "new" }, async (canvas) => {
    await enterUrl(canvas, "https://example.com/transfers.csv", false);
});

/** A file whose kind the element cannot tell: pick its format in File settings (`#/data-page/detect-none`). */
export const DetectNone: Story = pageStory({ intent: "new", files: [new File(["hello"], "notes.xyz")] });

/** An edge list whose linking columns the element did not find, naming the columns it has (`#/data-page/refused-endpoints`). */
export const RefusedEndpoints: Story = pageStory({ intent: "new", files: [new File([TRIPS], "trips.csv")] });

/** An empty file: one problem block with Choose another file... (`#/data-page/refused-empty`). */
export const RefusedEmpty: Story = pageStory({ intent: "new", files: [new File([""], "empty.csv")] });

/** A file that does not parse as its format (`#/data-page/refused-parse`). */
export const RefusedParse: Story = pageStory({ intent: "new", files: [new File(["graph ["], "ring.gml")] });

/** An address that cannot be fetched (`#/data-page/refused-fetch`). */
export const RefusedFetch: Story = pageStory({ intent: "new" }, async (canvas) => {
    await enterUrl(canvas, "/no-such-file.csv", true);
    await canvas.findByRole("alert", {}, { timeout: 10_000 });
});

/** Adding to the open project: the title names it (`Add to <project>`). */
export const AddToProject: Story = pageStory({ intent: "add", files: [new File([TRANSFERS], "transfers.csv")] });
