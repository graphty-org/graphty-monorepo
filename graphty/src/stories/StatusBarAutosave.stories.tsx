/**
 * The status bar's autosave chip and notices, driven by a real graphty-element.
 *
 * Each board mounts a real element (hidden: its canvas is not what these boards show) with
 * autosave on and a store in memory, and the board listens to the element's own autosave events
 * exactly as the shell does, feeding the same words (`formatAutosave.ts`) to the real status
 * bar. The play function makes the change that moves autosave: it adds nodes through the
 * element's session. The not-saved and saving boards hand the element a store that refuses or
 * holds every write, which is the only stand-in: it replaces the browser's storage, never the
 * element.
 */

import "@graphty/graphty-element";

import { type AutosaveStore, memoryAutosaveStore } from "@graphty/graphty-element/extend";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useLayoutEffect, useRef, useState } from "react";
import { expect, waitFor, within } from "storybook/test";

import {
    autosaveProblemSentence,
    formatAutosaveChip,
    restoredSentence,
} from "../components/shell/statusbar/formatAutosave";
import { StatusBar } from "../components/shell/statusbar/StatusBar";
import type { StatusBarCompletion } from "../components/shell/statusbar/statusBarModel";

/** The element and its autosave status, by the element's own published types. */
type Graphty = import("@graphty/graphty-element").Graphty;
type AutosaveStatus = import("@graphty/graphty-element").AutosaveStatus;

/** The bar takes its width from its parent, so the host is a desktop-width shell. */
const WIDE_SHELL = 1440;

/** Room above the bar for the toast. */
const SHELL_HEIGHT = 200;

/** The board: the hidden element host and the status bar the element's events feed. */
function Board(): React.JSX.Element {
    const host = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<AutosaveStatus | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useLayoutEffect(() => {
        const element = host.current;
        if (element === null) {
            return undefined;
        }
        const onStatus = (event: HTMLElementEventMap["graphty-autosave-status"]): void => {
            setStatus(event.detail);
        };
        const onRestored = (event: HTMLElementEventMap["graphty-autosave-restored"]): void => {
            const { detail } = event;
            void (event.target as Graphty).autosaver.list().then((entries) => {
                setNotice(restoredSentence(detail, entries));
            });
        };
        element.addEventListener("graphty-autosave-status", onStatus);
        element.addEventListener("graphty-autosave-restored", onRestored);
        return () => {
            element.removeEventListener("graphty-autosave-status", onStatus);
            element.removeEventListener("graphty-autosave-restored", onRestored);
        };
    }, []);

    const chip = status === null ? null : formatAutosaveChip(status);
    let completion: StatusBarCompletion | undefined;
    if (status?.state === "failing" && status.problem !== null) {
        completion = {
            message: autosaveProblemSentence(status.problem),
            severity: "error",
            actionLabel: "Save a copy",
            onDetails: () => undefined,
        };
    } else if (notice !== null) {
        completion = { message: notice, actionLabel: "Dismiss", onDetails: () => undefined };
    }

    return (
        <div
            style={{
                position: "relative",
                width: WIDE_SHELL,
                height: SHELL_HEIGHT,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
            }}
        >
            <div
                ref={host}
                data-testid="element-host"
                style={{ position: "absolute", top: 0, left: 0, width: 200, height: 120, visibility: "hidden" }}
            />
            <StatusBar completion={completion} slots={{ issues: chip === null ? undefined : { autosave: chip } }} />
        </div>
    );
}

/**
 * Mounts a real element with autosave on under `key`, keeping its work in `store`.
 * @param canvasElement - the story's root.
 * @param key - the autosave key.
 * @param store - where autosave keeps the work.
 * @returns the element, once connected.
 */
function mountElement(canvasElement: HTMLElement, key: string, store: AutosaveStore): Graphty {
    const host = within(canvasElement).getByTestId("element-host");
    const element = document.createElement("graphty-element");
    element.autosave = key;
    element.autosaveOptions = { store };
    host.append(element);
    return element;
}

/**
 * Two nodes and an edge: the change that gives autosave something to keep. Made once the element
 * has decided its restore, as a reader's first change is: session verbs are not held for it.
 * @param element - the element.
 */
async function addWork(element: Graphty): Promise<void> {
    await element.autosaver.ready;
    await element.session.data.addNodes([{ id: "ada" }, { id: "grace" }]);
    await element.session.data.addEdges([{ source: "ada", target: "grace" }]);
}

/**
 * A store in memory whose commits do what `commit` says.
 * @param commit - the commit.
 * @returns the store.
 */
function storeWithCommit(commit: AutosaveStore["commit"]): AutosaveStore {
    const base = memoryAutosaveStore();
    return {
        list: (key) => base.list(key),
        read: (id) => base.read(id),
        remove: (id) => base.remove(id),
        commit,
    };
}

/**
 * Waits for the element's autosave to reach `state`, on its own status event.
 * @param element - the element.
 * @param state - the state.
 * @returns settles once autosave is in that state.
 */
function statusReaches(element: Graphty, state: AutosaveStatus["state"]): Promise<void> {
    if (element.autosaver.status.state === state) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const onStatus = (event: HTMLElementEventMap["graphty-autosave-status"]): void => {
            if (event.detail.state === state) {
                element.removeEventListener("graphty-autosave-status", onStatus);
                resolve();
            }
        };
        element.addEventListener("graphty-autosave-status", onStatus);
    });
}

/**
 * Waits for the element to reach `state`, then for the chip to read `label`.
 * @param canvasElement - the story's root.
 * @param element - the element.
 * @param state - the autosave state.
 * @param label - the chip's text.
 */
async function chipReads(
    canvasElement: HTMLElement,
    element: Graphty,
    state: AutosaveStatus["state"],
    label: string,
): Promise<void> {
    await statusReaches(element, state);
    await waitFor(async () => {
        await expect(within(canvasElement).getByTestId("autosave-chip")).toHaveTextContent(label);
    });
}

const meta: Meta<typeof Board> = {
    title: "Shell/Status bar/Autosave",
    component: Board,
    parameters: {
        layout: "fullscreen",
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The work is kept: the element committed the change. */
export const Saved: Story = {
    play: async ({ canvasElement }) => {
        const element = mountElement(canvasElement, "story.autosave.saved", memoryAutosaveStore());
        await addWork(element);
        await chipReads(canvasElement, element, "saved", "Autosave: saved");
    },
};

/** A write is in flight: the store is still working on it (it reports progress, so it is not stalled). */
export const Saving: Story = {
    play: async ({ canvasElement }) => {
        const store = storeWithCommit(
            (_writes, options) =>
                new Promise<void>(() => {
                    // The write never finishes, and keeps reporting that it is still moving.
                    globalThis.setInterval(() => {
                        options?.onProgress?.();
                    }, 1000);
                }),
        );
        const element = mountElement(canvasElement, "story.autosave.saving", store);
        await addWork(element);
        await chipReads(canvasElement, element, "pending", "Autosave: saving...");
    },
};

/** The browser is out of room: the chip reads not saved and the toast says why and offers a file copy. */
export const NotSaved: Story = {
    play: async ({ canvasElement }) => {
        const store = storeWithCommit(() =>
            Promise.reject(new DOMException("The quota has been exceeded.", "QuotaExceededError")),
        );
        const element = mountElement(canvasElement, "story.autosave.not-saved", store);
        await addWork(element);
        await chipReads(canvasElement, element, "failing", "Autosave: not saved");
        await expect(within(canvasElement).getByRole("alert")).toHaveTextContent("out of room");
    },
};

/** Work came back: one element kept it, a new one with the same key restored it and says so. */
export const Restored: Story = {
    play: async ({ canvasElement }) => {
        const store = memoryAutosaveStore();
        const first = mountElement(canvasElement, "story.autosave.restored", store);
        await addWork(first);
        await first.autosaver.flush();
        first.remove();

        const second = mountElement(canvasElement, "story.autosave.restored", store);
        const restored = await second.autosaver.ready;
        await expect(restored).not.toBeNull();
        await expect(second.session.data.statistics().nodeCount).toBe(2);
        await waitFor(async () => {
            await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
                "Restored your work from a moment ago.",
            );
        });
        await chipReads(canvasElement, second, "saved", "Autosave: saved");
    },
};
