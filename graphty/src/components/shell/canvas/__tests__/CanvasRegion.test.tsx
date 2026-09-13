import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../../../test/test-utils";
import {
    DATA_DRAWER_DEFAULT_HEIGHT,
    NARROW_BREAKPOINT,
    OVERLAY_INSET,
    OVERLAY_REFLOW_RISE,
    TIME_SLIDER_HEIGHT,
} from "../../constants";
import { ShellProvider } from "../../ShellContext";
import type { CanvasDockState, CanvasOverlayVisibility, ShellStateAxis } from "../../types";
import { CanvasRegion,type CanvasRegionOwnProps } from "../CanvasRegion";
import type { LegendChannel } from "../Legend";

class MockGraphtyElement extends HTMLElement {
    graph = {
        getLayers: (): unknown[] => [],
        getStyleManager: () => ({ getLayers: () => [] }),
    };
}

if (!customElements.get("graphty-element")) {
    customElements.define("graphty-element", MockGraphtyElement);
}

const NO_DOCKS: CanvasDockState = {
    drawerOpen: false,
    drawerHeight: DATA_DRAWER_DEFAULT_HEIGHT,
    drawerMaximised: false,
    compareOpen: false,
};

const ALL_OVERLAYS: CanvasOverlayVisibility = {
    minimap: true,
    legend: true,
    toolbar: true,
    timeSlider: false,
    insightsStrip: true,
};

const SIZE: LegendChannel = {
    channel: "size",
    channelLabel: "Size",
    attribute: "Most connected",
    technicalName: "Degree centrality",
    scaleLine: "sqrt scale",
    scaleShort: "sqrt",
    stops: [{ label: "2" }, { label: "median 3" }, { label: "4" }],
};

const TIME_SLIDER = {
    playing: false,
    stepLabel: "7 days",
    viewingLabel: "Viewing: 2026-01-05 to 2026-02-04",
    byLabel: "by opened",
    onStepBack: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStepForward: vi.fn(),
    onOpenSettings: vi.fn(),
};

function renderCanvas(
    overrides: Partial<CanvasRegionOwnProps> = {},
    options: { shellWidth?: number; canvasWidth?: number; canvasHeight?: number } = {},
): ReturnType<typeof render> {
    const {
        canvasHeight = 600,
        canvasWidth = 800,
        shellWidth = 1440,
    } = options;
    const stateAxis: ShellStateAxis = overrides.stateAxis ?? "loaded";

    return render(
        <ShellProvider initialShellWidth={shellWidth} measureViewport={false} persist={false}>
            <div style={{ width: canvasWidth, height: canvasHeight, display: "flex" }}>
                <CanvasRegion
                    stateAxis={stateAxis}
                    docks={NO_DOCKS}
                    overlays={ALL_OVERLAYS}
                    minimap={{ nodeCount: 20 }}
                    legend={{ channels: [SIZE] }}
                    {...overrides}
                >
                    <div data-testid="canvas-toolbar">toolbar</div>
                </CanvasRegion>
            </div>
        </ShellProvider>,
    );
}

function canvasOf(container: HTMLElement): HTMLElement {
    const canvas = container.querySelector("[data-shell-region='canvas']");

    if (canvas === null) {
        throw new Error("no canvas region rendered");
    }

    return canvas as HTMLElement;
}

describe("CanvasRegion", () => {
    describe("the Empty state", () => {
        it("draws Welcome over the graph host, which stays mounted", () => {
            const { container } = renderCanvas({
                stateAxis: "empty",
                welcome: { onOpenFile: vi.fn(), onPasteOrOpenFromUrl: vi.fn() },
            });

            expect(screen.getByText("Open a graph to get started")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Open file" })).toBeInTheDocument();

            // The host is NOT one of the things the Empty state withholds. Loading data
            // is a call on the host's own imperative handle, so a host that arrives only
            // once data is loaded could never take the first load -- the shell would sit
            // in Empty for ever. Welcome.dc.html:48 withholds "canvas toolbar, minimap
            // or legend in Empty", and nothing else.
            expect(container.querySelector("[data-canvas-graph='true']")).not.toBeNull();
            expect(container.querySelectorAll("graphty-element")).toHaveLength(1);
        });

        it("draws no canvas overlays and no toolbar at all", () => {
            const { container } = renderCanvas({
                stateAxis: "empty",
                welcome: { onOpenFile: vi.fn(), onPasteOrOpenFromUrl: vi.fn() },
            });

            expect(container.querySelector("[data-canvas-overlay='minimap']")).toBeNull();
            expect(container.querySelector("[data-canvas-overlay='legend']")).toBeNull();
            expect(container.querySelector("[data-canvas-overlay='layer']")).toBeNull();
            expect(screen.queryByTestId("canvas-toolbar")).toBeNull();
        });
    });

    describe("hosting the graph", () => {
        it("renders the existing graphty-element wrapper rather than a second one", () => {
            const { container } = renderCanvas();

            expect(container.querySelectorAll("graphty-element")).toHaveLength(1);
        });

        it("keeps the DOM order the spec fixes: graph, strip, minimap, legend, toolbar", () => {
            const { container } = renderCanvas({
                insights: {
                    cards: [
                        {
                            id: "groups",
                            title: "Find groups",
                            technicalName: "Communities, Louvain",
                            body: "Cluster nodes that interact more with each other than with the rest.",
                            actionLabel: "Try it",
                            onActivate: vi.fn(),
                        },
                    ],
                    onDismiss: vi.fn(),
                },
            });

            const marks = Array.from(
                canvasOf(container).querySelectorAll(
                    "[data-canvas-graph], [data-canvas-overlay='insights'], [data-canvas-overlay='minimap'], [data-canvas-overlay='legend'], [data-canvas-overlay='extras']",
                ),
            ).map((element) =>
                element.getAttribute("data-canvas-graph") === null
                    ? element.getAttribute("data-canvas-overlay")
                    : "graph",
            );

            expect(marks).toEqual(["graph", "insights", "minimap", "legend", "extras"]);
        });
    });

    describe("docks against overlays", () => {
        it("does not shorten the graph rect for an overlay", () => {
            const { container } = renderCanvas({ overlays: { ...ALL_OVERLAYS, timeSlider: true }, timeSlider: TIME_SLIDER });
            const host = canvasOf(container).querySelector("[data-canvas-graph='true']") as HTMLElement;

            expect(host.style.bottom).toBe("0px");
        });

        it("shortens the graph rect for the data table drawer", async () => {
            const { container } = renderCanvas({
                docks: { ...NO_DOCKS, drawerOpen: true },
                drawer: {
                    tab: "nodes",
                    onTabChange: vi.fn(),
                    rows: [],
                    columns: [],
                    showLabel: "All rows",
                    showCount: "0",
                    showTotal: "of 0",
                    onHeightChange: vi.fn(),
                    onClose: vi.fn(),
                },
            });

            await waitFor(() => {
                const host = canvasOf(container).querySelector("[data-canvas-graph='true']") as HTMLElement;
                expect(host.style.bottom).toBe(`${DATA_DRAWER_DEFAULT_HEIGHT}px`);
            });
        });
    });

    describe("the bottom stack", () => {
        it("puts the minimap and the legend on the 12 baseline with nothing else on", async () => {
            const { container } = renderCanvas();

            await waitFor(() => {
                const minimap = container.querySelector("[data-canvas-overlay='minimap']") as HTMLElement;
                expect(minimap.style.bottom).toBe(`${OVERLAY_INSET}px`);
            });

            const legend = container.querySelector("[data-canvas-overlay='legend']") as HTMLElement;
            expect(legend.style.bottom).toBe(`${OVERLAY_INSET}px`);
        });

        it("raises them 48 onto a second line on a narrow canvas rather than hiding either", async () => {
            const { container } = renderCanvas({}, { canvasWidth: 560 });

            await waitFor(() => {
                expect(canvasOf(container)).toHaveAttribute("data-reflowed", "true");
            });

            const minimap = container.querySelector("[data-canvas-overlay='minimap']") as HTMLElement;
            const legend = container.querySelector("[data-canvas-overlay='legend']") as HTMLElement;

            expect(minimap.style.bottom).toBe(`${OVERLAY_INSET + OVERLAY_REFLOW_RISE}px`);
            expect(legend.style.bottom).toBe(`${OVERLAY_INSET + OVERLAY_REFLOW_RISE}px`);
        });

        it("docks the time slider to the canvas floor when the drawer is closed", () => {
            const { container } = renderCanvas({
                overlays: { ...ALL_OVERLAYS, timeSlider: true },
                timeSlider: TIME_SLIDER,
            });
            const slider = container.querySelector("[data-canvas-overlay='time-slider']") as HTMLElement;

            expect(slider.style.bottom).toBe("0px");
            expect(slider.style.height).toBe(`${TIME_SLIDER_HEIGHT}px`);
        });

        it("hides the minimap and compacts the legend while the drawer is open", () => {
            const { container } = renderCanvas({
                docks: { ...NO_DOCKS, drawerOpen: true },
            });

            expect(container.querySelector("[data-canvas-overlay='minimap']")).toBeNull();
            expect(container.querySelector("[data-canvas-overlay='legend']")).toHaveAttribute("data-form", "compact");
        });

        it("takes the whole baseline off the canvas when the drawer is maximised", () => {
            const { container } = renderCanvas({ docks: { ...NO_DOCKS, drawerOpen: true, drawerMaximised: true } });

            expect(canvasOf(container)).toHaveAttribute("data-toolbar-drawn", "false");
            expect(container.querySelector("[data-canvas-overlay='minimap']")).toBeNull();
            expect(container.querySelector("[data-canvas-overlay='legend']")).toBeNull();
        });

        it("publishes the toolbar's own offset in every other state", () => {
            const { container } = renderCanvas();

            expect(canvasOf(container)).toHaveAttribute("data-toolbar-drawn", "true");
            expect(canvasOf(container)).toHaveAttribute("data-toolbar-bottom", String(OVERLAY_INSET));
            expect(screen.getByTestId("canvas-toolbar")).toBeInTheDocument();
        });

        it("keeps the Graph / Table control as the way back while the drawer is maximised", () => {
            renderCanvas({ docks: { ...NO_DOCKS, drawerOpen: true, drawerMaximised: true } });

            expect(screen.getByRole("radio", { name: "Graph" })).toBeInTheDocument();
            expect(screen.getByRole("radio", { name: "Table" })).toHaveAttribute("aria-checked", "true");
        });
    });

    describe("the narrow tap rule", () => {
        it("closes an overlay when the canvas itself is tapped", () => {
            const onCanvasTap = vi.fn();
            const { container } = renderCanvas({ onCanvasTap }, { shellWidth: NARROW_BREAKPOINT - 1 });

            fireEvent.click(canvasOf(container));

            expect(onCanvasTap).toHaveBeenCalledTimes(1);
        });

        it("does not treat a tap on an overlay as a tap on the canvas", async () => {
            const onCanvasTap = vi.fn();
            const { container } = renderCanvas({ onCanvasTap }, { shellWidth: NARROW_BREAKPOINT - 1 });

            await waitFor(() => {
                expect(container.querySelector("[data-canvas-overlay='minimap']")).not.toBeNull();
            });

            fireEvent.click(container.querySelector("[data-canvas-overlay='minimap']") as HTMLElement);

            expect(onCanvasTap).not.toHaveBeenCalled();
        });

        it("does not fire on the desktop side of the breakpoint", () => {
            const onCanvasTap = vi.fn();
            const { container } = renderCanvas({ onCanvasTap }, { shellWidth: NARROW_BREAKPOINT });

            fireEvent.click(canvasOf(container));

            expect(onCanvasTap).not.toHaveBeenCalled();
        });
    });
});
