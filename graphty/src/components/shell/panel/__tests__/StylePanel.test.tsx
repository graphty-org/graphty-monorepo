import { PANEL_GRID } from "@graphty/compact-mantine";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import type { LayerItem } from "../../../layout/LeftSidebar";
import { ShellProvider } from "../../ShellContext";
import { StylePanel, type StylePanelProps } from "../StylePanel";

const BUILT_INS = ["Default", "High contrast", "Print", "Colorblind safe", "Presentation"];

function createLayer(id: string, name: string): LayerItem {
    return {
        id,
        name,
        styleLayer: {
            node: { selector: "", style: {} },
            edge: { selector: "", style: {} },
        },
    };
}

function renderPanel(props: Partial<StylePanelProps> = {}) {
    const defaults: StylePanelProps = {
        layers: [createLayer("base", "Base layer")],
        selectedLayerId: null,
        onLayersChange: vi.fn(),
        onLayerSelect: vi.fn(),
        onAddLayer: vi.fn(),
    };

    return render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <StylePanel {...defaults} {...props} />
        </ShellProvider>,
    );
}

/**
 * The section whose header carries the given name.
 * @param label - the section's drawn name.
 * @returns the `control-section` element around that header.
 */
function sectionNamed(label: string): HTMLElement {
    const name = screen.getAllByTestId("control-section-name").find((node) => node.textContent === label);

    expect(name).toBeDefined();

    const section = name?.closest("[data-testid='control-section']");

    expect(section).not.toBeNull();

    return section as HTMLElement;
}

describe("StylePanel", () => {
    describe("the re-homed layers list", () => {
        it("draws the app's own Layers list rather than a second one", () => {
            renderPanel();

            expect(screen.getByTestId("style-layers")).toBeInTheDocument();
            expect(screen.getByText("Layers")).toBeInTheDocument();
            // The register's verb, on the section header's own plus -- not the legacy
            // sidebar's "Add layer" (spec 04 line 4270, StylePanel.dc.html:385).
            expect(screen.getByRole("button", { name: "Add a style layer" })).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Add layer" })).toBeNull();
        });

        it("draws Layers as an RT-8 section header, not a hand-built band", () => {
            renderPanel();

            // Spec 6.9 / VOCAB RT-8: 32px, `0 8px 0 16px`, a 12px/500 name and a chevron in
            // the 16px lead slot. The sidebar's own header measured 55px with 16px on all
            // four sides and a rule beneath it, which is the defect this pins.
            const header = sectionNamed("Layers").querySelector<HTMLElement>(
                "[data-testid='control-section-header']",
            );

            expect(header?.style.height).toBe(`${PANEL_GRID.SECTION_HEADER}px`);
            expect(header?.style.paddingInlineStart).toBe(`${PANEL_GRID.PAD_LEFT}px`);
            expect(header?.style.paddingInlineEnd).toBe(`${PANEL_GRID.PAD_RIGHT}px`);
        });

        it("draws one plus on the Layers header, never two", () => {
            // `ControlSection` draws its own plus when `empty && onAdd !== undefined`, so the
            // verb rides in `actions` alone.
            renderPanel({ layers: [] });

            expect(screen.getAllByRole("button", { name: "Add a style layer" })).toHaveLength(1);
        });

        it("draws no empty-state sentence when there are no layers", () => {
            renderPanel({ layers: [] });

            // VOCAB RT-8: an empty section is one 32px row -- dimmed name, no chevron, no
            // content rows and no empty-state sentence.
            expect(sectionNamed("Layers")).toHaveAttribute("data-empty", "true");
            expect(screen.queryByText(/click the \+ button to add layers/i)).toBeNull();
        });

        it("draws the layers it is given", () => {
            renderPanel({ layers: [createLayer("base", "Base layer"), createLayer("hubs", "Hubs")] });

            expect(screen.getByText("Base layer")).toBeInTheDocument();
            expect(screen.getByText("Hubs")).toBeInTheDocument();
        });
    });

    describe("the frozen section order", () => {
        it("draws Layers, Arrangement, Styles and Canvas, in that order", () => {
            renderPanel();

            // Spec 03 section 2.4's frozen order. Layers is a section like the other
            // three now, so it is the first header rather than a band above them.
            const names = screen.getAllByTestId("control-section-name").map((node) => node.textContent);
            expect(names).toEqual(["Layers", "Arrangement (Layout)", "Styles", "Canvas"]);
        });

        it("draws the 6.3 pair inside the Arrangement header, not in a wrapper title", () => {
            renderPanel();

            const name = screen
                .getAllByTestId("control-section-name")
                .find((node) => node.textContent?.startsWith("Arrangement"));

            // Spec 04 section 4.2 step 10: "plain name, space, technical name in
            // parentheses in muted ink, inside one label", and FLOOR-1.9 section 1
            // rules out a title attribute as the only home for it.
            expect(name).toHaveTextContent("Arrangement (Layout)");
            expect(name).toHaveAttribute("title", "Arrangement (Layout)");
            expect(screen.getByTestId("style-arrangement")).not.toHaveAttribute("title");
        });
    });

    describe("the unbuilt layouts", () => {
        it("tags the group once rather than each row", () => {
            renderPanel();

            const tags = screen.getAllByTestId("coming-tag");
            // One on Arrangement, one on Styles: the group form, not a tag per row.
            expect(tags).toHaveLength(2);
        });

        it("states why the dimmed rows cannot act, once, behind the header circle", () => {
            renderPanel();

            expect(screen.getAllByText("Dimmed rows are not built yet.").length).toBeGreaterThan(0);
        });

        it("offers the layout parameters gear", () => {
            renderPanel();

            expect(screen.getByRole("button", { name: "Layout parameters" })).toBeInTheDocument();
        });

        it("opens the re-homed layout dialog from the gear", async () => {
            renderPanel();

            fireEvent.click(screen.getByRole("button", { name: "Layout parameters" }));

            expect(await screen.findByRole("dialog")).toBeInTheDocument();
        });
    });

    describe("the Styles library", () => {
        it("draws the five built-ins first, each with its trailing word", () => {
            renderPanel();

            fireEvent.click(screen.getByRole("button", { name: "Expand Styles" }));

            BUILT_INS.forEach((name) => {
                expect(screen.getByText(name)).toBeInTheDocument();
            });
            expect(screen.getAllByText("built-in")).toHaveLength(BUILT_INS.length);
        });

        it("keeps the saved-thing verbs in the section's own overflow", async () => {
            renderPanel();

            fireEvent.click(screen.getByTestId("style-styles-more"));

            const rows = await screen.findAllByRole("menuitem");
            expect(rows.map((row) => row.textContent)).toEqual([
                "Import style...",
                "Export style (JSON)",
                "Reset styles to defaults",
            ]);
        });

        it("carries the resident Save as style plus", () => {
            renderPanel();

            expect(screen.getByRole("button", { name: "Save as style..." })).toBeInTheDocument();
        });

        it("carries the library's destination sentence", () => {
            renderPanel();

            expect(
                screen.getByText("Style templates: saved in this browser on this computer. Export a file to move it."),
            ).toBeInTheDocument();
        });
    });

    describe("the canvas legend switch", () => {
        it("draws the switch with its binding in the row's title", () => {
            renderPanel();

            fireEvent.click(screen.getByRole("button", { name: "Expand Canvas" }));

            expect(screen.getByTestId("style-legend-row").getAttribute("title")).toContain("Show legend");
        });

        it("reports a change", async () => {
            const onLegendShownChange = vi.fn();

            renderPanel({ onLegendShownChange, legendShown: true });

            fireEvent.click(screen.getByRole("button", { name: "Expand Canvas" }));
            fireEvent.click(await screen.findByRole("switch", { name: "Show legend" }));

            expect(onLegendShownChange).toHaveBeenCalledWith(false);
        });
    });
});
