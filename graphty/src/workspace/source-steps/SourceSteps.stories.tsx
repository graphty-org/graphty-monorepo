// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import { setDefaultFeatures } from "@graphty/graphty-element/extend";
import type { GraphSession } from "@graphty/graphty-element/session";
import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, waitFor, within } from "storybook/test";

import { loadSiteConfig, resetSiteConfig } from "../../siteConfig";
import { freshStore, storeOf } from "../../stories/freshStore";
import { siteFeatures } from "../../test/siteFeatures";
import { Workspace } from "../Workspace";

/** T0 is the test badge. */
const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales\nT0,Test badge,QA";
/** B9 badges no person, b3 is B3 typed in lower case. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE5,b3,D3\nE6,B2,D2\nE7,T0,D1";
/** Doors, named by the entries. */
const DOORS_CSV = "door,title\nD1,North\nD2,South\nD3,Yard";
/** One row per badge and tag. */
const TAGGED = "badge,shift,tags\nB1,day,key;night\nB2,night,night\nB3,day,key\nT0,day,test";
/** HR's list: B1 and B2 name another department than people.csv does. */
const HR = "badge,dept\nB1,Operations\nB2,Research\nB3,Sales";

type Story = StoryObj<typeof Workspace>;
type Context = Parameters<NonNullable<Story["play"]>>[0];

/**
 * The story's session, with people in the graph as type person and one more file staged.
 * @param context - the play's context.
 * @param name - the staged file's name.
 * @param text - its contents.
 * @param first - whether it is the story's first file, people going into the graph before it.
 * @returns the session.
 */
async function staged(context: Context, name: string, text: string, first = true): Promise<GraphSession> {
    await customElements.whenDefined("graphty-element");
    const element = context.canvasElement.ownerDocument.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    );
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    const { session } = element;
    if (first) {
        await session.layout.setDimension("2d");
        await session.layout.set("circular", { options: { scale: 0.2 } });
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
    }
    await session.data.stage({ type: "csv", config: { data: text }, name });
    storeOf(context).set({ dockOpen: false, dockMaximized: false });
    await within(context.canvasElement).findByRole("listitem", { name });
    return session;
}

/**
 * Clicks a select open and clicks one of its options.
 * @param where - where the select is.
 * @param name - the select's name.
 * @param option - the option.
 */
async function choose(where: HTMLElement, name: string, option: string): Promise<void> {
    await userEvent.click(within(where).getByRole("combobox", { name }));
    await userEvent.click(await within(where.ownerDocument.body).findByRole("option", { name: option }));
}

/**
 * Opens the join workspace by Join + and picks Key of person and the staged source's badge on its
 * card.
 * @param context - the play's context.
 * @returns the workspace.
 */
async function pickBadge(context: Context): Promise<HTMLElement> {
    const canvas = within(context.canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Join" }));
    const modal = await within(context.canvasElement.ownerDocument.body).findByRole("dialog", { name: "Join" });
    await choose(modal, "In graph type", "person");
    await choose(modal, "In graph field", "Key");
    await choose(modal, "Incoming field", "badge");
    return modal;
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Source steps",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // The source-steps experiment on, as a site whose site.json names it; put back afterwards.
    beforeEach: async () => {
        setDefaultFeatures(["source-steps"]);
        await siteFeatures(["source-steps"]);
        return async () => {
            setDefaultFeatures([]);
            resetSiteConfig();
            await loadSiteConfig();
        };
    },
};

export default meta;

const DOORS = { project: { name: "Doors", id: 1 }, place: "data" } as const;

/**
 * A second file arrives staged as its own entry in the Data sources list, opened to how its rows
 * are read (Rows are, Key); "Join +" sits below every source.
 */
export const StagedSource: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "entries.csv", ENTRIES);
        const entry = within(context.canvasElement).getByRole("listitem", { name: "entries.csv" });
        const toggle = entry.querySelector<HTMLElement>("[aria-expanded=false]");
        if (toggle !== null) {
            await userEvent.click(toggle);
        }
        await within(entry).findByRole("radiogroup", { name: "Rows are" });
    },
};

/** The workspace card picking Key of person and the entries' badge, its values in the table. */
export const PickFields: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "entries.csv", ENTRIES);
        const modal = await pickBadge(context);
        await within(modal).findByRole("grid", { name: "Values" });
    },
};

/** HR's list merged into people: dept's values differ, its cells in the table with Pick 1 and Pick 2. */
export const PreviewValuesDiffer: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "hr.csv", HR);
        const modal = await pickBadge(context);
        await userEvent.click(within(modal).getByRole("radio", { name: "Fields on a node" }));
        await userEvent.click(await within(modal).findByRole("button", { name: "Cells dept" }));
        await within(modal).findByRole("grid", { name: "Cells" });
    },
};

/** After a join is committed, the workspace lists every step as a card, the Add steps too. */
export const AfterCommitSteps: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        let modal = await pickBadge(context);
        await userEvent.click(within(modal).getByRole("radio", { name: "A node linked to what it names" }));
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        const body = within(context.canvasElement.ownerDocument.body);
        await waitFor(() => {
            if (body.queryByRole("dialog", { name: "Join" }) !== null) {
                throw new Error("Done closes the workspace");
            }
        });
        await userEvent.click(within(context.canvasElement).getByRole("button", { name: "Join" }));
        modal = await body.findByRole("dialog", { name: "Join" });
        await within(modal).findByRole("region", { name: "entries.csv -> Connect" });
        await session.styles.settled();
    },
};

/**
 * The join workspace (issue #9796): Join + opens the modal over the canvas with one card for
 * the staged entries, its match the element's guess; Connect makes the card's step, drawn in the
 * card's color in the preview.
 */
export const JoinWorkspace: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        const canvas = within(context.canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: "Join" }));
        const body = within(context.canvasElement.ownerDocument.body);
        const modal = await body.findByRole("dialog", { name: "Join" });
        await userEvent.click(within(modal).getByRole("radio", { name: "A node linked to what it names" }));
        await waitFor(() => {
            if ((session.styles.shownDraft?.steps?.length ?? 0) === 0) {
                throw new Error("the card's step is drawn in its color");
            }
        });
        await session.styles.settled();
    },
};

/**
 * Opens the join workspace by Join +.
 * @param context - the play's context.
 * @returns the workspace.
 */
async function openJoin(context: Context): Promise<HTMLElement> {
    await userEvent.click(within(context.canvasElement).getByRole("button", { name: "Join" }));
    return within(context.canvasElement.ownerDocument.body).findByRole("dialog", { name: "Join" });
}

/** A card with no guess asks only what each row becomes, then how its rows are read. */
export const JoinWorkspaceEachRowBecomes: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "doors.csv", DOORS_CSV);
        const modal = await openJoin(context);
        await within(modal).findByRole("radiogroup", { name: "Each row becomes" });
        await within(modal).findByRole("button", { name: "Add as is" });
    },
};

/** Each entry an edge between its person and its door, Existing edge and Direction under the two ends. */
export const JoinWorkspaceEdge: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "doors.csv", DOORS_CSV);
        await staged(context, "entries.csv", ENTRIES, false);
        const modal = await openJoin(context);
        await userEvent.click(within(modal).getByRole("radio", { name: "An edge between two nodes" }));
        await choose(modal, "Other end field", "door");
        await choose(modal, "Other end type", "doors.csv");
        await within(modal).findByRole("radiogroup", { name: "Existing edge" });
        await session.styles.settled();
    },
};

/** Each entry kept as a node between the person and the door it names. */
export const JoinWorkspaceKeepMiddle: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "doors.csv", DOORS_CSV);
        await staged(context, "entries.csv", ENTRIES, false);
        const modal = await openJoin(context);
        await userEvent.click(within(modal).getByRole("button", { name: "+ Match" }));
        await choose(modal, "Other end field", "door");
        await choose(modal, "Other end type", "doors.csv");
        await userEvent.click(within(modal).getByRole("radio", { name: "A node linked to what it names" }));
        await within(modal).findByRole("button", { name: "Remove Other end" });
        await within(modal).findByText("1->2->3");
        await session.styles.settled();
    },
};

/** A column's values made nodes, split on a separator. */
export const JoinWorkspaceNewNodes: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "shifts.csv", TAGGED);
        const modal = await openJoin(context);
        await userEvent.click(within(modal).getByRole("radio", { name: "A node linked to what it names" }));
        await choose(modal, "In graph type", "New nodes");
        await choose(modal, "Incoming field", "tags");
        const split = await within(modal).findByRole("combobox", { name: "Split on" });
        await userEvent.type(split, ";{Enter}");
        await waitFor(() => {
            if (session.data.currentDraft()?.steps().at(-1)?.extract?.split !== ";") {
                throw new Error("the tags are split");
            }
        });
        await session.styles.settled();
    },
};

/** People linked by the department they share, with the hub cap and the minimum shared. */
export const JoinWorkspaceSharedValue: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "shifts.csv", TAGGED);
        const modal = await openJoin(context);
        await userEvent.click(within(modal).getByRole("radio", { name: "Links between nodes sharing a value" }));
        await userEvent.click(within(modal).getByLabelText("Shared field", { selector: "input" }));
        const body = within(context.canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole("option", { name: "shift" }));
        await within(modal).findByRole("combobox", { name: "Hub cap" });
        await userEvent.keyboard("{Escape}");
        await session.styles.settled();
    },
};

/** Adding a staged source as it is: the workspace lists it as a card beside people's. */
export const JoinWorkspaceAddStaged: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "doors.csv", DOORS_CSV);
        const modal = await openJoin(context);
        await userEvent.click(await within(modal).findByRole("button", { name: "Add as is" }));
        await within(modal).findByRole("region", { name: "doors.csv -> Added" });
        await session.styles.settled();
    },
};

/** Removing a source from its menu: the workspace names what goes with it before Done. */
export const JoinWorkspaceRemoveSource: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        const modal = await pickBadge(context);
        await userEvent.click(within(modal).getByRole("radio", { name: "A node linked to what it names" }));
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        const body = within(context.canvasElement.ownerDocument.body);
        await waitFor(() => {
            if (body.queryByRole("dialog", { name: "Join" }) !== null) {
                throw new Error("Done closes the workspace");
            }
        });
        const people = session.data.sources()[0]?.key ?? "";
        storeOf(context).set({ joinWorkspace: { remove: people } });
        const removal = await body.findByRole("dialog", { name: "Join" });
        await within(removal).findByRole("region", { name: "Remove people.csv" });
        await session.styles.settled();
    },
};
