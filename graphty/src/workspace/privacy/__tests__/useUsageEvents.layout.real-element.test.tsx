/**
 * Usage counts for the layout form, a filter slider and timeline playback, on the REAL
 * graphty-element and by real input (design/graphty/usage-analytics.md, section 4.2). Each PostHog
 * mode is a recording stand-in behind `cleanPostHogEvent`.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import {
    onUsageEvent,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setPostHogClientForTests,
    startPageCounts,
} from "../../../lib/analytics";
import { columnVerb } from "../../../test/column-header";
import { dragTo } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { firstOnPage, type Recorded, recordInto, TEST_ANALYTICS } from "../../../test/usage-recorders";
import { GRAPH_FILE_GML } from "../../data-place/fixtures";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** What the anonymous mode's stand-in recorded, after cleaning. */
const anonymous: Recorded[] = [];
const posthog: { event: string; properties: Record<string, unknown> }[] = [];
let undoPostHog: () => void = () => undefined;

/**
 * The PostHog properties of every event of one name.
 * @param name - the event name.
 * @returns them, in order.
 */
function captured(name: string): Record<string, unknown>[] {
    return posthog.filter((each) => each.event === name).map((each) => each.properties);
}

/**
 * Settles at the next usage event of a name. No deadline of its own.
 * @param name - the event name.
 * @returns its properties.
 */
function next(name: string): Promise<Readonly<Record<string, unknown>>> {
    return new Promise((resolve) => {
        const off = onUsageEvent((each, props) => {
            if (each === name) {
                off();
                resolve(props);
            }
        });
    });
}

/**
 * Renders the workspace on a project and waits for its element's session.
 * @param place - the place it opens on.
 * @returns the session and the store.
 */
async function openProject(place: "graph" | "data"): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return { session, store };
}

/**
 * The project with the small GML graph (8 nodes, 9 edges, an edge `value` column) loaded.
 * @param place - the place it opens on.
 * @returns the session.
 */
async function withGraph(place: "graph" | "data"): Promise<GraphSession> {
    const { session } = await openProject(place);
    await session.data.import({ type: "gml", name: "SECRET_GRAPH.gml", config: { data: GRAPH_FILE_GML } });
    return session;
}

/**
 * The open selection workspace a new filter card is edited in.
 * @returns it.
 */
function selectionWorkspace(): HTMLElement {
    const found = document.querySelector<HTMLElement>(".sel-ws");
    assert.isNotNull(found, "the selection workspace is open");
    return found;
}

describe("usage counts for layout, filters and the timeline on the real element", () => {
    beforeEach(async () => {
        await page.viewport(1440, 900);
        resetAnalyticsForTests();
        anonymous.length = 0;
        posthog.length = 0;
        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: false, gpc: false }),
        });
        recordInto(anonymous, "anonymous");
        startPageCounts({ site: "production", features: [], analytics: TEST_ANALYTICS });
        undoPostHog = setPostHogClientForTests({
            capture: (event, properties) => {
                posthog.push({ event, properties: { ...properties } });
                return undefined;
            },
        });
    });

    afterEach(() => {
        undoPostHog();
        resetAnalyticsForTests();
        setAnalyticsCallsForTests();
        localStorage.removeItem("graphty.visits.v1");
    });

    it("sends one layout_changed for a layout applied in the form, no layout.set action, and nothing on undo or redo", async () => {
        const session = await withGraph("graph");
        const actionsBefore = captured("graph_action").length;
        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        const popover = await screen.findByRole("dialog", { name: "Layout" });
        await userEvent.click(within(popover).getByRole("option", { name: /^Grid/ }));
        const changed = next("layout_changed");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        assert.deepEqual({ ...(await changed) }, { layout: "grid", outcome: "applied" });
        assert.strictEqual(session.layout.id, "grid");
        assert.deepEqual(
            captured("layout_changed").map(({ layout, outcome }) => ({ layout, outcome })),
            [{ layout: "grid", outcome: "applied" }],
        );
        assert.deepEqual(firstOnPage([...anonymous, ...posthog], "layout_changed"), [
            { layout: "grid", outcome: "applied" },
        ]);
        assert.notInclude(
            captured("graph_action").map((each) => each.op),
            "layout.set",
        );
        const actionsAfterApply = captured("graph_action").length;
        assert.strictEqual(actionsAfterApply, actionsBefore, "a layout applied is no graph action");

        await userEvent.keyboard("{Escape}");
        await userEvent.click(screen.getByRole("button", { name: /^Undo/ }));
        await waitFor(() => {
            assert.notStrictEqual(session.layout.id, "grid", "the undo took the layout back");
        });
        await userEvent.click(screen.getByRole("button", { name: /^Redo/ }));
        await waitFor(() => {
            assert.strictEqual(session.layout.id, "grid", "the redo put it back");
        });
        assert.lengthOf(captured("layout_changed"), 1, "undo and redo are not layouts the reader applied");
        assert.lengthOf(captured("graph_action"), actionsAfterApply, "undo and redo send no graph action");
        assert.notInclude(JSON.stringify({ anonymous, posthog }), "SECRET_GRAPH");
    });

    it("sends one graph action for a filter slider dragged by the reader", async () => {
        const session = await withGraph("data");
        await columnVerb("edge", "value", "Filter to...");
        const thumb = await screen.findByRole("slider", { name: /^value range end$/ });
        const before = captured("graph_action").length;
        const box = thumb.getBoundingClientRect();
        // A drag of many moves, from the end leftwards: the scale's values pass under the pointer.
        const endBefore = Number(thumb.getAttribute("aria-valuenow"));
        await dragTo(thumb, { x: box.left - 60, y: box.top + box.height / 2 });
        await waitFor(() => {
            assert.isBelow(Number(thumb.getAttribute("aria-valuenow")), endBefore, "the drag moved the end");
        });
        const action = next("graph_action");
        await userEvent.click(within(selectionWorkspace()).getByRole("button", { name: "Done" }));
        assert.strictEqual((await action).op, "visibility.conditions");
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
        assert.deepEqual(
            captured("graph_action")
                .slice(before)
                .map((each) => each.op),
            ["visibility.conditions"],
            "one drag, one graph action",
        );
    });

    it("sends no algorithm_run and no window or playback graph action while the timeline plays", async () => {
        const { session } = await openProject("graph");
        const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"];
        const csv = `source,target,sent\n${days.map((day, i) => `N${String(i)},N${String(i + 1)},${day}`).join("\n")}\n`;
        await session.data.import({ type: "csv", name: "SECRET_MAIL.csv", config: { data: csv } });
        await session.time.setField({ edges: { start: "sent" } });
        await session.time.ready;
        await session.time.setSettings({ step: "day", results: "rerun" });
        const day = 86_400_000;
        const start = Date.UTC(2026, 0, 1);
        await session.time.window({ from: start, to: start + day, step: "day" });
        const ran = next("algorithm_run");
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        await ran;
        assert.lengthOf(captured("algorithm_run"), 1);
        const actionsBefore = captured("graph_action").length;

        // Not vacuous: the play moves the window, and the timeline re-runs the run as it does.
        const reruns: unknown[] = [];
        const offRerun = session.on("run:changed", (change) => {
            if (change.phase === "end" && change.trigger === "timeline") {
                reruns.push(change);
            }
        });
        let ended = false;
        const offEnd = session.on("time:end", () => {
            ended = true;
        });
        await userEvent.click(await screen.findByRole("button", { name: "Timeline" }));
        const dock = await screen.findByRole("region", { name: "Timeline" });
        await userEvent.click(within(dock).getByRole("button", { name: "Play" }));
        await waitFor(() => {
            assert.isTrue(ended, "the play reached the end of the data");
            assert.isFalse(session.time.playing);
        });
        offRerun();
        offEnd();
        assert.isNotEmpty(reruns, "the timeline re-ran the run");
        assert.lengthOf(captured("algorithm_run"), 1, "a timeline re-run is not the reader's run");
        const ops = captured("graph_action")
            .slice(actionsBefore)
            .map((each) => each.op);
        assert.notInclude(ops, "visibility.window");
        assert.notInclude(ops, "visibility.playback");
        assert.notInclude(JSON.stringify({ anonymous, posthog }), "SECRET_MAIL");
    });
});
