/**
 * The timeline on the REAL graphty-element, driven by real input: the Time section designates the
 * time field, the dock's brush is dragged with the mouse, Play and Pause run the element's
 * playback, and the step buttons and keys move the window. Every assertion reads the element.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { dragAcross } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** The office email sample: 48 people, 2,102 emails, each edge with its `sent` time in 2025. */
const OFFICE_EMAIL = `${import.meta.env.BASE_URL}samples/office-email.json`;

/**
 * Renders the workspace on the Data place and loads the office email sample.
 * @returns the session and the chrome store.
 */
async function openEmail(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Office email", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ config: { url: OFFICE_EMAIL }, name: "Office email" });
    return { session, store };
}

/**
 * Picks `sent` as the time field in the Time section, as the reader does.
 * @param session - the element's session.
 * @returns the dock.
 */
async function designateSent(session: GraphSession): Promise<HTMLElement> {
    const place = within(screen.getByRole("region", { name: "Data place" }));
    await userEvent.click(await place.findByRole("combobox", { name: "Time field" }));
    await userEvent.click(await screen.findByRole("option", { name: "sent" }));
    await waitFor(() => {
        assert.deepEqual(session.time.field, { edges: { start: "sent" } });
    });
    return screen.findByRole("region", { name: "Timeline" });
}

describe("the timeline on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("designates the time field from the Time section, and the dock shows the data's span", async () => {
        const { session } = await openEmail();
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));

        const dock = await designateSent(session);

        // The column now measures time, and the dock reads the element's extent: all of 2025's first half.
        const extent = session.time.extent();
        assert.isNotNull(extent);
        assert.equal(extent?.edges.timed, 2102);
        await waitFor(() => {
            assert.equal(within(dock).getByTestId("time-readout").textContent, "Jan 1, 2025 - Jun 30, 2025");
        });
        assert.isNull(session.time.current, "no window until the reader makes one");
        // The step back and forward keys are listed as the element's controls.
        within(dock).getByRole("button", { name: "Play" });
        within(dock).getByRole("slider", { name: "Window end" });
    });

    it("dragging the brush's end sets the element's window, as one undoable step", async () => {
        const { session } = await openEmail();
        const dock = await designateSent(session);
        const extent = session.time.extent();
        const before = session.history.position;

        const end = within(dock).getByRole("slider", { name: "Window end" });
        const track = end.parentElement ?? end;
        await dragAcross(end, -track.getBoundingClientRect().width / 2);

        await waitFor(() => {
            const window = session.time.current;
            assert.isNotNull(window);
            assert.isBelow(Number(window?.to), Number(extent?.to));
            assert.isAbove(Number(window?.to), Number(extent?.from));
        });
        // One gesture, one step.
        assert.equal(session.history.position, before + 1);
        const { visibleEdges, totalEdges } = session.visibility.summary;
        assert.isBelow(visibleEdges, totalEdges);
        // The header chip names the window.
        await screen.findByRole("button", { name: /^Time: / });
    });

    it("Play advances the window until Pause, and one Undo returns to where it started", async () => {
        const { session, store } = await openEmail();
        const dock = await designateSent(session);
        // A week's window at the start of the data, from the Step menu.
        await userEvent.click(await screen.findByRole("combobox", { name: "Step" }));
        await userEvent.click(await screen.findByRole("option", { name: "Week" }));
        await waitFor(() => {
            assert.equal(session.time.current?.step, "week");
        });
        const start = Number(session.time.current?.from);
        const { position } = session.history;
        // The fastest speed.
        await userEvent.click(screen.getByText("4x"));
        assert.equal(store.get().timeSpeed, 4);

        await userEvent.click(within(dock).getByRole("button", { name: "Play" }));
        await waitFor(
            () => {
                assert.isTrue(session.time.playing);
                assert.isAbove(Number(session.time.current?.from), start);
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.click(within(dock).getByRole("button", { name: "Pause" }));
        assert.isFalse(session.time.playing);
        const paused = Number(session.time.current?.from);
        within(dock).getByRole("button", { name: "Play" });
        assert.equal(Number(session.time.current?.from), paused);

        // Every step of the play is one history step.
        assert.equal(session.history.position, position + 1);
        await session.undo();
        assert.equal(Number(session.time.current?.from), start);
    });

    it("the step buttons and the comma and period keys move the window one step", async () => {
        const { session } = await openEmail();
        const dock = await designateSent(session);
        await userEvent.click(await screen.findByRole("combobox", { name: "Step" }));
        await userEvent.click(await screen.findByRole("option", { name: "Day" }));
        await waitFor(() => {
            assert.equal(session.time.current?.step, "day");
        });
        const start = Number(session.time.current?.from);
        const DAY = 86_400_000;

        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.equal(Number(session.time.current?.from), start + DAY);
        });
        await waitFor(() => {
            assert.equal(within(dock).getByTestId("time-readout").textContent, "Jan 2, 2025");
        });

        await userEvent.keyboard(".");
        await waitFor(() => {
            assert.equal(Number(session.time.current?.from), start + 2 * DAY);
        });
        await userEvent.keyboard(",");
        await waitFor(() => {
            assert.equal(Number(session.time.current?.from), start + DAY);
        });
        await userEvent.click(within(dock).getByRole("button", { name: "Step back" }));
        await waitFor(() => {
            assert.equal(Number(session.time.current?.from), start);
        });
    });
});
