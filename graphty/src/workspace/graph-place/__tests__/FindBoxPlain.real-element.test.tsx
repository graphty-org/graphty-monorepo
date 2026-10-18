/**
 * The find box on the REAL graphty-element, read and typed in the plain form: its hints and
 * corrections show no backticks and no leading "=", a rule offer says how many and what it selects,
 * Shift+click adds, Escape in the empty box takes back its own selection and leaves for the
 * drawing, Enter leaves the box whichever inspector tab is open, a miss says what stays selected,
 * "Yes" finds a yes-or-no value, and a bare "degree" is offered as the degree every node has.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** A hub "a" with three spokes: the givers' donations, roles and whether they are on record. */
const NODES = [
    { id: "a", name: "Ava", donations: 12000, role: "staff", member: true },
    { id: "b", name: "Ben", donations: 500, role: "board", member: false },
    { id: "c", name: "Cy", donations: 10000, role: "board", member: true },
    { id: "d", name: "Dee", donations: 50, role: "donor" },
].map((node, i) => ({ ...node, position: { x: (i - 2) * 6, y: 0, z: 0 } }));
/** The edges carry a number column of their own, which a node example must not use. */
const EDGES = [
    { source: "a", target: "b", weight: 900 },
    { source: "a", target: "c", weight: 700 },
    { source: "a", target: "d", weight: 800 },
];

/**
 * Renders the workspace with a project open and loads the graph.
 * @returns the element's session.
 */
async function openWithGraph(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Givers", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    let element: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(
        () => {
            element = document.querySelector("graphty-element");
            assert.isDefined(element?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element as HTMLElementTagNameMap["graphty-element"];
    await session.layout.set("fixed");
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return session;
}

/**
 * The find box, with focus in it.
 * @returns the box.
 */
async function focusFind(): Promise<HTMLElement> {
    const find = await screen.findByRole("combobox", { name: "Find" }, { timeout: TIMEOUT_MS });
    await userEvent.click(find);
    return find;
}

/**
 * The text of the lines under the find box: its hint or its refusal.
 * @returns the text.
 */
function lineUnderBox(): string {
    return [...document.querySelectorAll(".ws-find-empty, .ws-find-refusal")].map((e) => e.textContent).join(" ");
}

describe("the find box in plain words", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("hints with a node column in the plain form, and says what stays selected", async () => {
        const session = await openWithGraph();
        await session.selection.apply({ nodes: ["b", "d"] });
        await focusFind();
        await userEvent.keyboard("zzz");

        await waitFor(
            () => {
                assert.include(
                    lineUnderBox(),
                    "Still selected: 2 nodes. To select by a value, type a rule such as donations > 6000",
                );
            },
            { timeout: TIMEOUT_MS },
        );
        assert.notInclude(lineUnderBox(), "`");
        assert.notInclude(lineUnderBox(), "=");
    });

    it("reads a typed rule with bare numbers, and offers degree with no backticks", async () => {
        const session = await openWithGraph();
        await focusFind();
        await userEvent.keyboard("=degree > 2");

        await screen.findByText('No column named "degree". Did you mean:', {}, { timeout: TIMEOUT_MS });
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const offer = within(list).getByRole("group", { name: "Rule" });
        await waitFor(() => {
            assert.include(offer.textContent, "graphty.degree > 2");
            assert.include(offer.textContent, "Select the 1 node");
        });
        assert.notInclude(offer.textContent, "`");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["a"]);
        });
    });

    it("offers plain text as a rule that says how many and what it selects", async () => {
        await openWithGraph();
        await focusFind();
        await userEvent.keyboard("donations >= 10000");

        const list = await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        const offer = await within(list).findByRole("group", { name: "Rule" }, { timeout: TIMEOUT_MS });
        await waitFor(() => {
            assert.include(offer.textContent, "donations >= 10000");
            assert.include(offer.textContent, "Select the 2 nodes (donations 10000 or more)");
        });
        assert.notInclude(offer.textContent, "`");
    });

    it("adds a value row to the selection on Shift+click and keeps the list open", async () => {
        const session = await openWithGraph();
        await session.selection.apply({ nodes: ["d"] });
        await focusFind();
        await userEvent.keyboard("staff");
        const list = await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        const row = within(list).getByRole("option", { name: /role is staff/ });

        await userEvent.keyboard("{Shift>}");
        await userEvent.click(row);
        await userEvent.keyboard("{/Shift}");

        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes], ["a", "d"]);
        });
        assert.isNotNull(screen.queryByRole("listbox", { name: "Find results" }), "the list stays open");
    });

    it("takes back its own selection on Escape in the empty box, and leaves for the drawing", async () => {
        const session = await openWithGraph();
        await focusFind();
        await userEvent.keyboard("staff");
        await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["a"]);
        });

        // The pick took focus to the node's values; the reader comes back to the box.
        await focusFind();
        await userEvent.keyboard("{Escape}");

        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, 0);
        });
        const element = document.querySelector("graphty-element");
        assert.isTrue(
            element?.contains(document.activeElement) === true || document.activeElement === element,
            `focus is on ${document.activeElement?.outerHTML.slice(0, 120) ?? "nothing"}`,
        );
    });

    it("leaves a selection it did not make on Escape in the empty box", async () => {
        const session = await openWithGraph();
        await session.selection.apply({ nodes: ["b"] });
        const find = await focusFind();

        await userEvent.keyboard("{Escape}");

        await waitFor(() => {
            assert.notStrictEqual(document.activeElement, find);
        });
        assert.deepEqual([...session.selection.nodes], ["b"]);
    });

    it("moves focus to the inspector's title on Enter while the Style tab is open", async () => {
        const session = await openWithGraph();
        await focusFind();
        await userEvent.keyboard("Ava");
        await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["a"]);
        });
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await userEvent.click(await inspector.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS }));

        await focusFind();
        await userEvent.keyboard("Ava");
        await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        await userEvent.keyboard("{Enter}");

        await waitFor(() => {
            assert.strictEqual(document.activeElement?.id, INSPECTOR_TITLE_ID);
        });
    });

    it("finds a yes-or-no value by Yes", async () => {
        await openWithGraph();
        await focusFind();
        await userEvent.keyboard("Yes");

        const list = await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        assert.isNotNull(within(list).queryByRole("option", { name: /member is Yes \(2\)/ }));
    });

    it("says an unreadable rule keeps the selection, and shows a rule that works", async () => {
        const session = await openWithGraph();
        await session.selection.apply({ nodes: ["b"] });
        await focusFind();
        await userEvent.keyboard("=email missing{Enter}");

        await waitFor(
            () => {
                assert.include(lineUnderBox(), "Not a rule Find can read");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.include(lineUnderBox(), "Still selected: 1 node. A rule reads like donations > 6000");
        assert.deepEqual([...session.selection.nodes], ["b"]);
    });
});
