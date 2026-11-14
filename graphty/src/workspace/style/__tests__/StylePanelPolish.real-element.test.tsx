/**
 * The Style panel on the REAL graphty-element and Les Miserables, driven by real clicks: the base
 * layer (Everything) is never narrowed, another layer's "add a condition" line is not a warning,
 * nodes picked by hand read as such and take a condition beside them, the only kind's checkbox says
 * why it stays on, a reason shared by several menu rows is drawn once, and several layers say how
 * many they are once.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { type Card, cardFields, nodeCards, selectorOf } from "../cards";

/** Layout steps taken before the first frame is drawn, so the layout is at rest when it is. */
const PRE_STEPS = 1000;

/**
 * Les Miserables in the workspace with its starting rows, the base layer editable.
 * @returns The session and the node id of a character by name.
 */
async function openScene(): Promise<{ session: GraphSession; idOf: (name: string) => string }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    // The force layout settles before the first frame: these tests are about the Style panel, not
    // the layout. Left to settle on screen, the layout draws a frame per step, and on a software
    // GPU each frame holds the page's main thread until it is read back (hundreds of milliseconds
    // on a busy machine), so the clicks made while it settles wait behind those frames (#4239).
    await session.config.set({ layoutBehavior: { preSteps: PRE_STEPS } });
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    return { session, idOf };
}

/**
 * Clicks a row of the style tree.
 * @param name - The row's name, as its accessible name starts.
 * @param options - Shift or Control held.
 * @param options.shift - Shift held: a range.
 */
async function clickRow(name: string, { shift = false }: { shift?: boolean } = {}): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    const row = await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
    if (shift) {
        await userEvent.keyboard("{Shift>}");
        await userEvent.click(row);
        await userEvent.keyboard("{/Shift}");
    } else {
        await userEvent.click(row);
    }
}

describe("the Style panel", () => {
    it("edits Everything's selection like any layer's", async () => {
        await openScene();
        await clickRow("Everything");
        await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
        const done = await screen.findByRole("button", { name: "Done" });
        assert.isNotNull(done.closest(".sel-ws"), "it opens in the selection editor");
        assert.isNotNull(screen.queryByRole("button", { name: "Value" }), "a step can be added");
    });

    it("moves Everything like any row, within its pin", async () => {
        const { session } = await openScene();
        const other = await session.styles.addRow({ name: "Low", target: "both", selector: { match: "everything" } });
        await session.styles.pinRow(other.id, "bottom");
        await session.styles.settled();
        const place = (): number => session.styles.tree().findIndex((row) => row.name === "Everything");
        const from = place();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Everything, / }), {
            button: "right",
        });
        await userEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: /^Move up/ }));
        await waitFor(() => {
            assert.strictEqual(place(), from + 1, "one place up its list");
        });
    });

    it("reads every node on any other layer as its count, with no sentence and no warning", async () => {
        const { session } = await openScene();
        await session.styles.add({
            name: "Plain",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#0072b2" },
        });
        await session.styles.settled();
        await clickRow("Plain");
        // At rest the layer's row and the canvas key say its count; the Style Nodes... line does not.
        const row = await screen.findByRole("button", { name: "Style Nodes..." });
        assert.isNull(row.querySelector(".sel-count"), "no count at rest");
        assert.notInclude(row.textContent ?? "", "add a condition");
        assert.isNull(document.querySelector("[data-warn]"), "no warning outline");
    });

    it("reads nodes picked by hand as such and takes a condition beside them", async () => {
        const { session, idOf } = await openScene();
        const names = ["Valjean", "Javert", "Fantine"];
        const ids = names.map(idOf);
        // As a layer made from a selection holds it: the nodes, and no edges.
        const selector = { match: "ids" as const, nodes: ids, edges: [] };
        await session.styles.add({ name: "Three", target: "node", selector, set: { "node.color": "#d55e00" } });
        await session.styles.settled();
        await clickRow("Three");
        const row = await screen.findByRole("button", {
            name: /^Which nodes, 3 of 77 nodes, Picked by hand: 3 nodes$/,
        });
        assert.notInclude(row.textContent ?? "", "A rule set elsewhere");
        await userEvent.click(row);
        const region = await screen.findByRole("group", { name: "Which nodes" });
        const card = within(region).getByRole("group", { name: "Picked by hand: 3 nodes" });
        // By name, not id (issue #7454).
        assert.include(card.textContent ?? "", names.join(", "), "the card lists the nodes by name");
        assert.isNotNull(within(region).queryByRole("button", { name: "Add a condition" }));

        // A condition beside them is ANDed with them, not put in their place.
        const fields = cardFields(session, "node");
        const [picked] = nodeCards(session, selector, fields);
        const other: Card = {
            type: "fixed",
            key: "other",
            leaf: { kind: "member", of: { nodes: [ids[0]] } },
            words: "",
        };
        const both = selectorOf([picked, other]);
        assert.strictEqual(both.match, "rule");
        assert.strictEqual(both.match === "rule" ? both.where.kind : "", "all");
    });

    it("says why the only kind's checkbox cannot be turned off, in its tooltip, not on the panel", async () => {
        const { session } = await openScene();
        await session.styles.add({
            name: "Nodes only",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#009e73" },
        });
        await session.styles.settled();
        await clickRow("Nodes only");
        const box = await screen.findByRole("checkbox", { name: "Style nodes" });
        assert.isTrue((box as HTMLInputElement).disabled);
        const reason = "Stays on: style edges first to stop styling nodes";
        assert.strictEqual(box.getAttribute("aria-description"), reason, "a screen reader hears why");
        assert.strictEqual(box.closest(".ws-kind-switch")?.textContent, "Style nodes", "no lines under the box");
        await userEvent.hover(box.closest(".ws-kind-switch-tip") ?? box);
        // The tooltip opens after the theme's open delay.
        assert.strictEqual((await screen.findByRole("tooltip", {})).textContent, reason);
    });

    it("offers Everything's menu as any row's: it moves, unpins and deletes", async () => {
        await openScene();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        const everything = await within(tree).findByRole("treeitem", { name: /^Everything, / });
        await userEvent.click(everything, { button: "right" });
        const menu = await screen.findByRole("menu");
        for (const name of ["Delete", "Pin to top", "Unpin", "Move to folder"]) {
            const item = within(menu).getByRole("menuitem", { name: new RegExp(`^${name}`) });
            assert.notStrictEqual(item.getAttribute("aria-disabled"), "true", `${name} can be used`);
        }
        assert.isNull(within(menu).queryByText(/holds the base look/), "no reason keeps it apart");
    });

    it("says how many layers several are once, in the header", async () => {
        const { session } = await openScene();
        for (const name of ["First", "Second"]) {
            await session.styles.add({
                name,
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#cc79a7" },
            });
        }
        await session.styles.settled();
        await clickRow("Second");
        await clickRow("First", { shift: true });
        const row = await screen.findByRole("button", { name: /^Which nodes, / });
        await waitFor(() => {
            assert.isNull(document.getElementById("ws-bulk-scope"), "no line that only repeats the count");
        });
        assert.notInclude(row.textContent ?? "", "layers,");
        assert.isNull(screen.queryByRole("checkbox", { name: /on in 2 of 2 layers/ }));
    });
});
