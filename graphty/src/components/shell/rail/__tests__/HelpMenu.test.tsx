import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, within } from "../../../../test/test-utils";
import { HelpMenu } from "../HelpMenu";

function renderMenu(overrides: { moreSuggestionsCount?: number; alreadyRunCount?: number } = {}) {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
        <HelpMenu
            opened
            onOpenChange={onOpenChange}
            onSelect={onSelect}
            moreSuggestionsCount={overrides.moreSuggestionsCount ?? 0}
            alreadyRunCount={overrides.alreadyRunCount ?? 0}
        />,
    );

    return { onOpenChange, onSelect };
}

function rowNames(): (string | null)[] {
    return screen.getAllByRole("menuitem").map((row) => row.textContent);
}

describe("HelpMenu", () => {
    describe("rendering", () => {
        it("draws nothing while it is closed", () => {
            render(
                <HelpMenu
                    opened={false}
                    onOpenChange={vi.fn()}
                    onSelect={vi.fn()}
                    moreSuggestionsCount={3}
                    alreadyRunCount={2}
                />,
            );

            expect(screen.queryByRole("menu")).toBeNull();
        });

        it("is a menu named for its opener", () => {
            renderMenu();

            expect(screen.getByRole("menu", { name: "Help" })).toBeInTheDocument();
        });

        it("draws the uncounted rows in order", () => {
            renderMenu();

            expect(rowNames()).toEqual([
                "Keyboard shortcuts?",
                "Show suggestions",
                "What the marks mean",
                "Documentation",
                "Send feedback",
            ]);
        });

        it("draws the counted rows in place once their counts are non-zero", () => {
            renderMenu({ moreSuggestionsCount: 3, alreadyRunCount: 2 });

            expect(rowNames()).toEqual([
                "Keyboard shortcuts?",
                "Show suggestions",
                "More suggestions (3)",
                "Already run (2)",
                "What the marks mean",
                "Documentation",
                "Send feedback",
            ]);
        });

        it("omits a counted row at zero rather than printing a zero", () => {
            renderMenu({ moreSuggestionsCount: 0, alreadyRunCount: 2 });

            expect(screen.queryByRole("menuitem", { name: /More suggestions/ })).toBeNull();
            expect(screen.getByRole("menuitem", { name: "Already run (2)" })).toBeInTheDocument();
        });

        it("marks a counted row as opening a submenu", () => {
            renderMenu({ moreSuggestionsCount: 3, alreadyRunCount: 2 });

            expect(screen.getByRole("menuitem", { name: "More suggestions (3)" })).toHaveAttribute(
                "aria-haspopup",
                "menu",
            );
            expect(screen.getByRole("menuitem", { name: "Show suggestions" })).not.toHaveAttribute("aria-haspopup");
        });

        it("carries no leading glyph on any row", () => {
            renderMenu();

            for (const row of screen.getAllByRole("menuitem")) {
                expect(row.querySelector("svg")).toBeNull();
            }
        });

        it("separates the suggestion rows from the reference rows with one rule", () => {
            renderMenu({ moreSuggestionsCount: 3, alreadyRunCount: 2 });

            expect(screen.getAllByRole("separator")).toHaveLength(1);
        });
    });

    describe("the key chip", () => {
        it("prints the shortcuts binding in the row's trailing column", () => {
            renderMenu();

            const row = screen.getByRole("menuitem", { name: /^Keyboard shortcuts/ });

            expect(within(row).getByText("?")).toBeInTheDocument();
        });

        it("gives no other row a chip", () => {
            renderMenu({ moreSuggestionsCount: 3, alreadyRunCount: 2 });

            for (const name of ["Show suggestions", "What the marks mean", "Documentation", "Send feedback"]) {
                expect(screen.getByRole("menuitem", { name })).toHaveTextContent(name);
            }
        });
    });

    describe("anchoring", () => {
        it("hangs in the rail lane at left 56", () => {
            renderMenu();

            expect(window.getComputedStyle(screen.getByRole("menu")).left).toBe("56px");
        });

        it("shares its bottom edge with the opener", () => {
            renderMenu();

            expect(window.getComputedStyle(screen.getByRole("menu")).bottom).toBe("4px");
        });

        it("is 200 px wide", () => {
            renderMenu();

            expect(screen.getByRole("menu").getBoundingClientRect().width).toBe(200);
        });

        it("puts an 8 px caret on the edge that faces the rail, at the opener's centre", () => {
            renderMenu();

            const caret = screen.getByRole("menu").querySelector<HTMLElement>("[data-help-menu-caret]");

            expect(caret).not.toBeNull();
            expect(caret!.getBoundingClientRect().width).toBe(8);

            const styles = window.getComputedStyle(caret!);

            expect(styles.left).toBe("-8px");
            expect(styles.bottom).toBe("13px");
        });

        it("draws 24 px rows", () => {
            renderMenu();

            expect(screen.getByRole("menuitem", { name: "Documentation" }).getBoundingClientRect().height).toBe(24);
        });
    });

    describe("selection", () => {
        it("reports the row that was taken", async () => {
            const user = userEvent.setup();
            const { onSelect } = renderMenu();

            await user.click(screen.getByRole("menuitem", { name: "Send feedback" }));

            expect(onSelect).toHaveBeenCalledWith("sendFeedback");
        });

        it("reports the shortcuts row by its own id", async () => {
            const user = userEvent.setup();
            const { onSelect } = renderMenu();

            await user.click(screen.getByRole("menuitem", { name: /^Keyboard shortcuts/ }));

            expect(onSelect).toHaveBeenCalledWith("keyboardShortcuts");
        });

        it("reports a counted row by its own id", async () => {
            const user = userEvent.setup();
            const { onSelect } = renderMenu({ alreadyRunCount: 2 });

            await user.click(screen.getByRole("menuitem", { name: "Already run (2)" }));

            expect(onSelect).toHaveBeenCalledWith("alreadyRun");
        });
    });

    describe("keyboard", () => {
        it("puts focus on the first row when it opens", () => {
            renderMenu();

            expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: /^Keyboard shortcuts/ }));
        });

        it("walks down the rows", () => {
            renderMenu();

            fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });

            expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Show suggestions" }));
        });

        it("wraps from the first row to the last", () => {
            renderMenu();

            fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" });

            expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Send feedback" }));
        });

        it("jumps to the last row on End and back on Home", () => {
            renderMenu();

            fireEvent.keyDown(screen.getByRole("menu"), { key: "End" });

            expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Send feedback" }));

            fireEvent.keyDown(screen.getByRole("menu"), { key: "Home" });

            expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: /^Keyboard shortcuts/ }));
        });

        it("closes on Escape", () => {
            const { onOpenChange } = renderMenu();

            fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });
});
