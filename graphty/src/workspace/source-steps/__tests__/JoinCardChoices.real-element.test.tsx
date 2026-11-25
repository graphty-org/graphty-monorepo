/**
 * What a join card asks and offers on the REAL graphty-element with the source-steps experiment on
 * (issue #10054), driven by clicks and keys: first what each row becomes, then that choice's fields
 * and only its options. Fields on a node, with its rules per column; an edge between two nodes, with
 * Existing edge and new nodes at its other end; a node linked to what it names, kept between two of
 * them; links between nodes sharing a value, with a hub cap and a minimum; a column's values made
 * nodes, from one source alone; and the fields an earlier merge brought, offered to match.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SourceDraft, SourceStepRow } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { choose, drop, emptyProject } from "./sourceSteps";

withFeatures(["source-steps"]);

const EDGE = "An edge between two nodes";
const FIELDS = "Fields on a node";
const LINKS = "Links between nodes sharing a value";
const NODE = "A node linked to what it names";

const PEOPLE = "badge,name,dept,floor,tags\nB1,Ann,Ops,1,key;night\nB2,Bo,Ops,2,night\nB3,Cy,Sales,3,\nB4,Di,Ops,4,key";
/** B9 badges no person; B1 and B2 badged in twice. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE5,B2,D2";
const DOORS = "door,title\nD1,North\nD2,South";
/** HR's list: B1 names another department, B2 another floor and two rows; B7 is no person. */
const HR = "badge,dept,floor\nB1,Operations,1\nB2,Ops,5\nB2,Ops,9\nB7,Ops,7";
/** One row per badge and device: B1 holds two, B1 and B2 share v1. */
const DEVICES = "badge,device\nB1,v1\nB1,v2\nB2,v1\nB3,v3";

/**
 * People in the graph as type person, other files dropped and staged in order, and the workspace
 * opened with Shift+J.
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
    return { session, modal: await reopened() };
}

/**
 * Opens the workspace with Shift+J.
 * @returns it.
 */
async function reopened(): Promise<HTMLElement> {
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard("{Shift>}J{/Shift}");
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
 * Says on the open card what each row becomes.
 * @param modal - the workspace.
 * @param becomes - the choice, as the card names it.
 */
async function eachRow(modal: HTMLElement, becomes: string): Promise<void> {
    await userEvent.click(within(modal).getByRole("radio", { name: becomes }));
}

/**
 * Picks one way of a segmented choice of the open card.
 * @param modal - the workspace.
 * @param name - the choice.
 * @param way - the way.
 */
async function pickWay(modal: HTMLElement, name: string, way: string): Promise<void> {
    await userEvent.click(within(within(modal).getByRole("radiogroup", { name })).getByText(way));
}

/**
 * Types a name or a number in one of the open card's boxes and presses Enter.
 * @param modal - the workspace.
 * @param name - the box.
 * @param text - what to type.
 */
async function typeIn(modal: HTMLElement, name: string, text: string): Promise<void> {
    await userEvent.fill(within(modal).getByRole("combobox", { name }), text);
    await userEvent.keyboard("{Enter}");
}

/**
 * Picks one column in a box of several.
 * @param modal - the workspace.
 * @param name - the box.
 * @param column - the column.
 */
async function pickColumn(modal: HTMLElement, name: string, column: string): Promise<void> {
    await userEvent.click(within(modal).getByLabelText(name, { selector: "input" }));
    await userEvent.click(await screen.findByRole("option", { name: column }));
}

/**
 * Waits for the draft's newest step to be as a test needs it.
 * @param session - the session.
 * @param is - what it must be.
 * @param why - the test's words.
 * @returns the step.
 */
async function newest(
    session: GraphSession,
    is: (step: SourceStepRow) => boolean,
    why: string,
): Promise<SourceStepRow> {
    return waitFor(() => {
        const step = draftOf(session).steps().at(-1);
        assert.isTrue(step !== undefined && is(step), why);
        if (step === undefined) {
            throw new Error(why);
        }
        return step;
    });
}

/**
 * The open card's segmented choices, by name.
 * @param modal - the workspace.
 * @returns them.
 */
function offered(modal: HTMLElement): string[] {
    const card = modal.querySelector<HTMLElement>("[data-join-card]:not([data-join-card^='add:'])");
    return within(card ?? modal)
        .queryAllByRole("radiogroup")
        .map((group) => group.getAttribute("aria-label") ?? "")
        .filter((name) => name !== "");
}

/**
 * Presses Done and waits for the workspace to close.
 * @param modal - the workspace.
 */
async function done(modal: HTMLElement): Promise<void> {
    await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
    await waitFor(() => {
        assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
    });
}

describe("a join card's choices (source-steps)", () => {
    it("asks what each row becomes first, then offers only what that choice needs", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        const steps = draftOf(session).steps().length;
        assert.isNull(within(modal).queryByRole("radio", { checked: true, name: FIELDS }), "nothing is picked");
        assert.notInclude(modal.textContent ?? "", "-> ?");
        assert.strictEqual(draftOf(session).steps().length, steps, "a guess is shown, never applied");
        await eachRow(modal, NODE);
        await newest(session, (step) => step.act?.act === "connect", "a node linked to its person");
        assert.isNotNull(within(modal).queryByRole("combobox", { name: "Direction" }));
        assert.notInclude(offered(modal), "Existing edge", "only an edge meets another");
        assert.notInclude(offered(modal), "Many rows");
        await eachRow(modal, FIELDS);
        await newest(session, (step) => step.act?.act === "merge", "fields on their person");
        assert.include(offered(modal), "Many rows");
        assert.isNull(within(modal).queryByRole("combobox", { name: "Direction" }));
        assert.isNull(within(modal).queryByRole("combobox", { name: "Other end type" }));
        await eachRow(modal, EDGE);
        await within(modal).findByRole("combobox", { name: "Other end type" });
        await waitFor(() => {
            assert.notInclude(offered(modal), "Many rows", "its options wait for its two ends");
        });
        await eachRow(modal, LINKS);
        await within(modal).findByRole("combobox", { name: "Values in" });
        assert.isNull(within(modal).queryByRole("combobox", { name: "Incoming field" }));
    });

    it("an edge becomes a node between its two ends and back, and no node of the rows stays behind", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await eachRow(modal, EDGE);
        await choose(modal, "Other end field", "door");
        await choose(modal, "Other end type", "doors.csv");
        await newest(session, (step) => step.act?.to?.field === "door", "an edge per entry");
        assert.strictEqual(draftOf(session).preview().after.nodes, 6, "four people and two doors");
        await eachRow(modal, NODE);
        await newest(session, (step) => step.act?.to?.keepRow === true, "each entry between the two");
        assert.strictEqual(draftOf(session).preview().after.nodes, 11, "and the five entries");
        await userEvent.click(within(modal).getByRole("button", { name: "Remove Other end" }));
        const one = await newest(
            session,
            (step) => step.act?.act === "connect" && step.act.to === undefined,
            "one end",
        );
        assert.strictEqual(one.buckets?.newEdges, 4, "E4's B9 names no one");
        await eachRow(modal, EDGE);
        await choose(modal, "Other end field", "door");
        await choose(modal, "Other end type", "doors.csv");
        await newest(session, (step) => step.act?.to?.keepRow === undefined && step.act?.to !== undefined, "an edge");
        await done(modal);
        assert.strictEqual(session.data.nodes().length, 6, "the entries left no node behind");
        assert.strictEqual(session.data.edges().length, 4);
    });

    it("New nodes splits one source's tags into nodes, carrying a column, with nothing staged", async () => {
        const { session, modal } = await opened();
        await eachRow(modal, NODE);
        await choose(modal, "In graph type", "New nodes");
        await choose(modal, "Incoming field", "tags");
        await newest(session, (step) => step.extract?.column === "tags", "a node per value");
        await typeIn(modal, "Split on", ";");
        const split = await newest(session, (step) => step.extract?.split === ";", "split");
        assert.deepInclude(split.buckets, { newNodes: 2, newEdges: 4 });
        await typeIn(modal, "New type", "tag");
        await newest(session, (step) => step.extract?.type === "tag", "typed");
        await pickColumn(modal, "Carry", "floor");
        await newest(session, (step) => step.extract?.columns?.includes("floor") === true, "floor moves onto the tags");
        await userEvent.keyboard("{Escape}");
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "Escape closes the list, not the workspace");
        await done(modal);
        assert.strictEqual(session.data.count({ type: "tag" }).nodes, 2, "key and night");
    });

    it("New nodes of another field are that field's own, not the first one's kind", async () => {
        const { session, modal } = await opened();
        await eachRow(modal, NODE);
        await choose(modal, "In graph type", "New nodes");
        await choose(modal, "Incoming field", "dept");
        const first = await newest(session, (step) => step.extract?.column === "dept", "departments");
        assert.strictEqual(first.extract?.space, "dept");
        await choose(modal, "Incoming field", "tags");
        const second = await newest(session, (step) => step.extract?.column === "tags", "tags");
        assert.strictEqual(second.extract?.space, "tags");
    });

    it("a card's options stay while its source is changed away and back", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await eachRow(modal, NODE);
        await pickWay(modal, "No match", "Skip");
        await typeIn(modal, "Edge type", "entered");
        await newest(session, (step) => step.act?.edgeType === "entered", "set");
        await choose(modal, "Incoming source", "doors.csv");
        await waitFor(() => {
            assert.isUndefined(
                draftOf(session)
                    .steps()
                    .find((step) => step.act !== null),
            );
        });
        await choose(modal, "Incoming source", "entries.csv");
        await choose(modal, "Incoming field", "badge");
        const back = await newest(session, (step) => step.act !== null, "written again");
        assert.deepInclude(back.act, { edgeType: "entered", unlinked: "drop" });
    });

    it("an edge's other end can be new nodes, while a badge naming no one still makes none", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await eachRow(modal, EDGE);
        await choose(modal, "Other end type", "New nodes");
        await choose(modal, "Other end field", "door");
        await newest(session, (step) => step.act?.to?.unmatched === "add", "doors made of the column");
        await typeIn(modal, "New type", "gate");
        await newest(session, (step) => step.act?.to?.type === "gate", "typed");
        await choose(modal, "Direction", "door -> badge");
        await newest(session, (step) => step.act?.direction === "from-into", "turned");
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Other end field" }).value,
            "door",
            "turned round, the card keeps its ends where they were picked",
        );
        await done(modal);
        const edges = session.data.edges().map((edge) => `${String(edge.source)}->${String(edge.target)}`);
        assert.sameMembers(edges, ["D1->B1", "D2->B1", "D1->B2", "D2->B2"]);
        assert.strictEqual(session.data.count({ type: "gate" }).nodes, 2);
    });

    it("Existing edge Merge folds the rows into the edges already joining their ends", async () => {
        const first = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        const { session } = first;
        await eachRow(first.modal, EDGE);
        await choose(first.modal, "Other end field", "door");
        await choose(first.modal, "Other end type", "doors.csv");
        await newest(session, (step) => step.buckets?.newEdges === 4, "the first card's edges");
        await done(first.modal);
        const modal = await reopened();
        await userEvent.click(within(modal).getByRole("button", { name: /^\+ Join/ }));
        await eachRow(modal, EDGE);
        await choose(modal, "In graph type", "person");
        await choose(modal, "Incoming source", "entries.csv");
        await choose(modal, "Incoming field", "badge");
        await choose(modal, "Other end field", "door");
        await choose(modal, "Other end type", "doors.csv");
        await newest(session, (step) => step.buckets?.parallelPairs === 4, "Add: each runs beside the first");
        await pickWay(modal, "Existing edge", "Merge");
        const merged = await newest(session, (step) => step.act?.existing === "merge", "Merge");
        assert.deepInclude(merged.buckets, { newEdges: 0, mergedEdges: 4 });
        await within(modal).findByText("edges merged 4");
        await within(modal).findByRole("button", { name: "4 edges merged" });
        await done(modal);
        assert.lengthOf(session.data.edges(), 4, "no edge runs beside another");
    });

    it("links people by a field, with a hub cap and a minimum shared, and as a node per value", async () => {
        const { session, modal } = await opened();
        await eachRow(modal, LINKS);
        await pickColumn(modal, "Shared field", "dept");
        const linked = await newest(session, (step) => step.link !== null, "linked");
        assert.strictEqual(linked.buckets?.newEdges, 3, "B1, B2 and B4 are Ops");
        await userEvent.keyboard("{Escape}");
        await typeIn(modal, "Hub cap", "2");
        const capped = await newest(session, (step) => step.link?.maxShared === 2, "capped");
        assert.strictEqual(capped.buckets?.newEdges, 0, "three hold Ops");
        await within(modal).findByText("1 value over the cap");
        await typeIn(modal, "Hub cap", "5");
        await typeIn(modal, "Minimum shared", "2");
        const least = await newest(session, (step) => step.link?.minShared === 2, "a minimum");
        assert.strictEqual(least.buckets?.pairsBelowMin, 3);
        await pickWay(modal, "Link by", "Node per value");
        const nodes = await newest(session, (step) => step.link?.as === "nodes", "a node per value");
        assert.deepInclude(nodes.buckets, { newNodes: 1, newEdges: 3 });
    });

    it("links people whose rows in another file share a value", async () => {
        const { session, modal } = await opened(["devices.csv", DEVICES]);
        await eachRow(modal, LINKS);
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Named by" }).value,
            "badge",
            "the guess names the person",
        );
        await pickColumn(modal, "Shared field", "device");
        const linked = await newest(session, (step) => step.link !== null, "linked");
        assert.strictEqual(linked.buckets?.newEdges, 1, "B1 and B2 share v1");
        await userEvent.keyboard("{Escape}");
        await done(modal);
        assert.lengthOf(session.data.edges(), 1);
    });

    it("offers a field an earlier merge brought to match, and to link by", async () => {
        const { session, modal } = await opened(["watch.csv", "value,risk\nv2,high"], ["devices.csv", DEVICES]);
        await eachRow(modal, FIELDS);
        await pickWay(modal, "Many rows", "List");
        await newest(session, (step) => step.act?.aggregate?.["*"] === "list", "a list of devices");
        await userEvent.click(within(modal).getByRole("button", { name: /^\+ Join/ }));
        await waitFor(() => {
            assert.lengthOf(
                modal.querySelectorAll("[data-join-card]:not([data-join-card^='add:'])"),
                3,
                "the list's own card, the one that waits for watch.csv and the new one",
            );
        });
        await eachRow(modal, FIELDS);
        await choose(modal, "In graph type", "person");
        await choose(modal, "Incoming source", "watch.csv");
        await choose(modal, "In graph field", "device");
        await choose(modal, "Incoming field", "value");
        const flagged = await newest(
            session,
            (step) => step.act?.into.field === "device",
            "matched on the merged list",
        );
        assert.strictEqual(flagged.buckets?.merged, 1, "B1 holds v2");
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "In graph field" }).value,
            "device",
            "the card reads it back",
        );
        assert.strictEqual(within(modal).getByLabelText("Match count").textContent, "1 of 1 match");
        await userEvent.click(within(within(modal).getByRole("radiogroup", { name: "Fields" })).getByText("Fields"));
        assert.strictEqual((await within(modal).findByLabelText("person.device distinct")).textContent, "3");
        await eachRow(modal, LINKS);
        await choose(modal, "Values in", "The nodes");
        await pickColumn(modal, "Shared field", "device");
        const linked = await newest(session, (step) => step.link?.nodes === "person", "linked by the merged list");
        assert.strictEqual(linked.buckets?.newEdges, 1);
    });

    it("No match Add counts the node the merge adds and Skip none, and Only incoming lists it", async () => {
        const { session, modal } = await opened(["hr.csv", HR]);
        await eachRow(modal, FIELDS);
        const added = (): number => draftOf(session).preview().after.nodes - draftOf(session).preview().before.nodes;
        await within(modal).findByRole("button", { name: "1 new node" });
        assert.strictEqual(added(), 1, "B7");
        await userEvent.click(within(modal).getByText("Only incoming"));
        const values = within(modal).getByRole("grid", { name: "Values" });
        await waitFor(() => {
            assert.deepStrictEqual(
                within(values)
                    .getAllByRole("rowheader")
                    .map((cell) => cell.textContent),
                ["B7"],
            );
        });
        await pickWay(modal, "No match", "Skip");
        await waitFor(() => {
            assert.strictEqual(added(), 0);
        });
        assert.isNull(within(modal).queryByRole("button", { name: "1 new node" }));
    });

    it("offers Min where every value is a number, and a rule of a column's own outlives another choice", async () => {
        const { session, modal } = await opened(["hr.csv", HR]);
        await eachRow(modal, FIELDS);
        await userEvent.click(await within(modal).findByRole("combobox", { name: "Both have dept" }));
        await screen.findByRole("option", { name: "Use incoming" });
        assert.isNull(screen.queryByRole("option", { name: "Min" }), "no Min on a text column");
        await userEvent.keyboard("{Escape}");
        await choose(modal, "Both have floor", "Min");
        const ruleOf = (): string | undefined =>
            draftOf(session)
                .steps()
                .at(-1)
                ?.valuesDiffer.find((each) => each.params.column === "floor")?.params.rule;
        await waitFor(() => {
            assert.strictEqual(ruleOf(), "min");
        });
        await choose(modal, "Many rows floor", "Max");
        await newest(session, (step) => step.act?.aggregate?.floor === "max", "the column's own");
        await pickWay(modal, "Many rows", "Count");
        const counted = await newest(session, (step) => step.act?.aggregate?.["*"] === "count", "every other column");
        assert.strictEqual(counted.act?.aggregate?.floor, "max", "floor keeps its own");
        assert.strictEqual(ruleOf(), "min", "and its rule");
    });

    it("Enter on an open list, a switch or the Before radio commits nothing", async () => {
        const { session, modal } = await opened(["hr.csv", `${HR}\nb3,Ops,3`]);
        const steps = session.history.steps.length;
        await eachRow(modal, FIELDS);
        const keeps = (where: string): void => {
            assert.isTrue(draftOf(session).open, `Enter on ${where} keeps the draft open`);
            assert.strictEqual(session.history.steps.length, steps, `Enter on ${where} writes no step`);
            assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), `Enter on ${where} keeps the workspace`);
        };
        await userEvent.click(await within(modal).findByRole("combobox", { name: "Both have dept" }));
        await screen.findByRole("option", { name: "Use incoming" });
        await userEvent.keyboard("{Enter}");
        keeps("an open list");
        within(modal).getByRole("switch", { name: "Ignore case" }).focus();
        await userEvent.keyboard("{Enter}");
        keeps("Ignore case");
        const side = within(modal).getByRole("radiogroup", { name: "Before / After" });
        within(side).getByRole("radio", { name: "Before" }).focus();
        await userEvent.keyboard("{Enter}");
        keeps("the Before radio");
    });

    it("a changed card moves the counts a later card reads", async () => {
        const { session, modal } = await opened(["hr.csv", HR], ["entries.csv", ENTRIES]);
        // HR's B7 becomes a person, so an entry of B7's connects to it.
        await choose(modal, "Incoming source", "hr.csv");
        await choose(modal, "Incoming field", "badge");
        await eachRow(modal, FIELDS);
        await newest(session, (step) => step.act?.act === "merge", "B7 is a person now");
        await userEvent.click(within(modal).getByRole("button", { name: /^\+ Join/ }));
        await waitFor(() => {
            assert.strictEqual(
                within(modal).getByRole<HTMLInputElement>("combobox", { name: "Incoming source" }).value,
                "entries.csv",
            );
        });
        await eachRow(modal, LINKS);
        await choose(modal, "Values in", "The nodes");
        await pickColumn(modal, "Shared field", "dept");
        const linked = await newest(session, (step) => step.link !== null, "people of one department");
        const all = linked.buckets?.newEdges ?? 0;
        await userEvent.keyboard("{Escape}");
        await userEvent.click(within(modal).getByRole("button", { name: "Expand hr.csv -> Merge" }));
        await pickWay(modal, "No match", "Skip");
        const fewer = await newest(session, (step) => (step.buckets?.newEdges ?? all) < all, "B7's links go");
        const summary = `${String(fewer.buckets?.newEdges)} edges`;
        await waitFor(() => {
            const card = within(modal).getByRole("region", { name: /-> Link$/ });
            assert.include(card.textContent ?? "", summary, "the later card's folded summary reads its moved count");
        });
    });

    it("a file dropped while the workspace is open asks first, and Cancel keeps the draft and its rule", async () => {
        const { session, modal } = await opened(["hr.csv", HR]);
        await eachRow(modal, FIELDS);
        await choose(modal, "Both have dept", "Use incoming");
        const draft = draftOf(session);
        const rule = (): string | undefined =>
            draft
                .steps()
                .at(-1)
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
        assert.strictEqual(rule(), "overwrite", "with its rule");
        assert.lengthOf(session.data.staged(), 1, "buildings.csv is not staged");
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }));
    });
});
