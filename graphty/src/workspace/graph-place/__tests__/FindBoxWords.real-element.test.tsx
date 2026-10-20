/**
 * The find box on the REAL graphty-element says every column by the name the panels show it under
 * (Degree, never a path), teaches an inclusive example, always says what Enter did, speaks an
 * offered rule with its count and never "No match" beside it, draws no heading without a row,
 * marks the rows already picked with Shift, and clears the same way after either kind of pick.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** A hub "a" with three spokes, and what each gave. */
const NODES = [
    { id: "a", name: "Ava", donations: 12000, role: "staff" },
    { id: "b", name: "Ben", donations: 500, role: "board" },
    { id: "c", name: "Cy", donations: 10000, role: "board" },
    { id: "d", name: "Dee", donations: 50, role: "donor" },
].map((node, i) => ({ ...node, position: { x: (i - 2) * 6, y: 0, z: 0 } }));
const EDGES = [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "a", target: "d" },
];

/** Everything said to a screen reader since the workspace opened, with whether an offer was listed. */
let said: { words: string; offerListed: boolean }[] = [];
let stopListening = (): void => undefined;

afterEach(() => {
    stopListening();
    said = [];
});

/**
 * Renders the workspace with the givers loaded, recording every announcement.
 * @returns the element's session and the store.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Givers", id: 1 }, inspected: { kind: "everything-row" } });
    let last = "";
    stopListening = store.subscribe(() => {
        const words = store.get().announcement;
        if (words !== last && words !== "") {
            const offerListed = document.querySelector('[role=listbox] [role=group][aria-label="Rule"]') !== null;
            said.push({ words, offerListed });
        }
        last = words;
    });
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
    await session.data.addNodes(NODES.map((node) => ({ ...node })));
    await session.data.addEdges(EDGES.map((edge) => ({ ...edge })));
    return { session, store };
}

/**
 * The find box, with focus in it.
 * @returns the box.
 */
async function focusFind(): Promise<HTMLInputElement> {
    const find = await screen.findByRole("combobox", { name: "Find" }, { timeout: TIMEOUT_MS });
    await userEvent.click(find);
    return find as HTMLInputElement;
}

/**
 * Every word the find box shows or says: its text, its hidden status region and the workspace's
 * announcements.
 * @returns the words.
 */
function findBoxWords(): string {
    const box = document.querySelector(".ws-find");
    return [box?.textContent ?? "", ...said.map((each) => each.words)].join(" | ");
}

describe("the find box says columns as the screen does", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    for (const run of [false, true]) {
        it(`names Degree, never its path, for "=degree > 2" ${run ? "after a Degree run" : "before any run"}`, async () => {
            const { session } = await openWithGraph();
            if (run) {
                await session.runs.start("degree", {}, { style: false });
            }
            await focusFind();
            await userEvent.keyboard("=degree > 2");

            const list = await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
            const offer = await within(list).findByRole("group", { name: "Rule" }, { timeout: TIMEOUT_MS });
            await waitFor(() => {
                assert.include(offer.textContent, "Degree > 2");
                assert.include(offer.textContent, "Select the 1 node");
                assert.include(findBoxWords(), "Did you mean Degree");
            });
            assert.notInclude(findBoxWords(), "No column named");
            assert.notMatch(findBoxWords(), /graphty\.|results\./);

            // Enter runs the correction; the box keeps the reader's words and says what it selected.
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.deepEqual([...session.selection.nodes], ["a"]);
                // One node is said by the name the app gives it, never as "1 node".
                assert.include(
                    document.querySelector(".ws-find")?.textContent,
                    `${session.data.name("a") ?? "a"} selected`,
                );
            });
            const find = screen.getByRole<HTMLInputElement>("combobox", { name: "Find" });
            assert.strictEqual(find.value, "=degree > 2");
            assert.notInclude(document.querySelector(".ws-find")?.textContent, "Did you mean");
            assert.notMatch(findBoxWords(), /graphty\.|results\./);
        });
    }

    it("hints with an inclusive example", async () => {
        await openWithGraph();
        await focusFind();
        await userEvent.keyboard("zzzz");

        await waitFor(
            () => {
                assert.match(findBoxWords(), /type a rule such as donations >= \d+/);
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("says No match on Enter over text that matches nothing, on screen and aloud", async () => {
        await openWithGraph();
        await focusFind();
        await userEvent.keyboard("zzzz");
        // Typing settles first: its own No match is said once the element has read the text.
        await waitFor(
            () => {
                assert.isTrue(said.some((each) => each.words.includes("To select by a value")));
            },
            { timeout: TIMEOUT_MS },
        );
        said = [];

        await userEvent.keyboard("{Enter}");

        await waitFor(() => {
            assert.isTrue(
                said.some((each) => each.words.startsWith("No match")),
                "Enter says it again",
            );
        });
        assert.include(document.querySelector(".ws-find")?.textContent, "No match");
    });

    it("never says No match while it offers a rule, and ends naming the offer's count", async () => {
        await openWithGraph();
        await focusFind();
        await userEvent.keyboard("donations >= 10000");

        const list = await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        await within(list).findByRole("group", { name: "Rule" }, { timeout: TIMEOUT_MS });
        await waitFor(() => {
            assert.include(said.at(-1)?.words, "2 nodes");
        });
        const wrong = said.filter((each) => each.words.startsWith("No match") && each.offerListed);
        assert.deepEqual(wrong, [], said.map((each) => each.words).join(" | "));
    });

    it("draws no Select by a value: heading once the list closes on a canvas click", async () => {
        await openWithGraph();
        await focusFind();
        await userEvent.keyboard("donations >= 10000");
        const list = await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        await within(list).findByRole("group", { name: "Rule" }, { timeout: TIMEOUT_MS });
        assert.isNotNull(screen.queryByText("Select by a value:"));

        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        await userEvent.click(element, { position: { x: 5, y: 5 } });

        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox", { name: "Find results" }));
        });
        assert.isNull(screen.queryByText("Select by a value:"));
    });

    it("draws no heading after Escape on the drawing clears a rule's selection", async () => {
        const { session } = await openWithGraph();
        await focusFind();
        await userEvent.keyboard("donations >= 10000");
        const list = await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        await within(list).findByRole("group", { name: "Rule" }, { timeout: TIMEOUT_MS });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, 2);
        });

        const element = document.querySelector("graphty-element") as HTMLElement;
        element.focus();
        await userEvent.keyboard("{Escape}");

        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, 0);
        });
        assert.isNull(screen.queryByText("Select by a value:"));
    });

    it("marks the rows already added with Shift, and clears the box as a plain pick does once the list closes", async () => {
        const { session } = await openWithGraph();
        const find = await focusFind();
        await userEvent.keyboard("b");
        const list = await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        // Two value rows: the one Enter would pick is current (and so aria-selected); the other is picked.
        const rows = [
            within(list).getByRole("option", { name: /role is board/ }),
            within(list).getByRole("option", { name: /name is Ben/ }),
        ];
        const current = find.getAttribute("aria-activedescendant");
        const value = rows.find((row) => row.id !== current) as HTMLElement;
        const board = rows.find((row) => row !== value) as HTMLElement;
        assert.strictEqual(value.getAttribute("aria-selected"), "false");
        assert.isNull(value.querySelector(".cm-result-picked"));

        await userEvent.keyboard("{Shift>}");
        await userEvent.click(value);
        await userEvent.keyboard("{/Shift}");

        await waitFor(() => {
            assert.isNotEmpty(session.selection.nodes);
            assert.strictEqual(value.getAttribute("aria-selected"), "true");
            assert.isNotNull(value.querySelector(".cm-result-picked"), "a visible mark");
            assert.isNull(board.querySelector(".cm-result-picked"), "a row not picked has none");
        });

        const element = document.querySelector("graphty-element");
        await userEvent.click(element as Element, { position: { x: 5, y: 5 } });

        await waitFor(() => {
            assert.strictEqual(find.value, "");
        });
    });
});
