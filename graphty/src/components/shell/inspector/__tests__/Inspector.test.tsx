import { PopoutManager } from "@graphty/compact-mantine";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../../../test/test-utils";
import { INSPECTOR_WIDTH_DEFAULT, PANEL_HEADER_HEIGHT } from "../../constants";
import { ShellProvider } from "../../ShellContext";
import type { SelectionKind } from "../../types";
import { Inspector } from "../Inspector";
import { InspectorActions } from "../InspectorActions";
import {
    COMING_TAG_HEIGHT,
    COMING_TAG_RADIUS,
    INSPECTOR_HEADER_CLUSTER_WIDTH,
    INSPECTOR_HEADER_NAME_BAND,
    kindTakesPin,
} from "../inspectorConstants";
import { InspectorMetricRow } from "../inspectorContext";

function Harness({ children }: { children: React.ReactNode }) {
    return (
        <PopoutManager>
            <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                {children}
            </ShellProvider>
        </PopoutManager>
    );
}

const defaultProps = {
    open: true,
    width: INSPECTOR_WIDTH_DEFAULT,
    presentation: "docked" as const,
    selectionKind: "none" as SelectionKind,
    kindLabel: "Graph summary",
    onCopyReading: vi.fn(),
    onToggle: vi.fn(),
};

describe("Inspector", () => {
    describe("geometry", () => {
        it("measures the trailing cluster as three 24px boxes and two 4px gaps", () => {
            // 52 until 2026-09-12, when the always-drawn `Keep open` latch joined
            // `Copy reading` and the collapse control in the row.
            expect(INSPECTOR_HEADER_CLUSTER_WIDTH).toBe(80);
        });

        it("leaves 167px of name band beside that cluster", () => {
            expect(INSPECTOR_HEADER_NAME_BAND).toBe(167);
        });

        it("takes the 280px panel column and not the superseded 260", () => {
            expect(INSPECTOR_WIDTH_DEFAULT).toBe(280);
        });

        it("draws a 36px header", () => {
            expect(PANEL_HEADER_HEIGHT).toBe(36);
        });

        it("draws the Coming pill 16px tall and fully round", () => {
            expect(COMING_TAG_HEIGHT).toBe(16);
            expect(COMING_TAG_RADIUS).toBe(8);
        });
    });

    describe("collapsing", () => {
        it("draws nothing while it is collapsed", () => {
            render(
                <Harness>
                    <Inspector {...defaultProps} open={false} />
                </Harness>,
            );

            expect(screen.queryByTestId("inspector")).not.toBeInTheDocument();
        });

        it("draws the column at the width the store hands it", () => {
            render(
                <Harness>
                    <Inspector {...defaultProps} width={320} />
                </Harness>,
            );

            const column = screen.getByTestId("inspector");
            expect(column).toBeInTheDocument();
            expect(column).toHaveStyle({ width: "320px" });
        });
    });

    describe("presentation", () => {
        it("draws the resize boundary while it is docked", () => {
            render(
                <Harness>
                    <Inspector {...defaultProps} onWidthChange={vi.fn()} />
                </Harness>,
            );

            expect(screen.getByRole("separator", { name: "Resize the inspector" })).toBeInTheDocument();
        });

        it("draws no resize boundary while it is an overlay", () => {
            render(
                <Harness>
                    <Inspector {...defaultProps} presentation="overlay" onWidthChange={vi.fn()} />
                </Harness>,
            );

            expect(screen.queryByRole("separator")).not.toBeInTheDocument();
            expect(screen.getByTestId("inspector")).toHaveAttribute("data-presentation", "overlay");
        });
    });

    describe("the Keep open latch", () => {
        it("threads the latch to the header without touching the comparison pin", () => {
            const onKeepOpenChange = vi.fn();

            render(
                <Harness>
                    <Inspector
                        {...defaultProps}
                        selectionKind="node"
                        kindLabel="Node"
                        identityLabel="Mr_Whiskers"
                        keptOpen
                        onKeepOpenChange={onKeepOpenChange}
                    />
                </Harness>,
            );

            const latch = screen.getByRole("button", { name: "Keep open" });

            expect(latch).toHaveAttribute("aria-pressed", "true");
            // The two pins are different objects: latching the column takes no snapshot.
            expect(screen.getByRole("button", { name: "Pin as A" })).toHaveAttribute("aria-pressed", "false");

            fireEvent.click(latch);

            expect(onKeepOpenChange).toHaveBeenCalledWith(false);
            expect(screen.queryByTestId("inspector-pinned-card")).not.toBeInTheDocument();
        });
    });

    describe("the pin rule", () => {
        it("draws no pin for Nothing selected", () => {
            render(
                <Harness>
                    <Inspector {...defaultProps} />
                </Harness>,
            );

            expect(screen.queryByRole("button", { name: "Pin as A" })).not.toBeInTheDocument();
        });

        it("draws the pin for a node, an edge, a selection and a result", () => {
            expect(kindTakesPin("node")).toBe(true);
            expect(kindTakesPin("edge")).toBe(true);
            expect(kindTakesPin("multiple")).toBe(true);
            expect(kindTakesPin("algorithm-result")).toBe(true);
        });

        it("draws no pin for the summary, a style layer, a pattern match or a cleaning step", () => {
            expect(kindTakesPin("none")).toBe(false);
            expect(kindTakesPin("style-layer")).toBe(false);
            expect(kindTakesPin("pattern-match")).toBe(false);
            expect(kindTakesPin("cleaning-step")).toBe(false);
        });

        it("freezes a copy as card A and shows a delta against it on the live row", async () => {
            const { rerender } = render(
                <Harness>
                    <Inspector {...defaultProps} selectionKind="node" kindLabel="Node" identityLabel="Mr_Whiskers">
                        <InspectorMetricRow metricId="degree" name="Links" value={10} display="10" percentile={50} />
                    </Inspector>
                </Harness>,
            );

            fireEvent.click(screen.getByRole("button", { name: "Pin as A" }));

            expect(await screen.findByTestId("inspector-pinned-card")).toBeInTheDocument();

            rerender(
                <Harness>
                    <Inspector {...defaultProps} selectionKind="node" kindLabel="Node" identityLabel="Mr_Whiskers">
                        <InspectorMetricRow metricId="degree" name="Links" value={12} display="12" percentile={60} />
                    </Inspector>
                </Harness>,
            );

            expect(await screen.findByText(/\+2 against A/)).toBeInTheDocument();
        });

        it("releases the pin from the card", async () => {
            render(
                <Harness>
                    <Inspector {...defaultProps} selectionKind="node" kindLabel="Node">
                        <InspectorMetricRow metricId="degree" name="Links" value={10} display="10" percentile={50} />
                    </Inspector>
                </Harness>,
            );

            fireEvent.click(screen.getByRole("button", { name: "Pin as A" }));
            const card = await screen.findByTestId("inspector-pinned-card");
            expect(card).toBeInTheDocument();

            fireEvent.click(screen.getByRole("button", { name: "Unpin" }));

            await waitFor(() => {
                expect(screen.queryByTestId("inspector-pinned-card")).not.toBeInTheDocument();
            });
        });

        it("releases the pin when the shell says the data reloaded", async () => {
            const { rerender } = render(
                <Harness>
                    <Inspector {...defaultProps} selectionKind="node" kindLabel="Node">
                        <InspectorMetricRow metricId="degree" name="Links" value={10} display="10" percentile={50} />
                    </Inspector>
                </Harness>,
            );

            fireEvent.click(screen.getByRole("button", { name: "Pin as A" }));
            expect(await screen.findByTestId("inspector-pinned-card")).toBeInTheDocument();

            rerender(
                <Harness>
                    <Inspector {...defaultProps} selectionKind="node" kindLabel="Node" pinned={false}>
                        <InspectorMetricRow metricId="degree" name="Links" value={10} display="10" percentile={50} />
                    </Inspector>
                </Harness>,
            );

            await waitFor(() => {
                expect(screen.queryByTestId("inspector-pinned-card")).not.toBeInTheDocument();
            });
        });
    });

    describe("the binding pinning rule", () => {
        it("puts the actions block in the sticky footer and not in the scroll region", async () => {
            render(
                <Harness>
                    <Inspector {...defaultProps} selectionKind="node" kindLabel="Node">
                        <InspectorActions label="Actions" actions={[{ id: "frame", label: "Frame this node" }]} />
                    </Inspector>
                </Harness>,
            );

            const block = await screen.findByTestId("inspector-actions");
            expect(screen.getByTestId("inspector-footer")).toContainElement(block);
            expect(screen.getByTestId("inspector-scroll")).not.toContainElement(block);
        });
    });
});
