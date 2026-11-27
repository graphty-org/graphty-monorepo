/**
 * The owner's founding example end to end on the REAL graphty-element with the source-steps
 * experiment on (design/data/multiple-data-sources-design.md, sections 5.1-5.6, 7.13 and 13),
 * driven only by drops, clicks, typing and keys, and joined only through "Join +" below the data
 * sources: buildings.csv is dropped on an empty project and drawn at once; people arrive staged,
 * are given the type person in the workspace and are added as they are; door entries are
 * joined to the people who badged in (an edge "entered", ignoring case, the test badge's entry left
 * out) and to the buildings whose doors they opened (an edge "at"); HR's list is merged into people
 * with Use incoming for dept and one pick back to people.csv's value; visitors are added as people too,
 * answering the key-overlap question. Before / After flips the drawing, each Done commits one undo
 * step, and Undo returns the visitors to staged and Redo adds them again.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import {
    advanced,
    choose,
    done,
    drop,
    emptyProject,
    joinAs,
    joinLines,
    pickFields,
    pickSources,
    rowWith,
    select,
} from "./sourceSteps";

withFeatures(["source-steps"]);

/** T0 is the test badge. */
const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales\nT0,Test badge,QA";
const BUILDINGS = "door,building\nD1,North\nD2,South";
/** B9 badges no person, b3 is B3 typed in lower case, D3 is no building's door, E7 the test badge's. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE5,b3,D3\nE6,B2,D2\nE7,T0,D1";
/** HR's list: B1 and B2 name another department than people.csv does. */
const HR = "badge,dept\nB1,Operations\nB2,Research\nB3,Sales";
/** V1 is new; B1 is a person already. */
const VISITORS = "badge,name\nB1,Ann\nV1,Val";

/**
 * Drops a file and waits for its staged entry.
 * @param name - the file's name.
 * @param text - its contents.
 */
async function stage(name: string, text: string): Promise<void> {
    drop(name, text);
    await screen.findByRole("listitem", { name });
}

/**
 * Opens the join workspace by Join + below the data sources.
 * @returns the workspace.
 */
async function joinPlus(): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    await userEvent.click(within(place).getByRole("button", { name: "Join" }));
    return screen.findByRole("dialog", { name: "Join" });
}

/**
 * Types a name into a type or edge type box.
 * @param where - where the box is.
 * @param name - the box's name.
 * @param text - the name typed.
 */
async function typeInto(where: HTMLElement, name: string, text: string): Promise<void> {
    await userEvent.click(within(where).getByLabelText(name));
    await userEvent.keyboard(`${text}{Enter}`);
}

/**
 * Presses keys with nothing focused, as a reader does over the window.
 * @param keys - the keys.
 */
async function press(keys: string): Promise<void> {
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard(keys);
}

/**
 * The ids of the nodes in the graph, sorted.
 * @param session - the session.
 * @returns them.
 */
function nodeIds(session: GraphSession): string[] {
    return session.data
        .nodes()
        .map((node) => String(node.id))
        .sort();
}

/**
 * How many edges of a type the graph holds.
 * @param session - the session.
 * @param type - the edge type.
 * @returns the count.
 */
function edgesOf(session: GraphSession, type: string): number {
    return session.data.count({ type }).edges;
}

describe("the founding example through the app (source-steps)", () => {
    it("joins door entries to people and buildings, merges HR's list, adds visitors, and undoes and redoes", async () => {
        await page.viewport(1440, 900);
        const { store, session } = await emptyProject();

        // Buildings are dropped first and drawn at once, keyed by door.
        drop("buildings.csv", BUILDINGS);
        await waitFor(() => {
            assert.deepStrictEqual(nodeIds(session), ["D1", "D2"], "buildings keyed by door");
        });
        assert.isEmpty(session.data.staged(), "a first source is drawn, not staged");
        store.set({ dockOpen: false, dockMaximized: false });

        // People arrive staged, drawing nothing; on their card the reader types their Type, person,
        // and adds them as they are.
        await stage("people.csv", PEOPLE);
        assert.strictEqual(session.data.nodes().length, 2, "a staged source draws nothing");
        let modal = await joinPlus();
        await choose(modal, "Source 1", "people");
        let settings = await within(modal).findByRole("group", { name: "people rows" });
        await userEvent.click(within(settings).getByRole("button", { name: "Expand people rows" }));
        await typeInto(settings, "Type", "person");
        await waitFor(() => {
            const key = session.data.staged()[0]?.key ?? "";
            assert.strictEqual(session.data.currentDraft()?.sourceTable(key).summary().mapping.type, "person");
        });
        await userEvent.click(within(modal).getByRole("button", { name: "Add as is" }));
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["people, added"]);
        });
        await done(modal);
        assert.deepStrictEqual(nodeIds(session), ["B1", "B2", "B3", "D1", "D2", "T0"]);

        // Entries to people by badge: Connect "entered", ignoring case so b3 meets B3.
        await stage("entries.csv", ENTRIES);
        modal = await joinPlus();
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "badge", "badge");
        await userEvent.click(within(modal).getByRole("switch", { name: "Ignore case" }));
        await joinAs(modal, "Node per entries row, linked to people");
        await advanced(modal);
        await typeInto(modal, "Edge type", "entered");
        const newEdges = (): number => session.data.currentDraft()?.preview().steps.at(-1)?.buckets?.newEdges ?? -1;
        await waitFor(() => {
            assert.strictEqual(newEdges(), 6, "every entry but B9's");
        });

        // The test badge's entry is left out, from the workspace table's rows.
        await userEvent.click(await within(modal).findByRole("button", { name: /new edges$/ }));
        const rows = await within(modal).findByRole("grid", { name: "Rows" });
        await select(rowWith(rows, "T0"));
        await userEvent.click(within(modal).getByRole("button", { name: "Exclude" }));
        await waitFor(() => {
            assert.strictEqual(newEdges(), 5);
        });
        assert.isNotNull(within(modal).getByRole("button", { name: "Include E7" }));

        // Before / After: After first, B flips it and back.
        const draft = session.data.currentDraft();
        assert.isNotNull(draft);
        await waitFor(() => {
            assert.isTrue(draft?.displayed);
        });
        assert.strictEqual(draft?.side, "after");
        within(modal).getByRole("button", { name: "Done" }).focus();
        await userEvent.keyboard("b");
        await waitFor(() => {
            assert.strictEqual(draft?.side, "before");
        });
        await userEvent.keyboard("b");
        await waitFor(() => {
            assert.strictEqual(draft?.side, "after");
        });

        // Done commits it as one undo step.
        let history = session.history.steps.length;
        await done(modal);
        assert.strictEqual(session.history.steps.length, history + 1, "one undo step");
        assert.strictEqual(edgesOf(session, "entered"), 5);
        assert.lengthOf(session.data.staged(), 0, "entries are no longer staged");

        // Entries to buildings by door: nothing is staged, and the workspace opens on a new blank card.
        modal = await joinPlus();
        await pickSources(modal, "buildings", "entries");
        await pickFields(modal, "door", "door");
        await joinAs(modal, "Edge from buildings to entries");
        await advanced(modal);
        await typeInto(modal, "Edge type", "at");
        await done(modal);
        assert.strictEqual(edgesOf(session, "at"), 6, "every entry but E5's D3");

        // HR's list merged into people: Use incoming for dept, then one pick keeps people.csv's Lab.
        await stage("hr.csv", HR);
        modal = await joinPlus();
        await pickSources(modal, "people", "hr");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, "Fields of hr on people");
        await choose(modal, "Both have dept", "Use incoming");
        await userEvent.click(await within(modal).findByRole("button", { name: "Cells dept" }));
        const cells = await within(modal).findByRole("grid", { name: "Cells" });
        await select(rowWith(cells, "B2"));
        await userEvent.click(within(modal).getByRole("button", { name: "Use existing" }));
        await waitFor(() => {
            assert.strictEqual(
                session.data.currentDraft()?.preview().cells({ column: "dept", only: "decided" }).total,
                1,
            );
        });
        await done(modal);
        assert.strictEqual(session.data.node("B1")?.dept, "Operations", "HR's department, by the rule");
        assert.strictEqual(session.data.node("B2")?.dept, "Lab", "people.csv's department, by the pick");

        // Visitors as people too: where they are added asks whether their badges are the same people.
        await stage("visitors.csv", VISITORS);
        modal = await joinPlus();
        await choose(modal, "Source 1", "visitors");
        settings = await within(modal).findByRole("group", { name: "visitors rows" });
        await userEvent.click(within(settings).getByRole("button", { name: "Expand visitors rows" }));
        await typeInto(settings, "Type", "person");
        await waitFor(() => {
            const key = session.data.staged()[0]?.key ?? "";
            assert.strictEqual(session.data.currentDraft()?.sourceTable(key).summary().mapping.type, "person");
        });
        await userEvent.click(within(modal).getByRole("button", { name: "Add as is" }));
        await within(modal).findByText("Same person?");
        assert.include(modal.textContent, "1 of 2");
        assert.notInclude(modal.textContent, "source:", "no internal id");
        await userEvent.click(within(modal).getByRole("button", { name: "Merge" }));
        history = session.history.steps.length;
        await done(modal);
        assert.strictEqual(session.history.steps.length, history + 1, "one undo step");
        const all = ["B1", "B2", "B3", "D1", "D2", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "T0", "V1"];
        await waitFor(() => {
            assert.deepStrictEqual(nodeIds(session), all, "B1 merged, V1 added");
        });
        const steps = session.data.steps();
        assert.deepStrictEqual(
            steps.filter((row) => row.op !== "join.add").map((row) => row.op),
            ["join.edges", "join.edges", "join.merge"],
            "the entries' two edge steps and HR's merge",
        );
        assert.strictEqual(steps.at(-1)?.op, "join.add");

        // Undo returns the visitors to staged; Redo adds them again.
        await press("{Control>}z{/Control}");
        await screen.findByRole("listitem", { name: "visitors.csv" });
        await waitFor(() => {
            assert.notInclude(nodeIds(session), "V1");
        });
        assert.strictEqual(edgesOf(session, "entered"), 5, "the joins stay");
        await press("{Control>}{Shift>}z{/Shift}{/Control}");
        await waitFor(() => {
            assert.deepStrictEqual(nodeIds(session), all);
        });
        assert.strictEqual(session.data.node("B2")?.dept, "Lab");
        assert.strictEqual(edgesOf(session, "at"), 6);
    });
});
