import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../test/test-utils";
import type { ProviderType } from "../../../types/ai";
import { AiProviderSettings, type AiProviderSettingsProps } from "../AiProviderSettings";

/** An obvious dummy. No test in this file may carry a real key. */
const DUMMY_KEY = "sk-test-not-a-real-key";

/**
 * The key store, stubbed: every method is a spy, so a test asserts what the pane
 * asked the store to do rather than what an encrypted browser store ended up holding.
 * @param overrides - the members this test wants to answer differently.
 * @returns the pane's props.
 */
function keyStore(overrides: Partial<AiProviderSettingsProps> = {}): AiProviderSettingsProps {
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
        ...overrides,
    };
}

describe("AiProviderSettings", () => {
    describe("the provider list", () => {
        it("draws every provider, the local runtime included", () => {
            render(<AiProviderSettings {...keyStore()} />);

            expect(screen.getByTestId("ai-provider-row-anthropic")).toBeInTheDocument();
            expect(screen.getByTestId("ai-provider-row-openai")).toBeInTheDocument();
            expect(screen.getByTestId("ai-provider-row-google")).toBeInTheDocument();
            expect(screen.getByTestId("ai-provider-row-webllm")).toBeInTheDocument();
        });

        it("opens one row so a user with no key at all has a field in front of them", () => {
            render(<AiProviderSettings {...keyStore()} />);

            expect(screen.getByTestId("ai-provider-form-anthropic")).toBeInTheDocument();
            expect(screen.queryByTestId("ai-provider-form-openai")).not.toBeInTheDocument();
        });

        it("moves the open form to the row that was clicked", () => {
            render(<AiProviderSettings {...keyStore()} />);

            fireEvent.click(screen.getByTestId("ai-provider-row-openai"));

            expect(screen.getByTestId("ai-provider-form-openai")).toBeInTheDocument();
            expect(screen.queryByTestId("ai-provider-form-anthropic")).not.toBeInTheDocument();
        });

        it("offers no key form for the local runtime, which needs none", () => {
            render(<AiProviderSettings {...keyStore()} />);

            fireEvent.click(screen.getByTestId("ai-provider-row-webllm"));

            expect(screen.queryByTestId("ai-provider-form-webllm")).not.toBeInTheDocument();
        });

        it("says Connected for the provider that has a key, and only that one", () => {
            const hasKey = vi.fn((provider: ProviderType) => provider === "anthropic");

            render(<AiProviderSettings {...keyStore({ hasKey })} />);

            expect(screen.getByTestId("ai-provider-state-anthropic")).toHaveTextContent("Connected");
            expect(screen.queryByTestId("ai-provider-state-openai")).not.toBeInTheDocument();
        });
    });

    describe("the key field", () => {
        it("is masked", () => {
            render(<AiProviderSettings {...keyStore()} />);

            expect(screen.getByLabelText("API key")).toHaveAttribute("type", "password");
        });

        it("tells the browser and its password managers to keep out of it", () => {
            render(<AiProviderSettings {...keyStore()} />);

            const field = screen.getByLabelText("API key");
            expect(field).toHaveAttribute("autocomplete", "off");
            expect(field).toHaveAttribute("data-lpignore", "true");
        });

        it("takes no key at all until the store can hold one", () => {
            render(<AiProviderSettings {...keyStore({ ready: false })} />);

            expect(screen.getByLabelText("API key")).toBeDisabled();
        });

        it("puts no key in a tooltip", () => {
            render(<AiProviderSettings {...keyStore()} />);

            fireEvent.change(screen.getByLabelText("API key"), { target: { value: DUMMY_KEY } });

            const titles = Array.from(document.querySelectorAll("[title]")).map(
                (element) => element.getAttribute("title") ?? "",
            );

            expect(titles.some((title) => title.includes(DUMMY_KEY))).toBe(false);
        });
    });

    describe("saving, which is what the overlay's header promised", () => {
        it("writes the key when the field loses focus", () => {
            const setKey = vi.fn();

            render(<AiProviderSettings {...keyStore({ setKey })} />);

            const field = screen.getByLabelText("API key");
            fireEvent.change(field, { target: { value: DUMMY_KEY } });
            fireEvent.blur(field);

            expect(setKey).toHaveBeenCalledWith("anthropic", DUMMY_KEY);
        });

        it("writes the key on Enter, without waiting for the focus to move", () => {
            const setKey = vi.fn();

            render(<AiProviderSettings {...keyStore({ setKey })} />);

            const field = screen.getByLabelText("API key");
            fireEvent.change(field, { target: { value: DUMMY_KEY } });
            fireEvent.keyDown(field, { key: "Enter" });

            expect(setKey).toHaveBeenCalledWith("anthropic", DUMMY_KEY);
        });

        it("writes nothing when the field was not changed", () => {
            const setKey = vi.fn();
            const getKey = vi.fn().mockReturnValue(DUMMY_KEY);

            render(<AiProviderSettings {...keyStore({ setKey, getKey, hasKey: vi.fn().mockReturnValue(true) })} />);

            fireEvent.blur(screen.getByLabelText("API key"));

            expect(setKey).not.toHaveBeenCalled();
        });

        it("takes the key away when the field is emptied", () => {
            const removeKey = vi.fn();
            const getKey = vi.fn().mockReturnValue(DUMMY_KEY);

            render(<AiProviderSettings {...keyStore({ removeKey, getKey, hasKey: vi.fn().mockReturnValue(true) })} />);

            const field = screen.getByLabelText("API key");
            fireEvent.change(field, { target: { value: "" } });
            fireEvent.blur(field);

            expect(removeKey).toHaveBeenCalledWith("anthropic");
        });

        it("takes the key away on Remove key", () => {
            const removeKey = vi.fn();

            render(
                <AiProviderSettings
                    {...keyStore({
                        removeKey,
                        getKey: vi.fn().mockReturnValue(DUMMY_KEY),
                        hasKey: vi.fn().mockReturnValue(true),
                    })}
                />,
            );

            fireEvent.click(screen.getByTestId("ai-remove-key-anthropic"));

            expect(removeKey).toHaveBeenCalledWith("anthropic");
        });
    });

    describe("Test connection", () => {
        it("cannot be run before a key is typed", () => {
            render(<AiProviderSettings {...keyStore()} />);

            expect(screen.getByTestId("ai-test-connection-anthropic")).toBeDisabled();
        });

        it("can be run once one is", () => {
            render(<AiProviderSettings {...keyStore()} />);

            fireEvent.change(screen.getByLabelText("API key"), { target: { value: DUMMY_KEY } });

            expect(screen.getByTestId("ai-test-connection-anthropic")).not.toBeDisabled();
        });
    });

    describe("Key storage", () => {
        it("says where the user's credentials go, inline", () => {
            render(<AiProviderSettings {...keyStore()} />);

            expect(
                screen.getByText(
                    "Keys are encrypted and stored in this browser only. They are sent to the provider you choose and nowhere else.",
                ),
            ).toBeInTheDocument();
        });

        it("re-writes a key that was typed before the box was ticked, so it survives a reload", () => {
            const setKey = vi.fn();
            const onEnablePersistence = vi.fn();

            render(<AiProviderSettings {...keyStore({ setKey, onEnablePersistence })} />);

            fireEvent.change(screen.getByLabelText("API key"), { target: { value: DUMMY_KEY } });
            fireEvent.click(screen.getByTestId("ai-remember-keys"));

            expect(onEnablePersistence).toHaveBeenCalled();
            expect(setKey).toHaveBeenCalledWith("anthropic", DUMMY_KEY);
        });

        it("stops remembering without throwing the stored keys away", () => {
            const onDisablePersistence = vi.fn();

            render(<AiProviderSettings {...keyStore({ isPersistenceEnabled: true, onDisablePersistence })} />);

            fireEvent.click(screen.getByTestId("ai-remember-keys"));

            expect(onDisablePersistence).toHaveBeenCalledWith(false);
        });
    });

    describe("Default provider", () => {
        it("is not offered while there is nothing to choose between", () => {
            render(<AiProviderSettings {...keyStore()} />);

            expect(screen.queryByTestId("ai-default-provider")).not.toBeInTheDocument();
        });

        it("is offered once a provider has a key", () => {
            render(<AiProviderSettings {...keyStore({ configuredProviders: ["anthropic"] })} />);

            expect(screen.getByTestId("ai-default-provider")).toBeInTheDocument();
        });

        it("reports the choice", () => {
            const onDefaultProviderChange = vi.fn();

            render(
                <AiProviderSettings
                    {...keyStore({ configuredProviders: ["anthropic", "openai"], onDefaultProviderChange })}
                />,
            );

            fireEvent.change(screen.getByTestId("ai-default-provider"), { target: { value: "openai" } });

            expect(onDefaultProviderChange).toHaveBeenCalledWith("openai");
        });

        it("reports None as no default at all, rather than as a provider named None", () => {
            const onDefaultProviderChange = vi.fn();

            render(
                <AiProviderSettings
                    {...keyStore({
                        configuredProviders: ["anthropic"],
                        defaultProvider: "anthropic",
                        onDefaultProviderChange,
                    })}
                />,
            );

            fireEvent.change(screen.getByTestId("ai-default-provider"), { target: { value: "" } });

            expect(onDefaultProviderChange).toHaveBeenCalledWith(null);
        });
    });
});
