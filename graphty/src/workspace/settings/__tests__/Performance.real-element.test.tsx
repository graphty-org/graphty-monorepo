/**
 * Settings > Performance on the REAL graphty-element: the reader's GPU acceleration choice
 * reaches the element, survives a reload, and the line under it says what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { ACCELERATION } from "../preferences";

/**
 * Renders the workspace with a project open and waits for the element's session.
 * @returns the element.
 */
async function openWorkspace(): Promise<NonNullable<ReturnType<typeof findElement>>> {
    ({ unmount } = render(<Workspace store={createWorkspaceStore({ project: { name: "Ring", id: 1 } })} />));
    await waitFor(() => {
        assert.isDefined(findElement()?.session);
    });
    const element = findElement();
    if (element === null) {
        throw new Error("the element never came up");
    }
    return element;
}

/**
 * The mounted element, typed by its tag.
 * @returns the element, or null.
 */
function findElement(): HTMLElementTagNameMap["graphty-element"] | null {
    return document.querySelector("graphty-element");
}

let unmount: (() => void) | undefined;

afterEach(() => {
    unmount?.();
    unmount = undefined;
    localStorage.removeItem(ACCELERATION.key);
});

describe("Settings > Performance", () => {
    it("switches GPU acceleration off on the element and keeps the choice for the next visit", async () => {
        const element = await openWorkspace();
        assert.equal(element.acceleration, "auto");

        await userEvent.keyboard("{Control>},{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(within(dialog).getByText("Performance"));
        await userEvent.click(within(dialog).getByText("Off"));

        assert.equal(element.acceleration, "off");
        assert.equal(localStorage.getItem(ACCELERATION.key), "off");
        await waitFor(() => {
            assert.equal(element.session.capabilities.acceleration.state, "off");
            within(dialog).getByText("Now: off");
        });

        unmount?.();
        const next = await openWorkspace();
        assert.equal(next.acceleration, "off", "the stored policy is on the new tag");
    });
});
