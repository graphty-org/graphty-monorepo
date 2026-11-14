/**
 * The Style panel on the layers a file's styles made, on the REAL graphty-element with the
 * file-styles experiment on: a yEd file's layers select on the file's own values
 * (`graphty.style.graphml.node.el.load`), and every one of them, chosen by a real click in the
 * style tree, shows its Style tab rather than "This panel could not be shown" (#6630).
 */
// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { fileStyleOf, type GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import GALAXY from "../../../../../graph-io/test/corpus/styles/graphml/fidelity/galaxy-lcms-workflow.graphml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withFeatures(["file-styles"]);

/**
 * Opens the workspace and loads the yEd file with its styles.
 * @returns the session.
 */
async function openGalaxy(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import(
        { type: "graphml", name: "galaxy-lcms-workflow.graphml", config: { data: GALAXY } },
        { styles: "file" },
    );
    await session.styles.settled();
    return session;
}

/**
 * Waits until the panel shows what is asked for or its fallback, then says it is not the fallback.
 * @param shown - finds what the panel shows when it works.
 * @param name - the layer, for the message.
 */
async function shownOrFailed(shown: () => HTMLElement | null, name: string): Promise<void> {
    const failed = (): HTMLElement | null => screen.queryByText("This panel could not be shown");
    await waitFor(() => {
        assert.isTrue(shown() !== null || failed() !== null);
    });
    assert.isNull(failed(), name);
}

describe("the Style panel on a file's layers", () => {
    it("shows the Style tab of every layer the file made", async () => {
        const session = await openGalaxy();
        assert.isAbove(session.styles.list().filter((layer) => fileStyleOf(layer) !== null).length, 0);

        const tree = await screen.findByRole("tree", { name: "Style layers" });
        const items = await within(tree).findAllByRole("treeitem");
        const names = items.map((item) => item.getAttribute("aria-label") ?? item.textContent ?? "");
        assert.isTrue(
            names.some((name) => name.startsWith("Exceptions from the file")),
            "the file made the layer the issue names",
        );
        for (const [index, item] of items.entries()) {
            await userEvent.click(item);
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            await shownOrFailed(() => within(inspector).queryByRole("tab", { name: "Style" }), names[index]);
            const style = within(inspector).getByRole("tab", { name: "Style" });
            if (style.getAttribute("aria-selected") !== "true") {
                await userEvent.click(style);
            }
            await shownOrFailed(() => screen.queryByTestId("style-tab"), names[index]);
        }
    });
});
