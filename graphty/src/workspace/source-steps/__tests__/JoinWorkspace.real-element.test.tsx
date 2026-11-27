/**
 * The join workspace on the REAL graphty-element with the source-steps experiment on (issue #9796),
 * driven by keys and clicks in the owner's founding example: door entries staged beside people in
 * the graph. Shift+J opens the modal on a blank card over the reader's graph; the card's count is the
 * open draft's; picking how to join makes the card's step and colors it in the preview; Undo takes it
 * back; Enter in the Edge type box commits nothing; Esc leaves the graph as it was; Done commits every
 * card as one undo step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SourceStepRow } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { cardPalette } from "../../selection/cardPalette";
import type { WorkspaceStore } from "../../state/store";
import {
    addMatch,
    advanced,
    choose,
    done,
    draftOf,
    drop,
    emptyProject,
    fromHeadMenu,
    headMenu,
    joinAs,
    joinLines,
    newest,
    openJoins,
    pickField,
    pickFields,
    pickSources,
    removeOpen,
    selectJoin,
    stageFile,
    waysToJoin,
} from "./sourceSteps";

withFeatures(["source-steps"]);

const FIELDS = "Fields of entries on people";
const NODE = "Node per entries row, linked to people";
const EDGE = "Edge per entries row, people to doors";

const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales";
/** B9 badges no person; B1 and B2 badged in twice. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE6,B2,D2";

/**
 * People in the graph as type person, entries.csv dropped and staged, and the workspace opened
 * with Shift+J.
 * @param strict - mount the app under StrictMode, as main.tsx does in development.
 * @param also - another file to drop and stage before the entries.
 * @returns the store, the session, the staged entries' key and the modal.
 */
async function opened(
    strict = false,
    also?: { readonly name: string; readonly text: string },
): Promise<{
    store: WorkspaceStore;
    session: GraphSession;
    entries: string;
    modal: HTMLElement;
}> {
    await page.viewport(1280, 900);
    const { store, session } = await emptyProject(strict);
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    if (also !== undefined) {
        await stageFile(also.name, also.text);
        await screen.findByRole("listitem", { name: also.name });
    }
    await stageFile("entries.csv", ENTRIES);
    await screen.findByRole("listitem", { name: "entries.csv" });
    const entries = session.data.staged().at(-1)?.key ?? "";
    return { store, session, entries, modal: await openJoins() };
}

/**
 * Matches people and entries by badge on the open card.
 * @param modal - the workspace.
 */
async function matchBadge(modal: HTMLElement): Promise<void> {
    await pickSources(modal, "people", "entries");
    await pickFields(modal, "badge", "badge");
}

/**
 * Matches people and entries by badge, and joins them.
 * @param modal - the workspace.
 * @param session - the session.
 * @param words - how, as the card words it.
 */
async function connect(modal: HTMLElement, session: GraphSession, words = NODE): Promise<void> {
    await matchBadge(modal);
    await joinAs(modal, words);
    await waitFor(() => {
        assert.isTrue(
            session.data
                .currentDraft()
                ?.steps()
                .some((row) => row.op === "join.edges") === true,
        );
    });
}

/**
 * Matches entries and doors too.
 * @param modal - the workspace.
 */
async function matchDoors(modal: HTMLElement): Promise<void> {
    await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
}

describe("the join workspace looks and works like the selection workspace (#10364)", () => {
    it("draws each join as a selection card draws a group: colored, every control inside it", async () => {
        const { modal } = await opened();
        await matchBadge(modal);
        // The match joins at once: its type and No match are drawn, and the card is the written one from here.
        const type = await within(modal).findByRole("radiogroup", { name: "Join type" });
        const noMatch = await within(modal).findByRole("radiogroup", { name: /^Unmatched /u });
        const cards = within(modal).getByRole("group", { name: "Joins" });
        const card = cards.querySelector<HTMLElement>("section.cm-list-card.sel-card[data-card-id]:not([data-folded])");
        if (card === null) {
            throw new Error("no open card");
        }
        assert.notStrictEqual(card.style.getPropertyValue("--cm-card-color"), "", "the card has its color");
        for (const name of ["Source 1", "Source 2", "Field 1", "Field 2"]) {
            assert.isNotNull(within(card).queryByRole("combobox", { name }), `${name} is inside the card`);
        }
        assert.isTrue(card.contains(type), "the join type is inside the card");
        assert.isTrue(card.contains(noMatch), "No match is inside the card");
        assert.isNotNull(within(card).queryByRole("button", { name: /^Delete / }), "its x");
        assert.isNotNull(within(card).queryByRole("button", { name: /^More for / }), "its menu");
        for (const gone of [".jw-list", ".jw-editor", ".jw-card", ".jw-left"]) {
            assert.isNull(modal.querySelector(gone), `no ${gone}`);
        }
        assert.isNotNull(modal.querySelector(".sel-ws-center > .jw-key"), "the key sits under the drawing");
        assert.isNull(modal.querySelector(".sel-ws-head .jw-key"), "not in the header");
        assert.isNotNull(within(cards).queryByRole("button", { name: "Join" }), "+ Join under the cards");
    });

    it("shows the join type from the start, colors the first card as the selection workspace does, and names it in the header", async () => {
        const { session, modal } = await opened();
        const blank = within(modal).getByRole<HTMLInputElement>("combobox", { name: "Join type" });
        assert.isTrue(blank.disabled, "the join type is named before a match is complete");
        const card = modal.querySelector<HTMLElement>("section.sel-card[data-card-id]");
        const first = (session.scope.options.branchPalette ?? cardPalette(session.catalog.palettes()))[0] ?? "";
        assert.strictEqual(
            card?.style.getPropertyValue("--cm-card-color").toLowerCase(),
            first.toLowerCase(),
            "the selection workspace's first card color",
        );
        assert.isNotNull(card?.querySelector("[data-card-grip]"), "a drag handle, as a selection card has");
        await matchBadge(modal);
        await within(modal).findByRole("radiogroup", { name: "Join type" });
        const head = modal.querySelector<HTMLElement>(".sel-ws-head");
        await waitFor(() => {
            assert.include(
                head?.querySelector(".sel-ws-title")?.textContent,
                "people + entries",
                "the open join named",
            );
        });
        assert.isNull(within(modal).queryByRole("button", { name: "Frame" }), "no Frame under the tables");
        await userEvent.click(within(head ?? modal).getByRole("button", { name: "More for Join" }));
        await screen.findByRole("menuitem", { name: /Frame the matches/ });
    });

    it("joins three drawn files: a complete match changes the graph at once, and Done keeps it", async () => {
        await page.viewport(1280, 900);
        const { store, session } = await emptyProject();
        drop("people.csv", PEOPLE);
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().length, 3);
        });
        store.set({ dockOpen: false, dockMaximized: false });
        drop("doors.csv", "door,name\nD1,North\nD2,South");
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().length, 5, "the doors are drawn at once");
        });
        drop("entries.csv", ENTRIES);
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().length, 10, "and the entries: 3 people, 2 doors, 5 entries");
        });
        assert.strictEqual(session.data.edges().length, 0);
        const modal = await openJoins();
        await pickSources(modal, "entries", "people");
        await pickFields(modal, "badge", "badge");
        await waitFor(() => {
            const ways = within(modal).getByRole("radiogroup", { name: "Join type" });
            assert.isNotNull(within(ways).queryByRole("radio", { checked: true }), "a join type is picked at once");
        });
        await waitFor(() => {
            assert.isAbove(draftOf(session).preview().after.edges, 0, "the picked type adds edges at once");
        });
        await done(modal);
        assert.isAbove(session.data.edges().length, 0, "Done keeps them");
    });
});

describe("the join workspace (source-steps)", () => {
    it("opens on a blank card over the graph as it is, counts in the draft, and colors a card's step", async () => {
        const { session, entries, modal } = await opened();
        assert.deepStrictEqual(joinLines(modal), ["New join"]);
        assert.isNull(
            modal.querySelector(".jw-lower"),
            "no tables while no source is picked: the graph fills the center",
        );
        const steps = session.data.steps().length;
        const draft = draftOf(session);
        await matchBadge(modal);
        const space = session.data.spaces().find((row) => row.nodes > 0)?.space ?? "";
        const counts = draft.matchCounts({ from: { source: entries, field: "badge" }, into: { space } });
        await waitFor(() => {
            assert.strictEqual(
                within(modal).getByLabelText("Match count 1").textContent,
                `${String(counts.matchedRows)} of ${String(counts.rows)} match`,
            );
        });
        // A complete match joins at once, by the first join type that adds edges: the graph shows the change.
        await waitFor(() => {
            assert.isAbove(draft.steps().length, steps, "a step as soon as the match is complete");
        });
        await within(within(modal).getByRole("radiogroup", { name: "Join type" })).findByRole("radio", {
            checked: true,
        });
        await joinAs(modal, NODE);
        await waitFor(() => {
            assert.isTrue((session.styles.shownDraft?.steps?.length ?? 0) > 0, "the card's step is colored");
        });
        assert.isUndefined(session.styles.shownDraft?.mark, "nothing the graph holds is dimmed");
        assert.isUndefined(session.styles.shownDraft?.untouched, "nor marked");
        assert.strictEqual(session.data.steps().length, steps, "the graph is unchanged until Done");
    });

    it("Undo takes the card's step back; Enter in Edge type commits nothing; Esc leaves the graph", async () => {
        const { session, modal } = await opened();
        const steps = session.data.steps().length;
        await connect(modal, session);
        await fromHeadMenu(modal, "Undo");
        await waitFor(() => {
            assert.isFalse(
                session.data
                    .currentDraft()
                    ?.steps()
                    .some((row) => row.op === "join.edges") === true,
            );
        });
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Field 1" }).value,
            "badge",
            "its lines are drawn again, unpicked",
        );
        await joinAs(modal, NODE);
        await advanced(modal);
        const edgeType = within(modal).getByLabelText("Edge type");
        await userEvent.click(edgeType);
        await userEvent.keyboard("entered{Enter}");
        await waitFor(() => {
            assert.strictEqual(session.data.currentDraft()?.steps().at(-1)?.act?.edgeType, "entered");
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "Enter does not close the workspace");
        assert.strictEqual(session.data.steps().length, steps, "Enter commits nothing");
        (document.activeElement as HTMLElement | null)?.blur();
        within(modal)
            .getByRole("button", { name: /^Cancel/ })
            .focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.isNull(session.data.currentDraft(), "Cancel throws the draft away");
        assert.strictEqual(session.data.steps().length, steps, "the graph is as it was");
    });

    it("Merge's Many rows writes the element's repeated as it is and reads the step back on the same choice", async () => {
        const { session, modal } = await opened();
        const merge = (): ReturnType<GraphSession["data"]["steps"]>[number] | undefined =>
            session.data
                .currentDraft()
                ?.steps()
                .find((row) => row.op === "join.merge");
        await matchBadge(modal);
        await joinAs(modal, FIELDS);
        await waitFor(() => {
            assert.strictEqual(merge()?.act?.repeated ?? "first", "first");
        });
        const many = await within(modal).findByRole("radiogroup", { name: "Rows per node" });
        for (const [label, repeated] of [
            ["List all", "list"],
            ["Last", "last"],
            ["Count", "count"],
        ] as const) {
            await userEvent.click(within(many).getByText(label));
            await waitFor(() => {
                assert.strictEqual(merge()?.act?.repeated, repeated, `${label} is the element's ${repeated}`);
                assert.isTrue(
                    within(
                        within(modal).getByRole("radiogroup", { name: "Rows per node" }),
                    ).getByRole<HTMLInputElement>("radio", { name: label }).checked,
                    `the step reads back on ${label}`,
                );
            });
        }
    });

    it("Done commits every card as one undo step", async () => {
        const { session, modal } = await opened();
        const history = session.history.steps.length;
        await connect(modal, session);
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.isTrue(
            session.data.steps().some((row) => row.op === "join.edges"),
            "the join is in the graph",
        );
        assert.strictEqual(session.history.steps.length, history + 1, "one undo step");
    });

    it("Done leaves every node on the canvas, the joined ones among them", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        await done(modal);
        const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        await waitFor(() => {
            const off = session.data
                .nodes()
                .filter(({ id }) => element?.nodeScreenPosition(id)?.visible !== true)
                .map(({ id }) => id);
            assert.deepStrictEqual(off, []);
            assert.lengthOf(session.data.nodes(), 8);
        });
    });

    it("stays open under StrictMode, its draft drawn and still open", async () => {
        const { session, modal } = await opened(true);
        await waitFor(() => {
            assert.isNull(modal.querySelector("[data-drawing]"), "the draft is drawn");
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "the workspace is still open");
        assert.isTrue(session.data.currentDraft()?.open === true, "its draft is still open");
    });

    it("shows both sources' rows beside each other from the moment both are picked, and once joined", async () => {
        const { session, modal } = await opened();
        await pickSources(modal, "people", "entries");
        for (const name of ["people", "entries"]) {
            const grid = await within(modal).findByRole("grid", { name });
            assert.isAbove(within(grid).getAllByRole("row").length, 1, `${name}'s rows are listed at once`);
        }
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, NODE);
        await newest(session, (step) => step.act !== null, "joined");
        const grid = within(modal).getByRole("grid", { name: "entries" });
        assert.isAbove(within(grid).getAllByRole("row").length, 1, "still listed once the card has a step");
    });

    it("a written card whose fields match nothing any more is asked again how to join, and stays one card", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        assert.lengthOf(joinLines(modal), 1);
        await pickField(modal, "Field 1", "name");
        await waitFor(() => {
            assert.lengthOf(draftOf(session).steps(), 1, "no entry's badge is a name: the step is taken out");
        });
        assert.lengthOf(joinLines(modal), 1);
        await pickField(modal, "Field 1", "badge");
        await joinAs(modal, NODE);
        await newest(session, (step) => step.act !== null, "written again");
        assert.lengthOf(joinLines(modal), 1, "the card it was written from is not drawn again");
    });

    it("removing one unfinished card keeps the others, by its x and by Del", async () => {
        const { modal } = await opened();
        const add = within(modal).getByRole("button", { name: "Join" });
        await userEvent.click(add);
        await userEvent.click(add);
        assert.lengthOf(joinLines(modal), 3);
        await removeOpen(modal);
        await waitFor(() => {
            assert.lengthOf(joinLines(modal), 2, "only the removed card is gone");
        });
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.lengthOf(joinLines(modal), 1);
        });
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.lengthOf(joinLines(modal), 0, "the last card goes too: + Join adds another");
        });
        assert.isNotNull(within(modal).queryByRole("button", { name: "Join" }));
    });

    it("selecting a card in the list shows it and the rows of its sources", async () => {
        const { modal } = await opened();
        await matchBadge(modal);
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        assert.deepStrictEqual(joinLines(modal), ["people + entries", "New join"]);
        assert.isNull(within(modal).queryByRole("grid", { name: "people" }), "the new card has none yet");
        await selectJoin(modal, "people + entries");
        await within(modal).findByRole("grid", { name: "people" });
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Source 2" }).value,
            "entries",
        );
    });

    it("graph keys pressed inside the workspace never reach the graph's history", async () => {
        const { session, modal } = await opened();
        let calls = 0;
        const redo = session.redo.bind(session);
        session.redo = async (...args: Parameters<GraphSession["redo"]>) => {
            calls++;
            return redo(...args);
        };
        within(modal).getByRole("button", { name: "Done" }).focus();
        await userEvent.keyboard("{Control>}y{/Control}");
        await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
        assert.strictEqual(calls, 0, "no redo reached the session");
        assert.isTrue(session.data.currentDraft()?.open === true, "the workspace's draft is still open");
    });

    it("a second match makes each entry an edge between a person and a door", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await matchBadge(modal);
        await matchDoors(modal);
        await joinAs(modal, EDGE);
        const step = await newest(session, (row) => row.act?.to !== undefined, "an edge per entry");
        assert.strictEqual(step.act?.to?.field, "door", "the step reads its other end back");
        await done(modal);
        const edges = session.data.edges();
        assert.strictEqual(edges.length, 4, "one per entry naming a person: E4's B9 names no one");
        for (const edge of edges) {
            assert.notStrictEqual(String(edge.source), String(edge.target), "no edge from a node to itself");
        }
    });

    it("a second match takes its sources in either order", async () => {
        const { modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await matchBadge(modal);
        await userEvent.click(within(modal).getByRole("button", { name: "+ Match" }));
        await choose(modal, "Match 2 source 2", "doors");
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Match 2 source 2" }).value,
            "doors",
            "a source the card does not name yet stays picked on the right",
        );
        await choose(modal, "Match 2 source 1", "entries");
        await pickFields(modal, "door", "door", 2);
        assert.include(waysToJoin(modal), EDGE);
    });

    it("+ Match on a written card waits until its picks are made, then joins by an edge type at once", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await connect(modal, session);
        await userEvent.click(within(modal).getByRole("button", { name: "+ Match" }));
        await pickSources(modal, "entries", "doors", 2);
        assert.strictEqual(
            draftOf(session).steps().at(-1)?.op,
            "join.edges",
            "its step stays while the match is not whole",
        );
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        assert.strictEqual((await within(modal).findByRole("alert")).textContent, "Unfinished");
        await pickFields(modal, "door", "door", 2);
        assert.deepStrictEqual(waysToJoin(modal), [
            EDGE,
            "Node per entries row, linked to people and doors",
            "Fields of entries and doors on people",
        ]);
        // The whole match joins at once by the first type that adds edges: each entry an edge.
        await newest(session, (row) => row.act?.to?.field === "door", "written");
        await joinAs(modal, EDGE);
    });

    it("names a staged source by its name once its step is written, never by its id", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await matchBadge(modal);
        await matchDoors(modal);
        await joinAs(modal, EDGE);
        await newest(session, (row) => row.act !== null, "written");
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Match 2 source 2" }).value,
            "doors",
            "the source keeps its name after the step adds it",
        );
        assert.deepStrictEqual(joinLines(modal), ["people + entries + doors"], "in the order picked");
        assert.notInclude(modal.textContent ?? "", "source:", "no space id is shown");
    });

    it("a refused write is drawn on its card, not behind the modal", async () => {
        const { store, modal } = await opened();
        await pickSources(modal, "people", "entries");
        await userEvent.click(within(modal).getByRole("button", { name: "Expand entries rows" }));
        // A reserved space.
        await userEvent.fill(within(modal).getByRole("combobox", { name: "Same nodes as" }), "graph:x");
        await userEvent.keyboard("{Enter}");
        await within(modal).findByRole("alert");
        assert.isNull(store.get().notice, "no notice behind the modal");
    });

    it("never offers rows as nodes in the space they would connect to", async () => {
        const { modal } = await opened();
        await pickSources(modal, "people", "entries");
        await userEvent.click(within(modal).getByRole("button", { name: "Expand entries rows" }));
        await userEvent.fill(within(modal).getByRole("combobox", { name: "Same nodes as" }), "person");
        await userEvent.keyboard("{Enter}");
        await pickFields(modal, "badge", "badge");
        // The type picked for the reader the moment the match is whole is one of those offered then.
        const picked = await within(
            within(modal).getByRole("radiogroup", { name: "Join type" }),
        ).findByRole<HTMLInputElement>("radio", {
            checked: true,
        });
        assert.strictEqual(picked.labels?.[0]?.textContent, FIELDS, "rows as nodes was not offered");
    });

    it("door entries read as edges connect a person to the door each names, one edge per entry", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await pickSources(modal, "people", "entries");
        await userEvent.click(within(modal).getByRole("button", { name: "Expand entries rows" }));
        const rows = within(modal).getByRole("radiogroup", { name: "Rows are" });
        await userEvent.click(within(rows).getByText("Edges"));
        await choose(modal, "From", "badge");
        await choose(modal, "To", "door");
        await pickFields(modal, "badge", "badge");
        await matchDoors(modal);
        await joinAs(modal, EDGE);
        await newest(session, (row) => row.act !== null, "joined");
        assert.isNull(within(modal).queryByRole("alert"), "the edge rows are joined, not refused");
        await done(modal);
        const edges = session.data.edges().map((edge) => `${String(edge.source)}->${String(edge.target)}`);
        assert.sameMembers(edges, ["B1->D1", "B1->D2", "B2->D1", "B2->D2"], "E4's B9 names no one");
    });

    it("Fields: Many rows Last folds the last row, No match Skip leaves B9 out, and B flips Before / After", async () => {
        const { session, modal } = await opened();
        await matchBadge(modal);
        await joinAs(modal, FIELDS);
        const merged = (): readonly SourceStepRow[] => session.data.currentDraft()?.steps() ?? [];
        await waitFor(() => {
            assert.isTrue(merged().some((row) => row.op === "join.merge"));
        });
        assert.strictEqual(merged().at(-1)?.act?.unmatchedFrom, "drop", "Skip to start with");
        await userEvent.click(
            within(within(modal).getByRole("radiogroup", { name: "Rows per node" })).getByText("Last"),
        );
        await waitFor(() => {
            assert.strictEqual(merged().at(-1)?.act?.repeated, "last");
        });
        await userEvent.click(
            within(within(modal).getByRole("radiogroup", { name: /^Unmatched /u })).getByText("New node"),
        );
        await waitFor(() => {
            assert.notStrictEqual(merged().at(-1)?.act?.unmatchedFrom, "drop");
        });
        await userEvent.click(
            within(within(modal).getByRole("radiogroup", { name: /^Unmatched /u })).getByText("Skip"),
        );
        await waitFor(() => {
            assert.strictEqual(merged().at(-1)?.act?.unmatchedFrom, "drop");
        });
        const side = session.data.currentDraft()?.side;
        within(modal).getByRole("button", { name: "Done" }).focus();
        await userEvent.keyboard("b");
        await waitFor(() => {
            assert.notStrictEqual(session.data.currentDraft()?.side, side, "B flips the side drawn");
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "B leaves the workspace open");
    });

    it("Direction turned round on a written card rewrites its step the other way, still one card", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        await advanced(modal);
        await choose(modal, "Direction", "entries -> people");
        await waitFor(() => {
            assert.strictEqual(session.data.currentDraft()?.steps().at(-1)?.act?.direction, "from-into");
        });
        assert.lengthOf(joinLines(modal), 1, "the card is rewritten, not drawn again");
    });

    it("removing a written card takes its step out, and Undo brings it back", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        const edges = (): boolean =>
            session.data
                .currentDraft()
                ?.steps()
                .some((row) => row.op === "join.edges") === true;
        await removeOpen(modal);
        await waitFor(() => {
            assert.isFalse(edges(), "the card's step is gone");
        });
        assert.lengthOf(joinLines(modal), 0);
        await fromHeadMenu(modal, "Undo");
        await waitFor(() => {
            assert.isTrue(edges(), "Undo brings the step back");
        });
        assert.deepStrictEqual(joinLines(modal), ["people + entries"]);
    });

    it("a reopened card keeps its sources in the order picked, not the order loaded", async () => {
        const { session, modal } = await opened();
        await pickSources(modal, "entries", "people");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, FIELDS);
        await newest(session, (row) => row.act?.act === "merge", "written");
        assert.deepStrictEqual(joinLines(modal), ["entries + people"]);
        await done(modal);
        const again = await openJoins();
        assert.deepStrictEqual(joinLines(again), ["entries + people", "New join"]);
        await selectJoin(again, "entries + people");
        await within(again).findByRole("radio", { checked: true, name: FIELDS });
        const value = (name: string): string => within(again).getByRole<HTMLInputElement>("combobox", { name }).value;
        assert.deepStrictEqual([value("Source 1"), value("Source 2")], ["entries", "people"]);
    });

    it("keeps the reader's camera while a card is opened and edited (#10204)", async () => {
        await page.viewport(1280, 900);
        const { store, session } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
            { key: "badge", type: "person" },
        );
        store.set({ dockOpen: false, dockMaximized: false });
        await stageFile("entries.csv", ENTRIES);
        await screen.findByRole("listitem", { name: "entries.csv" });
        const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        if (element === null) {
            throw new Error("no element");
        }
        await element.waitForSettled();
        await element.waitForStableFrame();
        const before = element.getCameraState();
        const stayed = (when: string): void => {
            const now = element.getCameraState();
            for (const at of ["position", "target"] as const) {
                for (const axis of ["x", "y", "z"] as const) {
                    assert.closeTo(
                        now[at]?.[axis] ?? Number.NaN,
                        before[at]?.[axis] ?? Number.NaN,
                        1e-3,
                        `${when}: ${at}.${axis}`,
                    );
                }
            }
        };
        const modal = await openJoins();
        await element.waitForStableFrame();
        stayed("opened");
        await connect(modal, session);
        await element.waitForSettled();
        await element.waitForStableFrame();
        stayed("edited");
    });

    it("the preview keeps new nodes in sight framed whole, in Card colors and Styled", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await matchBadge(modal);
        await matchDoors(modal);
        await joinAs(modal, EDGE);
        await newest(session, (row) => row.act?.to !== undefined, "an edge per entry");
        const look = (id: string): Readonly<Record<string, unknown>> => session.styles.explain({ node: id }).merged;
        for (const styled of [false, true]) {
            if (styled) {
                await userEvent.click(within(modal).getByText("Styled", { exact: true }));
            }
            await waitFor(() => {
                assert.strictEqual(session.styles.shownDraft?.steps === undefined, styled);
            });
            await session.styles.settled();
            assert.deepStrictEqual(
                [look("D1")["node.sizeSpace"], look("D1")["node.size"]],
                ["screen", 1],
                `a new door keeps a size on screen (${styled ? "Styled" : "Card colors"})`,
            );
            assert.notStrictEqual(look("B1")["node.sizeSpace"], "screen", "a person keeps its own size");
        }
    });

    it("a card that adds many nodes draws them at their own size, so they never bury the graph", async () => {
        // 13 visits, each a node: held at a size on screen, so many would cover the people they link to.
        const visits = Array.from({ length: 13 }, (_, at) => `V${String(at)},B${String((at % 3) + 1)}`);
        const { session, modal } = await opened(false, {
            name: "visits.csv",
            text: ["visit,badge", ...visits].join("\n"),
        });
        await pickSources(modal, "visits", "people");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, "Node per visits row, linked to people");
        await newest(session, (row) => row.op === "join.edges", "a node per visit");
        const look = (id: string): Readonly<Record<string, unknown>> => session.styles.explain({ node: id }).merged;
        for (const styled of [false, true]) {
            if (styled) {
                await userEvent.click(within(modal).getByText("Styled", { exact: true }));
            }
            await waitFor(() => {
                assert.strictEqual(session.styles.shownDraft?.steps === undefined, styled);
            });
            await session.styles.settled();
            const name = styled ? "Styled" : "Card colors";
            const visit = session.data.nodes().find((node) => String(node.id).endsWith("V0"))?.id;
            assert.isDefined(visit, "the visit is drawn");
            assert.notStrictEqual(
                look(String(visit))["node.sizeSpace"],
                "screen",
                `a visit keeps its own size (${name})`,
            );
        }
    });

    it("a second card's merged nodes ring wider than an earlier card's, in Card colors and Styled", async () => {
        const { session, modal } = await opened(false, { name: "flags.csv", text: "badge,flag\nB1,yes" });
        await matchBadge(modal);
        await joinAs(modal, FIELDS);
        await newest(session, (row) => row.act !== null, "the entries' fields on people");
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await pickSources(modal, "flags", "people");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, "Fields of flags on people");
        await waitFor(() => {
            assert.strictEqual(
                session.data
                    .currentDraft()
                    ?.steps()
                    .filter((row) => row.act !== null).length,
                2,
            );
        });
        const scale = (id: string): unknown => session.styles.explain({ node: id }).merged["node.haloScale"];
        for (const styled of [false, true]) {
            if (styled) {
                await userEvent.click(within(modal).getByText("Styled", { exact: true }));
            }
            await waitFor(() => {
                assert.strictEqual(session.styles.shownDraft?.steps === undefined, styled);
            });
            await session.styles.settled();
            const name = styled ? "Styled" : "Card colors";
            assert.isAbove(Number(scale("B1")), Number(scale("B2")), `B1, the open card's, rings wider (${name})`);
            assert.isAbove(Number(scale("B2")), 0, `B2, the first card's, keeps its ring (${name})`);
        }
    });

    it("draws two cards for two joins from one source", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await connect(modal, session);
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await pickSources(modal, "doors", "entries");
        await pickFields(modal, "door", "door");
        await joinAs(modal, "Edge from doors to entries");
        await waitFor(() => {
            assert.strictEqual(
                session.data
                    .currentDraft()
                    ?.steps()
                    .filter((row) => row.op === "join.edges").length,
                2,
            );
        });
        assert.deepStrictEqual(joinLines(modal), ["people + entries", "doors + entries"], "one card per join");
    });
});

describe("the join workspace's cards work as the selection workspace's cards do (#10394)", () => {
    /**
     * The open card.
     * @param modal - the workspace.
     * @returns it.
     */
    function openCard(modal: HTMLElement): HTMLElement {
        const card = modal.querySelector<HTMLElement>("[data-card-id]:not([data-folded])");
        if (card === null) {
            throw new Error("no open card");
        }
        return card;
    }

    /**
     * Runs an item of the open card's "..." menu.
     * @param modal - the workspace.
     * @param item - the item.
     */
    async function fromCardMenu(modal: HTMLElement, item: string): Promise<void> {
        await userEvent.click(within(openCard(modal)).getByRole("button", { name: /^More for / }));
        const menu = await screen.findByRole("menu");
        await userEvent.click(within(menu).getByRole("menuitem", { name: new RegExp(`^${item}`, "u") }));
    }

    it("renames a join from the header's title: the card, the header and the Data panel read the name", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        const head = modal.querySelector<HTMLElement>(".sel-ws-head");
        if (head === null) {
            throw new Error("no header");
        }
        await userEvent.click(within(head).getByRole("button", { name: "people + entries, rename" }));
        const box = await within(head).findByRole("textbox", { name: "Rename people + entries" });
        await userEvent.fill(box, "Badge entries");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["Badge entries"]);
        });
        assert.include(head.textContent ?? "", "Badge entries");
        assert.isNotNull(screen.getByRole("dialog", { name: "Join" }), "the dialog keeps its name");
        await done(modal);
        assert.strictEqual(session.data.steps().find((row) => row.join !== undefined)?.join?.name, "Badge entries");
        const place = await screen.findByRole("region", { name: "Data place" });
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(place), ["Badge entries"]);
        });
        const again = await openJoins();
        await selectJoin(again, "Badge entries");
        assert.deepStrictEqual(joinLines(again), ["Badge entries"], "reopened, it keeps the name");
    });

    it("F2 on a card opens its name's box, and a name given before the match is complete is kept", async () => {
        const { session, modal } = await opened();
        const card = openCard(modal);
        card.focus();
        await userEvent.keyboard("{F2}");
        const box = await within(modal).findByRole("textbox", { name: "Rename New join" });
        await userEvent.fill(box, "Badges");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["Badges"]);
        });
        await connect(modal, session);
        await waitFor(() => {
            assert.strictEqual(
                draftOf(session)
                    .steps()
                    .find((row) => row.join !== undefined)?.join?.name,
                "Badges",
            );
        });
        assert.deepStrictEqual(joinLines(modal), ["Badges"]);
    });

    it("turns a card off and on, moves it, folds it to its matches, and deletes it, from its menu", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await connect(modal, session);
        const edges = (): number => draftOf(session).preview().marks.edges.new;
        const before = edges();
        assert.isAbove(before, 0);
        await fromCardMenu(modal, "Turn off");
        await waitFor(() => {
            assert.strictEqual(edges(), 0, "off, the card makes nothing");
        });
        assert.include(openCard(modal).textContent ?? "", "Off");
        await fromHeadMenu(modal, "Undo");
        await waitFor(() => {
            assert.strictEqual(edges(), before, "one Undo turns it back on");
        });
        await fromCardMenu(modal, "Turn off");
        await fromCardMenu(modal, "Turn on");
        await waitFor(() => {
            assert.strictEqual(edges(), before);
        });
        // A second card, then the first moved below it.
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await pickSources(modal, "doors", "entries");
        await pickFields(modal, "door", "door");
        await joinAs(modal, "Edge from doors to entries");
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["people + entries", "doors + entries"]);
        });
        const folded = modal.querySelector<HTMLElement>("[data-card-id][data-folded]");
        assert.include(folded?.textContent ?? "", "badge = badge", "a folded card shows its matches");
        await selectJoin(modal, "people + entries");
        await fromCardMenu(modal, "Move down");
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["doors + entries", "people + entries"]);
        });
        await userEvent.click(within(openCard(modal)).getByRole("button", { name: /^More for / }));
        const menu = await screen.findByRole("menu");
        assert.isNull(within(menu).queryByRole("menuitem", { name: /^Remove/ }), "it says Delete");
        await userEvent.click(within(menu).getByRole("menuitem", { name: /^Delete/ }));
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["doors + entries"], "only that card goes");
        });
    });

    it("keeps the header to the title, the preview's look and side, its menu, Cancel and Done", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        const head = modal.querySelector<HTMLElement>(".sel-ws-head");
        if (head === null) {
            throw new Error("no header");
        }
        const buttons = within(head)
            .getAllByRole("button")
            .map((button) => button.getAttribute("aria-label") ?? button.textContent);
        assert.deepStrictEqual(buttons, ["people + entries, rename", "More for Join", "Cancel", "Done"]);
        assert.lengthOf(within(head).getAllByRole("radiogroup"), 2, "Card colors / Styled, Before / After");
        assert.isNull(head.querySelector(".jw-key"), "the key is not in the header");
        const menu = await headMenu(modal);
        const items = within(menu)
            .getAllByRole("menuitem")
            .map((item) => item.textContent ?? "");
        const labels = ["Undo", "Redo", "Frame the matches", "Reader edits"];
        assert.lengthOf(items, labels.length);
        labels.forEach((label, at) => {
            assert.isTrue(items[at].startsWith(label), `${label} is item ${String(at + 1)}`);
        });
    });

    it("an edge's Edge type, named in the join, reads in the inspector as the Table's type column names it", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        await advanced(modal);
        await userEvent.click(within(modal).getByLabelText("Edge type"));
        await userEvent.keyboard("entry{Enter}");
        await waitFor(() => {
            assert.strictEqual(draftOf(session).steps().at(-1)?.act?.edgeType, "entry");
        });
        await done(modal);
        const type = session.data.readableValues().find((each) => each.path === "graphty.type" && each.on === "edge");
        assert.isDefined(type, "the element names the edges' type");
        // A reader picks an edge in the Table, by a click on its row.
        await userEvent.keyboard("{Shift>}T{/Shift}");
        await userEvent.click(await screen.findByRole("tab", { name: /^Edges/ }));
        const grid = await screen.findByRole("grid", { name: "Edges" });
        await userEvent.click((await within(grid).findAllByRole("rowheader"))[0]);
        await waitFor(() => {
            assert.lengthOf(session.selection.edges, 1);
        });
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        await waitFor(() => {
            const row = within(inspector)
                .getAllByTestId("data-row-name")
                .find((name) => name.textContent === type?.plainName);
            assert.isDefined(row, "a row named as the Table's type column");
            assert.include(row?.closest("[data-testid=data-row]")?.textContent ?? "", "entry");
        });
    });
});
