/**
 * The timeline strip on the REAL graphty-element (data prototype spec section 3.10, acceptance
 * flow 9's timeline steps): with the auth log's `time` column given the time role, the clock button
 * appears; it opens the strip on a one-day window; period, comma, the step buttons and Play move
 * the window and the node and edge counts change; a filter still applies inside the window; the
 * gear's Nodes follow edges switch writes the element's window; closing the strip clears it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { addTimeStep as addStep, type GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { PROTOTYPE_SAMPLES, sampleUrl } from "../../start/samples";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { boundsOf, numberSizes, readout } from "../commands";

/** A hang guard for the element coming up and loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** One auth log row: when, and whether the login failed. */
interface Row {
    readonly at: number;
    readonly result: string;
}

/**
 * The auth log as the app serves it.
 * @returns its text.
 */
async function authLog(): Promise<string> {
    const sample = PROTOTYPE_SAMPLES.find((each) => each.path === "events/auth-log.csv");
    if (sample === undefined) {
        throw new Error("no auth-log.csv fixture");
    }
    return (await fetch(sampleUrl(sample))).text();
}

/**
 * The log's rows, read straight from the file, to count what a window should show.
 * @param text - the CSV.
 * @returns the rows.
 */
function rowsOf(text: string): Row[] {
    return text
        .trim()
        .split("\n")
        .slice(1)
        .map((line) => {
            const [time, , , , result] = line.split(",");
            return { at: Date.parse(time), result: result.trim() };
        });
}

/**
 * Renders the workspace on the Data place, loads the auth log as edges from user to host, and
 * waits for the session.
 * @param text - the log.
 * @returns the session.
 */
async function openLog(text: string): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Auth", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
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
    const draft = await session.data.prepare({ config: { file: new File([text], "auth-log.csv") } });
    await draft.load({ mapping: { rowsAre: "edges", source: "user", target: "host" } });
    return session;
}

/**
 * The edges the element shows now.
 * @param session - the session.
 * @returns the visible edge count.
 */
const shownEdges = (session: GraphSession): number => session.visibility.summary.visibleEdges;

/**
 * The window's start, in ms.
 * @param session - the session.
 * @returns the start, or NaN with no window.
 */
const windowStart = (session: GraphSession): number => boundsOf(session.visibility.window)?.from ?? Number.NaN;

describe("the timeline's steps and words", () => {
    it("offers window sizes of about 1/50 to 1/5 of a number range", () => {
        assert.deepEqual(numberSizes(0, 100), [2, 5, 10, 20]);
        assert.deepEqual(numberSizes(0, 3), [1]);
    });

    it("reads a one-day window as one date and a week as its first and last day", () => {
        const day = Date.UTC(2024, 2, 1);
        assert.strictEqual(readout(day, addStep(day, "day", 1), "date"), "2024-03-01");
        assert.strictEqual(readout(day, addStep(day, "week", 1), "date"), "2024-03-01 .. 2024-03-07");
        assert.strictEqual(readout(day, addStep(day, "hour", 1), "date"), "2024-03-01 00:00 .. 2024-03-01 00:59");
        assert.strictEqual(readout(1000, 2000, "number"), "1,000 .. 2,000");
    });
});

describe("the timeline strip on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("opens from the clock, steps and plays a one-day window, and filters still apply inside it (flow 9)", async () => {
        const text = await authLog();
        const rows = rowsOf(text);
        const session = await openLog(text);
        const toolbar = await screen.findByRole("toolbar", { name: "Canvas tools" }, { timeout: TIMEOUT_MS });
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, rows.length);
        });
        // No time role yet: no clock.
        assert.isNull(within(toolbar).queryByRole("button", { name: "Timeline" }));

        // Fields: Time = time, on the edges.
        const fields = await screen.findByRole("group", { name: "Fields" }, { timeout: TIMEOUT_MS });
        await userEvent.click(within(fields).getAllByRole("combobox", { name: "Time" }).at(-1) as HTMLElement);
        await userEvent.click(await screen.findByRole("option", { name: "time" }));
        const clock = await within(toolbar).findByRole("button", { name: "Timeline" }, { timeout: TIMEOUT_MS });

        await userEvent.click(clock);
        const strip = await screen.findByRole("region", { name: "Timeline" });
        const first = Math.floor(Math.min(...rows.map((r) => r.at)) / 86_400_000) * 86_400_000;
        const inDay = (from: number, keep: (row: Row) => boolean = () => true): number =>
            rows.filter((r) => r.at >= from && r.at < addStep(from, "day", 1) && keep(r)).length;
        await waitFor(() => {
            assert.strictEqual(windowStart(session), first);
            assert.strictEqual(session.visibility.window?.nodes, "follow-edges");
            assert.strictEqual(shownEdges(session), inDay(first));
        });
        assert.strictEqual(
            within(strip).getByLabelText("Window").textContent,
            readout(first, addStep(first, "day", 1), "date"),
        );
        const edgeChip = (): string => strip.querySelector('[data-kind="edge"]')?.textContent ?? "";
        await waitFor(() => {
            assert.include(edgeChip(), `${String(inDay(first))} of ${String(rows.length)}`);
        });
        const firstNodes = session.visibility.summary.visibleNodes;
        assert.isBelow(firstNodes, session.visibility.summary.totalNodes);

        // Period steps forward one day, comma steps back.
        const second = addStep(first, "day", 1);
        await userEvent.keyboard(".");
        await waitFor(() => {
            assert.strictEqual(windowStart(session), second);
            assert.strictEqual(shownEdges(session), inDay(second));
            assert.include(edgeChip(), `${String(inDay(second))} of`);
        });
        await userEvent.keyboard(",");
        await waitFor(() => {
            assert.strictEqual(windowStart(session), first);
        });

        // The step button does what period does.
        await userEvent.click(within(strip).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.strictEqual(windowStart(session), second);
        });

        // Play moves the window on by itself; Pause stops it.
        await userEvent.click(within(strip).getByRole("button", { name: "Play" }));
        await waitFor(
            () => {
                assert.isAtLeast(windowStart(session), addStep(second, "day", 2));
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.click(within(strip).getByRole("button", { name: "Pause" }));
        await userEvent.keyboard(",");

        // A filter on failed logins still applies inside the window: one mask.
        const at = windowStart(session);
        await session.visibility.setSteps([
            { id: "f1", on: true, rule: { kind: "edges", where: "data.result == 'fail'" } },
        ]);
        await waitFor(() => {
            assert.strictEqual(
                shownEdges(session),
                inDay(at, (r) => r.result === "fail"),
            );
            assert.isBelow(shownEdges(session), inDay(at));
        });
        await userEvent.keyboard(".");
        await waitFor(() => {
            const next = addStep(at, "day", 1);
            assert.strictEqual(windowStart(session), next);
            assert.strictEqual(
                shownEdges(session),
                inDay(next, (r) => r.result === "fail"),
            );
        });
        await session.visibility.setSteps([]);

        // The window size widens it to a week.
        await userEvent.click(within(strip).getByRole("combobox", { name: "Window size" }));
        await userEvent.click(await screen.findByRole("option", { name: "1 week" }));
        await waitFor(() => {
            const bounds = boundsOf(session.visibility.window);
            assert.strictEqual(bounds?.to, addStep(bounds?.from ?? 0, "week", 1));
            assert.strictEqual(session.visibility.window?.step, "week");
        });

        // The gear: nodes keep their own time instead of following their edges.
        await userEvent.click(within(strip).getByRole("button", { name: "Timeline settings" }));
        await userEvent.click(await screen.findByRole("switch", { name: "Nodes follow edges" }));
        await waitFor(() => {
            assert.strictEqual(session.visibility.window?.nodes, "own");
        });
        await userEvent.keyboard("{Escape}");

        // Closing the strip clears the window: everything shows again.
        await userEvent.click(clock);
        await waitFor(() => {
            assert.isNull(session.visibility.window);
            assert.strictEqual(shownEdges(session), rows.length);
            assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        });
    });
});
