/**
 * Replace with a newer copy on the REAL graphty-element (data prototype spec section 3.7,
 * acceptance flow 8): the Sources row's Replace with file... swaps September's shipments for
 * October's, the style layer and the filter stay, the receipt's chips read the element's counts,
 * and its Undo brings September back.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, ReplaceReport } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { replacedWords, showUnbound } from "../commands";
import { countWords, unboundWords } from "../words";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answers the next file picker with this file (graphty/vitest.config.ts). */
        chooseNextFile: (name: string, mimeType: string, text: string) => Promise<void>;
    }
}

/** A hang guard for the element coming up and loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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
 * Drops a file as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param file - the file.
 */
function drop(file: File): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * Waits until the graph holds these counts.
 * @param session - the element's session.
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
 * Flow 7's graph: suppliers.csv, then ships-to-2024-09.csv joined as edges between them.
 * @returns the session.
 */
async function supplyChain(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
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
    const live = session;
    drop(await fixture("suppliers.csv"));
    await holds(live, 40, 0);
    store.set({ dockOpen: false, dockMaximized: false });
    drop(await fixture("ships-to-2024-09.csv"));
    const join = await screen.findByRole("region", { name: "Join" }, { timeout: TIMEOUT_MS });
    await userEvent.click(within(join).getByRole("button", { name: "Join" }));
    await holds(live, 40, 150);
    return live;
}

const REPORT: ReplaceReport = {
    nodes: { added: 0, removed: 0, changed: 0 },
    edges: { added: 12, removed: 3, changed: 40 },
    unbound: [
        { code: "style-layer", params: { layer: "l1", kind: "node", column: "tier" } },
        { code: "style-layer", params: { layer: "l2", kind: "node", column: "tier" } },
        { code: "filter", params: { kind: "node", column: "tier" } },
    ],
};

describe("the replace receipt's words", () => {
    it("leaves zero counts out and counts what came unbound by kind", () => {
        assert.deepEqual(countWords(REPORT.nodes), []);
        assert.deepEqual(countWords(REPORT.edges), ["+12", "-3", "40 changed"]);
        assert.deepEqual(unboundWords(REPORT), ["2 styles unbound", "1 filter unbound"]);
        assert.strictEqual(
            replacedWords("a.csv", "b.csv", REPORT),
            "Replaced a.csv with b.csv: edges +12 -3 40 changed, 2 styles unbound, 1 filter unbound",
        );
        assert.strictEqual(
            replacedWords("a.csv", "b.csv", { ...REPORT, edges: REPORT.nodes, unbound: [] }),
            "Replaced a.csv with b.csv",
        );
    });

    it("Show opens the layer, the Filters or the join that came unbound", () => {
        const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
        showUnbound(store, { code: "style-layer", params: { layer: "l1", kind: "node", column: "tier" } });
        assert.strictEqual(store.get().place, "graph");
        assert.deepEqual(store.get().inspected, { kind: "layer-row", id: "l1" });
        showUnbound(store, { code: "filter", params: { kind: "node", column: "tier" } });
        assert.strictEqual(store.get().place, "data");
        showUnbound(store, { code: "join", params: { join: "s2", kind: "node", column: "tier" } });
        assert.strictEqual(store.get().editingJoin, "s2");
    });
});

describe("Replace with file on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("replaces September with October, keeps the style and filter, and Undo brings September back (flow 8)", async () => {
        const session = await supplyChain();
        const layer = await session.styles.add({
            name: "Tier",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#FF0000" },
        });
        const steps = [
            { id: "step-1", on: true, rule: { kind: "categories", attribute: "data.country", values: ["DE"] } },
        ] as const;
        await session.visibility.setSteps(steps);
        const shownBefore = session.visibility.summary.visibleNodes;

        const row = await screen.findByRole("listitem", { name: "ships-to-2024-09.csv" }, { timeout: TIMEOUT_MS });
        await userEvent.hover(row);
        await userEvent.click(within(row).getByRole("button", { name: "ships-to-2024-09.csv menu" }));
        const october = await fixture("ships-to-2024-10.csv");
        await commands.chooseNextFile(october.name, "text/csv", await october.text());
        await userEvent.click(await screen.findByRole("menuitem", { name: "Replace with file..." }));

        const receipt = await screen.findByText(
            "Replaced ships-to-2024-09.csv with ships-to-2024-10.csv",
            {},
            { timeout: TIMEOUT_MS },
        );
        const toast = receipt.closest<HTMLElement>('[role="group"]');
        if (toast === null) {
            throw new Error("the receipt is not in a notice");
        }
        await holds(session, 40, 159);
        // Edge chips only: no node came, went or changed.
        const chips = [...toast.querySelectorAll<HTMLElement>(".cm-entity-chip")].map((chip) => [
            chip.dataset.kind,
            chip.querySelector(".cm-entity-text")?.textContent,
        ]);
        assert.deepEqual(chips, [
            ["edge", "+12"],
            ["edge", "-3"],
            ["edge", "40 changed"],
        ]);
        // The style and the filter stay.
        assert.isDefined(session.styles.get(layer.id));
        assert.deepEqual(
            session.visibility.steps.map((step) => step.rule),
            steps.map((step) => step.rule),
        );
        assert.strictEqual(session.visibility.summary.visibleNodes, shownBefore);

        await userEvent.click(within(toast).getByRole("button", { name: "Undo" }));
        await holds(session, 40, 150);
        assert.strictEqual(session.data.sources().find((each) => each.kind === "join")?.name, "ships-to-2024-09.csv");
        assert.isDefined(session.styles.get(layer.id));
    });
});
