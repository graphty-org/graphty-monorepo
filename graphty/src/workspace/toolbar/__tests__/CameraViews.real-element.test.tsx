/**
 * The Camera menu, the camera keys and the toolbar while a tour plays, on the REAL graphty-element
 * (design/ui/camera-views-tours-and-capture.md, sections 3.2, 3.4 and 3.5): the menu lists the
 * cameras with their keys, Fit, Fit selection, zoom in 2D and the two switches, and nothing else; a
 * camera's digit flies there, never while typing; Camera and Mode stay one flex gap apart, and
 * while a tour plays the Camera tool is Stop. Every change is real input; every assertion reads
 * what is drawn or what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
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
 * The canvas toolbar.
 * @returns the toolbar.
 */
function toolbar(): HTMLElement {
    return screen.getByRole("toolbar", { name: "Canvas tools" });
}

/**
 * The toolbar's Camera tool.
 * @returns the tool.
 */
function cameraTool(): HTMLElement {
    return within(toolbar()).getByRole("button", { name: "Camera" });
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
 * Closes the open menu.
 */
async function closeMenu(): Promise<void> {
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(screen.queryByRole("menu"));
    });
}

/** One menu row as a reader sees it. */
interface Row {
    readonly text: string;
    readonly disabled: boolean;
}

/**
 * The menu's rows, in order, with the words drawn on each: its name, then its reason, then its key.
 * @param menu - the menu.
 * @returns the rows.
 */
function rowsOf(menu: HTMLElement): Row[] {
    return [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].map((row) => ({
        text: row.textContent?.replaceAll(/\s+/g, " ").trim() ?? "",
        disabled: row.getAttribute("aria-disabled") === "true",
    }));
}

/**
 * Asserts the camera stands where a resolved or saved state puts it.
 * @param element - the element.
 * @param expected - the state.
 */
function assertAt(element: GraphElement, expected: CameraState | undefined): void {
    const now = element.getCameraState();
    for (const axis of ["x", "y", "z"] as const) {
        assert.closeTo(now.position?.[axis] ?? Number.NaN, expected?.position?.[axis] ?? Number.NaN, 1e-3, axis);
    }
}

/**
 * The space between the Camera tool (or Stop, in its place) and the Mode tool, and the
 * toolbar's own flex gap.
 * @returns both, in pixels.
 */
function gapToMode(): { between: number; gap: number } {
    const bar = toolbar();
    const camera =
        within(bar).queryByRole("button", { name: "Camera" }) ?? within(bar).getByRole("button", { name: "Stop tour" });
    const mode = within(bar).getByRole("button", { name: /^Mode\b/ });
    return {
        between: mode.getBoundingClientRect().left - camera.getBoundingClientRect().right,
        gap: Number.parseFloat(getComputedStyle(bar).columnGap),
    };
}

/**
 * Opens the Views place from the rail.
 * @returns the place.
 */
async function openViewsPlace(): Promise<HTMLElement> {
    await userEvent.click(
        within(screen.getByRole("toolbar", { name: "Places" })).getByRole("button", { name: "Views" }),
    );
    return screen.findByRole("region", { name: "Views place" });
}

describe("the Camera menu", () => {
    it("holds exactly the cameras with their keys, Fit, Fit selection and the two switches; in 2D zoom too", async () => {
        const { session } = await openRing();
        await session.views.save([{ name: "Hub cluster", key: "2" }]);

        let menu = await openCamera();
        assert.deepEqual(rowsOf(menu), [
            { text: "Top7", disabled: false },
            { text: "Bottom", disabled: false },
            { text: "Front1", disabled: false },
            { text: "Side3", disabled: false },
            { text: "Isometric", disabled: false },
            { text: "Hub cluster2", disabled: false },
            { text: "Fit0", disabled: false },
            { text: "Fit selectionSelect something firstF", disabled: true },
            { text: "Auto-rotate9", disabled: false },
            { text: "Focus selected", disabled: false },
        ]);
        await closeMenu();

        await userEvent.keyboard("5");
        await waitFor(() => {
            assert.equal(session.layout.dimension, "2d");
        });
        menu = await openCamera();
        assert.deepEqual(rowsOf(menu), [
            { text: "Top7", disabled: false },
            { text: "Bottom3D only", disabled: true },
            { text: "Front3D only1", disabled: true },
            { text: "Side3D only3", disabled: true },
            { text: "Isometric3D only", disabled: true },
            { text: "Hub clusterSaved in 3D2", disabled: true },
            { text: "Fit0", disabled: false },
            { text: "Fit selectionSelect something firstF", disabled: true },
            { text: "Zoom in", disabled: false },
            { text: "Zoom out", disabled: false },
            { text: "Auto-rotateOnly in 3D9", disabled: true },
            { text: "Focus selected", disabled: false },
        ]);
    });

    it("lists every camera, with no All cameras... row", async () => {
        const { session } = await openRing();
        // Five starting cameras and eight more.
        await session.views.save(Array.from({ length: 8 }, (_, i) => ({ name: `Spot ${String(i + 1)}` })));

        const menu = await openCamera();
        const texts = rowsOf(menu).map(({ text }) => text);
        assert.include(texts, "Spot 8");
        assert.isNull(within(menu).queryByRole("menuitem", { name: "All cameras..." }));
    });

    it("draws no camera rows and no divider when the project has no cameras", async () => {
        const { session } = await openRing();
        await session.views.remove([...session.views.keys()]);

        const menu = await openCamera();
        assert.equal(rowsOf(menu)[0]?.text, "Fit0");
        // The divider left is the one above the switches.
        assert.lengthOf(menu.querySelectorAll(".mantine-Menu-divider"), 1);
    });
});

describe("the camera keys", () => {
    it("binds 1-4 and 6-8 to the camera keys, and 0, 5 and 9 to Fit, the 2D/3D switch and Auto-rotate", () => {
        const holders = new Map<string, string[]>();
        for (const registration of REGISTRATIONS) {
            for (const command of registration.commands) {
                for (const key of command.keys ?? []) {
                    if (/^\d$/.test(key)) {
                        holders.set(key, [...(holders.get(key) ?? []), command.id]);
                    }
                }
            }
        }
        for (const digit of ["1", "2", "3", "4", "6", "7", "8"]) {
            assert.deepEqual(holders.get(digit), [`camera.key-${digit}`], digit);
        }
        assert.deepEqual(holders.get("0"), ["view.fit"]);
        assert.deepEqual(holders.get("5"), ["view.toggle-dimension"]);
        assert.deepEqual(holders.get("9"), ["view.auto-rotate"]);
    });

    it("in 2D, Top's key 7 frames every node of a graph far wider than ten units", async () => {
        const { element, session } = await openRing();
        const more = Array.from({ length: 18 }, (_, i) => `n${String(i)}`);
        await session.data.addNodes(more.map((id) => ({ id })));
        await userEvent.keyboard("5");
        await waitFor(() => {
            assert.equal(session.layout.dimension, "2d");
        });
        await element.waitForSettled();
        await element.waitForStableFrame();
        // Somewhere else first, so the key has to move the camera.
        await element.setCameraState({ mode: "2d", zoom: 4, pan: { x: 30, y: -20 }, rotation: 0.5 });

        await userEvent.keyboard("7");
        await waitFor(() => {
            const now = element.getCameraState();
            assert.closeTo(now.zoom ?? Number.NaN, element.resolveCameraPreset("Top").zoom ?? Number.NaN, 1e-6);
            assert.closeTo(now.rotation ?? Number.NaN, 0, 1e-9);
        });
        await element.waitForStableFrame();

        const box = element.getBoundingClientRect();
        for (const id of [...IDS, ...more]) {
            const at = element.nodeScreenPosition(id);
            assert.isTrue(at?.visible, `${id} is drawn on the canvas`);
            assert.isTrue(
                (at?.x ?? -1) >= 0 && (at?.x ?? -1) <= box.width && (at?.y ?? -1) >= 0 && (at?.y ?? -1) <= box.height,
                `${id} is inside the view`,
            );
        }
    });

    it("flies to the camera on a digit, does nothing on a free digit or while typing, and shows each key", async () => {
        const { element, session } = await openRing();

        await userEvent.keyboard("7");
        await waitFor(() => {
            assertAt(element, element.resolveCameraPreset("Top"));
        });
        await element.waitForStableFrame();

        // No camera holds 2: the camera stays and nothing is said.
        const before = element.getCameraState();
        await userEvent.keyboard("2");
        await element.waitForStableFrame();
        assertAt(element, before);

        // Digits typed into a camera's name stay in the name.
        const place = await openViewsPlace();
        await userEvent.click(within(place).getByRole("button", { name: "Rename Isometric" }));
        const field = await within(place).findByRole("textbox", { name: "Rename Isometric" });
        await userEvent.clear(field);
        await userEvent.type(field, "Hub 139{Enter}");
        await waitFor(() => {
            assert.isTrue(session.views.has("Hub 139"));
        });
        await element.waitForStableFrame();
        assertAt(element, before);

        // The key is printed on the card's Go button tooltip, on the menu row and in Quick actions.
        const menu = await openCamera();
        assert.equal(within(menu).getByRole("menuitem", { name: /^Top/ }).getAttribute("aria-keyshortcuts"), "7");
        await closeMenu();
        await userEvent.keyboard("{Control>}k{/Control}");
        await userEvent.type(await screen.findByPlaceholderText("Search commands"), "Side");
        const row = await screen.findByRole("option", { name: /^Side\b/ });
        assert.include(row.textContent, "3");
        assert.isNull(screen.queryByRole("option", { name: /^Go to the camera on/ }));
    });
});

describe("the toolbar while a tour plays", () => {
    it("keeps Camera and Mode one flex gap apart, turns the Camera tool into Stop, and ends the tour on it or Escape", async () => {
        const { element, session } = await openRing();
        // A hold far longer than the test, so only a stop ends it.
        await session.tours.save([
            { name: "Walk", tour: { stops: [{ view: "Top", hold: 600_000 }, { view: "Side" }] } },
        ]);
        const ended: string[] = [];
        element.addEventListener("tour-ended", (event) => {
            ended.push(event.detail.reason);
        });

        let { between, gap } = gapToMode();
        assert.isAbove(gap, 0);
        assert.closeTo(between, gap, 0.5, "no tour: one flex gap");

        const place = await openViewsPlace();
        const play = async (): Promise<HTMLElement> => {
            await userEvent.click(within(place).getByRole("button", { name: "Play Walk" }));
            return within(toolbar()).findByRole("button", { name: "Stop tour" });
        };

        const stop = await play();
        assert.isNull(within(toolbar()).queryByRole("button", { name: "Camera" }), "Stop takes Camera's place");
        assert.equal(stop.getAttribute("aria-keyshortcuts"), "Escape");
        ({ between, gap } = gapToMode());
        assert.closeTo(between, gap, 0.5, "a tour playing: still one flex gap");
        await userEvent.click(stop);
        await waitFor(() => {
            assert.deepEqual(ended, ["cancelled"]);
            assert.isNotNull(within(toolbar()).queryByRole("button", { name: "Camera" }));
        });

        await play();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.deepEqual(ended, ["cancelled", "cancelled"]);
            assert.isNull(within(toolbar()).queryByRole("button", { name: "Stop tour" }));
        });
    });
});
