/**
 * The Export dialog without the element: where it opens, its words and its doors. The element is
 * not registered in this file; `ExportDialog.real-element.test.tsx` walks the task on it.
 */
import userEvent from "@testing-library/user-event";
import { assert, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";
import { SAVED_LOCALLY } from "../choices";

const OPEN: Partial<WorkspaceState> = { project: { name: "Les Miserables", id: 1 } };

describe("the Export dialog", () => {
    it("opens on Data with the table the dock asked for, and Cancel closes it", async () => {
        const store = createWorkspaceStore({ ...OPEN, dialog: "export", exportOn: "edges" });
        render(<Workspace store={store} />);

        const dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Data" }));
        assert.isNotNull(within(dialog).getByText(/^One row per edge/));
        assert.isNotNull(within(dialog).getByText(SAVED_LOCALLY));

        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        assert.isNull(store.get().dialog);
    });

    it("switches between Image and Data from the list", async () => {
        render(<Workspace initialState={{ ...OPEN, dialog: "export" }} />);

        const dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Image" }));
        // The image carries the legend card, so there is no note saying it does not.
        assert.isNull(within(dialog).queryByText("The legend is not in the image"));

        await userEvent.click(within(dialog).getByRole("tab", { name: "Data" }));
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Data" }));
        assert.isNull(within(dialog).queryByRole("heading", { name: "Image" }));
    });

    it("names its two kinds as tabs, each with its own panel", async () => {
        render(<Workspace initialState={{ ...OPEN, dialog: "export" }} />);

        const dialog = await screen.findByRole("dialog", { name: "Export" });
        const kinds = within(dialog).getByRole("tablist", { name: "What to export" });
        const tabs = within(kinds).getAllByRole("tab");
        assert.deepEqual(
            tabs.map((tab) => tab.textContent),
            ["Image", "Data"],
        );
        assert.strictEqual(tabs[0].getAttribute("aria-selected"), "true");
        const panel = within(dialog).getByRole("tabpanel");
        assert.strictEqual(panel.getAttribute("aria-labelledby"), tabs[0].id);
    });

    it("blocks the page behind it: the rail beside the dialog cannot be clicked", async () => {
        // Wide enough that the dialog does not cover the rail itself.
        await page.viewport(1366, 768);
        render(<Workspace initialState={{ ...OPEN, dialog: "export" }} />);

        await screen.findByRole("dialog", { name: "Export" });
        const rail = screen
            .getAllByRole("button", { name: "Data", hidden: true })
            .find((b) => !b.closest('[role="dialog"]'));
        assert.isDefined(rail);
        const box = rail.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        assert.isNotNull(hit);
        assert.isFalse(rail.contains(hit), "the pointer reaches the rail behind the dialog");
    });

    it("keeps Export... closed while the graph is still loading", async () => {
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);

        await userEvent.keyboard("{Control>}e{/Control}");
        assert.isNull(store.get().dialog);
    });
});
