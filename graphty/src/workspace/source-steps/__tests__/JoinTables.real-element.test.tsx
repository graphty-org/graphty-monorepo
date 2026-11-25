/**
 * The join workspace's two tables and its preview on the REAL graphty-element with the source-steps
 * experiment on (issue #10054), driven by clicks, the wheel and keys: each source's rows beside the
 * other's, lined up by the match; a press of a header picks its field or clears it; the two scroll as one;
 * and the graph the reader has stays where it is while a join is drawn over it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { wheelOver } from "../../../test/real-pointer";
import { screen, waitFor, within } from "../../../test/test-utils";
import {
    choose,
    done,
    draftOf,
    drop,
    emptyProject,
    joinAs,
    joinsOf,
    newest,
    openJoins,
    pickFields,
    pickSources,
    waysToJoin,
} from "./sourceSteps";

withFeatures(["source-steps"]);

const COUNT = 60;
const PEOPLE = [
    "badge,name,dept",
    ...Array.from({ length: COUNT }, (_, i) => `B${String(i)},Name ${String(i)},${i % 2 === 0 ? "Ops" : "Lab"}`),
].join("\n");
/** Two entries a person, the last people none; one badges nobody. */
const ENTRIES = [
    "entry,badge,door",
    ...Array.from({ length: COUNT }, (_, i) => `E${String(i)},B${String(Math.floor(i / 2))},D${String(i % 3)}`),
    "E-none,B999,D0",
].join("\n");

/**
 * People in the graph as type person, entries staged, and the workspace opened with Shift+J.
 * @param width - the window's width.
 * @param height - the window's height.
 * @returns the session, and the workspace.
 */
async function opened(width = 1366, height = 1024): Promise<{ session: GraphSession; modal: HTMLElement }> {
    await page.viewport(width, height);
    const { store, session } = await emptyProject();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    drop("entries.csv", ENTRIES);
    await screen.findByRole("listitem", { name: "entries.csv" });
    return { session, modal: await openJoins() };
}

/**
 * A table's drawn rows, by where each is drawn.
 * @param modal - the workspace.
 * @param name - the table.
 * @returns the text of each row's first cell, by its top on the screen.
 */
function rowsAt(modal: HTMLElement, name: string): Map<number, string> {
    const grid = within(modal).getByRole("grid", { name });
    return new Map(
        within(grid)
            .getAllByRole("rowheader")
            .map((cell) => [Math.round(cell.getBoundingClientRect().top), cell.textContent ?? ""]),
    );
}

/**
 * Presses a field's header in a table.
 * @param modal - the workspace.
 * @param name - the table.
 * @param field - the field.
 */
async function press(modal: HTMLElement, name: string, field: string): Promise<void> {
    const grid = within(modal).getByRole("grid", { name });
    const header = within(grid)
        .getAllByRole("columnheader")
        .find((each) => new RegExp(`(^|Matched|suggested)${field}( |$)`).test(each.textContent ?? ""));
    if (header === undefined) {
        throw new Error(`no header for ${field}`);
    }
    await userEvent.click(within(header).getByRole("button"));
}

/**
 * The value of a picker.
 * @param modal - the workspace.
 * @param name - the picker.
 * @returns its value.
 */
function valueOf(modal: HTMLElement, name: string): string {
    return within(modal).getByRole<HTMLInputElement>("combobox", { name }).value;
}

/**
 * Where nodes are drawn.
 * @param session - the session.
 * @param ids - the nodes.
 * @returns their places.
 */
function places(session: GraphSession, ids: readonly string[]): readonly (readonly [number, number, number])[] {
    return ids.map((id) => {
        const at = session.positions.get(id);
        return at === undefined ? [Number.NaN, Number.NaN, Number.NaN] : [at.x, at.y, at.z ?? 0];
    });
}

/**
 * The middle of how far nodes are from where they were.
 * @param was - where they were.
 * @param now - where they are.
 * @returns the middle distance.
 */
function moved(was: ReturnType<typeof places>, now: ReturnType<typeof places>): number {
    const far = was.map((at, i) => Math.hypot(...at.map((v, axis) => v - now[i][axis]))).sort((a, b) => a - b);
    return far[Math.floor(far.length / 2)];
}

/**
 * The element, once its layout rests.
 * @returns it.
 */
async function atRest(): Promise<void> {
    const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    );
    await element?.waitForSettled();
}

describe("the join workspace's two tables (source-steps)", () => {
    it("a press of a header picks its field, another clears it, and the fields pressed are matched", async () => {
        const { session, modal } = await opened();
        await choose(modal, "Source 1", "people");
        const alone = await within(modal).findByRole("grid", { name: "people" });
        assert.lengthOf(
            within(alone).queryAllByRole("button"),
            0,
            "one source alone is for looking: its headers pick nothing",
        );
        await choose(modal, "Source 2", "entries");
        await press(modal, "people", "badge");
        await waitFor(() => {
            assert.strictEqual(valueOf(modal, "Field 1"), "badge");
        });
        await press(modal, "entries", "door");
        await waitFor(() => {
            assert.strictEqual(valueOf(modal, "Field 2"), "door");
        });
        assert.deepStrictEqual(waysToJoin(modal), [], "no door is a badge");
        await press(modal, "entries", "door");
        await waitFor(() => {
            assert.strictEqual(valueOf(modal, "Field 2"), "");
        });
        await press(modal, "entries", "badge");
        await joinAs(modal, "Node per entries row, linked to people");
        await newest(session, (step) => step.act?.act === "connect", "joined");
        // The header pressed again takes the join out until it is said again.
        await press(modal, "people", "badge");
        await waitFor(() => {
            assert.lengthOf(joinsOf(session), 0);
        });
    });

    it("the header of one source matched with itself picks one end, then the other, the same one for shared values", async () => {
        const { session, modal } = await opened();
        await pickSources(modal, "people", "people");
        assert.lengthOf(within(modal).getAllByRole("grid", { name: "people" }), 1, "its rows once, across the pane");
        await press(modal, "people", "dept");
        await press(modal, "people", "dept");
        await joinAs(modal, "Node per dept, linked to people");
        await newest(session, (step) => step.link?.as === "nodes", "shared");
        const rows = within(modal).getByRole("grid", { name: "people" });
        assert.strictEqual(rows.getAttribute("aria-rowcount"), String(COUNT + 1), "each row once, under the header");
    });

    it("keeps the likeliest field of each source in sight, marked and not picked", async () => {
        const { modal } = await opened();
        await pickSources(modal, "entries", "people");
        for (const name of ["people", "entries"]) {
            const [header] = within(await within(modal).findByRole("grid", { name })).getAllByRole("columnheader");
            assert.include(header.textContent, "badge");
            assert.isNotNull(within(header).getByRole("img", { name: "suggested" }));
        }
        assert.strictEqual(valueOf(modal, "Field 1"), "");
    });

    it("lines both sources' rows up, a copy of a row beside each more, and the wheel scrolls both as one", async () => {
        const { modal } = await opened();
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "badge", "badge");
        const lined = (): void => {
            const people = rowsAt(modal, "people");
            const entries = rowsAt(modal, "entries");
            assert.isAbove(people.size, 4);
            let met = 0;
            for (const [top, badge] of people) {
                assert.isTrue(entries.has(top), `a row of entries beside the one at ${String(top)}`);
                const other = entries.get(top);
                if (badge !== "" && other !== "") {
                    assert.strictEqual(badge, other, "each row beside the row it matches");
                    met++;
                }
            }
            assert.isAbove(met, 0);
        };
        await waitFor(lined);
        for (const [name, by] of [
            ["people", 900],
            ["entries", 600],
            ["people", -700],
        ] as const) {
            const grid = within(modal).getByRole("grid", { name });
            const before = [...rowsAt(modal, "people").values()].join(",");
            await wheelOver(grid.closest("[data-testid=data-table-viewport]") ?? grid, by);
            await waitFor(() => {
                assert.notStrictEqual([...rowsAt(modal, "people").values()].join(","), before, "it scrolled");
                lined();
            });
        }
    });

    it("lists only the rows of one side, or only the matched ones", async () => {
        const { modal } = await opened();
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "badge", "badge");
        const shown = within(modal).getByRole("radiogroup", { name: "Rows shown" });
        await userEvent.click(within(shown).getByText("Only entries"));
        await waitFor(() => {
            assert.deepStrictEqual([...rowsAt(modal, "entries").values()], ["B999"]);
        });
        await userEvent.click(within(shown).getByText("Only people"));
        await waitFor(() => {
            assert.strictEqual([...rowsAt(modal, "people").values()][0], "B30", "the first no entry names");
        });
        await userEvent.click(within(shown).getByText("Matched"));
        await waitFor(() => {
            assert.notInclude([...rowsAt(modal, "people").values()], "");
        });
    });

    it("draws two tables under each other where there is no room beside, and beside each other on a tablet upright", async () => {
        const { modal } = await opened(1024, 1366);
        await pickSources(modal, "people", "entries");
        const boxes = (): DOMRect[] =>
            ["people", "entries"].map((name) => within(modal).getByRole("grid", { name }).getBoundingClientRect());
        await waitFor(() => {
            const [people, entries] = boxes();
            assert.isAtLeast(entries.left, people.left + 200);
            assert.strictEqual(Math.round(people.top), Math.round(entries.top));
        });
        await page.viewport(400, 1000);
        await waitFor(() => {
            const [people, entries] = boxes();
            assert.isAbove(entries.top, people.top);
            assert.strictEqual(Math.round(people.left), Math.round(entries.left));
        });
    });

    it("the sides stay where the reader put them when a way to join is picked", async () => {
        const { session, modal } = await opened();
        await pickSources(modal, "entries", "people");
        await pickFields(modal, "badge", "badge");
        const sides = (): string[] =>
            ["Source 1", "Source 2", "Field 1", "Field 2"].map((name) => valueOf(modal, name));
        const before = sides();
        const ways = waysToJoin(modal);
        for (const way of ["Node per entries row, linked to people", "Fields of entries on people"]) {
            await joinAs(modal, way);
            await newest(session, (step) => step.act !== null, way);
            assert.deepStrictEqual(sides(), before);
            assert.deepStrictEqual(waysToJoin(modal), ways, "and the ways to join stay in their order");
        }
    });
});

describe("the join workspace's preview (source-steps)", () => {
    it("shows the reader's graph from the moment it opens, and keeps every node of it where it is through a join, B and Done", async () => {
        const { session, modal } = await opened();
        await atRest();
        const ids = session.data.nodes().map((node) => String(node.id));
        assert.lengthOf(ids, COUNT);
        const was = places(session, ids);
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, "Node per entries row, linked to people");
        await newest(session, (step) => step.act !== null, "joined");
        await draftOf(session).display(true, { hold: true });
        await atRest();
        assert.deepStrictEqual(places(session, ids), was, "held while the join is drawn");
        const added = session.data
            .nodes()
            .map((node) => String(node.id))
            .filter((id) => !ids.includes(id));
        assert.lengthOf(added, COUNT + 1);
        const drawn = places(session, added);
        // How far apart the drawing's nodes are: one that moves by far less is still where it was.
        const size = moved(was, places(session, [...ids].reverse()));
        for (const side of ["before", "after"] as const) {
            within(modal).getByRole("button", { name: "Done" }).focus();
            await userEvent.keyboard("b");
            await waitFor(() => {
                assert.strictEqual(draftOf(session).side, side);
            });
            await draftOf(session).show(side);
            assert.deepStrictEqual(places(session, ids), was, `held in ${side}`);
        }
        assert.isBelow(moved(drawn, places(session, added)), size / 4, "a node the join adds keeps its place too");
        const at = places(session, ids);
        await done(modal);
        assert.isBelow(moved(at, places(session, ids)), size / 4, "Done draws on from there");
    });

    it("draws the reader's graph at full strength whichever card is selected, and marks only what a join changes", async () => {
        const { session, modal } = await opened();
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, "Node per entries row, linked to people");
        await newest(session, (step) => step.act !== null, "joined");
        await waitFor(() => {
            assert.isTrue((session.styles.shownDraft?.steps?.length ?? 0) > 0);
        });
        await session.styles.settled();
        const look = session.styles.explain({ node: "B40" }).merged;
        assert.notStrictEqual(look["node.opacity"], 0.2);
        assert.notStrictEqual(look["node.borderStyle"], "dotted", "nor what no entry names");
        assert.strictEqual(session.styles.explain({ node: "E0" }).merged["node.borderStyle"], "dashed", "a new node");
    });

    it("keeps the reader's camera while a join is made, and frames again only for new nodes out of view", async () => {
        const { session, modal } = await opened();
        await atRest();
        const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        const canvas = element?.querySelector("canvas") ?? element?.shadowRoot?.querySelector("canvas");
        if (element === null || canvas === null || canvas === undefined) {
            throw new Error("no canvas");
        }
        const camera = (): string => JSON.stringify(element.getCameraState());
        await element.waitForPainted();
        const fitted = camera();
        await wheelOver(canvas, -1500);
        await waitFor(() => {
            assert.notStrictEqual(camera(), fitted, "zoomed in, as the reader does");
        });
        await element.waitForStableFrame();
        const close = camera();
        await pickSources(modal, "people", "entries");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, "Fields of entries on people");
        await newest(session, (step) => step.act?.act === "merge", "no node added");
        await element.waitForStableFrame();
        assert.strictEqual(camera(), close, "two tables and a join that adds no node leave it");
        await joinAs(modal, "Node per entries row, linked to people");
        await waitFor(() => {
            assert.notStrictEqual(camera(), close, "61 new nodes all round are out of a close view");
        });
    });
});
