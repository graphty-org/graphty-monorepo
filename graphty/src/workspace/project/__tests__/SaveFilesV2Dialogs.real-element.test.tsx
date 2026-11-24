/**
 * The version 2 Save as, Open and report dialogs on the REAL
 * graphty-element, past the paths SaveFilesV2.real-element.test.tsx walks: a custom choice of
 * sections, nothing chosen and no name; copy or reference for each source; a source on the web that
 * Open asks before fetching and whose Refresh fails; runs rerun or restored; sections written on
 * other data; and a held section file.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { browserProjects, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { openBy } from "../../../test/open";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { clearRecent } from "../recent";

const SAMPLE = "Florentine families";

/** A saved version 2 file, as JSON. */
interface FileJson {
    sections: Record<string, Record<string, unknown>>;
}

/**
 * Renders the app and opens the sample.
 * @returns the store and the session.
 */
async function start(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    const session = await openBy(store, () => pickSample(SAMPLE));
    return { store, session };
}

/**
 * Presses Save as's key and waits until its Save button can be pressed.
 * @param title - the project's name, as the dialog's title names it.
 * @returns the dialog.
 */
async function saveAs(title: string): Promise<HTMLElement> {
    await userEvent.keyboard("{Shift>}{Control>}s{/Control}{/Shift}");
    const dialog = await screen.findByRole("dialog", { name: `Save ${title} as` });
    await within(dialog).findByRole("checkbox", { name: /^Data/ });
    await waitFor(() => {
        assert.isFalse(within(dialog).getByRole<HTMLButtonElement>("button", { name: /^Save/ }).disabled);
    });
    return dialog;
}

/**
 * Picks a file for the next file picker and presses Open's key.
 * @param name - the file's name.
 * @param file - its contents.
 * @param title - the dialog that answers, by its name.
 * @returns that dialog.
 */
async function pressOpen(name: string, file: FileJson | string, title = `Open ${name}`): Promise<HTMLElement> {
    const text = typeof file === "string" ? file : JSON.stringify(file);
    await commands.chooseNextFile(name, "application/json", text);
    await userEvent.keyboard("{Control>}o{/Control}");
    return screen.findByRole("dialog", { name: title });
}

/**
 * Clicks a segment by its words, in the segmented control named so.
 * @param container - where the control is.
 * @param control - the control's name.
 * @param segment - the segment's words.
 */
async function segment(container: HTMLElement, control: string, segment: string): Promise<void> {
    await userEvent.click(within(within(container).getByRole("radiogroup", { name: control })).getByText(segment));
}

/**
 * The checked segment's value in a segmented control.
 * @param container - where the control is.
 * @param control - the control's name.
 * @returns the checked radio's value.
 */
function checkedSegment(container: HTMLElement, control: string): string | undefined {
    const group = within(container).getByRole("radiogroup", { name: control });
    return within(group)
        .getAllByRole<HTMLInputElement>("radio", { hidden: true })
        .find((radio) => radio.checked)?.value;
}

beforeEach(async () => {
    await clearRecent();
    for (const stored of await browserProjects.list()) {
        await browserProjects.remove(stored.id);
    }
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("version 2 Save as, Open and report dialogs", () => {
    it("Save as: a custom choice, a full file again, nothing chosen, no name, and Cancel", async () => {
        await start();
        const dialog = await saveAs(SAMPLE);
        const preset = within(dialog).getByLabelText<HTMLInputElement>("Preset");

        // Leaving one section out matches no preset.
        await userEvent.click(within(dialog).getByRole("checkbox", { name: /^Notes/ }));
        await waitFor(() => {
            assert.strictEqual(preset.value, "");
        });

        // Style only as a section file, then back to a full file: the copy's name follows.
        await userEvent.click(preset);
        await userEvent.click(await screen.findByRole("option", { name: "Style only" }));
        await userEvent.click(within(dialog).getByText("Section file"));
        await within(dialog).findByText(`${SAMPLE}.graphty-style.json`);
        await userEvent.click(within(dialog).getByText("Full file"));
        await within(dialog).findByText(`${SAMPLE}.graphty.json`);

        // Nothing chosen: nothing to save.
        await userEvent.click(within(dialog).getByRole("checkbox", { name: /^Style/ }));
        assert.isTrue(within(dialog).getByRole<HTMLButtonElement>("button", { name: /^Save/ }).disabled);

        // No name: nothing to save either.
        await userEvent.click(within(dialog).getByRole("checkbox", { name: /^Style/ }));
        await userEvent.clear(within(dialog).getByRole("textbox", { name: "Name" }));
        assert.isTrue(within(dialog).getByRole<HTMLButtonElement>("button", { name: /^Save/ }).disabled);

        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
        assert.strictEqual((await browserProjects.list()).length, 0, "Cancel saves nothing");
    });

    it("Save reports work the version 2 file does not keep yet, and only that", async () => {
        const { store, session } = await start();
        const dialog = await saveAs(SAMPLE);
        // The sample as opened leaves nothing out: Save as saves it with no report.
        await userEvent.click(within(dialog).getByRole("button", { name: /^Save/ }));
        await waitFor(() => {
            assert.strictEqual(store.get().notice?.message, `Saved ${SAMPLE} in this browser.`);
            assert.isNull(screen.queryByRole("dialog"));
        });

        // A renamed column is work version 2 files do not hold yet: Save says so.
        const column = session.data.attributes().find((each) => each.kind === "node" && each.name === "name");
        assert.isDefined(column);
        if (column !== undefined) {
            await session.data.renameColumn(column, "family");
        }
        await userEvent.keyboard("{Control>}s{/Control}");
        const report = await screen.findByRole("dialog", { name: `Saved ${SAMPLE}` });
        assert.isNotNull(within(report).getByText("Partly left out"));
        assert.isNull(within(report).queryByText("Moved to view"), "only what the file no longer keeps");
    });

    it("closes Save as and says so when graphty-element cannot say what the project holds", async () => {
        const { store, session } = await start();
        const describe = session.project.describe.bind(session.project);
        vi.spyOn(session.project, "describe").mockImplementation((options) =>
            options === undefined ? Promise.reject(new Error("describe failed")) : describe(options),
        );
        await userEvent.keyboard("{Shift>}{Control>}s{/Control}{/Shift}");
        await waitFor(() => {
            assert.deepEqual(store.get().notice, {
                message: "This project cannot be saved as a version 2 file.",
                error: true,
            });
            assert.isNull(screen.queryByRole("dialog"));
        });
    });

    it("asks before fetching a source on the web, says why its Refresh failed, and can keep it as a reference", async () => {
        const { session } = await start();
        await session.data.import(
            { type: "csv", config: { data: "source,target\nAva,Ben\n" }, name: "web.csv" },
            { mode: "replace" },
        );
        const [source] = (await session.project.describe()).sources.filter((each) => each.kind === "file");
        const { text } = await session.project.save({
            format: 2,
            markSaved: false,
            embed: { [source.id]: "referenced" },
            paths: { [source.id]: "web.csv" },
        });
        // The same source, read from the web instead of a file.
        const file = JSON.parse(text) as FileJson;
        const [saved] = file.sections.data.sources as { origin: Record<string, unknown> }[];
        delete saved.origin.path;
        saved.origin.url = "https://example.invalid/web.csv";

        const open = await pressOpen("web.graphty.json", file);
        assert.isNotNull(within(open).getByText("https://example.invalid/web.csv"));
        assert.isNull(within(open).queryByRole("button", { name: "Locate web.csv" }), "nothing to locate");
        const fetchSwitch = within(open).getByRole<HTMLInputElement>("switch", { name: "Fetch referenced sources" });
        await userEvent.click(fetchSwitch);
        assert.isTrue(fetchSwitch.checked);
        await userEvent.click(fetchSwitch);
        assert.isFalse(fetchSwitch.checked);
        await userEvent.click(within(open).getByRole("button", { name: "Open" }));
        const discard = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
        await userEvent.click(within(discard).getByRole("button", { name: "Discard" }));

        // Not fetched: held until the reader clicks Refresh, which fails here and says why.
        const report = await screen.findByRole("dialog", { name: /^Opened / });
        const line = within(report).getByRole("row", { name: /^web\.csv/ });
        assert.isNotNull(within(line).getByText("Needs permission to fetch"));
        await userEvent.click(within(line).getByRole("button", { name: "Refresh web.csv" }));
        await waitFor(() => {
            const button = within(line).getByRole("button", { name: "Refresh web.csv" });
            assert.isNull(button.closest("[data-loading]"));
            assert.isNull(within(line).queryByText("Needs permission to fetch"));
        });
        assert.isNull(within(line).queryByText("Refreshed"));
        await userEvent.click(within(report).getByRole("button", { name: "Done" }));

        // The reader's own edit is always copied; the web source can be kept as a reference.
        await session.data.addNodes([{ id: "Zed" }]);
        const dialog = await saveAs(SAMPLE);
        // Never fetched, it stays a reference unless the reader copies it.
        assert.strictEqual(checkedSegment(dialog, "Sources"), "reference");
        await segment(dialog, "Sources", "Copy");
        await waitFor(() => {
            assert.strictEqual(checkedSegment(dialog, "Sources"), "copy");
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Each source" }));
        assert.isNotNull(await within(dialog).findByText("Your changes"));
        assert.isNotNull(within(dialog).getByText(/Always copied$/));
        assert.strictEqual(checkedSegment(dialog, "Keep web.csv"), "copy");
        await segment(dialog, "Keep web.csv", "Reference");
        await waitFor(() => {
            assert.strictEqual(checkedSegment(dialog, "Keep web.csv"), "reference");
            assert.strictEqual(checkedSegment(dialog, "Sources"), "reference");
        });
        await segment(dialog, "Keep web.csv", "Copy");
        await waitFor(() => {
            assert.strictEqual(checkedSegment(dialog, "Sources"), "copy");
        });
        await segment(dialog, "Sources", "Reference");
        await waitFor(() => {
            assert.strictEqual(checkedSegment(dialog, "Keep web.csv"), "reference");
        });
    });

    it("lets each run rerun or restore its saved results, and opens as chosen", async () => {
        const { session } = await start();
        await session.runs.start("pagerank");
        const { text } = await session.project.save({ format: 2, markSaved: false, results: true });
        const file = JSON.parse(text) as FileJson;
        // A second run that cannot be replayed, with saved results.
        const { view, results } = file.sections;
        (view.runs as Record<string, unknown>[]).push({ id: "frozen", name: "Frozen run", replayable: false });
        const saved = results.runs as Record<string, unknown>;
        saved.frozen = saved.pagerank;

        const open = await pressOpen("runs.graphty.json", file);
        assert.isNotNull(within(open).getByText("Restores saved results"));
        assert.strictEqual(checkedSegment(open, "On open, pagerank"), "rerun");
        await segment(open, "On open, pagerank", "Restore");
        await waitFor(() => {
            assert.strictEqual(checkedSegment(open, "On open, pagerank"), "restore");
        });
        await segment(open, "On open, pagerank", "Rerun");
        await waitFor(() => {
            assert.strictEqual(checkedSegment(open, "On open, pagerank"), "rerun");
        });
        await segment(open, "On open, pagerank", "Restore");

        // Without the results section there is nothing to restore.
        await userEvent.click(within(open).getByRole("checkbox", { name: /^Results/ }));
        assert.isNotNull(await within(open).findByText("Not run: no saved results"));
        assert.strictEqual(checkedSegment(open, "On open, pagerank"), "rerun");
        await userEvent.click(within(open).getByRole("checkbox", { name: /^Results/ }));
        await waitFor(() => {
            assert.strictEqual(checkedSegment(open, "On open, pagerank"), "restore");
        });

        await userEvent.click(within(open).getByRole("button", { name: "Open" }));
        const discard = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
        await userEvent.click(within(discard).getByRole("button", { name: "Discard" }));
        await waitFor(() => {
            assert.include(
                session.runs.list().map((run) => run.algorithm),
                "pagerank",
            );
        });
    });

    it("offers to bind sections written on other data by key, and Cancel opens nothing", async () => {
        const { session } = await start();
        const { text } = await session.project.save({ format: 2, markSaved: false });
        // The view as written on some other data than the file's own.
        const file = JSON.parse(text) as FileJson;
        file.sections.view.bindsTo = { data: "0".repeat(32) };

        const open = await pressOpen("bound.graphty.json", file);
        assert.isNotNull(await within(open).findByText("Written on other data"));
        const bind = within(open).getByRole<HTMLInputElement>("switch", { name: "Bind to this data by key" });
        await userEvent.click(bind);
        assert.isTrue(bind.checked);

        await userEvent.click(within(open).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
        assert.strictEqual(session.data.nodes().length, 15, "the open data stays");
    });

    it("shows a held section file without letting it be added, and Cancel adds nothing", async () => {
        const { session } = await start();
        const { text } = await session.project.save({
            format: 2,
            sections: ["style"],
            form: "section",
            markSaved: false,
        });
        const file = JSON.parse(text) as Record<string, unknown> & { version?: unknown };
        file.version = 99;
        const layers = session.styles.list().length;

        const add = await pressOpen("new.graphty-style.json", JSON.stringify(file), "Add new.graphty-style.json");
        assert.isNotNull(within(add).getByText("Style: Version 99, newer than this release"));
        assert.isTrue(within(add).getByRole<HTMLButtonElement>("button", { name: "Add style" }).disabled);
        await userEvent.click(within(add).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
        assert.strictEqual(session.styles.list().length, layers);
    });

    it("unpairs a mapped column when its open data column is picked again", async () => {
        const { session } = await start();
        await session.data.import(
            { type: "csv", config: { data: "source,target,weight\nAva,Ben,3\n" }, name: "w.csv" },
            { mode: "replace" },
        );
        await session.styles.add({
            name: "Heavy",
            target: "edge",
            selector: { match: "expression", where: "data.weight > `2`" },
            set: { "edge.color": "#2e7d32" },
        });
        const { text } = await session.project.save({
            format: 2,
            sections: ["style"],
            form: "section",
            markSaved: false,
        });
        await session.data.import(
            { type: "csv", config: { data: "source,target,kg\nAva,Ben,3\n" }, name: "kg.csv" },
            { mode: "replace" },
        );

        const add = await pressOpen("heavy.graphty-style.json", text, "Add heavy.graphty-style.json");
        await userEvent.click(within(add).getByRole("button", { name: "Map columns" }));
        let map = await screen.findByRole("dialog", { name: "Map heavy.graphty-style.json" });
        const pick = async (): Promise<void> => {
            await userEvent.click(within(map).getByLabelText("Open column for weight"));
            await userEvent.click(await screen.findByRole("option", { name: "kg" }));
        };
        await pick();
        await userEvent.click(within(map).getByRole("button", { name: "Back" }));
        let back = await screen.findByRole("dialog", { name: "Add heavy.graphty-style.json" });
        await within(within(back).getByRole("row", { name: /^weight/ })).findByText("Mapped");

        // The mapping step shows the pairing, and picking the same column again unpairs it.
        await userEvent.click(within(back).getByRole("button", { name: "Map columns" }));
        map = await screen.findByRole("dialog", { name: "Map heavy.graphty-style.json" });
        assert.strictEqual(within(map).getByLabelText<HTMLInputElement>("Open column for weight").value, "kg");
        await pick();
        await waitFor(() => {
            assert.strictEqual(within(map).getByLabelText<HTMLInputElement>("Open column for weight").value, "");
        });
        await userEvent.click(within(map).getByRole("button", { name: "Back" }));
        back = await screen.findByRole("dialog", { name: "Add heavy.graphty-style.json" });
        await within(within(back).getByRole("row", { name: /^weight/ })).findByText("Missing");
    });
});
