/**
 * The workspace frame without the element: what it draws, its menus, its keys, rename, the
 * notice slot and the build stamp. The element is not registered in this file, so its tag stays
 * an empty box and no session arrives; `Workspace.real-element.test.tsx` covers the element.
 */
import userEvent from "@testing-library/user-event";
import { afterEach, assert, describe, it, vi } from "vitest";

import { act, render, screen, within } from "../../../test/test-utils";
import type { WorkspaceRegistration } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";
import { NOTICE_MS } from "../NoticeSlot";

const OPEN: Partial<WorkspaceState> = { project: { name: "Les Miserables", id: 1 } };

/**
 * Renders the workspace.
 * @param initialState - chrome state to start from.
 * @param registrations - the registrations, every package's by default.
 * @returns the render result.
 */
function renderWorkspace(initialState?: Partial<WorkspaceState>, registrations?: readonly WorkspaceRegistration[]) {
    return render(<Workspace initialState={initialState} registrations={registrations} />);
}

afterEach(() => {
    vi.useRealTimers();
    document.querySelector('meta[name="graphty-build"]')?.remove();
});

describe("the workspace frame", () => {
    it("opens on the start screen, and a sample opens the frame", async () => {
        renderWorkspace();

        assert.isNull(screen.queryByRole("banner", { name: "Project" }));
        await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));

        assert.isNotNull(screen.getByRole("button", { name: "Project: Florentine families" }));
        assert.isNotNull(screen.getByRole("toolbar", { name: "Places" }));
        assert.isNotNull(screen.getByRole("complementary", { name: "Inspector" }));
    });

    it("draws every region with its package's stub", () => {
        renderWorkspace(OPEN);

        for (const stub of ["Graph place", "Inspector", "Toolbar", "Legend card and state cards"]) {
            assert.isNotNull(screen.getByText(stub), stub);
        }
        assert.isNotNull(screen.getByRole("button", { name: /^(Local only|Usage data on, content masked)$/ }));
        assert.isNotNull(document.querySelector("graphty-element"));
    });

    it("switches the left panel between the Graph and Data places from the rail", async () => {
        renderWorkspace(OPEN);

        await userEvent.click(screen.getByRole("button", { name: "Data" }));
        assert.isNotNull(screen.getByText("Data place"));
        assert.isNull(screen.queryByText("Graph place"));

        await userEvent.click(screen.getByRole("button", { name: "Graph" }));
        assert.isNotNull(screen.getByText("Graph place"));
    });

    it("lets the Data page take the panels while the element stays mounted", () => {
        renderWorkspace({ ...OPEN, page: "data-page" });

        assert.isNotNull(screen.getByText("Data page"));
        assert.isFalse(screen.getByText("Inspector").checkVisibility());
        assert.isNotNull(document.querySelector("graphty-element"));
        // The Data place is lit while the Data page shows (tier1-design.md 2.10).
        assert.equal(screen.getByRole("button", { name: "Data" }).getAttribute("aria-current"), "page");
    });

    it("draws the table dock only while it is open", () => {
        const { unmount } = renderWorkspace(OPEN);
        assert.isNull(screen.queryByRole("region", { name: "Table" }));
        unmount();

        renderWorkspace({ ...OPEN, dockOpen: true });
        assert.isNotNull(within(screen.getByRole("region", { name: "Table" })).getByText("Table"));
    });

    it("lists built commands in the main menu and leaves stubs out", async () => {
        renderWorkspace(OPEN);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        const menu = await screen.findByRole("menu");

        assert.isNotNull(within(menu).getByRole("menuitem", { name: "New project" }));
        assert.isNotNull(within(menu).getByRole("menuitem", { name: /Keyboard shortcuts/ }));
        assert.isNotNull(within(menu).getByRole("menuitem", { name: "Help" }));
        assert.isNotNull(within(menu).getByRole("menuitem", { name: /^Save/ }));
    });

    it("draws a File list command in both menus once its package builds it", async () => {
        const save: WorkspaceRegistration = {
            owner: "project",
            commands: [{ id: "project.save", label: "Save", group: "Project", keys: ["Mod+S"], run: () => undefined }],
        };
        const registrations = REGISTRATIONS.map((registration) =>
            registration.owner === "project" ? save : registration,
        );
        renderWorkspace(OPEN, registrations);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        assert.isNotNull(within(await screen.findByRole("menu")).getByRole("menuitem", { name: /^Save/ }));
        await userEvent.keyboard("{Escape}");

        await userEvent.click(screen.getByRole("button", { name: "Project: Les Miserables" }));
        assert.isNotNull(within(await screen.findByRole("menu")).getByRole("menuitem", { name: /^Save/ }));
    });

    it("shows a disabled command with its reason and keeps it focusable", async () => {
        renderWorkspace(OPEN);

        const undo = screen.getByRole("button", { name: "Undo" });
        assert.equal(undo.getAttribute("aria-disabled"), "true");
        assert.isFalse(undo.hasAttribute("disabled"));
        await userEvent.hover(undo);
        assert.isNotNull(await screen.findByText("Nothing to undo", undefined, { timeout: 3000 }));
    });

    it("renames the project with F2 and with a double-click", async () => {
        renderWorkspace(OPEN);

        await userEvent.keyboard("{F2}");
        const field = screen.getByRole("textbox", { name: "Project name" });
        await userEvent.clear(field);
        await userEvent.type(field, "My copy{Enter}");
        assert.isNotNull(screen.getByRole("button", { name: "Project: My copy" }));

        // A double-click's two clicks open and close the menu; the rename field is what stays.
        await userEvent.dblClick(screen.getByRole("button", { name: "Project: My copy" }));
        const again = await screen.findByRole("textbox", { name: "Project name" });
        assert.isNull(screen.queryByRole("menu"));
        // Esc abandons the rename and keeps the name.
        await userEvent.type(again, "Other{Escape}");
        assert.isNotNull(screen.getByRole("button", { name: "Project: My copy" }));
    });

    it("opens the keyboard shortcuts with ? and lists every built command's key", async () => {
        renderWorkspace(OPEN);

        await userEvent.keyboard("?");
        const sheet = await screen.findByRole("region", { name: "Keyboard shortcuts" });
        assert.isNotNull(within(sheet).getByText("Rename"));
        assert.isNotNull(within(sheet).getByText("F2"));
        // A stub's key is not listed until its command is built.
        assert.isNull(within(sheet).queryByText("Neighborhood"));
    });

    it("ignores single-key shortcuts when the reader switched them off", async () => {
        renderWorkspace({ ...OPEN, singleKeyShortcuts: false });

        await userEvent.keyboard("?");
        assert.isNull(screen.queryByRole("region", { name: "Keyboard shortcuts" }));
        // F2 is not a character key, so it still renames.
        await userEvent.keyboard("{F2}");
        assert.isNotNull(screen.getByRole("textbox", { name: "Project name" }));
    });

    it("never runs a single-key shortcut while the reader types in a field", async () => {
        renderWorkspace(OPEN);

        await userEvent.keyboard("{F2}");
        await userEvent.type(screen.getByRole("textbox", { name: "Project name" }), "?");
        assert.isNull(screen.queryByRole("region", { name: "Keyboard shortcuts" }));
    });

    it("shows the build stamp in Help > About", async () => {
        const meta = document.createElement("meta");
        meta.name = "graphty-build";
        meta.content = "0123456789ab graphty@0.8.35";
        document.head.append(meta);
        renderWorkspace(OPEN);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Help" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "About" }));

        const stamp = await screen.findByTestId("build-stamp");
        assert.equal(stamp.textContent, "Build 0123456789ab, release graphty@0.8.35");
    });

    it("shows one notice and takes it down after 6 seconds", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);

        act(() => {
            store.set({ notice: { message: "Deleted Louvain and 6 groups." } });
        });
        assert.isNotNull(screen.getByText("Deleted Louvain and 6 groups."));
        act(() => {
            store.set({ notice: { message: "Saved Les Miserables" } });
        });
        assert.isNull(screen.queryByText("Deleted Louvain and 6 groups."));

        act(() => {
            vi.advanceTimersByTime(NOTICE_MS - 1);
        });
        assert.isNotNull(screen.getByText("Saved Les Miserables"));
        act(() => {
            vi.advanceTimersByTime(1);
        });
        assert.isNull(screen.queryByText("Saved Les Miserables"));
    });

    it("runs a notice's one action and takes the notice down", async () => {
        const store = createWorkspaceStore(OPEN);
        let undone = false;
        render(<Workspace store={store} />);

        act(() => {
            store.set({
                notice: {
                    message: "Deleted Louvain and 6 groups.",
                    action: {
                        label: "Restore",
                        run: () => {
                            undone = true;
                        },
                    },
                },
            });
        });
        await userEvent.click(screen.getByRole("button", { name: "Restore" }));
        assert.isTrue(undone);
        assert.isNull(store.get().notice);
    });

    it("gives no two reachable controls one accessible name", async () => {
        renderWorkspace(OPEN);
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await screen.findByRole("menu");

        const names = new Map<string, number>();
        const controls = document.querySelectorAll<HTMLElement>(
            'button, [role="button"], [role="menuitem"], a[href], input, [role="tab"], [role="separator"][tabindex]',
        );
        for (const control of controls) {
            if (!control.checkVisibility()) {
                continue;
            }
            const name = (control.getAttribute("aria-label") ?? control.textContent ?? "").trim();
            names.set(name, (names.get(name) ?? 0) + 1);
        }
        const shared = [...names].filter(([, count]) => count > 1).map(([name]) => name);
        assert.deepEqual(shared, []);
    });
});
