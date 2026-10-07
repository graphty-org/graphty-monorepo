/**
 * The toolbar without the element: what it draws, its states with nothing drawn, Quick actions
 * and the commands it registers. The element is not registered in this file, so no session
 * arrives; `tasks.real-element.test.tsx` walks the tier 1 tasks on the real element.
 */
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, within } from "../../../test/test-utils";
import { createRegistry, defineRegistration, stubCommands } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { togglePopover } from "../popover";

const OPEN = { project: { name: "Les Miserables", id: 1 } } as const;

/** A command a later package declares but has not built yet: a stub, with a key. */
const LATER = defineRegistration({
    owner: "later",
    commands: stubCommands([{ id: "later.tool", label: "Later tool", group: "View", keys: ["Mod+Alt+L"] }]),
});

describe("the canvas toolbar", () => {
    // The design's frame, 1366 x 768. At the runner's default 414 px the panels leave the canvas
    // no width, the toolbar is clipped, and Mantine hides a popover whose anchor is hidden.
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("draws Analyze, Layout, View and Quick actions in order", () => {
        render(<Workspace initialState={OPEN} />);

        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        const names = within(toolbar)
            .getAllByRole("button")
            .map((button) => button.getAttribute("aria-label"));
        assert.deepEqual(names, ["Analyze", "Layout", "View", "Quick actions"]);
    });

    it("draws Layout as a network chart and Quick actions as a search", () => {
        render(<Workspace initialState={OPEN} />);

        const icon = (name: string): string | undefined =>
            [...(screen.getByRole("button", { name }).querySelector("svg")?.classList ?? [])].find(
                (c) => c.startsWith("lucide-") && c !== "lucide-icon",
            );
        assert.equal(icon("Layout"), "lucide-chart-network");
        assert.equal(icon("Quick actions"), "lucide-search");
    });

    it("disables everything but Quick actions with nothing drawn, saying why", () => {
        render(<Workspace initialState={OPEN} />);

        for (const name of ["Analyze", "Layout", "View"]) {
            const button = screen.getByRole("button", { name });
            assert.equal(button.getAttribute("aria-disabled"), "true", name);
            assert.equal(button.getAttribute("aria-description"), "Nothing is drawn", name);
        }
        assert.isFalse(screen.getByRole("button", { name: "Quick actions" }).hasAttribute("aria-disabled"));
    });

    it("lists Legend and Table under the View menu's Show section, each a check row", async () => {
        const store = createWorkspaceStore({ ...OPEN, dialog: "view" });
        render(<Workspace store={store} />);

        const menu = await screen.findByRole("menu", { name: "View" });
        assert.include(menu.textContent, "Show");
        // No element comes up in this file, so each row says why it cannot switch yet.
        const legend = within(menu).getByRole("menuitemcheckbox", { name: /^Legend/ });
        assert.equal(legend.getAttribute("aria-checked"), "true");
        assert.include(legend.textContent, "Nothing is drawn");
        const table = within(menu).getByRole("menuitemcheckbox", { name: /^Table/ });
        assert.equal(table.getAttribute("aria-checked"), "false");
        assert.include(table.textContent, "The graph is still loading");
    });

    it("opens Quick actions with Ctrl+K, listing built commands by their homes", async () => {
        render(<Workspace initialState={OPEN} registrations={[...REGISTRATIONS, LATER]} />);

        await userEvent.keyboard("{Control>}k{/Control}");
        const list = await screen.findByRole("listbox");
        assert.isNotNull(within(list).getByRole("group", { name: "Analyze" }));
        assert.isNotNull(within(list).getByRole("option", { name: /Keyboard shortcuts/ }));
        // A stub is not listed until its package builds it.
        assert.isNull(within(list).queryByRole("option", { name: /Later tool/ }));
    });

    it("runs a command from Quick actions and closes the palette", async () => {
        render(<Workspace initialState={OPEN} />);

        await userEvent.click(screen.getByRole("button", { name: "Quick actions" }));
        await userEvent.click(await screen.findByRole("option", { name: /Keyboard shortcuts/ }));
        assert.isNotNull(await screen.findByRole("dialog", { name: "Keyboard shortcuts" }));
        assert.isNull(screen.queryByRole("listbox"));
    });

    it("holds one popover at a time in the store's dialog slot", () => {
        const store = createWorkspaceStore();
        togglePopover(store, "analyze");
        assert.equal(store.get().dialog, "analyze");
        togglePopover(store, "layout");
        assert.equal(store.get().dialog, "layout");
        togglePopover(store, "layout");
        assert.isNull(store.get().dialog);
    });

    it("builds every Toolbar, Analyze and Layout command (no stubs left)", () => {
        const registry = createRegistry(REGISTRATIONS);
        for (const id of [
            "analyze.open",
            "layout.open",
            "layout.rerun",
            "layout.reshuffle",
            "view.open",
            "view.legend",
            "view.fit",
            "view.frame-selection",
            "view.toggle-dimension",
            "quick-actions.open",
            "selection.neighborhood",
            "selection.grow-neighborhood",
        ]) {
            assert.isDefined(registry.built(id), id);
        }
    });
});
