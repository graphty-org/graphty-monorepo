/**
 * The workspace's `opened` on the REAL graphty-element: a sample opened from the start screen
 * settles it only once the whole open is done -- the graph read as one undo step and focus
 * handed to the graph's heading -- and a file at an address that cannot be read leaves the Network data panel open with the reason.
 * It is what every test waits on after an open, never the node count, which arrives first (#3544).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { sampleTile } from "../../../test/samples-dialog";
import { render, screen, waitFor } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

describe("opened: an open's whole run", () => {
    it("settles once the sample is read as one undo step and focus is on its heading", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await userEvent.click(page.getByRole("button", { name: sampleTile("Les Miserables"), exact: true }));
        const { opened } = store.get();
        assert.instanceOf(opened, Promise, "the click started an open the workspace tracks");
        await opened;
        const session = document.querySelector("graphty-element")?.session;
        assert.equal(session?.data.statistics().nodeCount, 77);
        assert.isTrue(session?.canUndo, "opening a sample is one step Undo takes back");
        assert.equal(document.activeElement?.id, INSPECTOR_TITLE_ID);
        assert.isNull(store.get().notice);
    });

    it("keeps the Network data panel open and says why when a file at an address cannot be read", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await userEvent.click(page.getByRole("button", { name: "Open network data", exact: true }));
        const chooser = await screen.findByRole("dialog", { name: "Open network data" });
        await userEvent.click(page.elementLocator(chooser).getByRole("button", { name: /^Load from URL/ }));
        const form = await screen.findByRole("form", { name: "Network data" });
        await userEvent.type(
            page.elementLocator(form).getByRole("textbox", { name: "URL", exact: true }),
            new URL("/no-such-sample.graphml", location.href).href,
        );
        await userEvent.click(page.elementLocator(form).getByRole("button", { name: "Load", exact: true }));
        const failure = await waitFor(() => {
            const chip = form.querySelector("[data-code]");
            assert.isNotNull(chip, "the form shows why the load failed");
            return chip;
        });
        assert.notMatch(failure.textContent ?? "", /^[EW]_/, "the reason is in words, never the raw code");
        assert.isNotNull(screen.queryByRole("form", { name: "Network data" }), "the panel stays for another try");
        const session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.equal(session?.data.sources().length, 0, "nothing was loaded");
    });
});
