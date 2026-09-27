import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import type { GraphtyHandle } from "../../../Graphty";
import { ShellProvider } from "../../ShellContext";
import { ActivityPanel } from "../ActivityPanel";
import {
    ANALYZE_MEMORY_STORAGE_KEY,
    AnalyzePanel,
    type AnalyzePanelProps,
    type AnalyzeResultCard,
} from "../AnalyzePanel";

const SUGGESTED_RUNS = ["Run Groups", "Run Most connected", "Run Bridges", "Run Influence"];

const SECTION_ORDER = ["Suggested", "All statistics", "Metric histograms", "History", "Recipes", "More"];

/** The five tier-2 sections, which spec:1699 makes panel-level and therefore resident under both tabs. */
const PANEL_LEVEL_SECTIONS = ["All statistics", "Metric histograms", "History", "Recipes", "More"];

/** A completed run whose encoding was applied: swatch, layer name and Change encoding. */
const APPLIED_RESULT: AnalyzeResultCard = {
    id: "groups-1",
    title: "Groups",
    headline: "6 groups, modularity 0.447",
    stateSwatch: "#4c6ef5",
    layerName: "Groups colour",
};

/** A completed run whose encoding was suppressed: no layer, and therefore no encoding verb. */
const UNAPPLIED_RESULT: AnalyzeResultCard = {
    id: "degree-1",
    title: "Most connected",
    headline: "Most connected: 34 (17)",
};

/** Three results, for the badge and the one-row-per-result board. */
const THREE_RESULTS: readonly AnalyzeResultCard[] = [
    APPLIED_RESULT,
    UNAPPLIED_RESULT,
    { id: "bridges-1", title: "Bridges", headline: "Main bridge: 1 (231.07)" },
];

function renderPanel(props: Partial<AnalyzePanelProps> = {}) {
    const graphtyRef = React.createRef<GraphtyHandle>();

    return render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <AnalyzePanel graphtyRef={graphtyRef} {...props} />
        </ShellProvider>,
    );
}

/**
 * The panel inside the chrome that publishes the header slot.
 *
 * The card view toggle is drawn in the 36px title row, which `ActivityPanel` owns,
 * so a board that renders the body alone has nowhere to draw it -- by design, the
 * same way the inspector's footer draws nothing without the inspector's chrome.
 * @param props - the panel's own props.
 * @returns the render result.
 */
function renderPanelInChrome(props: Partial<AnalyzePanelProps> = {}) {
    const graphtyRef = React.createRef<GraphtyHandle>();

    return render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <ActivityPanel
                activity="analyze"
                width={280}
                presentation="docked"
                title="Analyze"
            >
                <AnalyzePanel graphtyRef={graphtyRef} {...props} />
            </ActivityPanel>
        </ShellProvider>,
    );
}

describe("AnalyzePanel", () => {
    beforeEach(() => {
        window.localStorage.removeItem(ANALYZE_MEMORY_STORAGE_KEY);
    });

    describe("the two tabs", () => {
        it("rests on Run", () => {
            renderPanel();

            expect(screen.getByRole("tab", { name: "Run" })).toHaveAttribute("aria-selected", "true");
        });

        it("draws the empty Results tab with no count", () => {
            renderPanel();

            const results = screen.getByRole("tab", { name: "Results" });
            expect(results).toHaveAttribute("title", "No results yet");
        });

        it("counts the results once there are some", () => {
            renderPanel({ results: THREE_RESULTS });

            expect(screen.getByRole("tab", { name: "Results (3)" })).toBeInTheDocument();
        });

        it("remembers the tab under its own versioned key", () => {
            renderPanel({ results: THREE_RESULTS });

            fireEvent.click(screen.getByRole("tab", { name: "Results (3)" }));

            expect(window.localStorage.getItem(ANALYZE_MEMORY_STORAGE_KEY)).toContain("results");
        });

        it("survives a memory entry of the wrong shape", () => {
            window.localStorage.setItem(ANALYZE_MEMORY_STORAGE_KEY, "not json");

            renderPanel();

            expect(screen.getByRole("tab", { name: "Run" })).toHaveAttribute("aria-selected", "true");
        });
    });

    /* ------------------------------------------------------------------ */
    /* The Results tab, which before this had a track and no body at all   */
    /* ------------------------------------------------------------------ */

    describe("the Results tab's body", () => {
        /* THE DEFECT: the track was real -- role=tab, aria-selected, remembered -- and the
           JSX after it was unconditional, so selecting Results repainted two buttons and
           left the Run tab's Suggested cards on screen. This board fails on that build. */
        it("renders one row per result, and the Run tab renders the suggested cards", () => {
            renderPanel({ results: THREE_RESULTS });

            // Run first: the suggested cards, and no result rows.
            expect(screen.getAllByRole("button", { name: /^Run / })).toHaveLength(SUGGESTED_RUNS.length);
            expect(screen.queryByTestId("analyze-results")).not.toBeInTheDocument();

            fireEvent.click(screen.getByRole("tab", { name: "Results (3)" }));

            const rows = screen.getAllByRole("listitem");
            expect(rows).toHaveLength(THREE_RESULTS.length);
            expect(screen.getByTestId("analyze-result-groups-1")).toHaveTextContent("Groups");
            expect(screen.getByTestId("analyze-result-groups-1")).toHaveTextContent("6 groups, modularity 0.447");
            // The Suggested list is gone: the two tabs exchange the slot, they do not stack.
            expect(screen.queryAllByRole("button", { name: /^Run / })).toHaveLength(0);
            expect(screen.queryByTestId("analyze-add")).not.toBeInTheDocument();
        });

        /* Spec:1699 makes these five "Panel-level settings shared by every card", so they
           belong to the panel and not to Run. A tab that took them with it would lose five
           sections the moment the reader looked at a result. */
        it("keeps the tab track, the weight pair, the scope line and the five tier-2 sections under both tabs", () => {
            renderPanel({
                results: THREE_RESULTS,
                weightAttribute: "value",
                weightTreatment: "Strength",
                scopeLine: "Scope: all 20 visible nodes",
            });

            fireEvent.click(screen.getByRole("tab", { name: "Results (3)" }));

            expect(screen.getByRole("tab", { name: "Run" })).toBeInTheDocument();
            expect(screen.getByText("value")).toBeInTheDocument();
            expect(screen.getByText("Strength")).toBeInTheDocument();
            expect(screen.getByText("Scope: all 20 visible nodes")).toBeInTheDocument();

            const names = screen.getAllByTestId("control-section-name").map((node) => node.textContent);
            expect(names).toEqual(PANEL_LEVEL_SECTIONS);
        });

        /* Rule 7a, spec:1684: "an empty Results tab is a dimmed tab name with no count and
           no 'No results yet' sentence". The reason rides in the control's own tooltip
           (floor item 4) and never as a sentence in the body. */
        it("disables the Results button with no results, and carries its reason", () => {
            renderPanel();

            const results = screen.getByRole("tab", { name: "Results" });

            expect(results).toBeDisabled();
            expect(results).toHaveAttribute("title", "No results yet");
            // The reason is in the tooltip and nowhere in the body as drawn text.
            expect(screen.queryByText("No results yet")).not.toBeInTheDocument();
        });

        /* Without the read guard a dataset boundary, a Remove result or a new session
           lands the reader on a tab with nothing in it -- the same dead surface one step
           removed. */
        it("lands on Run when the remembered tab is results and the list is empty", () => {
            window.localStorage.setItem(ANALYZE_MEMORY_STORAGE_KEY, JSON.stringify({ tab: "results", view: "cards" }));

            renderPanel();

            expect(screen.getByRole("tab", { name: "Run" })).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tab", { name: "Results" })).toHaveAttribute("aria-selected", "false");
        });

        it("honours a remembered results tab while there is something to show", () => {
            window.localStorage.setItem(ANALYZE_MEMORY_STORAGE_KEY, JSON.stringify({ tab: "results", view: "cards" }));

            renderPanel({ results: THREE_RESULTS });

            expect(screen.getByRole("tab", { name: "Results (3)" })).toHaveAttribute("aria-selected", "true");
            expect(screen.getAllByRole("listitem")).toHaveLength(THREE_RESULTS.length);
        });

        it("walks the tab back to Run when the list empties underneath it", () => {
            const { rerender } = renderPanel({ results: THREE_RESULTS });

            fireEvent.click(screen.getByRole("tab", { name: "Results (3)" }));
            expect(screen.getByTestId("analyze-results")).toBeInTheDocument();

            rerender(
                <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                    <AnalyzePanel graphtyRef={React.createRef<GraphtyHandle>()} results={[]} />
                </ShellProvider>,
            );

            expect(screen.getByRole("tab", { name: "Run" })).toHaveAttribute("aria-selected", "true");
            expect(screen.queryByTestId("analyze-results")).not.toBeInTheDocument();
        });

        /* Spec 2233-2236 for the applied form. The un-applied form draws NO encoding verb:
           spec 2234's "Encode as style" exists nowhere in this build, and a drawn verb that
           does nothing costs the reader a click to find out -- the same refusal
           ResultInspector already records. */
        /* REWRITTEN 2026-09-14, the day this row was first driven by the shell instead of
           by a board's own props. It asserted that an applied result draws the layer name
           as a VISIBLE span. It does not any more, and it must not: measured live at
           1440x900, the row is 255 px inside the 280 px panel, `ActionRow` gives its
           affordance cluster `flex: 0 0 auto` so that cluster never shrinks, and with the
           name drawn the cluster measured 287 px -- which gave the state half ZERO pixels
           and left the row reading "(swatch) Groups (Communities, Louvain) Change enco..."
           with the 6.3 pair, the one thing the Results tab exists to show, entirely off
           screen. Spec 2200-2202's collapsed card is "title, state and headline, plus the
           primary action"; the layer name is not on that list, so it moved into the verb's
           tooltip, where it is still hoverable and still announced. */
        it("draws the swatch and Change encoding on an applied result, and neither on an un-applied one", () => {
            renderPanel({ results: [APPLIED_RESULT, UNAPPLIED_RESULT] });

            fireEvent.click(screen.getByRole("tab", { name: "Results (2)" }));

            const applied = screen.getByTestId("analyze-result-groups-1");
            expect(applied.querySelector('[data-testid="analyze-result-swatch"]')).not.toBeNull();
            expect(applied.querySelector('[data-testid="analyze-result-layer"]')).toBeNull();

            const unapplied = screen.getByTestId("analyze-result-degree-1");
            expect(unapplied.querySelector('[data-testid="analyze-result-swatch"]')).toBeNull();

            const verbs = screen.getAllByRole("button", { name: "Change encoding" });

            expect(verbs).toHaveLength(1);
            /* Nothing is lost: the layer the verb acts on is named in its own tooltip. */
            expect(verbs[0]).toHaveAttribute("title", "Change encoding: Groups colour");
            expect(screen.queryByRole("button", { name: "Encode as style" })).not.toBeInTheDocument();
        });

        it("leaves the 6.3 pair room to read beside the applied result's affordances", () => {
            renderPanel({ results: [APPLIED_RESULT] });

            fireEvent.click(screen.getByRole("tab", { name: "Results (1)" }));

            const row = screen.getByTestId("analyze-result-groups-1");
            const state = row.querySelector('[data-testid="action-row-state"]') as HTMLElement;

            /* The regression this pins is a WIDTH, not a presence: the pair was in the DOM
               the whole time the defect was on screen, ellipsized to nothing. */
            expect(state.getBoundingClientRect().width).toBeGreaterThan(80);
        });

        it("calls onChangeEncoding for the result the button belongs to", () => {
            const onChangeEncoding = vi.fn();

            renderPanel({ results: [{ ...APPLIED_RESULT, onChangeEncoding }] });

            fireEvent.click(screen.getByRole("tab", { name: "Results (1)" }));
            fireEvent.click(screen.getByRole("button", { name: "Change encoding" }));

            expect(onChangeEncoding).toHaveBeenCalledTimes(1);
        });

        /* Spec 2207-2209: "A Done state chip is not drawn: state chips are for Running,
           Queued, Failed and Stale." Running is the only one of the four this build
           measures, so it is the only one that may be drawn. */
        it("never draws a Done chip, and draws Running only for a run in flight", () => {
            renderPanel({ results: [APPLIED_RESULT, { ...UNAPPLIED_RESULT, state: "running" }] });

            fireEvent.click(screen.getByRole("tab", { name: "Results (2)" }));

            expect(screen.queryByText("Done")).not.toBeInTheDocument();
            expect(screen.queryByText("Complete")).not.toBeInTheDocument();

            const running = screen.getAllByTestId("analyze-result-running");
            expect(running).toHaveLength(1);
            expect(screen.getByTestId("analyze-result-degree-1")).toContainElement(running[0]);
        });

        it("opens a result by its own id when its row is clicked", () => {
            const onOpenResult = vi.fn();

            renderPanel({ results: THREE_RESULTS, onOpenResult });

            fireEvent.click(screen.getByRole("tab", { name: "Results (3)" }));
            fireEvent.click(screen.getByRole("button", { name: /^Most connected/ }));

            expect(onOpenResult.mock.calls.map((call) => call[0])).toEqual(["degree-1"]);
        });

        /* Spec 2200-2202: the result the inspector is drawing renders its list card
           collapsed. Without the mark, a list of three gives no signal about which of them
           the inspector holds. */
        it("marks the result the inspector is drawing, and only that one", () => {
            renderPanel({ results: THREE_RESULTS, activeResultId: "bridges-1" });

            fireEvent.click(screen.getByRole("tab", { name: "Results (3)" }));

            expect(screen.getByTestId("analyze-result-bridges-1")).toHaveAttribute("aria-current", "true");
            expect(screen.getByTestId("analyze-result-groups-1")).not.toHaveAttribute("aria-current");
        });
    });

    describe("the card view toggle", () => {
        it("offers Cards and List in the panel's title row", () => {
            renderPanelInChrome();

            const header = screen.getByTestId("panel-header-actions");
            const toggle = screen.getByTestId("analyze-card-view");

            expect(header).toContainElement(toggle);
            expect(screen.getByRole("radio", { name: "Cards" })).toHaveAttribute("aria-checked", "true");
            expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("aria-checked", "false");
        });

        it("remembers the chosen view under the panel's own key", () => {
            renderPanelInChrome({ persist: true });

            fireEvent.click(screen.getByRole("radio", { name: "List" }));

            expect(window.localStorage.getItem(ANALYZE_MEMORY_STORAGE_KEY)).toContain("list");
        });

        it("draws nothing where there is no panel chrome to draw into", () => {
            renderPanel();

            expect(screen.queryByTestId("analyze-card-view")).not.toBeInTheDocument();
        });
    });

    describe("the frozen Suggested list", () => {
        it("draws the four cards in their frozen order", () => {
            renderPanel();

            const runs = screen.getAllByRole("button", { name: /^Run / });
            expect(runs.map((run) => run.getAttribute("aria-label"))).toEqual(SUGGESTED_RUNS);
        });

        it("keeps Run drawn on every row when nothing can run yet", () => {
            renderPanel({ runnable: false, runDisabledReason: "Available when loading finishes" });

            const runs = screen.getAllByRole("button", { name: /^Run / });
            expect(runs).toHaveLength(SUGGESTED_RUNS.length);
            runs.forEach((run) => {
                expect(run).toBeDisabled();
                expect(run).toHaveAttribute("title", "Run. Available when loading finishes");
            });
        });

        it("states the scope every Run acts on", () => {
            renderPanel({ scopeLabel: "20 nodes", scopeTitle: "Scope: all 20 visible nodes" });

            expect(screen.getByTestId("analyze-scope")).toHaveTextContent("20 nodes");
        });

        it("gives every card its own info circle", () => {
            renderPanel();

            expect(screen.getAllByTestId("info-circle").length).toBeGreaterThanOrEqual(SUGGESTED_RUNS.length);
        });
    });

    describe("the section order", () => {
        it("renders every section whether or not its members do", () => {
            renderPanel();

            const names = screen.getAllByTestId("control-section-name").map((node) => node.textContent);
            expect(names).toEqual(SECTION_ORDER);
        });
    });

    describe("the picker", () => {
        it("states what is behind the door before it opens", () => {
            renderPanel();

            expect(screen.getByTestId("analyze-add")).toHaveAttribute(
                "title",
                "Add an analysis: 26 methods behind 7 questions",
            );
        });

        it("opens the re-homed Run algorithm dialog", async () => {
            renderPanel();

            fireEvent.click(screen.getByTestId("analyze-add"));

            expect(await screen.findByRole("dialog")).toBeInTheDocument();
        });
    });

    describe("the resident weight pair", () => {
        it("is not drawn when the graph carries no weight", () => {
            renderPanel();

            expect(screen.queryByText("Strength")).not.toBeInTheDocument();
        });

        it("stays resident when the graph carries one", () => {
            renderPanel({ weightAttribute: "value", weightTreatment: "Strength" });

            expect(screen.getByText("value")).toBeInTheDocument();
            expect(screen.getByText("Strength")).toBeInTheDocument();
        });
    });

    describe("the scope line", () => {
        it("is not drawn while the scope is the whole visible graph", () => {
            renderPanel();

            expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
        });

        it("is drawn, with its own verb, once the scope narrows", () => {
            renderPanel({ scopeLine: "Scope: all 20 visible nodes" });

            expect(screen.getByText("Scope: all 20 visible nodes")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
        });
    });

    /* --------------------------------------------------------------------- */
    /* The size-aware Run: its label, its warning line and its in-flight form */
    /* --------------------------------------------------------------------- */

    describe("what Run says it will cost", () => {
        /* Floor item 4 and spec 4954-4956: Run keeps its FULL text. A Run that silently
           costs four minutes and a Run that costs none are two different controls, so the
           cost rides in the label rather than in a glyph, a truncation or a badge. */
        it("draws the estimate in the label, in full, and leaves the control operable", () => {
            renderPanel({ runLabels: { bridges: "Run (about 4 min)" } });

            const run = screen.getByRole("button", { name: "Run Bridges" });

            expect(run).toHaveTextContent("Run (about 4 min)");
            expect(run).toBeEnabled();
            // Only the card it was keyed to. The other three keep the bare verb.
            expect(screen.getByRole("button", { name: "Run Groups" })).toHaveTextContent("Run");
        });

        /* Spec 4670-4684: reported text may not go behind an info circle. A warning a
           reader has to open a door to read is a warning they will not read. */
        it("draws the cost warning as visible text under the row it is about", () => {
            const sentence = "About 3 h at this size. Filter to a part, and run it there.";

            renderPanel({ runWarnings: { bridges: sentence } });

            const text = screen.getByText(sentence);

            expect(text).toBeInTheDocument();
            expect(text.closest('[data-testid="prose-block"]')).toHaveAttribute("data-variant", "departure");
            // Not in a tooltip and not behind an info circle.
            expect(text.closest('[data-testid="info-circle"]')).toBeNull();
            expect(document.querySelector(`[title="${sentence}"]`)).toBeNull();
        });

        it("draws no warning line for a card that has none", () => {
            renderPanel();

            expect(screen.queryByTestId("prose-block")).toBeNull();
        });
    });

    describe("while a run is in flight", () => {
        /* Floor item 4 again, on the path that used to break it: a second Run disabled
           while the first is out said nothing at all about why it could not act. */
        it("disables every Run and keeps the reason, and the label, in full text", () => {
            renderPanel({
                runningId: "bridges",
                runLabels: { bridges: "Run (about 4 min)" },
            });

            const runs = screen.getAllByRole("button", { name: /^Run / });

            expect(runs).toHaveLength(SUGGESTED_RUNS.length);
            runs.forEach((run) => {
                expect(run).toBeDisabled();
                expect(run.getAttribute("title")).toContain("A run is already in progress.");
            });

            expect(screen.getByRole("button", { name: "Run Bridges" })).toHaveTextContent("Run (about 4 min)");
        });
    });

    describe("what a Run reports", () => {
        it("names the card that was run, by the id the frozen list gave it", () => {
            const onRunSuggested = vi.fn();

            renderPanel({ onRunSuggested });

            for (const name of ["Run Most connected", "Run Influence", "Run Bridges"]) {
                fireEvent.click(screen.getByRole("button", { name }));
            }

            expect(onRunSuggested.mock.calls.map((call) => call[0])).toEqual([
                "most-connected",
                "influence",
                "bridges",
            ]);
        });
    });

    describe("the frozen list itself", () => {
        /* A guard, not a restatement: the three ids this slice runs are wired through
           THESE rows, so a rename or a reorder here silently unwires the shell's own map
           from card id to metric. The board is what makes that a failure rather than a
           card whose Run does nothing. */
        it("keeps its membership and its order", () => {
            const onRunSuggested = vi.fn();

            renderPanel({ onRunSuggested });

            const runs = screen.getAllByRole("button", { name: /^Run / });

            expect(runs.map((run) => run.getAttribute("aria-label"))).toEqual(SUGGESTED_RUNS);

            runs.forEach((run) => {
                fireEvent.click(run);
            });

            expect(onRunSuggested.mock.calls.map((call) => call[0])).toEqual([
                "groups",
                "most-connected",
                "bridges",
                "influence",
            ]);
        });
    });
});
