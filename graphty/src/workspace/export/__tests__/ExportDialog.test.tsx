/**
 * The Export dialog without the element: where it opens, its words and its doors. The element is
 * not registered in this file; `ExportDialog.real-element.test.tsx` walks the task on it.
 */
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

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
        assert.isNotNull(within(dialog).getByText("The legend is not in the image"));

        await userEvent.click(within(dialog).getByText("Data"));
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Data" }));
        assert.isNull(within(dialog).queryByRole("heading", { name: "Image" }));
    });

    it("keeps Export... closed while the graph is still loading", async () => {
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);

        await userEvent.keyboard("{Control>}e{/Control}");
        assert.isNull(store.get().dialog);
    });
});
