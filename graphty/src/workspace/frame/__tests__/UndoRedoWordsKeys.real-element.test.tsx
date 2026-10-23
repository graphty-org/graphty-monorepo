/**
 * Undo and Redo on the REAL graphty-element and Les Miserables, by real keys and the pointer:
 * Control+Y redoes; Undo's accessible name says what it takes back; a dimmed Undo shows why on
 * hover, and a press on it clears the notice of the last undo; a number typed into a card's
 * "from" box and a later drag of the range's handle are two undo steps; Control+Z with focus in a
 * binding's "Color by" panel takes back the page's last step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, RuleTree } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { cardFields } from "../../style/cards";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables in the workspace with a layer "Picked", and no history before the test's own.
 * @returns The session and the store.
 */
async function openGraph(): Promise<{ session: GraphSession; store: WorkspaceStore; id: string }> {
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
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const layer = await session.styles.add({
        name: "Picked",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    session.history.clear();
    return { session, store, id: layer.id };
}

/**
 * The header's Undo button, whatever it names.
 * @returns the button.
 */
function undoButton(): HTMLElement {
    const button = document.querySelector<HTMLElement>('.ws-header button[aria-label^="Undo"]');
    assert.isNotNull(button, "the header's Undo");
    return button;
}

/**
 * Opens a style tree row in the inspector.
 * @param name - the row's name.
 */
async function openRow(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
}

/**
 * The color a layer sets.
 * @param session - the session.
 * @param id - the layer.
 * @returns the color.
 */
function colorOf(session: GraphSession, id: string): unknown {
    return session.styles.get(id)?.set?.["node.color"];
}

/**
 * The range a layer's rule holds.
 * @param session - The session.
 * @param id - The layer.
 * @returns min and max, or undefined when the rule is no range.
 */
function rangeOf(session: GraphSession, id: string): { min?: number; max?: number } | undefined {
    const selector = session.styles.get(id)?.selector;
    const leaf: RuleTree | undefined = selector?.match === "rule" ? selector.where : undefined;
    return leaf?.kind === "range" ? { min: leaf.min, max: leaf.max } : undefined;
}

describe("undo and redo: words and keys", () => {
    it("Control+Y redoes what Control+Z took back", async () => {
        const { session, id } = await openGraph();
        await openRow("Picked");
        await session.styles.update(id, { set: { "node.color": "#0072b2" } });
        await waitFor(() => {
            assert.strictEqual(undoButton().getAttribute("aria-disabled"), "false");
        });
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.strictEqual(colorOf(session, id), "#d55e00");
        });
        await userEvent.keyboard("{Control>}y{/Control}");
        await waitFor(() => {
            assert.strictEqual(colorOf(session, id), "#0072b2", "Control+Y redid it");
        });
    });

    it("names the change in Undo's accessible name, and a dimmed Undo says why on hover", async () => {
        const { session, store, id } = await openGraph();
        assert.strictEqual(undoButton().getAttribute("aria-label"), "Undo", "nothing to name yet");
        await session.styles.update(id, { set: { "node.color": "#0072b2" } });
        const undo = await screen.findByRole("button", { name: "Undo changing node color on Picked" });

        // The pointer presses it and stays: the tooltip it showed now says why it is dimmed.
        await userEvent.hover(undo);
        await userEvent.click(undo);
        await waitFor(() => {
            assert.strictEqual(undo.getAttribute("aria-disabled"), "true");
            assert.match(store.get().notice?.message ?? "", /^Undid changing node color on Picked/);
        });
        assert.strictEqual(undo.getAttribute("aria-label"), "Undo");
        await waitFor(() => {
            const tip = [...document.querySelectorAll(".cm-tooltip")].find(
                (each) => each.textContent === "Nothing to undo",
            );
            assert.isTrue(tip?.checkVisibility({ visibilityProperty: true }) === true, "the reason shows");
        });

        // Pressed again it does nothing, so the notice of the last undo goes. (Playwright will not
        // press an aria-disabled control unless forced; a reader's pointer does.)
        await userEvent.click(undo, { force: true });
        await waitFor(() => {
            assert.isNull(store.get().notice, "no 'Undid' left to read as a second undo");
            assert.strictEqual(store.get().announcement, "Nothing to undo");
        });
    });

    it("a 'from' typed and committed by Tab, then a drag of the handle, are two undo steps", async () => {
        const { session, id } = await openGraph();
        await session.runs.start("degree", undefined, { style: false });
        await session.styles.settled();
        session.history.clear();
        const degree = cardFields(session, "node").find((field) => field.path.endsWith(".value"));
        if (degree === undefined) {
            throw new Error("no degree field");
        }
        await openRow("Picked");
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS }));
        const region = await screen.findByRole("group", { name: "Which nodes" });
        if (screen.queryByRole("listbox") === null) {
            await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        }
        await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${degree.name}(,|$)`) }));
        const card = await waitFor(() =>
            within(region).getByRole("group", { name: new RegExp(`^${degree.name}(,|$)`) }),
        );
        await waitFor(() => {
            assert.isDefined(rangeOf(session, id), "the card wrote its range");
        });
        const start = rangeOf(session, id);

        await userEvent.click(within(card).getByRole("textbox", { name: `${degree.name} from, number` }));
        await userEvent.keyboard("5");
        await userEvent.tab();
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.min, 5);
        });
        const typed = rangeOf(session, id);

        const end = within(card).getByRole("slider", { name: `${degree.name} range end` });
        await userEvent.dragAndDrop(end, within(card).getByRole("slider", { name: `${degree.name} range start` }));
        await waitFor(() => {
            assert.notStrictEqual(rangeOf(session, id)?.max, start?.max, "the drag moved the end");
        });

        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.deepEqual(rangeOf(session, id), typed, "Undo takes back the drag only");
        });
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.deepEqual(rangeOf(session, id), start, "the next Undo takes back the typing");
        });
    });

    it("Control+Z with focus in the 'Color by' panel takes back the page's last step", async () => {
        const { session } = await openGraph();
        await session.runs.start("louvain", {}, { seed: 1 });
        await session.styles.settled();
        const plain = await session.styles.add({
            name: "Plain",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#cccccc" },
        });
        await session.styles.settled();
        await openRow("Plain");
        const line = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('.ws-row[data-line="node.color"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.hover(line);
        await userEvent.click(within(line).getByRole("button", { name: "Node color by attribute" }));
        await userEvent.click((await screen.findAllByRole("option", { name: /community|louvain/i }))[0]);
        await waitFor(() => {
            const binding = session.styles.get(plain.id)?.encode?.["node.color"];
            assert.isTrue(binding !== undefined && "by" in binding, "the layer varies by Louvain");
        });
        await userEvent.click(await within(line).findByRole("button", { name: /^Node color: / }));
        const panel = await screen.findByRole("dialog", { name: /^Color by / });
        await userEvent.click(within(panel).getByRole("button", { name: "Change source" }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isTrue(panel.contains(document.activeElement), "focus is in the panel");
        });

        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.isUndefined(session.styles.get(plain.id)?.encode?.["node.color"], "the binding was taken back");
        });
    });
});
