/**
 * Where keyboard focus goes in the Style panel's condition cards and property lines, on the REAL
 * graphty-element and Les Miserables, by real keys and clicks: a card's remove button is a Tab stop
 * before the card's value, where it is drawn, and Escape there closes the cards; Done hands focus
 * back to the Which row; removing a line hands it to its own section's "+".
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

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables in the workspace, with a layer "Picked" holding a name condition and a color,
 * opened in the inspector's Style tab.
 * @returns The session.
 */
async function openPicked(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
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
    await session.styles.add({
        name: "Picked",
        target: "node",
        selector: { match: "rule", where: { kind: "text", reads: "data.name", mode: "substring", text: "M" } },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Picked, / }));
    return session;
}

/**
 * The collapsed Which nodes row.
 * @returns The row button.
 */
async function whichRow(): Promise<HTMLElement> {
    return screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS });
}

describe("focus in the condition cards and property lines, on the real element", () => {
    it("Shift+Tab reaches a card's remove button before its value, and Escape there closes the cards", async () => {
        await openPicked();
        await userEvent.click(await whichRow());
        const region = await screen.findByRole("group", { name: "Which nodes" });
        const card = within(region).getByRole("group", { name: /^name/ });
        card.querySelector<HTMLElement>("input:not([type=hidden])")?.focus();
        const remove = within(card).getByRole("button", { name: /^Remove / });
        for (let press = 0; press < 4 && document.activeElement !== remove; press++) {
            await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        }
        assert.strictEqual(document.activeElement, remove, "Shift+Tab never reached the remove button");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Which nodes" }), "the cards stayed open");
        });
        await waitFor(async () => {
            assert.strictEqual(document.activeElement, await whichRow());
        });
    });

    it("Done hands focus back to the Which row", async () => {
        await openPicked();
        await userEvent.click(await whichRow());
        const region = await screen.findByRole("group", { name: "Which nodes" });
        await userEvent.click(within(region).getByRole("button", { name: "Done" }));
        await waitFor(async () => {
            assert.strictEqual(document.activeElement, await whichRow());
        });
    });

    it("removing a line hands focus to its own section's +", async () => {
        await openPicked();
        const remove = await screen.findByRole("button", { name: "Remove node color" }, { timeout: TIMEOUT_MS });
        const section = remove.closest<HTMLElement>("[data-section]")?.dataset.section;
        assert.isDefined(section);
        await userEvent.click(remove);
        await waitFor(() => {
            const active = document.activeElement as HTMLElement | null;
            assert.isTrue(active?.hasAttribute("data-plus") === true, "focus is not on a section's +");
            assert.strictEqual(active?.closest<HTMLElement>("[data-section]")?.dataset.section, section);
        });
    });
});
