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
};

describe("Inspector", () => {
    describe("geometry", () => {
        it("still reserves an 80px trailing cluster, which is now wider than what it holds", () => {
            /* 52 until 2026-09-12, when the always-drawn `Keep open` latch joined `Copy
               reading` and the collapse control; 80 ever since. Both of those controls
               were deleted on 2026-09-14, so the row now draws `Copy reading` and, where a
               pin is allowed, `Pin as A` -- 52px of controls inside an 80px reservation.
               The constant lives in `inspector/inspectorConstants.ts`, which belongs to
               the style-inspector rebuild landing after this change; narrowing it (and the
               167px name band that is measured against it) is that unit's to do, with the
               artboard in hand. This board records the discrepancy rather than hiding it. */
            expect(INSPECTOR_HEADER_CLUSTER_WIDTH).toBe(80);
        });

        it("leaves 127px of name band beside that cluster in the 240px column", () => {
            expect(INSPECTOR_HEADER_NAME_BAND).toBe(127);
        });

        it("takes the library's 240px panel column", () => {
            expect(INSPECTOR_WIDTH_DEFAULT).toBe(240);
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

    /* REPLACED "the Keep open latch" on 2026-09-14. It threaded 6.12's latch to the
       header and proved the latch and the comparison pin were different objects. The latch
       is gone; the pin is not, and the board below is what remains of the distinction. */
    describe("what the column no longer owns", () => {
        it("draws neither a latch nor a collapse control, and still draws the comparison pin", () => {
            render(
                <Harness>
                    <Inspector {...defaultProps} selectionKind="node" kindLabel="Node" identityLabel="Mr_Whiskers" />
                </Harness>,
            );

            expect(screen.queryByRole("button", { name: "Keep open" })).toBeNull();
            expect(screen.queryByRole("button", { name: "Toggle inspector" })).toBeNull();
            expect(screen.getByRole("button", { name: "Pin as A" })).toHaveAttribute("aria-pressed", "false");
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
