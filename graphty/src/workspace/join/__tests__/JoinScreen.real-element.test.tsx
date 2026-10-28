/**
 * The join screen on the REAL graphty-element (data prototype spec section 3.6, acceptance flows 5
 * and 7): a second file opens it with the element's suggestion; the chips read the element's join
 * report; Use, Show, the include boxes and Join act on it; Edit join reopens it; Undo takes a join
 * back in one step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

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
 * An empty project on the Data place with a first file loaded.
 * @param first - the first file's name.
 * @param nodes - the nodes it draws.
 * @returns the store and the session.
 */
async function projectWith(first: string, nodes: number): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    const live = session;
    drop(await fixture(first));
    await waitFor(() => {
        assert.strictEqual(live.data.nodes().length, nodes);
    });
    store.set({ dockOpen: false, dockMaximized: false });
    return { store, session: live };
}

/**
 * Drops a second file and waits for the join screen.
 * @param name - the file's name.
 * @returns the screen.
 */
async function joinScreenFor(name: string): Promise<HTMLElement> {
    drop(await fixture(name));
    return screen.findByRole("region", { name: "Join" });
}

/**
 * The chips' words, one per chip.
 * @param join - the join screen.
 * @returns the words.
 */
function chips(join: HTMLElement): string[] {
    const list = within(join).getByRole("list", { name: "Matches" });
    return [...list.querySelectorAll(":scope > li")].map((li) =>
        (li.textContent ?? "")
            .replace(/^(Node|Edge) /, "")
            .replace(/(Show|Use)$/, "")
            .trim(),
    );
}

/**
 * What a Match row dropdown shows.
 * @param join - the join screen.
 * @param label - the dropdown's name.
 * @returns its text.
 */
function valueOf(join: HTMLElement, label: string): string {
    return within(join).getByLabelText<HTMLInputElement>(label).value;
}

describe("the join screen on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("joins an expression table onto a protein network (flow 5)", async () => {
        const { session } = await projectWith("tp53-interactions.tsv", 60);
        const join = await joinScreenFor("tumor-expression.tsv");
        assert.strictEqual(valueOf(join, "Match column"), "symbol");
        assert.strictEqual(valueOf(join, "Match graph value"), "Id");
        assert.deepEqual(chips(join), [
            "52 matched",
            "10 not in graph",
            "8 no value",
            "1 repeated key",
            "+6 ignoring case",
            "+1 ignoring spaces",
        ]);

        // Show narrows the incoming table to the rows that match nothing.
        await userEvent.click(within(join).getByRole("button", { name: "Show rows not in graph" }));
        const incoming = within(join).getByRole("grid", { name: "tumor-expression.tsv" });
        await waitFor(() => {
            assert.strictEqual(incoming.querySelectorAll('[role="row"]').length, 17 + 1);
        });
        await userEvent.click(within(join).getByRole("button", { name: "Show rows not in graph" }));

        await userEvent.click(within(join).getByRole("button", { name: "Use ignoring case" }));
        await waitFor(() => {
            assert.include(chips(join), "58 matched");
        });
        assert.notInclude(chips(join), "+6 ignoring case");

        // Leave tissue out: only log2fc and padj are joined.
        await userEvent.click(within(join).getByRole("checkbox", { name: "Include tissue" }));
        await userEvent.click(within(join).getByRole("button", { name: "Join" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Join" }));
        });
        assert.isDefined(session.data.node("TP53")?.log2fc);
        assert.isUndefined(session.data.node("TP53")?.tissue);
        const [joined] = session.data.joins();
        assert.strictEqual(joined.matched, 58);
        await screen.findByLabelText("58/70 matched");

        // The header's Undo names the step it undoes ("Undo joining ...").
        await userEvent.click(
            within(screen.getByRole("banner", { name: "Project" })).getByRole("button", { name: /^Undo/ }),
        );
        await waitFor(() => {
            assert.deepEqual(session.data.joins(), []);
        });
        assert.isUndefined(session.data.node("TP53")?.log2fc);
    });

    it("edits a join from its source row, counted against the graph without it", async () => {
        const { session } = await projectWith("tp53-interactions.tsv", 60);
        let join = await joinScreenFor("tumor-expression.tsv");
        await userEvent.click(within(join).getByRole("button", { name: "Join" }));
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });

        const row = await screen.findByRole("listitem", { name: "tumor-expression.tsv" });
        await userEvent.hover(row);
        await userEvent.click(within(row).getByRole("button", { name: "tumor-expression.tsv menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Edit join" }));
        join = await screen.findByRole("region", { name: "Join" });
        assert.include(chips(join), "52 matched");
        assert.isNull(within(join).queryByRole("button", { name: "Join choices" }), "an edit only joins");
        await userEvent.click(within(join).getByRole("button", { name: "Use ignoring case" }));
        await userEvent.click(within(join).getByRole("button", { name: "Join" }));
        await waitFor(() => {
            assert.strictEqual(session.data.joins()[0]?.matched, 58);
        });
    });

    it("takes focus, cancels with Esc in the screen only, and Undo brings the file back", async () => {
        const { store, session } = await projectWith("tp53-interactions.tsv", 60);
        const join = await joinScreenFor("tumor-expression.tsv");
        await waitFor(() => {
            assert.isTrue(join.contains(document.activeElement), "the screen has focus");
        });

        // An Esc outside the screen is not the join's.
        (document.activeElement as HTMLElement).blur();
        await userEvent.keyboard("{Escape}");
        assert.isNotNull(screen.queryByRole("region", { name: "Join" }));

        within(join).getByRole("button", { name: "Join" }).focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Join" }));
        });
        assert.isNull(store.get().joining);
        assert.deepEqual(session.data.joins(), []);

        const toast = (
            await screen.findByText("Join canceled", { selector: ".cm-toast-message" })
        ).closest<HTMLElement>('[role="group"]');
        assert.isNotNull(toast);
        await userEvent.click(within(toast).getByRole("button", { name: "Undo" }));
        const back = await screen.findByRole("region", { name: "Join" });
        assert.include(chips(back), "52 matched");
        await userEvent.click(within(back).getByRole("button", { name: "Join" }));
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
    });

    it("keeps Ignore on the repeated key in the join, and Include in the header menu", async () => {
        const { session } = await projectWith("tp53-interactions.tsv", 60);
        const join = await joinScreenFor("tumor-expression.tsv");
        await userEvent.click(within(join).getByRole("button", { name: "1 repeated key" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Ignore" }));
        await waitFor(() => {
            assert.notInclude(chips(join), "1 repeated key");
        });

        // The header menu's Include is the include box, from the keyboard.
        const tissue = within(join).getByRole("button", { name: /^tissue/ });
        tissue.focus();
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        const include = await screen.findByRole("menuitem", { name: "Include" });
        assert.strictEqual(include.getAttribute("aria-checked"), "true");
        await userEvent.click(include);
        await waitFor(() => {
            assert.isFalse(within(join).getByRole<HTMLInputElement>("checkbox", { name: "Include tissue" }).checked);
        });

        await userEvent.click(within(join).getByRole("button", { name: "Join" }));
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
        assert.include(session.data.joins()[0]?.choices.ignore ?? [], "repeatedKeys");
        assert.isUndefined(session.data.node("TP53")?.tissue);
    });

    it("sizes incoming columns to their names", async () => {
        await projectWith("tp53-interactions.tsv", 60);
        const join = await joinScreenFor("tumor-expression.tsv");
        const incoming = within(join).getByRole("grid", { name: "tumor-expression.tsv" });
        await waitFor(() => {
            const labels = incoming.querySelectorAll<HTMLElement>('[data-testid="data-table-header-label"]');
            assert.isAbove(labels.length, 0);
            for (const label of labels) {
                assert.isAtMost(label.scrollWidth, label.clientWidth, `${label.textContent ?? ""} is cut off`);
            }
        });
    });

    it("adds an edge file to a node file as edges between nodes (flow 7)", async () => {
        const { session } = await projectWith("suppliers.csv", 40);
        const join = await joinScreenFor("ships-to-2024-09.csv");
        assert.strictEqual(valueOf(join, "Rows are"), "Edges");
        assert.include(chips(join), "150 edges added");
        // Replace data names the source it replaces, picked from the Join button's menu.
        await userEvent.click(within(join).getByRole("button", { name: "Join choices" }));
        assert.isDefined(await screen.findByRole("menuitem", { name: "Replace suppliers.csv" }));
        await userEvent.keyboard("{Escape}");
        assert.isNotNull(screen.queryByRole("region", { name: "Join" }), "Esc in the menu closes only the menu");
        await userEvent.click(within(join).getByRole("button", { name: "Join" }));
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, 150);
        });
        assert.strictEqual(session.data.nodes().length, 40);
        assert.strictEqual(session.data.sources()[1]?.kind, "join");
    });
});
