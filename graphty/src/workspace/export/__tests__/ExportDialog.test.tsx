/**
 * The Export dialog without the element: where it opens, its words and its doors. The element is
 * not registered in this file; `ExportDialog.real-element.test.tsx` walks the task on it.
 */
import userEvent from "@testing-library/user-event";
import { assert, describe, it } from "vitest";

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
