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
import type { WorkspaceStore } from "../../state/store";
import {
    addMatch,
    advanced,
    choose,
    done,
    draftOf,
    drop,
    emptyProject,
    joinAs,
    joinLines,
    newest,
    openJoins,
    pickField,
    pickFields,
    pickSources,
    selectJoin,
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
        drop(also.name, also.text);
        await screen.findByRole("listitem", { name: also.name });
    }
    drop("entries.csv", ENTRIES);
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
        assert.strictEqual(draft.steps().length, steps, "no step before how to join is picked");
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
        await userEvent.click(within(modal).getByRole("button", { name: /^Undo/ }));
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
        const many = await within(modal).findByRole("radiogroup", { name: "Many rows" });
        for (const [label, repeated] of [
            ["List", "list"],
            ["Last", "last"],
            ["Count", "count"],
        ] as const) {
            await userEvent.click(within(many).getByText(label));
            await waitFor(() => {
                assert.strictEqual(merge()?.act?.repeated, repeated, `${label} is the element's ${repeated}`);
                assert.isTrue(
                    within(within(modal).getByRole("radiogroup", { name: "Many rows" })).getByRole<HTMLInputElement>(
                        "radio",
                        { name: label },
                    ).checked,
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

    it("removing one unfinished card keeps the others, by its button and by Del", async () => {
        const { modal } = await opened();
        const add = within(modal).getByRole("button", { name: "Join" });
        await userEvent.click(add);
        await userEvent.click(add);
        assert.lengthOf(joinLines(modal), 3);
        await userEvent.click(within(modal).getByRole("button", { name: /^Remove/ }));
        await waitFor(() => {
            assert.lengthOf(joinLines(modal), 2, "only the removed card is gone");
        });
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.lengthOf(joinLines(modal), 1);
        });
        assert.isNull(within(modal).queryByRole("button", { name: /^Remove/ }), "the one blank card is not removed");
        await userEvent.keyboard("{Delete}");
        assert.lengthOf(joinLines(modal), 1);
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

    it("+ Match on a written card waits until its picks are made, then asks again how to join", async () => {
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
        assert.isUndefined(
            draftOf(session)
                .steps()
                .find((row) => row.act !== null),
        );
        await joinAs(modal, EDGE);
        await newest(session, (row) => row.act?.to?.field === "door", "written");
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
        assert.deepStrictEqual(joinLines(modal), ["people + doors + entries"], "in the order loaded");
        assert.notInclude(modal.textContent ?? "", "source:", "no space id is shown");
    });

    it("a refused write is drawn on its card, not behind the modal", async () => {
        const { store, modal } = await opened();
        await pickSources(modal, "people", "entries");
        await userEvent.click(within(modal).getByRole("button", { name: "Expand Read entries as" }));
        // A reserved space.
        await userEvent.fill(within(modal).getByRole("combobox", { name: "Space" }), "graph:x");
        await userEvent.keyboard("{Enter}");
        await within(modal).findByRole("alert");
        assert.isNull(store.get().notice, "no notice behind the modal");
    });

    it("never offers rows as nodes in the space they would connect to", async () => {
        const { modal } = await opened();
        await pickSources(modal, "people", "entries");
        await userEvent.click(within(modal).getByRole("button", { name: "Expand Read entries as" }));
        await userEvent.fill(within(modal).getByRole("combobox", { name: "Space" }), "person");
        await userEvent.keyboard("{Enter}");
        await pickFields(modal, "badge", "badge");
        assert.notInclude(waysToJoin(modal), NODE);
    });

    it("door entries read as edges connect a person to the door each names, one edge per entry", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await pickSources(modal, "people", "entries");
        await userEvent.click(within(modal).getByRole("button", { name: "Expand Read entries as" }));
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
        await userEvent.click(within(within(modal).getByRole("radiogroup", { name: "Many rows" })).getByText("Last"));
        await waitFor(() => {
            assert.strictEqual(merged().at(-1)?.act?.repeated, "last");
        });
        await userEvent.click(within(within(modal).getByRole("radiogroup", { name: "No match" })).getByText("Add"));
        await waitFor(() => {
            assert.notStrictEqual(merged().at(-1)?.act?.unmatchedFrom, "drop");
        });
        await userEvent.click(within(within(modal).getByRole("radiogroup", { name: "No match" })).getByText("Skip"));
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
        await userEvent.click(within(modal).getByRole("button", { name: /^Remove/ }));
        await waitFor(() => {
            assert.isFalse(edges(), "the card's step is gone");
        });
        assert.lengthOf(joinLines(modal), 0);
        await userEvent.click(within(modal).getByRole("button", { name: /^Undo/ }));
        await waitFor(() => {
            assert.isTrue(edges(), "Undo brings the step back");
        });
        assert.deepStrictEqual(joinLines(modal), ["people + entries"]);
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
