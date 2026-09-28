import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { AppShell } from "../AppShell";

/*
   Accessibility checks for the app shell: an axe-core scan of each main state, failing on
   serious and critical findings, plus the behaviour a scan cannot see -- names, tab
   order, Escape and toggle state.
*/

/** The impacts that fail a board. Minor and moderate findings are not gated. */
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

/**
 * Serious findings that are known, filed, and not fixed yet. Each entry names the axe rule,
 * a substring of the offending node's selector or markup, and the issue that tracks it. Delete the
 * entry with the fix; anything not listed here fails the scan.
 */
const KNOWN_VIOLATIONS: readonly { readonly rule: string; readonly target: string; readonly issue: number }[] = [
    // The welcome sample rows are role="button" cards that hold a link and a second button.
    { rule: "nested-interactive", target: "[data-sample-row=", issue: 508 },
    // Primary-blue links and hints on the dark canvas measure 2.65:1 to 3.11:1.
    { rule: "color-contrast", target: "[data-sample-row=", issue: 508 },
    { rule: "color-contrast", target: "[data-sample-hint=", issue: 508 },
    { rule: "color-contrast", target: 'a[href$="graphty.app/"]', issue: 508 },
    { rule: "color-contrast", target: "or paste data", issue: 508 },
    // The Coming tag's chrome ink on the raised fill measures 4.42:1 at 10px.
    { rule: "color-contrast", target: 'span[title="Coming"]', issue: 509 },
    // A filled button's white label on the dark Figma primary blue (#0c8ce9) measures 3.53:1.
    { rule: "color-contrast", target: "mantine-Button-label", issue: 579 },
];

/**
 * Renders the shell with the store pinned and lets the canvas measurement land.
 * @returns the render result.
 */
async function renderShell() {
    const result = render(<AppShell initialShellWidth={1440} measureViewport={false} persist={false} />);

    await act(async () => {
        await Promise.resolve();
    });

    return result;
}

/**
 * Renders the shell and loads the cat sample, answering the element's load at once and
 * reporting it complete, so the panels that wait for data are enabled.
 */
async function renderLoadedShell(): Promise<void> {
    const { container } = await renderShell();
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();
    Object.defineProperty(element, "addDataFromSource", {
        configurable: true,
        value: () => Promise.resolve({ loadId: 1 }),
    });

    await userEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
    await act(async () => {
        element?.dispatchEvent(new CustomEvent("data-loaded", { bubbles: true, composed: true }));
        await Promise.resolve();
    });
}

/**
 * Runs axe over the whole document, since Mantine portals dialogs and menus out of the
 * render container, and fails with a readable list of every unlisted serious finding.
 */
async function expectNoSeriousViolations(): Promise<void> {
    // Measure the settled look: compact-mantine transitions text colour, and a scan taken while a
    // transition runs reads an in-between colour (a section title measured 1.3:1 mid-fade).
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    const results = await axe.run(document.body, { resultTypes: ["violations"] });
    const blocking = results.violations
        .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""))
        .flatMap((violation) =>
            violation.nodes
                .filter((node) => {
                    const where = `${node.target.join(" ")} ${node.html}`;

                    return !KNOWN_VIOLATIONS.some(
                        (known) => known.rule === violation.id && where.includes(known.target),
                    );
                })
                .map(
                    (node) =>
                        `${violation.id} (${String(violation.impact)}): ${node.target.join(" ")}\n` +
                        `  ${node.html.slice(0, 200)}\n  ${node.failureSummary ?? ""}`,
                ),
        );

    expect(blocking, blocking.join("\n")).toEqual([]);
}

/** The roles a reader operates, each of which must carry a name. */
const INTERACTIVE_ROLES = ["button", "menuitem", "checkbox", "switch", "textbox", "combobox", "tab", "link"] as const;

/** Asserts every operable control in the document has a non-empty accessible name. */
function expectEveryControlNamed(): void {
    const unnamed = INTERACTIVE_ROLES.flatMap((role) =>
        screen.queryAllByRole(role, { name: "" }).map((control) => `${role}: ${control.outerHTML.slice(0, 160)}`),
    );

    expect(unnamed, unnamed.join("\n")).toEqual([]);
}

/**
 * Opens the command palette from its top bar trigger.
 * @returns the trigger.
 */
async function openPalette(): Promise<HTMLElement> {
    const trigger = screen.getByRole("button", { name: /Search commands, nodes and edges/ });

    await userEvent.click(trigger);
    await screen.findByTestId("command-palette");

    return trigger;
}

/**
 * Opens the rail's Help menu.
 * @returns the Help button.
 */
async function openHelp(): Promise<HTMLElement> {
    const help = screen.getByRole("button", { name: "Help and keyboard shortcuts" });

    await userEvent.click(help);
    await screen.findByRole("menu");

    return help;
}

/**
 * Opens the keyboard shortcuts overlay from the Help menu with the keyboard alone, and
 * waits for the menu to go.
 *
 * Keyboard, not clicks: a click leaves the pointer over the Help button, whose hover
 * tooltip then opens after its delay, and an open tooltip rightly takes the next Escape
 * for itself (WCAG 1.4.13), so whether Escape reached the overlay would depend on the
 * delay.
 */
async function openShortcuts(): Promise<void> {
    screen.getByRole("button", { name: "Help and keyboard shortcuts" }).focus();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("menu");
    expect(screen.getByRole("menuitem", { name: /Keyboard shortcuts/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
    });
    expect(screen.getByTestId("keyboard-shortcuts")).toBeInTheDocument();
}

/**
 * The rail's own button for an activity, since a panel can draw a button of the same name.
 * @param name - the activity's name.
 * @returns the rail button.
 */
function railButton(name: string): HTMLElement {
    return within(screen.getByRole("navigation", { name: "Activity rail" })).getByRole("button", { name });
}

describe("AppShell accessibility", () => {
    describe("axe finds no serious or critical violation", () => {
        it("in the default state, with the Data panel and the inspector open", async () => {
            await renderShell();

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByTestId("inspector")).toBeInTheDocument();
            await expectNoSeriousViolations();
        });

        it("with both sidebars collapsed", async () => {
            await renderShell();
            await userEvent.click(screen.getByRole("button", { name: "Toggle sidebars" }));

            expect(screen.queryByTestId("inspector")).toBeNull();
            await expectNoSeriousViolations();
        });

        it("with a graph loaded", async () => {
            await renderLoadedShell();

            await expectNoSeriousViolations();
        });

        it.each(["Explore", "Analyze", "Style", "Present"])("with the %s panel open", async (panel) => {
            await renderLoadedShell();
            await userEvent.click(railButton(panel));

            expect(screen.getByRole("region", { name: panel })).toBeInTheDocument();
            await expectNoSeriousViolations();
        });

        it("with the AI panel open", async () => {
            await renderShell();
            await userEvent.click(railButton("AI"));

            expect(screen.getByRole("region", { name: "AI" })).toBeInTheDocument();
            await expectNoSeriousViolations();
        });

        it("with the Settings overlay open", async () => {
            await renderShell();
            await userEvent.click(railButton("Settings"));

            expect(screen.getByTestId("settings-overlay")).toBeInTheDocument();
            await expectNoSeriousViolations();
        });

        it("with the command palette open", async () => {
            await renderShell();
            await openPalette();

            await expectNoSeriousViolations();
        });

        it("with the Help menu open", async () => {
            await renderShell();
            await openHelp();

            await expectNoSeriousViolations();
        });

        it("with the keyboard shortcuts overlay open", async () => {
            await renderShell();
            await openShortcuts();

            await expectNoSeriousViolations();
        });
    });

    describe("accessible names", () => {
        it("names every control in the default state", async () => {
            await renderShell();

            expectEveryControlNamed();
        });

        it("names every control once a graph is loaded", async () => {
            await renderLoadedShell();

            expectEveryControlNamed();
        });

        it("names every control in the command palette", async () => {
            await renderShell();
            await openPalette();

            expectEveryControlNamed();
        });

        it("names every control in the Help menu", async () => {
            await renderShell();
            await openHelp();

            expectEveryControlNamed();
        });
    });

    describe("focus order", () => {
        it("tabs through the top bar, then the rail, then the panel, then the inspector", async () => {
            await renderShell();

            const regions = [
                screen.getByTestId("app-shell").firstElementChild as HTMLElement,
                screen.getByRole("navigation", { name: "Activity rail" }),
                screen.getByRole("region", { name: "Data" }),
                screen.getByTestId("inspector"),
            ];
            // Each region in the order Tab first reaches it.
            const reached: number[] = [];
            const tabbable = document.querySelectorAll("button, a[href], input, [tabindex]").length;

            // One pass over every tabbable element in the document is enough to meet them all.
            for (let step = 0; step < tabbable && reached.length < regions.length; step++) {
                await userEvent.tab();

                const index = regions.findIndex((region) => region.contains(document.activeElement));

                if (index !== -1 && !reached.includes(index)) {
                    reached.push(index);
                }
            }

            expect(reached).toEqual([0, 1, 2, 3]);
        });
    });

    describe("Escape", () => {
        it("closes the command palette and returns focus to its trigger", async () => {
            await renderShell();

            const trigger = await openPalette();

            await userEvent.keyboard("{Escape}");

            await waitFor(() => {
                expect(screen.queryByTestId("command-palette")).toBeNull();
            });
            await waitFor(() => {
                expect(trigger).toHaveFocus();
            });
        });

        it("closes the Help menu and returns focus to the Help button", async () => {
            await renderShell();

            const help = await openHelp();

            await userEvent.keyboard("{Escape}");

            await waitFor(() => {
                expect(screen.queryByRole("menu")).toBeNull();
            });
            await waitFor(() => {
                expect(help).toHaveFocus();
            });
        });

        it("closes the keyboard shortcuts overlay and returns focus to the Help button", async () => {
            await renderShell();
            await openShortcuts();
            // Focus back on the Help button opens its tooltip, and Escape dismisses a tooltip first
            // (issue 579); the next Escape reaches the shell and closes the overlay.
            await userEvent.keyboard("{Escape}");
            if (screen.queryByTestId("keyboard-shortcuts") !== null) {
                await userEvent.keyboard("{Escape}");
            }

            expect(screen.queryByTestId("keyboard-shortcuts")).toBeNull();
            await waitFor(() => {
                expect(screen.getByRole("button", { name: "Help and keyboard shortcuts" })).toHaveFocus();
            });
        });
    });

    describe("toggle state", () => {
        it("exposes the sidebars switch as a pressed toggle that follows the sidebars", async () => {
            await renderShell();

            const toggle = screen.getByRole("button", { name: "Toggle sidebars" });

            expect(toggle).toHaveAttribute("aria-pressed", "true");
            await userEvent.click(toggle);
            expect(screen.getByRole("button", { name: "Toggle sidebars" })).toHaveAttribute("aria-pressed", "false");
        });

        it("marks the active rail destination pressed and every other one not pressed", async () => {
            await renderLoadedShell();
            await userEvent.click(railButton("Style"));

            const rail = screen.getByRole("navigation", { name: "Activity rail" });
            const destinations = within(rail)
                .getAllByRole("button")
                .filter((button) => button.hasAttribute("data-activity"));

            expect(destinations.length).toBeGreaterThan(1);

            for (const button of destinations) {
                const active = button.getAttribute("data-activity") === "style";

                expect(button, button.getAttribute("data-activity") ?? "").toHaveAttribute(
                    "aria-pressed",
                    String(active),
                );
            }
        });

        it("reports the Help menu's open state through aria-expanded", async () => {
            await renderShell();

            const help = screen.getByRole("button", { name: "Help and keyboard shortcuts" });

            expect(help).toHaveAttribute("aria-expanded", "false");
            await openHelp();
            expect(help).toHaveAttribute("aria-expanded", "true");
        });

        it("reports every section's expand and collapse state through aria-expanded", async () => {
            await renderLoadedShell();
            await userEvent.click(railButton("Style"));

            const collapsers = screen.queryAllByRole("button", { name: /^(Expand|Collapse) / });

            expect(collapsers.length).toBeGreaterThan(0);

            for (const control of collapsers) {
                expect(control, control.getAttribute("aria-label") ?? "").toHaveAttribute("aria-expanded");
            }
        });
    });
});
