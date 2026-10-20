/**
 * The find box on the REAL graphty-element says every column by the name the panels show it under
 * (Degree, never a path), teaches an inclusive example, always says what Enter did, speaks an
 * offered rule with its count and never "No match" beside it, draws no heading without a row,
 * marks the rows already picked with Shift, reads a column in any letter case without a
 * suggestion, keeps its typed text until another act replaces the selection it made, and shows no
 * hint under the box once focus has left it.
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
 * Clicks a node on the drawing, as a reader does.
 * @param id - the node.
 */
async function clickNode(id: string): Promise<void> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the element never came up");
    }
    await element.waitForStableFrame();
    const at = element.nodeScreenPosition(id);
    if (at?.visible !== true) {
        throw new Error(`node ${id} is not on screen`);
    }
    await userEvent.click(element, { position: { x: at.x, y: at.y } });
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
        it(`reads "=degree > 2" as Degree with no suggestion ${run ? "after a Degree run" : "before any run"}`, async () => {
            const { session } = await openWithGraph();
            if (run) {
                await session.runs.start("degree", {}, { style: false });
            }
            await focusFind();
            await userEvent.keyboard("=degree > 2");

            // A column typed in another letter case is that column: no "Did you mean Degree?".
            await waitFor(() => {
                assert.include(findBoxWords(), "Rule: press Enter to select matches");
            });
            assert.notInclude(findBoxWords(), "Did you mean");
            assert.notInclude(findBoxWords(), "No column named");
            assert.notMatch(findBoxWords(), /graphty\.|results\./);

            // Enter runs it; the box keeps the reader's words and says what it selected.
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.deepEqual([...session.selection.nodes], ["a"]);
                assert.include(document.querySelector(".ws-find-empty")?.textContent, "selected");
            });
            const find = screen.getByRole<HTMLInputElement>("combobox", { name: "Find" });
            assert.strictEqual(find.value, "=degree > 2");
            assert.notInclude(findBoxWords(), "Did you mean");
            assert.notMatch(findBoxWords(), /graphty\.|results\./);
        });
    }

    it("shows and says no hint under the box once focus has left it, through a run", async () => {
        const { session } = await openWithGraph();
        const find = await focusFind();
        await userEvent.keyboard("=Donations >= 10000");
        await waitFor(() => {
            assert.include(findBoxWords(), "Rule: press Enter to select matches");
        });
        assert.notInclude(findBoxWords(), "Did you mean");

        // Focus leaves for another panel; a run then changes the data the rule reads.
        await userEvent.click(screen.getByText("Style layers"));
        await waitFor(() => {
            assert.isNull(document.querySelector(".ws-find-empty"));
        });
        said = [];
        await session.runs.start("degree", {}, { style: false });

        assert.isNull(document.querySelector(".ws-find-empty"), document.querySelector(".ws-find")?.textContent ?? "");
        assert.deepEqual(
            said.filter((each) => /Rule|Did you mean/.test(each.words)),
            [],
            said.map((each) => each.words).join(" | "),
        );
        assert.strictEqual(find.value, "=Donations >= 10000");
    });

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

    it("says No match on Enter over a word that matches nothing, on screen and aloud", async () => {
        await openWithGraph();
        await focusFind();
        await userEvent.keyboard("most");
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

    it("marks the rows added with Shift, keeps the text through a click on another panel, and clears it on a click on a node", async () => {
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

        // A click on another panel closes the list and keeps what was typed.
        await userEvent.click(screen.getByText("Style layers"));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox", { name: "Find results" }));
        });
        assert.strictEqual(find.value, "b");

        // A click on a node replaces the selection the box made, and the box clears.
        await clickNode("d");
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["d"]);
            assert.strictEqual(find.value, "");
        });
    });

    it("keeps a rule's text through a run, and clears it once a click on a node replaces its selection", async () => {
        const { session } = await openWithGraph();
        const find = await focusFind();
        await userEvent.keyboard("donations >= 10000");
        const list = await screen.findByRole("listbox", { name: "Find results" }, { timeout: TIMEOUT_MS });
        await within(list).findByRole("group", { name: "Rule" }, { timeout: TIMEOUT_MS });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, 2);
        });

        await session.runs.start("degree", {}, { style: false });
        assert.strictEqual(find.value, "donations >= 10000");

        await clickNode("d");
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["d"]);
            assert.strictEqual(find.value, "");
        });
    });
});
