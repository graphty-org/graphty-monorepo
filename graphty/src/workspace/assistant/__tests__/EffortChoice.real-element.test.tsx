/**
 * The Assistant's effort control: it offers the levels the element's catalog lists for the chosen
 * model, starts at the lowest, and a level picked in the composer's options is saved and reaches
 * the element.
 */
import "@graphty/graphty-element";

import { type AiManagerConfig, MockLlmProvider } from "@graphty/graphty-element/ai";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { effortConfig, effortLevels, readAssistantChoice, writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;

/** Every configuration the app enabled the assistant with. */
let enabled: AiManagerConfig[] = [];

beforeEach(async () => {
    resetSiteConfig();
    await loadSiteConfig(SITE);
    enabled = [];
    const tag = customElements.get("graphty-element") as unknown as {
        prototype: HTMLElementTagNameMap["graphty-element"];
    };
    const realEnable = tag.prototype.enableAiControl;
    vi.spyOn(tag.prototype, "enableAiControl").mockImplementation(async function enable(
        this: HTMLElementTagNameMap["graphty-element"],
        config: AiManagerConfig,
    ) {
        enabled.push(config);
        // The mock answers in the provider's place; a stand-in key makes the panel read as set up.
        await realEnable.call(this, { ...config, providerInstance: new MockLlmProvider() });
        this.getApiKeyManager()?.setKey(config.provider, "stand-in-key");
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    writeAssistantChoice(null);
    resetSiteConfig();
});

/**
 * The effort rows of the composer's options menu, opening it first.
 * @param open - whether to open the menu; false reads the one already open.
 * @returns the rows, lowest first.
 */
async function effortItems(open = true): Promise<HTMLElement[]> {
    if (open) {
        await userEvent.click(await screen.findByRole("button", { name: "Options" }));
    }
    const menu = await screen.findByRole("menu");
    const scope = ["Whole graph", "Selection"];
    return within(menu)
        .getAllByRole("menuitemradio")
        .filter((item) => !scope.some((name) => item.textContent.startsWith(name)));
}

describe("the Assistant's effort", () => {
    it("starts Gemini Flash at Low, offers its three levels, and a pick in the options is saved and sent", async () => {
        writeAssistantChoice({ provider: "google", model: "gemini-3.8-flash", remember: false });
        render(<Workspace store={createWorkspaceStore({ project: { name: "Effort", id: 1 } })} />);
        await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        await waitFor(() => {
            assert.strictEqual(enabled.at(-1)?.reasoningEffort, "low");
        });

        const levels = await effortItems();
        assert.deepEqual(
            levels.map((item) => item.textContent),
            ["Low", "Medium", "High"],
        );
        assert.deepEqual(
            levels.map((item) => item.getAttribute("aria-checked")),
            ["true", "false", "false"],
        );
        await userEvent.click(levels[2]);

        await waitFor(() => {
            assert.strictEqual(enabled.at(-1)?.reasoningEffort, "high");
        });
        assert.strictEqual(readAssistantChoice()?.effort, "high");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
        });
        const again = await effortItems();
        assert.strictEqual(again[2].getAttribute("aria-checked"), "true");
    });

    it("offers no effort for a model the catalog lists no reasoning setting for", async () => {
        writeAssistantChoice({ provider: "openai", model: "gpt-4o", remember: false });
        render(<Workspace store={createWorkspaceStore({ project: { name: "Effort", id: 1 } })} />);
        await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        await userEvent.click(await screen.findByRole("button", { name: "Options" }));
        await screen.findByRole("menuitem", { name: "GPT-4o..." });
        assert.lengthOf(await effortItems(false), 0);
    });

    it("turns Claude's levels into thinking budgets from the catalog's least, and Off into no thinking", () => {
        const claude = { provider: "anthropic", model: "claude-haiku-4-5-20251001", remember: false } as const;
        assert.deepEqual(effortLevels(claude), ["off", "low", "medium", "high"]);
        assert.deepEqual(effortConfig(claude), {});
        assert.deepEqual(effortConfig({ ...claude, effort: "low" }), { thinkingBudgetTokens: 1024 });
        assert.deepEqual(effortConfig({ ...claude, effort: "high" }), { thinkingBudgetTokens: 16384 });
        // A level the model does not take falls back to its lowest.
        assert.deepEqual(
            effortConfig({ provider: "google", model: "gemini-3.1-pro-preview", remember: false, effort: "medium" }),
            {
                reasoningEffort: "low",
            },
        );
    });
});
