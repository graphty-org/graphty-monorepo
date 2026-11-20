/**
 * The committed steps and the reader's edits on the REAL graphty-element with the source-steps
 * experiment on (design/data/multiple-data-sources-design.md, sections 7.13 and 7.17), driven by
 * clicks and keys, in the owner's founding example. After door entries are made into edges to the
 * people who badged in, Steps lists each step with the element's counts; Delete on the edge step
 * shows the edges going and commits as one undo step. Edit on HR's merge reopens the Join card on
 * its rule, and Keep 1 puts people.csv's departments back; a changed direction makes the new act in
 * the old step's place. A pick on HR's list is a reader edit,
 * listed under Reader edits (R) and taken back by its Delete. Remove in people.csv's menu names
 * the later steps that go with it (HR's merge, never its own Add) and those whose counts drop,
 * and Undo brings it back.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SourceClashRule } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { stepCountWords } from "../words";
import { choose, emptyProject } from "./sourceSteps";

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
 * The Steps list.
 * @returns it.
 */
async function stepsList(): Promise<HTMLElement> {
    return screen.findByRole("list", { name: "Steps" });
}

/**
 * The founding example as "Open a file" leaves it: people.csv with no type, so its nodes are in
 * its own space, entries.csv joined onto that space as edges, and HR's list merged into it.
 * @returns the session and people's key.
 */
async function untypedFoundingExample(): Promise<{ session: GraphSession; people: string }> {
    await page.viewport(1440, 900);
    const { session, store } = await emptyProject();
    await session.data.import({ type: "csv", config: { data: PEOPLE }, name: "people.csv" }, { key: "badge" });
    store.set({ dockOpen: false, dockMaximized: false });
    const people = session.data.sources()[0]?.key ?? "";
    const space = session.data.spaces().find((row) => row.ownedBy === people)?.space ?? "";
    const entries = await session.data.stage(
        { type: "csv", config: { data: ENTRIES }, name: "entries.csv" },
        { key: "entry", type: "entry" },
    );
    const connect = session.data.draft();
    connect.connect({ from: { source: entries, field: "badge" }, into: { space }, edgeType: "entered" });
    await connect.commit();
    const hr = await session.data.stage({ type: "csv", config: { data: HR }, name: "hr.csv" }, { key: "badge" });
    const merge = session.data.draft();
    merge.merge({ from: { source: hr, field: "badge" }, into: { space } });
    await merge.commit();
    return { session, people };
}

describe("Steps and Reader edits (source-steps)", () => {
    it("lists each step with the element's counts; Delete on the edge step previews the edges going and commits one step", async () => {
        const { session } = await withPeople();
        await joinEntries(session);
        const rows = session.data.steps();
        assert.deepStrictEqual(
            rows.map((row) => row.op),
            ["join.add", "join.add", "join.edges"],
        );
        const list = await stepsList();
        await waitFor(() => {
            assert.lengthOf(within(list).getAllByRole("listitem"), rows.length);
        });
        for (const row of rows) {
            const item = within(list).getByRole("listitem", { name: `Step ${String(row.index + 1)}` });
            assert.strictEqual(
                within(item).getByLabelText(`Step ${String(row.index + 1)} counts`).textContent,
                stepCountWords(row),
                "the element's counts",
            );
        }
        const edgeItem = within(list).getByRole("listitem", { name: "Step 3" });
        assert.include(edgeItem.textContent ?? "", "Edges");
        assert.include(edgeItem.textContent ?? "", "5 edges", "E1, E2, E3, E5 and E6");
        assert.strictEqual(
            within(edgeItem).getByLabelText("Step 3 joins").textContent,
            "badge -> person",
            "what the step joined, so two joins from one source read apart",
        );
        assert.include(within(list).getByRole("listitem", { name: "Step 1" }).textContent ?? "", "Add");

        const steps = session.history.steps.length;
        await userEvent.click(within(edgeItem).getByRole("button", { name: "Delete Step 3" }));
        const card = await screen.findByRole("form", { name: "Delete step 3" });
        assert.strictEqual(within(card).getByLabelText("Edges after").textContent, "5 -> 0");
        assert.strictEqual(
            within(card).getByLabelText("Delete step 3 subject").textContent,
            "Edges entries.csv badge -> person",
        );
        const later = within(card).getByRole("group", { name: "Later steps" });
        assert.strictEqual(later.textContent, "Later steps 0", "the last step takes no other with it");
        assert.strictEqual(within(card).getByLabelText("Nodes after").textContent, "no change");
        assert.strictEqual(session.history.steps.length, steps, "the preview writes nothing");
        await waitFor(() => {
            assert.isTrue(session.data.currentDraft()?.displayed);
        });
        await userEvent.click(within(card).getByRole("button", { name: /^Commit/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Delete step 3" }));
        });
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        assert.strictEqual(session.data.statistics({ scope: "all" }).edgeCount, 0);
        await waitFor(async () => {
            assert.lengthOf(within(await stepsList()).getAllByRole("listitem"), 2);
        });
    });

    it("a join onto an untyped source names that source, and its counts, Edit and Del stay inside the list", async () => {
        const { session } = await untypedFoundingExample();
        const edges = session.data.steps().find((row) => row.op === "join.edges");
        assert.isDefined(edges);
        const label = `Step ${String((edges?.index ?? 0) + 1)}`;
        const list = await stepsList();
        const item = await within(list).findByRole("listitem", { name: label });
        assert.strictEqual(within(item).getByLabelText(`${label} joins`).textContent, "badge -> people.csv");
        assert.strictEqual(within(item).getByLabelText(`${label} counts`).textContent, "5 edges");
        const box = list.getBoundingClientRect();
        for (const name of [`Edit ${label}`, `Delete ${label}`]) {
            const button = within(item).getByRole("button", { name });
            const rect = button.getBoundingClientRect();
            assert.isAtMost(rect.right, box.right, `${name} is inside the list`);
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            assert.isTrue(hit !== null && button.contains(hit), `${name} is what a click at its center reaches`);
        }
        const counts = within(item).getByLabelText(`${label} counts`).getBoundingClientRect();
        assert.isAtMost(counts.right, box.right, "the counts are inside the list");

        await userEvent.click(within(item).getByRole("button", { name: `Delete ${label}` }));
        const card = await screen.findByRole("form", { name: `Delete step ${String((edges?.index ?? 0) + 1)}` });
        assert.strictEqual(
            within(card).getByLabelText(`Delete step ${String((edges?.index ?? 0) + 1)} subject`).textContent,
            "Edges entries.csv badge -> people.csv",
        );
        await userEvent.keyboard("{Escape}");
    });

    it("Remove on the untyped source other steps join onto lists the later steps whose counts drop", async () => {
        const { session } = await untypedFoundingExample();
        const rows = session.data.steps();
        const edges = rows.find((row) => row.op === "join.edges");
        const merge = rows.find((row) => row.op === "join.merge");
        assert.strictEqual(edges === undefined ? "" : stepCountWords(edges), "5 edges");
        assert.strictEqual(merge === undefined ? "" : stepCountWords(merge), "3 merged");
        const row = await screen.findByRole("listitem", { name: "people.csv" });
        await userEvent.click(within(row).getByRole("button", { name: "people.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
        const card = await screen.findByRole("form", { name: "Remove people.csv" });
        assert.strictEqual(within(card).getByLabelText("Edges after").textContent, "5 -> 0");
        const later = within(card).getByRole("group", { name: "Later steps" });
        assert.include(later.textContent ?? "", "Later steps 2");
        assert.include(
            later.textContent ?? "",
            `Step ${String((edges?.index ?? 0) + 1)} Edges: 5 edges -> 0 edges`,
            "the edge step keeps no edge",
        );
        assert.include(
            later.textContent ?? "",
            `Step ${String((merge?.index ?? 0) + 1)} Merge: 3 merged -> 0 merged`,
            "HR's merge finds no person",
        );
        await userEvent.keyboard("{Escape}");
    });

    it("Del on a Steps row's button opens the card, and Esc cancels it with nothing written", async () => {
        const { session } = await withPeople();
        await joinEntries(session);
        const list = await stepsList();
        const steps = session.history.steps.length;
        within(list).getByRole("button", { name: "Edit Step 3" }).focus();
        await userEvent.keyboard("{Delete}");
        await screen.findByRole("form", { name: "Delete step 3" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Delete step 3" }));
        });
        assert.isNull(session.data.currentDraft(), "the draft is discarded");
        assert.strictEqual(session.history.steps.length, steps);
        assert.strictEqual(session.data.statistics({ scope: "all" }).edgeCount, 5);
    });

    it("Edit on HR's merge reopens the Join card on its rule; Keep 1 puts people.csv's departments back", async () => {
        const { session } = await withPeople();
        await mergeHr(session, "overwrite");
        assert.strictEqual(session.data.node("B1")?.dept, "Operations", "Use 2 took HR's");
        const merge = session.data.steps().find((row) => row.op === "join.merge");
        assert.isDefined(merge);
        const name = `Step ${String((merge?.index ?? 0) + 1)}`;
        const list = await stepsList();
        const steps = session.history.steps.length;
        await userEvent.click(within(list).getByRole("button", { name: `Edit ${name}` }));
        const card = await screen.findByRole("form", { name: `${name} Merge hr.csv` });
        const preview = await within(card).findByRole("region", { name: "Preview" });
        assert.isTrue(
            within(card).getByRole<HTMLInputElement>("radio", { name: "Merge 2 into 1" }).checked,
            "the step's act",
        );
        const differ = within(preview).getByRole("group", { name: "Values differ" });
        const rule = within(differ).getByRole<HTMLInputElement>("combobox", { name: "dept rule" });
        assert.strictEqual(rule.value, "Use 2", "the step's rule");
        await choose(differ, "dept rule", "Keep 1");
        const dept = (): { rule: string; decided: number } | undefined => {
            const step = session.data
                .currentDraft()
                ?.preview()
                .steps.find((row) => row.index === merge?.index);
            const found = step?.valuesDiffer.find((each) => each.params.column === "dept");
            return found === undefined ? undefined : { rule: found.params.rule, decided: found.params.decided };
        };
        await waitFor(() => {
            assert.strictEqual(dept()?.rule, "keep");
        });
        await waitFor(() => {
            assert.strictEqual(
                within(differ).getByLabelText("dept decided").textContent,
                `decided ${String(dept()?.decided)}`,
                "the decided count the element reports",
            );
        });
        assert.strictEqual(session.history.steps.length, steps, "nothing written yet");
        await userEvent.click(within(card).getByRole("button", { name: /^Commit/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: `${name} Merge hr.csv` }));
        });
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        assert.strictEqual(session.data.node("B1")?.dept, "Ops", "Keep 1 keeps people.csv's");
        const slot = document.querySelector<HTMLElement>(".ws-notice-slot");
        assert.isNotNull(slot);
        if (slot !== null) {
            await within(slot).findByText("Edited hr.csv");
        }
    });

    it("Edit on the edge step with the direction changed makes the new act in place of the step, one undo step", async () => {
        const { session } = await withPeople();
        await joinEntries(session);
        const edges = (): string[] =>
            session.data
                .edges()
                .map((e) => `${String(e.source)}->${String(e.target)}`)
                .sort();
        const before = edges();
        const list = await stepsList();
        const steps = session.history.steps.length;
        await userEvent.click(within(list).getByRole("button", { name: "Edit Step 3" }));
        const card = await screen.findByRole("form", { name: "Step 3 Edges entries.csv" });
        await within(card).findByRole("region", { name: "Preview" });
        assert.isTrue(within(card).getByRole<HTMLInputElement>("radio", { name: "Make an edge" }).checked);
        // The direction is a segmented control: its radio is hidden, a reader clicks the label.
        const twoToOne = within(card).getByRole<HTMLInputElement>("radio", { name: "2->1" });
        await userEvent.click(twoToOne.labels?.[0] ?? twoToOne);
        await waitFor(() => {
            assert.isNull(within(card).queryByRole("region", { name: "Preview" }), "the act is picked again");
        });
        await userEvent.click(within(card).getByRole("button", { name: /^Preview/ }));
        const preview = await within(card).findByRole("region", { name: "Preview" });
        assert.strictEqual(within(preview).getByLabelText("Edges after").textContent, "no change", "5 edges, turned");
        await userEvent.click(within(card).getByRole("button", { name: /^Commit/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Step 3 Edges entries.csv" }));
        });
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        const turned = before.map((pair) => pair.split("->").reverse().join("->")).sort();
        assert.deepStrictEqual(edges(), turned, "every edge runs the other way");
        assert.lengthOf(session.data.steps(), 3, "the new act took the old step's place");
    });

    it("a pick is listed under Reader edits (R), and its Delete takes it back", async () => {
        const { session } = await withPeople();
        await mergeHr(session, "keep", true);
        const edits = session.data.edits();
        assert.isAbove(edits.length, 0, "the picks are reader edits");
        assert.strictEqual(session.data.node("B1")?.dept, "Operations", "the pick took HR's");
        const toggle = await screen.findByRole("button", { name: /^Reader edits/ });
        assert.strictEqual(toggle.getAttribute("aria-expanded"), "false");
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("r");
        const list = await screen.findByRole("list", { name: "Reader edits" });
        assert.lengthOf(within(list).getAllByRole("listitem"), edits.length);
        const b1 = within(list).getByRole("listitem", { name: "Pick B1" });
        assert.include(b1.textContent ?? "", "dept = Operations");
        assert.include(b1.textContent ?? "", "hr.csv", "names the source it took");

        const steps = session.history.steps.length;
        await userEvent.click(within(b1).getByRole("button", { name: "Delete Pick B1" }));
        await waitFor(() => {
            assert.lengthOf(session.data.edits(), edits.length - 1);
        });
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        assert.strictEqual(session.data.node("B1")?.dept, "Ops", "the rule decides B1 again");
        await waitFor(() => {
            assert.isNull(within(list).queryByRole("listitem", { name: "Pick B1" }));
        });
    });

    it("Remove in people.csv's menu names the later steps that go with it, and Undo brings it back", async () => {
        const { session, people } = await withPeople();
        await joinEntries(session);
        // HR's merge drops rows naming no person, so it reads people.csv and goes with it.
        const hr = await session.data.stage({ type: "csv", config: { data: HR }, name: "hr.csv" }, { key: "badge" });
        const merge = session.data.draft();
        merge.merge({ from: { source: hr, field: "badge" }, into: { space: "person" }, unmatchedFrom: "drop" });
        await merge.commit();
        const hrStep = session.data.steps().find((row) => row.source === hr && row.op === "join.merge");
        assert.isDefined(hrStep);
        const nodes = session.data.statistics({ scope: "all" }).nodeCount;
        const row = await screen.findByRole("listitem", { name: "people.csv" });
        await userEvent.click(within(row).getByRole("button", { name: "people.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
        const card = await screen.findByRole("form", { name: "Remove people.csv" });
        const later = within(card).getByRole("group", { name: "Later steps" });
        const removed = session.data
            .currentDraft()
            ?.preview()
            .issues.flatMap((issue) => (issue.code === "W_STEP_REMOVED" ? [issue.params] : []));
        assert.sameMembers(
            (removed ?? []).map((params) => params.step),
            [0, hrStep?.index ?? -1],
            "the element drops people.csv's own Add and HR's merge",
        );
        assert.strictEqual(
            later.textContent,
            `Later steps 2Step ${String((hrStep?.index ?? 0) + 1)}: step removedStep 3 Edges: 5 edges -> 0 edges`,
            "HR's merge goes and the edge step keeps no edge; people.csv's own Add is what Remove removes",
        );
        assert.notInclude(card.textContent ?? "", "W_STEP_REMOVED", "no code is shown");
        assert.isTrue(sourcesHold(session, people), "nothing removed yet");

        await userEvent.click(within(card).getByRole("button", { name: /^Commit/ }));
        await waitFor(() => {
            assert.isFalse(sourcesHold(session, people));
        });
        const slot = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".ws-notice-slot");
            assert.isNotNull(found);
            return found;
        });
        await within(slot).findByText("Removed people.csv");
        await userEvent.click(within(slot).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.isTrue(sourcesHold(session, people));
        });
        assert.strictEqual(session.data.statistics({ scope: "all" }).nodeCount, nodes, "every node is back");
    });

    it("after an Undo, deleting a step still shows its notice with Undo", async () => {
        const { session } = await withPeople();
        await joinEntries(session);
        await mergeHr(session, "keep");
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.lengthOf(session.data.steps(), 3, "HR's merge is undone, and is the redo step");
        });
        const { length } = session.history.steps;
        const list = await stepsList();
        await userEvent.click(within(list).getByRole("button", { name: "Delete Step 3" }));
        const card = await screen.findByRole("form", { name: "Delete step 3" });
        await userEvent.click(within(card).getByRole("button", { name: /^Commit/ }));
        await waitFor(() => {
            assert.strictEqual(session.data.statistics({ scope: "all" }).edgeCount, 0);
        });
        assert.strictEqual(session.history.steps.length, length, "the commit took the redo step's place");
        const slot = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".ws-notice-slot");
            assert.isNotNull(found);
            return found;
        });
        await within(slot).findByText("Deleted step 3");
        await userEvent.click(within(slot).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.strictEqual(session.data.statistics({ scope: "all" }).edgeCount, 5, "the edges are back");
        });
    });

    it("Edit names the step, and a changed field lists the later step whose counts it moves before Commit", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
        store.set({ dockOpen: false, dockMaximized: false });
        // HR's list names B4, whom people.csv lacks: the merge keeps B4 as a person, and E7's edge
        // reaches B4 only because the merge runs first.
        const hr = await session.data.stage(
            { type: "csv", config: { data: `${HR}\nB4,Ops` }, name: "hr.csv" },
            { key: "badge" },
        );
        const merge = session.data.draft();
        merge.merge({ from: { source: hr, field: "badge" }, into: { space: "person" } });
        await merge.commit();
        const entries = await session.data.stage(
            { type: "csv", config: { data: `${ENTRIES}\nE7,B4,D1` }, name: "entries.csv" },
            { key: "entry", type: "entry" },
        );
        const connect = session.data.draft();
        connect.connect({
            from: { source: entries, field: "badge" },
            into: { space: "person" },
            edgeType: "entered",
        });
        await connect.commit();
        const rows = session.data.steps();
        const hrStep = rows.find((row) => row.op === "join.merge");
        const edgeStep = rows.find((row) => row.op === "join.edges");
        assert.strictEqual(edgeStep === undefined ? "" : stepCountWords(edgeStep), "6 edges", "E7 reaches B4");
        const hrName = `Step ${String((hrStep?.index ?? 0) + 1)}`;
        const edgeName = `Step ${String((edgeStep?.index ?? 0) + 1)}`;

        const list = await stepsList();
        const steps = session.history.steps.length;
        await userEvent.click(within(list).getByRole("button", { name: `Edit ${hrName}` }));
        const card = await screen.findByRole("form", { name: `${hrName} Merge hr.csv` });
        assert.include(card.textContent ?? "", `${hrName} Merge hr.csv`, "the card names the step it edits");
        await within(card).findByRole("region", { name: "Preview" });
        // Merging on dept, B4's row meets no person: B4 is no longer a person when the edges are made.
        await choose(card, "Field 2 field", "dept");
        await userEvent.click(within(card).getByRole("button", { name: /^Preview/ }));
        const preview = await within(card).findByRole("region", { name: "Preview" });
        const later = await within(preview).findByRole("group", { name: "Later steps" });
        await waitFor(() => {
            assert.include(
                later.textContent ?? "",
                `${edgeName} Edges: 6 edges -> 5 edges`,
                "the edge step loses E7's edge",
            );
        });
        assert.notInclude(later.textContent ?? "", `${hrName}:`, "the step it edits is not a later step");
        assert.isNotNull(within(preview).getByLabelText("Reader edits after"));
        assert.strictEqual(session.history.steps.length, steps, "nothing written before Commit");
        await userEvent.keyboard("{Escape}");
    });
});

/**
 * Whether a source is committed in the project.
 * @param session - the session.
 * @param key - the source.
 * @returns true when `data.sources()` lists it.
 */
function sourcesHold(session: GraphSession, key: string): boolean {
    return session.data.sources().some((each) => each.key === key);
}
