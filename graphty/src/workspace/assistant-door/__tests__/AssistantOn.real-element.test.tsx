/**
 * With the assistant experiment on, on the REAL graphty-element, by real clicks and keys: the rail
 * button and Mod+I open and close the panel, focus goes to the composer and back to where it was,
 * and the panel keeps a width of its own.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceState, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { writeAssistantChoice } from "../provider";

/** The experiment on, as a site.json that lists it. */
const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;

const MOD_I = "{Control>}i{/Control}";

/**
 * The workspace, once its element has reported the experiment on.
 * @param state - chrome state to start from.
 * @returns the store.
 */
async function open(state: Partial<WorkspaceState> = {}): Promise<WorkspaceStore> {
    const store = createWorkspaceStore({ project: { name: "On", id: 1 }, ...state });
    render(<Workspace store={store} />);
    await screen.findByRole("button", { name: "Assistant" });
    return store;
}

/**
 * The composer, once the panel's code has loaded.
 * @returns the field.
 */
const composer = (): Promise<HTMLElement> => screen.findByRole("textbox", { name: "Message the assistant" });

/**
 * Waits for focus to rest on an element.
 * @param element - the element.
 */
async function focusOn(element: Element): Promise<void> {
    await waitFor(() => {
        assert.strictEqual(document.activeElement, element);
    });
}

/**
 * Waits for the panel to go.
 */
async function panelGone(): Promise<void> {
    await waitFor(() => {
        assert.isNull(screen.queryByRole("region", { name: "Assistant" }));
    });
}

describe("the Assistant with its experiment on", () => {
    beforeEach(async () => {
        resetSiteConfig();
        await loadSiteConfig(SITE);
        await page.viewport(1440, 900);
        // The mock provider needs no key, so these reach the composer with nothing to set up.
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
    });

    afterEach(() => {
        resetSiteConfig();
        writeAssistantChoice(null);
    });

    it("sits after Data on the rail, and in Quick actions and Keyboard shortcuts", async () => {
        await open();
        const rail = screen.getByRole("toolbar", { name: "Places" });
        const names = within(rail)
            .getAllByRole("button")
            .map((button) => button.getAttribute("aria-label"));
        assert.deepEqual(names, ["Graph", "Data", "Assistant", "Notes", "Settings"]);

        await userEvent.keyboard("{Control>}k{/Control}");
        await screen.findByRole("option", { name: /^Assistant/ });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByPlaceholderText("Search commands"));
        });

        await userEvent.keyboard("?");
        const dialog = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
        await within(dialog).findByText("Ctrl+I");
    });

    it("names the saved provider in Settings' Privacy, and no line there says nothing leaves", async () => {
        writeAssistantChoice({ provider: "google", model: "gemini-3.8-flash", remember: false });
        await open();
        await userEvent.click(screen.getByRole("button", { name: "Settings" }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(within(dialog).getByRole("gridcell", { name: "Privacy" }));
        await within(dialog).findByText(/^Assistant: .* go straight to Google\. Google charges your key\.$/);
        await within(dialog).findByText(/^Files you open: .* Only what the assistant reads from them is sent\.$/);
        await within(dialog).findByText("Usage data: off.");
        await within(dialog).findByText("Usage data holds no file contents.");
        assert.notMatch(dialog.textContent, /never uploaded|Nothing is sent|ever leave/);
    });

    it("keeps Settings' Privacy as it was with no provider saved", async () => {
        writeAssistantChoice(null);
        await open();
        await userEvent.click(screen.getByRole("button", { name: "Settings" }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(within(dialog).getByRole("gridcell", { name: "Privacy" }));
        await within(dialog).findByText("Files you open: read on this computer, never uploaded.");
        assert.isNull(within(dialog).queryByText(/^Assistant:/));
    });

    it("opens on the rail button with focus in the composer, and the active button closes it", async () => {
        const store = await open();
        const door = screen.getByRole("button", { name: "Assistant" });
        await userEvent.click(door);
        await focusOn(await composer());
        assert.strictEqual(door.getAttribute("aria-current"), "page");

        await userEvent.click(door);
        await panelGone();
        assert.strictEqual(store.get().place, "graph");
        await focusOn(door);
    });

    it("opens on Mod+I from a text field, and Mod+I in the composer closes it", async () => {
        await open();
        await userEvent.click(await screen.findByRole("combobox", { name: "Find" }));
        await userEvent.keyboard(MOD_I);
        await focusOn(await composer());

        await userEvent.keyboard(MOD_I);
        await panelGone();
        // The find box left with the Graph place it sat in, and came back as a new control.
        await focusOn(screen.getByRole("button", { name: "Assistant" }));
    });

    it("hands focus back to the drawing it was opened from", async () => {
        await open();
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        element.focus();
        await userEvent.keyboard(MOD_I);
        await focusOn(await composer());
        await userEvent.keyboard(MOD_I);
        await panelGone();
        await focusOn(element);
    });

    it("sends Mod+I elsewhere in the panel to the composer, not to closing", async () => {
        await open();
        await userEvent.keyboard(MOD_I);
        const region = await composer();
        await focusOn(region);
        screen.getByRole("button", { name: "Close" }).focus();
        await userEvent.keyboard(MOD_I);
        await focusOn(region);
    });

    it("closes on the x back to the place it came from, and shows the key in the tooltip", async () => {
        const store = await open();
        await userEvent.click(screen.getByRole("button", { name: "Notes" }));
        await userEvent.click(screen.getByRole("button", { name: "Assistant" }));
        await composer();
        const close = screen.getByRole("button", { name: "Close" });
        await userEvent.hover(close);
        assert.include((await screen.findByRole("tooltip")).textContent, "Close");
        await screen.findByText("Ctrl+I");
        await userEvent.click(close);
        await panelGone();
        assert.strictEqual(store.get().place, "notes");
    });

    it("lands in the composer on F6", async () => {
        await open();
        await userEvent.keyboard(MOD_I);
        const region = await composer();
        await focusOn(region);
        await userEvent.keyboard("{F6}{Shift>}{F6}{/Shift}");
        await focusOn(region);
    });

    it("is 280 wide apart from the left panel's width, and its handle stops where the canvas keeps 320", async () => {
        const store = await open();
        const panel = (): number => document.querySelector(".ws-left")?.getBoundingClientRect().width ?? 0;
        assert.strictEqual(panel(), 240);
        await userEvent.keyboard(MOD_I);
        await composer();
        await waitFor(() => {
            assert.strictEqual(panel(), 280);
        });
        const handle = screen.getByRole("separator", { name: "Resize left panel" });
        assert.strictEqual(handle.getAttribute("aria-valuemax"), "480");

        await page.viewport(1000, 700);
        await waitFor(() => {
            assert.strictEqual(handle.getAttribute("aria-valuemax"), String(1000 - 57 - 240 - 320));
        });
        handle.focus();
        await userEvent.keyboard("{End}");
        await waitFor(() => {
            assert.strictEqual(panel(), 1000 - 57 - 240 - 320);
        });
        assert.strictEqual(store.get().leftWidth, 240);
    });

    it("takes the left panel's width in a window under 1200 px", async () => {
        await page.viewport(900, 700);
        await open({ leftWidth: 250 });
        await userEvent.keyboard(MOD_I);
        await composer();
        await waitFor(() => {
            assert.strictEqual(document.querySelector(".ws-left")?.getBoundingClientRect().width, 250);
        });
    });

    it("fills the area right of the rail below 640 px, with the canvas and inspector hidden and inert", async () => {
        await page.viewport(600, 700);
        await open();
        await userEvent.keyboard(MOD_I);
        await composer();
        const main = document.querySelector(".ws-main");
        const inspector = document.querySelector(".ws-right");
        await waitFor(() => {
            assert.strictEqual(document.querySelector(".ws-left")?.getBoundingClientRect().width, 600 - 57);
        });
        for (const hidden of [main, inspector]) {
            assert.isTrue(hidden?.hasAttribute("hidden"));
            assert.isTrue(hidden?.hasAttribute("inert"));
        }

        await userEvent.keyboard(MOD_I);
        await panelGone();
        assert.isFalse(main?.hasAttribute("hidden"));
        assert.isFalse(main?.hasAttribute("inert"));
    });

    it("comes back after a reload with no other panel first, leaving focus alone", async () => {
        let otherPanel = false;
        const watch = new MutationObserver(() => {
            otherPanel ||= document.querySelector('.ws-left [aria-label="Find"], .ws-left .dp') !== null;
        });
        watch.observe(document.body, { childList: true, subtree: true });
        await open({ place: "assistant" });
        const region = await composer();
        watch.disconnect();
        assert.isFalse(otherPanel);
        assert.notStrictEqual(document.activeElement, region);
    });
});
