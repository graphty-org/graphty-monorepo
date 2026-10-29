/**
 * The Export dialog without the element: where it opens, its words and its doors. The element is
 * not registered in this file; `ExportDialog.real-element.test.tsx` walks the task on it.
 */
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";

const OPEN: Partial<WorkspaceState> = { project: { name: "Les Miserables", id: 1 } };

describe("the Export dialog", () => {
    it("opens on Data with the table the dock asked for, and Cancel closes it", async () => {
        const store = createWorkspaceStore({ ...OPEN, dialog: "export", exportOn: "edges" });
        render(<Workspace store={store} />);

        const dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Data" }));
        assert.isNotNull(within(dialog).getByRole("combobox", { name: "Format" }));

        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        assert.isNull(store.get().dialog);
    });

    it("lists every output", async () => {
        render(<Workspace initialState={{ ...OPEN, dialog: "export" }} />);

        const dialog = await screen.findByRole("dialog", { name: "Export" });
        const list = within(dialog).getByRole("grid", { name: "What to export" });
        for (const name of ["Image", "Video", "Data", "Styles", "Recipe", "Project"]) {
            await userEvent.click(within(list).getByText(name));
            assert.isNotNull(within(dialog).getByRole("heading", { name }));
        }
    });

    it("switches between Image and Data from the list", async () => {
        render(<Workspace initialState={{ ...OPEN, dialog: "export" }} />);

        const dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Image" }));
        // The image carries the legend card, so there is no note saying it does not.
        assert.isNull(within(dialog).queryByText("The legend is not in the image"));

        await userEvent.click(within(dialog).getByRole("gridcell", { name: "Data" }));
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Data" }));
        assert.isNull(within(dialog).queryByRole("heading", { name: "Image" }));
    });

    it("lists its outputs in the shared page list, the current one marked", async () => {
        render(<Workspace initialState={{ ...OPEN, dialog: "export" }} />);

        const dialog = await screen.findByRole("dialog", { name: "Export" });
        const kinds = within(dialog).getByRole("grid", { name: "What to export" });
        const rows = within(kinds).getAllByRole("gridcell");
        // The one Export dialog's outputs (the data prototype), in tier 3's page list.
        assert.deepEqual(
            rows.map((row) => row.textContent),
            ["Image", "Video", "Data", "Styles", "Recipe", "Project"],
        );
        assert.strictEqual(rows[0].getAttribute("aria-current"), "page");
        assert.isNotNull(within(dialog).getByRole("region", { name: "Image" }));
    });

    it("keeps its buttons 8px above its own bottom edge and inside the window on a short screen", async () => {
        await page.viewport(1180, 640);
        render(<Workspace initialState={{ ...OPEN, dialog: "export" }} />);

        const dialog = await screen.findByRole("dialog", { name: "Export" });
        const content = dialog.closest(".mantine-Modal-content") ?? dialog;
        const edge = content.getBoundingClientRect();
        const cancel = within(dialog).getByRole("button", { name: "Cancel" }).getBoundingClientRect();
        assert.isAtMost(edge.bottom, window.innerHeight);
        // ModalFooter is Figma's 40px footer, so a 24px button sits 8px above the edge.
        assert.closeTo(edge.bottom - cancel.bottom, 8, 1);
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
