/**
 * Version 2 save files (the "save-files-v2" experiment) on the REAL graphty-element: Save as asks
 * for a preset, sections, copy or reference and the file's form; the whole project is kept in this
 * browser and every other choice downloads as a copy; opening a version 2 file asks which sections
 * to load first, warns of a held section, and holds a referenced source that changed until the
 * reader clicks Refresh. With the
 * experiment off, Save as is the name-only dialog it was.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { browserProjects, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { watchDownloads } from "../../../test/downloads";
import { withFeatures } from "../../../test/features";
import { openBy } from "../../../test/open";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { clearRecent } from "../recent";

const SAMPLE = "Florentine families";

/**
 * Opens the sample from an empty app.
 * @returns the store and the session.
 */
async function openSample(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    const session = await openBy(store, () => pickSample(SAMPLE));
    return { store, session };
}

/**
 * Opens Save as with its key and waits for what the element says a save would write.
 * @returns the dialog.
 */
async function openSaveAs(): Promise<HTMLElement> {
    await userEvent.keyboard("{Shift>}{Control>}s{/Control}{/Shift}");
    const dialog = await screen.findByRole("dialog", { name: `Save ${SAMPLE} as` });
    await within(dialog).findByRole("checkbox", { name: /^Data/ });
    // Save waits for graphty-element to say whether the choice is the project or a copy.
    await waitFor(() => {
        assert.isFalse(within(dialog).getByRole<HTMLButtonElement>("button", { name: /^Save/ }).disabled);
    });
    return dialog;
}

/**
 * Picks a preset in Save as.
 * @param dialog - the dialog.
 * @param preset - the preset's name.
 */
async function choosePreset(dialog: HTMLElement, preset: string): Promise<void> {
    await userEvent.click(within(dialog).getByLabelText("Preset"));
    await userEvent.click(await screen.findByRole("option", { name: preset }));
}

/**
 * The sections a downloaded full file holds.
 * @param blob - the file.
 * @returns the section keys.
 */
async function sectionsOf(blob: Blob): Promise<string[]> {
    return Object.keys((JSON.parse(await blob.text()) as { sections: Record<string, unknown> }).sections);
}

/**
 * Feeds a file to the next file picker and opens it with Open's key.
 * @param name - the file's name.
 * @param text - its contents.
 * @returns the Open dialog.
 */
async function openFile(name: string, text: string): Promise<HTMLElement> {
    await commands.chooseNextFile(name, "application/json", text);
    await userEvent.keyboard("{Control>}o{/Control}");
    return screen.findByRole("dialog", { name: `Open ${name}` });
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

describe("version 2 save files, experiment on", () => {
    withFeatures(["save-files-v2"]);

    it("saves with each preset: the whole project in this browser, the rest as copies that reopen", async () => {
        const downloads = watchDownloads();
        const { store, session } = await openSample();
        let dialog = await openSaveAs();
        // What each section holds, from the element's counts.
        assert.isNotNull(within(dialog).getByText(/15 nodes/));

        // Everything: the whole project, kept in this browser as a version 2 file.
        assert.strictEqual(within(dialog).getByLabelText<HTMLInputElement>("Preset").value, "Everything");
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, `Saved ${SAMPLE} in this browser.`);
        });
        const [stored] = await browserProjects.list();
        assert.include(stored.report?.written ?? [], "results");
        assert.isFalse(session.project.dirty);
        const file = await browserProjects.get(stored.id);
        assert.strictEqual((JSON.parse((await file?.text()) ?? "{}") as { version?: number }).version, 2);
        store.set({ dialog: null });

        // Each other preset downloads a copy holding exactly its sections.
        const presets: [string, string[]][] = [
            ["Share without notes", ["data", "style", "recipe", "settings", "view"]],
            ["Starting kit", ["style", "recipe", "settings"]],
            ["Record", ["data", "recipe", "results", "view"]],
        ];
        for (const [preset, sections] of presets) {
            dialog = await openSaveAs();
            await choosePreset(dialog, preset);
            await userEvent.click(await within(dialog).findByRole("button", { name: "Save copy" }));
            await waitFor(() => {
                assert.equal(downloads.at(-1)?.name, `${SAMPLE}.graphty.json`);
            });
            assert.deepEqual(await sectionsOf(downloads[downloads.length - 1].blob), sections, preset);
            downloads.length = 0;
            store.set({ dialog: null });
        }

        // Style only, as a section file named by its section.
        dialog = await openSaveAs();
        await choosePreset(dialog, "Style only");
        // The segment's label is what a reader clicks; its radio is drawn under it.
        await userEvent.click(within(dialog).getByText("Section file"));
        assert.isNotNull(await within(dialog).findByText(`${SAMPLE}.graphty-style.json`));
        await userEvent.click(await within(dialog).findByRole("button", { name: "Save copy" }));
        await waitFor(() => {
            assert.equal(downloads.at(-1)?.name, `${SAMPLE}.graphty-style.json`);
        });
        const style = await downloads[0].blob.text();
        assert.strictEqual((JSON.parse(style) as { kind: string }).kind, "graphty-style");
        assert.isFalse(session.project.dirty, "a copy changes nothing saved");
        store.set({ dialog: null });

        // The style file is added through its preview: what it is and what it adds.
        const layers = session.styles.list().length;
        await commands.chooseNextFile(`${SAMPLE}.graphty-style.json`, "application/json", style);
        await userEvent.keyboard("{Control>}o{/Control}");
        const add = await screen.findByRole("dialog", { name: `Add ${SAMPLE}.graphty-style.json` });
        assert.isNotNull(within(add).getByRole("row", { name: /^Adds \d+ layers?/ }));
        assert.isNull(within(add).queryByRole("checkbox"));
        await userEvent.click(within(add).getByRole("button", { name: "Add style" }));
        await waitFor(() => {
            assert.isAbove(session.styles.list().length, layers);
        });
    });

    it("downloads a version 2 local copy, and reopens the project kept in this browser whole", async () => {
        const downloads = watchDownloads();
        const { store } = await openSample();
        const dialog = await openSaveAs();
        assert.isNotNull(within(dialog).getByText("Sources"));
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, `Saved ${SAMPLE} in this browser.`);
        });
        store.set({ dialog: null });

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Save local copy..." }));
        await waitFor(() => {
            assert.equal(downloads.at(-1)?.name, `${SAMPLE}.graphty.json`);
        });
        const copy = JSON.parse(await downloads[0].blob.text()) as { version?: number; sections?: object };
        assert.strictEqual(copy.version, 2);
        assert.includeMembers(Object.keys(copy.sections ?? {}), ["data", "style", "recipe", "settings", "view"]);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
        store.set({ notice: null });
        await userEvent.click(await screen.findByRole("gridcell", { name: new RegExp(`^${SAMPLE}`) }));
        await waitFor(() => {
            assert.equal(store.get().notice?.message, `Opened ${SAMPLE}`);
        });
        assert.notMatch(store.get().notice?.message ?? "", /did not come back/);
    });

    it("warns of a held section before opening, and reports it kept", async () => {
        const { store, session } = await openSample();
        const { text } = await session.project.save({ format: 2, markSaved: false });
        const file = JSON.parse(text) as { sections: Record<string, Record<string, unknown>> };
        file.sections.style.version = 99;

        const open = await openFile("held.graphty.json", JSON.stringify(file));
        assert.isNotNull(within(open).getByText("Style: Version 99, newer than this release"));
        assert.isNotNull(within(open).getByText("Held"));
        assert.isFalse(
            within(open).getByRole<HTMLInputElement>("checkbox", { name: /^Style/ }).checked,
            "a held section starts unticked",
        );
        assert.isTrue(within(open).getByRole<HTMLInputElement>("checkbox", { name: /^Data/ }).checked);
        await userEvent.click(within(open).getByRole("checkbox", { name: /^Style/ }));
        await userEvent.click(within(open).getByRole("button", { name: "Open" }));

        const report = await screen.findByRole("dialog", { name: /^Opened / });
        const kept = within(report)
            .getAllByRole("row", { name: /^Style/ })
            .filter((row) => within(row).queryByText("Kept as opened") !== null);
        assert.lengthOf(kept, 1);
        await userEvent.click(within(report).getByRole("button", { name: "Done" }));
        assert.isNull(store.get().dialog);
        assert.strictEqual(session.data.nodes().length, 15);
    });

    it("holds a located file that changed since the save, and builds it when the reader clicks Refresh", async () => {
        const { store, session } = await openSample();
        await session.data.import(
            { type: "csv", config: { data: "source,target\nAva,Ben\n" }, name: "friends.csv" },
            { mode: "replace" },
        );
        const [source] = (await session.project.describe()).sources.filter((each) => each.kind === "file");
        const { text } = await session.project.save({
            format: 2,
            markSaved: false,
            embed: { [source.id]: "referenced" },
            paths: { [source.id]: "friends.csv" },
        });

        const open = await openFile("friends.graphty.json", text);
        await commands.chooseNextFile("friends-new.csv", "text/csv", "source,target\nAva,Ben\nBen,Cara\n");
        await userEvent.click(within(open).getByRole("button", { name: "Locate friends.csv" }));
        await within(open).findByText("friends-new.csv");
        await userEvent.click(within(open).getByRole("button", { name: "Open" }));
        const discard = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
        await userEvent.click(within(discard).getByRole("button", { name: "Discard" }));

        const report = await screen.findByRole("dialog", { name: /^Opened / });
        const row = within(report).getByRole("row", { name: /^friends\.csv/ });
        assert.isNotNull(within(row).getByText("Held"));
        assert.isNotNull(within(row).getByText("Changed since saved"));
        assert.strictEqual(session.data.nodes().length, 0, "held: built without it until Refresh");
        assert.match(store.get().notice?.message ?? "", /^Opened /);

        await userEvent.click(within(row).getByRole("button", { name: "Refresh friends.csv" }));
        await within(row).findByText("Refreshed");
        assert.strictEqual(session.data.nodes().length, 3, "the located file's rows");
    });
});

describe("version 2 save files, a style file on other data", () => {
    withFeatures(["save-files-v2"]);

    it("maps the style file's column to the open data's before adding it", async () => {
        const { session } = await openSample();
        const payments = "source,target,amount\nAva,Ben,900\nBen,Cara,20\n";
        await session.data.import(
            { type: "csv", config: { data: payments }, name: "payments.csv" },
            { mode: "replace" },
        );
        await session.styles.add({
            name: "Big payments",
            target: "edge",
            selector: { match: "expression", where: "data.amount > `500`" },
            set: { "edge.color": "#c62828" },
        });
        const { text } = await session.project.save({
            format: 2,
            sections: ["style"],
            form: "section",
            markSaved: false,
        });
        await session.styles.remove(session.styles.list().find((layer) => layer.name === "Big payments")?.id ?? "");
        const renamed = payments.replace("amount", "amount_usd");
        await session.data.import({ type: "csv", config: { data: renamed }, name: "usd.csv" }, { mode: "replace" });

        await commands.chooseNextFile("kit.graphty-style.json", "application/json", text);
        await userEvent.keyboard("{Control>}o{/Control}");
        const add = await screen.findByRole("dialog", { name: "Add kit.graphty-style.json" });
        const missing = within(add).getByRole("row", { name: /^amount/ });
        assert.isNotNull(within(missing).getByText("Missing"));
        await userEvent.click(within(add).getByRole("button", { name: "Map columns" }));
        const map = await screen.findByRole("dialog", { name: "Map kit.graphty-style.json" });
        await userEvent.click(within(map).getByLabelText("Open column for amount"));
        await userEvent.click(await screen.findByRole("option", { name: "amount_usd" }));
        await userEvent.click(within(map).getByRole("button", { name: "Back" }));
        const back = await screen.findByRole("dialog", { name: "Add kit.graphty-style.json" });
        await within(within(back).getByRole("row", { name: /^amount/ })).findByText("Mapped");
        await userEvent.click(within(back).getByRole("button", { name: "Add style" }));
        await waitFor(() => {
            const layer = session.styles.list().find((each) => each.name === "Big payments");
            assert.deepEqual(layer?.selector, { match: "expression", where: "data.amount_usd > `500`" });
        });
    });
});

describe("version 2 save files, experiment off", () => {
    withFeatures([]);

    it("keeps Save as the name-only dialog", async () => {
        await openSample();
        await userEvent.keyboard("{Shift>}{Control>}s{/Control}{/Shift}");
        const dialog = await screen.findByRole("dialog", { name: `Save ${SAMPLE} as` });
        assert.lengthOf(within(dialog).getAllByRole("textbox"), 1);
        assert.isNull(within(dialog).queryByRole("checkbox"));
        assert.isNull(within(dialog).queryByText("Preset"));
    });
});
