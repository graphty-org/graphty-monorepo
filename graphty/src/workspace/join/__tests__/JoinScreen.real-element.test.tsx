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

import { withoutFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// A second source opens the join screen only with sources and steps off: on, it is staged.
withoutFeatures(["source-steps"]);

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
    drop(typeof first === "string" ? await fixture(first) : first);
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
    return screen.findByRole("region", { name: `Join ${name}` });
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
        assert.deepEqual(chips(join), [
            "52 matched",
            "10 not in graph",
            "Leave those rows out",
            "8 no value",
            "1 repeated key",
        ]);
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

        await userEvent.click(page.elementLocator(join).getByRole("checkbox", { name: "Ignore case +6", exact: true }));
        await waitFor(() => {
            assert.include(chips(join), "58 matched");
        });
        assert.isTrue(within(join).getByRole("checkbox", { name: "Ignore case" }).matches(":checked"));

        // Leave tissue out: only log2fc and padj are joined.
        await userEvent.click(page.elementLocator(join).getByRole("checkbox", { name: "Include tissue", exact: true }));
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join", exact: true }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: /^Join / }));
        });
        assert.isDefined(session.data.node("TP53")?.log2fc);
        assert.isUndefined(session.data.node("TP53")?.tissue);
        const [joined] = session.data.joins();
        assert.strictEqual(joined.matched, 58);
        // The sidebar says nothing of the join; the joined table's details name its match (tier 4 R11).
        const entry = await screen.findByRole("listitem", { name: "tumor-expression.tsv" });
        const header = entry.querySelector<HTMLElement>("[data-testid=control-section-toggle]");
        assert.isNotNull(header);
        if (header !== null) {
            await userEvent.click(page.elementLocator(entry).getByCss("[data-testid=control-section-toggle]").first());
        }
        const details = await screen.findByRole("complementary", { name: "Inspector" });
        assert.strictEqual((await within(details).findByText("Nodes matched")).nextElementSibling?.textContent, "58");
        assert.strictEqual(within(details).getByText("Table rows").nextElementSibling?.textContent, "70");
        assert.notMatch(entry.textContent, /matched|joined/);

        // The header's Undo names the step it undoes ("Undo joining ...").
        await userEvent.click(
            page.getByRole("banner", { name: "Project", exact: true }).getByRole("button", { name: /^Undo/ }),
        );
        await waitFor(() => {
            assert.deepEqual(session.data.joins(), []);
        });
        assert.isUndefined(session.data.node("TP53")?.log2fc);
    });

    it("edits a join from its source row, counted against the graph without it", async () => {
        const { session } = await projectWith("tp53-interactions.tsv", 60);
        let join = await joinScreenFor("tumor-expression.tsv");
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join", exact: true }));
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });

        const row = await screen.findByRole("listitem", { name: "tumor-expression.tsv" });
        await userEvent.hover(page.getByRole("listitem", { name: "tumor-expression.tsv", exact: true }));
        await userEvent.click(
            page.elementLocator(row).getByRole("button", { name: "tumor-expression.tsv menu", exact: true }),
        );
        await userEvent.click(page.getByRole("menuitem", { name: "Edit join", exact: true }));
        join = await screen.findByRole("region", { name: "Join tumor-expression.tsv" });
        assert.include(chips(join), "52 matched");
        assert.isNull(within(join).queryByRole("button", { name: "Join choices" }), "an edit only joins");
        await userEvent.click(page.elementLocator(join).getByRole("checkbox", { name: "Ignore case +6", exact: true }));
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join", exact: true }));
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
        await userEvent.click(page.elementLocator(toast).getByRole("button", { name: "Undo", exact: true }));
        const back = await screen.findByRole("region", { name: /^Join / });
        assert.include(chips(back), "52 matched");
        await userEvent.click(page.elementLocator(back).getByRole("button", { name: "Join", exact: true }));
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
    });

    it("keeps Ignore on the repeated key in the join, and Include in the header menu", async () => {
        const { session } = await projectWith("tp53-interactions.tsv", 60);
        const join = await joinScreenFor("tumor-expression.tsv");
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "1 repeated key", exact: true }));
        await userEvent.click(page.getByRole("menuitem", { name: "Ignore", exact: true }));
        await waitFor(() => {
            assert.notInclude(chips(join), "1 repeated key");
        });

        // The header menu's Include is the include box, from the keyboard.
        const tissue = within(join).getByRole("button", { name: /^tissue/ });
        tissue.focus();
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        const include = await screen.findByRole("menuitem", { name: "Include" });
        assert.strictEqual(include.getAttribute("aria-checked"), "true");
        await userEvent.click(page.getByRole("menuitem", { name: "Include", exact: true }));
        await waitFor(() => {
            assert.isFalse(within(join).getByRole<HTMLInputElement>("checkbox", { name: "Include tissue" }).checked);
        });

        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join", exact: true }));
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
        assert.include(session.data.joins()[0]?.choices.ignore ?? [], "repeatedKeys");
        assert.isUndefined(session.data.node("TP53")?.tissue);
    });

    it("edits the Match row: a second key pair and its removal, Ignore spaces, and what the rows are", async () => {
        await projectWith("tp53-interactions.tsv", 60);
        const join = await joinScreenFor("tumor-expression.tsv");

        // + adds a key pair on the first column no pair uses yet, matched against the node id.
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Add key pair", exact: true }));
        await waitFor(() => {
            assert.strictEqual(valueOf(join, "Match 2 column"), "log2fc");
        });
        assert.strictEqual(valueOf(join, "Match 2 graph value"), "Id");
        await userEvent.click(page.elementLocator(join).getByRole("combobox", { name: "Match 2 column", exact: true }));
        await userEvent.click(page.getByRole("option", { name: "tissue", exact: true }));
        await waitFor(() => {
            assert.strictEqual(valueOf(join, "Match 2 column"), "tissue");
        });
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Remove Match 2", exact: true }));
        await waitFor(() => {
            assert.isNull(within(join).queryByLabelText("Match 2 column"));
        });
        assert.strictEqual(valueOf(join, "Match column"), "symbol");

        await userEvent.click(
            page.elementLocator(join).getByRole("checkbox", { name: "Ignore spaces +1", exact: true }),
        );
        await waitFor(() => {
            assert.isTrue(within(join).getByRole("checkbox", { name: "Ignore spaces" }).matches(":checked"));
        });

        // Edges take a Source and a Target pair, and no + for another pair.
        await userEvent.click(page.elementLocator(join).getByRole("combobox", { name: "Rows are", exact: true }));
        await userEvent.click(page.getByRole("option", { name: "Edges", exact: true }));
        await waitFor(() => {
            assert.isDefined(within(join).getByLabelText("Source column"));
        });
        assert.isDefined(within(join).getByLabelText("Target column"));
        assert.isNull(within(join).queryByRole("button", { name: "Add key pair" }));

        await userEvent.click(page.elementLocator(join).getByRole("combobox", { name: "Rows are", exact: true }));
        await userEvent.click(page.getByRole("option", { name: "Node values", exact: true }));
        await waitFor(() => {
            assert.isDefined(within(join).getByLabelText("Match column"));
        });
        assert.isNull(within(join).queryByLabelText("Source column"));
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
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join choices", exact: true }));
        assert.isDefined(await screen.findByRole("menuitem", { name: "Replace suppliers.csv" }));
        await userEvent.keyboard("{Escape}");
        assert.isNotNull(screen.queryByRole("region", { name: /^Join / }), "Esc in the menu closes only the menu");
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join", exact: true }));
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, 150);
        });
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
            await userEvent.click(page.getByRole("option", { name: /Add data\.\.\./ }));
            const join = await screen.findByRole("region", { name: "Join flows.csv" });
            assert.deepEqual(chips(join), [
                "14 edges added",
                "1 new node",
                "1 not in graph",
                "1 repeated key",
                "1 unknown end",
            ]);
            await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join", exact: true }));
            await waitFor(() => {
                assert.strictEqual(session.data.edges().length, 14);
            });
            assert.strictEqual(session.data.nodes().length, 12, "G12, the unknown end, is added");
            assert.isAbove(session.data.issues().length, 0, "the unknown end is reported");
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("joins a picked table's columns onto nodes by the key the reader chooses, and counts the rows that match nothing", async () => {
        const { session } = await projectWith(new File([GAUGES], "gauges.csv"), 11);
        // site matches the nodes' station on six rows, gauge their id on five: the reader keys on gauge.
        const DEPTHS = [
            "site,gauge,depth",
            "S1,G01,1.5",
            "S2,G02,2.5",
            "S3,G03,3.5",
            "S4,G04,4.5",
            "S5,G05,5.5",
            "S6,G99,9.5",
        ];
        vi.stubGlobal("showOpenFilePicker", undefined);
        try {
            await commands.chooseNextFile("depths.csv", "text/csv", DEPTHS.join("\n"));
            await userEvent.keyboard("{Control>}k{/Control}");
            await userEvent.click(page.getByRole("option", { name: /Add data\.\.\./ }));
            const join = await screen.findByRole("region", { name: "Join depths.csv" });

            await userEvent.click(
                page.elementLocator(join).getByRole("combobox", { name: "Match column", exact: true }),
            );
            await userEvent.click(page.getByRole("option", { name: "gauge", exact: true }));
            await userEvent.click(
                page.elementLocator(join).getByRole("combobox", { name: "Match graph value", exact: true }),
            );
            await userEvent.click(page.getByRole("option", { name: "Id", exact: true }));
            await waitFor(() => {
                assert.strictEqual(valueOf(join, "Match column"), "gauge");
                assert.strictEqual(valueOf(join, "Match graph value"), "Id");
                assert.includeMembers(chips(join), ["5 matched", "1 not in graph"]);
            });

            await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join", exact: true }));
            await waitFor(() => {
                assert.strictEqual(String(session.data.node("G03")?.depth), "3.5");
            });
            assert.isUndefined(session.data.node("G06")?.depth, "a node without a row gets no value");
            assert.isUndefined(session.data.node("G99"), "a row that matches nothing adds no node");
            const [joined] = session.data.joins();
            assert.strictEqual(joined.matched, 5);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("tags each row with what Join does, and decides an unknown end before joining", async () => {
        const { session } = await projectWith(new File([GAUGES], "gauges.csv"), 11);
        drop(new File([FLOWS], "flows.csv"));
        const join = await screen.findByRole("region", { name: "Join flows.csv" });
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
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "1 repeated key", exact: true }));
        await screen.findByRole("menuitem", { name: "Keep both" });
        assert.strictEqual(
            (await screen.findByRole("menuitem", { name: "Keep first" })).getAttribute("aria-checked"),
            "true",
        );
        await userEvent.click(page.getByRole("menuitem", { name: "Keep both", exact: true }));
        await waitFor(() => {
            assert.strictEqual(tags()[10], "Edge G03 - G04");
        });
        await waitFor(() => {
            assert.lengthOf(tags(), 15);
        });

        // The unknown end is decided here: leave its row out.
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "1 unknown end", exact: true }));
        await userEvent.click(page.getByRole("menuitem", { name: "Leave those rows out", exact: true }));
        await waitFor(() => {
            assert.strictEqual(tags()[11], "Left out");
            assert.notInclude(chips(join), "1 new node");
        });

        // "Join", chosen from the Join choices menu, joins.
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join choices", exact: true }));
        await userEvent.click(page.getByRole("menuitem", { name: "Join", exact: true }));
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, 14);
        });
        assert.strictEqual(session.data.nodes().length, 11, "G12 was left out, not added");
    });

    it("keeps a joined source's name readable, with no join words in its entry", async () => {
        await projectWith(new File([GAUGES], "gauges.csv"), 11);
        drop(new File([FLOWS], "deliveries.csv"));
        const join = await screen.findByRole("region", { name: "Join deliveries.csv" });
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join", exact: true }));
        const row = await screen.findByRole("listitem", { name: "deliveries.csv" });
        const name = row.querySelector<HTMLElement>("[data-testid=control-section-name]");
        // At least "deliver" of the name shows (about seven characters at 12 px).
        assert.isAtLeast(name?.clientWidth ?? 0, 45, "the name is readable");
        assert.notMatch(row.textContent, /matched|joined/);
    });
});

describe("every kind of joining, from the sample files", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    /**
     * Presses Join and waits for the screen to close.
     * @param join - the join screen.
     */
    async function pressJoin(join: HTMLElement): Promise<void> {
        await userEvent.click(page.elementLocator(join).getByRole("button", { name: "Join", exact: true }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: /^Join / }));
        });
    }

    it("writes contract values onto September's edges by their two ends", async () => {
        const { session } = await projectWith("suppliers.csv", 40);
        await pressJoin(await joinScreenFor("ships-to-2024-09.csv"));
        const join = await joinScreenFor("contracts-2024-09.csv");
        assert.strictEqual(valueOf(join, "Rows are"), "Edge values");
        assert.strictEqual(valueOf(join, "Match graph value"), "Source");
        assert.strictEqual(valueOf(join, "Match 2 graph value"), "Target");
        assert.deepEqual(chips(join).slice(0, 3), ["140 matched", "3 not in graph", "10 no value"]);
        await pressJoin(join);
        await waitFor(() => {
            const valued = session.data.edges().filter((edge) => "contract_value" in edge);
            assert.lengthOf(valued, 140);
        });
        assert.lengthOf(session.data.edges(), 150);
    });

    it("merges a second supplier list, adding the rows the graph lacks, and Undo takes them back", async () => {
        const { session } = await projectWith("suppliers.csv", 40);
        const join = await joinScreenFor("suppliers-erp.csv");
        assert.strictEqual(valueOf(join, "Rows are"), "Node values");
        await userEvent.click(
            page.elementLocator(join).getByRole("button", { name: "Leave those rows out", exact: true }),
        );
        await userEvent.click(page.getByRole("menuitem", { name: "Add as new nodes", exact: true }));
        await pressJoin(join);
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().length, 43);
        });
        assert.strictEqual(session.data.node("s41")?.rating !== undefined, true);
        await userEvent.click(
            page.getByRole("banner", { name: "Project", exact: true }).getByRole("button", { name: /^Undo/ }),
        );
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().length, 40);
        });
    });

    it("joins people to buildings through door entries, and names each file's kind of node", async () => {
        const { session } = await projectWith("people.csv", 24);
        const buildings = await joinScreenFor("buildings.csv");
        assert.isNotNull(within(buildings).getByRole("button", { name: "Add as rows" }));
        // The preview says nothing is left out: every row is added.
        await within(buildings).findByText("b1");
        assert.isNull(within(buildings).queryByText("Left out"));
        await userEvent.click(page.elementLocator(buildings).getByRole("button", { name: "Add as rows", exact: true }));
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().length, 30);
        });
        const entries = await joinScreenFor("door-entries.csv");
        assert.strictEqual(valueOf(entries, "Rows are"), "Edges");
        assert.strictEqual(valueOf(entries, "Source column"), "person_id");
        assert.strictEqual(valueOf(entries, "Target column"), "building_id");
        await pressJoin(entries);
        await waitFor(() => {
            assert.isAbove(session.data.edges().length, 100);
        });
        assert.isTrue(
            session.data
                .edges()
                .every((edge) => String(edge.source).startsWith("p") && String(edge.target).startsWith("b")),
        );

        const place = screen.getByRole("region", { name: "Data place" });
        for (const [row, node, kind] of [
            ["people.csv", "p01", "people"],
            ["buildings.csv", "b1", "buildings"],
        ] as const) {
            // Every source's entry opens by itself: the button is this one's.
            await userEvent.click(
                page.elementLocator(place).getByRole("listitem", { name: row, exact: true }).getByRole("button").nth(0),
            );
            await userEvent.click(
                page
                    .elementLocator(place)
                    .getByRole("listitem", { name: row, exact: true })
                    .getByRole("button", { name: "Add to node attributes", exact: true }),
            );
            // The file's name is the only kind offered: Kind of node is added with it.
            await userEvent.click(page.getByRole("menuitem", { name: "Kind of node", exact: true }));
            await waitFor(() => {
                assert.strictEqual(session.data.node(node)?.kind, kind);
            });
        }
    });

    it("adds October after September from the join screen, which opens on Replace", async () => {
        const { session } = await projectWith("ships-to-2024-09.csv", 40);
        const october = await joinScreenFor("ships-to-2024-10.csv");
        within(october).getByRole("button", { name: "Replace ships-to-2024-09.csv" });
        await userEvent.click(page.elementLocator(october).getByRole("button", { name: "Join choices", exact: true }));
        await userEvent.click(page.getByRole("menuitem", { name: "Add as rows", exact: true }));
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, 309);
        });
    });

    it("still replaces September with October from the same screen", async () => {
        const { session } = await projectWith("ships-to-2024-09.csv", 40);
        const october = await joinScreenFor("ships-to-2024-10.csv");
        await userEvent.click(
            page.elementLocator(october).getByRole("button", { name: "Replace ships-to-2024-09.csv", exact: true }),
        );
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, 159);
        });
    });
});
