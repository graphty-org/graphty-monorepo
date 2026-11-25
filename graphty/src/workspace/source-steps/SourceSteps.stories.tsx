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
/** HR's list: B1 and B2 name another department than people.csv does. */
const HR = "badge,dept\nB1,Operations\nB2,Research\nB3,Sales";

type Story = StoryObj<typeof Workspace>;
type Context = Parameters<NonNullable<Story["play"]>>[0];

/**
 * The story's session, with people in the graph as type person and one more file staged.
 * @param context - the play's context.
 * @param name - the staged file's name.
 * @param text - its contents.
 * @returns the session.
 */
async function staged(context: Context, name: string, text: string): Promise<GraphSession> {
    await customElements.whenDefined("graphty-element");
    const element = context.canvasElement.ownerDocument.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    );
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    const { session } = element;
    await session.layout.setDimension("2d");
    await session.layout.set("circular", { options: { scale: 0.2 } });
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    await session.data.stage({ type: "csv", config: { data: text }, name });
    storeOf(context).set({ dockOpen: false, dockMaximized: false });
    await within(context.canvasElement).findByRole("region", { name });
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
 * Opens the Join card from the staged section and picks Key of person and the source's badge.
 * @param context - the play's context.
 * @param name - the staged file's name.
 * @returns the card.
 */
async function pickBadge(context: Context, name: string): Promise<HTMLElement> {
    const canvas = within(context.canvasElement);
    const section = canvas.getByRole("region", { name });
    await userEvent.click(within(section).getByRole("button", { name: /^Join/ }));
    const card = await canvas.findByRole("form", { name: "Join" });
    await choose(card, "Field 1 type", "person");
    await choose(card, "Field 1 field", "Key");
    await choose(card, "Field 2 field", "badge");
    return card;
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

/** A second file arrives staged in its own section: rows are, key, counts, Join and Add. */
export const StagedSource: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "entries.csv", ENTRIES);
        const section = within(context.canvasElement).getByRole("region", { name: "entries.csv" });
        await within(section).findByLabelText("Distinct");
    },
};

/** The Join card on Key of person and the entries' badge: its live counts and the dock's Fields tab. */
export const PickFields: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "entries.csv", ENTRIES);
        await pickBadge(context, "entries.csv");
        const fields = await within(context.canvasElement).findByRole("tab", { name: "Fields" });
        await waitFor(() => {
            if (fields.getAttribute("aria-selected") !== "true") {
                throw new Error("the dock shows the Fields tab");
            }
        });
    },
};

/** HR's list merged into people: the preview, dept's Values differ, and its cells in the dock. */
export const PreviewValuesDiffer: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "hr.csv", HR);
        const card = await pickBadge(context, "hr.csv");
        await userEvent.click(within(card).getByRole("radio", { name: "Merge 2 into 1" }));
        await userEvent.click(within(card).getByRole("button", { name: /^Preview/ }));
        const section = await within(card).findByRole("region", { name: "Preview" });
        await userEvent.click(within(section).getByRole("button", { name: "Show dept cells" }));
        await within(context.canvasElement).findByRole("grid", { name: "Cells" });
    },
};

/** After the entries are committed as edges to people: the Steps list. */
export const AfterCommitSteps: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        await staged(context, "entries.csv", ENTRIES);
        const card = await pickBadge(context, "entries.csv");
        await userEvent.click(within(card).getByRole("radio", { name: "Make an edge" }));
        await userEvent.click(within(card).getByRole("combobox", { name: "Edge type" }));
        await userEvent.keyboard("entered{Tab}");
        await userEvent.click(within(card).getByRole("button", { name: /^Preview/ }));
        await within(card).findByRole("region", { name: "Preview" });
        await userEvent.click(within(card).getByRole("button", { name: /^Commit/ }));
        const steps = await within(context.canvasElement).findByRole("list", { name: "Steps" });
        await waitFor(() => {
            if (within(steps).queryAllByRole("listitem").length !== 3) {
                throw new Error("Steps lists people, entries and the edges");
            }
        });
    },
};

/**
 * The join workspace (issue #9796): Edit joins opens the modal over the canvas with one card for
 * the staged entries, its match the element's guess; Connect makes the card's step, drawn in the
 * card's color in the preview.
 */
export const JoinWorkspace: Story = {
    ...freshStore(DOORS),
    play: async (context) => {
        const session = await staged(context, "entries.csv", ENTRIES);
        const canvas = within(context.canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: /^Edit joins/ }));
        const body = within(context.canvasElement.ownerDocument.body);
        const modal = await body.findByRole("dialog", { name: "Join" });
        await userEvent.click(within(modal).getByRole("radio", { name: "Connect" }));
        await waitFor(() => {
            if ((session.styles.shownDraft?.steps?.length ?? 0) === 0) {
                throw new Error("the card's step is drawn in its color");
            }
        });
        await session.styles.settled();
    },
};
