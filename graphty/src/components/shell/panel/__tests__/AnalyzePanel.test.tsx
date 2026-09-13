import React from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import type { GraphtyHandle } from "../../../Graphty";
import { ShellProvider } from "../../ShellContext";
import { ActivityPanel } from "../ActivityPanel";
import { ANALYZE_MEMORY_STORAGE_KEY, AnalyzePanel, type AnalyzePanelProps } from "../AnalyzePanel";

const SUGGESTED_RUNS = ["Run Groups", "Run Most connected", "Run Bridges", "Run Influence"];

const SECTION_ORDER = ["Suggested", "All statistics", "Metric histograms", "History", "Recipes", "More"];

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
                onClose={() => undefined}
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
            renderPanel({ resultCount: 3 });

            expect(screen.getByRole("tab", { name: "Results (3)" })).toBeInTheDocument();
        });

        it("remembers the tab under its own versioned key", () => {
            renderPanel();

            fireEvent.click(screen.getByRole("tab", { name: "Results" }));

            expect(window.localStorage.getItem(ANALYZE_MEMORY_STORAGE_KEY)).toContain("results");
        });

        it("survives a memory entry of the wrong shape", () => {
            window.localStorage.setItem(ANALYZE_MEMORY_STORAGE_KEY, "not json");

            renderPanel();

            expect(screen.getByRole("tab", { name: "Run" })).toHaveAttribute("aria-selected", "true");
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
});
