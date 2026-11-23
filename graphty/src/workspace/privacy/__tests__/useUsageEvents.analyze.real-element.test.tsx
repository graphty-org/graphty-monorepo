/**
 * Usage counts from Analyze on the REAL graphty-element (design/graphty/usage-analytics.md, sections
 * 4.2 and 4.3), every step by real input: a measure run from the Analyze popover, the reader's
 * re-coloring by its result, Undo and Redo from the header's buttons and from Control+Z and
 * Control+Shift+Z, and a run that fails. Each step waits on the event that settles it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SessionEventMap } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import {
    onUsageEvent,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setPostHogClientForTests,
    startPageCounts,
} from "../../../lib/analytics";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { firstOnPage, type Recorded, recordInto, TEST_ANALYTICS } from "../../../test/usage-recorders";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** What the anonymous mode's stand-in recorded, after cleaning. */
const anonymous: Recorded[] = [];
/** What reached the PostHog stand-in, after cleaning. */
const posthog: { event: string; properties: Record<string, unknown> }[] = [];
let undoPostHog: () => void = () => undefined;

/**
 * The events of one name each recorder got.
 * @param name - the event name.
 * @returns the own properties of its first occurrence on the page (in either mode), and every
 * properties the shared mode's stand-in got.
 */
function sent(name: string): { counted: unknown[]; posthog: Record<string, unknown>[] } {
    return {
        counted: firstOnPage([...anonymous, ...posthog], name),
        posthog: posthog.filter((each) => each.event === name).map((each) => each.properties),
    };
}

/**
 * Settles at the next usage event of a name, with its properties. No deadline of its own.
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
 * Settles when the session's history next moves for a reason.
 * @param session - the session.
 * @param reason - "undo" or "redo".
 * @returns a promise of that move.
 */
function historyMoves(session: GraphSession, reason: SessionEventMap["history:changed"]["reason"]): Promise<void> {
    return new Promise((resolve) => {
        const off = session.on("history:changed", (change) => {
            if (change.reason === reason) {
                off();
                resolve();
            }
        });
    });
}

/**
 * Les Miserables in a fresh project, its Data place's Calculated tab showing.
 * @returns the project's session.
 */
async function lesMisProject(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" })} />);
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
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await userEvent.click(await screen.findByRole("tab", { name: "Calculated" }));
    return session;
}

/**
 * Opens Analyze from the Data place and picks one algorithm by its name.
 * @param name - the algorithm's name, as the list shows it.
 */
async function pickInAnalyze(name: string): Promise<void> {
    const place = screen.getByRole("region", { name: "Data place" });
    await userEvent.click(await within(place).findByRole("button", { name: /^Analyze/ }));
    await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), name);
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${name}`) }));
}

/**
 * How many of each event PostHog has got so far.
 * @returns the counts of the events history must never add.
 */
function workCounts(): { runs: number; actions: number; styles: number } {
    return {
        runs: sent("algorithm_run").posthog.length,
        actions: sent("graph_action").posthog.length,
        styles: sent("style_changed").posthog.length,
    };
}

// No experiments, in both test configurations.
withFeatures([]);

describe("usage counts from Analyze", () => {
    beforeEach(async () => {
        // Wide enough that the canvas and its toolbar show beside the panels, as on a desktop.
        await page.viewport(1440, 900);
        resetAnalyticsForTests();
        anonymous.length = 0;
        posthog.length = 0;
        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: false, gpc: false }),
        });
        recordInto(anonymous, "anonymous");
        startPageCounts({
            site: "production",
            features: [],
            analytics: TEST_ANALYTICS,
        });
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
    });

    it("counts a run, the reader's re-coloring by it, and none of Undo and Redo's replays, by buttons and keys", async () => {
        const session = await lesMisProject();
        // The reader's own colors, so PageRank's suggested color is held back and Show anyway is
        // the reader re-coloring by the result.
        await session.styles.add({
            name: "My gray",
            selector: { match: "everything" },
            set: { "node.color": "#888888" },
        });

        await pickInAnalyze("PageRank");
        const ran = next("algorithm_run");
        await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));
        assert.deepEqual({ ...(await ran) }, { algorithm: "pagerank", outcome: "succeeded" });
        assert.deepEqual(sent("algorithm_run").counted, [{ algorithm: "pagerank", outcome: "succeeded" }]);
        assert.lengthOf(sent("algorithm_run").posthog, 1);

        const actionsBefore = sent("graph_action").posthog.length;
        const stylesBefore = sent("style_changed").posthog.length;
        const recolor = next("style_changed");
        await userEvent.click(await screen.findByRole("button", { name: "Show anyway" }));
        assert.deepEqual({ ...(await recolor) }, { op: "style.encode" });
        const recolors = sent("style_changed").posthog.slice(stylesBefore);
        assert.lengthOf(recolors, 1, "one re-coloring, one event");
        assert.strictEqual(recolors[0]?.op, "style.encode");
        assert.notProperty(recolors[0], "suggested");
        assert.lengthOf(sent("graph_action").posthog, actionsBefore, "a style edit is no graph action");
        // Counted for every reader: the first style edit on the page, the reader's own gray layer.
        assert.deepEqual(sent("style_changed").counted, [{ op: "style.patch", action: "add" }]);

        const before = workCounts();
        const commandsBefore = sent("command_run").posthog.length;

        // The header's Undo takes back the re-coloring; Control+Z takes back the run.
        let moved = historyMoves(session, "undo");
        await userEvent.click(screen.getByRole("button", { name: /^Undo/ }));
        await moved;
        moved = historyMoves(session, "undo");
        await userEvent.keyboard("{Control>}z{/Control}");
        await moved;
        assert.isEmpty(
            session.runs.list().filter((run) => run.algorithm === "pagerank"),
            "Control+Z took the run back",
        );

        // Control+Shift+Z puts the run back; the header's Redo puts the re-coloring back.
        moved = historyMoves(session, "redo");
        await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
        await moved;
        moved = historyMoves(session, "redo");
        await userEvent.click(screen.getByRole("button", { name: /^Redo/ }));
        await moved;
        assert.deepEqual(
            session.runs.list().map((run) => [run.algorithm, run.status]),
            [["pagerank", "succeeded"]],
        );
        assert.isFalse(session.canRedo, "everything is redone");

        // History replays the run and the re-coloring: neither is the reader's new work.
        assert.deepEqual(workCounts(), before, "no algorithm_run, graph_action or style_changed from Undo or Redo");
        assert.deepEqual(
            sent("command_run")
                .posthog.slice(commandsBefore)
                .map((each) => each.command),
            ["history.undo", "history.undo", "history.redo", "history.redo"],
            "each Undo and Redo counted once, from its button or its keys",
        );
        // Graph actions and commands are shared-mode only, never first-on-page counts.
        assert.isEmpty(sent("graph_action").counted);
        assert.isEmpty(sent("command_run").counted);
    });

    it("counts a run that fails by its catalog key and the element's error code", async () => {
        const session = await lesMisProject();
        // Katz with its Attenuation at the top of its range never settles on an answer.
        await pickInAnalyze("Katz");
        await userEvent.click(await screen.findByRole("button", { name: "Settings for Katz" }));
        const alpha = await screen.findByRole("textbox", { name: /^Attenuation/ });
        await userEvent.tripleClick(alpha);
        await userEvent.keyboard("0.5{Tab}");
        const ran = next("algorithm_run");
        await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));
        const props = await ran;

        const run = session.runs.list().find((each) => each.algorithm === "katz");
        assert.strictEqual(run?.status, "failed");
        const code = run?.error?.code;
        assert.match(String(code), /^E_/, "the element reports a coded failure");
        assert.deepEqual({ ...props }, { algorithm: "katz", outcome: "failed", code });
        assert.deepEqual(sent("algorithm_run").counted, [{ algorithm: "katz", outcome: "failed", code }]);
        assert.lengthOf(sent("algorithm_run").posthog, 1);
        assert.isEmpty(sent("style_changed").posthog.filter((each) => each.op === "style.encode"));
    });
});
