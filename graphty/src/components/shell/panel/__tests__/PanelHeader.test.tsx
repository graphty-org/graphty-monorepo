import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { keyChipFor } from "../../bindings";
import { KEEP_OPEN_LABEL, PANEL_HEADER_HEIGHT } from "../../constants";
import type { PanelOverflowItem } from "../../types";
import { CLOSE_PANEL_LABEL, MORE_LABEL, PanelHeader } from "../PanelHeader";

const glyph = <svg data-testid="glyph" />;

function expectedCloseTooltip() {
    const chip = keyChipFor("togglePanel");

    return chip === null ? CLOSE_PANEL_LABEL : `${CLOSE_PANEL_LABEL} (${chip})`;
}

describe("PanelHeader", () => {
    describe("geometry", () => {
        it("is exactly 36 tall", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByTestId("panel-header")).toHaveStyle({ height: `${PANEL_HEADER_HEIGHT}px` });
        });

        it("takes its 8px trailing pad when no More is drawn", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByTestId("panel-header")).toHaveStyle({ paddingRight: "8px" });
        });

        it("takes its 12px trailing pad when a More is drawn", () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "a", label: "Expand all sections", onSelect: vi.fn() }]}
                    onClose={vi.fn()}
                />,
            );

            expect(screen.getByTestId("panel-header")).toHaveStyle({ paddingRight: "12px" });
        });

        it("draws its 16px leading pad on every board", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByTestId("panel-header")).toHaveStyle({ paddingLeft: "16px" });
        });
    });

    describe("the leading cluster", () => {
        it("draws the activity glyph and hides it from the accessibility tree", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByTestId("panel-header-glyph")).toHaveAttribute("aria-hidden", "true");
        });

        it("draws the activity name as the panel's heading", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByRole("heading", { name: "Explore" })).toBeInTheDocument();
        });

        it("carries no panel-level info circle, ever", () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "a", label: "Expand all sections", onSelect: vi.fn() }]}
                    onClose={vi.fn()}
                />,
            );

            expect(screen.queryByTestId("info-circle")).not.toBeInTheDocument();
        });
    });

    describe("the trailing cluster", () => {
        it("titles the close control with the verb and the chip from the one table", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            const close = screen.getByRole("button", { name: CLOSE_PANEL_LABEL });
            expect(close).toBeInTheDocument();
            expect(expectedCloseTooltip()).toContain(CLOSE_PANEL_LABEL);
        });

        it("names the close control without its key chip", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByRole("button", { name: CLOSE_PANEL_LABEL })).toHaveAccessibleName(CLOSE_PANEL_LABEL);
        });

        it("draws no More when the panel has no overflow rows", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.queryByRole("button", { name: MORE_LABEL })).not.toBeInTheDocument();
        });

        it("draws no More when the overflow list is empty", () => {
            render(<PanelHeader title="Explore" glyph={glyph} overflowItems={[]} onClose={vi.fn()} />);

            expect(screen.queryByRole("button", { name: MORE_LABEL })).not.toBeInTheDocument();
        });
    });

    describe("the Keep open latch", () => {
        it("draws the latch left of More and the X, where a region supplies it", () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "a", label: "Expand all sections", onSelect: vi.fn() }]}
                    keptOpen={false}
                    onKeepOpenChange={vi.fn()}
                    onClose={vi.fn()}
                />,
            );

            const names = Array.from(screen.getByTestId("panel-header").querySelectorAll("button")).map((button) =>
                button.getAttribute("aria-label"),
            );

            expect(names).toEqual([KEEP_OPEN_LABEL, MORE_LABEL, CLOSE_PANEL_LABEL]);
        });

        it("draws no latch where the region supplies none", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.queryByRole("button", { name: KEEP_OPEN_LABEL })).not.toBeInTheDocument();
        });

        it("reports its state as a pressed toggle rather than renaming itself", () => {
            render(
                <PanelHeader
                    title="Explore"
                    glyph={glyph}
                    keptOpen
                    onKeepOpenChange={vi.fn()}
                    onClose={vi.fn()}
                />,
            );

            const latch = screen.getByRole("button", { name: KEEP_OPEN_LABEL });

            expect(latch).toHaveAttribute("aria-pressed", "true");
            expect(latch).toHaveAccessibleName(KEEP_OPEN_LABEL);
        });

        it("asks for the state it does not hold", () => {
            const onKeepOpenChange = vi.fn();

            render(
                <PanelHeader
                    title="Explore"
                    glyph={glyph}
                    keptOpen={false}
                    onKeepOpenChange={onKeepOpenChange}
                    onClose={vi.fn()}
                />,
            );

            fireEvent.click(screen.getByRole("button", { name: KEEP_OPEN_LABEL }));

            expect(onKeepOpenChange).toHaveBeenCalledWith(true);
        });

        it("is not the comparison pin: it draws the padlock, never the pushpin", () => {
            render(
                <PanelHeader
                    title="Explore"
                    glyph={glyph}
                    keptOpen={false}
                    onKeepOpenChange={vi.fn()}
                    onClose={vi.fn()}
                />,
            );

            const latch = screen.getByRole("button", { name: KEEP_OPEN_LABEL });

            expect(latch.querySelector('[data-glyph="keepOpen"]')).not.toBeNull();
            expect(latch.querySelector('[data-glyph="pin"]')).toBeNull();
        });
    });

    describe("the overflow rows", () => {
        it("renders the rows it is given, in order", async () => {
            const rows: PanelOverflowItem[] = [
                { id: "one", label: "Expand all sections", onSelect: vi.fn() },
                { id: "two", label: "Collapse all sections", onSelect: vi.fn() },
            ];

            render(<PanelHeader title="Data" glyph={glyph} overflowItems={rows} onClose={vi.fn()} />);

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
                    onClose={vi.fn()}
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
                    onClose={vi.fn()}
                />,
            );

            fireEvent.click(screen.getByRole("button", { name: MORE_LABEL }));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Expand all sections" }));

            expect(onSelect).toHaveBeenCalledTimes(1);
        });
    });

    describe("closing", () => {
        it("reports the close", () => {
            const onClose = vi.fn();

            render(<PanelHeader title="Explore" glyph={glyph} onClose={onClose} />);

            fireEvent.click(screen.getByRole("button", { name: CLOSE_PANEL_LABEL }));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });
});
