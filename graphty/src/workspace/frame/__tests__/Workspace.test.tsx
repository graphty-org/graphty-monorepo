/**
 * The workspace frame without the element: what it draws, its menus, its keys, rename, the
 * notice slot and the build stamp. The element is not registered in this file, so its host holds
 * an empty box where the tag goes once defined and no session arrives;
 * `Workspace.real-element.test.tsx` covers the element.
 */
import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { pickSample } from "../../../test/samples-dialog";
import { act, render, screen, within } from "../../../test/test-utils";
import { defineRegistration, stubCommands, type WorkspaceRegistration } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";
import { NOTICE_MS } from "../NoticeSlot";

const OPEN: Partial<WorkspaceState> = { project: { name: "Les Miserables", id: 1 } };
/** A notice's words on screen, not the status line that speaks them. */
const TOAST = { selector: ".cm-toast-message" };

/**
 * Renders the workspace.
 * @param initialState - chrome state to start from.
 * @param registrations - the registrations, every package's by default.
 * @returns the render result.
 */
/** A command a later package declares but has not built yet: a stub, with a key. */
const LATER = defineRegistration({
    owner: "later",
    commands: stubCommands([{ id: "later.tool", label: "Later tool", group: "View", keys: ["Mod+Alt+L"] }]),
});

/**
 * A menu row's label, without its key or the reason a disabled row gives.
 * @param row - the menu row.
 * @returns the label.
 */
function rowLabel(row: HTMLElement): string {
    return row.querySelector("[class*='itemLabel']")?.firstChild?.textContent?.trim() ?? "";
}

function renderWorkspace(initialState?: Partial<WorkspaceState>, registrations?: readonly WorkspaceRegistration[]) {
    return render(<Workspace initialState={initialState} registrations={registrations} />);
}

afterEach(() => {
    vi.useRealTimers();
    document.querySelector('meta[name="graphty-build"]')?.remove();
});

// The workspace's design width. In the runner's 414 px frame the side panels overlap the canvas,
// so a real click on a notice's action lands on the panel drawn over it.
beforeAll(async () => {
    await page.viewport(1366, 768);
});

describe("the workspace frame", () => {
    it("opens on the start screen, and a sample opens the frame", async () => {
        renderWorkspace();

        assert.isNull(screen.queryByRole("banner", { name: "Project" }));
        await pickSample("Florentine families");

        assert.isNotNull(screen.getByRole("button", { name: "Project: Florentine families" }));
        assert.isNotNull(screen.getByRole("toolbar", { name: "Places" }));
        assert.isNotNull(screen.getByRole("complementary", { name: "Inspector" }));
    });

    it("draws every region", () => {
        renderWorkspace(OPEN);

        // The privacy chip reports state, so it sits in the status bar along the bottom, not the header.
        const bar = screen.getByRole("contentinfo", { name: "Status" });
        assert.isNotNull(within(bar).getByRole("button", { name: /^(Local only|Usage data on, content masked)$/ }));
        assert.isNull(
            within(screen.getByRole("banner", { name: "Project" })).queryByRole("button", {
                name: /^(Local only|Usage data on, content masked)$/,
            }),
        );
        const frame = document.querySelector(".ws-app");
        assert.strictEqual(frame?.lastElementChild, bar, "the bar is the frame's bottom row");
        assert.isNotNull(screen.getByRole("region", { name: "Graph place" }));
        assert.isNotNull(document.querySelector('[data-element-host="loading"]'));
        // The one main landmark needs no name, so the rail's Graph button is the only "Graph".
        assert.lengthOf(screen.getAllByRole("main"), 1);
        assert.isNull(screen.getByRole("main").getAttribute("aria-label"));
    });

    it("switches the left panel between the Graph and Data places from the rail", async () => {
        renderWorkspace(OPEN);

        await userEvent.click(screen.getByRole("button", { name: "Data" }));
        assert.isNotNull(screen.getByRole("region", { name: "Data place" }));
        assert.isNull(screen.queryByRole("region", { name: "Graph place" }));

        await userEvent.click(screen.getByRole("button", { name: "Graph" }));
        assert.isNotNull(screen.getByRole("region", { name: "Graph place" }));
    });

    it("opens Settings from the button at the rail's foot, pressed while Settings is open", async () => {
        renderWorkspace(OPEN);

        const rail = screen.getByRole("toolbar", { name: "Places" });
        const settings = within(rail).getByRole("button", { name: "Settings" });
        assert.equal(settings.getAttribute("aria-expanded"), "false");
        await userEvent.click(settings);

        assert.isNotNull(await screen.findByRole("dialog", { name: "Settings" }));
        assert.equal(settings.getAttribute("aria-expanded"), "true");
    });

    it("lets the Data page take the panels while the element stays mounted", () => {
        renderWorkspace({ ...OPEN, page: "data-page" });

        assert.isNotNull(screen.getByRole("region", { name: "Data page" }));
        assert.isFalse(document.querySelector('aside[aria-label="Inspector"]')?.checkVisibility());
        assert.isNotNull(document.querySelector('[data-element-host="loading"]'));
        // The Data place is lit while the Data page shows (tier1-design.md 2.10).
        assert.equal(screen.getByRole("button", { name: "Data" }).getAttribute("aria-current"), "page");
    });

    it("draws the table dock only while it is open", () => {
        const { unmount } = renderWorkspace(OPEN);
        assert.isNull(screen.queryByRole("region", { name: "Table" }));
        unmount();

        renderWorkspace({ ...OPEN, dockOpen: true });
        // No element here, so no session: the dock lists nothing but can still be closed.
        assert.isNotNull(
            within(screen.getByRole("region", { name: "Table" })).getByRole("button", { name: "Close table" }),
        );
    });

    it("lets each panel's resize handle be hit on both sides of the panel edge", async () => {
        const { innerWidth, innerHeight } = window;
        await page.viewport(1180, 820);
        renderWorkspace({ ...OPEN, dockOpen: true });
        // The table dock lies over a side panel's handle where the handle reaches into it, so a
        // vertical handle is tried halfway down the part above the dock.
        const dockTop = screen.getByRole("region", { name: "Table" }).getBoundingClientRect().top;

        for (const name of ["Resize left panel", "Resize inspector", "Resize table"]) {
            const handle = screen.getByRole("separator", { name });
            const box = handle.getBoundingClientRect();
            const vertical = handle.getAttribute("aria-orientation") === "vertical";
            const x = box.left + box.width / 2;
            const y = vertical ? (box.top + Math.min(box.bottom, dockTop)) / 2 : box.top + box.height / 2;
            // 1px in from each outer side of the handle: one side lies inside the panel, the
            // other outside it, where a clipping panel would cut the handle off.
            const points = vertical
                ? [
                      [box.left + 1, y],
                      [box.right - 1, y],
                  ]
                : [
                      [x, box.top + 1],
                      [x, box.bottom - 1],
                  ];
            for (const [px, py] of points) {
                assert.strictEqual(document.elementFromPoint(px, py), handle, `${name} at ${String(px)},${String(py)}`);
            }
        }
        await page.viewport(innerWidth, innerHeight);
    });

    it("keeps the table dock above the side panels' resize handles where a handle reaches into it", async () => {
        const { innerWidth, innerHeight } = window;
        await page.viewport(820, 1180);
        renderWorkspace({ ...OPEN, dockOpen: true });

        const dock = screen.getByRole("region", { name: "Table" });
        const box = dock.getBoundingClientRect();
        const y = box.top + box.height / 2;
        // 1px inside the dock from each side, under the overhang of the neighboring panel's handle.
        for (const x of [box.left + 1, box.right - 1]) {
            assert.isTrue(dock.contains(document.elementFromPoint(x, y)), `dock at ${String(x)},${String(y)}`);
        }
        await page.viewport(innerWidth, innerHeight);
    });

    it("lists built commands in the main menu and leaves stubs out", async () => {
        renderWorkspace(OPEN);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        const menu = await screen.findByRole("menu");

        assert.isNotNull(within(menu).getByRole("menuitem", { name: "New project" }));
        assert.isNotNull(within(menu).getByRole("menuitem", { name: /Keyboard shortcuts/ }));
        assert.isNotNull(within(menu).getByRole("menuitem", { name: "Help" }));
        assert.isNotNull(within(menu).getByRole("menuitem", { name: /^Save(?! as| local)/ }));
    });

    it("has one menu: Back to start first, every row once, and the name renames", async () => {
        renderWorkspace(OPEN);

        assert.lengthOf(screen.getAllByRole("button", { name: "Main menu" }), 1);
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        const rows = within(await screen.findByRole("menu"))
            .getAllByRole("menuitem")
            .map(rowLabel);
        assert.equal(rows[0], "Back to start");
        for (const name of ["New project", "Open project or file...", "Open sample", "Save as...", "Rename"]) {
            assert.include(rows, name);
        }
        assert.lengthOf(new Set(rows), rows.length, rows.join(", "));
        await userEvent.keyboard("{Escape}");

        await userEvent.click(screen.getByRole("button", { name: "Project: Les Miserables" }));
        assert.isNotNull(await screen.findByRole("textbox", { name: "Project name" }));
        assert.isNull(screen.queryByRole("menu"));
    });

    it("shows a disabled command with its reason and keeps it focusable", async () => {
        renderWorkspace(OPEN);

        const undo = screen.getByRole("button", { name: "Undo" });
        assert.equal(undo.getAttribute("aria-disabled"), "true");
        assert.isFalse(undo.hasAttribute("disabled"));
        // A dimmed Undo and Redo stay Tab stops, so the reason is reachable by keyboard.
        assert.notStrictEqual(undo.tabIndex, -1);
        assert.notStrictEqual(screen.getByRole("button", { name: "Redo" }).tabIndex, -1);
        await userEvent.hover(undo);
        assert.isNotNull(await screen.findByText("Nothing to undo", undefined));
    });

    it("says the Main menu's name and where the privacy chip leads, in tooltips", async () => {
        renderWorkspace(OPEN);

        await userEvent.hover(screen.getByRole("button", { name: "Main menu" }));
        // The tooltip says the button's name (decided.md: a tooltip and its name say the same words).
        assert.equal((await screen.findByRole("tooltip", undefined)).textContent, "Main menu");
        await userEvent.unhover(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.hover(screen.getByRole("button", { name: /^(Local only|Usage data on, content masked)$/ }));
        assert.isNotNull(await screen.findByText(/Opens Settings > Privacy$/, undefined));
    });

    it("renames the project with F2 and with a tap on its name", async () => {
        renderWorkspace(OPEN);

        await userEvent.keyboard("{F2}");
        const field = screen.getByRole("textbox", { name: "Project name" });
        await userEvent.clear(field);
        await userEvent.type(field, "My copy{Enter}");
        assert.isNotNull(screen.getByRole("button", { name: "Project: My copy" }));

        await userEvent.click(screen.getByRole("button", { name: "Project: My copy" }));
        const again = await screen.findByRole("textbox", { name: "Project name" });
        // Esc abandons the rename and keeps the name.
        await userEvent.type(again, "Other{Escape}");
        assert.isNotNull(screen.getByRole("button", { name: "Project: My copy" }));
    });

    it("opens the keyboard shortcuts with ? and lists every built command's key", async () => {
        renderWorkspace(OPEN, [...REGISTRATIONS, LATER]);

        await userEvent.keyboard("?");
        const sheet = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
        // The project's Rename, and a style row's Rename and Delete, which act on the focused row.
        assert.lengthOf(within(sheet).getAllByText("Rename"), 2);
        assert.lengthOf(within(sheet).getAllByText("F2"), 2);
        assert.isNotEmpty(within(sheet).getAllByText("Delete"));
        // A stub's key is not listed until its command is built.
        assert.isNull(within(sheet).queryByText("Later tool"));
        // The drawing's own keys, from graphty-element's catalog: zooming by key in 3D and 2D.
        const zoom3d = within(sheet).getByText("Zoom in, 3D").closest(".ws-shortcut-row");
        assert.deepEqual(
            [...(zoom3d?.querySelectorAll("kbd") ?? [])].map((key) => key.textContent),
            ["W", "=", "+"],
        );
        assert.isNotNull(within(sheet).getByText("Zoom out, 2D"));
    });

    it("shows the keyboard shortcuts in a centered dialog, one group at a time, scrolling only up and down", async () => {
        renderWorkspace(OPEN, [...REGISTRATIONS, LATER]);

        await userEvent.keyboard("?");
        const dialog = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
        const groups = within(dialog).getByRole("grid", { name: "Shortcut groups" });
        const names = within(groups)
            .getAllByRole("gridcell")
            .map((cell) => cell.textContent);
        assert.strictEqual(names[0], "All");
        assert.includeMembers(names, ["Project", "Selection"]);

        await userEvent.click(within(groups).getByRole("gridcell", { name: "Project" }));
        const shown = within(dialog).getByRole("region", { name: "Project" });
        assert.deepEqual(
            within(shown)
                .getAllByRole("heading")
                .map((heading) => heading.textContent),
            ["Project"],
        );
        assert.strictEqual(shown.scrollWidth, shown.clientWidth);

        await userEvent.keyboard("{Escape}");
        assert.isNull(screen.queryByRole("dialog", { name: "Keyboard shortcuts" }));
    });

    it("ignores single-key shortcuts when the reader switched them off", async () => {
        renderWorkspace({ ...OPEN, singleKeyShortcuts: false });

        await userEvent.keyboard("?");
        assert.isNull(screen.queryByRole("dialog", { name: "Keyboard shortcuts" }));
        // F2 is not a character key, so it still renames.
        await userEvent.keyboard("{F2}");
        assert.isNotNull(screen.getByRole("textbox", { name: "Project name" }));
    });

    it("never runs a single-key shortcut while the reader types in a field", async () => {
        renderWorkspace(OPEN);

        await userEvent.keyboard("{F2}");
        await userEvent.type(screen.getByRole("textbox", { name: "Project name" }), "?");
        assert.isNull(screen.queryByRole("dialog", { name: "Keyboard shortcuts" }));
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

    it("speaks the same status words again when they are written again", () => {
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);
        const words = "Shortest path from Chloe to Milo: 4 steps";
        act(() => {
            store.set({ announcement: words });
        });
        const line = screen.getAllByRole("status").find((region) => region.textContent === words);
        assert.isDefined(line);
        // A screen reader speaks a polite region when text is added to it, so count additions.
        const observer = new MutationObserver(() => undefined);
        observer.observe(line, { childList: true, subtree: true, characterData: true });

        act(() => {
            store.set({ announcement: words });
        });
        act(() => {
            store.set({ announcement: words });
        });
        const spoken = observer
            .takeRecords()
            .flatMap((record) => [...record.addedNodes].map((node) => node.textContent));
        observer.disconnect();

        assert.deepEqual(spoken, [words, words]);
    });

    it("shows one notice and takes it down after 6 seconds", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);

        act(() => {
            store.set({ notice: { message: "Deleted Louvain and 6 groups." } });
        });
        assert.isNotNull(screen.getByText("Deleted Louvain and 6 groups.", TOAST));
        act(() => {
            store.set({ notice: { message: "Saved Les Miserables" } });
        });
        assert.isNull(screen.queryByText("Deleted Louvain and 6 groups.", TOAST));

        act(() => {
            vi.advanceTimersByTime(NOTICE_MS - 1);
        });
        assert.isNotNull(screen.getByText("Saved Les Miserables", TOAST));
        act(() => {
            vi.advanceTimersByTime(1);
        });
        assert.isNull(screen.queryByText("Saved Les Miserables", TOAST));
    });

    it("keeps an error notice until it is dismissed, and any notice while focus is on it", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);

        // On the start screen too: a failed open lands there.
        act(() => {
            store.set({ notice: { message: "cut-55 could not be opened.", error: true } });
        });
        act(() => {
            vi.advanceTimersByTime(NOTICE_MS * 10);
        });
        assert.isNotNull(screen.getByText("cut-55 could not be opened.", TOAST));

        act(() => {
            store.set({ notice: { message: "Saved Les Miserables" } });
        });
        act(() => {
            screen.getByRole("button", { name: "Dismiss" }).focus();
        });
        act(() => {
            vi.advanceTimersByTime(NOTICE_MS * 2);
        });
        assert.isNotNull(screen.getByText("Saved Les Miserables", TOAST));
        act(() => {
            screen.getByRole("button", { name: "Dismiss" }).blur();
        });
        act(() => {
            vi.advanceTimersByTime(NOTICE_MS);
        });
        assert.isNull(screen.queryByText("Saved Les Miserables", TOAST));
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
