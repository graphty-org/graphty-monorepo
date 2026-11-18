/**
 * The Camera menu's saved views and tours on the REAL graphty-element: V saves the camera, [ and ]
 * step through the saved views, a view the drawing mode cannot use is disabled with the element's
 * reason, and a tour played from the menu stops on Escape or on its Stop tour button. Every change
 * is real input; every assertion reads what is drawn or what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

type GraphElement = HTMLElementTagNameMap["graphty-element"];
type CameraState = ReturnType<GraphElement["getCameraState"]>;

const IDS = ["a", "b", "c", "d", "e", "f"];
const EDGES = IDS.map((source, i) => ({ source, target: IDS[(i + 1) % IDS.length] }));

/**
 * The workspace on a small ring, its element up and the Camera tool enabled.
 * @returns the element and its session.
 */
async function openRing(): Promise<{ element: GraphElement; session: GraphSession }> {
    // A desktop window, so the canvas and its toolbar have room beside both panels.
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Views", id: 1 } })} />);
    let element: GraphElement | null = null;
    await waitFor(() => {
        element = document.querySelector("graphty-element");
        assert.isDefined(element?.session);
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const found: GraphElement = element;
    // A circle comes to rest at once, so the picture settles.
    await found.session.layout.set("circular");
    await found.session.data.addNodes(IDS.map((id) => ({ id })));
    await found.session.data.addEdges(EDGES);
    await waitFor(() => {
        assert.isFalse(cameraTool().hasAttribute("aria-disabled"));
    });
    await found.waitForSettled();
    await found.waitForStableFrame();
    return { element: found, session: found.session };
}

/**
 * The toolbar's Camera tool.
 * @returns the tool.
 */
function cameraTool(): HTMLElement {
    return within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Camera" });
}

/**
 * Opens the Camera menu.
 * @returns the menu.
 */
async function openCamera(): Promise<HTMLElement> {
    await userEvent.click(cameraTool());
    return screen.findByRole("menu", { name: /^Camera/ });
}

/**
 * Asserts the camera stands where a saved state put it.
 * @param element - the element.
 * @param saved - the saved state.
 */
function assertAt(element: GraphElement, saved: CameraState | undefined): void {
    const now = element.getCameraState();
    for (const axis of ["x", "y", "z"] as const) {
        assert.closeTo(now.position?.[axis] ?? Number.NaN, saved?.position?.[axis] ?? Number.NaN, 1e-3, axis);
    }
}

describe("the Camera menu's saved views", () => {
    it("saves with V, steps with ] (AltGr too) to the last view, then says so", async () => {
        const { element, session } = await openRing();

        await userEvent.keyboard("v");
        await waitFor(() => {
            assert.deepEqual([...session.views.keys()], ["View 1"]);
        });
        // Top (7) moves the camera, and V saves the second view there.
        await userEvent.keyboard("7");
        await element.waitForStableFrame();
        await userEvent.keyboard("v");
        await waitFor(() => {
            assert.deepEqual([...session.views.keys()], ["View 1", "View 2"]);
        });
        const menu = await openCamera();
        assert.isNotNull(within(menu).getByRole("menuitem", { name: /^View 1$/ }));
        assert.isNotNull(within(menu).getByRole("menuitem", { name: /^View 2$/ }));
        await userEvent.keyboard("{Escape}");

        await userEvent.keyboard("]");
        await waitFor(() => {
            assertAt(element, session.views.get("View 1"));
        });
        // Where "]" needs AltGr, it arrives with Ctrl and Alt held.
        await userEvent.keyboard("{Control>}{Alt>}]{/Alt}{/Control}");
        await waitFor(() => {
            assertAt(element, session.views.get("View 2"));
        });

        const next = within(await openCamera()).getByRole("menuitem", { name: /^Next view/ });
        assert.equal(next.getAttribute("aria-disabled"), "true");
        assert.include(next.textContent, "At the last view");
    });

    it("disables in 2D the 3D camera views and a view saved in 3D, with the element's reason", async () => {
        const { session } = await openRing();
        await userEvent.keyboard("v");
        await waitFor(() => {
            assert.isTrue(session.views.has("View 1"));
        });

        await userEvent.keyboard("5");
        await waitFor(() => {
            assert.equal(session.layout.dimension, "2d");
        });
        const menu = await openCamera();
        const front = within(menu).getByRole("menuitem", { name: /^Front/ });
        assert.equal(front.getAttribute("aria-disabled"), "true");
        assert.include(front.textContent, "Only in 3D");
        const saved = within(menu).getByRole("menuitem", { name: /^View 1/ });
        assert.equal(saved.getAttribute("aria-disabled"), "true");
        assert.include(saved.textContent, "Saved in 3D");
        const fit = within(menu).getByRole("menuitem", { name: /^Fit/ });
        assert.notEqual(fit.getAttribute("aria-disabled"), "true", "Fit works in 2D");
    });
});

describe("a tour played from the Camera menu", () => {
    it("ends on Escape, and on the Stop tour button", async () => {
        const { element, session } = await openRing();
        await userEvent.keyboard("v");
        await waitFor(() => {
            assert.isTrue(session.views.has("View 1"));
        });
        // A hold far longer than the test, so only a stop ends it.
        await session.tours.save([
            { name: "Walk", tour: { stops: [{ view: "View 1", hold: 600_000 }, { view: "topView" }] } },
        ]);
        const ended: string[] = [];
        element.addEventListener("tour-ended", (event) => {
            ended.push(event.detail.reason);
        });
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });

        const play = async (): Promise<void> => {
            const menu = await openCamera();
            await userEvent.click(within(menu).getByRole("menuitem", { name: /^Play tour/ }));
            const tours = (await screen.findAllByRole("menu")).at(-1);
            assert.isDefined(tours);
            if (tours !== undefined) {
                await userEvent.click(within(tours).getByRole("menuitem", { name: /^Walk$/ }));
            }
            await within(toolbar).findByRole("button", { name: "Stop tour" });
        };

        await play();
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.deepEqual(ended, ["cancelled"]);
            assert.isNull(within(toolbar).queryByRole("button", { name: "Stop tour" }));
        });

        await play();
        await userEvent.click(within(toolbar).getByRole("button", { name: "Stop tour" }));
        await waitFor(() => {
            assert.deepEqual(ended, ["cancelled", "cancelled"]);
            assert.isNull(within(toolbar).queryByRole("button", { name: "Stop tour" }));
        });
    });
});
