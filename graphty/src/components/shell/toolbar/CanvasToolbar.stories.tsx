import { PANEL_INK } from "@graphty/compact-mantine";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { storyWaitOptions } from "../../../stories/wait";
import { CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE } from "../constants";
import type { CanvasViewMode } from "../types";
import { CANVAS_TOOLBAR_LABEL, CanvasToolbar, type CanvasToolbarComponentProps } from "./CanvasToolbar";
import { VIEWS_LABEL } from "./ViewsMenu";

/**
 * The toolbar at the foot of a canvas-sized frame, holding its own view mode and Views menu
 * state so a click on the bar changes what it draws.
 * @param props - the toolbar's props; viewMode and viewsMenuOpen are where it starts.
 * @returns the frame with the toolbar in it.
 */
function ToolbarOnCanvas(props: CanvasToolbarComponentProps): React.JSX.Element {
    const [viewMode, setViewMode] = useState<CanvasViewMode>(props.viewMode);
    const [viewsMenuOpen, setViewsMenuOpen] = useState(props.viewsMenuOpen);

    return (
        <div style={{ position: "relative", width: 960, height: 540, background: PANEL_INK.SURFACE }}>
            <CanvasToolbar
                {...props}
                viewMode={viewMode}
                onViewModeChange={(mode) => {
                    setViewMode(mode);
                    props.onViewModeChange(mode);
                }}
                viewsMenuOpen={viewsMenuOpen}
                onViewsMenuOpenChange={setViewsMenuOpen}
            />
        </div>
    );
}

const meta: Meta<typeof ToolbarOnCanvas> = {
    title: "Shell/Canvas toolbar",
    component: ToolbarOnCanvas,
    args: {
        viewMode: "3d",
        onViewModeChange: fn(),
        zoomToSelectionEnabled: false,
        onZoomOut: fn(),
        onZoomIn: fn(),
        onZoomToFit: fn(),
        onZoomToSelection: fn(),
        bottomOffset: CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE,
        profileId: "desktop",
        viewsMenuOpen: false,
        onViewsMenuOpenChange: fn(),
        views: {
            legendShown: true,
            toolbarShown: true,
            xr: { vr: false, ar: false, reasons: { vr: "no-webxr", ar: "no-webxr" }, active: null },
            visibleNodeCount: 20,
            onResetView: fn(),
            onViewPreset: fn(),
            onToggleToolbar: fn(),
            onToggleLegend: fn(),
            onEnterVr: fn(),
            onEnterAr: fn(),
            onExitXr: fn(),
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** At rest: 3D selected, nothing selected so Zoom to selection is disabled. */
export const ThreeD: Story = {
    play: async ({ canvasElement }) => {
        const bar = within(canvasElement).getByRole("toolbar", { name: CANVAS_TOOLBAR_LABEL });
        await expect(within(bar).getByRole("radio", { name: "3D" })).toBeChecked();
    },
};

/** 2D, chosen by clicking it on the bar's segmented control. */
export const TwoD: Story = {
    play: async ({ args, canvasElement }) => {
        const bar = within(canvasElement).getByRole("toolbar", { name: CANVAS_TOOLBAR_LABEL });
        await userEvent.click(within(bar).getByText("2D"));
        await expect(within(bar).getByRole("radio", { name: "2D" })).toBeChecked();
        await expect(args.onViewModeChange).toHaveBeenCalledWith("2d");
    },
};

/** With something selected, so Zoom to selection is enabled. */
export const WithSelection: Story = {
    args: { zoomToSelectionEnabled: true },
};

/** The narrow profile, for a narrow canvas. */
export const Narrow: Story = {
    args: { profileId: "narrow" },
};

/** The Views menu, opened by clicking its button. */
export const ViewsMenuOpen: Story = {
    play: async ({ canvasElement }) => {
        const bar = within(canvasElement).getByRole("toolbar", { name: CANVAS_TOOLBAR_LABEL });
        await userEvent.click(within(bar).getByRole("button", { name: VIEWS_LABEL }));
        await expect(
            await within(document.body).findByRole("menu", { name: VIEWS_LABEL }, storyWaitOptions(1000)),
        ).toBeVisible();
    },
};
