/**
 * The join screen on the REAL graphty-element (data prototype spec section 3.6, acceptance flows 5
 * and 7): a second file opens it with the element's suggestion; the chips read the element's join
 * report; the count chips narrow the tables; Ignore case, the include boxes and Join act on it; Edit join
 * reopens it; Undo takes a join
 * back in one step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Eleven gauges, read as nodes. */
const GAUGES = [
    "id,station",
    ...Array.from({ length: 11 }, (_, i) => `G${String(i + 1).padStart(2, "0")},S${String(i + 1)}`),
].join("\n");

/** Fifteen flows between gauges: one repeats an earlier row, one ends at G12, a gauge not in the graph. */
const FLOWS = [
    "from,to,km",
    "G06,G01,3.2",
    "G10,G06,2.8",
    "G01,G02,1.9",
    "G02,G03,2.4",
    "G11,G02,1.6",
    "G03,G04,2.1",
    "G04,G05,1.7",
    "G05,G07,2.5",
    "G07,G08,1.9",
    "G08,G09,2.2",
    "G03,G04,2.1",
    "G09,G12,4.0",
    "G11,G03,2.0",
    "G04,G08,3.6",
    "G05,G08,3.1",
].join("\n");

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
 * An empty project on the Data place with a first file loaded.
 * @param first - the first file, or a fixture's name.
 * @param nodes - the nodes it draws.
 * @returns the store and the session.
 */
async function projectWith(
    first: string | File,
    nodes: number,
): Promise<{ store: WorkspaceStore; session: GraphSession }> {
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
    drop(typeof first === "string" ? await fixture(first) : first);
    await waitFor(
        () => {
            assert.strictEqual(live.data.nodes().length, nodes);
        },
        { timeout: TIMEOUT_MS },
    );
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
    return screen.findByRole("region", { name: `Join ${name}` }, { timeout: TIMEOUT_MS });
}

/**
 * The chips' words, one per chip.
 * @param join - the join screen.
 * @returns the words.
 */
function chips(join: HTMLElement): string[] {
    const list = within(join).getByRole("list", { name: "Matches" });
    return [...list.querySelectorAll(":scope > li")].map((li) =>
        (li.textContent ?? "").replace(/^(Node|Edge) /, "").trim(),
    );
}

/**
 * Clicks a count chip as a reader does: on its label (a Chip's checkbox is hidden).
 * @param join - the join screen.
 * @param name - the chip's name.
 */
async function toggle(join: HTMLElement, name: string): Promise<void> {
    const label = within(join).getByRole<HTMLInputElement>("checkbox", { name }).labels?.[0];
    assert.isDefined(label, `${name} has a label`);
    await userEvent.click(label);
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
        assert.deepEqual(chips(join), ["52 matched", "10 not in graph", "8 no value", "1 repeated key"]);
        // The Match row's boxes count the matches they would add, in sentence case.
        within(join).getByRole("checkbox", { name: "Ignore spaces +1" });
        // The section and its button have different names, and the screen is described by its counts.
        assert.lengthOf(within(join).getAllByRole("button", { name: "Join" }), 1);
        const described = join.getAttribute("aria-describedby") ?? "";
        assert.strictEqual(document.getElementById(described), within(join).getByRole("list", { name: "Matches" }));

        // The "not in graph" chip narrows the incoming table to the rows that match nothing, and
        // takes it back; Enter on it does the same.
        const notInGraph = within(join).getByRole("checkbox", { name: "10 not in graph" });
        await toggle(join, "10 not in graph");
        const incoming = within(join).getByRole("grid", { name: "tumor-expression.tsv" });
        await waitFor(() => {
            assert.strictEqual(incoming.querySelectorAll('[role="row"]').length, 17 + 1);
        });
        assert.isTrue(notInGraph.matches(":checked"));
        // Space on the focused chip takes it back, as on the table's "With issues" chip.
        notInGraph.focus();
        await userEvent.keyboard(" ");
        await waitFor(() => {
            assert.isAbove(incoming.querySelectorAll('[role="row"]').length, 17 + 1);
        });

        // The "no value" chip narrows the graph table to its 8 nodes; the "matched" chip takes over.
        const graphGrid = within(within(join).getByLabelText("Graph")).getByRole("grid");
        await toggle(join, "8 no value");
        await waitFor(() => {
            assert.strictEqual(graphGrid.querySelectorAll('[role="row"]').length, 8 + 1);
        });
        await toggle(join, "52 matched");
        await waitFor(() => {
            assert.isFalse(within(join).getByRole("checkbox", { name: "8 no value" }).matches(":checked"));
            assert.strictEqual(graphGrid.getAttribute("aria-rowcount"), String(52 + 1));
            assert.strictEqual(incoming.getAttribute("aria-rowcount"), String(70 - 17 + 1));
        });
        await toggle(join, "52 matched");

        await userEvent.click(within(join).getByRole("checkbox", { name: "Ignore case +6" }));
        await waitFor(() => {
            assert.include(chips(join), "58 matched");
        });
        assert.isTrue(within(join).getByRole("checkbox", { name: "Ignore case" }).matches(":checked"));

        // Leave tissue out: only log2fc and padj are joined.
        await userEvent.click(within(join).getByRole("checkbox", { name: "Include tissue" }));
        await userEvent.click(within(join).getByRole("button", { name: "Join" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: /^Join / }));
        });
        assert.isDefined(session.data.node("TP53")?.log2fc);
        assert.isUndefined(session.data.node("TP53")?.tissue);
        const [joined] = session.data.joins();
        assert.strictEqual(joined.matched, 58);
        // The Sources row names its join ratio with its unit (tier 4 R11).
        await screen.findByText("58 of 70 rows joined");

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
        join = await screen.findByRole("region", { name: "Join tumor-expression.tsv" });
        assert.include(chips(join), "52 matched");
        assert.isNull(within(join).queryByRole("button", { name: "Join choices" }), "an edit only joins");
        await userEvent.click(within(join).getByRole("checkbox", { name: "Ignore case +6" }));
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
        assert.isNotNull(screen.queryByRole("region", { name: /^Join / }));

        within(join).getByRole("button", { name: "Join" }).focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: /^Join / }));
        });
        assert.isNull(store.get().joining);
        assert.deepEqual(session.data.joins(), []);

        const toast = (
            await screen.findByText("Join canceled", { selector: ".cm-toast-message" })
        ).closest<HTMLElement>('[role="group"]');
        assert.isNotNull(toast);
        await userEvent.click(within(toast).getByRole("button", { name: "Undo" }));
        const back = await screen.findByRole("region", { name: /^Join / });
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
        assert.isNotNull(screen.queryByRole("region", { name: /^Join / }), "Esc in the menu closes only the menu");
        await userEvent.click(within(join).getByRole("button", { name: "Join" }));
        await waitFor(
            () => {
                assert.strictEqual(session.data.edges().length, 150);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(session.data.nodes().length, 40);
        assert.strictEqual(session.data.sources()[1]?.kind, "join");
    });

    it("opens from Quick actions > Add data..., the same as the Sources + File...", async () => {
        const { session } = await projectWith(new File([GAUGES], "gauges.csv"), 11);

        // The file input, as where a browser has no File System Access picker.
        vi.stubGlobal("showOpenFilePicker", undefined);
        try {
            await commands.chooseNextFile("flows.csv", "text/csv", FLOWS);
            await userEvent.keyboard("{Control>}k{/Control}");
            await userEvent.click(await screen.findByRole("option", { name: /Add data\.\.\./ }));
            const join = await screen.findByRole("region", { name: "Join flows.csv" }, { timeout: TIMEOUT_MS });
            assert.deepEqual(chips(join), [
                "14 edges added",
                "1 new node",
                "1 not in graph",
                "1 repeated key",
                "1 unknown end",
            ]);
            await userEvent.click(within(join).getByRole("button", { name: "Join" }));
            await waitFor(
                () => {
                    assert.strictEqual(session.data.edges().length, 14);
                },
                { timeout: TIMEOUT_MS },
            );
            assert.strictEqual(session.data.nodes().length, 12, "G12, the unknown end, is added");
            assert.isAbove(session.data.issues().length, 0, "the unknown end is reported");
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("tags each row with what Join does, and decides an unknown end before joining", async () => {
        const { session } = await projectWith(new File([GAUGES], "gauges.csv"), 11);
        drop(new File([FLOWS], "flows.csv"));
        const join = await screen.findByRole("region", { name: "Join flows.csv" }, { timeout: TIMEOUT_MS });
        const incoming = within(join).getByRole("grid", { name: "flows.csv" });
        // The first cell of each drawn row: its tag.
        const tags = (): string[] =>
            [...incoming.querySelectorAll('[role="row"]')]
                .slice(1)
                .map((row) => row.querySelector('[role="rowheader"], [role="gridcell"]')?.textContent?.trim() ?? "");
        await waitFor(() => {
            const now = tags();
            // Row 11 repeats row 6 (G03 to G04); row 12 ends at G12, which the graph lacks.
            assert.strictEqual(now[5], "Edge G03 - G04");
            assert.strictEqual(now[10], "Repeat, not added");
            assert.strictEqual(now[11], "Edge G09 - G12, new node");
        });

        // The new node's chip narrows the file's table to the row that adds it, and takes it back.
        await toggle(join, "1 new node");
        await waitFor(() => {
            assert.deepEqual(tags(), ["Edge G09 - G12, new node"]);
        });
        await toggle(join, "1 new node");
        await toggle(join, "14 edges added");
        await waitFor(() => {
            assert.lengthOf(tags(), 14);
            assert.notInclude(tags(), "Repeat, not added");
        });
        await toggle(join, "14 edges added");

        // Keep both: the repeated row is joined too.
        await userEvent.click(within(join).getByRole("button", { name: "1 repeated key" }));
        const both = await screen.findByRole("menuitem", { name: "Keep both" });
        assert.strictEqual(
            (await screen.findByRole("menuitem", { name: "Keep first" })).getAttribute("aria-checked"),
            "true",
        );
        await userEvent.click(both);
        await waitFor(() => {
            assert.strictEqual(tags()[10], "Edge G03 - G04");
        });
        await waitFor(() => {
            assert.lengthOf(tags(), 15);
        });

        // The unknown end is decided here: leave its row out.
        await userEvent.click(within(join).getByRole("button", { name: "1 unknown end" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Leave those rows out" }));
        await waitFor(() => {
            assert.strictEqual(tags()[11], "Left out");
            assert.notInclude(chips(join), "1 new node");
        });

        // "Join", chosen from the Join choices menu, joins.
        await userEvent.click(within(join).getByRole("button", { name: "Join choices" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Join" }));
        await waitFor(
            () => {
                assert.strictEqual(session.data.edges().length, 14);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(session.data.nodes().length, 11, "G12 was left out, not added");
    });

    it("keeps a joined source row's ratio whole and its name readable", async () => {
        await projectWith(new File([GAUGES], "gauges.csv"), 11);
        drop(new File([FLOWS], "deliveries.csv"));
        const join = await screen.findByRole("region", { name: "Join deliveries.csv" }, { timeout: TIMEOUT_MS });
        await userEvent.click(within(join).getByRole("button", { name: "Join" }));
        const row = await screen.findByRole("listitem", { name: "deliveries.csv" }, { timeout: TIMEOUT_MS });
        await waitFor(() => {
            const ratio = row.querySelector<HTMLElement>(".dp-source-label .dp-quiet");
            const name = row.querySelector<HTMLElement>(".dp-source-name");
            assert.isNotNull(ratio, "the ratio is drawn");
            assert.isNotNull(name);
            if (ratio === null || name === null) {
                return;
            }
            assert.match(ratio.textContent, /^\d+\/15$/);
            assert.isAtMost(ratio.scrollWidth, ratio.clientWidth, "the ratio is whole");
            assert.isAbove(ratio.getBoundingClientRect().width, 0);
            // At least "deliver" of the name shows (about seven characters at 12 px).
            assert.isAtLeast(name.clientWidth, 45, "the name is readable");
        });
    });
});
