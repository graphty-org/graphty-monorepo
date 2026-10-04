/**
 * Tier 1 task T14, "Save and reopen", on the REAL graphty-element: from the empty app, open a
 * sample, run Degree, add a style layer and select a node; Save opens Save as; Close returns to
 * the start screen, where the project is first in Recent projects; a click reopens it with its
 * runs, styles and selection. Run once where the browser keeps file handles (the save picker hands
 * back a file in the origin private file system) and once where it does not (Save downloads, and
 * Recent projects asks for the file with Locate...). Every assertion reads what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { clearRecent } from "../recent";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * The notice after a reopen. Issue #909: graphty-element reopens an undirected graph as directed
 * and reports `W_DATA_DIFFERS` for the saved run, so the notice adds "1 part did not come back".
 * Match only "Opened <name>" once that is fixed.
 * @param name - the project's name.
 * @returns the pattern.
 */
const OPENED = (name: string): RegExp => new RegExp(`^Opened ${name}(\\. 1 part did not come back\\.)?$`);

/** Where the pinned node is placed, in scene units. */
const PINNED_AT = { x: 3, y: -2, z: 0 };

/** What the reopened project must hold again. */
interface Snapshot {
    readonly runs: string[];
    readonly styles: unknown;
    readonly selection: string[];
    readonly nodes: number;
    /** What the label line is bound to. */
    readonly label: string | undefined;
    readonly dimension: "2d" | "3d";
    readonly pinned: string[];
    /** Where the first node stands. */
    readonly position: { x: number; y: number; z: number };
}

/**
 * Reads what the project holds now.
 * @param session - the element's session.
 * @returns its runs, styles, label line, selection, node count, view mode and positions.
 */
function snapshot(session: GraphSession): Snapshot {
    const binding = session.styles
        .list()
        .map((layer) => layer.encode?.["node.label"])
        .find((encode) => encode !== undefined);
    const position = { x: NaN, y: NaN, z: NaN };
    session.positions.read(0, position);
    return {
        runs: session.runs.list().map((run) => run.id),
        styles: session.styles.toDocument(),
        selection: [...session.selection.nodes].map(String),
        nodes: session.data.statistics().nodeCount,
        label: binding !== undefined && "by" in binding ? binding.by : undefined,
        dimension: session.layout.dimension,
        pinned: [...session.positions.pinned].map(String),
        position,
    };
}

/**
 * Waits for an element whose session is not `previous`.
 * @param previous - a session that no longer counts (the closed project's).
 * @returns the session.
 */
async function elementSession(previous?: GraphSession): Promise<GraphSession> {
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
            assert.notStrictEqual(session, previous);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * From the empty app: opens the Florentine families sample, runs Degree, adds a layer and a label
 * line bound to the name, draws it flat, pins the first node at a known place and selects it, as
 * the other packages' doors would.
 * @param store - the workspace store.
 * @returns the session and what it holds.
 */
async function buildProject(store: WorkspaceStore): Promise<{ session: GraphSession; before: Snapshot }> {
    render(<Workspace store={store} />);
    await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));
    const session = await elementSession();
    await waitFor(
        () => {
            assert.equal(session.data.statistics().nodeCount, 15);
        },
        { timeout: TIMEOUT_MS },
    );
    await session.runs.start("degree");
    await session.styles.add({
        name: "All in orange",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#ff9900" },
    });
    const name = session.data.attributes().find((column) => column.kind === "node" && column.name === "name");
    assert.isDefined(name);
    if (name !== undefined) {
        await session.styles.encode({ column: name, channel: "node.label" });
    }
    await session.layout.setDimension("2d");
    const [first] = session.data.nodes();
    await session.positions.set([{ id: first.id, ...PINNED_AT }]);
    await session.positions.pin([first.id]);
    await session.selection.apply({ nodes: [first.id] });
    const before = snapshot(session);
    assert.equal(before.label, "data.name");
    assert.deepEqual(before.position, PINNED_AT);
    return { session, before };
}

/**
 * Save as through the keys: the dialog opens with the project's name selected; typing replaces it.
 * @param name - the name to save under.
 */
async function saveAs(name: string): Promise<void> {
    await userEvent.keyboard("{Control>}s{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Save Florentine families as" });
    const field = within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" });
    await waitFor(() => {
        assert.strictEqual(document.activeElement, field);
    });
    assert.equal(field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0), "Florentine families");
    await userEvent.keyboard(`${name}{Enter}`);
}

/**
 * Close project from the project-name menu.
 * @param name - the project's name.
 */
async function closeFromMenu(name: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: `Project: ${name}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Close project" }));
}

beforeEach(async () => {
    await clearRecent();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("T14: save and reopen, on the real element", () => {
    it(
        "saves to a file the browser keeps, and reopens it from Recent projects",
        async () => {
            const root = await navigator.storage.getDirectory();
            const file = await root.getFileHandle("t14.graphty.json", { create: true });
            const picker = vi.fn(() => Promise.resolve(file));
            vi.stubGlobal("showSaveFilePicker", picker);
            try {
                const store = createWorkspaceStore();
                const { session, before } = await buildProject(store);
                assert.isTrue(session.project.dirty);

                await saveAs("Florentine, my copy");
                await waitFor(() => {
                    assert.equal(store.get().notice?.message, "Saved as Florentine, my copy");
                });
                assert.equal(picker.mock.calls.length, 1);
                assert.isFalse(session.project.dirty);
                assert.isNotNull(screen.getByRole("button", { name: "Project: Florentine, my copy" }));
                assert.include(await (await file.getFile()).text(), "graphty-document");

                // A later Save writes the same file, with no dialog.
                await session.styles.add({
                    name: "Later",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.size": 2 },
                });
                await userEvent.keyboard("{Control>}s{/Control}");
                await waitFor(() => {
                    assert.equal(store.get().notice?.message, "Saved Florentine, my copy");
                });
                assert.equal(picker.mock.calls.length, 1);
                const saved = snapshot(session);

                await closeFromMenu("Florentine, my copy");
                assert.isNull(store.get().project);
                const recent = await screen.findByRole("button", { name: /^Florentine, my copy/ });
                assert.isNotNull(within(recent).getByText("15 nodes"));

                await userEvent.click(recent);
                const reopened = await elementSession(session);
                await waitFor(
                    () => {
                        assert.match(store.get().notice?.message ?? "", OPENED("Florentine, my copy"));
                    },
                    { timeout: TIMEOUT_MS },
                );
                assert.deepEqual(snapshot(reopened), saved);
                assert.include(saved.runs, before.runs[0]);
                assert.deepEqual(saved.selection, before.selection);
                assert.isFalse(reopened.project.dirty);
                assert.isNotNull(screen.getByRole("button", { name: "Project: Florentine, my copy" }));

                // Opening it again over unsaved changes: the element refuses, the reader discards.
                await reopened.styles.add({
                    name: "Unsaved",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.size": 3 },
                });
                store.set({ notice: null });
                await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
                await userEvent.hover(await screen.findByRole("menuitem", { name: "Open recent" }));
                await userEvent.click(await screen.findByRole("menuitem", { name: /^Florentine, my copy/ }));
                const ask = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
                await userEvent.click(within(ask).getByRole("button", { name: "Discard" }));
                await waitFor(
                    () => {
                        assert.match(store.get().notice?.message ?? "", OPENED("Florentine, my copy"));
                    },
                    { timeout: TIMEOUT_MS },
                );
                assert.deepEqual(snapshot(reopened), saved);
            } finally {
                vi.unstubAllGlobals();
                await root.removeEntry("t14.graphty.json");
            }
        },
        TIMEOUT_MS * 2,
    );

    it(
        "downloads where the browser keeps no file handles, and reopens with Locate...",
        async () => {
            vi.stubGlobal("showSaveFilePicker", undefined);
            vi.stubGlobal("showOpenFilePicker", undefined);
            const downloads: { name: string; blob: Blob }[] = [];
            const blobs = new Map<string, Blob>();
            const create = URL.createObjectURL.bind(URL);
            vi.spyOn(URL, "createObjectURL").mockImplementation((object: Blob | MediaSource) => {
                const url = create(object);
                if (object instanceof Blob) {
                    blobs.set(url, object);
                }
                return url;
            });
            vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
                const blob = blobs.get(this.href);
                if (this.download !== "" && blob !== undefined) {
                    downloads.push({ name: this.download, blob });
                }
            });
            try {
                const store = createWorkspaceStore();
                const { session, before } = await buildProject(store);

                await saveAs("Florentine");
                await waitFor(() => {
                    assert.equal(store.get().notice?.message, "Downloaded Florentine");
                });
                assert.deepEqual(
                    downloads.map((download) => download.name),
                    ["Florentine.graphty.json"],
                );

                await closeFromMenu("Florentine");
                const recent = await screen.findByRole("button", { name: /^Florentine/ });
                assert.isNotNull(within(recent).getByText(/ - Locate\.\.\.$/));

                // Locate... asks for the file: the reader picks the download.
                const picked = new File([downloads[0].blob], "Florentine.graphty.json");
                vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
                    const transfer = new DataTransfer();
                    transfer.items.add(picked);
                    this.files = transfer.files;
                    this.dispatchEvent(new Event("change"));
                });
                await userEvent.click(recent);
                const reopened = await elementSession(session);
                await waitFor(
                    () => {
                        assert.match(store.get().notice?.message ?? "", OPENED("Florentine"));
                    },
                    { timeout: TIMEOUT_MS },
                );
                assert.deepEqual(snapshot(reopened), before);

                // Save again downloads a new copy, with no dialog.
                await reopened.styles.add({
                    name: "Later",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.size": 2 },
                });
                await userEvent.keyboard("{Control>}s{/Control}");
                await waitFor(() => {
                    assert.equal(store.get().notice?.message, "Downloaded Florentine");
                });
                assert.equal(downloads.length, 2);
            } finally {
                vi.unstubAllGlobals();
            }
        },
        TIMEOUT_MS * 2,
    );

    it(
        "renames through the element: the new name is unsaved and survives an edit",
        async () => {
            const root = await navigator.storage.getDirectory();
            const file = await root.getFileHandle("t14-rename.graphty.json", { create: true });
            vi.stubGlobal(
                "showSaveFilePicker",
                vi.fn(() => Promise.resolve(file)),
            );
            try {
                const store = createWorkspaceStore();
                const { session } = await buildProject(store);
                await saveAs("Florentine A");
                await waitFor(() => {
                    assert.isFalse(session.project.dirty);
                });

                await userEvent.keyboard("{F2}");
                const field = await screen.findByRole("textbox", { name: "Project name" });
                await userEvent.clear(field);
                await userEvent.type(field, "Florentine B{Enter}");
                await waitFor(() => {
                    assert.equal(session.project.name, "Florentine B");
                });
                assert.isTrue(session.project.dirty);

                // An edit publishes the project's status again; the header keeps the new name.
                await session.styles.add({
                    name: "Later",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.size": 2 },
                });
                assert.isNotNull(await screen.findByRole("button", { name: "Project: Florentine B" }));

                // Close asks, because the rename is not saved.
                await closeFromMenu("Florentine B");
                const ask = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
                await userEvent.click(within(ask).getByRole("button", { name: "Cancel" }));
            } finally {
                vi.unstubAllGlobals();
                await root.removeEntry("t14-rename.graphty.json");
            }
        },
        TIMEOUT_MS,
    );

    it(
        "keeps the old name and still asks before Close when Save as cannot write the file",
        async () => {
            const refused = {
                createWritable: () => Promise.reject(new DOMException("refused", "NotAllowedError")),
            };
            vi.stubGlobal(
                "showSaveFilePicker",
                vi.fn(() => Promise.resolve(refused)),
            );
            try {
                const store = createWorkspaceStore();
                await buildProject(store);
                await saveAs("Florentine, unsaved");
                await waitFor(() => {
                    assert.equal(store.get().notice?.message, "Florentine, unsaved could not be saved.");
                });
                assert.isNotNull(await screen.findByRole("button", { name: "Project: Florentine families" }));

                await closeFromMenu("Florentine families");
                assert.isNotNull(await screen.findByRole("dialog", { name: "Discard unsaved changes?" }));
                assert.isNotNull(store.get().project);
            } finally {
                vi.unstubAllGlobals();
            }
        },
        TIMEOUT_MS,
    );

    it(
        "asks before Close project or New project throws away unsaved changes",
        async () => {
            const store = createWorkspaceStore();
            const { session } = await buildProject(store);
            assert.isTrue(session.project.dirty);

            await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "New project" }));
            const asked = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
            await userEvent.click(within(asked).getByRole("button", { name: "Cancel" }));
            assert.equal(store.get().project?.name, "Florentine families");

            await closeFromMenu("Florentine families");
            const dialog = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
            await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
            assert.isNotNull(store.get().project);

            await closeFromMenu("Florentine families");
            await userEvent.click(
                within(await screen.findByRole("dialog", { name: "Discard unsaved changes?" })).getByRole("button", {
                    name: "Discard",
                }),
            );
            assert.isNull(store.get().project);
        },
        TIMEOUT_MS,
    );
});
