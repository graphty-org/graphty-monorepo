/**
 * The selection workspace's first polish round (design/ui/studio/tier5/ws-polish-1-*.md) on the
 * REAL graphty-element and Les Miserables, driven by real clicks and keys: a selection with no step
 * opens on its new step's pane; the value picker opens beside its field; a fully covered group
 * says where it is drawn; a selected group is marked; Or... then Escape keeps the row selected;
 * Enter on All nodes goes into the pane; one count per place; the canvas toolbar takes no focus
 * under the workspace; a Links tag is one word; Clear starts where a new layer does; a lone group
 * never takes another's letter; a filter card is drawn over the full graph; the layer row follows
 * an undo; the group pane has Color and Save as set.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Les Miserables in the workspace, and every announcement made.
 * @returns The session and the announcements heard.
 */
async function openSample(): Promise<{ session: GraphSession; heard: string[] }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    // Every announcement made, each time it is made (a repeated one is said again).
    const heard: string[] = [];
    const set = store.set.bind(store);
    store.set = (patch) => {
        const said = (patch as { announcement?: unknown }).announcement;
        if (typeof said === "string" && said !== "") {
            heard.push(said);
        }
        set(patch);
    };
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return { session, heard };
}

/**
 * A reader's layer, selected in the style tree.
 * @param session - The session.
 * @param name - Its name.
 * @param where - Its selection, or everything.
 * @returns The layer.
 */
async function openLayer(session: GraphSession, name: string, where?: UnionLeaf): Promise<Layer> {
    const layer = await session.styles.add({
        name,
        target: "node",
        selector: where === undefined ? { match: "everything" } : { match: "rule", where },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return layer;
}

/**
 * The open workspace, waited for.
 * @returns it.
 */
async function opened(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        assert.notStrictEqual(found?.style.visibility, "hidden", "and placed");
        return found;
    });
}

/** Opens the layer's workspace with the sidebar's Edit. */
async function edit(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: /^Edit Which nodes/ }));
    return opened();
}

/** Two groups: A, degree 10 or more; B, Valjean alone, whom A holds already. */
const COVERED: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            name: "A",
            start: "none",
            steps: [{ id: "a1", op: "add", rule: { kind: "range", attribute: "graphty.degree", min: 10 } }],
        },
        {
            id: "b",
            name: "B",
            start: "none",
            steps: [{ id: "b1", op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
        },
    ],
};

describe("a selection with no step", () => {
    it("opens on its new step's pane with the value field focused, and the picker opens beside it", async () => {
        const { session } = await openSample();
        await openLayer(session, "Fresh");
        const ws = await edit();
        const field = await waitFor(() => {
            const found = ws.querySelector<HTMLElement>(".sel-ws-props [data-first-focus]");
            assert.isNotNull(found, "the new step's value field");
            assert.strictEqual(document.activeElement, found, "has focus");
            return found;
        });
        // The outline has no Condition row under All nodes.
        assert.isNull(ws.querySelector(".sel-ws-outline .sel-add-row"));
        await userEvent.keyboard("{Enter}");
        const list = await screen.findByRole("combobox", { name: "Find attributes, results" });
        const props = ws.querySelector(".sel-ws-props")?.getBoundingClientRect();
        const box = list.getBoundingClientRect();
        assert.isAtLeast(box.left, (props?.left ?? 0) - 1, "the picker opens in the properties column");
        assert.isAtMost(box.right, (props?.right ?? 0) + 1, "and stays inside it");
        assert.isAbove(field.getBoundingClientRect().width, 0);
    });
});

describe("the key, the marked group and the counts", () => {
    it("a group an earlier one covers reads 'under A'; its selected row marks it; the title row drops its count", async () => {
        const { session } = await openSample();
        await openLayer(session, "Covered", COVERED);
        const ws = await edit();
        const key = await screen.findByRole("region", { name: /^Preview: / });
        await waitFor(() => {
            assert.include(key.textContent ?? "", "1, under A");
        });
        // "Drawing" is said only until the element's picture is final.
        await waitFor(() => {
            assert.isNull(key.querySelector("[data-drawing]"), "the key stops saying Drawing");
        });
        await userEvent.click(within(ws).getByRole("treeitem", { name: /^B, / }));
        await waitFor(() => {
            assert.strictEqual(session.styles.shownBranches?.mark, "b", "the selected group is marked");
        });
        const title = ws.querySelector(".sel-ws-outline .sel-title-row");
        assert.isNull(title?.querySelector(".sel-count") ?? null, "the header says the count, not the title row");
        // The header's Table is named for what it shows; the title menu has no view items.
        within(ws).getByRole("button", { name: "Table of matches" });
        await userEvent.click(within(ws).getByRole("treeitem", { name: /^Which nodes/ }));
        await userEvent.click(within(ws).getByRole("button", { name: "More for Which nodes" }));
        const menu = await screen.findByRole("menu");
        assert.notInclude(menu.textContent ?? "", "Hide table");
        assert.notInclude(menu.textContent ?? "", "group colors");
    });

    it("Or... then Escape keeps the row that was selected, and says so once", async () => {
        const { session, heard } = await openSample();
        await openLayer(session, "Kept", COVERED);
        const ws = await edit();
        const row = within(ws).getByRole("treeitem", { name: /^A, / });
        await userEvent.click(row);
        await userEvent.click(within(ws).getByRole("button", { name: "Or..." }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(
                within(ws).getByRole("treeitem", { name: /^A, / }).getAttribute("aria-selected"),
                "true",
            );
        });
        assert.lengthOf(
            heard.filter((each) => each.endsWith("not added")),
            1,
            "the group taken back is said once",
        );
    });

    it("Enter on an All nodes row goes into its pane", async () => {
        const { session } = await openSample();
        await openLayer(session, "Everyone", {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    id: "x",
                    start: "all",
                    steps: [{ id: "x1", op: "except", rule: { kind: "range", attribute: "graphty.degree", max: 1 } }],
                },
            ],
        });
        const ws = await edit();
        const all = within(ws).getByRole("treeitem", { name: "All nodes" });
        all.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            const focused = document.activeElement;
            assert.isTrue(ws.querySelector(".sel-ws-props")?.contains(focused) === true, "focus is in the pane");
        });
    });
});

describe("the workspace over the canvas", () => {
    it("the canvas toolbar takes no focus while the workspace lies over it, and Fit has a surface", async () => {
        const { session } = await openSample();
        await openLayer(session, "Cover", COVERED);
        const ws = await edit();
        const dock = document.querySelector<HTMLElement>(".ws-toolbar-dock");
        assert.isTrue(dock?.hidden === true && dock.inert, "hidden and inert");
        for (let press = 0; press < 12; press++) {
            await userEvent.keyboard("{F6}");
            assert.isFalse(dock?.contains(document.activeElement) === true, "F6 never lands on the toolbar");
        }
        const fit = within(ws).getByRole("button", { name: "Fit" });
        assert.notStrictEqual(getComputedStyle(fit).backgroundColor, "rgba(0, 0, 0, 0)", "Fit is drawn on a card");
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isFalse(dock?.hidden ?? true, "the toolbar is back");
        });
    });

    it("Clear starts where a new layer does: All nodes, no step, no Condition row", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Cleared", COVERED);
        const ws = await edit();
        await userEvent.click(within(ws).getByRole("button", { name: "Clear" }));
        await waitFor(() => {
            const selector = session.styles.get(layer.id)?.selector;
            const where = selector?.match === "rule" ? selector.where : undefined;
            assert.strictEqual(where?.kind === "union" ? where.branches[0]?.start : undefined, "all");
        });
        within(ws).getByRole("treeitem", { name: "All nodes" });
        assert.isNull(ws.querySelector(".sel-ws-outline .sel-add-row"), "no Condition row under All nodes");
    });

    it("a lone group left by a delete goes by the title, never by another group's letter", async () => {
        const { session } = await openSample();
        await openLayer(session, "Lone", COVERED);
        const ws = await edit();
        const outline = ws.querySelector<HTMLElement>(".sel-ws-outline");
        const rowA = within(ws).getByRole("treeitem", { name: /^A, / });
        await userEvent.click(rowA);
        // The pointer stays over the outline, so the lone group keeps its row.
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.isNull(within(ws).queryByRole("treeitem", { name: /^B, / }) ?? null, "B's row is renamed");
        });
        assert.isTrue(outline?.matches(":hover") ?? false);
        assert.isNull(within(ws).queryByRole("treeitem", { name: /^A, / }), "it is not called A");
    });

    it("a selected group's pane has its Color and Save as set", async () => {
        const { session } = await openSample();
        await openLayer(session, "Saved", COVERED);
        const ws = await edit();
        await userEvent.click(within(ws).getByRole("treeitem", { name: /^A, / }));
        assert.isNotNull(ws.querySelector('[aria-label*="Color of A"]'), "its color field");
        await userEvent.click(within(ws).getByRole("button", { name: "More for A" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /Save as set/ }));
        await waitFor(() => {
            assert.include(
                session.sets.list().map((each) => each.name),
                "A",
            );
        });
    });
});

describe("a filter card", () => {
    it("is drawn over the full graph while it is edited", async () => {
        const { session } = await openSample();
        const card = (id: string, rule: { min?: number; max?: number }) =>
            session.visibility.addCondition({
                id,
                effect: "keep",
                rule: {
                    kind: "union",
                    side: "nodes",
                    within: "graph",
                    branches: [
                        {
                            start: "all",
                            steps: [{ op: "keep", rule: { kind: "range", attribute: "graphty.degree", ...rule } }],
                        },
                    ],
                },
            });
        await card("f1", { min: 10 });
        await card("f2", { max: 3 });
        await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
        await userEvent.click(await screen.findByRole("button", { name: /Degree max 3/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Edit Degree max 3/ }));
        await opened();
        await waitFor(() => {
            assert.strictEqual(session.styles.shownBranches?.base, "full");
        });
    });
});

describe("the style tree after an undo", () => {
    it("a layer row reads the layer's count again when Mod+Z takes a filter back", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Counted", {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    start: "none",
                    steps: [{ op: "add", rule: { kind: "range", attribute: "graphty.degree", min: 5 } }],
                },
            ],
        });
        await session.visibility.addCondition({
            id: "cut",
            effect: "keep",
            rule: { kind: "range", attribute: "graphty.degree", min: 10 },
        });
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        const rowSays = (): string =>
            within(tree)
                .getByRole("treeitem", { name: /^Counted, / })
                .getAttribute("aria-label") ?? "";
        await waitFor(() => {
            assert.include(rowSays(), `${String(session.styles.counts(layer.id).matched)} node`);
        });
        const before = session.styles.counts(layer.id).matched;
        within(tree)
            .getByRole("treeitem", { name: /^Counted, / })
            .focus();
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            const now = session.styles.counts(layer.id).matched;
            assert.notStrictEqual(now, before, "the undo changed the layer's count");
            assert.include(rowSays(), `${String(now)} node`);
        });
    });
});

describe("By position with a tie", () => {
    it("says how many it was asked for and how many it keeps", async () => {
        const { session } = await openSample();
        await openLayer(session, "Top", {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    id: "t",
                    start: "all",
                    steps: [
                        {
                            id: "t1",
                            op: "keep",
                            rule: { kind: "threshold", path: "graphty.degree", top: 6, ties: "all" },
                        },
                    ],
                },
            ],
        });
        const ws = await edit();
        await userEvent.click(within(ws).getByRole("treeitem", { name: /^Keep, Degree/ }));
        // Fantine and Enjolras share degree 15 at the cut: 6 asked, 7 kept.
        await waitFor(() => {
            assert.match(ws.querySelector("[data-ties]")?.textContent ?? "", /^6 asked, 7 kept: tied$/);
        });
    });
});
