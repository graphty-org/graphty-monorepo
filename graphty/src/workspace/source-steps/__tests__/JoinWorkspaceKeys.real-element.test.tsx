/**
 * The join workspace's keys, undo and table on the REAL graphty-element with the source-steps experiment
 * on (issue #10054), driven by clicks and keys: its keys work from the moment it opens and after an undo,
 * a deleted card comes back as it was, rows picked in one list are never another's, and what the owner's
 * files need of a card (both Ignore switches, the second match's values, a value several nodes hold).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SourceDraft } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { choose, drop, emptyProject, rowWith, select } from "./sourceSteps";

withFeatures(["source-steps"]);

const EDGE = "An edge between two nodes";
const FIELDS = "Fields on a node";
const NODE = "A node linked to what it names";

const PEOPLE = "badge,name,phone\nB1,Ann,555\nB2,Bo,555\nB3,Cy,777\nB4,Di,";
const DOORS = "door,title\nBLDG-01,North\nBLDG-02,South";
/** The second row's door differs by case and by a space; the third badges nobody. */
const ENTRIES = "entry,badge,door,time\nE1,B1,BLDG-01,07:58\nE2,B2,bldg-02 ,08:19\nE3,,BLDG-02,08:20";
const WATCH = "value,risk\n555,high\n777,low";

/**
 * People in the graph as type person, other files dropped and staged in order, and the workspace
 * opened by Join +.
 * @param files - the other files' names and contents.
 * @returns the session, and the workspace.
 */
async function opened(
    ...files: readonly (readonly [name: string, text: string])[]
): Promise<{ session: GraphSession; modal: HTMLElement }> {
    await page.viewport(1280, 1000);
    const { store, session } = await emptyProject();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    for (const [name, text] of files) {
        drop(name, text);
        await screen.findByRole("listitem", { name });
    }
    return { session, modal: await joinPlus() };
}

/**
 * Opens the workspace by Join + in the Data place.
 * @returns it.
 */
async function joinPlus(): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    await userEvent.click(within(place).getByRole("button", { name: "Join" }));
    return screen.findByRole("dialog", { name: "Join" });
}

/**
 * The open draft.
 * @param session - the session.
 * @returns it.
 */
function draftOf(session: GraphSession): SourceDraft {
    const draft = session.data.currentDraft();
    if (draft === null) {
        throw new Error("no draft is open");
    }
    return draft;
}

/**
 * Says on the open card what each row becomes, and waits for its step.
 * @param session - the session.
 * @param modal - the workspace.
 * @param becomes - the choice, as the card names it.
 */
async function eachRow(session: GraphSession, modal: HTMLElement, becomes: string): Promise<void> {
    const joins = (): number =>
        draftOf(session)
            .steps()
            .filter((row) => row.act !== null).length;
    const before = joins();
    await userEvent.click(within(modal).getByRole("radio", { name: becomes }));
    await waitFor(() => {
        assert.isAbove(joins(), before);
    });
}

/** Waits for the workspace to close. */
async function closed(): Promise<void> {
    await waitFor(() => {
        assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
    });
}

describe("the join workspace's keys (source-steps)", () => {
    it("work as it opens, before anything in it is clicked: B flips, Shift+J adds a card, Esc closes", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await waitFor(() => {
            assert.isTrue(modal.contains(document.activeElement), "focus is in the workspace");
        });
        await userEvent.keyboard("b");
        await waitFor(() => {
            assert.strictEqual(draftOf(session).side, "before");
        });
        await userEvent.keyboard("{Shift>}J{/Shift}");
        await waitFor(() => {
            assert.lengthOf(modal.querySelectorAll("[data-join-card]:not([data-join-card^='add:'])"), 2);
        });
        await userEvent.keyboard("{Escape}");
        await closed();
        assert.isTrue(
            screen.getByRole("region", { name: "Data place" }).contains(document.activeElement),
            "focus goes back to Join +",
        );
    });

    it("work after Undo took the open card's step back, and Esc still cancels", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await eachRow(session, modal, NODE);
        await userEvent.click(within(modal).getByText("Direction"));
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.lengthOf(draftOf(session).steps(), 1, "only people's Add is left");
        });
        assert.isTrue(modal.contains(document.activeElement));
        await userEvent.keyboard("{Escape}");
        await closed();
        assert.isNull(session.data.currentDraft());
    });

    it("Redo makes the undone join again, from its button as from its key; with nothing to take back both are off", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        const button = (name: RegExp): HTMLButtonElement =>
            within(modal).getByRole<HTMLButtonElement>("button", { name });
        assert.isTrue(button(/^Undo/).disabled, "nothing to undo yet");
        await eachRow(session, modal, NODE);
        const joins = (): number =>
            draftOf(session)
                .steps()
                .filter((row) => row.act !== null).length;
        const steps = session.history.steps.length;
        await userEvent.click(button(/^Undo/));
        await waitFor(() => {
            assert.strictEqual(joins(), 0);
            assert.isFalse(button(/^Redo/).disabled);
        });
        await userEvent.click(button(/^Redo/));
        await waitFor(() => {
            assert.strictEqual(joins(), 1);
            assert.isTrue(button(/^Redo/).disabled);
        });
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.strictEqual(joins(), 0);
        });
        await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
        await waitFor(() => {
            assert.strictEqual(joins(), 1);
        });
        assert.strictEqual(session.history.steps.length, steps, "the graph's own history is not touched");
    });

    it("work while the focus is in a list's box, and an open list keeps its own", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await eachRow(session, modal, NODE);
        await choose(modal, "Incoming field", "entry");
        const box = within(modal).getByRole("combobox", { name: "Incoming field" });
        assert.strictEqual(document.activeElement, box);
        await userEvent.keyboard("b");
        await waitFor(() => {
            assert.strictEqual(draftOf(session).side, "before");
        });
        await userEvent.click(box);
        await screen.findByRole("option", { name: "entry" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("option", { name: "entry" }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "Escape closes the list alone");
        const before = draftOf(session).steps().length;
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.notDeepEqual(
                [before, "entry"],
                [draftOf(session).steps().length, draftOf(session).steps().at(-1)?.act?.from.field],
            );
        });
    });

    it("Escape in a field being typed in gives up the text; the next one cancels", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await eachRow(session, modal, NODE);
        const type = within(modal).getByRole<HTMLInputElement>("combobox", { name: "Edge type" });
        await userEvent.click(type);
        await userEvent.keyboard("entered{Escape}");
        await waitFor(() => {
            assert.strictEqual(type.value, "");
            assert.notStrictEqual(document.activeElement, type);
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }));
        assert.strictEqual(draftOf(session).steps().at(-1)?.act?.edgeType, undefined);

        // Typed, then a list pressed: the text is taken, and Escape is the list's.
        await userEvent.click(type);
        await userEvent.keyboard("entered");
        const field = within(modal).getByRole("combobox", { name: "In graph field" });
        await userEvent.click(field);
        await waitFor(() => {
            assert.strictEqual(draftOf(session).steps().at(-1)?.act?.edgeType, "entered");
        });
        await screen.findByRole("option", { name: "phone" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("option", { name: "phone" }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }));
        await userEvent.keyboard("{Escape}");
        await closed();
        assert.lengthOf(session.data.edges(), 0, "Cancel discards");
    });

    it("Done opens a join begun and not finished, and says so; finished, it commits", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await userEvent.click(within(modal).getByRole("radio", { name: EDGE }));
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        assert.strictEqual((await within(modal).findByRole("alert")).textContent, "Unfinished");
        await choose(modal, "Other end type", "doors.csv");
        await choose(modal, "Other end field", "door");
        await waitFor(() => {
            assert.isNull(within(modal).queryByRole("alert"));
        });
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await closed();
        assert.isAbove(session.data.edges().length, 0);
    });

    it("every source that waits has a card with its guess, gone once another card joins it", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await within(modal).findByRole("region", { name: "entries.csv" });
        assert.isNotNull(within(modal).getByRole("region", { name: "doors.csv" }));
        await userEvent.click(within(modal).getByRole("radio", { name: EDGE }));
        await choose(modal, "Other end type", "doors.csv");
        await choose(modal, "Other end field", "door");
        await waitFor(() => {
            assert.isAbove(session.data.edges().length, 0);
            assert.isNull(within(modal).queryByRole("region", { name: "doors.csv" }));
        });
    });

    it("the other end is matched by any field of its nodes, with its own live count", async () => {
        const doors = "door,code\nBLDG-01,c1\nBLDG-02,c2";
        const entries = "entry,badge,at\nE1,B1,c1\nE2,B2,c2\nE3,B3,c9";
        const { session, modal } = await opened(["doors.csv", doors], ["entries.csv", entries]);
        await userEvent.click(within(modal).getByRole("radio", { name: EDGE }));
        await choose(modal, "In graph type", "person");
        await choose(modal, "Incoming field", "badge");
        await choose(modal, "Other end type", "doors.csv");
        await choose(modal, "Other end in graph field", "code");
        await choose(modal, "Other end field", "at");
        await waitFor(() => {
            assert.deepStrictEqual(
                session.data.edges().map((edge) => [edge.source, edge.target]),
                [
                    ["B1", "BLDG-01"],
                    ["B2", "BLDG-02"],
                ],
            );
        });
        assert.strictEqual(within(modal).getByLabelText("Other end match count").textContent, "2 of 3 match");
    });

    it("draw a deleted card again: Undo brings its step back, and once more its picks", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await eachRow(session, modal, NODE);
        await userEvent.click(within(modal).getByRole("button", { name: "Delete entries.csv -> Connect" }));
        await waitFor(() => {
            assert.lengthOf(draftOf(session).steps(), 1);
        });
        assert.lengthOf(modal.querySelectorAll("[data-join-card]:not([data-join-card^='add:'])"), 0);
        const undo = within(modal).getByRole("button", { name: /^Undo/ });
        await userEvent.click(undo);
        await within(modal).findByRole("region", { name: "entries.csv -> Connect" });
        await userEvent.click(undo);
        await waitFor(() => {
            assert.isNull(within(modal).queryByRole("region", { name: "entries.csv -> Connect" }));
        });
        assert.isTrue(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Incoming field" }).value === "badge",
            "its picks are drawn again",
        );
    });
});

describe("a join card's matches and table (source-steps)", () => {
    it("offers both Ignore switches where only the two together match more, and lists either match", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await choose(modal, "In graph type", "person");
        await choose(modal, "Incoming field", "badge");
        await userEvent.click(within(modal).getByRole("radio", { name: EDGE }));
        await choose(modal, "Other end type", "doors.csv");
        await choose(modal, "Other end field", "door");
        await waitFor(() => {
            assert.isTrue(
                draftOf(session)
                    .steps()
                    .some((row) => row.act !== null),
            );
        });
        assert.strictEqual(within(modal).getByLabelText("Match count").textContent, "2 of 3 match, 1 empty");
        assert.strictEqual(within(modal).getByLabelText("Other end match count").textContent, "2 of 3 match");
        await userEvent.click(within(modal).getByRole("switch", { name: "Ignore case" }));
        await userEvent.click(within(modal).getByRole("switch", { name: "Ignore spaces" }));
        await waitFor(() => {
            assert.strictEqual(within(modal).getByLabelText("Other end match count").textContent, "3 of 3 match");
        });
        await userEvent.click(within(within(modal).getByRole("radiogroup", { name: "Match" })).getByText("door"));
        rowWith(await within(modal).findByRole("grid", { name: "Values" }), "BLDG-02");
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await closed();
        assert.sameDeepMembers(
            session.data.edges().map((edge) => [edge.source, edge.target, edge.time]),
            [
                ["B1", "BLDG-01", "07:58"],
                ["B2", "BLDG-02", "08:19"],
            ],
            "the edges carry their rows' columns",
        );
        const entry = screen.getByRole("listitem", { name: "entries.csv" });
        const header = entry.querySelector<HTMLElement>("[aria-expanded=false]");
        if (header !== null) {
            await userEvent.click(header);
        }
        assert.strictEqual(entry.querySelector('[data-kind="edge"]')?.textContent, "Edge 2", "the edges it made");
    });

    it("flags every node a watchlist's value names, or none of them", async () => {
        const { session, modal } = await opened(["watch.csv", WATCH]);
        await choose(modal, "Incoming field", "value").catch(() => undefined);
        await userEvent.click(within(modal).getByRole("radio", { name: FIELDS }));
        await choose(modal, "In graph field", "phone");
        await choose(modal, "Incoming field", "value");
        await userEvent.click(within(within(modal).getByRole("radiogroup", { name: "No match" })).getByText("Skip"));
        await waitFor(() => {
            assert.strictEqual(draftOf(session).steps().at(-1)?.buckets?.merged, 3);
        });
        const several = within(modal).getByRole("radiogroup", { name: "Several match" });
        await userEvent.click(within(several).getByText("Skip"));
        await waitFor(() => {
            assert.deepInclude(draftOf(session).steps().at(-1)?.buckets, { merged: 1, fanOut: 1, keptNew: 0 });
        });
        await userEvent.click(within(several).getByText("Each"));
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await closed();
        assert.deepStrictEqual(
            ["B1", "B2", "B3", "B4"].map((id) => session.data.node(id)?.risk),
            ["high", "high", "low", undefined],
        );
    });

    it("never excludes rows picked in another card's list", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await eachRow(session, modal, NODE);
        await userEvent.click(await within(modal).findByRole("button", { name: /new edges$/ }));
        await select(rowWith(await within(modal).findByRole("grid", { name: "Rows" }), "E1"));
        await within(modal).findByRole("button", { name: "Exclude" });
        await userEvent.click(within(modal).getByRole("button", { name: /matched$/ }));
        await waitFor(() => {
            assert.isNull(
                within(modal).queryByRole("button", { name: "Exclude" }),
                "another list, nothing picked in it",
            );
        });
        assert.isNull(draftOf(session).steps().at(-1)?.except ?? null);
    });

    it("lists the rows of a source nothing matches yet", async () => {
        const { modal } = await opened(["parts.csv", "part,color\nX1,red\nX2,blue"]);
        const grid = await within(modal).findByRole("grid", { name: "parts.csv" });
        assert.isNotNull(rowWith(grid, "blue"));
    });

    it("a reopened card says which rows it leaves out, before any list is opened, and takes them back", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await eachRow(session, modal, NODE);
        await userEvent.click(await within(modal).findByRole("button", { name: /new edges$/ }));
        await select(rowWith(await within(modal).findByRole("grid", { name: "Rows" }), "E1"));
        await userEvent.click(await within(modal).findByRole("button", { name: "Exclude" }));
        await within(modal).findByRole("button", { name: "Include E1" });
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await closed();
        const again = await joinPlus();
        assert.include(again.textContent ?? "", "1 excluded");
        await userEvent.click(await within(again).findByRole("button", { name: "Include E1" }));
        await waitFor(() => {
            assert.isNull(draftOf(session).steps().at(-1)?.except ?? null);
        });
    });

    it("deleting the card that added a source takes the joins onto it, whose rows wait again", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await eachRow(session, modal, FIELDS);
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await closed();
        const again = await joinPlus();
        await userEvent.click(await within(again).findByRole("button", { name: "Delete people.csv -> Added" }));
        await waitFor(() => {
            assert.lengthOf(draftOf(session).steps(), 0);
        });
        assert.notInclude(again.textContent ?? "", "source:", "no card names a source by its id");
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.isAbove(draftOf(session).steps().length, 1);
        });
    });

    it("edges with their ends unpicked are neither added nor done", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await userEvent.click(within(modal).getByRole("button", { name: "Expand Read as" }));
        await userEvent.click(await within(modal).findByText("Edges"));
        await waitFor(() => {
            assert.isTrue(within(modal).getByRole("button", { name: "Add as is" }).hasAttribute("disabled"));
        });
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        assert.strictEqual((await within(modal).findByRole("alert")).textContent, "Unfinished");
        assert.lengthOf(session.data.staged(), 1);
    });

    it("keeps Done on screen with every count in the key, at a tablet's width", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await page.viewport(1024, 1366);
        await eachRow(session, modal, NODE);
        await waitFor(() => {
            const box = within(modal).getByRole("button", { name: "Done" }).getBoundingClientRect();
            const frame = modal.getBoundingClientRect();
            assert.isAtMost(box.right, frame.right);
            assert.isAbove(within(modal).getByText("Join", { selector: ".sel-ws-title" }).clientWidth, 0);
        });
    });

    it("connects entries in the graph to staged people by the badge each names, drawn as counted", async () => {
        await page.viewport(1280, 1000);
        const { store, session } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: ENTRIES }, name: "entries.csv" },
            { key: "entry", type: "entry" },
        );
        store.set({ dockOpen: false, dockMaximized: false });
        drop("people.csv", PEOPLE);
        await screen.findByRole("listitem", { name: "people.csv" });
        const modal = await joinPlus();
        await choose(modal, "Incoming source", "entries.csv");
        await userEvent.click(within(modal).getByRole("radio", { name: NODE }));
        await choose(modal, "In graph type", "people.csv");
        await choose(modal, "Incoming field", "badge");
        await waitFor(() => {
            assert.strictEqual(draftOf(session).preview().steps.at(-1)?.buckets?.newEdges, 2);
        });
        const drawn = (): string[] =>
            session.data
                .edges()
                .map((edge) => `${String(edge.source)}-${String(edge.target)}`)
                .sort();
        await waitFor(() => {
            assert.deepStrictEqual(drawn(), ["B1-E1", "B2-E2"], "the drawn draft");
        });
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await closed();
        assert.deepStrictEqual(drawn(), ["B1-E1", "B2-E2"], "after Done");
    });

    it("opens a staged source's details in the inspector from its entry, and renames it there", async () => {
        await page.viewport(1280, 1000);
        const { session } = await emptyProject();
        await session.data.import({ type: "csv", config: { data: PEOPLE }, name: "people.csv" }, { key: "badge" });
        drop("doors.csv", DOORS);
        const entry = await screen.findByRole("listitem", { name: "doors.csv" });
        await userEvent.click(within(entry).getByRole("button", { name: /^Expand doors.csv/ }));
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await inspector.findByText("Rows");
        await inspector.findByText("Retrieved");
        await userEvent.click(within(entry).getByRole("button", { name: "doors.csv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Rename/ }));
        await userEvent.keyboard("gates{Enter}");
        await screen.findByRole("listitem", { name: /gates/ });
        assert.include(session.data.staged()[0]?.name ?? "", "gates");
    });
});
