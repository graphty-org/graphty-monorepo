/**
 * Every row of the style tree has the controls of a layer the reader added, on the REAL
 * graphty-element, with real clicks.
 *
 * The owner's rule (2026-11-05): "any layer may be deleted or modified in any way. there are NO
 * SPECIAL LAYER." The test reads every layer row from the element's tree, never from a list of
 * names, and adds a reader's layer beside each: same kinds, same pin, same values, its own "every
 * element" selector. It then selects each of the two, reads the inspector's controls and the row
 * menu's items with whether each is enabled, and compares the two sets. Values and counts may
 * differ; the controls may not. It does so with the selection workspace off and on: opened, a
 * selection must take a new condition in whichever editor holds it. Move up and Move down are read
 * against the row's place in its list, the one thing that may tell two rows apart, for every row.
 *
 * A difference must be listed in the `panelControls` section of
 * `graphty/special-layers-baseline.json`, which `tools/check-special-layers.mjs` lets only shrink. A
 * listed one that has gone fails here too, so the list cannot go stale.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, StyleRow } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import baselineText from "../../../../special-layers-baseline.json?raw";
import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

const BASELINE = JSON.parse(baselineText) as { panelControls: readonly { row: string; control: string }[] };

/** What the test reads as a control in the inspector. */
const CONTROLS =
    'button, input, select, textarea, [role="button"], [role="switch"], [role="checkbox"], [role="tab"], [role="combobox"], [role="slider"]';

/** A Which row. */
const WHICH = '[data-testid="which-picker"]';

/**
 * What changes a selection, in each editor that opens: the cards' Add a condition, the workspace's
 * Card, the inline editor's And..., and a step's Value in either.
 */
const CHANGES_SELECTION = /^(?:Add a condition|Card|And\.\.\.|Value(?:: .*)?)$/;

/** What every open editor must offer, under one name however it draws it. */
const TAKES_CONDITION = "which open: Add a condition";

/**
 * A new project as the app starts one, with a graph, a time field and an algorithm's suggested style.
 * @returns the session.
 */
async function openProject(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    await session.data.addNodes([1, 2, 3, 4].map((id) => ({ id, step: id })));
    await session.data.addEdges([
        { source: 1, target: 2, step: 1 },
        { source: 2, target: 3, step: 2 },
        { source: 3, target: 4, step: 3 },
    ]);
    await session.config.set({
        startingRows: true,
        editableBase: true,
        pinnedStyle: { color: "#868e96", scale: 1.12, opacity: 1 },
    });
    await session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });
    await session.runs.start("louvain", {});
    await session.styles.settled();
    return session;
}

/**
 * Every layer row of a tree.
 * @param rows - the tree.
 * @returns its layer rows, folders walked through.
 */
function layerRows(rows: readonly StyleRow[]): StyleRow[] {
    return rows.flatMap((row) => (row.kind === "layer" ? [row] : layerRows(row.children)));
}

/**
 * Adds the reader's layer that matches a row in everything but who made it and what it selects.
 * @param session - the session.
 * @param row - the row.
 * @param name - the new layer's name.
 */
async function addReaderLayer(session: GraphSession, row: StyleRow, name: string): Promise<void> {
    const parts = session.styles.parts(row.id);
    assert.isDefined(parts);
    const added = await session.styles.addRow({ name, target: parts.target, selector: { match: "everything" } });
    for (const side of ["node", "edge"] as const) {
        const from = session.styles.get(parts[side] ?? "");
        const to = added[side];
        if (from !== undefined && to !== undefined) {
            await session.styles.update(to, { set: from.set, encode: from.encode });
        }
    }
    if (row.pin !== "none") {
        await session.styles.pinRow(added.id, row.pin);
    }
    await session.styles.settled();
}

/**
 * A control's name with what may differ taken out: the row's own name, and numbers.
 * @param text - the name.
 * @param row - the row's name.
 * @returns the name.
 */
function controlName(text: string, row: string): string {
    return text
        .replaceAll(row, "<row>")
        .replace(/\d+(?:\.\d+)?/g, "#")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Whether a control can be used.
 * @param control - the control.
 * @returns true when enabled.
 */
function enabled(control: Element): boolean {
    return (
        !control.matches(":disabled") &&
        control.getAttribute("aria-disabled") !== "true" &&
        !control.hasAttribute("data-disabled")
    );
}

/**
 * The name a reader hears for a control, without what it holds: a menu item's reason, and the
 * counts and conditions the Which row reads out after its name.
 * @param control - the control.
 * @returns the name.
 */
function spokenName(control: Element): string {
    if (control.getAttribute("role") === "menuitem") {
        const words = control.querySelector('[class*="itemLabel"]')?.firstChild?.textContent;
        return words ?? control.textContent;
    }
    const labelled = (control as HTMLInputElement).labels?.[0]?.textContent;
    const name = control.getAttribute("aria-label") ?? labelled ?? control.textContent;
    // The Which row of a selection the workspace edits says Edit first: the same control.
    return control.closest(WHICH) === null ? name : name.split(",")[0].replace(/^Edit /, "");
}

/**
 * Where a selection is edited: the selection workspace while it is open, over the inspector.
 * @param inspector - the inspector.
 * @returns the element holding the editor's controls.
 */
function editing(inspector: HTMLElement): HTMLElement {
    return document.querySelector<HTMLElement>(".sel-ws") ?? inspector;
}

/**
 * Closes the Which cards where they stand open, as a blank layer opens them on arrival.
 * @param inspector - the inspector.
 */
async function closeCards(inspector: HTMLElement): Promise<void> {
    const done = within(editing(inspector)).queryByRole("button", { name: "Done" });
    if (done !== null) {
        await userEvent.click(done);
    }
    await waitFor(() => {
        assert.isNull(within(editing(inspector)).queryByRole("button", { name: "Done" }));
    });
}

/**
 * Reads the controls of the kind on show, then opens its Which row with a real click and reads what
 * a reader can do to the selection. The cards hold the selection's values, so only what every open
 * editor must offer is read from them: Done, and a way to change what it selects.
 * @param inspector - the inspector.
 * @param kind - the kind.
 * @param row - the row's name.
 * @param controls - where each control's name and enabled state goes.
 */
async function readKind(
    inspector: HTMLElement,
    kind: string,
    row: string,
    controls: Map<string, boolean>,
): Promise<void> {
    await closeCards(inspector);
    for (const control of inspector.querySelectorAll(CONTROLS)) {
        const name = controlName(spokenName(control), row);
        // A list of the layers that paint an element is a value of the stack, not a control of this row.
        if (!name.startsWith("Open layer")) {
            const place = control.closest(WHICH) === null ? "inspector" : `${kind} which`;
            controls.set(`${place}: ${name}`, enabled(control));
        }
    }
    const which = inspector.querySelector(WHICH);
    const button = which?.querySelector("button");
    if (which !== null && (button === null || button === undefined)) {
        controls.set(`${kind} which: no control`, false);
    } else if (button !== null && button !== undefined) {
        await userEvent.click(button);
        const done = await waitFor(() => within(editing(inspector)).getByRole("button", { name: "Done" }));
        const changes = within(editing(inspector)).queryAllByRole("button", { name: CHANGES_SELECTION });
        controls.set(`${kind} which open: Done`, enabled(done));
        if (changes.length > 0) {
            controls.set(`${kind} ${TAKES_CONDITION}`, changes.some(enabled));
        }
        await closeCards(inspector);
    }
}

/**
 * What a layer row's place allows: a move to a neighbor in its own pin band, since a row moved out
 * of its band goes back.
 * @param rows - a list of the tree, bottom first.
 * @param name - the row's name.
 * @returns whether Move up and Move down can run, or undefined when no row has the name.
 */
function movesOf(rows: readonly StyleRow[], name: string): Readonly<Record<string, boolean>> | undefined {
    const at = rows.findIndex((row) => row.kind === "layer" && row.name === name);
    if (at === -1) {
        return rows.flatMap((row) => (row.kind === "layer" ? [] : [movesOf(row.children, name)])).find(Boolean);
    }
    const { pin } = rows[at];
    return { "Move up": rows[at + 1]?.pin === pin, "Move down": rows[at - 1]?.pin === pin };
}

/**
 * Selects a row with a real click and reads its controls, then its menu with a real right click.
 * Move up and Move down must say what the row's place allows; the comparison then only needs them
 * to be there, since two rows stand in different places.
 * @param session - the session.
 * @param name - the row's name.
 * @returns each control's name and whether it is enabled.
 */
async function controlsOf(session: GraphSession, name: string): Promise<Map<string, boolean>> {
    const row = await within(screen.getByRole("tree", { name: "Style layers" })).findByRole("treeitem", {
        name: new RegExp(`^${name}, `),
    });
    await userEvent.click(row);
    const inspector = await screen.findByRole("complementary", { name: "Inspector" });
    await waitFor(() => {
        assert.include(within(inspector).getByRole("heading", { level: 2 }).textContent, name);
    });
    const controls = new Map<string, boolean>();
    for (const kind of ["node", "edge"] as const) {
        await showKind(kind);
        await readKind(inspector, kind, name, controls);
    }
    await userEvent.click(row, { button: "right" });
    const menu = await screen.findByRole("menu");
    const moves = movesOf(session.styles.tree(), name);
    assert.isDefined(moves);
    for (const item of within(menu).getAllByRole("menuitem")) {
        const words = controlName(spokenName(item), name);
        const allowed = moves[words] as boolean | undefined;
        if (allowed !== undefined) {
            assert.strictEqual(enabled(item), allowed, `${name}: ${words} says what its place allows`);
        }
        controls.set(`menu: ${words}`, allowed === undefined ? enabled(item) : true);
    }
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(screen.queryByRole("menu"));
    });
    return controls;
}

/**
 * How a row's controls differ from the reader's layer's.
 * @param row - the row's controls.
 * @param reader - the reader's layer's controls.
 * @returns one line per difference.
 */
function difference(row: Map<string, boolean>, reader: Map<string, boolean>): string[] {
    const missing = [...reader.keys()].filter((control) => !row.has(control)).map((control) => `missing ${control}`);
    const extra = [...row.keys()].filter((control) => !reader.has(control)).map((control) => `extra ${control}`);
    const state = [...row]
        .filter(([control, on]) => reader.has(control) && reader.get(control) !== on)
        .map(([control, on]) => `${on ? "enabled" : "disabled"} ${control}`);
    return [...missing, ...extra, ...state];
}

describe.each([
    ["off", ["timeline"]],
    ["on", ["timeline", "selection-workspace"]],
])("the panel of every style row, selection workspace %s", (_state, features) => {
    beforeAll(async () => {
        await siteFeatures(features);
        await page.viewport(1366, 768);
    });

    it("has the controls of a layer the reader added, but for the baseline", async () => {
        const session = await openProject();
        const rows = layerRows(session.styles.tree());
        const readers = new Map(rows.map((row, at) => [row, `Reader layer ${String(at)}`]));
        for (const [row, name] of readers) {
            await addReaderLayer(session, row, name);
        }
        const found = new Set<string>();
        for (const [row, name] of readers) {
            const reader = await controlsOf(session, name);
            assert.isTrue(
                [...reader].some(([control, on]) => control.endsWith(TAKES_CONDITION) && on),
                `${name}: a reader's layer takes a new condition, or the comparison reads nothing`,
            );
            for (const line of difference(await controlsOf(session, row.name), reader)) {
                found.add(`${row.name} | ${line}`);
            }
        }
        const listed = new Set(BASELINE.panelControls.map(({ row, control }) => `${row} | ${control}`));
        assert.isNotEmpty(rows);
        assert.deepEqual(
            [...found].filter((key) => !listed.has(key)),
            [],
            "a row differs from a layer the reader added (issue #5905): fix the row, the baseline only shrinks",
        );
        assert.deepEqual(
            [...listed].filter((key) => !found.has(key)),
            [],
            "the row now matches: delete this from graphty/special-layers-baseline.json",
        );
    });
});
