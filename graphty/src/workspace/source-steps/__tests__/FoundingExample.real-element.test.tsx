/**
 * The owner's founding example end to end on the REAL graphty-element with the source-steps
 * experiment on (design/data/multiple-data-sources-design.md, sections 5.1-5.6, 7.13 and 13),
 * driven only by drops, clicks, typing and keys: buildings.csv is dropped on an empty project and
 * drawn at once; people arrive staged, are given the type person in their section and are added;
 * door entries are joined to the people who badged in (an edge "entered", ignoring case, the test
 * badge's entry left out) and to the buildings whose doors they opened (an edge "at"); HR's
 * list is merged into people with Use 2 for dept and one pick back to people.csv's value; visitors
 * are added as people too, answering the key-overlap question. Before / After flips the drawing, each
 * card commits one undo step, Steps lists every step, and Undo returns the visitors to staged and
 * Redo adds them again.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { choose, count, drop, emptyProject, rowWith, select } from "./sourceSteps";

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
 * Presses a key with nothing focused, as a reader does over the canvas.
 * @param keys - the keys, in userEvent's notation.
 */
async function press(keys: string): Promise<void> {
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard(keys);
}

/**
 * Picks Make an edge, types its edge type and clicks Preview.
 * @param card - the Join card.
 * @param edgeType - the edge type.
 * @returns the card's Preview section.
 */
async function previewEdge(card: HTMLElement, edgeType: string): Promise<HTMLElement> {
    await userEvent.click(within(card).getByRole("radio", { name: "Make an edge" }));
    await userEvent.click(within(card).getByRole("combobox", { name: "Edge type" }));
    await userEvent.keyboard(edgeType);
    await userEvent.keyboard("{Tab}");
    await userEvent.click(within(card).getByRole("button", { name: /^Preview/ }));
    return within(card).findByRole("region", { name: "Preview" });
}

/**
 * Clicks the card's Commit and waits for it to close.
 * @param card - the card.
 * @param name - the card's name.
 */
async function commit(card: HTMLElement, name: string): Promise<void> {
    await userEvent.click(within(card).getByRole("button", { name: /^Commit/ }));
    await waitFor(() => {
        assert.isNull(screen.queryByRole("form", { name }));
    });
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

        // People arrive staged, drawing nothing; the reader types their Type, person, and Add adds
        // them.
        const people = await stage("people.csv", PEOPLE);
        assert.strictEqual(session.data.nodes().length, 2, "a staged source draws nothing");
        await userEvent.click(within(people).getByRole("combobox", { name: "Type" }));
        await userEvent.keyboard("person{Enter}");
        await waitFor(() => {
            const key = session.data.staged()[0]?.key ?? "";
            assert.strictEqual(session.data.sourceTable(key).summary().mapping.type, "person");
        });
        await userEvent.click(within(people).getByRole("button", { name: /^Add/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "people.csv" }));
        });
        assert.deepStrictEqual(nodeIds(session), ["B1", "B2", "B3", "D1", "D2", "T0"]);

        // Entries to people by badge: Make an edge "entered", ignoring case so b3 meets B3.
        await stage("entries.csv", ENTRIES);
        await press("j");
        let card = await screen.findByRole("form", { name: "Join" });
        await choose(card, "Field 1 type", "person");
        await choose(card, "Field 1 field", "Key");
        await choose(card, "Field 2 field", "badge");
        await userEvent.click(within(card).getByRole("switch", { name: "Ignore case" }));
        let section = await previewEdge(card, "entered");
        assert.strictEqual(count(section, "new edges"), "6", "every entry but B9's");

        // The test badge's entry is left out, from the dock's rows.
        await userEvent.click(within(section).getByRole("button", { name: "Show new edges rows" }));
        const rows = await screen.findByRole("grid", { name: "Rows" });
        await select(rowWith(rows, "T0"));
        await userEvent.click(await within(card).findByRole("button", { name: "Exclude selected (1)" }));
        await waitFor(() => {
            assert.strictEqual(count(section, "new edges"), "5");
        });
        assert.isNotNull(within(within(card).getByRole("group", { name: "Excluded" })).getByText("E7"));

        // Before / After over the canvas: After first, B flips it and back.
        const draft = session.data.currentDraft();
        assert.isNotNull(draft);
        const chip = await screen.findByRole("radiogroup", { name: "Before / After" });
        await waitFor(() => {
            assert.isTrue(draft?.displayed);
        });
        assert.strictEqual(draft?.side, "after");
        await waitFor(() => {
            assert.strictEqual(session.data.statistics().edgeCount, 5, "After draws the draft");
        });
        await press("b");
        await waitFor(() => {
            assert.strictEqual(draft?.side, "before");
        });
        assert.isTrue(within(chip).getByRole<HTMLInputElement>("radio", { name: "Before" }).checked);
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, 0, "Before draws the project");
        });
        await press("b");
        await waitFor(() => {
            assert.strictEqual(draft?.side, "after");
        });

        // Enter commits it as one undo step.
        const history = session.history.steps.length;
        await press("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Join" }));
        });
        assert.strictEqual(session.history.steps.length, history + 1, "one undo step");
        assert.isNull(screen.queryByRole("radiogroup", { name: "Before / After" }), "the chip goes with the draft");
        assert.strictEqual(edgesOf(session, "entered"), 5);
        assert.isNull(screen.queryByRole("region", { name: "entries.csv" }), "entries are no longer staged");

        // Entries to buildings by door, from Join in the Sources header: nothing is staged and no
        // node selected, so it is the one Join button.
        await userEvent.click(screen.getByRole("button", { name: /^Join/ }));
        card = await screen.findByRole("form", { name: "Join" });
        await choose(card, "Field 1 type", "buildings.csv");
        await choose(card, "Field 1 field", "Key");
        await choose(card, "Field 2 source", "entries.csv");
        await choose(card, "Field 2 field", "door");
        section = await previewEdge(card, "at");
        assert.strictEqual(count(section, "new edges"), "6", "every entry but E5's D3");
        await commit(card, "Join");
        assert.strictEqual(edgesOf(session, "at"), 6);

        // HR's list merged into people: Use 2 for dept, then one pick keeps people.csv's Lab.
        await stage("hr.csv", HR);
        await press("j");
        card = await screen.findByRole("form", { name: "Join" });
        await choose(card, "Field 1 type", "person");
        await choose(card, "Field 1 field", "Key");
        await choose(card, "Field 2 field", "badge");
        await userEvent.click(within(card).getByRole("radio", { name: "Merge 2 into 1" }));
        await press("{Shift>}P{/Shift}");
        section = await within(card).findByRole("region", { name: "Preview" });
        assert.strictEqual(count(section, "merged"), "3");
        const differ = within(section).getByRole("group", { name: "Values differ" });
        assert.strictEqual(within(differ).getByLabelText("dept values differ").textContent, "2");
        await choose(section, "dept rule", "Use 2");
        await waitFor(() => {
            assert.strictEqual(
                within(differ).getByRole<HTMLInputElement>("combobox", { name: "dept rule" }).value,
                "Use 2",
            );
        });
        await userEvent.click(within(section).getByRole("button", { name: "Show dept cells" }));
        const cells = await screen.findByRole("grid", { name: "Cells" });
        await select(rowWith(cells, "B2"));
        await userEvent.click(await within(card).findByRole("button", { name: "Pick 1 (1)" }));
        await waitFor(() => {
            assert.strictEqual(within(differ).getByLabelText("dept decided").textContent, "decided 1");
        });
        await commit(card, "Join");
        assert.strictEqual(session.data.node("B1")?.dept, "Operations", "HR's department, by the rule");
        assert.strictEqual(session.data.node("B2")?.dept, "Lab", "people.csv's department, by the pick");

        // Visitors as people too: Add asks whether their badges are the same people, and waits for it.
        const visitors = await stage("visitors.csv", VISITORS);
        await userEvent.click(within(visitors).getByRole("combobox", { name: "Type" }));
        await userEvent.keyboard("person{Enter}");
        await waitFor(() => {
            const key = session.data.staged()[0]?.key ?? "";
            assert.strictEqual(session.data.sourceTable(key).summary().mapping.type, "person");
        });
        await press("{Shift>}D{/Shift}");
        card = await within(visitors).findByRole("form", { name: "Add" });
        assert.include(card.textContent, "Same person?");
        assert.include(card.textContent, "1 of 2");
        assert.notInclude(card.textContent, "source:", "no internal id");
        const add = within(card).getByRole("button", { name: /^Commit/ });
        assert.isTrue(add.hasAttribute("disabled"), "Commit waits for an answer");
        await userEvent.click(within(card).getByRole("radio", { name: "Merge" }));
        await waitFor(() => {
            assert.isFalse(add.hasAttribute("disabled"));
        });
        await commit(card, "Add");
        const all = ["B1", "B2", "B3", "D1", "D2", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "T0", "V1"];
        await waitFor(() => {
            assert.deepStrictEqual(nodeIds(session), all, "B1 merged, V1 added");
        });

        // Steps lists every step the element built, in order, ending with the visitors added.
        const steps = session.data.steps();
        const stepsList = await screen.findByRole("list", { name: "Steps" });
        await waitFor(() => {
            assert.lengthOf(within(stepsList).getAllByRole("listitem"), steps.length);
        });
        assert.deepStrictEqual(
            steps.filter((row) => row.op !== "join.add").map((row) => row.op),
            ["join.edges", "join.edges", "join.merge"],
            "the entries' two edge steps and HR's merge",
        );
        assert.strictEqual(steps.at(-1)?.op, "join.add");

        // Undo returns the visitors to staged; Redo adds them again.
        await press("{Control>}z{/Control}");
        await screen.findByRole("region", { name: "visitors.csv" });
        await waitFor(() => {
            assert.notInclude(nodeIds(session), "V1");
        });
        assert.strictEqual(edgesOf(session, "entered"), 5, "the joins stay");
        await press("{Control>}{Shift>}z{/Shift}{/Control}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "visitors.csv" }));
        });
        await waitFor(() => {
            assert.deepStrictEqual(nodeIds(session), all);
        });
        assert.strictEqual(session.data.node("B2")?.dept, "Lab");
        assert.strictEqual(edgesOf(session, "at"), 6);
    });
});
