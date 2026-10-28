/**
 * The workspace keeps the reader's work through graphty-element's autosave: a renamed sample is
 * saved in the browser, and when the workspace is mounted again (a reload) the start screen offers
 * it. Restore opens it again; Discard deletes it. Real element, real IndexedDB, real input.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type GraphSession, listAutosaves } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { pickSample } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { WORKSPACE_AUTOSAVE_KEY } from "../autosave";

type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** The sample, and its node count. */
const SAMPLE = { name: "Florentine families", nodes: 15 };

/** The name the reader gives the project. */
const RENAMED = "Medici study";

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
 * Deletes autosave's database and this tab's own-entry record, so each test starts with nothing
 * kept.
 * @returns settles once the database is gone.
 */
function forgetAutosave(): Promise<void> {
    sessionStorage.clear();
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase("graphty-autosave");
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
 * Waits for the open project's element and its session.
 * @returns the element and its session.
 */
async function openElement(): Promise<{ element: ElementUnderTest; session: GraphSession }> {
    let found: { element: ElementUnderTest; session: GraphSession } | undefined;
    await waitFor(
        () => {
            const element = document.querySelector<ElementUnderTest>("graphty-element:not([data-start-page])");
            const session: GraphSession | undefined = element?.session;
            assert.isDefined(session);
            if (element !== null && session !== undefined) {
                found = { element, session };
            }
        },
        { timeout: TIMEOUT_MS },
    );
    if (found === undefined) {
        throw new Error("the element never came up");
    }
    return found;
}

/**
 * Opens the sample, renames it with the keyboard (or, told not to, changes its layout), waits
 * until autosave has written it, and unmounts the workspace: the visit a reload ends.
 * @param rename - whether the reader renames the project.
 * @returns the entry id autosave wrote.
 */
async function workThenLeave(rename = true): Promise<string> {
    const first = mountWorkspace();
    await pickSample(SAMPLE.name);
    const { element, session } = await openElement();
    await waitFor(
        () => {
            assert.equal(session.data.statistics().nodeCount, SAMPLE.nodes);
        },
        { timeout: TIMEOUT_MS },
    );

    // The data's arrival is announced once, politely, as a short fact.
    await waitFor(() => {
        assert.include(screen.getByTestId("workspace-status").textContent, `${String(SAMPLE.nodes)} nodes, `);
    });
    assert.strictEqual(screen.getByTestId("workspace-status").getAttribute("aria-live"), "polite");
    // The region lives in the status bar along the bottom, with the autosave chip.
    const bar = screen.getByRole("contentinfo", { name: "Status" });
    assert.isNotNull(within(bar).getByTestId("workspace-status"));

    if (rename) {
        await userEvent.keyboard("{F2}");
        const field = await screen.findByRole("textbox", { name: "Project name" });
        await userEvent.clear(field);
        await userEvent.type(field, `${RENAMED}{Enter}`);
        await waitFor(() => {
            assert.equal(session.project.name, RENAMED);
        });
    } else {
        // An untouched sample is not unsaved work, so the reader makes one real change that is not
        // a rename: a circle layout, through the toolbar's Layout popover. In the project's default
        // narrow frame the side panels cover the toolbar, so the frame is the reader's desktop.
        await page.viewport(1440, 900);
        const tool = screen.getByRole("button", { name: "Layout" });
        await waitFor(() => {
            assert.isFalse(tool.hasAttribute("aria-disabled"));
        });
        await userEvent.click(tool);
        const popover = await screen.findByRole("dialog", { name: "Layout" });
        await userEvent.click(within(popover).getByRole("option", { name: /^Circle(?!s)/ }));
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(
            () => {
                assert.strictEqual(session.layout.id, "circular");
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.keyboard("{Escape}");
    }

    // Work is saved: the element says so, and the status bar's chip shows it.
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

    first.view.unmount();
    // The element's last write and its lock are released once it has gone, as when a page closes.
    await waitFor(
        async () => {
            const entries = await listAutosaves(WORKSPACE_AUTOSAVE_KEY);
            const kept = entries.find((each) => each.id === entry);
            assert.isTrue(kept !== undefined && !kept.live && kept.dirty, "the work is not kept yet");
        },
        { timeout: TIMEOUT_MS },
    );
    return entry;
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
        await userEvent.click(screen.getByRole("button", { name: `Open the ${SAMPLE.name} sample` }));
        const { element, session } = await openElement();
        await waitFor(
            () => {
                assert.equal(session.data.statistics().nodeCount, SAMPLE.nodes);
                assert.strictEqual(element.autosaver.status.state, "saved");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.notMatch(store.get().notice?.message ?? "", /private window|may clear/);
        assert.notMatch(document.body.textContent, /private window|may clear/);
        view.unmount();
    });

    it("offers the work after a reload, and Restore opens it again", async () => {
        const entry = await workThenLeave();

        const second = mountWorkspace();
        const region = await offer();
        assert.include(region.textContent, RENAMED);
        assert.include(region.textContent, `${String(SAMPLE.nodes)} nodes`);

        await userEvent.click(screen.getByRole("button", { name: "Restore" }));
        const { element, session } = await openElement();
        await waitFor(
            () => {
                assert.equal(session.data.statistics().nodeCount, SAMPLE.nodes);
                assert.equal(session.project.name, RENAMED);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(second.store.get().project?.name, RENAMED);
        // The toast; the status line speaks the same words (state/store.ts).
        await screen.findByText(/^Restored: /, { selector: ".cm-toast-message" });
        // This tab writes the restored work from here on.
        await waitFor(() => {
            assert.strictEqual(element.autosaver.status.entry, entry);
        });
        second.view.unmount();
    });

    it("keeps the project's name on Restore when the reader never renamed it", async () => {
        await workThenLeave(false);

        const second = mountWorkspace();
        await offer();
        await userEvent.click(screen.getByRole("button", { name: "Restore" }));
        const { session } = await openElement();
        await waitFor(
            () => {
                assert.equal(session.data.statistics().nodeCount, SAMPLE.nodes);
                assert.equal(second.store.get().project?.name, SAMPLE.name);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.isNull(screen.queryByText("Recovered work"));
        second.view.unmount();
    });

    it("offers the work after a reload, and Discard deletes it", async () => {
        const entry = await workThenLeave();

        const second = mountWorkspace();
        await offer();
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
