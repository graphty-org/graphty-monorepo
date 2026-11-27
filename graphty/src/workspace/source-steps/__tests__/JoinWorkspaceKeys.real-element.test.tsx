/**
 * The join workspace's keys, undo and table on the REAL graphty-element with the source-steps experiment
 * on (issue #10054), driven by clicks and keys: its keys work from the moment it opens and after an undo,
 * a removed card comes back as it was, rows picked in one list are never another's, and what the owner's
 * files need of a card (both Ignore switches, the second match's rows, a value several nodes hold).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import {
    addMatch,
    advanced,
    choose,
    done,
    draftOf,
    emptyProject,
    joinAs,
    joinLines,
    joinsOf,
    newest,
    pickField,
    pickFields,
    pickSources,
    removeOpen,
    rowWith,
    select,
    selectJoin,
    stageFile,
} from "./sourceSteps";

withFeatures(["source-steps"]);

const EDGE = "Edge per entries row, people to doors";
const NODE = "Node per entries row, linked to people";

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
        await stageFile(name, text);
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
 * Matches people and entries by badge on the open card, says how to join them, and waits for the step.
 * @param session - the session.
 * @param modal - the workspace.
 * @param words - how, as the card words it.
 */
async function join(session: GraphSession, modal: HTMLElement, words: string): Promise<void> {
    await pickSources(modal, "people", "entries");
    await pickFields(modal, "badge", "badge");
    // The complete match joins at once by a default type; the reader's pick then makes it this one.
    await joinAs(modal, words);
    await within(modal).findByRole("radio", { name: words, checked: true });
    await waitFor(() => {
        assert.isAbove(joinsOf(session).length, 0);
    });
}

/**
 * Matches people and entries by badge and entries and doors by door on the open card.
 * @param modal - the workspace.
 */
async function matchBoth(modal: HTMLElement): Promise<void> {
    await pickSources(modal, "people", "entries");
    await pickFields(modal, "badge", "badge");
    await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
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
            assert.lengthOf(joinLines(modal), 2);
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
        await join(session, modal, NODE);
        await userEvent.click(within(modal).getByText("No match"));
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
        await join(session, modal, NODE);
        const joins = (): number => joinsOf(session).length;
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
        await join(session, modal, NODE);
        const box = within(modal).getByRole("combobox", { name: "Field 2" });
        await pickField(modal, "Field 2", "badge");
        assert.strictEqual(document.activeElement, box);
        await userEvent.keyboard("b");
        await waitFor(() => {
            assert.strictEqual(draftOf(session).side, "before");
        });
        await userEvent.click(box);
        await screen.findByRole("option", { name: /^entry / });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("option", { name: /^entry / }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "Escape closes the list alone");
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.lengthOf(joinsOf(session), 0, "the join is taken back");
        });
    });

    it("Escape in a field being typed in gives up the text; the next one cancels", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await join(session, modal, NODE);
        await advanced(modal);
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
        const field = within(modal).getByRole("combobox", { name: "Field 1" });
        await userEvent.click(field);
        await waitFor(() => {
            assert.strictEqual(draftOf(session).steps().at(-1)?.act?.edgeType, "entered");
        });
        await screen.findByRole("option", { name: /^phone / });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("option", { name: /^phone / }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }));
        await userEvent.keyboard("{Escape}");
        await closed();
        assert.lengthOf(session.data.edges(), 0, "Cancel discards");
    });

    it("Done selects a join begun and not finished, and says so; finished, it commits", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        // Both matches whole join at once by their edge type; a second card with one source picked is begun.
        await matchBoth(modal);
        await within(modal).findByRole("radio", { name: EDGE, checked: true });
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await choose(modal, "Source 1", "people");
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        assert.strictEqual((await within(modal).findByRole("alert")).textContent, "Unfinished");
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Source 1" }).value,
            "people",
            "the card it is drawn on is open",
        );
        await removeOpen(modal);
        await waitFor(() => {
            assert.isNull(within(modal).queryByRole("alert"));
        });
        await done(modal);
        assert.isAbove(session.data.edges().length, 0, "the joined card is committed");
    });

    it("both pickers list every source, waiting and in the graph, and only the second New nodes", async () => {
        const { modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        const read = async (name: string): Promise<string[]> => {
            await userEvent.click(within(modal).getByRole("combobox", { name }));
            const names = (await screen.findAllByRole("option")).map((option) => option.textContent ?? "");
            await userEvent.keyboard("{Escape}");
            return names;
        };
        assert.deepStrictEqual(await read("Source 1"), ["doors", "entries", "people"]);
        assert.deepStrictEqual(await read("Source 2"), ["doors", "entries", "people", "As new nodes"]);
    });

    it("the other end is matched by any field of its nodes, with its own live count", async () => {
        const doors = "door,code\nBLDG-01,c1\nBLDG-02,c2";
        const entries = "entry,badge,at\nE1,B1,c1\nE2,B2,c2\nE3,B3,c9";
        const { session, modal } = await opened(["doors.csv", doors], ["entries.csv", entries]);
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "badge", "badge");
        await addMatch(modal, 2, ["entries", "at"], ["doors", "code"]);
        await joinAs(modal, EDGE);
        await waitFor(() => {
            assert.deepStrictEqual(
                session.data.edges().map((edge) => [edge.source, edge.target]),
                [
                    ["B1", "BLDG-01"],
                    ["B2", "BLDG-02"],
                ],
            );
        });
        assert.strictEqual(within(modal).getByLabelText("Match count 2").textContent, "2 of 3 match");
    });

    it("draw a removed card again: Undo brings its step back, and once more its lines", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await join(session, modal, NODE);
        await removeOpen(modal);
        await waitFor(() => {
            assert.lengthOf(draftOf(session).steps(), 1);
        });
        assert.lengthOf(joinLines(modal), 0);
        const undo = within(modal).getByRole("button", { name: /^Undo/ });
        await userEvent.click(undo);
        await within(modal).findByRole("radio", { checked: true, name: NODE });
        assert.deepStrictEqual(joinLines(modal), ["people + entries"]);
        await userEvent.click(undo);
        await waitFor(() => {
            assert.isNull(within(modal).queryByRole("radio", { checked: true, name: NODE }));
        });
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Field 2" }).value,
            "badge",
            "its lines are drawn again",
        );
    });
});

describe("a join card's matches and table (source-steps)", () => {
    it("draws Every match ignores on the first switch's line when the switches stack, at a tablet's width (#10216)", async () => {
        // Rows whose door differs only by case, others only by a space: each switch alone matches 120 more, and
        // the two switches' words no longer fit on one line.
        const entries = [
            "entry,badge,door",
            ...Array.from({ length: 120 }, (_, i) => `C${String(i)},B1,bldg-01`),
            ...Array.from({ length: 120 }, (_, i) => `S${String(i)},B2,BLDG-02 `),
        ].join("\n");
        const { modal } = await opened(["doors.csv", DOORS], ["entries.csv", entries]);
        await page.viewport(1024, 1366);
        await matchBoth(modal);
        const label = await within(modal).findByText("Every match ignores");
        const boxes = (): DOMRect[] =>
            within(modal)
                .getAllByRole("switch", { name: /^Ignore / })
                .flatMap((each) => each.closest(".mantine-Switch-root")?.getBoundingClientRect() ?? []);
        await waitFor(() => {
            const [first, second] = boxes();
            assert.isAtLeast(second.top, first.bottom, "the switches stack");
        });
        const [first] = boxes();
        const middle = (box: DOMRect): number => box.top + box.height / 2;
        const words = middle(label.getBoundingClientRect());
        assert.isAtMost(
            Math.abs(words - middle(first)),
            2,
            `the label's middle at ${String(words)}, the first switch's at ${String(middle(first))}`,
        );
    });

    it("offers both Ignore switches where only the two together match more, and shows either match's rows", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await matchBoth(modal);
        await joinAs(modal, EDGE);
        await newest(session, (row) => row.act !== null, "joined");
        assert.strictEqual(within(modal).getByLabelText("Match count 1").textContent, "2 of 3 match, 1 empty");
        assert.strictEqual(within(modal).getByLabelText("Match count 2").textContent, "2 of 3 match");
        assert.isNotNull(within(modal).getByText("Every match ignores"), "the switches set every match of the card");
        await userEvent.click(within(modal).getByRole("switch", { name: "Ignore case" }));
        await userEvent.click(within(modal).getByRole("switch", { name: "Ignore spaces" }));
        await waitFor(() => {
            assert.strictEqual(within(modal).getByLabelText("Match count 2").textContent, "3 of 3 match");
        });
        const lines = within(modal).getByRole("radiogroup", { name: "Match" });
        await userEvent.click(within(lines).getByText("door"));
        rowWith(await within(modal).findByRole("grid", { name: "doors" }), "BLDG-02");
        await done(modal);
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
        await pickSources(modal, "people", "watch");
        await pickFields(modal, "phone", "value");
        await joinAs(modal, "Fields of watch on people");
        await waitFor(() => {
            assert.strictEqual(draftOf(session).steps().at(-1)?.buckets?.merged, 3);
        });
        await advanced(modal);
        const several = within(modal).getByRole("radiogroup", { name: "Several match" });
        await userEvent.click(within(several).getByText("Skip"));
        await waitFor(() => {
            assert.deepInclude(draftOf(session).steps().at(-1)?.buckets, { merged: 1, fanOut: 1, keptNew: 0 });
        });
        await userEvent.click(within(several).getByText("Each"));
        await done(modal);
        assert.deepStrictEqual(
            ["B1", "B2", "B3", "B4"].map((id) => session.data.node(id)?.risk),
            ["high", "high", "low", undefined],
        );
    });

    it("a second card of a source merged with Skip still gives its fields; kept as nodes, it says Merge", async () => {
        const { session, modal } = await opened(["watch.csv", "value,risk\n555,high\nAnn,low"]);
        await pickSources(modal, "people", "watch");
        await pickFields(modal, "phone", "value");
        await joinAs(modal, "Fields of watch on people");
        await newest(session, (row) => row.act?.unmatchedFrom === "drop", "Skip to start with");
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await pickSources(modal, "people", "watch");
        await pickFields(modal, "name", "value");
        await within(modal).findByRole("radio", { name: "Fields of watch on people" });
        assert.deepStrictEqual(joinLines(modal), ["people + watch, phone", "people + watch, name"]);
        await selectJoin(modal, "people + watch, phone");
        await userEvent.click(within(within(modal).getByRole("radiogroup", { name: "No match" })).getByText("Add"));
        // The second card joined at once too, so the first card's step is no longer the newest.
        await waitFor(() => {
            assert.isTrue(
                joinsOf(session).some((row) => row.act?.unmatchedFrom === "keep"),
                "its leftover row is a node",
            );
        });
        await selectJoin(modal, "people + watch, name");
        await within(modal).findByRole("radio", { name: "Merge watch nodes into people" });
    });

    it("never excludes rows picked in another card's list", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await join(session, modal, NODE);
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
        await userEvent.click(within(modal).getByRole("button", { name: "Tables" }));
        await within(modal).findByRole("grid", { name: "entries" });
    });

    it("selecting another card shows its own sources' rows, never the list the last one left", async () => {
        const { session, modal } = await opened(["parts.csv", "part,color\nX1,red\nX2,blue"], ["entries.csv", ENTRIES]);
        await join(session, modal, NODE);
        await userEvent.click(await within(modal).findByRole("button", { name: /new edges$/ }));
        await within(modal).findByRole("grid", { name: "Rows" });
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        assert.isNull(within(modal).queryByRole("grid", { name: "Rows" }));
        await choose(modal, "Source 1", "parts");
        rowWith(await within(modal).findByRole("grid", { name: "parts" }), "blue");
        await selectJoin(modal, "people + entries");
        await within(modal).findByRole("grid", { name: "entries" });
        assert.isNull(within(modal).queryByRole("grid", { name: "Rows" }));
    });

    it("shows the rows of a source nothing matches yet", async () => {
        const { modal } = await opened(["parts.csv", "part,color\nX1,red\nX2,blue"]);
        await choose(modal, "Source 2", "parts");
        rowWith(await within(modal).findByRole("grid", { name: "parts" }), "blue");
    });

    it("a reopened card says which rows it leaves out, before any list is opened, and takes them back", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await join(session, modal, NODE);
        await userEvent.click(await within(modal).findByRole("button", { name: /new edges$/ }));
        await select(rowWith(await within(modal).findByRole("grid", { name: "Rows" }), "E1"));
        await userEvent.click(await within(modal).findByRole("button", { name: "Exclude" }));
        await within(modal).findByRole("button", { name: "Include E1" });
        await done(modal);
        const again = await joinPlus();
        await selectJoin(again, "people + entries");
        assert.include(again.textContent ?? "", "1 excluded");
        await userEvent.click(await within(again).findByRole("button", { name: "Include E1" }));
        await waitFor(() => {
            assert.isNull(draftOf(session).steps().at(-1)?.except ?? null);
        });
    });

    it("a reopened card reads its sources, fields and way to join back, in the order the reader picked them", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        // Picked the other way round from the order loaded: the list and a reopened card keep the reader's order.
        await pickSources(modal, "entries", "people");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, NODE);
        await newest(session, (row) => row.act !== null, "joined");
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Source 1" }).value,
            "entries",
            "while it is open it keeps the reader's own sides",
        );
        await done(modal);
        const again = await joinPlus();
        assert.deepStrictEqual(joinLines(again), ["entries + people", "New join"]);
        await selectJoin(again, "entries + people");
        const read = ["Source 1", "Source 2", "Field 1", "Field 2"].map(
            (name) => within(again).getByRole<HTMLInputElement>("combobox", { name }).value,
        );
        assert.deepStrictEqual(read, ["entries", "people", "badge", "badge"]);
        await within(again).findByRole("radio", { checked: true, name: NODE });
        await userEvent.click(within(within(again).getByRole("radiogroup", { name: "No match" })).getByText("Skip"));
        await newest(session, (row) => row.act?.unlinked === "drop", "its options are changed in place");
        assert.include(again.textContent ?? "", "nodes removed 1", "E3 badges no one");
        assert.deepStrictEqual(joinLines(again), ["entries + people", "New join"], "still one card");
        await done(again);
        assert.isUndefined(session.data.node("E3"));
    });

    it("a source added here is one line in the list, and removing it takes the joins onto it", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await choose(modal, "Source 1", "doors");
        await userEvent.click(await within(modal).findByRole("button", { name: "Add as is" }));
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["doors, added"], "people, in the graph already, is no line");
        });
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await pickSources(modal, "doors", "entries");
        await pickFields(modal, "door", "door");
        await joinAs(modal, "Node per entries row, linked to doors");
        await newest(session, (row) => row.act !== null, "joined");
        await selectJoin(modal, "doors, added");
        await removeOpen(modal);
        await waitFor(() => {
            assert.lengthOf(joinsOf(session), 0, "the join that names its nodes goes too");
        });
        assert.notInclude(modal.textContent ?? "", "source:", "no line names a source by its id");
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.lengthOf(joinsOf(session), 1);
        });
    });

    it("edges with their ends unpicked are neither added nor done", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await choose(modal, "Source 1", "entries");
        await userEvent.click(within(modal).getByRole("button", { name: "Expand entries rows" }));
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
        await join(session, modal, NODE);
        await waitFor(() => {
            const box = within(modal).getByRole("button", { name: "Done" }).getBoundingClientRect();
            const frame = modal.getBoundingClientRect();
            assert.isAtMost(box.right, frame.right);
            assert.isAbove(modal.querySelector(".sel-ws-title")?.clientWidth ?? 0, 0, "the title keeps its room");
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
        await stageFile("people.csv", PEOPLE);
        await screen.findByRole("listitem", { name: "people.csv" });
        const modal = await joinPlus();
        await pickSources(modal, "entries", "people");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, "Node per people row, linked to entries");
        await waitFor(() => {
            assert.strictEqual(draftOf(session).preview().steps.at(-1)?.buckets?.newEdges, 2);
        });
        const drawn = (): string[] =>
            session.data
                .edges()
                .map((edge) => `${String(edge.source)}-${String(edge.target)}`)
                .sort();
        await waitFor(() => {
            assert.deepStrictEqual(drawn(), ["E1-B1", "E2-B2"], "the drawn draft");
        });
        await done(modal);
        assert.deepStrictEqual(drawn(), ["E1-B1", "E2-B2"], "after Done");
    });

    it("opens a staged source's details in the inspector from its entry, and renames it there", async () => {
        await page.viewport(1280, 1000);
        const { session } = await emptyProject();
        await session.data.import({ type: "csv", config: { data: PEOPLE }, name: "people.csv" }, { key: "badge" });
        await stageFile("doors.csv", DOORS);
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
