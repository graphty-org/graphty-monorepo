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

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

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
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    // The force layout settles before the first frame: these tests are about the Style panel, not
    // the layout, and a layout left to settle on screen draws a frame per step. On a software GPU
    // each frame holds the page's main thread until it is read back (hundreds of milliseconds on
    // a busy machine), the layout keeps to the clock so it draws on through the whole test, and
    // every click waits behind those frames (issue #4239).
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
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
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
    it("never narrows the base layer: Everything reads all its nodes and offers no condition", async () => {
        await openScene();
        await clickRow("Everything");
        const picker = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-testid=which-picker][data-side=node]");
            assert.isNotNull(found);
            return found;
        });
        if (picker === null) {
            throw new Error("no Which nodes");
        }
        assert.strictEqual(picker.dataset.base, "", "the base layer's line");
        assert.strictEqual(
            picker.textContent,
            "Everything styles all 77 nodes: it is the base layer, under every other layer.",
            "plain text that says why it holds every node",
        );
        assert.notInclude(picker.textContent ?? "", "add a condition");
        assert.isNull(within(picker).queryByRole("button"), "nothing opens it");
        assert.isNull(screen.queryByRole("button", { name: "Add a condition" }));
    });

    it("says All N nodes on any other layer as a plain line, not a warning", async () => {
        const { session } = await openScene();
        await session.styles.add({
            name: "Plain",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#0072b2" },
        });
        await session.styles.settled();
        await clickRow("Plain");
        const row = await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS });
        const hint = row.querySelector<HTMLElement>(".ws-which-hint");
        assert.isNotNull(hint);
        assert.strictEqual(hint?.textContent, "All 77 nodes: add a condition to narrow");
        assert.isNull(document.querySelector("[data-warn]"), "no warning outline");
    });

    it("reads nodes picked by hand as such and takes a condition beside them", async () => {
        const { session, idOf } = await openScene();
        const ids = ["Valjean", "Javert", "Fantine"].map(idOf);
        // As a layer made from a selection holds it: the nodes, and no edges.
        const selector = { match: "ids" as const, nodes: ids, edges: [] };
        await session.styles.add({ name: "Three", target: "node", selector, set: { "node.color": "#d55e00" } });
        await session.styles.settled();
        await clickRow("Three");
        const row = await screen.findByRole(
            "button",
            { name: /^Which nodes, 3 of 77 nodes, Picked by hand: 3 nodes$/ },
            { timeout: TIMEOUT_MS },
        );
        assert.notInclude(row.textContent ?? "", "A rule set elsewhere");
        await userEvent.click(row);
        const region = await screen.findByRole("group", { name: "Which nodes" });
        const card = within(region).getByRole("group", { name: "Picked by hand: 3 nodes" });
        assert.include(card.textContent ?? "", ids.join(", "), "the card lists the ids");
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
        const box = await screen.findByRole("checkbox", { name: "Style nodes" }, { timeout: TIMEOUT_MS });
        assert.isTrue((box as HTMLInputElement).disabled);
        const reason = "Stays on: style edges first to stop styling nodes";
        assert.strictEqual(box.getAttribute("aria-description"), reason, "a screen reader hears why");
        assert.strictEqual(box.closest(".ws-kind-switch")?.textContent, "Style nodes", "no lines under the box");
        await userEvent.hover(box.closest(".ws-kind-switch-tip") ?? box);
        // The tooltip opens after the theme's open delay.
        assert.strictEqual((await screen.findByRole("tooltip", {}, { timeout: TIMEOUT_MS })).textContent, reason);
    });

    it("draws a reason several menu rows share once", async () => {
        await openScene();
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Everything, / }), {
            button: "right",
        });
        const menu = await screen.findByRole("menu");
        const reason = "Everything holds the base look and stays at the bottom";
        const drawn = within(menu)
            .getAllByText(reason)
            .filter((each) => each.getBoundingClientRect().width > 1);
        assert.strictEqual(drawn.length, 1, "drawn under one row");
        // Every row it keeps from running still carries it for a screen reader.
        assert.isAtLeast(within(menu).getAllByText(reason).length, 2);
        // Delete says why it cannot run, in words of its own, drawn under it.
        const kept = within(menu).getByText("Everything holds the base look, so it cannot be deleted");
        assert.isAbove(kept.getBoundingClientRect().width, 1, "Delete's reason is drawn");
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
        const row = await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS });
        await waitFor(() => {
            assert.isNull(document.getElementById("ws-bulk-scope"), "no line that only repeats the count");
        });
        assert.notInclude(row.textContent ?? "", "layers,");
        assert.isNull(screen.queryByRole("checkbox", { name: /on in 2 of 2 layers/ }));
    });
});
