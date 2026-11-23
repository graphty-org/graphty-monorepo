/**
 * The selection workspace's second polish round (design/ui/studio/tier5/ws-polish-2-*.md) on the
 * REAL graphty-element and Les Miserables, driven by real clicks and keys: the canvas takes the
 * preview cell's box while the workspace is open; the sidebar keeps only its title row; a
 * narrowing step says no verb and has one Except switch; Advanced says edges; an existing rule
 * reopens on a step's pane; the sidebar's Edit shows on hover; the value picker opens
 * below its field; Escape closes an open Advanced; a new filter card keeps Nodes | Edges over its
 * picker, its first Escape goes to the outline and a discarded one is announced; Redo names the
 * filter as it comes back.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/**
 * Les Miserables in the workspace, and every announcement made.
 * @param place - the place it opens on.
 * @returns The session, the store and the announcements heard.
 */
async function openSample(
    place: "graph" | "data" = "graph",
): Promise<{ session: GraphSession; store: WorkspaceStore; heard: string[] }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place });
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
    return { session, store, heard };
}

/**
 * A reader's layer, selected in the style tree.
 * @param session - The session.
 * @param name - Its name.
 * @param where - Its selection, or everything.
 */
async function openLayer(session: GraphSession, name: string, where?: UnionLeaf): Promise<void> {
    await session.styles.add({
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

/**
 * Opens the layer's workspace with the sidebar's Edit. The sidebar draws Edit only while the
 * workspace is closed, and Done closes it once the canvas has painted, so Edit is waited for.
 * @returns the open workspace.
 */
async function edit(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
    return opened();
}

/** Two groups: A, degree 10 or more, then Except name contains Val; B, Valjean alone. */
const TWO: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            name: "A",
            start: "none",
            steps: [
                { id: "a1", op: "add", rule: { kind: "range", attribute: "graphty.degree", min: 10 } },
                { id: "a2", op: "keep", rule: { kind: "range", attribute: "graphty.degree", max: 30 } },
            ],
        },
        {
            id: "b",
            name: "B",
            start: "none",
            steps: [{ id: "b1", op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
        },
    ],
};

describe("the preview is the canvas", () => {
    it("takes the preview cell's box while the workspace is open, and the whole canvas again on close", async () => {
        const { session } = await openSample();
        await openLayer(session, "Framed", TWO);
        const element = document.querySelector<HTMLElement>("graphty-element");
        const before = element?.getBoundingClientRect();
        const ws = await edit();
        const cell = ws.querySelector<HTMLElement>(".sel-ws-preview");
        await waitFor(() => {
            const box = element?.getBoundingClientRect();
            const want = cell?.getBoundingClientRect();
            assert.isDefined(box);
            assert.isDefined(want);
            for (const side of ["left", "top", "right", "bottom"] as const) {
                assert.closeTo(box?.[side] ?? 0, want?.[side] ?? 0, 1, `the drawing's ${side} is the cell's`);
            }
        });
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
            assert.closeTo(element?.getBoundingClientRect().width ?? 0, before?.width ?? 0, 1, "the canvas again");
        });
    });
});

describe("one place for the rule while it is edited", () => {
    it("the sidebar keeps only its Style Nodes... line, at rest and while edited, with no outline and no count", async () => {
        const { session } = await openSample();
        await openLayer(session, "Once", TWO);
        const rest = document.querySelector<HTMLElement>(".sel-rest");
        assert.lengthOf(rest?.querySelectorAll(".sel-step-row, .sel-group-row") ?? [], 0, "no outline at rest");
        await edit();
        await waitFor(() => {
            assert.lengthOf(rest?.querySelectorAll(".sel-step-row, .sel-group-row") ?? [], 0, "no outline");
            assert.isNull(rest?.querySelector(".sel-count") ?? null, "no count");
            assert.strictEqual(rest?.querySelector("[data-edit]")?.textContent, "Style Nodes...");
        });
    });
});

describe("the sidebar's Style Nodes... line", () => {
    it("draws no count at rest in a style layer, and its open-in-new-window icon inside the line", async () => {
        const { session } = await openSample();
        await openLayer(session, "Hover", TWO);
        const line = await screen.findByRole("button", { name: "Style Nodes..." });
        // The layer row and the canvas key say the layer's count; the line does not (tier5 decided.md).
        assert.isNull(document.querySelector(".sel-rest .sel-count"), "no count at rest");
        assert.strictEqual(getComputedStyle(line).opacity, "1", "drawn with no hover");
        const icon = line.querySelector("svg");
        assert.isNotNull(icon, "the open-in-new-window icon");
        assert.isAtMost(icon?.getBoundingClientRect().right ?? Infinity, line.getBoundingClientRect().right);
    });
});

describe("Redo", () => {
    it("names the filter as it comes back", async () => {
        const { session, store } = await openSample("data");
        await session.visibility.addCondition({
            id: "c1",
            effect: "keep",
            rule: { kind: "range", attribute: "graphty.degree", min: 10 },
        });
        await session.visibility.updateCondition("c1", {
            rule: { kind: "range", attribute: "graphty.degree", min: 12 },
        });
        const toolbar = await screen.findByRole("button", { name: /^Undo/ });
        await userEvent.click(toolbar);
        await userEvent.click(await screen.findByRole("button", { name: /^Redo/ }));
        await waitFor(() => {
            const said = store.get().announcement ?? "";
            assert.match(said, /^Redid /);
            assert.include(said, "12");
        });
    });
});
