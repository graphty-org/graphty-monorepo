/**
 * Network data behind its experiment, on the real element: with `network-data` off a reader finds
 * no door to a server -- no Open network data on the start page, no Network data... in the Sources
 * "+" -- and the element refuses a source load; with it on, the same clicks find both.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it, onTestFinished } from "vitest";
import { userEvent } from "vitest/browser";

import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Renders the workspace on the Data place with a project open and waits for the element.
 * @returns the element's session.
 */
async function openDataPlace(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Flag", id: 1 }, place: "data" })} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * The labels of the Sources "+" menu's items.
 * @returns the labels.
 */
async function addSourceItems(): Promise<string[]> {
    await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
    const items = await screen.findAllByRole("menuitem");
    const labels = items.map((item) => item.textContent);
    await userEvent.keyboard("{Escape}");
    return labels;
}

describe("network data behind its experiment", () => {
    it("draws no Open network data on the start page with it off", async () => {
        await siteFeatures([]);
        render(<Workspace store={createWorkspaceStore()} />);
        await screen.findByRole("button", { name: "Samples" });
        assert.isNull(screen.queryByRole("button", { name: "Open network data" }));
    });

    it("offers no Network data... in the Sources + with it off, and the element refuses", async () => {
        await siteFeatures([]);
        const session = await openDataPlace();
        assert.notInclude(await addSourceItems(), "Network data...");
        const error = await session.data.import({ source: "ndex", config: { uuid: "x" } }).then(
            () => null,
            (e: unknown) => e as { code?: string },
        );
        assert.strictEqual(error?.code, "E_FEATURE_OFF");
    });

    it("offers no Edit source with it off, for a source the element holds as a network load", async () => {
        await siteFeatures([]);
        const session = await openDataPlace();
        await session.data.import({ type: "csv", config: { data: "source,target\na,b\n" }, name: "ships.csv" });
        const row = await screen.findByRole("listitem", { name: /ships/ });
        await userEvent.click(row);
        await screen.findByRole("complementary", { name: "Inspector" });
        assert.isNull(screen.queryByRole("button", { name: "Edit source" }));
        assert.isUndefined(session.data.sourceSettings(session.data.sources()[0].key));
    });

    it("offers Open network data and Network data... with it on", async () => {
        await siteFeatures(["network-data"]);
        onTestFinished(() => siteFeatures([]));
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await userEvent.click(await screen.findByRole("button", { name: "Open network data" }));
        const card = await screen.findByRole("button", { name: /^NDEx/ });
        assert.isNull(store.get().project, "the chooser opens on the start page, with no project");
        await userEvent.click(card);
        await screen.findByRole("form", { name: "Network data" });
        await userEvent.click(await screen.findByRole("button", { name: "Close Network data" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
        assert.strictEqual(store.get().project?.name, "Untitled", "closing the form stays in the app");
    });

    it("offers Network data... in the Sources + with it on", async () => {
        await siteFeatures(["network-data"]);
        onTestFinished(() => siteFeatures([]));
        const session = await openDataPlace();
        assert.include(await addSourceItems(), "Network data...");
        assert.include(session.features.enabled, "network-data");
    });
});
