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

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Data page",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A story that opens the Data page on files, as a data door does, once the element is up.
 * @param request - what the door hands over.
 * @param after - what the reader does next, if anything.
 * @returns the story.
 */
function pageStory(request: DataPageRequest, after?: (canvas: ReturnType<typeof within>) => Promise<void>): Story {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    return {
        args: { store },
        play: async ({ canvasElement }) => {
            await customElements.whenDefined("graphty-element");
            store.set({ page: "panels" });
            openDataPage(store, request);
            const canvas = within(canvasElement);
            if (request.files !== undefined && request.files.length > 0) {
                // Read: the sample grid, or the problem block.
                await waitFor(
                    () => {
                        if (canvasElement.querySelector('[role="grid"] [role="gridcell"], [role="alert"]') === null) {
                            throw new Error("still reading");
                        }
                    },
                    { timeout: 10_000 },
                );
            }
            await after?.(canvas);
        },
    };
}

/** New from data... with nothing chosen yet: one gray line with the way in (`#/data-page/empty`). */
export const Empty: Story = pageStory({ intent: "new" });

/** A graph file: both tables set by the file, every check green, focus on Load (`#/data-page/graph-file`). */
export const GraphFile: Story = pageStory({ intent: "new", files: [new File([GML], "les-miserables.gml")] });

/** One plain edge list: From and To on its two linking columns, the weight line (`#/data-page/edge-list`). */
export const EdgeList: Story = pageStory({ intent: "new", files: [new File([TRANSFERS], "transfers.csv")] });

/** A node table and an edge table, with the match report (`#/data-page/transfers`). */
export const Transfers: Story = pageStory({
    intent: "new",
    files: [new File([ACCOUNTS], "account.csv"), new File([TRANSFERS], "transfers.csv")],
});

/** The match report's unmatched rows, all of them, in the grid (`#/data-page/unmatched-rows`). */
export const UnmatchedRows: Story = pageStory(
    { intent: "new", files: [new File([ACCOUNTS], "account.csv"), new File([TRANSFERS], "transfers.csv")] },
    async (canvas) => {
        await userEvent.click(await canvas.findByRole("button", { name: "Show the 1 unmatched row" }));
        await canvas.findByText("1 unmatched row");
    },
);

/** File settings open: the format and a CSV's separator (`#/data-page/file-settings`). */
export const FileSettings: Story = pageStory(
    { intent: "new", files: [new File([TRANSFERS], "transfers.csv")] },
    async (canvas) => {
        await userEvent.click(await canvas.findByRole("button", { name: /^File settings/ }));
        await within(document.body).findByRole("textbox", { name: "Format" });
    },
);

/** An edge list whose linking columns the element did not find: Load waits for From and To (`#/data-page/refused-endpoints`). */
export const RefusedEndpoints: Story = pageStory({ intent: "new", files: [new File([TRIPS], "trips.csv")] });

/** A file with nothing in it: one problem block with Choose another file... (`#/data-page/refused-empty`). */
export const RefusedEmpty: Story = pageStory({ intent: "new", files: [new File(["<graphml"], "broken.graphml")] });

/** Adding to the open project: the title names it (`Add to <project>`). */
export const AddToProject: Story = pageStory({ intent: "add", files: [new File([TRANSFERS], "transfers.csv")] });
