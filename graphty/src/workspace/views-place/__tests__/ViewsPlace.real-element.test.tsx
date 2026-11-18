/**
 * The Views place on the REAL graphty-element (design/ui/camera-views-tours-and-capture.md,
 * sections 3.1, 3.3 and 7): the rail item, the Cameras and Video tours sections, the five starting
 * cameras as ordinary cards, rename, reorder, keys, duplicate, delete with undo, inspect, Save
 * camera on V, the 2D reasons, a tour built from cameras and a pause and played, and opening saved
 * files. Every change is real input; every assertion reads what is drawn or what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

type GraphElement = HTMLElementTagNameMap["graphty-element"];
type CameraState = ReturnType<GraphElement["getCameraState"]>;

const IDS = ["a", "b", "c", "d", "e", "f"];
const EDGES = IDS.map((source, i) => ({ source, target: IDS[(i + 1) % IDS.length] }));
const STARTING = ["Top", "Bottom", "Front", "Side", "Isometric"];

/** Whether the last opened project could be undone, or was unsaved, before its graph was added. */
let fresh = { canUndo: true, dirty: true };

/**
 * The workspace on a small ring, its element up and its picture settled, the Views place opened
 * before the graph was added.
 * @returns the element, its session and the store.
 */
async function openRing(): Promise<{ element: GraphElement; session: GraphSession; store: WorkspaceStore }> {
    // A desktop window; the left panel opens at its 240px.
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Views", id: 1 } });
    render(<Workspace store={store} />);
    let element: GraphElement | null = null;
    await waitFor(() => {
        element = document.querySelector("graphty-element");
        assert.isDefined(element?.session);
        assert.deepEqual([...(element?.session.views.keys() ?? [])], STARTING);
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const found: GraphElement = element;
    // A new project: the starting cameras are no undo step and leave it unchanged.
    fresh = { canUndo: found.session.canUndo, dirty: found.session.project.dirty };
    // The place opens before the graph comes, so it must follow the graph to enable its buttons.
    await userEvent.click(
        within(screen.getByRole("toolbar", { name: "Places" })).getByRole("button", { name: "Views" }),
    );
    await screen.findByRole("region", { name: "Views place" });
    await found.session.layout.set("circular");
    await found.session.data.addNodes(IDS.map((id) => ({ id })));
    await found.session.data.addEdges(EDGES);
    await found.waitForSettled();
    await found.waitForStableFrame();
    return { element: found, session: found.session, store };
}

/**
 * The Views place.
 * @returns the place.
 */
function place(): HTMLElement {
    return screen.getByRole("region", { name: "Views place" });
}

/**
 * The camera cards' names, in the order the place lists them.
 * @returns the names.
 */
function listedCameras(): string[] {
    return [
        ...within(place())
            .getByRole("group", { name: "Saved cameras" })
            .querySelectorAll<HTMLElement>("[data-card-id]"),
    ].map((card) => card.dataset.cardId ?? "");
}

/**
 * A camera's card.
 * @param name - the camera.
 * @returns the card.
 */
function cameraCard(name: string): HTMLElement {
    return within(place()).getByRole("region", { name });
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
        assert.closeTo(now.position?.[axis] ?? Number.NaN, state?.position?.[axis] ?? Number.NaN, 1e-2, axis);
    }
}

/**
 * Clicks the header's Undo.
 */
async function undo(): Promise<void> {
    const header = document.querySelector<HTMLElement>("header.ws-header");
    if (header === null) {
        throw new Error("no header");
    }
    await userEvent.click(within(header).getByRole("button", { name: /^Undo/ }));
}

/**
 * A tour's stops as names, "pause" for a pause.
 * @param session - the session.
 * @param name - the tour.
 * @returns the stops.
 */
function stopsOf(session: GraphSession, name: string): string[] {
    return session.tours.get(name)?.stops.map((stop) => ("view" in stop ? stop.view : "pause")) ?? [];
}

describe("the Views place", () => {
    it("sits on the rail between Data and Notes, with Cameras and Video tours that collapse and stay so", async () => {
        const { store } = await openRing();
        const rail = screen.getByRole("toolbar", { name: "Places" });
        const items = within(rail)
            .getAllByRole("button")
            .map((button) => button.getAttribute("aria-label") ?? button.textContent);
        assert.deepEqual(
            items.filter((label) => ["Graph", "Data", "Views", "Notes"].some((each) => label?.startsWith(each))),
            ["Graph", "Data", "Views", "Notes"],
        );
        assert.equal(within(rail).getByRole("button", { name: "Views" }).getAttribute("aria-current"), "page");
        assert.isNull(
            screen.queryByRole("group", { name: "Views" }),
            "the Graph place no longer holds a Views section",
        );

        // A new project: the five starting cameras with their keys, no undo step, nothing unsaved.
        assert.deepEqual(listedCameras(), STARTING);
        for (const [name, key] of [
            ["Top", "7"],
            ["Bottom", "9"],
            ["Front", "1"],
            ["Side", "3"],
        ]) {
            assert.isNotNull(within(cameraCard(name)).getByLabelText(`Key ${key}`));
        }
        assert.isNull(within(cameraCard("Isometric")).queryByLabelText(/^Key /));
        assert.isFalse(fresh.canUndo, "the starting cameras are no undo step");
        assert.isFalse(fresh.dirty, "the starting cameras leave the project unchanged");

        await userEvent.click(within(place()).getByRole("button", { name: /^Collapse Cameras/ }));
        await waitFor(() => {
            assert.isFalse(store.get().viewsCamerasOpen);
            assert.isNull(within(place()).queryByRole("button", { name: "Go to Top" }));
        });
        await userEvent.click(within(place()).getByRole("button", { name: /^Collapse Video tours/ }));
        await waitFor(() => {
            assert.isFalse(store.get().viewsToursOpen);
        });
        await userEvent.click(within(rail).getByRole("button", { name: "Data" }));
        await userEvent.click(within(rail).getByRole("button", { name: "Views" }));
        assert.isNotNull(await within(place()).findByRole("button", { name: /^Expand Cameras/ }));
        assert.isNotNull(within(place()).getByRole("button", { name: /^Expand Video tours/ }));
    });

    it("goes to a camera with its Go button, renames with a title click or F2, and moves with Mod+[", async () => {
        const { element, session } = await openRing();
        await userEvent.click(within(cameraCard("Side")).getByRole("button", { name: "Go to Side" }));
        await waitFor(() => {
            assert.equal(
                within(cameraCard("Side")).getByRole("button", { name: "Go to Side" }).getAttribute("aria-current"),
                "true",
            );
        });
        await element.waitForSettled();
        assertAt(element, element.resolveCameraPreset("Side"));

        await userEvent.click(within(cameraCard("Top")).getByRole("button", { name: "Rename Top" }));
        const field = await within(place()).findByRole("textbox", { name: "Rename Top" });
        await userEvent.clear(field);
        await userEvent.type(field, "Overhead{Enter}");
        await waitFor(() => {
            assert.deepEqual(listedCameras(), ["Overhead", "Bottom", "Front", "Side", "Isometric"]);
        });
        assert.equal(session.views.get("Overhead")?.key, "7", "rename keeps the key");

        // A title click then Escape changes nothing.
        await userEvent.click(within(cameraCard("Bottom")).getByRole("button", { name: "Rename Bottom" }));
        await within(place()).findByRole("textbox", { name: "Rename Bottom" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(within(place()).queryByRole("textbox", { name: "Rename Bottom" }));
        });
        assert.isTrue(session.views.has("Bottom"));

        // F2 on a Go button opens rename, not the project's.
        within(cameraCard("Front")).getByRole("button", { name: "Go to Front" }).focus();
        await userEvent.keyboard("{F2}");
        assert.isNotNull(await within(place()).findByRole("textbox", { name: "Rename Front" }));
        assert.isNull(screen.queryByRole("textbox", { name: /project/i }));
        await userEvent.keyboard("{Escape}");

        // Mod+[ moves a card down the list, from its Go button.
        within(cameraCard("Overhead")).getByRole("button", { name: "Go to Overhead" }).focus();
        await userEvent.keyboard("{Control>}[[{/Control}");
        await waitFor(() => {
            assert.deepEqual(listedCameras(), ["Bottom", "Overhead", "Front", "Side", "Isometric"]);
        });
        assert.equal(
            document.activeElement,
            within(cameraCard("Overhead")).getByRole("button", { name: "Go to Overhead" }),
        );
    });

    it("refuses a rename onto a taken name in the notice, keeping the old name", async () => {
        const { session } = await openRing();
        await userEvent.click(within(cameraCard("Side")).getByRole("button", { name: "Rename Side" }));
        const field = await within(place()).findByRole("textbox", { name: "Rename Side" });
        await userEvent.clear(field);
        await userEvent.type(field, "Top{Enter}");
        await waitFor(() => {
            assert.include(screen.getByText(/Name in use/).textContent, "Name in use");
        });
        assert.deepEqual([...session.views.keys()], STARTING);
        assert.equal(document.activeElement, within(cameraCard("Side")).getByRole("button", { name: "Rename Side" }));
    });

    it("moves a key with the Key list and the Key submenu, and undo gives it back", async () => {
        const { session } = await openRing();
        await userEvent.click(within(cameraCard("Isometric")).getByRole("button", { name: /^Expand Isometric/ }));
        await userEvent.click(within(cameraCard("Isometric")).getByRole("combobox", { name: "Key" }));
        await userEvent.click(await screen.findByRole("option", { name: "7 -- Top" }));
        await waitFor(() => {
            assert.equal(session.views.get("Isometric")?.key, "7");
            assert.isUndefined(session.views.get("Top")?.key, "Top lost the key");
        });
        await waitFor(() => {
            const lines = screen.getAllByRole("status").map((line) => line.textContent);
            assert.include(lines, "Moved key 7 from Top to Isometric");
        });
        await undo();
        await waitFor(() => {
            assert.equal(session.views.get("Top")?.key, "7");
            assert.isUndefined(session.views.get("Isometric")?.key);
        });

        await userEvent.click(within(cameraCard("Side")).getByRole("button", { name: "More for Side" }));
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Key" }));
        await userEvent.click(await screen.findByRole("menuitemradio", { name: "2" }));
        await waitFor(() => {
            assert.equal(session.views.get("Side")?.key, "2");
        });
    });

    it("duplicates and deletes a camera, and undo puts it back in its place with its key", async () => {
        const { session } = await openRing();
        await userEvent.click(within(cameraCard("Front")).getByRole("button", { name: "More for Front" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Duplicate/ }));
        await waitFor(() => {
            assert.deepEqual(listedCameras(), [...STARTING, "Front 2"]);
        });
        assert.deepEqual(session.views.get("Front 2"), { follows: "frontView" }, "same camera view, no key");

        within(cameraCard("Front")).getByRole("button", { name: "Go to Front" }).focus();
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.deepEqual(listedCameras(), ["Top", "Bottom", "Side", "Isometric", "Front 2"]);
        });
        await undo();
        await waitFor(() => {
            assert.deepEqual(listedCameras(), [...STARTING, "Front 2"]);
        });
        assert.equal(session.views.get("Front")?.key, "1");
    });

    it("saves Camera 1 on V with its name open, inspects it, and Update makes a following camera fixed", async () => {
        const { session } = await openRing();
        await userEvent.click(document.body);
        await userEvent.keyboard("v");
        const field = await within(place()).findByRole("textbox", { name: "Rename Camera 1" });
        assert.isTrue(session.views.has("Camera 1"));
        await userEvent.type(field, "{Escape}");
        const card = cameraCard("Camera 1");
        for (const label of ["Kind", "Mode", "Position", "Target"]) {
            assert.isNotNull(within(card).getByRole("group", { name: label }), label);
        }
        assert.include(within(card).getByRole("group", { name: "Kind" }).textContent, "Fixed");

        await userEvent.click(within(cameraCard("Top")).getByRole("button", { name: /^Expand Top/ }));
        const top = cameraCard("Top");
        assert.include(within(top).getByRole("group", { name: "Kind" }).textContent, "Recomputed from the top view");
        await userEvent.click(within(top).getByRole("button", { name: "Update to current camera" }));
        await waitFor(() => {
            assert.include(within(cameraCard("Top")).getByRole("group", { name: "Kind" }).textContent, "Fixed");
        });
        assert.equal(session.views.get("Top")?.key, "7", "update keeps the key");
    });

    it("in 2D disables the 3D-only cameras with their reason and keeps Top", async () => {
        const { session } = await openRing();
        await session.layout.setDimension("2d");
        await waitFor(() => {
            for (const name of ["Bottom", "Front", "Side", "Isometric"]) {
                const go = within(cameraCard(name)).getByRole("button", { name: `Go to ${name}` });
                assert.equal(go.getAttribute("aria-disabled"), "true", name);
                assert.equal(go.getAttribute("aria-description"), "3D only", name);
            }
        });
        assert.isNull(
            within(cameraCard("Top")).getByRole("button", { name: "Go to Top" }).getAttribute("aria-disabled"),
        );
    });

    it("makes a tour of cameras and a pause, edits a hold, plays it and puts the camera back", async () => {
        const { element, session } = await openRing();
        // The section's +, beside the empty state's own New tour.
        await userEvent.click(within(place()).getAllByRole("button", { name: "New tour" })[0]);
        const rename = await within(place()).findByRole("textbox", { name: "Rename Tour 1" });
        await userEvent.clear(rename);
        await userEvent.type(rename, "Walk{Enter}");
        await waitFor(() => {
            assert.isTrue(session.tours.has("Walk"));
        });
        const add = async (camera: string): Promise<void> => {
            await userEvent.click(within(place()).getByRole("button", { name: "Add camera to Walk" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: camera }));
        };
        await add("Top");
        await add("Isometric");
        await userEvent.click(within(place()).getByRole("button", { name: "Add pause to Walk" }));
        await add("Side");
        await waitFor(() => {
            assert.deepEqual(stopsOf(session, "Walk"), ["Top", "Isometric", "pause", "Side"]);
        });
        assert.deepEqual(session.tours.get("Walk")?.stops[0], { view: "Top", duration: 0, hold: 2000 });
        assert.deepEqual(session.tours.get("Walk")?.stops[2], { pause: 2000 });

        const length = (): string => within(place()).getByLabelText(/^Length /).textContent ?? "";
        assert.equal(length(), "0:12");
        const stops = within(place()).getByRole("list", { name: "Stops of Walk" });
        const hold = within(stops).getAllByLabelText("Hold")[1];
        await userEvent.clear(hold);
        await userEvent.type(hold, "0.5{Enter}");
        await waitFor(() => {
            assert.deepInclude(session.tours.get("Walk")?.stops[1], { hold: 500 });
            assert.equal(length(), "0:11");
        });

        // Shorter, so the play below is quick.
        await session.tours.save([
            {
                name: "Walk",
                tour: {
                    stops: [
                        { view: "Top", duration: 0, hold: 200 },
                        { pause: 200 },
                        { view: "Side", duration: 300, hold: 200 },
                    ],
                },
            },
        ]);
        const start = element.getCameraState();
        const ended: string[] = [];
        element.addEventListener("tour-ended", (event) => {
            ended.push(event.detail.reason);
        });
        await userEvent.click(within(place()).getByRole("button", { name: "Play Walk" }));
        await waitFor(() => {
            assert.isNotNull(
                within(place()).getByRole("list", { name: "Stops of Walk" }).querySelector('[aria-current="step"]'),
            );
        });
        await waitFor(() => {
            assert.deepEqual(ended, ["finished"]);
        });
        assert.isNull(
            within(place()).getByRole("list", { name: "Stops of Walk" }).querySelector('[aria-current="step"]'),
        );
        await element.waitForSettled();
        assertAt(element, start);
    });

    it("keeps playing when Escape closes a stop's list, and ends where a drag leaves the camera", async () => {
        const { element, session } = await openRing();
        // A hold far longer than the test, so only the drag ends it.
        await session.tours.save([{ name: "Long", tour: { stops: [{ view: "Top", hold: 600_000 }] } }]);
        await userEvent.click(within(place()).getByRole("button", { name: /^Expand Long/ }));
        const ended: string[] = [];
        element.addEventListener("tour-ended", (event) => {
            ended.push(event.detail.reason);
        });
        await userEvent.click(within(place()).getByRole("button", { name: "Play Long" }));
        await within(place()).findByRole("button", { name: "Stop tour" });

        await userEvent.click(within(place()).getByRole("combobox", { name: "Stop 1 camera" }));
        await screen.findByRole("listbox");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox"));
        });
        assert.deepEqual(ended, [], "the tour plays on");

        await dragCanvas(element);
        await waitFor(() => {
            assert.deepEqual(ended, ["interrupted"]);
        });
        assert.isNotNull(within(place()).getByRole("button", { name: "Play Long" }));
    });

    it("moves a stop with Mod+[ from its menu button, and a broken stop says why", async () => {
        const { session } = await openRing();
        await session.tours.save([
            { name: "Walk", tour: { stops: [{ view: "Top" }, { view: "Side" }, { view: "Gone" }] } },
        ]);
        await userEvent.click(within(place()).getByRole("button", { name: /^Expand Walk/ }));
        within(place()).getByRole("button", { name: "More for Stop 1" }).focus();
        await userEvent.keyboard("{Control>}[[{/Control}");
        await waitFor(() => {
            assert.deepEqual(stopsOf(session, "Walk"), ["Side", "Top", "Gone"]);
        });
        assert.equal(document.activeElement, within(place()).getByRole("button", { name: "More for Stop 2" }));
        const broken = within(place()).getByRole("combobox", { name: "Stop 3 camera" });
        assert.equal(broken.getAttribute("aria-description"), "Camera not found");
        const play = within(place()).getByRole("button", { name: "Play Walk" });
        assert.equal(play.getAttribute("aria-disabled"), "true");
        assert.equal(play.getAttribute("aria-description"), "Stop 3: Camera not found");
    });

    it("opens Export on Video with the tour from Export video...", async () => {
        const { session, store } = await openRing();
        await session.tours.save([{ name: "Walk", tour: { stops: [{ view: "Top", hold: 300 }] } }]);
        await userEvent.click(await within(place()).findByRole("button", { name: "More for Walk" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Export video/ }));
        assert.isNotNull(await screen.findByRole("dialog", { name: "Export" }));
        assert.equal(store.get().exportTour, "Walk");
        assert.equal(store.get().exportOn, "video");
    });

    it("lists exactly what a saved file holds, and gives an older file the five after its own", async () => {
        const { session } = await openRing();
        // A project whose Top was deleted and Side renamed.
        await session.views.remove(["Top"]);
        await session.views.rename("Side", "Profile");
        const saved = (await session.project.save()).text;
        await session.project.open(saved, { discard: true });
        await waitFor(() => {
            assert.deepEqual(listedCameras(), ["Bottom", "Front", "Profile", "Isometric"]);
        });

        // An older file: two cameras of its own and no record of the starting cameras.
        await session.views.remove([...session.views.keys()]);
        await session.views.save([{ name: "Hub" }, { name: "Rim" }]);
        const strip = (value: unknown): unknown => {
            if (Array.isArray(value)) {
                return value.map(strip);
            }
            if (typeof value === "object" && value !== null) {
                return Object.fromEntries(
                    Object.entries(value)
                        .filter(([key]) => key !== "startingCamerasWritten")
                        .map(([key, inner]) => [key, strip(inner)]),
                );
            }
            return value;
        };
        const older = JSON.stringify(strip(JSON.parse((await session.project.save()).text)));
        await session.project.open(older, { discard: true });
        await waitFor(() => {
            assert.deepEqual(listedCameras(), ["Hub", "Rim", ...STARTING]);
        });
    });
});
