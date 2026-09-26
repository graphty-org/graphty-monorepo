import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, waitFor, within } from "../../../../test/test-utils";
import { HelpMenu } from "../HelpMenu";

interface HarnessProps {
    readonly initiallyOpened?: boolean;
    readonly moreSuggestionsCount?: number;
    readonly alreadyRunCount?: number;
    readonly onSelect?: (row: string) => void;
}

/**
 * The menu under a shell-like owner: the owner holds the open state, the opener is a
 * plain button, and there is somewhere outside the menu to click.
 */
function Harness(props: HarnessProps): React.JSX.Element {
    const { initiallyOpened = false, moreSuggestionsCount = 0, alreadyRunCount = 0, onSelect = vi.fn() } = props;
    const [opened, setOpened] = useState(initiallyOpened);

    return (
        <div>
            <div data-testid="outside" style={{ width: 300, height: 300 }} />
            <HelpMenu
                opened={opened}
                onOpenChange={setOpened}
                onSelect={(row) => {
                    setOpened(false);
                    onSelect(row);
                }}
                moreSuggestionsCount={moreSuggestionsCount}
                alreadyRunCount={alreadyRunCount}
            >
                <button type="button" style={{ width: 47, height: 44 }}>
                    Help
                </button>
            </HelpMenu>
        </div>
    );
}

function renderMenu(overrides: Omit<HarnessProps, "initiallyOpened"> = {}) {
    const onSelect = vi.fn();

    render(<Harness initiallyOpened onSelect={onSelect} {...overrides} />);

    return { onSelect };
}

async function rowNames(): Promise<(string | null)[]> {
    const menu = await screen.findByRole("menu", { name: "Help" });

    return within(menu)
        .getAllByRole("menuitem")
        .map((row) => row.textContent);
}

function opener(): HTMLElement {
    return screen.getByRole("button", { name: "Help" });
}

describe("HelpMenu", () => {
    describe("rendering", () => {
        it("draws nothing while it is closed", () => {
            render(<Harness moreSuggestionsCount={3} alreadyRunCount={2} />);

            expect(screen.queryByRole("menu")).toBeNull();
        });

        it("is a menu named for its opener", async () => {
            renderMenu();

            expect(await screen.findByRole("menu", { name: "Help" })).toBeInTheDocument();
        });

        it("draws the uncounted rows in order", async () => {
            renderMenu();

            expect(await rowNames()).toEqual([
                "Keyboard shortcuts?",
                "Show suggestions",
                "What the marks mean",
                "Documentation",
                "Send feedback",
            ]);
        });

        it("draws the counted rows in place once their counts are non-zero", async () => {
            renderMenu({ moreSuggestionsCount: 3, alreadyRunCount: 2 });

            expect(await rowNames()).toEqual([
                "Keyboard shortcuts?",
                "Show suggestions",
                "More suggestions (3)",
                "Already run (2)",
                "What the marks mean",
                "Documentation",
                "Send feedback",
            ]);
        });

        it("omits a counted row at zero rather than printing a zero", async () => {
            renderMenu({ moreSuggestionsCount: 0, alreadyRunCount: 2 });

            expect(await screen.findByRole("menuitem", { name: "Already run (2)" })).toBeInTheDocument();
            expect(screen.queryByRole("menuitem", { name: /More suggestions/ })).toBeNull();
        });

        it("marks a counted row as opening a submenu", async () => {
            renderMenu({ moreSuggestionsCount: 3, alreadyRunCount: 2 });

            expect(await screen.findByRole("menuitem", { name: "More suggestions (3)" })).toHaveAttribute(
                "aria-haspopup",
                "menu",
            );
            expect(screen.getByRole("menuitem", { name: "Show suggestions" })).not.toHaveAttribute("aria-haspopup");
        });

        it("carries no leading glyph on any row", async () => {
            renderMenu();

            await screen.findByRole("menu");

            for (const row of screen.getAllByRole("menuitem")) {
                expect(row.querySelector("svg")).toBeNull();
            }
        });

        it("separates the suggestion rows from the reference rows with one rule", async () => {
            renderMenu({ moreSuggestionsCount: 3, alreadyRunCount: 2 });

            const menu = await screen.findByRole("menu");

            expect(within(menu).getAllByRole("separator")).toHaveLength(1);
        });
    });

    describe("the key chip", () => {
        it("prints the shortcuts binding in the row's trailing column", async () => {
            renderMenu();

            const row = await screen.findByRole("menuitem", { name: /^Keyboard shortcuts/ });

            expect(within(row).getByText("?")).toBeInTheDocument();
        });

        it("gives no other row a chip", async () => {
            renderMenu({ moreSuggestionsCount: 3, alreadyRunCount: 2 });

            await screen.findByRole("menu");

            for (const name of ["Show suggestions", "What the marks mean", "Documentation", "Send feedback"]) {
                expect(screen.getByRole("menuitem", { name })).toHaveTextContent(name);
            }
        });
    });

    describe("anchoring", () => {
        it("opens from its opener and says so on the opener", async () => {
            const user = userEvent.setup();

            render(<Harness />);

            expect(opener()).toHaveAttribute("aria-haspopup", "menu");
            expect(opener()).toHaveAttribute("aria-expanded", "false");

            await user.click(opener());

            expect(await screen.findByRole("menu", { name: "Help" })).toBeInTheDocument();
            expect(opener()).toHaveAttribute("aria-expanded", "true");
        });

        it("hangs to the right of its opener, bottom edges shared", async () => {
            renderMenu();

            const menu = await screen.findByRole("menu", { name: "Help" });

            await waitFor(() => {
                const target = opener().getBoundingClientRect();
                const box = menu.getBoundingClientRect();

                // The 47 px rail item, then the rail's 1 px border, then the 8 px gap.
                expect(Math.round(box.left - target.right)).toBe(9);
                expect(Math.round(box.bottom)).toBe(Math.round(target.bottom));
            });
        });

        it("is 200 px wide", async () => {
            renderMenu();

            const menu = await screen.findByRole("menu", { name: "Help" });

            expect(menu.getBoundingClientRect().width).toBe(200);
        });

        it("draws 24 px rows", async () => {
            renderMenu();

            const row = await screen.findByRole("menuitem", { name: "Documentation" });

            expect(row.getBoundingClientRect().height).toBe(24);
        });
    });

    describe("selection", () => {
        it("reports the row that was taken and closes", async () => {
            const user = userEvent.setup();
            const { onSelect } = renderMenu();

            await user.click(await screen.findByRole("menuitem", { name: "Send feedback" }));

            expect(onSelect).toHaveBeenCalledWith("sendFeedback");
            await waitFor(() => {
                expect(screen.queryByRole("menu")).toBeNull();
            });
        });

        it("reports the shortcuts row by its own id", async () => {
            const user = userEvent.setup();
            const { onSelect } = renderMenu();

            await user.click(await screen.findByRole("menuitem", { name: /^Keyboard shortcuts/ }));

            expect(onSelect).toHaveBeenCalledWith("keyboardShortcuts");
        });

        it("reports a counted row by its own id", async () => {
            const user = userEvent.setup();
            const { onSelect } = renderMenu({ alreadyRunCount: 2 });

            await user.click(await screen.findByRole("menuitem", { name: "Already run (2)" }));

            expect(onSelect).toHaveBeenCalledWith("alreadyRun");
        });
    });

    describe("closing", () => {
        it("closes on Escape and returns focus to the opener", async () => {
            const user = userEvent.setup();

            render(<Harness />);

            await user.click(opener());
            await screen.findByRole("menu", { name: "Help" });
            await user.keyboard("{Escape}");

            await waitFor(() => {
                expect(screen.queryByRole("menu")).toBeNull();
            });
            await waitFor(() => {
                expect(document.activeElement).toBe(opener());
            });
        });

        it("closes on a click outside it", async () => {
            const user = userEvent.setup();

            render(<Harness />);

            await user.click(opener());
            await screen.findByRole("menu", { name: "Help" });
            await user.click(screen.getByTestId("outside"));

            await waitFor(() => {
                expect(screen.queryByRole("menu")).toBeNull();
            });
        });

        it("closes when its opener is clicked again", async () => {
            const user = userEvent.setup();

            render(<Harness />);

            await user.click(opener());
            await screen.findByRole("menu", { name: "Help" });
            await user.click(opener());

            await waitFor(() => {
                expect(screen.queryByRole("menu")).toBeNull();
            });
        });
    });

    describe("keyboard", () => {
        it("walks down the rows with the arrow keys", async () => {
            const user = userEvent.setup();

            render(<Harness />);

            await user.click(opener());
            await screen.findByRole("menu", { name: "Help" });
            await user.keyboard("{ArrowDown}");
            await user.keyboard("{ArrowDown}");

            expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Show suggestions" }));
        });
    });
});
