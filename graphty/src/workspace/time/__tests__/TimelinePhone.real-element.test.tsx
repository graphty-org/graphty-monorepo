/**
 * The timeline dock on a phone, on the REAL graphty-element, by real touch: one row over a
 * sparkline, every target big enough for a finger, and a bottom sheet that holds the brush. Every
 * assertion reads the element or what the reader sees.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { onTouchScreen, pinchOver, swipeAcross, tap } from "../../../test/real-pointer";
import { siteFeatures } from "../../../test/siteFeatures";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The office email sample: 48 people, 2,102 emails, each edge with its `sent` time in 2025. */
const OFFICE_EMAIL = `${import.meta.env.BASE_URL}samples/office-email.json`;
/** The touch guideline's smallest target. */
const TARGET = 44;
/** The dock's whole height on a phone: the 44 px row and the 32 px sparkline. */
const PHONE_DOCK = TARGET + 32;

/**
 * Renders the workspace on the sample, with the timeline switched on for when a field is designated.
 * @returns the session.
 */
async function mount(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Phone", id: 1 }, place: "graph", timelineOpen: true });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        if (found === undefined) {
            throw new Error("the element never came up");
        }
        return found;
    });
    await session.data.import({ config: { url: OFFICE_EMAIL }, name: "Sample" });
    return session;
}

/**
 * Opens the dock on a time field and sets a window in the middle of the data.
 * @returns the session and the dock.
 */
async function openDock(): Promise<{ session: GraphSession; dock: HTMLElement }> {
    const session = await mount();
    await session.time.setField({ edges: { start: "sent" } });
    await session.time.ready;
    const dock = await screen.findByRole("region", { name: "Timeline" });
    const extent = session.time.extent();
    if (extent === null) {
        throw new Error("no extent");
    }
    const span = extent.to - extent.from;
    await act(async () => {
        await session.time.window({
            from: Math.round(extent.from + span * 0.4),
            to: Math.round(extent.from + span * 0.6),
        });
    });
    return { session, dock };
}

/**
 * Taps the readout and waits for the sheet to finish sliding up, so a finger lands where it shows.
 * @param dock - the dock.
 * @returns the sheet.
 */
async function openSheet(dock: HTMLElement): Promise<HTMLElement> {
    await tap(within(dock).getByTestId("time-readout"));
    const sheet = await screen.findByRole("dialog", { name: "Time window" });
    await waitFor(() => {
        assert.equal(sheet.getBoundingClientRect().bottom, window.innerHeight);
    });
    return sheet;
}

/**
 * The window's start.
 * @param session - the session.
 * @returns its start as a number.
 */
function windowStart(session: GraphSession): number {
    return Number(session.time.current?.from);
}

/**
 * Lists what in a surface measures under a finger's size. A thumb's target is its invisible
 * `::after`, which the theme grows under a coarse pointer.
 * @param surface - the surface.
 * @returns the names of the targets too small.
 */
function smallTargets(surface: HTMLElement): string[] {
    const targets = surface.querySelectorAll<HTMLElement>("button, input:not([type=hidden]), [role=slider]");
    return [...targets].flatMap((target) => {
        const box = target.getBoundingClientRect();
        const after = getComputedStyle(target, "::after");
        const thumb = after.content !== "none" && target.getAttribute("role") === "slider";
        const width = thumb ? Number.parseFloat(after.width) : box.width;
        const height = thumb ? Number.parseFloat(after.height) : box.height;
        const name = target.getAttribute("aria-label") ?? target.textContent;
        return width >= TARGET && height >= TARGET ? [] : [`${name}: ${String(width)} x ${String(height)}`];
    });
}

describe("the timeline dock on a phone", () => {
    beforeAll(async () => {
        await siteFeatures(["timeline"]);
    });
    beforeEach(async () => {
        await page.viewport(390, 844);
    });

    it("is one row over the sparkline, and no histogram", async () => {
        const { dock } = await openDock();
        assert.isAtMost(dock.getBoundingClientRect().height, PHONE_DOCK);
        assert.isNotNull(within(dock).queryByTestId("sparkline-row"));
        assert.isNull(within(dock).queryByTestId("histogram-plot"));
        const { right } = dock.getBoundingClientRect();
        assert.isAtMost(within(dock).getByTestId("time-readout").getBoundingClientRect().right, right);
    });

    it("moves the side panels aside for the canvas until the timeline closes", async () => {
        const { dock } = await openDock();
        assert.isAbove(dock.getBoundingClientRect().width, 300);
        assert.isAbove(screen.getByTestId("canvas").getBoundingClientRect().width, 300);
        assert.isNull(screen.queryByRole("complementary", { name: "Left panel" }));

        await tap(screen.getByRole("button", { name: "Timeline" }));

        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
            assert.isNotNull(screen.queryByRole("complementary", { name: "Left panel" }));
        });
    });

    it("gives every target a finger's size, in the row and in the sheet", async () => {
        const { dock } = await openDock();
        await onTouchScreen(async () => {
            assert.deepEqual(smallTargets(dock), []);
            await userEvent.click(within(dock).getByTestId("time-readout"));
            const sheet = await screen.findByRole("dialog", { name: "Time window" });
            await within(sheet).findByRole("slider", { name: "Window" });
            assert.deepEqual(smallTargets(sheet), []);
        });
    });

    it("steps and plays from the row", async () => {
        const { session, dock } = await openDock();
        const start = windowStart(session);

        await tap(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.isAbove(windowStart(session), start);
        });
        const stepped = windowStart(session);
        await tap(within(dock).getByRole("button", { name: "Step back" }));
        await waitFor(() => {
            assert.isBelow(windowStart(session), stepped);
        });

        await tap(within(dock).getByRole("button", { name: "Play" }));
        await waitFor(() => {
            assert.isTrue(session.time.playing);
        });
        await tap(within(dock).getByRole("button", { name: "Pause" }));
        await waitFor(() => {
            assert.isFalse(session.time.playing);
        });
    });

    it("opens the sheet from the readout, paused, with the brush and the fields", async () => {
        const { session, dock } = await openDock();
        await tap(within(dock).getByRole("button", { name: "Play" }));
        await waitFor(() => {
            assert.isTrue(session.time.playing);
        });

        const surface = await openSheet(dock);
        const sheet = within(surface);

        assert.isFalse(session.time.playing, "nothing in the sheet could stop it");
        assert.isBelow(surface.getBoundingClientRect().height, window.innerHeight / 2, "the graph stays in view");
        assert.isNotNull(await sheet.findByTestId("histogram-plot"));
        assert.isNotNull(sheet.getByRole("slider", { name: "Window" }));
        assert.isNotNull(sheet.getByRole("textbox", { name: "From" }));
        assert.isNotNull(sheet.getByRole("textbox", { name: "To" }));
        assert.isNotNull(sheet.getByRole("button", { name: "Show all time" }));
    });

    it("moves the window with the brush in the sheet, one history step a drag, and keeps it on close", async () => {
        const { session, dock } = await openDock();
        const sheet = within(await openSheet(dock));
        const start = windowStart(session);
        const before = session.history.position;

        await swipeAcross(await sheet.findByRole("slider", { name: "Window" }), 30);

        await waitFor(() => {
            assert.isAbove(windowStart(session), start);
            assert.equal(session.history.position, before + 1);
        });
        const moved = windowStart(session);
        const end = Number(session.time.current?.to);

        await swipeAcross(sheet.getByRole("slider", { name: "Window end" }), -20);

        await waitFor(() => {
            assert.isBelow(Number(session.time.current?.to), end);
            assert.equal(session.history.position, before + 2);
        });
        const to = Number(session.time.current?.to);

        await tap(sheet.getByRole("button", { name: "Close Time window" }));

        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Time window" }));
        });
        assert.equal(windowStart(session), moved);
        assert.equal(Number(session.time.current?.to), to);
        assert.equal(session.history.position, before + 2);
    });

    it("zooms the sheet's bars with two fingers, and shows the whole timeline again from its button", async () => {
        const { dock } = await openDock();
        const sheet = within(await openSheet(dock));
        const body = await sheet.findByRole("slider", { name: "Window" });
        const span = Number(body.getAttribute("aria-valuemax")) - Number(body.getAttribute("aria-valuemin"));

        await pinchOver(sheet.getByTestId("histogram-plot"), 60);

        const reset = await sheet.findByRole("button", { name: "Show whole timeline" });
        await tap(reset);
        await waitFor(() => {
            const now = sheet.getByRole("slider", { name: "Window" });
            assert.equal(Number(now.getAttribute("aria-valuemax")) - Number(now.getAttribute("aria-valuemin")), span);
        });
    });

    it("sets the window from the sheet's fields, and closes", async () => {
        const { session, dock } = await openDock();
        const sheet = within(await openSheet(dock));
        const first = await sheet.findByRole("textbox", { name: "From" });
        const last = sheet.getByRole("textbox", { name: "To" });
        const from = session.time.parse("2025-03-01", { timeZone: session.time.timeZone });

        await userEvent.clear(first);
        await userEvent.type(first, "2025-03-01");
        await userEvent.clear(last);
        await userEvent.type(last, "2025-03-10{Enter}");

        await waitFor(() => {
            assert.equal(windowStart(session), from);
            assert.isNull(screen.queryByRole("dialog", { name: "Time window" }));
        });
    });

    it("keeps the full dock on an iPad", async () => {
        await page.viewport(820, 1180);
        const { dock } = await openDock();
        assert.isNotNull(within(dock).queryByTestId("histogram-plot"));
        assert.isNull(within(dock).queryByTestId("sparkline-row"));
    });
});

describe("the timeline dock on a phone with the experiment off", () => {
    beforeAll(async () => {
        await siteFeatures([]);
        await page.viewport(390, 844);
    });

    it("shows no dock and no sheet", async () => {
        const session = await mount();
        await waitFor(() => {
            assert.isAbove(session.visibility.summary.visibleEdges, 0);
        });
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        assert.isNull(screen.queryByRole("button", { name: "Timeline" }));
        assert.isNull(screen.queryByRole("dialog", { name: "Time window" }));
    });
});
