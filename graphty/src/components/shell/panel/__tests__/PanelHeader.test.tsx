import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { PANEL_HEADER_HEIGHT } from "../../constants";
import type { PanelOverflowItem } from "../../types";
import { MORE_LABEL, PanelHeader } from "../PanelHeader";

const glyph = <svg data-testid="glyph" />;

/*
 * A colour toolkit stood here -- `resolveColor`, `relativeLuminance`, `contrastRatio`,
 * `over` and a `STATE_BOUNDARY_MIN_CONTRAST` of 3 -- so the "Keep open" latch's accent
 * boundary could be MEASURED against WCAG 1.4.11 in both colour schemes rather than
 * asserted. The latch was deleted on 2026-09-14 and the toolkit went with it. The
 * measurement itself was never local to this header: the boundary comes from
 * `@graphty/compact-mantine`'s shared ActionIcon `light` theme, which every pressed
 * toggle in the app inherits, and `InspectorHeader.test.tsx` still measures it on the
 * comparison pin.
 */

describe("PanelHeader", () => {
    describe("geometry", () => {
        it("is exactly 36 tall", () => {
            render(<PanelHeader title="Explore" glyph={glyph} />);

            expect(screen.getByTestId("panel-header")).toHaveStyle({ height: `${PANEL_HEADER_HEIGHT}px` });
        });

        it("takes its 8px trailing pad when no More is drawn", () => {
            render(<PanelHeader title="Explore" glyph={glyph} />);

            expect(screen.getByTestId("panel-header")).toHaveStyle({ paddingRight: "8px" });
        });

        it("takes its 12px trailing pad when a More is drawn", () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "a", label: "Expand all sections", onSelect: vi.fn() }]}
                />,
            );

            expect(screen.getByTestId("panel-header")).toHaveStyle({ paddingRight: "12px" });
        });

        it("draws its 16px leading pad on every board", () => {
            render(<PanelHeader title="Explore" glyph={glyph} />);

            expect(screen.getByTestId("panel-header")).toHaveStyle({ paddingLeft: "16px" });
        });
    });

    describe("the leading cluster", () => {
        it("draws the activity glyph and hides it from the accessibility tree", () => {
            render(<PanelHeader title="Explore" glyph={glyph} />);

            expect(screen.getByTestId("panel-header-glyph")).toHaveAttribute("aria-hidden", "true");
        });

        it("draws the activity name as the panel's heading", () => {
            render(<PanelHeader title="Explore" glyph={glyph} />);

            expect(screen.getByRole("heading", { name: "Explore" })).toBeInTheDocument();
        });

        it("carries no panel-level info circle, ever", () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "a", label: "Expand all sections", onSelect: vi.fn() }]}
                />,
            );

            expect(screen.queryByTestId("info-circle")).not.toBeInTheDocument();
        });
    });

    describe("the trailing cluster", () => {
        /* REPLACED two close-control boards on 2026-09-14. The header drew an X titled
           "Close the panel (Ctrl+B)" and a "Keep open" latch beside it; both were
           individual controls over one sidebar. This board is what stands in their place:
           it pins that the cluster holds NOTHING but the panel's own actions slot and its
           optional More, so neither control can grow back unnoticed. */
        it("draws no control of its own for closing or latching the panel", () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "a", label: "Expand all sections", onSelect: vi.fn() }]}
                />,
            );

            const names = Array.from(screen.getByTestId("panel-header").querySelectorAll("button")).map((button) =>
                button.getAttribute("aria-label"),
            );

            expect(names).toEqual([MORE_LABEL]);
            expect(screen.queryByTestId("panel-header-close")).toBeNull();
            expect(screen.queryByTestId("panel-header-keep-open")).toBeNull();
            expect(screen.queryByRole("button", { name: "Keep open" })).toBeNull();
            expect(screen.queryByRole("button", { name: "Close the panel" })).toBeNull();
        });

        it("draws no More when the panel has no overflow rows", () => {
            render(<PanelHeader title="Explore" glyph={glyph} />);

            expect(screen.queryByRole("button", { name: MORE_LABEL })).not.toBeInTheDocument();
        });

        it("draws no More when the overflow list is empty", () => {
            render(<PanelHeader title="Explore" glyph={glyph} overflowItems={[]} />);

            expect(screen.queryByRole("button", { name: MORE_LABEL })).not.toBeInTheDocument();
        });
    });

    /*
     * THE "Keep open latch" DESCRIBE STOOD HERE, eleven boards deep: the latch's place in
     * the trailing cluster, its pressed reporting, its tinted ground, the WCAG 1.4.11
     * measurement of its accent boundary in both colour schemes, its resting ink and its
     * padlock-not-pushpin drawing. A "closing" describe followed the overflow rows and
     * pinned the header X.
     *
     * Both controls were deleted on 2026-09-14, at the product owner's direction ("remove
     * the panel locks and remove autohide ... there is one button to hide / show both at
     * the same time and not individual buttons"). The tests are not weakened, they are
     * retired with the thing they tested, and the board below pins what the header draws
     * now so nothing can quietly grow back into that slot.
     *
     * THE BOUNDARY MEASUREMENT IS NOT LOST. It measured `@graphty/compact-mantine`'s
     * shared ActionIcon `light` theme, which every pressed toggle in the app inherits; the
     * inspector's own pin takes the same treatment and the top bar's Compare and sidebars
     * switches do too.
     */

    describe("the overflow rows", () => {
        it("renders the rows it is given, in order", async () => {
            const rows: PanelOverflowItem[] = [
                { id: "one", label: "Expand all sections", onSelect: vi.fn() },
                { id: "two", label: "Collapse all sections", onSelect: vi.fn() },
            ];

            render(<PanelHeader title="Data" glyph={glyph} overflowItems={rows} />);

            fireEvent.click(screen.getByRole("button", { name: MORE_LABEL }));

            const items = await screen.findAllByRole("menuitem");
            expect(items.map((item) => item.textContent)).toEqual(["Expand all sections", "Collapse all sections"]);
        });

        it("states a disabled row's reason in its title", async () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[
                        {
                            id: "close",
                            label: "Close dataset. Starts a new session",
                            disabled: true,
                            disabledReason: "Load data first",
                            onSelect: vi.fn(),
                        },
                    ]}
                />,
            );

            fireEvent.click(screen.getByRole("button", { name: MORE_LABEL }));

            const row = await screen.findByRole("menuitem", { name: "Close dataset. Starts a new session" });
            expect(row).toHaveAttribute("title", "Load data first");
        });

        it("runs the row it is asked to run", async () => {
            const onSelect = vi.fn();

            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "one", label: "Expand all sections", onSelect }]}
                />,
            );

            fireEvent.click(screen.getByRole("button", { name: MORE_LABEL }));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Expand all sections" }));

            expect(onSelect).toHaveBeenCalledTimes(1);
        });
    });

});
