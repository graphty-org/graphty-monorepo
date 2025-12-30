import {describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen, waitFor} from "../../../test/test-utils";
import {AiSettingsModal} from "../AiSettingsModal";

describe("AiSettingsModal", () => {
    const defaultProps = {
        opened: true,
        onClose: vi.fn(),
        getKey: vi.fn().mockReturnValue(undefined),
        setKey: vi.fn(),
        removeKey: vi.fn(),
        hasKey: vi.fn().mockReturnValue(false),
        configuredProviders: [] as ("openai" | "anthropic" | "google" | "webllm")[],
        defaultProvider: null,
        onDefaultProviderChange: vi.fn(),
        isPersistenceEnabled: false,
        onEnablePersistence: vi.fn(),
        onDisablePersistence: vi.fn(),
    };

    describe("rendering", () => {
        it("renders modal when opened", () => {
            render(<AiSettingsModal {...defaultProps} />);

            expect(screen.getByRole("dialog")).toBeInTheDocument();
            expect(screen.getByText("AI Settings")).toBeInTheDocument();
        });

        it("does not render modal when closed", () => {
            render(<AiSettingsModal {...defaultProps} opened={false} />);

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("shows provider selector", () => {
            render(<AiSettingsModal {...defaultProps} />);

            expect(screen.getByText("AI Provider")).toBeInTheDocument();
        });

        it("shows API key input for providers that require keys", () => {
            render(<AiSettingsModal {...defaultProps} />);

            // Default is OpenAI which requires a key
            expect(screen.getByLabelText("API Key")).toBeInTheDocument();
        });

        it("shows Save and Cancel buttons", () => {
            render(<AiSettingsModal {...defaultProps} />);

            expect(screen.getByRole("button", {name: /save/i})).toBeInTheDocument();
            expect(screen.getByRole("button", {name: /cancel/i})).toBeInTheDocument();
        });
    });

    describe("provider selection", () => {
        it("shows all providers in the dropdown", async() => {
            render(<AiSettingsModal {...defaultProps} />);

            // Find and click the provider selector
            const providerSelect = screen.getByRole("textbox", {name: /ai provider/i});
            fireEvent.click(providerSelect);

            // Wait for dropdown to open and check options
            await waitFor(() => {
                expect(screen.getByRole("option", {name: /openai/i})).toBeInTheDocument();
                expect(screen.getByRole("option", {name: /anthropic/i})).toBeInTheDocument();
                expect(screen.getByRole("option", {name: /google/i})).toBeInTheDocument();
                expect(screen.getByRole("option", {name: /webllm/i})).toBeInTheDocument();
            });
        });
    });

    describe("API key input", () => {
        it("shows password input for OpenAI", () => {
            render(<AiSettingsModal {...defaultProps} />);

            const keyInput = screen.getByLabelText("API Key");
            expect(keyInput).toHaveAttribute("type", "password");
        });

        it("shows Test Connection button", () => {
            render(<AiSettingsModal {...defaultProps} />);

            expect(screen.getByRole("button", {name: /test connection/i})).toBeInTheDocument();
        });

        it("disables Test Connection when no key entered", () => {
            render(<AiSettingsModal {...defaultProps} />);

            const testButton = screen.getByRole("button", {name: /test connection/i});
            expect(testButton).toBeDisabled();
        });

        it("enables Test Connection when key is entered", async() => {
            render(<AiSettingsModal {...defaultProps} />);

            const keyInput = screen.getByLabelText("API Key");
            fireEvent.change(keyInput, {target: {value: "sk-test-key-12345678901234567890"}});

            await waitFor(() => {
                const testButton = screen.getByRole("button", {name: /test connection/i});
                expect(testButton).not.toBeDisabled();
            });
        });
    });

    describe("persistence options", () => {
        it("shows persistence checkbox", () => {
            render(<AiSettingsModal {...defaultProps} />);

            expect(screen.getByLabelText(/remember api keys/i)).toBeInTheDocument();
        });

        it("shows security notice when enabling persistence", async() => {
            render(<AiSettingsModal {...defaultProps} />);

            const checkbox = screen.getByLabelText(/remember api keys/i);
            fireEvent.click(checkbox);

            await waitFor(() => {
                expect(screen.getByText(/security notice/i)).toBeInTheDocument();
            });
        });

        it("shows encryption password field when enabling persistence", async() => {
            render(<AiSettingsModal {...defaultProps} />);

            const checkbox = screen.getByLabelText(/remember api keys/i);
            fireEvent.click(checkbox);

            await waitFor(() => {
                expect(screen.getByLabelText(/encryption password/i)).toBeInTheDocument();
            });
        });
    });

    describe("modal actions", () => {
        it("calls onClose when Cancel is clicked", () => {
            const onClose = vi.fn();
            render(<AiSettingsModal {...defaultProps} onClose={onClose} />);

            const cancelButton = screen.getByRole("button", {name: /cancel/i});
            fireEvent.click(cancelButton);

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("calls onClose when Save is clicked", () => {
            const onClose = vi.fn();
            render(<AiSettingsModal {...defaultProps} onClose={onClose} />);

            const saveButton = screen.getByRole("button", {name: /save/i});
            fireEvent.click(saveButton);

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("calls setKey when saving with a key entered", () => {
            const setKey = vi.fn();
            render(<AiSettingsModal {...defaultProps} setKey={setKey} />);

            // Enter a key
            const keyInput = screen.getByLabelText("API Key");
            fireEvent.change(keyInput, {target: {value: "sk-test-key-12345678901234567890"}});

            // Click save
            const saveButton = screen.getByRole("button", {name: /save/i});
            fireEvent.click(saveButton);

            expect(setKey).toHaveBeenCalledWith("openai", "sk-test-key-12345678901234567890");
        });
    });

    describe("default provider selection", () => {
        it("shows default provider dropdown when multiple providers configured", () => {
            const props = {
                ... defaultProps,
                configuredProviders: ["openai", "anthropic"] as ("openai" | "anthropic")[],
                hasKey: vi.fn().mockReturnValue(true),
                getKey: vi.fn().mockReturnValue("sk-test"),
            };
            render(<AiSettingsModal {...props} />);

            expect(screen.getByText("Default Provider")).toBeInTheDocument();
        });

        it("does not show default provider dropdown when only one provider configured", () => {
            // Only return key for OpenAI, not for other providers
            const getKeyMock = vi.fn((provider: string) => {
                if (provider === "openai") {
                    return "sk-test";
                }

                return undefined;
            });
            const hasKeyMock = vi.fn((provider: string) => provider === "openai");

            const props = {
                ... defaultProps,
                configuredProviders: ["openai"] as ("openai")[],
                hasKey: hasKeyMock,
                getKey: getKeyMock,
            };
            render(<AiSettingsModal {...props} />);

            // "Default Provider" should not appear since only one provider is configured
            expect(screen.queryByText("Default Provider")).not.toBeInTheDocument();
        });
    });
});
