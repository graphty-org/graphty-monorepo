/**
 * What a join card asks and offers on the REAL graphty-element with the source-steps experiment on
 * (issue #10054), driven by clicks and keys: first two sources, then a field of each, then how to join
 * them, and only that way's options. Fields on a node, with its rules per column; an edge between two
 * nodes, with Existing edge and new nodes at its other end; a node linked to what it names, kept between
 * two of them; nodes sharing a value, with a hub cap and a minimum; a column's values made nodes, from one
 * source alone; and the fields an earlier merge brought, offered to match.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { WORKSPACE_WORDS } from "../words";
import {
    addMatch,
    advanced,
    cardCount,
    checkedWay,
    choose,
    done,
    draftOf,
    drop,
    emptyProject,
    joinAs,
    joinLines,
    joinsOf,
    newest,
    openJoins,
    pickField,
    pickFields,
    pickSources,
    selectJoin,
    stageFile,
    waysToJoin,
} from "./sourceSteps";

withFeatures(["source-steps"]);

const FIELDS = "Fields of entries on people";
const NODE = "Node per entries row, linked to people";
const EDGE = "Edge per entries row, people to doors";
const MIDDLE = "Node per entries row, linked to people and doors";

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
        await stageFile(name, text);
        await screen.findByRole("listitem", { name });
    }
    return { session, modal: await openJoins() };
}

/**
 * Picks people and another source on the open card, and a field of each.
 * @param modal - the workspace.
 * @param other - the other source.
 * @param field - people's field.
 * @param named - the other source's field.
 */
async function match(modal: HTMLElement, other: string, field = "badge", named = field): Promise<void> {
    await pickSources(modal, "people", other);
    await pickFields(modal, field, named);
}

/**
 * Picks one way of a segmented choice of the open card.
 * @param modal - the workspace.
 * @param name - the choice.
 * @param way - the way.
 */
async function pickWay(modal: HTMLElement, name: string | RegExp, way: string): Promise<void> {
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
 * The open card's segmented choices, by name.
 * @param modal - the workspace.
 * @returns them.
 */
function offered(modal: HTMLElement): string[] {
    const card = modal.querySelector<HTMLElement>("[data-join-editor]");
    return within(card ?? modal)
        .queryAllByRole("radiogroup")
        .map((group) => group.getAttribute("aria-label") ?? "")
        .filter((name) => name !== "");
}

describe("a join card's choices (source-steps)", () => {
    it("asks for two sources, then a field of each, then how to join them, and offers only what that needs", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        const steps = draftOf(session).steps().length;
        const card = modal.querySelector<HTMLElement>("[data-join-editor]") ?? modal;
        // The boxes the reader can pick from: the Join type is named from the start, off until a match is whole.
        const boxes = (): string[] =>
            within(card)
                .getAllByRole<HTMLInputElement>("combobox")
                .filter((box) => !box.disabled)
                .map((box) => `${box.getAttribute("aria-label") ?? ""}: ${box.value}`);
        assert.deepStrictEqual(boxes(), ["Source 1: ", "Source 2: "], "a new card is two blank pickers");
        assert.isTrue(
            within(card).getByRole<HTMLInputElement>("combobox", { name: "Join type" }).disabled,
            "and its join type, named and waiting",
        );
        assert.lengthOf(within(card).queryAllByRole("button", { name: /Add as is|Match|Remove/ }), 0);
        await choose(modal, "Source 1", "people");
        assert.lengthOf(boxes(), 2, "fields wait for both sources");
        await choose(modal, "Source 2", "entries");
        assert.deepStrictEqual(boxes(), ["Source 1: people", "Source 2: entries", "Field 1: ", "Field 2: "]);
        await userEvent.click(within(modal).getByRole("combobox", { name: "Field 2" }));
        const likely = await screen.findByRole("option", { name: /suggested$/ });
        assert.strictEqual(
            likely.textContent,
            "badge repeats, suggested",
            "the guess is marked, with the field's facts",
        );
        await userEvent.keyboard("{Escape}");
        assert.deepStrictEqual(waysToJoin(modal), [], "how to join waits for the fields");
        await pickFields(modal, "badge", "badge");
        assert.strictEqual(cardCount(modal), "4 of 5 rows matched");
        assert.deepStrictEqual(waysToJoin(modal), [FIELDS, NODE]);
        assert.strictEqual(checkedWay(modal), NODE, "the type that adds edges is picked at once");
        assert.isAbove(draftOf(session).steps().length, steps, "and applied");
        await joinAs(modal, NODE);
        await newest(session, (step) => step.act?.act === "connect", "a node linked to its person");
        assert.notInclude(offered(modal), "Existing edge", "only an edge meets another");
        assert.notInclude(offered(modal), "Rows per node");
        await advanced(modal);
        assert.isNotNull(within(modal).queryByRole("combobox", { name: "Direction" }));
        await joinAs(modal, FIELDS);
        await newest(session, (step) => step.act?.act === "merge", "fields on their person");
        assert.include(offered(modal), "Rows per node");
        assert.isNull(within(modal).queryByRole("combobox", { name: "Direction" }));
        await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
        assert.include(waysToJoin(modal), EDGE);
        assert.isNull(within(modal).queryByRole("radio", { checked: true, name: FIELDS }), "its join is picked again");
        assert.strictEqual(checkedWay(modal), EDGE, "by the first type of both matches that adds edges");
    });

    it("an edge becomes a node between its two ends and back, and no node of the rows stays behind", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await match(modal, "entries");
        await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
        await joinAs(modal, EDGE);
        await newest(session, (step) => step.act?.to?.field === "door", "an edge per entry");
        assert.strictEqual(draftOf(session).preview().after.nodes, 6, "four people and two doors");
        await joinAs(modal, MIDDLE);
        await newest(session, (step) => step.act?.to?.keepRow === true, "each entry between the two");
        assert.strictEqual(draftOf(session).preview().after.nodes, 11, "and the five entries");
        await userEvent.click(within(modal).getByRole("button", { name: "Remove match 2" }));
        await joinAs(modal, NODE);
        const one = await newest(
            session,
            (step) => step.act?.act === "connect" && step.act.to === undefined,
            "one end",
        );
        assert.strictEqual(one.buckets?.newEdges, 4, "E4's B9 names no one");
        await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
        await joinAs(modal, EDGE);
        await newest(session, (step) => step.act?.to?.keepRow === undefined && step.act?.to !== undefined, "an edge");
        await done(modal);
        assert.strictEqual(session.data.nodes().length, 6, "the entries left no node behind");
        assert.strictEqual(session.data.edges().length, 4);
    });

    it("New nodes splits one source's tags into nodes, carrying a column, with nothing staged", async () => {
        const { session, modal } = await opened();
        await pickSources(modal, "people", "As new nodes");
        await pickFields(modal, "tags", null);
        await joinAs(modal, "Node per tags, linked to people");
        await newest(session, (step) => step.extract?.column === "tags", "a node per value");
        await typeIn(modal, "Split on", ";");
        const split = await newest(session, (step) => step.extract?.split === ";", "split");
        assert.deepInclude(split.buckets, { newNodes: 2, newEdges: 4 });
        await typeIn(modal, "New type", "tag");
        await newest(session, (step) => step.extract?.type === "tag", "typed");
        await advanced(modal);
        await pickColumn(modal, "Move fields", "floor");
        await newest(session, (step) => step.extract?.columns?.includes("floor") === true, "floor moves onto the tags");
        await userEvent.keyboard("{Escape}");
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "Escape closes the list, not the workspace");
        assert.deepStrictEqual(joinLines(modal), ["people + tags"]);
        await done(modal);
        assert.strictEqual(session.data.count({ type: "tag" }).nodes, 2, "key and night");
    });

    it("New nodes of another field are that field's own, not the first one's kind", async () => {
        const { session, modal } = await opened();
        await pickSources(modal, "people", "As new nodes");
        await pickFields(modal, "dept", null);
        await joinAs(modal, "Node per dept, linked to people");
        const first = await newest(session, (step) => step.extract?.column === "dept", "departments");
        assert.strictEqual(first.extract?.space, "dept");
        await pickField(modal, "Field 1", "tags");
        const second = await newest(session, (step) => step.extract?.column === "tags", "tags");
        assert.strictEqual(second.extract?.space, "tags", "the way to join stays while its field changes");
    });

    it("a card's options stay while its source is changed away and back", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await match(modal, "entries");
        await joinAs(modal, NODE);
        await pickWay(modal, WORKSPACE_WORDS.unmatchedRows, WORKSPACE_WORDS.skipRow);
        await advanced(modal);
        await typeIn(modal, "Edge type", "entered");
        await newest(session, (step) => step.act?.edgeType === "entered", "set");
        await choose(modal, "Source 2", "doors");
        await waitFor(() => {
            assert.lengthOf(joinsOf(session), 0);
        });
        await choose(modal, "Source 2", "entries");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, NODE);
        const back = await newest(session, (step) => step.act !== null, "written again");
        assert.deepInclude(back.act, { edgeType: "entered", unlinked: "drop" });
    });

    it("an edge's other end can be new nodes, while a badge naming no one still makes none", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await match(modal, "entries");
        await addMatch(modal, 2, ["entries", "door"], ["As new nodes", null]);
        assert.include(waysToJoin(modal), "Node per entries row, linked to people and new door nodes");
        await joinAs(modal, "Edge per entries row, people to new door nodes");
        await newest(session, (step) => step.act?.to?.unmatched === "add", "doors made of the column");
        await advanced(modal);
        await typeIn(modal, "New type", "gate");
        await newest(session, (step) => step.act?.to?.type === "gate", "typed");
        await choose(modal, "Direction", "new door nodes -> people");
        await newest(session, (step) => step.act?.direction === "from-into", "turned");
        assert.isNotNull(
            within(modal).queryByRole("radio", {
                checked: true,
                name: "Edge per entries row, new door nodes to people",
            }),
            "turned round, its words turn",
        );
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Match 2 field 1" }).value,
            "door",
            "and the card keeps its ends where they were picked",
        );
        await done(modal);
        const edges = session.data.edges().map((edge) => `${String(edge.source)}->${String(edge.target)}`);
        assert.sameMembers(edges, ["D1->B1", "D2->B1", "D1->B2", "D2->B2"]);
        assert.strictEqual(session.data.count({ type: "gate" }).nodes, 2);
    });

    it("Existing edge Merge folds the rows into the edges already joining their ends, asked first when there are any", async () => {
        const first = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        const { session } = first;
        await match(first.modal, "entries");
        await addMatch(first.modal, 2, ["entries", "door"], ["doors", "door"]);
        await joinAs(first.modal, EDGE);
        await newest(session, (step) => step.buckets?.newEdges === 4, "the first card's edges");
        assert.notInclude(offered(first.modal), "Existing edge", "no edge joins them yet");
        await done(first.modal);
        const modal = await openJoins();
        await match(modal, "entries");
        await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
        await joinAs(modal, EDGE);
        await newest(session, (step) => step.buckets?.parallelPairs === 4, "Add: each runs beside the first");
        await pickWay(modal, "Existing edge", "Merge");
        const merged = await newest(session, (step) => step.act?.existing === "merge", "Merge");
        assert.deepInclude(merged.buckets, { newEdges: 0, mergedEdges: 4 });
        await within(modal.querySelector<HTMLElement>(".jw-key") ?? modal).findByLabelText("4 merged edges");
        await within(modal).findByRole("button", { name: "4 edges merged" });
        await done(modal);
        assert.lengthOf(session.data.edges(), 4, "no edge runs beside another");
    });

    it("links people by a field matched with itself, with a hub cap and a minimum shared, and as a node per value", async () => {
        const { session, modal } = await opened();
        await match(modal, "people", "dept");
        assert.deepStrictEqual(waysToJoin(modal), [
            "Edge between people sharing dept",
            "Node per dept, linked to people",
        ]);
        await joinAs(modal, "Edge between people sharing dept");
        const linked = await newest(session, (step) => step.link !== null, "linked");
        assert.strictEqual(linked.buckets?.newEdges, 3, "B1, B2 and B4 are Ops");
        await typeIn(modal, "Max nodes per value", "2");
        const capped = await newest(session, (step) => step.link?.maxShared === 2, "capped");
        assert.strictEqual(capped.buckets?.newEdges, 0, "three hold Ops");
        await within(modal).findByText("1 value over the cap");
        await typeIn(modal, "Max nodes per value", "5");
        await typeIn(modal, "Minimum shared", "2");
        const least = await newest(session, (step) => step.link?.minShared === 2, "a minimum");
        assert.strictEqual(least.buckets?.pairsBelowMin, 3);
        await joinAs(modal, "Node per dept, linked to people");
        const nodes = await newest(session, (step) => step.link?.as === "nodes", "a node per value");
        assert.deepInclude(nodes.buckets, { newNodes: 1, newEdges: 3 });
        assert.deepStrictEqual(joinLines(modal), ["people, dept"]);
    });

    it("links people whose rows in another file share a value", async () => {
        const { session, modal } = await opened(["devices.csv", DEVICES]);
        await match(modal, "devices");
        await addMatch(modal, 2, ["devices", "device"], ["devices", "device"]);
        await joinAs(modal, "Edge between people sharing device");
        const linked = await newest(session, (step) => step.link !== null, "linked");
        assert.strictEqual(linked.buckets?.newEdges, 1, "B1 and B2 share v1");
        await done(modal);
        assert.lengthOf(session.data.edges(), 1);
    });

    it("offers a field an earlier merge brought to match, saying its source, and to link by", async () => {
        const { session, modal } = await opened(["watch.csv", "value,risk\nv2,high"], ["devices.csv", DEVICES]);
        await match(modal, "devices");
        await joinAs(modal, "Fields of devices on people");
        await pickWay(modal, "Rows per node", "List all");
        await newest(session, (step) => step.act?.aggregate?.["*"] === "list", "a list of devices");
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(modal), ["people + devices", "New join"]);
        });
        await pickSources(modal, "people", "watch");
        await userEvent.click(within(modal).getByRole("combobox", { name: "Field 1" }));
        const brought = await screen.findByRole("option", { name: /^device / });
        assert.strictEqual(brought.textContent, "device devices, repeats, 1 empty");
        await userEvent.click(brought);
        await pickField(modal, "Field 2", "value");
        assert.strictEqual(cardCount(modal), "1 of 1 row matched");
        await joinAs(modal, "Fields of watch on people");
        const flagged = await newest(
            session,
            (step) => step.act?.into.field === "device",
            "matched on the merged list",
        );
        assert.strictEqual(flagged.buckets?.merged, 1, "B1 holds v2");
        assert.strictEqual(
            within(modal).getByRole<HTMLInputElement>("combobox", { name: "Field 1" }).value,
            "device",
            "the card reads it back",
        );
        await match(modal, "people", "device");
        await joinAs(modal, "Edge between people sharing device");
        const linked = await newest(session, (step) => step.link?.nodes === "person", "linked by the merged list");
        assert.strictEqual(linked.buckets?.newEdges, 1);
    });

    it("No match Skip adds no node and Add the one nothing names, and Only lists it", async () => {
        const { session, modal } = await opened(["hr.csv", HR]);
        await match(modal, "hr");
        await joinAs(modal, "Fields of hr on people");
        const added = (): number => draftOf(session).preview().after.nodes - draftOf(session).preview().before.nodes;
        await newest(session, (step) => step.act?.unmatchedFrom === "drop", "Skip to start with");
        assert.strictEqual(added(), 0);
        assert.isNull(within(modal).queryByRole("button", { name: "1 new node" }));
        await userEvent.click(within(modal).getByText("Only hr"));
        const rows = within(modal).getByRole("grid", { name: "hr" });
        await waitFor(() => {
            assert.deepStrictEqual(
                within(rows)
                    .getAllByRole("rowheader")
                    .map((cell) => cell.textContent),
                ["B7"],
            );
        });
        await pickWay(modal, WORKSPACE_WORDS.unmatchedRows, WORKSPACE_WORDS.addNode);
        await within(modal).findByRole("button", { name: "1 new node" });
        assert.strictEqual(added(), 1, "B7");
    });

    it("offers Min where every value is a number, and a rule of a column's own outlives another choice", async () => {
        const { session, modal } = await opened(["hr.csv", HR]);
        await match(modal, "hr");
        await joinAs(modal, "Fields of hr on people");
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
        await advanced(modal);
        await choose(modal, "Rows per node floor", "Max");
        await newest(session, (step) => step.act?.aggregate?.floor === "max", "the column's own");
        await pickWay(modal, "Rows per node", "Count");
        const counted = await newest(session, (step) => step.act?.aggregate?.["*"] === "count", "every other column");
        assert.strictEqual(counted.act?.aggregate?.floor, "max", "floor keeps its own");
        assert.strictEqual(ruleOf(), "min", "and its rule");
    });

    it("a card of two merges asks Both have of the second one's fields too, and its rule lands on that merge", async () => {
        // doors' name clashes with people's, in the second merge of the card (doors onto people by entries' door).
        const { session, modal } = await opened(
            ["doors.csv", "door,name\nD1,North\nD2,South"],
            ["entries.csv", ENTRIES],
        );
        await match(modal, "entries");
        await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
        await joinAs(modal, "Fields of entries and doors on people");
        await choose(modal, "Both have name", "Use incoming");
        await waitFor(() => {
            const rules = draftOf(session)
                .steps()
                .flatMap((step) => step.valuesDiffer.filter((each) => each.params.column === "name"));
            assert.deepStrictEqual(
                rules.map((each) => each.params.rule),
                ["overwrite"],
            );
        });
        await pickWay(modal, "Rows per node", "List all");
        await newest(session, (step) => step.act?.repeated === "list", "the card's merges list every row");
        const rules = draftOf(session)
            .steps()
            .flatMap((step) => step.valuesDiffer.filter((each) => each.params.column === "name"));
        assert.deepStrictEqual(
            rules.map((each) => each.params.rule),
            ["overwrite"],
            "another option keeps the second merge's rule",
        );
    });

    it("Enter on an open list, a switch or the Before radio commits nothing", async () => {
        const { session, modal } = await opened(["hr.csv", `${HR}\nb3,Ops,3`]);
        const steps = session.history.steps.length;
        await match(modal, "hr");
        await joinAs(modal, "Fields of hr on people");
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
        assert.isNotNull(within(side).getByRole("radio", { name: "After" }), "its key is no part of its name");
        assert.include(side.textContent ?? "", "B", "and is shown beside it");
        within(side).getByRole("radio", { name: "Before" }).focus();
        await userEvent.keyboard("{Enter}");
        keeps("the Before radio");
    });

    it("a changed card moves the counts a later card reads", async () => {
        const { session, modal } = await opened(["hr.csv", HR]);
        // HR's B7 becomes a person, so a department it holds links it too.
        await match(modal, "hr");
        await joinAs(modal, "Fields of hr on people");
        await pickWay(modal, WORKSPACE_WORDS.unmatchedRows, WORKSPACE_WORDS.addNode);
        await newest(session, (step) => step.act?.unmatchedFrom === "keep", "B7 is a person now");
        await userEvent.click(within(modal).getByRole("button", { name: "Join" }));
        await pickSources(modal, "person", "person");
        await pickFields(modal, "dept", "dept");
        await joinAs(modal, "Edge between person sharing dept");
        await newest(session, (step) => step.buckets?.newEdges === 6, "B1, B2, B4 and B7 are Ops");
        await selectJoin(modal, "people + hr");
        await pickWay(modal, WORKSPACE_WORDS.unmatchedRows, WORKSPACE_WORDS.skipRow);
        await newest(session, (step) => step.buckets?.newEdges === 3, "B7's links go");
        await selectJoin(modal, "person, dept");
        await within(modal).findByRole("button", { name: "3 new edges" });
    });

    it("a file dropped while the workspace is open asks first, and Cancel keeps the draft and its rule", async () => {
        const { session, modal } = await opened(["hr.csv", HR]);
        await match(modal, "hr");
        await joinAs(modal, "Fields of hr on people");
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

    it("asks Unmatched rows and Missing end in fixed words, each choice doing what it says (#10394)", async () => {
        const { session, modal } = await opened(["entries.csv", ENTRIES]);
        await match(modal, "entries");
        await joinAs(modal, NODE);
        const unmatched = await within(modal).findByRole("radiogroup", { name: WORKSPACE_WORDS.unmatchedRows });
        const missing = within(modal).getByRole("radiogroup", { name: WORKSPACE_WORDS.missingEnd });
        // The way that makes or keeps a node first, in every row.
        for (const [group, ways] of [
            // The row is kept; Add node is Missing end's alone, so the two never read alike.
            [unmatched, [WORKSPACE_WORDS.keepRow, WORKSPACE_WORDS.skipRow]],
            [missing, [WORKSPACE_WORDS.addNode, WORKSPACE_WORDS.skipEdge]],
        ] as const) {
            assert.deepStrictEqual(
                within(group)
                    .getAllByRole("radio")
                    .map((radio) => group.querySelector(`label[for="${CSS.escape(radio.id)}"]`)?.textContent),
                [...ways],
            );
            // Its label is read whole in the label column.
            const label = group.closest(".jw-row")?.firstElementChild;
            assert.strictEqual(label?.textContent, group.getAttribute("aria-label"));
            assert.isAtMost(label?.scrollWidth ?? Infinity, label?.clientWidth ?? 0, "the label is not cut");
        }
        // Shown without opening Advanced, right under Unmatched rows.
        assert.isTrue(missing.checkVisibility(), "Missing end is drawn without opening Advanced");
        const rows = [...modal.querySelectorAll(".jw-row")];
        const at = (group: HTMLElement): number => rows.findIndex((row) => row.contains(group));
        assert.strictEqual(at(missing), at(unmatched) + 1, "Missing end sits right under Unmatched rows");
        // Each two-way choice spans its row.
        const row = unmatched.closest(".jw-row-controls")?.getBoundingClientRect();
        const control = unmatched.getBoundingClientRect();
        assert.isAtMost(Math.abs((row?.width ?? 0) - control.width), 1, "the control spans its row");
        const nodes = (): number => draftOf(session).preview().after.nodes;
        const start = nodes();
        const pick = async (group: string, way: string, count: number, why: string): Promise<void> => {
            await pickWay(modal, group, way);
            await waitFor(() => {
                assert.strictEqual(nodes(), count, why);
            });
        };
        await pick(WORKSPACE_WORDS.unmatchedRows, WORKSPACE_WORDS.skipRow, start - 1, "E4, naming no one, is skipped");
        await pick(WORKSPACE_WORDS.unmatchedRows, WORKSPACE_WORDS.keepRow, start, "E4 is a node again");
        await pick(WORKSPACE_WORDS.missingEnd, WORKSPACE_WORDS.addNode, start + 1, "B9 is made a person");
        // A row whose cell is empty still reaches no node, so Unmatched rows is still asked.
        assert.isNotNull(within(modal).queryByRole("radiogroup", { name: WORKSPACE_WORDS.unmatchedRows }));
        await pick(WORKSPACE_WORDS.missingEnd, WORKSPACE_WORDS.skipEdge, start, "B9 is not made");
    });

    it("an edge card asks Missing end alone, Add node making the end and its edge (#10394)", async () => {
        const { session, modal } = await opened(["doors.csv", DOORS], ["entries.csv", ENTRIES]);
        await match(modal, "entries");
        await addMatch(modal, 2, ["entries", "door"], ["doors", "door"]);
        await joinAs(modal, EDGE);
        const missing = await within(modal).findByRole("radiogroup", { name: WORKSPACE_WORDS.missingEnd });
        assert.deepStrictEqual(
            within(missing)
                .getAllByRole("radio")
                .map((radio) => missing.querySelector(`label[for="${CSS.escape(radio.id)}"]`)?.textContent),
            [WORKSPACE_WORDS.addNode, WORKSPACE_WORDS.skipEdge],
        );
        assert.isNull(within(modal).queryByRole("radiogroup", { name: WORKSPACE_WORDS.unmatchedRows }));
        const after = (): readonly [number, number] => {
            const totals = draftOf(session).preview().after;
            return [totals.nodes, totals.edges];
        };
        await waitFor(() => {
            assert.strictEqual(after()[1], 4, "E4's badge names no one: no edge");
        });
        const [nodes] = after();
        await pickWay(modal, WORKSPACE_WORDS.missingEnd, WORKSPACE_WORDS.addNode);
        await waitFor(() => {
            assert.deepStrictEqual(after(), [nodes + 1, 5], "B9 is made, and E4's edge to it");
        });
        await pickWay(modal, WORKSPACE_WORDS.missingEnd, WORKSPACE_WORDS.skipEdge);
        await waitFor(() => {
            assert.deepStrictEqual(after(), [nodes, 4], "E4 is skipped again");
        });
    });

    it("gives a row under Advanced the label column of the rows above it (#10394)", async () => {
        const { modal } = await opened(["entries.csv", ENTRIES]);
        await match(modal, "entries");
        await joinAs(modal, NODE);
        const above = await within(modal).findByRole("radiogroup", { name: WORKSPACE_WORDS.unmatchedRows });
        await advanced(modal);
        const type = await within(modal).findByRole("combobox", { name: "Edge type" });
        const column = (each: Element): number =>
            (each.closest(".jw-row-controls")?.getBoundingClientRect().left ?? NaN) -
            (each.closest(".jw-row")?.getBoundingClientRect().left ?? NaN);
        assert.strictEqual(column(type), column(above), "their controls start one label column in");
    });
});
