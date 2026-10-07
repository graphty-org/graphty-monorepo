/**
 * Export > Data on the REAL graphty-element: what each format cannot hold is written by the app
 * from the losses' codes, never graph-io's or graphty-element's English messages.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, describe, it } from "vitest";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and exporting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Picks a choice from one of the dialog's selects.
 * @param dialog - the Export dialog.
 * @param label - the select's label.
 * @param option - the choice's name.
 */
async function pick(dialog: HTMLElement, label: string, option: string): Promise<void> {
    await userEvent.click(within(dialog).getByLabelText(label, { selector: "input" }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * The warning lines shown once the preview of these options is in, checked against the
 * messages the element itself reports for the same export.
 * @param dialog - the Export dialog.
 * @param element - the element.
 * @param format - the format id.
 * @param options - the writer options the dialog passes.
 * @returns the lines on screen.
 */
async function warningsFor(
    dialog: HTMLElement,
    element: HTMLElement & {
        exportGraph: (format: string, options?: object) => Promise<{ lossNotes: readonly { message: string }[] }>;
    },
    format: string,
    options: object,
): Promise<string[]> {
    const { lossNotes } = await element.exportGraph(format, options);
    assert.isNotEmpty(lossNotes, `${format} reports what it cannot hold`);
    const note = await within(dialog).findByRole("note", {}, { timeout: TIMEOUT_MS });
    const lines = within(note)
        .getAllByRole("listitem")
        .map((item) => item.textContent);
    const text = dialog.textContent;
    for (const { message } of lossNotes) {
        assert.notInclude(text, message, "the element's own sentence never reaches the screen");
    }
    for (const line of lines) {
        assert.notMatch(line, /[`]|\b[WE]_[A-Z_]+\b|\b(results|style)\.[a-z]/, `plain words: ${line}`);
    }
    return lines;
}

describe("Export > Data: what a format cannot hold, in the app's words", () => {
    it(
        "words the warnings for CSV edges and adjacency, GraphML and Graphty JSON from their codes",
        async () => {
            render(<Workspace initialState={{ project: { name: "Les Miserables", id: 1 } }} />);
            let session: GraphSession | undefined;
            await waitFor(
                () => {
                    session = document.querySelector("graphty-element")?.session;
                    assert.isDefined(session);
                },
                { timeout: TIMEOUT_MS },
            );
            if (session === undefined) {
                throw new Error("the element never came up");
            }
            const element = document.querySelector("graphty-element") as unknown as Parameters<typeof warningsFor>[1];
            await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
            await session.runs.start("louvain");

            await userEvent.keyboard("{Control>}e{/Control}");
            const dialog = await screen.findByRole("dialog", { name: "Export" });
            await userEvent.click(within(dialog).getByText("Data"));

            await pick(dialog, "Format", "CSV");
            const edges = await warningsFor(dialog, element, "csv", { table: "edges" });
            assert.include(
                edges,
                "The drawing's colors, sizes and shapes will not come back when this file is opened again.",
            );
            assert.isTrue(
                edges.some((line) => line.startsWith("This table has no room for values about nodes:")),
                `the edge table names what is in the Nodes table: ${edges.join(" | ")}`,
            );
            // Node colors and edge colors say the same thing in words: one line, not two.
            assert.equal(new Set(edges).size, edges.length);

            await pick(dialog, "Table", "Adjacency List");
            // The adjacency table has no header row: the preview starts with a node, not "source".
            await waitFor(
                () =>
                    assert.notInclude(
                        within(dialog).getByLabelText("Preview of the exported data").textContent,
                        "source",
                    ),
                { timeout: TIMEOUT_MS },
            );
            await warningsFor(dialog, element, "csv", { table: "adjacency" });

            await pick(dialog, "Format", "GraphML");
            await warningsFor(dialog, element, "graphml", {});

            await pick(dialog, "Format", "Graphty JSON");
            const { lossNotes } = await element.exportGraph("graphty", {});
            for (const { message } of lossNotes) {
                assert.notInclude(dialog.textContent, message);
            }
        },
        TIMEOUT_MS * 3,
    );
});
