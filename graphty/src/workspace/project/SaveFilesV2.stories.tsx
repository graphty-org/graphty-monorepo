// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import { setDefaultFeatures } from "@graphty/graphty-element/extend";
import type { GraphSession } from "@graphty/graphty-element/session";
import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { loadSiteConfig, resetSiteConfig } from "../../siteConfig";
import { freshStore, storeOf } from "../../stories/freshStore";
import { siteFeatures } from "../../test/siteFeatures";
import type { WorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";
import { SAVE_AS_DIALOG } from "./actions";
import { askOpenV2, showReport } from "./saveV2";

/** A ring of eight people with two chords, as a CSV file the session reads. */
const RING_CSV = [
    "source,target",
    ...Array.from({ length: 8 }, (_, i) => `p${String(i)},p${String((i + 1) % 8)}`),
    "p0,p4",
    "p2,p6",
].join("\n");

/**
 * Reads the ring into the story's element as a file, adds a layer that picks two nodes, and waits
 * for a stable frame.
 * @param canvasElement - the story's root.
 * @returns the element's session.
 */
async function loadRing(canvasElement: HTMLElement): Promise<GraphSession> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.ownerDocument.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    const { session } = element;
    await session.layout.setDimension("2d");
    await session.layout.set("circular", { options: { scale: 0.2 } });
    await session.data.import({ type: "csv", config: { data: RING_CSV }, name: "ring.csv" });
    await session.styles.add({
        name: "Suspects",
        target: "node",
        selector: { match: "ids", nodes: ["p0", "p4"] },
        set: { "node.color": "#d9480f" },
    });
    await element.waitForStableFrame();
    return session;
}

/**
 * The story's store, with the ring loaded and no dialog open.
 * @param context - the play's context.
 * @returns the store and the session.
 */
async function ready(
    context: Parameters<NonNullable<Story["play"]>>[0],
): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = storeOf(context);
    store.set({ dialog: null });
    const session = await loadRing(context.canvasElement);
    return { store, session };
}

/**
 * Save as..., once graphty-element has said what each section holds.
 * @param context - the play's context.
 * @returns the dialog.
 */
async function saveAs(context: Parameters<NonNullable<Story["play"]>>[0]): Promise<HTMLElement> {
    const { store } = await ready(context);
    store.set({ dialog: SAVE_AS_DIALOG });
    const body = within(context.canvasElement.ownerDocument.body);
    const dialog = await body.findByRole("dialog", { name: "Save Ring as" });
    await within(dialog).findByRole("checkbox", { name: /^Data/ });
    return dialog;
}

/**
 * Opens a file as a version 2 file is opened: graphty-element reads it, and the Open dialog asks.
 * @param context - the play's context.
 * @param edit - changes the saved file before it is opened.
 */
async function openSaved(
    context: Parameters<NonNullable<Story["play"]>>[0],
    edit: (file: { sections: Record<string, Record<string, unknown>> }) => void = () => undefined,
): Promise<void> {
    const { store, session } = await ready(context);
    const file = JSON.parse((await session.project.save({ format: 2, results: true, markSaved: false })).text) as {
        sections: Record<string, Record<string, unknown>>;
    };
    edit(file);
    void askOpenV2(store, session, new File([JSON.stringify(file)], "ring.graphty.json"));
    const body = within(context.canvasElement.ownerDocument.body);
    await body.findByRole("dialog", { name: "Open ring.graphty.json" });
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Project/Save files v2",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // The save-files-v2 experiment on, as a site whose site.json names it; put back afterwards.
    beforeEach: async () => {
        setDefaultFeatures(["save-files-v2"]);
        await siteFeatures(["save-files-v2"]);
        return async () => {
            setDefaultFeatures([]);
            resetSiteConfig();
            await loadSiteConfig();
        };
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Save as..., the Everything preset: every section, with what graphty-element says each holds. */
export const SaveEverything: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        await saveAs(context);
    },
};

/** Save as..., the gear open: each source with copy or reference, and why one cannot be referenced. */
export const SaveEachSource: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        const dialog = await saveAs(context);
        await userEvent.click(within(dialog).getByRole("button", { name: "Each source" }));
        await within(dialog).findByText(/No file path to refer to/);
    },
};

/** Save as..., the Style only preset as a section file. */
export const SaveStyleOnly: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        const dialog = await saveAs(context);
        await userEvent.click(within(dialog).getByLabelText("Preset"));
        const body = within(context.canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole("option", { name: "Style only" }));
        // The segment's label is what a reader clicks; its radio is drawn under it.
        await userEvent.click(within(dialog).getByText("Section file"));
        await within(dialog).findByText("Ring.graphty-style.json");
    },
};

/** The report after saving the style alone: the layer that picks nodes is left out. */
export const SaveReportStyleOnly: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        const { store, session } = await ready(context);
        const { report } = await session.project.save({
            format: 2,
            sections: ["style"],
            form: "section",
            markSaved: false,
        });
        showReport(store, session, "Saved Ring.graphty-style.json", report.leftOut, new Map());
        await within(context.canvasElement.ownerDocument.body).findByRole("dialog", {
            name: "Saved Ring.graphty-style.json",
        });
    },
};

/** Open a full file: its sections, the runs rerun or restored. */
export const OpenFullFile: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        await openSaved(context);
    },
};

/** Open a full file whose style section is newer than this release: held, and said before opening. */
export const OpenHeldSection: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        await openSaved(context, (file) => {
            file.sections.style.version = 3;
        });
    },
};

/** Open a style section file: what it is, what it adds and what it needs from the open data. */
export const OpenStyleSectionFile: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        const { store, session } = await ready(context);
        const { text } = await session.project.save({
            format: 2,
            sections: ["style"],
            form: "section",
            markSaved: false,
        });
        // A fixed date, so the picture does not change from one day to the next.
        const fixed = JSON.parse(text, (key, value: unknown) =>
            key === "created" || key === "modified" ? "2026-11-01T12:00:00Z" : value,
        ) as unknown;
        void askOpenV2(store, session, new File([JSON.stringify(fixed)], "Ring.graphty-style.json"));
        await within(context.canvasElement.ownerDocument.body).findByRole("dialog", {
            name: "Add Ring.graphty-style.json",
        });
    },
};

/**
 * The report after opening a project whose referenced file changed since it was saved: the source
 * is held, the graph built without it, and Refresh (the reader's click) builds it from the new file.
 */
export const OpenReportHeldSource: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        const { store, session } = await ready(context);
        await session.data.import(
            { type: "csv", config: { data: "source,target\nAva,Ben\n" }, name: "friends.csv" },
            { mode: "replace" },
        );
        const [source] = (await session.project.describe()).sources.filter((each) => each.kind === "file");
        const { text } = await session.project.save({
            format: 2,
            markSaved: false,
            embed: { [source.id]: "referenced" },
            paths: { [source.id]: "friends.csv" },
        });
        const changed = new File(["source,target\nAva,Ben\nBen,Cara\n"], "friends.csv", { type: "text/csv" });
        const { problems } = await session.project.open(text, { files: { [source.id]: changed }, discard: true });
        showReport(store, session, "Opened friends.graphty.json", problems, new Map([[source.id, "friends.csv"]]));
        const report = await within(context.canvasElement.ownerDocument.body).findByRole("dialog", {
            name: "Opened friends.graphty.json",
        });
        await within(report).findByRole("button", { name: "Refresh friends.csv" });
    },
};

/** A style file whose payment column the open data calls by another name, as the step maps it. */
const STYLE_ON_AMOUNT = "source,target,amount\np0,p1,900\np1,p2,20\n";

/**
 * Adding a style section file written on other data: Map columns pairs each column it names with
 * one of the open data's, and the Needs table then reads it as mapped.
 */
export const OpenColumnMapping: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        const { store, session } = await ready(context);
        await session.data.import(
            { type: "csv", config: { data: STYLE_ON_AMOUNT }, name: "payments.csv" },
            { mode: "replace" },
        );
        await session.styles.add({
            name: "Big payments",
            target: "edge",
            selector: { match: "expression", where: "data.amount > `500`" },
            set: { "edge.color": "#c62828" },
        });
        const { text } = await session.project.save({
            format: 2,
            sections: ["style"],
            form: "section",
            markSaved: false,
        });
        await session.data.import(
            {
                type: "csv",
                config: { data: STYLE_ON_AMOUNT.replace("amount", "amount_usd") },
                name: "payments-usd.csv",
            },
            { mode: "replace" },
        );
        // A fixed date, so the picture does not change from one day to the next.
        const fixed = JSON.parse(text, (key, value: unknown) =>
            key === "created" || key === "modified" ? "2026-11-01T12:00:00Z" : value,
        ) as unknown;
        void askOpenV2(store, session, new File([JSON.stringify(fixed)], "kit.graphty-style.json"));
        const body = within(context.canvasElement.ownerDocument.body);
        const add = await body.findByRole("dialog", { name: "Add kit.graphty-style.json" });
        await userEvent.click(within(add).getByRole("button", { name: "Map columns" }));
        const map = await body.findByRole("dialog", { name: "Map kit.graphty-style.json" });
        await userEvent.click(within(map).getByLabelText("Open column for amount"));
        await userEvent.click(await body.findByRole("option", { name: "amount_usd" }));
    },
};
