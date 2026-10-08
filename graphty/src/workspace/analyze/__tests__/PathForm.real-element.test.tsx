/**
 * The Path popover (tier2-design.md section 2) on the REAL graphty-element: P opens it titled
 * "Shortest path", From and To take typed names or a canvas pick, the selection fills them, Find
 * path adds a row and selects it, Esc returns focus to the opener, and P does nothing in a field.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The element, as the page holds it. */
type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Ava - Ben - Lee, Ava - Dev, and Zed - Zoe apart. */
const FRIENDS = "source,target\nAva,Ben\nBen,Lee\nAva,Dev\nZed,Zoe\n";

/** The running club: who runs with whom, and how often (a weight with no meaning chosen at load). */
const CLUB = "source,target,weight\nAva,Ben,3\nBen,Lee,2\nAva,Dev,5\nZed,Zoe,1\n";

/**
 * A project with the friends graph loaded.
 * @param weighted - Load the running club with its weight, and this meaning for it (null: none chosen).
 * @returns the store, the session and the element.
 */
async function openFriends(
    weighted?: "distance" | null,
): Promise<{ store: WorkspaceStore; session: GraphSession; element: ElementUnderTest }> {
    const store = createWorkspaceStore({ project: { name: "Friends", id: 1 } });
    render(<Workspace store={store} />);
    let element: ElementUnderTest | null = null;
    await waitFor(
        () => {
            element = document.querySelector("graphty-element");
            assert.isDefined(element?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    const el = element as unknown as ElementUnderTest;
    const { session } = el;
    await session.data.import(
        { type: "csv", config: { data: weighted === undefined ? FRIENDS : CLUB } },
        {
            mapping: {
                rowsAre: "edges",
                source: "source",
                target: "target",
                ...(weighted === undefined ? {} : { weight: "weight" }),
                ...(weighted === "distance" ? { weightMeaning: weighted } : {}),
            },
        },
    );
    await waitFor(() => {
        assert.equal(session.data.statistics().nodeCount, 6);
        assert.isFalse(analyzeTool().hasAttribute("aria-disabled"));
    });
    return { store, session, element: el };
}

/**
 * The toolbar's Analyze tool.
 * @returns the tool.
 */
function analyzeTool(): HTMLElement {
    return within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Analyze" });
}

/**
 * The Path form.
 * @returns the form.
 */
async function pathForm(): Promise<HTMLElement> {
    return screen.findByRole("form", { name: "Shortest path" });
}

describe("the Path popover, on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "P with nothing selected: type From and To, Find path adds a row, selects it and says so",
        async () => {
            const { store, session, element } = await openFriends();
            element.focus();
            await userEvent.keyboard("p");

            const form = await pathForm();
            const from = within(form).getByRole("combobox", { name: "From node" });
            await waitFor(() => {
                assert.equal(document.activeElement, from);
            });
            // A partial name lists the nodes it matches, the first marked as the one Enter picks;
            // clicking one fills the field and moves on to To, as Enter does.
            await userEvent.type(from, "Av");
            const ava = await within(form).findByRole("option", { name: "Ava" });
            assert.equal(from.getAttribute("aria-activedescendant"), ava.id);
            await userEvent.click(ava);
            assert.equal((from as HTMLInputElement).value, "Ava");
            assert.isNull(within(form).queryByRole("listbox", { name: "From nodes" }));
            const to = within(form).getByRole("combobox", { name: "To node" });
            assert.equal(document.activeElement, to);
            await userEvent.type(to, "lee");
            await userEvent.click(within(form).getByRole("button", { name: "Find path" }));

            let runId = "";
            await waitFor(
                () => {
                    const run = session.runs.list().find((r) => r.algorithm === "shortest-path");
                    assert.equal(run?.status, "succeeded");
                    assert.equal(run?.params.source, "Ava");
                    assert.equal(run?.params.target, "Lee");
                    runId = String(run?.id);
                },
                { timeout: TIMEOUT_MS },
            );
            assert.deepEqual(store.get().inspected, { kind: "measure-row", id: runId });
            await screen.findByText("Shortest path added: Ava to Lee, 2 hops");
            // Committing closes the popover and hands focus to the result: the inspector's title,
            // never the drawing's outline nor a node row whose ring would read as picked.
            assert.isNull(screen.queryByRole("form", { name: "Shortest path" }));
            await waitFor(() => {
                assert.equal(document.activeElement, document.getElementById(INSPECTOR_TITLE_ID));
            });
        },
        TIMEOUT_MS,
    );

    it(
        "Enter on a typed name picks it and moves on: From to To, To to Find path",
        async () => {
            const { element } = await openFriends();
            element.focus();
            await userEvent.keyboard("p");
            const form = await pathForm();
            const from = within(form).getByRole<HTMLInputElement>("combobox", { name: "From node" });
            const to = within(form).getByRole<HTMLInputElement>("combobox", { name: "To node" });
            await waitFor(() => {
                assert.equal(document.activeElement, from);
            });
            await userEvent.keyboard("Ava{Enter}Lee{Enter}");
            assert.equal(from.value, "Ava");
            assert.equal(to.value, "Lee");
            assert.equal(document.activeElement, within(form).getByRole("button", { name: "Find path" }));
        },
        TIMEOUT_MS,
    );

    it(
        "says when no path joins the two nodes",
        async () => {
            const { session } = await openFriends();
            await session.selection.apply({ nodes: ["Ava", "Zoe"] });
            await userEvent.keyboard("p");
            const form = await pathForm();
            await userEvent.click(within(form).getByRole("button", { name: "Find path" }));
            await screen.findByText("No path from Ava to Zoe.", undefined, { timeout: TIMEOUT_MS });
        },
        TIMEOUT_MS,
    );

    it(
        "fills From from one selected node and focuses To; two fill both and focus Find path",
        async () => {
            const { session, store } = await openFriends();
            await session.selection.apply({ nodes: ["Ben"] });
            await userEvent.keyboard("p");
            let form = await pathForm();
            assert.equal(within(form).getByRole<HTMLInputElement>("combobox", { name: "From node" }).value, "Ben");
            await waitFor(() => {
                assert.equal(document.activeElement, within(form).getByRole("combobox", { name: "To node" }));
            });
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(store.get().dialog);
            });

            await session.selection.apply({ nodes: ["Ben", "Dev"] });
            await userEvent.keyboard("p");
            form = await pathForm();
            assert.equal(within(form).getByRole<HTMLInputElement>("combobox", { name: "To node" }).value, "Dev");
            await waitFor(() => {
                assert.equal(document.activeElement, within(form).getByRole("button", { name: "Find path" }));
            });
        },
        TIMEOUT_MS,
    );

    it(
        "keeps Tab inside the popover, and Esc closes it and returns focus to the opener",
        async () => {
            const { store, element } = await openFriends();
            element.focus();
            await userEvent.keyboard("p");
            const form = await pathForm();
            const dropdown = form.closest<HTMLElement>("[role=dialog]") ?? form;
            for (let i = 0; i < 12; i++) {
                await userEvent.tab();
                assert.isTrue(dropdown.contains(document.activeElement), `Tab ${String(i + 1)} left the popover`);
            }
            // Esc in an empty field closes the popover (a filled one clears first).
            within(form).getByRole("combobox", { name: "From node" }).focus();
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(store.get().dialog);
            });
            await waitFor(() => {
                assert.equal(document.activeElement, element);
            });
        },
        TIMEOUT_MS,
    );

    it(
        "a pick button takes the next node clicked on the canvas, without changing the selection",
        async () => {
            const { session, element } = await openFriends();
            await session.selection.apply({ nodes: ["Ava"] });
            await userEvent.keyboard("p");
            const form = await pathForm();
            const pickTo = within(form).getByRole("button", { name: "Pick To on the canvas" });
            // Esc stops a pick before it closes the popover (the first Esc closes the button's
            // tooltip, the innermost thing open).
            await userEvent.click(pickTo);
            assert.equal(pickTo.getAttribute("aria-pressed"), "true");
            await userEvent.keyboard("{Escape}{Escape}");
            await waitFor(() => {
                assert.equal(pickTo.getAttribute("aria-pressed"), "false");
            });
            assert.isNotNull(screen.queryByRole("form", { name: "Shortest path" }));
            await userEvent.click(pickTo);

            let at = element.nodeScreenPosition("Lee");
            await waitFor(() => {
                at = element.nodeScreenPosition("Lee");
                assert.isTrue(at?.visible);
            });
            const rect = element.getBoundingClientRect();
            const init = {
                clientX: rect.left + (at?.x ?? 0),
                clientY: rect.top + (at?.y ?? 0),
                bubbles: true,
                composed: true,
            };
            for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
                element.dispatchEvent(new PointerEvent(type, init));
            }
            element.dispatchEvent(new MouseEvent("click", init));

            await waitFor(() => {
                assert.equal(within(form).getByRole<HTMLInputElement>("combobox", { name: "To node" }).value, "Lee");
            });
            // The click was the pick's alone: the popover is open and the selection unchanged.
            assert.isNotNull(screen.queryByRole("form", { name: "Shortest path" }));
            assert.deepEqual(session.selection.nodes, ["Ava"]);
        },
        TIMEOUT_MS,
    );

    it(
        "the Weight box shows None before the run when a loaded weight with no meaning is not read, and Made with agrees",
        async () => {
            const { store, session, element } = await openFriends(null);
            const why = "Not read -- weight's meaning is not set, and a path needs a distance";
            element.focus();
            await userEvent.keyboard("p");
            const form = await pathForm();
            const weight = within(form).getByRole<HTMLInputElement>("combobox", { name: "Weight" });
            // The box shows what the run will read: None, with the reason under it.
            await waitFor(() => {
                assert.equal(weight.value, "None");
                assert.isNotNull(within(form).getByText(why));
            });
            await userEvent.click(weight);
            const unread = await screen.findByRole("option", { name: "weight (loaded, not read)" });
            assert.isTrue(
                unread.hasAttribute("data-combobox-disabled"),
                "listed, but not a choice that differs from None",
            );
            // Closed again by its own box; Esc would also step the popover back.
            await userEvent.click(weight);
            await userEvent.click(within(form).getByRole("combobox", { name: "From node" }));

            await userEvent.keyboard("Ava{Enter}Lee{Enter}{Enter}");
            let runId = "";
            await waitFor(
                () => {
                    const run = session.runs.list().find((r) => r.algorithm === "shortest-path");
                    assert.equal(run?.status, "succeeded");
                    runId = String(run?.id);
                },
                { timeout: TIMEOUT_MS },
            );
            act(() => {
                store.set({ inspected: { kind: "measure-row", id: runId }, tabs: { "measure-row": "values" } });
            });
            // Made with: the same rows as Analysis and Ran, in the form's words, the weight once.
            const madeWith = await screen.findByRole("group", { name: "Made with" });
            const text = madeWith.textContent;
            for (const words of ["AnalysisShortest path", "FromAva", "ToLee"]) {
                assert.include(text, words);
            }
            assert.include(text, "Weightnot read -- weight's meaning is not set, and a path needs a distance");
            assert.notInclude(text, "Source");
            assert.notInclude(text, "Target");
            assert.isNull(within(madeWith).queryByRole("combobox", { name: "Weight" }));
            assert.lengthOf(text.match(/weight's meaning/g) ?? [], 1, "the weight is stated once");
            // The header names the run once: "ran <date>", never "Path from Shortest path".
            const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
            assert.isNotNull(inspector.getByRole("button", { name: /^ran / }));
            assert.isNull(inspector.queryByText(/from Shortest path/));
        },
        TIMEOUT_MS,
    );

    it(
        "a run that read a weight nobody gave a meaning says so in Made with, as the Data page does",
        async () => {
            const { store, session } = await openFriends(null);
            const run = session.runs.start("pagerank", {});
            await run;
            act(() => {
                store.set({ inspected: { kind: "measure-row", id: run.id }, tabs: { "measure-row": "values" } });
            });
            const madeWith = await screen.findByRole("group", { name: "Made with" });
            await waitFor(() => {
                assert.include(madeWith.textContent, "Weightweight, meaning not set, read as closer");
            });
        },
        TIMEOUT_MS,
    );

    it(
        "names the popover's Advanced fold and the right panel's apart, and keeps the chevron in the popover",
        async () => {
            const { store, session } = await openFriends("distance");
            const run = session.runs.start("shortest-path", { source: "Ava", target: "Lee" });
            await run;
            act(() => {
                store.set({ inspected: { kind: "measure-row", id: run.id }, tabs: { "measure-row": "values" } });
            });
            await screen.findByRole("group", { name: "Made with" });
            await userEvent.keyboard("p");
            const form = await pathForm();
            const own = within(form).getByRole("button", { name: "Expand Advanced" });
            const panel = screen.getByRole("button", { name: "Expand Advanced run settings" });
            assert.notEqual(own, panel);
            assert.lengthOf(screen.getAllByRole("button", { name: "Expand Advanced" }), 1);
            // The chevron sits inside the popover's padding, not on its border.
            const chevron = own.querySelector(".cm-subgroup-chevron");
            assert.isAtLeast(chevron?.getBoundingClientRect().left ?? 0, form.getBoundingClientRect().left);
        },
        TIMEOUT_MS,
    );

    it(
        "the Weight box reads a loaded distance as used",
        async () => {
            const { element } = await openFriends("distance");
            element.focus();
            await userEvent.keyboard("p");
            const form = await pathForm();
            const weight = within(form).getByRole<HTMLInputElement>("combobox", { name: "Weight" });
            // The element's plan has answered once the form's pending effects settle.
            await act(async () => {
                await Promise.resolve();
            });
            assert.equal(weight.value, "weight (farther, loaded)");
            assert.isNull(within(form).queryByText(/not read/i));
        },
        TIMEOUT_MS,
    );

    it(
        "P does nothing while focus is in a text field",
        async () => {
            const { store } = await openFriends();
            await userEvent.click(screen.getByRole("combobox", { name: "Find" }));
            await userEvent.keyboard("p");
            assert.isNull(store.get().dialog);
            assert.isNull(screen.queryByRole("form", { name: "Shortest path" }));
        },
        TIMEOUT_MS,
    );

    it(
        "opens from Analyze > Shortest path with a way back to the list",
        async () => {
            await openFriends();
            await userEvent.click(analyzeTool());
            const box = await screen.findByRole("combobox", { name: "Filter analyses" });
            await userEvent.type(box, "Shortest");
            await userEvent.click(await screen.findByRole("option", { name: /^Shortest path/ }));
            const form = await pathForm();
            await userEvent.click(within(form).getByRole("button", { name: "Back to analyses" }));
            assert.isNotNull(await screen.findByRole("combobox", { name: "Filter analyses" }));
        },
        TIMEOUT_MS,
    );
});
