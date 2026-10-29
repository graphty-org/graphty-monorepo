/**
 * The workspace keeps the reader's work through graphty-element's autosave. A reload of the same
 * tab (or a tab the browser discarded and loaded again) reopens straight into the workspace at the
 * place the reader left; a duplicated tab never writes the entry its original writes; work from
 * another tab that was closed is offered on the start screen, where Restore opens it again and
 * Discard deletes it. Real element, real IndexedDB, real Web Locks, real input.
 *
 * A reload is the workspace unmounted and mounted again in the same page: the element's last write
 * and lock go with it, and session storage stays, as across a reload.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type GraphSession, listAutosaves } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { openBy } from "../../../test/open";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { WORKSPACE_AUTOSAVE_KEY } from "../autosave";

type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** The samples, and their node counts. */
const FLORENTINE = { name: "Florentine families", nodes: 15 };
const LES_MIS = { name: "Les Miserables", nodes: 77 };

/** The name the reader gives the project. */
const RENAMED = "Medici study";

/** autosave's database (graphty-element's AUTOSAVE_DATABASE). */
const DATABASE = "graphty-autosave";

/**
 * The relative luminance of a CSS rgb() or rgba() color (WCAG 2), alpha ignored.
 * @param css - the computed color.
 * @returns the luminance, 0 to 1.
 */
function luminance(css: string): number {
    const [r, g, b] = (css.match(/[\d.]+/g) ?? []).slice(0, 3).map((part) => {
        const c = Number(part) / 255;
        return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The WCAG contrast ratio of an element's text against the first opaque background behind it.
 * @param element - the element.
 * @returns the ratio, 1 to 21.
 */
function textContrast(element: HTMLElement): number {
    let behind: HTMLElement | null = element;
    let background = "rgb(255, 255, 255)";
    while (behind !== null) {
        const color = getComputedStyle(behind).backgroundColor;
        if (color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) {
            background = color;
            break;
        }
        behind = behind.parentElement;
    }
    const [hi, lo] = [luminance(getComputedStyle(element).color), luminance(background)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/**
 * Deletes autosave's database and this tab's session storage, so each test starts with nothing
 * kept.
 * @returns settles once the database is gone.
 */
function forgetAutosave(): Promise<void> {
    sessionStorage.clear();
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DATABASE);
        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            reject(request.error ?? new Error("the autosave database was not deleted"));
        };
    });
}

/**
 * Mounts the workspace with autosave on, as the application does.
 * @returns the store and the render result.
 */
function mountWorkspace(): { readonly store: WorkspaceStore; readonly view: ReturnType<typeof render> } {
    const store = createWorkspaceStore({ autosave: true });
    return { store, view: render(<Workspace store={store} />) };
}

/**
 * The opened project's element and its session, not the start page's own graph.
 * @returns the element and its session.
 */
function openedElement(): { element: ElementUnderTest; session: GraphSession } {
    const element = document.querySelector<ElementUnderTest>("graphty-element:not([data-start-page])");
    if (element === null) {
        throw new Error("no opened element");
    }
    return { element, session: element.session };
}

/**
 * Waits until autosave has written the work, then unmounts the workspace, as a reload ends the
 * page, and waits until the element's last write is in and its lock is released.
 * @param element - the project's element.
 * @param view - the workspace's render result.
 * @returns the entry id autosave wrote.
 */
async function leave(element: ElementUnderTest, view: ReturnType<typeof render>): Promise<string> {
    await waitFor(
        () => {
            assert.strictEqual(element.autosaver.status.state, "saved");
            assert.isNotNull(element.autosaver.status.savedAt);
        },
        { timeout: TIMEOUT_MS },
    );
    const chip = within(screen.getByRole("contentinfo", { name: "Status" })).getByTestId("autosave-chip");
    assert.strictEqual(chip.textContent, "Autosave: saved");
    // The chip's words are readable: 4.5:1 or more against what is behind them.
    assert.isAtLeast(textContrast(chip), 4.5);
    const { entry } = element.autosaver.status;
    if (entry === null) {
        throw new Error("autosave wrote no entry");
    }
    view.unmount();
    await waitFor(
        async () => {
            const kept = (await listAutosaves(WORKSPACE_AUTOSAVE_KEY)).find((each) => each.id === entry);
            assert.isTrue(kept !== undefined && !kept.live, "the work is not kept yet");
        },
        { timeout: TIMEOUT_MS },
    );
    return entry;
}

/**
 * Opens the Florentine sample, renames it with the keyboard and leaves: work with changes never
 * saved to a file.
 * @returns the entry id autosave wrote.
 */
async function renameThenLeave(): Promise<string> {
    const first = mountWorkspace();
    await openBy(first.store, () => pickSample(FLORENTINE.name));
    const { element, session } = openedElement();
    await userEvent.keyboard("{F2}");
    const field = await screen.findByRole("textbox", { name: "Project name" });
    await userEvent.clear(field);
    await userEvent.type(field, `${RENAMED}{Enter}`);
    await waitFor(() => {
        assert.equal(session.project.name, RENAMED);
    });
    await waitFor(() => {
        assert.strictEqual(screen.getByTestId("autosave-chip").textContent, "Autosave: saved");
    });
    return leave(element, first.view);
}

/**
 * Makes a kept entry another tab's: gives it a new id, as a tab that wrote it and was closed
 * leaves it. This page's own record still names the old id, which no longer exists.
 * @param id - the entry.
 * @returns the entry's new id.
 */
async function fromAnotherTab(id: string): Promise<string> {
    const other = crypto.randomUUID();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DATABASE);
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error ?? new Error("the autosave database did not open"));
        };
    });
    const tx = db.transaction(["entries", "parts"], "readwrite");
    const entries = tx.objectStore("entries");
    const parts = tx.objectStore("parts");
    entries.get(id).onsuccess = (event) => {
        const meta = (event.target as IDBRequest<Record<string, unknown>>).result;
        entries.delete(id);
        entries.put({ ...meta, id: other });
    };
    parts.openCursor().onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor === null) {
            return;
        }
        const part = cursor.value as Record<string, unknown>;
        if (part.entryId === id) {
            cursor.delete();
            parts.put({ ...part, entryId: other });
        }
        cursor.continue();
    };
    await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
            resolve();
        };
        tx.onerror = () => {
            reject(tx.error ?? new Error("the entry was not moved"));
        };
    });
    db.close();
    return other;
}

/**
 * The start screen's offer of the earlier work.
 * @returns the offer's region.
 */
function offer(): Promise<HTMLElement> {
    return screen.findByRole("region", { name: "Unsaved work" }, { timeout: TIMEOUT_MS });
}

describe("Workspace autosave with the real graphty-element", () => {
    beforeEach(forgetAutosave);
    afterEach(forgetAutosave);

    // First in the file: the element reports the at-risk fact once per page load.
    it("says nothing about a private window when a fresh session opens the start screen and a sample", async () => {
        const { store, view } = mountWorkspace();
        await openBy(store, () => pickSample(FLORENTINE.name));
        const { element } = openedElement();
        await waitFor(
            () => {
                assert.strictEqual(element.autosaver.status.state, "saved");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.notMatch(store.get().notice?.message ?? "", /private window|may clear/);
        assert.notMatch(document.body.textContent, /private window|may clear/);
        view.unmount();
    });

    it("reopens this tab's work after a reload, at the place and layer the reader left", async () => {
        const first = mountWorkspace();
        await openBy(first.store, () => pickSample(LES_MIS.name));
        const { element, session } = openedElement();
        // The project's name is the element's.
        assert.equal(session.project.name, LES_MIS.name);

        // The reader picks a layer in the Style layers list.
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        const hovered = await within(tree).findByRole("treeitem", { name: /^Hovered, / }, { timeout: TIMEOUT_MS });
        await userEvent.click(hovered);
        await waitFor(() => {
            assert.strictEqual(first.store.get().inspected?.kind, "layer-row");
        });
        const layer = first.store.get().inspected?.id;
        assert.isDefined(layer);
        const entry = await leave(element, first.view);
        const kept = (await listAutosaves(WORKSPACE_AUTOSAVE_KEY)).find((each) => each.id === entry);
        assert.strictEqual(kept?.name, LES_MIS.name, "the entry carries the project's name");

        // The reload: the start screen never shows, not even while the work is looked up.
        let startShown = false;
        const watch = new MutationObserver(() => {
            startShown ||= document.querySelector("[data-start-door]") !== null;
        });
        watch.observe(document.body, { childList: true, subtree: true });
        const second = mountWorkspace();
        // This tab's own work reopens by itself, with no click.
        await openBy(second.store, () => Promise.resolve());
        const reopened = openedElement();
        assert.equal(reopened.session.data.statistics().nodeCount, LES_MIS.nodes);
        await waitFor(
            () => {
                assert.strictEqual(reopened.element.autosaver.status.entry, entry, "this tab writes its own entry");
            },
            { timeout: TIMEOUT_MS },
        );
        // Same place, same layer, focus on the main heading, and the status line says what reopened.
        await waitFor(
            () => {
                assert.strictEqual(second.store.get().place, "graph");
                assert.deepEqual(second.store.get().inspected, { kind: "layer-row", id: layer });
                assert.strictEqual(document.activeElement?.id, INSPECTOR_TITLE_ID);
                assert.include(
                    screen.getAllByRole("status").map((status) => status.textContent),
                    `Reopened ${LES_MIS.name}`,
                );
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(document.activeElement?.textContent, "Hovered");
        const row = within(screen.getByRole("tree", { name: "Style layers" })).getByRole("treeitem", {
            name: /^Hovered, /,
        });
        assert.strictEqual(row.getAttribute("aria-selected"), "true");
        assert.isNotNull(screen.queryByRole("button", { name: `Project: ${LES_MIS.name}` }));
        watch.disconnect();
        assert.isFalse(startShown, "the start screen showed");
        assert.isNull(screen.queryByRole("region", { name: "Unsaved work" }));
        assert.notMatch(document.body.textContent ?? "", /Recovered work|Restored your work/);
        second.view.unmount();
    });

    it("never reopens the work another tab is writing: a duplicated tab starts on the start screen", async () => {
        const first = mountWorkspace();
        await openBy(first.store, () => pickSample(LES_MIS.name));
        const { element } = openedElement();
        await waitFor(
            () => {
                assert.isNotNull(element.autosaver.status.savedAt);
            },
            { timeout: TIMEOUT_MS },
        );
        const { entry } = element.autosaver.status;
        if (entry === null) {
            throw new Error("autosave wrote no entry");
        }
        first.view.unmount();

        // The original tab still writes the entry: it holds the entry's lock, taken here as soon as
        // the element's last write lets it go. A duplicated tab has a copy of the original's
        // session storage, which names the same entry.
        let release = (): void => undefined;
        await new Promise<void>((resolve) => {
            void navigator.locks.request(
                `graphty-autosave:${WORKSPACE_AUTOSAVE_KEY}:${entry}`,
                () =>
                    new Promise<void>((done) => {
                        release = done;
                        resolve();
                    }),
            );
        });
        try {
            const second = mountWorkspace();
            await screen.findByRole("button", { name: `Open the ${LES_MIS.name} sample` }, { timeout: TIMEOUT_MS });
            assert.isNull(second.store.get().project);
            assert.isNull(document.querySelector("graphty-element:not([data-start-page])"));
            const listed = (await listAutosaves(WORKSPACE_AUTOSAVE_KEY)).find((each) => each.id === entry);
            assert.isTrue(listed?.live);
            assert.notStrictEqual(listed?.own, true);
            second.view.unmount();
        } finally {
            release();
        }
    });

    it("offers another tab's work with the project's name, and Restore opens it again", async () => {
        const first = mountWorkspace();
        await openBy(first.store, () => pickSample(FLORENTINE.name));
        const { element, session } = openedElement();
        // A change never saved to a file, made without renaming: the name is the sample's.
        await session.styles.addRow({ name: "Layer 1", target: "both", selector: { match: "everything" } });
        const entry = await fromAnotherTab(await leave(element, first.view));

        const second = mountWorkspace();
        const region = await offer();
        assert.include(region.textContent, FLORENTINE.name);
        assert.include(region.textContent, `${String(FLORENTINE.nodes)} nodes`);

        await openBy(second.store, () => userEvent.click(screen.getByRole("button", { name: "Restore" })));
        const reopened = openedElement();
        assert.equal(reopened.session.data.statistics().nodeCount, FLORENTINE.nodes);
        assert.equal(reopened.session.project.name, FLORENTINE.name);
        assert.equal(second.store.get().project?.name, FLORENTINE.name);
        // The toast; the status line speaks the same words (state/store.ts).
        await screen.findByText(/^Restored: /, { selector: ".cm-toast-message" });
        // This tab writes the restored work from here on.
        await waitFor(() => {
            assert.strictEqual(reopened.element.autosaver.status.entry, entry);
        });
        second.view.unmount();
    });

    it("offers another tab's renamed work, and Discard deletes it", async () => {
        const entry = await fromAnotherTab(await renameThenLeave());

        const second = mountWorkspace();
        const region = await offer();
        assert.include(region.textContent, RENAMED);
        await userEvent.click(screen.getByRole("button", { name: "Discard" }));

        await waitFor(async () => {
            const entries = await listAutosaves(WORKSPACE_AUTOSAVE_KEY);
            assert.isUndefined(
                entries.find((each) => each.id === entry),
                "the discarded work is still kept",
            );
        });
        assert.isNull(screen.queryByRole("region", { name: "Unsaved work" }));
        assert.isNull(second.store.get().project);
        // The start page draws its own graph; no project element is up.
        assert.isNull(document.querySelector("graphty-element:not([data-start-page])"));
        second.view.unmount();

        // Nothing is offered on the next visit.
        const third = mountWorkspace();
        await waitFor(() => {
            assert.isNotNull(screen.queryByRole("button", { name: /^Open a file/ }));
        });
        assert.deepEqual(await listAutosaves(WORKSPACE_AUTOSAVE_KEY), []);
        assert.isNull(third.store.get().recovered);
        third.view.unmount();
    });
});
