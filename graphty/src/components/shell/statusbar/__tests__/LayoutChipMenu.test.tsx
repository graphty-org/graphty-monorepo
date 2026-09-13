import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { COMING_LABEL, LAYOUT_MENU_LABEL, LayoutChipMenu } from "../LayoutChipMenu";
import type { LayoutQuickPick } from "../statusBarModel";

function quickPicks(onSelect = vi.fn()): LayoutQuickPick[] {
    return [
        {
            id: "force",
            label: "Force directed",
            title: "Force directed (ngraph)",
            estimate: "about 4 min",
            active: true,
            onSelect,
        },
        {
            id: "hierarchical",
            label: "Hierarchical",
            title: "Hierarchical (sugiyama). Coming",
            active: false,
            coming: true,
            onSelect,
        },
        {
            id: "radial",
            label: "Radial",
            title: "Radial (radial). Coming",
            active: false,
            coming: true,
            onSelect,
        },
        {
            id: "more",
            label: "From file",
            title: "From file",
            active: false,
            onSelect,
        },
    ];
}

function defaultProps() {
    return {
        opened: true,
        onOpenChange: vi.fn(),
        picks: quickPicks(),
        onRerun: vi.fn(),
        onStop: vi.fn(),
        onOpenSettings: vi.fn(),
    };
}

describe("LayoutChipMenu", () => {
    describe("the caret half", () => {
        it("names what it opens", () => {
            render(<LayoutChipMenu {...defaultProps()} opened={false} />);

            expect(screen.getByRole("button", { name: LAYOUT_MENU_LABEL })).toBeInTheDocument();
        });

        it("says it opens a menu and whether it is open", () => {
            render(<LayoutChipMenu {...defaultProps()} opened={false} />);

            const caret = screen.getByRole("button", { name: LAYOUT_MENU_LABEL });

            expect(caret).toHaveAttribute("aria-haspopup", "menu");
            expect(caret).toHaveAttribute("aria-expanded", "false");
        });

        it("reports an open when it is clicked", () => {
            const props = { ...defaultProps(), opened: false };

            render(<LayoutChipMenu {...props} />);
            fireEvent.click(screen.getByRole("button", { name: LAYOUT_MENU_LABEL }));

            expect(props.onOpenChange).toHaveBeenCalledWith(true);
        });
    });

    describe("the four quick picks", () => {
        it("draws them above the verbs, in Style's order", () => {
            render(<LayoutChipMenu {...defaultProps()} />);

            const rows = screen.getAllByRole("menuitem").map((row) => row.textContent ?? "");

            expect(rows).toHaveLength(7);
            expect(rows[0]).toContain("Force directed");
            expect(rows[1]).toContain("Hierarchical");
            expect(rows[2]).toContain("Radial");
            expect(rows[3]).toContain("From file");
        });

        it("carries the size estimate", () => {
            render(<LayoutChipMenu {...defaultProps()} />);

            expect(screen.getAllByRole("menuitem")[0].textContent).toContain("about 4 min");
        });

        it("carries the plain-then-technical pair in the row's tooltip", () => {
            render(<LayoutChipMenu {...defaultProps()} />);

            expect(screen.getAllByRole("menuitem")[0]).toHaveAttribute("title", "Force directed (ngraph)");
            expect(screen.getAllByRole("menuitem")[1]).toHaveAttribute("title", "Hierarchical (sugiyama). Coming");
        });

        it("tags an unshipped engine rather than hiding it", () => {
            render(<LayoutChipMenu {...defaultProps()} />);

            const hierarchical = screen.getAllByRole("menuitem")[1];

            expect(hierarchical.textContent).toContain(COMING_LABEL);
            expect(hierarchical).toHaveAttribute("aria-disabled", "true");
        });

        it("applies the engine when a live pick is clicked", () => {
            const onSelect = vi.fn();
            const props = { ...defaultProps(), picks: quickPicks(onSelect) };

            render(<LayoutChipMenu {...props} />);
            fireEvent.click(screen.getAllByRole("menuitem")[0]);

            expect(onSelect).toHaveBeenCalledTimes(1);
        });

        it("does nothing when an unshipped pick is clicked", () => {
            const onSelect = vi.fn();
            const props = { ...defaultProps(), picks: quickPicks(onSelect) };

            render(<LayoutChipMenu {...props} />);
            fireEvent.click(screen.getAllByRole("menuitem")[1]);

            expect(onSelect).not.toHaveBeenCalled();
        });
    });

    describe("the three verbs", () => {
        it("draws Re-run, Stop and Layout settings..., in that order", () => {
            render(<LayoutChipMenu {...defaultProps()} />);

            const rows = screen.getAllByRole("menuitem").map((row) => row.textContent ?? "");

            expect(rows[4]).toBe("Re-run");
            expect(rows[5]).toBe("Stop");
            expect(rows[6]).toBe("Layout settings...");
        });

        it("runs the active engine again", () => {
            const props = defaultProps();

            render(<LayoutChipMenu {...props} />);
            fireEvent.click(screen.getByRole("menuitem", { name: "Re-run" }));

            expect(props.onRerun).toHaveBeenCalledTimes(1);
        });

        it("stops a running layout", () => {
            const props = defaultProps();

            render(<LayoutChipMenu {...props} />);
            fireEvent.click(screen.getByRole("menuitem", { name: "Stop" }));

            expect(props.onStop).toHaveBeenCalledTimes(1);
        });

        it("opens Style with the list focused", () => {
            const props = defaultProps();

            render(<LayoutChipMenu {...props} />);
            fireEvent.click(screen.getByRole("menuitem", { name: "Layout settings..." }));

            expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
        });

        it("stands alone when no engine list has been supplied", () => {
            render(<LayoutChipMenu {...defaultProps()} picks={[]} />);

            expect(screen.getAllByRole("menuitem")).toHaveLength(3);
        });
    });

    describe("no parameters and no All layouts list", () => {
        it("draws seven rows and nothing else", () => {
            render(<LayoutChipMenu {...defaultProps()} />);

            expect(screen.getAllByRole("menuitem")).toHaveLength(7);
        });
    });
});
