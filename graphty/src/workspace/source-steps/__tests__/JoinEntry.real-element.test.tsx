/**
 * The doors into the join workspace on the REAL graphty-element with the source-steps experiment
 * on, driven by clicks and keys, in the owner's founding example: people in the graph and door
 * entries staged. "Join +" below the data sources opens the workspace, as Shift+J does; it is never
 * disabled, even while a draft is open; the sidebar holds no join information; and the inspector's
 * Join on a person opens the workspace with people as its first source.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import type { WorkspaceStore } from "../../state/store";
import {
    addMatch,
    done,
    emptyProject,
    joinAs,
    joinLines,
    openJoins,
    pickFields,
    pickSources,
    stageFile,
} from "./sourceSteps";

withFeatures(["source-steps"]);

const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales";
const BUILDINGS = "door,building\nD1,North\nD2,South";
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1";

/**
 * People in the graph as type person, and entries.csv dropped and staged.
 * @returns the store and the session.
 */
async function foundingProject(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    await page.viewport(1280, 900);
    const { store, session } = await emptyProject();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    await stageFile("entries.csv", ENTRIES);
    await screen.findByRole("listitem", { name: "entries.csv" });
    return { store, session };
}

/**
 * The Data place's Join + button.
 * @returns the button.
 */
async function joinPlus(): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    return within(place).findByRole("button", { name: "Join" });
}

/**
 * The entries joined to people: an edge from each person to the entries they badged.
 * @param session - the session.
 */
async function joinEntries(session: GraphSession): Promise<void> {
    const draft = session.data.draft();
    draft.connect({ from: { source: session.data.staged()[0].key, field: "badge" }, into: { space: "person" } });
    await draft.commit();
}

describe("the doors into the join workspace (source-steps)", () => {
    it("Join + below the data sources opens the workspace, showing its Shift+J key", async () => {
        await foundingProject();
        const plus = await joinPlus();
        assert.strictEqual(plus.getAttribute("aria-keyshortcuts"), "Shift+J");
        const row = plus.closest("[data-join-plus]");
        assert.include(row?.textContent ?? "", "J", "the key is drawn beside the +");
        const list = screen.getByRole("list", { name: "Data sources" });
        assert.isTrue(
            (list.compareDocumentPosition(plus) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
            "Join + comes after every source",
        );
        await userEvent.click(plus);
        const modal = await screen.findByRole("dialog", { name: "Join" });
        assert.deepStrictEqual(joinLines(modal), ["New join"], "a blank card, nothing picked");
        assert.strictEqual(within(modal).getByRole<HTMLInputElement>("combobox", { name: "Source 1" }).value, "");
    });

    it("the sidebar holds no join information besides a line per join: no card, options, counts or join buttons", async () => {
        const { session } = await foundingProject();
        await joinEntries(session);
        const place = await screen.findByRole("region", { name: "Data place" });
        const list = await within(place).findByRole("grid", { name: "Joins" });
        assert.deepStrictEqual(joinLines(place), ["people + entries"]);
        assert.strictEqual(list.textContent, "people + entries", "the name alone: no act, options or counts");
        assert.isNull(within(place).queryByRole("form", { name: "Join" }));
        assert.isNull(within(place).queryByText("Steps"));
        assert.isNull(within(place).queryByRole("button", { name: /Edit joins/ }));
        assert.lengthOf(within(place).getAllByRole("button", { name: "Join" }), 1, "only Join +");
        await stageFile("buildings.csv", BUILDINGS);
        const staged = await within(place).findByRole("listitem", { name: "buildings.csv" });
        assert.isNull(
            within(staged).queryByRole("button", { name: /^(Add( as is)?|Join)$/ }),
            "no Add or Join on the entry",
        );
    });

    it("each join is one line under Join +; pressing it, or its menu's Open, opens the workspace on it", async () => {
        const { session } = await foundingProject();
        await joinEntries(session);
        const place = await screen.findByRole("region", { name: "Data place" });
        const grid = await within(place).findByRole("grid", { name: "Joins" });
        const plus = await joinPlus();
        assert.isTrue(
            (plus.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
            "the list is under the Join header",
        );
        await userEvent.click(within(grid).getByRole("gridcell", { name: "people + entries" }));
        let modal = await screen.findByRole("dialog", { name: "Join" });
        assert.deepStrictEqual(joinLines(modal), ["people + entries"], "that join, and no blank card");
        await within(modal).findByRole("radio", { name: "Node per entries row, linked to people", checked: true });
        await userEvent.click(within(modal).getByRole("button", { name: /^Cancel/ }));

        await userEvent.click(within(place).getByRole("button", { name: "people + entries menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Open" }));
        modal = await screen.findByRole("dialog", { name: "Join" });
        await within(modal).findByRole("radio", { name: "Node per entries row, linked to people", checked: true });
    });

    it("a card of three sources is one line naming all three, cut by an ellipsis only where it does not fit, never a count", async () => {
        const { session } = await foundingProject();
        await stageFile("doors.csv", "door,name\nD1,North\nD2,South");
        await screen.findByRole("listitem", { name: "doors.csv" });
        const modal = await openJoins();
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "badge", "badge");
        await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
        const fields = "Fields of entries and doors on people";
        await joinAs(modal, fields);
        await waitFor(() => {
            assert.isAbove(
                session.data
                    .currentDraft()
                    ?.steps()
                    .filter((row) => row.act !== null).length ?? 0,
                1,
            );
        });
        assert.deepStrictEqual(joinLines(modal), ["people + entries + doors"], "one card, several steps");
        await done(modal);
        await screen.findByText("Joined");
        const place = await screen.findByRole("region", { name: "Data place" });
        const grid = await within(place).findByRole("grid", { name: "Joins" });
        assert.deepStrictEqual(joinLines(place), ["people + entries + doors"], "one line, in the order picked");
        assert.strictEqual(grid.querySelector(".cm-page-name")?.textContent, "people + entries + doors");
        assert.notMatch(grid.textContent ?? "", /\+\d/, "no count stands in for a name");
        const cell = within(grid).getByRole("gridcell", { name: "people + entries + doors" });
        await userEvent.click(cell);
        const again = await screen.findByRole("dialog", { name: "Join" });
        assert.deepStrictEqual(joinLines(again), ["people + entries + doors"], "it reopens as that one card");
        await within(again).findByRole("radio", { name: fields, checked: true });
    });

    it("a committed join reopened counts what Done would add to the graph, as the key does, left as it is or changed", async () => {
        const { session } = await foundingProject();
        await stageFile("doors.csv", BUILDINGS);
        await screen.findByRole("listitem", { name: "doors.csv" });
        const modal = await openJoins();
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "badge", "badge");
        await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
        await joinAs(modal, "Edge per entries row, people to doors");
        await done(modal);
        const place = await screen.findByRole("region", { name: "Data place" });
        const grid = await within(place).findByRole("grid", { name: "Joins" });
        await userEvent.click(within(grid).getByRole("gridcell", { name: "people + entries + doors" }));
        const again = await screen.findByRole("dialog", { name: "Join" });
        const counts = (): string => again.querySelector(".jw-counts")?.textContent ?? "";
        await waitFor(() => {
            assert.include(counts(), "matched", "its counts are drawn");
        });
        assert.notMatch(counts(), /new (node|edge)/, "left as it is, it adds nothing the graph lacks");
        await joinAs(again, "Node per entries row, linked to people and doors");
        await waitFor(() => {
            const added = session.data.currentDraft()?.preview().marks.nodes.new ?? -1;
            assert.isAbove(added, 0);
            assert.include(counts(), `${String(added)} new node`, "the doors the graph holds are not new");
        });
    });

    it("a card of three sources stays one card in the order picked after a save and a reopen", async () => {
        const { session } = await foundingProject();
        await stageFile("doors.csv", "door,name\nD1,North\nD2,South");
        await screen.findByRole("listitem", { name: "doors.csv" });
        const modal = await openJoins();
        // Picked entries first: the name keeps that order, not the order loaded.
        await pickSources(modal, "entries", "people");
        await pickFields(modal, "badge", "badge");
        await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
        const fields = "Fields of entries and doors on people";
        await joinAs(modal, fields);
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["entries + people + doors"]);
        });
        await done(modal);
        const { text } = await session.project.save();
        await session.project.open(text, { discard: true });
        const place = await screen.findByRole("region", { name: "Data place" });
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(place), ["entries + people + doors"], "one line, in the order picked");
        });
        const grid = await within(place).findByRole("grid", { name: "Joins" });
        await userEvent.click(within(grid).getByRole("gridcell", { name: "entries + people + doors" }));
        const again = await screen.findByRole("dialog", { name: "Join" });
        assert.deepStrictEqual(joinLines(again), ["entries + people + doors"], "it reopens as that one card");
        await within(again).findByRole("radio", { name: fields, checked: true });
        assert.strictEqual(
            within(again).getByRole<HTMLInputElement>("combobox", { name: "Match 2 source 2" }).value,
            "doors",
            "both of its matches",
        );
    });

    it("its menu's Remove opens the workspace with the join taken out, and Done takes it out in one step", async () => {
        const { session } = await foundingProject();
        await joinEntries(session);
        assert.isAbove(session.data.edges().length, 0);
        const place = await screen.findByRole("region", { name: "Data place" });
        await userEvent.click(await within(place).findByRole("button", { name: "people + entries menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
        const modal = await screen.findByRole("dialog", { name: "Join" });
        assert.deepStrictEqual(joinLines(modal), []);
        await within(modal).findByText("edges removed 3");
        assert.isTrue(
            session.data.steps().some((row) => row.op === "join.edges"),
            "nothing is committed before Done",
        );
        const steps = session.history.steps.length;
        await done(modal);
        assert.lengthOf(session.data.edges(), 0);
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        // The toast and the status line both say it, so findByText would wait out the toast.
        await screen.findAllByText("Removed");
        const [undo] = screen.getAllByRole("button", { name: "Undo" });
        assert.isNull(undo.closest("[inert]"), "the notice offers Undo, reachable as soon as it shows (issue #10279)");
        assert.isNull(screen.queryByText("Joined"), "the notice names the removal, not a join (issue #10217)");
        assert.isNull(within(place).queryByRole("grid", { name: "Joins" }), "and its line went with it");
        await within(place).findByRole("listitem", { name: "entries.csv" });
        assert.deepStrictEqual(
            session.data.staged().map((each) => each.name),
            ["entries.csv"],
            "the rows wait again",
        );
    });

    it("two sources and an open draft: Join + still opens the workspace, which adopts the draft", async () => {
        const { session } = await foundingProject();
        await stageFile("buildings.csv", BUILDINGS);
        await screen.findByRole("listitem", { name: "buildings.csv" });
        const draft = session.data.draft();
        const plus = await joinPlus();
        assert.isFalse((plus as HTMLButtonElement).disabled, "never disabled");
        await userEvent.click(plus);
        await screen.findByRole("dialog", { name: "Join" });
        assert.strictEqual(session.data.currentDraft(), draft, "the workspace works in the open draft");
    });

    it("Shift+J opens it with one source loaded and nothing staged", async () => {
        const { session } = await foundingProject();
        await session.data.removeSource(session.data.staged()[0]?.key ?? "");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listitem", { name: "entries.csv" }));
        });
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Shift>}J{/Shift}");
        await screen.findByRole("dialog", { name: "Join" });
    });

    it("the inspector's Join on a person opens the workspace with people as its first source", async () => {
        const { session } = await foundingProject();
        await session.selection.apply({ nodes: ["B1"] });
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        await userEvent.click(await within(inspector).findByRole("button", { name: "Join" }));
        const modal = await screen.findByRole("dialog", { name: "Join" });
        await waitFor(() => {
            assert.strictEqual(
                within(modal).getByRole<HTMLInputElement>("combobox", { name: "Source 1" }).value,
                "people",
            );
        });
    });
});
