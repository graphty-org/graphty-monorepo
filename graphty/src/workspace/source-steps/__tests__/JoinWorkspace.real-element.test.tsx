/**
 * The join workspace on the REAL graphty-element with the source-steps experiment on (issue #9796),
 * driven by keys and clicks in the owner's founding example: door entries staged beside people in
 * the graph. Shift+J opens the modal with one card for the staged entries, its match the element's
 * guess; the card's count is the open draft's; picking Connect makes the card's step and colors it
 * in the preview; Undo takes it back; Enter in the Edge type box commits nothing; Esc leaves the
 * graph as it was; Done commits every card as one undo step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SourceStepRow } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import type { WorkspaceStore } from "../../state/store";
import { choose, drop, emptyProject } from "./sourceSteps";

withFeatures(["source-steps"]);

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
    // The entries are staged last: the workspace opens on the last staged source's card.
    drop("entries.csv", ENTRIES);
    await screen.findByRole("listitem", { name: "entries.csv" });
    const entries = session.data.staged().at(-1)?.key ?? "";
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard("{Shift>}J{/Shift}");
    const modal = await screen.findByRole("dialog", { name: "Join" });
    return { store, session, entries, modal };
}

/**
 * The join cards the workspace draws, leaving out the cards of the steps that add a source as it is
 * (people.csv's own Add is one).
 * @param modal - the workspace.
 * @returns how many.
 */
function cardCount(modal: HTMLElement): number {
    return modal.querySelectorAll("[data-join-card]:not([data-join-card^='add:'])").length;
}

/**
 * Say on the open card that each row becomes a node linked to what it names, or an edge between two
 * nodes, and wait for its step.
 * @param modal - the workspace.
 * @param session - the session.
 * @param becomes - the choice, as the card names it.
 */
async function connect(
    modal: HTMLElement,
    session: GraphSession,
    becomes = "A node linked to what it names",
): Promise<void> {
    await eachRow(modal, becomes);
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
 * Say on the open card what each row becomes.
 * @param modal - the workspace.
 * @param becomes - the choice, as the card names it.
 */
async function eachRow(modal: HTMLElement, becomes: string): Promise<void> {
    await userEvent.click(within(modal).getByRole("radio", { name: becomes }));
}

describe("the join workspace (source-steps)", () => {
    it("opens with the element's guess, the draft's count, and Connect colors the card's step", async () => {
        const { session, entries, modal } = await opened();
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Incoming field" }).value,
            "badge",
            "the guess picks the entries' badge",
        );
        assert.isAbove(within(modal).queryAllByText("suggested").length, 0, "a guess is tagged suggested");
        const steps = session.data.steps().length;
        const draft = session.data.currentDraft();
        assert.isNotNull(draft);
        const space = session.data.spaces().find((row) => row.nodes > 0)?.space ?? "";
        const counts = draft?.matchCounts({ from: { source: entries, field: "badge" }, into: { space } });
        await waitFor(() => {
            assert.strictEqual(
                within(modal).getByLabelText("Match count").textContent,
                `${String(counts?.matchedRows)} of ${String(counts?.rows)} match`,
            );
        });
        assert.strictEqual(session.data.currentDraft()?.steps().length, steps, "no step before a result is picked");
        await connect(modal, session);
        await waitFor(() => {
            assert.isTrue((session.styles.shownDraft?.steps?.length ?? 0) > 0, "the card's step is colored");
        });
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
        await connect(modal, session);
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
        await eachRow(modal, "Fields on a node");
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

    it("stays open under StrictMode, its draft drawn and still open", async () => {
        const { session, modal } = await opened(true);
        await waitFor(() => {
            assert.isNull(modal.querySelector("[data-drawing]"), "the draft is drawn");
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "the workspace is still open");
        assert.isTrue(session.data.currentDraft()?.open === true, "its draft is still open");
    });

    it("lists the open card's values in the table, before and after a result is picked", async () => {
        const { session, modal } = await opened();
        const values = await within(modal).findByRole("grid", { name: "Values" });
        await waitFor(() => {
            assert.isAbove(within(values).getAllByRole("row").length, 1, "the values are listed at once");
        });
        await connect(modal, session);
        await waitFor(() => {
            const grid = within(modal).getByRole("grid", { name: "Values" });
            assert.isAbove(within(grid).getAllByRole("row").length, 1, "still listed once the card has a result");
        });
    });

    it("changing a written card's match keeps one card", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        assert.strictEqual(cardCount(modal), 1);
        await choose(modal, "In graph field", "dept");
        await waitFor(() => {
            assert.strictEqual(session.data.currentDraft()?.steps().at(-1)?.act?.into.field, "dept");
        });
        assert.strictEqual(cardCount(modal), 1, "the card it was written from is not drawn again");
    });

    it("removing one unfinished card keeps the others", async () => {
        const { modal } = await opened();
        const add = within(modal).getByRole("button", { name: /^\+ Join/ });
        await userEvent.click(add);
        await userEvent.click(add);
        await waitFor(() => {
            assert.strictEqual(cardCount(modal), 3);
        });
        const deletes = within(modal).getAllByRole("button", { name: /^Delete / });
        const last = deletes.at(-1);
        assert.isDefined(last);
        if (last !== undefined) {
            await userEvent.click(last);
        }
        await waitFor(() => {
            assert.strictEqual(cardCount(modal), 2, "only the removed card is gone");
        });
    });

    it("expanding a second card opens it while the first is open", async () => {
        const { modal } = await opened();
        await userEvent.click(within(modal).getByRole("button", { name: /^\+ Join/ }));
        await waitFor(() => {
            assert.strictEqual(cardCount(modal), 2);
        });
        // The new card is open: expand the first again, then the second.
        const cards = (): HTMLElement[] => [
            ...modal.querySelectorAll<HTMLElement>("[data-join-card]:not([data-join-card^='add:'])"),
        ];
        const open = (card: HTMLElement | undefined): boolean =>
            card !== undefined && within(card).queryByRole("combobox", { name: "Incoming field" }) !== null;
        for (const at of [0, 1]) {
            const expand = within(modal)
                .getAllByRole("button", { name: /^Expand (?!Read as)/ })
                .find((button) => cards().some((card) => card.contains(button)));
            assert.isDefined(expand);
            if (expand !== undefined) {
                await userEvent.click(expand);
            }
            await waitFor(() => {
                assert.isTrue(open(cards()[at]), `card ${String(at + 1)} opens`);
            });
        }
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

    it("Connect with an other end makes each entry an edge between a person and a door", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await userEvent.click(within(modal).getByRole("button", { name: "+ Match" }));
        await choose(modal, "Other end field", "door");
        await choose(modal, "Other end type", "doors.csv");
        await connect(modal, session, "An edge between two nodes");
        const act = session.data.currentDraft()?.steps().at(-1)?.act;
        assert.strictEqual(act?.to?.field, "door", "the step reads its other end back");
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        const edges = session.data.edges();
        assert.strictEqual(edges.length, 4, "one per entry naming a person: E4's B9 names no one");
        for (const edge of edges) {
            assert.notStrictEqual(String(edge.source), String(edge.target), "no edge from a node to itself");
        }
    });

    it("+ Match after Connect keeps the other end until its field and type are picked, then writes it", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await connect(modal, session);
        await userEvent.click(within(modal).getByRole("button", { name: "+ Match" }));
        await choose(modal, "Other end field", "door");
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Other end field" }).value,
            "door",
            "the other end stays on the card while its type is unpicked",
        );
        await choose(modal, "Other end type", "doors.csv");
        await waitFor(() => {
            assert.strictEqual(session.data.currentDraft()?.steps().at(-1)?.act?.to?.field, "door");
        });
    });

    it("names a staged type by its source on the card's summary once its step is written", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await userEvent.click(within(modal).getByRole("button", { name: "+ Match" }));
        await choose(modal, "Other end field", "door");
        await choose(modal, "Other end type", "doors.csv");
        await connect(modal, session);
        await waitFor(() => {
            assert.strictEqual(
                within(modal).getByRole<HTMLInputElement>("combobox", { name: "Other end type" }).value,
                "doors.csv",
                "the type keeps its name after the step adds doors.csv",
            );
        });
        assert.notInclude(modal.textContent ?? "", "source:", "no space id is shown");
    });

    it("a refused write is drawn on its card, not behind the modal", async () => {
        const { store, modal } = await opened();
        await choose(modal, "In graph type", "person");
        await choose(modal, "In graph field", "badge");
        await choose(modal, "Incoming field", "door");
        // The entries' own nodes would land in the space they connect to.
        await userEvent.click(within(modal).getByRole("button", { name: "Expand Read as" }));
        await userEvent.fill(within(modal).getByRole("combobox", { name: "Space" }), "person");
        await userEvent.keyboard("{Enter}");
        await eachRow(modal, "A node linked to what it names");
        await within(modal).findByRole("alert");
        assert.isNull(store.get().notice, "no notice behind the modal");
    });
    it("door entries read as edges connect a person to the door each names, one edge per entry", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await userEvent.click(within(modal).getByRole("button", { name: "Expand Read as" }));
        const rows = within(modal).getByRole("radiogroup", { name: "Rows are" });
        await userEvent.click(within(rows).getByText("Edges"));
        await choose(modal, "From", "badge");
        await choose(modal, "To", "door");
        await choose(modal, "In graph type", "person");
        await choose(modal, "In graph field", "badge");
        await choose(modal, "Incoming field", "badge");
        await userEvent.click(within(modal).getByRole("button", { name: "+ Match" }));
        await choose(modal, "Other end field", "door");
        await choose(modal, "Other end type", "doors.csv");
        await connect(modal, session, "An edge between two nodes");
        assert.isNull(within(modal).queryByRole("alert"), "the edge rows are joined, not refused");
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        const edges = session.data.edges().map((edge) => `${String(edge.source)}->${String(edge.target)}`);
        assert.sameMembers(edges, ["B1->D1", "B1->D2", "B2->D1", "B2->D2"], "E4's B9 names no one");
    });

    it("Merge: Many rows Last folds the last row, No match Skip leaves B9 out, and B flips Before / After", async () => {
        const { session, modal } = await opened();
        await eachRow(modal, "Fields on a node");
        const merged = (): readonly SourceStepRow[] => session.data.currentDraft()?.steps() ?? [];
        await waitFor(() => {
            assert.isTrue(merged().some((row) => row.op === "join.merge"));
        });
        await userEvent.click(within(within(modal).getByRole("radiogroup", { name: "Many rows" })).getByText("Last"));
        await waitFor(() => {
            assert.strictEqual(merged().at(-1)?.act?.repeated, "last");
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
    it("Direction turned round on a written Connect card rewrites its step the other way, still one card", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        await choose(modal, "Direction", "entries.csv -> badge");
        await waitFor(() => {
            assert.strictEqual(session.data.currentDraft()?.steps().at(-1)?.act?.direction, "from-into");
        });
        assert.strictEqual(cardCount(modal), 1, "the card is rewritten, not drawn again");
    });

    it("deleting a written card takes its step out, and Undo brings it back", async () => {
        const { session, modal } = await opened();
        await connect(modal, session);
        const edges = (): boolean =>
            session.data
                .currentDraft()
                ?.steps()
                .some((row) => row.op === "join.edges") === true;
        const card = modal.querySelector<HTMLElement>("[data-join-card]:not([data-join-card^='add:'])");
        assert.isNotNull(card);
        if (card !== null) {
            await userEvent.click(within(card).getByRole("button", { name: /^Delete / }));
        }
        await waitFor(() => {
            assert.isFalse(edges(), "the card's step is gone");
        });
        await userEvent.click(within(modal).getByRole("button", { name: /^Undo/ }));
        await waitFor(() => {
            assert.isTrue(edges(), "Undo brings the step back");
        });
    });

    it("draws two cards for two joins from one source", async () => {
        const { session, modal } = await opened(false, { name: "doors.csv", text: "door,name\nD1,North\nD2,South" });
        await connect(modal, session);
        await userEvent.click(within(modal).getByRole("button", { name: /^\+ Join/ }));
        await waitFor(() => {
            assert.strictEqual(cardCount(modal), 3, "doors.csv waits on its own");
        });
        await choose(modal, "In graph type", "doors.csv");
        await choose(modal, "Incoming field", "door");
        await connect(modal, session);
        await waitFor(() => {
            assert.strictEqual(
                session.data
                    .currentDraft()
                    ?.steps()
                    .filter((row) => row.op === "join.edges").length,
                2,
            );
        });
        assert.strictEqual(cardCount(modal), 2, "one card per join, both drawn");
    });
});
