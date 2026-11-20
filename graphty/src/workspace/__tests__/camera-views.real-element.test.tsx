/**
 * Camera views on the REAL graphty-element (design/ui/camera-views-tours-and-capture.md, section
 * 3.0): the Views place is on the rail, a new project has the starting cameras, the digit keys
 * belong to the camera keys, and 9 stays Auto-rotate's. Every change is real input; every assertion
 * reads what is drawn or what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../test/test-utils";
import { createRegistry } from "../commands/registry";
import { REGISTRATIONS } from "../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../state/store";
import { makeWorkspaceValue } from "../state/WorkspaceContext";
import { Workspace } from "../Workspace";

type GraphElement = HTMLElementTagNameMap["graphty-element"];

const IDS = ["a", "b", "c", "d", "e", "f"];

/**
 * The workspace on a small ring, its element up and the Camera tool enabled.
 * @returns the element, its session and the workspace store.
 */
async function openRing(): Promise<{ element: GraphElement; session: GraphSession; store: WorkspaceStore }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Flag", id: 1 } });
    render(<Workspace store={store} />);
    let element: GraphElement | null = null;
    await waitFor(() => {
        element = document.querySelector("graphty-element");
        assert.isDefined(element?.session);
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const found: GraphElement = element;
    await found.session.layout.set("circular");
    await found.session.data.addNodes(IDS.map((id) => ({ id })));
    await found.session.data.addEdges(IDS.map((source, i) => ({ source, target: IDS[(i + 1) % IDS.length] })));
    await waitFor(() => {
        assert.isFalse(cameraTool().hasAttribute("aria-disabled"));
    });
    await found.waitForSettled();
    await found.waitForStableFrame();
    return { element: found, session: found.session, store };
}

/**
 * The toolbar's Camera tool.
 * @returns the tool.
 */
function cameraTool(): HTMLElement {
    return within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Camera" });
}

/**
 * The rail's buttons, by name.
 * @returns the names.
 */
function railNames(): (string | null)[] {
    return within(screen.getByRole("toolbar", { name: "Places" }))
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label"));
}

describe("camera views", () => {
    it("puts Views on the rail, writes the starting cameras, and gives 1-4 and 6-8 to the camera keys", async () => {
        const { element, session, store } = await openRing();
        assert.deepEqual(railNames(), ["Graph", "Data", "Views", "Notes", "Settings"]);
        assert.deepEqual([...session.views.keys()], ["Top", "Bottom", "Front", "Side", "Isometric"]);

        const workspace = makeWorkspaceValue(store, createRegistry(REGISTRATIONS), session, element);
        for (const digit of ["1", "2", "3", "4", "6", "7", "8"]) {
            const holders = workspace.registry.live
                .filter((command) => command.keys?.includes(digit) === true)
                .map(({ id }) => id);
            assert.deepEqual(holders, [`camera.key-${digit}`], digit);
        }
    });

    it("keeps 9 for Auto-rotate, does nothing on Shift+I or Shift+R, and flies to the camera on its key", async () => {
        const { element, session, store } = await openRing();
        await userEvent.keyboard("9");
        await waitFor(() => {
            assert.isAbove(element.autoRotate, 0);
        });
        await userEvent.keyboard("9");
        await waitFor(() => {
            assert.equal(element.autoRotate, 0);
        });

        await userEvent.keyboard("{Shift>}IR{/Shift}");
        await element.waitForStableFrame();
        assert.isNull(store.get().notice, "no image exported");

        // 7 was Top's: given to Isometric, the press goes to Isometric, not to master's Top view.
        await session.views.setKey("Isometric", "7");
        await userEvent.keyboard("7");
        await waitFor(() => {
            assert.equal(store.get().lastView, "Isometric");
        });
    });
});
