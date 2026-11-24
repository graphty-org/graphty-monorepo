/**
 * Style panel v2's Select nodes... / Select edges... line on the REAL graphty-element (owner, 2026-11-23):
 * no Style nodes / Style edges checkbox; the line always shows how many the layer holds ("All" when nothing
 * was selected), and a kind the layer does not style yet starts on every element from its line.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle } from "./v2Harness";

describe("Style panel v2's Select line", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("has no kind checkbox, and a layer over every node reads All", async () => {
        await openGraph();
        const tab = await openStyle("Key people");
        await showKind("node");
        assert.isNull(within(tab).queryByRole("checkbox", { name: /^Style (nodes|edges)/ }));
        const line = await within(tab).findByRole("button", { name: "Select nodes... all 3 nodes" });
        assert.strictEqual(line.querySelector("[data-count]")?.textContent, "All");
    });

    it("a layer nothing was selected for opens the workspace holding all of them, as its line reads", async () => {
        const { session, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await showKind("node");
        await userEvent.click(await within(tab).findByRole("button", { name: "Select nodes... all 3 nodes" }));
        const workspace = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(found, "the workspace is open");
            return found;
        });
        await waitFor(() => {
            assert.strictEqual(workspace.querySelector(".sel-count")?.textContent, "3 of 3");
            assert.strictEqual(workspace.querySelector(".sel-card-start")?.textContent, "All nodes");
        });
        await userEvent.click(within(workspace).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "the workspace closed");
        });
        assert.deepEqual(session.styles.get(nodes)?.selector, { match: "everything" }, "Done keeps every node");
    });

    it("a kind the layer does not style starts on all of it and opens the workspace", async () => {
        const { session, edges } = await openGraph();
        const tab = await openStyle("Links");
        await showKind("node");
        assert.isNull(within(tab).queryByRole("checkbox", { name: /^Style (nodes|edges)/ }));
        await userEvent.click(await within(tab).findByRole("button", { name: "Select nodes... none" }));
        await waitFor(() => {
            const parts = session.styles.parts(edges);
            assert.isDefined(parts?.node, "the layer now styles nodes");
            assert.deepEqual(session.styles.get(parts?.node ?? "")?.selector, { match: "everything" });
        });
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".sel-ws"), "the workspace is open");
        });
    });
});
