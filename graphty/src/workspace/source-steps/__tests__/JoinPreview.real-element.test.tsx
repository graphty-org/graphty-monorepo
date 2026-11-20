/**
 * The Join card's Preview on the REAL graphty-element with the source-steps experiment on
 * (design/data/multiple-data-sources-design.md, sections 5.3 and 5.4), driven by clicks, typing and
 * keys, in the owner's founding example. Door entries made into edges "entered" to the people who
 * badged in: Preview counts the element's new edges, B flips Before / After (the Overview and the
 * legend follow it), Enter commits one undo step and the notice's Undo returns the entries to
 * staged. HR's list merged into people: a click on Preview previews and commits nothing, dept differs
 * on two people, the rule Use 2 is written to the draft, Min is offered only where the element says
 * the column takes it, and Undo inside the card takes back the rule, then the act. Only 2 Keep counts
 * the new node the merge brings, Drop none; Repeats starts at First and Last folds the last row; a
 * file dropped while the draft is open asks first, and Cancel keeps the draft as it was.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SourceDraft } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import type { WorkspaceStore } from "../../state/store";
import { choose, drop, emptyProject } from "./sourceSteps";

withFeatures(["source-steps"]);

/** Bo's desk is not a number. */
const PEOPLE = "badge,name,dept,floor,desk\nB1,Ann,Ops,1,10\nB2,Bo,Lab,2,x\nB3,Cy,Sales,3,30";
/** B9 badges no person, b3 is B3 typed in lower case. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE5,b3,D3\nE6,B2,D2";
/**
 * HR's list: B1 and B2 name another department, B2 another floor and desk (every desk of HR's a
 * number, Bo's in people.csv not); B7 is no person.
 */
const HR = "badge,dept,floor,desk\nB1,Operations,1,10\nB2,Research,5,20\nB3,Sales,3,30\nB7,Ops,7,70";
/** Two of HR's rows name B1, with different departments. */
const HR_REPEATS = "badge,dept\nB1,Operations\nB1,Research\nB2,Lab";

/**
 * People in the graph as type person, and one more file dropped and staged.
 * @param name - the staged file's name.
 * @param text - its contents.
 * @returns the store and the session.
 */
async function withStaged(name: string, text: string): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    await page.viewport(1440, 900);
    const project = await emptyProject();
    // The app's starting rows, which a test's own project leaves to the test: the Draft row keys a
    // drawn draft in the legend.
    await project.session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    await project.session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    project.store.set({ dockOpen: false, dockMaximized: false });
    drop(name, text);
    await screen.findByRole("region", { name });
    return project;
}

/**
 * Opens the Join card with J and picks Key of person and the staged source's badge.
 * @returns the card.
 */
async function pickBadge(): Promise<HTMLElement> {
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard("j");
    const card = await screen.findByRole("form", { name: "Join" });
    await choose(card, "Field 1 type", "person");
    await choose(card, "Field 1 field", "Key");
    await choose(card, "Field 2 field", "badge");
    return card;
}

/**
 * The open draft.
 * @param session - the session.
 * @returns it.
 */
function draftOf(session: GraphSession): SourceDraft {
    const draft = session.data.currentDraft();
    assert.isNotNull(draft, "a draft is open");
    if (draft === null) {
        throw new Error("no draft");
    }
    return draft;
}

/**
 * What a count of the preview reads, by its words.
 * @param preview - the preview section.
 * @param label - the count's words.
 * @returns its number as shown.
 */
function count(preview: HTMLElement, label: string): string {
    const term = within(preview)
        .getAllByRole("term")
        .find((each) => each.textContent === label);
    assert.isDefined(term, `a count reads ${label}`);
    return term?.parentElement === null || term?.parentElement === undefined
        ? ""
        : (within(term.parentElement).getByRole("definition").textContent ?? "");
}

/**
 * What one of the Overview's counts reads.
 * @param name - the count's name.
 * @returns its value as shown.
 */
function overview(name: string): string {
    const row = screen.getAllByRole("group", { name }).find((each) => each.classList.contains("cm-data-row"));
    assert.isDefined(row, `the Overview shows ${name}`);
    return row?.querySelector("[data-testid=data-row-value]")?.textContent ?? "";
}

/**
 * The legend card's sections, each as its name and its rows' text.
 * @returns the card's text.
 */
async function legendText(): Promise<string> {
    const legend = await screen.findByRole("region", { name: "Legend" });
    return legend.textContent ?? "";
}

/**
 * Opens the Join card on HR's list, picks Merge 2 into 1 and clicks Preview.
 * @param session - the session.
 * @returns the card and its Preview.
 */
async function previewMerge(session: GraphSession): Promise<{ card: HTMLElement; section: HTMLElement }> {
    const card = await pickBadge();
    await userEvent.click(within(card).getByRole("radio", { name: "Merge 2 into 1" }));
    const steps = session.history.steps.length;
    await userEvent.click(within(card).getByRole("button", { name: /^Preview/ }));
    const section = await within(card).findByRole("region", { name: "Preview" });
    assert.isNotNull(session.data.currentDraft(), "the click previews");
    assert.strictEqual(session.history.steps.length, steps, "and commits nothing");
    return { card, section };
}

describe("the Join card's Preview (source-steps)", () => {
    it("entries Make an edge entered: new edges, B flips Before / After, Enter commits one step, Undo stages again", async () => {
        const { store, session } = await withStaged("entries.csv", ENTRIES);
        const entries = session.data.staged()[0]?.key ?? "";
        const card = await pickBadge();
        const preview = within(card).getByRole("button", { name: /^Preview/ });
        assert.isTrue(preview.hasAttribute("disabled"), "no act picked yet");
        await userEvent.click(within(card).getByRole("radio", { name: "Make an edge" }));
        await userEvent.click(within(card).getByRole("combobox", { name: "Edge type" }));
        await userEvent.keyboard("entered");
        await userEvent.keyboard("{Tab}");
        const steps = session.history.steps.length;

        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Shift>}P{/Shift}");
        const section = await within(card).findByRole("region", { name: "Preview" });
        const draft = draftOf(session);
        const pv = draft.preview();
        assert.strictEqual(count(section, "new edges"), String(pv.after.edges - pv.before.edges));
        assert.strictEqual(pv.after.edges - pv.before.edges, 4, "E1, E2, E3 and E6");
        assert.strictEqual(count(section, "new entered"), "4", "the new edges by their type");
        assert.strictEqual(within(section).getByLabelText("Edges after").textContent, "0 -> 4");
        assert.strictEqual(session.history.steps.length, steps, "Preview writes no undo step");

        // Before / After over the canvas: After first, B flips it.
        const chip = await screen.findByRole("radiogroup", { name: "Before / After" });
        await waitFor(() => {
            assert.isTrue(draft.displayed);
        });
        assert.strictEqual(draft.side, "after");
        // The Overview counts the graph drawn: the draft's on After, the project's on Before.
        await waitFor(() => {
            assert.strictEqual(overview("Edges"), "4");
        });
        // The legend keys the draft in words, not the layer's border widths.
        const keyed = await legendText();
        // Titled by the path the Draft row reads, as its technical name: a legend field carries no
        // plain name, and the element names graphty.draft nowhere the app reads one.
        assert.include(keyed, "Halo: draft");
        assert.include(keyed, "new");
        assert.notInclude(keyed, "graphty.draft");
        assert.notInclude(keyed, "Border width");
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("b");
        await waitFor(() => {
            assert.strictEqual(draft.side, "before");
        });
        assert.isTrue(within(chip).getByRole<HTMLInputElement>("radio", { name: "Before" }).checked);
        await waitFor(() => {
            assert.strictEqual(overview("Edges"), "0");
        });
        await userEvent.keyboard("b");
        await waitFor(() => {
            assert.strictEqual(draft.side, "after");
        });
        await waitFor(() => {
            assert.strictEqual(overview("Edges"), "4");
        });

        // Enter commits: one undo step, four edges.
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Join" }));
        });
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        assert.strictEqual(session.data.statistics({ scope: "all" }).edgeCount, 4);
        assert.isNull(session.data.currentDraft());
        assert.isNull(screen.queryByRole("radiogroup", { name: "Before / After" }), "the chip goes with the draft");
        assert.isFalse(store.get().dockOpen, "the dock as it was");

        // The notice's Undo: the entries are staged again.
        const slot = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".ws-notice-slot");
            assert.isNotNull(found);
            return found;
        });
        await within(slot).findByText("Joined entries.csv");
        await userEvent.click(within(slot).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.strictEqual(session.data.statistics({ scope: "all" }).edgeCount, 0);
        });
        assert.strictEqual(session.data.staged()[0]?.key, entries, "entries is staged again");
        await screen.findByRole("region", { name: "entries.csv" });
    });

    it("entries in the graph, people staged: an edge from each entry's badge to its person, drawn as the preview counts", async () => {
        await page.viewport(1440, 900);
        const { session } = await emptyProject();
        await session.data.import(
            {
                type: "csv",
                config: { data: "entry,badge,door\ne1,B1,D1\ne2,B2,D1\ne3,B1,D2\ne4,B3,D2\ne5,B9,D1" },
                name: "entries.csv",
            },
            { key: "entry", type: "entry" },
        );
        drop("people.csv", "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales\nB4,Di,HR");
        await screen.findByRole("region", { name: "people.csv" });
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("j");
        const card = await screen.findByRole("form", { name: "Join" });
        await choose(card, "Field 1 type", "entry");
        await choose(card, "Field 1 field", "badge");
        await choose(card, "Field 2 field", "badge");
        await userEvent.click(within(card).getByRole("radio", { name: "Make an edge" }));
        await userEvent.click(within(card).getByRole("combobox", { name: "Edge type" }));
        await userEvent.keyboard("entered");
        await userEvent.keyboard("{Tab}");
        await userEvent.click(within(card).getByRole("button", { name: /^Preview/ }));
        const section = await within(card).findByRole("region", { name: "Preview" });
        assert.strictEqual(count(section, "new edges"), "4", "e1, e2, e3 and e4");
        assert.strictEqual(count(section, "self-loops"), "0");
        assert.strictEqual(within(section).getByLabelText("Edges after").textContent, "0 -> 4");
        const draft = draftOf(session);
        await waitFor(() => {
            assert.isTrue(draft.displayed);
        });
        const drawn = (): string[] =>
            session.data
                .edges()
                .map((e) => `${String(e.source)}->${String(e.target)}`)
                .sort();
        assert.deepStrictEqual(drawn(), ["e1->B1", "e2->B2", "e3->B1", "e4->B3"], "the graph drawn is the preview");
        await waitFor(() => {
            assert.strictEqual(overview("Edges"), "4");
        });
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Join" }));
        });
        assert.deepStrictEqual(drawn(), ["e1->B1", "e2->B2", "e3->B1", "e4->B3"], "Commit applies the preview");
    });

    it("HR Merge 2 into 1: a click previews, dept differs on 2, Use 2 as the element counts it, Min where it fits, Undo in the card", async () => {
        const { session } = await withStaged("hr.csv", HR);
        const { card, section } = await previewMerge(session);
        const draft = draftOf(session);
        assert.strictEqual(count(section, "merged"), "3");
        const differ = within(section).getByRole("group", { name: "Values differ" });
        assert.strictEqual(within(differ).getByLabelText("dept values differ").textContent, "2");
        const rule = within(differ).getByRole<HTMLInputElement>("combobox", { name: "dept rule" });
        assert.strictEqual(rule.value, "Keep 1", "Keep 1 by default");

        // Min, Max and Mean order numbers: offered for floor, not for dept.
        await userEvent.click(rule);
        await screen.findByRole("option", { name: "Use 2" });
        assert.isNull(screen.queryByRole("option", { name: "Min" }), "no Min on a text column");
        await userEvent.click(screen.getByRole("option", { name: "Use 2" }));
        const stepOf = (): { rule: string; decided: number } | undefined => {
            const step = draft.preview().steps.find((row) => row.op === "join.merge");
            const dept = step?.valuesDiffer.find((each) => each.params.column === "dept");
            return dept === undefined ? undefined : { rule: dept.params.rule, decided: dept.params.decided };
        };
        await waitFor(() => {
            assert.strictEqual(stepOf()?.rule, "overwrite");
        });
        await waitFor(() => {
            assert.strictEqual(rule.value, "Use 2");
        });
        assert.strictEqual(
            within(differ).getByLabelText("dept decided").textContent,
            `decided ${String(stepOf()?.decided)}`,
            "the decided count the element reports",
        );
        await userEvent.click(within(differ).getByRole("combobox", { name: "floor rule" }));
        await screen.findByRole("option", { name: "Min" });
        await userEvent.keyboard("{Escape}");
        // HR's desks are all numbers, but Bo's is not: Min cannot order the two, so it is not offered.
        await userEvent.click(within(differ).getByRole("combobox", { name: "desk rule" }));
        await screen.findByRole("option", { name: "Use 2" });
        assert.isNull(screen.queryByRole("option", { name: "Min" }), "no Min where a value is text");
        await userEvent.keyboard("{Escape}");

        // Undo inside the card: the rule comes back, then the act, and the card picks again.
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.strictEqual(stepOf()?.rule, "keep");
        });
        await waitFor(() => {
            assert.strictEqual(rule.value, "Keep 1");
        });
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.isNull(within(card).queryByRole("region", { name: "Preview" }));
        });
        assert.isNull(session.data.currentDraft(), "nothing is left to commit");
        assert.isFalse(
            within(card)
                .getByRole("button", { name: /^Preview/ })
                .hasAttribute("disabled"),
        );
    });

    it("Only 2 Keep counts the node the merge adds, Drop none; the legend counts what merges", async () => {
        const { session } = await withStaged("hr.csv", HR);
        const { card, section } = await previewMerge(session);
        const draft = draftOf(session);
        const added = (): number => draft.preview().after.nodes - draft.preview().before.nodes;
        assert.strictEqual(added(), 1, "B7");
        assert.strictEqual(count(section, "new"), String(added()));
        await waitFor(async () => {
            const keyed = await legendText();
            assert.include(keyed, "merged");
            assert.notInclude(keyed, "graphty.draft");
        });
        // Only 2 is a segmented control: its radio is hidden, a reader clicks the label.
        const drop = within(card).getByRole<HTMLInputElement>("radio", { name: "Drop" });
        await userEvent.click(drop.labels?.[0] ?? drop);
        await waitFor(() => {
            assert.strictEqual(added(), 0);
        });
        await waitFor(() => {
            assert.strictEqual(count(section, "new"), "0");
        });
    });

    it("Repeats starts at First, offers Last and the aggregates, and Last folds the last row", async () => {
        const { session } = await withStaged("hr.csv", HR_REPEATS);
        const { section } = await previewMerge(session);
        const repeats = within(section).getByRole<HTMLInputElement>("combobox", { name: "Repeats" });
        assert.strictEqual(repeats.value, "First", "the element's own default");
        await choose(section, "dept rule", "Use 2");
        await userEvent.click(repeats);
        await screen.findByRole("option", { name: "Count" });
        await screen.findByRole("option", { name: "List" });
        await userEvent.click(screen.getByRole("option", { name: "Last" }));
        await waitFor(() => {
            assert.strictEqual(repeats.value, "Last");
        });
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Join" }));
        });
        assert.strictEqual(session.data.node("B1")?.dept, "Research", "the last of B1's rows");
    });

    it("Enter on a closed rule or Repeats menu, an Ignore switch or the Before radio commits nothing", async () => {
        const { session } = await withStaged("hr.csv", HR_REPEATS);
        const { card, section } = await previewMerge(session);
        const steps = session.history.steps.length;
        const keepsDraft = (where: string): void => {
            assert.isTrue(draftOf(session).open, `Enter on ${where} keeps the draft open`);
            assert.strictEqual(session.history.steps.length, steps, `Enter on ${where} writes no step`);
            assert.isNotNull(screen.queryByRole("form", { name: "Join" }), `Enter on ${where} keeps the card`);
        };
        const press = async (control: HTMLElement, where: string): Promise<void> => {
            control.focus();
            assert.strictEqual(document.activeElement, control, `${where} has focus`);
            await userEvent.keyboard("{Enter}");
            // A list field Enter opened closes with Esc, which leaves the card open.
            if (control.getAttribute("aria-expanded") === "true") {
                await userEvent.keyboard("{Escape}");
            }
            keepsDraft(where);
        };

        await press(within(section).getByRole("combobox", { name: "dept rule" }), "the closed dept rule");
        await press(within(section).getByRole("combobox", { name: "Repeats" }), "the closed Repeats");
        await press(within(card).getByRole("switch", { name: "Ignore case" }), "Ignore case");
        await press(within(card).getByRole("switch", { name: "Ignore spaces" }), "Ignore spaces");
        const chip = await screen.findByRole("radiogroup", { name: "Before / After" });
        await press(within(chip).getByRole("radio", { name: "Before" }), "the Before radio");

        // The Commit button still commits by its own Enter.
        within(card)
            .getByRole("button", { name: /^Commit/ })
            .focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Join" }));
        });
        assert.strictEqual(session.history.steps.length, steps + 1, "one step");
    });

    it("a file dropped while the preview is open asks first, and Cancel keeps the draft and its rule", async () => {
        const { session } = await withStaged("hr.csv", HR);
        const { section } = await previewMerge(session);
        const draft = draftOf(session);
        await choose(section, "dept rule", "Use 2");
        const rule = (): string | undefined =>
            draft
                .preview()
                .steps.find((row) => row.op === "join.merge")
                ?.valuesDiffer.find((each) => each.params.column === "dept")?.params.rule;
        await waitFor(() => {
            assert.strictEqual(rule(), "overwrite");
        });
        drop("buildings.csv", "door,building\nD1,North");
        const dialog = await screen.findByRole("dialog", { name: "Draft open" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Draft open" }));
        });
        assert.strictEqual(session.data.currentDraft(), draft, "the draft is still open");
        assert.isTrue(draft.open);
        assert.strictEqual(rule(), "overwrite", "with its rule");
        assert.strictEqual(session.data.staged().length, 1, "buildings.csv is not staged");
        assert.isNotNull(screen.queryByRole("region", { name: "Preview" }));
    });

    it("Redo's key during the preview asks first, as its button does, and Cancel keeps the draft", async () => {
        const { session } = await withStaged("hr.csv", HR);
        // Something to redo: a node moved and the move undone.
        await session.positions.set([{ id: "B1", x: 5, y: 5, z: 0 }]);
        await session.undo();
        assert.isTrue(session.canRedo, "a step to redo");
        await previewMerge(session);
        const draft = draftOf(session);
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Draft open" });
        assert.notInclude(document.body.textContent ?? "", "E_DRAFT_OPEN", "no code is shown");
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Draft open" }));
        });
        assert.strictEqual(session.data.currentDraft(), draft, "the draft is still open");
    });

    it("changing a field after Preview takes the act back", async () => {
        const { session } = await withStaged("hr.csv", HR);
        const card = await pickBadge();
        await userEvent.click(within(card).getByRole("radio", { name: "Merge 2 into 1" }));
        await userEvent.click(within(card).getByRole("button", { name: /^Preview/ }));
        await within(card).findByRole("region", { name: "Preview" });
        await userEvent.click(within(card).getByRole("radio", { name: "Make an edge" }));
        await waitFor(() => {
            assert.isNull(within(card).queryByRole("region", { name: "Preview" }));
        });
        assert.isNull(session.data.currentDraft());
    });
});
