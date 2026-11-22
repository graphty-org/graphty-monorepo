/**
 * The inspector's title on the REAL graphty-element, where focus lands after Find path: it draws
 * its ring for a keyboard reader only, never after the mouse did the work (#9290).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The outline color of a resting focusable: the ring's slot, drawn transparent. */
const NO_RING = "rgba(0, 0, 0, 0)";

/** Ava - Ben - Lee, and Ava - Dev. */
const FRIENDS = "source,target\nAva,Ben\nBen,Lee\nAva,Dev\n";

/**
 * Opens the friends graph and its Path popover (P), with the From field focused.
 * @returns the popover's form.
 */
async function openPathForm(): Promise<HTMLElement> {
    const store = createWorkspaceStore({ project: { name: "Friends", id: 1 } });
    render(<Workspace store={store} />);
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    await element.session.data.import(
        { type: "csv", config: { data: FRIENDS } },
        { mapping: { rowsAre: "edges", source: "source", target: "target" } },
    );
    const analyze = within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", {
        name: "Analyze",
    });
    await waitFor(() => {
        assert.isFalse(analyze.hasAttribute("aria-disabled"));
    });
    element.focus();
    await userEvent.keyboard("p");
    const form = await screen.findByRole("form", { name: "Shortest path" });
    const from = within(form).getByRole("combobox", { name: "From node" });
    await waitFor(() => {
        assert.equal(document.activeElement, from);
    });
    return form;
}

/**
 * The inspector's title once focus has landed on it.
 * @returns the title.
 */
async function focusedTitle(): Promise<HTMLElement> {
    return waitFor(() => {
        const title = document.getElementById(INSPECTOR_TITLE_ID);
        assert.isNotNull(title);
        assert.equal(document.activeElement, title);
        return title;
    });
}

describe("the inspector title's focus ring", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("draws no ring when Find path is clicked, nor when the title is clicked", async () => {
        const form = await openPathForm();
        await userEvent.type(within(form).getByRole("combobox", { name: "From node" }), "Av");
        await userEvent.click(await within(form).findByRole("option", { name: "Ava" }));
        await userEvent.type(within(form).getByRole("combobox", { name: "To node" }), "lee");
        await userEvent.click(await within(form).findByRole("option", { name: "Lee" }));
        await userEvent.click(within(form).getByRole("button", { name: "Find path" }));

        let title = await focusedTitle();
        assert.equal(getComputedStyle(title).outlineColor, NO_RING);

        await userEvent.click(title);
        title = await focusedTitle();
        assert.equal(getComputedStyle(title).outlineColor, NO_RING);

        // Any key brings the ring back, as the browser does for a focused control.
        await userEvent.keyboard("{Shift}");
        assert.notEqual(getComputedStyle(title).outlineColor, NO_RING);
    });

    it("draws the ring when Find path is pressed from the keyboard", async () => {
        await openPathForm();
        await userEvent.keyboard("Ava{Enter}Lee{Enter}");
        await waitFor(() => {
            assert.equal(document.activeElement?.textContent, "Find path");
        });
        await userEvent.keyboard("{Enter}");

        const title = await focusedTitle();
        assert.isTrue(title.matches(":focus-visible"));
        assert.notEqual(getComputedStyle(title).outlineColor, NO_RING);
    });
});
