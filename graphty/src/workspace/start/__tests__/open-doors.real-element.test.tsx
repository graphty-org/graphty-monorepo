/**
 * The loading doors on the REAL graphty-element (data prototype spec sections 2.1 and 6): every
 * fixture file draws its counts when dropped and when chosen in Samples; a clean file draws with
 * nothing opened over it, a file with problems opens the table docked, one whose ends are still
 * to pick opens it maximized beside the Data place, a second file waits for
 * the join screen, and a newer copy of a loaded file replaces it with Undo. Every count is read
 * from the element.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../samples";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answers the next file picker with this file (graphty/vitest.config.ts). */
        chooseNextFile: (name: string, mimeType: string, text: string) => Promise<void>;
    }
}

/** A hang guard for the element coming up and loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** How the table dock stands after a load. */
type Dock = "closed" | "docked" | "maximized";

/**
 * How the table dock stands.
 * @param state - the workspace state.
 * @param state.dockOpen - whether the dock is open.
 * @param state.dockMaximized - whether it fills the canvas area.
 * @returns closed, docked or maximized.
 */
function dockOf(state: { dockOpen: boolean; dockMaximized: boolean }): Dock {
    if (!state.dockOpen) {
        return "closed";
    }
    return state.dockMaximized ? "maximized" : "docked";
}

/**
 * What each fixture draws alone, and how it leaves the table dock: maximized only when the load
 * could not draw (ends to pick), docked for problems that did not stop it.
 */
const EXPECTED: Readonly<Record<string, { nodes: number; edges: number; dock: Dock }>> = {
    "tp53-interactions.tsv": { nodes: 60, edges: 120, dock: "closed" },
    "tumor-expression.tsv": { nodes: 69, edges: 0, dock: "docked" },
    "suppliers.csv": { nodes: 40, edges: 0, dock: "docked" },
    "ships-to-2024-09.csv": { nodes: 40, edges: 150, dock: "closed" },
    "ships-to-2024-10.csv": { nodes: 40, edges: 159, dock: "closed" },
    "accounts.csv": { nodes: 298, edges: 0, dock: "docked" },
    "transfers.csv": { nodes: 316, edges: 449, dock: "docked" },
    "auth-log.csv": { nodes: 19, edges: 400, dock: "docked" },
};

/**
 * A fixture as a file, read from where the app serves it.
 * @param name - its file name.
 * @returns the file.
 */
async function fixture(name: string): Promise<File> {
    const sample = PROTOTYPE_SAMPLES.find((each) => sampleName(each) === name);
    if (sample === undefined) {
        throw new Error(`no fixture ${name}`);
    }
    const response = await fetch(sampleUrl(sample));
    return new File([await response.blob()], name);
}

/**
 * Drops files as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param files - the files.
 */
function drop(...files: File[]): void {
    const dataTransfer = new DataTransfer();
    for (const file of files) {
        dataTransfer.items.add(file);
    }
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * Waits for the project's element and its session.
 * @returns the session.
 */
async function elementSession(): Promise<GraphSession> {
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            // The start screen draws a graph of its own; the project's element is the other one.
            session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element:not([data-start-page])",
            )?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * Waits until the graph holds a count of nodes and edges.
 * @param session - the session.
 * @param nodes - the nodes.
 * @param edges - the edges.
 */
async function holds(session: GraphSession, nodes: number, edges: number): Promise<void> {
    await waitFor(
        () => {
            assert.strictEqual(session.data.nodes().length, nodes);
            assert.strictEqual(session.data.edges().length, edges);
        },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * An empty project open on the Data place, as New project leaves it.
 * @returns the store and the session.
 */
async function emptyProject(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    return { store, session: await elementSession() };
}

/**
 * Chooses a fixture in the Samples dialog, opened from the Sources "+".
 * @param name - the fixture's file name.
 */
async function chooseSample(name: string): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: "Add source" }, { timeout: TIMEOUT_MS }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Samples/ }));
    const dialog = await screen.findByRole("dialog", { name: "Samples" });
    const row = [...dialog.querySelectorAll("button")].find((button) => button.textContent.startsWith(name));
    if (row === undefined) {
        throw new Error(`Samples lists no ${name}`);
    }
    await userEvent.click(row);
}

describe("the loading doors on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it.each(PROTOTYPE_SAMPLES.map(sampleName))("%s dropped on the start screen draws its counts", async (name) => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        drop(await fixture(name));
        const session = await elementSession();
        const expected = EXPECTED[name];
        await holds(session, expected.nodes, expected.edges);
        await waitFor(() => {
            assert.strictEqual(dockOf(store.get()), expected.dock);
        });
        assert.isNull(store.get().dialog, "no dialog opens over a dropped file");
        assert.deepEqual(
            session.data.sources().map((source) => source.name),
            [name],
        );
    });

    it.each(PROTOTYPE_SAMPLES.map(sampleName))("%s chosen in Samples draws its counts", async (name) => {
        const { store, session } = await emptyProject();
        await chooseSample(name);
        const expected = EXPECTED[name];
        await holds(session, expected.nodes, expected.edges);
        await waitFor(() => {
            assert.strictEqual(dockOf(store.get()), expected.dock);
            assert.isNull(store.get().dialog);
        });
    });

    it("draws a clean file with no table and no dialog over it", async () => {
        const { store, session } = await emptyProject();
        await chooseSample("tp53-interactions.tsv");
        await holds(session, 60, 120);
        assert.isFalse(store.get().dockOpen);
        assert.isNull(store.get().dialog);
        assert.deepEqual(session.data.issues(), []);
        const roles = session.data.sources()[0].mapping?.tables;
        const [table] = Object.values(roles ?? {});
        assert.deepInclude(table, { rowsAre: "edges", source: { column: "bait" }, target: { column: "prey" } });
    });

    it("reads a node file and an edge file dropped together as one load, with its problems", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        drop(await fixture("accounts.csv"), await fixture("transfers.csv"));
        const session = await elementSession();
        await waitFor(
            () => {
                const counts = Object.fromEntries(session.data.issues().map((issue) => [issue.id, issue.count]));
                assert.deepInclude(counts, {
                    "unknown-end:edge": 18,
                    "repeated-edge:edge": 5,
                    "repeated-id:node": 2,
                    "refused-row": 1,
                });
            },
            { timeout: TIMEOUT_MS },
        );
        // The files drew: their problems open the table docked, not over the drawing. The issues are
        // readable while the element is still settling the load, before draft.load() resolves and
        // the app opens the dock, so wait for the dock as the single-file tests do.
        await waitFor(() => {
            assert.strictEqual(dockOf(store.get()), "docked");
        });
    });

    it("holds a second file for the join screen, with the matches the element counts", async () => {
        const { store, session } = await emptyProject();
        await chooseSample("tp53-interactions.tsv");
        await holds(session, 60, 120);
        drop(await fixture("tumor-expression.tsv"));
        await waitFor(
            () => {
                assert.isNotNull(store.get().joining);
            },
            { timeout: TIMEOUT_MS },
        );
        const { joining } = store.get();
        assert.strictEqual(joining?.name, "tumor-expression.tsv");
        const suggestion = joining?.draft.suggestJoin();
        assert.deepEqual(suggestion?.keys, [{ file: "symbol", graph: "id" }]);
        assert.deepInclude(joining?.draft.joinReport({ keys: suggestion?.keys ?? [] }), {
            matched: 52,
            notInGraph: 10,
            withoutValue: 8,
            repeatedKeys: 1,
            extraIgnoringCase: 6,
            extraIgnoringSpaces: 1,
        });
        await holds(session, 60, 120);
    });

    it("pre-picks edges between nodes for an edge file dropped onto a node file", async () => {
        const { store, session } = await emptyProject();
        await chooseSample("suppliers.csv");
        await holds(session, 40, 0);
        drop(await fixture("ships-to-2024-09.csv"));
        await waitFor(
            () => {
                assert.isNotNull(store.get().joining);
            },
            { timeout: TIMEOUT_MS },
        );
        const draft = store.get().joining?.draft;
        const suggestion = draft?.suggestJoin();
        assert.strictEqual(suggestion?.shape, "edges");
        assert.strictEqual(draft?.joinReport({ keys: suggestion?.keys ?? [] }).newEdges, 150);
    });

    it("adds the file chosen with File...", async () => {
        const { session } = await emptyProject();
        const file = await fixture("tp53-interactions.tsv");
        await commands.chooseNextFile(file.name, "text/tab-separated-values", await file.text());
        await userEvent.click(await screen.findByRole("button", { name: "Add source" }, { timeout: TIMEOUT_MS }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "File..." }));
        await holds(session, 60, 120);
    });

    it("adds the clipboard's text as a source with Paste", async () => {
        const { session } = await emptyProject();
        await userEvent.click(await screen.findByRole("button", { name: "Add source" }, { timeout: TIMEOUT_MS }));
        await navigator.clipboard.writeText("source,target\na,b\nb,c\n");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Paste" }));
        await holds(session, 3, 2);
        assert.deepEqual(
            session.data.sources().map((source) => source.name),
            ["Pasted data"],
        );
    });

    it("replaces a loaded file with its newer copy at once, and Undo brings the old one back", async () => {
        const { session } = await emptyProject();
        await chooseSample("ships-to-2024-09.csv");
        await holds(session, 40, 150);
        drop(await fixture("ships-to-2024-10.csv"));
        const receipt = await screen.findByText(
            "Replaced ships-to-2024-09.csv with ships-to-2024-10.csv",
            {},
            { timeout: TIMEOUT_MS },
        );
        await holds(session, 40, 159);
        // The receipt's own Undo, not the header's.
        const toast = receipt.closest<HTMLElement>('[role="group"]');
        assert.isNotNull(toast);
        assert.deepEqual(
            [...(toast?.querySelectorAll(".cm-entity-text") ?? [])].map((chip) => chip.textContent),
            ["+12", "-3", "40 changed"],
        );
        await userEvent.click(within(toast).getByRole("button", { name: "Undo" }));
        await holds(session, 40, 150);
    });
});
