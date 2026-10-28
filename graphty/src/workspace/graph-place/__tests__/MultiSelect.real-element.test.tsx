/**
 * Selecting several style layers on the REAL graphty-element: Control- or Command-click,
 * Shift-click, Shift+ArrowDown from the keyboard, and the row menu's Select more (opened by a touch
 * hold or Shift+F10) with taps on the rows. Each ends with the inspector headed by how many layers
 * are selected.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { tap, touchHold } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** The four layers, bottom first; the tree lists them top first. */
const NAMES = ["Alpha", "Beta", "Gamma", "Delta"];

/**
 * The workspace on the real element, with four node layers.
 * @returns The session.
 */
async function workspace(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Four", id: 1 } });
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
    await session.data.addNodes(["a", "b", "c", "d"].map((id) => ({ id })));
    for (const name of NAMES) {
        await session.styles.add({
            name,
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1 },
        });
    }
    await session.styles.settled();
    return session;
}

/**
 * A layer row of the style tree.
 * @param name - The layer's name.
 * @returns The row.
 */
async function row(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    return within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
}

/**
 * Wait for the inspector to be headed with these words.
 * @param words - The heading.
 */
async function headed(words: string): Promise<void> {
    await waitFor(() => {
        const found = screen.queryAllByRole("heading").map((heading) => heading.textContent);
        assert.include(found, words);
    });
}

/**
 * What the page's status lines say now.
 * @returns Their words.
 */
function spoken(): (string | null)[] {
    return screen.getAllByRole("status").map((status) => status.textContent);
}

describe("selecting several style layers", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("by Control-click and Shift-click", async () => {
        await workspace();
        await userEvent.click(await row("Delta"));
        await userEvent.click(await row("Beta"), { modifiers: ["Control"] });
        await headed("2 layers");
        await userEvent.click(await row("Alpha"), { modifiers: ["Shift"] });
        await headed("2 layers");
        await userEvent.click(await row("Delta"));
        await userEvent.click(await row("Beta"), { modifiers: ["Shift"] });
        await headed("3 layers");
    });

    it("by Shift+ArrowDown from the keyboard", async () => {
        await workspace();
        await userEvent.click(await row("Delta"));
        await headed("Delta");
        await userEvent.keyboard("{Shift>}{ArrowDown}{ArrowDown}{/Shift}");
        await headed("3 layers");
    });

    it("by Command-click", async () => {
        await workspace();
        await userEvent.click(await row("Delta"));
        await userEvent.click(await row("Gamma"), { modifiers: ["Meta"] });
        await headed("2 layers");
    });

    it("has no Select layers in the tree's +", async () => {
        await workspace();
        await userEvent.click(await screen.findByRole("button", { name: "Add a layer or a folder" }));
        const items = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
        assert.isTrue(
            items.some((text) => text?.includes("Layer")),
            "the + menu did not open",
        );
        assert.isFalse(
            items.some((text) => text?.includes("Select")),
            `the + menu offers selecting: ${items.join(", ")}`,
        );
    });

    it("by a touch hold's Select more and taps on two more rows, ended with Done", async () => {
        await workspace();
        await touchHold(await row("Delta"), () => screen.findByRole("menuitem", { name: "Select more" }));
        await tap(screen.getByRole("menuitem", { name: "Select more" }));
        await screen.findByText("1 selected");
        await tap(await row("Gamma"));
        await tap(await row("Alpha"));
        await screen.findByText("3 selected");
        await tap(screen.getByRole("button", { name: "Done" }));
        await headed("3 layers");
        await waitFor(() => {
            assert.include(spoken(), "3 layers selected");
            assert.lengthOf(document.querySelectorAll('[data-testid="tree-check"]'), 0);
        });
    });

    it("by Shift+F10 on a focused row, whose menu starts with Select more", async () => {
        await workspace();
        await userEvent.click(await row("Beta"));
        await headed("Beta");
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        const menu = await screen.findByRole("menu");
        assert.strictEqual(within(menu).getAllByRole("menuitem")[0]?.textContent, "Select more");
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Select more" }));
        await userEvent.click(await row("Alpha"));
        await headed("2 layers");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.include(spoken(), "2 layers selected");
        });
        await headed("2 layers");
    });
});
