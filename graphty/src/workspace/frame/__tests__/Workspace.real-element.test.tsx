/**
 * The workspace frame on the REAL graphty-element: the element mounts inside the frame, hands
 * up its session, and the header's Undo and Redo and the Esc key act on the element's own
 * history and selection. Every assertion reads what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { APP_HIGHLIGHT_COLOR } from "../../../constants/highlight";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Renders the workspace with a project open and waits for the element's session.
 * @returns the session.
 */
async function openWorkspace(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Ring", id: 1 } })} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            const element = document.querySelector("graphty-element");
            session = element?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

describe("the workspace frame on the real element", () => {
    it("undoes and redoes the element's own steps from the header and the keys", async () => {
        const session = await openWorkspace();
        const undo = screen.getByRole("button", { name: /^Undo( |$)/ });
        assert.equal(undo.getAttribute("aria-disabled"), "true");

        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await waitFor(() => {
            assert.equal(undo.getAttribute("aria-disabled"), "false");
        });
        const applied = session.history.position;

        await userEvent.click(undo);
        await waitFor(() => {
            assert.equal(session.history.position, applied - 1);
        });

        await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
        await waitFor(() => {
            assert.equal(session.history.position, applied);
        });

        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.equal(session.history.position, applied - 1);
        });
    });

    it("has the element draw a still graph no more, so idle frames do not hold the page", async () => {
        await openWorkspace();

        assert.isTrue(document.querySelector("graphty-element")?.renderOnDemand, "the element draws on demand");
    });

    it("clears the element's selection with Esc", async () => {
        const session = await openWorkspace();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.selection.apply({ ids: ["a"] });
        assert.equal(session.selection.size, 1);

        await userEvent.keyboard("{Escape}");
        assert.equal(session.selection.size, 0);
    });

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "gives no two reachable controls one name with a graph and nothing run",
        async () => {
            const session = await openWorkspace();
            await session.data.addNodes([{ id: "a" }, { id: "b" }]);
            // The Graph place has a graph once its "Add data to start" line goes.
            await waitFor(
                () => {
                    assert.isNotNull(screen.queryByRole("tree", { name: "Style layers" }));
                    assert.isNull(screen.queryByText("Add data to start"));
                },
                { timeout: TIMEOUT_MS },
            );

            const names = new Map<string, number>();
            for (const control of document.querySelectorAll<HTMLElement>(
                'button, [role="button"], [role="menuitem"], a[href], input, [role="tab"]',
            )) {
                if (control.checkVisibility()) {
                    const name = (control.getAttribute("aria-label") ?? control.textContent ?? "").trim();
                    names.set(name, (names.get(name) ?? 0) + 1);
                }
            }
            assert.deepEqual(
                [...names].filter(([name, count]) => name !== "" && count > 1).map(([name]) => name),
                [],
            );
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "keeps Lighting inside the inspector's padding on the graph's Style tab, with no Layout copy there",
        async () => {
            const session = await openWorkspace();
            await session.data.addNodes([{ id: "a" }, { id: "b" }]);
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            await userEvent.click(within(inspector).getByRole("tab", { name: "Style" }));

            const lighting = await within(inspector).findByRole("combobox", { name: "Lighting" });
            const panel = within(inspector).getByRole("tabpanel", { name: "Style" });
            const { left } = lighting.getBoundingClientRect();
            // compact-mantine's panel grid: content begins 16px in from the panel's leading edge.
            assert.closeTo(left - panel.getBoundingClientRect().left, 16, 1, "Lighting starts at the content band");
            // The toolbar is the one home of the layout and of 2D / 3D.
            assert.isEmpty(within(panel).queryAllByLabelText("Method"));
            assert.isNull(within(panel).queryByRole("heading", { name: "Layout" }));
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "paints a shortest path as ordinary layers in the element's result colour, not the app's highlight",
        async () => {
            const session = await openWorkspace();
            await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
            await session.data.addEdges([
                { source: "a", target: "b" },
                { source: "b", target: "c" },
            ]);

            const { runId } = await session.runs.start("shortest-path", { source: "a", target: "c" });

            // Marks, not highlights, so a second algorithm's picture stacks on this one.
            await waitFor(() => {
                const route = session.styles
                    .list()
                    .filter((layer) => layer.source.by === "run" && layer.source.runId === runId);
                assert.lengthOf(route, 2);
                for (const layer of route) {
                    assert.notEqual(layer.kind, "highlight");
                    const color = layer.set?.[`${layer.target ?? "node"}.color`];
                    const hex = typeof color === "string" ? color.toUpperCase() : undefined;
                    assert.equal(hex, "#D55E00");
                    assert.notEqual(hex, APP_HIGHLIGHT_COLOR.toUpperCase());
                }
            });
        },
        TIMEOUT_MS,
    );

    it("highlights no page text with Control+A on the canvas, and keeps what the reader types selectable", async () => {
        await page.viewport(1366, 768);
        const session = await openWorkspace();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        // A real click on empty canvas focuses the drawing, as a reader's does.
        await userEvent.click(element, { position: { x: 10, y: 10 } });

        // Registered after the workspace's own key listener, so it sees the press as the browser will.
        let browserSelectsAll: boolean | null = null;
        const onKey = (event: KeyboardEvent): void => {
            if (event.key.toLowerCase() === "a") {
                browserSelectsAll = !event.defaultPrevented;
            }
        };
        globalThis.addEventListener("keydown", onKey);
        await userEvent.keyboard("{Control>}a{/Control}");
        globalThis.removeEventListener("keydown", onKey);

        assert.strictEqual(
            browserSelectsAll,
            false,
            "the page's select-all does not run: it would sweep the text boxes too",
        );
        assert.strictEqual(window.getSelection()?.toString().trim(), "", "no label, value or panel text is selected");
        const box = document.querySelector(".ws-app input:not([type=hidden]):not([type=file])");
        assert.isNotNull(box, "the workspace has a text box");
        assert.equal(getComputedStyle(box).userSelect, "text", "a text box still selects its text");
    });

    it("selects every node with Control+A on the canvas and from the canvas menu, and leaves a text box's Control+A to it", async () => {
        await page.viewport(1366, 768);
        const session = await openWorkspace();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([{ src: "a", dst: "b" }]);
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);

        // In the find box, Control+A selects the typed text and no node.
        const find = screen.getByRole("combobox", { name: "Find" });
        await userEvent.click(find);
        await userEvent.keyboard("ab");
        await userEvent.keyboard("{Control>}a{/Control}");
        assert.instanceOf(find, HTMLInputElement);
        assert.strictEqual(find.selectionStart, 0);
        assert.strictEqual(find.selectionEnd, 2, "the box's text is selected");
        assert.strictEqual(session.selection.size, 0, "no node is selected");
        await userEvent.keyboard("{Escape}");

        // On the canvas, Control+A selects every node.
        await userEvent.click(element, { position: { x: 10, y: 10 } });
        await waitFor(() => {
            assert.strictEqual(session.selection.size, 0);
        });
        await userEvent.keyboard("{Control>}a{/Control}");
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes], ["a", "b", "c"]);
        });

        // The empty canvas's menu lists Select all, and it selects every node again.
        session.selection.clear();
        await userEvent.click(element, { position: { x: 10, y: 10 }, button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Select all/ }));
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes], ["a", "b", "c"]);
        });
    });

    it("opens the shortcuts sheet with ? while a closed Select's list is mounted on the page", async () => {
        // The inspector has room at the design's width.
        await page.viewport(1366, 768);
        const session = await openWorkspace();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.addEdges([{ src: "a", dst: "b" }]);
        // The graph opens on Values; its Style tab holds the Layout group's Select.
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        await userEvent.click(within(inspector).getByRole("tab", { name: "Style" }));
        // Mantine keeps a closed Select's options mounted, hidden: the case that once switched
        // every single-key shortcut off.
        await waitFor(
            () => {
                const lists = [...document.querySelectorAll('[role="listbox"]')];
                assert.isTrue(
                    lists.some((list) => !list.checkVisibility()),
                    "a hidden list is on the page",
                );
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.keyboard("?");

        await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    });
});
