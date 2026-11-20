/**
 * The committed steps and the reader's edits on the REAL graphty-element with the source-steps
 * experiment on (design/data/multiple-data-sources-design.md, sections 7.13 and 7.17), driven by
 * clicks and keys, in the owner's founding example. After door entries are made into edges to the
 * people who badged in, Steps lists each step with the element's counts; Delete on the edge step
 * shows the edges going and commits as one undo step. Edit on HR's merge reopens the Join card on
 * its rule, and Keep 1 puts people.csv's departments back; a changed direction makes the new act in
 * the old step's place. A pick on HR's list is a reader edit,
 * listed under Reader edits (R) and taken back by its Delete. Remove in people.csv's menu names
 * the later steps that go with it (HR's merge, never its own Add), and Undo brings it back.
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
        const card = await screen.findByRole("form", { name: "Join" });
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
            assert.isNull(screen.queryByRole("form", { name: "Join" }));
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
        const card = await screen.findByRole("form", { name: "Join" });
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
            assert.isNull(screen.queryByRole("form", { name: "Join" }));
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
            `Later steps 1Step ${String((hrStep?.index ?? 0) + 1)}: step removed`,
            "only HR's merge is a later step; people.csv's own Add is what Remove removes",
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
