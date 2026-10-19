import { MantineProvider } from "@mantine/core";
import { render as renderBare } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { theme } from "../../../theme";
import type { ProviderType } from "../../../types/ai";
import { AiProviderSettings, type AiProviderSettingsProps } from "../AiProviderSettings";

const provider = { configure: vi.fn(), validateApiKey: vi.fn().mockResolvedValue(true) };
const createProvider = vi.fn(() => provider);

vi.mock("../../../types/ai", () => ({
    getCreateProvider: vi.fn(() => Promise.resolve(createProvider)),
}));

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

/**
 * The color an element is drawn on: the first ancestor that paints an opaque background.
 * @param element - the element
 * @returns the background color
 */
function groundOf(element: Element): string {
    for (let node: Element | null = element; node; node = node.parentElement) {
        const color = getComputedStyle(node).backgroundColor;
        if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
            return color;
        }
    }
    return "rgb(255, 255, 255)";
}

/**
 * The WCAG 2.x contrast ratio of two opaque `rgb()` colors.
 * @param fg - the foreground color
 * @param bg - the background color
 * @returns the ratio
 */
function contrast(fg: string, bg: string): number {
    const lum = (color: string): number => {
        const [r, g, b] = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map((part) => {
            const c = Number(part) / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
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

        it("moves the open form to the row that was clicked", async () => {
            render(<AiProviderSettings {...keyStore()} />);

            await userEvent.click(screen.getByTestId("ai-provider-row-openai"));

            expect(screen.getByTestId("ai-provider-form-openai")).toBeInTheDocument();
            expect(screen.queryByTestId("ai-provider-form-anthropic")).not.toBeInTheDocument();
        });

        it("offers no key form for the local runtime, which needs none", async () => {
            render(<AiProviderSettings {...keyStore()} />);

            await userEvent.click(screen.getByTestId("ai-provider-row-webllm"));

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

        it("puts no key in a tooltip", async () => {
            render(<AiProviderSettings {...keyStore()} />);

            await userEvent.fill(screen.getByLabelText("API key"), DUMMY_KEY);

            const titles = Array.from(document.querySelectorAll("[title]")).map(
                (element) => element.getAttribute("title") ?? "",
            );

            expect(titles.some((title) => title.includes(DUMMY_KEY))).toBe(false);
        });
    });

    describe("saving, which is what the overlay's header promised", () => {
        it("writes the key when the field loses focus", async () => {
            const setKey = vi.fn();

            render(<AiProviderSettings {...keyStore({ setKey })} />);

            const field = screen.getByLabelText("API key");
            await userEvent.fill(field, DUMMY_KEY);
            await userEvent.tab();

            expect(setKey).toHaveBeenCalledWith("anthropic", DUMMY_KEY);
        });

        it("writes the key on Enter, without waiting for the focus to move", async () => {
            const setKey = vi.fn();

            render(<AiProviderSettings {...keyStore({ setKey })} />);

            const field = screen.getByLabelText("API key");
            await userEvent.fill(field, DUMMY_KEY);
            await userEvent.keyboard("{Enter}");

            expect(setKey).toHaveBeenCalledWith("anthropic", DUMMY_KEY);
        });

        it("writes nothing when the field was not changed", async () => {
            const setKey = vi.fn();
            const getKey = vi.fn().mockReturnValue(DUMMY_KEY);

            render(<AiProviderSettings {...keyStore({ setKey, getKey, hasKey: vi.fn().mockReturnValue(true) })} />);

            await userEvent.click(screen.getByLabelText("API key"));
            await userEvent.tab();

            expect(setKey).not.toHaveBeenCalled();
        });

        it("takes the key away when the field is emptied", async () => {
            const removeKey = vi.fn();
            const getKey = vi.fn().mockReturnValue(DUMMY_KEY);

            render(<AiProviderSettings {...keyStore({ removeKey, getKey, hasKey: vi.fn().mockReturnValue(true) })} />);

            const field = screen.getByLabelText("API key");
            await userEvent.fill(field, "");
            await userEvent.tab();

            expect(removeKey).toHaveBeenCalledWith("anthropic");
        });

        it("takes the key away on Remove key", async () => {
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

            await userEvent.click(screen.getByTestId("ai-remove-key-anthropic"));

            expect(removeKey).toHaveBeenCalledWith("anthropic");
        });
    });

    describe("Test connection", () => {
        it("cannot be run before a key is typed", () => {
            render(<AiProviderSettings {...keyStore()} />);

            expect(screen.getByTestId("ai-test-connection-anthropic")).toBeDisabled();
        });

        it("can be run once one is", async () => {
            render(<AiProviderSettings {...keyStore()} />);

            await userEvent.fill(screen.getByLabelText("API key"), DUMMY_KEY);

            expect(screen.getByTestId("ai-test-connection-anthropic")).not.toBeDisabled();
        });

        // A state glyph needs 3:1 on its ground (WCAG 1.4.11). The success FILL was 2.90:1 on the
        // light panel and, under the app's AA tokens, far less on the dark one (#3057).
        it.each(["light", "dark"] as const)("draws the ok tick at 3:1 or more in the %s scheme", async (scheme) => {
            renderBare(
                <MantineProvider theme={theme} forceColorScheme={scheme}>
                    <AiProviderSettings {...keyStore()} />
                </MantineProvider>,
            );

            await userEvent.fill(screen.getByLabelText("API key"), DUMMY_KEY);
            await userEvent.click(screen.getByTestId("ai-test-connection-anthropic"));
            const tick = await screen.findByTestId("ai-test-ok-anthropic");
            const measured = contrast(getComputedStyle(tick).color, groundOf(tick));

            expect(measured, `ok tick ${measured.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
        });

        it("asks the provider itself, through the element's createProvider", async () => {
            render(<AiProviderSettings {...keyStore()} />);

            await userEvent.fill(screen.getByLabelText("API key"), DUMMY_KEY);
            await userEvent.click(screen.getByTestId("ai-test-connection-anthropic"));

            await waitFor(() => {
                expect(screen.getByTestId("ai-test-ok-anthropic")).toBeInTheDocument();
            });
            expect(createProvider).toHaveBeenCalledWith("anthropic");
            expect(provider.configure).toHaveBeenCalledWith({ apiKey: DUMMY_KEY });
            expect(provider.validateApiKey).toHaveBeenCalled();
        });
    });

    describe("Key storage", () => {
        it("says where the user's credentials go, inline", () => {
            render(<AiProviderSettings {...keyStore()} />);

            expect(
                screen.getByText(
                    "Keys are stored in this browser only, obscured but not encrypted: anyone with access to this page or this browser profile can read them. They are sent to the provider you choose and nowhere else.",
                ),
            ).toBeInTheDocument();
        });

        it("hands a key typed before the box was ticked to the store, then turns remembering on", async () => {
            // The store saves the keys it already holds when persistence is enabled,
            // so the field only has to commit its key -- which leaving it does.
            const setKey = vi.fn();
            const onEnablePersistence = vi.fn();

            render(<AiProviderSettings {...keyStore({ setKey, onEnablePersistence })} />);

            const field = screen.getByLabelText("API key");
            await userEvent.fill(field, DUMMY_KEY);
            await userEvent.tab();
            await userEvent.click(screen.getByTestId("ai-remember-keys"));

            expect(setKey).toHaveBeenCalledTimes(1);
            expect(setKey).toHaveBeenCalledWith("anthropic", DUMMY_KEY);
            expect(onEnablePersistence).toHaveBeenCalled();
        });

        it("stops remembering by taking the keys out of storage, so a reload does not turn it back on", async () => {
            const onDisablePersistence = vi.fn();

            render(<AiProviderSettings {...keyStore({ isPersistenceEnabled: true, onDisablePersistence })} />);

            await userEvent.click(screen.getByTestId("ai-remember-keys"));

            expect(onDisablePersistence).toHaveBeenCalledWith();
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

        it("reports the choice", async () => {
            const onDefaultProviderChange = vi.fn();

            render(
                <AiProviderSettings
                    {...keyStore({ configuredProviders: ["anthropic", "openai"], onDefaultProviderChange })}
                />,
            );

            await userEvent.selectOptions(screen.getByTestId("ai-default-provider"), "openai");

            expect(onDefaultProviderChange).toHaveBeenCalledWith("openai");
        });

        it("reports None as no default at all, rather than as a provider named None", async () => {
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

            await userEvent.selectOptions(screen.getByTestId("ai-default-provider"), "");

            expect(onDefaultProviderChange).toHaveBeenCalledWith(null);
        });
    });
});
