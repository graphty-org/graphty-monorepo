/**
 * A page reload in a real-element test, as the application has it: autosave on, the workspace
 * unmounted once the work is kept, and mounted again in the same tab, where this tab's work reopens
 * by itself (so the same project, with its id, and the Assistant chats kept with it).
 */

import { listAutosaves } from "@graphty/graphty-element/session";
import { assert } from "vitest";

import { WORKSPACE_AUTOSAVE_KEY } from "../workspace/autosave/autosave";
import { createWorkspaceStore, type WorkspaceStore } from "../workspace/state/store";
import { Workspace } from "../workspace/Workspace";
import { openBy } from "./open";
import { pickSample } from "./samples-dialog";
import { render, waitFor } from "./test-utils";

/**
 * Deletes autosave's database, so a test starts with nothing kept: kept work changes what the
 * start screen shows. Run it before the tab's session storage is cleared.
 * @returns settles once the database is gone.
 */
export function forgetAutosave(): Promise<void> {
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

/** A mounted workspace with autosave on. */
export interface AutosavedWorkspace {
    readonly store: WorkspaceStore;
    readonly view: ReturnType<typeof render>;
}

/**
 * Mounts the workspace with autosave on, as the application does, and opens a sample.
 * @param sample - the sample's name.
 * @returns the store and the render result.
 */
export async function openAutosaved(sample: string): Promise<AutosavedWorkspace> {
    const store = createWorkspaceStore({ autosave: true });
    const view = render(<Workspace store={store} />);
    await openBy(store, () => pickSample(sample));
    return { store, view };
}

/** How a test reloads. */
export interface ReloadOptions {
    /**
     * Empty this tab's session storage before the page comes back, as Safari does when it ends a
     * background tab and loads it again (issue #9655). The work then comes back through
     * graphty-element's autosave alone.
     */
    readonly lostSession?: boolean;
    /**
     * What the reader saw that the test expects a reload to lose, by the names {@link screenNow}
     * lists, each with the gap issue that tracks it in a comment where it is passed.
     */
    readonly lost?: readonly string[];
}

/**
 * An element's accessible name, as far as this harness needs it: its aria-label, the text its
 * aria-labelledby names, or its own text.
 * @param element - the element.
 * @returns the name.
 */
function nameOf(element: Element): string {
    const label = element.getAttribute("aria-label");
    if (label !== null) {
        return label.trim();
    }
    const by = element.getAttribute("aria-labelledby");
    if (by !== null) {
        return by
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
            .join(" ")
            .trim();
    }
    return element.textContent?.trim() ?? "";
}

/**
 * What the reader sees open: each open dialog, each named region and each pressed toolbar button,
 * by role and name ("region: Timeline", "pressed: Table").
 * @returns the list, sorted, each once.
 */
export function screenNow(): string[] {
    const seen = new Set<string>();
    const add = (role: string, element: Element): void => {
        const name = nameOf(element);
        if (name !== "") {
            seen.add(`${role}: ${name}`);
        }
    };
    document.querySelectorAll('[role="dialog"], dialog[open]').forEach((each) => {
        add("dialog", each);
    });
    document
        .querySelectorAll(
            '[role="region"][aria-label], [role="region"][aria-labelledby], section[aria-label], section[aria-labelledby]',
        )
        .forEach((each) => {
            add("region", each);
        });
    document.querySelectorAll('[role="toolbar"] [aria-pressed="true"]').forEach((each) => {
        add("pressed", each);
    });
    return [...seen].sort();
}

/**
 * Waits until autosave has kept the work, unmounts the workspace as a reload ends the page, mounts
 * it again and waits for this tab's work to reopen with everything the reader saw open before
 * (see {@link screenNow}), less what the test names in `lost`.
 * @param before - the workspace to leave.
 * @param options - how the reload goes.
 * @returns the workspace after the reload.
 */
export async function reload(before: AutosavedWorkspace, options: ReloadOptions = {}): Promise<AutosavedWorkspace> {
    const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    );
    if (element === null) {
        throw new Error("no opened element");
    }
    const entry = await waitFor(() => {
        const { status } = element.autosaver;
        assert.strictEqual(status.state, "saved");
        assert.isNotNull(status.entry);
        return status.entry;
    });
    const shown = screenNow().filter((each) => !(options.lost ?? []).includes(each));
    before.view.unmount();
    await waitFor(async () => {
        const kept = (await listAutosaves(WORKSPACE_AUTOSAVE_KEY)).find((each) => each.id === entry);
        assert.isTrue(kept !== undefined && !kept.live, "the work is not kept yet");
    });
    if (options.lostSession === true) {
        sessionStorage.clear();
    }
    const store = createWorkspaceStore({ autosave: true });
    const view = render(<Workspace store={store} />);
    await openBy(store, () => Promise.resolve());
    await waitFor(() => {
        const now = screenNow();
        assert.deepStrictEqual(
            shown.filter((each) => !now.includes(each)),
            [],
            "what the reader saw open before the reload is open again",
        );
    });
    return { store, view };
}
