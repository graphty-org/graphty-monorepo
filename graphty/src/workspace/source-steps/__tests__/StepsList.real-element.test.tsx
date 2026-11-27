/**
 * The committed steps and the reader's edits in the join workspace, on the REAL graphty-element with
 * the source-steps experiment on (design/data/multiple-data-sources-design.md, sections 7.13 and
 * 7.17), driven by clicks and keys, in the owner's founding example. The workspace shows every join as a card,
 * the open one holding its controls; removing the edge step's card takes its edges away and Done commits
 * that as one undo step. HR's merge card lists the column whose values differ, with its rule and
 * how its rows reduce. A pick on HR's list is a reader edit, listed under Reader edits (R) and
 * taken back by its Delete. Remove in people.csv's menu opens the workspace on the removal, naming
 * the later steps that go with it, and Undo brings it back.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { createGraphSession, type GraphSession, type SourceClashRule } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { choose, done, emptyProject, joinLines, openJoins as workspace, removeOpen, selectJoin } from "./sourceSteps";

withFeatures(["source-steps"]);

const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales";
/** B9 badges no person. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE5,B3,D3\nE6,B2,D2";
/** HR's list: B1 and B2 name another department. */
const HR = "badge,dept\nB1,Operations\nB2,Research\nB3,Sales";

/**
 * People in the graph as type person, on the Data place of a desktop window.
 * @returns the session and people's key.
 */
async function withPeople(): Promise<{ session: GraphSession; people: string }> {
    await page.viewport(1440, 900);
    const { session, store } = await emptyProject();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    return { session, people: session.data.sources()[0]?.key ?? "" };
}

/**
 * The entries joined to people: an edge "entered" from each person to the entries they badged.
 * @param session - the session.
 * @returns the entries' key.
 */
async function joinEntries(session: GraphSession): Promise<string> {
    const entries = await session.data.stage(
        { type: "csv", config: { data: ENTRIES }, name: "entries.csv" },
        { key: "entry", type: "entry" },
    );
    const draft = session.data.draft();
    draft.connect({ from: { source: entries, field: "badge" }, into: { space: "person" }, edgeType: "entered" });
    await draft.commit();
    return entries;
}

/**
 * HR's list merged into people, with a rule for dept.
 * @param session - the session.
 * @param rule - dept's rule.
 * @param pick - also take HR's dept on every cell, as reader picks.
 * @returns HR's key.
 */
async function mergeHr(session: GraphSession, rule: SourceClashRule, pick = false): Promise<string> {
    const hr = await session.data.stage({ type: "csv", config: { data: HR }, name: "hr.csv" }, { key: "badge" });
    const draft = session.data.draft();
    draft.merge({ from: { source: hr, field: "badge" }, into: { space: "person" }, clash: { dept: rule } });
    if (pick) {
        draft.pickAll({ column: "dept", source: hr, only: "all" });
    }
    await draft.commit();
    return hr;
}

/**
 * Whether a source is still in the graph.
 * @param session - the session.
 * @param key - the source.
 * @returns true when it is.
 */
function sourcesHold(session: GraphSession, key: string): boolean {
    return session.data.sources().some((each) => each.key === key);
}

describe("steps and reader edits in the join workspace (source-steps)", () => {
    it("lists every join, one line each; removing the edges' takes them away, one undo step", async () => {
        const { session } = await withPeople();
        await joinEntries(session);
        await mergeHr(session, "keep");
        const modal = await workspace();
        assert.deepStrictEqual(joinLines(modal), ["people + entries", "people + hr", "New join"]);
        assert.isAbove(session.data.edges().length, 0);

        const steps = session.history.steps.length;
        await selectJoin(modal, "people + entries");
        await removeOpen(modal);
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["people + hr", "New join"]);
        });
        assert.isTrue(
            session.data.steps().some((row) => row.op === "join.edges"),
            "nothing is committed before Done",
        );
        await done(modal);
        assert.lengthOf(session.data.edges(), 0, "the edges went with the step");
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        await session.undo();
        await waitFor(() => {
            assert.isAbove(session.data.edges().length, 0);
        });

        const again = await workspace();
        await selectJoin(again, "people + entries");
        await removeOpen(again);
        await done(again);
        await screen.findAllByText("Removed");
        assert.isNotEmpty(screen.getAllByRole("button", { name: "Undo" }), "the notice offers Undo");
        assert.lengthOf(session.data.edges(), 0, "after an Undo, removing it again still says so, with Undo");
    });

    it("HR's card lists dept with its rule; Use incoming there puts HR's departments in", async () => {
        const { session } = await withPeople();
        await mergeHr(session, "keep");
        assert.strictEqual(session.data.node("B1")?.dept, "Ops");
        const modal = await workspace();
        await selectJoin(modal, "people + hr");
        await choose(modal, "Both have dept", "Use incoming");
        assert.isNull(
            within(modal).queryByRole("button", { name: "Expand Advanced" }),
            "no person takes several rows, so how they reduce is not asked",
        );
        await done(modal);
        assert.strictEqual(session.data.node("B1")?.dept, "Operations");
    });

    it("HR's card reopens on its rule; Keep existing puts people.csv's departments back", async () => {
        const { session } = await withPeople();
        await mergeHr(session, "overwrite");
        assert.strictEqual(session.data.node("B1")?.dept, "Operations");
        const modal = await workspace();
        await selectJoin(modal, "people + hr");
        const rule = await within(modal).findByRole<HTMLInputElement>("combobox", { name: "Both have dept" });
        assert.strictEqual(rule.value, "Use incoming", "on the rule it was committed with");
        await choose(modal, "Both have dept", "Keep existing");
        await done(modal);
        assert.deepStrictEqual(
            ["B1", "B2"].map((id) => session.data.node(id)?.dept),
            ["Ops", "Lab"],
        );
        await session.undo();
        assert.strictEqual(session.data.node("B1")?.dept, "Operations", "one undo step");
    });

    it("two joins from one source are a line each, whole; two of the same sources add their field", async () => {
        const { session } = await withPeople();
        const entries = await joinEntries(session);
        const doors = await session.data.stage(
            { type: "csv", config: { data: "door,title\nD1,North\nD2,South" }, name: "doors.csv" },
            { key: "door", type: "door" },
        );
        const draft = session.data.draft();
        draft.connect({ from: { source: entries, field: "door" }, into: { source: doors } });
        draft.connect({ from: { source: entries, field: "entry" }, into: { space: "person", field: "name" } });
        await draft.commit();
        const modal = await workspace();
        assert.deepStrictEqual(joinLines(modal), [
            "people + entries, badge",
            "entries + doors",
            "people + entries, name",
            "New join",
        ]);
        for (const row of modal.querySelectorAll(".cm-card-title")) {
            assert.isAtMost(row.scrollWidth, row.clientWidth, "never cut");
        }
        await selectJoin(modal, "entries + doors");
        // Committed and left as it is, it adds nothing the graph lacks, as the key says.
        const counts = (): string => modal.querySelector("[data-join-editor] .jw-counts")?.textContent ?? "";
        await waitFor(() => {
            assert.include(counts(), "matched", "its counts are drawn");
        });
        assert.notInclude(counts(), "new edge");
    });

    it("lists a pick under Reader edits (R) in the workspace, and its Delete takes it back on Done", async () => {
        const { session } = await withPeople();
        await mergeHr(session, "keep", true);
        const edits = session.data.edits();
        assert.isAbove(edits.length, 0, "the picks are reader edits");
        const modal = await workspace();
        const toggle = within(modal).getByRole("button", { name: /^Reader edits/ });
        assert.strictEqual(toggle.getAttribute("aria-expanded"), "false");
        (document.activeElement as HTMLElement | null)?.blur();
        modal.focus();
        await userEvent.keyboard("r");
        const list = await within(modal).findByRole("list", { name: "Reader edits" });
        assert.lengthOf(within(list).getAllByRole("listitem"), edits.length);
        const b1 = within(list).getByRole("listitem", { name: "Pick B1" });
        assert.include(b1.textContent ?? "", "dept = Operations");
        assert.include(b1.textContent ?? "", "hr.csv", "names the source it took");
        await userEvent.click(within(b1).getByRole("button", { name: "Delete Pick B1" }));
        await waitFor(() => {
            assert.isNull(within(list).queryByRole("listitem", { name: "Pick B1" }));
        });
        await done(modal);
        assert.lengthOf(session.data.edits(), edits.length - 1);
        assert.strictEqual(session.data.node("B1")?.dept, "Ops", "the rule decides B1 again");
    });

    it("Remove in people.csv's menu opens the workspace on the removal, naming later steps; Undo brings it back", async () => {
        const { session, people } = await withPeople();
        await joinEntries(session);
        const hr = await session.data.stage({ type: "csv", config: { data: HR }, name: "hr.csv" }, { key: "badge" });
        const merge = session.data.draft();
        merge.merge({ from: { source: hr, field: "badge" }, into: { space: "person" }, unmatchedFrom: "drop" });
        await merge.commit();
        const nodes = session.data.statistics({ scope: "all" }).nodeCount;
        const row = await screen.findByRole("listitem", { name: "people.csv" });
        await userEvent.click(within(row).getByRole("button", { name: "people.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
        const modal = await screen.findByRole("dialog", { name: "Join" });
        const strip = await within(modal).findByRole("region", { name: "Remove people" });
        const later = within(strip).getByRole("group", { name: "Other joins" });
        assert.strictEqual(
            later.textContent,
            "Other joins 2people + entries: removedpeople + hr: removed",
            "each join that goes with it, by its line in the list",
        );
        assert.isTrue(sourcesHold(session, people), "nothing removed yet");
        await done(modal);
        assert.isFalse(sourcesHold(session, people));
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.isTrue(sourcesHold(session, people));
        });
        assert.strictEqual(session.data.statistics({ scope: "all" }).nodeCount, nodes, "every node is back");
    });

    it("Remove on a source from a file saved with the experiment off takes its nodes out", async () => {
        const off = createGraphSession({ features: [] });
        await off.data.import({ type: "csv", config: { data: "source,target\na,b\nb,c" }, name: "links.csv" });
        const { text } = await off.project.save();
        off.dispose();
        await page.viewport(1440, 900);
        const { session, store } = await emptyProject();
        await session.project.open(text);
        store.set({ dockOpen: false, dockMaximized: false });
        assert.lengthOf(session.data.steps(), 0, "no step builds it");
        const row = await screen.findByRole("listitem", { name: "links.csv" });
        await userEvent.click(within(row).getByRole("button", { name: "links.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
        await waitFor(() => {
            assert.lengthOf(session.data.sources(), 0);
        });
        assert.strictEqual(session.data.statistics({ scope: "all" }).nodeCount, 0, "its nodes go with it");
        assert.isNull(screen.queryByRole("dialog", { name: "Join" }), "no workspace for it");
    });
});
