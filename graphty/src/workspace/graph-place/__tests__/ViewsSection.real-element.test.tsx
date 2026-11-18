/**
 * The Graph place's Views section on the REAL graphty-element (design/ui/camera-views-tours-and-
 * capture.md, sections 3.2 and 7): its scroller beside the style tree's at 240px, rename with F2,
 * move with Mod+], a tour made with New tour and Add stop, a hold edited, Play marking its stop and
 * putting the camera back, Escape in a stop's list leaving the tour playing, a drag ending it, and
 * undo of a delete. Every change is real input; every assertion reads what is drawn or what the
 * element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

type GraphElement = HTMLElementTagNameMap["graphty-element"];
type CameraState = ReturnType<GraphElement["getCameraState"]>;

const IDS = ["a", "b", "c", "d", "e", "f"];
const EDGES = IDS.map((source, i) => ({ source, target: IDS[(i + 1) % IDS.length] }));

/**
 * The workspace on a small ring, its element up and its picture settled.
 * @returns the element and its session.
 */
async function openRing(): Promise<{ element: GraphElement; session: GraphSession }> {
    // A desktop window; the left panel opens at its 240px.
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
    await found.session.layout.set("circular");
    await found.session.data.addNodes(IDS.map((id) => ({ id })));
    await found.session.data.addEdges(EDGES);
    await found.waitForSettled();
    await found.waitForStableFrame();
    return { element: found, session: found.session };
}

/**
 * The Views section, expanded by a click on its header.
 * @returns the section.
 */
async function openViews(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: /^Expand Views/ }));
    return screen.getByRole("group", { name: "Views" });
}

/**
 * A saved view's row in the section.
 * @param name - the view.
 * @returns the row's cell.
 */
function viewRow(name: string): HTMLElement {
    return within(screen.getByRole("grid", { name: "Saved views" })).getByRole("gridcell", { name });
}

/**
 * The saved views' names as the section lists them.
 * @returns the names, in order.
 */
function listedViews(): string[] {
    return within(screen.getByRole("grid", { name: "Saved views" }))
        .getAllByRole("row")
        .map((row) => row.querySelector("[data-id]")?.getAttribute("data-id") ?? "");
}

/**
 * Drags across the middle of the canvas with the mouse, through the browser's own input.
 * @param element - the element.
 */
async function dragCanvas(element: GraphElement): Promise<void> {
    const box = element.getBoundingClientRect();
    let x = box.left + box.width / 2;
    let y = box.top + box.height / 2;
    let scale = 1;
    // The test page is an iframe of the runner's page, possibly scaled: map into the top page.
    for (
        let frame = window.frameElement;
        frame !== null;
        frame = frame.ownerDocument.defaultView?.frameElement ?? null
    ) {
        const outer = frame.getBoundingClientRect();
        const ratio = outer.width / ((frame as HTMLIFrameElement).contentWindow?.innerWidth ?? outer.width);
        x = outer.left + x * ratio;
        y = outer.top + y * ratio;
        scale *= ratio;
    }
    const send = (params: object): Promise<unknown> =>
        (cdp() as unknown as { send: (method: string, params: object) => Promise<unknown> }).send(
            "Input.dispatchMouseEvent",
            params,
        );
    await send({ type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
    for (let step = 1; step <= 8; step += 1) {
        await send({
            type: "mouseMoved",
            x: x + step * 15 * scale,
            y: y + step * 5 * scale,
            button: "left",
            buttons: 1,
        });
    }
    await send({
        type: "mouseReleased",
        x: x + 120 * scale,
        y: y + 40 * scale,
        button: "left",
        buttons: 0,
        clickCount: 1,
    });
}

/**
 * Asserts the camera stands where a state put it.
 * @param element - the element.
 * @param state - the state.
 */
function assertAt(element: GraphElement, state: CameraState | undefined): void {
    const now = element.getCameraState();
    for (const axis of ["x", "y", "z"] as const) {
        assert.closeTo(now.position?.[axis] ?? Number.NaN, state?.position?.[axis] ?? Number.NaN, 1e-3, axis);
    }
}

describe("the Views section", () => {
    it("scrolls inside itself beside a long style tree at 240px, each keeping its own room", async () => {
        const { session } = await openRing();
        // Thirty layers in one step.
        await session.transaction("Layers", async (tx) => {
            for (let n = 1; n <= 30; n += 1) {
                await tx.styles.add({
                    name: `Layer ${String(n)}`,
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.size": n },
                });
            }
        });
        await session.views.save(Array.from({ length: 14 }, (_, n) => ({ name: `View ${String(n + 1)}` })));
        const section = await openViews();
        await waitFor(() => {
            assert.equal(listedViews().length, 14);
        });

        const place = screen.getByRole("region", { name: "Graph place" });
        const tree = within(place).getByRole("tree", { name: "Style layers" });
        const body = section.querySelector<HTMLElement>(".cm-section-content");
        assert.isNotNull(body);
        const placeBox = place.getBoundingClientRect();
        const treeBox = tree.getBoundingClientRect();
        const sectionBox = section.getBoundingClientRect();
        assert.isAtMost(placeBox.width, 241, "the panel is at its 240px");
        assert.isAtLeast(treeBox.height, 120, "the tree keeps its room");
        assert.isAtMost(sectionBox.height, placeBox.height / 2 + 1, "the section takes at most half the column");
        assert.isAtMost(sectionBox.bottom, placeBox.bottom + 1, "the section stays in the column");
        assert.isAbove(tree.scrollHeight, tree.clientHeight, "the tree scrolls inside itself");
        assert.isAbove(body?.scrollHeight ?? 0, body?.clientHeight ?? 0, "the section scrolls inside itself");
    });

    it("renames a view with F2, and the Camera menu and the tour's stop follow it", async () => {
        const { session } = await openRing();
        await userEvent.keyboard("v");
        await waitFor(() => {
            assert.isTrue(session.views.has("View 1"));
        });
        const section = await openViews();
        // New tour seeds a stop per saved view.
        await userEvent.click(within(section).getByRole("button", { name: "New tour" }));
        await waitFor(() => {
            assert.deepEqual(
                session.tours.get("Tour 1")?.stops.map((stop) => ("view" in stop ? stop.view : "pause")),
                ["View 1"],
            );
        });

        viewRow("View 1").focus();
        await userEvent.keyboard("{F2}");
        const field = await within(section).findByRole("textbox", { name: "View name" });
        await userEvent.clear(field);
        await userEvent.type(field, "Hub{Enter}");
        await waitFor(() => {
            assert.deepEqual([...session.views.keys()], ["Hub"]);
            assert.deepEqual(
                session.tours.get("Tour 1")?.stops.map((stop) => ("view" in stop ? stop.view : "pause")),
                ["Hub"],
            );
        });
        await waitFor(() => {
            assert.equal(document.activeElement, viewRow("Hub"), "focus stays on the renamed row");
        });
        assert.equal(within(section).getByRole<HTMLInputElement>("combobox", { name: "Stop 1 view" }).value, "Hub");

        await userEvent.click(
            within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Camera" }),
        );
        const menu = await screen.findByRole("menu", { name: /^Camera/ });
        assert.isNotNull(within(menu).getByRole("menuitem", { name: /^Hub$/ }));
    });

    it("moves a view up with Mod+], and undo of a delete puts it back in its place", async () => {
        const { session } = await openRing();
        await session.views.save([{ name: "One" }, { name: "Two" }, { name: "Three" }]);
        await openViews();

        viewRow("Two").focus();
        await userEvent.keyboard("{Control>}]{/Control}");
        await waitFor(() => {
            assert.deepEqual(listedViews(), ["Two", "One", "Three"]);
        });
        assert.equal(document.activeElement, viewRow("Two"), "focus stays on the moved row");

        viewRow("One").focus();
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.deepEqual(listedViews(), ["Two", "Three"]);
        });
        assert.equal(document.activeElement, viewRow("Three"), "focus goes to the row that took its place");
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.deepEqual(listedViews(), ["Two", "One", "Three"]);
        });
    });

    it("moves a stop two places with Mod+[ pressed twice, focus following it", async () => {
        const { session } = await openRing();
        await session.views.save([{ name: "One" }, { name: "Two" }, { name: "Three" }]);
        const section = await openViews();
        await userEvent.click(within(section).getByRole("button", { name: "New tour" }));
        await waitFor(() => {
            assert.equal(session.tours.get("Tour 1")?.stops.length, 3);
        });
        const stopViews = (): string[] =>
            session.tours.get("Tour 1")?.stops.map((stop) => ("view" in stop ? stop.view : "pause")) ?? [];

        within(section).getByRole("button", { name: "More for Stop 1" }).focus();
        await userEvent.keyboard("{Control>}[[{/Control}");
        await waitFor(() => {
            assert.deepEqual(stopViews(), ["Two", "One", "Three"]);
        });
        assert.equal(document.activeElement, within(section).getByRole("button", { name: "More for Stop 2" }));
        await userEvent.keyboard("{Control>}[[{/Control}");
        await waitFor(() => {
            assert.deepEqual(stopViews(), ["Two", "Three", "One"]);
        });
        assert.equal(document.activeElement, within(section).getByRole("button", { name: "More for Stop 3" }));
    });

    it("makes a tour: Add stop after a drag, a hold edited, Play marks the stop and puts the camera back", async () => {
        const { element, session } = await openRing();
        await userEvent.keyboard("v");
        await waitFor(() => {
            assert.isTrue(session.views.has("View 1"));
        });
        const section = await openViews();
        await userEvent.click(within(section).getByRole("button", { name: "New tour" }));
        await waitFor(() => {
            assert.equal(session.tours.get("Tour 1")?.stops.length, 1);
        });

        // Orbit, then Add stop saves where the camera stands as one undo step.
        const before = element.getCameraState();
        await dragCanvas(element);
        await waitFor(() => {
            assert.notDeepEqual(element.getCameraState().position, before.position);
        });
        await element.waitForStableFrame();
        await userEvent.click(within(section).getByRole("button", { name: "Add stop" }));
        await waitFor(() => {
            assert.deepEqual(
                session.tours.get("Tour 1")?.stops.map((stop) => ("view" in stop ? stop.view : "pause")),
                ["View 1", "View 2"],
            );
        });
        assert.isTrue(session.views.has("View 2"));

        const stops = within(section).getByRole("list", { name: "Stops of Tour 1" });
        const hold = within(stops).getAllByLabelText("Hold")[1];
        await userEvent.clear(hold);
        await userEvent.type(hold, "0.5{Enter}");
        await waitFor(() => {
            assert.deepInclude(session.tours.get("Tour 1")?.stops[1], { hold: 500 });
        });

        const start = element.getCameraState();
        const ended: string[] = [];
        element.addEventListener("tour-ended", (event) => {
            ended.push(event.detail.reason);
        });
        await userEvent.click(within(section).getByRole("button", { name: "Play" }));
        await waitFor(() => {
            const current = stops.querySelector('[aria-current="step"]');
            assert.isNotNull(current, "the playing stop is marked");
        });
        // The status line says each stop as it is reached.
        await waitFor(() => {
            const lines = screen.getAllByRole("status").map((line) => line.textContent);
            assert.include(lines, "Stop 2 of 2, View 2");
        });
        await waitFor(() => {
            assert.deepEqual(ended, ["finished"]);
        });
        assert.isNull(stops.querySelector('[aria-current="step"]'), "no stop is marked once it ends");
        assertAt(element, start);
    });

    it("keeps playing when Escape closes a stop's list, and ends where a drag leaves the camera", async () => {
        const { element, session } = await openRing();
        await userEvent.keyboard("v");
        await waitFor(() => {
            assert.isTrue(session.views.has("View 1"));
        });
        // A hold far longer than the test, so only the drag ends it.
        await session.tours.save([{ name: "Long", tour: { stops: [{ view: "View 1", hold: 600_000 }] } }]);
        const section = await openViews();
        await userEvent.click(within(section).getByRole("button", { name: /^Expand Long/ }));
        const ended: string[] = [];
        element.addEventListener("tour-ended", (event) => {
            ended.push(event.detail.reason);
        });
        await userEvent.click(within(section).getByRole("button", { name: "Play" }));
        await within(section).findByRole("button", { name: "Stop" });

        await userEvent.click(within(section).getByRole("combobox", { name: "Stop 1 view" }));
        await screen.findByRole("listbox");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox"));
        });
        assert.deepEqual(ended, [], "the tour plays on");
        assert.isNotNull(within(section).getByRole("button", { name: "Stop" }));

        await dragCanvas(element);
        await waitFor(() => {
            assert.deepEqual(ended, ["interrupted"]);
        });
        await element.waitForStableFrame();
        const left = element.getCameraState();
        await element.waitForSettled();
        await element.waitForStableFrame();
        assertAt(element, left);
        assert.isNotNull(within(section).getByRole("button", { name: "Play" }));
    });

    it("opens from the Camera menu's Views and tours... with focus on its first view", async () => {
        const { session } = await openRing();
        await session.views.save([{ name: "Overview" }]);
        await userEvent.click(
            within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Camera" }),
        );
        const menu = await screen.findByRole("menu", { name: /^Camera/ });
        assert.isNull(
            within(menu).queryByRole("menuitem", { name: /^Remove view/ }),
            "views are managed in the section",
        );
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Views and tours..." }));
        await waitFor(() => {
            assert.equal(document.activeElement, viewRow("Overview"));
        });
    });
});
