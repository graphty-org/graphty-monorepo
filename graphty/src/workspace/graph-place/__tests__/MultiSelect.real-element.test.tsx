/**
 * Selecting several style layers on the REAL graphty-element: Control-click, Shift-click,
 * Shift+ArrowDown from the keyboard, and the "+" menu's Select... with taps on the rows' checkboxes.
 * Each ends with the inspector headed by how many layers are selected.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

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

    it("by Select... and taps on the rows, ended with Done", async () => {
        await workspace();
        await userEvent.click(await screen.findByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Select layers..." }));
        await userEvent.click(await row("Gamma"));
        await userEvent.click(await row("Alpha"));
        await headed("2 layers");
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.lengthOf(document.querySelectorAll('[data-testid="tree-check"]'), 0);
        });
    });
});
