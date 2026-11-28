// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import { setDefaultFeatures } from "@graphty/graphty-element/extend";
import type { GraphSession } from "@graphty/graphty-element/session";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { loadSiteConfig, resetSiteConfig } from "../../siteConfig";
import { freshStore, storeOf } from "../../stories/freshStore";
import { paintSettled } from "../../stories/paintSettled";
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
 * Opens the join workspace by Join +.
 * @param context - the play's context.
 * @returns the workspace.
 */
async function openJoin(context: Context): Promise<HTMLElement> {
    await userEvent.click(within(context.canvasElement).getByRole("button", { name: "Join" }));
    return within(context.canvasElement.ownerDocument.body).findByRole("dialog", { name: "Join" });
}

/**
 * Picks one field in a field list, whose options also say each field's facts.
 * @param modal - the workspace.
 * @param name - the list.
 * @param field - the field.
 */
async function pickField(modal: HTMLElement, name: string, field: string): Promise<void> {
    await userEvent.click(within(modal).getByRole("combobox", { name }));
    const named = new RegExp(`^${field}( |$)`);
    await userEvent.click(await within(modal.ownerDocument.body).findByRole("option", { name: named }));
}

/**
 * Picks two sources and a field of each on the selected card, or on a further match of it.
 * @param modal - the workspace.
 * @param one - the first source and its field.
 * @param two - the second one and its field, the field null for new nodes.
 * @param place - the match's place, from 1.
 */
async function match(
    modal: HTMLElement,
    one: readonly [string, string],
    two: readonly [string, string | null],
    place = 1,
): Promise<void> {
    const of = (word: string): string => (place === 1 ? word : `Match ${String(place)} ${word.toLowerCase()}`);
    await choose(modal, of("Source 1"), one[0]);
    await choose(modal, of("Source 2"), two[0]);
    await pickField(modal, of("Field 1"), one[1]);
    if (two[1] !== null) {
        await pickField(modal, of("Field 2"), two[1]);
    }
}

/**
 * Adds a match to the selected card.
 * @param modal - the workspace.
 * @param one - the first source and its field.
 * @param two - the second one and its field, the field null for new nodes.
 */
async function addMatch(
    modal: HTMLElement,
    one: readonly [string, string],
    two: readonly [string, string | null],
): Promise<void> {
    await userEvent.click(within(modal).getByRole("button", { name: "+ Match" }));
    await match(modal, one, two, 2);
}

/**
 * Says how the selected card joins.
 * @param modal - the workspace.
 * @param words - the way, as the card words it.
 */
async function joinAs(modal: HTMLElement, words: string): Promise<void> {
    await userEvent.click(await within(modal).findByRole("radio", { name: words }));
}

/**
 * Opens the join workspace and matches people and the staged source by badge.
 * @param context - the play's context.
 * @param source - the staged source.
 * @returns the workspace.
 */
async function pickBadge(context: Context, source: string): Promise<HTMLElement> {
    const modal = await openJoin(context);
    await match(modal, ["people", "badge"], [source, "badge"]);
    return modal;
}

const ENTRY_NODES = "Node per entries row, linked to people";

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

/** Two sources and a field of each picked: the rows of both lined up under the graph, and how they can be joined. */
export const PickFields: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "entries.csv", ENTRIES);
        const modal = await pickBadge(context, "entries");
        await within(modal).findByRole("grid", { name: "people" });
        await within(modal).findByRole("radiogroup", { name: "Join as" });
    },
};

/** HR's list merged into people: dept's values differ, its cells in the table with Use existing and Use incoming. */
export const PreviewValuesDiffer: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "hr.csv", HR);
        const modal = await pickBadge(context, "hr");
        await joinAs(modal, "Fields of hr on people");
        await userEvent.click(await within(modal).findByRole("button", { name: "Cells dept" }));
        await within(modal).findByRole("grid", { name: "Cells" });
    },
};

/** After a join is committed, the workspace lists it, one line, and its card reads back as it was made. */
export const AfterCommitSteps: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        let modal = await pickBadge(context, "entries");
        await joinAs(modal, ENTRY_NODES);
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        const body = within(context.canvasElement.ownerDocument.body);
        await waitFor(() => {
            if (body.queryByRole("dialog", { name: "Join" }) !== null) {
                throw new Error("Done closes the workspace");
            }
        });
        modal = await openJoin(context);
        await userEvent.click(await within(modal).findByRole("gridcell", { name: "people + entries" }));
        await within(modal).findByRole("radio", { checked: true, name: ENTRY_NODES });
        await session.styles.settled();
        // The clicked card's focus ring is a rounded outline: drawn as part of a partial repaint, its
        // corners come out a level off from one load to the next (#10467). Draw the page whole.
        await paintSettled(context.canvasElement.ownerDocument);
    },
};

/**
 * The join workspace (issue #9796): Join + opens the modal over the canvas; two sources, a field of each
 * and how to join them make the card's step, drawn in the card's color over the graph as it is.
 */
export const JoinWorkspace: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        const modal = await pickBadge(context, "entries");
        await joinAs(modal, ENTRY_NODES);
        await waitFor(() => {
            if ((session.styles.shownDraft?.steps?.length ?? 0) === 0) {
                throw new Error("the card's step is drawn in its color");
            }
        });
        await session.styles.settled();
    },
};

/** A new card: two blank pickers over the graph as it is. */
export const JoinWorkspaceBlank: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        const modal = await openJoin(context);
        await within(modal).findByRole("gridcell", { name: "New join" });
        await expect(within(modal).queryByRole("grid", { name: "people" })).toBeNull();
        await session.styles.settled();
    },
};

/** Two sources picked: their rows side by side, each field's facts in its header, the likeliest pair marked. */
export const JoinWorkspaceTables: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        const modal = await openJoin(context);
        await choose(modal, "Source 1", "people");
        await choose(modal, "Source 2", "entries");
        await within(modal).findByRole("grid", { name: "entries" });
        await waitFor(async () => {
            await expect(within(modal).getAllByRole("img", { name: "suggested" })).toHaveLength(2);
        });
        await session.styles.settled();
    },
};

/** Fields picked: what the matches can make, in words that say what appears, none picked. */
export const JoinWorkspaceEachRowBecomes: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "doors.csv", DOORS_CSV);
        await staged(context, "entries.csv", ENTRIES, false);
        const modal = await pickBadge(context, "entries");
        await addMatch(modal, ["entries", "door"], ["doors", "door"]);
        const ways = await within(modal).findByRole("radiogroup", { name: "Join as" });
        await expect(within(ways).queryByRole("radio", { checked: true })).toBeNull();
    },
};

/** Each entry an edge between its person and its door, from one card of two matches. */
export const JoinWorkspaceEdge: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "doors.csv", DOORS_CSV);
        await staged(context, "entries.csv", ENTRIES, false);
        const modal = await pickBadge(context, "entries");
        await addMatch(modal, ["entries", "door"], ["doors", "door"]);
        await joinAs(modal, "Edge per entries row, people to doors");
        await userEvent.click(await within(modal).findByRole("button", { name: "Expand Advanced" }));
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
        const modal = await pickBadge(context, "entries");
        await addMatch(modal, ["entries", "door"], ["doors", "door"]);
        await joinAs(modal, "Node per entries row, linked to people and doors");
        await userEvent.click(await within(modal).findByRole("button", { name: "Expand Advanced" }));
        const direction = await within(modal).findByRole<HTMLInputElement>("combobox", { name: "Direction" });
        await waitFor(async () => {
            await expect(direction.value).toBe("people -> entries -> doors");
        });
        await session.styles.settled();
    },
};

/** A column's values made nodes, split on a separator. */
export const JoinWorkspaceNewNodes: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "shifts.csv", TAGGED);
        const modal = await openJoin(context);
        await match(modal, ["shifts", "tags"], ["As new nodes", null]);
        await joinAs(modal, "Node per tags, linked to shifts");
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

/** Shifts linked by the one they share, with the hub cap and the minimum shared. */
export const JoinWorkspaceSharedValue: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "shifts.csv", TAGGED);
        const modal = await openJoin(context);
        await match(modal, ["shifts", "shift"], ["shifts", "shift"]);
        await joinAs(modal, "Edge between shifts sharing shift");
        await within(modal).findByRole("combobox", { name: "Max nodes per value" });
        await session.styles.settled();
    },
};

/** Several joins, one line each, with a source added as it is. */
export const JoinList: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "doors.csv", DOORS_CSV);
        await staged(context, "entries.csv", ENTRIES, false);
        const modal = await openJoin(context);
        await choose(modal, "Source 1", "doors");
        await userEvent.click(await within(modal).findByRole("button", { name: "Add as is" }));
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await match(modal, ["people", "badge"], ["entries", "badge"]);
        await joinAs(modal, ENTRY_NODES);
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        const list = await within(modal).findByRole("grid", { name: "Joins" });
        await waitFor(async () => {
            await expect(within(list).getAllByRole("row")).toHaveLength(3);
        });
        await session.styles.settled();
    },
};

/** The Data sidebar's Join: every join made, one line each, under its header. */
export const JoinSidebarList: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        await staged(context, "shifts.csv", TAGGED, false);
        const [entries, shifts] = session.data.staged().map((each) => each.key);
        const draft = session.data.draft();
        draft.connect({ from: { source: entries, field: "badge" }, into: { space: "person" } });
        draft.extract(shifts, { column: "tags", split: ";" });
        await draft.commit();
        const list = await within(context.canvasElement).findByRole("grid", { name: "Joins" });
        await waitFor(async () => {
            await expect(within(list).getAllByRole("row")).toHaveLength(2);
        });
        await session.styles.settled();
    },
};

/** Adding a staged source as it is: the workspace lists it, one line. */
export const JoinWorkspaceAddStaged: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "doors.csv", DOORS_CSV);
        const modal = await openJoin(context);
        await choose(modal, "Source 1", "doors");
        await userEvent.click(await within(modal).findByRole("button", { name: "Add as is" }));
        await within(modal).findByRole("gridcell", { name: "doors, added" });
        await session.styles.settled();
    },
};

/** Removing a source from its menu: the workspace names what goes with it before Done. */
export const JoinWorkspaceRemoveSource: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        const modal = await pickBadge(context, "entries");
        await joinAs(modal, ENTRY_NODES);
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
        await within(removal).findByRole("region", { name: "Remove people" });
        await session.styles.settled();
    },
};
