/**
 * Export > Data on the REAL graphty-element: the preview, the format settings, refusals, and what each
 * format cannot hold, written by the app from the losses' codes, never graph-io's or graphty-element's English messages.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { FormatId } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

// Styles from files are an experiment: these tests switch it on.
withFeatures(["file-styles"]);

/** The real element, as the page registers it. */
type PageElement = HTMLElementTagNameMap["graphty-element"];

/**
 * Picks a choice from one of the dialog's selects.
 * @param dialog - the Export dialog.
 * @param label - the select's label.
 * @param option - the choice's name.
 */
async function pick(dialog: HTMLElement, label: string, option: string | RegExp): Promise<void> {
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
    element: PageElement,
    format: FormatId,
    options: Parameters<PageElement["exportGraph"]>[1],
): Promise<string[]> {
    const { lossNotes } = await element.exportGraph(format, options);
    assert.isNotEmpty(lossNotes, `${format} reports what it cannot hold`);
    const note = await within(dialog).findByRole("note", {});
    // The rows sit behind the one-line summary's Details (R14).
    const details = within(note).getByRole("button", { name: "Details" });
    if (details.getAttribute("aria-expanded") !== "true") {
        await userEvent.click(details);
    }
    // Each row's words; its column and count chips name the file's own columns.
    const lines = within(note)
        .getAllByRole("listitem")
        .map((item) => item.querySelector("span")?.textContent ?? "");
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
    it("words the warnings for CSV edges and adjacency, GraphML and Graphty JSON from their codes", async () => {
        render(<Workspace initialState={{ project: { name: "Les Miserables", id: 1 } }} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("the element never came up");
        }
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.runs.start("louvain");

        await userEvent.keyboard("{Control>}e{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        await userEvent.click(within(dialog).getByText("Data"));

        await pick(dialog, "Format", "CSV");
        await pick(dialog, "Table", "Edges");
        const edges = await warningsFor(dialog, element, "csv", { table: "edges" });
        // CSV holds no styles, so it offers no Include styles and says the layers are not
        // written. The data prototype's compact rows: a few words, the columns and counts as chips.
        assert.include(edges, "Style layers not written");
        assert.include(
            edges,
            "Nodes table only",
            `the edge table names what is in the Nodes table: ${edges.join(" | ")}`,
        );
        // Node colors and edge colors say the same thing in words: one line, not two.
        assert.equal(new Set(edges).size, edges.length);

        await pick(dialog, "Table", "Adjacency List");
        // The adjacency table has no header row: the preview starts with a node, not "source".
        await waitFor(() =>
            assert.notInclude(within(dialog).getByLabelText("Preview of the exported data").textContent, "source"),
        );
        await warningsFor(dialog, element, "csv", { table: "adjacency" });

        await pick(dialog, "Format", /^GraphML/);
        await warningsFor(dialog, element, "graphml", {});

        await pick(dialog, "Format", "Graphty JSON");
        const { lossNotes } = await element.exportGraph("graphty", {});
        for (const { message } of lossNotes) {
            assert.notInclude(dialog.textContent, message);
        }
    });
});

/**
 * Renders the workspace, loads a graph into the real element and opens Export > Data.
 * @param load - loads the graph through the element's session.
 * @returns the Export dialog and the element.
 */
async function openData(
    load: (session: GraphSession) => Promise<unknown>,
): Promise<{ dialog: HTMLElement; element: PageElement }> {
    render(<Workspace initialState={{ project: { name: "Les Miserables", id: 1 } }} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    const element = document.querySelector("graphty-element");
    if (session === undefined || element === null) {
        throw new Error("the element never came up");
    }
    await load(session);
    await userEvent.keyboard("{Control>}e{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Export" });
    await userEvent.click(within(dialog).getByText("Data"));
    return { dialog, element };
}

/**
 * The preview's text once it is written.
 * @param dialog - the Export dialog.
 * @returns the preview's lines.
 */
async function previewLines(dialog: HTMLElement): Promise<string[]> {
    const preview = within(dialog).getByLabelText("Preview of the exported data");
    await waitFor(() => {
        assert.notEqual(preview.textContent, "Writing the preview...");
    });
    return (preview.textContent ?? "").split("\n");
}

describe("Export > Data on the real element: preview, settings and refusals", () => {
    const lesMis = (session: GraphSession): Promise<unknown> =>
        session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });

    it("previews the file's first six lines", async () => {
        const { dialog } = await openData(lesMis);
        await pick(dialog, "Format", "Gephi CSV");
        await pick(dialog, "Table", "Edges");
        const lines = await previewLines(dialog);
        assert.lengthOf(lines, 6, lines.join(" | "));
        assert.match(lines[0] ?? "", /^Source,Target,Type\b/);
    });

    it("keeps the advanced options behind the Format row's settings and previews with what the reader sets", async () => {
        const { dialog } = await openData(lesMis);
        await pick(dialog, "Format", "Gephi CSV");
        await pick(dialog, "Table", "Edges");
        assert.match((await previewLines(dialog))[0] ?? "", /^Source,Target,Type\b/);

        assert.isNull(within(dialog).queryByLabelText("Column separator"));
        const settings = within(dialog).getByRole("button", { name: /^Format settings/ });
        const format = within(dialog).getByRole("combobox", { name: "Format" }).getBoundingClientRect();
        const gear = settings.getBoundingClientRect();
        assert.isAtLeast(gear.left, format.right, "at the end of the Format row");
        assert.isAtMost(gear.top, format.bottom, "on the Format row");
        await userEvent.click(settings);
        const panel = await screen.findByRole("dialog", { name: "Format settings" });
        const separator = within(panel).getByLabelText("Column separator");
        assert.equal((separator as HTMLInputElement).placeholder, ",");
        await userEvent.type(separator, ";");
        const preview = within(dialog).getByLabelText("Preview of the exported data");
        await waitFor(() => {
            const header = preview.textContent?.split("\n")[0] ?? "";
            assert.match(header, /^Source;Target;Type\b/);
            assert.notInclude(header, ",");
        });
    });

    it("draws no settings button for a row with no options", async () => {
        const { dialog } = await openData(lesMis);
        await pick(dialog, "Format", "Graphty JSON");
        await previewLines(dialog);
        assert.isNull(within(dialog).queryByRole("button", { name: /^Format settings/ }));
    });

    it("says a file the format refuses is not written, in the app's words", async () => {
        const quoted = JSON.stringify({
            nodes: [
                { id: "a", label: 'say "hi"' },
                { id: "b", label: "plain" },
            ],
            edges: [{ source: "a", target: "b" }],
        });
        const { dialog, element } = await openData((session) =>
            session.data.import({ type: "json", name: "quoted.json", config: { data: quoted } }),
        );
        await pick(dialog, "Format", /^Pajek/);
        // Without styles the label is written as a Pajek vertex label, which cannot hold a double quote.
        const styles = within(dialog).getByRole("checkbox", { name: "Include styles" });
        assert.isTrue((styles as HTMLInputElement).checked);
        await userEvent.click(styles);
        const alert = await within(dialog).findByRole("alert");
        assert.include(alert.textContent, "Not written");
        const { losses, lossNotes } = await element.exportGraph("pajek", {});
        assert.isTrue(
            losses.some((loss) => loss.code.startsWith("E_")),
            "the element refuses a label with a double quote",
        );
        for (const { message } of lossNotes) {
            assert.notInclude(alert.textContent, message, "the element's own sentence never reaches the screen");
        }
    });
});
