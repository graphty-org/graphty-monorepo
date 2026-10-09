/**
 * Tier 1 task T14, "Save and reopen", on the REAL graphty-element: from the empty app, open a
 * sample, run Degree, add a style layer and select a node; Save opens Save as and keeps the
 * project in this browser; Close returns to the start screen, where the project is first in
 * Recent projects; a click reopens it with its runs, styles and selection. Save local copy...
 * downloads the project file without changing what is saved. Every assertion reads what the
 * element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { browserProjects, type GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, beforeAll, beforeEach, describe, it, vi } from "vitest";
import { page } from "vitest/browser";

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
 * Returns once the dialog has gone, which is when Save as is done: the element clears `dirty`
 * before the app has recorded the file in Recent projects and closed the dialog, and while the
 * dialog is open it keeps the keys (F2 does nothing).
 * @param name - the name to save under.
 * @param current - the project's name before.
 */
async function saveAs(name: string, current = "Florentine families"): Promise<void> {
    await userEvent.keyboard("{Control>}s{/Control}");
    const dialog = await screen.findByRole("dialog", { name: `Save ${current} as` });
    const field = within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" });
    await waitFor(() => {
        assert.strictEqual(document.activeElement, field);
    });
    assert.equal(field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0), current);
    await userEvent.keyboard(`${name}{Enter}`);
    await waitFor(
        () => {
            assert.isNull(screen.queryByRole("dialog"));
        },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * Back to start from the main menu.
 */
async function closeFromMenu(): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
}

/**
 * Records every download the element starts, without saving a file.
 * @returns the downloads, filled as they happen.
 */
function watchDownloads(): { name: string; blob: Blob }[] {
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
    return downloads;
}

beforeEach(async () => {
    await clearRecent();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("T14: save and reopen, on the real element", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "keeps the project in this browser, saves again without asking, and reopens it from Recent projects",
        async () => {
            const downloads = watchDownloads();
            const store = createWorkspaceStore();
            const { session, before } = await buildProject(store);
            assert.isTrue(session.project.dirty);

            await saveAs("Florentine, my copy");
            await waitFor(() => {
                assert.equal(store.get().notice?.message, "Saved Florentine, my copy in this browser.");
            });
            assert.deepEqual(downloads, []);
            assert.isFalse(session.project.dirty);
            assert.isNotNull(screen.getByRole("button", { name: "Project: Florentine, my copy" }));

            // A later Save writes the same browser-kept project, with no dialog.
            await session.styles.add({
                name: "Later",
                target: "node",
                selector: { match: "everything" },
                set: { "node.size": 2 },
            });
            store.set({ notice: null });
            await userEvent.keyboard("{Control>}s{/Control}");
            await waitFor(() => {
                assert.equal(store.get().notice?.message, "Saved Florentine, my copy in this browser.");
            });
            assert.isNull(screen.queryByRole("dialog"));
            assert.lengthOf(await browserProjects.list(), 1);
            const saved = snapshot(session);

            // Save local copy... downloads the file and leaves the project saved.
            await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Save local copy..." }));
            await waitFor(() => {
                assert.deepEqual(
                    downloads.map((download) => download.name),
                    ["Florentine, my copy.graphty.json"],
                );
            });
            assert.include(await downloads[0].blob.text(), "graphty-document");
            assert.isFalse(session.project.dirty);

            await closeFromMenu();
            assert.isNull(store.get().project);
            const recent = await screen.findByRole("gridcell", { name: /^Florentine, my copy/ });
            assert.isNotNull(within(recent).getByText(/^In this browser - 15 nodes - /));

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

            // Save after the reopen writes the same project again, with no dialog.
            await reopened.styles.add({
                name: "Unsaved",
                target: "node",
                selector: { match: "everything" },
                set: { "node.size": 3 },
            });
            store.set({ notice: null });
            await userEvent.keyboard("{Control>}s{/Control}");
            await waitFor(() => {
                assert.equal(store.get().notice?.message, "Saved Florentine, my copy in this browser.");
            });
            assert.lengthOf(await browserProjects.list(), 1);

            // Opening it again over unsaved changes: the element refuses, the reader discards.
            await reopened.styles.add({
                name: "Unsaved again",
                target: "node",
                selector: { match: "everything" },
                set: { "node.size": 4 },
            });
            const kept = snapshot(reopened);
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
            assert.notDeepEqual(snapshot(reopened).styles, kept.styles);
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "leaves an unsaved project unsaved after Save local copy...",
        async () => {
            const downloads = watchDownloads();
            const store = createWorkspaceStore();
            const { session } = await buildProject(store);
            assert.isTrue(session.project.dirty);
            await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Save local copy..." }));
            await waitFor(() => {
                assert.deepEqual(
                    downloads.map((download) => download.name),
                    ["Florentine families.graphty.json"],
                );
            });
            assert.isTrue(session.project.dirty);
            assert.deepEqual(await browserProjects.list(), []);
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "renames through the element: the new name is unsaved and survives an edit",
        async () => {
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
            await closeFromMenu();
            const ask = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
            await userEvent.click(within(ask).getByRole("button", { name: "Cancel" }));
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "keeps the old name and still asks before Close when the browser cannot keep the project",
        async () => {
            try {
                const store = createWorkspaceStore();
                await buildProject(store);
                vi.stubGlobal("indexedDB", undefined);
                await saveAs("Florentine, unsaved");
                await waitFor(() => {
                    assert.equal(
                        store.get().notice?.message,
                        "Florentine, unsaved could not be saved: this browser does not let graphty keep projects. Save a local copy instead.",
                    );
                });
                assert.isNotNull(await screen.findByRole("button", { name: "Project: Florentine families" }));

                await closeFromMenu();
                assert.isNotNull(await screen.findByRole("dialog", { name: "Discard unsaved changes?" }));
                assert.isNotNull(store.get().project);
            } finally {
                vi.unstubAllGlobals();
            }
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "asks before Back to start or New project throws away unsaved changes",
        async () => {
            const store = createWorkspaceStore();
            const { session } = await buildProject(store);
            assert.isTrue(session.project.dirty);

            await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "New project" }));
            const asked = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
            await userEvent.click(within(asked).getByRole("button", { name: "Cancel" }));
            assert.equal(store.get().project?.name, "Florentine families");

            await closeFromMenu();
            const dialog = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
            await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
            assert.isNotNull(store.get().project);

            await closeFromMenu();
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

/**
 * Twenty friends and their 41 ties (the study's friends.csv): drawn, the graph clears the
 * legend card's corner, so the card arriving after the first framing moves nothing.
 */
const FRIENDS =
    "Ava-Ben Ava-Chloe Ava-Dev Ben-Chloe Ben-Eli Chloe-Dev Chloe-Farah Dev-Eli Dev-Gus Eli-Farah Farah-Gus " +
    "Farah-Hana Gus-Hana Gus-Ivan Hana-Ivan Hana-Jada Ivan-Jada Ivan-Kofi Jada-Kofi Jada-Lena Kofi-Lena " +
    "Kofi-Milo Lena-Milo Lena-Nora Milo-Nora Milo-Omar Nora-Omar Nora-Pia Omar-Pia Omar-Quinn Pia-Quinn " +
    "Pia-Ravi Quinn-Ravi Quinn-Sana Ravi-Sana Ravi-Theo Sana-Theo Sana-Ava Theo-Ben Theo-Ava Ivan-Ava";

/**
 * Where the graph's nodes stand on screen: the box around their centers, in CSS pixels.
 * @returns left, right, top and bottom.
 */
function drawnBounds(): number[] {
    const element = document.querySelector("graphty-element");
    const session = element?.session;
    assert.isDefined(session);
    const at = (session?.data.nodes() ?? []).flatMap((node) => element?.nodeScreenPosition(node.id) ?? []);
    assert.isNotEmpty(at);
    const xs = at.map((point) => point.x);
    const ys = at.map((point) => point.y);
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}

/**
 * Waits for the element's picture to be final, and for the legend card to have reserved its box.
 * @param store - the workspace store.
 */
async function framedWithLegend(store: WorkspaceStore): Promise<void> {
    await screen.findByRole("region", { name: "Legend" }, { timeout: TIMEOUT_MS });
    await waitFor(
        () => {
            assert.notDeepEqual(store.get().viewInsets, {});
        },
        { timeout: TIMEOUT_MS },
    );
    await document.querySelector("graphty-element")?.waitForStableFrame();
}

describe("a reopened project's framing, on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "frames the graph where it was when saved, though the legend card comes up with the graph",
        async () => {
            const store = createWorkspaceStore({ project: { name: "Friends", id: 1 } });
            render(<Workspace store={store} />);
            const session = await elementSession();
            const edges = FRIENDS.split(" ").map((pair) => {
                const [source, target] = pair.split("-");
                return { source, target };
            });
            await session.data.addNodes(
                [...new Set(edges.flatMap((edge) => [edge.source, edge.target]))].map((id) => ({ id })),
            );
            await session.data.addEdges(edges);
            await document.querySelector("graphty-element")?.waitForStableFrame();
            // PageRank paints color, so the legend card comes up after the graph was framed.
            await session.runs.start("pagerank");
            await session.styles.settled();
            await framedWithLegend(store);
            const saved = drawnBounds();

            await saveAs("Friends framed", "Friends");
            await closeFromMenu();
            await userEvent.click(await screen.findByRole("gridcell", { name: /^Friends framed/ }));
            const reopened = await elementSession(session);
            await waitFor(
                () => {
                    assert.match(store.get().notice?.message ?? "", OPENED("Friends framed"));
                },
                { timeout: TIMEOUT_MS },
            );
            assert.isAbove(reopened.runs.list().length, 0);
            await framedWithLegend(store);
            const bounds = drawnBounds();
            bounds.forEach((side, at) => {
                assert.approximately(
                    side,
                    saved[at],
                    3,
                    `side ${String(at)} of ${JSON.stringify(bounds)} against ${JSON.stringify(saved)}`,
                );
            });
        },
        TIMEOUT_MS * 2,
    );
});
