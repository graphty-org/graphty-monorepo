import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import type { AiProviderSettingsProps } from "../../../ai/AiProviderSettings";
import { SHELL_KEY_BINDINGS } from "../../bindings";
import { OVERLAY_INSET } from "../../constants";
import { SETTINGS_SECTIONS, SettingsOverlay } from "../SettingsOverlay";

/**
 * The key store Settings is handed by the shell, stubbed: the AI pane is a real pane
 * now, so every render of the overlay has to supply one.
 * @returns a store that holds no keys and records nothing.
 */
function emptyKeyStore(): AiProviderSettingsProps {
    return {
        getKey: vi.fn().mockReturnValue(undefined),
        setKey: vi.fn(),
        removeKey: vi.fn(),
        hasKey: vi.fn().mockReturnValue(false),
        configuredProviders: [],
        defaultProvider: null,
        onDefaultProviderChange: vi.fn(),
        isPersistenceEnabled: false,
        onEnablePersistence: vi.fn(),
        onDisablePersistence: vi.fn(),
    };
}

describe("SettingsOverlay", () => {
    describe("when closed", () => {
        it("draws nothing at all", () => {
            render(<SettingsOverlay opened={false} onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            expect(screen.queryByTestId("settings-overlay")).not.toBeInTheDocument();
        });
    });

    describe("chrome", () => {
        it("is a full-panel overlay inset 12 on all four sides", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            expect(screen.getByTestId("settings-overlay")).toHaveStyle({ padding: `${OVERLAY_INSET}px` });
        });

        it("is a dialog named for itself", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
        });

        it("says what Close will do before it does it", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            expect(screen.getByText("Changes save automatically")).toBeInTheDocument();
        });

        it("titles the close control with its binding and names it without one", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            const close = screen.getByTestId("settings-close");
            expect(close).toHaveAttribute("title", "Close (Esc)");
            expect(close).toHaveAccessibleName("Close");
        });

        it("closes", () => {
            const onClose = vi.fn();

            render(<SettingsOverlay opened onClose={onClose} aiProviders={emptyKeyStore()} />);

            fireEvent.click(screen.getByTestId("settings-close"));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe("the seven sections", () => {
        it("draws them in the frozen order", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            const tabs = screen.getAllByRole("tab");
            expect(tabs.map((tab) => tab.textContent)).toEqual([
                "Appearance",
                "Defaults",
                "Keyboard shortcuts",
                "Performance",
                "AI providers",
                "Data management",
                "Extensions",
            ]);
        });

        it("counts exactly seven", () => {
            expect(SETTINGS_SECTIONS).toHaveLength(7);
        });

        it("rests on Appearance", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            expect(screen.getByRole("tab", { name: "Appearance" })).toHaveAttribute("aria-selected", "true");
        });

        it("keeps the fuller name of a shortened row in its title", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            expect(screen.getByRole("tab", { name: "AI providers" })).toHaveAttribute(
                "title",
                "AI providers and keys",
            );
        });

        it("moves between panes", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            fireEvent.click(screen.getByRole("tab", { name: "Keyboard shortcuts" }));

            expect(screen.getByRole("tabpanel", { name: "Keyboard shortcuts" })).toBeInTheDocument();
        });
    });

    describe("Appearance", () => {
        it("re-homes the app's own colour scheme control", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            expect(screen.getByRole("tabpanel", { name: "Appearance" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /^Switch to/ })).toBeInTheDocument();
        });
    });

    describe("the section a caller asks for", () => {
        it("opens on it rather than on the section the overlay was last left on", () => {
            render(<SettingsOverlay opened section="ai" onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            expect(screen.getByRole("tabpanel", { name: "AI providers" })).toBeInTheDocument();
        });

        it("still lets the user go somewhere else once they are there", () => {
            render(<SettingsOverlay opened section="ai" onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            fireEvent.click(screen.getByRole("tab", { name: "Appearance" }));

            expect(screen.getByRole("tabpanel", { name: "Appearance" })).toBeInTheDocument();
        });

        it("opens where it was left when no caller asks for a section", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            expect(screen.getByRole("tabpanel", { name: "Appearance" })).toBeInTheDocument();
        });
    });

    describe("AI providers", () => {
        it("draws the provider list rather than a Coming tag", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            fireEvent.click(screen.getByRole("tab", { name: "AI providers" }));

            expect(screen.getByTestId("ai-provider-list")).toBeInTheDocument();
            expect(screen.queryByTestId("coming-tag")).not.toBeInTheDocument();
        });

        it("opens a key field a user can actually type into", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            fireEvent.click(screen.getByRole("tab", { name: "AI providers" }));

            expect(screen.getByTestId("ai-key-input-anthropic")).toBeInTheDocument();
        });

        it("keeps the pane's teaching sentence behind the heading's info circle", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            fireEvent.click(screen.getByRole("tab", { name: "AI providers" }));

            expect(screen.getByTestId("settings-pane-info")).toHaveAttribute(
                "title",
                "Connect a provider to use the AI assistant. All features work without AI: loading data, exploring, running algorithms, styling and exporting never need a provider.",
            );
        });
    });

    describe("the four panes that are still stubs", () => {
        it.each(["Defaults", "Performance", "Data management", "Extensions"])("tags %s", (label) => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            fireEvent.click(screen.getByRole("tab", { name: label }));

            expect(screen.getByTestId("coming-tag")).toBeInTheDocument();
        });
    });

    describe("Keyboard shortcuts", () => {
        it("renders the whole table, unshipped rows included", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            fireEvent.click(screen.getByRole("tab", { name: "Keyboard shortcuts" }));

            const rows = screen.getAllByRole("row");
            expect(rows).toHaveLength(SHELL_KEY_BINDINGS.length);
        });

        it("tags an unshipped row and gives it no key chip", () => {
            render(<SettingsOverlay opened onClose={vi.fn()} aiProviders={emptyKeyStore()} />);

            fireEvent.click(screen.getByRole("tab", { name: "Keyboard shortcuts" }));

            const unshipped = SHELL_KEY_BINDINGS.filter((binding) => !binding.shipped);

            expect(screen.getAllByTestId("coming-tag")).toHaveLength(unshipped.length);
        });
    });
});
