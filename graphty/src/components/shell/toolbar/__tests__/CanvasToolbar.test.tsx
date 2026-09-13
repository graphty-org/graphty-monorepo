import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "../../../../test/test-utils";
import {
    CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE,
    CANVAS_TOOLBAR_DESKTOP,
    CANVAS_TOOLBAR_NARROW,
    CANVAS_TOOLBAR_Z_INDEX,
    canvasToolbarWidth,
} from "../../constants";
import { CANVAS_TOOLBAR_LABEL, CanvasToolbar,type CanvasToolbarComponentProps, type CanvasToolbarViewsProps } from "../CanvasToolbar";

const ZOOM_NAMES = ["Zoom out", "Zoom in", "Zoom to fit", "Zoom to selection"];

function views(overrides: Partial<CanvasToolbarViewsProps> = {}): CanvasToolbarViewsProps {
    return {
        minimapShown: true,
        legendShown: true,
        toolbarShown: true,
        vrSupported: false,
        arSupported: false,
        visibleNodeCount: 20,
        onResetView: vi.fn(),
        onViewPreset: vi.fn(),
        onToggleMinimap: vi.fn(),
        onToggleToolbar: vi.fn(),
        onToggleLegend: vi.fn(),
        onEnterVr: vi.fn(),
        onEnterAr: vi.fn(),
        ...overrides,
    };
}

function props(overrides: Partial<CanvasToolbarComponentProps> = {}): CanvasToolbarComponentProps {
    return {
        viewMode: "3d",
        onViewModeChange: vi.fn(),
        zoomToSelectionEnabled: true,
        onZoomOut: vi.fn(),
        onZoomIn: vi.fn(),
        onZoomToFit: vi.fn(),
        onZoomToSelection: vi.fn(),
        bottomOffset: CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE,
        profileId: "desktop",
        viewsMenuOpen: false,
        onViewsMenuOpenChange: vi.fn(),
        views: views(),
        ...overrides,
    };
}

function bar(): HTMLElement {
    return screen.getByRole("toolbar", { name: CANVAS_TOOLBAR_LABEL });
}

describe("CanvasToolbar", () => {
    describe("composition", () => {
        it("draws the fixed item set left to right, zoom out before zoom in", () => {
            render(<CanvasToolbar {...props()} />);

            const names = within(bar())
                .getAllByRole("button")
                .map((button) => button.getAttribute("aria-label"));

            expect(names).toEqual([...ZOOM_NAMES, "Views"]);
        });

        it("opens with the 2D / 3D segmented control", () => {
            render(<CanvasToolbar {...props()} />);

            const radios = within(bar()).getAllByRole("radio");

            expect(radios.map((radio) => radio.textContent)).toEqual(["2D", "3D"]);
            expect(bar().firstElementChild).toBe(radios[0].parentElement);
        });

        it("draws one divider after the segmented control and one before Views", () => {
            render(<CanvasToolbar {...props()} />);

            expect(within(bar()).getAllByRole("separator")).toHaveLength(2);
        });

        it("draws no zoom percentage: the status bar owns that fact", () => {
            render(<CanvasToolbar {...props()} />);

            expect(bar().textContent).toBe("2D3D");
        });

        it("keeps the item set fixed when nothing is selected", () => {
            render(<CanvasToolbar {...props({ zoomToSelectionEnabled: false })} />);

            const names = within(bar())
                .getAllByRole("button")
                .map((button) => button.getAttribute("aria-label"));

            expect(names).toHaveLength(5);
            expect(names[3]).toBe("Zoom to selection. Select something first");
        });
    });

    describe("geometry", () => {
        it("adds its parts to the desktop profile's width and height", () => {
            render(<CanvasToolbar {...props()} />);

            const rect = bar().getBoundingClientRect();

            expect(Math.round(rect.width)).toBe(canvasToolbarWidth(CANVAS_TOOLBAR_DESKTOP));
            expect(Math.round(rect.height)).toBe(CANVAS_TOOLBAR_DESKTOP.height);
        });

        it("adds its parts to the narrow profile's width and height", () => {
            render(<CanvasToolbar {...props({ profileId: "narrow" })} />);

            const rect = bar().getBoundingClientRect();

            expect(Math.round(rect.width)).toBe(canvasToolbarWidth(CANVAS_TOOLBAR_NARROW));
            expect(Math.round(rect.height)).toBe(CANVAS_TOOLBAR_NARROW.height);
        });

        it("draws 28 px items with a 14 px glyph on the desktop profile", () => {
            render(<CanvasToolbar {...props()} />);

            const item = screen.getByRole("button", { name: "Zoom to fit" });
            const glyph = item.querySelector("svg");

            expect(Math.round(item.getBoundingClientRect().width)).toBe(CANVAS_TOOLBAR_DESKTOP.itemSize);
            expect(glyph?.getAttribute("width")).toBe(String(CANVAS_TOOLBAR_DESKTOP.glyphSize));
        });

        it("grows to 32 px items with a 16 px glyph below 1280 px", () => {
            render(<CanvasToolbar {...props({ profileId: "narrow" })} />);

            const item = screen.getByRole("button", { name: "Zoom to fit" });
            const glyph = item.querySelector("svg");

            expect(Math.round(item.getBoundingClientRect().width)).toBe(CANVAS_TOOLBAR_NARROW.itemSize);
            expect(glyph?.getAttribute("width")).toBe(String(CANVAS_TOOLBAR_NARROW.glyphSize));
        });

        it("centres on the live canvas rect and rides the offset ladder", () => {
            render(<CanvasToolbar {...props({ bottomOffset: 342 })} />);

            expect(bar().style.left).toBe("50%");
            expect(bar().style.transform).toBe("translateX(-50%)");
            expect(bar().style.bottom).toBe("342px");
            expect(bar().style.position).toBe("absolute");
        });

        it("carries the two-value exception: the 7 px concentric radius and a shadow", () => {
            render(<CanvasToolbar {...props()} />);

            const style = window.getComputedStyle(bar());

            expect(style.borderTopLeftRadius).toBe(`${CANVAS_TOOLBAR_DESKTOP.containerRadius}px`);
            expect(style.boxShadow).not.toBe("none");
            expect(bar().style.zIndex).toBe(String(CANVAS_TOOLBAR_Z_INDEX));
        });
    });

    describe("zoom to selection", () => {
        it("is enabled with the register's enabled name", () => {
            render(<CanvasToolbar {...props()} />);

            const item = screen.getByRole("button", { name: "Zoom to selection" });

            expect(item).toHaveAttribute("aria-disabled", "false");
        });

        it("is drawn disabled with its reason when nothing is selected", () => {
            render(<CanvasToolbar {...props({ zoomToSelectionEnabled: false })} />);

            const item = screen.getByRole("button", { name: "Zoom to selection. Select something first" });

            expect(item).toHaveAttribute("aria-disabled", "true");
        });

        it("does nothing when a disabled item is clicked", async () => {
            const user = userEvent.setup();
            const onZoomToSelection = vi.fn();

            render(<CanvasToolbar {...props({ zoomToSelectionEnabled: false, onZoomToSelection })} />);

            await user.click(screen.getByRole("button", { name: "Zoom to selection. Select something first" }));

            expect(onZoomToSelection).not.toHaveBeenCalled();
        });

        it("opens the register's disabled title in its tooltip", async () => {
            const user = userEvent.setup();

            render(<CanvasToolbar {...props({ zoomToSelectionEnabled: false })} />);

            await user.hover(screen.getByRole("button", { name: "Zoom to selection. Select something first" }));

            expect(await screen.findByText("Zoom to selection. Select something first")).toBeInTheDocument();
        });
    });

    describe("actions", () => {
        it("calls each zoom handler", async () => {
            const user = userEvent.setup();
            const onZoomOut = vi.fn();
            const onZoomIn = vi.fn();
            const onZoomToFit = vi.fn();
            const onZoomToSelection = vi.fn();

            render(<CanvasToolbar {...props({ onZoomOut, onZoomIn, onZoomToFit, onZoomToSelection })} />);

            for (const name of ZOOM_NAMES) {
                await user.click(screen.getByRole("button", { name }));
            }

            expect(onZoomOut).toHaveBeenCalledTimes(1);
            expect(onZoomIn).toHaveBeenCalledTimes(1);
            expect(onZoomToFit).toHaveBeenCalledTimes(1);
            expect(onZoomToSelection).toHaveBeenCalledTimes(1);
        });

        it("changes the view mode from the segmented control", async () => {
            const user = userEvent.setup();
            const onViewModeChange = vi.fn();

            render(<CanvasToolbar {...props({ onViewModeChange })} />);

            await user.click(screen.getByRole("radio", { name: "2D" }));

            expect(onViewModeChange).toHaveBeenCalledWith("2d");
        });

        it("opens the Views menu from its trigger", async () => {
            const user = userEvent.setup();
            const onViewsMenuOpenChange = vi.fn();

            render(<CanvasToolbar {...props({ onViewsMenuOpenChange })} />);

            await user.click(screen.getByRole("button", { name: "Views" }));

            expect(onViewsMenuOpenChange).toHaveBeenCalledWith(true);
        });

        it("is not a tap on the canvas", async () => {
            const user = userEvent.setup();
            const onCanvasTap = vi.fn();
            const onZoomToFit = vi.fn();

            render(
                <div onClick={onCanvasTap}>
                    <CanvasToolbar {...props({ onZoomToFit })} />
                </div>,
            );

            await user.click(screen.getByRole("button", { name: "Zoom to fit" }));

            expect(onZoomToFit).toHaveBeenCalledTimes(1);
            expect(onCanvasTap).not.toHaveBeenCalled();
        });
    });

    describe("when it is not drawn", () => {
        it("leaves with the minimap and the legend while the drawer is maximised", () => {
            render(<CanvasToolbar {...props({ bottomOffset: null })} />);

            expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
        });

        it("takes its own Views menu with it once the Toolbar row is unchecked", () => {
            render(<CanvasToolbar {...props({ views: views({ toolbarShown: false }), viewsMenuOpen: true })} />);

            expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
            expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        });
    });
});
