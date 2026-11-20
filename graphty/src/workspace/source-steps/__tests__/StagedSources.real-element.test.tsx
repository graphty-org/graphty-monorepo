/**
 * A second source arrives staged, on the REAL graphty-element with the source-steps experiment on
 * (design/data/multiple-data-sources-design.md, sections 5.1 and 5.5), driven by drops, clicks and
 * keys: it waits in its own section drawing nothing; Add adds it; a source whose keys meet people
 * already there asks "Same person?" and holds Commit until it is answered; Remove takes it away and
 * Undo brings it back; a save and reopen keeps it staged.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withFeatures(["source-steps"]);

const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales";
const BUILDINGS = "door,building\nD1,North\nD2,South";
/** V1 is new; B1 is a person already. */
const VISITORS = "badge,name\nB1,Ann\nV1,Val";

/**
 * Drops a file as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param name - the file's name.
 * @param text - its contents.
 */
function drop(name: string, text: string): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([text], name, { type: "text/csv" }));
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * An empty project on the Data place.
 * @returns the store and the session.
 */
async function emptyProject(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = createWorkspaceStore({ project: { name: "Doors", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return { store, session };
}

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
 * Drops a file and waits for its staged section.
 * @param name - the file's name.
 * @param text - its contents.
 * @returns the section.
 */
async function stage(name: string, text: string): Promise<HTMLElement> {
    drop(name, text);
    return screen.findByRole("region", { name });
}

/**
 * Picks a choice in a select by clicking it open and clicking the option.
 * @param within_ - where the select is.
 * @param name - the select's name.
 * @param option - the option.
 */
async function choose(within_: HTMLElement, name: string, option: string): Promise<void> {
    await userEvent.click(within(within_).getByRole("combobox", { name }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("a second source arrives staged (source-steps)", () => {
    it("stages buildings.csv drawing nothing, then Add adds it as one more source", async () => {
        const { session } = await withPeopleDropped();
        const section = await stage("buildings.csv", BUILDINGS);
        assert.strictEqual(session.data.nodes().length, 3, "a staged source draws nothing");
        assert.isNull(screen.queryByRole("region", { name: "Join buildings.csv" }), "no join screen");
        assert.include(within(section).getByLabelText("File").textContent, "2 rows");
        assert.strictEqual(
            within(section).getByRole<HTMLInputElement>("combobox", { name: "Key" }).value,
            "door",
            "keyed by its door column, as a first source would be",
        );

        await userEvent.click(within(section).getByRole("button", { name: /^Add/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "buildings.csv" }));
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
    });

    it("asks Same person? for visitors.csv and holds Commit until it is answered", async () => {
        const { session } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
        const section = await stage("visitors.csv", VISITORS);
        await choose(section, "Key", "badge");
        const type = within(section).getByRole("combobox", { name: "Type" });
        await userEvent.click(type);
        await userEvent.keyboard("person{Enter}");
        await waitFor(() => {
            assert.strictEqual(
                session.data.sourceTable(session.data.staged()[0]?.key ?? "").summary().mapping.type,
                "person",
            );
        });
        // Distinct and Repeats read the key's profile.
        assert.strictEqual(within(section).getByLabelText("Distinct").textContent, "2 keys");

        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Shift>}D{/Shift}");
        const card = await within(section).findByRole("form", { name: "Add" });
        assert.include(card.textContent, "Same person?");
        assert.include(card.textContent, "1 of 2");
        const commit = within(card).getByRole("button", { name: /^Commit/ });
        assert.isTrue(commit.hasAttribute("disabled"), "Commit waits for an answer");

        await userEvent.click(within(card).getByRole("radio", { name: "Merge" }));
        await waitFor(() => {
            assert.isFalse(commit.hasAttribute("disabled"));
        });
        await userEvent.click(commit);
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().length, 4, "B1 merged, V1 added");
        });
        assert.isNull(screen.queryByRole("region", { name: "visitors.csv" }));
    });

    it("Cancel (Esc) closes the Add card and leaves the source staged", async () => {
        const { session } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
        await session.data.stage(
            { type: "csv", config: { data: VISITORS }, name: "visitors.csv" },
            {
                key: "badge",
                type: "person",
            },
        );
        const section = await screen.findByRole("region", { name: "visitors.csv" });
        await userEvent.click(within(section).getByRole("button", { name: /^Add/ }));
        await within(section).findByRole("form", { name: "Add" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(within(section).queryByRole("form", { name: "Add" }));
        });
        assert.isNull(session.data.currentDraft(), "the draft is discarded");
        assert.strictEqual(session.data.staged()[0]?.name, "visitors.csv");
        assert.strictEqual(session.data.nodes().length, 3);
    });

    it("Remove in the section menu takes it away, and Undo brings it back", async () => {
        await withPeopleDropped();
        const section = await stage("buildings.csv", BUILDINGS);
        await userEvent.click(within(section).getByRole("button", { name: "buildings.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "buildings.csv" }));
        });

        await userEvent.keyboard("{Control>}z{/Control}");
        await screen.findByRole("region", { name: "buildings.csv" });
    });

    it("stays staged through a save and reopen", async () => {
        const { session } = await withPeopleDropped();
        await stage("buildings.csv", BUILDINGS);
        const { text } = await session.project.save();
        await session.project.open(text, { discard: true });
        const section = await screen.findByRole("region", { name: "buildings.csv" });
        assert.strictEqual(session.data.nodes().length, 3);
        assert.isNotNull(within(section).getByRole("button", { name: /^Add/ }));
    });

    it("lists a staged source nowhere outside its section: the inspector's graph header names one file", async () => {
        await withPeopleDropped();
        await stage("buildings.csv", BUILDINGS);
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await waitFor(() => {
            assert.isNotNull(inspector.getByRole("button", { name: "From people.csv" }));
        });
    });

    it("Rows are Edges with no ends picked holds Add: the button is disabled and Shift+D adds nothing", async () => {
        const { session, store } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
        const section = await stage("visitors.csv", VISITORS);
        // The radio itself is visually hidden: a reader clicks its label.
        const rows = within(section).getByRole("radiogroup", { name: "Rows are" });
        await userEvent.click(within(rows).getByText("Edges"));
        await within(section).findByRole("combobox", { name: "From" });
        const add = within(section).getByRole("button", { name: /^Add/ });
        assert.isTrue(add.hasAttribute("disabled"), "Add waits for both ends");

        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Shift>}D{/Shift}");
        assert.isNull(store.get().sourceCard, "no Add card opened");
        assert.isNull(session.data.currentDraft(), "no draft opened");
        assert.strictEqual(session.data.staged()[0]?.name, "visitors.csv", "still staged");
        assert.strictEqual(session.data.nodes().length, 3);
        assert.strictEqual(session.data.edges().length, 0);

        await choose(section, "From", "badge");
        await choose(section, "To", "name");
        await waitFor(() => {
            assert.strictEqual(
                session.data.sourceTable(session.data.staged()[0]?.key ?? "").summary().mapping.rows,
                "edges",
            );
        });
        assert.isFalse(within(section).getByRole("button", { name: /^Add/ }).hasAttribute("disabled"));
    });

    it("names a source's own space by the source, never by its id", async () => {
        await withPeopleDropped();
        const section = await stage("buildings.csv", BUILDINGS);
        const space = within(section).getByRole("combobox", { name: "Space" });
        await userEvent.click(space);
        await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
        const names = (await screen.findAllByRole("option")).map((option) => option.textContent ?? "");
        assert.include(names, "people.csv");
        assert.isFalse(
            names.some((name) => name.startsWith("source:")),
            `no internal id: ${names.join(", ")}`,
        );
    });

    it("fits Rows are's three choices inside the staged section at the default panel width", async () => {
        await withPeopleDropped();
        const section = await stage("buildings.csv", BUILDINGS);
        const { right } = section.getBoundingClientRect();
        const group = within(section).getByRole("radiogroup", { name: "Rows are" });
        assert.isAtMost(group.getBoundingClientRect().right, right, "the control ends inside the section");
        for (const name of ["Nodes", "Edges", "Nodes + edges"]) {
            const label = within(group).getByText(name);
            assert.isAtMost(label.scrollWidth, label.clientWidth, `${name} is not cut`);
            assert.isAtMost(label.getBoundingClientRect().right, right, `${name} ends inside the section`);
        }
    });
});
