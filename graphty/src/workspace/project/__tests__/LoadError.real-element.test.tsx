/**
 * A load that fails, on the REAL graphty-element: the reader sees the app's own words for the
 * element's code, and a code the app has no words for is named, never the element's English
 * message (#5362).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { isGraphtyError } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";

import { openBy } from "../../../test/open";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen } from "../../../test/test-utils";
import { openProject } from "../../start/open";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const TOAST = { selector: ".cm-toast-message" };

/**
 * Runs an open that must fail and hands back what the element threw.
 * @param open - the open.
 * @returns the error.
 */
async function failed(open: () => Promise<unknown>): Promise<unknown> {
    try {
        await open();
    } catch (error) {
        return error;
    }
    throw new Error("the open did not fail");
}

describe("a load that fails", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("says a sample that did not download in the app's words, from the element's code", async () => {
        const realFetch = globalThis.fetch.bind(globalThis);
        // A real 404 for the sample's file only; everything else reaches the test server.
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
            String(input instanceof Request ? input.url : input).endsWith("samples/karate.gml")
                ? Promise.resolve(new Response(null, { status: 404 }))
                : realFetch(input, init),
        );
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);

        const error = await failed(() => openBy(store, () => pickSample("Zachary's karate club")));
        assert.isTrue(isGraphtyError(error) && error.code === "E_FETCH_FAILED");

        const toast = await screen.findByText(
            "Zachary's karate club could not be opened: the download failed (HTTP 404).",
            TOAST,
        );
        assert.notInclude(toast.textContent, (error as Error).message);
    });

    it("names a code the app has no words for, never the element's message", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);

        const error = await failed(() =>
            openBy(store, () => {
                openProject(store, "Broken", (session) => session.layout.set("no-such-layout"));
                return Promise.resolve();
            }),
        );
        assert.isTrue(isGraphtyError(error) && error.code === "E_UNKNOWN_LAYOUT");

        const toast = await screen.findByText("Broken could not be opened (E_UNKNOWN_LAYOUT).", TOAST);
        assert.notInclude(toast.textContent, (error as Error).message);
    });
});
