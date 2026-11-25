/**
 * A second source arrives staged, on the REAL graphty-element with the source-steps experiment on
 * (design/data/multiple-data-sources-design.md, sections 5.1 and 5.5), driven by drops, clicks and
 * keys: it waits in its own entry in the Data sources list drawing nothing, holding only how its
 * rows are read; the join workspace (Join +) adds it as it is, and a source whose keys meet people
 * already there asks "Same person?" on its Add card there and holds Done until it is answered;
 * Remove takes it away and Undo brings it back; a save and reopen keeps it staged.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import type { WorkspaceStore } from "../../state/store";
import { choose, drop, emptyProject } from "./sourceSteps";

withFeatures(["source-steps"]);

const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales";
const BUILDINGS = "door,building\nD1,North\nD2,South";
/** V1 is new; B1 is a person already. */
const VISITORS = "badge,name\nB1,Ann\nV1,Val";

/**
 * A project whose first file, people.csv, was dropped and drawn.
 * @returns the store and the session.
 */
async function withPeopleDropped(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const project = await emptyProject();
    drop("people.csv", PEOPLE);
    await waitFor(() => {
        assert.strictEqual(project.session.data.nodes().length, 3);
    });
    project.store.set({ dockOpen: false, dockMaximized: false });
    return project;
}

/**
 * Drops a file and waits for its staged entry, then opens the entry.
 * @param name - the file's name.
 * @param text - its contents.
 * @returns the entry.
 */
async function stage(name: string, text: string): Promise<HTMLElement> {
    drop(name, text);
    return openEntry(name);
}

/**
 * Opens a staged entry by its header, as a reader does.
 * @param name - the source's name.
 * @returns the entry.
 */
async function openEntry(name: string): Promise<HTMLElement> {
    const entry = await screen.findByRole("listitem", { name });
    const toggle = entry.querySelector<HTMLElement>("[aria-expanded]");
    if (toggle?.getAttribute("aria-expanded") === "false") {
        await userEvent.click(toggle);
    }
    await within(entry).findByRole("radiogroup", { name: "Rows are" });
    return entry;
}

/**
 * Opens the join workspace by Join + in the Data place.
 * @returns the workspace.
 */
async function workspace(): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    await userEvent.click(within(place).getByRole("button", { name: "Join" }));
    return screen.findByRole("dialog", { name: "Join" });
}

/**
 * The workspace's card for a staged source's read settings.
 * @param modal - the workspace.
 * @returns the card's read settings.
 */
async function readAs(modal: HTMLElement): Promise<HTMLElement> {
    const settings = await within(modal).findByRole("group", { name: "Staged source" });
    await userEvent.click(within(settings).getByRole("button", { name: "Expand Read as" }));
    return settings;
}

describe("a second source arrives staged (source-steps)", () => {
    it("stages buildings.csv drawing nothing, then the workspace adds it as it is and Done adds it as one more source", async () => {
        const { session } = await withPeopleDropped();
        const entry = await stage("buildings.csv", BUILDINGS);
        assert.strictEqual(session.data.nodes().length, 3, "a staged source draws nothing");
        assert.strictEqual(
            within(entry).getByRole<HTMLInputElement>("combobox", { name: "Key" }).value,
            "door",
            "keyed by its door column, as a first source would be",
        );
        assert.isNull(within(entry).queryByRole("button", { name: /^(Add|Join)/ }), "no join doors on the entry");

        const modal = await workspace();
        await userEvent.click(within(await readAs(modal)).getByRole("button", { name: "Add as is" }));
        await within(modal).findByText("buildings.csv -> Added");
        assert.strictEqual(session.data.staged()[0]?.name, "buildings.csv", "nothing is added before Done");

        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.deepStrictEqual(
            session.data
                .nodes()
                .map((node) => String(node.id))
                .sort(),
            ["B1", "B2", "B3", "D1", "D2"],
            "three people and two buildings, D1 and D2",
        );
        const list = screen.getByRole("list", { name: "Data sources" });
        assert.isNotNull(within(list).getByRole("listitem", { name: "buildings.csv" }));
        assert.lengthOf(session.data.staged(), 0);
    });

    it("asks Same person? for visitors.csv on its Add card and holds Done until it is answered", async () => {
        const { session } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
        drop("visitors.csv", VISITORS);
        await screen.findByRole("listitem", { name: "visitors.csv" });
        const modal = await workspace();
        const settings = await readAs(modal);
        await choose(settings, "Key", "badge");
        const type = within(settings).getByRole("combobox", { name: "Type" });
        await userEvent.click(type);
        await userEvent.keyboard("person{Enter}");
        await waitFor(() => {
            assert.strictEqual(
                session.data
                    .currentDraft()
                    ?.sourceTable(session.data.staged()[0]?.key ?? "")
                    .summary().mapping.type,
                "person",
            );
        });
        // Distinct and Repeats read the key's profile.
        assert.strictEqual(within(settings).getByLabelText("Distinct").textContent, "2 keys");

        await userEvent.click(within(settings).getByRole("button", { name: "Add as is" }));
        await within(modal).findByText("Same person?");
        assert.include(modal.textContent, "1 of 2");
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await within(modal).findByRole("alert");
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "Done waits for an answer");
        assert.lengthOf(session.data.staged(), 1, "nothing is committed");

        await userEvent.click(within(modal).getByRole("button", { name: "Merge" }));
        await waitFor(() => {
            assert.isNull(within(modal).queryByText("Same person?"));
        });
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().length, 4, "B1 merged, V1 added");
        });
        assert.lengthOf(session.data.staged(), 0, "visitors.csv is a source now");
    });

    it("asks again after a save and reopen: a picked Space comes back as a proposal, and Done waits for an answer", async () => {
        const { session } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
        const key = await session.data.stage(
            { type: "csv", config: { data: VISITORS }, name: "visitors.csv" },
            { key: "badge", space: "person" },
        );
        assert.strictEqual(session.data.sourceTable(key).summary().mapping.space, "person", "the Space is picked");
        const { text } = await session.project.save();
        await session.project.open(text, { discard: true });
        await screen.findByRole("listitem", { name: "visitors.csv" });

        const modal = await workspace();
        const settings = await readAs(modal);
        assert.strictEqual(
            within(settings).getByRole<HTMLInputElement>("combobox", { name: "Space" }).value,
            "",
            "the saved Space is only a proposal",
        );
        await userEvent.click(within(settings).getByRole("button", { name: "Add as is" }));
        await within(modal).findByText("Same person?");
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await within(modal).findByRole("alert");
        assert.lengthOf(session.data.staged(), 1, "nothing is added before the answer");

        // A New nodes card of the same source leaves the question where it can be answered.
        await userEvent.keyboard("{Shift>}J{/Shift}");
        await choose(modal, "Incoming source", "visitors.csv");
        await userEvent.click(within(modal).getByRole("radio", { name: "A node linked to what it names" }));
        await choose(modal, "In graph type", "New nodes");
        await choose(modal, "Incoming field", "name");
        await waitFor(() => {
            assert.isTrue(
                session.data
                    .currentDraft()
                    ?.steps()
                    .some((step) => step.extract !== null),
            );
        });
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        assert.strictEqual(
            (await within(modal).findByRole("alert"))
                .closest("[data-join-card]")
                ?.textContent?.includes("Same person?"),
            true,
            "Done says which card waits",
        );
        await userEvent.click(within(modal).getByRole("button", { name: "Keep separate" }));
        await waitFor(() => {
            assert.isNull(within(modal).queryByText("Same person?"));
        });
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.lengthOf(session.data.staged(), 0);
    });

    it("Cancel (Esc) closes the workspace and leaves the source staged", async () => {
        const { session } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
        await session.data.stage(
            { type: "csv", config: { data: VISITORS }, name: "visitors.csv" },
            { key: "badge", type: "person" },
        );
        const modal = await workspace();
        await userEvent.click(within(await readAs(modal)).getByRole("button", { name: "Add as is" }));
        await within(modal).findByText("visitors.csv -> Added");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.isNull(session.data.currentDraft(), "the draft is discarded");
        assert.strictEqual(session.data.staged()[0]?.name, "visitors.csv");
        assert.strictEqual(session.data.nodes().length, 3);
    });

    it("Remove in the entry menu takes it away, and Undo brings it back", async () => {
        await withPeopleDropped();
        const entry = await stage("buildings.csv", BUILDINGS);
        await userEvent.click(within(entry).getByRole("button", { name: "buildings.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listitem", { name: "buildings.csv" }));
        });

        await userEvent.keyboard("{Control>}z{/Control}");
        await screen.findByRole("listitem", { name: "buildings.csv" });
    });

    it("stays staged through a save and reopen", async () => {
        const { session } = await withPeopleDropped();
        await stage("buildings.csv", BUILDINGS);
        const { text } = await session.project.save();
        await session.project.open(text, { discard: true });
        await openEntry("buildings.csv");
        assert.strictEqual(session.data.nodes().length, 3);
        assert.strictEqual(session.data.staged()[0]?.name, "buildings.csv");
    });

    it("keeps the first file of a project saved without the experiment when a second one is staged", async () => {
        const off = createGraphSession({ features: [] });
        const draft = await off.data.prepare(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { guess: "values" },
        );
        await draft.load({ mapping: { rowsAre: "nodes" } });
        const { text } = await off.project.save();
        off.dispose();
        const { session } = await emptyProject();
        await session.project.open(text, { discard: true });
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().length, 3);
        });
        await stage("buildings.csv", BUILDINGS);
        assert.deepStrictEqual(
            session.data.sources({ staged: true }).map((each) => each.name),
            ["people.csv", "buildings.csv"],
        );
        const list = screen.getByRole("list", { name: "Data sources" });
        assert.isNotNull(within(list).getByRole("listitem", { name: "people.csv" }));
        const saved = await session.project.save();
        await session.project.open(saved.text, { discard: true });
        await screen.findByRole("listitem", { name: "buildings.csv" });
        assert.deepStrictEqual(
            session.data.sources({ staged: true }).map((each) => each.name),
            ["people.csv", "buildings.csv"],
        );
    });

    it("lists a staged source nowhere outside its entry: the inspector's graph header names one file", async () => {
        const { store } = await withPeopleDropped();
        await stage("buildings.csv", BUILDINGS);
        // Opening its entry shows the staged source's own details; the graph's header is under them.
        store.set({ inspected: null });
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await waitFor(() => {
            assert.isNotNull(inspector.getByRole("button", { name: "From people.csv" }));
        });
    });

    it("Rows are Edges on the entry waits for both ends, then reads the rows as edges", async () => {
        const { session } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
        const entry = await stage("visitors.csv", VISITORS);
        // The radio itself is visually hidden: a reader clicks its label.
        const rows = within(entry).getByRole("radiogroup", { name: "Rows are" });
        await userEvent.click(within(rows).getByText("Edges"));
        await within(entry).findByRole("combobox", { name: "From" });
        assert.strictEqual(
            session.data.sourceTable(session.data.staged()[0]?.key ?? "").summary().mapping.rows,
            "nodes",
            "nothing is written before both ends",
        );
        await choose(entry, "From", "badge");
        await choose(entry, "To", "name");
        await waitFor(() => {
            assert.strictEqual(
                session.data.sourceTable(session.data.staged()[0]?.key ?? "").summary().mapping.rows,
                "edges",
            );
        });
        assert.strictEqual(session.data.nodes().length, 3);
        assert.strictEqual(session.data.edges().length, 0);
    });

    it("names a source's own space by the source, never by its id, on the workspace card", async () => {
        await withPeopleDropped();
        drop("buildings.csv", BUILDINGS);
        await screen.findByRole("listitem", { name: "buildings.csv" });
        const settings = await readAs(await workspace());
        const space = within(settings).getByRole("combobox", { name: "Space" });
        await userEvent.click(space);
        await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
        const names = (await screen.findAllByRole("option")).map((option) => option.textContent ?? "");
        assert.include(names, "people.csv");
        assert.isFalse(
            names.some((name) => name.startsWith("source:")),
            `no internal id: ${names.join(", ")}`,
        );
    });

    it("fits Rows are's three choices inside the staged entry at the default panel width", async () => {
        await withPeopleDropped();
        const entry = await stage("buildings.csv", BUILDINGS);
        const { right } = entry.getBoundingClientRect();
        const group = within(entry).getByRole("radiogroup", { name: "Rows are" });
        assert.isAtMost(group.getBoundingClientRect().right, right, "the control ends inside the entry");
        for (const name of ["Nodes", "Edges", "Nodes + edges"]) {
            const label = within(group).getByText(name);
            assert.isAtMost(label.scrollWidth, label.clientWidth, `${name} is not cut`);
            assert.isAtMost(label.getBoundingClientRect().right, right, `${name} ends inside the entry`);
        }
    });
});
