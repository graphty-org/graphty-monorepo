import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, within } from "../../../../test/test-utils";
import {
    ACTIVITY_PANEL_MAX_WIDTH,
    ACTIVITY_PANEL_MIN_WIDTH,
    ACTIVITY_PANEL_WIDTH_DEFAULT,
    CANVAS_MIN_WIDTH,
    PANEL_HEADER_HEIGHT,
} from "../../constants";
import { ShellProvider } from "../../ShellContext";
import type { PanelOverflowItem } from "../../types";
import { ActivityPanel, COLLAPSE_ALL_SECTIONS, EXPAND_ALL_SECTIONS } from "../ActivityPanel";
import { PanelSection } from "../PanelSection";

function renderInShell(ui: React.ReactNode) {
    return render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            {ui}
        </ShellProvider>,
    );
}

const ownRow: PanelOverflowItem = {
    id: "close-dataset",
    label: "Close dataset. Starts a new session",
    onSelect: vi.fn(),
};

describe("ActivityPanel", () => {
    describe("chrome", () => {
        it("renders at the width the store gives it", () => {
            renderInShell(
                <ActivityPanel
                    activity="explore"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Explore"
                    onClose={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            const panel = screen.getByTestId("activity-panel");
            expect(panel).toHaveStyle({ width: `${ACTIVITY_PANEL_WIDTH_DEFAULT}px` });
        });

        it("draws a 36px header carrying the activity name", () => {
            renderInShell(
                <ActivityPanel
                    activity="data"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Data"
                    onClose={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            expect(screen.getByRole("heading", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByTestId("panel-header")).toHaveStyle({ height: `${PANEL_HEADER_HEIGHT}px` });
        });

        it("names itself for the activity it draws", () => {
            renderInShell(
                <ActivityPanel
                    activity="style"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Style"
                    onClose={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            expect(screen.getByRole("region", { name: "Style" })).toBeInTheDocument();
        });
    });

    describe("the overflow menu", () => {
        it("draws no More when the panel has no rows of its own", () => {
            renderInShell(
                <ActivityPanel
                    activity="explore"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Explore"
                    onClose={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
        });

        it("opens with Expand all sections then Collapse all sections, then the panel's own rows", async () => {
            renderInShell(
                <ActivityPanel
                    activity="data"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Data"
                    overflowItems={[ownRow]}
                    onClose={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            fireEvent.click(screen.getByRole("button", { name: "More" }));

            const items = await screen.findAllByRole("menuitem");
            expect(items.map((item) => item.textContent)).toEqual([
                EXPAND_ALL_SECTIONS,
                COLLAPSE_ALL_SECTIONS,
                ownRow.label,
            ]);
        });

        it("expands every section of the panel from one row", async () => {
            renderInShell(
                <ActivityPanel
                    activity="data"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Data"
                    overflowItems={[ownRow]}
                    onClose={vi.fn()}
                >
                    <PanelSection sectionId="data.one" label="One">
                        <div>one</div>
                    </PanelSection>
                    <PanelSection sectionId="data.two" label="Two">
                        <div>two</div>
                    </PanelSection>
                </ActivityPanel>,
            );

            expect(screen.getByRole("button", { name: "Expand One" })).toHaveAttribute("aria-expanded", "false");

            fireEvent.click(screen.getByRole("button", { name: "More" }));
            const expandAll = await screen.findByRole("menuitem", { name: EXPAND_ALL_SECTIONS });
            fireEvent.click(expandAll);

            expect(await screen.findByRole("button", { name: "Collapse One" })).toHaveAttribute(
                "aria-expanded",
                "true",
            );
            expect(screen.getByRole("button", { name: "Collapse Two" })).toHaveAttribute("aria-expanded", "true");
        });

        it("collapses every section of the panel from one row", async () => {
            renderInShell(
                <ActivityPanel
                    activity="data"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Data"
                    overflowItems={[ownRow]}
                    onClose={vi.fn()}
                >
                    <PanelSection sectionId="data.one" label="One" defaultOpen>
                        <div>one</div>
                    </PanelSection>
                </ActivityPanel>,
            );

            fireEvent.click(screen.getByRole("button", { name: "More" }));
            const collapseAll = await screen.findByRole("menuitem", { name: COLLAPSE_ALL_SECTIONS });
            fireEvent.click(collapseAll);

            expect(await screen.findByRole("button", { name: "Expand One" })).toHaveAttribute(
                "aria-expanded",
                "false",
            );
        });
    });

    describe("closing", () => {
        it("closes from the header X", () => {
            const onClose = vi.fn();

            renderInShell(
                <ActivityPanel
                    activity="explore"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Explore"
                    onClose={onClose}
                >
                    <div />
                </ActivityPanel>,
            );

            fireEvent.click(screen.getByRole("button", { name: "Close the panel" }));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe("the Keep open latch", () => {
        it("hands the latch to its header and holds no latch state of its own", () => {
            const onKeepOpenChange = vi.fn();

            renderInShell(
                <ActivityPanel
                    activity="explore"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Explore"
                    keptOpen
                    onKeepOpenChange={onKeepOpenChange}
                    onClose={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            const latch = screen.getByRole("button", { name: "Keep open" });

            expect(latch).toHaveAttribute("aria-pressed", "true");

            fireEvent.click(latch);

            expect(onKeepOpenChange).toHaveBeenCalledWith(false);
        });
    });

    describe("the boundary drag", () => {
        it("draws the drag only when the panel can be resized", () => {
            renderInShell(
                <ActivityPanel
                    activity="explore"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Explore"
                    onClose={vi.fn()}
                    onWidthChange={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            const handle = screen.getByRole("separator", { name: "Resize the panel" });
            expect(handle).toHaveAttribute("aria-valuenow", String(ACTIVITY_PANEL_WIDTH_DEFAULT));
        });

        it("draws no drag while the panel is the narrow overlay", () => {
            renderInShell(
                <ActivityPanel
                    activity="explore"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="overlay"
                    title="Explore"
                    onClose={vi.fn()}
                    onWidthChange={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            expect(screen.queryByRole("separator")).not.toBeInTheDocument();
        });

        it("moves the boundary from the keyboard and consumes the press", () => {
            const onWidthChange = vi.fn();

            renderInShell(
                <ActivityPanel
                    activity="explore"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Explore"
                    onClose={vi.fn()}
                    onWidthChange={onWidthChange}
                >
                    <div />
                </ActivityPanel>,
            );

            const handle = screen.getByRole("separator", { name: "Resize the panel" });
            const consumed = !fireEvent.keyDown(handle, { key: "ArrowRight" });

            expect(onWidthChange).toHaveBeenCalledWith(ACTIVITY_PANEL_WIDTH_DEFAULT + 8);
            expect(consumed).toBe(true);
        });

        it("reports the bounds the drag may ask for", () => {
            renderInShell(
                <ActivityPanel
                    activity="explore"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Explore"
                    onClose={vi.fn()}
                    onWidthChange={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            const handle = screen.getByRole("separator", { name: "Resize the panel" });
            expect(handle).toHaveAttribute("aria-valuemin", String(ACTIVITY_PANEL_MIN_WIDTH));
            expect(handle).toHaveAttribute("aria-valuemax", String(ACTIVITY_PANEL_MAX_WIDTH));
        });

        it("keeps the canvas minimum out of the panel's hands", () => {
            // The clamp is the store's, so the handle reports the raw request and
            // the panel renders whatever comes back. The constant is asserted here
            // so a change to it fails this region's test too.
            expect(CANVAS_MIN_WIDTH).toBe(520);
        });
    });

    describe("presentation", () => {
        it("records which presentation it is drawing", () => {
            renderInShell(
                <ActivityPanel
                    activity="ai"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="overlay"
                    title="AI"
                    onClose={vi.fn()}
                >
                    <div />
                </ActivityPanel>,
            );

            expect(screen.getByTestId("activity-panel")).toHaveAttribute("data-presentation", "overlay");
        });

        it("puts its content in a region of its own", () => {
            renderInShell(
                <ActivityPanel
                    activity="present"
                    width={ACTIVITY_PANEL_WIDTH_DEFAULT}
                    presentation="docked"
                    title="Present"
                    onClose={vi.fn()}
                >
                    <div>body</div>
                </ActivityPanel>,
            );

            const content = screen.getByTestId("activity-panel-content");
            expect(within(content).getByText("body")).toBeInTheDocument();
        });
    });
});
