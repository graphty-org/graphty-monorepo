/**
 * The camera-views experiment, on the REAL graphty-element (design/ui/camera-views-tours-and-capture.md,
 * section 3.0): off, the rail, the Camera menu, the main menu, the keys and a new project are as on
 * master; on, the Views place is on the rail, master's camera commands are switched off and hand
 * their keys to the camera keys, and 9 stays Auto-rotate's. Every change is real input; every
 * assertion reads what is drawn or what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../test/features";
import { render, screen, waitFor, within } from "../../test/test-utils";
import { createRegistry, FILE_LIST, switchedOff } from "../commands/registry";
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

/**
 * The Camera menu's rows as a reader sees them: name, reason, key.
 * @returns the rows' words.
 */
async function cameraRows(): Promise<string[]> {
    await userEvent.click(cameraTool());
    const menu = await screen.findByRole("menu", { name: /^Camera/ });
    const rows = [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].map(
        (row) => row.textContent?.replaceAll(/\s+/g, " ").trim() ?? "",
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(screen.queryByRole("menu"));
    });
    return rows;
}

describe("the camera-views experiment off", () => {
    withFeatures([]);

    it("draws master's rail, Camera menu and main menu, and a new project has no cameras", async () => {
        const { session } = await openRing();
        assert.deepEqual(railNames(), ["Graph", "Data", "Notes", "Settings"]);
        assert.deepEqual([...session.views.keys()], [], "no starting cameras");
        assert.isFalse(session.config.startingCamerasWritten);

        await session.views.save([{ name: "Spot" }]);
        assert.deepEqual(await cameraRows(), [
            "Fit0",
            "Frame selectionSelect something firstF",
            "Front1",
            "Side3",
            "Top7",
            "Isometric",
            "Spot",
            "Remove view",
            "Save view",
            "Auto-rotate9",
            "Follow selection",
            "Export imageShift+I",
            "Record videoShift+R",
        ]);

        assert.deepEqual([...FILE_LIST], ["project.save", "project.save-as", "project.save-copy", "file.export"]);
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        const menu = await screen.findByRole("menu");
        assert.isNotNull(within(menu).getByRole("menuitem", { name: /^Export\.\.\./ }));
        assert.isNull(within(menu).queryByRole("menuitem", { name: /^Export (image|video)/ }));
        await userEvent.keyboard("{Escape}");
    });

    it("leaves the camera and the saved views alone on V, [, ], 2, 4, 6 and 8", async () => {
        const { element, session } = await openRing();
        const before = JSON.stringify(element.getCameraState());
        await userEvent.keyboard("v[[]2468");
        await element.waitForStableFrame();
        assert.equal(JSON.stringify(element.getCameraState()), before);
        assert.deepEqual([...session.views.keys()], []);
    });
});

describe("the camera-views experiment on", () => {
    withFeatures(["camera-views"]);

    it("puts Views on the rail and switches master's camera commands off, handing their keys on", async () => {
        const { element, session, store } = await openRing();
        assert.deepEqual(railNames(), ["Graph", "Data", "Views", "Notes", "Settings"]);

        const workspace = makeWorkspaceValue(store, createRegistry(REGISTRATIONS), session, element);
        const off = workspace.registry.live.filter((command) => switchedOff(command, workspace)).map(({ id }) => id);
        for (const id of [
            "view.front",
            "view.side",
            "view.top",
            "view.isometric",
            "view.save",
            "view.export-image",
            "view.record-video",
        ]) {
            assert.include(off, id);
        }
        // The only live holders of 1-4 and 6-8 are the camera keys.
        for (const digit of ["1", "2", "3", "4", "6", "7", "8"]) {
            const live = workspace.registry.live
                .filter((command) => command.keys?.includes(digit) === true && !switchedOff(command, workspace))
                .map(({ id }) => id);
            assert.deepEqual(live, [`camera.key-${digit}`], digit);
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
        assert.isFalse(store.get().recording, "no recording started");
        assert.isNull(store.get().notice, "no image exported");

        // 7 was Top's: given to Isometric, the press goes to Isometric, not to master's Top view.
        await session.views.setKey("Isometric", "7");
        await userEvent.keyboard("7");
        await waitFor(() => {
            assert.equal(store.get().lastView, "Isometric");
        });
    });
});
